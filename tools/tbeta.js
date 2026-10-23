const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(/fail/i.test(m.text())) errs.push(m.text()); }); await p.goto('http://localhost:8765/beta/'); await p.waitForTimeout(600);
const r=await p.evaluate(async()=>{ $('modePick').hidden=true; MODE='free'; try{endTutorial(true);closeCoach();}catch(e){} const out=[];
 const nm=m=>midiName(m); const C=(o,q,x,b=null)=>({o,q,x,b});
 for(const [st,key,pr] of [['ファンキー','C',[C(2,'m','7'),C(7,'maj','7'),C(4,'m','7'),C(9,'m','7')]],['レゲエ','G',[0,3,4,3]],['ジャジー','C',[C(2,'m','9'),C(7,'maj','13'),C(0,'maj','M9'),C(9,'m','7')]],['疾走系（アニソン）','D',[0,4,5,3]],['バラード','E♭',[0,4,5,3]],['ボサノバ','C',[C(2,'m','9'),C(7,'maj','7'),C(0,'maj','M7'),C(9,'m','7')]],['ボサノバ','F',[C(0,'maj','M7'),C(2,'m','7'),C(4,'m','7'),C(1,'maj','7')]],['壮大','C',[0,5,3,4]]]){
  setStyle(styleBy(st)); state.bpm=styleBy(st).bpm; state.key=key; state.slots=[...pr,...Array(12).fill(null)]; state.segs=state.slots.map(()=>[]); state.bars=4; state.len=4; renderAll(); await ensureSounds();
  const sd=stepDur(); const ev=captureSong().ev; const k2=ev.filter(e=>e.k==='key2'), k1=ev.filter(e=>e.k==='key');
  const bar1=x=>x.filter(e=>{ const s=Math.round(e.t/sd*4)/4; return s>=16&&s<32; }).map(e=>((e.t/sd)%16).toFixed(2)+':'+nm(e.n)).join(' ');
  out.push(`${st}: sets=${neededSets().map(n=>n+(LOADED[n]?'':'(x)')).join(',')} key=${k1.length} key2=${k2.length}\n  bar2 key2: ${bar1(k2).slice(0,200)}\n  bar2 key: ${bar1(k1).slice(0,160)}`); }
 return out.join('\n'); });
console.log(r); console.log(errs); await b.close(); })();
