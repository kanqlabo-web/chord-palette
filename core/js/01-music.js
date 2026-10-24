// ---------- 版ごとの設定（index.html の CP_CONF） ----------
// store：保存データのキーの頭（ベータ版は 'cpbeta-'）、snd：音源の場所、kind：'main'｜'beta'｜'lecture'
const CP=Object.assign({store:'',snd:'snd/',kind:'main'}, window.CP_CONF||{}), STK=k=>CP.store+k;
// ベータ版などを初めて開いたときは、通常版の保存データを写して始める
// 講義版は、開くたびにまっさら（ほかの版の保存データ（PRO など）を持ちこまない）
try{ if(CP.kind==='lecture') Object.keys(localStorage).filter(k=>k.startsWith(STK('chord-palette'))).forEach(k=>localStorage.removeItem(k)); }catch(e){}
try{ if(CP.store && CP.kind!=='lecture' && localStorage.getItem(STK('chord-palette-v3'))==null){ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k&&k.startsWith('chord-palette')) localStorage.setItem(CP.store+k, localStorage.getItem(k)); } } }catch(e){}
// ---------- music data ----------
const KEYS = [
  {id:'C', pc:0, sc:['C','D','E','F','G','A','B']},
  {id:'D♭',pc:1, sc:['D♭','E♭','F','G♭','A♭','B♭','C']},
  {id:'D', pc:2, sc:['D','E','F♯','G','A','B','C♯']},
  {id:'E♭',pc:3, sc:['E♭','F','G','A♭','B♭','C','D']},
  {id:'E', pc:4, sc:['E','F♯','G♯','A','B','C♯','D♯']},
  {id:'F', pc:5, sc:['F','G','A','B♭','C','D','E']},
  {id:'F♯',pc:6, sc:['F♯','G♯','A♯','B','C♯','D♯','E♯']},
  {id:'G', pc:7, sc:['G','A','B','C','D','E','F♯']},
  {id:'A♭',pc:8, sc:['A♭','B♭','C','D♭','E♭','F','G']},
  {id:'A', pc:9, sc:['A','B','C♯','D','E','F♯','G♯']},
  {id:'B♭',pc:10,sc:['B♭','C','D','E♭','F','G','A']},
  {id:'B', pc:11,sc:['B','C♯','D♯','E','F♯','G♯','A♯']},
];
const STEPS=[0,2,4,5,7,9,11];
const DEG=[
  {deg:'Ⅰ',num:'1',fn:'T',q:'',  iv:[0,4,7]},
  {deg:'Ⅱm',num:'2m',fn:'S',q:'m', iv:[0,3,7]},
  {deg:'Ⅲm',num:'3m',fn:'T',q:'m', iv:[0,3,7]},
  {deg:'Ⅳ',num:'4',fn:'S',q:'',  iv:[0,4,7]},
  {deg:'Ⅴ',num:'5',fn:'D',q:'',  iv:[0,4,7]},
  {deg:'Ⅵm',num:'6m',fn:'T',q:'m', iv:[0,3,7]},
  {deg:'Ⅶdim',num:'7dim',fn:'D',q:'m-5',iv:[0,3,6]},
];
const keyObj=()=>KEYS.find(k=>k.id===state.key)||KEYS[0];
// ---- コードの表し方 ----
// マスの値は「数字（ダイアトニックの何番目か）」または「PROで作ったコード {o:キーからの半音, q:種類, x:テンション, b:分数コードのベース(半音) or null}」
const QUAL={maj:[0,4,7],m:[0,3,7],sus2:[0,2,7],sus4:[0,5,7],'5':[0,7],'m-5':[0,3,6],aug:[0,4,8],b5:[0,4,6],ms5:[0,3,8]};
const QUAL_LABEL={maj:'なし',m:'m',sus2:'sus2',sus4:'sus4','5':'5','m-5':'m(♭5)',aug:'aug',b5:'(♭5)',ms5:'m(♯5)'};
const QUAL_ORDER=['maj','m','sus2','sus4','5','m-5','aug','b5','ms5'];
const EXT={'':[], '6':[9], '7':[10], 'M7':[11], 'add9':[14], 'add11':[17], '69':[9,14], '9':[10,14], 'M9':[11,14], '7add11':[10,17], '11':[10,14,17], '13':[10,14,21], 'M13':[11,14,21], '7b9':[10,13], '7s9':[10,15], '7b13':[10,20], 'dim7':[9], 'addb9':[13]};
const EXT_LABEL={'':'なし','6':'6','7':'7','M7':'M7','add9':'add9','add11':'add11','69':'6(9)','9':'7(9)','M9':'M7(9)','7add11':'7(11)','11':'7(9,11)','13':'7(9,13)','M13':'M7(9,13)','7b9':'7(♭9)','7s9':'7(♯9)','7b13':'7(♭13)','dim7':'dim7','addb9':'add♭9'};
const EXT_ORDER=['','6','7','M7','add9','add11','69','9','M9','7add11','11','13','M13','7b9','7s9','7b13','dim7','addb9'];
const NUM_OF=['1','♭2','2','♭3','3','4','♯4','5','♭6','6','♭7','7'];
const ROM_OF=['Ⅰ','♭Ⅱ','Ⅱ','♭Ⅲ','Ⅲ','Ⅳ','♯Ⅳ','Ⅴ','♭Ⅵ','Ⅵ','♭Ⅶ','Ⅶ'];
const FLAT_NAMES=['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
const SHARP_NAMES=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
const FN_OF={0:'T',4:'T',9:'T',2:'S',5:'S',7:'D',11:'D'};
const isNum=v=>typeof v==='number';
function specOf(v){
  if(isNum(v)) return {o:STEPS[v], q:DEG[v].q===''?'maj':DEG[v].q, x:'', b:null};
  return v;
}
// ---- 音名のつづり（楽典どおり）：キーの音階の何番目の音を、♯・♭でどれだけ変えたものかで書く ----
const LETTERS=['C','D','E','F','G','A','B'], NAT=[0,2,4,5,7,9,11], ACC={'-2':'♭♭','-1':'♭','0':'','1':'♯','2':'♯♯'}, ROMN=['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ'];
// キーの外の根音：ふつうは ♭2・♭3・♯4・♭6・♭7（同主短調などから借りてきたコード）
// 減三和音・増三和音・dim7 は、次のコードへ半音で上がる音（導音）の上にできるので ♯1・♯2・♯4・♯5・♯6
// 例外はコードの sp に 'b'（♭で書く：半音で下りていく dim7 など）／'#'（♯で書く）／'k'（ベースをキーの音としてつづる：Fdim/B など）を持たせる
const LOW_DEG={1:[1,-1],3:[2,-1],6:[3,1],8:[5,-1],10:[6,-1]}, UP_DEG={1:[0,1],3:[1,1],6:[3,1],8:[4,1],10:[5,1]};
function degOf(off,sp){   // キー基準の半音 → [音階の何番目(0〜6), ♯♭(-2〜2)]
  const di=STEPS.indexOf(off); if(di>=0) return [di,0];
  if(sp && /b/.test(sp.sp||'')) return off===6?[4,-1]:LOW_DEG[off];
  if(sp && (/#/.test(sp.sp||'')||sp.q==='m-5'||sp.q==='aug'||sp.x==='dim7')) return UP_DEG[off];
  return LOW_DEG[off];
}
function degLetter(dg){ const k=keyObj(), L=k.sc[dg[0]][0], pc=(k.pc+STEPS[dg[0]]+dg[1]+24)%12, d=((pc-NAT[LETTERS.indexOf(L)]+18)%12)-6; return L+(ACC[d]??''); }
const degNum=(dg,kind)=>(ACC[dg[1]]??'')+(kind==='roman'?ROMN[dg[0]]:String(dg[0]+1));
function noteName(off,sp){ return degLetter(degOf(off,sp)); }   // キー基準の半音 → 音名
// コードの構成音が、根音から数えて何度か（0=1度 … 6=7度）。分数コードのベースのつづりに使う（A の3度 → C♯、Caug の5度 → G♯）
const TONE_DEG={maj:{4:2,7:4},m:{3:2,7:4},sus2:{2:1,7:4},sus4:{5:3,7:4},'5':{7:4},'m-5':{3:2,6:4},aug:{4:2,8:4},b5:{4:2,6:4},ms5:{3:2,8:4}};
const EXT_DEG={'6':{9:5},'7':{10:6},'M7':{11:6},'add9':{2:1},'add11':{5:3},'69':{9:5,2:1},'9':{10:6,2:1},'M9':{11:6,2:1},'7add11':{10:6,5:3},'11':{10:6,2:1,5:3},'13':{10:6,2:1,9:5},'M13':{11:6,2:1,9:5},'7b9':{10:6,1:1},'7s9':{10:6,3:1},'7b13':{10:6,8:5},'dim7':{9:6},'addb9':{1:1}};
const toneDeg=(sp,rel)=>rel===0?0:((TONE_DEG[sp.q]||TONE_DEG.maj)[rel]??(EXT_DEG[sp.x]||{})[rel]);
function bassDeg(sp){   // 分数コードのベース：構成音ならコードの度数どおり、構成音でなければキーの音としてつづる
  const n=/k/.test(sp.sp||'')?undefined:toneDeg(sp,(sp.b-sp.o+12)%12); if(n===undefined) return degOf(sp.b);
  const di=(degOf(sp.o,sp)[0]+n)%7; return [di,((sp.b-STEPS[di]+18)%12)-6];
}
// 根音から数えた度数の名前（♭3・♯5・♭♭7 など）。構成音でない音は ♭2・♭3・♯4・♭6・♭7
const relName=(sp,rel)=>{ const n=toneDeg(sp,rel); return n===undefined?NUM_OF[rel]:(ACC[((rel-NAT[n]+18)%12)-6]??'')+(n+1); };
// マスに置いたときの役割：Ⅰ・Ⅳ・Ⅴ 以外は、前後のコードとの関係で決まる
function ctxRole(v,prev,next,minor){
  const sp=specOf(v), o=sp.o, q=sp.q;
  if(minor){   // Am中心（短調）として見る：Am=Ⅰm、Em=Ⅴm、Bm-5=Ⅱm-5、F=♭Ⅵ、G=♭Ⅶ、C=♭Ⅲ
    if((o===2||o===5) && sp.b===7) return 'D';
    // G（♭Ⅶ）は、F・Dm（サブドミナント）へ下りていくときはSの仲間（Am→G→F→E など）。Am・Cへ進むときはD
    const nx=next!=null?specOf(next).o:null;
    // Em（短調のⅴm）は Am へ戻るときだけD。F・C などへ進むときは長調の3mと同じくTの代わり（Am→Em→F→C など）
    const emRole=(q==='maj'||q==='aug'||nx===9)?'D':'T';
    const m={9:'T',0:'T',4:emRole,7:(nx===5||nx===2)?'S':'D',5:'S',2:(q==='maj'||q==='aug')?'D':'S',11:'S',8:'S',10:'S'}[o];
    if(m) return m;
  }
  const nO=next!=null?specOf(next).o:null, pO=prev!=null?specOf(prev).o:null;
  if((o===2||o===5) && sp.b===7) return 'D';             // Ⅱm/Ⅴ（Dm7/G）・Ⅳ/Ⅴ（F/G）はドミナント（Ⅴの音の上にのったsus系の響き）
  if(o===0 && sp.b===5) return 'S';                       // Ⅰ/Ⅳ（C/F）はベースのⅣが効いてサブドミナント
  switch(o){
    case 0: return 'T';
    case 5: return 'S';
    case 7: return 'D';
    case 2: return (q==='maj'||q==='aug') ? 'D' : 'S';    // Ⅱ7 はⅤへのドミナント
    case 4: if(q==='maj'||q==='aug') return 'D';          // Ⅲ（メジャー）はⅥmへのドミナント
            return nO===9 ? 'D' : 'T';                     // Ⅲm→Ⅵm は解決するようなD、それ以外はTの代理
    case 9: if(q==='maj'||q==='aug') return 'D';             // Ⅵ7（A7）は2mへのドミナント
            if(pO===7) return 'T';                         // Ⅴ→Ⅵm（偽終止）はT
            if(pO===4 && ['maj','aug'].includes(specOf(prev).q)) return 'T';   // Ⅲ(7)→Ⅵm：短調（Amキー）のⅤ→Ⅰmに解決したのでT
            return (nO===7||nO===11) ? 'S' : 'T';          // Ⅴの前に置くとSとして働く
    case 11: return (nO===4) ? 'S' : 'D';                  // Ⅶm-5→Ⅲ はⅥmへのツーファイブの「2」
    case 8: case 10: return 'S';                           // ♭Ⅵ・♭Ⅶ はサブドミナントマイナー
    default: return 'X';
  }
}
let ROLES={}, MINOR=false, FLOW=[], SECW=new Map();
// m を外した 2・3・6・7、または 7 をつけた 1（2(7)・3(7)・6(7)・1(7) など）
const isSecDom=v=>{ if(v==null||isNum(v)) return false; const sp=specOf(v); return ['maj','aug'].includes(sp.q) && ([2,4,9,11].includes(sp.o) || (sp.o===0&&sp.x==='7')); };
function computeRoles(){
  ROLES={}; const flat=[];
  for(let i=0;i<state.bars;i++) cellsOf(i).forEach(c=>{ if(c.v!==null&&c.v!==undefined) flat.push({k:i+':'+c.h,v:c.v}); });
  // Am中心かどうか：1つ目がAm、E/E7（Amへのドミナント）がある、AmがCより多い、で点数をつける
  const os=flat.map(c=>specOf(c.v)), cnt=o=>os.filter(x=>x.o===o).length;
  let score=0;
  if(os.length){ if(os[0].o===9&&os[0].q!=='maj') score+=2; if(os[0].o===0) score-=3; }
  if(os.some(x=>x.o===4&&(x.q==='maj'||x.q==='aug'))) score+=3;
  if(cnt(9)>cnt(0)) score+=1;
  MINOR = score>=2;
  flat.forEach((c,n)=>{ const prev=flat.length>1?flat[(n-1+flat.length)%flat.length].v:null, next=flat.length>1?flat[(n+1)%flat.length].v:null;
    ROLES[c.k]=ctxRole(c.v,prev,next,MINOR); });
  FLOW=flat.map(c=>({k:c.k,r:ROLES[c.k],v:c.v}));
  // 明るくした 2・3・6・7（キーの外のメジャー）は、自分から数えて4つ目（完全4度上）のコードへ進むのが自然
  SECW=new Map();
  if(flat.length>1) flat.forEach((c,n)=>{ if(!isSecDom(c.v)) return;
    const to=(specOf(c.v).o+5)%12, nx=flat[(n+1)%flat.length]; if(specOf(nx.v).o!==to) SECW.set(c.k,{v:c.v,to}); });
}
const roleAt=(i,h,v)=>ROLES[i+':'+h]||fnOf(v);
function fnOf(v){ return isNum(v) ? DEG[v].fn : (FN_OF[v.o]||'X'); }
function suffix(sp,html,kind){
  let t='';
  if(sp.x==='dim7') return 'dim7';   // m-5 に 6度（減7度）をのせたもの
  if(sp.q==='m-5' && !sp.x) return 'dim';   // 減三和音
  if(sp.q==='m-5' && sp.x==='7') return html?'m<sup>7(♭5)</sup>':'m7(♭5)';   // ハーフディミニッシュ
  if(sp.q==='m'||sp.q==='m-5'||sp.q==='ms5') t+='m';
  if(sp.q==='5') return t+(kind==='alpha'?'5':'(5)')+(sp.x==='add9'?'add9':'');
  const susFirst=(sp.q==='sus2'||sp.q==='sus4') && /^add/.test(sp.x||'');   // sus4add♭9 のように、add は sus のうしろに書く
  if(susFirst) t+=sp.q;
  if(sp.x){ const x=EXT_LABEL[sp.x]||sp.x; t+= kind==='alpha'||x.includes('(') ? x : html ? `<sup>${x}</sup>` : `(${x})`; }
  if(sp.q==='m-5') t+= html?'<sup>(♭5)</sup>':'(♭5)';   // m7(♭5)＝ハーフディミニッシュ
  if((sp.q==='sus2'||sp.q==='sus4') && !susFirst) t+=sp.q;
  if(sp.q==='aug') t+= !sp.x ? 'aug' : html?'<sup>(♯5)</sup>':'(♯5)';   // 7 などがつくときは 7(♯5)
  if(sp.q==='b5') t+=html?'<sup>(♭5)</sup>':'(♭5)';
  if(sp.q==='ms5') t+=html?'<sup>(♯5)</sup>':'(♯5)';
  return t;
}
function nameOf(v,kind,html){
  const sp=specOf(v);
  const sh=dg=>kind==='alpha'?degLetter(dg):degNum(dg,kind);
  let t=sh(degOf(sp.o,sp))+suffix(sp,html,kind);
  if(sp.b!==null&&sp.b!==undefined) t+='/'+sh(bassDeg(sp));
  return t;
}
function chordHTML(v){ return nameOf(v,'alpha',true); }
function chordText(v){ return nameOf(v,'alpha',false); }
function labelOf(v,kind){
  const t=nameOf(v,kind,true), len=nameOf(v,kind,false).length;
  const size = len>=8 ? .5 : len>=6 ? .62 : len>=4 ? .78 : 1;
  return size<1 ? `<span style="font-size:${size}em">${t}</span>` : t;
}
const bigHTML=v=>labelOf(v,state.label);
// 数字の書き方（1・2・3 か Ⅰ・Ⅱ・Ⅲ か）と、大きく出すのが数字かアルファベットかは、別々に選べる
const numK=()=>state.numStyle==='roman'?'roman':'num';
const smallHTML=v=>labelOf(v,state.label==='alpha'?numK():'alpha');
const plainLabel=v=>nameOf(v,state.label,false).replace('-5','⁻⁵');
const LABELS={num:'数字',roman:'ローマ数字',alpha:'アルファベット'};
// ボイシング：左手はルート（分数コードならその音）、右手は前の和音から近い形を選ぶ（なめらかなボイスリーディング）
// 音の番号: 0=左手 1〜3=右手（低→高） 4=左手5度 5=左手オクターブ 6〜8=右手のオクターブ上 9,10=右手4音目
function voiceFor(pcs,prev,minLo=56,accTop=null,mid=64,bassPc=null){   // mid：好む高さの中心（平均がここから離れるほど選ばれにくい）
  const cands=[];
  const hiLo = accTop!=null ? Math.max(minLo+12, accTop) : minLo+12;   // アクセントのあとは、上へつなげられるよう高い形も候補に入れる
  // 4音のコードで、ベース（左手）と同じ音を右手から抜いた形も候補にする（M7 の「ラドミファ」のように半音がはしにくる形をさけるため）
  const sets=[pcs]; if(pcs.length>=4 && bassPc!=null && pcs.includes(bassPc)) sets.push(pcs.filter(pc=>pc!==bassPc));
  sets.forEach((P,si)=>{ const n=Math.min(P.length,4);
  for(let lo=minLo-4;lo<=hiLo+3;lo++){ if(!P.includes(lo%12)) continue;   // 右手の一番下の音：ふだんは A♭3〜A♭4（範囲の外は、全部の声が2度以内で動けるときだけ）
    const v=[lo]; for(let k=1;k<n;k++){ let m=v[k-1]+1; while(!P.includes(m%12)||v.some(x=>x%12===m%12)) m++; v.push(m); }
    v.drop=si>0; cands.push(v); } });
  // 右手のいちばん上・いちばん下の音が、となりの音と半音でぶつかる形（A C E F の E-F など）はほぼ選ばない。音を抜いた形は少しだけ選ばれにくく
  const edge=a=>a.length>=2 && (a[1]-a[0]===1 || a[a.length-1]-a[a.length-2]===1);
  // 前の和音に近い形を選ぶ。ただし真ん中の音域（平均E4付近）から離れすぎないように罰点をつける
  // （近さだけで選ぶと、Am→Bm-5→C→Em のような進行で1周ごとに少しずつ上がり続けてしまう）
  const ref=prev||[58,63,67,70], dist=a=>a.reduce((s,m,i)=>s+Math.abs(m-(ref[i]??ref[ref.length-1]+3)),0)
    + 2*Math.max(0,Math.abs(a.reduce((s,m)=>s+m,0)/a.length-mid)-2.5)*a.length;
  // 音域の外の形：全部の声が前の和音から2度以内（なめらか）に動けるなら少しの罰点、そうでなければ大きな罰点
  const step=a=>prev&&prev.length>=a.length&&a.every((m,i)=>Math.abs(m-prev[i])<=2), outP=a=>{ const o=Math.max(0,minLo-a[0])+Math.max(0,a[0]-(minLo+12)); return o?(step(a)?o*.5:1000+o):0; };
  const dist0=dist; const distO=a=>dist0(a)+outP(a)+(edge(a)?1000:0)+(a.drop?500:0);   // 音を抜くのは、どの形でもはしが半音でぶつかるときだけ
  cands.sort((a,b)=>distO(a)-distO(b));
  // 直前の最後の音がアクセント（高い音）だったときは、次の和音のいちばん上の音をアクセントと同じか少し上（〜5半音）に上げて、上でつなげる
  if(accTop!=null){ const top=a=>a[a.length-1], pick=f=>{ const up=cands.filter(a=>f(a)&&!edge(a)&&!a.drop); up.sort((a,b)=>Math.abs(top(a)-accTop)-Math.abs(top(b)-accTop)||dist(a)-dist(b)); return up[0]; };
    const r=pick(a=>top(a)>=accTop && top(a)<=accTop+5) || pick(a=>top(a)>=accTop-2 && top(a)<accTop);
    if(r) return r; }
  return cands[0];
}
// ---- ギターのボイシング：標準チューニング（E2 A2 D3 G3 B3 E4）で、実際に押さえられる形を探す
// ・いちばん低い弦がベース音（ルート／分数コードはその音）。それより低い弦はミュート、上は1弦まで全部鳴らす
// ・ローポジション（0〜3フレット＋開放弦、指は4本まで）を優先。無理ならバレーコード（人差し指で押さえるフレット＋上3フレット、残りの指は3本まで）
// ・和音の音は全部入れる（4音以上で入りきらないときは5度を省く）
const GUITARS=new Set(['steel','nylon','eguitar','dist']);
const OPEN_STR=[40,45,50,55,59,64], GSHAPE={};
// 定番のローコード（この形に合うコードは、そのまま使う）
const OPEN_CHORDS=['x32010','xx0232','022100','320003','x02220','x02210','xx0231','022000',
  'x32310','xx0212','020100','320001','x02020','x21202','x02010','xx0211','020000',
  'x32000','xx0222','021100','xx3210','320002','x02120','x02230','xx0233','022200','x02200','xx0230','x32030','330013','x33011']
  .map(t=>[...t].map((c,j)=>c==='x'?null:OPEN_STR[j]+(+c)).filter(m=>m!==null));
function guitarShape(pcsAll,bpc,fifthPc){
  const pcs=[...new Set(pcsAll)], key=pcs.join(',')+'/'+bpc; if(key in GSHAPE) return GSHAPE[key];
  const same=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));
  const oc=OPEN_CHORDS.find(n=>n[0]%12===bpc && same([...new Set(n.map(m=>m%12))],pcs));
  if(oc) return GSHAPE[key]=oc;
  let best=null, bc=1e9;
  const tryPos=(p)=>{
    for(let bs=0;bs<3;bs++){                                   // ベースを弾く弦：6弦・5弦・4弦
      const lo=p===0?0:p, hi=p===0?3:p+3;
      const bf=[]; for(let f=lo;f<=hi;f++) if((OPEN_STR[bs]+f)%12===bpc) bf.push(f);
      if(p>0 && !bf.includes(p)) continue;                     // バレーはベース音をバレーのフレットで
      for(const f0 of (p>0?[p]:bf)){
        for(const top of (p>0?[6,5]:[6])){                     // 1弦まで鳴らす／（バレーのときだけ）1弦をミュート
        const rest=OPEN_STR.slice(bs+1,top), opts=rest.map(o=>{ const a=[]; for(let f=lo;f<=hi;f++) if(pcs.includes((o+f)%12)) a.push(f); return a; });
        if(opts.some(a=>!a.length)) continue;
        const walk=(k,fr)=>{ if(k===rest.length){ score([f0,...fr]); return; } for(const f of opts[k]) walk(k+1,[...fr,f]); };
        const score=fr=>{
          const notes=fr.map((f,j)=>OPEN_STR[bs+j]+f), have=new Set(notes.map(m=>m%12));
          const miss=pcs.filter(x=>!have.has(x)); if(miss.length && !(pcs.length>=4 && miss.length===1 && miss[0]===fifthPc)) return;
          const fretted=fr.filter(f=>f>(p>0?p:0)), span=fretted.length?Math.max(...fretted)-Math.min(...fretted,p>0?p:99):0;
          if(fretted.length>(p>0?3:4) || span>3) return;
          let c = p>0 ? 2+p*.6 : (fretted.length>=4?3.5:0);    // バレーは少し不利に（ローコードを優先）。ただし指4本を使う変則的なローコードよりはバレー
          c += bs*1.5 + fretted.length*.5 + (miss.length?1:0) + (top===5?2:0);
          if(notes[notes.length-1]%12===notes[0]%12) c-=.2;      // 1弦がベースと同じ音だと安定
          if(c<bc){ bc=c; best=notes; } };
        walk(0,[]);
        }
      }
    }
  };
  tryPos(0); for(let p=1;p<=9;p++) tryPos(p);
  return GSHAPE[key]=best;
}
let LHCTX={use:false,prev:null,prevB:null,reset:false,satb:null};
// つながりで高さを選ぶ（左手・ベース共通）：def=ふつうの高さ、lo=音域の下（lo〜lo+11 が基本）、prev=前の音、below=下にはみ出してよい幅
function leadTo(def,pc,lo,prev,below){ if(prev==null) return def;
  const isPc=m=>((m-pc)%12+12)%12===0, center=lo+6;
  const near=[prev,prev-1,prev+1,prev-2,prev+2].filter(m=>isPc(m) && m>=lo-below-5 && m<=lo+20);   // 2度の動き（下向きを先に）は必ず近い方へ。音域から多少はみ出してもよい
  if(near.length) return near[0];
  const w=LHCTX.reset?.7:.2; let best=def, bc=1e9;   // 2小節の区切りでは真ん中の音域へ戻りやすく
  for(let m=lo-below;m<=lo+17;m++){ if(!isPc(m)) continue; const out=m<lo?(lo-m)*1.5:m>lo+11?(m-lo-11)*1.5:0, c=Math.abs(m-prev)+w*Math.abs(m-center)+out; if(c<bc){ bc=c; best=m; } }
  return best; }
// 再生中にコードを決めるとき：左手を前の音とつなげる（start＝そのコードが鳴り始める、進行の中の位置）
function chordAt(v,start){ LHCTX.use=true; LHCTX.accTop=ACC_TOP; ACC_TOP=null; LHCTX.reset = start%16===0 && Math.floor(start/16)%2===0; const t=chordNotes(v,lastR); LHCTX.use=false;
  if(!GUITARS.has(state.inst)) LHCTX.prev=t.tones[0]; LHCTX.prevB=t.bass; return t; }
// ---- 和声法（4声体）：開離配置と声部の連結 ----
function satbVoice(pcs, rpc, bpc, B, sp, prev){
  const has=iv=>pcs.includes((rpc+iv)%12), third=[4,3,5,2].map(i=>(rpc+i)%12).find(pc=>pcs.includes(pc)), fifth=[7,6,8].map(i=>(rpc+i)%12).find(pc=>pcs.includes(pc));
  const sev=[10,11,9].map(i=>(rpc+i)%12).find(pc=>pcs.includes(pc)&&pc!==fifth&&pc!==third);
  // 上3声の音：基本形は根音を重複（根・3・5）、第1転回形は3度を重複しない、7の和音は5度を省く
  let U;
  if(sev!==undefined) U = bpc===rpc ? [rpc,third,sev] : pcs.filter(pc=>pc!==bpc).slice(0,3);
  else if(bpc===third) U=[rpc,rpc,fifth];
  else U=[rpc,third??rpc,fifth??rpc];
  U=U.map(x=>x??rpc); while(U.length<3) U.push(rpc);
  const key=keyObj().pc, lt=(key+11)%12, ton=key;
  const R={T:[48,64],A:[55,72],S:[62,77]};   // 3拍目で上へ転回しても高くなりすぎないよう、もとの形は少し低めに
  const cands=[]; const perms=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
  const opts=(pc,[lo,hi])=>{ const o=[]; for(let m=lo;m<=hi;m++) if(m%12===pc) o.push(m); return o; };
  perms.forEach(pm=>{ opts(U[pm[0]],R.T).forEach(T=>opts(U[pm[1]],R.A).forEach(A=>opts(U[pm[2]],R.S).forEach(S=>{
    if(!(B<T && T<A && A<S)) return; if(S-A>12 || A-T>12) return; cands.push({B,T,A,S}); }))); });
  if(!cands.length) return {B,T:B+12+((U[0]-B)%12+12)%12,A:0,S:0, ...(()=>{ const T=56+((U[0]-56)%12+12)%12, A=T+((U[1]-T)%12+12)%12||T+12, S=A+((U[2]-A)%12+12)%12||A+12; return {T,A,S}; })()};
  const V=['B','T','A','S'];
  const cost=c=>{ let k=0;
    if(c.S-c.T<=12) k+=30;                                   // 開離配置（ソプラノとテノールが1オクターブより広い）
    if(!prev){ return k+Math.abs(c.S-74)+Math.abs(c.A-65)+Math.abs(c.T-57); }
    V.slice(1).forEach(v=>{ const d=Math.abs(c[v]-prev[v]); k+=d + (d>7?12:0) + (d>12?30:0); });   // なめらかに（大きな跳躍は避ける）
    k+=.8*Math.max(0,c.S-72)+.8*Math.max(0,64-c.S);   // ソプラノは真ん中の音域（E4〜C5あたり）へ戻りやすく。上がり続けないように
    for(let i=0;i<4;i++) for(let j=i+1;j<4;j++){ const a=V[i], b=V[j];
      const i0=((prev[b]-prev[a])%12+12)%12, i1=((c[b]-c[a])%12+12)%12, ma=c[a]-prev[a], mb=c[b]-prev[b];
      if(ma!==0 && mb!==0 && i0===i1 && (i1===7||i1===0)) k+=200;                               // 連続5度・連続8度
      if(a==='B' && b==='S' && Math.sign(ma)===Math.sign(mb) && ma!==0 && (i1===7||i1===0) && Math.abs(mb)>2) k+=40;   // 外声の直行（隠伏）5度・8度
    }
    V.slice(1).forEach(v=>{ const p=prev[v]%12;
      if(p===lt && pcs.includes(ton) && c[v]-prev[v]!==1) k+= v==='S'?60:20;               // 導音は主音へ上がって解決
      if(prev.sev!==undefined && p===prev.sev && !(c[v]-prev[v]<0 && c[v]-prev[v]>=-2)) k+=40;   // 7度は2度下がって解決
    });
    return k; };
  cands.sort((a,b)=>cost(a)-cost(b)); const best={...cands[0], sev}; return best;
}
// 音域（半音いくつ上げ下げ）。楽器ごと：コード（rhOff/lhOff）・コード2（rhOff2/lhOff2）・ベース（bassOff）。
// PRO はスライダーの値、ビギナーは伴奏スタイルごとの決まった値（state.sOff。setStyle で入る）
// PRO では「絶対的な鍵盤の範囲」（いちばん下の音の MIDI 番号：rhLo / lhLo / rhLo2 / lhLo2 / bassLo）で決める。
// 中身は、パターンの標準の高さからのずれ（半音）に直して使う。null＝パターンの標準のまま
const RH_DEF=()=>{ const pat=ARPS[state.arp]; return 56+((pat&&pat.rhShift)||0); }, LH_DEF=40, BASS_DEF=28;
// 楽器ごとの標準の音域（パターンの標準の高さから半音いくつずらすか）。伴奏スタイルや PRO の「ずらし」は、この上に足す
// エレピは右手 D♭3〜C4・左手 C2〜B2、ギターは実際の楽器の高さに近い E3 から、鉄琴は1オクターブ上
const INST_RANGE={epiano:{rh:-7,lh:-4},epcity:{rh:-7,lh:-4},lofi:{rh:-7,lh:-4},
  steel:{rh:-4,lh:0},nylon:{rh:-4,lh:0},eguitar:{rh:-4,lh:0},dist:{rh:-4,lh:0},
  strings3:{rh:0,lh:-4},trombone:{rh:-5,lh:-4},sax:{rh:-2,lh:0},glock:{rh:12,lh:12}};
const IOFF=inst=>INST_RANGE[inst]||{rh:0,lh:0};
function ROFF(){ const io=IOFF(PART2?(state.inst2||'epiano'):state.inst);
  if(state.pro){ const rl=PART2?state.rhLo2:state.rhLo, ll=PART2?state.lhLo2:state.lhLo;
    return {rh: rl!=null ? rl-RH_DEF() : ((PART2?state.rhOff2:state.rhOff)||0)+io.rh, lh: ll!=null ? ll-LH_DEF : ((PART2?state.lhOff2:state.lhOff)||0)+io.lh}; }
  const o=state.sOff||{}; return PART2?{rh:(o.rh2||0)+io.rh,lh:(o.lh2||0)+io.lh}:{rh:(o.rh||0)+io.rh,lh:(o.lh||0)+io.lh}; }
const BOFF=()=>state.pro?(state.bassLo!=null?state.bassLo-BASS_DEF:(state.bassOff||0)):((state.sOff||{}).bass||0);
const midiName=m=>['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'][((m%12)+12)%12]+(Math.floor(m/12)-1);
const sOffOf=st=>({rh:st.rhOff||0, lh:st.lhOff||0, rh2:st.rhOff2||0, lh2:st.lhOff2||0, bass:st.bassOff||0});
function chordNotes(v,prev){
  const sp=specOf(v), k=keyObj(), rpc=(k.pc+sp.o)%12;
  let ivs=[...QUAL[sp.q], ...(sp.q==='5'?(sp.x==='add9'?[14]:[]):(EXT[sp.x]||[]))];
  let pcs=[...new Set(ivs.map(i=>(rpc+i)%12))];
  if(pcs.length>4 || (ARPS[state.arp]&&ARPS[state.arp].noRoot&&pcs.length>3)) pcs=pcs.filter(pc=>pc!==rpc);                 // 5音以上ならルートは左手に任せる（noRoot：4音のコードもルートを省く。「パー」はテンションごと鳴らす）
  const slash = sp.b!==null&&sp.b!==undefined, bpc = slash ? (k.pc+sp.b)%12 : rpc;
  setScaleFor([...pcs, bpc]);   // 借りてきたコードなら、フレーズの音階を同主短調に（分数コードはベースの音も入れて判定。Cm7/D の D など）
  // 左手：E2〜E♭3（PROでは音域スライダーでずらせる）
  const {lh:lhOff, rh:rhOff}=ROFF();
  const lo=40+lhOff;   // 音域スライダーは「範囲」をずらす（音の名前は変えない）
  let L=lo+(((bpc-lo)%12)+12)%12;
  // 再生中は、左手を前の音からのつながりで選ぶ（声部進行）：
  // ・2度（全音・半音）の動きは必ず近い方へ
  // ・それ以外も近い方を優先。ただし「1→2小節」「3→4小節」の中では特に近さを優先し、2小節ごとの区切り（3小節目・5小節目の頭）では真ん中の音域へ戻りやすくする
  // ・決めた音域から大きくはみ出さない
  if(LHCTX.use) L=leadTo(L, bpc, lo, LHCTX.prev, 6);
  // 左手のオクターブも弾くパターンでは、右手のいちばん下の音を左手オクターブより短3度以上上にして、音がぶつからないようにする
  const pat=ARPS[state.arp], R0=voiceFor(pcs,prev, (pat&&pat.rhAbove ? Math.max(56,L+12+3) : 56)+rhOff+((pat&&pat.rhShift)||0), LHCTX.use?LHCTX.accTop:null, 64+((pat&&pat.rhMid)||0), bpc);   // rhMid：右手の和音を置く高さの好み   // rhShift：パターンごとの高さ（ブラスは少し上）   // 右手：A♭3から上
  // 平行移動：同じ形のコードが半音・全音で動くとき（Cm7→Bm7→B♭m7 など）は、前の和音の形をそのまま滑らせる（ブラスのセクションのように）
  let R=R0; if(prev&&prev.length===R0.length){ const want=[...pcs].map(x=>((x%12)+12)%12).sort((a,b)=>a-b).join();
    if(pcs.length===prev.length) for(const d of [-1,1,-2,2]){ const sh=prev.map(x=>x+d); if([...sh].map(x=>((x%12)+12)%12).sort((a,b)=>a-b).join()===want){ R=sh; break; } } }
  // shell：右手を「ルート・3度・7度」（7度がなければ5度）の3音で、ルートを G3〜F♯4 に置く（citypop.mid の電子ピアノの形）
  if(pat&&pat.shell){ const lo2=55+rhOff+((pat.rhShift)||0), r0=lo2+(((rpc-lo2)%12)+12)%12, i3=[4,3,5,2].find(i=>ivs.includes(i))??4, i7=[11,10,9].find(i=>ivs.includes(i))??7;
    // 平行移動（shell の形でも）：前の3音（ルート・3度・7度）を同じ形のまま半音・全音ずらすと今のコードになるなら、そのまま滑らせる
    const want=[0,i3,i7].map(i=>(rpc+i)%12).sort((a,b)=>a-b).join(); let slid=null;
    if(prev&&prev.length===3) for(const d of [-1,1,-2,2]){ const sh=prev.map(x=>x+d); if(sh.map(x=>((x%12)+12)%12).sort((a,b)=>a-b).join()===want){ slid=sh; break; } }
    if(slid) R.splice(0,R.length,...slid); else {
    const C=[[0,i3,i7],[i3,i7,12],[i7,12,12+i3]].map(v=>{ const b=lo2-1+((((rpc+v[0])-(lo2-1))%12)+12)%12; return v.map(x=>b+x-v[0]); }).filter(v=>v[0]>=lo2-1&&v[0]<=lo2+11);
    const ml=pat.avoid===false?null:melLow(pat);
    if(ml!=null){ const cap=degPitch('d'+ml)+(pat.melOct||0), mp=melPcs(pat).map(pc=>melNote(60+pc,{rpc,ivs,bpc})%12);
      // フレーズの音と半音でぶつかる和音の音（例：E のコードの D♯ とフレーズの E）は、7度→5度、それでもぶつかれば6度に替える
      const clash=iv=>mp.some(pc=>{ const d=(((rpc+iv-pc)%12)+12)%12; return d===1||d===11; });
      // 替える音は、キーの中の音（かコードの音）だけ。ぶつからない5度・6度がなければ、ルートの1オクターブ上（Em の 6度＝C♯ のようなキーの外の音は使わない）
      const K0=keyObj().pc, SC0=scaleNow(), okIv=iv=>!clash(iv) && (ivs.includes(iv) || SC0.includes((((rpc+iv-K0)%12)+12)%12));
      let j7=i7; if(clash(j7)) j7=[7,9].find(okIv)??12; let j3=i3;
      const all=[]; for(let o=-12;o<=12;o+=12) [[0,j3,j7],[j3,j7,12],[j7,12,12+j3]].forEach(v=>{ const b=r0+o+v[0]; all.push(v.map(x=>b+x-v[0])); });
      // 和音の中で半音（短2度）がぶつからない形のうち、フレーズのいちばん低い音をギリギリ超えない（半音以上離れた）いちばん高い形
      const ok=all.filter(v=>v[2]<=cap-2&&v[0]>=48&&v[1]-v[0]>=2&&v[2]-v[1]>=2).sort((a,b)=>b[2]-a[2]); if(ok.length) C.splice(0,C.length,ok[0]); }
    else C.sort((a,b)=>Math.abs((a[0]+a[1]+a[2])/3-63)-Math.abs((b[0]+b[1]+b[2])/3-63));
    R.splice(0,R.length,...(C[0]||[r0,r0+i3,r0+i7])); } }   // 原曲の高さに近い形
  // メロディをよける（ふつうの和音の形でも）：メロディ行があるパターンでは、
  // ①メロディの音と半音でぶつかる和音の音を、ぶつからないコードの音（5度・ルート・3度・6度）に替え、②和音をメロディのいちばん低い音より下（全音以上離す）に収める
  else if(pat && pat.avoid!==false && melLow(pat)!=null){ const cap=degPitch('d'+melLow(pat))+(pat.melOct||0), mp=melPcs(pat).map(pc=>melNote(60+pc,{rpc,ivs,bpc})%12);   // メロディの音は、このコードの音階に合わせたあとの音で
    const clashPc=pc=>mp.some(q=>{ const d=(((pc-q)%12)+12)%12; return d===1||d===11; });
    const f5=ivs.includes(7)?7:ivs.includes(6)?6:ivs.includes(8)?8:7, t3=[4,3,5,2].find(i=>ivs.includes(i))??4;
    const used=new Set(R.filter(m=>!clashPc(m%12)).map(m=>m%12));
    let V=R.map(m=>{ if(!clashPc(m%12)) return m;
      const alt=[f5,0,t3].map(i=>(rpc+i)%12).filter(pc=>!clashPc(pc));
      const pcs2=alt.filter(pc=>!used.has(pc)); const pick=pcs2.length?pcs2:alt; if(!pick.length) return null;
      let best=null; pick.forEach(pc=>{ for(let x=m-6;x<=m+6;x++) if((x%12)===pc && (best==null||Math.abs(x-m)<Math.abs(best-m))) best=x; }); used.add(best%12); return best; }).filter(m=>m!=null);
    V=V.map(m=>{ let x=m; while(x>cap-2 && x-12>=48) x-=12; return x; });
    V=[...new Set(V)].sort((a,b)=>a-b);
    // 3音に満たないときは、いちばん上の音の1オクターブ下を足して、上にはみ出さないようにする
    while(V.length && V.length<3){ const d=V[V.length-1]-12; if(d<48||V.includes(d)) break; V=[d,...V].sort((a,b)=>a-b); }
    while(V.length && V.length<3) V.push(V[0]);
    if(V.length) R.splice(0,R.length,...V); }
  const r=[R[0],R[1]??R[0]+12,R[2]??(R[1]??R[0])+12];               // 2音（パワーコード）でも3つの役割を埋める
  // 5度はそのコードの本当の5度（m-5なら減5度、augなら増5度）。左手やベースが和音とぶつからないように
  const fifth = ivs.includes(7)?7 : ivs.includes(6)?6 : ivs.includes(8)?8 : 12;
  const third = ivs.includes(4)?4 : ivs.includes(3)?3 : ivs.includes(5)?5 : ivs.includes(2)?2 : 12;
  // 7度：コードに7度があればその音（7・M7・dim7）。なければキーの音階にある方（4 なら長7度、5 なら短7度）
  const seventh = ivs.includes(10)?10 : ivs.includes(11)?11 : (ivs.includes(9)&&sp.q==='dim')?9 : [0,2,4,5,7,9,11].includes((sp.o+11)%12)?11 : 10;
  // ベース：E1〜E♭2 が基本。再生中は左手と同じ考え方で、前の音からつながる高さを選ぶ
  const bLo=BASS_DEF+BOFF(), bass=leadTo(bLo+(((bpc-bLo)%12)+12)%12, bpc, bLo, LHCTX.use?LHCTX.prevB:null, 0);   // ベースの音域（いちばん下の音から1オクターブの中）
  // ボサノバの指弾きの形（bossaV）：5弦（か6弦）のルート＋3度・7度・9度（なければ6度・5度、3度の1オクターブ上）
  if(pat&&pat.bossaV){ const r=43+(((bpc-43)%12)+12)%12, t3=[4,3,5,2].find(i=>ivs.includes(i))??4, mid=[10,11,9].find(i=>ivs.includes(i))??(t3===3?10:9),
      top=[14,13,15].find(i=>ivs.includes(i))??(ivs.includes(21)?21:ivs.includes(17)?17:t3+12), v=[r+t3,r+mid,r+top].sort((a,b)=>a-b);
    // 2〜5弦の3〜9フレットあたりで押さえる高さ（親指のルートは G2〜F♯3）。バレーコードの形：ルートが6弦（G〜B）なら 6弦ルート・5弦5度・4弦7度・3弦3度・2弦13度（♭13・5度）。5弦（C〜F♯）なら 5弦ルート・6弦5度・4弦5度・3弦7度・2弦3度（x3535x の形。音が低いところで固まらないように）。9度があるコードだけ 4弦3度・2弦9度
    const s6=r<=47, f5=s6?r+fifth:r+fifth-12, has=i=>ivs.includes(i), dom=has(10)&&t3===4;
    const t9=[13,15,14].find(i=>has(i)), s4=s6?r+mid:t9!=null?r+t3:r+fifth, s3=s6?r+12+t3:r+mid, s2=s6?r+(has(20)?20:(has(21)||dom)?21:(fifth+12)):t9!=null?r+t9:r+12+t3, s1=s2+5;
    const T=[r,s3,s2,s1,f5,s4,s3+12,s2+12,s1+12,null,null], vv=[s3,s2,s1]; return {up:T, tones:T, R:vv, ra:vv, bass, slash, fifth, third, seventh, rpc, bpc, ivs, q:sp.q}; }
  // ギターの音色：実際のギターで押さえる形（ローコード、なければバレーコード）で鳴らす
  if(GUITARS.has(state.inst)){ const gs=guitarShape(ivs.map(i=>(rpc+i)%12), bpc, (rpc+fifth)%12);
    if(gs){ const n=gs.length, top=gs.slice(n-3), mid=gs.slice(1,n-3);
      const pS=new Set(pcs.concat([rpc])), ab=m=>{ let x=m+1; while(!pS.has(((x%12)+12)%12)) x++; return x; }, gT=[gs[0],...top, mid[0]??null, mid[1]??null, ...top.map(x=>x+12), null, null];
      return {up:gT.map((m,i)=>m!=null&&[1,2,3,6,7,8].includes(i)?ab(m):m), tones:gT, R:top, strings:gs, bass, slash, fifth, third, seventh, rpc, bpc, ivs, q:sp.q}; } }
  // 分散和音で1音ずつ弾くとき用の3音（ra）：右手が4音のときは5度を省いて、3度と7度・9度などの色の音を必ず残す
  let ra=null; if(R.length>=4){ const f5=(rpc+fifth)%12; let a=R.filter(m=>m%12!==f5); if(a.length!==3) a=R.filter(m=>m%12!==rpc); if(a.length!==3) a=R.slice(R.length-3); ra=a.slice(0,3); }
  const res={tones:[L,...r, slash?L+12:L+fifth, L+12, ...r.map(x=>x+12), R[3]??null, R[3]!=null?R[3]+12:null], R, ra, bass, slash, fifth, third, seventh, rpc, bpc, ivs, q:sp.q};   // ベースはE1〜E♭2（実際のベースの音域）
  // 和声法の4声（パターンに satb）：バス＝左手根音、コントラバス＝そのオクターブ下（左手5度の行）、テノール・アルト・ソプラノ＝右手 下・中・上。
  // 開離配置で、前の和音から声部をなめらかにつなぐ（共通音は保留、連続5度・8度を避ける、導音と7度は解決させる）
  // 「上へ転回」用（'up'）：右手の音をそれぞれ1つ上の和音の音へ（okesutora.mid の3拍目の動き）
  const pcSet=new Set(pcs.concat([rpc])), above=m=>{ let x=m+1; while(!pcSet.has(((x%12)+12)%12)) x++; return x; };
  res.up=res.tones.map((m,i)=>m!=null&&[1,2,3,6,7,8,9,10].includes(i)?above(m):m);
  if(pat&&pat.satb){ const v=satbVoice(ivs.map(i=>(rpc+i)%12), rpc, bpc, L, sp, LHCTX.use?LHCTX.satb:null); if(LHCTX.use) LHCTX.satb=v;
    res.tones=[v.B, v.T, v.A, v.S, v.B-12, null, v.T+12, v.A+12, v.S+12, null, null]; res.R=[v.T,v.A,v.S]; res.ra=null;
    const T2=above(v.T), A2=above(v.A), S2=above(v.S); res.upV={...v,T:T2,A:A2,S:S2};
    res.up=[v.B, T2, A2, S2, v.B-12, null, T2+12, A2+12, S2+12, null, null]; }
  return res;
}

// ---- drum patterns: 16 steps per voice. X=強 x=中 o=弱 g=ゴースト .=休み
const VEL={X:1,x:.75,o:.5,g:.25};
const velOf=c=>typeof c==='number'?c:(VEL[c]||0);   // 数字はそのままの強さ（MIDIから取り込んだ細かい強弱）
// MIDI の強さ（0〜127）を、そのまま16分×16マスの並びにする。{マス:強さ} → [0..1]（110 を最大として割る）
const M16=m=>{ const a=Array(16).fill(0); for(const k in m) a[k]=Math.min(1,m[k]/110); return a; };
const VOICE={k:36,s:38,x:37,cl:75,h:42,f:44,o:46,r:51,c:49,t1:50,t2:47,t3:45};   // f＝フットハイハット（ペダルで閉じる「チッ」）
// フィル：4小節目は「小フィル」（4拍目だけ）、8小節目は「大フィル」（3〜4拍目）。big/small とも16分16個の書き方で、使う所だけ読む
const FILLS={
  tom:  {big:  {k:'........X......X', s:'........XxXx....', t1:'............Xx..', t3:'..............XX'},
         small:{k:'...............X', s:'............Xx..', t3:'..............Xx'}},
  snare:{big:  {k:'........X.......', s:'........x.x.xxXX'},
         small:{s:'............xxXX', k:'............X...'}},
  // キメ：キックとスネアとシンバルをそろえて「ダッ・ダッ」と止め、最後にスネアで次の小節へ
  kime: {big:  {k:'........X..X....', s:'........X..X.oxX', c:'........x..x....'},
         small:{k:'............X...', s:'............X.xX', c:'............x...'}},
  // ゆったり：スネアからタムへ、上から下へ流れるように
  groove:{big: {k:'........x.....x.', s:'........x.oo....', t1:'............x...', t2:'.............o..', t3:'...............x'},
         small:{s:'............xoo.', t3:'...............x'}},
  // ファンキー：オープンハイハットで区切って、ゴーストから強いスネアへ16分で盛り上げる
  funk: {big:  {k:'........X.....x.', o:'........x.......', s:'..........gogoxX'},
         small:{k:'............x...', s:'.............oxX'}},
  // ジャジー：スネアのゴーストから低いタムへ、力を抜いてつなぐ
  soul: {big:  {k:'........x.......', o:'........o.......', s:'..........o.xg..', t2:'..............o.', t3:'...............x'},
         small:{s:'............xg..', t3:'..............ox'}},
  // バラード：ハイハットを止めて、タムを弱く上から下へ。叩きすぎない
  ballad:{big: {k:'........x.......', x:'........o.......', t1:'..........o.o...', t2:'..............x.', t3:'...............x'},
         small:{x:'............o...', t2:'..............o.', t3:'...............x'}},
  // 4つ打ち系：フィルの間もキックの4つ打ちは止めない
  dance:{big:  {k:'........X...X...', s:'........ggooxxXX', h:'..........o...o.'},   // 弱→強のスネアロールで盛り上げる
         small:{k:'............X...', s:'.............oxX', h:'..............o.'}},
  four: {big:  {k:'........X...X...', s:'........x.xx....', t1:'............X...', t2:'.............X..', t3:'..............XX'},   // タタッタ＋タム回し
         small:{k:'............X...', s:'............x.xx', t3:'...............X'}},
  soft: {big:  {k:'........X.......', s:'............o.x.', t2:'.............o..', t3:'...............x', h:'........g...g...'},
         small:{s:'..............ox', t3:'...............o'}},
  // スキップ風：3連符（タカタ・タカタ）。16分の 0・1・2 番目を 3連の 1・2・3 つ目として鳴らす
  shuf: {big:  {k:'........x.......', s:'........xgo.....', t1:'............x...', t2:'.............x..', t3:'..............X.'},
         small:{s:'............xg..', t3:'..............x.'}},
  // drum_.mid（Vintage Rock）から：小フィルはスネア→4拍目にフロアタム1発、大フィルはキックとスネアの掛け合いからフロアタム
  rock: {big:  {k:'........x.o.x...', s:'..........x.X.gx', t3:'........X.......'},
         small:{s:'...........gx...', t3:'..............X.'}},
  // drum1.mid（Halftime Pulse）から：リムショットで3・4拍をつなぐ
  // オーケストラ：大太鼓をだんだん強く連打して（クレッシェンド）次の小節へ
  // マーチ：スネアの16分を弱→強に盛り上げ、大太鼓とティンパニで締める
  march:{big:  {k:'........ggooxxXX', t3:'........ggooxxXX', s:'........XgoXgoXX'},   // 大太鼓をだんだん強く連打（クレッシェンド）
         small:{k:'..............xx', t3:'..............xx', s:'............XgXX'}},
  // シティポップ（citypop.mid）：4拍目のハイハットを止めて「タタッ」とスネア2発、最後の16分でキック＋クラッシュ
  // citypop.mid の4小節目をそのまま：12マス目のハイハット（78）→ スネア2発（96・96）→ 最後の16分でキック＋クラッシュ（96）
  cityend:{big:  {h:M16({8:78,9:46,10:25,11:24,12:78}), k:M16({10:87,15:96}), s:M16({13:96,14:96}), c:M16({15:96})},
           small:{h:M16({12:78}), s:M16({13:96,14:96}), k:M16({15:96}), c:M16({15:96})}},
  orch: {big:  {k:'........ggooxxXX', t3:'........ggooxxXX'},
         small:{k:'............ooxX', t3:'............ooxX'}},
  halfp:{big:  {k:'........x.x....X', s:'............x...', x:'....X...........', o:'..........o.....'},
         small:{s:'............X...', k:'...............x'}},
};
// v=1小節目, vB=2小節目（交互にくり返す）。bass: [step, 半音, 長さ, 強さ]。bassFill=フィルの小節のベース
const DRUMS = {
  pop:    {name:'ポップス（定番）', pro:'ポップス8ビート', v:{k:'x.....o.x.......', s:'....x.......x...', h:'o.g.o.g.o.g.o.g.'},
           vB:{k:'x.x...o.x...x...', s:'....x.......x...', h:'g.g.o.g.o.g.o...', o:'..............g.'}, fill:'tom',
           bass:[[0,0,3,1],[3,0,1,.55],[4,0,2,.8],[6,0,2,.7],[8,0,2,.9],[10,0,2,.7],[12,'5',2,.8],[14,'ap',2,.75]]},
  dpop:   {name:'ポップス（ノリノリ）', pro:'4つ打ち（キックを毎拍）', v:{k:'x...x...x...x...', s:'.g..X..g.g..X..o', h:'g.o.g.o.g.o.g.o.'},
           vB:{k:'x...x...x...o...', s:'.g..X..g.g..X..o', h:'g.o.g.o.g.o.....', o:'............g.g.'}, fill:'four',
           bass:[[0,0,2,1],[2,12,2,.7],[4,0,2,.85],[6,12,2,.7],[8,0,2,.9],[10,12,2,.7],[12,0,2,.85],[14,'ap',2,.75]]},
  // ↓ drum_.mid（EZX Vintage Rock）の2つ目のグルーヴ：スネアのゴーストが入ったロック
  eight:  {name:'ロック（8ビート）', pro:'ロック8ビート', v:{k:'x......gx.o.....', s:'.g..X..g....X..g', h:'o.o.o.o.o.o.o.o.'},
           vB:{k:'x......gx.o.....', s:'....X..g.o..X..g', h:'o.o.o.o.o.o.x.o.'}, fill:'rock',
           bass:[[0,0,1.8,1],[2,0,1.8,.75],[4,0,1.8,.85],[6,0,1.8,.75],[8,0,1.8,.95],[10,0,1.8,.75],[12,'5',1.8,.85],[14,'ap',1.8,.8]]},
  // ↓ drum_.mid の3つ目のグルーヴ：ライド＋足のハイハット
  rride:  {name:'ギターポップ', pro:'ロック（シンバルで刻む）', v:{k:'x.o.....x......o', s:'.g..X..g....X..g', r:'o.o.x.o.x.o.x.o.', h:'....g...g...g...'},
           vB:{k:'x......o..x.....', s:'.g..X..g.g..X..g', r:'o.o.x.o.o.o.x.o.', h:'g...g...g...g...'}, fill:'rock',
           bass:[[0,0,3,1],[3,0,1,.6],[4,0,2,.8],[6,'5',2,.7],[8,0,3,.9],[11,0,1,.6],[12,'5',2,.75],[14,'ap',2,.75]]},
  // ↓ drum_.mid のイントロ：サイドスティックと裏のハイハットだけ
  xstick: {name:'しっとり', pro:'8ビート（スネアのふちを軽く）', v:{k:'x.......x.....x.', x:'....x.......x...', h:'..x...x...x...x.'}, fill:'rock',
           bass:[[0,0,6,1],[6,'5',2,.7],[8,0,4,.85],[12,'5',2,.7],[14,'ap',2,.7]]},
  medium: {name:'ゆったり', pro:'ゆったりした8ビート', v:{k:'x.............o.', s:'....X.......X...', h:'o.g.x.g.o.g.x.g.'},
           vB:{k:'x.............o.', s:'....X.......X...', h:'o.g.x.g.o.g.x.g.'}, fill:'groove',
           bass:[[0,0,3,1],[4,0,2,.8],[6,'3',2,.7],[8,'5',3,.85],[12,0,2,.8],[14,'ap',2,.75]]},
  half:   {name:'どっしり', pro:'ゆっくりに聞こえる8ビート', v:{k:'x.....x...x.....', s:'........X.......', h:'o.g.o.g.o.g.o.g.'},
           vB:{k:'x.....x.......x.', s:'........X.....g.', h:'o.g.o.g.o.g.o.o.'}, fill:'halfp',   // スネアは3拍目だけ。ハイハットは8分のままで「半分の速さ」に聴こえる
           bass:[[0,0,6,1],[6,0,4,.8],[10,0,4,.75],[14,'ap',2,.7]]},
  // ピアノ（強さ 平均 60/127 くらい）に合わせて、ドラムとベースも控えめに
  ballad: {name:'バラード', v:{k:M16({0:50,8:24}), x:M16({4:44,12:44}), h:M16({0:26,2:20,4:24,6:20,8:26,10:20,12:24,14:20})}, vB:{k:M16({0:50,10:24}), x:M16({4:44,12:44}), h:M16({0:26,2:20,4:24,6:20,8:26,10:20,12:24,14:20})}, fill:'ballad',   // キックは1拍目にそっと（3拍目はごく弱く）、2・4拍目はリム、ハイハットは弱い8分
           bass:[[0,0,13.5,.6],[14,0,1.8,.42]]},   // ベースは白玉（全音符）で支える
  shuffle:{name:'スキップ風', pro:'はねるリズム（シャッフル）', v:{k:'x.....o.......g.', s:'.g..Xg.g.g..Xg.g', r:'o...o...o...o...', h:'..g...g...g...g.'}, swing:true, fill:'shuf',
           bass:[[0,0,2,1],[2,'3',2,.7],[4,'5',2,.85],[6,'6',2,.7],[8,12,2,.9],[10,'6',2,.7],[12,'5',2,.85],[14,'3',2,.7]]},
  sixteen:{name:'ファンキー', pro:'16ビート', v:{k:'X..x....X.X..x..', s:'....X..g.g..X..g', h:'o.g.o.g.o.g.o.g.'}, fill:'funk',
           bass:[[0,0,2,1],[3,12,1,.7],[6,0,1,.7],[7,0,1,.5],[8,0,2,.9],[10,12,1,.7],[11,'5',1,.6],[13,0,1,.7],[14,'ap',2,.8]]},
  dance:  {name:'ダンス', pro:'4つ打ち（ダンス）', duck:true, v:{k:'X...X...X...X...', s:'....X.......X...', h:'..o...o...o...o.'}, fill:'dance',
           bass:[[2,0,1.5,.9],[6,12,1.5,.8],[10,0,4.5,.9],[14,12,1.5,.8]]},   // 4つ目の裏はオクターブ上へすべり上がる（前の音と重ねる＝ポルタメント）
  bossa:  {name:'ボサノバ', pro:'ボサノバ（クラベスの「ポクポク」）', v:{k:M16({0:52,8:40}), s:M16({8:34}), cl:M16({4:74,10:70}), h:M16({0:30,2:24,4:28,6:24,8:30,10:24,12:28,14:24})}, vB:{k:M16({0:52,8:40}), s:M16({8:34}), cl:M16({0:74,6:70,12:72}), h:M16({0:30,2:24,4:28,6:24,8:30,10:24,12:28,14:24})}, fill:null,
           bass:[[0,0,6,1],[6,'5',2,.6],[8,'5',8,.9]]},   // ベースは前の形を半分のテンポで（1小節で1回）
  reggae: {name:'レゲエ', v:{k:'........X.......', x:'........X.......', h:'g.g.g.g.g.g.g.g.'}, fill:'soft',
           bass:[[0,0,3,1],[6,0,2,.8],[8,'5',2,.8],[10,'3',2,.75],[12,0,3,.9]]},
  // ゆったり跳ねるネオソウル風：16分を少し後ろに引きずる。キックはシンコペ、スネアは2・4拍目＋ゴースト
  neosoul:{name:'ジャジー', pro:'16分で軽くはねる（ジャジー）', swing16:true, v:{k:'x......x..x.....', s:'....X..g.g..X...', h:'x.o.x.o.x.o.x.oo', o:'..............g.'},
           vB:{k:'x......x..x..x..', s:'....X..g.g..X.g.', h:'x.o.x.o.x.o.x.o.'}, fill:'soul',
           bass:[[0,0,3,1],[3,0,1,.55],[6,'5',2,.75],[8,0,3.5,.9],[11,12,1,.6],[12,'5',1.5,.7],[14,'ap',2.5,.8]]},   // つなぎの音から次の小節の頭へ、ルートからオクターブ上へすべらせる（音を重ねる＝ポルタメント）
  // ハードロック：オープン気味のハイハットで8分を叩きつけ、2・4拍目に強いスネア。2小節目の頭にクラッシュ
  hard:   {name:'ロック', pro:'力強い8ビート（ハードロック）', v:{k:'X.....x.X.x.....', s:'....X.......X...', o:'x.o.x.o.x.o.x.o.'},
           vB:{k:'X.....x.X.x...x.', s:'....X.......X...', o:'..o.x.o.x.o.x.o.', c:'X...............'}, fill:'tom',
           bass:[[0,0,1.7,1],[2,0,1.7,.8],[4,0,1.7,.9],[6,0,1.7,.85],[8,0,1.7,1],[10,0,1.7,.8],[12,0,1.7,.9],[14,'ap',1.7,.85]]},
  // 疾走系（アニソン・J-ROCK）：速いテンポで、キックは1拍目と3拍目の前後、ハイハットは裏をオープンで抜いて前へ前へ
  run:    {name:'疾走系', pro:'速い8ビート（裏でハイハットを開く）', v:{k:'X.......X.x.....', s:'....X.......X...', h:'x...x...x...x...', o:'..o...o...o...o.'},
           vB:{k:'X.x.....X.x...x.', s:'....X.......X..g', h:'x...x...x...x...', o:'..o...o...o.....', c:'X...............'}, fill:'tom',
           bass:[[0,0,1.7,1],[2,12,1.7,.72],[4,0,1.7,.88],[6,12,1.7,.72],[8,0,1.7,.95],[10,12,1.7,.72],[12,0,1.7,.88],[14,'ap',1.7,.8]]},   // オクターブで走るベース
  // シティポップ：16分のハイハットにキックのシンコペ。ベースはオクターブで跳ねる（スラップ）
  // citypop.mid から：ハイハットは16分で「強・中・弱・弱」（1・3拍目が強い）、スネアは2・4拍目。
  // キックは頭を外して「1拍目の裏・3拍目の裏・4拍目の最後の16分（次の小節へ食う）」。4小節目の終わりはスネア2発＋クラッシュで次へ
  // citypop.mid のドラムをそのまま（強さもMIDIの数値のまま）。ハイハットは16分すべて、2・4拍目（スネアの所）だけ休み。
  // 強さは MIDI 110・46・25・24 / 78・46・25・24。dyn:2 はふつうの音源（GM）と同じく、強さの2乗で音量にする
  city:   {name:'シティポップ', pro:'16ビート（シティポップ）', dyn:2, crash0:false,
           v:{k:M16({2:101,10:92,15:95}), s:M16({4:106,12:105}), h:M16({0:93,1:46,2:25,3:24,5:46,6:25,7:24,8:78,9:46,10:25,11:24,13:46,14:25,15:24})},
           vB:{k:M16({2:97,10:92,15:93}), s:M16({4:105,12:103}), h:M16({0:110,1:46,2:25,3:24,5:46,6:25,7:24,8:78,9:46,10:25,11:24,13:46,14:25,15:24})}, fill:'cityend',
           bass:[[0,0,2,1],[2,12,1,.7],[3,0,1,.55],[6,0,1,.8],[7,12,1,.65],[8,0,2,.92],[10,12,1,.7],[11,'5',1,.6],[12,0,1,.75],[14,'ap',2,.8]]},
  // ローファイ：ゆるくハネたブーンバップ。キックはもたつかせ、スネアは2・4拍目
  lofi:   {name:'ローファイ', pro:'ゆるくはねるヒップホップ', swing16:true, v:{k:'x.....x...x.....', s:'....X.......X...', h:'o.go.go.o.go.go.'},
           vB:{k:'x.....x..x....x.', s:'....X.......X...', h:'o.go.go.o.go.o..'}, fill:'soft',
           bass:[[0,0,6,.9],[6,0,2,.55],[8,'5',4,.75],[12,0,2,.6],[14,'ap',2,.65]]},
  // 壮大：キックとフロアタムで「ドン・ドドン」、スネアは3拍目だけ。2小節目の終わりはタムを連打して盛り上げる
  // 壮大：オーケストラのマーチングドラム（オーケストラ・キット）。okesutora.mid（テンポ132として）の大太鼓・和太鼓をそのまま：
  // 1小節目は頭と4拍目の裏、2小節目は頭だけ。スネアはアクセントをはっきり、間はごく弱いゴースト（dyn で強弱の差を広げる）
  epic:   {name:'壮大', pro:'行進の太鼓（オーケストラ）', dyn:1.8,
           v:{s:'XggoXgogXgoXgoXg', k:'X.............x.', t3:'X.............x.'},
           vB:{s:'ggogXgoxXgoXgXXX', k:'X...............', t3:'X...............'}, fill:'march',
           bass:[[0,0,15.8,.95]]},   // チューバ・コントラバスのように全音符でのばす
  // 和風：和太鼓のように低いタムで「ドン・ドドン」、リムで鉦（かね）のような合いの手
  wa:     {name:'和風', pro:'和太鼓風（タム）', v:{k:'X.......X.......', t3:'X.....x.X...x.x.', x:'....x.......x...'},
           vB:{k:'X.......X.......', t3:'X.....x.X.x.x.xx', x:'....x.......x...'}, fill:'tom',
           bass:[[0,0,6,.9],[8,'5',6,.8],[14,'ap',2,.7]]},
  none:   {name:'なし', v:{}, fill:null, bass:[[0,0,7,1],[8,'5',6,.85],[14,'ap',2,.7]]},
};
// 通常は分かりやすい名前、PROでは音楽用語の名前
const patName=o=>state.pro&&o.pro?o.pro:o.name;
const DRUM_ORDER=['pop','dpop','run','eight','hard','rride','xstick','medium','half','ballad','epic','city','sixteen','neosoul','lofi','shuffle','dance','bossa','reggae','wa','none'];
function parseVoices(v){ const o={}; for(const k in v) o[VOICE[k]]=[...v[k]].map(velOf); return o; }
for(const k in DRUMS){ const d=DRUMS[k]; d.V=parseVoices(d.v); if(d.vB) d.VB=parseVoices(d.vB); if(d.fill){ d.F=parseVoices(FILLS[d.fill].big); d.FS=parseVoices(FILLS[d.fill].small); } }

// ---- コードパターン。音の番号: 0=左手ルート 1〜3=右手（低→高） 4=左手5度 5=左手オクターブ 6〜8=右手1オクターブ上
// 各イベント [step, 音の番号, 長さ(16分), 強さ, ストローク(d/u)]
const ALL=[0,1,2,3], RH=[1,2,3], WIDE=[0,4,5,6,7,8];
function each(steps,ns,len,vel){ return steps.map((st,i)=>[st,Array.isArray(ns[0])?ns[i%ns.length]:ns,len,typeof vel==='function'?vel(st,i):vel]); }
function twice(ev){ return [...ev, ...ev.map(e=>[e[0]+8,...e.slice(1)])]; }
const ARPS = {
  // 和音（左手のルート・5度・オクターブ＋その上に3和音）を8分で刻む。普段はブリッジミュートで短く、アクセントだけ伸ばす
  hardrock:{name:'ロック（刻み）', pro:'8分で刻む（弦をおさえて短く）', rhAbove:true, ev:[[0,[0,4,5,1,2,3],3.5,.95,'d'],[4,[0,4,5,1,2,3],.7,.5,'d'],[6,[0,4,5,1,2,3],1.8,.88,'d'],[8,[0,4,5,1,2,3],.7,.55,'d'],[10,[0,4,5,1,2,3],.7,.5,'d'],[12,[0,4,5,1,2,3],1.8,.88,'d'],[14,[0,4,5,1,2,3],1.8,.84,'d']]},
  // キー名 rhodes は保存データとの互換のため（中身はネオソウル風のピアノ）
  // ジャジー：1小節同じコードなら「ジャー・ジャー・ジャカ｜ン・チャ・ン・ッチャー」、3拍目から変わったら左手が拍の頭・右手が16分あと
  rhodes: {name:'ジャジー', pro:'おしゃれな和音を16分で（ジャジー）', legato:true,
           sit:{bar:[[[0,RH,4,.72],[0,[0],6,.7],[4,RH,2,.6],[6,[0],2,.55],[7,RH,1,.56],[8,[0],2,.62],[9,RH,1,.6],[10,[0],4,.58],[12,RH,4,.68],[14,[0],2,.55]]],
                halfA:[[[0,RH,4,.72],[0,[0],6,.7],[4,RH,2,.6],[6,[0],2,.55],[7,RH,1,.56]]],
                halfB:[[[0,[0],2,.66],[1,RH,1,.62],[2,[0],4,.6],[4,RH,4,.68],[6,[0],2,.55]]],
                beat:[[[0,[0],2,.66],[1,RH,1,.62],[2,[0],2,.58]]]}},
  house:  {name:'ズンチャ（ダンス）', pro:'裏拍で鳴らす（キックで音量が沈む）', legato:true, ev:[[0,ALL,2,.3],[2,RH,2,.85],[4,ALL,2,.3],[6,RH,2,.85],[8,ALL,2,.3],[10,RH,2,.85],[12,ALL,2,.3],[14,RH,2,.85]]},
  whole:  {name:'のばす（ジャーン）', pro:'1小節ずっとのばす', ev:[[0,ALL,16,.75]]},
  // pops.mid から：右手は4分で短めに、左手は1拍目と3拍目、その前の8分裏（2拍目裏・4拍目裏）でつなぐ
  // pops.mid から（長さはペダル）：1小節同じコードなら左手は 1拍目・2拍目裏・3拍目裏・4拍目裏、途中で変わるなら 3拍目でベースを弾き直す
  piano4: {name:'ピアノ（定番）', pro:'4分刻み（左手は裏でつなぐ）', legato:true, ev:[[0,[0],6,.7],[0,RH,4,.66],[4,RH,4,.6],[6,[0],4,.55],[8,RH,4,.64],[10,[0],4,.55],[12,RH,4,.6],[14,[0],2,.55]],
           sit:{bar:[[[0,[0],6,.7],[0,RH,4,.66],[4,RH,4,.6],[6,[0],4,.55],[8,RH,4,.64],[10,[0],4,.55],[12,RH,4,.6],[14,[0],2,.55]]],
                halfA:[[[0,[0],6,.7],[0,RH,4,.66],[4,RH,4,.6],[6,[0],2,.55]]], halfB:[[[0,[0],6,.7],[0,RH,4,.64],[4,RH,4,.6],[6,[0],2,.55]]], beat:[[[0,[0],4,.7],[0,RH,4,.64],[2,[0],2,.5]]]}},
  // norinori.mid から：コードは8分前に食って（pushBy）次の小節へのばし、そのあいだを8分の分散和音でつなぐ
  popanti:{name:'ピアノ（前のめり）', pro:'次のコードを8分早く弾く', legato:true, pushBy:2,
           // コードが変わる所は8分前に食って弾き、そのあとは8分の分散和音。同じコードが続く3拍目は弾き直さず、分散和音でつなぐ
           sit:{bar:[[[0,[0],8,.72],[0,RH,8,.7],[2,[1],6,.5],[4,[2],4,.52],[6,[3],2,.55],[8,[0],6,.6],[10,[2],4,.48],[12,[3],2,.5]]],
                halfA:[[[0,[0],8,.72],[0,RH,6,.7],[2,[1],4,.5],[4,[2],2,.52]]], halfB:[[[0,[0],6,.74],[0,RH,6,.72],[2,[1],4,.48],[4,[2],2,.5]]], beat:[[[0,[0],4,.72],[0,RH,4,.7],[2,[1],2,.5]]]},
           ev:[[0,[0],8,.72],[0,RH,8,.7],[2,[1],6,.5],[4,[2],4,.52],[6,[3],2,.55],[8,[0],6,.74],[8,RH,6,.72],[10,[1],4,.48],[12,[2],2,.5]]},   // 長さはペダル（8と14で踏みかえ）
  // ballade.mid から：左手はルートをのばし、右手は1拍目に和音、そのあと8分で下から1音ずつ重ねていく（ペダルでのばしたまま）
  // バラード：1拍目に和音、2拍目から下・中・上と重ね、3拍目でアクセント（いちばん上の音）を鳴らす
  // ピアノバラード（ballade.mid から）：左手はベースの音を1つのばす。右手は1拍目に和音をまとめて弾き、1拍裏から同じ音を下から8分で弾き直して小節の終わりまでのばす。
  // 4小節目だけ、右手の音を1オクターブ下（左手の音域）で上がっていく。
  // 飾り（次のコードへのつなぎ）は、いまの上の音 → 次のコードの上の音 の動きで出し分ける（MIDI の出方）。8分を基本にして、16分の2音は2小節に1回だけ：
  //  ・動きが小さい：4拍目の裏に「次の上の音」を8分で（2小節目は「次の上の音 → その1つ下」の16分2音）
  //  ・大きく下がる：4拍目の裏に「次の上の音の1つ上」を8分で（上から下りて次へ）
  //  ・同じ音：4拍目に「次の上の音の1つ上」を4分で
  //  ・小節の途中でコードが変わる前（前半2拍・3拍・1拍）と、次のコードを食うときは入れない。飾りの音は今のコードの音階から選ぶ
  pballad:{name:'ピアノバラード', pro:'バラード（和音＋8分の分散、4小節目で変化）', legato:true, lhFull:true, rhMid:-1,
           // 同じ行の音は重ねない（PRO の編集画面でも同じ形に書けるように）。飾りは条件ごとに別の行に置く（鳴るのはどれか1つ）
           sit:{bar:[[[0,[0],16,.5],[0,[1],2,.5],[0,[2],4,.45],[0,[3],6,.43],[0,[9],8,.52],[2,[1],14,.48],[4,[2],10,.47],[6,[3],8,.47],[8,[9],8,.5],[14,[3],2,.54,null,'nt',null,null,null,null,'step'],[14,[2],2,.48,null,'ntu',null,null,null,null,'down'],[12,[5],4,.4,null,'ntu',null,null,null,null,'same']],
                      [[0,[0],16,.5],[0,[1],2,.5],[0,[2],4,.45],[0,[3],6,.43],[0,[9],8,.52],[2,[1],14,.48],[4,[2],10,.47],[6,[3],8,.47],[8,[9],8,.5],[14,[3],1,.54,null,'nt',null,null,null,null,'step'],[15,[3],1,.5,null,'ntd',null,null,null,null,'step'],[14,[2],2,.48,null,'ntu',null,null,null,null,'down'],[12,[5],4,.4,null,'ntu',null,null,null,null,'same']],
                      [[0,[0],16,.5],[0,[1],2,.5],[0,[2],4,.45],[0,[3],6,.43],[0,[9],8,.52],[2,[1],14,.48],[4,[2],10,.47],[6,[3],8,.47],[8,[9],8,.5],[14,[3],2,.54,null,'nt',null,null,null,null,'step'],[14,[2],2,.48,null,'ntu',null,null,null,null,'down'],[12,[5],4,.4,null,'ntu',null,null,null,null,'same']],
                      // 4小節目：左手は1オクターブ下のベース。右手の和音のあと、同じ音を1オクターブ下（左手の音域）で8分で上がり、上で 右手 中・アクセント、最後に飾り（8分）
                      [[0,[0],16,.25,null,null,null,null,null,-12],[0,[1],2,.43],[0,[2],4,.48],[0,[9],8,.57],[2,[1],14,.39,null,null,null,null,null,-12],[4,[2],6,.42,null,null,null,null,null,-12],[6,[3],8,.51,null,null,null,null,null,-12],[8,[9],8,.54,null,null,null,null,null,-12],[10,[2],6,.39],[12,[6],4,.39],[14,[3],2,.42,null,'nt',null,null,null,null,'step'],[14,[4],2,.42,null,'ntu',null,null,null,null,'down'],[14,[5],2,.42,null,'ntu',null,null,null,null,'same']]],
                bar3:[[[0,[0],12,.5],[0,[1],2,.5],[0,[2],4,.45],[0,[3],6,.43],[0,[9],8,.52],[2,[1],10,.48],[4,[2],8,.47],[6,[3],6,.47],[8,[9],4,.5]]],
                halfA:[[[0,[0],8,.51],[0,[1],2,.54],[0,[2],4,.42],[0,[3],6,.43],[0,[9],8,.41],[2,[1],6,.45],[4,[2],4,.3],[6,[3],2,.46]]],
                // 後半2拍のコード：上の音を弾き直してから8分の飾り（上の音が次も同じなら、弾き直さずに4分の飾りだけ）
                halfB:[[[0,[0],6,.34],[0,[1],8,.47],[0,[2],6,.45],[0,[3],4,.51],[0,[9],8,.45],[4,[3],2,.53,null,null,null,null,null,null,'move'],[6,[3],2,.5,null,'nt',null,null,null,null,'step'],[6,[2],2,.48,null,'ntu',null,null,null,null,'down'],[4,[5],4,.4,null,'ntu',null,null,null,null,'same']]],
                beat:[[[0,[0],4,.37],[0,[1],4,.45],[0,[2],4,.46],[0,[3],4,.53],[0,[9],4,.5]]]}},
  sync:   {name:'リズミカル', pro:'リズムをずらす（付点8分）', ev:[[0,ALL,3,.8],[3,RH,.7,.72],[6,ALL,2,.78],[10,RH,2,.72],[14,ALL,2,.86]]},
  shuffle:{name:'スキップ風（ピアノ）', pro:'はねるリズム（ピアノ）', swing:true, ev:[[0,ALL,1.5,.8],[2,RH,1,.52],[4,[0],1.5,.68],[6,RH,1,.6],[8,ALL,1.5,.76],[10,RH,1,.52],[12,[0],1.5,.68],[14,RH,1,.62]]},
  stacc:  {name:'ポンポン短く', pro:'4分で短く切る', ev:each([0,4,8,12],ALL,1.1,(s,i)=>i%2?.7:.8)},
  offbeat:{name:'チャッチャッ（裏打ち）', pro:'裏拍でチャッと刻む', ev:each([2,6,10,14],RH,.8,.68)},
  garp:   {name:'ギター（つま弾き）', pro:'ギターの分散和音（つま弾き）', ev:twice([[0,[0],8,.72],[2,[1],3,.45],[3,[3],5,.6],[5,[1],3,.48],[6,[2],2,.56]])},
  // 低音弦は次のダウンまで鳴らし続け、アップは高音弦だけを重ねる
  strum:  {name:'ギター（ジャカジャカ）', pro:'ギターのストローク（ジャカジャカ）', legato:true,
           // 「ジャン・ジャジャ・ッジャ・ジャジャ」（ダウン・ダウンアップ・アップダウンアップ）。低音弦は次のダウンまで鳴らし、アップは高音弦だけ
           sit:{bar:[[[0,[0,4,5,1,2,3],4.5,.8,'d'],[4,[0,4,5,1,2,3],8.5,.8,'d'],[6,[3,2,1],4,.78,'u'],[10,[3,2,1],2.5,.6,'u'],[12,[0,4,5,1,2,3],4.5,.8,'d'],[14,[3,2,1],2.5,.78,'u']]],
                halfA:[[[0,[0,4,5,1,2,3],4.5,.8,'d'],[4,[0,4,5,1,2,3],4,.78,'d'],[6,[3,2,1],2,.74,'u']]],
                halfB:[[[0,[0,4,5,1,2,3],4.5,.8,'d'],[4,[0,4,5,1,2,3],4,.76,'d'],[6,[3,2,1],2,.74,'u']]],
                beat:[[[0,[0,4,5,1,2,3],2,.78,'d'],[2,[3,2,1],2,.7,'u']]]}},

  // ボサノバの指弾き（2小節）：親指＝5弦のルート、人差し指＝4弦（3度）、中・薬指＝3弦と2弦（7度と9度）。Dm7(9) なら D3・F3・C4・E4
  // 1小節目「ラー・メン・パ・ニー・ニ」、2小節目「パ・ニー・ニ・ラー・メン」
  bossa:  {name:'ボサノバ', pro:'ボサノバのギター（2小節）', pluck:true, legato:true, bossaV:true, pushBy:2, push2nd:true, pushKeepLH:true,
           // 行：左手根音＝親指のルート、左手5度＝親指の5度、左手8度＝4弦、右手下＝3弦、右手中＝2弦、右手上＝1弦（指で弾く3音は4・3・2弦）
           // 1小節目：1拍目・2拍目・3拍目裏、4拍目裏で2小節目のコードを先取り（タイでのばす）。2小節目：1拍目裏・2拍目裏（3拍目までのばす）・4拍目。親指は毎小節 1拍目ルート・3拍目5度
           sit:{bar:[[[0,[0],8,.5],[0,[5,1,2],4,.42],[4,[5,1,2],4,.44],[8,[4],8,.46],[10,[5,1,2],2,.44]],
                      [[0,[0],8,.5],[2,[5,1,2],2,.44],[6,[5,1,2],6,.46],[8,[4],8,.46],[12,[5,1,2],4,.44]]],
                halfA:[[[0,[0],8,.5],[0,[5,1,2],4,.42],[4,[5,1,2],4,.44]]], halfB:[[[0,[4],8,.46],[2,[5,1,2],2,.44],[6,[5,1,2],2,.44]]],
                beat:[[[0,[0],4,.5],[0,[5,1,2],4,.42]]],
                push:[[[0,[5,1,2],6,.46]]]}},
  // 疾走系：右手は8分で刻み、左手はオクターブで1拍ずつ。いちばん上（アクセント）は「キラッ」と重ねる音色で
  drive:  {name:'疾走ピアノ', pro:'8分で刻む＋左手オクターブ（次のコードを早めに）', legato:true, pushBy:2,
           // 右手は8分で和音を刻み、左手はオクターブで4分。次のコードへは8分食う
           sit:{bar:[[[0,[0,5],3.5,.8],[0,RH,1.6,.8],[2,RH,1.6,.5],[4,[0,5],3.5,.68],[4,RH,1.6,.66],[6,RH,1.6,.56],[8,[0,5],3.5,.76],[8,RH,1.6,.74],[10,RH,1.6,.5],[12,[0,5],3.5,.68],[12,RH,1.6,.66],[14,RH,1.6,.58]]],
                halfA:[[[0,[0,5],3.5,.8],[0,RH,1.6,.8],[2,RH,1.6,.5],[4,[0,5],3.5,.68],[4,RH,1.6,.66],[6,RH,1.6,.56]]],
                halfB:[[[0,[0,5],3.5,.78],[0,RH,1.6,.76],[2,RH,1.6,.5],[4,[0,5],3.5,.68],[4,RH,1.6,.66],[6,RH,1.6,.56]]],
                beat:[[[0,[0,5],3.5,.78],[0,RH,1.6,.76],[2,RH,1.6,.52]]],
                push:[[[0,[0,5],2,.8],[0,RH,2,.8]]]}},

  // シティポップ：エレピで16分のカッティング。アクセント（重ねる音色＝ブラス）は4拍目の裏で「パッ」と次へ
  citypop:{name:'シティポップ', pro:'エレピを16分で刻む（次のコードを早めに）', legato:true, pushBy:2,
           // エレピは「チャッ・ッチャ・チャー」と16分のシンコペで刻む
           sit:{bar:[[[0,[0],3,.62],[0,RH,2,.72],[3,RH,1,.55],[6,RH,2,.66],[8,[0],3,.56],[10,RH,1,.55],[11,RH,2,.66],[14,RH,1.5,.6]]],
                halfA:[[[0,[0],3,.62],[0,RH,2,.72],[3,RH,1,.55],[6,RH,2,.64]]],
                halfB:[[[0,[0],3,.6],[0,RH,2,.7],[3,RH,1,.55],[6,RH,2,.62]]],
                beat:[[[0,[0],3,.6],[0,RH,2,.7]]],
                push:[[[0,RH,2,.72],[0,[0],2,.6]]]}},

  // citypop.mid の電子ピアノから：コードは16分食って入り、左手は「ルート・5度・5度」と動いて、右手は8分・16分で和音を刻む。
  // 2拍目の裏はいちばん上の音を一段下げて（G♯→F♯ のような動き）、すぐ下の音を「ッ」と短く強く。
  // 2小節目（同じコードの続き）は、上で「タ・タ・ター・タ・ター・ター・タ」と高い音のフレーズを足す
  cityep: {name:'シティポップのエレピ', pro:'エレピの刻み＋上のフレーズ（シティポップ）', legato:true, pushBy:1, shell:true,
           sit:{bar:[[[0,[0],1.6,.73],[0,RH,2.3,.7],[1,[4],1,.67],[2,RH,.85,.55],[3,[4],1.3,.7],[4,RH,.6,.64],[6,[0],.35,.71],[6,[1,2],.55,.6],[6,[3],.7,.62,null,'dn'],[7,[1],.12,.86],
                       [8,[0],.5,.72],[8,RH,.65,.7],[12,[0],1.34,.71],[13,RH,.75,.65]],
                      [[0,[0],1.6,.73],[0,RH,2.3,.7],[1,[4],1,.67],[2,RH,.85,.55],[3,[4],1.3,.7],[4,RH,.6,.64],[6,[0],.35,.71],[6,[1,2],.55,.6],[6,[3],.7,.62,null,'dn'],[7,[1],.12,.86],
                       [8,[0],.5,.72],[8,RH,.65,.7],[12,[0],1.34,.71],[13,RH,.75,.65],
                       [1,['d5'],.95,.74],[2,['d6'],.38,.6],[4,['d8'],.37,.76],[6,['d6'],.36,.66],[8,['d8'],1.15,.72],[9,['d9'],.86,.67],[11,['d8'],.34,.74]]],   // フレーズはコードより少し大きく
                halfA:[[[0,[0],1.6,.73],[0,RH,2.3,.7],[1,[4],1,.67],[2,RH,.85,.55],[3,[4],1.3,.7],[4,RH,.6,.64],[6,[0],.35,.71],[6,[1,2],.55,.6],[6,[3],.7,.62,null,'dn'],[7,[1],.12,.86]]],
                halfB:[[[0,[0],1.6,.73],[0,RH,2.3,.7],[1,[4],1,.67],[2,RH,.85,.55],[3,[4],1.3,.7],[4,RH,.6,.64],[6,[0],.35,.71],[6,[1,2],.55,.6],[6,[3],.7,.62,null,'dn'],[7,[1],.12,.86]]],
                beat:[[[0,[0],1.6,.73],[0,RH,2.3,.7],[2,RH,.85,.55],[3,[4],1,.68]]],
                push:[[[0,[0],1.6,.73],[0,RH,2.3,.7]]]}},
  // クラビネットの刻み（山下達郎風のシティポップ）：16分を止めずに、和音の「チャッ」とミュートした「ッ」（弦を押さえて止めた短い音）を混ぜる。
  // 2拍目裏・4拍目（の裏）にアクセント、次のコードへは8分食う
  clavfunk:{name:'クラビネットの刻み', pro:'16分で刻む（短い音まじり）', legato:false, pushBy:2,
           sit:{bar:[[[0,RH,.5,.74],[1,[1],.22,.3],[2,RH,.5,.56],[3,RH,.45,.66],[4,[1],.22,.3],[5,RH,.45,.52],[6,RH,1,.78],[7,[1],.22,.32],
                       [8,RH,.5,.7],[9,[1],.22,.3],[10,RH,.5,.56],[11,RH,.45,.68],[12,[1],.22,.3],[13,RH,.45,.52],[14,RH,1,.78],[15,[1],.22,.32]]],
                halfA:[[[0,RH,.5,.74],[1,[1],.22,.3],[2,RH,.5,.56],[3,RH,.45,.66],[4,[1],.22,.3],[5,RH,.45,.52],[6,RH,1,.78],[7,[1],.22,.32]]],
                halfB:[[[0,RH,.5,.72],[1,[1],.22,.3],[2,RH,.5,.56],[3,RH,.45,.66],[4,[1],.22,.3],[5,RH,.45,.52],[6,RH,1,.78],[7,[1],.22,.32]]],
                beat:[[[0,RH,.5,.72],[1,[1],.22,.3],[2,RH,.5,.56],[3,RH,.45,.64]]],
                push:[[[0,RH,1,.8],[1,[1],.22,.32]]]}},
  // ローファイ：コードを少し遅らせて、長めにのばす（ゆるい・眠たい感じ）
  lofi:   {name:'ローファイ', pro:'少し遅れてゆるく弾く和音', legato:true,
           // 1拍目に和音を置いて、2拍目の裏でそっと弾き直してのばす。左手は1拍目と3拍目だけ
           sit:{bar:[[[0,[0],7,.58],[0,RH,6,.56],[6,RH,10,.46],[8,[0],8,.5]]],
                halfA:[[[0,[0],8,.58],[0,RH,6,.56],[6,RH,2,.44]]],
                halfB:[[[0,[0],8,.54],[0,RH,6,.52],[6,RH,2,.42]]],
                beat:[[[0,ALL,4,.55]]]}},

  // 壮大：ストリングスの白玉に、ホルン（重ねる音色）が上で2分音符のメロディ
  // ストリングス：和声法どおりの4声（開離配置）＋コントラバス（バスのオクターブ下）。声部は前の和音からなめらかにつなぐ（satb）
  // 行の意味：左手根音＝バス（チェロ）、左手5度＝コントラバス、右手 下・中・上＝テノール（ヴィオラ）・アルト（第2ヴァイオリン）・ソプラノ（第1ヴァイオリン）
  epic:   {name:'オーケストラ風の和音', pro:'弦楽器の合奏（なめらかにつなぐ）', legato:true, satb:true,
           sit:{bar:[[[0,[4,0],16,.66],[0,[1,2,3],8,.6],[8,[1,2,3],8,.62,null,'up']]],   // 3拍目で上3声がそれぞれ1つ上の和音の音へ
                halfA:[[[0,[4,0],8,.66],[0,[1,2,3],8,.6]]],
                halfB:[[[0,[4,0],8,.64],[0,[1,2,3],8,.58]]],
                beat:[[[0,[4,0],4,.64],[0,[1,2,3],4,.58]]]}},

  // 和風：琴のように、下から上へ・上から下へ流れる分散和音
  koto:   {name:'琴（分散和音）', pro:'琴の分散和音', legato:true,
           // 琴：低い音を鳴らしてから、上へ「ツン・テン・トン」と駆け上がり、下りてくる。2本を同時にはじく所も入れる
           sit:{bar:[[[0,[0],8,.62],[0,[1,3],2,.62],[3,[2],1,.48],[4,[3],2,.58],[6,[6],2,.66],[8,[0],8,.5],[8,[3],2,.56],[10,[2],2,.5],[12,[1],2,.54],[14,[2],2,.46]]],
                halfA:[[[0,[0],8,.62],[0,[1,3],2,.62],[3,[2],1,.48],[4,[3],2,.58],[6,[6],2,.64]]],
                halfB:[[[0,[0],8,.58],[0,[1,3],2,.6],[3,[2],1,.48],[4,[3],2,.56],[6,[6],2,.62]]],
                beat:[[[0,[0],4,.6],[0,[1,3],2,.6],[2,[2],2,.5]]]}},

  // ===== 上もの（ほかのパターンの上に「コード2」で重ねるフレーズ）。どの音色・どのパターンとも組み合わせられる =====
  // キラキラ：「タン・タ・ターン」と、和音の音を高い所で短く（グロッケン・ベル向き）
  // アニソン：シンセの16分アルペジオ（上の3音を「下・中・上・中」で回す）。2小節目の最後の拍で次のコードへ駆け上がる
  // アニソンの上もの：シンセのリードで、シンコペーションのある2小節のフレーズ。2小節目は最後に次のコードへ駆け上がる
  anilead:{name:'重ねる楽器：シンセのリード', pro:'重ねる楽器：シンセのメロディ（2小節）', legato:true,
           sit:{bar:[[[0,[8],3,.62],[3,[7],3,.56],[6,[8],2,.6,null,'su'],[8,[8],4,.62],[12,[7],2,.56],[14,[6],2,.54]],
                      [[0,[7],3,.6],[3,[8],3,.62],[6,[8],2,.64,null,'su'],[8,[8],3,.62],[11,[7],1,.5,null,'nx'],[12,[7],1,.52,null,'nx'],[13,[7],1,.54,null,'nx'],[14,[7],2,.58,null,'nx']]],
                halfA:[[[0,[8],3,.62],[3,[7],3,.56],[6,[8],2,.6,null,'su']]], halfB:[[[0,[8],4,.62],[4,[7],2,.56],[6,[6],2,.54]]], beat:[[[0,[8],4,.6]]]}},
  glockline:{name:'重ねる楽器：高い音でキラキラ', pro:'重ねる楽器：高い音の短いフレーズ（2小節）', legato:true,
           sit:{bar:[[[0,[6],6,.5],[6,[7],2,.44],[8,[8],8,.48]],[[0,[6],6,.5],[6,[7],2,.44],[8,[8],4,.48],[12,[8],1,.44,null,'nx'],[13,[8],1,.46,null,'nx'],[14,[8],2,.5,null,'nx']]],
                halfA:[[[0,[6],6,.5],[6,[7],2,.44]]], halfB:[[[0,[8],8,.48]]], beat:[[[0,[6],4,.46]]]}},
  // brass2.mid から（2小節ひとまとまり）。16分食い。頭の「プァー↘」（長さ3.4マス＋フォール）は前の合いの手のまま
  // 1小節目：頭で上3音「パッ」→ 真ん中の音からペンタで1つ上へ「タ・タ」→ 上2音を16分で刻み、3つ目だけペンタで1つ下（ぶつかれば和音の音）
  // 2小節目：食って入った和音を2マス目で「パッ」と弾き直し、低い所でキーの「5 6 1 1 6 6 1 1 6」（メロディ行を1オクターブ下げて）
  brassobb:{name:'重ねる楽器：パッと合いの手', pro:'重ねる楽器：ブラスの合いの手（2小節）', legato:true, pushBy:1, melOct:-12, avoid:false, noRoot:true, rhShift:13, vol:.72, even:true,
           sit:{bar:[[[0,[1,2,3],3.4,.78,null,'fall'],[6,[2],1,.64,null,'p0'],[7,[2],1,.66,null,'pu'],
                       [8,[2,3],.5,.74],[9,[2,3],.5,.66],[10,[2,3],.5,.68,null,'pd'],[11,[2,3],.5,.72]],
                      [[2,[1,2,3],.6,.76],[10,['d6'],1,.64,null,'nx'],[12,['d8'],1,.68,null,'nx'],[13,['d9'],1,.72,null,'nx']]],   // エレピのフレーズとかけ合い：次のコードの音へペンタで3音つないで、次の小節の食い（プァー↘）へ   // エレピのフレーズ（5 6 1…）とかぶらないよう、その間は休み、終わりに「6 1 2 3」と16分で駆け上がって次の小節の食い（プァー↘）へつなぐ
                // 3拍（4拍目でコードが変わる）：刻みを途中で切らないよう、短い刻み2つで止めて、4拍目の食いへ
                bar3:[[[0,[1,2,3],3.4,.78,null,'fall'],[4,[1],.25,.66,null,'pd'],[5,[1],.25,.64],[6,[2,3],1,.72],[7,[2,3],1,.68,null,'su'],[8,[2,3],1,.72]],   // 刻み：ペンタで1つ下・そのまま・そのまま・1つ上の音階・そのまま
                      [[2,[1,2,3],.6,.76],[6,['d6'],1,.64,null,'nx'],[8,['d8'],1,.68,null,'nx'],[9,['d9'],1,.72,null,'nx']]],
                halfA:[[[0,[1,2,3],2,.78],[2,[1,2,3],.6,.74]]],   // 前半2拍：「チャー・チャッ」（食って入ったときは頭を弾き直さず、1拍目の裏の「チャッ」から）
                halfB:[[[0,[1,2,3],2,.76],[2,['d6'],1,.64,null,'nx'],[4,['d8'],1,.68,null,'nx'],[5,['d9'],1,.72,null,'nx']]],   // 3拍目から：8分で「チャッ」、そのあと次のコードへペンタで3音つなぐ
                beat:[[[0,[1,2,3],2,.74]]],
                push:[[[0,[1,2,3],3,.82,null,'fall']],[[0,[1,2,3],2,.8]]]}},   // 1小節目へ食う時は「チャーッ↘」（フォール）、2小節目へ食う時は「チャッ」と短く切って2拍目裏の「チャッ」へ

  // メロディ：高い所で「タン・タン・タ」（3+3+2）と上がっていく（ホルン・ストリングス向き）
  // ファンキー：ブラスのキメ（2小節）。2拍目裏で「パッ（しゃくり）」、3拍目裏で「パパッ」。2小節目は「プァー↘」のあと次のコードへペンタで3音
  brasshit:{name:'重ねる楽器：ブラスのキメ', pro:'重ねる楽器：ブラスのキメ（2小節）', legato:true, pushBy:1, noRoot:true, avoid:false, rhShift:13, vol:.7,
           sit:{bar:[[[6,[1,2,3],.5,.8,null,'scoop'],[10,[1,2,3],.4,.72],[11,[1,2,3],.4,.78]],
                      [[3,[1,2,3],.4,.74],[6,[1,2,3],1.6,.82,null,'fall'],[11,[2],1,.6,null,'nx'],[12,[2],1,.64,null,'nx'],[13,[2],1,.68,null,'nx']]],
                halfA:[[[6,[1,2,3],.5,.8,null,'scoop']]], halfB:[[[2,[1,2,3],.4,.72],[3,[1,2,3],.4,.78]]], beat:[[[0,[1,2,3],.5,.74]]],
                push:[[[0,[1,2,3],.6,.82]]]}},
  // レゲエ：オルガンの「バブル」。裏拍で右手を短く刻み、その間を左手（ルート・5度）が16分で跳ねる
  skank:   {name:'レゲエのオルガン', pro:'レゲエのオルガン（裏拍で刻む）', legato:false,
           ev:[[1,[0],.35,.36],[2,RH,.55,.72],[3,[4],.35,.34],[5,[0],.35,.36],[6,RH,.55,.68],[7,[4],.35,.34],
               [9,[0],.35,.36],[10,RH,.55,.72],[11,[4],.35,.34],[13,[0],.35,.36],[14,RH,.55,.68],[15,[4],.35,.34]]},
  hornline:{name:'重ねる楽器：上がっていくメロディ', pro:'重ねる楽器：上がっていくメロディ（2小節）', legato:true, tie:true, rhShift:-9, vol:1.7,
           // ホルンらしい中音域（いちばん上でも F4 くらい）：右手の 下→中→上 と上がり、2小節目は上→中のあと次のコードへつなぐ
           sit:{bar:[[[0,[1],6,.58],[6,[2],6,.56],[12,[3],4,.6]],[[0,[3],6,.58],[6,[2],4,.56],[10,[2],2,.54,null,'nx'],[12,[2],2,.56,null,'nx'],[14,[2],2,.58,null,'nx']]],
                halfA:[[[0,[1],6,.58],[6,[2],2,.54]]], halfB:[[[0,[2],4,.56],[4,[3],4,.58]]], beat:[[[0,[1],4,.56]]]}},
  // クラシック風：左手はルートを2分音符で支え、右手は「下・上・中・上」の分散和音。テンションのあるコードでも3度と7度・9度を残す（ra）
  alberti:{name:'クラシック風', pro:'クラシック風の分散和音（ドソミソ）', ev:[[0,[0],8,.55],[8,[0],8,.5],...each([0,2,4,6,8,10,12,14],[[1],[3],[2],[3]],2,(s,i)=>i%4===0?.62:.46)]},
};
