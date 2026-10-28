// ベータ版だけ（試作）：コード・リズム・メロディの3本の道
// ・3本の道の地図（どの道から進めてもよい。ほかの道の知識が要るレベルだけ鍵がかかる）
// ・リズム R1・R2、メロディ M1〜M4 の解説
// ・ドラムの打ち込み（R2 クリアで開く）とメロディの打ち込み（M1 で7音、M2 で5音、M3 でガイド、M4 でコードの音が光る）。今の曲に重ねて鳴らす
// 進み具合と打ち込んだものは、曲の保存とは別に STK('chord-palette-paths') に保存する
const PTH_KEY=STK('chord-palette-paths');
const PD=(()=>{ let d={}; try{ d=JSON.parse(localStorage.getItem(PTH_KEY))||{}; }catch(e){} return d; })();
PD.done=PD.done||{};
PD.drum=PD.drum||{on:false, v:{36:Array(16).fill(0),38:Array(16).fill(0),42:Array(16).fill(0)}};
PD.mel=PD.mel||{on:false};   // notes：[{st：16分の位置, r：行（ペンタトニックの何番目か）, len：16分いくつ}]
if(!PD.mel.notes){ const o=PD.mel.n||{}, ks=Object.keys(o).map(Number).sort((a,b)=>a-b); PD.mel.notes=ks.map((g,i)=>({st:g, r:o[g], len:Math.min(4,(ks[i+1]??g+4)-g)})); delete PD.mel.n; }   // 前の形（マス→行）から読みかえ
const P_X='<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const pthSave=()=>{ try{ localStorage.setItem(PTH_KEY,JSON.stringify(PD)); }catch(e){} };

// ---------- 3本の道 ----------
const P_LV={
  r:[{id:'R1',name:'拍と小節',req:[],deck:()=>R1_DECK},
     {id:'R2',name:'ドラムの3つの役割',unlock:'ドラムの打ち込み',req:['R1'],deck:()=>R2_DECK}],
  m:[{id:'M1',name:'音階',unlock:'メロディの打ち込み（7つの音）',req:[],deck:()=>M1_DECK},
     {id:'M2',name:'五つの音階',unlock:'5つの音だけで置く',req:['M1'],deck:()=>[...mPre(['C1']),...M2_DECK]},
     {id:'M3',name:'滑らかなメロディ',unlock:'メロディガイド',req:['M2'],deck:()=>M3_DECK},
     {id:'M4',name:'光る音に置く',unlock:'コードの音を光らせる',req:['M3'],deck:()=>[...mPre(['C1']),...M4_DECK]}],
  c:[],   // 今のレベル1〜9のあとに足すコードのレベル（まだない）
};
const P_NAME={C:'コード',R:'リズム',M:'メロディ'};
const pName=id=>`${P_NAME[id[0]]} ${id.slice(1)}`;
// 「すべての機能で始める」では、どの道のレベルもクリア済みとして扱う（鍵や案内を出さない）
const pDone=id=> MODE==='free' || id[0]==='C' ? UL()>=+id.slice(1) : !!PD.done[id];
const C_EXTRA={7:['M4']};   // コード7（分数コード）は、構成音をメロディ4で習ってから
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
  const tool=(id,need,label)=>`<button class="pthtool${pDone(need)?'':' lock'}" data-tool="${id}">${pDone(need)?'':ico('lock',12)+' '}${label}${pDone(need)?'':`<small>${pName(need)} をクリアすると使えます</small>`}</button>`;
  return `<div class="phead"><div><div class="eyebrow">試作</div><h2>3本の道</h2></div><button class="iconbtn" id="pthClose" aria-label="とじる">${P_X}</button></div>
    <p class="psub">どの道から進めてもかまいません。ほかの道の知識が要るレベルだけ、鍵がかかっています。</p>
    <div class="pthtools">${tool('drum','R2','ドラムを打ち込む')}${tool('mel','M1','メロディを置く')}</div>
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
  el.querySelectorAll('.pthtool').forEach(b=>b.onclick=()=>{ const t=b.dataset.tool, need=t==='drum'?'R2':'M1';
    if(!pDone(need)){ toast(`${pName(need)} をクリアすると使えます`); return; }
    el.hidden=true; setMode(t==='drum'?'r':'m'); });
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
function pDeck(l){ if(l.id[0]==='M'){ ensureAudio(); melLoad(); }
  const d=[{html:()=>`<div class="eyebrow a">${pName(l.id)}</div><h2 class="a" style="--dl:.2">${l.name}</h2>${l.unlock?`<div class="okcard a lvtitle" style="--dl:.8"><b>クリア報酬</b><small>${l.unlock}</small></div>`:''}`},
    ...l.deck(),
    {last:true, btn:l.unlock?'使ってみる':'とじる', html:()=>`<div class="eyebrow a">${pName(l.id)} CLEAR</div><h2 class="a" style="--dl:.1">${l.name}　クリア！</h2>
      ${l.unlock?`<div class="okcard a" style="--dl:.5"><b>アンロック：${l.unlock}</b></div>`:''}${pOpenedHTML(pWillOpen(l.id))}<p class="a" style="--dl:.9">${l.unlock?'今の曲に重ねて、自由に作ってみましょう。':'地図から、次のレベルを選びましょう。'}</p>`,
     finish:()=>{ pLoopStop(); endTutorial(true); pClear(l.id); drawModeSw(); if(l.id==='R2') setMode('r'); else if(l.id[0]==='M') setMode('m'); else openPathMap(); }}];
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
// まだ習っていないこと（拍・コード）を、レベルの最初に短く説明する
const M_PRE={
  R1:{html:()=>`<div class="eyebrow a">先にひとこと：拍</div><h2 class="a">音楽には「拍」があります</h2><p class="a" style="--dl:.3">手拍子の「1・2・3・4」が<b>拍</b>です。1つの拍を2つに分けたマスに、音を置いていきます。</p>
    ${demoBox('m1beat',row16([1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0],''),{42:[1,0,0,0,.7,0,0,0,.8,0,0,0,.7,0,0,0]})}`},
  C1:{html:()=>`<div class="eyebrow a">先にひとこと：コード</div><h2 class="a">コードは、音の重なり</h2><p class="a" style="--dl:.3">いくつかの音をいっしょに鳴らした響きを<b>コード</b>といいます。曲の後ろでは、コードが順番に鳴っています。</p>`},
};
const mPre=ids=>ids.filter(id=>!pDone(id)).map(id=>M_PRE[id]);
// 解説の中で鳴らす：12の音の鍵盤（タップで鳴る）と、メロディだけの短いフレーズ
const KB12=[0,1,2,3,4,5,6,7,8,9,10,11], BLACK=new Set([1,3,6,8,10]);
const kb12=(mark=[],lab=true)=>`<div class="kb12 a" style="--dl:.5">${KB12.map(o=>`<button class="${BLACK.has(o)?'kbb':'kbw'}${mark.includes(o)?' mk':''}" onclick="melHear(${o})">${lab&&DO_NM[o]?`<small>${DO_NM[o]}</small>`:''}</button>`).join('')}</div>`;
const PMEL={};
function pMelDemo(btn,key){ ensureAudio(); melLoad(); const t0=ctx.currentTime+.1, sd=60/100/4; PMEL[key].forEach(([st,o,len])=>keyTone(melPitch(o),t0+st*sd,len*sd*.92,.8,melInst())); btn.classList.add('on'); setTimeout(()=>btn.classList.remove('on'),(Math.max(...PMEL[key].map(n=>n[0]+n[2]))*sd+.3)*1000); }
const melBtn=(key,notes,lab='聴いてみる')=>{ PMEL[key]=notes; return `<button class="chip main pplay a" style="--dl:.8" onclick="pMelDemo(this,'${key}')">${ico('play',12)} ${lab}</button>`; };
const degRow=(os,sub=true)=>`<div class="degrow a" style="--dl:.5">${os.map(o=>`<span>${melLab(o)}${sub?`<small>${DO_NM[o%12]}</small>`:''}</span>`).join('')}</div>`;
// コードと合わせて聴くお手本（進行は 1・5・6m・4。mel：[16分の位置, キーの1から何半音上か, 長さ]）
const MEX=(key,mel)=>{ EX[key]={degs:[0,4,5,3], mel:mel.map(([st,o,len])=>({st,o,len}))}; return listenBtn(key); };
const M_FASI=[[0,5,8],[8,11,8],[16,12,8],[24,5,8],[32,11,8],[40,5,8],[48,11,16]];
const M_PENTA=[[0,4,8],[8,7,8],[16,2,8],[24,7,8],[32,9,8],[40,4,8],[48,9,16]];
const M_JUMP=[[0,0,2],[2,16,2],[4,2,2],[6,19,2],[8,0,2],[10,14,2],[12,7,4],[16,2,2],[18,19,2],[20,7,2],[22,21,2],[24,0,2],[26,16,2],[28,14,4],[32,21,2],[34,4,2],[36,16,2],[38,0,2],[40,19,2],[42,9,2],[44,16,4],[48,0,2],[50,14,2],[52,9,4],[56,0,8]];
const M_STEP=[[0,4,2],[2,2,2],[4,0,2],[6,2,2],[8,4,2],[10,4,2],[12,4,4],[16,2,2],[18,2,2],[20,2,4],[24,4,2],[26,7,2],[28,7,4],[32,4,2],[34,2,2],[36,0,2],[38,2,2],[40,4,2],[42,4,2],[44,4,4],[48,2,2],[50,2,2],[52,4,2],[54,2,2],[56,0,8]];
const M_LEAP=[[0,0,4],[4,4,4],[8,7,4],[12,12,4],[16,7,4],[20,4,2],[22,2,2],[24,4,8],[32,12,4],[36,9,4],[40,7,4],[44,4,4],[48,7,4],[52,2,4],[56,0,8]];
const M1_DECK=[
  {html:()=>`<h2 class="a">音は、12個あります</h2><p class="a" style="--dl:.3">ピアノの白と黒の鍵盤をあわせて、<b>12個</b>。その先は、同じ並びのくり返しです。</p>${kb12([],false)}<p class="sub a" style="--dl:.9">鍵盤をタップすると鳴らせます。</p>`},
  {html:()=>`<h2 class="a">ドレミファソラシを抜き取る</h2><p class="a" style="--dl:.3">ここから<b>『ドレミファソラシ』</b>だけを抜き取ってみましょう。</p>${kb12([0,2,4,5,7,9,11])}${melBtn('scale',[[0,0,2],[2,2,2],[4,4,2],[6,5,2],[8,7,2],[10,9,2],[12,11,2],[14,12,6]],'ドレミを聴く')}`},
  {html:()=>`<h2 class="a">これが「音階」です</h2><p class="a" style="--dl:.3">このように、音を雰囲気に沿って抜き取って、<b>低い順に並べたもの</b>を<b>音階</b>といいます。</p>
    <p class="a" style="--dl:.7">ドレミは明るい音階として知られていて、ほかにもさまざまな音階があります。メロディは、基本的にこのドレミの音階をもとに作ります。</p>`},
  {html:()=>`<h2 class="a">数字で呼びましょう</h2><p class="a" style="--dl:.3">『ドレミ』という呼び方は本質的ではないので、<b>数字</b>にしてしまいましょう。</p>${degRow([0,2,4,5,7,9,11])}
    <p class="a" style="--dl:.9">キーを変えても、数字はそのまま使えます。コードの数字と区別するため、メロディの数字は<b>丸で囲みます</b>。</p>`},
];
const M2_DECK=[
  {html:()=>`<h2 class="a">こんなメロディを作ってみました</h2><p class="a" style="--dl:.3">コードと合わせて聴いてみましょう。</p>${MEX('melFaSi',M_FASI)}<p class="a" style="--dl:1.2">なんか、しっくりきませんね…。</p>`},
  {html:()=>`<h2 class="a">近すぎる音は、濁ります</h2><p class="a" style="--dl:.3">実は、音と音の間が近すぎると、きれいに響きません。</p>${kb12([4,5,11])}
    <p class="a" style="--dl:.9">とくに<b>${melLab(5)}（ファ）</b>と<b>${melLab(11)}（シ）</b>は、${melLab(4)}（ミ）や${melLab(0)}（ド）との間に一音もないので、音が濁りやすいのです。</p>`},
  {html:()=>`<h2 class="a">この2つをなくしてしまいましょう</h2>${degRow([0,2,4,7,9])}<p class="a" style="--dl:.7">5つの音だけにすると、音がぶつからずに、きれいなメロディになります。</p>${MEX('melPenta',M_PENTA)}`},
];
const M3_DECK=[
  {html:()=>`<h2 class="a">今度はこんなメロディ</h2>${MEX('melJump',M_JUMP)}<p class="a" style="--dl:1.2">これはこれでかっこいいですが、歌いにくいですね…。</p>`},
  {html:()=>`<h2 class="a">となりの音へ、順々に</h2><p class="a" style="--dl:.3">音は、<b>となりの音へ順々に</b>移動するようにしてみましょう。</p>${MEX('melStep',M_STEP)}`},
  {html:()=>`<h2 class="a">跳ぶなら ${melLab(0)}${melLab(4)}${melLab(7)} どうし</h2><p class="a" style="--dl:.3">音を跳ぶときは、<b>${melLab(0)}・${melLab(4)}・${melLab(7)}（ドミソ）</b>のどれかから、どれかへ跳ぶと、違和感なく跳べます。</p>${MEX('melLeap',M_LEAP)}`},
  {html:()=>`<h2 class="a">跳ぶのは、ほどほどに</h2><p class="a" style="--dl:.3">音を跳ばすと、インパクトや躍動感のあるメロディを作れます。でも、跳ばしすぎるとしつこくなります。</p>
    <p class="a" style="--dl:.7">作りたい曲調に合わせて調整しましょう。メロディの画面に、次に行ける音を色で教える<b>メロディガイド</b>が出るようになります。</p>`},
];
const M4_DECK=[
  {html:()=>`<h2 class="a">コードをつくっている音</h2><p class="a" style="--dl:.3">コードをつくっている音を<b>構成音</b>といいます。たとえば「1」のコードの構成音は、<b>${melLab(0)}・${melLab(4)}・${melLab(7)}（ド・ミ・ソ）</b>の3つです。</p>
    <p class="a" style="--dl:.7">メロディは、この構成音を手がかりに作ります。</p>`},
  {html:()=>`<h2 class="a">メロディは「光る音」から</h2><p class="a" style="--dl:.3">メロディを置くマスでは、そのとき鳴っている<b>コードの音が光ります</b>。</p>
    <div class="pdemo a" style="--dl:.6"><div class="mdemo">${[9,7,4,2,0].map(o=>`<div class="mrow"><span>${melLab(o)}</span>${Array.from({length:8},(_,s)=>`<i class="${[9,4,0].includes(o)?'lit':''}${s%2===0?' bt':''}"></i>`).join('')}</div>`).join('')}</div><small>コードが「6m」のとき：${melLab(9)}・${melLab(0)}・${melLab(4)} が光る</small></div>`},
  {html:()=>`<h2 class="a">拍の頭は、光る音に</h2><p class="a" style="--dl:.3">拍の頭（太い線）に<b>光っている音</b>を置くと、メロディが落ち着きます。</p>
    <p class="a" style="--dl:.7">レベル3の「${melLab(0)}${melLab(4)}${melLab(7)}どうしなら跳べる」も、ほかのコードの上では「光る音どうし」と考えると、もっと自然になります。</p>`},
];

// ---------- コード・リズム・メロディの画面の切り替え（メイン画面の上のレバー） ----------
// リズム・メロディの画面は、パレットの場所に出す（スマホではマスと演奏の帯も隠す。PC では右側のマス・帯はそのまま）
PD.mode=PD.mode||'c';
const MODES=[['c','コード'],['r','リズム'],['m','メロディ']];
const MODE_NEED={r:'R2',m:'M1'};
function buildModeSw(){ if($('modeSw')) return; const top=document.querySelector('.app>.top'); if(!top) return;
  const sw=document.createElement('div'); sw.id='modeSw'; sw.className='modesw'; sw.setAttribute('role','tablist'); top.insertBefore(sw,top.querySelector('.badges'));
  const pn=document.createElement('div'); pn.id='modePanel'; pn.className='modepanel'; $('palette').after(pn); }
function drawModeSw(){ const sw=$('modeSw'); if(!sw) return;
  sw.innerHTML=MODES.map(([k,lab])=>`<button role="tab" data-m="${k}" aria-selected="${PD.mode===k}">${MODE_NEED[k]&&!pDone(MODE_NEED[k])?ico('lock',11)+' ':''}${lab}</button>`).join('');
  sw.querySelectorAll('button').forEach(b=>b.onclick=()=>setMode(b.dataset.m)); }
function setMode(k){ buildModeSw(); PD.mode=k; pthSave(); closeAll(); const pm=$('pthMap'); if(pm) pm.hidden=true;
  document.body.classList.toggle('mode-r',k==='r'); document.body.classList.toggle('mode-m',k==='m');
  drawModeSw(); drawPanel(); if(k==='c') renderAll(); else buildMenu(); histBtns(); }
function drawPanel(){ const el=$('modePanel'); if(!el) return; const k=PD.mode;
  if(k==='c'){ el.innerHTML=''; return; }
  if(!pDone(MODE_NEED[k])){ const need=(k==='r'?['R1','R2']:['M1']).find(x=>!pDone(x)), l=P_ALL().find(x=>x.id===need);
    el.innerHTML=`<div class="mlock">${ico('lock',22)}<h2>${k==='r'?'ドラムを自分で作る画面です':'メロディを自分で作る画面です'}</h2>
      <p>${k==='r'?'リズムの道のレベル1・2':'メロディの道のレベル1'}をクリアすると使えます。</p>
      <button class="chip main" data-go>${pName(need)}「${l.name}」をはじめる</button><button class="chip" data-map>3本の道の地図を見る</button></div>`;
    el.querySelector('[data-go]').onclick=()=>openTutorial(pDeck(l)); el.querySelector('[data-map]').onclick=openPathMap; return; }
  k==='r' ? drawRhy(el) : drawMel(el); }

const DR_ROWS=[[42,'ハイハット','h'],[38,'スネア','s'],[36,'キック','k']];
// 1小節を1段のまま、画面の幅に収める（スクロールしない。マスは縦に大きく）
function drawRhy(el){ const v=PD.drum.v, sc0=el.querySelector('.pdscroll'), x0=sc0?sc0.scrollLeft:0;
  el.innerHTML=`<div class="mphead"><b>ドラム</b><small>マスをタップして音を置きます。この1小節を、曲のあいだくり返します。</small></div>
    <div class="droll">
      <div class="pdscroll"><div class="pgrid dgrid"><div class="dbeats">${[1,2,3,4].map(b=>`<b>${b}拍</b>`).join('')}</div>${DR_ROWS.map(([n,lab,c])=>`<div class="prow big ${c}">${v[n].map((x,s)=>`<i data-n="${n}" data-s="${s}" class="${x?'on':''}${s%4===0?' bt':''}"></i>`).join('')}</div>`).join('')}</div></div>
      <div class="dleg">${DR_ROWS.map(([n,lab,c])=>`<span class="${c}"><i></i>${lab}</span>`).join('')}</div></div>
    ${pBar('r')}`;
  el.querySelector('.pdscroll').scrollLeft=x0;
  el.querySelectorAll('.pgrid i').forEach(c=>c.onclick=()=>{ const n=+c.dataset.n, s=+c.dataset.s; v[n][s]=v[n][s]?0:1; if(v[n][s]){ ensureAudio(); ensureSounds(); drum(n,ctx.currentTime+.01,1); } pthSave(); drawRhy(el); });
  pBarBind(el,'r');
}
function drumPreset(p){ DR_ROWS.forEach(([n])=>PD.drum.v[n]=p?nz(P8[n]):Array(16).fill(0)); if(p) PD.drum.on=true; pthSave(); drawPanel(); }

// リズム・メロディの画面の下：鳴らし方の切り替え・楽器（コードの画面と同じ選び方）・次のレベル
const pNextLv=k=>P_LV[k].find(l=>!pDone(l.id));
function pBar(k){ const r=k==='r', on=r?!!PD.drum.on:PD.mel.follow!==false, ik=r?state.kit:melInst(), nx=pNextLv(k);
  const nm=r?(KITS[ik]||ik):(INSTS[ik]||ik), ic=r?icoKit(ik):icoInst(ik);
  return `<div class="pthbar"><div class="pbtns">
      <button class="pswitch" data-sw aria-pressed="${on}"><i></i><span>${r?'打ち込んだドラムで鳴らす':'鳴っている所を追いかける'}</span></button>
      <button class="pinst" data-inst><span class="pico">${ic}</span><span><small>${r?'ドラムの音':'メロディの楽器'}</small><b>${nm}</b></span></button></div>
    ${nx?`<button class="lvbig pnext" data-nx="${nx.id}"><small>NEXT</small><b>${pName(nx.id).replace(/^\S+ /,'LEVEL ')}</b><span>${nx.name}</span></button>`:''}</div>`; }
function melPick(){ const o0=melInst(); openPicker('楽器を選ぶ', ()=>catsOf(INST_GROUPS,INSTS,icoInst), o0, v=>{ PD.mel.inst=v; pthSave(); ensureAudio(); melLoad(); setTimeout(()=>melHear(7),150); drawPanel(); });
  PICK.pRevert=()=>{ PD.mel.inst=o0; pthSave(); drawPanel(); }; }
function pBarBind(el,k){ const r=k==='r';
  el.querySelector('[data-sw]').onclick=()=>{ if(r){ PD.drum.on=!PD.drum.on; toast(PD.drum.on?'曲のドラムを、打ち込んだドラムにしました':'もとの伴奏のドラムに戻しました'); } else PD.mel.follow=PD.mel.follow===false; pthSave(); drawPanel(); };
  el.querySelector('[data-inst]').onclick=()=>{
    if(r) return openPicker('ドラムの音を選ぶ', ()=>catsOf(KIT_GROUPS,KITS,icoKit), state.kit, v=>{ pickKit(v); drawPanel(); });
    melPick(); };
  const nb=el.querySelector('[data-nx]'); if(nb) nb.onclick=()=>{ const l=P_ALL().find(x=>x.id===nb.dataset.nx);
    if(!l.deck) return toast('このレベルは準備中です'); if(!pOpen(l.id)) return toast(`${pReq(l.id).filter(x=>!pDone(x)).map(pName).join('・')} をクリアすると挑戦できます`);
    openTutorial(pDeck(l)); }; }
// 楽器えらびの「キャンセル」で、メロディの楽器ももとに戻す
{ const _pb=$('pickBack').onclick; $('pickBack').onclick=function(){ const f=PICK&&PICK.cur!==PICK.cur0&&PICK.pRevert; const r=_pb.apply(this,arguments); if(f) f(); return r; }; }

// メロディ：音は「キーの1（ド）から何半音上か」（o）で持つ。キーを変えても同じメロディになる
// 行は、メロディ1をクリアすると音階の7音（1〜7と、上の1〜3）、メロディ2のあとは5音（1・2・3・5・6 を2オクターブ）
const PENT=[0,2,4,7,9,12,14,16,19,21], MAJ=[0,2,4,5,7,9,11,12,14,16];
const melFive=()=>pDone('M2') && PD.mel.five!==false;
const melRows=()=>melFive()?PENT:MAJ;
const DEG7={0:1,2:2,4:3,5:4,7:5,9:6,11:7}, DO_NM={0:'ド',2:'レ',4:'ミ',5:'ファ',7:'ソ',9:'ラ',11:'シ'};
const melDeg=o=>DEG7[((o%12)+12)%12]||'';
const melLab=o=>`<i class="mdeg">${melDeg(o)}</i>${o>=12?'<sup>↑</sup>':''}`;   // コードの数字と区別するため、丸で囲む
const melBase=()=>{ const pc=keyObj().pc; return 60+(pc>5?pc-12:pc); };   // 1〜6↑ ＝ C4〜A5（歌の高さ）
// メロディの楽器（鉄琴は倍音が濁ってずれて聞こえるので使わない）
PD.mel.inst=INSTS[PD.mel.inst]?PD.mel.inst:'sax';   // アプリの楽器ならどれでも
const melInst=()=>PD.mel.inst, melLoad=()=>{ if(!CHIP_V[melInst()]) loadSet(SETOF(melInst())); };
const melPitch=o=>melBase()+o;
PD.mel.notes.forEach(n=>{ if(n.o==null){ n.o=PENT[n.r]??0; delete n.r; } });   // 前の形（行の番号）から読みかえ
// 今の行にない音は、すぐ下の行の音へ（5音にしたとき：4→3、7→6）
function melSnapRows(){ const R=melRows(); PD.mel.notes.forEach(n=>{ if(R.includes(n.o)) return; const lo=R.filter(x=>x<=n.o); n.o=lo.length?lo[lo.length-1]:R[0]; }); }
function cellAt(g){ const L=slotSteps(), i=Math.floor(g/L), off=g%L; return cellsOf(i).find(x=>off>=x.off&&off<x.off+x.len); }
// ---- メロディの編集（PRO の演奏の編集画面と同じ考え方の、小さなピアノロール） ----
// ・空いているマスをタップ：音を置く（長さは前に置いた音と同じ）　・音をタップ：消す
// ・音をドラッグ：動かす（左右＝タイミング、上下＝高さ）　・音の右はしをドラッグ：長さを変える
// ・同じときに鳴るのは1音だけ（歌と同じ）。重なった音は消える
const MU={cw:16, G:2, last:2, hist:[], fut:[]};   // hist・fut：もとに戻す・やり直す（下の ↶ ↷ ボタン）   // cw：16分1つの幅　G：マス目（2＝8分、1＝16分）　last：前に置いた音の長さ
PD.mel.guide=PD.mel.guide!==false;
const melT=()=>state.bars*slotSteps();
const melSnap=s=>{ MU.hist.push(s||JSON.stringify(PD.mel.notes)); if(MU.hist.length>40) MU.hist.shift(); MU.fut=[]; };
function melUndo(dir){ const from=dir<0?MU.hist:MU.fut, to=dir<0?MU.fut:MU.hist, x=from.pop(); if(x==null) return; to.push(JSON.stringify(PD.mel.notes)); PD.mel.notes=JSON.parse(x); melSnapRows(); pthSave(); drawPanel(); }
function melClear(){ if(!PD.mel.notes.length) return; melSnap(); PD.mel.notes=[]; pthSave(); drawPanel(); toast('メロディをぜんぶ削除しました（↶で戻せます）'); }
function melTidy(keep){ const T=melT(); let ns=PD.mel.notes.filter(n=>n.st>=0&&n.st<T);
  ns.forEach(n=>n.len=Math.max(1,Math.min(n.len,T-n.st)));
  if(keep) ns=ns.filter(n=>n===keep || n.st+n.len<=keep.st || n.st>=keep.st+keep.len);   // 動かした音と重なる音は消す
  ns.sort((a,b)=>a.st-b.st); ns.forEach((n,i)=>{ const nx=ns[i+1]; if(nx && n.st+n.len>nx.st) n.len=Math.max(1,nx.st-n.st); });
  PD.mel.notes=ns; }
const melHear=o=>{ ensureAudio(); melLoad(); keyTone(melPitch(o),ctx.currentTime+.01,.32,.8,melInst()); };
// メロディガイド（メロディ3のあと）：最後に置いた音から、次に行ける音をマスに出す
//  となりの音（順々）＝緑　1・3・5 どうしの跳び先＝青（今の音が 1・3・5 のときだけ）
const TRIAD=new Set([0,4,7]);
function melNextRows(o){ const R=melRows(), i=R.indexOf(o), step=[R[i-1],R[i],R[i+1]].filter(x=>x!=null);
  const jump=TRIAD.has(((o%12)+12)%12) ? R.filter(x=>TRIAD.has(((x%12)+12)%12) && !step.includes(x)) : [];
  return {step, jump}; }
const melRef=()=>{ const ns=PD.mel.notes; return (MU.ref && ns.includes(MU.ref)) ? MU.ref : ns[ns.length-1]||null; };
function drawMel(el){ melSnapRows(); const T=melT(), L=slotSteps(), kp=keyObj().pc, ROWS=melRows(), R=ROWS.length, lit4=pDone('M4'), guide=pDone('M3')&&PD.mel.guide;
  const sc0=el.querySelector('.mscroll'), x0=sc0?sc0.scrollLeft:0;
  const W0=(el.clientWidth||360)-44; MU.cw=Math.max(16, Math.floor(W0/T)); const cw=MU.cw, W=T*cw;
  const ri=o=>ROWS.indexOf(o), rowTop=k=>((R-1-k)/R*100)+'%', rh=(100/R)+'%';
  // コードの音の帯（メロディ4のあと）と、小節番号・コード名
  let lit='', head='';
  for(let i=0;i<state.bars;i++) cellsOf(i).forEach(c=>{ if(c.v==null||!c.len) return; const x=(i*L+c.off)*cw, w=c.len*cw, sp=specOf(c.v), rt=(kp+sp.o)%12, pcs=(QUAL[sp.q]||[0,4,7]).map(q=>(rt+q)%12);
    head+=`<span class="mchn" style="left:${x}px;width:${w}px">${bigHTML(c.v)}</span>`;
    if(lit4) ROWS.forEach((o,k)=>{ if(pcs.includes((kp+o)%12)) lit+=`<div class="mlit" style="left:${x}px;width:${w}px;top:${rowTop(k)};height:${rh}"></div>`; }); });
  for(let b=0;b<T/16;b++) head+=`<span class="mbarn" style="left:${b*16*cw}px">${b+1}</span>`;
  const notes=PD.mel.notes.map((n,i)=>`<div class="mn" data-i="${i}" style="left:${n.st*cw}px;width:${Math.max(6,n.len*cw-2)}px;top:${rowTop(ri(n.o))};height:${rh}"><span>${melDeg(n.o)}</span></div>`).join('');
  // ガイド：基準の音のあと（次の音まで。なければ2拍）に、行ける音の行を色の帯で出す
  let gband='';
  const ref=guide&&melRef();
  if(ref){ const x=(ref.st+ref.len)*cw, nx=PD.mel.notes.find(n=>n.st>=ref.st+ref.len), end=Math.min(T,nx?nx.st:ref.st+ref.len+8), w=(end-ref.st-ref.len)*cw, {step,jump}=melNextRows(ref.o);
    if(w>0){ step.forEach(o=>gband+=`<div class="mnext g-ok" style="left:${x}px;width:${w}px;top:${rowTop(ri(o))};height:${rh}"></div>`);
      jump.forEach(o=>gband+=`<div class="mnext g-jump" style="left:${x}px;width:${w}px;top:${rowTop(ri(o))};height:${rh}"></div>`); } }
  const lines=`repeating-linear-gradient(90deg,var(--ink) 0 2px,transparent 2px ${16*cw}px),repeating-linear-gradient(90deg,color-mix(in srgb,var(--ink) 35%,transparent) 0 1px,transparent 1px ${4*cw}px),repeating-linear-gradient(90deg,var(--line) 0 1px,transparent 1px ${MU.G*cw}px),repeating-linear-gradient(180deg,transparent 0 calc(100%/${R} - 1px),var(--line) calc(100%/${R} - 1px) calc(100%/${R}))`;
  const gline = !guide ? '' : `<div class="mguide"><b>メロディガイド</b><span class="g-ok">となりの音</span><span class="g-jump">跳べる音（1・3・5どうし）</span><small>${ref?'最後に置いた音の次に行ける音を、色で出しています。':'音を置くと、次に行ける音を色で出します。'}</small></div>`;
  el.innerHTML=`<div class="mphead"><b>メロディ</b><small>空いているマスをタップで音を置く・音をタップで消す・ドラッグで動かす・右はしで長さ。${lit4?'光っているのは、いま鳴っているコードの音です。':''}</small></div>
    ${gline}
    <div class="mroll"><div class="mlab"><span class="mhd"></span>${[...ROWS].reverse().map(o=>`<span>${melLab(o)}</span>`).join('')}</div>
      <div class="mscroll"><div class="mbox" style="width:${W}px"><div class="mhd">${head}</div>
        <div class="marea" id="mArea" style="background-image:${lines}">${lit}${gband}${notes}<div class="mph" id="mPh" hidden></div></div></div></div></div>
    ${pBar('m')}`;
  el.querySelector('.mscroll').scrollLeft=x0;
  histBtns();
  pBarBind(el,'m');
  melBind(el); melLoad();
}
function melBind(el){ const A=$('mArea'), ROWS=melRows(), R=ROWS.length; let D=null;
  const pos=e=>{ const b=A.getBoundingClientRect(), k=Math.max(0,Math.min(R-1,Math.floor((e.clientY-b.top)/b.height*R))); return {s:(e.clientX-b.left)/MU.cw, o:ROWS[R-1-k], rh:b.height/R}; };
  const done=keep=>{ melTidy(keep); if(MU.ref&&!PD.mel.notes.includes(MU.ref)) MU.ref=null; PD.mel.on=true; pthSave(); drawMel(el); };
  A.onpointerdown=e=>{ if(e.pointerType==='mouse'&&e.button!==0) return; const ne=e.target.closest('.mn'), p=pos(e);
    if(ne){ e.preventDefault(); const n=PD.mel.notes[+ne.dataset.i], b=ne.getBoundingClientRect(), edge=(b.right-e.clientX)<Math.max(10,Math.min(18,b.width*.4));
      try{ A.setPointerCapture(e.pointerId); }catch(_){}
      D={mode:edge?'len':'press', n, el:ne, sx:e.clientX, sy:e.clientY, st:n.st, ri:ROWS.indexOf(n.o), len:n.len, rh:p.rh, pid:e.pointerId, snap:JSON.stringify(PD.mel.notes)}; return; }
    D={mode:'tap', sx:e.clientX, sy:e.clientY, p, pid:e.pointerId}; };   // 空いた所：指を動かしたらスクロール、動かさずに離したら音を置く
  A.onpointermove=e=>{ if(!D||D.pid!==e.pointerId) return; const dx=e.clientX-D.sx, dy=e.clientY-D.sy, far=Math.hypot(dx,dy)>6, cw=MU.cw, G=MU.G;
    if(D.mode==='tap'){ if(far) D=null; return; }
    if(D.mode==='press'){ if(!far) return; D.mode='move'; D.el.classList.add('drag'); }
    if(D.mode==='move'){ const st=Math.max(0,Math.min(melT()-1,D.st+Math.round(dx/cw/G)*G)), k=Math.max(0,Math.min(R-1,D.ri-Math.round(dy/D.rh))), o=ROWS[k];
      if(o!==D.n.o) melHear(o); D.n.st=st; D.n.o=o; D.el.style.left=(st*cw)+'px'; D.el.style.top=((R-1-k)/R*100)+'%'; D.el.querySelector('span').textContent=melDeg(o); return; }
    if(D.mode==='len'){ D.n.len=Math.max(1,Math.min(melT()-D.n.st,Math.round((D.len*cw+dx)/cw/G)*G||G)); D.el.style.width=Math.max(6,D.n.len*cw-2)+'px'; } };
  const up=e=>{ const d=D; if(!d||d.pid!==e.pointerId) return; D=null;
    if(d.mode==='tap'){ const G=MU.G, st=Math.floor(d.p.s/G)*G; if(st>=melT()) return; melSnap(); const n={st, o:d.p.o, len:MU.last}; PD.mel.notes.push(n); MU.ref=n; melHear(n.o); done(n); return; }
    if(d.mode==='press'){ melSnap(d.snap); PD.mel.notes=PD.mel.notes.filter(x=>x!==d.n); MU.ref=PD.mel.notes.filter(x=>x.st<d.n.st).pop()||null; done(); return; }   // タップで消す
    if(d.mode==='move'||d.mode==='len'){ MU.ref=d.n; melSnap(d.snap); if(d.mode==='len') MU.last=d.n.len; done(d.n); } };
  A.onpointerup=up; A.onpointercancel=e=>{ if(D&&D.mode==='tap') D=null; else up(e); };
}
// 再生中は、いま鳴っているマスを光らせる
function pMark(g,t){ if(PD.mode==='c'||document.hidden) return; const el=$('modePanel'); if(!el) return;
  setTimeout(()=>{ if(!playing) return; el.querySelectorAll('.now').forEach(e=>e.classList.remove('now'));
    if(PD.mode==='r'){ const cs=el.querySelectorAll(`.pgrid i[data-s="${g%16}"]`); cs.forEach(e=>e.classList.add('now')); }
    else { const ph=$('mPh'), sc=el.querySelector('.mscroll'); if(ph&&sc){ const x=g*MU.cw; ph.hidden=false; ph.style.left=x+'px'; if(PD.mel.follow!==false&&(x<sc.scrollLeft||x>sc.scrollLeft+sc.clientWidth-20)) sc.scrollLeft=x-20; } } },
    Math.max(0,(t-ctx.currentTime)*1000)); }

// ---------- 再生に重ねる ----------
const _pthStop=stop; stop=function(){ const r=_pthStop.apply(this,arguments); try{ pDuck(false,ctx?ctx.currentTime:0); }catch(e){} return r; };
// メロディを鳴らしているときは伴奏を控えめに：メロディは自分の出口（pmel）から出し、全体（master）を下げた分だけメロディの出口を上げる
const DUCK=.6, MB={ctx:null, bus:null, d:1};
function pMelOut(f){ if(MB.ctx!==ctx){ MB.ctx=ctx; const ch=mkChan('pmel'); ch.vol.gain.value=MB.d<1?1/DUCK:1; ch.send.gain.value=.16; MB.bus=ctx.createGain(); MB.bus.connect(ch.inp); }
  const sv=compBus; compBus=MB.bus; try{ f(); } finally { compBus=sv; } }
function pDuck(on,t){ if(!ctx||!master) return; const d=on?DUCK:1; if(MB.d===d) return; MB.d=d; const at=Math.max(ctx.currentTime,t-.02);
  master.gain.setTargetAtTime(.85*d,at,.05); if(MB.ctx===ctx&&CHAN.pmel) CHAN.pmel.vol.gain.setTargetAtTime(1/d,at,.05); }
const _pthStep=scheduleStep;
scheduleStep=function(g,t){
  const live=!TUT.on && !CAPTURE && !LIB.bk && !ENDED_EARLY;
  if(live) pMark(g,t);
  const melOn=live && PD.mel.on && pDone('M1') && PD.mel.notes.length>0; pDuck(melOn,t);
  if(melOn) pMelOut(()=>PD.mel.notes.forEach(n=>{ if(n.st===g) keyTone(melPitch(n.o),t,n.len*stepDur()*.92,.8,melInst()); }));
  // 解説のお手本（EX の mel）：進行に合わせてメロディも鳴らす
  const ex=TUT.on&&TUT.playingEx&&EX[TUT.playingEx]; if(ex&&ex.mel&&!CAPTURE) ex.mel.forEach(n=>{ if(n.st===g) keyTone(melPitch(n.o),t,n.len*stepDur()*.92,.85,melInst()); });
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
// 上の「Key」「楽器」の表示はなくしたので、キーのレベルのあとの案内からも外す
if(WHERE[4]) WHERE[4]=WHERE[4].filter(st=>!/keyBadge/.test(String(st.t)));
// レベルの解説は、コードの画面で行う（課題でパレットやマスを使うため）
const _pthOpenTut=openTutorial; openTutorial=function(){ if(PD.mode!=='c') setMode('c'); return _pthOpenTut.apply(this,arguments); };
// 曲（コード・小節数・キー）が変わったら、メロディの画面も描き直す
const _pthRender=renderAll; renderAll=function(){ const r=_pthRender.apply(this,arguments); if(PD.mode!=='c') drawPanel(); drawModeSw(); return r; };
// 説明のスライドを切り替えたときは、小さなループも止める
const _pthTutStop=tutStopAudio; tutStopAudio=function(){ pLoopStop(); return _pthTutStop.apply(this,arguments); };

// 設定メニューの「レベル」に、地図への入口を足す
(()=>{ const acc=$('lvAcc'); if(!acc) return; const b=document.createElement('button'); b.className='lvnext pthbtn'; b.style.marginTop='8px';
  b.innerHTML='<i>試作</i><b>3本の道（コード・リズム・メロディ）</b><small>好きな道からレベルを進められます</small>'; b.onclick=openPathMap; acc.after(b); })();

// ---------- 設定メニュー（≡）を、今の画面（コード・リズム・メロディ）に合わせる ----------
// リズム・メロディの画面では、コードだけの項目（コードの表示・進行ガイド・色の意味・ライブラリ・PRO など）を隠し、
// その道のレベルと、その画面の設定を出す。書き出し・セーブデータ・リセットはどの画面でも出す
const secsBy=t=>[...document.querySelectorAll('#drawer .sec')].filter(x=>{ const h=x.querySelector('h3'); return h && h.textContent.trim().startsWith(t); });   // 見出しには改行用の <wbr> が入っている
const secBy=t=>secsBy(t)[0];
const C_ONLY=['コードの切り替え','コードの表示','進行ガイド','色の意味','コード進行ライブラリ','PRO'];
function pthMenu(){ const k=PD.mode, dr=$('drawer'); if(!dr) return;
  let box=$('pthSecs'); if(!box){ box=document.createElement('div'); box.id='pthSecs'; const lv=secBy('レベル'); if(!lv) return; lv.after(box); }
  const lv=secBy('レベル'); if(lv) lv.hidden = k!=='c';
  if(k==='c'){ box.innerHTML=''; box.hidden=true; ['コードの表示','色の意味','コード進行ライブラリ'].forEach(t=>secsBy(t).forEach(x=>x.hidden=false)); return; }   // ほかは元の buildMenu がレベルに合わせて出し分ける
  C_ONLY.forEach(t=>secsBy(t).forEach(x=>x.hidden=true)); const an=$('accNote'); if(an) an.hidden=true;
  if(k==='r') ['キー','小節数'].forEach(t=>secsBy(t).forEach(x=>x.hidden=true));   // ドラムは1小節のくり返しなので、キー・小節数は使わない
  const list=P_LV[k], next=list.find(l=>!pDone(l.id)&&pOpen(l.id)&&l.deck), nDone=list.filter(l=>pDone(l.id)).length;
  const lvHTML=`<div class="sec"><h3>${k==='r'?'リズム':'メロディ'}のレベル <small style="color:var(--muted);font-weight:400">${nDone} / ${list.length} クリア</small></h3>
    ${next?`<button class="lvnext" data-go="${next.id}"><i>${nDone?'つづきから':'はじめから'} ・ ${pName(next.id)}</i><b>${next.name}</b><small>${next.unlock?'クリアすると：'+next.unlock:'　'}</small></button>`:''}
    <details class="acc" style="margin-top:8px"><summary><span>レベル一覧（クリアしたレベルは見返せます）</span></summary><div class="acclist">${list.map(l=>{ const done=pDone(l.id), open=pOpen(l.id)&&!!l.deck;
      return `<button data-lv="${l.id}"${open||done?'':' class="lock"'}><span class="lvtag">${pName(l.id)}</span><b>${l.name}${done?'<span class="chapdone" aria-label="クリア">✓</span>':''}</b><small>${!l.deck?'準備中':!pOpen(l.id)?pReq(l.id).filter(r=>!pDone(r)).map(pName).join('・')+' が必要':(l.unlock||'')}</small></button>`; }).join('')}</div></details>
    <button class="lvnext pthbtn" style="margin-top:8px" data-map><i>試作</i><b>3本の道の地図</b><small>コード・リズム・メロディのつながりを見る</small></button></div>`;
  const setHTML = k==='r' ? (pDone('R2')?`<div class="sec"><h3>ドラムの打ち込み</h3><div class="chips"><button class="chip" data-dpre="8">8ビートを入れる</button><button class="chip" data-dpre="0">ぜんぶ削除</button></div></div>`:'')
    : (pDone('M1')?`<div class="sec"><h3>メロディ</h3><div class="chips" data-set="mon"></div>${pDone('M2')?'<h3 style="margin-top:10px">使う音</h3><div class="chips" data-set="five"></div>':''}${pDone('M3')?'<h3 style="margin-top:10px">メロディガイド</h3><div class="chips" data-set="guide"></div>':''}<h3 style="margin-top:10px">マスの細かさ</h3><div class="chips" data-set="grid"></div><div class="chips" style="margin-top:10px"><button class="chip" data-mclr>メロディをぜんぶ削除</button></div></div>`:'');
  box.hidden=false; box.innerHTML=lvHTML+setHTML;
  const redraw=()=>{ pthSave(); drawPanel(); pthMenu(); };
  const C=(sel,opts,cur,f)=>{ const el=box.querySelector(`[data-set="${sel}"]`); if(el) chips(el,opts,cur,v=>{ f(v); redraw(); }); };
  // ドラムで鳴らすか・ドラムの音・メロディの楽器・追いかけるかは、画面の下のボタンにあるのでメニューには出さない
  C('mon',[[true,'メロディを鳴らす'],[false,'鳴らさない']],!!PD.mel.on,v=>PD.mel.on=v);
  C('five',[[true,'5つの音だけ'],[false,'7つの音']],melFive(),v=>{ melSnap(); PD.mel.five=v; melSnapRows(); melTidy(); });
  C('guide',[[true,'表示する'],[false,'表示しない']],!!PD.mel.guide,v=>PD.mel.guide=v);
  C('grid',[[2,'8分（ふつう）'],[1,'16分（細かい）']],MU.G,v=>{ MU.G=v; MU.last=Math.max(MU.G,MU.last); });
  box.querySelectorAll('[data-dpre]').forEach(b=>b.onclick=()=>{ drawer.classList.remove('on'); scrim.classList.remove('on'); drumPreset(b.dataset.dpre==='8'); });
  const mc=box.querySelector('[data-mclr]'); if(mc) mc.onclick=()=>{ drawer.classList.remove('on'); scrim.classList.remove('on'); melClear(); };
  box.querySelectorAll('[data-go],[data-lv]').forEach(b=>b.onclick=()=>{ const id=b.dataset.go||b.dataset.lv, l=P_ALL().find(x=>x.id===id);
    if(!l||!l.deck){ toast('このレベルは準備中です'); return; } if(!pOpen(id)&&!pDone(id)){ toast(`${pReq(id).filter(r=>!pDone(r)).map(pName).join('・')} をクリアすると挑戦できます`); return; }
    drawer.classList.remove('on'); scrim.classList.remove('on'); openTutorial(pDeck(l)); });
  box.querySelector('[data-map]').onclick=openPathMap;
}
// メロディの画面では、下の ↶ ↷ ボタンでメロディをもとに戻す・やり直す
const _pthHistGo=histGo; histGo=function(dir){ if(PD.mode==='m' && !TUT.on) return melUndo(dir); return _pthHistGo.apply(this,arguments); };
const _pthHistBtns=histBtns; histBtns=function(){ const r=_pthHistBtns.apply(this,arguments); if(PD.mode==='m' && !TUT.on && $('undoBtn')){ $('undoBtn').disabled=!MU.hist.length; $('redoBtn').disabled=!MU.fut.length; } return r; };
const _pthMenu=buildMenu; buildMenu=function(){ const r=_pthMenu.apply(this,arguments); try{ pthMenu(); }catch(e){} return r; };

// ---- PRO のトラック画面：打ち込んだメロディの行を足す・打ち込んだドラムを帯に描く ----
const pDrumOn=()=>PD.drum.on && pDone('R2');
const pMelOn=()=>pDone('M1') && PD.mel.notes.length>0;
// 打ち込んだドラムで鳴らしているときは、ドラムの帯・名前も打ち込んだドラムにする（鳴らすときと同じ差しかえ）
const pWithDrum=f=>{ if(!pDrumOn()) return f(); const o=state.drum; DRUMS.__pth={name:'打ち込んだドラム', V:PD.drum.v, bass:(DRUMS[o]||{}).bass}; state.drum='__pth';
  try{ return f(); } finally { state.drum=o; delete DRUMS.__pth; } };
const _pthRegion=drawRegion; drawRegion=function(cv,kind){ if(kind==='pmel') return pMelRegion(cv); const a=arguments; return kind==='drum' ? pWithDrum(()=>_pthRegion.apply(this,a)) : _pthRegion.apply(this,a); };
// 打ち込んだドラム・メロディの帯をタップしたら、リズム・メロディの画面で直す
const _pthTap=tapRegion; tapRegion=function(kind){ if(kind==='pmel'||(kind==='drum'&&pDrumOn())){ closeTracks(); setMode(kind==='pmel'?'m':'r'); return; } return _pthTap.apply(this,arguments); };
function pMelRegion(cv){ if(!cv.clientWidth) return; const g=fit(cv), W=cv.width, H=cv.height, r=devicePixelRatio||1, T=melT(), col=colors(), c=ICO_COL.sax;
  g.clearRect(0,0,W,H); const pad=5*r; g.globalAlpha=.16; g.fillStyle=c; rr(g,1.5*r,pad,W-3*r,H-2*pad,7*r); g.fill(); g.globalAlpha=1; g.strokeStyle=c; g.lineWidth=1.2*r; rr(g,1.5*r,pad,W-3*r,H-2*pad,7*r); g.stroke();
  const ns=PD.mel.notes, lo=Math.min(...ns.map(n=>n.o)), hi=Math.max(...ns.map(n=>n.o)), span=Math.max(7,hi-lo), y0=pad+8*r, h=H-2*pad-16*r, nh=Math.max(3*r,Math.min(7*r,h/span)), ps=W/T;
  g.fillStyle=col.ink; ns.forEach(n=>{ const y=y0+(1-(n.o-lo)/span)*(h-nh); rr(g,n.st*ps+1*r,y,Math.max(2*r,n.len*ps-2*r),nh,2*r); g.fill(); }); }
function pMelRow(){ const box=$('trkList'); if(!box||trk.hidden) return; box.querySelector('.dtrack.pmel')?.remove(); if(!pMelOn()) return;
  const rows=box.querySelectorAll('.dtrack'), last=rows[rows.length-1]; if(!last) return;
  const row=document.createElement('div'); row.className='drow dtrack pmel'+(PD.mel.on?'':' silent'); row.dataset.kind='pmel'; row.style.setProperty('--tc',ICO_COL.sax);
  row.innerHTML=`<div class="dh"><div class="dms2"><button data-k="m" aria-pressed="${!PD.mel.on}" aria-label="ミュート">${ICO_MUTE}</button></div>
    <button class="dico" aria-label="メロディ">${icoInst(melInst())}<span>メロディ</span></button></div><div class="dtl"><canvas></canvas></div>`;
  last.after(row); row.querySelector('.dtl').style.width=last.querySelector('.dtl').style.width;
  row.querySelector('[data-k=m]').onclick=()=>{ PD.mel.on=!PD.mel.on; pthSave(); renderTracks(); };
  row.querySelector('.dico').onclick=()=>{ closeTracks(); setMode('m'); };
  row.querySelector('.dtl').onclick=()=>{ closeTracks(); setMode('m'); };
  pMelRegion(row.querySelector('canvas'));
  const hd=$('dHead'); if(hd) hd.style.height=(row.offsetTop+row.offsetHeight)+'px'; }
const _pthDawPage=dawPage; dawPage=function(){ const r=_pthDawPage.apply(this,arguments); try{ pMelRow(); }catch(e){} return r; };

buildModeSw(); setMode(PD.mode);
