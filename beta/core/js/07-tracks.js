// ---------- PRO：トラック（試作版） ----------
// メイン画面の伴奏は1行にまとめ、タップで「トラック」の画面を開く。楽器ごとの行に、いま使っているパターンと音色を出し、
// パターンをタップするとそのまま編集できる。行を左へスワイプ（か、つまみのボタン）で音量・左右（パン）・響き（リバーブ）
// 楽器（コード楽器）はいくつでも足せる（state.xtr）。名前と色も変えられる

// 伴奏スタイルを PRO の設定に読み込む（通常モードと同じ鳴り方になるように、音域のずらし方・ミキサーもそのまま写す）
function proFromStyle(st){ setStyle(st); const o=sOffOf(st);
  Object.assign(state,{rhLo:null,lhLo:null,rhLo2:null,lhLo2:null,bassLo:null, rhOff:o.rh, lhOff:o.lh, rhOff2:o.rh2, lhOff2:o.lh2, bassOff:o.bass, xtr:[]}); }

const TRK_COLORS=['#3567D6','#24946A','#DA6A22','#8A4FD3','#D13F6B','#1F8FA8','#B8860B','#5B6475'];
const TRK_DEF={arp:['コード',0],arp2:['コード2',3],drum:['ドラム',7],bass:['ベース',2]};
// トラックの一覧（いま鳴らすもの）。kind：arp・arp2・x:ID・drum・bass
function trackList(){ const L=[{kind:'arp'}];
  if(state.arp2 && ARPS[state.arp2]) L.push({kind:'arp2'});
  (state.xtr||[]).forEach(t=>L.push({kind:'x:'+t.id}));
  L.push({kind:'drum'}); if(state.bass) L.push({kind:'bass'});
  return L; }
const mixKey=kind=>kind.startsWith('x:')?kind.slice(2):kind;
const tkMeta=kind=>{ const x=xOf(kind); if(x) return x; state.tk=state.tk||{}; return state.tk[kind]=state.tk[kind]||{}; };
const tkName=kind=>tkMeta(kind).name || (TRK_DEF[kind]||[])[0] || '楽器';
const tkColor=kind=>{ const m=tkMeta(kind); if(m.color) return m.color; const d=TRK_DEF[kind]; if(d) return TRK_COLORS[d[1]]; const i=(state.xtr||[]).indexOf(xOf(kind)); return TRK_COLORS[(4+Math.max(0,i))%TRK_COLORS.length]; };
const tkInst=kind=>{ const x=xOf(kind); if(x) return INSTS[x.inst]||''; if(kind==='arp') return INSTS[state.inst]||''; if(kind==='arp2') return INSTS[state.inst2||'epiano']||''; if(kind==='drum') return KITS[state.kit]||''; return BASS_SNDS[state.bassSnd||'bass']||''; };
const tkPatName=kind=>{ if(kind==='drum') return patName(DRUMS[state.drum]||{name:''}); if(kind==='bass') return (BASSES[state.bassPat||'auto']||{name:'ドラムに合わせる'}).name; const k=patOf(kind); return k&&ARPS[k]?patName(ARPS[k]):'なし'; };
// メイン画面の帯に出す、トラックのまとめ
function trackSummary(){ const L=trackList(); return L.length+'つ ・ '+L.filter(t=>t.kind!=='drum'&&t.kind!=='bass').map(t=>tkInst(t.kind)).join('＋'); }

// ---- 画面（DAW 風。部品とスタイルは、このファイルの中で作る） ----
// 上：道具の列（パレットへ・ミキサー・停止・再生・テンポ・元に戻す・やり直す・設定）
// 左：トラックの頭（名前・ミュート・ソロ・音量）。右：小節の目盛りと、パターンの帯（タップで編集）
// トラックの頭をタップすると、そのトラックの設定（音量・左右・響き・名前と色など）が開く
const ICO={
  pal:'<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><rect x="2" y="3" width="8" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="12" y="3" width="8" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="2" y="12" width="8" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="12" y="12" width="8" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
  mix:'<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M5 3v16M11 3v16M17 3v16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><rect x="2.5" y="11" width="5" height="3.4" rx="1.2" fill="#2B2C30" stroke="currentColor" stroke-width="1.6"/><rect x="8.5" y="5" width="5" height="3.4" rx="1.2" fill="#2B2C30" stroke="currentColor" stroke-width="1.6"/><rect x="14.5" y="13" width="5" height="3.4" rx="1.2" fill="#2B2C30" stroke="currentColor" stroke-width="1.6"/></svg>',
  stop:'<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><rect x="3" y="3" width="12" height="12" rx="1.5" fill="currentColor"/></svg>',
  play:'<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3l12 7-12 7z" fill="currentColor"/></svg>',
  undo:'<svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true"><path d="M6.5 4L3 7.5 6.5 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 7.5h7a4 4 0 0 1 0 8H8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  redo:'<svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true" style="transform:scaleX(-1)"><path d="M6.5 4L3 7.5 6.5 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 7.5h7a4 4 0 0 1 0 8H8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  gear:'<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="3.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M11 2.5v3M11 16.5v3M2.5 11h3M16.5 11h3M5 5l2.1 2.1M14.9 14.9L17 17M5 17l2.1-2.1M14.9 7.1L17 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  mute:'<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor"/><path d="M10.5 5.5l4 5M14.5 5.5l-4 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  solo:'<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 10V8.5a5.5 5.5 0 0 1 11 0V10" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="2" y="9" width="3" height="5" rx="1.2" fill="currentColor"/><rect x="11" y="9" width="3" height="5" rx="1.2" fill="currentColor"/></svg>',
  close:'<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  plus:'<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true"><path d="M15 4v22M4 15h22" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  chev:'<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 3l3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'};

const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const panTxt=p=>Math.abs(p)<.03?'中':p<0?'左'+Math.round(-p*100):'右'+Math.round(p*100);
(function(){
  const css=`
#trk{position:fixed;inset:0;z-index:29;background:#1E1F22;color:#E9E9EC;display:flex;flex-direction:column;font-family:var(--body);
  --dpanel:#2B2C30;--dpanel2:#35363B;--dline:#3E3F45;--dmuted:#9C9DA3;--dhw:clamp(124px,34vw,270px);--dbw:96px;--drh:76px}
#trk[hidden]{display:none}
#trk button{font:inherit;color:inherit}
#trk .dtool{display:flex;align-items:center;gap:6px;padding:max(8px,env(safe-area-inset-top,0px)) 8px 8px;background:#18191B;border-bottom:1px solid #000;overflow-x:auto;scrollbar-width:none;flex:none}
#trk .dtool::-webkit-scrollbar{display:none}
#trk .dgrp{display:flex;background:var(--dpanel);border-radius:10px;overflow:hidden;flex:none}
#trk .dgrp+.dgrp{margin-left:2px}
#trk .dtb{width:44px;height:44px;border:0;background:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:0;color:#E9E9EC}
#trk .dtb+.dtb{border-left:1px solid #1E1F22}
#trk .dtb small{font-size:.56rem;color:var(--dmuted);line-height:1}
#trk .dtb[aria-pressed=true]{color:#3FA2FF}
#trk .dtb:disabled{opacity:.35}
#trk .dtb.dplay{width:52px;background:#1D3A22;color:#3BD15A}
#trk .dtb.dplay.on{background:#3BD15A;color:#10331A}
#trk .dtsp{flex:1;min-width:0}
@media (max-width:420px){ #trk .dtool{gap:4px;padding-left:6px;padding-right:6px} #trk .dtb{width:39px} #trk .dtb.dplay{width:46px} #trk .dbpm{min-width:44px;padding:0 6px} }
#trk .dbpm{height:44px;border:0;border-radius:10px;background:var(--dpanel);padding:0 10px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;flex:none;min-width:52px}
#trk .dbpm b{font-variant-numeric:tabular-nums;font-size:1rem}
#trk .dbpm small{font-size:.56rem;color:var(--dmuted)}
#trk .dbpmpop{position:absolute;z-index:6;background:var(--dpanel2);border:1px solid var(--dline);border-radius:12px;padding:10px 12px;display:flex;align-items:center;gap:10px;box-shadow:0 8px 24px rgba(0,0,0,.45)}
#trk .dbpmpop input{width:180px;accent-color:#3FA2FF}
#trk .dbody{flex:1;display:flex;min-height:0;position:relative}
#trk .dscroll{flex:1;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;position:relative}
#trk .dgrid{position:relative;min-width:100%;width:max-content;padding-bottom:calc(120px + env(safe-area-inset-bottom,0px))}
#trk .drow{display:flex;border-bottom:1px solid #141517}
#trk .dh{position:sticky;left:0;z-index:2;width:var(--dhw);flex:none;background:var(--dpanel);border-right:1px solid #141517;box-sizing:border-box}
#trk .dtl{position:relative;flex:none}
#trk .druler{position:sticky;top:0;z-index:4;background:#232427}
#trk .druler .dh{background:#232427;z-index:5;display:flex;align-items:center;padding:0 10px;font-size:.66rem;color:var(--dmuted)}
#trk .druler .dtl{display:flex;height:26px}
#trk .druler .dtl span{flex:none;width:var(--dbw);box-sizing:border-box;border-left:1px solid #4A4B51;font-size:.7rem;color:var(--dmuted);padding:3px 0 0 4px}
#trk .druler .dtl span.now{color:#fff;font-weight:700}
#trk .dchord .dh{display:flex;align-items:center;gap:8px;padding:0 10px;height:46px;font-weight:700;font-size:.82rem}
#trk .dchord .dh i{width:10px;height:10px;border-radius:3px;background:linear-gradient(135deg,var(--t),var(--s),var(--d));flex:none}
#trk .dchord .dtl{display:flex;height:46px;background:#202124}
#trk .dcbar{flex:none;width:var(--dbw);box-sizing:border-box;padding:5px 2px;display:flex;gap:2px;border-left:1px solid #2C2D31}
#trk .dcell{flex:1;min-width:0;border:0;border-radius:7px;cursor:pointer;font-weight:700;font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 4px;background:#2E3036;color:var(--dmuted)}
#trk .dcell.T{background:color-mix(in srgb,var(--t) 40%,#1E1F22);color:#fff}
#trk .dcell.S{background:color-mix(in srgb,var(--s) 40%,#1E1F22);color:#fff}
#trk .dcell.D{background:color-mix(in srgb,var(--d) 40%,#1E1F22);color:#fff}
#trk .dcell.X{background:#45464C;color:#fff}
#trk .dtrack .dh{height:var(--drh);display:flex;flex-direction:column;justify-content:center;gap:4px;padding:6px 8px 6px 14px;cursor:pointer}
#trk .dtrack .dh::before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--tc)}
#trk .dtrack.sel .dh{background:#3A3C42}
#trk .dtop{display:flex;align-items:center;gap:6px;min-width:0}
#trk .dname{font-weight:700;font-size:.86rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:1}
#trk .dinst{font-size:.66rem;color:var(--dmuted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#trk .dctl{display:flex;align-items:center;gap:6px}
#trk .dms{width:30px;height:26px;border:0;border-radius:7px;background:#232427;cursor:pointer;display:grid;place-items:center;flex:none;color:#C9CACF;padding:0}
#trk .dms[data-k=m][aria-pressed=true]{background:#5B6BFF;color:#fff}
#trk .dms[data-k=s][aria-pressed=true]{background:#3A3412;color:#FFD21F}
#trk input[type=range]{accent-color:#3FA2FF}
#trk .dctl input[type=range]{flex:1;min-width:0;height:18px}
#trk .dtrack .dtl{height:var(--drh);background:#202124;cursor:pointer}
#trk .dtrack .dtl canvas{position:absolute;left:0;top:0;width:100%;height:100%}
#trk .dtrack.silent .dtl canvas{opacity:.35}
#trk .dadd .dh{display:flex;align-items:center;justify-content:center;height:64px;background:none;border-right:0}
#trk .daddb{width:48px;height:48px;border:0;background:none;cursor:pointer;color:#E9E9EC;display:grid;place-items:center}
#trk .dmore{position:sticky;left:0;width:min(100vw,640px);box-sizing:border-box;padding:14px 12px 0}
#trk .dmore details{background:var(--dpanel);border-radius:12px;padding:10px 12px}
#trk .dmore summary{font-weight:700;font-size:.84rem;cursor:pointer}
#trk .dmore p{font-size:.74rem;color:var(--dmuted);margin:8px 0}
#trk .dmore .tstyles{display:flex;flex-wrap:wrap;gap:6px}
#trk .dchip{border:1px solid var(--dline);background:var(--dpanel2);border-radius:999px;padding:7px 12px;cursor:pointer;font-size:.8rem;font-weight:700}
#trk .dhead{position:absolute;top:0;bottom:0;width:2px;background:#fff;z-index:3;pointer-events:none;box-shadow:0 0 0 1px rgba(0,0,0,.3)}
#trk .dhead::before{content:"";position:absolute;top:0;left:-6px;border:7px solid transparent;border-top:9px solid #fff;border-bottom:0}
#trk .dhint{position:sticky;left:0;width:min(100vw,640px);box-sizing:border-box;font-size:.72rem;color:var(--dmuted);padding:10px 12px 0;line-height:1.6;margin:0}
/* トラックの設定（せまい画面は下から、広い画面は左に並べる） */
#trk .dinsp{position:absolute;z-index:8;left:0;right:0;bottom:0;max-height:72%;overflow-y:auto;background:#252629;border-top:1px solid #000;border-radius:16px 16px 0 0;padding:6px 14px calc(18px + env(safe-area-inset-bottom,0px));box-shadow:0 -10px 30px rgba(0,0,0,.45);overscroll-behavior:contain}
#trk .dinsp[hidden]{display:none}
@media (min-width:900px),(orientation:landscape) and (min-width:600px){ #trk .dinsp{position:relative;max-height:none;width:min(320px,38vw);flex:none;border-radius:0;border-top:0;border-right:1px solid #000;box-shadow:none;order:-1} }
#trk .dititle{display:flex;align-items:center;gap:8px;position:sticky;top:-6px;background:#252629;padding:10px 0 8px;z-index:1}
#trk .dititle b{flex:1;text-align:center;color:#3FA2FF;font-size:1.15rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#trk .dititle button{width:36px;height:36px;border:0;background:none;cursor:pointer;display:grid;place-items:center;flex:none}
#trk .disec{background:var(--dpanel);border-radius:12px;margin-top:10px;overflow:hidden}
#trk .disec h3{margin:0;padding:10px 14px;font-size:.82rem;font-weight:700;text-align:center;background:var(--dpanel2);color:#D8D9DD}
#trk .disec .dib{padding:10px 14px 12px;display:flex;flex-direction:column;gap:10px}
#trk .dirow{display:grid;grid-template-columns:5.5em 1fr 2.8em;align-items:center;gap:8px;font-size:.8rem}
#trk .dirow output{text-align:right;font-variant-numeric:tabular-nums;color:var(--dmuted)}
#trk .dims{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#trk .dims button{height:44px;border:0;border-radius:10px;background:#232427;cursor:pointer;display:grid;place-items:center}
#trk .dims button[data-k=m][aria-pressed=true]{background:#5B6BFF}
#trk .dims button[data-k=s][aria-pressed=true]{background:#3A3412;color:#FFD21F}
#trk .dipat{display:flex;align-items:center;gap:8px;border:0;border-radius:10px;background:#232427;padding:8px 10px;cursor:pointer;text-align:left;width:100%}
#trk .dipat canvas{width:40%;height:26px;flex:none;border-radius:6px}
#trk .dipat span{font-weight:700;font-size:.82rem;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#trk .dilink{display:flex;align-items:center;justify-content:space-between;border:0;background:#232427;border-radius:10px;padding:11px 12px;cursor:pointer;font-size:.82rem;font-weight:700;width:100%}
#trk .diname{width:100%;box-sizing:border-box;background:#18191B;border:1px solid var(--dline);border-radius:10px;padding:9px 10px;color:#fff;font:inherit;font-size:.9rem}
#trk .tcolors{display:flex;gap:8px;flex-wrap:wrap}
#trk .tcolors button{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0}
#trk .tcolors button[aria-pressed=true]{border-color:#fff}
#trk .didel{border:1px solid #6B2B2B;background:none;color:#FF8A8A;border-radius:10px;padding:10px;cursor:pointer;font-weight:700;font-size:.82rem;margin-top:12px;width:100%}
body.pro #arp2Lane,body.pro #bassLane{display:none}
body.pro .mix{display:none}
body.pro #drumLane .lanehead{display:none}
body.pro #drumLane{margin-top:-6px}
body.pro .lane canvas{height:28px}
body.pro #sheet .proedit{display:none!important}
#patSheet .pdirect{display:flex;gap:6px;align-items:center;margin:-4px 0 10px;flex-wrap:wrap}
#patSheet .pdirect small{color:var(--muted);font-size:.74rem;flex:1;min-width:12em}
body.pro #accNote{display:none}
button.badge{font:inherit;font-size:.72rem;cursor:pointer}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  const el=document.createElement('div'); el.id='trk'; el.hidden=true; el.setAttribute('role','dialog'); el.setAttribute('aria-label','トラック');
  const tb=(id,ico,label,cls='')=>`<button class="dtb ${cls}" id="${id}" aria-label="${label}">${ico}<small>${label}</small></button>`;
  el.innerHTML=`<div class="dtool">
      <div class="dgrp">${tb('dPal',ICO.pal,'パレット')}${tb('dMix',ICO.mix,'ミキサー')}</div>
      <div class="dgrp">${tb('dStop',ICO.stop,'停止')}${tb('dPlay',ICO.play,'再生','dplay')}</div>
      <button class="dbpm" id="dBpm" aria-label="テンポ"><b id="dBpmV"></b><small>テンポ</small></button>
      <span class="dtsp"></span>
      <div class="dgrp">${tb('dUndo',ICO.undo,'戻す')}${tb('dRedo',ICO.redo,'やり直す')}</div>
      <div class="dgrp">${tb('dSet',ICO.gear,'設定')}</div>
    </div>
    <div class="dbody"><div class="dinsp" id="dInsp" hidden></div><div class="dscroll" id="dScroll"><div class="dgrid" id="trkList"></div></div></div>`;
  document.body.appendChild(el);
  // 編集画面の上に「別のパターンを選ぶ」
  const pd=document.createElement('div'); pd.className='pdirect'; pd.id='patDirect'; pd.hidden=true;
  pd.innerHTML=`<button class="chip" id="patPick">別のパターンを選ぶ</button><small id="patDirectNote"></small>`;
  const ps=$('patSheet'); ps.insertBefore(pd, ps.children[1]);
})();
const trk=$('trk');
let TRK_SEL=null;   // 設定を開いているトラック
function openTracks(){ trk.hidden=false; renderTracks(); requestAnimationFrame(dawFrame); }
function closeTracks(){ trk.hidden=true; TRK_SEL=null; $('dInsp').hidden=true; renderAll(); }
$('dPal').onclick=closeTracks;
$('dMix').onclick=()=>{ if(TRK_SEL){ TRK_SEL=null; } else TRK_SEL=trackList()[0].kind; renderTracks(); };
$('dPlay').onclick=()=>{ if(!playing) $('play').click(); };
$('dStop').onclick=()=>{ if(playing) $('play').click(); };
$('dUndo').onclick=()=>$('undoBtn').click();
$('dRedo').onclick=()=>$('redoBtn').click();
$('dSet').onclick=()=>$('menuBtn').click();
$('dBpm').onclick=e=>{ const old=trk.querySelector('.dbpmpop'); if(old){ old.remove(); return; }
  const r=$('dBpm').getBoundingClientRect(), p=document.createElement('div'); p.className='dbpmpop';
  p.style.left=Math.max(8,Math.min(innerWidth-260,r.left-60))+'px'; p.style.top=(r.bottom+6)+'px';
  const src=$('bpm'); p.innerHTML=`<input type="range" min="${src.min}" max="${src.max}" step="${src.step||1}" value="${state.bpm}" aria-label="テンポ"><b>${state.bpm}</b>`;
  const inp=p.querySelector('input'); inp.oninput=()=>{ src.value=inp.value; src.dispatchEvent(new Event('input',{bubbles:true})); p.querySelector('b').textContent=state.bpm; $('dBpmV').textContent=state.bpm; };
  trk.appendChild(p); setTimeout(()=>document.addEventListener('pointerdown',function f(ev){ if(!p.contains(ev.target)&&ev.target!==$('dBpm')&&!$('dBpm').contains(ev.target)){ p.remove(); document.removeEventListener('pointerdown',f); } }),0); };

// 1マスの幅：画面に収まるなら広げる。せまいときは横にスクロール
function dawBarW(){ const sc=$('dScroll'), hw=trk.querySelector('.dh')?.offsetWidth||Math.min(270,Math.max(148,innerWidth*.4));
  return Math.max(state.bars<=4?56:64, Math.floor(((sc.clientWidth||innerWidth)-hw-2)/state.bars)); }
function renderTracks(){ if(trk.hidden) return; if(!state.pro){ trk.hidden=true; TRK_SEL=null; return; } const box=$('trkList'); box.innerHTML='';
  const L=trackList(), solo=L.some(t=>mixOf(mixKey(t.kind)).s), N=state.bars;
  if(TRK_SEL && !L.some(t=>t.kind===TRK_SEL)) TRK_SEL=null;
  $('dBpmV').textContent=state.bpm; $('dMix').setAttribute('aria-pressed',!!TRK_SEL);
  $('dUndo').disabled=$('undoBtn').disabled; $('dRedo').disabled=$('redoBtn').disabled;
  // 目盛り
  const ru=document.createElement('div'); ru.className='drow druler'; ru.innerHTML=`<div class="dh">${state.len<4?'マス':'小節'}</div><div class="dtl">${Array.from({length:N},(_,i)=>`<span data-b="${i}">${i+1}</span>`).join('')}</div>`; box.appendChild(ru);
  // コード進行の行（タップでそのコードを編集）
  const ch=document.createElement('div'); ch.className='drow dchord';
  ch.innerHTML=`<div class="dh"><i></i>コード進行</div><div class="dtl">${Array.from({length:N},(_,b)=>`<div class="dcbar">${cellsOf(b).map(c=>{ const e=c.v===null||c.v===undefined;
    return `<button class="dcell ${e?'':roleAt(b,c.h,c.v)}" data-b="${b}" data-h="${c.h}" style="flex:${c.len}">${e?'—':esc(chordText(c.v))}</button>`; }).join('')}</div>`).join('')}</div>`;
  ch.querySelectorAll('.dcell').forEach(b=>b.onclick=()=>openEditor(+b.dataset.b,+b.dataset.h));
  box.appendChild(ch);
  // 楽器の行
  L.forEach(({kind})=>{ const mk=mixKey(kind), x=mixOf(mk), row=document.createElement('div');
    row.className='drow dtrack'+(TRK_SEL===kind?' sel':''); row.classList.toggle('silent', solo?!x.s:!!x.m); row.style.setProperty('--tc',tkColor(kind));
    row.innerHTML=`<div class="dh" role="button" tabindex="0" aria-label="${esc(tkName(kind))}の設定"><div class="dtop"><span class="dname">${esc(tkName(kind))}</span></div><span class="dinst">${esc(tkInst(kind))}</span>
      <div class="dctl"><button class="dms" data-k="m" aria-pressed="${!!x.m}" aria-label="ミュート">${ICO.mute}</button><button class="dms" data-k="s" aria-pressed="${!!x.s}" aria-label="ソロ">${ICO.solo}</button><input type="range" min="0" max="1.5" step=".01" value="${x.v??1}" aria-label="音量"></div></div>
      <div class="dtl" role="button" aria-label="${esc(tkPatName(kind))}を編集"><canvas></canvas></div>`;
    box.appendChild(row);
    const h=row.querySelector('.dh');
    h.onclick=e=>{ if(e.target.closest('button,input')) return; TRK_SEL = TRK_SEL===kind ? null : kind; renderTracks(); };
    row.querySelectorAll('.dms').forEach(b=>b.onclick=()=>{ x[b.dataset.k]=!x[b.dataset.k]; applyMix(); save(); renderTracks(); });
    const vol=row.querySelector('.dctl input'); vol.oninput=()=>{ x.v=+vol.value; applyMix(); save(); const o=$('dInsp').querySelector('[data-f=v]'); if(o&&TRK_SEL===kind){ o.value=vol.value; o.nextElementSibling.textContent=Math.round(x.v*100); } };
    row.querySelector('.dtl').onclick=()=>editTrackPattern(kind); });
  // 楽器を足す・伴奏スタイルから作り直す
  const ad=document.createElement('div'); ad.className='drow dadd'; ad.style.borderBottom='0'; ad.innerHTML=`<div class="dh"><button class="daddb" id="trkAdd" aria-label="楽器を足す">${ICO.plus}</button></div>`; box.appendChild(ad);
  $('trkAdd').onclick=addTrack;
  const hint=document.createElement('p'); hint.className='dhint'; hint.textContent='帯をタップするとパターンを編集、左の名前をタップするとそのトラックの設定（音量・左右・響き・名前と色）が開きます。コードをタップするとコードを編集できます。'; box.appendChild(hint);
  const mo=document.createElement('div'); mo.className='dmore'; mo.innerHTML=`<details id="trkStyleBox"><summary>伴奏スタイルから作り直す</summary><p>選んだスタイルと同じ鳴り方のトラックに置きかえます（いまのトラックはなくなります）。</p><div class="tstyles" id="trkStyles"></div></details>`; box.appendChild(mo);
  const sb=$('trkStyles'); STYLES.forEach(st=>{ const b=document.createElement('button'); b.className='dchip'; b.textContent=st.name;
    b.onclick=()=>{ if(!b.dataset.armed){ sb.querySelectorAll('[data-armed]').forEach(o=>{ delete o.dataset.armed; o.textContent=o.dataset.n; }); b.dataset.n=st.name; b.dataset.armed='1'; b.textContent=st.name+'（もう一度押すと置きかえ）'; return; }
      proFromStyle(st); if(st.bpm){ state.bpm=st.bpm; $('bpm').value=state.bpm; $('bpmOut').textContent=state.bpm; } state.tk={}; applyMix(); save(); renderAll(); ensureSounds(); renderTracks(); toast(st.name+'のトラックにしました'); };
    sb.appendChild(b); });
  const hd=document.createElement('div'); hd.className='dhead'; hd.id='dHead'; hd.hidden=true; box.appendChild(hd);
  // 幅を決めてから帯を描く
  requestAnimationFrame(()=>{ const bw=dawBarW(); trk.style.setProperty('--dbw',bw+'px');
    box.querySelectorAll('.dtl').forEach(t=>t.style.width=(bw*N)+'px');
    box.querySelectorAll('.dtrack').forEach((row,i)=>drawRegion(row.querySelector('canvas'),L[i].kind,bw));
    const last=[...box.querySelectorAll('.dtrack')].pop(); if(last){ hd.style.bottom='auto'; hd.style.height=(last.offsetTop+last.offsetHeight)+'px'; } });
  renderInsp(); }
// トラックの帯：トラックの色の帯に、実際に鳴るコードの長さでパターンを白く描く（GarageBand のリージョンのように）
function drawRegion(cv,kind,bw){ if(!cv.clientWidth) return; const g=fit(cv), W=cv.width, H=cv.height, r=devicePixelRatio||1, N=state.bars, L=slotSteps(), c=tkColor(kind);
  g.clearRect(0,0,W,H); const w=bw*r, top=18*r, py=top, ph=H-top-5*r;
  const col={ink:'#fff',muted:'rgba(255,255,255,.62)',line:'rgba(0,0,0,.16)',surface:c,lane:c,t:'#fff',s:'#fff',d:'#FFE3A3'};
  g.fillStyle=c; rr(g,1*r,2*r,W-2*r,H-4*r,6*r); g.fill();
  g.fillStyle='rgba(255,255,255,.95)'; g.font=`700 ${11*r}px ${getComputedStyle(document.body).fontFamily}`; g.textBaseline='top'; g.fillText(tkPatName(kind),7*r,5*r);
  for(let b=0;b<N;b++){ const x=b*w, px=x+4*r, pw=w-8*r, start=b*L;
    if(b>0){ g.fillStyle='rgba(0,0,0,.22)'; g.fillRect(x,top-2*r,1*r,H-top); }
    if(kind==='drum'){ const dr=DRUMS[state.drum]; if(!dr) continue; const db=Math.floor(start/16); drawDrumBar(g,px,py,pw,ph,(db%2===1&&dr.VB)?{...dr,V:dr.VB}:dr,col,fillModeOf(db,dr),start%16,L); continue; }
    cellsOf(b).forEach(cl=>{ if(cl.v===null||cl.v===undefined) return; const cx=px+cl.off/L*pw, cw=cl.len/L*pw;
      if(kind==='bass') drawBassBar(g,cx,py,cw,ph,(bassList(DRUMS[state.drum])||[]).filter(e=>e[0]<cl.len),'#fff',col,cl.len);
      else { const a=ARPS[patOf(kind)]; if(a) drawArpBar(g,cx,py,cw,ph,a,'#fff',col,cl.len); } }); } }
// 再生中の位置（白い線）と、再生ボタンの表示
function dawFrame(){ if(trk.hidden) return; const hd=$('dHead'), on=!!playing;
  $('dPlay').classList.toggle('on',on); $('dPlay').setAttribute('aria-pressed',on);
  if(hd){ if(on&&cur&&ctx){ const bw=parseFloat(trk.style.getPropertyValue('--dbw'))||96, frac=Math.min(1,(ctx.currentTime-cur.t)/stepDur()), hw=trk.querySelector('.dh').offsetWidth;
      hd.hidden=false; const hx=hw+(cur.b+(cur.s+frac)/(cur.L||16))*bw; hd.style.left=hx+'px';
      const sc=$('dScroll'); if(hx>sc.scrollLeft+sc.clientWidth-24 || hx<sc.scrollLeft+hw) sc.scrollLeft=Math.max(0,hx-hw-8);
      trk.querySelectorAll('.druler span').forEach(s=>s.classList.toggle('now',+s.dataset.b===cur.b)); }
    else if(!hd.hidden){ hd.hidden=true; trk.querySelectorAll('.druler span.now').forEach(s=>s.classList.remove('now')); } }
  requestAnimationFrame(dawFrame); }
// トラックの設定（ミキサー）
function renderInsp(){ const p=$('dInsp'), kind=TRK_SEL; if(!kind){ p.hidden=true; return; } p.hidden=false;
  const x=mixOf(mixKey(kind)), pan=x.pan||0, rev=x.rev||0, canDel=kind==='arp2'||kind.startsWith('x:')||kind==='bass', m=tkMeta(kind);
  p.innerHTML=`<div class="dititle"><span style="width:36px"></span><b>${esc(tkName(kind))}</b><button id="diClose" aria-label="閉じる">${ICO.close}</button></div>
    <div class="disec"><h3>パターンと音色</h3><div class="dib">
      <button class="dipat" id="diPat"><canvas></canvas><span>${esc(tkPatName(kind))}</span>${ICO.chev}</button>
      <button class="dilink" id="diPick"><span>パターン・音色・音域を選ぶ（${esc(tkInst(kind))}）</span>${ICO.chev}</button></div></div>
    <div class="disec"><h3>出力</h3><div class="dib">
      <label class="dirow">音量<input type="range" min="0" max="1.5" step=".01" value="${x.v??1}" data-f="v"><output>${Math.round((x.v??1)*100)}</output></label>
      <label class="dirow">左右<input type="range" min="-1" max="1" step=".05" value="${pan}" data-f="pan"><output>${panTxt(pan)}</output></label>
      <label class="dirow">響き<input type="range" min="0" max="1" step=".05" value="${rev}" data-f="rev"><output>${Math.round(rev*100)}</output></label>
      <div class="dims"><button data-k="m" aria-pressed="${!!x.m}" aria-label="ミュート">${ICO.mute}</button><button data-k="s" aria-pressed="${!!x.s}" aria-label="ソロ">${ICO.solo}</button></div></div></div>
    <div class="disec"><h3>名前と色</h3><div class="dib"><input class="diname" id="diName" maxlength="16" value="${esc(tkName(kind))}" aria-label="トラックの名前"><div class="tcolors" id="diColors"></div></div></div>
    ${canDel?'<button class="didel" id="diDel">このトラックをなくす</button>':''}`;
  $('diClose').onclick=()=>{ TRK_SEL=null; renderTracks(); };
  $('diPat').onclick=()=>editTrackPattern(kind); $('diPick').onclick=()=>openSheet(kind);
  p.querySelectorAll('.dirow input').forEach(inp=>inp.oninput=()=>{ const f=inp.dataset.f; x[f]=+inp.value; inp.nextElementSibling.textContent= f==='pan'?panTxt(x.pan):Math.round(x[f]*100); applyMix(); save();
    if(f==='v'){ const i=trackList().findIndex(t=>t.kind===kind), r=$('trkList').querySelectorAll('.dtrack')[i]; if(r) r.querySelector('.dctl input').value=inp.value; } });
  p.querySelectorAll('.dims button').forEach(b=>b.onclick=()=>{ x[b.dataset.k]=!x[b.dataset.k]; applyMix(); save(); renderTracks(); });
  const nm=$('diName'), setName=()=>{ const v=nm.value.trim(); if(v) m.name=v; else delete m.name; save(); renderTracks(); renderAll(); };
  nm.onchange=setName; nm.onkeydown=e=>{ if(e.key==='Enter') nm.blur(); };
  const cl=$('diColors'); TRK_COLORS.forEach(c=>{ const b=document.createElement('button'); b.style.background=c; b.setAttribute('aria-label','色'); b.setAttribute('aria-pressed',tkColor(kind)===c); b.onclick=()=>{ m.color=c; save(); renderTracks(); }; cl.appendChild(b); });
  const del=$('diDel'); if(del) del.onclick=()=>{ if(!del.dataset.armed){ del.dataset.armed='1'; del.textContent='もう一度押すとなくします'; return; } removeTrack(kind); };
  requestAnimationFrame(()=>{ const cv=p.querySelector('.dipat canvas'); if(!cv||!cv.clientWidth) return; const g=fit(cv), c=tkColor(kind), col={...colors(),ink:'#fff',muted:'rgba(255,255,255,.6)',line:'#3E3F45'};
    if(kind==='drum') drawDrumBar(g,0,0,cv.width,cv.height,DRUMS[state.drum],col);
    else if(kind==='bass') drawBassBar(g,0,0,cv.width,cv.height,bassList(DRUMS[state.drum])||[],c,col);
    else { const a=ARPS[patOf(kind)]; if(a) drawArpBar(g,0,0,cv.width,cv.height,a,c,col); } }); }
// メイン画面が描き直されたら、トラックの画面も合わせる
{ const ra=renderAll; renderAll=function(){ const r=ra.apply(this,arguments); if(typeof trk!=='undefined' && !trk.hidden && !document.activeElement?.closest?.('#dInsp')) renderTracks(); return r; }; }
addEventListener('resize',()=>{ if(!trk.hidden) renderTracks(); });
// 楽器を足す：コード2が空いていればコード2に、そうでなければ足した楽器（state.xtr）に。足したらパターンを選ぶ画面を開く
function addTrack(){ if(!state.arp2 || !ARPS[state.arp2]){ state.arp2='whole'; state.inst2='strings3'; save(); renderAll(); ensureSounds(); renderTracks(); openSheet('arp2'); return; }
  state.xtr=state.xtr||[]; const ids=new Set(state.xtr.map(t=>t.id)); let n=1; while(ids.has('t'+n)) n++;
  const t={id:'t'+n, arp:'whole', inst:'strings3', rhLo:null, lhLo:null, rhOff:0, lhOff:0, name:'楽器'+(state.xtr.length+3)}; state.xtr.push(t);
  save(); renderAll(); ensureSounds(); applyMix(); renderTracks(); openSheet('x:'+t.id); }
function removeTrack(kind){ const x=xOf(kind);
  if(x){ state.xtr=state.xtr.filter(t=>t!==x); if(state.mix) delete state.mix[x.id]; }
  else if(kind==='arp2'){ // コード2をなくすと、足した楽器の1つ目がコード2になる（並びはそのまま）
    const t=(state.xtr||[]).shift(); if(t){ Object.assign(state,{arp2:t.arp, inst2:t.inst, rhLo2:t.rhLo, lhLo2:t.lhLo, rhOff2:t.rhOff||0, lhOff2:t.lhOff||0}); state.mix=state.mix||{}; state.mix.arp2=state.mix[t.id]||{v:1,m:false,s:false}; delete state.mix[t.id]; state.tk=state.tk||{}; state.tk.arp2={name:t.name,color:t.color}; } else state.arp2=''; }
  else if(kind==='bass') state.bass=false;
  TRK_SEL=null; applyMix(); save(); renderAll(); renderTracks(); }
// パターンを直接編集する。いつもの伴奏（組み込みのパターン）は、自分用のコピーを作って開き、何も変えずに閉じたらコピーを消して元に戻す
let PAT_TMP=null;
function editTrackPattern(kind){ const k=patOf(kind);
  if((kind==='arp2'||xOf(kind)) && (!k || !ARPS[k])) return openSheet(kind);
  const wasMy=/^my\d+$/.test(k||''), nm=tkPatName(kind);
  openPatEditor(kind,'edit');
  PAT_TMP = wasMy ? null : {kind, prev:k, list:listOf(kind), snap:JSON.stringify(curMy())};
  $('patDirect').hidden=false; $('patDirectNote').textContent = wasMy ? '' : '「'+nm+'」と同じ鳴り方のコピーです。変えると自分用のパターンとして残ります';
}
$('patPick').onclick=()=>{ const kind=patKind; closePatTmp(); closeAll(); openSheet(kind); };
// 編集画面を閉じたとき：コピーに何も変えていなければ、コピーを消して元のパターンに戻す
function closePatTmp(){ const T=PAT_TMP; PAT_TMP=null; $('patDirect').hidden=true; if(!T) return;
  const i=T.list.length-1, m=T.list[i]; if(m && JSON.stringify(m)===T.snap && patOf(T.kind)==='my'+i){ T.list.pop(); setPatOf(T.kind,T.prev); rebuildMy(); save(); renderAll(); } renderTracks(); }
new MutationObserver(()=>{ if(!$('patSheet').classList.contains('on') && (PAT_TMP || !$('patDirect').hidden)) closePatTmp(); }).observe($('patSheet'),{attributes:true,attributeFilter:['class']});
// メイン画面：PRO では伴奏の帯をタップするとトラックの画面
$('arpLane').onclick=()=>state.pro?openTracks():openSheet('arp');
$('drumLane').onclick=()=>state.pro?openTracks():openSheet('drum');
// シートで選び直したら、トラックの画面も描き直す
['sheet','edSheet','patSheet'].forEach(id=>new MutationObserver(()=>{ if(!$(id).classList.contains('on')) renderTracks(); }).observe($(id),{attributes:true,attributeFilter:['class']}));
// 右上の「Key」「楽器」の表示は、押すとそれを変える場所が開く
$('keyBadge').onclick=()=>{ $('menuBtn').click(); setTimeout(()=>$('keyChips').scrollIntoView({block:'center',behavior:'smooth'}),60); };
$('instBadge').onclick=()=>{ if(!$('arpLane').hidden) $('arpLane').click(); };
