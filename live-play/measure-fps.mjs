// Measures real frame rates of frankendom.com on THIS machine, and says which renderer drew them, so a run on a laptop with a GPU can be told from the
// cloud container's software renderer (SwiftShader, ~1.7 fps). Frames are timed with requestAnimationFrame from before the page loads.
//
//   npm i playwright && npx playwright install chromium           (once, on your Mac)
//   node live-play/measure-fps.mjs --gpu --headed --level=12 --seconds=30
//
// Flags: --url=<page> (default https://frankendom.com)  --level=<1-46> (starts the fight at that ladder level via the dev kit)  --seconds=<fight seconds, default 20>
//        --gpu (use the machine's GPU: no SwiftShader flags)  --headed (visible window; usually the surest way to get the GPU)  --dpr=<1|1.5|2|3>  --phone=0 (desktop viewport instead of 375x812)
// Output: the WebGL renderer string, then fps / low-fps / slow-frame counts for three phases (loading, idle, fighting), and a JSON line. Saves fps-*.png.
// Read it as: "renderer" must name your GPU (Apple/NVIDIA/AMD/Intel), not SwiftShader/llvmpipe. Smooth on a phone-class budget means p5 fps >= ~30 and < 5 % frames over 33 ms.
let pw; try { pw = await import('playwright'); } catch { pw = await import('/opt/node-tools/node_modules/playwright/index.mjs'); }   // the second path is the cloud container's
const { chromium, devices } = pw;
import fs from 'node:fs';

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const flag = (name) => process.argv.includes(`--${name}`);
const url = arg('url', 'https://frankendom.com'), seconds = Number(arg('seconds', 20)), level = Number(arg('level', 0)), dpr = arg('dpr', '');
const phone = arg('phone', '1') !== '0', gpu = flag('gpu'), headed = flag('headed');

const launch = {
  headless: !headed,
  args: gpu ? ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-zero-copy'] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  ...(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {}),   // the cloud container's Chromium
  ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}),
};
const browser = await chromium.launch(launch);
const ctx = await browser.newContext(phone ? { ...devices['iPhone 13'], viewport: { width: 375, height: 812 } } : { viewport: { width: 1280, height: 800 } });
await ctx.addInitScript((lv) => {
  try { if (lv > 1) sessionStorage.setItem('frankendom.dev-kit', JSON.stringify({ level: lv })); } catch {}
  window.__frames = []; let last = performance.now();
  const tick = (t) => { window.__frames.push([t, t - last]); last = t; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}, level);
const page = await ctx.newPage();
await page.goto(url + (dpr ? `/?dpr=${dpr}` : ''), { waitUntil: 'networkidle', timeout: 120000 });

const renderer = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); const e = gl?.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : (gl ? 'webgl (renderer hidden)' : 'NO WEBGL'); });
console.log('renderer:', renderer);

const mark = () => page.evaluate(() => window.__frames.length);
const stats = async (from, to) => {
  const dts = (await page.evaluate(([a, b]) => window.__frames.slice(a, b).map((f) => f[1]), [from, to])).filter((d) => d > 0);
  if (!dts.length) return { frames: 0 };
  const sorted = [...dts].sort((x, y) => x - y), span = dts.reduce((s, d) => s + d, 0);
  const pct = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return { frames: dts.length, seconds: +(span / 1000).toFixed(1), fpsAvg: +(dts.length / (span / 1000)).toFixed(1), fpsP5: +(1000 / pct(0.95)).toFixed(1), fpsP1: +(1000 / pct(0.99)).toFixed(1), over33msPct: +(100 * dts.filter((d) => d > 33.4).length / dts.length).toFixed(1), over50ms: dts.filter((d) => d > 50).length, maxMs: Math.round(sorted.at(-1)) };
};

const loading = await mark();                       // everything before this point is page load
await page.waitForTimeout(8000);                     // let the loading card finish; the arena is idle with the Fight button showing
const idleStart = await mark(); await page.waitForTimeout(5000); const idleEnd = await mark();
await page.screenshot({ path: 'fps-idle.png' });
const fightButton = await page.$('#attack-button');
if (fightButton) { const bb = await fightButton.boundingBox(); await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); }   // Fight
await page.waitForTimeout(3000);
const fightStart = await mark();
const center = async (sel) => { const el = await page.$(sel); const bb = el && await el.boundingBox(); return bb && { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 }; };
const t0 = Date.now(); let i = 0;
while (Date.now() - t0 < seconds * 1000) {   // a plain mix of light cuts, heavies, guards and rolls: enough to exercise the effects, not meant to win
  const target = ['#attack-button', '#attack-button', '#heavy-button', '#guard-button', '#dodge-button'][i++ % 5];
  const c = await center(target); if (c) { await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.waitForTimeout(target === '#heavy-button' ? 700 : target === '#guard-button' ? 500 : 80); await page.mouse.up(); }
  await page.waitForTimeout(250);
}
const fightEnd = await mark();
await page.screenshot({ path: 'fps-fight.png' });

const result = { renderer, url, level: level || 'career', viewport: phone ? '375x812' : '1280x800', gpuFlag: gpu, loading: await stats(0, loading), idle: await stats(idleStart, idleEnd), fighting: await stats(fightStart, fightEnd) };
console.table({ loading: result.loading, idle: result.idle, fighting: result.fighting });
console.log(JSON.stringify(result));
await browser.close();
