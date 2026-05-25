import express from 'express';
import { createHash } from 'crypto';
import { execFile } from 'child_process';
import { mkdirSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
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
// POST /api/compile
// Body: { code: string, width?: number, height?: number }
// Returns: { id: string, cached?: boolean }
// ──────────────────────────────────────────────────────────────
app.post('/api/compile', async (req, res) => {
  const { code, width = 480, height = 320 } = req.body ?? {};
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'code (string) required' });
  }

  const hash = createHash('sha256')
    .update(`${code}:${width}:${height}`)
    .digest('hex')
    .slice(0, 20);

  const artifactDir = join(ARTIFACTS_DIR, hash);
  const outJs   = join(artifactDir, 'output.js');
  const outWasm = join(artifactDir, 'output.wasm');

  // Cache hit
  if (existsSync(outJs) && existsSync(outWasm)) {
    return res.json({ id: hash, cached: true });
  }

  mkdirSync(artifactDir, { recursive: true });

  // Write user code wrapped in a header
  const userCodePath = join(artifactDir, 'user_code.c');
  const userCodeWrapped = `#include "lvgl.h"\n\n${code}\n`;

  const { writeFileSync } = await import('fs');
  writeFileSync(userCodePath, userCodeWrapped, 'utf8');

  // Collect LVGL sources if no pre-built lib
  let lvglSources = [];
  if (!existsSync(LVGL_LIB)) {
    console.warn('[warn] liblvgl.a not found — including LVGL sources directly (slow)');
    const { execSync } = await import('child_process');
    const srcList = execSync(
      `find ${LVGL_DIR}/src -name '*.c' ` +
      `! -path '*/drivers/wayland/*' ` +
      `! -path '*/drivers/x11/*' ` +
      `! -path '*/drivers/win32/*' ` +
      `! -path '*/drivers/nuttx/*' ` +
      `! -path '*/drivers/libinput/*'`
    ).toString().trim().split('\n').filter(Boolean);
    lvglSources = srcList;
  }

  const emccArgs = [
    userCodePath,
    TEMPLATE_MAIN,
    ...(existsSync(LVGL_LIB) ? [LVGL_LIB] : lvglSources),
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
    '-s', `INITIAL_MEMORY=67108864`,   // 64 MB
    '-O2',
    '--closure', '0',
    '-o', outJs,
  ];

  console.log(`[compile] ${hash} (${width}x${height}) — started`);
  const t0 = Date.now();

  try {
    const { stderr } = await execFileAsync(emccPath, emccArgs, {
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
    // Clean up partial artifacts
    try { const { rmSync } = await import('fs'); rmSync(artifactDir, { recursive: true }); } catch {}
    const errMsg = (err.stderr || err.stdout || err.message || String(err)).slice(0, 4000);
    res.status(500).json({ error: errMsg });
  }
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
  res.json({ ok: true, emcc: emccPath });
});

app.listen(3001, () => console.log('LVGL compile server → http://localhost:3001'));
