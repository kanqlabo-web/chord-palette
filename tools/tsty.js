const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']}); const p=await b.newPage({viewport:{width:390,height:844}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{ if(m.type()==='warning'||m.type()==='error') errs.push(m.text()); });
await p.goto('http://localhost:8765/'); await p.waitForTimeout(500);
const r=await p.evaluate(async()=>{ $('modePick').hidden=true; MODE='free'; state.slots=[0,3,5,4,...Array(12).fill(null)]; state.bars=4; state.len=4; renderAll(); const out=[];
 for(const st of STYLES){ setStyle(st); state.bpm=st.bpm; await ensureSounds(); const {ev}=captureSong(); const k=ev.filter(e=>e.k==='key'), l=k.filter(e=>e.lay), d=ev.filter(e=>e.k==='drum'), bs=ev.filter(e=>e.k==='bass');
   out.push(`${st.name}: key${k.length} lay${l.length} drum${d.length} bass${bs.length} sets=${neededSets().map(n=>n+(LOADED[n]?'':'(x)')).join(',')} now=${styleNow()?.name}`); }
 return out.join('\n'); });
console.log(r);
// play a few live to check runtime errors
for(const nm of ['ローファイ','シティポップ','壮大','和風','疾走系（アニソン）']){ await p.evaluate(nm=>{ const st=styleBy(nm); setStyle(st); renderAll(); play(); },nm); await p.waitForTimeout(1500); await p.evaluate(()=>stop()); }
// sheet UI
await p.evaluate(()=>{ state.pro=false; LVL=9; openSheet('style'); }); await p.waitForTimeout(400); await p.screenshot({path:'sheet1.png',fullPage:false});
console.log(await p.evaluate(()=>[$('laySec').hidden, $('layChips').textContent]));
// share roundtrip
console.log(await p.evaluate(()=>{ setStyle(styleBy('シティポップ')); const h=shortHash(packSong()); const o=parseShort(h); return h.replace(/c=[^&]*&/,'')+' -> '+o.inst+'/'+o.lay+'/'+o.bassSnd; }));
console.log(await p.evaluate(()=>{ const o=parseShort('c=0,3,4,0&t=96&y=6'); return JSON.stringify([o.drum,o.arp,o.inst]); }));
console.log(errs.slice(0,10)); await b.close(); })();
