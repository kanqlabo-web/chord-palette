// バラードの再現テスト：MIDI と同じコードを入れて、小節ごとの音を書き出す
const {chromium}=require('playwright');
const PAGE=process.argv[2]||'http://localhost:8765/';
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto(PAGE); await p.waitForTimeout(600);
console.log(await p.evaluate(async(arg)=>{ $('modePick').hidden=true; MODE='free'; const C=(o,q,x,b)=>({o,q,x:x||'',b:b??null});
 setStyle(styleBy('バラード')); if(arg) { state.pro=true; state.arp=arg; } state.key='F'; state.bpm=80;
 const sl=[C(0,'maj','add9'),C(7,'maj','add9',11),C(5,'maj','',9),C(0,'maj','add9'),C(5,'maj','add9'),C(0,'maj','',4),C(3,'m-5','dim7'),C(2,'m','7')];
 state.slots=[...sl,...Array(8).fill(null)]; state.segs=Array.from({length:16},()=>[]); state.segs[2]=[{beat:3,v:C(5,'m','',8)}]; state.segs[7]=[{beat:3,v:C(7,'sus4','')},{beat:4,v:C(7,'maj','')}];
 state.bars=8; state.len=4; renderAll(); await ensureSounds(); const sd=stepDur(); const ev=captureSong().ev; const out=[];
 for(let bar=0;bar<8;bar++){ for(const k of ['bass','key']){ const g=ev.filter(e=>e.k===k&&Math.round(e.t/sd*2)/2>=bar*16-.01&&Math.round(e.t/sd*2)/2<bar*16+16-.01).sort((a,b)=>a.t-b.t||a.n-b.n);
   out.push(' bar '+(bar+1)+' '+k+' '+g.map(e=>{ const s=Math.round((e.t/sd-bar*16)*4)/4; return s+':'+midiName(e.n)+'('+(e.d/sd).toFixed(1)+','+Math.round(e.v*127)+')'; }).join(' ')); } }
 return out.join('\n'); }, process.argv[3]||''), errs); await b.close(); })();
