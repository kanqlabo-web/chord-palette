const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage({viewport:{width:390,height:844}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/'); await p.waitForTimeout(600);
await p.evaluate(async()=>{ $('modePick').hidden=true; MODE='free'; state.pro=true; document.body.classList.add('pro'); setStyle(styleBy('バラード')); renderAll(); openPatEditor('arp','edit'); });
await p.waitForTimeout(400);
const info=await p.evaluate(()=>{ PR.scene='bar4th'; renderPatEditor(); const sel=curMy().sitNotes.bar4th.find(n=>n.oc); PR.selSet=new Set([sel]); try{ fallRow(); }catch(e){ return 'fallRow ERR '+e.message; } return [ $('sceneChips').textContent, ($('prOctChips')||{}).textContent, ($('prFallChips')||{textContent:'none'}).textContent.slice(0,200) ].join(' | '); });
console.log(info); await p.screenshot({path:'ed4.png'}); console.log(errs); await b.close(); })();
