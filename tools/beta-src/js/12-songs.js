// ---------- 曲：保存・新しい曲・曲の一覧（設定メニューのレベルの下の「曲」の欄から） ----------
// 作っている曲は state.songId（一覧の中のどれか）と state.songName（名前）で覚える。一覧は「保存した進行」と同じ場所（loadSongs）
(function(){ const st=document.createElement('style'); st.textContent=`
#songSec .songcur{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;text-align:left;border:2px solid var(--ink);background:var(--bg);border-radius:14px;padding:12px 14px;font:inherit;color:var(--ink);cursor:pointer;position:relative}
#songSec .songcur small{font-size:.68rem;font-weight:700;color:var(--muted)}
#songSec .songcur b{font-family:var(--display);font-size:1.25rem;font-weight:900;max-width:calc(100% - 6em);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#songSec .songcur i{position:absolute;right:12px;top:50%;transform:translateY(-50%);font-style:normal;font-size:.72rem;font-weight:700;color:var(--muted)}
#songSec .songacts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:8px}
#songSec .songacts button{display:flex;flex-direction:column;align-items:center;gap:2px;min-height:58px;justify-content:center;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:12px;font:inherit;cursor:pointer;padding:6px 4px}
#songSec .songacts b{font-size:.86rem;font-weight:800}
#songSec .songacts small{font-size:.62rem;font-weight:700;color:var(--muted);text-align:center;line-height:1.25}
#drawer .songold{display:none!important}
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

// 設定メニュー（≡）のレベルの欄のすぐ下の「曲」の欄：今の曲の名前と、保存・新しい曲・曲の一覧
function songDraw(){ let box=$('songSec'); if(!box){ const dr=$('drawer'), lv=dr&&$('lvNext')&&$('lvNext').closest('.sec'); if(!lv) return;
    box=document.createElement('div'); box.id='songSec'; box.className='sec';
    box.innerHTML=`<h3>曲</h3><button class="songcur" id="songCur"><small>いま作っている曲</small><b></b><i>名前を変える</i></button>
      <div class="songacts"><button id="songSaveBtn"><b>保存する</b><small>曲の一覧に残す</small></button><button id="songNewBtn2"><b>新しい曲</b><small>今の曲は保存して空に</small></button><button id="songListBtn"><b>曲の一覧</b><small></small></button></div>`;
    lv.after(box);   // レベルの欄のすぐ下
    $('songCur').onclick=()=>songRename(state.songId?loadSongs().find(s=>s.id===state.songId):null);
    $('songSaveBtn').onclick=()=>songSave();
    $('songNewBtn2').onclick=()=>{ closeAll(); songNew(); };
    $('songListBtn').onclick=()=>{ closeAll(); openSongs(); }; }
  // リズム・メロディの画面では、その道のレベル（#pthSecs）の下に置く
  { const lv=$('lvNext')&&$('lvNext').closest('.sec'), ps=$('pthSecs'), at=(ps&&!ps.hidden&&ps.firstElementChild)?ps.firstElementChild:lv; if(at && box.previousElementSibling!==at) at.after(box); }
  box.querySelector('#songCur b').textContent=songLabel();
  const n=loadSongs().length; box.querySelector('#songListBtn small').textContent=n?`${n}曲`:'まだありません';
  const sa=$('songAcc'); if(sa) sa.classList.add('songold'); }

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
// リズム・メロディのメニューは pthMenu が作り直す（ほかの欄も後から足される）ので、終わってから置き直す
if(typeof pthMenu==='function'){ const pm=pthMenu; pthMenu=function(){ const r=pm.apply(this,arguments); setTimeout(songDraw,0); return r; }; }
$('menuBtn').addEventListener('click',()=>setTimeout(songDraw,0));
songDraw();
