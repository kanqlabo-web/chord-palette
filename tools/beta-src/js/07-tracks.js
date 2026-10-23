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

// ---- 画面（部品とスタイルは、このファイルの中で作る） ----
(function(){
  const css=`
#trk{position:fixed;inset:0;z-index:35;background:var(--bg);overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
#trk .tin{max-width:680px;margin:0 auto;padding:0 16px calc(32px + env(safe-area-inset-bottom,0px))}
#trk .thead{display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:3;background:var(--bg);margin:0 -16px 6px;padding:max(14px,env(safe-area-inset-top,0px)) 16px 10px}
#trk .thead h2{font-family:var(--display);font-weight:900;font-size:1.25rem;margin:0}
#trk .tnote{font-size:.78rem;color:var(--muted);margin:0 0 10px;line-height:1.6}
.trow{position:relative;background:var(--surface);border:1px solid var(--line);border-radius:14px;margin-bottom:10px;overflow:hidden;touch-action:pan-y}
.trow .tbar{position:absolute;left:0;top:0;bottom:0;width:6px}
.trow .tmain{padding:10px 12px 10px 16px;display:flex;flex-direction:column;gap:6px;transition:transform .18s}
.trow .ttop{display:flex;align-items:center;gap:8px;min-width:0}
.trow .tname{font-family:var(--display);font-weight:900;font-size:1rem;border:0;background:none;padding:0;cursor:pointer;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.trow .tinst{font-size:.78rem;color:var(--muted);border:0;background:none;padding:0;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;text-decoration:underline dotted;text-underline-offset:3px}
.trow .tsp{flex:1}
.trow .tms{width:30px;height:28px;border-radius:8px;border:1.5px solid var(--line);background:var(--surface);font-weight:700;font-size:.78rem;cursor:pointer;flex:none}
.trow .tms[aria-pressed=true]{background:var(--ink);color:#fff;border-color:var(--ink)}
.trow .tknob{width:30px;height:28px;border-radius:8px;border:0;background:none;cursor:pointer;color:var(--muted);flex:none;display:grid;place-items:center}
.trow .tpat{display:flex;align-items:center;gap:8px;border:1.5px solid var(--line);background:var(--bg);border-radius:10px;padding:6px 8px;cursor:pointer;text-align:left;width:100%}
.trow .tpat canvas{width:42%;height:22px;flex:none;border-radius:6px}
.trow .tpat span{font-size:.8rem;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
.trow .tpat svg{flex:none;color:var(--muted)}
.trow.silent .tpat canvas{opacity:.35}
.trow .tctl{display:none;padding:2px 12px 12px 16px;gap:8px;flex-direction:column}
.trow.open .tctl{display:flex}
.tctl label{display:grid;grid-template-columns:4.5em 1fr 3.2em;align-items:center;gap:8px;font-size:.78rem;color:var(--muted)}
.tctl input[type=range]{width:100%;accent-color:var(--ink)}
.tctl output{text-align:right;font-variant-numeric:tabular-nums;color:var(--ink)}
.tctl .tbtns{display:flex;gap:6px;flex-wrap:wrap}
.tcolors{display:flex;gap:6px;flex-wrap:wrap}
.tcolors button{width:26px;height:26px;border-radius:50%;border:2px solid transparent;cursor:pointer}
.tcolors button[aria-pressed=true]{border-color:var(--ink)}
#trk .tadd{width:100%;padding:12px;border-radius:14px;border:1.5px dashed var(--line);background:none;font-weight:700;cursor:pointer;color:var(--ink)}
#trk details{margin-top:16px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px 12px}
#trk details summary{font-weight:700;font-size:.88rem;cursor:pointer}
#trk .tstyles{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
body.pro #arp2Lane,body.pro #bassLane{display:none}
body.pro .mix{display:none}
body.pro #drumLane .lanehead{display:none}
body.pro #drumLane{margin-top:-6px}
body.pro .lane canvas{height:28px}
body.pro #sheet .proedit{display:none!important}
#patSheet .pdirect{display:flex;gap:6px;align-items:center;margin:-4px 0 10px;flex-wrap:wrap}
#patSheet .pdirect small{color:var(--muted);font-size:.74rem;flex:1;min-width:12em}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  const el=document.createElement('div'); el.id='trk'; el.hidden=true; el.setAttribute('role','dialog'); el.setAttribute('aria-label','トラック');
  el.innerHTML=`<div class="tin"><div class="thead"><h2>トラック</h2><button class="iconbtn" id="trkClose" aria-label="閉じる"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>
    <p class="tnote">パターンをタップすると、そのまま編集できます（いつもの伴奏は、さわったときだけ自分用のコピーになります）。楽器の名前をタップすると名前と色、行を左へスワイプすると音量・左右・響きを変えられます。</p>
    <div id="trkList"></div>
    <button class="tadd" id="trkAdd">＋ 楽器を足す</button>
    <details id="trkStyleBox"><summary>伴奏スタイルから作り直す</summary><p class="tnote" style="margin:8px 0 0">選んだスタイルと同じ鳴り方のトラックに置きかえます（いまのトラックはなくなります）。</p><div class="tstyles" id="trkStyles"></div></details>
  </div>`;
  document.body.appendChild(el);
  // 編集画面の上に「別のパターンを選ぶ」
  const pd=document.createElement('div'); pd.className='pdirect'; pd.id='patDirect'; pd.hidden=true;
  pd.innerHTML=`<button class="chip" id="patPick">別のパターンを選ぶ</button><small id="patDirectNote"></small>`;
  const ps=$('patSheet'); ps.insertBefore(pd, ps.children[1]);
})();
const trk=$('trk');
function openTracks(){ trk.hidden=false; renderTracks(); }
$('trkClose').onclick=()=>{ trk.hidden=true; renderAll(); };

const ICO_KNOB='<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 5h12M3 13h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="7" cy="5" r="2" fill="var(--surface)" stroke="currentColor" stroke-width="1.6"/><circle cx="11.5" cy="13" r="2" fill="var(--surface)" stroke="currentColor" stroke-width="1.6"/></svg>';
const ICO_PEN='<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2 12l1-3.2L9.6 2.2a1.2 1.2 0 0 1 1.7 0l.5.5a1.2 1.2 0 0 1 0 1.7L5.2 11z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
let TRK_OPEN=null;   // 音量などを開いている行
function renderTracks(){ if(trk.hidden) return; const box=$('trkList'); box.innerHTML='';
  const L=trackList(), pro=!!state.pro, solo=L.some(t=>mixOf(mixKey(t.kind)).s);
  L.forEach(({kind})=>{ const mk=mixKey(kind), x=mixOf(mk), row=document.createElement('div'); row.className='trow'+(TRK_OPEN===kind?' open':'');
    row.classList.toggle('silent', solo?!x.s:x.m);
    const pan=x.pan||0, rev=x.rev||0, canDel=kind==='arp2'||kind.startsWith('x:')||kind==='bass';
    row.innerHTML=`<i class="tbar" style="background:${tkColor(kind)}"></i><div class="tmain">
      <div class="ttop"><button class="tname">${esc(tkName(kind))}</button><button class="tinst">${esc(tkInst(kind))}</button><span class="tsp"></span>
        <button class="tms" data-k="m" aria-pressed="${!!x.m}" aria-label="ミュート">M</button><button class="tms" data-k="s" aria-pressed="${!!x.s}" aria-label="ソロ">S</button><button class="tknob" aria-label="音量・左右・響き">${ICO_KNOB}</button></div>
      <button class="tpat"><canvas></canvas><span>${esc(tkPatName(kind))}</span>${ICO_PEN}</button></div>
      <div class="tctl">
        <label>音量<input type="range" min="0" max="1.5" step=".01" value="${x.v??1}" data-f="v"><output>${Math.round((x.v??1)*100)}</output></label>
        <label>左右<input type="range" min="-1" max="1" step=".05" value="${pan}" data-f="pan"><output>${panTxt(pan)}</output></label>
        <label>響き<input type="range" min="0" max="1" step=".05" value="${rev}" data-f="rev"><output>${Math.round(rev*100)}</output></label>
        <div class="tbtns"><button class="chip" data-a="pick">パターン・音色・音域を選ぶ</button>${canDel?'<button class="chip" data-a="del">この楽器をなくす</button>':''}</div>
      </div>`;
    box.appendChild(row);
    // 名前と色
    row.querySelector('.tname').onclick=()=>renameTrack(kind);
    row.querySelector('.tinst').onclick=()=>openSheet(kind);
    row.querySelector('[data-a="pick"]').onclick=()=>openSheet(kind);
    const del=row.querySelector('[data-a="del"]'); if(del) del.onclick=()=>{ if(!del.dataset.armed){ del.dataset.armed='1'; del.textContent='もう一度押すとなくします'; return; } removeTrack(kind); };
    row.querySelectorAll('.tms').forEach(b=>b.onclick=()=>{ x[b.dataset.k]=!x[b.dataset.k]; applyMix(); save(); renderTracks(); });
    row.querySelector('.tknob').onclick=()=>{ TRK_OPEN=TRK_OPEN===kind?null:kind; renderTracks(); };
    row.querySelectorAll('.tctl input').forEach(inp=>inp.oninput=()=>{ const f=inp.dataset.f; x[f]=+inp.value; inp.nextElementSibling.textContent= f==='pan'?panTxt(x.pan):Math.round(x[f]*100); applyMix(); save(); });
    row.querySelector('.tpat').onclick=()=>editTrackPattern(kind);
    swipeRow(row,kind);
    requestAnimationFrame(()=>{ const cv=row.querySelector('canvas'); if(!cv.clientWidth) return; const g=fit(cv), col=colors(), c=tkColor(kind);
      if(kind==='drum') drawDrumBar(g,0,0,cv.width,cv.height,DRUMS[state.drum],col);
      else if(kind==='bass') drawBassBar(g,0,0,cv.width,cv.height,bassList(DRUMS[state.drum])||[],c,col);
      else { const a=ARPS[patOf(kind)]; if(a) drawArpBar(g,0,0,cv.width,cv.height,a,c,col); } }); });
  const add=$('trkAdd'); add.onclick=addTrack;
  const sb=$('trkStyles'); sb.innerHTML=''; STYLES.forEach(st=>{ const b=document.createElement('button'); b.className='chip'; b.textContent=st.name;
    b.onclick=()=>{ if(!b.dataset.armed){ sb.querySelectorAll('[data-armed]').forEach(o=>{ delete o.dataset.armed; o.textContent=o.dataset.n; }); b.dataset.n=st.name; b.dataset.armed='1'; b.textContent=st.name+'（もう一度押すと置きかえ）'; return; }
      proFromStyle(st); if(st.bpm){ state.bpm=st.bpm; $('bpm').value=state.bpm; $('bpmOut').textContent=state.bpm; } state.tk={}; applyMix(); save(); renderAll(); ensureSounds(); renderTracks(); toast(st.name+'のトラックにしました'); };
    sb.appendChild(b); }); }
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const panTxt=p=>Math.abs(p)<.03?'中':p<0?'左'+Math.round(-p*100):'右'+Math.round(p*100);
// 行を左へスワイプで、音量などを出す（右へで閉じる）
function swipeRow(row,kind){ let sx=null, sy=null, moved=false;
  row.addEventListener('pointerdown',e=>{ if(e.target.closest('input,.tctl')) return; sx=e.clientX; sy=e.clientY; moved=false; });
  row.addEventListener('pointermove',e=>{ if(sx==null) return; const dx=e.clientX-sx, dy=e.clientY-sy; if(Math.abs(dy)>24){ sx=null; return; }
    if(Math.abs(dx)>12){ moved=true; row.querySelector('.tmain').style.transform=`translateX(${Math.max(-40,Math.min(40,dx))*.5}px)`; } });
  const end=e=>{ if(sx==null) return; const dx=e.clientX-sx; row.querySelector('.tmain').style.transform=''; sx=null;
    if(moved && Math.abs(dx)>50){ TRK_OPEN = dx<0 ? kind : (TRK_OPEN===kind?null:TRK_OPEN); renderTracks(); } };
  row.addEventListener('pointerup',end); row.addEventListener('pointercancel',()=>{ sx=null; row.querySelector('.tmain').style.transform=''; });
  // スワイプしたあとのタップは、ボタンを押したことにしない
  row.addEventListener('click',e=>{ if(moved){ e.stopPropagation(); e.preventDefault(); moved=false; } },true); }
// 名前と色を変える（行の中に入力欄を出す）
function renameTrack(kind){ const m=tkMeta(kind); const rows=[...$('trkList').children], i=trackList().findIndex(t=>t.kind===kind), row=rows[i]; if(!row) return;
  const ttop=row.querySelector('.ttop'); ttop.innerHTML=`<input class="pname" maxlength="16" value="${esc(tkName(kind))}" aria-label="楽器の名前" style="flex:1;min-width:0"><button class="chip">決定</button>`;
  const cl=document.createElement('div'); cl.className='tcolors'; TRK_COLORS.forEach(c=>{ const b=document.createElement('button'); b.style.background=c; b.setAttribute('aria-label','色'); b.setAttribute('aria-pressed',tkColor(kind)===c); b.onclick=()=>{ m.color=c; save(); cl.querySelectorAll('button').forEach(o=>o.setAttribute('aria-pressed',o===b)); row.querySelector('.tbar').style.background=c; }; cl.appendChild(b); });
  ttop.after(cl); const inp=ttop.querySelector('input'); inp.focus(); inp.select();
  const done=()=>{ const v=inp.value.trim(); if(v) m.name=v; else delete m.name; save(); renderTracks(); renderAll(); };
  ttop.querySelector('button').onclick=done; inp.onkeydown=e=>{ if(e.key==='Enter') done(); }; }
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
  TRK_OPEN=null; applyMix(); save(); renderAll(); renderTracks(); }
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
new MutationObserver(()=>{ if(!$('sheet').classList.contains('on')) renderTracks(); }).observe($('sheet'),{attributes:true,attributeFilter:['class']});
