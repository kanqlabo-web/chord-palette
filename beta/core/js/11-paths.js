// ベータ版だけ（試作）：コード・リズム・メロディの3本の道
// ・3本の道の地図（どの道から進めてもよい。ほかの道の知識が要るレベルだけ鍵がかかる）
// ・リズム R1・R2、メロディ M1 の解説（ほかのレベルは「準備中」）
// ・ドラムの打ち込み（R2 クリアで開く）とメロディの打ち込み（M1 クリアで開く）。今の曲に重ねて鳴らす
// 進み具合と打ち込んだものは、曲の保存とは別に STK('chord-palette-paths') に保存する
const PTH_KEY=STK('chord-palette-paths');
const PD=(()=>{ let d={}; try{ d=JSON.parse(localStorage.getItem(PTH_KEY))||{}; }catch(e){} return d; })();
PD.done=PD.done||{};
PD.drum=PD.drum||{on:false, v:{36:Array(16).fill(0),38:Array(16).fill(0),42:Array(16).fill(0)}};
PD.mel=PD.mel||{on:false, n:{}};   // n：マス（16分の位置）→ 行（ペンタトニックの何番目か）
const P_X='<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const pthSave=()=>{ try{ localStorage.setItem(PTH_KEY,JSON.stringify(PD)); }catch(e){} };

// ---------- 3本の道 ----------
const P_LV={
  r:[{id:'R1',name:'拍と小節',req:[],deck:()=>R1_DECK},
     {id:'R2',name:'ドラムの3つの役割',unlock:'ドラムの打ち込み',req:['R1'],deck:()=>R2_DECK},
     {id:'R3',name:'16ビートと強弱',req:['R2']},
     {id:'R4',name:'食い',req:['R3','C1']},
     {id:'R5',name:'ハネるリズム',req:['R3']},
     {id:'R6',name:'ジャンルのリズムとフィル',req:['R4','R5','C3']},
     {id:'R7',name:'ベースを作る',req:['R2','C1']},
     {id:'R8',name:'コード楽器の刻み',req:['R4','C3']},
     {id:'R9',name:'自分の伴奏を作る',req:['R6','R7','R8','C7']}],
  m:[{id:'M1',name:'光る音に置く',unlock:'メロディの打ち込み',req:[],deck:()=>m1Deck()},
     {id:'M2',name:'つなぎの音',req:['M1']},
     {id:'M3',name:'音階とぶつかる音',req:['M2']},
     {id:'M4',name:'問いと答え',req:['M3','C2']},
     {id:'M5',name:'コードに合わせてメロディを作る',req:['M4','C3']},
     {id:'M6',name:'メロディの山と谷',req:['M5']},
     {id:'M7',name:'言葉とリズム',req:['M6','R4']},
     {id:'M8',name:'キーの外のコードの上で',req:['M7','C8']}],
  c:[{id:'C10',name:'メロディに合わせてコードを付ける',req:['C2','M3']}],   // 今のレベル1〜9のあとに足すコードのレベル
};
const P_NAME={C:'コード',R:'リズム',M:'メロディ'};
const pName=id=>`${P_NAME[id[0]]} ${id.slice(1)}`;
const pDone=id=> id[0]==='C' ? UL()>=+id.slice(1) : !!PD.done[id];
const C_EXTRA={7:['M1']};   // コード7（分数コード）は、構成音をメロディ1で習ってから
const P_ALL=()=>[...P_LV.r,...P_LV.m,...P_LV.c];
const pReq=id=> P_LV.c.some(l=>l.id===id) ? P_LV.c.find(l=>l.id===id).req : id[0]==='C' ? [...(+id.slice(1)>1?['C'+(+id.slice(1)-1)]:[]), ...(C_EXTRA[+id.slice(1)]||[])] : (P_ALL().find(l=>l.id===id)||{}).req||[];
const pOpen=id=>pReq(id).every(pDone);
function pClear(id){ if(PD.done[id]) return; PD.done[id]=true; pthSave(); }

function pthMapHTML(){
  const col=(k,title,list)=>`<div class="pcol"><h3>${title}</h3>${list.map(l=>{
    const done=pDone(l.id), open=pOpen(l.id), ready=(l.id[0]==='C'&&+l.id.slice(1)<=LEVELS.length)||!!l.deck, miss=pReq(l.id).filter(r=>!pDone(r));
    const st = done ? '<span class="pst done">クリア</span>' : !open ? `<span class="pst">${ico('lock',11)} ${miss.map(pName).join('・')} が必要</span>` : ready ? '<span class="pst go">挑戦できます</span>' : '<span class="pst">準備中</span>';
    return `<button class="plv${done?' done':''}${open?'':' lock'}" data-p="${l.id}"><i>${pName(l.id)}</i><b>${l.name}</b>${st}</button>`; }).join('')}</div>`;
  const C=[...LEVELS.map((l,k)=>({id:'C'+(k+1),name:l.name})), ...P_LV.c];
  const tool=(id,need,label)=>`<button class="ptool${pDone(need)?'':' lock'}" data-tool="${id}">${pDone(need)?'':ico('lock',12)+' '}${label}${pDone(need)?'':`<small>${pName(need)} をクリアすると使えます</small>`}</button>`;
  return `<div class="phead"><div><div class="eyebrow">試作</div><h2>3本の道</h2></div><button class="iconbtn" id="pthClose" aria-label="閉じる">${P_X}</button></div>
    <p class="psub">どの道から進めてもかまいません。ほかの道の知識が要るレベルだけ、鍵がかかっています。</p>
    <div class="ptools">${tool('drum','R2','ドラムを打ち込む')}${tool('mel','M1','メロディを置く')}</div>
    <div class="pcols">${col('c','コード',C)}${col('r','リズム',P_LV.r)}${col('m','メロディ',P_LV.m)}</div>`;
}
function openPathMap(){ let el=$('pthMap'); if(!el){ el=document.createElement('div'); el.id='pthMap'; el.className='pthmap'; document.body.appendChild(el); }
  closeAll(); el.innerHTML=pthMapHTML(); el.hidden=false;
  $('pthClose').onclick=()=>el.hidden=true;
  el.querySelectorAll('.plv').forEach(b=>b.onclick=()=>{ const id=b.dataset.p;
    if(!pOpen(id)){ toast(`${pReq(id).filter(r=>!pDone(r)).map(pName).join('・')} をクリアすると挑戦できます`); return; }
    if(id[0]==='C'&&+id.slice(1)<=LEVELS.length){ el.hidden=true; startLevel(+id.slice(1), pDone(id)); return; }
    const l=P_ALL().find(x=>x.id===id); if(!l||!l.deck){ toast('このレベルは準備中です'); return; }
    el.hidden=true; openTutorial(pDeck(l)); });
  el.querySelectorAll('.ptool').forEach(b=>b.onclick=()=>{ const t=b.dataset.tool, need=t==='drum'?'R2':'M1';
    if(!pDone(need)){ toast(`${pName(need)} をクリアすると使えます`); return; }
    el.hidden=true; t==='drum'?openDrumEd():openMelEd(); });
}
// ほかの道への案内：あるレベルをクリアすると、新しく挑戦できるようになるレベル
const pAllIds=()=>[...LEVELS.map((_,k)=>'C'+(k+1)), ...P_ALL().map(l=>l.id)];
const pOpenSet=()=>pAllIds().filter(id=>!pDone(id)&&pOpen(id));
function pWillOpen(id){ const b=pOpenSet(), had=PD.done[id]; PD.done[id]=true; const a=pOpenSet(); if(!had) delete PD.done[id]; return a.filter(x=>!b.includes(x)&&x!==id); }
const pOpenedHTML=ids=>ids.length?`<div class="okcard recap plain a" style="--dl:.7"><b>新しく挑戦できるレベル</b>${ids.map(x=>`<span>・${pName(x)}「${(P_ALL().find(l=>l.id===x)||{name:(LEVELS[+x.slice(1)-1]||{}).name})['name']}」</span>`).join('')}</div>`:'';
// 案内のポップ（チュートリアルや吹き出しが閉じてから出す）
function pInvite(title,text,ids){ const w=setInterval(()=>{ if(TUT.on||!$('coach').hidden||!$('moodPop').hidden||$('pthMap')&&!$('pthMap').hidden) return; clearInterval(w);
  const el=document.createElement('div'); el.className='modalpop'; el.innerHTML=`<div class="popcard" role="dialog" aria-label="ほかの道の案内"><div class="popeyebrow">ほかの道</div><h2>${title}</h2><p>${text}</p>${pOpenedHTML(ids)}<div class="popbtns"><button class="alt" data-k="0">あとで</button><button data-k="1">地図を見る</button></div></div>`;
  document.body.appendChild(el); el.querySelectorAll('button').forEach(b=>b.onclick=()=>{ el.remove(); if(b.dataset.k==='1') openPathMap(); }); },500); }
// 道のレベルの解説：タイトル → 本編 → クリア
function pDeck(l){
  const d=[{html:()=>`<div class="eyebrow a">${pName(l.id)}</div><h2 class="a" style="--dl:.2">${l.name}</h2>${l.unlock?`<div class="okcard a lvtitle" style="--dl:.8"><b>クリア報酬</b><small>${l.unlock}</small></div>`:''}`},
    ...l.deck(),
    {last:true, btn:l.unlock?'使ってみる':'とじる', html:()=>`<div class="eyebrow a">${pName(l.id)} CLEAR</div><h2 class="a" style="--dl:.1">${l.name}　クリア！</h2>
      ${l.unlock?`<div class="okcard a" style="--dl:.5"><b>アンロック：${l.unlock}</b></div>`:''}${pOpenedHTML(pWillOpen(l.id))}<p class="a" style="--dl:.9">${l.unlock?'今の曲に重ねて、自由に作ってみましょう。':'地図から、次のレベルを選びましょう。'}</p>`,
     finish:()=>{ pLoopStop(); endTutorial(true); pClear(l.id); if(l.id==='R2') openDrumEd(); else if(l.id==='M1') openMelEd(); else openPathMap(); }}];
  d.onEnd=()=>{ pLoopStop(); endTutorial(true); };
  return d;
}

// ---------- 解説の中で鳴らす小さなループ（ドラムだけ） ----------
const PL={timer:null, pat:null, t:0, s:0, el:null};
function pLoopStop(){ clearInterval(PL.timer); PL.timer=null; if(PL.el){ PL.el.classList.remove('on'); PL.el.querySelectorAll('.now').forEach(e=>e.classList.remove('now')); } PL.el=null; }
function pLoopToggle(btn,pat){ const box=btn.closest('.pdemo'); if(PL.el===box){ pLoopStop(); return; } pLoopStop();
  ensureAudio(); ensureSounds(); PL.el=box; box.classList.add('on'); PL.pat=pat; PL.t=ctx.currentTime+.08; PL.s=0;
  const sd=60/96/4, cells=box.querySelectorAll('[data-s]');
  PL.timer=setInterval(()=>{ while(PL.t<ctx.currentTime+.12){ const s=PL.s%16, t=PL.t;
      for(const n in PL.pat) if(PL.pat[n][s]) drum(+n,t,PL.pat[n][s]);
      setTimeout(()=>{ if(PL.el!==box) return; cells.forEach(c=>c.classList.toggle('now',+c.dataset.s===s)); },Math.max(0,(t-ctx.currentTime)*1000));
      PL.s++; PL.t+=sd; } },25); }
// 解説から呼ぶ（スライドの HTML は文字列なので、ここに置く）
const PDEMO={};
const row16=(on,lab,cls='')=>`<div class="prow ${cls}">${lab?`<span>${lab}</span>`:''}${Array.from({length:16},(_,s)=>`<i data-s="${s}" class="${on[s]?'on':''}${s%4===0?' bt':''}"></i>`).join('')}</div>`;
function demoBox(key,rows,pat){ PDEMO[key]=pat; return `<div class="pdemo a" style="--dl:.6">${rows}<button class="chip main pplay" onclick="pLoopToggle(this,PDEMO['${key}'])">${ico('play',12)} 聴いてみる</button></div>`; }
const P8={36:[1,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0],38:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0],42:[.6,0,.4,0,.6,0,.4,0,.6,0,.4,0,.6,0,.4,0]};
const nz=a=>a.map(x=>x?1:0);
const R1_DECK=[
  {html:()=>`<h2 class="a">音楽には「拍」があります</h2><p class="a" style="--dl:.3">手拍子をするときの「1・2・3・4」が<b>拍</b>です。4つの拍で<b>1小節</b>になります。</p>
    ${demoBox('beat',row16([1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],''),{42:[1,0,0,0,.7,0,0,0,.8,0,0,0,.7,0,0,0]})}`},
  {html:()=>`<h2 class="a">1小節を16マスに分けます</h2><p class="a" style="--dl:.3">1つの拍を4つに分けると、1小節は<b>16マス</b>になります。太い線が拍の頭です。</p>
    ${demoBox('s16',row16(Array(16).fill(1),''),{42:Array.from({length:16},(_,s)=>s%4===0?.9:.4)})}
    <p class="a" style="--dl:1">リズムは、このマスのどこで音を鳴らすかで決まります。</p>`},
];
const R2_DECK=[
  {html:()=>`<h2 class="a">ドラムは3つで十分です</h2><p class="a" style="--dl:.3"><b>キック</b>（ドン）は土台、<b>スネア</b>（タン）はアクセント、<b>ハイハット</b>（チッ）はリズムを刻みます。</p>
    ${demoBox('k',row16(nz(P8[36]),'キック','k'),{36:P8[36]})}`},
  {html:()=>`<h2 class="a">スネアは 2拍目と4拍目</h2><p class="a" style="--dl:.3">「ドン・タン・ドドタン」。スネアを2拍目と4拍目に置くと、ノリが出ます。</p>
    ${demoBox('ks',row16(nz(P8[36]),'キック','k')+row16(nz(P8[38]),'スネア','s'),{36:P8[36],38:P8[38]})}`},
  {html:()=>`<h2 class="a">ハイハットで刻むと完成</h2><p class="a" style="--dl:.3">2マスおきにハイハットを入れると、いちばん基本の<b>8ビート</b>になります。</p>
    ${demoBox('all',row16(nz(P8[42]),'ハイハット','h')+row16(nz(P8[38]),'スネア','s')+row16(nz(P8[36]),'キック','k'),P8)}`},
];
// メロディ1：まだ習っていないこと（拍・コード）だけ、最初に短く説明する
const M1_PRE={
  R1:{html:()=>`<div class="eyebrow a">先にひとこと：拍</div><h2 class="a">音楽には「拍」があります</h2><p class="a" style="--dl:.3">手拍子の「1・2・3・4」が<b>拍</b>です。1つの拍を2つに分けたマスに、音を置いていきます。</p>
    ${demoBox('m1beat',row16([1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],''),{42:[1,0,0,0,.7,0,0,0,.8,0,0,0,.7,0,0,0]})}`},
  C1:{html:()=>`<div class="eyebrow a">先にひとこと：コード</div><h2 class="a">コードは、音の重なり</h2><p class="a" style="--dl:.3">いくつかの音をいっしょに鳴らした響きを<b>コード</b>といいます。曲の後ろでは、コードが順番に鳴っています。</p>`},
};
const m1Deck=()=>[...['R1','C1'].filter(id=>!pDone(id)).map(id=>M1_PRE[id]), ...M1_DECK];
const M1_DECK=[
  {html:()=>`<h2 class="a">コードをつくっている音</h2><p class="a" style="--dl:.3">コードをつくっている音を<b>構成音</b>といいます。たとえば「6m」の構成音は、<b>ラ・ド・ミ</b>の3つです。</p>
    <p class="a" style="--dl:.7">メロディは、この構成音を手がかりに作ります。</p>`},
  {html:()=>`<h2 class="a">メロディは「光る音」から</h2><p class="a" style="--dl:.3">メロディを置くマスでは、そのとき鳴っている<b>コードの音が光ります</b>。</p>
    <div class="pdemo a" style="--dl:.6"><div class="mdemo">${['ラ','ソ','ミ','レ','ド'].map((n,k)=>`<div class="mrow"><span>${n}</span>${Array.from({length:8},(_,s)=>`<i class="${[0,2,4].includes(k)?'lit':''}${s%2===0?' bt':''}"></i>`).join('')}</div>`).join('')}</div><small>コードが「6m」のとき：ラ・ド・ミが光る</small></div>`},
  {html:()=>`<h2 class="a">拍の頭は、光る音に</h2><p class="a" style="--dl:.3">拍の頭（太い線）に<b>光っている音</b>を置くと、メロディが落ち着きます。</p>
    <p class="a" style="--dl:.7">間のマスは、どの音でもかまいません。並んでいる音はどれも外れにくい音です。</p>`},
];

// ---------- 打ち込み画面（下から出るシート） ----------
function pSheet(id,title,body){ let el=$(id); if(!el){ el=document.createElement('div'); el.id=id; el.className='sheet psheet'; document.body.appendChild(el); }
  el.innerHTML=`<h2>${title}<button class="iconbtn" data-x aria-label="閉じる">${P_X}</button></h2>${body}`;
  closeAll(); requestAnimationFrame(()=>{ el.classList.add('on'); scrim.classList.add('on'); });
  const shut=()=>{ el.classList.remove('on'); scrim.classList.remove('on'); scrim.removeEventListener('click',shut); };
  el.querySelector('[data-x]').onclick=shut; scrim.addEventListener('click',shut);
  return el; }
const playChip=()=>`<button class="chip main" data-play>${ico(playing?'stop':'play',12)} ${playing?'止める':'曲を再生'}</button>`;
const hookPlay=el=>{ const b=el.querySelector('[data-play]'); if(b) b.onclick=()=>{ $('play').click(); setTimeout(()=>{ b.outerHTML=playChip(); hookPlay(el); },60); }; };

const DR_ROWS=[[42,'ハイハット','h'],[38,'スネア','s'],[36,'キック','k']];
function openDrumEd(){
  const draw=()=>{ const v=PD.drum.v;
    el.querySelector('.pgrid').innerHTML=DR_ROWS.map(([n,lab,c])=>`<div class="prow big ${c}"><span>${lab}</span>${v[n].map((x,s)=>`<i data-n="${n}" data-s="${s}" class="${x?'on':''}${s%4===0?' bt':''}"></i>`).join('')}</div>`).join('');
    el.querySelectorAll('.pgrid i').forEach(c=>c.onclick=()=>{ const n=+c.dataset.n, s=+c.dataset.s; v[n][s]=v[n][s]?0:1; if(v[n][s]){ ensureAudio(); ensureSounds(); drum(n,ctx.currentTime+.01,1); } pthSave(); draw(); });
    el.querySelector('[data-on]').setAttribute('aria-pressed',PD.drum.on); };
  const el=pSheet('pDrumEd','ドラムを打ち込む',`<p class="small">マスをタップして音を置きます。1小節を、曲のあいだくり返します。</p>
    <div class="pgrid"></div>
    <div class="chips"><button class="chip" data-on aria-pressed="false">曲のドラムをこれにする</button>${playChip()}</div>
    <div class="chips"><button class="chip" data-pre="8">8ビートを入れる</button><button class="chip" data-pre="0">ぜんぶ消す</button></div>`);
  el.querySelector('[data-on]').onclick=()=>{ PD.drum.on=!PD.drum.on; pthSave(); draw(); toast(PD.drum.on?'曲のドラムを、打ち込んだドラムにしました':'もとの伴奏のドラムに戻しました'); };
  el.querySelectorAll('[data-pre]').forEach(b=>b.onclick=()=>{ const p=b.dataset.pre==='8'; DR_ROWS.forEach(([n])=>PD.drum.v[n]=p?nz(P8[n]):Array(16).fill(0)); if(p) PD.drum.on=true; pthSave(); draw(); });
  hookPlay(el); draw();
}

// メロディ：キーのペンタトニック（ド・レ・ミ・ソ・ラ）を2オクターブ。8分のマス（16分の位置で偶数だけ）
const PENT=[0,2,4,7,9,12,14,16,19,21], PENT_NM=['ド','レ','ミ','ソ','ラ'];
const melBase=()=>{ const pc=keyObj().pc; return 72+(pc>5?pc-12:pc); };
const melPitch=r=>melBase()+PENT[r];
function chordPcsAt(g){ const L=slotSteps(), i=Math.floor(g/L), off=g%L, c=cellsOf(i).find(x=>off>=x.off&&off<x.off+x.len);
  if(!c||c.v==null) return null; const sp=specOf(c.v), r=(keyObj().pc+sp.o)%12; return (QUAL[sp.q]||[0,4,7]).map(x=>(r+x)%12); }
const melLen=g=>{ const T=state.bars*slotSteps(); let k=2; while(k<4 && g+k<T && PD.mel.n[g+k]==null) k+=2; return k; };   // 次の音まで（長くても1拍）
function openMelEd(){
  const T=state.bars*slotSteps(), cols=T/2;
  const draw=()=>{ const kp=keyObj().pc, rows=PENT.map((_,r)=>r).reverse();
    el.querySelector('.mgrid').innerHTML=`<div class="mlab">${rows.map(r=>`<span>${PENT_NM[r%5]}${r>=5?'<sup>↑</sup>':''}</span>`).join('')}</div><div class="mscroll"><div class="mcols" style="--n:${cols}">${
      Array.from({length:cols},(_,c)=>{ const g=c*2, pcs=chordPcsAt(g)||[];
        return `<div class="mcol${g%16===0?' bar':g%4===0?' bt':''}">${rows.map(r=>{ const lit=pcs.includes((kp+PENT[r])%12), on=PD.mel.n[g]===r;
          return `<i data-g="${g}" data-r="${r}" class="${lit?'lit':''}${on?' on':''}"></i>`; }).join('')}</div>`; }).join('')}</div></div>`;
    el.querySelectorAll('.mgrid i').forEach(c=>c.onclick=()=>{ const g=+c.dataset.g, r=+c.dataset.r;
      if(PD.mel.n[g]===r) delete PD.mel.n[g]; else { PD.mel.n[g]=r; ensureAudio(); loadSet('glock'); keyTone(melPitch(r),ctx.currentTime+.01,.3,.8,'glock'); }
      PD.mel.on=true; pthSave(); const sc=el.querySelector('.mscroll').scrollLeft; draw(); el.querySelector('.mscroll').scrollLeft=sc; });
    el.querySelector('[data-on]').setAttribute('aria-pressed',PD.mel.on); };
  const el=pSheet('pMelEd','メロディを置く',`<p class="small">光っているのは、そのとき鳴っているコードの音です。拍の頭（太い線）は光る音にすると落ち着きます。</p>
    <div class="mgrid"></div>
    <div class="chips"><button class="chip" data-on aria-pressed="false">メロディを鳴らす</button>${playChip()}<button class="chip" data-clr>ぜんぶ消す</button></div>`);
  el.querySelector('[data-on]').onclick=()=>{ PD.mel.on=!PD.mel.on; pthSave(); draw(); };
  el.querySelector('[data-clr]').onclick=()=>{ PD.mel.n={}; pthSave(); draw(); };
  hookPlay(el); loadSet('glock'); draw();
}

// ---------- 再生に重ねる ----------
const _pthStep=scheduleStep;
scheduleStep=function(g,t){
  const live=!TUT.on && !CAPTURE && !LIB.bk && !ENDED_EARLY;
  if(live && PD.mel.on && pDone('M1')){ const r=PD.mel.n[g]; if(r!=null) keyTone(melPitch(r),t,melLen(g)*stepDur()*.92,.8,'glock'); }
  if(!(live && PD.drum.on && pDone('R2'))) return _pthStep(g,t);
  const o=state.drum; DRUMS.__pth={name:'打ち込んだドラム', V:PD.drum.v, bass:(DRUMS[o]||{}).bass}; state.drum='__pth';   // この1マスのあいだだけ差しかえる
  try{ return _pthStep(g,t); } finally { state.drum=o; delete DRUMS.__pth; }
};
// 設定メニューのレベル一覧から開くときも、ほかの道の鍵を守る
const _pthStart=startLevel;
startLevel=function(n,review){ const miss=pReq('C'+n).filter(r=>r[0]!=='C'&&!pDone(r));
  if(!review && miss.length && MODE!=='free'){ toast(`${miss.map(pName).join('・')} をクリアすると挑戦できます`); openPathMap(); return; }
  return _pthStart.apply(this,arguments); };
// コードのレベルをクリアしたとき：ほかの道で新しく開いたレベルを案内する。レベル3のあとは、リズム・メロディの道へ誘う（1回だけ）
const _pthClear=levelClear;
levelClear=function(n){ const b=pOpenSet(), r=_pthClear.apply(this,arguments), opened=pOpenSet().filter(x=>!b.includes(x)&&x[0]!=='C');
  if(n===3 && !PD.inv3){ PD.inv3=true; pthSave(); pInvite('リズムとメロディの道もあります','コードの道と同じように、好きなところから進められます。ドラムやメロディを自分で作れるようになります。',pOpenSet().filter(x=>x[0]!=='C')); }
  else if(opened.length) pInvite('ほかの道のレベルが開きました','',opened);
  return r; };
// 説明のスライドを切り替えたときは、小さなループも止める
const _pthTutStop=tutStopAudio; tutStopAudio=function(){ pLoopStop(); return _pthTutStop.apply(this,arguments); };

// 設定メニューの「レベル」に、地図への入口を足す
(()=>{ const acc=$('lvAcc'); if(!acc) return; const b=document.createElement('button'); b.className='lvnext pthbtn'; b.style.marginTop='8px';
  b.innerHTML='<i>試作</i><b>3本の道（コード・リズム・メロディ）</b><small>好きな道からレベルを進められます</small>'; b.onclick=openPathMap; acc.after(b); })();
