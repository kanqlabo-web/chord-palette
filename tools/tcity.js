const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/'); await p.waitForTimeout(600);
console.log(await p.evaluate(async()=>{ $('modePick').hidden=true; MODE='free'; const C=(o,q,x)=>({o,q,x:x||'',b:null});
 setStyle(styleBy('シティポップ')); state.key='C'; state.bpm=103;
 state.slots=[C(9,'m'),C(4,'m'),C(5,'maj'),C(0,'maj'),...Array(12).fill(null)]; state.segs=Array.from({length:16},()=>[]); state.bars=4; state.len=4; renderAll(); await ensureSounds();
 const sd=stepDur(); const ev=captureSong().ev; const out=['arp='+state.arp+' arp2='+state.arp2];
 for(let bar=0;bar<4;bar++) for(const k of ['key','key2','bass']){ const g=ev.filter(e=>e.k===k&&e.t/sd>=bar*16-.6&&e.t/sd<bar*16+15.4).sort((a,b)=>a.t-b.t);
   out.push(' bar '+(bar+1)+' '+k+' '+g.map(e=>(Math.round((e.t/sd-bar*16)*2)/2)+':'+midiName(e.n)+'('+(e.d/sd).toFixed(1)+')').join(' ')); }
 return out.join('\n'); }), errs); await b.close(); })();
