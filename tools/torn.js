// バラードの飾り（10〜15マス目）を、いろいろな進行で書き出す。同時に2音以上鳴る所・前のコードとぶつかる音を探す
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/'); await p.waitForTimeout(600);
console.log(await p.evaluate(async()=>{ $('modePick').hidden=true; MODE='free'; const C=(o,q,x)=>({o,q,x:x||'',b:null});
 const PROGS={'C-G-Am-F':[C(0,'maj'),C(7,'maj'),C(9,'m'),C(5,'maj')],'C-E7-Am-F':[C(0,'maj'),C(4,'maj','7'),C(9,'m'),C(5,'maj')],
  'FM7-G-Em-Am':[C(5,'maj','M7'),C(7,'maj'),C(4,'m','7'),C(9,'m')],'Am-Em-F-C':[C(9,'m'),C(4,'m'),C(5,'maj'),C(0,'maj')],
  'CM7-Am7-Dm7-G7':[C(0,'maj','M7'),C(9,'m','7'),C(2,'m','7'),C(7,'maj','7')],'C-A7-Dm-G7':[C(0,'maj'),C(9,'maj','7'),C(2,'m'),C(7,'maj','7')]};
 const out=[]; const nm=n=>midiName(n);
 for(const [k,sl] of Object.entries(PROGS)){ setStyle(styleBy('バラード')); state.key='C'; state.slots=[...sl,...sl,...Array(8).fill(null)]; state.segs=Array.from({length:16},()=>[]); state.bars=8; state.len=4; renderAll(); await ensureSounds();
   const sd=stepDur(), ev=captureSong().ev.filter(e=>e.k==='key');
   const rows=[];
   for(let bar=0;bar<8;bar++){ const v=state.slots[bar], bt=chordNotes(v,null), pcs=new Set(bt.ivs.map(i=>(bt.rpc+i)%12));
     const body=ev.filter(e=>{ const s=e.t/sd-bar*16; return s>=-.01&&s<10&&e.n>=55; }).map(e=>e.n);
     const orn=ev.filter(e=>{ const s=e.t/sd-bar*16; return s>=10-.01&&s<16-.01&&e.n>=55; });
     const byS={}; orn.forEach(e=>{ const s=Math.round((e.t/sd-bar*16)*2)/2; (byS[s]=byS[s]||[]).push(e.n); });
     const top=Math.max(...body);
     rows.push(`${bar+1}:${k.split("-")[bar%4]} top${nm(top)} → `+Object.entries(byS).map(([s,ns])=>s+':'+ns.map(n=>nm(n)+(pcs.has(n%12)?'':'*')).join('+')).join(' ')); }
   out.push('== '+k+'\n'+rows.join('\n')); }
 return out.join('\n'); }), errs); await b.close(); })();
