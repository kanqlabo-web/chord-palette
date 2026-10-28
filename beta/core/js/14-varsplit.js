// ベータ版だけ（試作）：ビギナーの「コードを変える」を、PRO のように「ルート・種類・数字・ベース」を別々に選ぶ形に
// レベルで開く：数字 6（種類は sus まで）、ベース 7、種類の明るい⇄暗い 8、ルート 10（種類に dim・dim7 も）、aug 11
const VS_EXT={maj:['','7','M7','6','add9','9','M9'], m:['','7','M7','add9','9','11','7add11'], sus2:['','7','add9'], sus4:['','7','add9'], dim:['','7'], aug:['','7']};
const vsKind=sp=>sp.q==='m-5'?(sp.x==='dim7'?'dim7':'dim'):sp.q;
const vsNat=o=>{ const d=STEPS.indexOf(o); return d<0?null:(DEG[d].q===''?'maj':DEG[d].q==='m-5'?'dim':DEG[d].q); };   // そのルートの、もとの種類
function vsKinds(sp,lv){ const nat=vsNat(sp.o), L=[['maj','なし'],['m','m'],['sus2','sus2'],['sus4','sus4'],['dim','dim'],['dim7','dim7'],['aug','aug']];
  const need=k=>k===nat?0 : k==='sus2'||k==='sus4'?6 : k==='maj'||k==='m'?8 : k==='dim'||k==='dim7'?10 : k==='aug'?11 : 99;
  const out=L.filter(([k])=>need(k)<=lv), now=vsKind(sp);
  if(!out.some(([k])=>k===now)) out.push([now, now==='dim7'?'dim7':QUAL_LABEL[sp.q]||now]);
  return out; }
let vsAt=null;
function vsSet(sp){ const [i,h]=vsAt;
  if(sp.q==='aug' && !STEPS.includes(sp.o)) sp.sp='b';   // キーの外の aug は ♭ で書く（♭6aug など、半音で下りていく形）
  const tones=(QUAL[sp.q]||[0,4,7]).map(iv=>(sp.o+iv)%12); if(sp.b!=null && (!tones.includes(sp.b)||sp.b===sp.o)) sp.b=null;
  const di=STEPS.indexOf(sp.o), plain=di>=0 && sp.x==='' && sp.b==null && vsNat(sp.o)===vsKind(sp);
  const nv=plain?di:{o:sp.o,q:sp.q,x:sp.x||'',b:sp.b??null,...(sp.sp?{sp:sp.sp}:{})};
  setV(i,h,nv); preview(nv); renderSlots(); vsRender(); }
function vsCols(){ const wh=$('varWheels'); if($('vsRoot')) return;
  const col=(id,t)=>`<div class="edcol" data-vs="${id}"><h3>${t}</h3><div class="wheel"><div class="edlist" id="${id}"></div></div></div>`;
  wh.querySelector('.varcols').innerHTML=col('vsRoot','ルート')+col('vsKind','種類')+col('vsExt','数字')+col('vsBass','ベース'); }
function vsRender(){ const [i,h]=vsAt, v=getV(i,h); if(v==null) return; const sp={x:'',b:null,...specOf(v)}, lv=ULx(), kind=vsKind(sp);
  const rl=ctxRole(v,null,null,false);
  $('varNow').className='varnow '+rl; $('varNow').innerHTML=`<b>${nameOf(v,state.label,true)}</b><small>${nameOf(v,state.label==='alpha'?numK():'alpha',false)}</small><i>${rl}</i>`;
  const show={vsRoot:lv>=10, vsKind:true, vsExt:true, vsBass:lv>=7};
  document.querySelectorAll('#varWheels [data-vs]').forEach(c=>c.hidden=!show[c.dataset.vs]);
  $('varWheels').querySelector('.varcols').style.gridTemplateColumns=`repeat(${Object.values(show).filter(Boolean).length},minmax(0,1fr))`;
  if(show.vsRoot) wheel($('vsRoot'), [...Array(12).keys()].map(o=>[o, degNum(degOf(o,{...sp,o,b:null,sp:sp.q==='aug'&&!STEPS.includes(o)?'b':undefined}),'num')]), sp.o, o=>{
    const n={...sp}; delete n.sp; if(n.b!=null) n.b=(n.b+o-n.o+12)%12; n.o=o; vsSet(n); });
  wheel($('vsKind'), vsKinds(sp,lv), kind, k=>{ const n={...sp}; delete n.sp;
    if(k==='dim7'){ n.q='m-5'; n.x='dim7'; } else { n.q=k==='dim'?'m-5':k; if(n.x==='dim7') n.x=''; if(!(VS_EXT[k]||[]).includes(n.x)) n.x=''; }
    vsSet(n); });
  const ex=(VS_EXT[kind]||['']).slice(); if(kind!=='dim7' && !ex.includes(sp.x)) ex.push(sp.x);
  $('vsExt').closest('.edcol').classList.toggle('off', kind==='dim7');
  wheel($('vsExt'), (kind==='dim7'?['']:ex).map(x=>[x, x?EXT_LABEL[x]||x:'なし']), kind==='dim7'?'':sp.x, x=>vsSet({...sp,x}));
  if(show.vsBass){ const tones=[...new Set(QUAL[sp.q]||[0,4,7])];
    wheel($('vsBass'), tones.map(iv=>{ const b=iv?(sp.o+iv)%12:null; return [b, iv?degNum(bassDeg({...sp,b}),'num'):'そのまま']; }), (sp.b==null||sp.b===sp.o)?null:sp.b, b=>vsSet({...sp,b})); }
}
const _vsOpen=openVar;
openVar=function(i,h){ if(ULx()<6) return _vsOpen.apply(this,arguments);
  const v=getV(i,h); if(v==null) return; vsAt=[i,h]; vsCols();
  $('varTitle').textContent=`${i+1}${state.len<4?'マス目':'小節目'}のコードを変える`;
  $('varOpts').hidden=true; $('varWheels').hidden=false; vsRender();
  $('varSheet').classList.add('on'); scrim.classList.add('on'); };

// 案内と課題の文を、別々に選ぶ形に合わせる
WHERE[7]=[tapSlot('「ベース」を選んで、<b>分数コード</b>にできます。')];
WHERE[8]=[tapSlot('「種類」で m を外したり、つけたりできます。')];
WHERE[10]=[tapSlot('「ルート」と「種類」で <b>dim・dim7</b> を作れます。<br>コードの右側に同じコードを置いてから変えると、半音でつなげます。')];
WHERE[11]=[tapSlot('「種類」で <b>aug</b> も選べます。')];
TASKS.secdom.text='「1 → 6m → 2m → 5」の <b>6m を2回タップして、種類を「なし」、数字を「7」</b>にして 6(7) に変えてみましょう。';
TASKS.secdom.ng='2つ目の 6m を2回タップして、種類を「なし」にしてみましょう。';
TASKS.minor4.hint='3つ目の 4 を2回タップして、種類を「m」にします';
TASKS.minor4.ng='3つ目の 4 を2回タップして、種類を「m」にしてみましょう。';
TASKS.dimLadder.text='「1 → 2m7 → 3m7 → 4」の、<b>1 のマスの右側に 1 を置いて</b>、2回タップで<b>種類を「dim7」、ルートを「♯1」</b>にしてみましょう。';
TASKS.augPass.hint='例：6m の右側に 6m を置いて、種類を「aug」、ルートを「♭6」にする';
