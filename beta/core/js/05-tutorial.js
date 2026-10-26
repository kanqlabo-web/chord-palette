// ---------- lane drawing ----------
function colors(){ const s=getComputedStyle(document.documentElement), v=n=>s.getPropertyValue(n).trim();
  return {ink:v('--ink'),muted:v('--muted'),line:v('--line'),surface:v('--surface'),lane:v('--lane'),t:v('--t'),s:v('--s'),d:v('--d')}; }
function fit(cv){ const r=devicePixelRatio||1, w=Math.round(cv.clientWidth*r), h=Math.round(cv.clientHeight*r);
  if(cv.width!==w||cv.height!==h){ cv.width=w; cv.height=h; } return cv.getContext('2d'); }
function rr(g,x,y,w,h,r){ g.beginPath(); if(g.roundRect) g.roundRect(x,y,w,h,r); else g.rect(x,y,w,h); }
function drawDrumBar(g,x,y,w,h,dr,col,fill,from=0,n=16){
  const sw=w/n, rh=h/3, r=devicePixelRatio||1;
  g.fillStyle=col.line; for(let i=4;i<n;i+=4) g.fillRect(x+i*sw,y+2*r,1*r,h-4*r);
  const rows=[[[42,51],[46,49],col.muted],[[38,50,47,45],[37,75],col.ink],[[36],[],col.ink]];
  for(let i=from;i<from+n;i++){
    const fs=fill==='big'?8:12, inF=fill&&dr.F&&i>=fs, V=inF?(fill==='big'?dr.F:dr.FS):dr.V, xi=x+(i-from)*sw;
    rows.forEach(([main,alt,c],ri)=>{
      const yy=y+ri*rh+rh*.18, hh=rh*.64;
      const mv=Math.max(0,...main.map(n=>V[n]?V[n][i]:0)), av=Math.max(0,...alt.map(n=>V[n]?V[n][i]:0));
      if(mv){ g.globalAlpha=.3+.7*mv; g.fillStyle=(inF&&ri>0)?col.d:c; rr(g,xi+r*.6,yy,Math.max(sw-1.2*r,1),hh,1.5*r); g.fill(); }
      else if(av){ g.globalAlpha=.4+.6*av; g.strokeStyle=c; g.lineWidth=1.1*r; rr(g,xi+1.2*r,yy+.6*r,Math.max(sw-2.4*r,1),hh-1.2*r,1.5*r); g.stroke(); }
    });
  }
  g.globalAlpha=1;
}
function drawArpBar(g,x,y,w,h,a,c,col,n=16){
  const sw=w/n, rh=h/10, r=devicePixelRatio||1, ROW={0:0,4:1,5:2,1:3,2:4,3:5,9:6,6:7,7:8,8:9};
  g.fillStyle=col.line; for(let i=4;i<n;i+=4) g.fillRect(x+i*sw,y+2*r,1*r,h-4*r);
  g.fillStyle=c;
  a.ev.forEach(([st,ns,len,vel])=>{ if(st>=n) return; ns.forEach(ix=>{
    const l=Math.min(len,n-st); g.globalAlpha=.35+.65*vel;
    rr(g,x+st*sw+r*.5,y+(9-(ROW[ix]??9))*rh+rh*.12,Math.max(l*sw-1*r,1.5*r),rh*.76,1.2*r); g.fill(); }); });
  g.globalAlpha=1;
}
// ベースの帯：横＝タイミング、縦＝音の高さ（下がルート、上がオクターブ）
function drawBassBar(g,x,y,w,h,list,c,col,n=16){
  const low=bassLow(list), sw=w/n, r=devicePixelRatio||1, Y=low?{'-12':0,'-5':.14,0:.3,'ap':.62,'3':.53,'5':.69,'6':.79,'7':.9,12:1}:{0:0,'ap':.45,'3':.33,'5':.55,'6':.7,'7':.85,12:1};
  g.fillStyle=col.line; for(let i=4;i<n;i+=4) g.fillRect(x+i*sw,y+2*r,1*r,h-4*r);
  g.fillStyle=c; const bh=Math.max(3*r,h*.2);
  (list||[]).forEach(([st,iv,len,vel])=>{ if(st>=n) return; const l=Math.min(len,n-st), yy=y+(h-bh)*(1-(Y[iv===7?'5':iv]??.5));
    g.globalAlpha=.35+.65*vel; rr(g,x+st*sw+r*.5,yy,Math.max(l*sw-1*r,1.5*r),bh,1.2*r); g.fill(); });
  g.globalAlpha=1;
}
let dirty=true;
function drawLane(cv,kind){
  const g=fit(cv), W=cv.width, H=cv.height, r=devicePixelRatio||1, col=colors(), gap=8*r, cw=(W-3*gap)/4;
  g.clearRect(0,0,W,H);
  const row = (playing&&cur) ? Math.floor(cur.b/4) : page;   // 再生中はいま鳴っている4マスを表示
  for(let c=0;c<4;c++){
    const x=c*(cw+gap), b=row*4+c;
    g.fillStyle=col.lane; rr(g,x,0,cw,H,8*r); g.fill();
    const px=x+4*r, pw=cw-8*r, py=4*r, ph=H-8*r;
    const L=slotSteps(), start=b*L;
    // 帯は実際に鳴る小節に合わせる（再生中はいまのくり返しの位置、止まっている時は1回目）
    if(kind==='bass'){
      const cells=b<state.bars?cellsOf(b):[];
      if(state.bass) cells.forEach(c=>{ if(c.v===null||c.v===undefined) return; const cx=px+c.off/L*pw, cwid=c.len/L*pw;
        drawBassBar(g,cx,py,cwid,ph,(bassList(DRUMS[state.drum])||[]).filter(e=>e[0]<c.len),(r=>r==='X'?col.muted:col[r.toLowerCase()])(roleAt(b,c.h,c.v)),col,c.len);
        if(c.off>0){ g.fillStyle=col.surface; g.fillRect(cx-r,0,2*r,H); } });
    } else if(kind==='drum'){ const dr=DRUMS[state.drum], base=(playing&&cur&&cur.ln!=null)?cur.ln*state.bars*L:0, db=Math.floor((base+start)/16);
      drawDrumBar(g,px,py,pw,ph,(db%2===1&&dr.VB)?{...dr,V:dr.VB}:dr,col,b<state.bars?fillModeOf(db,dr):null,start%16,L); }
    else {
      const cells=b<state.bars?cellsOf(b):[{off:0,len:L,v:null}];
      cells.forEach(c=>{ const cx=px+c.off/L*pw, cwid=c.len/L*pw;
        const AP=kind==='arp2'?ARPS[state.arp2]:ARPS[state.arp];
        if(kind==='arp2'&&!AP) return;
        if(c.v!==null&&c.v!==undefined) drawArpBar(g,cx,py,cwid,ph,AP,(r=>r==='X'?col.muted:col[r.toLowerCase()])(roleAt(b,c.h,c.v)),col,c.len);
        else { g.fillStyle=col.muted; g.font=`${10*r}px sans-serif`; g.textAlign='center'; g.textBaseline='middle'; g.fillText('—',cx+cwid/2,H/2); }
        if(c.off>0){ g.fillStyle=col.surface; g.fillRect(cx-r,0,2*r,H); } });
    }
    if(playing&&cur&&cur.b===b){
      const frac=Math.min(1,(ctx.currentTime-cur.t)/stepDur());
      const hx=px+(cur.s+frac)/(cur.L||16)*pw; g.fillStyle=col.ink; g.fillRect(hx-r,0,2*r,H);
    }
  }
}
function frame(){
  if(playing&&ctx){
    let n=null; while(visQ.length&&visQ[0].t<=ctx.currentTime) n=visQ.shift();
    if(n){ const changed=!cur||n.b!==cur.b; cur=n;
      if(changed){ slotsEl.querySelectorAll('.slot').forEach(el=>el.classList.toggle('now',+el.dataset.abs===n.b)); renderPages(); }
      $('play').classList.toggle('beat',!!n.beat);
      if(TUT.on) document.querySelectorAll(TUT.playingEx&&document.querySelector(`.tut :not(.listen)[data-ex="${TUT.playingEx}"]`)?`.tut :not(.listen)[data-ex="${TUT.playingEx}"] [data-ti]`:'.tut [data-ti]').forEach(e=>e.classList.toggle('now', +e.dataset.ti===n.b)); }
    dirty=true;
  }
  if(dirty){ drawLane($('drumCv'),'drum'); drawLane($('arpCv'),'arp'); if(state.pro){ drawLane($('bassCv'),'bass'); drawLane($('arp2Cv'),'arp2'); } dirty=false; }
  requestAnimationFrame(frame);
}
window.addEventListener('resize',()=>dirty=true);
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>dirty=true);
new MutationObserver(()=>dirty=true).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
if(document.fonts) document.fonts.ready.then(()=>dirty=true);

// ================= チュートリアル =================
const TUT={on:false, i:0, backup:null, wait:null, timer:null, loopLen:Infinity, stopping:false, stopT:null, onLoopEnd:null};
// チュートリアルのコード名も設定に合わせる（数字ならアラビア／ローマ、アルファベットなら C・Dm…）
const nmN=d=>nameOf(d,numK(),false).replace('-5','♭5'), nm=d=>state.label==='alpha'?chordText(d).replace('-5','♭5'):nmN(d), al=d=>chordText(d);
// 説明文の中のコードの数字（1・4・6m・5/7・3(7) など）を、ローマ数字の設定ならⅠ・Ⅳ…に置きかえる
const ROM7=['','Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ'];
const DEG_RE=/(?<![0-9A-Za-zⅠ-Ⅻ.(♭♯+\-]|LEVEL |レベル|Key |キー|BPM |レベル[0-9]・|LEVEL [0-9]・)([1-7])(dim|m♭5|m-5|m)?(\(7\))?(?:\/([1-7]))?(?![0-9]|つ|小節|拍|度|回|番|音|分|秒|人|枚|文字|段|行|周|個|本|歩|ミリ|%|:|\.|・M|th|・9|〜|～|~| ?や ?M)/g;
const SC7=[0,0,2,4,5,7,9,11];
function romanize(root){ const alpha=state.label==='alpha'; if(!root||(!alpha&&numK()!=='roman')) return;
  const conv=(m,d,q,sev,b)=>alpha ? nameOf({o:SC7[+d],q:q?(q==='m'?'m':'m-5'):'maj',x:sev?'7':'',b:b?SC7[+b]:null},'alpha',false).replace('-5','♭5')
    : ROM7[+d]+(q||'')+(sev||'')+(b?'/'+ROM7[+b]:'');
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement&&n.parentElement.closest('.kbd,.eyebrow,input,textarea,.tutprog,.tutdots,.L,.tc,.slot,.tile')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  const list=[]; while(w.nextNode()) list.push(w.currentNode);
  list.forEach(n=>{ const t=n.nodeValue.replace(DEG_RE,conv); if(t!==n.nodeValue) n.nodeValue=t; }); }
const HEAR=d=>JSON.stringify(isNum(d)?d:{b:null,...d}).replace(/"/g,'&quot;');   // タップで鳴らすためのコードの情報
const tc=(d,cls,delay,ti)=>`<span class="tc ${cls||''} pop" style="--dl:${delay||0}" data-hear="${HEAR(d)}"${ti!=null?` data-ti="${ti}"`:''}><b>${nm(d)}</b><small>${state.label==='alpha'?nmN(d):al(d)}</small></span>`;
function exampleHTML(ex){
  const n=ex.degs.length, cols=`repeat(${n},minmax(0,1fr))`;
  const brk=(row,u)=>`<div class="brk${u?' u':''}">${row.map((g,k)=>`<span style="--fn:var(--${g.c});left:calc(${g.a}/${n}*100% + 2px);width:calc(${g.b-g.a+1}/${n}*100% - 4px);--dl:${1+k*.5+(g.row||0)*.25}">${g.t}</span>`).join('')}</div>`;
  const top=ex.groups.filter(g=>!g.row), bot=ex.groups.filter(g=>g.row);
  return `<div class="ex" data-ex="${Object.keys(EX).find(k=>EX[k]===ex)||''}">
    ${top.length?brk(top):''}
    <div class="exrow${n>4?' sm':''}" style="grid-template-columns:${cols}">${ex.degs.map((d,k)=>`<span class="tc ${ex.roles[k]} pop" style="--dl:${.15+k*.12}" data-ti="${k}" data-hear="${HEAR(d)}"${ex.key&&ex.key!=='C'?` data-key="${ex.key}"`:''}><b>${nm(d)}</b><small>${ex.roles[k]}</small></span>`).join('')}</div>
    ${bot.length?brk(bot,true):''}
  </div>`;
}
const EX={
  komuro:{degs:[5,3,4,0], roles:['T','S','D','T'], groups:[{a:0,b:3,t:'③ T→S→D→T',c:'ink'}]},
  ohdo:  {degs:[3,4,2,5], roles:['S','D','D','T'], groups:[{a:0,b:3,t:'③の頭のTを省略',c:'ink'},{a:1,b:2,t:'Dが続く',c:'d',row:1}]},
  canon: {degs:[0,4,5,2,3,0,3,4], roles:['T','D','T','T','S','T','S','D'], groups:[{a:0,b:2,t:'① T→D→T',c:'d'},{a:3,b:5,t:'② T→S→T',c:'s'},{a:5,b:7,t:'③ T→S→D →(1へ)',c:'ink',row:1}]},
};
const IC_PLAY='<svg class="ic" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.6v8.8c0 .5.5.8.9.5l6.6-4.4c.4-.2.4-.8 0-1L3.9 1.1c-.4-.3-.9 0-.9.5z" fill="currentColor"/></svg>';
const IC_STOP='<svg class="ic" viewBox="0 0 12 12" aria-hidden="true"><rect x="2" y="2" width="8" height="8" rx="1.5" fill="currentColor"/></svg>';
function listenBtn(key){ return `<button class="listen a" style="--dl:1.6" data-ex="${key}">${IC_PLAY}<span>聴いてみる</span></button>`; }
const SLIDES=[
  {html:()=>`<div class="eyebrow a">LEVEL 1</div>
     <div class="chips7">${[0,3,4,5].map((d,k)=>`<span class="floaty" style="animation-delay:${k*.4}s;display:inline-block">${tc(d,'',.2+k*.15)}</span>`).join('')}</div>
     <h2 class="a" style="--dl:.8">こんにちは！</h2>
     <p class="a" style="--dl:1.1">このアプリは『コード進行』が<br>（たぶん）作れるようになるアプリです。</p>`},
  // 1枚の画面のまま「つぎへ」で説明を足していく（steps＝追加で見せる段階の数）
  {steps:2, html:()=>`<div class="eyebrow a"><span data-upto="0">コード進行とは？</span><span data-st="1">コードの見方</span></div>
     <h2 class="a" style="--dl:.2" data-upto="0">コードを、順番に<br>つなげたものです</h2>
     <h2 data-st="1" data-upto="1" data-dl=".5" data-dur="1" style="color:var(--t)">左側の部分は<br>音の高さを表しています</h2>
     <h2 data-st="2" data-dl=".5" data-dur="1" style="color:var(--s)">右側の部分は<br>明るさを表しています</h2>
     <p class="a" style="--dl:.6" data-upto="0">コードは、こんな見た目をしています。</p>
     <div class="chordbig pop" style="--dl:1" id="tutAm"><span class="A">A</span><span class="M">m</span></div>
     <p class="sub a" style="--dl:1.6" data-upto="0">コード＝いくつかの音を同時に鳴らした「和音」のこと</p>
     <p data-st="2" data-dl="1.5" data-dur="1">何も付いていなければ<b>明るい</b>コード<br>「m」が付いていれば<b>暗い</b>コードです</p>`},
  {steps:1, html:()=>`<div class="eyebrow a">音の高さ</div>
     <h2 class="a" style="--dl:.1" data-upto="0">ドレミファソラシは<br>アルファベットで書きます</h2>
     <p data-st="1">でも、覚えるのがめんどくさいので…</p>
     <h2 data-st="1" data-dl="1.1">全部、数字に<br>しちゃいましょう！</h2>
     <div class="scale" id="tutScale">${['ド','レ','ミ','ファ','ソ','ラ','シ'].map((j,k)=>`<div class="a" style="--dl:${.5+k*.1};--k:${k}"><small>${j}</small><b><span class="alpha">${'CDEFGAB'[k]}</span><span class="num">${k+1}</span></b></div>`).join('')}</div>
     <p class="sub a" style="--dl:1.2" data-upto="0">ド＝C、レ＝D … シ＝B です</p>
     <p class="sub" data-st="1" data-dl="2.6">ド＝1、レ＝2 … シ＝7<br>このアプリでは、この数字を使います</p>`,
   onStep:k=>{ const sc=$('tutScale'); if(sc) sc.classList.toggle('nums',k>=1); }},
  {html:()=>`<div class="eyebrow a">明るいコード・暗いコード</div>
     <h2 class="a" style="--dl:.1">明るいか暗いかは<br>数字で決まっています</h2>
     <div class="groups">
       <section class="a" style="--dl:.5"><h3>${ico('sun')} 明るい</h3><div class="chips7">${[0,3,4].map((d,k)=>tc(d,'bright',.8+k*.15)).join('')}</div></section>
       <section class="a" style="--dl:1.2"><h3>${ico('moon')} 暗い</h3><div class="chips7">${[1,2,5,6].map((d,k)=>tc(d,'dark',1.5+k*.15)).join('')}</div></section>
     </div>
     <p class="sub a" style="--dl:2.4">7dim には変なのがついていますが、気にしなくて大丈夫です</p>`},
  {html:()=>`<div class="eyebrow a">作り方</div>
     <h2 class="a" style="--dl:.1">この7個を好きにつなげると<br>コード進行のできあがり</h2>
     <div class="chips7">${[0,1,2,3,4,5,6].map((d,k)=>tc(d,'',.5+k*.08)).join('')}</div>
     <p class="a" style="--dl:1.4">だいたい4つか8つで一周します。<br>まずは<b>4つ</b>で作ってみましょう。</p>`},
  {coach:'place'}, {coach:'play'}, {coach:'weird'},
  {html:()=>`<div class="eyebrow a">コードの役割</div>
     <h2 class="a" style="--dl:.1">実は、コードには<br>それぞれ役割があります</h2>
     <p class="a" style="--dl:.5">さっきの進行は、この役割をうまく果たせていなかったんです。</p>
     <div class="roles">
       <section class="T a" style="--dl:1"><span class="L">T</span><div><h3>トニック</h3><p>主役。いちばん安定していて、帰ってくる場所。</p></div></section>
       <section class="S a" style="--dl:1.4"><span class="L">S</span><div><h3>サブドミナント</h3><p>脇役。変化や彩りを出す。</p></div></section>
       <section class="D a" style="--dl:1.8"><span class="L">D</span><div><h3>ドミナント</h3><p>緊張感がある。トニックに行きたい気持ちがとても強い。</p></div></section>
     </div>`},
  {html:()=>`<div class="eyebrow a">7つのコードの役割</div>
     <h2 class="a" style="--dl:.1">7つのコードは<br>こう分けられます</h2>
     <div class="roles">
       <section class="T a" style="--dl:.5"><span class="L">T</span><div><h3>トニック<small>（主役）</small></h3></div><div class="cs">${[0,5,2].map((d,k)=>tc(d,'T'+(d===2?' dash':''),.8+k*.12)).join('')}</div></section>
       <section class="S a" style="--dl:1.1"><span class="L">S</span><div><h3>サブドミナント<small>（脇役）</small></h3></div><div class="cs">${[3,1].map((d,k)=>tc(d,'S',1.4+k*.12)).join('')}</div></section>
       <section class="D a" style="--dl:1.7"><span class="L">D</span><div><h3>ドミナント<small>（緊張感）</small></h3></div><div class="cs">${[4,6,2].map((d,k)=>tc(d,'D'+(d===2?' dash':''),2+k*.12)).join('')}</div></section>
     </div>
     <p class="sub a" style="--dl:2.6">点線の <b>3m</b> は、T にも D にもなれます</p>
     <p class="sub a" style="--dl:2.9">6m と 7dim は、ときどき S にもなります</p>`},
  {html:()=>`<div class="eyebrow a">役割の流れ</div>
     <h2 class="a" style="--dl:.1">役割をつかった<br>お手本の流れは3つ</h2>
     <div class="flows">${[['①','TDT'],['②','TST'],['③','TSDT']].map(([no,f],k)=>`<div class="flow a" style="--dl:${.6+k*.6}"><span class="no">${no}</span>${[...f].map((r,j)=>`${j?`<span class="arr" style="--dl:${.9+k*.6+j*.15}"></span>`:''}<span class="tc ${r} pop" style="--dl:${.7+k*.6+j*.15}"><b>${r}</b></span>`).join('')}</div>`).join('')}</div>
     <p class="a" style="--dl:2.6">この流れにコードを当てはめて、<br>組み合わせるとコード進行ができます。</p>
     <p class="sub a" style="--dl:3.1">このような役割の流れを<b>「カデンツ」</b>と呼びます</p>`},
  {html:()=>`<div class="eyebrow a">実例①　小室進行</div>
     <h2 class="a" style="--dl:.1">6m → 4 → 5 → 1</h2>
     ${exampleHTML(EX.komuro)}
     <div class="exnote"><p class="a" style="--dl:1.4;--fn:var(--t)">お手本③（T→S→D→T）そのままの形。</p><p class="a" style="--dl:1.7;--fn:var(--t)">始まりの T を <b>1</b> ではなく、同じトニック（主役）の <b>6m</b> にすると、少し切ないドラマチックな雰囲気に。</p></div>
     ${listenBtn('komuro')}`},
  {html:()=>`<div class="eyebrow a">実例②　王道進行</div>
     <h2 class="a" style="--dl:.1">4 → 5 → 3m → 6m</h2>
     ${exampleHTML(EX.ohdo)}
     <div class="exnote"><p class="a" style="--dl:1.4;--fn:var(--s)"><b>始まりが T でなくても OK。</b>くり返すと 6m（T）から 4 に戻り、T→S→D→T の流れになります。</p><p class="a" style="--dl:1.8;--fn:var(--d)"><b>同じ役割が続いても OK。</b>5→3m は D→D。2つのドミナント（緊張感）で引っぱって、6m（T）に着地します。</p></div>
     ${listenBtn('ohdo')}`},
  {html:()=>`<div class="eyebrow a">実例③　カノン進行</div>
     <h2 class="a" style="--dl:.1">流れを組み合わせると<br>長い進行も作れます</h2>
     ${exampleHTML(EX.canon)}
     <div class="exnote"><p class="a" style="--dl:2;--fn:var(--d)">①T→D→T、②T→S→T、③T→S→D の3つを、つなぎ目の 6m や 1 を共有しながら並べています。</p><p class="a" style="--dl:2.3;--fn:var(--ink)">最後の D（5）は、先頭の 1 に戻って解決します。</p></div>
     ${listenBtn('canon')}`},
  {html:()=>`<div class="eyebrow a">さあ、作ってみよう</div>
     <h2 class="a" style="--dl:.1">では、実際に<br>作ってみましょう！</h2>
     <div class="flows"><div class="flow a" style="--dl:.6">${['T','S','D','T'].map((r,j)=>`${j?`<span class="arr" style="--dl:${.9+j*.15}"></span>`:''}<span class="tc ${r} pop" style="--dl:${.7+j*.15}"><b>${r}</b></span>`).join('')}</div></div>
     <p class="a" style="--dl:1.5">マスの上には、カデンツを線で表す<br>「進行ガイド」を出しておきます。</p>
     <div class="okcard a" style="--dl:2.1"><b>お手本どおりじゃなくても、<br>聴いてカッコよければOK！</b><small>黄色い線は「お手本と違うよ」の目印。<br>しっくりこないときのヒントにしてください。</small></div>`, last:true},
];
// ================= 雰囲気のつくり方（2つめのチュートリアル） =================
const SP=(o,q,x)=>({o,q,x:x||'',b:null});
Object.assign(EX,{
  near:  {degs:[0,1,2,3], roles:['T','S','T','S'], groups:[], style:'ポップス（定番）', bpm:96},
  far:   {degs:[5,1,4,0], roles:['T','S','D','T'], groups:[], style:'ポップス（定番）', bpm:96},
  calm:  {degs:[0,4,5,3], roles:['T','D','T','S'], groups:[], style:'しっとり', bpm:72},
  drive: {degs:[0,4,5,3], roles:['T','D','T','S'], groups:[], style:'ポップス（ノリノリ）', bpm:128},
  bright:{degs:[0,3,4,0], roles:['T','S','D','T'], groups:[], style:'ポップス（定番）', bpm:120},
  sad:   {degs:[5,3,4,0], roles:['T','S','D','T'], groups:[], style:'バラード', bpm:84},
  emo:   {degs:[3,4,2,5], roles:['S','D','D','T'], groups:[], style:'壮大', bpm:80},
  chic:  {degs:[SP(2,'m','7'),{o:5,q:'maj',x:'',b:7},SP(0,'maj','M7'),SP(9,'m','7')], roles:['S','D','T','T'], groups:[], style:'ボサノバ', bpm:104},
});
// お手本を鳴らすときは、その雰囲気に合う伴奏スタイル（メイン画面で選べるものと同じ）とテンポにする（ないときは元の設定）
const styleBy=name=>STYLES.find(x=>x.name===name);
function setStyle(st){ state.sOff=sOffOf(st); state.wide=!!st.wide; state.mix={}; if(st.mix) for(const c in st.mix) state.mix[c]={v:st.mix[c],m:false,s:false}; try{ applyMix(); }catch(e){} state.drum=st.drum; state.arp=st.arp; state.bassPat='auto'; state.bassSnd=st.bassSnd||'bass'; state.bass=st.bass!==false; state.kit=st.kit; state.inst=st.inst;  state.arp2=st.arp2||''; if(st.inst2) state.inst2=st.inst2;  }
function tutLoadEx(ex){ const b=TUT.backup?JSON.parse(TUT.backup):state, st=ex.style&&styleBy(ex.style);
  // 伴奏スタイルが決まっているお手本は、そのスタイルの楽器で。決まっていないもの（作業中の楽器で鳴っていたもの）はピアノ＋ベースで
  if(st) setStyle(st); else Object.assign(state,{drum:b.drum,arp:b.arp,kit:b.kit,bassPat:b.bassPat,inst:'piano',arp2:'',bass:true,bassSnd:'bass'});
  state.bpm=ex.bpm||b.bpm; state.fill=false; state.key=ex.key||'C';
  $('bpm').value=state.bpm; $('bpmOut').textContent=state.bpm; tutLoad(ex.degs,ex.segs,ex.ant); ensureSounds(); }
const moodSlide=(no,title,h,key,notes)=>({html:()=>`<div class="eyebrow a">雰囲気${no}　${title}</div>
     <h2 class="a" style="--dl:.1">${h}</h2>
     ${exampleHTML(EX[key])}
     <div class="exnote">${notes.map((t,k)=>`<p class="a" style="--dl:${1+k*.3};--fn:var(--${['t','s','d'][k%3]})">${t}</p>`).join('')}</div>
     ${listenBtn(key)}`});
// 実践編のお題：ヒントと、できた進行がその雰囲気になっているかの判定
const BRIGHT=new Set([0,3,4]), DARK=new Set([1,2,5,6]);
const pdist=(a,b)=>{ const d=Math.abs(a-b)%7; return Math.min(d,7-d); };   // 数字どうしの距離（1と5は3、1と2mは1）
const PRACTICE={
  bright:{name:'明るい・元気', sub:'晴れた日の朝みたいに', style:'ポップス（定番）', bpm:120,
    hint:'明るいコード（1・4・5）を多めに使って、1 から始めてみましょう。',
    check:q=>q.filter(d=>BRIGHT.has(d)).length>=3, ok:'明るいコードが多くて、元気でまっすぐな響きになっています。', ng:'暗いコードが多めです。1・4・5 を増やしてみましょう。'},
  sad:{name:'切ない', sub:'夕暮れの帰り道みたいに', style:'バラード', bpm:80,
    hint:'暗いコード（6m・3m・2m）を混ぜて、6m から始めるか、6m で終わってみましょう。',
    check:q=>q[0]===5||q[q.length-1]===5||q.filter(d=>DARK.has(d)).length>=2, ok:'暗いコードと始まり・終わりの選び方で、切ない雰囲気が出ています。', ng:'6m から始めるか 6m で終わるか、暗いコードをもう1つ混ぜてみましょう。'},
  strong:{name:'力強い', sub:'サビで盛り上がるように', style:'ロック', bpm:128,
    hint:'数字が離れたコードへ跳んでみましょう（1→4、6m→2m、5→1 など）。',
    check:q=>q.filter((d,k)=>pdist(d,q[(k+1)%q.length])===3).length>=2, ok:'大きく跳ぶ動きが多くて、力強く進んでいます。', ng:'となり同士の動きが多めです。1→4、6m→2m のように跳んでみましょう。'},
  calm:{name:'穏やか', sub:'ゆっくり流れる雲みたいに', style:'しっとり', bpm:76,
    hint:'となりの数字へ進んでみましょう（1→2m、4→3m、6m→5 など）。',
    check:q=>q.filter((d,k)=>pdist(d,q[(k+1)%q.length])===1).length>=2, ok:'となりへ進む動きが多くて、なめらかで穏やかです。', ng:'跳ぶ動きが多めです。1→2m、4→3m のように、となりへ進んでみましょう。'},
};
const MOOD=[
  {html:()=>`<div class="eyebrow a">雰囲気のつくり方</div>
     <div class="chips7">${[0,5,3,4].map((d,k)=>`<span class="floaty" style="animation-delay:${k*.4}s;display:inline-block">${tc(d,['bright','dark','bright','bright'][k],.2+k*.15)}</span>`).join('')}</div>
     <h2 class="a" style="--dl:.8">曲の雰囲気は<br>コード選びで決まります</h2>
     <p class="a" style="--dl:1.2">明るい、切ない、おしゃれ…。<br>ねらった雰囲気に近づく4つのコツと実例を見て、<br>最後は実際に作ってみましょう。</p>`},
  {html:()=>`<div class="eyebrow a">コツ①　明るいコードと暗いコードの割合</div>
     <h2 class="a" style="--dl:.1">明るいコードが多いと元気に<br>暗いコードが多いと切なく</h2>
     <div class="groups">
       <section class="a" style="--dl:.5"><h3>${ico('sun')} 元気</h3><div class="chips7">${[0,3,4].map((d,k)=>tc(d,'bright',.8+k*.15)).join('')}</div></section>
       <section class="a" style="--dl:1.1"><h3>${ico('moon')} 切ない</h3><div class="chips7">${[5,2,1].map((d,k)=>tc(d,'dark',1.4+k*.15)).join('')}</div></section>
     </div>
     <p class="a" style="--dl:2">4つのうち、暗いコードを1つ混ぜるだけでも<br>雰囲気にかげりが出ます。</p>`},
  {html:()=>`<div class="eyebrow a">コツ②　始まりと終わりのコード</div>
     <h2 class="a" style="--dl:.1">最初と最後のコードが<br>印象を決めます</h2>
     <div class="roles">
       <section class="T a" style="--dl:.5"><span class="L">1</span><div><h3>1 で始める・終わる</h3><p>明るく、スッキリ。「完結した」感じ。</p></div></section>
       <section class="T a" style="--dl:.8"><span class="L" style="font-size:1.5rem">6m</span><div><h3>6m で始める・終わる</h3><p>切ない。余韻が残る。</p></div></section>
       <section class="S a" style="--dl:1.1"><span class="L">4</span><div><h3>4 で始める・終わる</h3><p>ふわっと浮かぶ。まだ続きそうな感じ。</p></div></section>
       <section class="D a" style="--dl:1.4"><span class="L">5</span><div><h3>5 で終わる</h3><p>次へ引っぱる。くり返しにぴったり。</p></div></section>
     </div>`},
  {html:()=>`<div class="eyebrow a">コツ③　コードどうしの距離</div>
     <h2 class="a" style="--dl:.1">離れると力強く<br>近いと穏やかに</h2>
     <div class="roles">
       <section class="S a" style="--dl:.5"><span class="L" style="font-size:1.1rem">近い</span><div><h3>となりの数字へ進む</h3><p>1→2m、4→5 など。なめらか。</p></div></section>
       <section class="D a" style="--dl:.9"><span class="L" style="font-size:1.1rem">遠い</span><div><h3>数字が離れたコードへ跳ぶ</h3><p>1→4、6m→2m など。力強い。</p></div></section>
     </div>
     <p class="a" style="--dl:1.4">サビで力強くしたいときは跳んで、<br>静かな所では、となりへ進んでみましょう。</p>
     <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">${listenBtn('near').replace('聴いてみる','近い：1-2m-3m-4')}${listenBtn('far').replace('聴いてみる','遠い：6m-2m-5-1')}</div>`},
  {html:()=>`<div class="eyebrow a">コツ④　リズムとテンポ</div>
     <h2 class="a" style="--dl:.1">同じ進行でも<br>リズムで雰囲気が変わります</h2>
     ${exampleHTML(EX.calm)}
     <p class="a" style="--dl:1">伴奏スタイルとテンポ（速さ）を変えるだけで、<br>しっとりにも、ノリノリにもなります。</p>
     <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">${listenBtn('calm').replace('聴いてみる','しっとり版')}${listenBtn('drive').replace('聴いてみる','ノリノリ版')}</div>`},
  moodSlide('①','明るい・元気','明るいコードで<br>まっすぐ進む','bright',['明るいコード（1・4・5）だけ。迷いのない元気な響きに。','テンポ（速さ）は速め（110〜130くらい）がおすすめ。']),
  moodSlide('②','切ない','暗いコードから<br>始めてみる','sad',['6m で始めると、出だしから切ない雰囲気に（小室進行）。','最後は 1 で明るく着地。切ないのに前向き。']),
  moodSlide('③','エモい・泣ける','4 から始めて<br>6m に着地','emo',['4 → 5 と上がって盛り上げてから、暗い 6m に落とす（王道進行）。','5 → 3m と下りてから、6m にストンと着地。しっとり切なく終わります。']),
  moodSlide('④','おしゃれ','コードの響きを<br>少し変えてみる','chic',['2m7・1M7 のように 7 や M7 を足すと、大人っぽい響きに。','レベル6以降で、自分でもこうした響きに変えられるようになります。']),
  {html:()=>`<div class="eyebrow a">まとめ</div>
     <h2 class="a" style="--dl:.1">雰囲気づくりの4つのコツ</h2>
     <div class="roles">
       <section class="T a" style="--dl:.5"><span class="L">①</span><div><h3>明るい・暗いの割合</h3><p>暗いコードが増えるほど、切なくなる。</p></div></section>
       <section class="S a" style="--dl:.8"><span class="L">②</span><div><h3>始まりと終わり</h3><p>1 はスッキリ、6m は切ない。</p></div></section>
       <section class="D a" style="--dl:1.1"><span class="L">③</span><div><h3>コードどうしの距離</h3><p>跳ぶと力強く、となりへ進むと穏やか。</p></div></section>
       <section class="T a" style="--dl:1.4"><span class="L">④</span><div><h3>リズムとテンポ</h3><p>伴奏スタイルとテンポで印象が変わる。</p></div></section>
     </div>
     <p class="a" style="--dl:1.9">では、このコツを使って<br>実際に作ってみましょう！</p>`},
  {html:()=>`<div class="eyebrow a">実践編</div>
     <h2 class="a" style="--dl:.1">どんな雰囲気の進行を<br>作ってみますか？</h2>
     <div class="moodpick">${Object.entries(PRACTICE).map(([k,m],j)=>`<button class="a" style="--dl:${.5+j*.15}" data-mood="${k}"><b>${m.name}</b><small>${m.sub}</small></button>`).join('')}</div>
     <p class="sub a" style="--dl:1.3">選ぶと、メイン画面で作り始めます</p>`,
   enter:()=>document.querySelectorAll('.moodpick button').forEach(b=>b.onclick=()=>{ TUT.mood=b.dataset.mood; TUT.moodInit=false; showSlide(TUT.i+1); })},
  {coach:'mood'},
];
// ================= ステージ（長いレベルを区切る）と、おさらい =================
// レベル1・2（続けて進む）とレベル3を、いくつかのステージに分ける。次のステージに入ったら、左上のバーで「クリア」を短く知らせる
SLIDES.forEach((s,i)=>{ s.stg=i<5?1:i<7?2:i<11?3:4; s.sid=100+i; });
MOOD.forEach((s,i)=>{ s.stg=i<5?1:i<10?2:3; s.sid=300+i; });
// sid：説明の順番（レベル×100＋そのレベルの何枚目か）。おさらいは「このページより前で説明した言葉」だけを出すのに使う
const STG12={label:'LEVEL 1・2', goal:'自分の進行を作る', list:[
  {name:'コードって何？'},
  {name:'並べて鳴らす'},
  {name:'コードの役割'},
  {name:'実例で聴く', recap:['有名な進行も、T・S・D の流れでできている','お手本どおりでなくても、聴いてよければOK']}]};
const STAGES={1:STG12, 2:STG12, 3:{label:'LEVEL 3', goal:'ねらった雰囲気の進行を作る', list:[
  {name:'4つのコツ'},
  {name:'実例を聴く'},
  {name:'作ってみる'}]}};
// おさらい：いま開いているページに出てくる言葉だけを出す（上から下りてくるパネル）
const roleIs=(st,L)=>[...st.querySelectorAll('.tc b,.roles .L,.flow .tc b')].some(b=>b.textContent.trim()===L);
const GLOSS=[
  {t:'コード', at:101, re:/コード/, x:'いくつかの音を同時に鳴らした「和音」のことです。'},
  {t:'コード進行', at:101, re:/進行/, x:'コードを順番につなげたもの。だいたい4つか8つで一周します。'},
  {t:'コードの数字', at:102, q:st=>!!st.querySelector('.tc')||/数字/.test(st.textContent), x:'ド＝1、レ＝2 … シ＝7。コードの数字は音の高さを表します。'},
  {t:'明るいコード・暗いコード', at:101, re:/明るい|暗い|[1-7]m/, x:'何も付いていなければ明るいコード、「m」が付いていれば暗いコードです。', c:()=>tc(0,'bright')+tc(5,'dark')},
  {t:'トニック（T）', at:108, q:st=>/トニック/.test(st.textContent)||roleIs(st,'T'), x:'主役。いちばん安定していて、帰ってくる場所です。', c:()=>tc(0,'T')+tc(5,'T')},
  {t:'サブドミナント（S）', at:108, q:st=>/サブドミナント/.test(st.textContent)||roleIs(st,'S'), x:'脇役。変化や彩りを出します。', c:()=>tc(3,'S')+tc(1,'S')},
  {t:'ドミナント（D）', at:108, q:st=>/(^|[^ブ])ドミナント/.test(st.textContent)||roleIs(st,'D'), x:'緊張感があり、トニックに行きたい気持ちがとても強いコードです。', c:()=>tc(4,'D')+tc(6,'D')},
  {t:'カデンツ', at:110, re:/カデンツ|役割の流れ/, x:'役割の流れのこと。T→D→T、T→S→T、T→S→D→T の3つがお手本です。'},
  {t:'進行ガイド', at:114, re:/進行ガイド|黄色い線/, x:'マスの上に、役割の流れを線で表す目印です。黄色い線は「お手本と違うよ」の目印です。'},
  {t:'テンポ', at:304, re:/テンポ/, x:'曲の速さです。数字が大きいほど速くなります。'},
  {t:'伴奏スタイル', at:304, re:/伴奏/, x:'コードに合わせて鳴る、楽器の演奏のしかたです。'},
  {t:'小節', at:500, re:/小節/, x:'曲の区切りです。このアプリでは、1マスが1小節です。'},
  {t:'キー', at:400, re:/キー/, x:'進行全体の高さです。キーを変えると、同じ進行を高くしたり低くしたりできます。'},
];
// いまのページの順番（sid のないタイトル・クリアの画面は、レベルの始まり・終わりとして数える）
function curSid(){ const sl=DECK[TUT.i]||{}, n=DECK.lv||1; return sl.sid!=null?sl.sid:n*100+(TUT.i?99:0); }
// 説明したページを実際に見たかどうか（途中のレベルから始めた人には、見ていない言葉を出さない）
const SEEN_KEY=STK('chord-palette-tutseen');
let TSEEN=new Set(); try{ TSEEN=new Set(JSON.parse(localStorage.getItem(SEEN_KEY)||'[]')); }catch(e){}
function markSeen(){ const sl=DECK[TUT.i]; if(!sl||sl.sid==null||TSEEN.has(sl.sid)) return; TSEEN.add(sl.sid); try{ localStorage.setItem(SEEN_KEY,JSON.stringify([...TSEEN])); }catch(e){} }
function revTerms(){ const st=$('tutStage'); if(!st) return []; const tx=st.textContent, now=curSid(), ok=a=>a<now&&TSEEN.has(a);
  const L=GLOSS.filter(g=>ok(g.at) && (g.q?g.q(st):g.re.test(tx)));
  return L; }
function openRev(){ const L=revTerms(); if(!L.length) return;
  $('revList').innerHTML=L.map(g=>`<div class="revitem"><b>${g.t}</b><p>${g.x}</p>${g.c?`<div class="revchips">${g.c()}</div>`:''}</div>`).join('');
  $('revWrap').hidden=false; bindHear(); }
function closeRev(){ const w=$('revWrap'); if(w) w.hidden=true; }
// 左上の進み具合：ステージごとに区切ったバー（ステージのないレベルは1本）
const IC_FLAG='<svg width="15" height="15" viewBox="0 0 16 16" role="img" aria-label="ゴール"><path d="M4 14V2.5M4 3h7.5l-1.6 2.6L11.5 8.2H4" fill="none" stroke="var(--warn)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
// ================= レベル（全12） =================
Object.assign(EX,{
  long8: {degs:[3,4,2,5,3,4,0,0], roles:['S','D','D','T','S','D','T','T'], groups:[{a:0,b:3,t:'1回目：6m で終わる',c:'s'},{a:4,b:7,t:'2回目：1 で終わる',c:'t',row:1}], style:'ポップス（定番）', bpm:96},
  lv0:  {degs:[3,4,2,5], roles:['S','D','D','T'], groups:[], style:'ロック', bpm:120},
  lv7:  {degs:[SP(5,'maj','M7'),SP(7,'maj','7'),SP(4,'m','7'),SP(9,'m','7')], roles:['S','D','D','T'], groups:[], style:'ポップス（定番）', bpm:96},
  lv9:  {degs:[SP(5,'maj','M9'),SP(7,'maj','9'),SP(4,'m','7'),SP(9,'m','9')], roles:['S','D','D','T'], groups:[], style:'ジャジー', bpm:84},
  push: {degs:[3,4,SP(4,'maj','7'),5], roles:['S','D','D','T'], groups:[{a:2,b:3,t:'3(7) → 6m へ強く進む',c:'d'}], style:'ポップス（定番）', bpm:92},
  sad4: {degs:[0,3,SP(5,'m'),0], roles:['T','S','S','T'], groups:[{a:1,b:2,t:'4 → 4m で切なく',c:'s'}], style:'バラード', bpm:76},
  walk: {degs:[0,VSP(7,'maj','',11),5,4,3,VSP(0,'maj','',4),1,4], roles:['T','D','T','D','S','T','S','D'], groups:[{a:0,b:6,t:'ベースが 1 → 7 → 6 → 5 → 4 → 3 → 2 と下りていく',c:'ink'}], style:'バラード', bpm:84},
  half: {degs:[3,4,2,1], segs:{2:[{beat:3,v:5}],3:[{beat:3,v:4}]}, roles:['S','D','D','S'], groups:[], style:'ポップス（定番）', bpm:96},
  jump: {degs:[0,4,5,3], roles:['T','D','T','S'], groups:[{a:0,b:3,t:'ベース：1 → 5 → 6 → 4（大きく跳ぶ）',c:'d'}], style:'バラード', bpm:80},
  smooth:{degs:[0,VSP(7,'maj','',11),5,3], roles:['T','D','T','S'], groups:[{a:0,b:3,t:'ベース：1 → 7 → 6 → 4（なめらか）',c:'t'}], style:'バラード', bpm:80},
});
// 鍵盤（白鍵 1〜7、1〜4）。コードの構成音を「1つ飛ばし」で光らせる
const KN=['ド','レ','ミ','ファ','ソ','ラ','シ'];
const kbdHTML=()=>`<div class="kbd a" id="kbd" style="--dl:.3">${Array.from({length:11},(_,i)=>`<div class="wk" data-i="${i}"><b>${KN[i%7]}</b><small>${'CDEFGAB'[i%7]}</small></div>`).join('')}${[0,1,3,4,5,7,8].map(i=>`<i class="bk" style="left:calc(${(i+1)/11*100}% - 3%)"></i>`).join('')}</div>`;
function kbdShow(d,anim){ const k=$('kbd'); if(!k) return; k.querySelectorAll('.wk').forEach(w=>{ w.classList.remove('on','skip'); w.style.transitionDelay=''; });
  if(d==null) return;
  [[d,'on',0],[d+1,'skip',1],[d+2,'on',2],[d+3,'skip',3],[d+4,'on',4]].forEach(([i,c,n])=>{ const w=k.querySelector(`.wk[data-i="${i}"]`); if(!w) return; if(anim) w.style.transitionDelay=(n*.35)+'s'; w.classList.add(c); });
  // 光る鍵盤に合わせて「ドー・ミー・ソー」と1音ずつ鳴らしてから、和音で「ジャーン」
  clearTimeout(kbdShow.t); const W=[0,2,4,5,7,9,11], mOf=i=>60+W[i%7]+12*Math.floor(i/7);
  if(anim && !playing){ ensureSounds(); whenRunning(()=>{ if(playing) return; const t0=ctx.currentTime+.05, sv=state.inst; state.inst='piano'; [d,d+2,d+4].forEach((i,n)=>keyTone(mOf(i),t0+n*.7,.62,.7)); state.inst=sv; }); }
  kbdShow.t=setTimeout(()=>preview(d), anim?2100:0); }
const bindKbd=()=>document.querySelectorAll('.tut [data-kd]').forEach(b=>b.onclick=()=>{ document.querySelectorAll('.tut [data-kd]').forEach(x=>x.classList.toggle('now',x===b)); kbdShow(+b.dataset.kd,true); });
const SPX=o=>JSON.stringify({b:null,...o}).replace(/"/g,'&quot;');
const hearChip=(d,dl)=>`<button class="tc hear pop" style="--dl:${dl}" data-hear="${SPX(d)}"><b>${al(d)}</b><small>${nmN(d)}</small></button>`;
const PAIR=(a,b)=>JSON.stringify([a,b].map(x=>isNum(x)?x:{b:null,...x})).replace(/"/g,'&quot;');
// キーを指定したコードは、そのキーで鳴らす（いまのキーは変えない）
function hearIn(d,key){ if(!key||key===state.key) return preview(d); if(playing) return; whenRunning(()=>{ if(playing) return; const k0=state.key; state.key=key; previewNow(d); state.key=k0; }); }
const bindHear=()=>{ document.querySelectorAll('.tut [data-hear]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); hearIn(JSON.parse(b.dataset.hear), b.dataset.key);
    b.classList.add('tapped'); setTimeout(()=>b.classList.remove('tapped'),350); });
  // 2つ続けて鳴らす（m を外したコード → 4つ目のコード）。鳴っている方を光らせる
  document.querySelectorAll('.tut [data-pair]').forEach(b=>b.onclick=()=>{ const [x,y]=JSON.parse(b.dataset.pair), cs=b.querySelectorAll('.tc'), a=cs[0], z=cs[cs.length-1];
    clearTimeout(b._t); clearTimeout(b._t2); a.classList.add('now'); z.classList.remove('now'); preview(x);
    b._t=setTimeout(()=>{ a.classList.remove('now'); z.classList.add('now'); preview(y); },750); b._t2=setTimeout(()=>z.classList.remove('now'),1700); }); };
const bassRel=v=>v==null?null:(bassPcOf(v)-keyObj().pc+12)%12;
// ベースの動きの大きさ（となりのコードとのベースの距離の合計。1周つながる）
const bassLeap=(arr)=>{ const vs=(arr||[0,1,2,3].map(k=>state.slots[k])).filter(v=>v!=null).map(v=>bassRel(v)); let t=0;
  vs.forEach((b,k)=>{ const n=vs[(k+1)%vs.length], d=Math.abs(b-n)%12; t+=Math.min(d,12-d); }); return t; };
const slotsSpec=()=>[0,1,2,3].map(k=>state.slots[k]).filter(v=>v!=null&&!isNum(v)).map(specOf);
// 練習：メイン画面で、吹き出しのお題をこなす
const TASKS={
  cadence:{load:[], style:'ポップス（定番）', bpm:96, guide:true,
    text:'進行ガイドを見ながら、<b>お手本の流れ</b>になるように4つ並べてみましょう。', hint:'マスの上に「◎ お手本どおりの流れ」と出たら成功です',
    check:()=>[0,1,2,3].every(k=>state.slots[k]!=null) && guideInfo().text.startsWith('◎'),
    ok:'お手本どおりの流れです。役割をつなぐと、自然なコード進行になります。', ng:'黄色い線の所を、T・S・D の流れになるように入れ替えてみましょう。'},
  long:{load:[3,4,2,5,3,4,2,5], style:'ポップス（定番）', bpm:96,
    text:'同じ4つが2回並んでいます。<b>8つ目のコードを 1 に</b>変えて、区切りをつけてみましょう。', hint:'マスの上の小さな四角をタップすると、5〜8つ目に切り替わります',
    check:()=>state.slots[7]!=null && tokOf(state.slots[7])===0,
    ok:'2回目の終わりが 1 になって、ひと区切りついた感じになりました。', ng:'8つ目のコードを 1 にしてみましょう。'},
  tension:{load:[3,4,2,5], style:'ポップス（定番）', bpm:92,
    text:'置いたコードをタップして、<b>数字のついたコード</b>に入れ替えてみましょう。', hint:'2つ以上入れ替えたら、再生して聴いてみましょう',
    check:()=>slotsSpec().filter(sp=>/\d/.test(sp.x||'')).length>=2,
    ok:'響きが一気に洗練されました。', ng:'数字のついたコードを、もう少し増やしてみましょう。'},
  secdom:{load:[0,5,1,4], style:'ポップス（定番）', bpm:96,
    text:'「1 → 6m → 2m → 5」の <b>6m をタップして、明るい 6(7)</b> に変えてみましょう。', hint:'6(7) から数えて4つ目は 2m。次の 2m へ強く進みます',
    check:()=>{ const v=state.slots[1]; return v!=null&&!isNum(v)&&specOf(v).o===9&&specOf(v).q==='maj'; },
    ok:'6(7) から 2m へ、引き寄せられるように進みました。', ng:'2つ目の 6m をタップして、6(7) を選んでみましょう。'},
  minor4:{load:[0,3,3,0], style:'バラード', bpm:76,
    text:'2つ並んだ 4 の<b>うしろの方を 4m</b> にして、「4 → 4m → 1」を作ってみましょう。', hint:'3つ目の 4 をタップして、4m を選びます',
    check:()=>{ const v=state.slots[2]; return tokOf(state.slots[1])===3 && v!=null&&!isNum(v)&&specOf(v).o===5&&specOf(v).q==='m'; },
    ok:'明るい 4 から暗い 4m へ。切なさが一瞬だけ差し込みました。', ng:'3つ目の 4 をタップして、4m を選んでみましょう。'},
  key:{load:[0,5,1,4], style:'ポップス（定番）', bpm:96, keys:['C','G','D','A','E','F'],
    text:'下のボタンで<b>キーを変えて</b>、再生してみましょう。マスの数字はそのまま、アルファベットだけが変わります。', hint:'どのキーが好みか聴き比べてみましょう',
    check:()=>state.key!=='C',
    ok:'同じ進行のまま、高さだけが変わりました。', ng:'下のボタンで、C 以外のキーを選んでみましょう。'},
  smooth:{load:[3,0,4,5], style:'ポップス（定番）', bpm:92,
    text:'「4 → 1 → 5 → 6m」は、ベースが大きく跳んでいます。コードをタップして<b>ベースの音を変え</b>、なめらかにしてみましょう。', hint:'どのコードのベースを変えると、となりのベースに近づくか考えてみましょう',
    check:()=>[0,1,2,3].some(k=>{ const v=state.slots[k]; return v!=null&&!isNum(v)&&specOf(v).b!=null; }) && bassLeap()<bassLeap([3,0,4,5]),
    ok:'ベースの動きが小さくなって、つながりがなめらかになりました。', ng:'ベースが前後のコードのベースに近くなるように、ベースの音を選び直してみましょう。'},
  split:{load:[0,5,3,4], style:'ポップス（定番）', bpm:96,
    text:'置いてあるコードの<b>右側</b>にコードをドラッグして、1小節に2つのコードを入れてみましょう。', hint:'例：4 のマスの右側に 5 を置く',
    check:()=>[0,1,2,3].some(k=>segsOf(k).length>0),
    ok:'コードの切り替わりが細かくなって、流れに勢いが出ました。', ng:'置いてあるコードの右半分にドラッグしてみましょう。'},
};
const lvTitle=(n)=>({html:()=>{ const l=LEVELS[n-1]; return `<div class="eyebrow a">LEVEL ${n}</div>
     <h2 class="a" style="--dl:.2">${l.name}</h2>
     <p class="a" style="--dl:.6">${l.goal}</p>
     ${l.unlock?`<div class="okcard a lvtitle" style="--dl:1"><b>クリア報酬</b><small>${l.unlock}</small></div>`:''}`; }});
const libAdd=n=>{ if(n<4) return ''; const k=PRESETS.filter(p=>presetLv(p)===n).length; return k?`<br><small>進行ライブラリに ${k}個の進行が追加されました</small>`:''; };
const lvClear=(n)=>({html:()=>{ const l=LEVELS[n-1]; return `<div class="eyebrow a">LEVEL ${n} CLEAR</div>
     <h2 class="a" style="--dl:.1">レベル${n}クリア！</h2>
     ${l.unlock?`<div class="okcard a" style="--dl:.5"><b>アンロック：${l.unlock}</b>${libAdd(n)}</div>`:''}
     <p class="a" style="--dl:.9">${n<LV_MAX?'少し自由に作ってみてから、次のレベルへ進みましょう。':'これで全レベルクリアです。'}</p>`; }, last:true});
const L_SLIDES={
  long:[
    {html:()=>`<div class="eyebrow a">進行を長くする</div>
     <h2 class="a" style="--dl:.1">4つを2回くり返し<br>最後だけ変える</h2>
     ${exampleHTML(EX.long8)}
     <div class="exnote"><p class="a" style="--dl:1.6;--fn:var(--s)">同じ4つをくり返すだけでも、曲らしいまとまりが出ます。</p><p class="a" style="--dl:1.9;--fn:var(--t)">2回目の最後を 1 にすると、ひと区切りついた感じになります。</p><p class="a" style="--dl:2.2;--fn:var(--ink)">小節数は、設定メニューの「小節数」で 8・16 に変えられます。</p></div>
     ${listenBtn('long8')}`},
    {coach:'task', task:'long'}],
  tension:[
    {steps:2, enter:bindHear, html:()=>`<div class="eyebrow a">数字のついたコード</div>
     <div class="chordbig pop" style="--dl:.2"><span>Am</span><span class="tn">7</span></div>
     <p class="a" style="--dl:.7" data-upto="0">このように、コードには<br>後ろに数字がつくことがあります。</p>
     <h2 data-st="1" data-dl=".2">この数字は、ざっくり言うと<br>『オシャレ度』です</h2>
     <p class="sub" data-st="1" data-dl=".8">（正確には、7 は『セブンス』、9・11・13 は『テンション』と呼びます）</p>
     <p data-st="2" data-dl=".2">数字が大きいほど、また数が多いほど、<br><b>オシャレな響き</b>になります。</p>
     <div class="chips7" data-st="2" data-dl=".5">${[SP(9,'m'),SP(9,'m','7'),SP(9,'m','9'),SP(9,'m','11')].map((d,k)=>hearChip(d,.6+k*.15)).join('')}</div>
     <p class="sub" data-st="2" data-dl="1.3">タップすると鳴らせます</p>`},
    {html:()=>`<div class="eyebrow a">曲調とオシャレ度</div>
     <h2 class="a" style="--dl:.1">曲調によって、よく使う<br>オシャレ度が変わります</h2>
     <div class="roles">
       <section class="D a" style="--dl:.5"><span class="L" style="font-size:1rem">なし</span><div><h3>ロック</h3><p>数字なしで、シンプルに力強く。</p></div>${listenBtn('lv0').replace('聴いてみる','聴く')}</section>
       <section class="S a" style="--dl:.8"><span class="L">7</span><div><h3>J-POP</h3><p>7 や M7 で、ほどよく洗練された響きに。</p></div>${listenBtn('lv7').replace('聴いてみる','聴く')}</section>
       <section class="T a" style="--dl:1.1"><span class="L" style="font-size:1.1rem">9〜</span><div><h3>ジャズ・シティポップ</h3><p>9 や 11 まで使って、都会的な響きに。</p></div>${listenBtn('lv9').replace('聴いてみる','聴く')}</section>
     </div>
     <p class="sub a" style="--dl:1.6">どれも同じ「4 → 5 → 3m → 6m」です</p>`},
    {coach:'task', task:'tension'}],
  flip:[
    {enter:bindHear, html:()=>`<div class="eyebrow a">明るいコードと暗いコードを入れ替える</div>
     <h2 class="a" style="--dl:.1">m を外したり<br>m をつけたりできます</h2>
     <p class="a" style="--dl:.5">2m や 3m は、m を外して使うことがあります。<br>逆に、4 に m をつけることもできます。</p>
     <div class="flipgrid">${[[SP(2,'m'),SP(2,'maj','7')],[SP(4,'m'),SP(4,'maj','7')],[SP(5,'maj'),SP(5,'m')]].map(([a,b],k)=>`<div class="a" style="--dl:${.9+k*.3};display:flex;align-items:center;gap:8px;justify-content:center">${hearChip(a,1+k*.3)}<span style="color:var(--muted);font-weight:700">→</span>${hearChip(b,1.2+k*.3)}</div>`).join('')}</div>
     <p class="sub a" style="--dl:2">タップすると鳴らせます</p>`},
    {html:()=>`<div class="eyebrow a">m を外すと</div>
     <h2 class="a" style="--dl:.1">次のコードへ進む力が<br>強くなる</h2>
     ${exampleHTML(EX.push)}
     <div class="exnote"><p class="a" style="--dl:1.4;--fn:var(--d)">本来は暗いコードを明るくすると、<b>次のコードへ引き寄せられるように</b>進みたくなります。</p><p class="a" style="--dl:1.7;--fn:var(--ink)">では、どのコードへ進みたくなるのでしょうか？</p></div>
     ${listenBtn('push')}`},
    {enter:bindHear, html:()=>`<div class="eyebrow a">m を外したコードの行き先</div>
     <h2 class="a" style="--dl:.1">自分から数えて<br>4つ目のコードへ進む</h2>
     <div class="count4 a pairbtn" style="--dl:.4" data-pair="${PAIR(SP(4,'maj','7'),5)}">${[[SP(4,'maj','7'),'1つ目'],[3,'2つ目'],[4,'3つ目'],[5,'4つ目']].map(([d,t],k)=>`<div class="${k===0?'from':k===3?'to':''}"><span class="tc ${k===0?'D':k===3?'T':''}"><b>${nm(d)}</b></span><small>${t}</small></div>`).join('<i>›</i>')}</div>
     <p class="a" style="--dl:1">3(7) から 4・5 と数えて、<b>4つ目の 6m</b> へ進むと、ぴったり落ち着きます。</p>
     <div class="pairs">${[[SP(2,'maj','7'),4],[SP(9,'maj','7'),1],[SP(0,'maj','7'),3]].map(([a,b],k)=>`<button class="pairbtn a" style="--dl:${1.4+k*.25}" data-pair="${PAIR(a,b)}"><span class="tc"><b>${al(a)}</b><small>${nmN(a)}</small></span><span>→</span><span class="tc"><b>${al(b)}</b><small>${nmN(b)}</small></span></button>`).join('')}</div>
     <p class="sub a" style="--dl:2">タップすると、行き先のコードまで続けて鳴らします</p>
     <p class="sub a" style="--dl:2.2">2(7) → 5、6(7) → 2m、1(7) → 4 も同じ「4つ目」。<br>進行ガイドは、4つ目へ進んでいないと黄色で知らせます。</p>`},
    {coach:'task', task:'secdom'},
    {html:()=>`<div class="eyebrow a">m をつけると</div>
     <h2 class="a" style="--dl:.1">4m は<br>とても切ない響き</h2>
     ${exampleHTML(EX.sad4)}
     <div class="exnote"><p class="a" style="--dl:1.4;--fn:var(--s)">4m は、本来は明るい 4 を暗くしているので、とても切ない響きになります。</p><p class="a" style="--dl:1.7;--fn:var(--s)">4 → 4m → 1 の順で使うのが定番です。</p></div>
     ${listenBtn('sad4')}`},
    {coach:'task', task:'minor4'}],
  slash:[
    {steps:2, enter:bindKbd, onStep:k=>{ if(k===1) kbdShow(0,true); if(k===0) kbdShow(null); }, html:()=>`<div class="eyebrow a">コードの構成音</div>
     <h2 class="a" style="--dl:.1" data-upto="0">鍵盤の白いところは<br>ドレミファソラシ</h2>
     <h2 data-st="1" data-upto="1" data-dl=".1">1つ飛ばしで<br>3つの音を選ぶと……</h2>
     <h2 data-st="2" data-dl=".1">どの音から始めても<br>作り方は同じです</h2>
     ${kbdHTML()}
     <p class="a" style="--dl:.6" data-upto="0">アルファベットでは C・D・E・F・G・A・B と書きます。</p>
     <p data-st="1" data-upto="1" data-dl="2">ド（C）から、レを飛ばしてミ（E）、ファを飛ばしてソ（G）。<br>この3つを同時に鳴らすと「C」のコードになります。</p>
     <div class="chips7 kbtns" data-st="2" data-dl=".3">${[0,1,2,3,4,5,6].map(d=>`<button class="tc hear" data-kd="${d}"><b>${al(d)}</b></button>`).join('')}</div>
     <p data-st="2" data-dl=".6">コードをタップすると、鍵盤に表示して鳴らします。<br>こうして選んだ3つの音を<b>構成音</b>と呼びます。</p>`},
    {enter:bindHear, html:()=>`<div class="eyebrow a">分数コード</div>
     <h2 class="a" style="--dl:.1">構成音のどれを<br>いちばん下にするか</h2>
     <div class="chips7">${hearChip(SP(0,'maj'),.5)}${hearChip(VSP(0,'maj','',4),.7)}${hearChip(VSP(0,'maj','',7),.9)}</div>
     <p class="a" style="--dl:1.1">ふつうは、コード名の数字の音（1 なら 1）がいちばん低い音（ベース）です。</p>
     <p class="a" style="--dl:1.4">構成音のほかの音をベースにすると、<b>「1/3」</b>のように「/」のうしろにベースの音を書きます。これを<b>分数コード</b>と呼びます。</p>
     <p class="sub a" style="--dl:1.7">タップすると鳴らせます</p>`},
    {html:()=>`<div class="eyebrow a">分数コード</div>
     <h2 class="a" style="--dl:.1">ベースが跳ぶ所を<br>なめらかにする</h2>
     ${exampleHTML(EX.jump)}
     ${exampleHTML(EX.smooth)}
     <div class="exnote"><p class="a" style="--dl:2;--fn:var(--d)">ベースが大きく跳ぶと、つながりがゴツゴツして聞こえます。</p><p class="a" style="--dl:2.3;--fn:var(--t)">5 を「5/7」にすると、ベースが 1 → 7 → 6 と1段ずつ下りて、なめらかにつながります。</p></div>
     <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">${listenBtn('jump').replace('聴いてみる','そのまま')}${listenBtn('smooth').replace('聴いてみる','分数コードあり')}</div>`},
    {coach:'task', task:'smooth'}],
  split:[
    {html:()=>`<div class="eyebrow a">1小節に2つのコード</div>
     <h2 class="a" style="--dl:.1">1小節の前半と後半で<br>コードを変える</h2>
     ${segExHTML('half',.4)}
     <div class="exnote"><p class="a" style="--dl:1.2;--fn:var(--d)">1小節に2つのコードを入れると、コードの切り替わりが細かくなって、進行に勢いが出ます。</p><p class="a" style="--dl:1.5;--fn:var(--t)">置いてあるコードの<b>右側</b>にドラッグすると、3拍目からのコードを入れられます。</p></div>
     ${listenBtn('half')}`},
    {html:()=>`<div class="eyebrow a">組み合わせる①</div>
     <h2 class="a" style="--dl:.1">分数コードを挟んで<br>なめらかに</h2>
     ${segExHTML('halfBase',.4)}
     <p class="sub a" style="--dl:.6">もとの進行</p>
     ${insExHTML('halfSlash',1,1.7)}
     <p class="a" style="--dl:2.4">5/7 と 1/5 を挟むと、ベースが<br><b>ド→シ→ラ→ソ→ファ</b> と1歩ずつ下ります。</p>
     <p class="sub a" style="--dl:2.7">このように、ベースを1歩ずつつなぐために挟むコードを<br>「経過和音（けいかわおん）」と呼びます。</p>
     <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">${listenBtn('halfBase').replace('聴いてみる','もとの進行')}${listenBtn('halfSlash').replace('聴いてみる','挟んだ進行')}</div>`},
    {html:()=>`<div class="eyebrow a">組み合わせる②</div>
     <h2 class="a" style="--dl:.1">m を外したコードを挟んで<br>おしゃれに</h2>
     ${segExHTML('halfBase',.4)}
     <p class="sub a" style="--dl:.6">もとの進行</p>
     ${insExHTML('halfFlip',1,1.7)}
     <p class="a" style="--dl:2.4">どれも<b>次の小節のコード（4つ目）</b>へ進むので、<br>ぐっと引き寄せられます。</p>
     <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">${listenBtn('halfBase').replace('聴いてみる','もとの進行')}${listenBtn('halfFlip').replace('聴いてみる','挟んだ進行')}</div>`},
    {coach:'task', task:'split'}],
};
Object.assign(EX,{
  halfBase:{degs:[0,5,3,4], segs:{}, roles:['T','T','S','D'], groups:[], style:'バラード', bpm:80},
  halfSlash:{degs:[0,5,3,4], segs:{0:[{beat:3,v:VSP(7,'maj','',11)}],1:[{beat:3,v:VSP(0,'maj','',7)}]}, roles:['T','T','S','D'], roles2:['D','T'], groups:[], style:'バラード', bpm:80},
  halfFlip:{degs:[0,5,3,4], segs:{0:[{beat:3,v:SP(4,'maj','7')}],1:[{beat:3,v:SP(0,'maj','7')}],2:[{beat:3,v:SP(2,'maj','7')}]}, roles:['T','T','S','D'], roles2:['D','D','D'], groups:[], style:'バラード', bpm:80},
});
EX.half.roles2=['D','D','T','D'];
// もとの4コードに、後半のコードが割って入るお手本（wd 秒後に、右から押し広げて入ってくる）
function insExHTML(key,dl,wd){ const ex=EX[key];
  return `<div class="exrow a" data-ex="${key}" style="--dl:${dl};grid-template-columns:repeat(4,minmax(0,1fr))">${ex.degs.map((d,k)=>{ const sg=(ex.segs[k]||[])[0];
    return sg ? `<span class="halfbox ins" data-ti="${k}"><span class="tc ${ex.roles[k]}" data-hear="${HEAR(d)}"><b>${nm(d)}</b></span><span class="tc new ${(ex.roles2||[])[k]||''}" style="--wd:${wd+k*.25}s" data-hear="${HEAR(sg.v)}"><b>${nm(sg.v)}</b></span></span>`
      : `<span class="tc ${ex.roles[k]}" data-ti="${k}" data-hear="${HEAR(d)}"><b>${nm(d)}</b><small>${ex.roles[k]}</small></span>`; }).join('')}</div>`; }
// 1小節に2つのコードが入るお手本（マスを前半・後半に分けて表示）。各コードはタップで鳴らせる
function segExHTML(key,dl){ const ex=EX[key];
  return `<div class="exrow a" data-ex="${key}" style="--dl:${dl};grid-template-columns:repeat(4,minmax(0,1fr))">${ex.degs.map((d,k)=>{ const sg=(ex.segs[k]||[])[0];
    return sg ? `<span class="halfbox" data-ti="${k}"><span class="tc ${ex.roles[k]}" data-hear="${HEAR(d)}"><b>${nm(d)}</b></span><span class="tc ${(ex.roles2||[])[k]||''}" data-hear="${HEAR(sg.v)}"><b>${nm(sg.v)}</b></span></span>`
      : `<span class="tc ${ex.roles[k]}" data-ti="${k}" data-hear="${HEAR(d)}"><b>${nm(d)}</b><small>${ex.roles[k]}</small></span>`; }).join('')}</div>`; }
Object.assign(EX,{
  keyC:{degs:[0,4,5,3], roles:['T','D','T','S'], groups:[], style:'ポップス（定番）', bpm:96, key:'C'},
  keyG:{degs:[0,4,5,3], roles:['T','D','T','S'], groups:[], style:'ポップス（定番）', bpm:96, key:'G'},
  keyRock:{degs:[0,3,4,0], roles:['T','S','D','T'], groups:[], style:'ロック', bpm:132, key:'E'},
  keyJazz:{degs:[SP(2,'m','7'),SP(7,'maj','7'),SP(0,'maj','M7'),SP(9,'m','7')], roles:['S','D','T','T'], groups:[], style:'ジャジー', bpm:84, key:'B♭'},
  keyPiano:{degs:[0,3,4,0], roles:['T','S','D','T'], groups:[], style:'クラシック風', bpm:100, key:'G'},
});
const keyRow=(key,degs)=>{ const k=KEYS.find(x=>x.id===key), nmK=d=>k.sc[d]+(DEG[d].q==='m'?'m':'');
  return `<div class="keyrow"><b>Key ${key}</b>${degs.map(d=>`<span data-hear="${HEAR(d)}" data-key="${key}"><i>${nm(d)}</i>${nmK(d)}</span>`).join('')}</div>`; };
const L_KEY=[
  {html:()=>`<div class="eyebrow a">キーとは</div>
     <h2 class="a" style="--dl:.1">「1」をどの音にするか<br>それが<b>キー</b>です</h2>
     <div class="keytable a" style="--dl:.5">${keyRow('C',[0,1,2,3,4,5])}${keyRow('G',[0,1,2,3,4,5])}</div>
     <p class="a" style="--dl:1">これまでは、ド（C）を 1 にしていました。これを <b>Key C</b> と言います。</p>
     <p class="a" style="--dl:1.3">ソ（G）を 1 にすると <b>Key G</b>。すべてのコードが、同じだけ高さをずらします。</p>`},
  {html:()=>`<div class="eyebrow a">移調（いちょう）</div>
     <h2 class="a" style="--dl:.1">数字は同じまま<br>アルファベットだけが変わる</h2>
     ${exampleHTML(EX.keyC)}
     <div class="keytable a" style="--dl:.9">${keyRow('C',[0,4,5,3])}${keyRow('G',[0,4,5,3])}</div>
     <div class="exnote"><p class="a" style="--dl:1.3;--fn:var(--t)">キーを変えることを<b>移調</b>と言います。</p><p class="a" style="--dl:1.6;--fn:var(--s)">数字で書いておけば、キーを変えても書き直しは要りません。このアプリが数字を使うのはそのためです。</p></div>
     <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">${listenBtn('keyC').replace('聴いてみる','Key C')}${listenBtn('keyG').replace('聴いてみる','Key G')}</div>`},
  {html:()=>`<div class="eyebrow a">ジャンルとキー</div>
     <h2 class="a" style="--dl:.1">ジャンルによって<br>よく使われるキーがあります</h2>
     <div class="roles">
       <section class="D a" style="--dl:.5"><span class="L" style="font-size:.85rem">E・A<br>D</span><div><h3>ロック・ギター中心の曲</h3><p>ギターの開放弦がよく響くキー。</p></div>${listenBtn('keyRock').replace('聴いてみる','Key E')}</section>
       <section class="S a" style="--dl:.8"><span class="L" style="font-size:.85rem">F・B♭<br>E♭</span><div><h3>ジャズ・吹奏楽</h3><p>トランペットやサックスが吹きやすいキー。</p></div>${listenBtn('keyJazz').replace('聴いてみる','Key B♭')}</section>
       <section class="T a" style="--dl:1.1"><span class="L" style="font-size:.85rem">C・G<br>F</span><div><h3>ピアノ曲・童謡</h3><p>白鍵が多く、弾きやすいキー。</p></div>${listenBtn('keyPiano').replace('聴いてみる','Key G')}</section>
     </div>
     <p class="a" style="--dl:1.5">歌の曲では、<b>歌う人の声の高さ</b>に合わせてキーを決めるのが基本です。</p>`},
  {coach:'task', task:'key'},
];
const LEVELS=[
  {name:'コードを置いて鳴らす', goal:'コードとは何かを知り、パレットのコードを並べて鳴らしてみましょう。', unlock:'', deck:()=>SLIDES.slice(0,7), noClear:true},
  {name:'役割で流れを作る', goal:'コードの役割（T・S・D）と、自然に聞こえる流れの作り方を覚えましょう。', unlock:'進行ガイド', chips:[['T','--t'],['S','--s'],['D','--d']], deck:()=>[SLIDES[7],...SLIDES.slice(8,15)], noClear:true},
  {name:'雰囲気をつくる', goal:'明るい・切ない・力強い……。ねらった雰囲気にするコツを、実例と実践で覚えましょう。', unlock:'伴奏とテンポ・進行ライブラリ', chips:[['明るい','--t'],['切ない','--s'],['力強い','--d'],['穏やか','--warn']], deck:()=>MOOD.filter((_,k)=>k!==8), noClear:true},
  {name:'キーを変える（移調）', goal:'同じ進行を、別の高さ（キー）で鳴らしてみましょう。ジャンルによって、よく使われるキーも違います。', unlock:'キーの変更', chips:[['Key C','--t'],['Key G','--s'],['Key E','--d']], deck:()=>L_KEY},
  {name:'進行を長くする', goal:'4つの進行をもとに、8小節の進行を作ってみましょう。', unlock:'8小節・16小節', chips:[['8小節','--t'],['16小節','--s']], deck:()=>L_SLIDES.long},
  {name:'数字のついたコード', goal:'コードに数字をつけて、洗練された響きにしてみましょう。', unlock:'数字のついたコード', chips:[['Am7','--t'],['FM7','--s'],['G9','--d']], deck:()=>L_SLIDES.tension},
  {name:'分数コード', goal:'コードの構成音を知り、ベースの音を変えてつながりをなめらかにしましょう。', unlock:'分数コード', chips:[['C/E','--t'],['G/B','--d']], deck:()=>L_SLIDES.slash},
  {name:'明るいコードと暗いコードを入れ替える', goal:'m を外したり、m をつけたりして、進行にメリハリをつけましょう。', unlock:'明るい・暗いの入れ替え', chips:[['E7','--d'],['D7','--d'],['Fm','--s']], deck:()=>L_SLIDES.flip},
  {name:'1小節に2つのコード', goal:'1小節の中でコードを切り替えて、進行に勢いをつけましょう。分数コードや入れ替えたコードとも組み合わせます。', unlock:'1小節に2つのコード・PRO', chips:[['3m｜6m','--t'],['2m｜5','--d']], deck:()=>L_SLIDES.split},
];
// レベルの解説を組み立てる（タイトル → 本編 → クリア）。review=true は見返し用（クリア扱いにしない）
function levelDeck(n,review){
  const l=LEVELS[n-1], body=l.deck().map((x,k)=>({sid:n*100+k,...x})); body.forEach(x=>{ delete x.last; delete x.finish; });
  const d = n===1 ? body : [lvTitle(n), ...body];
  if(!l.noClear){ const c={...lvClear(n)}; c.finish=()=>{ endTutorial(n!==1); if(n===1){ state.guide=false; renderAll(); } if(!review){ levelClear(n); showWhere(n); } }; if(review){ c.html=()=>`<div class="eyebrow a">LEVEL ${n}</div><h2 class="a" style="--dl:.1">見返し終わりました</h2>`; c.finish=()=>endTutorial(true); } d.push(c); }
  d.lv=n; d.review=!!review; d.onEnd=()=>endTutorial(true);
  if(n===1 && !review) d.onEnd=()=>{ levelClear(1); DECK=levelDeck(2); TUT.lvNow=2; showSlide(0); };   // そのままレベル2へ
  if(n===2){ d.shift();   // レベル2のタイトルは出さない（レベル1からそのまま続く）
    if(review){ const last=d[d.length-1]; last.last=true; last.btn='とじる'; last.finish=()=>endTutorial(true); }
    else d.push({last:true, btn:'はじめる', html:()=>`<div class="eyebrow a">LEVEL 1・2 CLEAR</div>
     <h2 class="a" style="--dl:.1">＼ レベル1・2 クリア！ ／</h2>
     <div class="okcard a" style="--dl:.5"><b>アンロック：進行ガイド</b></div>
     <div class="okcard recap plain a" style="--dl:.7"><b>ステージ4のおさらい</b>${STG12.list[3].recap.map(t=>`<span>・${t}</span>`).join('')}</div>
     <p class="a" style="--dl:.9">では、自由にコード進行を作ってみましょう！</p>`, finish:()=>{ endTutorial(false); levelClear(2); showWhere(2); }}); }
  return d;
}
function startLevel(n,review){ $('moodTip').hidden=true; MOODPOP.pending=false; openTutorial(levelDeck(n,review)); }
function levelClear(n){ if(LVL>=n) return; LVL=n; saveLv();
  if(MODE!=='free'){ if(n===2){ MOODPOP.level=3; MOODPOP.pending=true; } }   // 全レベルクリアの案内は showWhere(9) の中で
  renderAll(); }
function renderLevels(){ const el=$('levelList'); if(!el) return;
  const nx=Math.min(LVL+1,LV_MAX), all=LVL>=LV_MAX;
  $('lvCount').textContent=`${LVL} / ${LV_MAX} クリア`;
  $('lvNext').innerHTML = all ? '<i>ALL CLEAR</i><b>全レベルクリア</b><small>一覧から好きなレベルを見返せます</small>' : `<i>${LVL?'つづきから':'はじめから'} ・ LEVEL ${nx}</i><b>${LEVELS[nx-1].name}</b><small>${LEVELS[nx-1].unlock?'クリアすると：'+LEVELS[nx-1].unlock:LEVELS[nx-1].goal}</small>`;
  $('lvNext').onclick=()=>{ if(!all) startLevel(nx); else $('lvAcc').open=true; };
  el.innerHTML=LEVELS.map((l,k)=>{ const n=k+1, done=LVL>=n, open=UL()>=n-1;
    return `<button data-l="${n}"${open?'':' class="lock"'}><span class="lvtag">LEVEL ${n}</span><b>${l.name}${done?'<span class="chapdone" aria-label="クリア">✓</span>':open?'':' '+ico('lock',13)}</b>${l.unlock?`<small>${l.unlock}</small>`:''}</button>`; }).join('');
  el.querySelectorAll('button').forEach(b=>b.onclick=()=>{ const n=+b.dataset.l; if(UL()<n-1){ toast(`レベル${n-1}をクリアすると挑戦できます`); return; } startLevel(n, LVL>=n); });
}
let DECK=SLIDES;
function tutDots(){
  const n=DECK.lv||(DECK[0]&&DECK[0].stg?1:0), S=STAGES[n], cur=DECK[TUT.i]||{}, el=$('tutDots');
  let segs, top, sub;
  if(!S){ const real=DECK, f=Math.max(0,real.indexOf(cur)+1)/real.length;
    segs=[{f, done:f>=1&&!!cur.last}]; top=n?`<b>LEVEL ${n}</b>`:''; sub=n&&LEVELS[n-1]?LEVELS[n-1].name:''; }
  else {
    let k=0; for(let j=TUT.i;j>=0&&!k;j--) k=DECK[j].stg||0; for(let j=TUT.i;j<DECK.length&&!k;j++) k=DECK[j].stg||0;
    const allDone=!DECK.some(x=>x.stg); if(allDone) k=S.list.length;   // おさらいだけのデッキ（レベル3の最後など）
    const items=DECK.filter(x=>x.stg===k), pos=items.indexOf(cur);
    const f=allDone||(cur.last&&!cur.stg)?1:Math.max(0,pos+1)/Math.max(1,items.length);
    segs=S.list.map((_,j)=>j+1<k?{f:1,done:1}:j+1===k?{f,done:allDone||(cur.last&&!cur.stg)}:{f:0});   // 黄色にするのは、次のステージに入ってから
    top=`${S.label}<b>ステージ ${k} / ${S.list.length}</b>`; sub=`${S.list[k-1].name}<i>|</i>ゴール：${S.goal}`; }
  const same=TUT.lastBar&&TUT.lastBar.S===S&&TUT.lastBar.segs.length===segs.length, f0=same?TUT.lastBar.segs:segs.map(()=>0);
  const kNow=S?segs.filter(x=>x.done).length:0, cleared=S&&same&&kNow>TUT.lastBar.k?kNow:0;   // いまステージを終えたところ
  el.innerHTML=`<div class="tp-top">${top}</div><div class="tp-bar">${segs.map((s,j)=>`<i class="${s.done?'done':''}" style="--f:${s.f};--f0:${Math.min(f0[j]||0,s.f)}"></i>`).join('')}${IC_FLAG}</div>`; $('tpSub').innerHTML=(cleared?`<em class="tp-clear">ステージ${cleared} クリア！</em>`:'')+sub;
  clearTimeout(TUT.clrT); if(cleared) TUT.clrT=setTimeout(()=>{ const e=document.querySelector('#tpSub .tp-clear'); if(e) e.remove(); },2600);   // 消えたら場所も詰める
  TUT.lastBar={S,k:kNow,segs:segs.map(s=>s.f)};
  markSeen(); closeRev(); const rb=$('tutRev'); if(rb) rb.hidden=!revTerms().length;
}
function tutStopAudio(){ TUT.onLoopEnd=null; TUT.playingEx=null; document.querySelectorAll('.tut [data-ti].now').forEach(e=>e.classList.remove('now')); clearTimeout(TUT.stopT); TUT.stopping=false; if(playing) stop(); document.querySelectorAll('.listen.on').forEach(b=>b.classList.remove('on')); }
function tutLoad(degs,segs,ant){ state.slots=Array.from({length:16},(_,j)=>degs[j]??null); state.segs=Array.from({length:16},(_,j)=>segs&&segs[j]?JSON.parse(JSON.stringify(segs[j])):[]); state.bars=degs.length<=4?4:8; state.len=4; state.ant=Array.from({length:16},(_,j)=>ant&&ant[j]||null); page=0; renderAll(); }
function openTutorial(deck){
  if(TUT.on) return;
  MOODPOP.pending=false; $('moodTip').hidden=true;
  DECK=Array.isArray(deck)?deck:SLIDES; TUT.lvNow=DECK.lv||0;
  TUT.on=true; TUT.backup=JSON.stringify(state); TUT.i=0; clearTimeout(HIST.t); histBtns();
  closeAll(); tutStopAudio();
  state.pro=false; document.body.classList.remove('pro'); state.label=state.label==='alpha'?'alpha':numK(); state.key='C'; state.guide=false;
  Object.assign(state,{inst:'piano',arp2:'',bass:true,bassSnd:'bass'}); ensureSounds();   // チュートリアルの音は、いつもピアノ＋ベース
  renderAll(); showSlide(0);
}
// クリアしたあと：実際の画面で、新しく使えるようになった所を光らせて説明する
const shown=el=>{ if(!el||el.hidden) return null; const r=el.getBoundingClientRect(); return r.width>4&&r.height>4?el:null; };
const firstSlot=()=>shown([...slotsEl.querySelectorAll('.slot.filled')][0])||slotsEl;
const tapSlot=what=>({t:()=>firstSlot(), x:`置いたコードを<b>タップ</b>すると、${what}`});
const WHERE={
  2:[{t:()=>document.querySelector('.slotwrap'), x:'マスの上に出ているのが<b>進行ガイド</b>です。<br>役割の流れや、お手本どおりかを教えてくれます。<br><small>表示・非表示は、設定メニュー（≡）の「進行ガイド」で切り替えられます。</small>'}],
  3:[{t:()=>[shown($('arpLane')),shown($('drumLane'))].filter(Boolean), x:'<b>伴奏</b>の帯をタップすると、伴奏スタイルを選べます。'},
     {t:()=>$('bpm').closest('.bpm'), x:'<b>テンポ</b>は、スライダーで変えられます。'},
     {t:()=>$('libBtn'), x:'<b>進行ライブラリ</b>は、マスの上の「進行を探す」から開けます。<br>レベルをクリアするたびに、使える進行が増えていきます。'}],
  4:[{menu:'keyChips', x:'<b>キー</b>は、設定メニュー（≡）の「キー」で変えられます。'},
     {t:()=>$('keyBadge'), x:'いまのキーは、ここに表示されます。'}],
  5:[{menu:'barChips', x:'設定メニュー（≡）の<b>「小節数」</b>で 8・16 を選べます。'},
     {t:()=>document.querySelector('.slotwrap'), x:'8小節以上にすると、マスの上に小さな四角が出ます。<br>タップすると、表示する小節を切り替えられます。'}],
  6:[tapSlot('7・M7・9 など、<b>数字のついたコード</b>を選べます。')],
  7:[tapSlot('スロットで「響き」と「ベース」を選んで、<b>分数コード</b>にできます。')],
  8:[tapSlot('2(7)・3(7)・4m など、<b>明るい・暗いを入れ替えたコード</b>も選べます。')],
  9:[{t:()=>slotsEl, x:'置いてあるコードの<b>右側</b>にコードをドラッグすると、<br>3拍目からのコードを入れられます。'},
     {menu:'proChips', x:'<b>全レベルクリア！</b><br>設定メニュー（≡）の「PRO」もオンにできます。'}],
};
// 設定メニューの中のものは、実際にメニューを開いて、その項目を光らせる
const openMenuAt=id=>{ buildMenu&&buildMenu(); drawer.classList.add('on'); scrim.classList.add('on'); const sec=$(id).closest('.sec'); sec.hidden=false; sec.scrollIntoView({block:'center'}); return sec; };
const shutMenu=()=>{ drawer.classList.remove('on'); scrim.classList.remove('on'); };
function showWhere(n){ const steps=WHERE[n]; if(!steps) return; let k=0;
  const go=()=>{ const st=steps[k], last=k===steps.length-1;
    const show=t=>{ if(Array.isArray(t)&&!t.length) t=slotsEl;
      coach(t, `<small style="color:var(--muted)">アンロック：${LEVELS[n-1].unlock}</small><br>${st.x}`, last?[['OK',()=>{ closeCoach(); shutMenu(); }]]:[['つぎへ',()=>{ shutMenu(); k++; setTimeout(go,st.menu?280:0); }]]); };
    if(st.menu){ const sec=openMenuAt(st.menu); setTimeout(()=>show(sec),320); } else show(st.t()); };
  // レベル2（進行ガイド）は、コードを2つ以上並べてガイドが出てから案内する（クリア直後にメニューを開かない）
  if(n===2){ const w=setInterval(()=>{ if(LVL>2||!state.guide){ clearInterval(w); return; } if(TUT.on||!$('coach').hidden||!$('moodPop').hidden||[0,1,2,3].filter(k=>state.slots[k]!=null).length<2) return; clearInterval(w); setTimeout(go,600); },400); return; }
  setTimeout(go,350); }
function closeCoach(){ $('coach').hidden=true; document.body.classList.remove('tutlite'); clearInterval(TUT.wait); }
function endTutorial(restore){
  TUT.practice=false; TUT.lvNow=0;
  clearTimeout(TUT.timer); clearInterval(TUT.wait); tutStopAudio(); closeCoach();
  $('tut').hidden=true; TUT.on=false;
  if(restore && TUT.backup){ state=JSON.parse(TUT.backup); document.body.classList.toggle('pro',!!state.pro); }
  else { const b=JSON.parse(TUT.backup); state={...b, slots:Array(16).fill(null), segs:Array.from({length:16},()=>[]), bars:4, len:4, label:'num', guide:true}; document.body.classList.toggle('pro',!!state.pro); }
  page=0; selected=null; $('bpm').value=state.bpm; $('bpmOut').textContent=state.bpm; renderAll(); save();
  histReset();
}
function showSlide(i){
  if(i>=DECK.length && DECK.onEnd){ DECK.onEnd(); return; }   // チャプターの最後（吹き出しの「つぎへ」）で閉じる
  if(TUT.practice && !(DECK[i]&&DECK[i].coach)) TUT.practice=false;
  clearTimeout(TUT.timer); clearInterval(TUT.wait); tutStopAudio();
  TUT.i=Math.max(0,Math.min(DECK.length-1,i));
  const sl=DECK[TUT.i];
  if(sl.coach){ $('tut').hidden=true; runCoach(sl.coach); return; }
  closeCoach(); $('tut').hidden=false;
  const st=$('tutStage'); st.innerHTML=sl.html(); romanize(st); tutDots();
  // 鳴らせるコードがあるスライドには、必ずその旨を書く
  if(st.querySelector('[data-hear],[data-pair]') && !/鳴ら/.test(st.textContent)){ const n=document.createElement('p'); n.className='sub a tuthear'; n.style.setProperty('--dl','1.2'); n.innerHTML=ico('note',13)+' コードをタップすると鳴らせます'; st.appendChild(n); } TUT.step=0; TUT.slideStart=performance.now(); applyStep();
  $('tutBack').disabled=TUT.i===0 && !DECK[0].steps;
  st.querySelectorAll('.listen').forEach(b=>b.onclick=()=>{
    if(b.classList.contains('on')){ tutStopAudio(); return; }
    tutStopAudio(); tutLoadEx(EX[b.dataset.ex]); TUT.playingEx=b.dataset.ex; b.classList.add('on'); b.innerHTML=IC_STOP+'<span>止める</span>';
    TUT.onLoopEnd=()=>{ b.classList.remove('on'); b.dataset.again=1; b.innerHTML=IC_PLAY+'<span>もう一度聴く</span>'; }; play();
    const fix=()=>{ if(!b.classList.contains('on')) b.innerHTML=IC_PLAY+`<span>${b.dataset.again?'もう一度聴く':'聴いてみる'}</span>`; }; const iv=setInterval(()=>{ if(!b.isConnected||!b.classList.contains('on')){ clearInterval(iv); fix(); } },300);
  });
  if(sl.enter) sl.enter();
  bindHear();
}
// メイン画面の上で、場所を示しながら吹き出しを出す
// target：要素・矩形、またはその配列（複数の場所をまとめて明るく抜く）
function coach(target, text, btns, keepLite){
  const c=$('coach'); c.hidden=false;
  const pad=8, rects=(Array.isArray(target)?target:[target]).map(t=>{ const r=t.getBoundingClientRect?t.getBoundingClientRect():t;
    return {left:r.left-pad,top:r.top-pad,right:r.left+r.width+pad,bottom:r.top+r.height+pad}; });
  const g=$('coachHoles'), ns='http://www.w3.org/2000/svg';
  while(g.children.length<rects.length){ const e=document.createElementNS(ns,'rect'); e.setAttribute('rx',18); e.setAttribute('fill','#000'); g.appendChild(e); }
  [...g.children].forEach((e,k)=>{ const r=rects[k];
    if(!r){ e.style.display='none'; return; } e.style.display='';
    Object.assign(e.style,{x:r.left+'px',y:r.top+'px',width:(r.right-r.left)+'px',height:(r.bottom-r.top)+'px'});
    e.setAttribute('x',r.left); e.setAttribute('y',r.top); e.setAttribute('width',r.right-r.left); e.setAttribute('height',r.bottom-r.top); });
  $('coachText').innerHTML=text; romanize($('coachText'));
  const bb=$('coachBtns'); bb.innerHTML='';
  btns.forEach(([label,fn,ghost])=>{ const b=document.createElement('button'); b.textContent=label; if(ghost) b.className='alt'; b.onclick=fn; bb.appendChild(b); });
  const bub=$('coachBubble');
  // 吹き出しは、明るく抜いた場所に重ならない位置を探して置く（下→上→右→左の順）
  const W=Math.min(420,innerWidth-32); bub.style.width=W+'px';
  requestAnimationFrame(()=>{ const h=bub.offsetHeight, M=14, VW=innerWidth, VH=innerHeight;
    const clampX=x=>Math.max(16,Math.min(VW-16-W,x)), clampY=y=>Math.max(12,Math.min(VH-12-h,y));
    const hit=(x,y)=>rects.some(r=>x<r.right+6&&x+W>r.left-6&&y<r.bottom+6&&y+h>r.top-6);
    const fits=(x,y)=>x>=16&&x+W<=VW-16&&y>=12&&y+h<=VH-12&&!hit(x,y);
    const cands=[];
    rects.forEach(r=>{ const cx=clampX((r.left+r.right)/2-W/2), cy=clampY((r.top+r.bottom)/2-h/2);
      cands.push([cx,r.bottom+M],[cx,r.top-M-h]); });
    rects.forEach(r=>{ const cy=clampY((r.top+r.bottom)/2-h/2); cands.push([r.right+M+8,cy],[r.left-M-8-W,cy]); });
    let pos=cands.find(([x,y])=>fits(x,y));
    // 2か所を抜いていて、どこにも収まらないとき（スマホでパレットとマスを両方見せるなど）は、最後に渡した場所（マス）に重ならない位置を優先
    const ov=(r,x,y)=>Math.max(0,Math.min(r.right,x+W)-Math.max(r.left,x))*Math.max(0,Math.min(r.bottom,y+h)-Math.max(r.top,y));
    if(!pos && rects.length>1){ const last=rects[rects.length-1], cx=clampX(VW/2-W/2);
      pos=[[cx,12],[cx,VH-h-12],[cx,clampY(last.top-M-h)],[cx,clampY(last.bottom+M)]].map(p=>[p,ov(last,...p)*1000+rects.slice(0,-1).reduce((a,r)=>a+ov(r,...p),0)]).sort((a,b)=>a[1]-b[1])[0][0]; }
    if(!pos){ const r=rects[0], below=(r.top+r.bottom)/2<VH/2; pos=[clampX(VW/2-W/2), below?Math.min(VH-h-12,r.bottom+12):Math.max(12,r.top-12-h)]; }
    bub.style.left=pos[0]+'px'; bub.style.top=pos[1]+'px'; });
}
function unionRect(a,b){ const r1=a.getBoundingClientRect(), r2=b.getBoundingClientRect(); const l=Math.min(r1.left,r2.left), t=Math.min(r1.top,r2.top), rr=Math.max(r1.right,r2.right), bt=Math.max(r1.bottom,r2.bottom); return {left:l,top:t,right:rr,bottom:bt,width:rr-l,height:bt-t}; }
const wideLayout=()=>matchMedia('(min-width:820px) and (min-aspect-ratio:5/4)').matches;
const nextBtn=()=>['つぎへ',()=>showSlide(TUT.i+1)], backBtn=()=>['もどる',()=>showSlide(TUT.i-1),true];
function moodResult(){
  const m=PRACTICE[TUT.mood||'sad'], q=[0,1,2,3].map(k=>tokOf(state.slots[k])), good=q.every(t=>typeof t==='number') && m.check(q);
  coach(slotsEl, good ? `<b>いい感じです！</b><br>${m.ok}` : `<b>おしいです！</b><br>${m.ng}`,
    [['作り直す',()=>runCoach('mood'),true],['ほかのお題',()=>{ TUT.practice=false; showSlide(TUT.i-1); },true],['おわる',finishMood]]);
}
const moodDone=()=>[0,1,2,3].every(k=>state.slots[k]!==null&&state.slots[k]!==undefined);
// 実践編を終えるときは、作った進行と伴奏をそのまま残す
function finishMood(){ const lv=DECK.review?0:DECK.lv, dl=DECK.lv, rv=!!DECK.review; TUT.practice=false; clearInterval(TUT.wait); const keep={slots:[...state.slots],segs:state.segs,bars:state.bars,drum:state.drum,arp:state.arp,inst:state.inst,kit:state.kit,bass:state.bass,bassSnd:state.bassSnd,bassPat:state.bassPat,bpm:state.bpm};
  endTutorial(true); Object.assign(state,keep); state.ant=Array(16).fill(null); page=0;
  $('bpm').value=state.bpm; $('bpmOut').textContent=state.bpm; renderAll(); save();
  if(dl===3){ setTimeout(()=>libIntro(rv),250); return; }   // レベル3は最後に「定番の進行を使いまわす」話をしてから、ライブラリをアンロック
  if(lv){ const was=LVL; levelClear(lv); if(LVL>was && lv<LV_MAX) showClearPop(lv); } }
function libIntro(review){
  const nm=n=>`<b>${n}</b>`;
  const d=[
    {html:()=>`<div class="eyebrow a">もうひとつのコツ</div>
     <h2 class="a" style="--dl:.1">定番の進行を<br>使いまわすのもアリ</h2>
     <p class="a" style="--dl:.5">ヒット曲でも、${nm('王道進行')}や${nm('小室進行')}のような<br>「よくある進行」が何度も使われています。</p>
     <div class="exrow a" style="--dl:.9"><span>王道進行</span>${listenBtn('ohdo')}</div>
     <div class="exrow a" style="--dl:1.1"><span>小室進行</span>${listenBtn('komuro')}</div>
     <p class="sub a" style="--dl:1.4">同じ進行でも、伴奏・テンポ・メロディが違えば、まったく別の曲になります。</p>`},
    {html:()=>`<div class="eyebrow a">進行ライブラリ</div>
     <h2 class="a" style="--dl:.1">ゼロから組み立てる<br>＋ 定番を借りてアレンジ</h2>
     <p class="a" style="--dl:.5">定番の進行を入れてから、<br>1つだけ変える・つなげる・伴奏を変える……<br>これも立派なコード進行づくりです。</p>
     <div class="okcard a" style="--dl:.9"><b>進行ライブラリ</b><small>名前・雰囲気・数字で探して、試し聴き →「使う」でマスに入ります。<br>レベルをクリアするたびに、使える進行が増えていきます。</small></div>`,
     last:true, btn:review?'とじる':'OK'}];
  d[1].finish=()=>{ endTutorial(true); if(review) return; const was=LVL; levelClear(3); if(LVL>was) showClearPop(3); };
  d.lv=3; d.review=review; d.onEnd=d[1].finish; openTutorial(d); }
// 移調の練習：Key C で1周 → 好きなキーのボタンで聴き比べ（2つ以上のキーを聴いたら次へ進める）
function keyTask(tk,next){
  TUT.keysHeard=new Set();
  const keyBtns=()=>tk.keys.map(k=>[k,()=>playKey(k),state.key!==k]);
  const after=()=>{ const enough=TUT.keysHeard.size>=2;
    coach([slotsEl,$('play')], enough ? `<b>同じ進行のまま、高さだけが変わりました。</b><br>ほかのキーも聴き比べてみましょう。<br><small>マスの数字はそのまま、アルファベットだけが変わっています。</small>`
      : `いまのは <b>Key C</b> です。<br>下のボタンで、ほかのキーでも聴いてみましょう。<br><small>マスの数字はそのまま、アルファベットだけが変わります。</small>`,
      [...keyBtns(), backBtn(), enough?['つぎへ',next]:['とばす',next,true]]); };
  const playKey=k=>{ tutStopAudio(); state.key=k; renderAll(); TUT.keysHeard.add(k);
    coach([slotsEl,$('play')], `${ico('note',13)} Key ${k} で再生中……`, []); TUT.onLoopEnd=after; play(); };
  playKey('C');
}
function runCoach(kind){
  document.body.classList.add('tutlite');
  if(kind==='place'){
    tutLoad([]);
    const done=()=>[0,1,2,3].every(k=>state.slots[k]!==null&&state.slots[k]!==undefined);
    const show=()=>coach([palette,slotsEl], done() ? 'いいですね！4つ並びました。' : (wideLayout()?'左のパレットから、右の4つのマスに':'上のパレットから、下の4つのマスに')+'好きなコードをドラッグしてはめてみましょう。<br><small>（タップして選んでから、マスをタップしてもOK）</small>', done()?[backBtn(),nextBtn()]:[backBtn(),['あとで',()=>showSlide(TUT.i+1),true]]);
    show(); let was=done(); TUT.wait=setInterval(()=>{ const d=done(); if(d!==was){ was=d; show(); } },300);
  } else if(kind==='play'){
    if(![0,1,2,3].every(k=>state.slots[k]!=null)) tutLoad([0,4,5,3]);
    coach($('play'), `再生ボタン（${IC_PLAY.replace('class="ic"','class="ic" style="width:.8em;height:.8em"')}）を押して、さっそく再生してみましょう。`, [backBtn()]);
    TUT.wait=setInterval(()=>{ if(playing){ clearInterval(TUT.wait);
      coach($('play'), ico('note',13)+' 再生中……', [backBtn()]);
      TUT.onLoopEnd=()=>coach($('play'),'どうですか？<br>いい曲はできましたか？', [backBtn(),nextBtn()]); } },200);
  } else if(kind==='mood'){
    // 実践編：画面はふだんと同じ（色・帯もそのまま）で、説明はほかのチュートリアルと同じ吹き出しで出す
    tutStopAudio(); document.body.classList.remove('tutlite'); TUT.practice=true;
    const m=PRACTICE[TUT.mood||'sad'];
    if(!TUT.moodInit){ const b=JSON.parse(TUT.backup);
      Object.assign(state,{label:b.label,key:b.key,guide:b.guide,pro:b.pro}); document.body.classList.toggle('pro',!!state.pro);
      tutLoadEx({degs:[],style:m.style,bpm:m.bpm}); TUT.moodInit=true; }
    const tgt=()=>[palette,slotsEl], quit=['やめる',()=>endTutorial(true),true];
    const show=()=>{
      if(playing) coach([slotsEl,$('play')], `${ico('note',13)} 再生中……<br>「${m.name}」な感じになっているかな？`, [quit]);
      else if(!moodDone()) coach(tgt(), `お題：<b>「${m.name}」</b>な進行を作ってみましょう。<br><small>ヒント：${m.hint}</small>`, [backBtn(),quit]);
      else coach([slotsEl,$('play')], `4つ並びました！<br>再生して、<b>「${m.name}」</b>になっているか聴いてみましょう。`, [backBtn(),quit]); };
    show(); let was='';
    TUT.wait=setInterval(()=>{ const k=(playing?'p':'')+(moodDone()?'d':''); if(k===was) return; was=k;
      if(playing) TUT.onLoopEnd=()=>{ clearInterval(TUT.wait); moodResult(); };
      show(); },250);
  } else if(kind==='task'){
    const tk=TASKS[DECK[TUT.i].task]; tutStopAudio(); document.body.classList.remove('tutlite'); TUT.practice=true;
    tutLoadEx({degs:tk.load, style:tk.style, bpm:tk.bpm}); if(tk.guide){ state.guide=true; renderAll(); }
    const next=()=>{ TUT.practice=false; closeAll(); showSlide(TUT.i+1); };
    if(tk.keys){ keyTask(tk,next); return; }
    const show=()=>{
      if($('varSheet').classList.contains('on')){ $('coach').hidden=true; return; }
      if(playing) coach([slotsEl,$('play')], ico('note',13)+' 再生中……', []);
      else { const kb=(tk.keys||[]).map(k=>[k,()=>{ state.key=k; renderAll(); preview(0); },state.key!==k]);
        if(!tk.check()) coach(state.bars>4?[slotsEl,$('pages')]:slotsEl, `${tk.text}<br><small>${tk.hint}</small>`, [...kb,backBtn(),['とばす',next,true]]);
        else coach([slotsEl,$('play')], `いいですね！（Key ${state.key}）<br>再生して聴いてみましょう。`, [...kb,backBtn()]); } };
    show(); let was='';
    TUT.wait=setInterval(()=>{ const k=(playing?'p':'')+(tk.check()?'d':'')+($('varSheet').classList.contains('on')?'v':'')+page+state.key; if(k===was) return; was=k;
      if(playing) TUT.onLoopEnd=()=>{ clearInterval(TUT.wait); const ok=tk.check();
        coach(slotsEl, ok?`<b>${tk.ok}</b>`:`<b>おしいです！</b><br>${tk.ng}`, ok?[['もう一度',()=>runCoach('task'),true],['つぎへ',next]]:[['作り直す',()=>runCoach('task'),true],['つぎへ',next]]); };
      show(); },250);
  } else if(kind==='weird'){
    tutStopAudio(); tutLoad([6,3,2,1]);
    coach(slotsEl, 'では次は、こんなコードを<br>鳴らしてみます……', [backBtn()]);
    TUT.onLoopEnd=()=>coach(slotsEl, '<b>なんだか、落ち着かないまま<br>終わった感じがしませんか？</b><br><small>ピンとこなくても大丈夫。理由はこのあと説明します。</small>', [backBtn(),['もう一度聴く',()=>{ tutStopAudio(); runCoach('weird'); },true],['つぎへ',()=>{ tutStopAudio(); showSlide(TUT.i+1); }]]);
    play();
  }
}
// アニメーションが終わるまでは「つぎへ」を薄くして「スキップ」にする（押すとアニメーションを飛ばす）
function animEnd(){
  const st=$('tutStage'), now=performance.now(); let mx=0;
  st.querySelectorAll('.a,.pop,.brk span,.flow .arr').forEach(e=>{ if(e.closest('[hidden]')) return;
    const cs=getComputedStyle(e), d=parseFloat(cs.animationDelay)||0, du=parseFloat(cs.animationDuration)||0;
    const start=+(e.dataset.shown||e.closest('[data-shown]')?.dataset.shown||TUT.slideStart);
    mx=Math.max(mx, start+(d+du)*1000-now); });
  return mx/1000;
}
function setBusy(){
  const st=$('tutStage'), nb=$('tutNext'); st.classList.remove('skip');
  clearTimeout(TUT.busyT);
  const t=animEnd();
  if(t>0.05){ nb.classList.add('busy'); nb.textContent='スキップ'; TUT.busyT=setTimeout(clearBusy,t*1000); }
  else clearBusy();
}
function clearBusy(){ const nb=$('tutNext'), sl=DECK[TUT.i]; nb.classList.remove('busy');
  nb.textContent = (sl && sl.last && !(sl.steps && TUT.step<sl.steps)) ? (sl.btn||(sl.finish?'とじる':'はじめる')) : 'つぎへ'; }
function applyStep(){
  const st=$('tutStage'), k=TUT.step;
  // data-st＝この段階から表示、data-upto＝この段階まで表示（両方あれば、その間だけ表示）
  st.querySelectorAll('[data-st],[data-upto]').forEach(e=>{
    const from=e.dataset.st!==undefined?+e.dataset.st:0, to=e.dataset.upto!==undefined?+e.dataset.upto:99, on=k>=from&&k<=to;
    if(on&&e.hidden){ e.hidden=false; if(e.dataset.st!==undefined){ e.classList.remove('a'); void e.offsetWidth; e.classList.add('a'); e.style.setProperty('--dl',e.dataset.dl||'0'); if(e.dataset.dur) e.style.animationDuration=e.dataset.dur+'s'; e.dataset.shown=performance.now(); } }
    else if(!on) e.hidden=true; });
  const am=$('tutAm'); if(am){ am.classList.toggle('sA',k===1); am.classList.toggle('sM',k>=2); }
  const sl=DECK[TUT.i]; if(sl&&sl.onStep) sl.onStep(k);
  setBusy();
}
$('tutNext').onclick=()=>{ const sl=DECK[TUT.i];
  if($('tutNext').classList.contains('busy')){ $('tutStage').classList.add('skip'); clearTimeout(TUT.busyT); clearBusy(); return; }
  if(sl.steps && TUT.step<sl.steps){ TUT.step++; applyStep(); return; }
  if(sl.last) (sl.finish?sl.finish():endTutorial(false)); else showSlide(TUT.i+1); };
$('tutBack').onclick=()=>{ const sl=DECK[TUT.i];
  if(sl.steps && TUT.step>0){ TUT.step--; applyStep(); return; }
  showSlide(TUT.i-1); };
$('tutSkip').onclick=()=>endTutorial(true);
$('tutRev').onclick=openRev; $('revScrim').onclick=closeRev; $('revClose').onclick=closeRev;

$('moodPopGo').onclick=()=>{ $('moodPop').hidden=true; const w=MOODPOP.whereN; MOODPOP.whereN=0; if(w){ showWhere(w); return; } if(!MOODPOP.all) startLevel(MOODPOP.level); };
$('moodPopLater').onclick=()=>{ $('moodPop').hidden=true; toast('パレット右下の「NEXT」から、いつでも次のレベルに進めます'); };
$('toTitle').onclick=()=>{ closeAll(); if(playing) stop(); showModePick(); };
$('lvBig').onclick=()=>{ if(LVL<LV_MAX) startLevel(LVL+1); };
$('moodTip').onclick=e=>{ $('moodTip').hidden=true; MOODPOP.pending=false; if(e.target.id!=='moodTipX') startLevel(MOODPOP.level); };
window.addEventListener('resize',()=>{ if(TUT.on && !$('coach').hidden && DECK[TUT.i].coach) runCoach(DECK[TUT.i].coach); });

// ピンチズームを禁止（iPhone の Safari は viewport の指定を無視するので、ジェスチャー自体を止める）
['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,e=>e.preventDefault(),{passive:false}));
// iPhone のダブルタップ拡大を確実に止める：すばやく2回目に触れたときは拡大させず、その代わりにタップ（クリック）として扱う
let lastTouchEnd=0;
document.addEventListener('touchend',e=>{ const now=Date.now(), quick=now-lastTouchEnd<350; lastTouchEnd=now;
  if(!quick || e.touches.length) return; const t=e.target; if(t.closest && t.closest('input,textarea,select,.proll')) return;
  e.preventDefault(); const c=t.closest && !t.closest('.slot,.tile') && t.closest('button,a,label,[data-hear],[data-pair],[data-kd],.opt,.tc,.chip,[role=button]'); if(c) c.click(); },{passive:false});
document.addEventListener('touchmove',e=>{ if(e.touches.length>1) e.preventDefault(); },{passive:false});
document.addEventListener('wheel',e=>{ if(e.ctrlKey) e.preventDefault(); },{passive:false});   // PCのトラックパッドのピンチ
document.body.classList.toggle('pro',!!state.pro);
if(!state.sOff){ const st=styleNow(); if(st) state.sOff=sOffOf(st); }
renderAll(); frame(); ensureSounds();
