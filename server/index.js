import express from 'express';
import { createHash } from 'crypto';
import { execFile, spawn } from 'child_process';
import {
  mkdirSync,
  existsSync,
  statSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { createRequire } from 'module';

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: '2mb' }));

// Allow CORS in dev
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const ARTIFACTS_DIR = join(__dirname, '.artifacts');
const LVGL_DIR = '/lvgl';
const LVGL_LIB = join(__dirname, 'liblvgl.a');
const TEMPLATE_MAIN = join(__dirname, 'template_main.c');
const LV_CONF = join(__dirname, 'lv_conf.h');

mkdirSync(ARTIFACTS_DIR, { recursive: true });

// Check emcc is available
let emccPath = 'emcc';
try {
  const { stdout } = await execFileAsync('which', ['emcc']);
  emccPath = stdout.trim();
} catch {
  console.warn('[warn] emcc not found in PATH — compile requests will fail');
}

// ──────────────────────────────────────────────────────────────
// Concurrency semaphore (max 2 simultaneous compile jobs)
// ──────────────────────────────────────────────────────────────
const MAX_CONCURRENT = 2;
const MAX_QUEUE = 10;
let activeJobs = 0;
const waitQueue = [];

function acquireSemaphore() {
  return new Promise((resolve) => {
    if (activeJobs < MAX_CONCURRENT) {
      activeJobs++;
      resolve();
    } else {
      waitQueue.push(resolve);
    }
  });
}

function releaseSemaphore() {
  const next = waitQueue.shift();
  if (next) {
    next();
  } else {
    activeJobs--;
  }
}

function queueFull() {
  return waitQueue.length >= MAX_QUEUE;
}

// ──────────────────────────────────────────────────────────────
// emcc args helper (shared by blocking + SSE endpoints)
// ──────────────────────────────────────────────────────────────
let warnedNoLib = false;

function lvglSourceList() {
  if (existsSync(LVGL_LIB)) return [];
  if (!warnedNoLib) {
    console.warn(
      '[warn] liblvgl.a not found — including LVGL sources directly (slow)'
    );
    warnedNoLib = true;
  }
  const { execSync } = require('child_process');
  const srcList = execSync(
    `find ${LVGL_DIR}/src -name '*.c' ` +
      `! -path '*/drivers/wayland/*' ` +
      `! -path '*/drivers/x11/*' ` +
      `! -path '*/drivers/win32/*' ` +
      `! -path '*/drivers/nuttx/*' ` +
      `! -path '*/drivers/libinput/*'`
  )
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean);
  return srcList;
}

function emccArgsFor({ userCodePath, outJs, width, height }) {
  return [
    userCodePath,
    TEMPLATE_MAIN,
    ...(existsSync(LVGL_LIB) ? [LVGL_LIB] : lvglSourceList()),
    '-I', LVGL_DIR,
    '-include', LV_CONF,
    '-DDISP_HOR_RES=' + width,
    '-DDISP_VER_RES=' + height,
    '-s', 'USE_SDL=2',
    '-s', 'ALLOW_MEMORY_GROWTH=1',
    '-s', 'EXPORTED_RUNTIME_METHODS=["ccall","cwrap"]',
    '-s', 'EXPORTED_FUNCTIONS=["_main"]',
    '-s', 'EXIT_RUNTIME=0',
    '-s', 'ASYNCIFY=1',
    '-s', `INITIAL_MEMORY=67108864`,
    '-O2',
    '--closure', '0',
    '-o', outJs,
  ];
}

// ──────────────────────────────────────────────────────────────
// POST /api/compile  (blocking — kept for compatibility)
// Body: { code: string, width?: number, height?: number }
// Returns: { id: string, cached?: boolean }
// ──────────────────────────────────────────────────────────────
app.post('/api/compile', async (req, res) => {
  const { code, width = 480, height = 320 } = req.body ?? {};
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'code (string) required' });
  }

  if (queueFull()) {
    return res
      .status(503)
      .json({ error: 'compile queue full, try again later' });
  }

  const hash = createHash('sha256')
    .update(`${code}:${width}:${height}`)
    .digest('hex')
    .slice(0, 20);

  const artifactDir = join(ARTIFACTS_DIR, hash);
  const outJs = join(artifactDir, 'output.js');
  const outWasm = join(artifactDir, 'output.wasm');

  // Cache hit
  if (existsSync(outJs) && existsSync(outWasm)) {
    return res.json({ id: hash, cached: true });
  }

  mkdirSync(artifactDir, { recursive: true });

  // Write user code wrapped in a header
  const userCodePath = join(artifactDir, 'user_code.c');
  const userCodeWrapped = `#include "lvgl.h"\n\n${code}\n`;
  writeFileSync(userCodePath, userCodeWrapped, 'utf8');

  const args = emccArgsFor({ userCodePath, outJs, width, height });

  console.log(`[compile] ${hash} (${width}x${height}) — queued`);
  await acquireSemaphore();
  console.log(`[compile] ${hash} — started`);
  const t0 = Date.now();

  try {
    const { stderr } = await execFileAsync(emccPath, args, {
      timeout: 180_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[compile] ${hash} — done in ${elapsed}s`);
    if (stderr) console.warn('[emcc stderr]', stderr.slice(0, 500));
    res.json({ id: hash });
  } catch (err) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.error(`[compile] ${hash} — failed in ${elapsed}s`);
    try {
      rmSync(artifactDir, { recursive: true });
    } catch {}
    const errMsg = (
      err.stderr ||
      err.stdout ||
      err.message ||
      String(err)
    ).slice(0, 4000);
    res.status(500).json({ error: errMsg });
  } finally {
    releaseSemaphore();
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/compile-stream  (SSE — streams emcc output live)
// Body: { code: string, width?: number, height?: number }
// Response: text/event-stream
//   data: {"type":"log","text":"..."}
//   data: {"type":"done","id":"...","success":true,"elapsed":"1.2"}
//   data: {"type":"done","success":false,"error":"..."}
// ──────────────────────────────────────────────────────────────
app.post('/api/compile-stream', async (req, res) => {
  const { code, width = 480, height = 320 } = req.body ?? {};
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'code (string) required' });
  }

  if (queueFull()) {
    return res
      .status(503)
      .json({ error: 'compile queue full, try again later' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (obj) => {
    res.write(`data: ${JSON.stringify(obj)}\n\n`);
  };

  const hash = createHash('sha256')
    .update(`${code}:${width}:${height}`)
    .digest('hex')
    .slice(0, 20);

  const artifactDir = join(ARTIFACTS_DIR, hash);
  const outJs = join(artifactDir, 'output.js');
  const outWasm = join(artifactDir, 'output.wasm');

  // Cache hit
  if (existsSync(outJs) && existsSync(outWasm)) {
    send({ type: 'done', id: hash, success: true, cached: true });
    return res.end();
  }

  mkdirSync(artifactDir, { recursive: true });
  const userCodePath = join(artifactDir, 'user_code.c');
  writeFileSync(userCodePath, `#include "lvgl.h"\n\n${code}\n`, 'utf8');

  send({ type: 'log', text: `[server] queued ${hash} (${width}x${height})` });

  await acquireSemaphore();
  send({ type: 'log', text: `[server] starting emcc...` });
  const t0 = Date.now();

  const args = emccArgsFor({ userCodePath, outJs, width, height });
  let proc;
  let semReleased = false;
  const releaseOnce = () => {
    if (!semReleased) {
      semReleased = true;
      releaseSemaphore();
    }
  };

  try {
    proc = spawn(emccPath, args);
  } catch (err) {
    releaseOnce();
    send({ type: 'done', success: false, error: String(err.message || err) });
    return res.end();
  }

  const stream = (chunk) => {
    const lines = chunk.toString().split('\n').filter(Boolean);
    for (const line of lines) send({ type: 'log', text: line });
  };
  proc.stdout.on('data', stream);
  proc.stderr.on('data', stream);

  // 3-minute timeout safeguard (mirrors blocking endpoint)
  const timeout = setTimeout(() => {
    try {
      proc.kill('SIGKILL');
    } catch {}
  }, 180_000);

  proc.on('error', (err) => {
    clearTimeout(timeout);
    releaseOnce();
    try {
      rmSync(artifactDir, { recursive: true });
    } catch {}
    send({
      type: 'done',
      success: false,
      error: 'spawn error: ' + (err.message || String(err)),
    });
    res.end();
  });

  proc.on('close', (exitCode) => {
    clearTimeout(timeout);
    releaseOnce();
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    if (exitCode === 0) {
      console.log(`[compile-stream] ${hash} — done in ${elapsed}s`);
      send({ type: 'done', id: hash, success: true, elapsed });
    } else {
      console.error(
        `[compile-stream] ${hash} — failed (exit ${exitCode}) in ${elapsed}s`
      );
      try {
        rmSync(artifactDir, { recursive: true });
      } catch {}
      send({
        type: 'done',
        success: false,
        error: `emcc exited with code ${exitCode}`,
      });
    }
    res.end();
  });

  // Client disconnected — kill the process and release the slot
  req.on('close', () => {
    if (proc && proc.exitCode === null) {
      try {
        proc.kill();
      } catch {}
    }
    clearTimeout(timeout);
    releaseOnce();
  });
});

// ──────────────────────────────────────────────────────────────
// GET /api/artifact/:id/output.js
// GET /api/artifact/:id/output.wasm
// ──────────────────────────────────────────────────────────────
app.get('/api/artifact/:id/:file', (req, res) => {
  const { id, file } = req.params;
  if (!/^[a-f0-9]{20}$/.test(id) || !/^output\.(js|wasm)$/.test(file)) {
    return res.status(400).end();
  }
  const filePath = join(ARTIFACTS_DIR, id, file);
  if (!existsSync(filePath)) return res.status(404).end();

  if (file.endsWith('.wasm')) res.type('application/wasm');
  else res.type('application/javascript');
  res.sendFile(filePath);
});

// ──────────────────────────────────────────────────────────────
// GET /api/health
// ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    emcc: emccPath,
    activeJobs,
    queued: waitQueue.length,
  });
});

// ──────────────────────────────────────────────────────────────
// Artifact cleanup (TTL 7 days)
// Runs at startup and every hour.
// ──────────────────────────────────────────────────────────────
const ARTIFACT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function cleanupArtifacts() {
  const now = Date.now();
  try {
    const dirs = readdirSync(ARTIFACTS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    for (const dir of dirs) {
      const dirPath = join(ARTIFACTS_DIR, dir);
      try {
        const stat = statSync(dirPath);
        if (now - stat.mtimeMs > ARTIFACT_TTL_MS) {
          rmSync(dirPath, { recursive: true, force: true });
          console.log(`[cleanup] removed ${dir}`);
        }
      } catch (e) {
        console.warn(`[cleanup] skip ${dir}:`, e.message);
      }
    }
  } catch (e) {
    console.error('[cleanup] error:', e.message);
  }
}

cleanupArtifacts();
setInterval(cleanupArtifacts, 60 * 60 * 1000);

app.listen(3001, () =>
  console.log('LVGL compile server → http://localhost:3001')
);
