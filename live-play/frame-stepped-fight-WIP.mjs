// Environment notes (cloud container, 2026-10-04): Playwright lives at /opt/node-tools/node_modules/playwright and Chromium at /opt/pw-browsers/chromium.
// The container's HTTPS proxy re-signs TLS, so Chromium needs the proxy CA in its NSS store first:
//   apt-get install -y libnss3-tools && certutil -A -d sql:$HOME/.pki/nssdb -n ccr-agent-proxy -t "C,," -i /root/.ccr/agent-proxy-ca.crt
// There is no GPU: Chromium falls back to SwiftShader and the game renders at ~1.7 fps, so these scripts show WHAT is on screen, never how it FEELS.
import { chromium, devices } from '/opt/node-tools/node_modules/playwright/index.mjs';
const STYLE = process.argv[2] || 'reactive';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium', proxy:{server:process.env.HTTPS_PROXY}, args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ ...devices['iPhone 13'], viewport:{width:375,height:812} });
const p = await ctx.newPage();
const errs=[]; p.on('pageerror', e=>errs.push(e.message));
await p.clock.install();
await p.goto('https://frankendom.com/?dpr=1', {waitUntil:'networkidle', timeout:60000});
await p.waitForTimeout(12000);
{ const bb=await (await p.$('#attack-button')).boundingBox(); await p.mouse.click(bb.x+bb.width/2, bb.y+bb.height/2); }
await p.waitForTimeout(3000);
await p.clock.pauseAt(await p.evaluate(()=>Date.now()) + 50);
const pos = await p.$$eval('button', els=>Object.fromEntries(els.filter(e=>e.offsetParent).map(e=>{const r=e.getBoundingClientRect();return [e.id,{x:r.x+r.width/2,y:r.y+r.height/2}]})));
const ST = ()=>p.evaluate(()=>{const g=id=>document.getElementById(id); const cs=g('combat-status');
  return {opp:+g('target-health').value, me:+g('player-health').value, st:+g('stamina').value, myPost:+g('posture').value, oppPost:+g('target-posture').value,
  threat:cs.dataset.threat==='true', move:cs.dataset.move, reach:g('kick-button')?.dataset.reach==='true', msg:cs.innerText.trim(), end:/fell|Rematch|victor|won|Claim/i.test(document.body.innerText)};});
let game=0; const step = async ms=>{ await p.clock.runFor(ms); game+=ms; };
let held=null;
const press = async id=>{ if(held){ await p.mouse.up(); held=null;} const q=pos[id]; await p.mouse.move(q.x,q.y); await p.mouse.down(); held=id; };
const release = async()=>{ if(held){ await p.mouse.up(); held=null; } };
const stickC={x:70,y:740};
const tap = async (id, ms=50)=>{ await press(id); await step(ms); await release(); };
let last='', shots=0, guards=0, rolls=0, attacks=0, i=0, s=await ST();
const log=[]; const t0=Date.now();
while(!s.end && game<150000 && Date.now()-t0<540000){
  if(s.threat){
    if(STYLE==='reactive'){
      const heavyish=/heavy|overhead|charge|thrust/i.test(s.move);
      if(heavyish && s.st>25){ await tap('dodge-button'); rolls++; await step(250); }
      else { if(held!=='guard-button'){ await press('guard-button'); guards++; } await step(100); }
    } else { await tap('attack-button'); attacks++; await step(150); }
  } else {
    if(held==='guard-button') await release();
    if(!s.reach){ await p.mouse.move(stickC.x,stickC.y); await p.mouse.down(); await p.mouse.move(stickC.x,stickC.y-45,{steps:2}); await step(250); await p.mouse.up(); }
    else if(s.st>35){
      const r=i%5; i++;
      if(r===3){ await press('heavy-button'); await step(600); await release(); }
      else if(r===4) await tap('thrust-button');
      else await tap('attack-button');
      attacks++; await step(300);
    } else { await press('guard-button'); guards++; await step(300); await release(); }
  }
  s=await ST();
  const line=`opp ${s.opp} me ${s.me} st ${Math.round(s.st)} | ${s.msg}${s.threat?' [THREAT '+s.move+']':''}`;
  if(s.msg!==last){ log.push(`g=${(game/1000).toFixed(1)}s ${line}`); last=s.msg; }

}
await release();
await p.clock.resume(); await p.waitForTimeout(4000); await p.screenshot({path:`${STYLE}-end.png`});
console.log(log.join('\n'));
console.log(`END game=${(game/1000).toFixed(1)}s wall=${Math.round((Date.now()-t0)/1000)}s attacks=${attacks} guards=${guards} rolls=${rolls}`, JSON.stringify(await ST()));
console.log('BODY', (await p.evaluate(()=>document.body.innerText)).replace(/\s+/g,' ').slice(0,400));
console.log('ERRS', errs.join('\n'));
await b.close();
