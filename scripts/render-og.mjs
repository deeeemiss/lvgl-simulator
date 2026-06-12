import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath  = resolve(__dirname, '../public/og.svg');
const pngPath  = resolve(__dirname, '../public/og.png');

const svg = fs.readFileSync(svgPath, 'utf8');
const html = `<!doctype html><html><head><style>
  html,body{margin:0;padding:0;background:#0e0d1c;}
  svg{display:block;}
</style></head><body>${svg}</body></html>`;

const browser = await chromium.launch();
const ctx     = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
const page    = await ctx.newPage();
await page.setContent(html, { waitUntil: 'networkidle' });
await page.screenshot({ path: pngPath, type: 'png', omitBackground: false, clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();

console.log(`✓ Rendered ${pngPath}`);
