const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); await p.goto('http://localhost:8765/'); await p.waitForTimeout(500);
const r=await p.evaluate(async()=>{ $('modePick').hidden=true; MODE='free'; setStyle(styleBy('シティポップ')); state.key='B♭'; state.pro=true;
 state.slots=[{o:5,q:'maj',x:'M7',b:null},4,{o:4,q:'m',x:'7',b:null},5,...Array(12).fill(null)]; state.bars=4; state.len=4; renderAll(); await ensureSounds();
 const sig=()=>{ const ev=captureSong().ev.filter(e=>e.k==='key2'); return ev.map(e=>e.n).join(',')+' |'+ev.length; };
 const a=sig(); newMy('arp2','brassobb'); const m=ARPS[state.arp2]; const b2=sig();
 return {same:a===b2, a:a.slice(0,80), b:b2.slice(0,80), flags:[m.push2nd,m.swing16,m.loose,m.melOct,m.noRoot,m.avoid,m.rhShift,m.pushBy]}; });
console.log(JSON.stringify(r,null,1), errs); await b.close(); })();
