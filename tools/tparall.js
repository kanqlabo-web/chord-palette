// 全スタイルで、ビギナーの演奏と、PRO（スタイルを読み込んで、全パートをマイ演奏に取り込んだもの）が完全に同じ音になるか
// 使い方: node tools/tparall.js [ページ（beta/ など）]
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/'+(process.argv[2]||'beta/')); await p.waitForTimeout(700);
const r=await p.evaluate(async()=>{ $('modePick').hidden=true; MODE='free'; const C=(o,q,x,b)=>({o,q,x:x||'',b:b??null});
 const progs=[[C(0,'maj'),C(9,'m','7'),C(5,'maj','M7'),C(7,'maj','7'),C(4,'maj','7'),C(9,'m'),C(2,'m','7'),C(7,'sus4')],
              [C(5,'maj','add9'),C(7,'maj','',11),C(4,'m','7'),C(9,'m'),C(10,'maj'),C(7,'maj','7'),C(0,'maj','M7'),C(8,'maj')]];
 const seed=()=>{ let x=12345; Math.random=()=>{ x=(x*1103515245+12345)%2147483648; return x/2147483648; }; };
 const cap=()=>{ seed(); const sd=stepDur(); return captureSong().ev.map(e=>e.k+':'+(e.t/sd).toFixed(3)+':'+e.n+':'+(e.d/sd).toFixed(3)+':'+e.v.toFixed(3)).sort(); };
 const out={};
 for(const st of STYLES){ let bad=[];
  for(const [pi,pr] of progs.entries()){
   const setup=()=>{ state.key=pi?'E':'C'; state.bpm=st.bpm||100; state.slots=[...pr,...Array(8).fill(null)]; state.segs=Array.from({length:16},()=>[]); if(pi) state.segs[1]=[{beat:3,v:C(2,'m','7')}]; state.bars=8; state.len=4; state.fill=true; };
   state.pro=false; setStyle(st); setup(); renderAll(); await ensureSounds(); const A=cap();
   state.pro=true; proFromStyle(st); setup(); for(const k of ['arp','arp2','drum','bass']){ if(k==='arp2'&&!state.arp2) continue; if(k==='bass'&&!state.bass) continue; newMy(k,state[k==='bass'?'bassPat':k]||'auto'); } setup(); rebuildMy(); renderAll(); await ensureSounds(); const B=cap();
   const cnt=a=>{ const m=new Map(); a.forEach(x=>m.set(x,(m.get(x)||0)+1)); return m; }, ma=cnt(A), mb=cnt(B);
   const oa=[...ma].filter(([x,c])=>(mb.get(x)||0)<c).map(([x])=>x), ob=[...mb].filter(([x,c])=>(ma.get(x)||0)<c).map(([x])=>x);
   if(oa.length||ob.length) bad.push(`prog${pi}: normal ${A.length} PRO ${B.length} onlyN ${oa.length} [${oa.slice(0,4).join(' ')}] onlyP ${ob.length} [${ob.slice(0,4).join(' ')}]`); }
  out[st.name]=bad; }
 return out; });
let ng=0; for(const k in r){ if(r[k].length){ ng++; console.log('NG',k); r[k].forEach(x=>console.log('   ',x)); } else console.log('OK',k); }
console.log(ng?`${ng} styles differ`:'ALL SAME', errs); await b.close(); })();
