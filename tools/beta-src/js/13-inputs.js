// ベータ版だけ（試作）：ドラム・メロディの打ち込み画面を、メニューの「打ち込みの画面」で切りかえる
// ドラム：grid（横のマス・今まで）／tall（縦のマス）／pad（楽器ごとのパッド）／card（リズムカード）／kuchi（口ドラム）／parts（型から選ぶ）
// メロディ：roll（ピアノロール・今まで）／bar（1小節ずつ）／step（鍵盤で順に入れる）／chord（コードの音から選ぶ）／arrow（上・下で決める）
// どの画面でも、打ち込んだもの（PD.drum.v・PD.mel.notes）は同じ。切りかえても消えない
const DVIEWS=[['grid','横のマス'],['tall','縦のマス'],['pad','楽器ごとのパッド'],['card','リズムカード'],['kuchi','口ドラム'],['parts','型から選ぶ']];
const MVIEWS=[['roll','ピアノロール'],['bar','1小節ずつ'],['step','鍵盤で順に入れる'],['chord','コードの音から選ぶ'],['arrow','上・下で決める']];
PD.dview=DVIEWS.some(x=>x[0]===PD.dview)?PD.dview:'grid';
PD.mview=MVIEWS.some(x=>x[0]===PD.mview)?PD.mview:'roll';
const PV={inst:36, card:{n:36,b:0}, bar:0, cur:0, len:2, sb:0, kc:0, cy:0};   // kc：口ドラムの位置　cy：コードの音から選ぶ画面のスクロール   // inst：パッドの楽器　card：カードを入れる枠　bar：1小節ずつの小節　cur・len・sb：鍵盤で入れる位置・長さ・見ている小節
const DCLS={42:'h',38:'s',36:'k'}, dLab=n=>(DR_ROWS.find(x=>x[0]===n)||[])[1];
const pHead=(t,sub)=>`<div class="mphead"><b>${t}</b><small>${sub}</small></div>`;
const dHit=(n,t)=>{ ensureAudio(); ensureSounds(); drum(n,t||ctx.currentTime+.01,1); };

// ---------- ドラム ----------
const _pvRhy=drawRhy;
drawRhy=function(el){ const k=PD.dview; if(k==='grid') return _pvRhy.apply(this,arguments);
  el.innerHTML=(k==='tall'?dTall():k==='pad'?dPad():k==='kuchi'?dKuchi():k==='parts'?dParts():dCard())+pBar('r');
  const v=PD.drum.v, redo=()=>{ pthSave(); drawPanel(); };
  el.querySelectorAll('[data-n][data-s]').forEach(c=>c.onclick=()=>{ const n=+c.dataset.n, s=+c.dataset.s; v[n][s]=v[n][s]?0:1; if(v[n][s]) dHit(n); redo(); });
  el.querySelectorAll('[data-ti]').forEach(b=>b.onclick=()=>{ PV.inst=+b.dataset.ti; dHit(PV.inst); drawPanel(); });
  el.querySelectorAll('[data-cn]').forEach(b=>b.onclick=()=>{ PV.card={n:+b.dataset.cn, b:+b.dataset.cb}; drawPanel(); });
  el.querySelectorAll('[data-ci]').forEach(b=>b.onclick=()=>{ const p=DCARDS[+b.dataset.ci][1], {n,b:bt}=PV.card;
    p.forEach((x,i)=>v[n][bt*4+i]=x); ensureAudio(); const t0=ctx.currentTime+.02; p.forEach((x,i)=>{ if(x) dHit(n,t0+i*stepDur()); });
    PV.card = bt<3 ? {n,b:bt+1} : {n:DR_ROWS[(DR_ROWS.findIndex(r=>r[0]===n)+1)%DR_ROWS.length][0], b:0};   // 次の枠へ（行の終わりは次の楽器へ）
    redo(); });
  el.querySelectorAll('[data-kc]').forEach(b=>b.onclick=()=>{ PV.kc=+b.dataset.kc; drawPanel(); });
  el.querySelectorAll('[data-ky]').forEach(b=>b.onclick=()=>{ const st=PV.kc*2, on=KUCHI[+b.dataset.ky][1]; ensureAudio(); const t0=ctx.currentTime+.01;
    DR_ROWS.forEach(([n])=>{ v[n][st]=on.includes(n)?1:0; if(v[n][st]) dHit(n,t0); }); PV.kc=(PV.kc+1)%8; redo(); });
  el.querySelectorAll('[data-pn]').forEach(b=>b.onclick=()=>{ const n=+b.dataset.pn, p=PARTS[n][+b.dataset.pi][1]; v[n]=p.slice(); ensureAudio(); const t0=ctx.currentTime+.02; p.forEach((x,i)=>{ if(x) dHit(n,t0+i*stepDur()); }); redo(); });
  pBarBind(el,'r'); };
// 口ドラム：「ドン（キック）・タン（スネア）・ツ（ハイハット）」を押して、8分ずつ順に入れる
const KUCHI=[['ドン',[36]],['タン',[38]],['ツ',[42]],['ドンツ',[36,42]],['タンツ',[38,42]],['ウン',[]]];
const kuchiOf=(v,s)=>(v[36][s]&&v[38][s]?'ドタン':v[36][s]?'ドン':v[38][s]?'タン':'')+(v[42][s]?'ツ':'')||'ウン';
function dKuchi(){ const v=PD.drum.v;
  let h='<div class="pv dkuchi"><div class="dkline">';
  for(let i=0;i<8;i++){ const s=i*2, odd=DR_ROWS.some(([n])=>v[n][s+1]);
    h+=`<button class="dkslot${i%2?'':' bt'}" data-kc="${i}" data-s="${s}" aria-pressed="${PV.kc===i}">${i%2?'':`<small>${i/2+1}拍</small>`}<b>${kuchiOf(v,s)}</b>${odd?'<em>＋</em>':''}</button>`; }
  h+=`</div><div class="dkpad">${KUCHI.map(([nm,ns],i)=>`<button data-ky="${i}"><b>${nm}</b><small>${ns.map(dLab).join('＋')||'休み'}</small></button>`).join('')}</div></div>`;
  return pHead('ドラム','口で言うように「ドン・タン・ツ」を押すと、黄色の所に入って次へ進みます。ドン＝キック、タン＝スネア、ツ＝ハイハットです。')+h; }
// 型から選ぶ：楽器ごとに、よくある形を選んで組み合わせる
const R16=(...b)=>{ const a=Array(16).fill(0); b.forEach(i=>a[i]=1); return a; };
const PARTS={36:[['なし',R16()],['1拍と3拍',R16(0,8)],['8ビート',R16(0,8,10)],['4つ打ち',R16(0,4,8,12)],['はねる',R16(0,3,6,10)],['ゆったり',R16(0)]],
  38:[['なし',R16()],['2拍と4拍',R16(4,12)],['4拍だけ',R16(12)],['2・4拍＋おまけ',R16(4,12,15)],['3拍だけ',R16(8)]],
  42:[['なし',R16()],['4分',R16(0,4,8,12)],['8分',R16(0,2,4,6,8,10,12,14)],['16分',R16(...Array.from({length:16},(_,i)=>i))],['裏だけ',R16(2,6,10,14)]]};
function dParts(){ const v=PD.drum.v; let h='<div class="pv dparts">';
  DR_ROWS.forEach(([n,lab,c])=>{ h+=`<div class="dprow ${c}"><small>${lab}</small><div>${PARTS[n].map(([nm,p],i)=>`<button data-pn="${n}" data-pi="${i}" aria-pressed="${p.every((x,j)=>!!x===!!v[n][j])}"><b>${nm}</b><span class="cdots">${p.map((x,j)=>`<i class="${x?'on':''}${j%4===0?' bt':''}"></i>`).join('')}</span></button>`).join('')}</div></div>`; });
  return pHead('ドラム','楽器ごとに形を選ぶと、組み合わせた1小節になります。選ぶと、その形が鳴ります。')+h+'</div>'; }
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
drawMel=function(el){ const k=PD.mview; if(k==='step'||k==='arrow') return melStep(el,k==='arrow'); if(k==='chord') return melChord(el);
  const r=_pvMel.apply(this,arguments); if(k==='bar') barSetup(el); return r; };
// 1小節ずつ：ピアノロールの1小節を幅いっぱいに（マスの幅は 11-paths の drawMel で決める）。前・次の小節はボタンで
function barSetup(el){ const sc=el.querySelector('.mscroll'), mr=el.querySelector('.mroll'); if(!sc||!mr) return; sc.classList.add('mbar');
  const N=state.bars; PV.bar=Math.max(0,Math.min(N-1,PV.bar));
  const nav=document.createElement('div'); nav.className='mbarnav'; nav.innerHTML='<button class="chip" data-bj="-1">‹ 前の小節</button><b></b><button class="chip" data-bj="1">次の小節 ›</button>';
  mr.before(nav); nav.querySelectorAll('[data-bj]').forEach(b=>b.onclick=()=>{ PV.bar=(PV.bar+N+(+b.dataset.bj))%N; barGo(el); }); barGo(el); }
function barGo(el){ const sc=el.querySelector('.mscroll'), nb=el.querySelector('.mbarnav b'); if(!sc) return; sc.scrollLeft=PV.bar*slotSteps()*MU.cw; if(nb) nb.textContent=`${PV.bar+1} / ${state.bars} 小節`; }
// 鍵盤で順に入れる：鍵盤を押すと、黄色の位置に音が入って次へ進む（MuseScore のステップ入力と同じ考え）。上は1小節の表示
function melStep(el,arrow){ melSnapRows(); const L=slotSteps(), T=melT(), N=state.bars, ROWS=melRows(), R=ROWS.length, kp=keyObj().pc, G=MU.G;
  PV.len=Math.max(G,PV.len); PV.cur=Math.max(0,Math.min(T-G,Math.floor(PV.cur/G)*G)); if(!playing) PV.sb=Math.floor(PV.cur/L); PV.sb=Math.max(0,Math.min(N-1,PV.sb));
  const b=PV.sb, s0=b*L, cell=cellAt(PV.cur);
  const pcs=chordPcs(PV.cur)||[], lit=pDone('M4')?pcs:[], prev=PD.mel.notes.filter(n=>n.st<PV.cur).pop();
  const ref=pDone('M3')&&PD.mel.guide&&!arrow ? prev : null, nx=ref?melNextRows(ref.o):{step:[],jump:[]};
  let heads=''; cellsOf(b).forEach(c=>{ if(c.v==null||!c.len) return; heads+=`<span style="left:${c.off/L*100}%;width:${c.len/L*100}%">${bigHTML(c.v)}</span>`; });
  const notes=PD.mel.notes.filter(n=>n.st<s0+L&&n.st+n.len>s0).map(n=>{ const a=Math.max(n.st,s0), e=Math.min(n.st+n.len,s0+L), k=ROWS.indexOf(n.o);
    return `<div class="svn" data-st="${n.st}" style="left:${(a-s0)/L*100}%;width:${(e-a)/L*100}%;top:${(R-1-k)/R*100}%;height:${100/R}%"><span>${melDeg(n.o)}</span></div>`; }).join('');
  const cur=PV.cur>=s0&&PV.cur<s0+L ? `<div class="svcur" style="left:${(PV.cur-s0)/L*100}%;width:${Math.min(PV.len,s0+L-PV.cur)/L*100}%"></div>` : '';
  const cols=Array.from({length:L/G},(_,i)=>`<i data-c="${i*G}" class="${(i*G)%4===0?'bt':''}" style="left:${i*G/L*100}%;width:${G/L*100}%"></i>`).join('');
  const rows=`repeating-linear-gradient(180deg,transparent 0 calc(100%/${R} - 1px),var(--line) calc(100%/${R} - 1px) calc(100%/${R}))`;
  const kc=o=>`${lit.includes((kp+o)%12)?' lit':''}${nx.step.includes(o)?' g-ok':nx.jump.includes(o)?' g-jump':''}`;
  const key=o=>`<button class="svk${kc(o)}" data-o="${o}">${melLab(o)}</button>`;
  const LENS=[[1,'16分'],[2,'8分'],[4,'4分'],[8,'2分'],[16,'全音符']].filter(([l])=>l>=G&&l<=L);
  const AR=arrow?arrowTo(prev,pcs,ROWS):null;
  const keys=arrow ? `<div class="svarw"><p>${prev?`今の音：${melLab(prev.o)}`:'はじめの音は ③ から'}</p>${[['jup','↑↑','跳んで上'],['up','↑','となりの上'],['same','→','同じ音'],['dn','↓','となりの下'],['jdn','↓↓','跳んで下']].map(([k,a,nm])=>`<button class="ar-${k}" data-ar="${k}"><b>${a}</b><span>${nm}</span><i>${melLab(AR[k])}</i></button>`).join('')}</div>`
    : `<div class="svkeys"><div>${ROWS.filter(o=>o>=12).map(key).join('')}</div><div>${ROWS.filter(o=>o<12).map(key).join('')}</div></div>`;
  el.innerHTML=pHead('メロディ',arrow?'前の音から「上・下・同じ」を選ぶと、黄色の位置に音が入って次へ進みます。跳ぶときは、そこのコードの音へ跳びます。':'鍵盤を押すと、黄色の位置に音が入って次へ進みます。上のマスや音をタップすると、入れる位置を変えられます。'+(lit.length?'光っている鍵盤は、その位置のコードの音です。':''))+
    `<div class="mbarnav"><button class="chip" data-bj="-1">‹</button><b>${b+1} / ${N} 小節</b><button class="chip" data-bj="1">›</button></div>
    <div class="sv"><div class="svhd">${heads}</div><div class="svarea" style="background-image:${rows}">${cols}${cur}${notes}<div class="svph" hidden></div></div></div>
    <div class="svctl"><div class="svlen"><small>長さ</small>${LENS.map(([l,nm])=>`<button class="chip" data-len="${l}" aria-pressed="${PV.len===l}">${nm}</button>`).join('')}</div>
      <div class="svmv"><button class="chip" data-mv="-1" aria-label="位置を前へ">◀</button><button class="chip" data-rest>休み</button><button class="chip" data-bs>1つ消す</button><button class="chip" data-mv="1" aria-label="位置を後ろへ">▶</button></div></div>
    ${keys}`+pBar('m');
  const go=c=>{ PV.cur=Math.max(0,Math.min(T-G,c)); PV.sb=Math.floor(PV.cur/L); pthSave(); drawPanel(); };
  const clear=(a,e)=>{ PD.mel.notes=PD.mel.notes.filter(n=>n.st>=e||n.st+n.len<=a||n.st<a).map(n=>{ if(n.st<a&&n.st+n.len>a) n.len=a-n.st; return n; }); };   // a〜e を空ける（前からのびている音は手前で切る）
  const next=len=>{ const c=PV.cur+len; if(c>=T){ toast('曲の最後まで入りました。はじめに戻ります'); go(0); } else go(c); };
  const put=o=>{ const len=Math.min(PV.len,T-PV.cur); melSnap(); clear(PV.cur,PV.cur+len);
    const n={st:PV.cur,o,len}; PD.mel.notes.push(n); melTidy(n); PD.mel.on=true; MU.ref=n; melHear(o); next(len); };
  el.querySelectorAll('.svkeys [data-o]').forEach(k=>k.onclick=()=>put(+k.dataset.o));
  el.querySelectorAll('[data-ar]').forEach(k=>k.onclick=()=>put(AR[k.dataset.ar]));
  el.querySelector('[data-rest]').onclick=()=>{ const len=Math.min(PV.len,T-PV.cur); melSnap(); clear(PV.cur,PV.cur+len); melTidy(); next(len); };
  el.querySelector('[data-bs]').onclick=()=>{ const n=PD.mel.notes.filter(x=>x.st<PV.cur).pop(); if(!n) return; melSnap(); PD.mel.notes=PD.mel.notes.filter(x=>x!==n); go(n.st); };
  el.querySelectorAll('[data-mv]').forEach(b=>b.onclick=()=>go(PV.cur+(+b.dataset.mv)*G));
  el.querySelectorAll('[data-bj]').forEach(x=>x.onclick=()=>go(((b+N+(+x.dataset.bj))%N)*L));
  el.querySelectorAll('[data-len]').forEach(x=>x.onclick=()=>{ PV.len=+x.dataset.len; drawPanel(); });
  el.querySelectorAll('.svarea [data-c]').forEach(x=>x.onclick=()=>go(s0+(+x.dataset.c)));
  el.querySelectorAll('.svn').forEach(x=>x.onclick=()=>{ const n=PD.mel.notes.find(m=>m.st===+x.dataset.st); if(n){ PV.len=Math.max(G,n.len); melHear(n.o); } go(+x.dataset.st); });
  histBtns(); pBarBind(el,'m'); melLoad(); }

// その位置で鳴っているコードの音（キーに関係なく 0〜11 の音名）。コードがなければ null
function chordPcs(g){ const c=cellAt(g), kp=keyObj().pc; if(!c||c.v==null) return null; const sp=specOf(c.v), rt=(kp+sp.o)%12; return (QUAL[sp.q]||[0,4,7]).map(q=>(rt+q)%12); }
// 上・下で決める：前の音から、となり（行の上下）・同じ・跳ぶ（そこのコードの音へ。コードがなければ 1・3・5）の行き先
function arrowTo(prev,pcs,ROWS){ const R=ROWS.length, kp=keyObj().pc, o0=prev&&ROWS.includes(prev.o)?prev.o:(ROWS.includes(4)?4:ROWS[2]), i=ROWS.indexOf(o0);
  const ct=o=>pcs.length?pcs.includes((kp+o)%12):TRIAD.has(((o%12)+12)%12);
  const up=ROWS.slice(i+2).find(ct), dn=ROWS.slice(0,Math.max(0,i-1)).reverse().find(ct);
  return prev ? {same:o0, up:ROWS[Math.min(R-1,i+1)], dn:ROWS[Math.max(0,i-1)], jup:up??ROWS[R-1], jdn:dn??ROWS[0]} : {same:o0, up:o0, dn:o0, jup:o0, jdn:o0}; }
// コードの音から選ぶ：1拍に1音、その拍のコードの音（3つ）から選ぶ。必ずコードに合う
function melChord(el){ melSnapRows(); const L=slotSteps(), N=state.bars, kp=keyObj().pc, ROWS=melRows(), sc0=el.querySelector('.mchord'); if(sc0) PV.cy=sc0.scrollTop;
  let h='<div class="pv mchord">';
  for(let b=0;b<N;b++){ h+=`<div class="mcbar"><small>${b+1}</small><div>`;
    for(let q=0;q<L/4;q++){ const st=b*L+q*4, os=[...new Set((chordPcs(st)||[]).map(pc=>{ let o=((pc-kp)%12+12)%12; if(o<5) o+=12; return o; }))].filter(o=>ROWS.includes(o)).sort((a,c)=>c-a);
      const cur=PD.mel.notes.find(n=>n.st===st), c=cellsOf(b).find(x=>x.off===q*4&&x.v!=null&&x.len);
      h+=`<div class="mcbeat" data-gb="${st/4}"><span class="mchd">${c?bigHTML(c.v):''}</span>${os.map(o=>`<button data-st="${st}" data-o="${o}" aria-pressed="${!!cur&&cur.o===o}">${melLab(o)}</button>`).join('')}<button class="mcno" data-st="${st}" data-o="-1" aria-pressed="${!PD.mel.notes.some(n=>n.st<st+4&&n.st+n.len>st)}">休み</button></div>`; }
    h+='</div></div>'; }
  el.innerHTML=pHead('メロディ','1拍に1つ、その拍のコードの音から選びます。どれを選んでもコードに合います。もう一度押すと消えます。')+h+'</div>'+pBar('m');
  el.querySelector('.mchord').scrollTop=PV.cy;
  el.querySelectorAll('.mcbeat [data-st]').forEach(x=>x.onclick=()=>{ const st=+x.dataset.st, o=+x.dataset.o, was=PD.mel.notes.find(n=>n.st===st&&n.o===o); melSnap();
    PD.mel.notes=PD.mel.notes.filter(n=>n.st>=st+4||n.st+n.len<=st||n.st<st).map(n=>{ if(n.st<st&&n.st+n.len>st) n.len=st-n.st; return n; });
    if(o>=0&&!was){ const n={st,o,len:4}; PD.mel.notes.push(n); melTidy(n); PD.mel.on=true; melHear(o); } else melTidy(); pthSave(); drawPanel(); });
  histBtns(); pBarBind(el,'m'); melLoad(); }

// ---------- 再生中の印 ----------
const _pvMark=pMark;
pMark=function(g,t){ _pvMark.apply(this,arguments); if(PD.mode==='c'||document.hidden) return; const el=$('modePanel'); if(!el) return;
  setTimeout(()=>{ if(!playing) return; const L=slotSteps(), b=Math.floor(g/L), fol=PD.mel.follow!==false;
    if(PD.mode==='r' && PD.dview!=='grid'){ el.querySelectorAll('.pv .now').forEach(e=>e.classList.remove('now')); const s=g%16;
      el.querySelectorAll(PD.dview==='card'?`.dcslot[data-cb="${s>>2}"]`:`.pv [data-s="${s}"]`).forEach(e=>e.classList.add('now')); }
    if(PD.mode==='m' && PD.mview==='bar' && fol){ PV.bar=b; barGo(el); }
    if(PD.mode==='m' && PD.mview==='chord' && g%4===0){ el.querySelectorAll('.pv .now').forEach(e=>e.classList.remove('now')); const x=el.querySelector(`.mcbeat[data-gb="${g/4}"]`); if(x){ x.classList.add('now'); if(fol){ const sc=el.querySelector('.mchord'), r=x.getBoundingClientRect(), rs=sc.getBoundingClientRect(); if(r.top<rs.top||r.bottom>rs.bottom) sc.scrollTop+=r.top-rs.top-8; } } }
    if(PD.mode==='m' && (PD.mview==='step'||PD.mview==='arrow')){ if(fol && b!==PV.sb){ PV.sb=b; drawPanel(); } const ph=el.querySelector('.svph');
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
