// Verifies the "start a fight at ladder level N" trick: the game reads sessionStorage['frankendom.dev-kit'] = {"level":N} at boot (src/sparring.ts devKit, src/main.ts kit.level).
// Usage: node live-play/verify-devkit-level.mjs [level,...]   Prints the opponent card text at each level and saves devkit-L<N>.png.
// Environment notes: see live-play/open-and-screenshot.mjs (proxy CA in NSS store; Playwright path; no GPU so it is slow).
import { chromium, devices } from '/opt/node-tools/node_modules/playwright/index.mjs';
const levels = (process.argv[2] ?? '1,12').split(',').map(Number);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', proxy: { server: process.env.HTTPS_PROXY }, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (const level of levels) {
  const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 375, height: 812 } });
  await ctx.addInitScript((lv) => { try { if (lv > 1) sessionStorage.setItem('frankendom.dev-kit', JSON.stringify({ level: lv })); } catch {} }, level);
  const p = await ctx.newPage();
  await p.goto('https://frankendom.com', { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(9000);
  const text = (await p.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 260);
  console.log(`level ${level}:`, text);
  await p.screenshot({ path: `devkit-L${level}.png` });
  await ctx.close();
}
await b.close();
