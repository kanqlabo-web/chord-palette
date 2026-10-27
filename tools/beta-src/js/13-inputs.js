// ベータ版だけ（試作）：ドラム・メロディの打ち込み画面を、メニューの「打ち込みの画面」で切りかえる
// ドラム：grid（横のマス・今まで）／tall（縦のマス）／pad（楽器ごとのパッド）／card（リズムカード）
// メロディ：roll（ピアノロール・今まで）／bar（1小節ずつ）／step（鍵盤で順に入れる）
// どの画面でも、打ち込んだもの（PD.drum.v・PD.mel.notes）は同じ。切りかえても消えない
const DVIEWS=[['grid','横のマス'],['tall','縦のマス'],['pad','楽器ごとのパッド'],['card','リズムカード']];
const MVIEWS=[['roll','ピアノロール'],['bar','1小節ずつ'],['step','鍵盤で順に入れる']];
PD.dview=DVIEWS.some(x=>x[0]===PD.dview)?PD.dview:'grid';
PD.mview=MVIEWS.some(x=>x[0]===PD.mview)?PD.mview:'roll';
const PV={inst:36, card:{n:36,b:0}, bar:0, cur:0, len:2, sb:0};   // inst：パッドの楽器　card：カードを入れる枠　bar：1小節ずつの小節　cur・len・sb：鍵盤で入れる位置・長さ・見ている小節
const DCLS={42:'h',38:'s',36:'k'}, dLab=n=>(DR_ROWS.find(x=>x[0]===n)||[])[1];
const pHead=(t,sub)=>`<div class="mphead"><b>${t}</b><small>${sub}</small></div>`;
const dHit=(n,t)=>{ ensureAudio(); ensureSounds(); drum(n,t||ctx.currentTime+.01,1); };

// ---------- ドラム ----------
const _pvRhy=drawRhy;
drawRhy=function(el){ const k=PD.dview; if(k==='grid') return _pvRhy.apply(this,arguments);
  el.innerHTML=(k==='tall'?dTall():k==='pad'?dPad():dCard())+pBar('r');
  const v=PD.drum.v, redo=()=>{ pthSave(); drawPanel(); };
  el.querySelectorAll('[data-n][data-s]').forEach(c=>c.onclick=()=>{ const n=+c.dataset.n, s=+c.dataset.s; v[n][s]=v[n][s]?0:1; if(v[n][s]) dHit(n); redo(); });
  el.querySelectorAll('[data-ti]').forEach(b=>b.onclick=()=>{ PV.inst=+b.dataset.ti; dHit(PV.inst); drawPanel(); });
  el.querySelectorAll('[data-cn]').forEach(b=>b.onclick=()=>{ PV.card={n:+b.dataset.cn, b:+b.dataset.cb}; drawPanel(); });
  el.querySelectorAll('[data-ci]').forEach(b=>b.onclick=()=>{ const p=DCARDS[+b.dataset.ci][1], {n,b:bt}=PV.card;
    p.forEach((x,i)=>v[n][bt*4+i]=x); ensureAudio(); const t0=ctx.currentTime+.02; p.forEach((x,i)=>{ if(x) dHit(n,t0+i*stepDur()); });
    PV.card = bt<3 ? {n,b:bt+1} : {n:DR_ROWS[(DR_ROWS.findIndex(r=>r[0]===n)+1)%DR_ROWS.length][0], b:0};   // 次の枠へ（行の終わりは次の楽器へ）
    redo(); });
  pBarBind(el,'r'); };
// 縦のマス：上から下へ進む。列が楽器
function dTall(){ const v=PD.drum.v;
  let h=`<div class="pv dtall"><span></span>${DR_ROWS.map(([n,lab,c])=>`<b class="${c}">${lab}</b>`).join('')}`;
  for(let s=0;s<16;s++) h+=`<span class="${s%4===0?'bt':''}">${s%4===0?(s/4+1)+'拍':''}</span>`+DR_ROWS.map(([n,,c])=>`<i data-n="${n}" data-s="${s}" class="${c}${v[n][s]?' on':''}${s%4===0?' bt':''}"></i>`).join('');
  return pHead('ドラム','マスをタップして音を置きます。上から下へ進みます。この1小節を、曲のあいだくり返します。')+h+'</div>'; }
// 楽器ごとのパッド：1つの楽器の16マスを 4×4 で大きく。1段が1拍。ほかの楽器は小さな点で
function dPad(){ const v=PD.drum.v, n=PV.inst;
  let h=`<div class="pv dpadw"><div class="dtabs">${DR_ROWS.map(([m,lab,c])=>`<button class="dtab ${c}" data-ti="${m}" aria-pressed="${m===n}">${lab}</button>`).join('')}</div><div class="dpad ${DCLS[n]}">`;
  for(let b=0;b<4;b++){ h+=`<span>${b+1}拍</span>`; for(let q=0;q<4;q++){ const s=b*4+q; h+=`<i data-n="${n}" data-s="${s}" class="${v[n][s]?'on':''}">${DR_ROWS.filter(([m])=>m!==n&&v[m][s]).map(([m,,c])=>`<em class="${c}"></em>`).join('')}</i>`; } }
  return pHead('ドラム','上で楽器を選んで、パッドをタップします。1段が1拍です。小さな点は、ほかの楽器が鳴る所です。')+h+'</div></div>'; }
// リズムカード：1拍に1枚。枠を選んで、下のカードをタップ
const DCARDS=[['ウン',[0,0,0,0]],['タン',[1,0,0,0]],['タタ',[1,0,1,0]],['ンタ',[0,0,1,0]],['タカタカ',[1,1,1,1]],['タータカ',[1,0,1,1]],['タカター',[1,1,1,0]],['タッカ',[1,0,0,1]]];
const cardOf=a=>DCARDS.find(([,p])=>p.every((x,i)=>!!x===!!a[i]));
const cardDots=p=>`<span class="cdots">${p.map(x=>`<i class="${x?'on':''}"></i>`).join('')}</span>`;
function dCard(){ const v=PD.drum.v, S=PV.card;
  let h='<div class="pv dcard">';
  DR_ROWS.forEach(([n,lab,c])=>{ h+=`<div class="dcrow ${c}"><small>${lab}</small><div>`;
    for(let b=0;b<4;b++){ const a=v[n].slice(b*4,b*4+4), cd=cardOf(a); h+=`<button class="dcslot" data-cn="${n}" data-cb="${b}" aria-pressed="${S.n===n&&S.b===b}">${cardDots(a)}<b>${cd?cd[0]:'ほか'}</b></button>`; }
    h+='</div></div>'; });
  h+=`<p class="dchint">${dLab(S.n)}の${S.b+1}拍目に入れるカード</p><div class="dcpal ${DCLS[S.n]}">${DCARDS.map(([nm,p],i)=>`<button class="dccard" data-ci="${i}">${cardDots(p)}<b>${nm}</b></button>`).join('')}</div></div>`;
  return pHead('ドラム','上の枠を選んで、下のカードをタップします。1枚が1拍です。')+h; }

// ---------- メロディ ----------
const _pvMel=drawMel;
drawMel=function(el){ const k=PD.mview; if(k==='step') return melStep(el);
  const r=_pvMel.apply(this,arguments); if(k==='bar') barSetup(el); return r; };
// 1小節ずつ：ピアノロールの1小節を幅いっぱいに（マスの幅は 11-paths の drawMel で決める）。前・次の小節はボタンで
function barSetup(el){ const sc=el.querySelector('.mscroll'), mr=el.querySelector('.mroll'); if(!sc||!mr) return; sc.classList.add('mbar');
  const N=state.bars; PV.bar=Math.max(0,Math.min(N-1,PV.bar));
  const nav=document.createElement('div'); nav.className='mbarnav'; nav.innerHTML='<button class="chip" data-bj="-1">‹ 前の小節</button><b></b><button class="chip" data-bj="1">次の小節 ›</button>';
  mr.before(nav); nav.querySelectorAll('[data-bj]').forEach(b=>b.onclick=()=>{ PV.bar=(PV.bar+N+(+b.dataset.bj))%N; barGo(el); }); barGo(el); }
function barGo(el){ const sc=el.querySelector('.mscroll'), nb=el.querySelector('.mbarnav b'); if(!sc) return; sc.scrollLeft=PV.bar*slotSteps()*MU.cw; if(nb) nb.textContent=`${PV.bar+1} / ${state.bars} 小節`; }
// 鍵盤で順に入れる：鍵盤を押すと、黄色の位置に音が入って次へ進む（MuseScore のステップ入力と同じ考え）。上は1小節の表示
function melStep(el){ melSnapRows(); const L=slotSteps(), T=melT(), N=state.bars, ROWS=melRows(), R=ROWS.length, kp=keyObj().pc, G=MU.G;
  PV.len=Math.max(G,PV.len); PV.cur=Math.max(0,Math.min(T-G,Math.floor(PV.cur/G)*G)); if(!playing) PV.sb=Math.floor(PV.cur/L); PV.sb=Math.max(0,Math.min(N-1,PV.sb));
  const b=PV.sb, s0=b*L, cell=cellAt(PV.cur);
  const lit=pDone('M4')&&cell&&cell.v!=null ? (()=>{ const sp=specOf(cell.v), rt=(kp+sp.o)%12; return (QUAL[sp.q]||[0,4,7]).map(q=>(rt+q)%12); })() : [];
  const ref=pDone('M3')&&PD.mel.guide ? PD.mel.notes.filter(n=>n.st<PV.cur).pop() : null, nx=ref?melNextRows(ref.o):{step:[],jump:[]};
  let heads=''; cellsOf(b).forEach(c=>{ if(c.v==null||!c.len) return; heads+=`<span style="left:${c.off/L*100}%;width:${c.len/L*100}%">${bigHTML(c.v)}</span>`; });
  const notes=PD.mel.notes.filter(n=>n.st<s0+L&&n.st+n.len>s0).map(n=>{ const a=Math.max(n.st,s0), e=Math.min(n.st+n.len,s0+L), k=ROWS.indexOf(n.o);
    return `<div class="svn" data-st="${n.st}" style="left:${(a-s0)/L*100}%;width:${(e-a)/L*100}%;top:${(R-1-k)/R*100}%;height:${100/R}%"><span>${melDeg(n.o)}</span></div>`; }).join('');
  const cur=PV.cur>=s0&&PV.cur<s0+L ? `<div class="svcur" style="left:${(PV.cur-s0)/L*100}%;width:${Math.min(PV.len,s0+L-PV.cur)/L*100}%"></div>` : '';
  const cols=Array.from({length:L/G},(_,i)=>`<i data-c="${i*G}" class="${(i*G)%4===0?'bt':''}" style="left:${i*G/L*100}%;width:${G/L*100}%"></i>`).join('');
  const rows=`repeating-linear-gradient(180deg,transparent 0 calc(100%/${R} - 1px),var(--line) calc(100%/${R} - 1px) calc(100%/${R}))`;
  const kc=o=>`${lit.includes((kp+o)%12)?' lit':''}${nx.step.includes(o)?' g-ok':nx.jump.includes(o)?' g-jump':''}`;
  const key=o=>`<button class="svk${kc(o)}" data-o="${o}">${melLab(o)}</button>`;
  const LENS=[[1,'16分'],[2,'8分'],[4,'4分'],[8,'2分'],[16,'全音符']].filter(([l])=>l>=G&&l<=L);
  el.innerHTML=pHead('メロディ','鍵盤を押すと、黄色の位置に音が入って次へ進みます。上のマスや音をタップすると、入れる位置を変えられます。'+(lit.length?'光っている鍵盤は、その位置のコードの音です。':''))+
    `<div class="mbarnav"><button class="chip" data-bj="-1">‹</button><b>${b+1} / ${N} 小節</b><button class="chip" data-bj="1">›</button></div>
    <div class="sv"><div class="svhd">${heads}</div><div class="svarea" style="background-image:${rows}">${cols}${cur}${notes}<div class="svph" hidden></div></div></div>
    <div class="svctl"><div class="svlen"><small>長さ</small>${LENS.map(([l,nm])=>`<button class="chip" data-len="${l}" aria-pressed="${PV.len===l}">${nm}</button>`).join('')}</div>
      <div class="svmv"><button class="chip" data-mv="-1" aria-label="位置を前へ">◀</button><button class="chip" data-rest>休み</button><button class="chip" data-bs>1つ消す</button><button class="chip" data-mv="1" aria-label="位置を後ろへ">▶</button></div></div>
    <div class="svkeys"><div>${ROWS.filter(o=>o>=12).map(key).join('')}</div><div>${ROWS.filter(o=>o<12).map(key).join('')}</div></div>`+pBar('m');
  const go=c=>{ PV.cur=Math.max(0,Math.min(T-G,c)); PV.sb=Math.floor(PV.cur/L); pthSave(); drawPanel(); };
  const clear=(a,e)=>{ PD.mel.notes=PD.mel.notes.filter(n=>n.st>=e||n.st+n.len<=a||n.st<a).map(n=>{ if(n.st<a&&n.st+n.len>a) n.len=a-n.st; return n; }); };   // a〜e を空ける（前からのびている音は手前で切る）
  const next=len=>{ const c=PV.cur+len; if(c>=T){ toast('曲の最後まで入りました。はじめに戻ります'); go(0); } else go(c); };
  el.querySelectorAll('[data-o]').forEach(k=>k.onclick=()=>{ const o=+k.dataset.o, len=Math.min(PV.len,T-PV.cur); melSnap(); clear(PV.cur,PV.cur+len);
    const n={st:PV.cur,o,len}; PD.mel.notes.push(n); melTidy(n); PD.mel.on=true; MU.ref=n; melHear(o); next(len); });
  el.querySelector('[data-rest]').onclick=()=>{ const len=Math.min(PV.len,T-PV.cur); melSnap(); clear(PV.cur,PV.cur+len); melTidy(); next(len); };
  el.querySelector('[data-bs]').onclick=()=>{ const n=PD.mel.notes.filter(x=>x.st<PV.cur).pop(); if(!n) return; melSnap(); PD.mel.notes=PD.mel.notes.filter(x=>x!==n); go(n.st); };
  el.querySelectorAll('[data-mv]').forEach(b=>b.onclick=()=>go(PV.cur+(+b.dataset.mv)*G));
  el.querySelectorAll('[data-bj]').forEach(x=>x.onclick=()=>go(((b+N+(+x.dataset.bj))%N)*L));
  el.querySelectorAll('[data-len]').forEach(x=>x.onclick=()=>{ PV.len=+x.dataset.len; drawPanel(); });
  el.querySelectorAll('.svarea [data-c]').forEach(x=>x.onclick=()=>go(s0+(+x.dataset.c)));
  el.querySelectorAll('.svn').forEach(x=>x.onclick=()=>{ const n=PD.mel.notes.find(m=>m.st===+x.dataset.st); if(n){ PV.len=Math.max(G,n.len); melHear(n.o); } go(+x.dataset.st); });
  histBtns(); pBarBind(el,'m'); melLoad(); }

// ---------- 再生中の印 ----------
const _pvMark=pMark;
pMark=function(g,t){ _pvMark.apply(this,arguments); if(PD.mode==='c'||document.hidden) return; const el=$('modePanel'); if(!el) return;
  setTimeout(()=>{ if(!playing) return; const L=slotSteps(), b=Math.floor(g/L), fol=PD.mel.follow!==false;
    if(PD.mode==='r' && PD.dview!=='grid'){ el.querySelectorAll('.pv .now').forEach(e=>e.classList.remove('now')); const s=g%16;
      el.querySelectorAll(PD.dview==='card'?`.dcslot[data-cb="${s>>2}"]`:`.pv [data-s="${s}"]`).forEach(e=>e.classList.add('now')); }
    if(PD.mode==='m' && PD.mview==='bar' && fol){ PV.bar=b; barGo(el); }
    if(PD.mode==='m' && PD.mview==='step'){ if(fol && b!==PV.sb){ PV.sb=b; drawPanel(); } const ph=el.querySelector('.svph');
      if(ph){ ph.hidden=b!==PV.sb; ph.style.left=((g-b*L)/L*100)+'%'; } } },
    Math.max(0,(t-ctx.currentTime)*1000)); };

// ---------- メニュー：打ち込みの画面を選ぶ ----------
const _pvMenu=pthMenu;
pthMenu=function(){ const r=_pvMenu.apply(this,arguments), box=$('pthSecs'), k=PD.mode;
  if(!box||box.hidden||k==='c'||(k==='r'?!pDone('R2'):!pDone('M1'))) return r;
  const sec=document.createElement('div'); sec.className='sec'; sec.innerHTML='<h3>打ち込みの画面 <small style="color:var(--muted);font-weight:400">試作</small></h3><div class="chips"></div>';
  const lv=box.querySelector('.sec'); if(lv) lv.after(sec); else box.prepend(sec);
  chips(sec.querySelector('.chips'), k==='r'?DVIEWS:MVIEWS, k==='r'?PD.dview:PD.mview, v=>{ if(k==='r') PD.dview=v; else PD.mview=v; pthSave(); drawPanel(); pthMenu(); });
  return r; };

drawPanel();
