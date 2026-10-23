const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push(m.text()); });
await p.goto('http://localhost:8765/'); await p.waitForTimeout(600);
const r=await p.evaluate(async()=>{ $('modePick').hidden=true; MODE='free'; const C=(o,q,x)=>({o,q,x,b:null}); const out=[];
 const run=async(name,slots)=>{ setStyle(styleBy(name)); state.key='C'; state.slots=[...slots,...Array(16-slots.length).fill(null)]; state.segs=state.slots.map(()=>[]); state.bars=slots.length; state.len=4; renderAll(); await ensureSounds(); return {sd:stepDur(), ev:captureSong().ev}; };
 // ボサノバ
 let {sd,ev}=await run('ボサノバ',[C(0,'maj','M9'),C(9,'m','7'),C(2,'m','9'),C(7,'maj','7')]);
 const by={}; ev.filter(e=>e.k==='drum'&&e.t/sd<32).forEach(e=>{ (by[e.n]=by[e.n]||[]).push(Math.round(e.t/sd)+'@'+e.v.toFixed(2)); }); out.push('BOSSA '+JSON.stringify(by));
 // アニソン
 ({sd,ev}=await run('疾走系（アニソン）',[C(0,'maj',null),C(7,'maj',null)])); out.push('ANISON arp2='+JSON.stringify(state.arp2)+' key2 events='+ev.filter(e=>e.k==='key2').length);
 // 壮大：ホルン
 ({sd,ev}=await run('壮大',[C(0,'maj',null),C(5,'maj',null),C(7,'maj',null),C(0,'maj',null),C(9,'m',null),C(5,'maj',null),C(7,'maj',null),C(0,'maj',null)]));
 out.push('EPIC mix '+JSON.stringify(state.mix)+' horn: '+ev.filter(e=>e.k==='key2').map(e=>Math.round(e.t/sd)+':'+midiName(e.n)+'/'+(e.d/sd).toFixed(1)).join(' '));
 // 弾き語り：ストロークのずれ
 ({sd,ev}=await run('弾き語り',[C(0,'maj',null),C(7,'maj',null)]));
 const g=ev.filter(e=>e.k==='key'&&e.t<sd*0.9).map(e=>midiName(e.n)+'+'+((e.t)*1000).toFixed(1)+'ms'); out.push('STRUM '+g.join(' '));
 out.push('INSTS '+Object.keys(INSTS).join(',')+' | KITS '+Object.keys(KITS).join(','));
 return out.join('\n'); });
console.log(r); console.log('ERRS',errs); await b.close(); })();
