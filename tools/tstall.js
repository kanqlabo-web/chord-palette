const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch(); for(const u of ['','beta/']){ const p=await b.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/'+u); await p.waitForTimeout(800);
console.log(u||'main', await p.evaluate(async()=>{ try{$('modePick').hidden=true;}catch(e){} MODE='free'; const C=(o,q,x)=>({o,q,x:x||'',b:null});
 setStyle(styleBy('シティポップ')); state.key='C';
 state.slots=[C(2,'m','11'),C(7,'maj','7'),C(0,'maj','M7'),C(9,'m','9'),...Array(12).fill(null)]; state.segs=Array.from({length:16},()=>[]); state.bars=4; state.len=4; renderAll(); await ensureSounds();
 const out=['arp='+state.arp+' arp2='+state.arp2+' inst2='+state.inst2];
 ensureAudio(); for(let g=0;g<64;g++){ try{ scheduleStep(g,ctx.currentTime+1+g*.1); }catch(e){ out.push('g'+g+': '+e.message+' '+(e.stack||'').split('\n').slice(1,6).join(' | ')); } }
 return out.join('\n'); }), errs); await p.close(); } await b.close(); })();
