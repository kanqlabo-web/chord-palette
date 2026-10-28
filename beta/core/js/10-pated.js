// ---------- 演奏の編集画面（作り直し版）----------
// 鳴らし方・データの形（マイ演奏の notes / sitNotes / 設定）は今のまま。画面だけを作り直す。
// ・場面は「コードの長さ × 何小節目」の表で選ぶ（空っぽの場面は、どこと同じかを点線で見せる）
// ・1つの場面の演奏をマス目で編集（行はメロディ・アクセント・右手・左手のまとまり。使っていないまとまりはたためる）
// ・音ごとの設定は、音を選んだときだけ右（スマホは下）に出す。演奏全体の設定は「演奏の設定」にまとめる
const PE_SCENES=[['1小節ずっと',['bar','bar2','bar3rd','bar4th']],['3拍',['bar3','bar32']],['前半2拍',['halfA']],['3拍目から',['halfB']],['1拍だけ',['beat']],['先に弾く',['push','push2']]];
// 空っぽの場面が代わりに使う場面（鳴らすときの決め方と同じ）
const PE_FALL={bar2:'bar',bar3rd:'bar',bar4th:'bar2',bar3:'bar',bar32:'bar3',halfA:'bar',halfB:'halfA',beat:'halfB',push:null,push2:'push'};
const PE_ARP_GROUPS=[['mel','メロディ',MEL_ROWS],['acc','アクセント',KEY_ROWS.filter(([r])=>r>=6&&r<=8)],['rh','右手',KEY_ROWS.filter(([r])=>[9,3,2,1].includes(r))],['lh','左手',KEY_ROWS.filter(([r])=>[5,4,0].includes(r))]];
const PE_DRUM_GROUPS=[['cym','シンバル',DRUM_ROWS.filter(([r])=>'c r o h f'.split(' ').includes(r))],['tom','タム',DRUM_ROWS.filter(([r])=>['t1','t2','t3'].includes(r))],['sn','スネア',DRUM_ROWS.filter(([r])=>['s','x','cl'].includes(r))],['kick','キック',DRUM_ROWS.filter(([r])=>r==='k')]];
const PE_BASS_GROUPS=[['bass','ベース',BASS_ROWS]];
let PE=null;   // PE：開いている編集のようす
const peWide=()=>matchMedia('(min-width:900px)').matches;
const peDrum=()=>PE&&isDrumK(PE.kind), peBass=()=>PE&&isBassK(PE.kind), peArp=()=>PE&&isArpK(PE.kind);
const peGroups=()=>peDrum()?PE_DRUM_GROUPS:peBass()?PE_BASS_GROUPS:PE_ARP_GROUPS;
const peSceneNotes=k=>{ const m=curMy(); if(!m) return []; return k==='bar'?(m.notes||[]):((m.sitNotes||{})[k]||[]); };
// 見るだけのときは場面の配列を作らない（空の場面を開いただけで「変更あり」にならないように）
const peNotes=()=>peSceneNotes(curScene());
const peSel=()=>peNotes().filter(n=>PR.selSet.has(n));

{ const st=document.createElement('style'); st.textContent=`
#peEd{position:fixed;inset:0;z-index:42;display:flex;flex-direction:column;background:var(--surface);color:var(--ink)}
#peEd[hidden]{display:none}
#peEd .ph{display:flex;align-items:center;gap:10px;padding:max(8px,env(safe-area-inset-top,0px)) 12px 8px;border-bottom:1px solid var(--line)}
#peEd .ph h2{flex:1;min-width:0;margin:0;font-family:var(--display);font-weight:900;font-size:1rem;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#peEd .ph h2 small{display:block!important;font-weight:700;font-size:.72rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#peEd .pplay{width:40px;height:40px;border-radius:50%;border:0;background:var(--ink);color:var(--surface);display:grid;place-items:center;flex:none}
#peEd .pplay svg{width:18px;height:18px}
#peOk{flex:none;padding:0 18px;min-height:38px;border:0;border-radius:12px;background:var(--ink);color:var(--surface);font:inherit;font-weight:800}
#peEd .ptool{display:flex;align-items:center;gap:6px;padding:8px 12px;border-bottom:1px solid var(--line);flex-wrap:wrap}
#peEd .ptb:disabled,#peSet .ptb:disabled{opacity:.45}
#peEd .ptb,#peSet .ptb{min-width:36px;height:36px;padding:0 8px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-weight:800;font-size:.84rem;display:inline-grid;place-items:center;flex:none;cursor:pointer}
#peEd .ptb.on{background:var(--ink);color:var(--surface);border-color:var(--ink)}
#peEd .ptb svg{width:16px;height:16px}
#peEd .psep{width:1px;height:22px;background:var(--line);margin:0 2px}
#peEd .pgap{flex:1}
#peEd select.ptb{padding:0 6px;font-weight:700;font-size:16px}   /* iPhone は16px未満の入力欄で自動拡大するため */
#peEd .pbody{flex:1;min-height:0;display:flex;position:relative}
#peScenes{display:none}
#peEd .pmain{flex:1;min-width:0;display:flex;flex-direction:column;position:relative}
#pePop{position:absolute;z-index:8;white-space:nowrap;padding:3px 9px;border-radius:999px;background:var(--ink);color:var(--surface);font-size:.68rem;font-weight:800;line-height:1.4;box-shadow:0 3px 10px rgba(10,14,20,.2);pointer-events:none;opacity:0;transform:translateY(-6px) scale(.96);transition:opacity .18s,transform .18s}
#pePop.on{opacity:1;transform:none}
#peEd .pbar .pseg+.pseg{margin-left:auto}
#peInsp{display:none}
#peInsp.on{display:block;position:absolute;left:0;right:0;bottom:0;max-height:min(46vh,380px);overflow:auto;overscroll-behavior:contain;background:var(--surface);border-top:1px solid var(--line);border-radius:16px 16px 0 0;box-shadow:0 -10px 28px rgba(10,14,20,.16);z-index:5;padding:6px 14px calc(12px + env(safe-area-inset-bottom,0px))}
#peInsp .ih{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:6px 0 4px}
#peInsp .ih b{font-size:.92rem}
#peInsp .ih small{color:var(--muted);font-weight:700;font-size:.68rem}
#peInsp h4{margin:10px 0 5px;font-size:.76rem;font-weight:800;display:flex;justify-content:space-between}
#peInsp h4 span{color:var(--muted);font-weight:700}
#peInsp .irow{display:flex;gap:5px;flex-wrap:wrap}
#peInsp .irow button{flex:1;min-width:0;height:32px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-size:.74rem;font-weight:700;cursor:pointer;white-space:normal;line-height:1.15;overflow-wrap:anywhere;padding:2px 4px;min-height:32px;height:auto}
#peInsp .irow button.on{background:var(--ink);color:var(--surface);border-color:var(--ink);font-weight:800}
#peInsp .igrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid var(--line);border-left:1px solid var(--line)}
#peInsp .igrid button{min-height:46px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;border:0;border-right:1px solid var(--line);border-bottom:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;cursor:pointer;padding:2px}
#peInsp .igrid button i{font-style:normal;font-weight:800;font-size:.92rem;line-height:1.1}
#peInsp .igrid button span{font-size:.58rem;font-weight:700;color:var(--muted);text-align:center;line-height:1.2}
#peInsp .igrid button.on{background:var(--ink);color:var(--surface)}
#peInsp .igrid button.on span{color:color-mix(in srgb,var(--surface) 80%,transparent)}
#peInsp input[type=range]{width:100%}
#peInsp select{width:100%;height:32px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);font:inherit;font-size:.76rem}
#peSceneSheet{position:absolute;inset:0;z-index:6;background:color-mix(in srgb,var(--ink) 30%,transparent);display:flex;align-items:flex-start;justify-content:center;padding:12px}
#peSceneSheet[hidden]{display:none}
#peSceneSheet>div{background:var(--surface);border-radius:14px;padding:12px;width:min(100%,360px);box-shadow:0 10px 30px rgba(10,14,20,.2)}
.pesc{display:grid;grid-template-columns:78px repeat(4,minmax(0,1fr));gap:4px;align-items:center;font-size:.7rem}
.pesc .hd{text-align:center;color:var(--muted);font-weight:700}
.pesc .lb{font-weight:700;line-height:1.2}
.pesc button{height:30px;border-radius:6px;font:inherit;font-size:.62rem;font-weight:800;cursor:pointer;padding:0 2px;line-height:1.1}
.pesc button.made{background:var(--t);color:#fff;border:0}
.pesc button.empty{background:transparent;border:1.5px dashed color-mix(in srgb,var(--muted) 70%,transparent);color:var(--muted)}
.pesc button.cur{box-shadow:0 0 0 2px var(--surface),0 0 0 4px var(--d)}
.pescnote{margin-top:8px;font-size:.68rem;color:var(--muted);line-height:1.55}
#peSet{position:fixed;inset:0;z-index:45;background:color-mix(in srgb,var(--ink) 35%,transparent);display:flex;align-items:center;justify-content:center;padding:12px}
#peSet[hidden]{display:none}
#peSet>div{background:color-mix(in srgb,var(--ink) 3%,var(--surface));border-radius:16px;width:min(100%,1100px);max-height:100%;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 14px 40px rgba(10,14,20,.25)}
#peSet .sh{display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--surface);border-bottom:1px solid var(--line)}
#peSet .sh h3{flex:1;margin:0;font-size:1rem}
#peSet .sh h3 small{display:block;font-size:.7rem;color:var(--muted);font-weight:700}
#peSet .sb{overflow:auto;padding:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;align-content:start}
#peSet section{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:8px}
#peSet section h4{margin:0;font-size:.86rem}
#peSet .so{display:flex;flex-direction:column;gap:4px}
#peSet .so>span{font-size:.72rem;font-weight:700;color:var(--muted)}
#peSet .so>div{display:flex;gap:4px;flex-wrap:wrap}
#peSet .so button{min-height:30px;padding:0 10px;border-radius:8px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-size:.74rem;font-weight:700;cursor:pointer}
#peSet .so button.on{background:var(--ink);color:var(--surface);border-color:var(--ink);font-weight:800}
@media (pointer:coarse){#peEd .pzm{display:none}}
#peEd .bscroll{flex:1;min-height:0}
#peEd .blabs em.bgh{font-style:normal;font-weight:800;font-size:.68rem;color:var(--ink);cursor:pointer;display:block;width:100%}
#peEd .bgrp{position:absolute;left:0;right:0;background:color-mix(in srgb,var(--ink) 6%,var(--surface));border-bottom:1px solid var(--line);pointer-events:none;z-index:1}
/* 強さ：音の色の濃さと、左の目盛り（下からの高さ）で */
#peEd .prn{overflow:visible;background:color-mix(in srgb,var(--t) calc(8% + var(--v) * 87%),var(--surface));transform:translateY(calc(var(--dy,0) * var(--rh)))}
#peEd .prn b{display:none}
#peEd .pvl{position:sticky;bottom:0;z-index:6;display:flex;background:var(--surface);border-top:1px solid var(--line);height:64px;box-shadow:0 -1px 0 var(--line)}
#peEd .pvl>span{position:sticky;left:0;z-index:2;width:var(--lw);flex:none;box-sizing:border-box;padding:0 0 0 8px;display:flex;align-items:center;font-size:.62rem;font-weight:700;color:var(--muted);background:var(--surface);border-right:1px solid var(--line)}
#peEd .pvlane{position:relative;flex:none;touch-action:none;cursor:ns-resize}
#peEd .pvlane .pvs{position:absolute;top:0;bottom:0;background:color-mix(in srgb,var(--c) 9%,transparent);border-left:2px solid var(--c);box-sizing:border-box;pointer-events:none}
#peEd .pvlane .pvs.rep{background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--c) 7%,transparent) 0 6px,transparent 6px 12px);border-left-style:dashed}
#peEd .pvlane i{position:absolute;bottom:4px;width:2px;margin-left:4px;background:color-mix(in srgb,var(--t) 70%,var(--surface));pointer-events:none}
#peEd .pvlane i::before{content:'';position:absolute;top:-4px;left:-3px;width:8px;height:8px;border-radius:50%;background:var(--t);box-sizing:border-box;border:1.5px solid var(--surface)}
#peEd .pvlane i.sel{background:var(--d)}
#peEd .pvlane i.sel::before{background:var(--d)}
#peEd .pvlane i.rep{opacity:.4}
#peEd .prn.dr{transform:scale(calc(.6 + var(--v) * .4))}
/* 飾りの印：フォールは音の終わりから下がる線、しゃくりは下から上がってくる線、ほかは音の中に記号 */
#peEd .prn.fall::after{content:'';position:absolute;left:100%;right:auto;top:50%;width:22px;height:2.5px;background:var(--ink);transform-origin:0 50%;transform:rotate(40deg);border-radius:2px;border:0}
#peEd .prn.scoop::before{content:'';position:absolute;left:-20px;right:auto;top:50%;bottom:auto;width:20px;height:2.5px;background:var(--ink);transform-origin:100% 50%;transform:rotate(-38deg);border-radius:2px}
#peEd .prn.up::after{content:none}
#peEd .prn.ocd::before,#peEd .prn.ocu::before{content:none}
#peEd .prn s{position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:10px;line-height:1;font-weight:900;text-decoration:none;color:var(--ink);white-space:nowrap;pointer-events:none;text-shadow:0 0 2px var(--surface),0 0 2px var(--surface)}
#peEd .pbar{display:flex;align-items:center;gap:8px;padding:6px 12px;border-bottom:1px solid var(--line);flex-wrap:wrap}
#peEd .pbar[hidden]{display:none}
#peEd .pwhere{margin-left:auto;font-size:.72rem;font-weight:800;color:var(--muted);white-space:nowrap}
#peEd .pseg{display:flex;padding:3px;gap:2px;border-radius:10px;background:color-mix(in srgb,var(--ink) 8%,transparent);flex:none}
#peEd .pseg button{height:30px;padding:0 12px;border:0;border-radius:8px;background:transparent;color:var(--muted);font:inherit;font-size:.78rem;font-weight:800;display:flex;align-items:center;gap:5px;cursor:pointer;white-space:nowrap}
#peEd .pseg button small{font-size:.64rem;font-weight:700;opacity:.8}
#peEd .pseg button.on{background:var(--surface);color:var(--ink);box-shadow:0 1px 3px rgba(10,14,20,.18)}
#peEd .pseg button:disabled{opacity:.4;cursor:default}
#peEd .pbk{position:absolute;border-radius:3px;background:color-mix(in srgb,var(--ink) 20%,transparent);pointer-events:none;z-index:0}
#peEd .pbk.m{background:color-mix(in srgb,var(--d) 30%,transparent)}
#peEd .pfol{gap:4px;font-size:.74rem;color:var(--muted)}
#peEd .pfol.on{color:var(--surface)}
#peEd .pfol svg{width:15px;height:15px}
#peEd .pfol{display:inline-flex;align-items:center}
@media (max-width:899px){
 #peEd .pfol span{display:none}
 #peEd .ptool{flex-wrap:nowrap;gap:4px;overflow-x:auto;scrollbar-width:none}
 #peEd .ptb{min-width:34px;padding:0 6px}
 #peEd .psep,#pePick,#peReg{display:none!important}
 #peSetBtn{font-size:0!important;width:38px}
 #peEd .pwhere{order:9;flex-basis:100%;margin:0;white-space:normal;font-size:.68rem;line-height:1.4}
 #peEd .pbar{justify-content:space-between;gap:6px}
 #peEd .pseg button{padding:0 9px}
 #peSet{padding:0;align-items:stretch}
 #peSet>div{border-radius:0}
 #peSet .sh{flex-wrap:wrap}
 #peSet .sh h3{flex-basis:100%}
 #peSetBtn svg{width:18px;height:18px}
}
@media (min-width:900px){
 #peSetBtn svg{display:none}
 #peScenes{display:flex;flex-direction:column;gap:8px;width:236px;flex:none;border-right:1px solid var(--line);background:color-mix(in srgb,var(--ink) 2%,var(--surface));padding:12px;box-sizing:border-box;overflow:auto}
 #peScenes h3{margin:0;font-size:.9rem}
 #peSceneBtn{display:none!important}
 #peInsp{display:block;width:272px;flex:none;visibility:hidden}   /* 選んでいないときは見せないが、場所は空けておく（マス目の幅が変わらないように） */
 #peInsp.on{visibility:visible;position:static;width:272px;flex:none;max-height:none;border-radius:0;border-top:0;border-left:1px solid var(--line);box-shadow:none;background:color-mix(in srgb,var(--ink) 2%,var(--surface));padding:6px 14px 14px}
}`; document.head.appendChild(st); }

{ const el=document.createElement('div'); el.id='peEd'; el.hidden=true; el.setAttribute('role','dialog'); el.setAttribute('aria-label','演奏を編集');
  const I=(d)=>`<svg viewBox="0 0 16 16" aria-hidden="true">${d}</svg>`;
  el.innerHTML=`<div class="ph"><button class="xcancel" id="peX">キャンセル</button>
    <h2 id="peTitle" class="nophrase"></h2><button class="ptb pfol" id="peFol" aria-pressed="true" title="再生中、鳴っている所をロールが追いかける（F）"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h9M8 4.5L11.5 8 8 11.5" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 3v10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg><span>追いかける</span></button><button class="pplay" id="pePlay" aria-label="再生"></button><button id="peOk">完了</button></div>
  <div class="ptool">
    <button class="ptb on" id="peToolSel" aria-label="選ぶ" title="選ぶ（V）">${I('<path d="M3 2l9 5-4 1.2L6 12z" fill="currentColor"/>')}</button>
    <button class="ptb" id="peToolPen" aria-label="鉛筆" title="鉛筆（B）">${I('<path d="M3 13l1-3.5L11 2.5l2.5 2.5L6.5 12z" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linejoin="round"/>')}</button>
    <span class="psep"></span>
    <button class="ptb" id="peUndo" aria-label="もとに戻す">${I('<path d="M5 4L2 7l3 3M2.5 7H10a3.5 3.5 0 010 7H7" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>')}</button>
    <button class="ptb" id="peRedo" aria-label="やり直す">${I('<path d="M11 4l3 3-3 3M13.5 7H6a3.5 3.5 0 000 7h3" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>')}</button>
    <span class="psep"></span>
    <button class="ptb pzm" id="peZo" aria-label="縮小" title="縮小（G）">−</button><button class="ptb pzm" id="peZi" aria-label="拡大" title="拡大（H）">＋</button>
    <span id="peDrumBars"></span>
    <button class="ptb" id="peSceneBtn"></button>
    <span class="pgap"></span>
    <button class="ptb" id="peReg" title="ほかの曲や楽器でも選べるように、マイ演奏に入れます">マイ演奏に登録</button>
    <button class="ptb" id="pePick">ほかの演奏を下書きに</button>
    <button class="ptb" id="peSetBtn" aria-label="演奏の設定" title="演奏の設定">${I('<path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="5" cy="4" r="1.6" fill="var(--surface)" stroke="currentColor" stroke-width="1.4"/><circle cx="11" cy="8" r="1.6" fill="var(--surface)" stroke="currentColor" stroke-width="1.4"/><circle cx="7" cy="12" r="1.6" fill="var(--surface)" stroke="currentColor" stroke-width="1.4"/>')}演奏の設定</button>
  </div>
  <div class="pbar" id="peBar"></div>
  <div class="pbody">
    <nav id="peScenes" aria-label="演奏するとき"></nav>
    <div class="pmain" id="peMain">
    </div>
    <aside id="peInsp" aria-label="選んだ音の設定"></aside>
    <div id="peSceneSheet" hidden><div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b>演奏するとき</b><button class="ptb" id="peSceneClose">とじる</button></div><div id="peSceneSheetBody"></div></div></div>
  </div>`;
  document.body.appendChild(el);
  const s=document.createElement('div'); s.id='peSet'; s.hidden=true; document.body.appendChild(s); }

// ---------- 開く・とじる ----------
function peOpen(kind,scene,mode,x0){ const k=patOf(kind);
  if((kind==='arp2'||xType(kind)==='chord') && (!k || !ARPS[k])) return openSheet(kind);
  closeAll(); if(typeof BLKE!=='undefined' && BLKE) hideBlk();
  // 演奏の編集は、その曲だけのもの（tmp）。組み込みやマイ演奏を編集するときは、この曲用の写しを作って編集する。マイ演奏に入れるのは「登録」したときだけ
  const isMy=/^my\d+$/.test(k||''), src=isMy?listOf(kind)[+k.slice(2)]:null, snap=JSON.stringify(state), wasMy=!!(src && src.tmp) && mode!=='new' && mode!=='copy';
  PE={kind, snap, wasMy, prev:k, nm:tkPatName(kind), fold:{}};
  patKind=kind; PR.selSet=new Set();
  if(mode==='new') newMy(kind,null); else if(!wasMy) newMy(kind, k||'auto');
  if(!wasMy){ const m=curMy(); m.tmp=true; m.name=(mode==='new'?'新しい演奏':(src?src.name:PE.nm)).replace(/（(自分用|この曲用)）$/,'').slice(0,14)+'（自分用）'; rebuildMy(); }
  peGC();
  PE.copy=PE.wasMy?null:JSON.stringify(curMy());
  clearTimeout(HIST.t); histCommit(); PE.h0=HIST.undo.length;   // 開いた時点を記録して、もとに戻すで画面を開く前まで戻らないようにする
  const okScene = isDrumK(kind) ? ['bar','B'] : isBassK(kind) ? ['bar'] : SCENES.map(s=>s[0]);
  PE.scene = okScene.includes(scene) ? scene : 'bar'; PR.scene=PE.scene;
  // 音のないまとまりは、はじめはたたむ（メロディ行は、使っているときだけ開く）
  peGroups().forEach(([g,,rows])=>{ const used=[...curMy().notes||[], ...Object.values(curMy().sitNotes||{}).flat()].some(n=>rows.some(([r])=>String(r)===String(n.r))); if(!used && peGroups().length>1) PE.fold[g]=true; });
  { const all=[curMy().notes||[],...Object.values(curMy().sitNotes||{})].flat(); PE.layer=all.length&&all.every(n=>isDeg(n.r))?'mel':'acc'; }
  // ロールは前のピアノロール（曲の全部のマスを並べる。07 の drawBlk・bindBig）をこの画面の中で使う
  BLKE={kind, x0:x0||0, snap, wasMy:PE.wasMy, reuse:PE.reuse, prev:k, nm:PE.nm, cur:PE.scene, act:{}}; BD=null; PR.blkLock=false; PR.mode='edit';
  const sc=$('bScroll'), mn=$('peMain'); if(sc.parentElement!==mn) mn.insertBefore(sc,mn.firstChild);
  $('peEd').hidden=false; peDraw();
  requestAnimationFrame(()=>{ if(PE) peScrollTo(PE.scene, x0); }); }
// その場面を編集する所（act）が見える所までロールを動かす
function peScrollTo(k,x){ const sc=$('bScroll'), s=BSEGS[BLKE.act[k]]; if(x==null && !s) return false;
  sc.scrollLeft=Math.max(0,(x!=null?x:s.x0)*BSW-8); return !!s; }
// 行：まとまりごとに見出しの行（キーが _ で始まる。音は置けない）を入れ、たたんだまとまりの行は出さない
// メロ行の名前は、今の調・楽器で実際に鳴る音（例: E4）
function peMelName(r){ try{ const p=degPitch(r), off=((p-keyObj().pc)%12+12)%12; return noteName(off)+(Math.floor(p/12)-1); }catch(e){ return r; } }
function peBlkRows(){ let G=peGroups(); if(peArp()) G=PE.layer==='mel'?G.filter(x=>x[0]==='mel'):G.filter(x=>x[0]!=='mel'); const out=[];
  G.forEach(([g,lab,rows])=>{ if(G.length>1) out.push(['_'+g, `<em class="bgh" data-g="${g}">${PE.fold[g]?'▸':'▾'} ${esc(lab)}</em>`]); if(!PE.fold[g] || G.length<2) out.push(...(g==='mel'?rows.map(([r])=>[r,peMelName(r)]):rows)); });
  return out; }
{ const db=drawBlk; drawBlk=function(){ const r=db.apply(this,arguments); if(PE && BLKE){ PE.scene=PR.scene; peChrome(); peBarDraw(); peScenes(); peInsp();
    { const sig=PR.scene+':'+BLKE.act[PR.scene]; if(sig!==PE.popSig){ PE.popSig=sig; if(PE.pop) pePop(PE.pop); } }
    const roll=$('bRoll'); if(roll){ const E=roll.querySelectorAll('.bseg'); BSEGS.forEach((x,i)=>{ if(x.rep && E[i]) E[i].classList.add('loop'); }); }
    if(roll && peArp()) peBack(roll);
    if(roll) peVLane();
    if(roll) blkRows().forEach(([k],i)=>{ if(String(k)[0]!=='_') return; const d=document.createElement('div'); d.className='bgrp'; d.style.top=(i*BRH)+'px'; d.style.height=BRH+'px'; roll.appendChild(d); }); }
  return r; }; }
// 強さの帯：ロールの下（いつも見える）。縦にドラッグでその列の音（選んでいればその音）の強さを変える
function peVLane(){ const sc=$('bScroll'), box=sc.firstElementChild; if(!box) return; const L=slotSteps(), W=state.bars*L*BSW, rows=new Set(blkRows().map(r=>String(r[0])));
  let h=''; BSEGS.forEach((s,si)=>notesOfScene(s.key).forEach(n=>{ if(!rows.has(String(n.r)) || n.st<s.off || n.st>=s.off+s.len) return;
    h+=`<i class="${PR.selSet.has(n)?'sel':''}${s.rep?' rep':''}" style="left:${(s.x0+n.st-s.off)*BSW+1}px;height:calc(${Math.round(n.vel*100)}% - 8px)"></i>`; }));
  const bands=BSEGS.map(s=>`<div class="pvs${s.rep?' rep':''}" style="left:${s.x0*BSW}px;width:${s.len*BSW}px;--c:${s.c}"></div>`).join('');
  const grid=`repeating-linear-gradient(90deg,color-mix(in srgb,var(--ink) 40%,transparent) 0 1.5px,transparent 1.5px ${BSW*16}px),repeating-linear-gradient(90deg,var(--line) 0 1px,transparent 1px ${BSW*4}px)`;
  box.insertAdjacentHTML('beforeend',`<div class="pvl"><span title="上下にドラッグで強さ。音を選んでいれば、選んだ音をまとめて">強さ</span><div class="pvlane" id="peVL" style="width:${W}px;background-image:${grid}">${bands}<div class="pvb">${h}</div></div></div>`);
  const el=$('peVL'); let V=null;
  const set=e=>{ if(!V) return; const b=el.getBoundingClientRect(), y=(b.bottom-4-e.clientY)/(b.height-8), cl=v=>Math.max(1/127,Math.min(1,v));
    if(V.rel) V.forEach((n,k)=>n.vel=cl(V.v0[k]+y-V.y0)); else V.forEach(n=>n.vel=cl(y));
    const pb=el.querySelector('.pvb'); pb.innerHTML=''; BSEGS.forEach(s=>notesOfScene(s.key).forEach(n=>{ if(!rows.has(String(n.r)) || n.st<s.off || n.st>=s.off+s.len) return;
      const i=document.createElement('i'); i.className=(PR.selSet.has(n)?'sel':'')+(s.rep?' rep':''); i.style.left=((s.x0+n.st-s.off)*BSW+1)+'px'; i.style.height=`calc(${Math.round(n.vel*100)}% - 8px)`; pb.appendChild(i); })); };
  el.onpointerdown=e=>{ if(!PE) return; e.preventDefault(); const b=el.getBoundingClientRect();
    // 2つ以上選んでいるときは、どこをドラッグしても選んだ音全部を、差を保ったまま上げ下げ
    if(PR.selSet.size>1){ V=peSel(); V.rel=true; V.v0=V.map(n=>n.vel); V.y0=(b.bottom-4-e.clientY)/(b.height-8); try{ el.setPointerCapture(e.pointerId); }catch(_){} return; }
    const x=(e.clientX-b.left)/BSW, s=BSEGS.find(q=>x>=q.x0&&x<q.x0+q.len); if(!s) return;
    const g=blkGrid(), c=s.off+Math.floor((x-s.x0)/g+1e-6)*g, col=notesOfScene(s.key).filter(n=>rows.has(String(n.r)) && n.st>=c && n.st<c+g); if(!col.length) return;
    const sel=col.filter(n=>PR.selSet.has(n));
    V=sel.length?sel:col; PR.scene=s.key; BLKE.cur=s.key; BLKE.act[s.key]=BSEGS.indexOf(s); try{ el.setPointerCapture(e.pointerId); }catch(_){} set(e); };
  el.onpointermove=e=>set(e); el.onpointerup=el.onpointercancel=()=>{ if(!V) return; const n=V[V.length-1]; V=null; previewRow(n.r,n.vel); commitNotes(); clearTimeout(HIST.t); histCommit(); }; }
// メロディと伴奏は層を分ける。編集していない方の層の音は、裏にうすく透かして見せる（高さは層の行の数に合わせてならす）
function peBack(roll){ const mel=PE.layer==='mel', other=mel?PE_ARP_GROUPS.filter(x=>x[0]!=='mel').flatMap(x=>x[2]):MEL_ROWS, idx={}; other.forEach(([r],i)=>idx[String(r)]=i);
  const H=blkRows().length*BRH, rh=H/other.length; let h='';
  BSEGS.forEach(s=>notesOfScene(s.key).forEach(n=>{ const i=idx[String(n.r)]; if(i==null || n.st<s.off || n.st>=s.off+s.len) return;
    h+=`<i class="pbk${mel?'':' m'}" style="left:${(s.x0+n.st-s.off)*BSW}px;width:${Math.max(4,Math.min(n.len,s.off+s.len-n.st)*BSW-1)}px;top:${i*rh+1}px;height:${Math.max(3,rh-2)}px"></i>`; }));
  roll.insertAdjacentHTML('afterbegin',h); }
// くり返し：同じ演奏（場面）を使う所を「まとめて編集」するか、「ここだけ編集」するか
// 1小節の演奏は4小節ひとまとまり（bar・bar2・bar3rd・bar4th）、3拍は2小節（bar3・bar32）まで別にできる
const PE_CYC={bar:['bar','bar2','bar3rd','bar4th'], bar3:['bar3','bar32']};
const peBase=k=>PE_CYC.bar.includes(k)?'bar':PE_CYC.bar3.includes(k)?'bar3':null;
const peHas=k=>peSceneNotes(k).length>0;
// 空の場面は、鳴らすときと同じ場面にたどる（3・4小節目は1・2小節目、3拍の2小節目は3拍）
function peResolve(k){ const F={bar2:'bar',bar3rd:'bar',bar4th:'bar2',bar32:'bar3'}; while(F[k] && !peHas(k)) k=F[k]; return k; }
function peSrc(base,p){ if(base==='bar3') return p%2&&peHas('bar32')?'bar32':'bar3'; return peResolve(PE_CYC.bar[p%4]); }
function pePlace(){ if(!peArp()) return null; const s=BSEGS[BLKE.act[PR.scene]]; if(!s) return null; const base=peBase(s.key); const p=base?(s.b%(base==='bar3'?2:4)):0, K=base?PE_CYC[base]:[];
  // own：この小節が、ほかの小節と音を分けてあるか
  const own=!!base && K.every((_,q)=>q===p || peSrc(base,q)!==peSrc(base,p));   // ほかのどの小節とも音を分けてある
  return {s, base, p, own, n:BSEGS.filter(x=>x.key===s.key).length}; }
function peSplit(){ const P=pePlace(); if(!P||!P.base) return; const {base,p}=P, K=PE_CYC[base], m=curMy(), src=K.map((_,q)=>peSrc(base,q)), cp=k=>JSON.parse(JSON.stringify(peSceneNotes(k)));
  const snap=src.map(cp); m.sitNotes=m.sitNotes||{};
  const id=base+':'+p, made=(PE.made=PE.made||{})[id]=PE.made[id]||[], mk=k=>{ if(!made.includes(k)) made.push(k); };   // 「ここだけ」で写した場面（まとめるときは、これだけ消す）
  if(p===0) K.forEach((k,q)=>{ if(q && src[q]===src[0]){ m.sitNotes[k]=snap[q]; mk(k); } });   // 1小節目だけにする：同じ音を使っているほかの小節に、今の音を写す
  else { if(src[p]!==K[p]){ m.sitNotes[K[p]]=snap[p]; mk(K[p]); } if(base==='bar' && p===1 && !peHas('bar4th')){ m.sitNotes.bar4th=snap[3]; mk('bar4th'); } }   // 2小節目を作ると4小節目も変わるので、4小節目は今のままを写す
  const si=BLKE.act[PR.scene]; PR.scene=PE.scene=BLKE.cur=K[p]; BLKE.act[K[p]]=si; PR.selSet.clear(); rebuildMy(); save(); clearTimeout(HIST.t); histCommit(); peDraw(); toast('ここだけの演奏にしました。ほかの所は変わりません'); }
function peMerge(){ const P=pePlace(); if(!P||!P.base) return; const {base,p}=P, K=PE_CYC[base], m=curMy(); if(!m.sitNotes) return;
  // 消す場面：1小節目なら「ここだけ」で写した場面（なければほかの小節の場面全部）、ほかの小節ならその小節の場面
  const made=(PE.made||{})[base+':'+p]||[], del=(p===0?(made.length?made.slice():K.slice(1)):[...new Set([K[p],...made])]).filter(peHas);
  // もとから入っていた演奏（写したものでない）が消えるときは、確かめる
  const lost=del.filter(k=>!made.includes(k)), nn=lost.reduce((a,k)=>a+peSceneNotes(k).length,0), mel=lost.some(k=>peSceneNotes(k).some(n=>isDeg(n.r)));
  if(lost.length && !confirm(`${lost.map(SCENE_NAME).join('・')}だけの演奏（${nn}音${mel?'、メロディを含む':''}）が消えて、ほかの所と同じになります。よろしいですか？（あとで「もとに戻す」でも戻せます）`)) return;
  del.forEach(k=>{ delete m.sitNotes[k]; const i=made.indexOf(k); if(i>=0) made.splice(i,1); });
  // 分けたときに写しただけの小節（中身が戻り先と同じ）は、まとめなおす
  for(let q=K.length-1;q>0;q--){ const k=K[q], f=peResolve(PE_FALL[k]); if(peHas(k) && JSON.stringify(peSceneNotes(k))===JSON.stringify(peSceneNotes(f))) delete m.sitNotes[k]; }
  const si=BLKE.act[PR.scene]; PR.scene=PE.scene=BLKE.cur=p===0?K[0]:peSrc(base,p); BLKE.act[PR.scene]=si; PR.selSet.clear(); rebuildMy(); save(); clearTimeout(HIST.t); histCommit(); peDraw();
  toast(p===0?'ほかの所も、この演奏にそろえました（もとに戻すで戻せます）':'ほかの所と同じ演奏に戻しました（もとに戻すで戻せます）'); }
function peBarDraw(){ const el=$('peBar'), P=pePlace(); let h='';
  if(peArp()){ const nm=[curMy().notes||[],...Object.values(curMy().sitNotes||{})].flat().filter(n=>isDeg(n.r)).length;
    h+=`<div class="pseg" role="group" aria-label="編集する層"><button class="${PE.layer!=='mel'?'on':''}" data-l="acc">伴奏</button><button class="${PE.layer==='mel'?'on':''}" data-l="mel">メロディ${nm?`<small>${nm}</small>`:''}</button></div>`; }
  if(P && P.s){ const lab=chordText(P.s.v)+'・'+SCENE_NAME(P.s.key), shared=P.n>1, can=!!P.base;
    const one=can&&P.own, tip=!can?'このときの演奏は、曲の中で1種類だけです':P.base==='bar'?'1小節の演奏は4小節ごとにくり返します':'3拍の演奏は2小節ごとにくり返します';
    const msg=!can&&P.n<2||P.n<2&&!one?'この演奏を使っているのは、ここだけです':one?`${esc(lab)}：この小節だけの演奏です。ほかの所は変わりません`:`${esc(lab)}：曲の${P.n}か所で同じ演奏です。今は全部いっしょに変わります`;
    PE.pop=(P.n>1&&!one)?`${P.n}か所いっしょに変わります`:''; h+=`<span class="pwhere">${msg}</span><div class="pseg" role="group" aria-label="くり返しの編集" title="${esc(tip)}"><button class="${one?'':'on'}" data-r="all">まとめて${!one&&shared?`<small>${P.n}か所</small>`:''}</button><button class="${one?'on':''}" data-r="one" ${can?'':'disabled'}>ここだけ${one&&shared?`<small>${P.base==='bar'?'4':'2'}小節ごと</small>`:''}</button></div>`; }
  el.innerHTML=h; el.hidden=!h;
  el.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{ if(PE.layer===b.dataset.l) return; PE.layer=b.dataset.l; PR.selSet.clear(); drawBlk(); });
  el.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{ if(b.classList.contains('on')) return; if(b.dataset.r==='one') peSplit(); else peMerge(); }); }
$('bScroll').addEventListener('click',e=>{ const g=e.target.closest('em.bgh'); if(!g||!PE) return; PE.fold[g.dataset.g]=!PE.fold[g.dataset.g]; drawBlk(); });
function peClose(){ PE=null; BLKE=null; BD=null; $('bScroll').innerHTML=''; PR.selSet.clear(); $('peEd').hidden=true; $('peInsp').className=''; $('peInsp').innerHTML=''; $('peSet').hidden=true; renderAll(); renderTracks(); }
function peCancel(){ if(!PE) return; const o=JSON.parse(PE.snap);
  Object.keys(state).forEach(k=>delete state[k]); Object.assign(state,o); rebuildMy(); save(); $('bpm').value=state.bpm; $('bpmOut').textContent=state.bpm; applyMix(); ensureSounds(); peClose(); }
function peOk(){ if(!PE) return; const P=PE, list=listOf(P.kind), i=list.length-1;
  if(!P.wasMy && JSON.stringify(list[i])===P.copy && patOf(P.kind)==='my'+i){ list.pop(); setPatOf(P.kind,P.prev); rebuildMy(); save(); }
  peGC(); save(); peClose(); }
// 使われなくなった「この曲用」の演奏を消す（マイ演奏の番号はつめる）
function peGC(){ const typ=k=>isDrumK(k)?'d':isBassK(k)?'b':'a';
  ['arp','drum','bass'].forEach(K0=>{ const list=listOf(K0), T=typ(K0), ks=trackList().map(t=>t.kind).filter(k=>typ(k)===T);
    for(let i=list.length-1;i>=0;i--){ if(!list[i] || !list[i].tmp || ks.some(k=>patOf(k)==='my'+i)) continue;
      ks.forEach(k=>{ const p=patOf(k); if(/^my\d+$/.test(p||'') && +p.slice(2)>i) setPatOf(k,'my'+(+p.slice(2)-1)); }); list.splice(i,1); } });
  rebuildMy(); }
// マイ演奏に登録（ほかの曲・ほかの楽器でも選べるようになる）
function peReg(){ const m=curMy(); if(!m) return; const def=m.name.replace(/（(自分用|この曲用)）$/,''), nm=prompt('マイ演奏に登録する名前',def); if(nm==null) return; const name=nm.trim().slice(0,20)||def;
  if(m.tmp){ delete m.tmp; m.name=name; } else { const c=JSON.parse(JSON.stringify(m)); c.name=name; listOf(PE.kind).push(c); }
  rebuildMy(); save(); clearTimeout(HIST.t); histCommit(); PE.wasMy=true; peDraw(); toast(`マイ演奏「${name}」に登録しました`); }
$('peReg').onclick=peReg; $('peX').onclick=peCancel; $('peOk').onclick=peOk;
$('pePlay').onclick=()=>{ playing?stop():play(); };
$('peUndo').onclick=peUndo;
function peUndo(){ clearTimeout(HIST.t); histCommit(); if(HIST.undo.length<=PE.h0) return toast('これより前には戻せません'); histGo(-1); peAfterHist(); } $('peRedo').onclick=()=>{ histGo(1); peAfterHist(); };
function peAfterHist(){ if(!PE) return; PR.selSet.clear(); if(/^my\d+$/.test(patOf(PE.kind)||'') && curMy()){ patKind=PE.kind; PR.scene=PE.scene; peDraw(); } else peClose(); }
$('peToolSel').onclick=()=>{ PR.blkLock=false; drawBlk(); }; $('peToolPen').onclick=()=>{ PR.blkLock=true; PR.selSet.clear(); drawBlk(); };
$('peZo').onclick=()=>zoomBtn(.8); $('peZi').onclick=()=>zoomBtn(1.25);
function peTools(){ $('peToolSel').classList.toggle('on',!blkDraw()); $('peToolPen').classList.toggle('on',blkDraw()); }
function peSetScene(k){ if(!PE) return; PE.scene=k; PR.scene=k; PR.selSet.clear(); $('peSceneSheet').hidden=true; peDraw();
  if(!peScrollTo(k)) toast('このときの演奏は、今の曲では使われていません（コードの長さを変えると使われます）'); }
// 編集している所のそばに、短いメッセージをポンと出す（くり返しをまとめて編集しているときなど）
function pePop(t){ let el=$('pePop'); if(!el){ el=document.createElement('div'); el.id='pePop'; el.setAttribute('role','status'); $('peMain').appendChild(el); }
  const sc=$('bScroll'), s=BSEGS[BLKE.act[PR.scene]], W=$('peMain').clientWidth;
  el.textContent=t; el.classList.remove('on'); void el.offsetWidth;
  // コード名のとなりに出す
  const x=s?BLW+s.x0*BSW-sc.scrollLeft+56:BLW+56;  el.style.left=Math.max(8,Math.min(W-el.offsetWidth-8,x))+'px'; el.style.top=(sc.offsetTop+BRUL-22)+'px';
  el.classList.add('on'); clearTimeout(el.t); el.t=setTimeout(()=>el.classList.remove('on'),1600); }
{ const cn=commitNotes; commitNotes=function(){ const r=cn.apply(this,arguments); if(PE && PE.pop){ const sig=PR.scene+':'+BLKE.act[PR.scene]; PE.popEd=PE.popEd||{}; if(!PE.popEd[sig]){ PE.popEd[sig]=1; pePop(PE.pop); } } return r; }; }
function peCommit(){ commitNotes(); clearTimeout(HIST.t); histCommit(); peDraw(); }

// ---------- 描く ----------
function peDraw(){ if(!PE) return; patKind=PE.kind; PR.scene=PE.scene; if(!curMy()) return peClose(); BLKE.cur=PE.scene; drawBlk(); }
function peChrome(){ const m=curMy();
  $('peTitle').innerHTML=`${esc(tkName(PE.kind))}の演奏<small class="nophrase">${esc(m.name||'')}${m.tmp?'・この曲だけの演奏（マイ演奏には入りません）':'・マイ演奏'}</small>`;
  const rg=$('peReg'); rg.disabled=!m.tmp; rg.textContent=m.tmp?'マイ演奏に登録':'登録済み';
  $('pePlay').innerHTML=playing?STOP_SVG:PLAY_SVG; $('pePlay').setAttribute('aria-label',playing?'止める':'再生');
  peTools();
  // ドラムは1・2小節目のタブ
  $('peDrumBars').innerHTML=peDrum()?['bar','B'].map(k=>{ const made=peSceneNotes(k).length; return `<button class="ptb${PE.scene===k?' on':''}" data-k="${k}" style="${!made&&k==='B'?'border-style:dashed':''}">${k==='bar'?'1小節目':'2小節目'+(made||k==='bar'?'':'（1と同じ）')}</button>`; }).join(' '):'';
  $('peDrumBars').querySelectorAll('button').forEach(b=>b.onclick=()=>peSetScene(b.dataset.k));
  const sb=$('peSceneBtn'); sb.hidden=!peArp(); sb.textContent=(n=>/とき$/.test(n)?n:n+'のとき')(SCENE_NAME(PE.scene))+' ▾';
}
function peSceneHTML(){ const m=curMy(), made=k=>peSceneNotes(k).length>0;
  let h='<div class="pesc"><div></div>'+[1,2,3,4].map(i=>`<div class="hd">${i}</div>`).join('');
  PE_SCENES.forEach(([lab,ks])=>{ h+=`<div class="lb">${lab}</div>`; for(let i=0;i<4;i++){ const k=ks[i]; if(!k){ h+='<div></div>'; continue; }
      const mk=made(k), fb=PE_FALL[k], nm=SCENE_NAME(k), tip=mk?nm:`${nm}：空っぽ（${fb?SCENE_NAME(fb)+'と同じ':'次のコードの弾き始めを先に弾く'}）`;
      h+=`<button class="${mk?'made':'empty'}${PE.scene===k?' cur':''}" data-k="${k}" title="${esc(tip)}" aria-label="${esc(tip)}">${mk?'':'＝'}</button>`; } });
  h+='</div>';
  const fb=PE_FALL[PE.scene], empty=!made(PE.scene);
  h+=`<div class="pescnote"><b style="color:var(--ink)">${esc(SCENE_NAME(PE.scene))}</b><br>${empty?(fb?`空っぽなので「${esc(SCENE_NAME(fb))}」と同じに鳴ります。音を置くと、このときだけの演奏になります。`:'空っぽなので、次のコードの弾き始めを先に弾いて小節の頭までのばします。'):'このときの演奏を編集しています。'}${PE.scene==='bar'&&m.contNotes?'<br>（コードが続くとき用の演奏も入っています。1小節を編集するとそちらは消えます）':''}</div>`;
  return h; }
function peScenes(){ const nav=$('peScenes'); if(!peArp()){ nav.style.display='none'; return; } nav.style.display='';
  nav.innerHTML='<h3>演奏するとき</h3><div style="font-size:.68rem;color:var(--muted)">コードの長さと、何小節目か</div>'+peSceneHTML();
  nav.querySelectorAll('button[data-k]').forEach(b=>b.onclick=()=>peSetScene(b.dataset.k));
  const sh=$('peSceneSheetBody'); if(!$('peSceneSheet').hidden){ sh.innerHTML=peSceneHTML(); sh.querySelectorAll('button[data-k]').forEach(b=>b.onclick=()=>peSetScene(b.dataset.k)); } }
$('peSceneBtn').onclick=()=>{ $('peSceneSheet').hidden=false; peScenes(); };
$('peSceneClose').onclick=()=>{ $('peSceneSheet').hidden=true; };
$('peSceneSheet').onclick=e=>{ if(e.target.id==='peSceneSheet') $('peSceneSheet').hidden=true; };
// ---------- 選んだ音の設定（選んだときだけ） ----------
function peInsp(){ const el=$('peInsp'), ns=peSel(), k=ns.length;
  if(!k || blkDraw()){ el.className=''; el.innerHTML=''; return; }
  el.className='on'; const n=ns[k-1], F={}; let id=0; const fn=f=>{ const q='f'+(id++); F[q]=f; return q; };
  const row=(opts,cur,set)=>`<div class="irow">${opts.map(([v,l])=>`<button class="${cur(v)?'on':''}" data-f="${fn(()=>set(v))}">${esc(l)}</button>`).join('')}</div>`;
  const all=f=>ns.every(f);
  let h=`<div class="ih"><b>${k>1?`選んだ${k}個の音`:'選んだ音'}</b><small>${peWide()?'Delete で削除・? でショートカット':'もう一度押すと外す'}</small></div>`;
  if(peArp()) h+=`<h4>弾く向き</h4>`+row([['','おまかせ'],['d','ダウン ↓'],['u','アップ ↑']],v=>all(x=>(x.dir||'')===v),v=>{ ns.forEach(x=>{ if(v) x.dir=v; else delete x.dir; }); peCommit(); });
  const v0=Math.round(n.vel*127), dy=BDYN.find(([,v])=>Math.abs(v-n.vel)<.02);
  h+=`<h4>強さ<span>${dy?dy[0]+' ':''}${v0}</span></h4><input type="range" min="1" max="127" value="${v0}" id="peIVel" aria-label="強さ">`
    + row(BDYN.map(([l,v])=>[v,l]),v=>all(x=>Math.abs(x.vel-v)<.02),v=>{ ns.forEach(x=>x.vel=v); peCommit(); });
  if(!peDrum()) h+=`<h4>ゴーストノート</h4>`+row([[false,'ふつう'],[true,'ゴーストノート']],v=>all(x=>!!x.gh===v),v=>{ ns.forEach(x=>{ if(v){ x.gh=true; x.len=Math.min(x.len,GHOST_LEN); } else delete x.gh; }); peCommit(); });
  else h+=`<h4>ゴーストノート</h4>`+row([[false,'ふつう'],[true,'ゴーストノート']],v=>all(x=>(x.vel<=.3)===v),v=>{ ns.forEach(x=>x.vel=v?.25:.8); peCommit(); });
  if(peArp()){ const mel=ns.some(x=>isDeg(x.r)), cur=bFxOf(n);
    h+=`<h4>飾り${cur?`<span>${esc((BFX.flatMap(x=>x[1]).find(x=>x[0]===cur)||[,,''])[2].replace(/\n/g,''))}</span>`:''}</h4><div class="igrid">`;
    BFX.forEach(([,L])=>L.filter(x=>!(x[0]==='up'&&mel)).forEach(([v,ico,lab,tip])=>{ h+=`<button class="${all(x=>bFxOf(x)===v)?'on':''}" title="${esc(tip)}" data-f="${fn(()=>{ bSetFx(v); clearTimeout(HIST.t); histCommit(); peDraw(); })}"><i>${ico}</i><span>${esc(lab).replace(/\n/g,'<br>')}</span></button>`; }));
    h+='</div>';
    h+=`<h4>高さ<span>1オクターブ</span></h4>`+row([[-12,'下げる'],[0,'そのまま'],[12,'上げる']],v=>all(x=>(x.oc||0)===v),v=>{ ns.forEach(x=>{ if(v) x.oc=v; else delete x.oc; }); peCommit(); });
    h+=`<h4>鳴らすとき</h4><select id="peIWhen" aria-label="鳴らすとき">${WHEN_KINDS.map(([v,l])=>`<option value="${v}"${(n.when||'')===v?' selected':''}>${esc(l)}</option>`).join('')}</select>`; }
  el.innerHTML=h;
  el.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{ const f=F[b.dataset.f]; if(f) f(); });
  const vi=$('peIVel'); vi.oninput=()=>{ const v=+vi.value; ns.forEach(x=>x.vel=v/127); }; vi.onchange=()=>peCommit();
  const wi=$('peIWhen'); if(wi) wi.onchange=()=>{ const v=wi.value; ns.forEach(x=>{ if(v) x.when=v; else delete x.when; }); peCommit(); }; }


// ---------- 演奏の設定 ----------
function peSettings(){ const box=$('peSet'), m=curMy(), kind=PE.kind, F={}; let id=0; const fn=f=>{ const q='s'+(id++); F[q]=f; return q; };
  const set=(k,v,dflt)=>{ if(dflt!==undefined && v===dflt) delete m[k]; else m[k]=v; rebuildMy(); save(); peSettings(); };
  const opt=(label,opts,cur,on)=>`<div class="so"><span>${esc(label)}</span><div>${opts.map(([v,l])=>`<button class="${cur===v?'on':''}" data-f="${fn(()=>on(v))}">${esc(l)}</button>`).join('')}</div></div>`;
  const sec=(t,body)=>`<section><h4>${esc(t)}</h4>${body}</section>`;
  let h='';
  if(isArpK(kind)){
    h+=sec('リズム',opt('ハネ',[['','まっすぐ'],['swing','ハネる'],['swing16','16分で軽く']],m.swing||'',v=>set('swing',v))+opt('タイミング',[[false,'ぴったり'],[true,'人間っぽく揺らす']],!!m.loose,v=>set('loose',v)));
    h+=sec('音ののばし方',opt('のばし方',[[true,'ペダルでのばす'],[false,'コードが変わったら切る']],m.legato!==false,v=>set('legato',v))+opt('同じ高さが続くとき',[[false,'弾き直す'],[true,'つなげて1つに（管楽器向け）']],!!m.tie,v=>set('tie',v)));
    h+=sec('次のコードを先に弾く（食い）',opt('コードが変わる所',[[0,'ちょうどで弾く'],[1,'いつも16分早く'],[2,'いつも8分早く']],m.pushBy||0,v=>set('pushBy',v))+opt('先に弾く所',[[false,'毎回'],[true,'2小節目に入るときだけ']],!!m.push2nd,v=>set('push2nd',v))+opt('先に弾いたあとの1拍目',[[false,'弾かない'],[true,'低い音（根音・5度）だけ弾く']],!!m.pushKeepLH,v=>set('pushKeepLH',v)));
    h+=sec('右手の和音の形',opt('形',[[false,'ふつう'],[true,'ルート・3度・7度']],!!m.shell,v=>set('shell',v))+opt('4音以上のコードのルート',[[false,'弾く'],[true,'省く（上の音は残す）']],!!m.noRoot,v=>set('noRoot',v))+opt('弦楽器の合奏（4声＋コントラバス）',[[false,'使わない'],[true,'使う']],!!m.satb,v=>set('satb',v)));
    h+=sec('ギター',opt('押さえ方',[[false,'ふつう'],[true,'ボサノバ（低い音＋3度・7度・9度）']],!!m.bossaV,v=>set('bossaV',v))+opt('弦の鳴らし方',[[false,'ピック'],[true,'指ではじく']],!!m.pluck,v=>set('pluck',v)));
    h+=sec('右手の高さ',opt('好み',[[-4,'低め'],[-2,'少し低め'],[0,'ふつう'],[2,'少し高め'],[4,'高め']],m.rhMid||0,v=>set('rhMid',v))+opt('この演奏だけずらす（半音）',[[-5,'−5'],[0,'0'],[4,'+4'],[7,'+7'],[13,'+13']],m.rhShift||0,v=>set('rhShift',v))+opt('いつも左手より上に置く',[[false,'しない'],[true,'する']],!!m.rhAbove,v=>set('rhAbove',v)));
    h+=sec('左手・ベース',opt('ベースと重なる左手の低い音',[[false,'少し弱める'],[true,'弱めない']],!!m.lhFull,v=>set('lhFull',v)));
    h+=sec('メロディ行',opt('高さ',[[-12,'1オクターブ下'],[0,'ふつう'],[12,'1オクターブ上']],m.melOct||0,v=>set('melOct',v))+opt('メロディをよける',[[true,'よける（和音をメロより下に）'],[false,'よけない']],m.avoid!==false,v=>{ if(v) delete m.avoid; else m.avoid=false; rebuildMy(); save(); peSettings(); }));
    h+=sec('アクセント・音量',opt('アクセントで終わったとき',[[false,'そのまま'],[true,'次のコードの上の音へ上げてつなぐ']],!!m.accLink,v=>set('accLink',v))+opt('この演奏の音量',[[.6,'60%'],[.72,'72%'],[.85,'85%'],[1,'100%']],m.vol||1,v=>set('vol',v,1)));
  } else if(isDrumK(kind)){
    h+=sec('フィル（4小節ごと）',opt('',[['tom','タム回し'],['snare','スネア'],['kime','キメ'],['dance','ロール'],['soft','ソフト'],['rock','ロック'],['groove','ゆったり'],['funk','ファンキー'],['soul','ジャジー'],['ballad','バラード'],['shuf','3連符'],['orch','オーケストラ'],['march','マーチ'],['four','4つ打ち'],['cityend','シティポップ'],['halfp','ハーフ'],[null,'なし']],m.fill??null,v=>set('fill',v)));
    h+=sec('リズム',opt('ハネ',[['','なし'],['swing','8分でハネる'],['swing16','16分でハネる']],m.swing||'',v=>set('swing',v))+opt('強弱のメリハリ',[[0,'ふつう'],[1.8,'はっきり'],[2,'もっとはっきり']],m.dyn||0,v=>set('dyn',v)));
    h+=sec('そのほか',opt('フィルのあとのシンバル',[[true,'次の小節の頭で鳴らす'],[false,'鳴らさない']],m.crash0!==false,v=>{ if(v) delete m.crash0; else m.crash0=false; rebuildMy(); save(); peSettings(); })+opt('キックで伴奏を沈める',[[false,'なし'],[true,'あり（ダンス系）']],!!m.duck,v=>set('duck',v)));
  } else {
    h+=sec('すべり（ポルタメント）',opt('音を重ねたときの、すべる速さ',[[.035,'速い'],[.08,'ふつう'],[.16,'ゆっくり']],m.glide||.08,v=>set('glide',v)));
  }
  box.innerHTML=`<div role="dialog" aria-label="演奏の設定"><div class="sh"><h3>演奏の設定<small class="nophrase">${esc(m.name||'')}・どのときの演奏にも効きます</small></h3><button class="ptb" id="peSetReg" ${m.tmp?"":"disabled"}>${m.tmp?"マイ演奏に登録":"登録済み"}</button><button class="ptb" id="peSetPick">ほかの演奏を下書きに</button><button class="ptb" id="peSetX">とじる</button></div><div class="sb">${h}</div></div>`;
  box.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{ const f=F[b.dataset.f]; if(f) f(); });
  $('peSetReg').onclick=()=>{ box.hidden=true; peReg(); }; $('peSetPick').onclick=()=>{ box.hidden=true; $('pePick').click(); }; $('peSetX').onclick=()=>{ box.hidden=true; }; box.onclick=e=>{ if(e.target===box) box.hidden=true; };
  box.hidden=false; }
$('peSetBtn').onclick=()=>peSettings();
// ほかの演奏を下書きに：選んだ演奏で開き直す（キャンセルすれば開いたときに戻る）
$('pePick').onclick=()=>{ const P=PE, kind=P.kind, drum=isDrumK(kind), bass=isBassK(kind);
  const cats = bass ? ()=>[['ベースの演奏',Object.keys(BASSES).filter(k=>!/^my\d+$/.test(k)||true).map(k=>({k,label:BASSES[k].name}))]] : ()=>patCats(kind);
  openPicker('下書きにする演奏', cats, patOf(kind), v=>{
    const list=listOf(kind), i=list.length-1; if(!P.wasMy && JSON.stringify(list[i])===P.copy && patOf(kind)==='my'+i){ list.pop(); rebuildMy(); }
    setPatOf(kind,v); if(kind==='bass') state.bass=true; save(); renderAll(); ensureSounds();
    const snap=P.snap, sc=P.scene; PE=null; peOpen(kind, sc); if(PE){ PE.snap=snap; peDraw(); } return true; }); };

// キーボード：演奏の設定が開いているときの Esc だけ。ロールの中の操作は 07 のピアノロールのショートカットで
document.addEventListener('keydown',e=>{ if(!PE || $('peEd').hidden || $('peSet').hidden) return;
  if(e.key==='Escape'){ e.preventDefault(); e.stopImmediatePropagation(); $('peSet').hidden=true; } },true);
addEventListener('resize',()=>{ if(PE) peDraw(); });
// 再生中は、鳴っている所をロールが追いかける（ページめくりのように、右はし近くまで来たら先へ送る）。ボタンで切りかえ、覚えておく
let PE_FOL=true; try{ PE_FOL=localStorage.getItem('peFollow')!=='0'; }catch(_){}
function peFolUI(){ const b=$('peFol'); b.classList.toggle('on',PE_FOL); b.setAttribute('aria-pressed',PE_FOL?'true':'false'); }
$('peFol').onclick=()=>{ PE_FOL=!PE_FOL; try{ localStorage.setItem('peFollow',PE_FOL?'1':'0'); }catch(_){} peFolUI(); toast(PE_FOL?'再生中、ロールが鳴っている所を追いかけます':'ロールを追いかけないようにしました'); };
peFolUI();
(function peFolLoop(){ if(PE && BLKE && PE_FOL && playing && cur && ctx && !BD){ const sc=$('bScroll'), L=slotSteps(), frac=Math.min(1,(ctx.currentTime-cur.t)/stepDur()),
    x=(cur.b+(cur.s+frac)/(cur.L||16))*L*BSW, w=sc.clientWidth-BLW, sl=sc.scrollLeft;
    if(w>40 && (x<sl || x>sl+w*.85)) sc.scrollLeft=Math.max(0,x-w*.1); }
  $('pePlay').innerHTML=playing?STOP_SVG:PLAY_SVG; requestAnimationFrame(peFolLoop); })();
// 入口：今までの「演奏を編集」はすべてこの画面で開く
openPatEditor=function(kind,mode){ closeAll(); peOpen(kind, PR.scene, mode); };
editTrackPattern=function(kind,scene){ peOpen(kind, scene); };
openBlk=function(kind,scene,where,x0,x1,mode){ return peOpen(kind,scene,mode,x0); };
