// ビギナーのバラードと、PRO でマイ演奏に取り込んだものが同じ音になるか
const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/'); await p.waitForTimeout(600);
console.log(await p.evaluate(async()=>{ $('modePick').hidden=true; MODE='free'; const C=(o,q,x,b)=>({o,q,x:x||'',b:b??null});
 const setup=()=>{ state.key='F'; state.bpm=80; const sl=[C(0,'maj','add9'),C(7,'maj','add9',11),C(5,'maj','',9),C(0,'maj','add9'),C(5,'maj','add9'),C(0,'maj','',4),C(3,'m-5','dim7'),C(2,'m','7')];
   state.slots=[...sl,...Array(8).fill(null)]; state.segs=Array.from({length:16},()=>[]); state.segs[2]=[{beat:3,v:C(5,'m','',8)}]; state.segs[7]=[{beat:3,v:C(7,'sus4','')},{beat:4,v:C(7,'maj','')}]; state.bars=8; state.len=4; renderAll(); };
 const cap=()=>{ const sd=stepDur(); return captureSong().ev.filter(e=>e.k==='key').map(e=>Math.round(e.t/sd*4)/4+':'+e.n+':'+Math.round(e.d/sd*4)/4+':'+Math.round(e.v*100)).sort(); };
 setStyle(styleBy('バラード')); state.pro=false; setup(); await ensureSounds(); const A=cap();
 state.pro=true; state.lhLo=LH_DEF+3; state.rhLo=null; newMy('arp','pballad'); setup(); const B=cap();
 const my=state.myArps[state.myArps.length-1]; const strip=x=>x.split(':').slice(0,3).join(':');
 const sa=new Set(A.map(strip)), sb=new Set(B.map(strip)); const onlyA=[...sa].filter(x=>!sb.has(x)), onlyB=[...sb].filter(x=>!sa.has(x));
 return `normal ${A.length} notes, PRO ${B.length} notes; differ: ${onlyA.length}/${onlyB.length}\n onlyNormal ${onlyA.slice(0,8).join(' ')}\n onlyPRO ${onlyB.slice(0,8).join(' ')}\n scenes ${Object.keys(my.sitNotes||{}).join(',')} opts lhFull=${my.lhFull} rhMid=${my.rhMid} r9=${my.notes.filter(n=>n.r==='9').length} nt=${my.notes.filter(n=>n.nt).length} oc4=${(my.sitNotes.bar4th||[]).filter(n=>n.oc).length}`; }), errs); await b.close(); })();
