// ---------- state ----------
let state={slots:Array(16).fill(null), bars:4, key:'C', label:'num', inst:'piano', arp2:'', inst2:'epiano', kit:'std', drum:'pop', arp:'piano4', bassPat:'auto', bassSnd:'bass', fill:true, wide:true, bass:true, pro:false, guide:true, myDrums:[], myArps:[], ant:Array(16).fill(null), segs:Array.from({length:16},()=>[]), len:4, bpm:96, ver:8};
const DEFAULT_STATE=JSON.parse(JSON.stringify(state));   // リセット用の初期設定
let FIRST_RUN=true;
try{ const s=JSON.parse(localStorage.getItem(STK('chord-palette-v3'))); if(s) FIRST_RUN=false; if(s&&Array.isArray(s.slots)&&s.slots.length===16) state={...state,...s}; if(s&&s.wide===undefined) state.wide=false;   /* 前からある曲は「まん中」のまま */ if(!s.ver||s.ver<6){ state.bass=true; } if(!s.ver||s.ver<7){ state.drum='pop'; state.fill=false; state.ver=7; } if(!s.ver||s.ver<8){ state.fill=true; state.ver=8; }   /* フィルは「入れる」が基本に（2026-10） */ if(!s.ver||s.ver<4){ state.inst='spiano'; state.kit='synth'; } state.inst=fixInst(state.inst); state.inst2=fixInst(state.inst2); if(state.arp2 && !ARPS[state.arp2] && !/^(acc_|my\d)/.test(state.arp2)) state.arp2=''; if(!INSTS[state.inst]) state.inst='piano'; state.kit=fixKit(state.kit); if(!KITS[state.kit]) state.kit='std'; }catch(e){}
if(!Array.isArray(state.segs)) state.segs=Array.from({length:16},(_,i)=>state.split&&state.split[i]?[state.split[i]]:[]);
delete state.split; if(![1,2,4].includes(state.len)) state.len=4;
if(state.myDrum){ state.myDrums=[{name:'マイ演奏1',...state.myDrum}]; if(state.drum==='my') state.drum='my0'; } delete state.myDrum;
if(state.myArp){ state.myArps=[{name:'マイ演奏1',...state.myArp}]; if(state.arp==='my') state.arp='my0'; } delete state.myArp;
rebuildMy();
if(ARP_ALIAS[state.arp]) state.arp=ARP_ALIAS[state.arp]; if(!DRUMS[state.drum]) state.drum='pop'; if(!ARPS[state.arp]) state.arp='piano4'; migrateLay(state); ensureArp2(); if(state.arp2&&!ARPS[state.arp2]) state.arp2=ARP_ALIAS[state.arp2]||''; if(!INSTS[state.inst2]) state.inst2='epiano'; if(!BASSES[state.bassPat]) state.bassPat='auto'; state.bassSnd=fixBass(state.bassSnd); if(!BASS_SNDS[state.bassSnd]) state.bassSnd='bass';
// ---- レベル（ステップモード）：クリアしたレベルの数。前から使っている人は全部クリア扱い
const LV_KEY=STK('chord-palette-level'), MODE_KEY=STK('chord-palette-mode'), LV_MAX=9;
let LVL=(()=>{ try{ const v=localStorage.getItem(LV_KEY); if(v!==null) return +v||0; }catch(e){} return FIRST_RUN?0:LV_MAX; })();
// モード：'step'＝ステップモード（レベルをクリアするたびに機能が増える）／'free'＝フリーモード（最初から全部）
let MODE=(()=>{ try{ const v=localStorage.getItem(MODE_KEY); if(v) return v; }catch(e){} return FIRST_RUN?'step':'free'; })();
let SHARE_VIEW=false;   // 共有リンクから開いたときは、その人のレベルに関係なく全部の機能を使える（保存はしない）
const UL=()=>(MODE==='free'||SHARE_VIEW)?LV_MAX:LVL;                                                     // いま使える範囲
const ULx=()=>Math.max(UL(), (typeof TUT!=='undefined'&&TUT.on&&TUT.lvNow)||0);             // レベルの解説中は、そのレベルの機能も使える
const saveLv=()=>{ try{ localStorage.setItem(LV_KEY,LVL); localStorage.setItem(MODE_KEY,MODE); }catch(e){} };
const save=()=>{ try{ localStorage.setItem(STK('chord-palette-v3'), JSON.stringify(state)); }catch(e){} clearTimeout(HIST.t); HIST.t=setTimeout(histCommit,350); };
// ---- 元に戻す／やり直す：変更が落ち着いたところ（0.35秒）で、そのときの状態を記録する。チュートリアル中は記録しない
const HIST={undo:[],redo:[],cur:null,t:null};
function histCommit(){ if(typeof TUT!=='undefined' && TUT.on) return; const s=JSON.stringify(state);
  if(HIST.cur===null||s===HIST.cur){ HIST.cur=s; return; }
  HIST.undo.push(HIST.cur); if(HIST.undo.length>100) HIST.undo.shift(); HIST.redo=[]; HIST.cur=s; histBtns(); }
function histReset(){ clearTimeout(HIST.t); HIST.cur=JSON.stringify(state); histBtns(); }
function histBtns(){ const on=typeof TUT==='undefined'||!TUT.on;
  [['undoBtn',HIST.undo],['patUndo',HIST.undo],['redoBtn',HIST.redo],['patRedo',HIST.redo]].forEach(([id,a])=>{ const b=document.getElementById(id); if(b) b.disabled=!on||!a.length; }); }
function histGo(dir){
  clearTimeout(HIST.t); histCommit();
  const from=dir<0?HIST.undo:HIST.redo, to=dir<0?HIST.redo:HIST.undo; if(!from.length) return;
  to.push(HIST.cur); HIST.cur=from.pop();
  state=JSON.parse(HIST.cur); rebuildMy(); document.body.classList.toggle('pro',!!state.pro);
  $('bpm').value=state.bpm; $('bpmOut').textContent=state.bpm; if(page*4>=state.bars) page=0; selected=null;
  if($('patSheet').classList.contains('on')){ if(/^my\d+$/.test(patOf(patKind)||'') && curMy()) renderPatEditor(); else closeAll(); }
  if($('edSheet').classList.contains('on')){ if(edIndex<state.bars) renderEditor(true); else closeAll(); }
  if($('varSheet').classList.contains('on')) closeAll();
  renderAll(); ensureSounds(); clearTimeout(HIST.t); try{ localStorage.setItem(STK('chord-palette-v3'), HIST.cur); }catch(e){}
  histBtns(); toast(dir<0?'元に戻しました':'やり直しました'); }
let selected=null, page=0;

// ---------- elements ----------
const $=id=>document.getElementById(id);
const app=$('app'), palette=$('palette'), slotsEl=$('slots');

for(let d=0;d<7;d++){
  const el=document.createElement('div');
  el.className=`tile ${DEG[d].fn}`; el.dataset.deg=d; el.tabIndex=0; el.setAttribute('role','button');
  const fl = d===2 ? '<b style="color:var(--d)">D</b>/<b style="color:var(--t)">T</b>' : d===5 ? 'T<small>(S)</small>' : d===6 ? 'D<small>(S)</small>' : DEG[d].fn;   // ( ) は、ときどきその役割にもなる
  if(d===2) el.classList.add('dual');
  el.innerHTML=`<span class="deg"></span><span class="fn">${fl}</span><span class="name"></span>`;
  palette.appendChild(el);
}
palette.insertAdjacentHTML('beforeend',
  '<div class="leg legL" aria-hidden="true"><span class="T"><b>T</b>安定する</span><span class="S"><b>S</b>広がる</span><span class="D lvonly"><b>D</b>緊張する</span><span class="D lvonly"><b>→</b>Tへ戻りたい</span></div>'+
  '<button class="lvbig" id="lvBig" hidden><small>NEXT</small><b id="lvBigT">LEVEL 2</b><span id="lvBigN"></span></button>'+
  '<div class="leg legR" aria-hidden="true"><span class="D"><b>D</b>緊張する</span><span class="D"><b>→</b>Tへ戻りたい</span></div>');

for(let i=0;i<4;i++){
  const el=document.createElement('div'); el.className='slot'; el.dataset.abs=i;
  el.innerHTML=`<span class="num"></span><button class="x"></button><span class="n"></span><span class="dg"></span><span class="rl"></span>`;
  el.querySelector('.x').textContent='×';
  slotsEl.appendChild(el);
}
const pagesEl=$('pages');
function renderPages(){
  pagesEl.hidden = state.bars===4;
  pagesEl.classList.toggle('b16', state.bars===16);
  const n=state.bars/4;
  if(pagesEl.children.length!==n){
    pagesEl.innerHTML='';
    for(let p=0;p<n;p++){
      const b=document.createElement('button'); b.className='page'; b.dataset.page=p;
      b.setAttribute('aria-label', `${p*4+1}〜${p*4+4}小節を編集`);
      b.innerHTML='<i></i><i></i><i></i><i></i>';
      b.onclick=()=>{ page=p; renderSlots(); };
      pagesEl.appendChild(b);
    }
  }
  [...pagesEl.children].forEach((b,p)=>{
    b.setAttribute('aria-pressed', p===page);
    [...b.children].forEach((c,j)=>{
      const i=p*4+j, d=state.slots[i];
      const cells=cellsOf(i);
      if(cells.length>1){
        // 分割されたマスは、拍の長さに合わせて役割の色だけで表示
        const tot=cells.reduce((t,x)=>t+x.len,0); let acc=0;
        const col=x=>{ if(x.v===null||x.v===undefined) return 'var(--lane)'; const r=roleAt(i,x.h,x.v); return r==='X'?'color-mix(in srgb,var(--muted) 28%,var(--surface))':`color-mix(in srgb,var(--${r.toLowerCase()}) 28%,var(--surface))`; };
        const stops=cells.map((x,k)=>{ const a0=acc/tot*100; acc+=x.len; const a1=acc/tot*100;
          return `${col(x)} ${a0}% calc(${a1}% - ${k<cells.length-1?1:0}px)${k<cells.length-1?`,var(--surface) calc(${a1}% - 1px) ${a1}%`:''}`; }).join(',');
        c.className='split'; c.innerHTML=''; c.style.background=`linear-gradient(90deg,${stops})`;
      } else {
        c.style.background='';
        c.className = d!==null&&d!==undefined ? roleAt(i,0,d) : '';
        c.innerHTML = d!==null&&d!==undefined ? plainLabel(d) : '';
      }
      c.classList.toggle('now', playing&&cur&&cur.b===i);
    });
  });
}

function renderTiles(){
  palette.querySelectorAll('.tile').forEach(t=>{
    const d=+t.dataset.deg;
    t.querySelector('.name').innerHTML=bigHTML(d);
    t.querySelector('.deg').innerHTML=smallHTML(d);
    t.setAttribute('aria-label', `${chordText(d)}（${DEG[d].deg}）`);
    t.classList.toggle('sel', selected===d);
  });
}
// PRO：1小節の中で拍ごとにコードを変える。state.segs[i] = [{beat:2〜4, v:コード}, …]
// PROの拍切り替えは、1マスの長さ（4拍・2拍）の中だけで使う（1拍のマスは分けない）
let LIB_PREVIEW=false;   // コード一覧の試し聴き中は、レベルに関係なく1小節の途中の切り替えも鳴らす
const splitOK=()=>state.pro || ULx()>=9 || LIB_PREVIEW;
const segsOf=i=>splitOK() ? (state.segs[i]||[]).filter(x=>x&&x.v!==null&&x.v!==undefined&&x.beat<=(state.len||4)).sort((a,b)=>a.beat-b.beat) : [];
const slotSteps=()=>(state.len||4)*4;           // 1マスの長さ（16分音符の数）
function cellsOf(i){
  const L=slotSteps(), out=[{h:0,off:0,v:state.slots[i]}];
  segsOf(i).forEach((x,k)=>out.push({h:k+1,off:(x.beat-1)*4,v:x.v,beat:x.beat}));
  out.forEach((c,k)=>c.len=(out[k+1]?out[k+1].off:L)-c.off);
  return out;
}
const getV=(i,h)=>h? (segsOf(i)[h-1]||{}).v ?? null : state.slots[i];
function setV(i,h,v){
  if(!h){ state.slots[i]=v; return; }
  const sg=segsOf(i)[h-1];
  if(sg) sg.v=v; else { state.segs[i]=state.segs[i]||[]; state.segs[i].push({beat:3,v}); }
}
function renderSlots(){
  if(page*4>=state.bars) page=0;
  computeRoles();
  [...slotsEl.children].forEach((el,j)=>{
    const i=page*4+j; el.dataset.abs=i;
    el.querySelector('.num').textContent = (i+1) + (state.slots[i]!=null && antOf(i) ? ' '+shiftMark(antOf(i)) : '');
    el.querySelector('.x').setAttribute('aria-label',`${i+1}小節目を空にする`);
    el.classList.toggle('now', playing&&cur&&cur.b===i);
    const d=state.slots[i];
    el.classList.remove('T','S','D','X','filled');
    el.classList.toggle('ready', selected!==null);
    const cells=cellsOf(i), split=cells.length>1;
    el.classList.toggle('split', split);
    if(split){
      // マスを拍の長さで分割して、それぞれを1つのマスのように表示
      el.classList.add('filled');
      el.querySelector('.n').innerHTML=cells.map(c=>{ const e=c.v===null||c.v===undefined;
        const r=e?'':roleAt(i,c.h,c.v);
        return `<span class="cell ${r}" data-h="${c.h}" style="flex:${c.len}"><b>${e?'空き':bigHTML(c.v)}</b><small>${e?'':smallHTML(c.v)}</small><i>${c.h&&shiftOf(i,c.h)>0?'←':''}${c.off/4+1}拍${c.h&&shiftOf(i,c.h)<0?'→':''}${r&&r!=='X'?`<b>${r}</b>`:''}</i></span>`; }).join('');
      el.querySelector('.dg').textContent='';
    } else if(d!==null && d!==undefined){
      const r=roleAt(i,0,d); el.classList.add('filled', r);
      el.querySelector('.n').innerHTML=bigHTML(d); el.querySelector('.dg').innerHTML=smallHTML(d);
      el.querySelector('.rl').textContent = r==='X'?'':r;
    } else { el.querySelector('.n').innerHTML='<span class="empty">空き</span>'; el.querySelector('.dg').textContent=''; }
  });
  const pl=progLabel();
  $('progName').textContent = pl || (MINOR ? `${noteName(9)}m中心（短調）` : '');
  $('hint').textContent = selected!==null ? `${chordText(selected)} を置くマスをタップ`
    : splitOK() && state.len>1 && state.bars===4 && (state.pro || state.slots.slice(0,4).every(v=>v!=null)) ? `${state.len<4?`1マス＝${state.len}拍 ・ `:''}マスの右側に置くと${state.len/2+1}拍目から`
    : state.len<4 ? `1マス＝${state.len}拍 ・ ${state.bars>4?`${page*4+1}〜${page*4+4}マス目`:'コードをマスへドラッグ'}`
    : state.bars===4 ? (!state.pro && ULx()>=6 && state.slots.slice(0,4).every(v=>v!=null) ? '置いたコードをタップすると響きを変えられます' : '4小節 ・ コードをマスへドラッグ') : `${state.bars}小節中 ${page*4+1}〜${page*4+4}小節目を編集中`;
  const gOn = state.guide && ULx()>=2;
  const gi = gOn ? guideInfo() : {text:'',warn:new Set(),groups:[]};
  document.body.classList.toggle('guide', gOn);
  if(gOn && selected===null && gi.text) $('hint').textContent = gi.text;
  $('hint').classList.toggle('guide', !!(gOn && gi.text));
  $('hint').classList.toggle('warn', !!(gOn && selected===null && gi.text && gi.text.startsWith('！')));
  [...slotsEl.children].forEach(el=>{ const i=+el.dataset.abs; el.classList.toggle('warn', [...gi.warn].some(k=>k.startsWith(i+':'))); });
  LAST_GI=gi; requestAnimationFrame(()=>drawGuide(LAST_GI));
  renderPages(); save(); dirty=true;
}
// 進行ガイド：役割の流れと、T→D→T / T→S→T / T→S→D→T に当てはまるかを表示
const FLOW_NAME={TDT:'①T→D→T',TST:'②T→S→T',TSDT:'③T→S→D→T'};
// 役割の流れを、T から次の T までのまとまり（流れ）に分ける。同じ役割が続くのはまとめて判定
function flowGroups(){
  const idx=FLOW.map((f,n)=>n).filter(n=>FLOW[n].r!=='X'), L=idx.length;
  if(L<2) return {groups:[],noT:false,warn:new Set()};
  const warn=new Set();
  idx.forEach((n,j)=>{ const nx=idx[(j+1)%L]; if(FLOW[n].r==='D'&&FLOW[nx].r==='S' && !(isSecDom(FLOW[n].v)&&!SECW.has(FLOW[n].k))) warn.add(FLOW[nx].k); });   // 4つ目へ正しく進んだときは D→S でもOK
  SECW.forEach((_,k)=>warn.add(k));
  const tpos=idx.map((n,j)=>FLOW[n].r==='T'?j:-1).filter(j=>j>=0);
  if(!tpos.length) return {groups:[],noT:true,warn};
  const groups=tpos.map((a,g)=>{ const b=tpos[(g+1)%tpos.length]; const len=((b-a+L)%L)||L;
    const ns=[]; for(let q=0;q<=len;q++) ns.push(idx[(a+q)%L]);
    const rs=ns.map(n=>FLOW[n].r), col=rs.filter((r,q)=>q===0||r!==rs[q-1]).join('');
    const bad=ns.some(n=>warn.has(FLOW[n].k));
    const name=bad?null:(FLOW_NAME[col]||(col==='T'?'Tが続く':null));
    return {ns,name,bad}; });
  return {groups,noT:false,warn};
}
function guideInfo(){
  const g=flowGroups();
  if(!g.groups.length && !g.noT) return {text:'',warn:g.warn,groups:[]};
  const sw=[...SECW.values()][0], toName=sw?(STEPS.includes(sw.to)?nameOf(STEPS.indexOf(sw.to),state.label,false):noteName(sw.to)):'';
  const text = g.noT ? '！ T を入れると落ち着きます' : sw ? `！ ${nameOf(sw.v,state.label,false)} は、4つ目の ${toName} へ進むと自然` : g.warn.size ? '！ D の次は T へ進むと安定' : g.groups.every(x=>x.name) ? '◎ お手本どおりの流れ' : '！ お手本にない流れがあります';
  return {text,warn:g.warn,groups:g.groups};
}
const FLOW_COL={'①':'var(--d)','②':'var(--s)','③':'var(--ink)'};
function drawGuide(gi){
  const gs=$('gstrip'); if(!gs) return; gs.innerHTML='';
  if(!state.guide || ULx()<2 || !gi.groups || !gi.groups.length) return;
  const base=gs.getBoundingClientRect(); if(!base.width) return;
  const elOf=n=>{ const [i,h]=FLOW[n].k.split(':').map(Number); if(Math.floor(i/4)!==page) return null;
    const sl=slotsEl.children[i%4]; return sl.classList.contains('split') ? sl.querySelector(`.cell[data-h="${h}"]`) : sl; };
  gi.groups.forEach(g=>{
    // 同じページ内で、ループの折り返しをまたがない部分ごとに描く
    const runs=[]; let run=null;
    g.ns.forEach((n,q)=>{ const el=elOf(n);
      if(!el){ run=null; return; }
      if(run && n>run.last) { run.items.push({n,q,el}); run.last=n; }
      else { run={items:[{n,q,el}],last:n}; runs.push(run); } });
    const last=g.ns.length-1; const made=[];
    runs.forEach(r=>{
      const a=r.items[0], b=r.items[r.items.length-1];
      const ra=a.el.getBoundingClientRect(), rb=b.el.getBoundingClientRect();
      const openL=a.q!==0, openR=b.q!==last;
      let x0=openL? (a.q===0?ra.left:ra.left-6) : ra.left+ra.width/2, x1=openR? rb.right : rb.left+rb.width/2;
      if(openL && r.items[0]===a && ra.left-base.left<8) x0=base.left;
      if(openR && rb.right>base.right-8) x1=base.right;
      x0-=base.left; x1-=base.left; const w=x1-x0; if(w<6) return;
      const sp=document.createElement('span');
      const no=g.name?g.name[0]:'';
      sp.style.cssText=`left:${x0}px;width:${w}px;--fn:${g.bad?'var(--warn)':g.name?(FLOW_COL[no]||'var(--t)'):'var(--muted)'}`;
      if(openL) sp.classList.add('ol'); if(openR) sp.classList.add('or'); if(g.bad) sp.classList.add('bad');
      const sec=g.ns.some(n=>SECW.has(FLOW[n].k)), full=g.bad?(sec?'4つ目へ':'D→S'):g.name?g.name:'？', short=g.bad?'!':g.name?(FLOW_COL[no]?no:'T続く'):'？';
      sp.dataset.full=full; sp.dataset.short=short; sp.dataset.w=w;
      gs.appendChild(sp); made.push(sp); });
    // 1つの流れにつき、いちばん長い部分にだけ名前を書く
    const big=made.reduce((m,x)=>!m||+x.dataset.w>+m.dataset.w?x:m,null);
    if(big){ const w=+big.dataset.w, f=big.dataset.full, sh=big.dataset.short; big.textContent = w>f.length*9+10 ? f : w>sh.length*9+4 ? sh : ''; }
  });
}
let LAST_GI=null; addEventListener('resize',()=>{ if(LAST_GI) drawGuide(LAST_GI); });
function renderAll(){
  renderTiles(); renderSlots();
  $('keyBadge').textContent='Key '+state.key;
  $('instBadge').textContent=instShort()+(loadingNow()?' 読込中…':'');
  $('drumName').textContent=patName(DRUMS[state.drum])+' ・ '+KITS[state.kit];
  $('arp2Name').textContent = state.arp2&&ARPS[state.arp2] ? patName(ARPS[state.arp2])+' ・ '+INSTS[state.inst2||'epiano'] : 'なし（タップで重ねる楽器を追加）';
  // PRO：伴奏の帯は1行にまとめ、タップでトラックの画面を開く
  if(state.pro){ $('arpLabel').textContent='トラック'; $('arpName').textContent=typeof trackSummary==='function'?trackSummary():patName(ARPS[state.arp]); $('arpLane').setAttribute('aria-label','トラックを開く');
    if(typeof renderTracks==='function') renderTracks(); }
  else { const st=styleNow(); $('arpLabel').textContent='伴奏'; $('arpName').textContent=(st?st.name:`${patName(DRUMS[state.drum])}＋${patName(ARPS[state.arp])}`)+' ・ '+instShort(); $('arpLane').setAttribute('aria-label','伴奏スタイルを選ぶ'); }
  $('bassName').textContent=state.bass?BASSES[state.bassPat||'auto'].name:'なし';
  { const libOn=ULx()>=3; $('libBtn').hidden=!libOn; $('libOpen').closest('.sec').hidden=!libOn; }
  const lb=$('lvBig'), showLv=MODE==='step' && LVL<LV_MAX && !TUT.on;
  lb.hidden=!showLv; document.body.classList.toggle('haslv',showLv);
  if(showLv){ const t=`LEVEL ${LVL+1}`; $('lvBigN').textContent=LEVELS[LVL].name;
    if($('lvBigT').textContent!==t){ $('lvBigT').textContent=t; lb.classList.remove('fresh'); void lb.offsetWidth; lb.classList.add('fresh'); }
    lb.setAttribute('aria-label',`次のレベル：レベル${LVL+1}「${LEVELS[LVL].name}」をはじめる`); }
  const hideAcc=ULx()<3; [$('arpLane'),$('drumLane'),$('bpm').closest('.bpm')].forEach(e=>{ e.hidden=false; e.classList.toggle('accOff',hideAcc); });   // レベル3（雰囲気）までは伴奏とBPMを見せない（場所は空けておき、画面の形をそろえる。チュートリアルの吹き出しもここに出る）
  buildMenu(); applyMix();
}

// ---------- drawer ----------
function chips(el, items, cur, onPick){
  el.innerHTML='';
  items.forEach(([v,label])=>{
    if(v==='#'){ const h=document.createElement('span'); h.className='chiphead'; h.textContent=label; el.appendChild(h); return; }   // ジャンルの見出し
    const b=document.createElement('button'); b.className='chip'; b.textContent=label;
    b.setAttribute('aria-pressed', v===cur); b.onclick=()=>onPick(v);
    el.appendChild(b);
  });
}
function buildMenu(){
  $('keyChips').closest('.sec').hidden=UL()<4;
  if(UL()>=4) chips($('keyChips'), KEYS.map(k=>[k.id,k.id]), state.key, v=>{ state.key=v; renderAll(); if(!playing) preview(0); });
  const unit = state.len<4 ? 'マス' : '小節';
  $('barChips').closest('.sec').hidden=UL()<5;
  if(UL()>=5) chips($('barChips'), [[4,'4'+unit],[8,'8'+unit],[16,'16'+unit]], state.bars, v=>{ state.bars=v; if(page*4>=v) page=0; renderAll(); });
  $('lenSec').hidden=UL()<LV_MAX && state.len===4;   // 1マスの長さ・数字の書き方は、全レベルクリアまで出さない（初めての人には要らない）
  chips($('lenChips'), [[4,'4拍（1小節）'],[2,'2拍'],[1,'1拍']], state.len, v=>{ state.len=v; renderAll(); });
  $('lenNote').textContent = '2拍にすると、1マスが半分の長さになります。';
  if(state.label==='roman'){ state.label='num'; state.numStyle='roman'; }   // 前の設定（ローマ数字）からの引き継ぎ
  if(state.label!=='alpha') state.label=numK();
  chips($('labelChips'), [['num','数字'],['alpha','アルファベット']], state.label==='alpha'?'alpha':'num', v=>{ state.label=v==='alpha'?'alpha':numK(); save(); renderAll(); });
  { const adv=UL()<LV_MAX && state.numStyle!=='roman'; $('numChips').hidden=adv; $('numChips').previousElementSibling.hidden=adv; }
  chips($('numChips'), [['arabic','1・2・3（アラビア数字）'],['roman','Ⅰ・Ⅱ・Ⅲ（ローマ数字）']], state.numStyle==='roman'?'roman':'arabic', v=>{ state.numStyle=v; if(state.label!=='alpha') state.label=numK(); save(); renderAll(); });
  $('guideChips').closest('.sec').hidden=UL()<2;
  if(UL()>=2) chips($('guideChips'), [[true,'表示する'],[false,'表示しない']], state.guide, v=>{ state.guide=v; renderAll(); });
  $('proChips').closest('.sec').hidden=UL()<LV_MAX && !state.pro;
  $('accNote').hidden=UL()<3;
  if(!(UL()<LV_MAX && !state.pro)) chips($('proChips'), [[true,'オン'],[false,'オフ']], state.pro, v=>{ state.pro=v; document.body.classList.toggle('pro',v); renderAll(); });
  renderLevels();
}
// 有名な進行の一覧：名前・雰囲気のタグ・数字で絞り込める
// あいまい検索：ひらがな／カタカナ・全角半角をそろえ、似た言葉（悲しい→切ない など）も探す
const kana=t=>t.normalize('NFKC').toLowerCase().replace(/[\u30a1-\u30f6]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)).replace(/[\s・、。「」（）()〜~]/g,'');
const SYN={切ない:['かなしい','悲しい','哀しい','さみしい','寂しい','せつない','泣','メランコリー','暗い','くらい','ブルー','失恋'],
  エモい:['えも','感動','泣ける','エモ','胸','青春','サビ','熱い'],
  明るい:['あかるい','元気','たのしい','楽しい','ハッピー','うれしい','嬉しい','ポップ','陽気','前向き'],
  穏やか:['おだやか','優しい','やさしい','静か','しずか','落ち着','チル','癒','ゆったり','のんびり','ほっこり'],
  おしゃれ:['お洒落','オシャレ','大人','ジャズ','シティ','都会','カフェ','洗練'],
  力強い:['ちからづよい','かっこいい','カッコいい','格好いい','クール','強い','パワフル','激しい'],
  ロック:['ろっく','バンド','ギター','ワル'],
  壮大:['そうだい','映画','雄大','広い','感動的','卒業','エンディング'],
  ドラマチック:['ドラマ','劇的','盛り上が'],
  爽やか:['さわやか','夏','青空','すっきり','スッキリ'],
  レトロ:['懐かしい','なつかしい','昔','古い','オールディーズ','昭和'],
  情熱的:['情熱','スペイン','フラメンコ','ラテン','妖しい','あやしい'],
  不思議:['ふしぎ','変','奇妙','浮遊','ミステリアス','怪しい'],
  定番:['ていばん','王道','よくある','基本','有名','人気']};
const READ={王道:'おうどう',小室:'こむろ',カノン:'かのん',アクシス:'あくしす',循環:'じゅんかん',逆循環:'ぎゃくじゅんかん',丸サ:'まるさ',下降:'かこう',スリーコード:'すりーこーど',
  ツーファイブ:'つーふぁいぶ',サンロク:'さんろく',アンダルシア:'あんだるしあ',サブドミナント:'さぶどみなんと',ロック:'ろっく'};
const near=(a,b)=>{ if(Math.abs(a.length-b.length)>1) return false; let i=0,j=0,e=0; while(i<a.length&&j<b.length){ if(a[i]===b[j]){i++;j++;continue;} if(++e>1) return false; if(a.length>b.length) i++; else if(a.length<b.length) j++; else {i++;j++;} } return e+(a.length-i)+(b.length-j)<=1; };
const subseq=(q,t)=>{ let i=0; for(const c of t){ if(c===q[i]) i++; if(i===q.length) return true; } return false; };
function presetScore(p,query){
  const words=query.split(/[\s,、]+/).map(kana).filter(Boolean); if(!words.length) return 1;
  const degs=(p.q||p.p).map(PDEG).join('-'), reads=Object.entries(READ).filter(([k])=>p.name.includes(k)).map(([,v])=>v).join('');
  const hay=kana(p.name+(p.alias||'')+reads+(p.tags||[]).join('')+degs+degs.replace(/-/g,''));
  const cands=[...(p.tags||[]),p.name,...(p.alias?[p.alias]:[]),...Object.entries(READ).filter(([k])=>p.name.includes(k)).map(([,v])=>v)].map(kana);
  let total=0;
  for(const w of words){
    let sc=0;
    if(hay.includes(w)) sc=3;
    else if((p.tags||[]).some(t=>(SYN[t]||[]).some(x=>{ const k=kana(x); return k.includes(w)||w.includes(k); }))) sc=2;
    else if(w.length>=2 && cands.some(t=>near(w,t)||near(w,t.slice(0,w.length)))) sc=1.5;
    else if(w.length>=3 && subseq(w,hay)) sc=1;
    if(!sc) return 0; total+=sc; }
  return total;
}
const PDEG=t=>typeof t==='number'?DEG[t].num: typeof t==='string'?(({III7:'3(7)',bVII:'♭7',bVI:'♭6',IVm:'4m',Vm:'5m',II7:'2(7)',VI7:'6(7)'})[t]||t) : nameOf(tokSpec(t),'num',false);
// ---------- コード進行ライブラリ（別画面） ----------
const LIB_CATS=[['all','すべて'],['I','1 から始まる'],['IV','4 から始まる'],['VIm','6m から始まる'],['other','そのほか'],['25','ツーファイブ']];
const LIB_TAGS=[...new Set(PRESETS.flatMap(p=>p.tags||[]))];
const LIB={cat:'all',tag:null,playing:null,timers:[],bk:null,stopping:false,endT:null};
const libName=t=>nameOf(tokSpec(t), state.label==='alpha'?'alpha':numK(), false).replace('-5','♭5');
// 試し聴き：いまの伴奏（ドラム・コード・ベース）でその進行を1周演奏して、最初のコードで締める。
// マスの中身は一時的に入れ替えるだけで、止めたら元に戻す（保存もしない）
function libStop(){ LIB.timers.forEach(clearTimeout); LIB.timers=[]; LIB.playing=null; clearTimeout(LIB.endT);
  const bk=LIB.bk; LIB.bk=null; LIB.stopping=false; LIB_PREVIEW=false;
  if(bk){ if(playing) stop(); Object.assign(state,bk); renderPages(); }
  document.querySelectorAll('.libplay.on').forEach(b=>{ b.classList.remove('on'); b.innerHTML=ico('play'); }); }
// 進行をマスに入れる。1マスの長さ（4拍・2拍・1拍）はいまの設定のまま。
// 1マスを半分に割る所（ライブラリでは3拍目）は、2拍のマスなら2拍目から。1拍のマスは割れないので、前半のコードだけにする
function libFill(e){ const L=state.len||4;
  state.bars=e.p.length;
  state.slots=Array.from({length:16},(_,j)=>e.p[j]!==undefined?tokSpec(e.p[j]):null);
  state.segs=Array.from({length:16},(_,j)=>L<2?[]:((e.segs||{})[j]||[]).map(g=>({beat:1+(g.beat-1)*L/4,v:tokSpec(g.v)}))); }
function libPlay(i,btn){ const was=LIB.playing; libStop(); if(was===i) return; if(playing) stop();
  const e=PRESETS[i]; LIB.bk={bars:state.bars,len:state.len,slots:state.slots,segs:state.segs,ant:state.ant};
  libFill(e);
  state.ant=Array(16).fill(null);
  LIB_PREVIEW=true; LIB.playing=i; btn.classList.add('on'); btn.innerHTML=ico('stop'); play(); }
function libUse(i){ const e=PRESETS[i]; libStop(); if(playing) stop();
  libFill(e);
  state.ant=Array(16).fill(null); selected=null; page=0; renderAll(); save(); closeLib(); toast(`「${e.name}」を入れました`); }
// 進行ごとに、使えるようになるレベル（レベル3でライブラリが開き、クリアしたレベルの内容を使う進行が増えていく）
//  3：パレットの7つだけ（4小節） 5：8小節 6：テンション 7：分数コード 8：明るい⇄暗い 9：キーの外・特殊なコード・1小節に2つ
function presetLv(e){ if(e._lv) return e._lv; let lv=3;
  if(e.p.length>4) lv=5;
  if(e.segs && Object.keys(e.segs).length) lv=9;
  (e.q||e.p).forEach(t=>{ const sp=tokSpec(t); if(typeof sp==='number') return; const o=specOf(sp);
    if(o.b!==null&&o.b!==undefined && o.b!==o.o) lv=Math.max(lv,7);
    const g=STEPS.indexOf(o.o); if(g<0){ lv=9; return; }
    const dq=DEG[g].q===''?'maj':DEG[g].q;
    if(o.q===dq){ if(o.x) lv=Math.max(lv,6); }
    else if(/^sus|^5$/.test(o.q)) lv=Math.max(lv,6);
    else if(/^(maj|m|m-5)$/.test(o.q)) lv=Math.max(lv,8);
    else lv=9; });
  return e._lv=lv; }
const libOK=e=>presetLv(e)<=Math.max(3,ULx());
function renderLib(){
  $('libCats').innerHTML=LIB_CATS.map(([k,l])=>`<button data-c="${k}" aria-pressed="${LIB.cat===k}">${l}</button>`).join('');
  $('libCats').querySelectorAll('button').forEach(b=>b.onclick=()=>{ LIB.cat=b.dataset.c; renderLib(); });
  $('libTags').innerHTML=['雰囲気：すべて',...LIB_TAGS].map((t,k)=>`<button data-t="${k?t:''}" aria-pressed="${(LIB.tag||'')===(k?t:'')}">${t}</button>`).join('');
  $('libTags').querySelectorAll('button').forEach(b=>b.onclick=()=>{ LIB.tag=b.dataset.t||null; renderLib(); });
  const q=($('libQ').value||'').trim();
  const hit=PRESETS.map((p,i)=>({p,i,sc:!libOK(p)||(LIB.cat!=='all'&&p.c!==LIB.cat)||(LIB.tag&&!(p.tags||[]).includes(LIB.tag)) ? 0 : presetScore(p,q)})).filter(x=>x.sc>0);
  if(q) hit.sort((a,b)=>b.sc-a.sc||a.i-b.i);
  const row=({p,i})=>`<div class="libitem"><div class="libtx"><b>${p.name}${p.alias?`<em class="libalias">（${p.alias}）</em>`:''}</b><small>${(p.q||p.p).map(libName).join(' → ')}</small><span class="ptags">${(p.tags||[]).map(t=>`<i>${t}</i>`).join('')}</span></div><button class="libplay" data-i="${i}" aria-label="試し聴き">${ico('play')}</button><button class="libuse" data-i="${i}">使う</button></div>`;
  let html='';
  if(q||LIB.cat!=='all') html=hit.map(row).join('');
  else LIB_CATS.slice(1).forEach(([k,l])=>{ const rs=hit.filter(x=>x.p.c===k); if(rs.length) html+=`<h4>${l}（${rs.length}）</h4>`+rs.map(row).join(''); });
  const locked=PRESETS.filter(p=>!libOK(p)), nx=locked.length?Math.min(...locked.map(presetLv)):0;
  if(locked.length) html+=`<p class="small liblock">${ico('lock',13)} あと${locked.length}個の進行は、レベルをクリアすると使えるようになります（次はレベル${nx}で${locked.filter(p=>presetLv(p)===nx).length}個）。</p>`;
  $('libList').innerHTML = html || '<p class="small">見つかりませんでした。ほかの言葉や雰囲気で探してみてください。</p>';
  $('libList').querySelectorAll('.libplay').forEach(b=>b.onclick=()=>libPlay(+b.dataset.i,b));
  $('libList').querySelectorAll('.libuse').forEach(b=>b.onclick=()=>libUse(+b.dataset.i));
}
function openLib(){ closeAll(); $('lib').hidden=false; renderLib(); $('lib').scrollTop=0; }
function closeLib(){ libStop(); $('lib').hidden=true; }
$('libOpen').onclick=openLib; $('libBtn').onclick=openLib; $('libClose').onclick=closeLib; $('libQ').oninput=renderLib;
const scrim=$('scrim'), drawer=$('drawer'), sheet=$('sheet');
function closeAll(){ $('varSheet').classList.remove('on'); drawer.classList.remove('on'); sheet.classList.remove('on'); $('edSheet').classList.remove('on'); $('patSheet').classList.remove('on'); scrim.classList.remove('on'); }

// ---------- PRO：コード編集 ----------
let edIndex=null, edHalf=0, edOrig={};
function openEditor(i,h=0){
  edIndex=i; edHalf=h; edOrig={}; const p0=Math.floor(i/4)*4; for(let k=p0;k<p0+4;k++) edOrig[k]=[state.slots[k], JSON.parse(JSON.stringify(state.segs[k]||[]))];
  $('edSheet').classList.add('on'); scrim.classList.add('on');
  renderEditor(true);
}
const curSpec=()=>{ const v=getV(edIndex,edHalf); return (v===null||v===undefined)?{o:0,q:'maj',x:'',b:null}:{...specOf(v)}; };
function pickField(f,val){
  const sp=curSpec();
  if(f==='o') delete sp.sp;   // ルートを変えたら、つづりの指定（♯・♭）は外す
  if(f==='o' && sp.b!==null && sp.b!==undefined) sp.b=(sp.b+val-sp.o+12)%12;   // ルートを変えてもベースの度数（関係）は保つ
  if(f==='br') sp.b = val===0 ? null : (sp.o+val)%12;                         // ベースはコードのルートから数えた度数
  else sp[f]=val;
  if(sp.q==='5') sp.x='';
  const di=STEPS.indexOf(sp.o);
  const plain = di>=0 && sp.x==='' && (sp.b===null||sp.b===sp.o) && (DEG[di].q===''?'maj':DEG[di].q)===sp.q;
  setV(edIndex, edHalf, plain ? di : {o:sp.o,q:sp.q,x:sp.x,b:(sp.b===sp.o?null:sp.b)});
  renderSlots(); renderEditor(false); preview(getV(edIndex,edHalf));
}
// スロット式ホイール：スクロールが止まった位置の項目をそのまま選ぶ。タップした項目へは自動でスクロール
function wheel(el,items,cur,field){
  const ih=40;
  if(el._key!==items.map(x=>x[1]).join('|')){
    el._key=items.map(x=>x[1]).join('|'); el.innerHTML='';
    items.forEach(([v,label],i)=>{ const b=document.createElement('button'); b.textContent=label; b.tabIndex=-1;
      b.onclick=()=>el.scrollTo({top:i*ih,behavior:'smooth'}); el.appendChild(b); });
    el.onscroll=()=>{
      const i=Math.max(0,Math.min(items.length-1,Math.round(el.scrollTop/ih)));
      [...el.children].forEach((b,k)=>b.classList.toggle('on',k===i));
      clearTimeout(el._t);
      el._t=setTimeout(()=>{ const v=el._items[i][0]; if(v!==el._cur){ el._cur=v; if(typeof el._field==='function') el._field(v); else pickField(el._field,v); } },140);
    };
    el.tabIndex=0;
    el.onkeydown=e=>{ if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); el.scrollBy({top:e.key==='ArrowDown'?ih:-ih,behavior:'smooth'}); } };
  }
  el._items=items; el._field=field;
  const idx=Math.max(0,items.findIndex(x=>x[0]===cur));
  if(el._cur!==cur || Math.round(el.scrollTop/ih)!==idx){ el._cur=cur; el.scrollTop=idx*ih; }
  [...el.children].forEach((b,k)=>b.classList.toggle('on',k===idx));
}
function renderEditor(full){
  const v=getV(edIndex,edHalf), empty=v===null||v===undefined, sp=curSpec();
  $('edTitle').textContent='コードを編集';
  const p0=Math.floor(edIndex/4)*4, tabs=$('edTabs'); tabs.innerHTML='';
  for(let k=p0;k<Math.min(p0+4,state.bars);k++){
    cellsOf(k).forEach(c=>{
      const h=c.h, vk=c.v, ek=vk===null||vk===undefined, t=document.createElement('button');
      t.className='edtab'+(h?' sub':''); t.setAttribute('aria-pressed',k===edIndex&&h===edHalf);
      t.innerHTML=`<small>${h?`${c.beat}拍目〜`:`${k+1}${state.len<4?'マス目':'小節目'}`}</small><b>${ek?'空き':chordText(vk)}</b>`;
      t.onclick=()=>{ edIndex=k; edHalf=h; renderEditor(true); if(!ek) preview(vk); };
      tabs.appendChild(t);
    });
  }
  // コードを変える拍（複数選べる）
  const beatsNow=segsOf(edIndex).map(x=>x.beat), bt=$('edBeat'); bt.innerHTML='';
  bt.closest('.sheetsec').hidden = (state.len||4)<2;
  [[0,'変えない'],[2,'2拍目'],[3,'3拍目'],[4,'4拍目']].filter(([b])=>b<=(state.len||4)).forEach(([b,label])=>{
    const c=document.createElement('button'); c.className='chip'; c.textContent=label;
    c.setAttribute('aria-pressed', b===0 ? beatsNow.length===0 : beatsNow.includes(b));
    c.onclick=()=>{
      const list=state.segs[edIndex]=(state.segs[edIndex]||[]).filter(x=>x&&x.v!=null);
      if(b===0){ state.segs[edIndex]=[]; edHalf=0; }
      else if(beatsNow.includes(b)){ state.segs[edIndex]=list.filter(x=>x.beat!==b); edHalf=0; }
      else { const prev=cellsOf(edIndex).filter(x=>x.off<(b-1)*4).pop(); list.push({beat:b, v:prev&&prev.v!=null?prev.v:(state.slots[edIndex]??0)});
        edHalf=segsOf(edIndex).findIndex(x=>x.beat===b)+1; }
      save(); renderSlots(); renderEditor(true);
    };
    bt.appendChild(c);
  });
  $('edAntSec').hidden = getV(edIndex,edHalf)==null;
  chips($('edAnt'), ANT_CHOICES, shiftOf(edIndex,edHalf), v=>{
    if(edHalf){ const sg=segsOf(edIndex)[edHalf-1]; if(sg) sg.ant=v; }
    else { if(!state.ant) state.ant=Array(16).fill(null); state.ant[edIndex]=v; }
    save(); renderSlots(); renderEditor(false); });
  $('edName').innerHTML=empty?'<span style="font-size:.6em;color:var(--muted)">空き（回すと入ります）</span>':chordHTML(v);
  $('edSub').textContent=empty?'':nameOf(v,'num',false);
  const offs=[...Array(12).keys()];
  wheel($('edRoot'), offs.map(o=>[o,noteName(o)]), sp.o, 'o');
  wheel($('edQual'), QUAL_ORDER.map(q=>[q,QUAL_LABEL[q]]), sp.q, 'q');
  wheel($('edExt'), EXT_ORDER.map(x=>[x,EXT_LABEL[x]]), sp.x, 'x');
  $('edExt').parentNode.classList.toggle('off', sp.q==='5');
  wheel($('edBass'), offs.map(o=>[o,relName(sp,o)]), (sp.b===null||sp.b===undefined)?0:(sp.b-sp.o+12)%12, 'br');
}
$('closeEd').onclick=closeAll;
$('edPlay').onclick=()=>{ const v=getV(edIndex,edHalf); if(v!=null) preview(v); };
$('edReset').onclick=()=>{ const o=edOrig[edIndex]; if(o){ state.slots[edIndex]=o[0]??null; state.segs[edIndex]=JSON.parse(JSON.stringify(o[1])); } if(edHalf>segsOf(edIndex).length) edHalf=0; renderSlots(); renderEditor(true); const v=getV(edIndex,edHalf); if(v!=null) preview(v); };
$('edAll').onclick=()=>openEditor(page*4);
$('menuBtn').onclick=()=>{ drawer.classList.add('on'); scrim.classList.add('on'); };
$('closeDrawer').onclick=closeAll; $('closeSheet').onclick=closeAll; scrim.onclick=closeAll;
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeAll(); });

// ---------- bottom sheet ----------
let sheetKind=null;
function openSheet(kind){
  if(!state.pro && ULx()<3) return;
  if(!state.pro && (kind==='drum'||kind==='arp')) kind='style';   // ビギナーはドラムとコードをまとめて選ぶ
  if(kind==='bass') return openBassSheet();
  sheetKind=kind; document.querySelector('#sheet .proedit').style.display='';
  const X=xOf(kind), p2like=kind==='arp2'||!!X;   // コード2・足した楽器は「なし」も選べる
  $('sheetTitle').textContent = kind==='drum' ? 'ドラム' : kind==='style' ? '伴奏スタイル' : X ? (X.name||'足した楽器') : kind==='arp2' ? '重ねる楽器' : 'コードの演奏';
  $('soundTitle').textContent = kind==='drum' ? 'ドラムの音' : kind==='style' ? 'コードの楽器' : '楽器';
  const soundRow=()=>groupPick($('soundChips'), kind==='drum'?KIT_GROUPS:INST_GROUPS, kind==='drum'?KITS:INSTS, kind==='drum'?state.kit:X?(X.inst||'piano'):kind==='arp2'?(state.inst2||'epiano'):state.inst,
    v=>{ if(X){ X.inst=v; save(); renderAll(); ensureSounds(); } else if(kind==='arp2'){ state.inst2=v; save(); renderAll(); ensureSounds(); } else (kind==='drum'?pickKit:pickInst)(v); soundRow(); renderRange(kind); });   // 楽器を替えたら、標準の音域もその楽器のものに
  soundRow(); $('soundChips').parentElement.hidden=false;
  $('kitSec').hidden = kind!=='style';
  renderRange(kind);
  if(kind==='style'){ const kitRow=()=>groupPick($('kitChips2'), KIT_GROUPS, KITS, state.kit, v=>{ pickKit(v); kitRow(); }); kitRow(); }
  // ビギナー：2つ目の楽器（コード2）を重ねる。弾き方と音色を選ぶ
  $('part2Sec').hidden = kind!=='style';
  if(kind==='style'){
    const P2PATS=[['','なし'],[state.arp,'伴奏と同じ演奏'],['glockline','高い音でキラキラ'],['brassobb','パッと合いの手'],['brasshit','ブラスのキメ'],['anilead','シンセのリード'],['hornline','上がっていくメロディ'],['whole','長くのばす'],['epic','オーケストラ風の和音'],['alberti','ポロンポロン（クラシック風）'],['garp','ギターのつま弾き'],['strum','ギターのジャカジャカ']];
    const P2DEF={glockline:'glock',brassobb:'brass3',brasshit:'brass3',hornline:'horn',anilead:'synth',whole:'strings3',epic:'strings3',alberti:'piano',garp:'nylon',strum:'steel'};
    const p2Row=()=>{ chips($('p2Pat'), P2PATS, state.arp2||'', v=>{ state.arp2=v; if(v) state.inst2=P2DEF[v]||'epiano'; save(); renderAll(); ensureSounds(); p2Row(); });
      $('p2InstWrap').hidden=!state.arp2;
      groupPick($('p2Inst'), INST_GROUPS, INSTS, state.inst2||'epiano', v=>{ state.inst2=v; save(); renderAll(); ensureSounds(); p2Row(); }); };
    p2Row(); }
  $('fillSec').hidden = kind!=='drum' && kind!=='style';
  $('patNewBtn').closest('.proedit').style.display='';
  $('fillChips').previousElementSibling.hidden = $('fillChips').hidden = false;
  const fillRow=()=>chips($('fillChips'), [[true,'入れる'],[false,'入れない']], state.fill, v=>{ state.fill=v; save(); dirty=true; fillRow(); });
  fillRow();
  $('keepSec').hidden = kind!=='style';
  $('wideSec').hidden = kind==='drum';
  if(kind!=='drum'){ const wideRow=()=>chips($('wideChips'),[[false,'まん中'],[true,'左右に広げる']],!!state.wide,v=>{ state.wide=v; save(); wideRow(); if(!playing) preview(selected??(state.slots[page*4]??0)); }); wideRow(); }
  if(kind==='style'){ const keepRow=()=>{ const el=$('keepChips'); el.innerHTML='';
      [['keepInst','楽器をそのまま'],['keepBpm','テンポをそのまま']].forEach(([k,t])=>{ const b=document.createElement('button'); b.className='chip'; b.textContent=t; b.setAttribute('aria-pressed',!!state[k]); b.onclick=()=>{ state[k]=!state[k]; save(); keepRow(); }; el.appendChild(b); }); };
    keepRow(); }
  if(kind==='style'){ const opts=$('opts'); opts.innerHTML=''; const cur=styleNow();
    STYLES.forEach((st,k)=>{ const b=document.createElement('button'); b.className='opt'; b.setAttribute('aria-pressed', st===cur);
      b.innerHTML=`<canvas class="half"></canvas><canvas class="half"></canvas><span>${st.name}</span>`;
      b.onclick=()=>{ const keep={inst:state.inst,arp2:state.arp2,inst2:state.inst2,kit:state.kit,bass:state.bass,bassSnd:state.bassSnd};   // 「音色をそのまま」は2つ目の楽器もそのまま
        setStyle(st); if(state.keepInst) Object.assign(state,keep); else pickInst(st.inst); renderAll(); save();
        if(st.bpm && !state.keepBpm){ state.bpm=st.bpm; $('bpm').value=state.bpm; $('bpmOut').textContent=state.bpm; save(); } closeAll(); };   // ビギナーは伴奏に合ったテンポに自動で変える
      opts.appendChild(b); });
    bassSndRow();
    sheet.classList.add('on'); scrim.classList.add('on');
    requestAnimationFrame(()=>{ const col=colors();
      [...opts.children].forEach((b,i)=>{ const [c1,c2]=b.querySelectorAll('canvas'), st=STYLES[i];
        const g1=fit(c1); drawArpBar(g1,0,0,c1.width,c1.height,ARPS[st.arp],col.t,col);
        const g2=fit(c2); drawDrumBar(g2,0,0,c2.width,c2.height,DRUMS[st.drum],col); }); });
    return; }
  bassSndRow();
  $('patHint').textContent = /^my\d+$/.test(patOf(kind)||'') ? '選んでいるマイ演奏を編集します' : p2like&&!patOf(kind) ? '演奏を選ぶと編集できます' : '選んでいる演奏をコピーして編集します';
  const opts=$('opts'); opts.innerHTML='';
  const order = kind==='drum'?drumOrder():(p2like?['',...arpOrder()]:arpOrder()), src = kind==='drum'?DRUMS:ARPS;
  order.forEach(k=>{
    const b=document.createElement('button'); b.className='opt'; b.setAttribute('aria-pressed', (patOf(kind)||'')===k);
    b.innerHTML=k===''?`<canvas></canvas><span>なし（使わない）</span>`:`<canvas></canvas><span>${patName(src[k])}</span>`;
    b.onclick=()=>{ setPatOf(kind,k); save(); renderAll(); ensureSounds(); if(typeof renderTracks==='function') renderTracks(); openSheet(kind); };   // 決定ボタンで閉じる
    opts.appendChild(b);
  });
  sheet.classList.add('on'); scrim.classList.add('on');
  requestAnimationFrame(()=>{
    const col=colors();
    [...opts.children].forEach((b,i)=>{
      const cv=b.querySelector('canvas'), g=fit(cv), k=order[i];
      if(k==='') return;
      if(kind==='drum'){ if(DRUMS[k]) drawDrumBar(g,0,0,cv.width,cv.height,DRUMS[k],col); }
      else if(ARPS[k]) drawArpBar(g,0,0,cv.width,cv.height,ARPS[k],col.t,col);   // すばやく別のシートに切りかえたときは描かない
    });
  });
}
$('patEditBtn').onclick=()=>openPatEditor(sheetKind,'edit');
$('patNewBtn').onclick=()=>openPatEditor(sheetKind,'new');
$('closePat').onclick=closeAll;
$('patPlay').onclick=()=>playing?stop():play();
$('patNew').onclick=()=>{ newMy(patKind,null); renderPatEditor(); renderAll(); };
$('patDup').onclick=()=>{ newMy(patKind,patOf(patKind)); renderPatEditor(); renderAll(); };
$('patDel').onclick=()=>{ const b=$('patDel');
  if(!b.dataset.armed){ b.dataset.armed='1'; b.textContent='もう一度押すと消します'; return; }
  const list=listOf(patKind); list.splice(+patOf(patKind).slice(2),1); setPatOf(patKind, patKind==='drum'?'pop':patKind==='bass'?'auto':'piano4'); rebuildMy(); save(); renderAll(); closeAll(); };
$('patClear').onclick=()=>{ setCurNotes([]); PR.selSet.clear(); commitNotes(); drawNotes(); };

function bassSndRow(){ chips($('bassSndChips'), [...Object.entries(BASS_SNDS),['none','なし']], state.bass?(state.bassSnd||'bass'):'none', v=>{ if(v==='none'){ state.bass=false; save(); renderAll(); bassSndRow(); return; } state.bass=true; state.bassSnd=v; save(); renderAll(); ensureSounds().then(()=>{ if(!playing) whenRunning(()=>{ const t=ctx.currentTime+.03; [0,7,12].forEach((n,k)=>bassTone(36+n,t+k*.18,.16,.9)); }); }); bassSndRow(); }); }
function renderRange(kind){
  // 音域は楽器ごと：コード／コード2／足した楽器（右手・左手）、ベース（1本）
  $('rangeSec').hidden = !(state.pro && (isArpK(kind) || kind==='bass'));
  const X=xOf(kind), p2=kind==='arp2', isB=kind==='bass', O=X||state;   // 足した楽器は、その楽器の rhLo・lhLo に入れる
  $('rangeTitle').textContent = isB ? 'ベースの音域' : X ? `${X.name||'足した楽器'}の音域` : p2 ? '重ねる楽器の音域' : 'コードの音域';
  $('lhRow').hidden=isB; $('rhLab').textContent = isB ? 'ベース' : '右手';
  if(!$('rangeSec').hidden){
    // 標準（パターンの決まった高さ）＝絶対値に直して表示。古い相対の設定（rhOff など）があれば、それも絶対値に直す
    const io=IOFF(X?(X.inst||'piano'):p2?(state.inst2||'epiano'):state.inst);   // 楽器ごとの標準の音域
    const defOf=k=>{ if(k==='bassLo') return BASS_DEF+(state.bassOff||0); if(/^lh/.test(k)) return LH_DEF+io.lh+((X?X.lhOff:k==='lhLo2'?state.lhOff2:state.lhOff)||0);
      const sv=state.arp; if(X) state.arp=X.arp||sv; else if(k==='rhLo2') state.arp=state.arp2||sv; const d=RH_DEF(); state.arp=sv; return d+io.rh+((X?X.rhOff:k==='rhLo2'?state.rhOff2:state.rhOff)||0); };
    [['rh',isB?'bassLo':X?'rhLo':p2?'rhLo2':'rhLo'],['lh',X?'lhLo':p2?'lhLo2':'lhLo']].forEach(([id,k])=>{
      const lo0=isB?16:id==='lh'?28:40, hi0=isB?60:id==='lh'?72:96, kb=$(id+'Kb'), out=$(id+'Out');
      const draw=()=>{ const lo=O[k]??defOf(k); kb.min=lo0; kb.max=hi0; kb.value=lo; out.textContent=`${midiName(lo)}〜${midiName(lo+11)}`+(O[k]==null?'（標準）':''); };
      kb.oninput=()=>{ O[k]=+kb.value; draw(); save(); dirty=true; if(!playing) preview(selected??(state.slots[page*4]??0)); };
      $(id+'Reset').onclick=()=>{ O[k]=null; draw(); save(); dirty=true; };
      draw(); }); }
}
function openBassSheet(){
  sheetKind='bass'; document.querySelector('#sheet .proedit').style.display=''; $('kitSec').hidden=true; $('part2Sec').hidden=true;
  $('patHint').textContent = /^my\d+$/.test(state.bassPat) ? '選んでいるマイ演奏を編集します' : '選んでいる演奏をコピーして編集します';
  const BASS_ORDER=[...myKeys(BASSES),...Object.keys(BASSES).filter(k=>!/^my\d+$/.test(k))];
  $('sheetTitle').textContent='ベース';
  $('soundChips').parentElement.hidden=true; $('fillSec').hidden=false;
  $('fillChips').previousElementSibling.hidden = $('fillChips').hidden = true;
  bassSndRow(); renderRange('bass');
  const opts=$('opts'); opts.innerHTML='';
  BASS_ORDER.forEach(k=>{ const b=document.createElement('button'); b.className='opt'; b.setAttribute('aria-pressed', (state.bassPat||'auto')===k);
    b.innerHTML=`<canvas></canvas><span>${BASSES[k].name}</span>`;
    b.onclick=()=>{ state.bassPat=k; state.bass=true; renderAll(); dirty=true; openBassSheet(); };
    opts.appendChild(b); });
  sheet.classList.add('on'); scrim.classList.add('on');
  requestAnimationFrame(()=>{ const col=colors();
    [...opts.children].forEach((b,i)=>{ const cv=b.querySelector('canvas'), g=fit(cv), k=BASS_ORDER[i];
      drawBassBar(g,0,0,cv.width,cv.height,BASSES[k].v||DRUMS[state.drum].bass||[],col.d,col); }); });
}
$('bassLane').onclick=()=>openSheet('bass');
document.querySelectorAll('.lane').forEach(l=>l.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); l.click(); } }));
document.querySelectorAll('.mix').forEach(el=>{ const ch=el.dataset.ch;
  ['click','pointerdown'].forEach(t=>el.addEventListener(t,e=>e.stopPropagation()));
  el.querySelectorAll('.mbtn').forEach(b=>b.onclick=e=>{ e.stopPropagation(); const x=mixOf(ch); x[b.dataset.k]=!x[b.dataset.k]; applyMix(); save(); });
  el.querySelector('input').oninput=e=>{ mixOf(ch).v=+e.target.value; applyMix(); save(); }; });
$('drumLane').onclick=()=>openSheet('drum');
$('arpLane').onclick=()=>openSheet('arp');
$('arp2Lane').onclick=e=>{ if(e.target.closest('.mix')) return; openSheet('arp2'); };

function pickInst(v){ state.inst=v; renderAll(); ensureSounds().then(()=>{ if(!playing) preview(selected ?? 0); }); }
function pickKit(v){ state.kit=v; renderAll(); ensureSounds().then(()=>{ if(!playing) previewKit(); }); }

// ---------- BPM / play ----------
const bpmIn=$('bpm'); bpmIn.value=state.bpm; $('bpmOut').textContent=state.bpm;
bpmIn.oninput=()=>{ state.bpm=+bpmIn.value; $('bpmOut').textContent=state.bpm; save(); };
const PLAY_SVG='<svg width="26" height="26" viewBox="0 0 30 30" aria-hidden="true"><path d="M9 5.5v19a1 1 0 0 0 1.5.9l15-9.5a1 1 0 0 0 0-1.7l-15-9.5A1 1 0 0 0 9 5.5z" fill="currentColor"/></svg>';
const STOP_SVG='<svg width="22" height="22" viewBox="0 0 26 26" aria-hidden="true"><rect x="4" y="4" width="18" height="18" rx="3" fill="currentColor"/></svg>';
$('play').innerHTML=PLAY_SVG;

// ---------- drag / tap ----------
let drag=null, lastTap=null;
function begin(e, source){
  drag={source,x0:e.clientX,y0:e.clientY,moving:false,ghost:null,over:null};
  try{ e.target.setPointerCapture(e.pointerId); }catch(_){}
}
palette.addEventListener('pointerdown',e=>{ const t=e.target.closest('.tile'); if(t){ $('coach').classList.add('dragging'); begin(e,{type:'tile',deg:+t.dataset.deg}); } });
// コードをドラッグしている間は、説明の吹き出しを薄くして、下のマスにはめられるようにする
['pointerup','pointercancel'].forEach(ev=>document.addEventListener(ev,()=>$('coach').classList.remove('dragging'),true));
slotsEl.addEventListener('pointerdown',e=>{
  if(e.target.closest('.x')) return;
  const s=e.target.closest('.slot'); if(!s) return;
  const i=+s.dataset.abs; begin(e,{type:'slot',index:i,deg:state.slots[i]});
});
window.addEventListener('pointermove',e=>{
  if(!drag) return;
  if(!drag.moving){
    if(drag.source.deg===null||drag.source.deg===undefined) return;
    if(Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)<8) return;
    drag.moving=true;
    const g=document.createElement('div'); g.className='ghost '+fnOf(drag.source.deg);
    g.innerHTML=`<span class="name">${bigHTML(drag.source.deg)}</span>`;
    document.body.appendChild(g); drag.ghost=g;
  }
  drag.ghost.style.left=e.clientX+'px'; drag.ghost.style.top=e.clientY+'px';
  const hit=document.elementFromPoint(e.clientX,e.clientY);
  // かたまりの上で0.6秒止まったときだけ切り替える（通り過ぎただけでは切り替えない）
  const pg=hit?.closest('.page');
  if(pg!==drag.pg){
    clearTimeout(drag.pgT); if(drag.pg) drag.pg.classList.remove('hover'); drag.pg=pg;
    if(pg && +pg.dataset.page!==page){ pg.classList.add('hover');
      drag.pgT=setTimeout(()=>{ if(drag&&drag.pg===pg){ page=+pg.dataset.page; pg.classList.remove('hover'); renderSlots(); } },600); }
  }
  const over=hit?.closest('.slot'), cell=hit?.closest('.cell');
  if(drag.over&&drag.over!==over) drag.over.classList.remove('over','over-r');
  if(drag.cell&&drag.cell!==cell) drag.cell.classList.remove('over');
  drag.right=false; drag.h=0; drag.cell=null;
  if(over){
    const r=over.getBoundingClientRect(), i=+over.dataset.abs, filled=state.slots[i]!=null;
    if(cell && drag.source.type==='tile'){ drag.h=+cell.dataset.h; drag.cell=cell; cell.classList.add('over'); over.classList.remove('over','over-r'); }
    else {
      // PRO：まだ分けていないマスの右側に落とすと3拍目からのコードになる
      drag.right = splitOK() && state.len>1 && drag.source.type==='tile' && filled && !segsOf(i).length && (e.clientX-r.left) > r.width*.58;
      over.classList.toggle('over',!drag.right); over.classList.toggle('over-r',drag.right);
    }
  }
  drag.over=over||null;
});
function end(e){
  if(!drag) return; const d=drag; drag=null;
  clearTimeout(d.pgT); if(d.pg) d.pg.classList.remove('hover');
  if(d.ghost) d.ghost.remove(); if(d.over) d.over.classList.remove('over','over-r'); if(d.cell) d.cell.classList.remove('over');
  if(d.moving){
    const to=d.over?+d.over.dataset.abs:null;
    if(d.source.type==='tile'){ if(to!==null){ if(d.right){ state.segs[to]=[{beat:state.len/2+1,v:d.source.deg}]; } else setV(to, d.h||0, d.source.deg); preview(d.source.deg); } }
    else { const f=d.source.index;
      if(to===null){ state.slots[f]=null; state.segs[f]=[]; }
      else if(to!==f){ [state.slots[to],state.slots[f]]=[state.slots[f],state.slots[to]]; [state.segs[to],state.segs[f]]=[state.segs[f],state.segs[to]]; } }
    selected=null; renderTiles(); renderSlots(); return;
  }
  if(e.type==='pointercancel') return;
  if(e.clientX!==undefined){ const tgt=document.elementFromPoint(e.clientX,e.clientY); if(tgt) e={clientX:e.clientX,target:tgt,type:e.type}; }
  if(d.source.type==='tile'){ selected = selected===d.source.deg?null:d.source.deg; preview(d.source.deg); }
  else { const i=d.source.index, now=performance.now();
    const tcell=e.target&&e.target.closest?e.target.closest('.cell'):null, th=tcell?+tcell.dataset.h:0;   // 分けたマスはタップした区切り
    if(state.pro && selected===null && lastTap && lastTap.i===i && lastTap.h===th && now-lastTap.t<380){ lastTap=null; openEditor(i,th); return; }   // ダブルタップで編集
    lastTap={i,h:th,t:now};
    if(selected!==null){
      const tc=e.target&&e.target.closest?e.target.closest('.cell'):null;
      setV(i, tc?+tc.dataset.h:0, selected); preview(selected); selected=null; }
    else if(getV(i,th)!==null&&getV(i,th)!==undefined){ preview(getV(i,th)); if(!state.pro && (!TUT.on||TUT.practice)){ if(ULx()>=6) openVar(i,th); } } }
  renderTiles(); renderSlots();
}
// ビギナー：置いたコードをタップすると、同じ役割のバリエーションを選べる
function openVar(i,h){
  const v=getV(i,h); let g=varGroupOf(v);
  if(g===null && v!=null && !isNum(v)){ const sp=specOf(v); g=varGroupOf({...sp,b:null}); if(g===null){ const d=STEPS.indexOf(sp.o); g=d>=0?d:null; } }
  if(g===null) return;
  $('varTitle').textContent=`${i+1}${state.len<4?'マス目':'小節目'}のコードを変える`;
  const box=$('varOpts'), wh=$('varWheels'), useWheel=ULx()>=7;
  const opts=VARS[g].filter(x=>varLv(g,x)<=ULx() || (!isNum(x)&&!isNum(v)&&sameSpec(x,v)));
  box.hidden=useWheel; wh.hidden=!useWheel;
  if(!useWheel){ box.innerHTML='';
    opts.forEach(x=>{ const b=document.createElement('button'); b.setAttribute('aria-pressed', isNum(x)?v===x:(!isNum(v)&&sameSpec(x,v)));
      const rl=ctxRole(x,null,null,false); b.className=rl; b.innerHTML=`<i>${rl}</i><b>${nameOf(x,state.label,true)}</b><small>${nameOf(x,state.label==='alpha'?numK():'alpha',false)}</small>`;
      b.onclick=()=>{ setV(i,h,x); preview(x); renderSlots(); openVar(i,h); };
      box.appendChild(b); }); }
  else {
    // スロット：左＝響き（バリエーション）、右＝ベース（そのコードの構成音から選ぶ）
    const plain=x=>{ const t=specOf(x); return {o:t.o,q:t.q,x:t.x||'',b:null}; };
    const kinds=[]; opts.forEach(x=>{ if(!isNum(x) && specOf(x).b!=null) return; if(!kinds.some(k=>sameSpec(plain(k),plain(x)))) kinds.push(x); });
    const sp=specOf(v), cur=plain(v); let ki=kinds.findIndex(k=>sameSpec(plain(k),cur)); if(ki<0){ kinds.push(cur); ki=kinds.length-1; }
    const apply=(kx,b)=>{ const t=plain(kx), tones=(QUAL[t.q]||[0,4,7]).map(iv=>(t.o+iv)%12);
      if(b==null || !tones.includes(b) || b===t.o) b=null;
      const di=STEPS.indexOf(t.o), isPlain=b===null && t.x==='' && di>=0 && (DEG[di].q===''?'maj':DEG[di].q)===t.q;
      const nv=isPlain?di:{...t,b}; setV(i,h,nv); preview(nv); renderSlots(); openVar(i,h); };
    const rl=ctxRole(v,null,null,false), nowB=(sp.b==null||sp.b===sp.o)?null:sp.b;
    $('varNow').className='varnow '+rl; $('varNow').innerHTML=`<b>${nameOf(v,state.label,true)}</b><small>${nameOf(v,state.label==='alpha'?numK():'alpha',false)}</small><i>${rl}</i>`;
    wheel($('varKind'), kinds.map((x,k)=>[k, nameOf(x,state.label,false)]), ki, k=>apply(kinds[k], nowB));
    const tones=[...new Set(QUAL[sp.q]||[0,4,7])];
    wheel($('varBassW'), tones.map(iv=>{ const b=iv?(sp.o+iv)%12:null; return [b, `${degNum(iv?bassDeg({...sp,b}):degOf(sp.o,sp),'num')}${iv?'':'（そのまま）'}`]; }), nowB, b=>apply(kinds[ki], b));
  }
  $('varSheet').classList.add('on'); scrim.classList.add('on');
}
$('closeVar').onclick=closeAll;
window.addEventListener('pointerup',end); window.addEventListener('pointercancel',end);
slotsEl.addEventListener('click',e=>{ const x=e.target.closest('.x'); if(!x) return; const i=+x.closest('.slot').dataset.abs;
  const sg=segsOf(i); if(sg.length){ const last=sg[sg.length-1]; state.segs[i]=state.segs[i].filter(x=>x!==last); }   // 分けたマスは最後のコードから消す
  else { state.slots[i]=null; state.segs[i]=[]; }
  renderSlots(); });
palette.addEventListener('keydown',e=>{
  const t=e.target.closest('.tile'); if(!t||(e.key!=='Enter'&&e.key!==' ')) return;
  e.preventDefault(); const d=+t.dataset.deg; selected=selected===d?null:d; preview(d); renderTiles(); renderSlots();
});

