// 全スタイルの音を書き出す（変更前後の比較用）
const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); await p.goto('http://localhost:8765/'); await p.waitForTimeout(600);
const r=await p.evaluate(async()=>{ $('modePick').hidden=true; MODE='free'; const C=(o,q,x)=>({o,q,x:x||'',b:null}); const o={};
 for(const st of STYLES){ setStyle(st); state.key='C'; state.slots=[C(0,'maj'),C(9,'m','7'),C(5,'maj','M7'),C(7,'maj','7'),C(4,'m'),C(2,'m','7'),C(5,'maj'),C(7,'sus4'),...Array(8).fill(null)]; state.segs=Array.from({length:16},()=>[]); state.bars=8; state.len=4; renderAll(); await ensureSounds(); const sd=stepDur();
   o[st.name]=captureSong().ev.filter(e=>e.k!=='drum').map(e=>e.k+':'+Math.round(e.t/sd*4)/4+':'+e.n); }
 return o; }); fs.writeFileSync(process.argv[2],JSON.stringify(r)); await b.close(); })();
