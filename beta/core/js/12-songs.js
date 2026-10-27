// ---------- 曲：保存・新しい曲・曲の一覧（マスの上の行の「曲1 ▾」から） ----------
// 作っている曲は state.songId（一覧の中のどれか）と state.songName（名前）で覚える。一覧は「保存した進行」と同じ場所（loadSongs）
(function(){ const st=document.createElement('style'); st.textContent=`
.songbtn{flex:none;display:inline-flex;align-items:center;gap:3px;max-width:9em;height:22px;padding:0 8px;margin-right:6px;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--ink);font:inherit;font-size:.74rem;font-weight:800;cursor:pointer;vertical-align:middle}
.songbtn span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.songbtn svg{flex:none;opacity:.6}
.slothead>span:first-child{display:flex;align-items:center;min-width:0}
.slothead #hint{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#songMenu{position:fixed;z-index:60;min-width:190px;background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.18);padding:6px}
#songMenu button{display:flex;flex-direction:column;align-items:flex-start;width:100%;border:0;background:transparent;color:var(--ink);font:inherit;font-weight:800;font-size:.88rem;padding:10px 12px;border-radius:10px;cursor:pointer;text-align:left}
#songMenu button small{font-weight:700;font-size:.7rem;color:var(--muted);margin-top:2px}
#songMenu button:active,#songMenu button:hover{background:var(--lane)}
#songScr{position:fixed;inset:0;z-index:46;background:var(--bg);display:flex;flex-direction:column}
#songScr[hidden]{display:none}
#songScr .phd{display:flex;align-items:center;gap:8px;padding:max(10px,env(safe-area-inset-top,0px)) 12px 10px;border-bottom:1px solid var(--line)}
#songScr .phd h2{flex:1;text-align:center;margin:0;font-family:var(--display);font-weight:900;font-size:1.1rem}
#songScr .phd button{min-width:44px;height:40px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-weight:700;cursor:pointer;padding:0 14px}
#songScr .sbody{flex:1;overflow:auto;padding:12px 14px calc(16px + env(safe-area-inset-bottom,0px))}
#songScr .snote{color:var(--muted);font-size:.78rem;margin:2px 2px 10px}
#songScr .srow{display:flex;align-items:center;gap:8px;padding:10px 12px;margin-bottom:8px;background:var(--surface);border:1px solid var(--line);border-radius:14px}
#songScr .srow.cur{border-color:var(--t);box-shadow:inset 0 0 0 1px var(--t)}
#songScr .srow>div{flex:1;min-width:0}
#songScr .srow b{display:block;font-family:var(--display);font-size:.95rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#songScr .srow small{display:block;color:var(--muted);font-size:.7rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#songScr .srow button{flex:none;height:32px;padding:0 10px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-size:.76rem;font-weight:700;cursor:pointer}
#songScr .srow button.del{color:var(--cancel,#C8372D)}
#songScr .empty{text-align:center;color:var(--muted);font-size:.85rem;margin-top:30px}`; document.head.appendChild(st); })();

const songHas=()=>(state.slots||[]).slice(0,state.bars||4).some(v=>v!=null);
const songNextName=()=>{ const used=new Set(loadSongs().map(s=>s.name)); let n=1; while(used.has('曲'+n)) n++; return '曲'+n; };
const songLabel=()=>state.songName || songNextName();
const songSame=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// 今の曲を一覧に保存（同じ曲なら上書き）。quiet のときは、変わっていなければ何もしない
function songSave(quiet){ if(!songHas()){ if(!quiet) toast('マスにコードを置いてから保存できます'); return false; }
  const a=loadSongs(), data=packSong(), i=state.songId?a.findIndex(s=>s.id===state.songId):-1;
  if(i>=0){ if(quiet && songSame(a[i].data,data)) return false; a[i]={...a[i],name:state.songName||a[i].name,date:Date.now(),data}; }
  else { state.songName=state.songName||songNextName(); state.songId='s'+Date.now(); a.unshift({id:state.songId,name:state.songName,date:Date.now(),data}); }
  saveSongs(a); save(); songDraw(); renderSongs(); toast(`「${state.songName}」を保存しました`); return true; }
function songNew(){ if(playing) stop(); const had=songHas(); if(had) songSave(true);
  state.slots=Array(16).fill(null); state.segs=Array.from({length:16},()=>[]); state.ant=Array(16).fill(null); state.songId=null; state.songName=null;
  page=0; selected=null; renderAll(); save(); const msg=`新しい曲「${songLabel()}」にしました`+(had?'（前の曲は曲の一覧にあります）':''); setTimeout(()=>toast(msg),30); }
// 前からある「保存した進行」には id がないので、開く・名前を変えるときに付ける
function songId(sg){ if(sg.id) return sg.id; const all=loadSongs(), i=all.findIndex(s=>!s.id&&s.date===sg.date&&s.name===sg.name); sg.id='s'+(sg.date||Date.now())+'_'+i; if(i>=0){ all[i].id=sg.id; saveSongs(all); } return sg.id; }
function songOpen(sg){ songId(sg); if(playing) stop(); if(sg.id!==state.songId && songHas()) songSave(true);
  unpackSong(JSON.parse(JSON.stringify(sg.data))); state.songId=sg.id; state.songName=sg.name; page=0; selected=null; renderAll(); save(); closeSongs(); toast(`「${sg.name}」を開きました`); }
function songRename(sg){ const n=(prompt('曲の名前',sg?sg.name:songLabel())||'').trim(); if(!n) return;
  if(sg){ const a=loadSongs(), i=a.findIndex(s=>s.id===sg.id); if(i>=0){ a[i].name=n; saveSongs(a); } if(sg.id===state.songId) state.songName=n; }
  else state.songName=n;
  save(); songDraw(); renderSongs(); if($('songScr') && !$('songScr').hidden) drawSongs(); }

// マスの上の行のボタン
function songDraw(){ let b=$('songBtn'); if(!b){ const host=document.querySelector('.slothead>span:first-child'); if(!host) return;
    b=document.createElement('button'); b.id='songBtn'; b.className='songbtn'; b.onclick=e=>{ e.stopPropagation(); songMenu(b); }; host.prepend(b); }
  b.innerHTML=`<span></span><svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  b.hidden=!!(typeof TUT!=='undefined' && (TUT.on||TUT.practice));   // チュートリアル中は出さない
  b.querySelector('span').textContent=songLabel(); b.setAttribute('aria-label',`曲：${songLabel()}（保存・新しい曲・曲の一覧）`); }
function songMenuClose(){ const m=$('songMenu'); if(m) m.remove(); }
function songMenu(btn){ if($('songMenu')) return songMenuClose();
  const m=document.createElement('div'); m.id='songMenu'; const n=loadSongs().length;
  const items=[['保存する',`「${songLabel()}」を曲の一覧に残します`,()=>songSave()],['新しい曲','今の曲は保存して、マスを空にします',songNew],['曲の一覧',n?`保存した曲（${n}曲）を開く`:'まだ保存した曲はありません',openSongs],['名前を変える','',()=>songRename(state.songId?loadSongs().find(s=>s.id===state.songId):null)]];
  items.forEach(([t,s,f])=>{ const b=document.createElement('button'); b.innerHTML=`${t}${s?'<small></small>':''}`; if(s) b.querySelector('small').textContent=s; b.onclick=()=>{ songMenuClose(); f(); }; m.appendChild(b); });
  document.body.appendChild(m); const r=btn.getBoundingClientRect(), h=m.offsetHeight;
  m.style.left=Math.max(8,Math.min(innerWidth-m.offsetWidth-8,r.left))+'px';
  m.style.top=(r.bottom+6+h<innerHeight ? r.bottom+6 : Math.max(8,r.top-6-h))+'px'; }
document.addEventListener('pointerdown',e=>{ const m=$('songMenu'); if(m && !m.contains(e.target) && e.target.closest('#songBtn')==null) songMenuClose(); },true);

// 曲の一覧（全画面）
function openSongs(){ let el=$('songScr'); if(!el){ el=document.createElement('div'); el.id='songScr'; el.hidden=true;
    el.innerHTML='<div class="phd"><button id="songBack">閉じる</button><h2>曲の一覧</h2><button id="songNewBtn">＋ 新しい曲</button></div><div class="sbody" id="songBody"></div>';
    document.body.appendChild(el); $('songBack').onclick=closeSongs; $('songNewBtn').onclick=()=>{ closeSongs(); songNew(); }; }
  el.hidden=false; drawSongs(); }
function closeSongs(){ const el=$('songScr'); if(el) el.hidden=true; }
function drawSongs(){ const box=$('songBody'), a=loadSongs(); box.innerHTML='';
  if(!a.length){ box.innerHTML='<p class="empty">まだ保存した曲はありません。<br>マスの上の曲名から「保存する」で残せます。</p>'; return; }
  const p=document.createElement('p'); p.className='snote'; p.textContent='たくさん作って、気に入ったものを残していきましょう。名前をタップすると変えられます。'; box.appendChild(p);
  a.forEach(sg=>{ const d=document.createElement('div'); d.className='srow'+(sg.id&&sg.id===state.songId?' cur':'');
    d.innerHTML='<div><b></b><small></small></div><button data-a="open">開く</button><button data-a="share">共有</button><button data-a="del" class="del">削除</button>';
    d.querySelector('b').textContent=sg.name; d.querySelector('small').textContent=songDegs(sg.data);
    d.querySelector('div').onclick=()=>{ songId(sg); songRename(sg); };
    d.querySelector('[data-a="open"]').onclick=()=>songOpen(sg);
    d.querySelector('[data-a="share"]').onclick=()=>{ closeSongs(); $('drawer').classList.add('on'); scrim.classList.add('on'); shareSong(sg.data,sg.name); };
    const del=d.querySelector('[data-a="del"]'); del.onclick=()=>{ if(!del.dataset.armed){ del.dataset.armed=1; del.textContent='本当に消す'; return; }
      const all=loadSongs(), i=all.findIndex(s=>(sg.id?s.id===sg.id:(s.date===sg.date&&s.name===sg.name))); if(i>=0){ all.splice(i,1); saveSongs(all); }
      if(sg.id && sg.id===state.songId){ state.songId=null; save(); } songDraw(); renderSongs(); drawSongs(); };
    box.appendChild(d); }); }

// 一覧が変わったとき・画面を描き直したときに、ボタンの名前も合わせる
{ const ra=renderAll; renderAll=function(){ const r=ra.apply(this,arguments); songDraw(); return r; }; }
songDraw();
