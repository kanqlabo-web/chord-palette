// ランダムな進行（小節の途中で変わるものも）で、飾りが2音同時に鳴る所と、今のコードの音階の外の飾りを探す
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); await p.goto('http://localhost:8765/'); await p.waitForTimeout(600);
console.log(await p.evaluate(async()=>{ $('modePick').hidden=true; MODE='free'; const C=(o,q,x)=>({o,q,x:x||'',b:null});
 const POOL=[C(0,'maj'),C(2,'m','7'),C(4,'m'),C(5,'maj','M7'),C(7,'maj','7'),C(9,'m'),C(4,'maj','7'),C(9,'maj','7'),C(2,'maj','7'),C(0,'maj','M7'),C(5,'maj','add9'),C(10,'maj'),C(5,'m'),C(11,'m-5','7')];
 let seed=7; const rnd=n=>{ seed=(seed*1103515245+12345)%2147483648; return seed%n; };
 setStyle(styleBy('バラード')); state.key='C'; let dbl=[], tot=0, out=0, outs=[];
 for(let trial=0;trial<40;trial++){ const sl=Array.from({length:8},()=>POOL[rnd(POOL.length)]); state.slots=[...sl,...Array(8).fill(null)]; state.segs=Array.from({length:16},()=>[]);
   for(let i=0;i<8;i++) if(rnd(4)===0) state.segs[i]=[{beat:3,v:POOL[rnd(POOL.length)]}];
   state.bars=8; state.len=4; renderAll(); await ensureSounds(); const sd=stepDur(), ev=captureSong().ev.filter(e=>e.k==='key'&&e.n>=55);
   const by={}; ev.forEach(e=>{ const s=Math.round(e.t/sd*2)/2; (by[s]=by[s]||[]).push(e.n); });
   for(const [s,ns] of Object.entries(by)){ const pos=((+s)%16+16)%16; if(pos>=12&&pos<16){ tot++; if(ns.length===2) dbl.push(trial+':'+s+':'+ns.map(midiName).join('+')); } } }
 return `ornament-time onsets ${tot}, two-note onsets ${dbl.length}\n`+dbl.slice(0,10).join('\n'); }), errs); await b.close(); })();
