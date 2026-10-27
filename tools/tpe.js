// 演奏を編集を一通りさわって、操作ごとの状態（ハッシュ）とエラーを出す（PC とスマホ、コード・ドラム・ベース）。
// 直す前と後で動かして、出力をくらべる（同じなら操作の結果は変わっていない）。サーバーはリポジトリの上で python3 -m http.server <port>
// 使い方: node tools/tpe.js <port> <出力の名前> [cov] [版（beta/ など。省略は beta/）]
const {chromium}=require('playwright'); const fs=require('fs');
const [,,PORT,OUT,COV,VER]=process.argv; const PATH=VER==null?'beta/':VER;
const H=s=>{ let h=0; for(const ch of s) h=(h*31+ch.charCodeAt(0))|0; return h; };
(async()=>{ const b=await chromium.launch(); const log=[];
 for(const vp of [{w:1280,h:820,n:'pc',t:false},{w:390,h:844,n:'phone',t:true}]){
  const c=await b.newContext({viewport:{width:vp.w,height:vp.h},hasTouch:vp.t,isMobile:vp.t}); const p=await c.newPage(); p.setDefaultTimeout(2000);
  const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('dialog',d=>d.accept('テスト').catch(()=>{}));
  await p.addInitScript(()=>{ let s=1; Math.random=()=>{ s=(s*16807)%2147483647; return s/2147483647; }; Date.now=(()=>{ let t=1.7e12; return ()=>(t+=50); })(); });
  if(COV==='cov') await p.coverage.startJSCoverage({resetOnNavigation:false});
  await p.goto(`http://localhost:${PORT}/${PATH}`,{timeout:30000}); await p.waitForTimeout(700); await p.click('#tsFree'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ state.pro=true; save(); }); await p.reload({timeout:30000}); await p.waitForTimeout(800); await p.click('#tsCont'); await p.waitForTimeout(300);
  await p.evaluate(()=>{ const i=PRESETS.findIndex(e=>e.bars===8); libUse(i>=0?i:0); });
  const st=async tag=>{ const s=await p.evaluate(()=>JSON.stringify({open:!document.getElementById('peEd').hidden,a:state.myArps,d:state.myDrums,b:state.myBass,arp:state.arp,drum:state.drum,bp:state.bassPat,sel:PR.selSet?PR.selSet.size:-1,sc:PR.scene,bsw:typeof BSW!=='undefined'?BSW:0,pe:!!(typeof PE!=='undefined'&&PE),ed:$('peEd')?$('peEd').hidden:null,ctx:$('blkCtx')?$('blkCtx').hidden:null,set:$('peSet')?$('peSet').hidden:null})).catch(e=>'ERR '+e.message); log.push(`${vp.n} ${tag} ${s.length} ${H(s)} ${s.startsWith('{"open":true')?'O':'-'}`); };
  const ck=async id=>{ await p.evaluate(i=>{ const e=document.getElementById(i); if(e) e.click(); },id); await p.waitForTimeout(80); };
  const R=async()=>p.evaluate(()=>{ const r=$('bRoll'); if(!r) return null; const b=r.getBoundingClientRect(); return {x:b.left,y:b.top,w:BSW,h:BRH}; });
  const at=async(s,row,o={})=>{ const r=await R(); if(!r) return; const x=r.x+r.w*s+r.w/2, y=r.y+r.h*row+r.h/2;
    if(o.right) await p.mouse.click(x,y,{button:'right'}); else if(o.dbl) await p.mouse.dblclick(x,y); else if(vp.t) await p.touchscreen.tap(x,y); else await p.mouse.click(x,y); await p.waitForTimeout(90); };
  const drag=async(s0,r0,s1,r1)=>{ const r=await R(); if(!r) return; await p.mouse.move(r.x+r.w*s0+r.w/2,r.y+r.h*r0+r.h/2); await p.mouse.down(); await p.mouse.move(r.x+r.w*s1+r.w/2,r.y+r.h*r1+r.h/2,{steps:6}); await p.mouse.up(); await p.waitForTimeout(100); };
  const key=async k=>{ await p.keyboard.press(k); await p.waitForTimeout(70); };
  const ctxPick=async i=>{ await p.evaluate(i=>{ const b=[...document.querySelectorAll('#blkCtx [data-f]')]; if(b[i]) b[i].click(); },i); await p.waitForTimeout(80); };
  for(const kind of ['arp','drum','bass']){ try{
    await p.evaluate(k=>editTrackPattern(k),kind); await p.waitForTimeout(350); await st(kind+' open');
    const rows=kind==='arp'?[3,4,5,8]:[0,1,2,3];
    await ck('peToolPen'); for(const [s,r] of [[1,rows[0]],[3,rows[1]],[5,rows[2]],[9,rows[0]],[13,rows[3]]]) await at(s,r); await st(kind+' pen');
    await at(3,rows[1]); await st(kind+' pen-erase'); await ck('peToolSel');
    await at(1,rows[0]); await st(kind+' sel1'); await at(1,rows[0]); await st(kind+' sel2');
    if(!vp.t){ await drag(0,rows[0],15,rows[3]); await st(kind+' rect');
      for(const k of ['Control+c','ArrowRight','ArrowUp','Shift+ArrowRight','Alt+ArrowUp','4','2','r','q','ArrowLeft','Control+x','Control+v','Control+z','Control+y','Control+z','Control+a','0','Delete','Control+z']){ await key(k); await st(kind+' key '+k); }
      await at(1,rows[0],{right:true}); await st(kind+' rclick'); await ctxPick(1); await st(kind+' ctx1');
      await at(20,rows[1],{right:true}); await ctxPick(0); await st(kind+' ctx0');
      await at(24,rows[2],{dbl:true}); await st(kind+' dbl');
      const r=await R(); await p.mouse.move(r.x+200,r.y+60); await p.mouse.wheel(0,-150); await p.waitForTimeout(80); await p.keyboard.down('Control'); await p.mouse.wheel(0,-200); await p.keyboard.up('Control'); await p.keyboard.down('Alt'); await p.mouse.wheel(0,200); await p.keyboard.up('Alt'); await st(kind+' wheel');
      await key('?'); await st(kind+' help'); await p.mouse.click(5,300); await key('f'); await key('f'); await key('b'); await key('v'); await key('g'); await key('h'); await st(kind+' tools');
    } else {
      await at(1,rows[0]); await at(1,rows[0]); await st(kind+' tapmenu'); await p.evaluate(()=>{ const b=document.querySelector('#blkMenu button'); if(b) b.click(); }); await st(kind+' tapmenu1');
    }
    await at(5,rows[2]); await p.evaluate(()=>{ const b=[...document.querySelectorAll('#blkSide button, #peInsp button, #blkSel button')]; b.slice(0,10).forEach(x=>x.click()); }); await st(kind+' insp');
    const v=await p.evaluate(()=>{ const e=document.querySelector('.pvl, #peVL'); if(!e) return null; const b=e.getBoundingClientRect(); return {x:b.left,y:b.top,w:b.width,h:b.height}; });
    if(v){ await p.mouse.move(v.x+Math.min(v.w-5,100),v.y+v.h-4); await p.mouse.down(); await p.mouse.move(v.x+Math.min(v.w-5,100),v.y+6,{steps:4}); await p.mouse.up(); } await st(kind+' vel');
    for(const id of ['peZi','peZo','peUndo','peRedo','peFol','peFol']) await ck(id); await st(kind+' bar');
    await ck('peSceneBtn'); await p.evaluate(()=>{ const b=[...document.querySelectorAll('#peSceneSheetBody button[data-k], #peScenes button[data-k]')]; if(b[2]) b[2].click(); }); await st(kind+' scene');
    await ck('peToolPen'); await at(2,rows[1]); await ck('peToolSel'); await st(kind+' scene-pen');
    if(await p.evaluate(()=>!$('peSceneSheet').hidden)) await ck('peSceneClose');
    await p.evaluate(()=>{ const b=document.querySelector('[data-r="one"]'); if(b) b.click(); }); await st(kind+' one'); await p.evaluate(()=>{ const b=document.querySelector('[data-r="all"]'); if(b) b.click(); }); await st(kind+' all');
    await ck('pePlay'); await p.waitForTimeout(400); await ck('pePlay'); await st(kind+' play');
    await ck('peSetBtn'); await p.evaluate(()=>{ const bs=[...document.querySelectorAll('#peSet button')].filter(b=>!/peSet(X|Reg|Pick)/.test(b.id)); bs.filter((_,i)=>i%3===0).slice(0,12).forEach(b=>b.click()); [...document.querySelectorAll('#peSet select')].forEach(s=>{ s.selectedIndex=Math.min(1,s.options.length-1); s.dispatchEvent(new Event('change')); }); }); await st(kind+' set'); await ck('peSetX');
    await ck('peReg'); await st(kind+' reg'); await ck('peOk'); await p.waitForTimeout(150); await st(kind+' ok');
    await p.evaluate(k=>editTrackPattern(k),kind); await p.waitForTimeout(250); await ck('peToolPen'); await at(7,rows[1]); await ck('peX'); await p.waitForTimeout(150); await st(kind+' cancel');
    await p.evaluate(k=>openPatEditor(k,'new'),kind); await p.waitForTimeout(250); await st(kind+' new'); await ck('pePick'); await p.waitForTimeout(200); await st(kind+' pick');
    await p.evaluate(()=>{ const t=[...document.querySelectorAll('#pickBody .tpc')]; if(t[1]) t[1].click(); }); await p.evaluate(()=>{ const b=document.querySelector('#pickBody .tpi'); if(b) b.click(); const ok=$('pickOk'); if(ok&&!ok.hidden) ok.click(); }); await p.waitForTimeout(200); await st(kind+' picked');
    await ck('peOk'); await p.waitForTimeout(150); await st(kind+' ok2');
  }catch(e){ log.push(`${vp.n} ${kind} FAIL ${e.message.split('\n')[0]}`); await p.evaluate(()=>{ try{ if(PE) peCancel(); }catch(_){} }).catch(()=>{}); } }
  log.push(`${vp.n} errors ${JSON.stringify(errs)}`);
  if(COV==='cov'){ const cv=await p.coverage.stopJSCoverage(); fs.writeFileSync(`${OUT}-cov-${vp.n}.json`,JSON.stringify(cv.filter(e=>/07-tracks|10-pated/.test(e.url)).map(e=>({url:e.url,functions:e.functions,source:e.source})))); }
  await c.close(); }
 fs.writeFileSync(OUT+'-log.txt',log.join('\n')+'\n'); await b.close(); console.log('done',log.length); })();
