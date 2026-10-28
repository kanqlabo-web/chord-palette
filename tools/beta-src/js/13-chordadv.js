// ベータ版だけ（試作）：コードのレベル10〜12（ユーザーの文章「チュートリアル文章（コード レベル10以降）」より）
// ・レベル10 半音でつなぐコード①（dim・dim7）、レベル11 半音でつなぐコード②（aug）
// ・レベル12 暗い音階からコードを借りる：文章が途中までなので、最初の2枚と「準備中」だけ（クリアにはならない）
// ・ビギナーの「響きを変える」に dim・dim7・aug を足す（1・2m・4・5 → ♯の dim・dim7、1 → aug、6m → ♭6aug）
// レベルの数は CP_CONF.lvMax（build.py）で 12。PRO などが開くのは、これまでどおりレベル9（LV_ALL）
const DIM=(o,x,sp)=>({o,q:'m-5',x:x||'',b:null,...(sp?{sp}:{})}), AUG=(o,x,sp)=>({o,q:'aug',x:x||'',b:null,...(sp?{sp}:{})});

// ---------- 響きを変える（ビギナー）に足すコード ----------
const ADV_VARS=[[0,DIM(1),10],[0,DIM(1,'dim7'),10],[1,DIM(3),10],[1,DIM(3,'dim7'),10],[3,DIM(6),10],[3,DIM(6,'dim7'),10],[4,DIM(8),10],[4,DIM(8,'dim7'),10],
  [0,AUG(0),11],[5,AUG(8,'','b'),11]];
ADV_VARS.forEach(([g,v])=>VARS[g].push(v));
const _advVarLv=varLv;
varLv=function(g,x){ if(!isNum(x)){ const a=ADV_VARS.find(([h,v])=>h===g&&sameSpec(v,x)); if(a) return a[2]; } return _advVarLv.apply(this,arguments); };

// ---------- 黒い鍵盤も光らせる鍵盤（ド〜ファ、半音の数で指定） ----------
const KX_W=[0,2,4,5,7,9,11,12,14,16,17], KX_B=[[0,1],[1,3],[3,6],[4,8],[5,10],[7,13],[8,15]];
const kxHTML=(dl)=>`<div class="kbd a" id="kbx" style="--dl:${dl??.3};height:76px;margin-bottom:12px;flex-shrink:0">${KX_W.map((s,i)=>`<div class="wk" data-s="${s}"><b>${KN[i%7]}</b><small>${'CDEFGAB'[i%7]}</small></div>`).join('')}${KX_B.map(([i,s])=>`<i class="bk" data-s="${s}" style="left:calc(${(i+1)/11*100}% - 3%)"></i>`).join('')}</div>`;
function kxShow(list,o){ const k=$('kbx'); if(!k) return; o=o||{};
  k.querySelectorAll('[data-s]').forEach(e=>{ e.classList.remove('on'); e.style.transitionDelay=''; if(e.tagName==='I'){ e.style.background=''; e.style.opacity=''; } });
  (list||[]).forEach((s,n)=>{ const e=k.querySelector(`[data-s="${s}"]`); if(!e) return; if(o.play) e.style.transitionDelay=(n*.4)+'s';
    if(e.tagName==='I'){ e.style.transition='background .3s'; e.style.background='var(--t)'; e.style.opacity='1'; } else e.classList.add('on'); });
  if(!o.play||!list||!list.length||playing) return;
  ensureSounds(); whenRunning(()=>{ if(playing) return; const t0=ctx.currentTime+.05, sv=state.inst; state.inst='piano';
    const L=o.sound||list; L.forEach((s,n)=>keyTone(60+s,t0+n*.4,.5,.7));
    if(!o.scale) L.forEach(s=>keyTone(60+s,t0+L.length*.4+.15,1.3,.6));
    state.inst=sv; }); }
const KX=(list,label,o)=>`<button class="tc hear" style="border:1.5px solid var(--line)" data-kx="${JSON.stringify(list)}"${o&&o.scale?' data-scale="1"':''}><b>${label}</b></button>`;
const bindKx=()=>document.querySelectorAll('.tut [data-kx]').forEach(b=>b.onclick=e=>{ e.stopPropagation(); document.querySelectorAll('.tut [data-kx]').forEach(x=>x.classList.toggle('now',x===b)); kxShow(JSON.parse(b.dataset.kx),{play:true,scale:!!b.dataset.scale}); });
const advEnter=()=>{ bindHear(); bindKx(); };
// 同じ話題のあいだは「つぎへ」を押さずに続けて見せる：鍵盤を光らせて鳴らすのも、文字の出る時間に合わせる（ほかのスライドへ移ったらやめる）
const NWR=t=>`<span style="white-space:nowrap">${t}</span>`;   // カッコの前後で改行しない
function advAt(list){ const sl=DECK[TUT.i]; list.forEach(([sec,fn])=>setTimeout(()=>{ if(TUT.on&&DECK[TUT.i]===sl) fn(); },sec*1000)); }
const arrow='<span style="color:var(--muted);font-weight:700">→</span>';
const chipRow=(list,dl)=>`<div class="chips7 a" style="--dl:${dl};display:flex;align-items:center;gap:6px;justify-content:center">${list.map((d,k)=>tc(d,'',dl+k*.15)).join(arrow)}</div>`;
const C15=VSP(0,'maj','',7);
// 2つのコードの間に、あとから1つ割り込んで入る並び（wd 秒後）。crNow(k) で、いま鳴っているコードを光らせる
(()=>{ const st=document.createElement('style'); st.textContent='@keyframes advIns{0%{max-width:0;opacity:0;transform:translateY(-12px) scale(.7)}60%{opacity:1}100%{max-width:240px;opacity:1;transform:none}}'; document.head.appendChild(st); })();
const insRow=(a,mid,b,dl,wd)=>`<div class="chips7" style="display:flex;align-items:center;gap:6px;justify-content:center">${tc(a,'cr0',dl)}<span style="display:flex;align-items:center;gap:6px;overflow:hidden;animation:advIns .8s cubic-bezier(.2,.8,.2,1) both;animation-delay:${wd}s">${arrow}${tc(mid,'cr1',wd)}</span>${arrow}${tc(b,'cr2',dl+.15)}</div>`;
const crNow=k=>document.querySelectorAll('.tut [class*="cr"].tc').forEach(e=>e.classList.toggle('now',e.classList.contains('cr'+k)));

// ---------- お手本 ----------
Object.assign(EX,{
  dimBase:{degs:[0,3,4,5], segs:{}, roles:['T','S','D','T'], groups:[], style:'バラード', bpm:80},
  dimPass:{degs:[0,3,4,5], segs:{2:[{beat:3,v:DIM(8)}]}, roles:['T','S','D','T'], roles2:['','','D'], groups:[], style:'バラード', bpm:80},
  dimDown:{degs:[SP(5,'maj','M7'),SP(4,'m','7'),SP(2,'m','7'),SP(7,'maj','7')], segs:{1:[{beat:3,v:DIM(3,'dim7','b')}]}, roles:['S','T','S','D'], roles2:['','S'], groups:[], style:'バラード', bpm:76},
  subE7:{degs:[SP(5,'maj','M7'),4,SP(4,'maj','7'),5], roles:['S','D','D','T'], groups:[], style:'ポップス（定番）', bpm:92},
  subDim:{degs:[SP(5,'maj','M7'),4,DIM(8),5], roles:['S','D','D','T'], groups:[], style:'ポップス（定番）', bpm:92},
  augBase:{degs:[0,5,C15,3], segs:{}, roles:['T','T','T','S'], groups:[], style:'バラード', bpm:80},
  augPass:{degs:[0,5,C15,3], segs:{1:[{beat:3,v:AUG(8,'','b')}]}, roles:['T','T','T','S'], roles2:['','D'], groups:[], style:'バラード', bpm:80},
  augUp:{degs:[0,SP(0,'maj','6'),3,3], segs:{0:[{beat:3,v:AUG(0)}],1:[{beat:3,v:SP(0,'maj','7')}]}, roles:['T','T','S','S'], roles2:['T','D'], groups:[], style:'バラード', bpm:80},
});

// ---------- 課題 ----------
const nextRoot=k=>{ const v=state.slots[k+1]; return v==null?null:specOf(v).o; };
Object.assign(TASKS,{
  dimLadder:{load:[0,SP(2,'m','7'),SP(4,'m','7'),3], style:'バラード', bpm:80,
    text:'「1 → 2m7 → 3m7 → 4」の、<b>1 のマスの右側に 1 を置いて</b>、2回タップで <b>♯1dim7</b> に変えてみましょう。', hint:'次のコードの半音下の dim7 を選ぶと、はしごになります',
    check:()=>[0,1,2].some(k=>segsOf(k).some(sg=>{ const sp=specOf(sg.v), nr=nextRoot(k); return sp.q==='m-5' && nr!=null && (nr-sp.o+12)%12===1; })),
    ok:'いいですね！ ベースが半音ずつ上がって、なめらかにつながりました。', ng:'右側に置く dim7 は、次のコードの半音下のものにしてみましょう。'},
  augPass:{load:[5,C15,3,4], style:'バラード', bpm:80,
    text:'「6m → 1/5 → 4 → 5」に<b>コードを挟んで</b>、なめらかにしてみましょう。', hint:'例：6m の右側に 6m を置いて、2回タップで ♭6aug に変える',
    check:()=>[0,1,2,3].some(k=>segsOf(k).some(sg=>['aug','m-5'].includes(specOf(sg.v).q))),
    ok:'いいですね！ 半音ずつつながって、なめらかな流れになりました。', ng:'コードの右側に、aug や dim を挟んでみましょう。'},
});

// ---------- スライド ----------
const L_ADV={
  dim:[
    {enter:()=>{ advEnter(); advAt([[1.6,()=>kxShow([7,9],{play:true,scale:true})],[3.4,()=>kxShow([7,8,9],{play:true,scale:true,sound:[8]})]]); }, html:()=>`<div class="eyebrow a">さらに滑らかにコードをつなぐ</div>
     <h2 class="a" style="--dl:.1">5 から 6m の間を<br>なめらかにつなぐ</h2>
     ${chipRow([4,5],.4)}
     <p class="a" style="--dl:.8">間に何もないように見えますが……。</p>
     ${kxHTML(1.4)}
     <p class="a" style="--dl:3.2">鍵盤で見ると、${NWR('5（ソ）')}と ${NWR('6（ラ）')}の間に、もう1つ音があります。</p>
     <p class="sub a" style="--dl:3.8">黒い鍵盤もふくめて、となりどうしの間を<b>半音</b>といいます。</p>`},
    {enter:()=>{ advEnter(); advAt([[1.2,()=>{ crNow(0); kxShow([7,11,14],{play:true}); }],[3.4,()=>{ crNow(1); kxShow([8,11,14],{play:true}); }],[6,()=>crNow(-1)]]); }, html:()=>`<div class="eyebrow a">さらに滑らかにコードをつなぐ</div>
     <h2 class="a" style="--dl:.1">半音上げたコードを<br>挟んでみる</h2>
     ${insRow(4,DIM(8),5,.3,3.2)}
     ${kxHTML(.8)}
     <p class="a" style="--dl:1">${NWR('5（ソ・シ・レ）')}のいちばん下の音を半音上げた、こんなコードを挟んでみます。</p>
     <div class="a" style="--dl:5.6;display:flex;gap:8px;flex-wrap:wrap;justify-content:center">${listenBtn('dimBase').replace('聴いてみる','挟まない').replace('--dl:1.6','--dl:5.6')}${listenBtn('dimPass').replace('聴いてみる','挟んだ進行').replace('--dl:1.6','--dl:5.8')}</div>
     <p class="a" style="--dl:6.2">さっきより、さらに滑らかになりました。このコードを、${NWR('<b>dim（ディミニッシュ）</b>')}と呼びます。</p>`},
    {html:()=>`<div class="eyebrow a">なめらかに下がる</div>
     <h2 class="a" style="--dl:.1">なめらかに<br>下がることもできます</h2>
     ${segExHTML('dimDown',.4)}
     <div class="exnote"><p class="a" style="--dl:1.2;--fn:var(--s)">3m7 と 2m7 のあいだに ♭3dim7 を挟むと、ベースが<br><b>ミ → ミ♭ → レ</b> と半音ずつ下りていきます。</p><p class="a" style="--dl:1.5;--fn:var(--t)">上品で、少しだけ不思議な響きになります。</p></div>
     <p class="sub a" style="--dl:1.8">dim7 は、dim にもう1つ音を重ねたコードです。</p>
     ${listenBtn('dimDown')}`},
    {enter:()=>{ advEnter(); advAt([[1,()=>kxShow([8,11,14],{play:true})],[3.6,()=>kxShow([4,8,11,14],{play:true})]]); }, html:()=>`<div class="eyebrow a">セブンスの代わりとして使う</div>
     <h2 class="a" style="--dl:.1">♯5dim と 3(7) を<br>見比べてみましょう</h2>
     ${kxHTML(.3)}
     <div class="chips7 kbtns a" style="--dl:.5">${KX([8,11,14],nm(DIM(8)))}${KX([4,8,11,14],nm(SP(4,'maj','7')))}</div>
     <p class="a" style="--dl:.8">コードをタップすると、鍵盤に表示して鳴らします。</p>
     <p class="a" style="--dl:6">ミの音がないだけで、ほとんど同じですよね。この2つのコードは響きも役割もほとんど同じなので、<b>代わりに使う</b>ことができます。</p>`},
    {html:()=>`<div class="eyebrow a">セブンスの代わりとして使う</div>
     <h2 class="a" style="--dl:.1">3(7) の代わりに<br>♯5dim を使う</h2>
     ${exampleHTML(EX.subE7)}
     ${exampleHTML(EX.subDim)}
     <div class="exnote"><p class="a" style="--dl:2;--fn:var(--d)">3(7) を ♯5dim に代えると、ベースが<br><b>ファ → ソ → ソ♯ → ラ</b> と半音ずつ上がります。</p></div>
     <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">${listenBtn('subE7').replace('聴いてみる','3(7)')}${listenBtn('subDim').replace('聴いてみる','♯5dim')}</div>`},
    {coach:'task', task:'dimLadder'}],
  aug:[
    {enter:()=>{ advEnter(); advAt([[1.4,()=>kxShow([9,12,16],{play:true})],[3.4,()=>kxShow([7,12,16],{play:true})]]); }, html:()=>`<div class="eyebrow a">半音でつなぐ</div>
     <h2 class="a" style="--dl:.1">6m → 1/5 を<br>なめらかにつなぐ</h2>
     ${chipRow([5,C15],.4)}
     <p class="a" style="--dl:.8">今度はこんな進行をなめらかにつないでみましょう。</p>
     ${kxHTML(1)}
     <div class="chips7 kbtns a" style="--dl:1.2">${KX([9,12,16],nm(5))}${KX([7,12,16],nm(C15))}</div>
     <p class="a" style="--dl:5">6m と 1/5 は、音が1つだけ違います。</p>`},
    {enter:()=>{ advEnter(); advAt([[1.2,()=>{ crNow(0); kxShow([9,12,16],{play:true}); }],[3.4,()=>{ crNow(1); kxShow([8,12,16],{play:true}); }],[6,()=>crNow(-1)]]); }, html:()=>`<div class="eyebrow a">半音でつなぐ</div>
     <h2 class="a" style="--dl:.1">ラの音を<br>半音下げてみる</h2>
     ${insRow(5,AUG(8,'','b'),C15,.3,3.2)}
     ${kxHTML(.8)}
     <p class="a" style="--dl:1">ラの音を半音下げて、こんなコードを挟んでみましょう。</p>
     <div class="a" style="--dl:5.6;display:flex;gap:8px;flex-wrap:wrap;justify-content:center">${listenBtn('augBase').replace('聴いてみる','挟まない').replace('--dl:1.6','--dl:5.6')}${listenBtn('augPass').replace('聴いてみる','挟んだ進行').replace('--dl:1.6','--dl:5.8')}</div>
     <p class="a" style="--dl:6.2">さらになめらかにつなげられました。このコードを、${NWR('<b>aug（オーギュメント）</b>')}と呼びます。</p>`},
    {html:()=>`<div class="eyebrow a">上がっていくと期待がふくらむ</div>
     <h2 class="a" style="--dl:.1">上の音を<br>半音ずつ上げる</h2>
     ${segExHTML('augUp',.4)}
     <div class="exnote"><p class="a" style="--dl:1.2;--fn:var(--t)">今度は上の音を <b>ソ → ソ♯ → ラ → シ♭</b> と半音ずつ上げます。</p><p class="a" style="--dl:1.5;--fn:var(--d)">最後の 1(7) は、4つ目の 4 へ進みたくなります。</p></div>
     ${listenBtn('augUp')}`},
    {coach:'task', task:'augPass'}],
  borrow:[
    {enter:()=>{ advEnter(); advAt([[1.2,()=>kxShow([0,2,4,5,7,9,11,12],{play:true,scale:true})],[5.2,()=>kxShow([0,2,3,5,7,8,10,12],{play:true,scale:true})]]); }, html:()=>`<div class="eyebrow a">親戚の音階</div>
     <h2 class="a" style="--dl:.1">Key C には<br>『暗い』音階もあります</h2>
     ${kxHTML(.3)}
     <div class="chips7 kbtns a" style="--dl:.5">${KX([0,2,4,5,7,9,11,12],'明るい音階',{scale:1})}${KX([0,2,3,5,7,8,10,12],'暗い音階',{scale:1})}</div>
     <p class="a" style="--dl:1">ドレミファソラシドは、Key C の『明るい』音階でしたね。</p>
     <p class="a" style="--dl:5">ほかにも、Key C には『暗い』音階もあります。タップすると、鍵盤に表示して鳴らします。</p>`},
    {enter:bindHear, html:()=>`<div class="eyebrow a">暗い音階のコード</div>
     <h2 class="a" style="--dl:.1">暗い音階で<br>コードを作る</h2>
     <p class="a" style="--dl:.3">この暗い音階を使って、コードを作ってみましょう。</p>
     <div class="chips7">${[SP(0,'m'),DIM(2),SP(3,'maj'),SP(5,'m'),SP(7,'m'),SP(8,'maj'),SP(10,'maj')].map((d,k)=>tc(d,'',.5+k*.12)).join('')}</div>
     <p class="a" style="--dl:1.5">これらのコードは、明るいコードと役割も同じなので、<b>代わりに使う</b>ことができます。</p>`},
  ],
};
LEVELS.push(
  {name:'半音でつなぐコード①', goal:'となりのコードのあいだに、半音ずつつなぐコードを挟んでみましょう。', unlock:'<span style="white-space:nowrap">dim・dim7（ディミニッシュ）</span>', chips:[['♯5dim','--d'],['♯1dim7','--d']], deck:()=>L_ADV.dim},
  {name:'半音でつなぐコード②', goal:'音をなめらかにつなぐ、もう1つのコードを考えてみましょう。', unlock:'<span style="white-space:nowrap">aug（オーギュメント）</span>', chips:[['♭6aug','--d'],['1aug','--t']], deck:()=>L_ADV.aug},
  {name:'暗い音階からコードを借りる', goal:'暗い音階のコードを少しだけ混ぜてみましょう。', unlock:'', chips:[['1m','--t'],['♭6','--s'],['♭7','--d']], deck:()=>L_ADV.borrow},
);
// レベル12は文章が途中まで：クリアの画面の代わりに「準備中」を出して、クリアにはしない
const _advDeck=levelDeck;
levelDeck=function(n,review){ const d=_advDeck.apply(this,arguments); if(n!==12) return d;
  d[d.length-1]={last:true, btn:'とじる', html:()=>`<div class="eyebrow a">LEVEL 12</div><h2 class="a" style="--dl:.1">このつづきは準備中です</h2><p class="a" style="--dl:.5">レベル12は、ここまでです。</p>`, finish:()=>endTutorial(true)};
  return d; };
// レベル12（暗い音階）は、メロディ1（音階）をクリアしてから
C_EXTRA[12]=['M1'];
// クリアしたあとの案内
WHERE[9]=WHERE[9].map(st=>st.menu==='proChips'?{...st, x:'<span style="white-space:nowrap">設定メニュー（≡）</span>の「PRO」もオンにできます。'}:st);
WHERE[10]=[tapSlot('1・2m・4・5 は <b>dim・dim7</b> にも変えられます。<br>コードの右側に同じコードを置いてから変えると、半音でつなげます。')];
WHERE[11]=[tapSlot('1 と 6m は <b>aug</b> にも変えられます。')];
renderAll();
// タイトル画面はレベル10〜12を足す前に作られるので、出ていれば作り直す（レベル9〜11まで進んだ人の「つづきから」などが動かなかった）
renderLevels(); if(!$('modePick').hidden) showModePick();
