// Environment notes (cloud container, 2026-10-04): Playwright lives at /opt/node-tools/node_modules/playwright and Chromium at /opt/pw-browsers/chromium.
// The container's HTTPS proxy re-signs TLS, so Chromium needs the proxy CA in its NSS store first:
//   apt-get install -y libnss3-tools && certutil -A -d sql:$HOME/.pki/nssdb -n ccr-agent-proxy -t "C,," -i /root/.ccr/agent-proxy-ca.crt
// There is no GPU: Chromium falls back to SwiftShader and the game renders at ~1.7 fps, so these scripts show WHAT is on screen, never how it FEELS.
import { chromium, devices } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', proxy:{server:process.env.HTTPS_PROXY}, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ ...devices['iPhone 13'], viewport:{width:375,height:812} });
const p = await ctx.newPage();
const logs=[]; p.on('console', m=>{ if(['error','warning'].includes(m.type())) logs.push(m.type()+': '+m.text())}); p.on('pageerror', e=>logs.push('PAGEERROR '+e.message));
await p.goto('https://frankendom.com', {waitUntil:'networkidle', timeout:60000});
await p.waitForTimeout(12000);
await p.tap('#attack-button'); await p.waitForTimeout(2000);
const btns = await p.$$eval('button', els=>els.filter(e=>e.offsetParent).map(e=>{const r=e.getBoundingClientRect();return {id:e.id,t:e.innerText.trim(),a:e.getAttribute('aria-label'),x:r.x+r.width/2,y:r.y+r.height/2}}));
console.log(JSON.stringify(btns));
const fps = await p.evaluate(()=>new Promise(r=>{let n=0;const t=performance.now();const f=()=>{n++; if(performance.now()-t<3000) requestAnimationFrame(f); else r(n/3)};requestAnimationFrame(f)}));
console.log('FPS', fps.toFixed(1));
const byText = t=>btns.find(x=>x.t.toUpperCase()===t);
const tapAt = async (bt,ms=60)=>{ await p.mouse.move(bt.x,bt.y); await p.mouse.down(); await p.waitForTimeout(ms); await p.mouse.up(); };
const stickC={x:70,y:740};
const stick = async (dx,dy,ms)=>{ await p.mouse.move(stickC.x,stickC.y); await p.mouse.down(); await p.mouse.move(stickC.x+dx,stickC.y+dy,{steps:3}); await p.waitForTimeout(ms); await p.mouse.up(); };
const readFeed = ()=>p.evaluate(()=>document.body.innerText.split('\n').map(s=>s.trim()).filter(Boolean));
let prev=new Set(await readFeed());
const plan = [];
const seq = ['SLASH','SLASH','STAB','KICK','HEAVY','GUARD','ROLL','SKILL','SLASH','STAB','SLASH','GUARD','HEAVY','fwd','SLASH','left','STAB'];
const t0=Date.now(); let i=0, shot=10, done=false;
while(Date.now()-t0<200000 && !done){
  const m=seq[i%seq.length];
  try{
    if(m==='fwd') await stick(0,-45,600);
    else if(m==='left') await stick(-45,0,500);
    else { const bt=byText(m); if(bt) await tapAt(bt, m==='HEAVY'?900: m==='GUARD'?800:60); }
  }catch(e){}
  await p.waitForTimeout(250);
  const lines=await readFeed(); const nw=lines.filter(l=>!prev.has(l)); prev=new Set(lines);
  console.log(`t=${Math.round((Date.now()-t0)/1000)} ${m} -> ${nw.join(' | ')}`);
  if(i%15===0){ await p.screenshot({path:`${shot++}-p.png`}); }
  if(lines.some(l=>/victory|you won|defeat|you fell|rematch|next fight|continue|claim/i.test(l))){ done=true; }
  i++;
}
for(let k=0;k<4;k++){ await p.waitForTimeout(2500); await p.screenshot({path:`${shot++}-after.png`}); }
console.log('FINAL', (await readFeed()).join(' | '));
console.log('---LOGS'); console.log(logs.slice(0,30).join('\n'));
await b.close();
