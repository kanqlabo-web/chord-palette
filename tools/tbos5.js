const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); await p.goto('http://localhost:8765/beta/'); await p.waitForTimeout(500);
console.log(await p.evaluate(async()=>{ $('modePick').hidden=true; MODE='free'; setStyle(styleBy('ボサノバ')); state.bpm=140; state.key='C'; const C=(o,q,x)=>({o,q,x,b:null});
 state.slots=[C(0,'maj','M9'),C(0,'maj','M9'),C(2,'maj','9'),C(2,'maj','9'),C(2,'m','9'),C(7,'maj','7b13'),C(0,'maj','M9'),C(1,'maj','9'),...Array(8).fill(null)]; state.segs=state.slots.map(()=>[]); state.bars=8; state.len=4; renderAll(); await ensureSounds();
 const sd=stepDur(); const ev=captureSong().ev; const out=[];
 for(let bar=0;bar<8;bar++){ const g=ev.filter(e=>e.k==='key'&&Math.round(e.t/sd)>=bar*16&&Math.round(e.t/sd)<bar*16+16); const by={}; g.forEach(e=>{ const s=Math.round(e.t/sd)-bar*16; (by[s]=by[s]||[]).push(midiName(e.n)); }); out.push('bar'+(bar+1)+': '+Object.keys(by).sort((a,b)=>a-b).map(s=>s+'['+by[s].join(' ')+']').join(' ')); }
 const dr=ev.filter(e=>e.k==='drum'&&e.t/sd<32).map(e=>Math.round(e.t/sd)+':'+e.n).join(' ');
 return out.join('\n')+'\nDRUM '+dr; }), errs);
await b.close(); })();
