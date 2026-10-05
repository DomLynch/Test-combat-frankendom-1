// Environment notes (cloud container, 2026-10-04): Playwright lives at /opt/node-tools/node_modules/playwright and Chromium at /opt/pw-browsers/chromium.
// The container's HTTPS proxy re-signs TLS, so Chromium needs the proxy CA in its NSS store first:
//   apt-get install -y libnss3-tools && certutil -A -d sql:$HOME/.pki/nssdb -n ccr-agent-proxy -t "C,," -i /root/.ccr/agent-proxy-ca.crt
// There is no GPU: Chromium falls back to SwiftShader and the game renders at ~1.7 fps, so these scripts show WHAT is on screen, never how it FEELS.
import { chromium, devices } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', proxy:{server:process.env.HTTPS_PROXY}, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ ...devices['iPhone 13'], viewport:{width:375,height:812} });
const p = await ctx.newPage();
const logs=[]; p.on('console', m=>logs.push(m.type()+': '+m.text())); p.on('pageerror', e=>logs.push('PAGEERROR '+e.message));
await p.goto('https://frankendom.com', {waitUntil:'networkidle', timeout:60000}).catch(e=>logs.push('goto '+e.message));
await p.waitForTimeout(6000);
await p.screenshot({path:'01-landing.png'});
const btns = await p.$$eval('button, a, [role=button]', els=>els.filter(e=>e.offsetParent).map(e=>`${e.tagName} #${e.id} .${e.className} "${(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,40)}"`));
console.log(btns.join('\n')); console.log('---LOGS'); console.log(logs.slice(0,40).join('\n'));
await b.close();
