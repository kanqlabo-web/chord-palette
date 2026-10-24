// ---- PRO：マイ演奏（ドラムとコードを自分で打ち込む）
const DRUM_ROWS=[['c','クラッシュ'],['r','ライド'],['o','オープンHH'],['h','ハイハット'],['f','フットHH'],['t1','タム高'],['t2','タム中'],['t3','フロア'],['s','スネア'],['x','リム'],['cl','クラベス'],['k','キック']];
const BASS_ROWS=[['12','オクターブ上'],['7','7度'],['6','6度'],['5','5度'],['3','3度'],['ap','つなぎ'],['0','ルート'],['-5','5度下'],['-12','オクターブ下']];
const SK=kind=>kind==='bass'?'bassPat':kind;
// PRO で足したコード楽器（state.xtr の1つ）は、kind を 'x:ID' と書く。パターン・音色・音域はその楽器が持つ
const xOf=kind=>typeof kind==='string'&&kind.startsWith('x:')?(state.xtr||[]).find(t=>t.id===kind.slice(2))||null:null;
// 足したトラックの種類（なし＝コード楽器、'drum'・'bass'）
const xType=kind=>{ const x=xOf(kind); return x?(x.type||'chord'):null; };
const isDrumK=k=>k==='drum'||xType(k)==='drum', isBassK=k=>k==='bass'||xType(k)==='bass';
const XPK={drum:'drum',bass:'bassPat'};
const patOf=kind=>{ const x=xOf(kind); return x?x[XPK[x.type]||'arp']:state[SK(kind)]; };
const setPatOf=(kind,v)=>{ const x=xOf(kind); if(x) x[XPK[x.type]||'arp']=v; else state[SK(kind)]=v; };
const partOf=kind=>kind==='arp2'?1:xOf(kind)?2+state.xtr.indexOf(xOf(kind)):0;   // arp2 は「楽器2」のコードパターン（マイ演奏はコードと共通）   // そのパターンが入っている設定の名前
// メロディ行（d1〜d8）：コードに関係なく、キーの音階の音で弾く（1＝主音、8＝1オクターブ上の主音）。主音は E4〜E♭5 の間に置く
const MEL_ROWS=[['d10','メロ 3↑'],['d9','メロ 2↑'],['d8','メロ 1↑'],['d7','メロ 7'],['d6','メロ 6'],['d5','メロ 5'],['d4','メロ 4'],['d3','メロ 3'],['d2','メロ 2'],['d1','メロ 1']];
const isDeg=ix=>typeof ix==='string'&&ix[0]==='d';
// パターンのメロディ行で使う音（キーからの音名）。和音の音がこれと半音でぶつかるときは避ける
function melPcs(pat){ const out=new Set(), k=keyObj().pc; const scan=evs=>(evs||[]).forEach(e=>e[1].forEach(ix=>{ if(isDeg(ix)) out.add(degPitch(ix)%12); }));
  scan(pat.ev); if(pat.sit) for(const kk in pat.sit) pat.sit[kk].forEach(v=>scan(v.evs)); return [...out]; }
// パターンのメロディ行でいちばん低い度数（なければ null）。和音はこの音を超えない高さに置く
function melLow(pat){ if(!pat) return null; if(pat._ml!==undefined) return pat._ml; let lo=null;
  const scan=evs=>(evs||[]).forEach(e=>e[1].forEach(ix=>{ if(isDeg(ix)){ const n=+ix.slice(1); if(lo==null||n<lo) lo=n; } }));
  scan(pat.ev); if(pat.sit) for(const k in pat.sit) pat.sit[k].forEach(v=>scan(v.evs)); return pat._ml=lo; }
// モーダルインターチェンジ（♭VII・♭VI・iv など、同主短調から借りたコード）の上では、フレーズの音階もその調（同主短調）に合わせる
const SC_MAJ=[0,2,4,5,7,9,11], SC_MIN=[0,2,3,5,7,8,10]; let SC_BORROW=false;
const scaleNow=()=>SC_BORROW?SC_MIN:SC_MAJ, pentaNow=()=>SC_BORROW?[0,3,5,7,10]:[0,2,4,7,9];
function setScaleFor(pcs){ const k=keyObj().pc, rel=pcs.map(p=>(((p-k)%12)+12)%12); SC_BORROW = !rel.every(x=>SC_MAJ.includes(x)) && rel.every(x=>SC_MIN.includes(x)); }
// 借りてきたコードの上では、メロディを丸ごと同主短調（の平行長調＝短3度上の長調。F なら A♭）へ移調して、同じ形のまま弾く
const degPitch=ix=>{ const k=(keyObj().pc+(SC_BORROW?3:0))%12, w=64+ROFF().rh, base=w+(((k-w)%12)+12)%12, n=+ix.slice(1); return base+SC_MAJ[(n-1)%7]+(n>7?12:0); };
// 1つ下の音階の音（刺繍音）：キーの長音階で、すぐ下の音
const scaleDown=m=>{ const k=keyObj().pc, S=scaleNow(); let x=m-1; while(!S.includes((((x-k)%12)+12)%12)) x--; return x; };
// 今のコードの音階（ピッチクラスの集合）。飾りは今のコードの上で鳴るので、この音階の音だけを使う
//  ・キーの音階に収まるコード → キーの音階。同主短調に収まるコード（借りてきたコード）→ 同主短調
//  ・キーの外の長三和音・属7（E7 など）→ 解決先（4度上）への部分転調として、その調の音階（次が短調のコードなら和声的短音階）
//    例：C のキーで E7→Am なら A の和声的短音階（A B C D E F G♯）。G は使わない
//  ・減三和音・減7 → 半音上の和声的短音階。m7(♭5) → 全音下の自然短音階。そのほかの短三和音 → その音の自然短音階
//  ・どれにも収まらなければ、キーの音階のうちコードの音と半音でぶつかる音を、コードの音に置きかえたもの
const SC_HMIN=[0,2,3,5,7,8,11];
function chordScaleOf(bt){ if(!bt||bt.rpc==null||!bt.ivs) return null; if(bt._sc) return bt._sc;
  const K=keyObj().pc, r=bt.rpc, pcs=[...new Set([...bt.ivs.map(i=>(r+i)%12), ...(bt.bpc!=null?[bt.bpc]:[])])], mk=(root,deg)=>new Set(deg.map(d=>(root+d)%12)), all=S=>pcs.every(pc=>S.has(pc)), iv=bt.ivs;
  const cands=[mk(K,SC_MAJ), mk(K,SC_MIN)], has=i=>iv.includes(i);
  if(has(4)&&has(7)){ const t=(r+5)%12; let minor=false; try{ if(NX_V!=null){ const sp=specOf(NX_V); minor=(K+sp.o)%12===t && (sp.q==='m'||sp.q==='m-5'); } }catch(e){} cands.push(mk(t,minor?SC_HMIN:SC_MAJ), mk(t,SC_HMIN)); }
  else if(has(3)&&has(6)&&(has(9)||!has(10))) cands.push(mk((r+1)%12,SC_HMIN));
  else if(has(3)&&has(6)) cands.push(mk((r+10)%12,SC_MIN));
  else if(has(3)) cands.push(mk(r,SC_MIN), mk(r,[0,2,3,5,7,9,10]));
  let S=cands.find(all);
  if(!S){ S=mk(K,SC_MAJ); pcs.forEach(pc=>{ if(S.has(pc)) return; [1,11].forEach(d=>{ const q=(pc+d)%12; if(S.has(q)&&!pcs.includes(q)) S.delete(q); }); S.add(pc); }); }
  return bt._sc=S; }
// メロディの音を今のコードの音階に合わせる（キーの中のコードではそのまま。E7→Am の上なら G を G♯ にするなど）
//  音階にない音は半音となりの音階の音へ。両方あれば、コードの音の方（どちらもコードの音でなければ下）
function melFix(m,bt){ const S=chordScaleOf(bt); if(!S) return m; const pc=x=>((x%12)+12)%12; if(S.has(pc(m))) return m;
  const CT=new Set([...(bt.ivs||[]).map(i=>(bt.rpc+i)%12), ...(bt.bpc!=null?[bt.bpc]:[])]), a=m+1, b=m-1, okA=S.has(pc(a)), okB=S.has(pc(b));
  return okA&&okB ? (CT.has(pc(a))&&!CT.has(pc(b))?a:b) : okA ? a : okB ? b : m; }
// メロディの音の決め方：①今のコードの音階に合わせる（melFix）②キーの外のコードでは、ルート以外のコードの音の半音上（アボイドノート。E7 の上の A など）は、そのコードの音へ下ろす
function melNote(m,bt){ if(!bt||bt.rpc==null||!bt.ivs) return m; let x=melFix(m,bt); const pc=v=>((v%12)+12)%12, K=keyObj().pc,
    CT=[...new Set([...bt.ivs.map(i=>(bt.rpc+i)%12), ...(bt.bpc!=null?[bt.bpc]:[])])], inK=S=>CT.every(q=>S.includes(pc(q-K)));
  if(inK(SC_MAJ)||inK(SC_MIN)) return x;
  if(CT.some(q=>q!==bt.rpc && q===pc(x-1))) x-=1; return x; }
// 飾りの音（次のコードのいちばん上の音 T へつなぐ）：nt＝T、ntd＝T の1つ下、ntu＝T の1つ上。どれも今のコードの音階の中から選ぶ
//  ・T が今の音階にない（次のコードがキーの外の音）ときは、nt を今の音階の隣の音（上から入るのを優先）に替える
//  ・隣の音まで3半音以上ある（増2度になる）ときは、不自然なので弾かない
function ornPitch(kind,bt){ const T=nextTop(bt,0); if(T==null) return null; const S=chordScaleOf(bt); if(!S) return kind==='nt'?T:nextTop(bt,kind==='ntd'?-1:1);
  const inS=m=>S.has(((m%12)+12)%12), up=m=>{ let x=m+1; while(!inS(x)) x++; return x; }, dn=m=>{ let x=m-1; while(!inS(x)) x--; return x; };
  if(kind==='nt'){ if(inS(T)) return T; const a=up(T), b=dn(T); return a-T<=2?a:T-b<=2?b:null; }
  if(kind==='ntu'){ const a=up(T); return a-T<=2?a:null; }
  const b=dn(T); return T-b<=2?b:null; }
const scaleUp=m=>{ const k=keyObj().pc, S=scaleNow(); let x=m+1; while(!S.includes((((x-k)%12)+12)%12)) x++; return x; };
// 刺繍音・飾りの種類（音ごとに選べる。どの楽器・どのパターンでも、メロディ行でも使える）
//  1音を置きかえるもの：dn=1つ下の音階 dn2=2つ下の音階 su=1つ上の音階 su2=2つ上の音階 cd=半音下 cu=半音上
//  元の音へ戻るもの：dnr=元→下→元 upr=元→上→元 grc=半音下から（装飾音）grs=音階の上から（装飾音） trl=トリル（上の音と細かく交互）
const NB_KINDS=[['dn','1つ下の音階'],['dn2','2つ下の音階'],['su','1つ上の音階'],['su2','2つ上の音階'],['cd','半音下'],['cu','半音上'],
  ['dnr','下へ行って戻る（元→下→元）'],['upr','上へ行って戻る（元→上→元）'],['grc','半音下から入る（装飾音）'],['grs','上の音から入る（装飾音）'],['trl','トリル（上の音と交互）'],['p0','5音の音階（ペンタ）の音に寄せる'],['pu','5音の音階で1つ上'],['pd','5音の音階で1つ下']];
const NB_SET=new Set(NB_KINDS.map(k=>k[0])), NB_UP=new Set(['su','su2','cu','upr','grs','trl','pu']), NB_ORN=new Set(['dnr','upr','grc','grs','trl']);
const nbKind=n=>n.dn===true?'dn':(NB_SET.has(n.dn)?n.dn:null);
// 1つの音を、刺繍音・飾りに合わせて [{m, 遅らせるマス数, 長さ}] に分ける（len はマス数）
// キーのペンタトニック（長調の 1・2・3・5・6）で1つ上／下。そこが和音の音と半音でぶつかるときは、その向きのいちばん近い和音の音
// dir=0：その音がペンタになければ、すぐ下のペンタの音に寄せる（ペンタをたどるフレーズの出だし）
// ぶつかる＝和音の音の半音上（♭9度・長3度の上の4度など、濁る音）。半音下（9度・長7度など）はテンションとしてそのまま使う
function pentaStep(m,dir,cp){ const K=keyObj().pc, P=pentaNow(), pc=x=>(((x-K)%12)+12)%12;
  let x=dir?m+dir:m, k=0; const st=dir||-1; while(!P.includes(pc(x)) && k++<12) x+=st;
  if(!dir && x===m) return m;
  const clash=cp && cp.length && !cp.includes(((x%12)+12)%12) && cp.some(c=>((((x-c)%12)+12)%12)===1);
  if(clash){ if(!dir) return m; let y=m+dir; k=0; while(!cp.includes(((y%12)+12)%12) && k++<12) y+=dir; return y; }
  return x; }
// 「次のコードへペンタでつなぐ」（'nx'）：パターンの中の nx の音に、後ろから 1・2・3…と番号を付ける（e[6]）
function prepNx(evs){ const xs=(evs||[]).filter(e=>e[5]==='nx').sort((a,b)=>a[0]-b[0]); xs.forEach((e,i)=>{ e[6]=xs.length-i; e[7]=xs[xs.length-1][1][0]; e[8]=xs.length; }); return evs; }   // e[6]：後ろから何番目 e[8]：全部で何音   // e[7]：最後の音の行（目標の高さの基準。みんな同じ目標へ向かう）
let NX_V=null;
// 鳴らす条件（ballade.mid の飾りの出方から）：いまの小節で弾いた右手のいちばん上の音 → 次のコードのいちばん上の音 の動きで決める
//  step＝近い（下に3半音〜上に。大きく上がるときもこちら）、down＝大きく下がる（4半音以上）、same＝同じ音、move＝同じでない
const WHEN_KINDS=[['','毎回'],['step','上の音の動きが小さいとき（または上がるとき）'],['down','上の音が大きく下がるとき（長3度以上）'],['same','上の音が次も同じとき'],['move','上の音が次で変わるとき']];
let NX_ANT=0;   // 次のコードを食って先に弾く長さ（chordPart が入れる）
function whenOK(w,bt){ if(!w) return true; const T=nextTop(bt), C=bt&&bt._top; if(T==null||C==null) return false;
  const d=T-C; return w==='same' ? d===0 : w==='down' ? d<=-4 : w==='step' ? (d!==0 && d>-4) : w==='move' ? d!==0 : true; }
// 4音目の行（9）を使うパターンか
function usesR4(pat){ if(!pat) return false; if(pat._r4!==undefined) return pat._r4; let f=false; const scan=evs=>(evs||[]).forEach(e=>{ if(e[1].includes(9)) f=true; });
  scan(pat.ev); if(pat.sit) for(const k in pat.sit) pat.sit[k].forEach(v=>scan(v.evs||v)); return pat._r4=f; }
// 次のコードのいちばん上の音（右手の4音すべての中で。次の小節で実際に弾く形）
// dir：-1＝その1つ下の音階、1＝1つ上の音階（次のコードの音階で。次の小節へ向かう音なので）
function nextTop(bt,dir){ if(NX_V==null||!bt) return null; const sv=SC_BORROW; try{ const nb=chordNotes(NX_V,bt.R), R=(nb.R||[]).filter(x=>x!=null); if(!R.length) return null; const T=Math.max(...R); return dir===-1||dir===true?scaleDown(T):dir===1?scaleUp(T):T; }catch(e){ return null; } finally{ SC_BORROW=sv; } }
const LAST_MEL=[{},{}];   // 3つ目からのコード楽器（PRO で足した楽器）の分は、使うときに足す   // 直前に弾いたメロディの音（楽器1・楽器2）   // 次のコード（chordPart が playEvents の前に入れる）
// 今のコードのいちばん上の音から、次のコードのいちばん上の音（声部としていちばん近い次のコードの音）まで、キーのペンタで順につなぐ。
// N 音のうち後ろから k 番目の音を返す。間のペンタの音が足りないときは、次のコードの上の音へ、今の音の側から1音ずつ近づく
function nxPitch(k,N,bt){ if(NX_V==null||!bt||!bt.tones) return null;
  const top=Math.max(...[1,2,3].map(i=>bt.tones[i]).filter(x=>x!=null)); if(!isFinite(top)) return null;
  const sp=specOf(NX_V), K=keyObj().pc, r=(K+sp.o)%12, iv=[...QUAL[sp.q]||[0,4,7], ...(EXT[sp.x]||[])], pcs=[...new Set(iv.map(i=>(r+i)%12))];
  // 目標＝次のコードを実際に弾くときのいちばん上の音（今の和音からの声部のつながりで決まる形。食った「パー」の最高音）
  let T=null; try{ const sv=SC_BORROW, nb=chordNotes(NX_V,bt.R); SC_BORROW=sv; T=Math.max(...[1,2,3].map(i=>nb.tones[i]).filter(x=>x!=null)); }catch(e){}
  if(T==null||!isFinite(T)){ T=null; for(let x=top-6;x<=top+6;x++) if(pcs.includes(((x%12)+12)%12) && (T==null||Math.abs(x-top)<Math.abs(T-top))) T=x; }
  if(T==null) return null;
  const dir=Math.sign(T-top), path=[]; if(dir){ let x=top, g=0; while(g++<24){ x=pentaStep(x,dir,null); if(dir>0?x>=T:x<=T) break; path.push(x); } }
  const j=N-k+1;   // 前から何番目か（1〜N）
  if(path.length>=N) return path[Math.min(path.length-1,Math.max(0,Math.round(j*(path.length+1)/(N+1))-1))];
  // 同じ音どうし：いったん離れて戻ってくる弧（3音なら 1・2・1 ステップ）。高い所では下側、低い所では上側に
  if(!dir){ const side=top>=76?-1:top<=67?1:(BOWBAR%2?1:-1), off=Math.min(j,N-j+1); let x=T; for(let i=0;i<off;i++) x=pentaStep(x,side,null); return x; }
  // 隣どうし（間にペンタの音がない）：今の音の側から、次の音へ1音ずつ近づく
  let x=T; for(let i=0;i<k;i++) x=pentaStep(x,-dir,null); return x; }
function nbSplit(m,tr,len,cp){
  const one=x=>[{m:x,d:0,len}];
  switch(tr){
    case 'p0': return one(pentaStep(m,0,cp)); case 'pu': return one(pentaStep(m,1,cp)); case 'pd': return one(pentaStep(m,-1,cp));
    case 'dn': return one(scaleDown(m)); case 'dn2': return one(scaleDown(scaleDown(m)));
    case 'su': return one(scaleUp(m)); case 'su2': return one(scaleUp(scaleUp(m)));
    case 'cd': return one(m-1); case 'cu': return one(m+1);
    case 'dnr': case 'upr': { const nb=tr==='dnr'?scaleDown(m):scaleUp(m), a=Math.min(len/3,1); return [{m,d:0,len:a},{m:nb,d:a,len:a},{m,d:2*a,len:len-2*a}]; }
    case 'grc': case 'grs': { const g=Math.min(len*.3,.5), nb=tr==='grc'?m-1:scaleUp(m); return [{m:nb,d:0,len:g},{m,d:g,len:len-g}]; }
    case 'trl': { const u=scaleUp(m), q=.5, out=[]; let k=0; for(let d=0; d<len-1e-6; d+=q,k++) out.push({m:k%2?u:m,d,len:Math.min(q,len-d)}); return out; }
  }
  return one(m); }
const KEY_ROWS=[[8,'アクセント 上'],[7,'アクセント 中'],[6,'アクセント'],[9,'右手 4音目'],[3,'右手 上'],[2,'右手 中'],[1,'右手 下'],[5,'左手 8度'],[4,'左手 5度'],[0,'左手 根音']];
const LV=[0,.5,.75,1], CH=['.','o','x','X'];
const lvOf=v=>v>=.95?3:v>=.65?2:v>0?1:0;
// マイ演奏は何個でも作れる：DRUMS.my0, my1… / ARPS.my0, my1…
const myKeys=(src)=>Object.keys(src).filter(k=>/^my\d+$/.test(k)).sort((a,b)=>+a.slice(2)-+b.slice(2));
const drumOrder=()=>(state.pro?myKeys(DRUMS):[]).concat(DRUM_ORDER);
const arpOrder=()=>(state.pro?myKeys(ARPS):[]).concat(ARP_ORDER);
// マイ演奏のデータ：どれも notes=[{r:行, st:位置(16分), len:長さ(16分), vel:強さ0〜1}]（ドラムは長さなし）
// 古い形（ドラム：v の文字列／コード・ベース：cells と len）は、ここで notes に直す
function migrateMy(m,kind){
  if(typeof m.name==='string') m.name=m.name.replace(/^マイパターン(\d*)$/,'マイ演奏$1').replace(/^共有パターン$/,'共有された演奏');   // 古い名前（ver 5.23.039 で「マイ演奏」に）
  if(Array.isArray(m.notes)) return m;
  const notes=[];
  if(kind==='drum'){ for(const k in (m.v||{})) [...m.v[k]].forEach((c,st)=>{ const vel=velOf(c); if(vel) notes.push({r:k,st,len:1,vel}); }); delete m.v; }
  else { const rowsOf=kind==='bass'?BASS_ROWS:KEY_ROWS, cells=m.cells||{};
    for(const r in cells) cells[r].forEach((vel,st)=>{ if(!vel) return; let len=m.len||2;
      if(len==='next'){ let n=st+1; while(n<16 && !(kind==='bass' ? rowsOf.some(([k])=>cells[k]&&cells[k][n]) : cells[r][n])) n++; len=n-st; }
      notes.push({r:String(r),st,len:Math.min(len,16-st),vel}); });
    delete m.cells; delete m.len; }
  m.notes=notes; return m;
}
// パターンの設定（音のデータ以外）をそのまま写す。ビギナーのパターンを取り込んだとき、名前を挙げていない設定もなくさないように
const MY_DATA=new Set(['notes','contNotes','sitNotes','name','pro','ev','sit','at','v','vB','V','VB','F','FS','fill','bass','swing','swing16','legato','avoid','pushBy','glide','_n']);
const propsOf=m=>{ const o={}; for(const k in m) if(!MY_DATA.has(k) && !k.startsWith('_')) o[k]=m[k]; return o; };
// 音の飾りを、演奏データの書き方（e[5]）にする
const fxKey=n=>n.fall?'fall':n.up?'up':n.scoop?'scoop':n.nx?'nx':n.nt?n.nt:(nbKind(n)??null);
function rebuildMy(){
  myKeys(DRUMS).forEach(k=>delete DRUMS[k]); myKeys(ARPS).forEach(k=>delete ARPS[k]);
  (state.myDrums||[]).forEach((m,i)=>{ migrateMy(m,'drum');
    const V={}; m.notes.forEach(n=>{ const a=V[VOICE[n.r]]=V[VOICE[n.r]]||Array(16).fill(0); a[n.st]=n.vel; });
    let VB=null; const nb=(m.sitNotes||{}).B||[]; if(nb.length){ VB={}; nb.forEach(n=>{ const a=VB[VOICE[n.r]]=VB[VOICE[n.r]]||Array(16).fill(0); a[n.st]=n.vel; }); }
    const d=DRUMS['my'+i]={...propsOf(m), name:m.name||`マイ演奏${i+1}`, fill:m.fill||null, bass:m.bass||DRUMS.pop.bass, V, VB, swing:m.swing==='swing', swing16:m.swing==='swing16', duck:!!m.duck, dyn:m.dyn||0, crash0:m.crash0===false?false:undefined};
    if(d.fill){ d.F=parseVoices(FILLS[d.fill].big); d.FS=parseVoices(FILLS[d.fill].small); } else { d.F=null; d.FS=null; }
  });
  (state.myArps||[]).forEach((m,i)=>{ migrateMy(m,'arp');
    // 音（notes）を演奏データ（イベント）に戻す。取り込んだときに同じイベントだった音（g が同じで、位置・長さ・強さ・飾りなども同じ）は、1つのイベントにまとめ直す（鳴り方を元のパターンと同じにするため）
    const toEv=ns=>{ const G=new Map(), out=[];
      (ns||[]).forEach((n,ix)=>{ const vel=n.gh?n.vel*.45:n.vel, len=n.gh?Math.min(n.len,.25):n.len, r=isDeg(n.r)?n.r:+n.r, fk=fxKey(n), fx=(n.fxk!==undefined && n.fxk===fk) ? n.fx0 : fk, key=n.g!=null ? JSON.stringify([n.g,n.st,len,vel,n.dir??null,fx??null,n.oc||null,n.when||null]) : 'n'+ix;
        let e=G.get(key); if(!e){ e=[n.st,[],len,vel]; if(n.dir!=null||fx!=null||n.oc||n.when){ e[4]=n.dir??null; e[5]=fx??null; } if(n.oc||n.when){ for(let k=6;k<=10;k++) e[k]=e[k]??null; if(n.oc) e[9]=n.oc; if(n.when) e[10]=n.when; }
          e._o=n.g!=null?n.g:1e6+ix; e._k=[]; G.set(key,e); out.push(e); }
        e[1].push(r); e._k.push(n.k??0); });
      out.forEach(e=>{ const o=e[1].map((r,k)=>[e._k[k],r]).sort((a,b)=>a[0]-b[0]); e[1]=o.map(x=>x[1]); });
      return prepNx(out.sort((a,b)=>a[0]-b[0]||a._o-b._o).map(e=>{ delete e._o; delete e._k; return e; })); };
    const ev0=toEv(m.notes), ev=m.contNotes?toEv(m.contNotes):ev0;   // contNotes：続けて弾くとき用（取り込んだパターンで、1小節の場面と違うもの）
    const a=ARPS['my'+i]={...propsOf(m), name:m.name||`マイ演奏${i+1}`, legato:m.legato!==false, ev, swing:m.swing==='swing', swing16:m.swing==='swing16', loose:!!m.loose, pushKeepLH:!!m.pushKeepLH, bossaV:!!m.bossaV, tie:!!m.tie, lhFull:!!m.lhFull, rhMid:m.rhMid||0, noRoot:!!m.noRoot, melOct:m.melOct||0, push2nd:!!m.push2nd, accLink:!!m.accLink, rhAbove:!!m.rhAbove, pluck:!!m.pluck, satb:!!m.satb, shell:!!m.shell, avoid:m.avoid!==false, rhShift:m.rhShift||0, vol:m.vol||1}; a.at=atMap(ev);
    // 場面ごとの弾き方（作ってある場面だけ。ない場面は1小節の弾き方などで代わりに弾く）
    const sn=m.sitNotes||{}, kinds=['halfA','halfB','beat','bar3'].filter(k=>(sn[k]||[]).length);
    if(kinds.length || (sn.push||[]).length || (sn.bar2||[]).length || (sn.bar3rd||[]).length || (sn.bar4th||[]).length || (sn.bar32||[]).length || m.pushBy){ a.sit={bar:[{evs:ev0,at:atMap(ev0)}]}; kinds.forEach(k=>{ const e=toEv(sn[k]); a.sit[k]=[{evs:e,at:atMap(e)}]; });
      if((sn.bar2||[]).length){ const e=toEv(sn.bar2); a.sit.bar.push({evs:e,at:atMap(e)}); }   // 2小節目（1・2小節目を交互に）
      // 3・4小節目（4小節ひとまとまり）。ない小節は、3小節目＝1小節目、4小節目＝2小節目で埋める
      if((sn.bar3rd||[]).length || (sn.bar4th||[]).length){ const B=a.sit.bar, b1=B[0], b2=B[1]||B[0];
        const e3=(sn.bar3rd||[]).length?toEv(sn.bar3rd):null, e4=(sn.bar4th||[]).length?toEv(sn.bar4th):null;
        a.sit.bar=[b1, b2, e3?{evs:e3,at:atMap(e3)}:b1, e4?{evs:e4,at:atMap(e4)}:b2]; }
      if(a.sit.bar3 && (sn.bar32||[]).length){ const e=toEv(sn.bar32); a.sit.bar3.push({evs:e,at:atMap(e)}); }   // 3拍・2小節目
      if((sn.push||[]).length){ const e=toEv(sn.push); a.sit.push=[{evs:e,at:atMap(e)}]; if((sn.push2||[]).length){ const e2=toEv(sn.push2); a.sit.push.push({evs:e2,at:atMap(e2)}); } } }
    if(m.pushBy) a.pushBy=m.pushBy;
  });
  if(typeof BASSES!=='undefined'){ myKeys(BASSES).forEach(k=>delete BASSES[k]);
    (state.myBasses||[]).forEach((m,i)=>{ migrateMy(m,'bass');
      // 音が重なっていたら、あとの音へポルタメントですべらせる（前の音は、あとの音の始まりで切ってつなげる）
      m.notes.forEach(n=>{ delete n.slide; });   // 前の「音ごとにポルタメント」の印は使わない（重なりで決まる）
      const gl=m.glide||.08, v=m.notes.map(n=>[n.st, (n.iv0!==undefined && n.ivr===n.r) ? n.iv0 : n.r==='0'?0 : n.r==='12'?12 : n.r, n.gh?Math.min(n.len,.25):n.len, n.gh?n.vel*.45:n.vel]);
      v.glide=gl; BASSES['my'+i]={name:m.name||`マイ演奏${i+1}`, v}; }); }
}
const overlapPrev=(ns,n)=>ns.filter(x=>x!==n && x.st<n.st-.01 && x.st+x.len>n.st+.01).sort((a,b)=>b.st-a.st)[0]||null;   // n の始まりで、まだ鳴っている音

const listOf=kind=>kind==='arp2'?(state.myArps=state.myArps||[]):isDrumK(kind)?(state.myDrums=state.myDrums||[]):isBassK(kind)?(state.myBasses=state.myBasses||[]):(state.myArps=state.myArps||[]);
// 同じ行で重なった音は、あとから始まる音の手前で切る
function tidyNotes(notes){
  notes.sort((a,b)=>a.st-b.st);
  const out=[]; notes.forEach(n=>{ const prev=out.filter(x=>x.r===n.r).pop();
    if(prev && prev.st===n.st){ prev.vel=Math.max(prev.vel,n.vel); prev.len=Math.max(prev.len,n.len); return; }
    if(prev && prev.st+prev.len>n.st) prev.len=n.st-prev.st;
    out.push(n); });
  return out;
}
function newMy(kind,from){        // from: もとにするパターンのキー（null なら空っぽから）
  const list=listOf(kind), name=`マイ演奏${list.length+1}`; let notes=[], fill=isDrumK(kind)?'tom':undefined, sit=null, pushBy=0;
  let extra={};
  if(from && /^my\d+$/.test(from)){ const src=list[+from.slice(2)]; if(src){ const c=JSON.parse(JSON.stringify(src)); notes=c.notes||[]; fill=c.fill; sit=c.sitNotes||null; pushBy=c.pushBy||0; delete c.notes; delete c.sitNotes; delete c.name; delete c.fill; delete c.pushBy; extra=c; } }
  else if(from){
    if(isDrumK(kind)){ const d=DRUMS[from]; if(d){ fill=d.fill||null; const RV={}; DRUM_ROWS.forEach(([k])=>RV[VOICE[k]]=k);
      const cv=V=>{ const o=[]; for(const mn in (V||{})) (V[mn]||[]).forEach((vel,st)=>{ if(vel && RV[mn]) o.push({r:RV[mn],st,len:1,vel}); }); return o; };   // 強さは数字のまま（MIDI から取り込んだ細かい強弱も）
      notes=cv(d.V); if(d.VB) sit={B:cv(d.VB)};
      extra={...propsOf(JSON.parse(JSON.stringify(d))), swing:d.swing?'swing':d.swing16?'swing16':'', duck:!!d.duck, bass:d.bass, dyn:d.dyn||0}; if(d.crash0===false) extra.crash0=false; } }
    else if(isBassK(kind)){ const src=from==='auto'||!BASSES[from] ? DRUMS[state.drum].bass : BASSES[from].v;
      (src||[]).forEach(([st,iv,len,vel])=>{ const r=String(iv===7?'5':iv); if(BASS_ROWS.some(([k])=>k===r)) notes.push({r,st,len,vel,iv0:iv,ivr:r}); });   // 位置・長さ・音（iv）はそのまま（元のベースと同じ鳴り方に）
      if(src&&src.glide) extra={glide:src.glide}; }
    else { const a=ARPS[from]; let usesMel=false; const conv=(evs,N)=>{ const out=[]; evs.forEach((e,gi)=>{ const [st,ns,len,vel]=e; ns.forEach((rr,k)=>{ if(isDeg(rr)||KEY_ROWS.some(([q])=>q===rr)){ const n={r:String(rr),st,len,vel,g:gi,k}; if(isDeg(rr)) usesMel=true; if(e[4]!=null) n.dir=e[4]; if(e[5]==='fall') n.fall=true; if(e[5]==='scoop') n.scoop=true; if(e[5]==='nx') n.nx=true; if(e[5]==='nt'||e[5]==='ntd'||e[5]==='ntu') n.nt=e[5]; if(e[9]) n.oc=e[9]; if(e[10]) n.when=e[10]; if(e[5]==='up') n.up=true; if(e[5]==='dn'||e[5]===-2) n.dn=true; else if(e[5]===-1) n.dn='cd'; else if(NB_SET.has(e[5])) n.dn=e[5]; n.fx0=e[5]??null; n.fxk=fxKey(n); out.push(n); } }); }); return out; };   // 位置・長さはそのまま。g・k：もとのイベントと、その中の順番
      if(a){ notes=conv(a.ev,16);
        // 「1小節」の場面が、続けて弾くとき用の ev と違うパターン（ノリノリなど）：見せて編集するのは場面の方、ev は contNotes に残す（1小節を編集したら消える）
        let cont=null; if(a.sit && a.sit.bar && JSON.stringify(a.sit.bar[0].evs)!==JSON.stringify(a.ev)){ cont=notes; notes=conv(a.sit.bar[0].evs,16); }
        if(a.sit){ sit={}; [['halfA',8],['halfB',8],['beat',4],['push',4],['bar3',12]].forEach(([k,N])=>{ if(a.sit[k]) sit[k]=conv(a.sit[k][0].evs,N); }); if(a.sit.bar3&&a.sit.bar3[1]) sit.bar32=conv(a.sit.bar3[1].evs,12); if(a.sit.bar&&a.sit.bar[1]) sit.bar2=conv(a.sit.bar[1].evs,16); if(a.sit.bar&&a.sit.bar.length===4){ sit.bar3rd=conv(a.sit.bar[2].evs,16); sit.bar4th=conv(a.sit.bar[3].evs,16); } if(a.sit.push&&a.sit.push[1]) sit.push2=conv(a.sit.push[1].evs,4); }
        if(a.pushBy) pushBy=a.pushBy;
        extra={...propsOf(JSON.parse(JSON.stringify(a))), swing:a.swing?'swing':a.swing16?'swing16':'', loose:!!a.loose, pushKeepLH:!!a.pushKeepLH, bossaV:!!a.bossaV, tie:!!a.tie, lhFull:!!a.lhFull, rhMid:a.rhMid||0, noRoot:!!a.noRoot, melOct:a.melOct||0, push2nd:!!a.push2nd, accLink:!!a.accLink, rhAbove:!!a.rhAbove, pluck:!!a.pluck, legato:!!a.legato, satb:!!a.satb, shell:!!a.shell, rhShift:a.rhShift||0, vol:a.vol||1}; if(a.avoid===false) extra.avoid=false; if(cont) extra.contNotes=cont; } }
  }
  // 組み込みのパターンから作ったときは、元の名前に「（自分用）」を付ける
  const src0=from&&!/^my\d+$/.test(from)?(isDrumK(kind)?DRUMS[from]:isBassK(kind)?BASSES[from]:ARPS[from]):null, nm0=src0?((state.pro&&src0.pro)||src0.name):null;
  const m={...extra, name:nm0?nm0.slice(0,12)+'（自分用）':name, notes:(isDrumK(kind)||from)?notes:tidyNotes(notes)}; if(isDrumK(kind)) m.fill=fill??null; if(sit) m.sitNotes=sit; if(pushBy) m.pushBy=pushBy;   // 取り込んだパターンはそのまま（同じ行の重なりも元のとおり）
  list.push(m);
  setPatOf(kind,'my'+(list.length-1)); if(kind==='bass') state.bass=true;
  rebuildMy(); save();
}
let patKind='drum';
const curMy=()=>listOf(patKind)[+patOf(patKind).slice(2)];
// コードのマイ演奏は「場面」ごとに弾き方を作れる（bar=1小節同じコード、halfA=前半2拍、halfB=3拍目から、beat=1拍だけ、push=食ったとき）
const SCENES=[['bar','1小節',16],['bar2','2小節目',16],['bar3rd','3小節目',16],['bar4th','4小節目',16],['bar3','3拍（4拍目で変わる）',12],['bar32','3拍・2小節目',12],['halfA','前半（2拍）',8],['halfB','3拍目から',8],['beat','1拍だけ',4],['push','先に弾いたとき',4],['push2','2小節目を先に弾いたとき',4]];
const DRUM_SCENES=[['bar','1小節目',16],['B','2小節目',16]];   // ドラムは2小節で1セット（2小節目を作らなければ1小節目をくり返す）
const isArpK=k=>k==='arp'||k==='arp2'||xType(k)==='chord';
const scenesOf=k=>isArpK(k)?SCENES:isDrumK(k)?DRUM_SCENES:null;
const curScene=()=>{ const L=scenesOf(patKind); return L&&L.some(x=>x[0]===PR.scene)?PR.scene:'bar'; };
const sceneN=()=>{ const L=scenesOf(patKind); return L?(L.find(x=>x[0]===curScene())||L[0])[2]:16; };
const curNotes=()=>{ const m=curMy(); const sc=curScene(); if(sc==='bar') return m.notes; m.sitNotes=m.sitNotes||{}; return (m.sitNotes[sc]=m.sitNotes[sc]||[]); };
const setCurNotes=a=>{ const m=curMy(); const sc=curScene(); if(sc==='bar') m.notes=a; else { m.sitNotes=m.sitNotes||{}; m.sitNotes[sc]=a; } };
function openPatEditor(kind,mode){  // mode: 'edit'=今のマイ演奏を編集 / 'new'=空っぽから新規（マイ演奏以外を編集するときは、そのコピーを作る）
  patKind=kind;
  const isMy=/^my\d+$/.test(patOf(kind)||'');
  if(mode==='new') newMy(kind,null);
  else if(mode==='copy' || !isMy) newMy(kind,patOf(kind)||'auto');
  sheet.classList.remove('on'); $('patSheet').classList.add('on'); scrim.classList.add('on');
  renderPatEditor(); renderAll();
}
// 試し弾き（行 r の音を強さ vel で）
function previewRow(r,vel){
  if(playing) return;
  whenRunning(()=>{ const t=ctx.currentTime+.02;
    if(isDrumK(patKind)) drum(+VOICE[r],t,vel);
    else { const v=state.slots[page*4]??0, bt=chordNotes(v,null);
      if(isBassK(patKind)){ const n={'0':0,'12':12,'5':bt.fifth,'3':bt.third,'6':sixthOf(bt),'7':bt.seventh,'ap':bt.fifth,'-5':bt.fifth-12,'-12':-12}[r]; bassTone(bt.bass+n,t,.4,vel); }
      else if(isDeg(r)){ const go=()=>keyTone(degPitch(r),t,.5,COMP_LEVEL*vel,null); withPart(partOf(patKind),go); }
      else { const T=bt.tones[+r]??(+r===9&&bt.tones[2]!=null?bt.tones[2]+12:null); if(T!=null){ const go=()=>keyTone(T,t,.5,COMP_LEVEL*vel,null); withPart(partOf(patKind),go); } } } });   // 4音目：3音のコードは右手 中の1オクターブ上
}
// ---- ピアノロール：タップで追加・削除／右端をドラッグで長さ／ドラッグで移動／長押ししてから上下でベロシティ
let PR={lastLen:{arp:2,bass:2}, mode:'edit', selSet:new Set()};
// 選んでいる音（編集・選択のどちらのモードでも、複数選べる）
const selNotes=()=>{ if(!PR.selSet.size) return []; const a=curNotes(); return a.filter(n=>PR.selSet.has(n)); };
const selOnly=n=>{ PR.selSet=new Set(n?[n]:[]); };
function renderPatEditor(){
  const isDrum=isDrumK(patKind), g=$('patGrid');
  $('patTitle').textContent = isDrum ? 'ドラムのマイ演奏' : isBassK(patKind) ? 'ベースのマイ演奏' : patKind==='arp2' ? '重ねる楽器のマイ演奏' : xOf(patKind) ? `${xOf(patKind).name||'足した楽器'}のマイ演奏` : 'コードのマイ演奏';
  const nm=$('patName'); nm.value=curMy().name; nm.oninput=()=>{ curMy().name=nm.value||'マイ演奏'; rebuildMy(); save(); renderAll(); };
  $('patDel').textContent='この演奏を消す'; $('patDel').dataset.armed='';
  updHelp();
  const rows = isDrum ? DRUM_ROWS : isBassK(patKind) ? BASS_ROWS : (curMy().melody?[...MEL_ROWS,...KEY_ROWS]:KEY_ROWS);
  const sceneBar = scenesOf(patKind) ? `<div class="scenebar"><div class="chips" id="sceneChips"></div><p class="small" id="sceneNote"></p></div>` : '';
  g.innerHTML=`${sceneBar}<div class="prmode" id="prMode"></div><div class="prwrap"><div class="prlabs">${rows.map(([,l])=>`<span>${l}</span>`).join('')}</div><div class="proll" id="proll" style="--rows:${rows.length};--cols:${sceneN()};${sceneN()<16?`max-width:${sceneN()/16*100}%`:''}"><div class="prnotes"></div><div class="prvel" hidden></div></div></div>${isArpK(patKind)?'<div id="prFall"></div>':''}`;
  if(isDrumK(patKind)){ const sc=curScene(), m=curMy();
    chips($('sceneChips'), DRUM_SCENES.map(([k,l])=>[k, l+(k!=='bar'&&(m.sitNotes||{})[k]&&m.sitNotes[k].length?' ●':'')]), sc, v=>{ PR.scene=v; PR.selSet.clear(); renderPatEditor(); });
    $('sceneNote').textContent = sc==='bar' ? '1小節目の叩き方です。2小節目を作らなければ、これをくり返します。' : '2小節目の叩き方です（1・2小節目を交互にくり返します）。空っぽなら1小節目と同じです。'; }
  if(isArpK(patKind)){ const sc=curScene(), m=curMy();
    chips($('sceneChips'), SCENES.map(([k,l])=>[k, l+(k!=='bar'&&(m.sitNotes||{})[k]&&m.sitNotes[k].length?' ●':'')]), sc, v=>{ PR.scene=v; PR.selSet.clear(); renderPatEditor(); });
    $('sceneNote').textContent = sc==='bar' ? '1小節ずっと同じコードのときの演奏です（ほかの場面を作っていないときも、これを使います）。'
      : sc==='bar2' ? '2小節目の演奏です（1・2小節目を交互にくり返します）。空っぽなら1小節目と同じです。'
      : sc==='bar3rd' ? '4小節ひとまとまりの3小節目の演奏です。空っぽなら1小節目と同じです（3・4小節目を作ると、4小節ごとにくり返します）。'
      : sc==='bar4th' ? '4小節ひとまとまりの4小節目の演奏です。空っぽなら2小節目（なければ1小節目）と同じです。'
      : sc==='push2' ? '2小節目のコードを先に弾くとき（2小節の演奏用）に、先に弾く音です。空っぽなら「先に弾いたとき」と同じです。'
      : sc==='bar3' ? 'コードが3拍だけ（4拍目で次のコードに変わる）のときの演奏です。空っぽなら、1小節の演奏を途中まで使います。'
      : sc==='bar32' ? '3拍だけのコードの、2小節目の演奏です（2小節の演奏用）。空っぽなら「3拍」と同じです。'
      : sc==='push' ? '次のコードを先に弾くとき（食い）に、先に弾く音です。書いた長さのまま鳴ります（早めた分はのばしません）。空っぽなら、次のコードの弾き始めを先に弾いて、小節の頭までのばします。'
      : `コードが${sc==='halfA'?'小節の前半（2拍）だけ':sc==='halfB'?'3拍目から変わった':'1拍だけ'}のときの演奏です。空っぽなら、1小節の演奏を使います。`;
    const opt=$('patOptChips').closest('.sheetsec'); }
  drawNotes();
  bindRoll(rows);
  const opt=$('patOptChips').closest('.sheetsec');
  opt.hidden=false;
  const more=$('patOptMore'); more.innerHTML='';
  const optRow=(title,list,cur,set)=>{ const h=document.createElement('h3'); h.textContent=title; h.style.marginTop='14px'; const c=document.createElement('div'); c.className='chips'; more.append(h,c);
    chips(c,list,cur,v=>{ set(v); rebuildMy(); save(); renderPatEditor(); dirty=true; }); };
  if(isArpK(patKind)){
    optRow('リズム',[['','まっすぐ'],['swing','ハネる（シャッフル）'],['swing16','16分で軽くハネる']],curMy().swing||'',v=>curMy().swing=v);
    optRow('タイミング',[[false,'ぴったり'],[true,'人間っぽく揺らす']],!!curMy().loose,v=>curMy().loose=v);
    optRow('次のコードを先に弾く所',[[false,'コードが変わるたび'],[true,'2小節目に入るときだけ（2小節ひとまとまり）']],!!curMy().push2nd,v=>curMy().push2nd=v);
    optRow('先に弾いたあとの小節の1拍目',[[false,'弾かない（先に弾いた和音をのばすだけ）'],[true,'低い音（根音・5度）だけ弾く']],!!curMy().pushKeepLH,v=>curMy().pushKeepLH=v);
    optRow('音ののばし方',[[true,'ペダルでのばす'],[false,'コードが変わったら切る']],curMy().legato!==false,v=>curMy().legato=v);
    optRow('右手の和音を置く高さの好み',[[-4,'低め'],[-2,'少し低め'],[0,'ふつう'],[2,'少し高め'],[4,'高め']],curMy().rhMid||0,v=>curMy().rhMid=v);
    optRow('ベースと重なる左手の低い音',[[false,'少し弱める'],[true,'弱めない']],!!curMy().lhFull,v=>curMy().lhFull=v);
    optRow('同じ高さの音が続くとき',[[false,'弾き直す'],[true,'つなげて1つの音にする（管楽器向け）']],!!curMy().tie,v=>curMy().tie=v);
    optRow('右手の高さ（この演奏だけ）',[[-5,'低め'],[0,'ふつう'],[4,'高め'],[7,'もっと高め']],curMy().rhShift||0,v=>curMy().rhShift=v);
    optRow('メロディ行（コードに関係なくキーの音階で弾く）',[[false,'隠す'],[true,'表示する']],!!curMy().melody,v=>curMy().melody=v);
    optRow('メロディ行の高さ',[[-12,'1オクターブ下'],[0,'ふつう'],[12,'1オクターブ上']],curMy().melOct||0,v=>curMy().melOct=v);
    optRow('メロディをよける（メロディ行を使うとき）',[[true,'よける：和音をメロより下に、半音でぶつかる音は替える'],[false,'よけない']],curMy().avoid!==false,v=>{ if(v) delete curMy().avoid; else curMy().avoid=false; });
    optRow('右手の和音の形',[[false,'ふつう'],[true,'ルート・3度・7度（すっきり）']],!!curMy().shell,v=>curMy().shell=v);
    optRow('ギターの和音の形',[[false,'ふつう'],[true,'ボサノバの押さえ方（低い音＋3度・7度・9度）']],!!curMy().bossaV,v=>curMy().bossaV=v);
    optRow('4音以上のコードのルート',[[false,'弾く'],[true,'省く（上の音は残す）']],!!curMy().noRoot,v=>curMy().noRoot=v);
    optRow('弦楽器の合奏の和音（4つの声＋コントラバス）',[[false,'使わない'],[true,'使う：音どうしをなめらかにつなぐ']],!!curMy().satb,v=>curMy().satb=v);
    optRow('アクセントで終わったとき',[[false,'そのまま'],[true,'次のコードの上の音を上げてつなぐ']],!!curMy().accLink,v=>curMy().accLink=v);
  }
  if(isDrum){
    optRow('ハネ',[['','なし'],['swing','8分でハネる'],['swing16','16分でハネる']],curMy().swing||'',v=>curMy().swing=v);
    optRow('強弱のメリハリ',[[0,'ふつう'],[1.8,'はっきり（弱い音をもっと弱く）'],[2,'もっとはっきり']],curMy().dyn||0,v=>curMy().dyn=v);
    optRow('フィルのあとのシンバル',[[true,'次の小節の頭で鳴らす'],[false,'鳴らさない（フィルの中で鳴らす）']],curMy().crash0!==false,v=>{ if(v) delete curMy().crash0; else curMy().crash0=false; });
    optRow('キックで伴奏を沈める',[[false,'なし'],[true,'あり：キックのたびに伴奏の音量を沈める（ダンス系）']],!!curMy().duck,v=>curMy().duck=v);
  }
  if(isArpK(patKind)){
    $('patOptTitle').textContent='コードが変わる所';
    chips($('patOptChips'), [[0,'ちょうどで弾く'],[2,'いつも8分早く弾く'],[1,'いつも16分早く弾く']], curMy().pushBy||0,
      v=>{ curMy().pushBy=v; rebuildMy(); save(); renderPatEditor(); dirty=true; });
  }

  if(isBassK(patKind)){
    $('patOptTitle').textContent='ポルタメントの速さ';
    chips($('patOptChips'), [[.035,'速い'],[.08,'ふつう'],[.16,'ゆっくり']], curMy().glide||.08,
      v=>{ curMy().glide=v; rebuildMy(); save(); renderPatEditor(); dirty=true; });
  }
  if(isDrum){
    $('patOptTitle').textContent='フィル（4小節ごと）';
    chips($('patOptChips'), [['tom','タム回し'],['snare','スネア'],['kime','キメ'],['dance','ロール'],['soft','ソフト'],['rock','ロック'],['groove','ゆったり'],['funk','ファンキー'],['soul','ジャジー'],['ballad','バラード'],['shuf','3連符'],['orch','オーケストラ'],['march','マーチ'],[null,'なし']], curMy().fill??null,
      v=>{ curMy().fill=v; rebuildMy(); save(); renderPatEditor(); dirty=true; });
  }
}
function fallRow(){ const el=$('prFall'); if(!el) return; const ns=selNotes(), n=ns[0]||null;
  if(!n){ el.innerHTML='<p class="small" style="margin:6px 0 0">音を選ぶと、その音に「フォール」「転回」などの飾りや、長さ・高さを付けられます（複数選ぶと、まとめて変わります）。</p>'; return; }
  const cnt=ns.length>1?`（${ns.length}個まとめて）`:'';
  el.innerHTML=`<h3 style="margin:10px 0 6px">選んだ音の弾き方${cnt}</h3><div class="chips" id="prFallChips"></div>`;
  if(patKind!=='bass'){ el.insertAdjacentHTML('beforeend',`<h3 style="margin:10px 0 6px">選んだ音の高さ${cnt}</h3><div class="chips" id="prOctChips"></div>`);
    chips($('prOctChips'),[[-12,'1オクターブ下'],[0,'そのまま'],[12,'1オクターブ上']],n.oc||0,v=>{ ns.forEach(x=>{ if(v) x.oc=v; else delete x.oc; }); commitNotes(); drawNotes(); });
    el.insertAdjacentHTML('beforeend',`<h3 style="margin:10px 0 6px">選んだ音を鳴らす小節${cnt}</h3><div class="chips" id="prWhenChips"></div>`);
    chips($('prWhenChips'),WHEN_KINDS,n.when||'',v=>{ ns.forEach(x=>{ if(v) x.when=v; else delete x.when; }); commitNotes(); drawNotes(); }); }
  chips($('prFallChips'),[['','そのまま'],['fall','フォール（最後に一気に下がる）'],['up','1つ上の和音の音へ（転回）'],['scoop','しゃくり（下からずり上げる）'],['nx','次のコードへ音階でつなぐ'],['nt','次のコードの上の音を先に弾く'],['ntd','次のコードの上の音の1つ下の音階'],['ntu','次のコードの上の音の1つ上の音階'],...NB_KINDS.map(([k,l])=>[k,'飾り：'+l])],n.fall?'fall':n.up?'up':n.scoop?'scoop':n.nx?'nx':n.nt?n.nt:(nbKind(n)||''),v=>{ ns.forEach(x=>{ delete x.fall; delete x.up; delete x.dn; delete x.scoop; delete x.nx; delete x.nt; if(v==='fall'||v==='up'||v==='scoop'||v==='nx') x[v]=true; else if(v==='nt'||v==='ntd'||v==='ntu') x.nt=v; else if(v) x.dn=v==='dn'?true:v; }); commitNotes(); drawNotes(); }); }
// 編集モード／選択モードの切りかえと、選んだ音へのまとめ操作
function modeRow(){ const el=$('prMode'); if(!el) return; const k=selNotes().length;
  el.innerHTML='<div class="chips" id="prModeChips"></div><span class="sep"></span>'
    +`<button class="chip" id="prSelAll">すべて選ぶ</button>`+(k?`<button class="chip" id="prSelNone">選択を外す</button><button class="chip" id="prSelDel">選んだ${k}個を消す</button>`:'');
  chips($('prModeChips'),[['edit','編集'],['sel','選択']],PR.mode,v=>{ PR.mode=v; modeRow(); updHelp(); });
  $('prSelAll').onclick=()=>{ PR.selSet=new Set(curNotes()); drawNotes(); };
  if(k){ $('prSelNone').onclick=()=>{ PR.selSet.clear(); drawNotes(); };
    $('prSelDel').onclick=()=>{ setCurNotes(curNotes().filter(n=>!PR.selSet.has(n))); PR.selSet.clear(); commitNotes(); drawNotes(); }; } }
function updHelp(){ const h=$('patHelp'); if(!h) return; const isDrum=isDrumK(patKind);
  h.textContent = PR.mode==='sel'
    ? '選択モード：音をタップで選ぶ／外す（いくつでも）。何もない所からドラッグすると、囲んだ音をまとめて選べます。選んだ音をドラッグすると、まとめて動かせます。'
    : (isDrum ? '編集モード：タップで追加・削除。ドラッグで移動。長押ししたまま上下に動かすと強さ（ベロシティ）。何もない所を長押ししてからドラッグすると、囲んで複数選べます。選んだ音はまとめて動きます。'
      : '編集モード：タップで追加・削除。音の右端をドラッグで長さ、まん中をドラッグで移動。長押ししたまま上下に動かすと強さ（ベロシティ）。何もない所を長押ししてからドラッグすると、囲んで複数選べます。選んだ音は、移動・長さ・強さがまとめて変わります。'
        + (isBassK(patKind) ? 'ほかの音と重ねて置くと、その音へポルタメントですべります（斜線の音）。' : '')); }
function drawNotes(){
  const roll=$('proll'); if(!roll) return; if(isArpK(patKind)) fallRow(); modeRow(); const box=roll.querySelector('.prnotes'), isDrum=isDrumK(patKind);
  const rows = isDrum ? DRUM_ROWS : isBassK(patKind) ? BASS_ROWS : (curMy().melody?[...MEL_ROWS,...KEY_ROWS]:KEY_ROWS), ri=r=>rows.findIndex(([k])=>String(k)===String(r));
  const N=sceneN();
  box.innerHTML=curNotes().map((n,i)=>{ const y=ri(n.r); if(y<0) return '';
    const sl=isBassK(patKind) && !!overlapPrev(curNotes(),n);
    return `<i class="prn${isDrum?' dr':''}${sl?' sl':''}${n.fall?' fall':''}${n.up?' up':''}${n.scoop?' scoop':''}${n.nx?' nx':''}${n.nt?' nt':''}${n.oc<0?' ocd':n.oc>0?' ocu':''}${n.when?' cond':''}${(k=>k?(NB_UP.has(k)?' nu':' dn')+(NB_ORN.has(k)?' orn':''):'')(nbKind(n))}${PR.selSet.has(n)?' sel':''}" data-i="${i}" style="left:${n.st/N*100}%;width:${(isDrum?1:n.len)/N*100}%;top:calc(${y} * var(--rh));--v:${n.vel}"><b style="height:${Math.round(n.vel*100)}%"></b></i>`; }).join('');
}
function commitNotes(){ const m=curMy(); if(patKind!=='drum'){ setCurNotes(tidyNotes(curNotes())); if(curScene()==='bar') delete m.contNotes; } else { const seen={}; m.notes=m.notes.filter(n=>{ const k=n.r+':'+n.st; if(seen[k]) return false; seen[k]=1; return true; }); }
  rebuildMy(); save(); dirty=true; }
function bindRoll(rows){
  const roll=$('proll'), isDrum=isDrumK(patKind), velEl=roll.querySelector('.prvel');
  const N=sceneN();
  // iPhone で、すばやく触ったときにページが拡大されないように（この中の操作はすべて自分で扱う）
  roll.addEventListener('touchstart',e=>{ if(e.cancelable) e.preventDefault(); },{passive:false});
  roll.addEventListener('touchend',e=>{ if(e.cancelable) e.preventDefault(); },{passive:false});
  const pos=e=>{ const r=roll.getBoundingClientRect(), x=(e.clientX-r.left)/r.width*N, y=Math.floor((e.clientY-r.top)/r.height*rows.length);
    return {x:Math.max(0,Math.min(N-.001,x)), row:Math.max(0,Math.min(rows.length-1,y)), px:e.clientX-r.left, py:e.clientY-r.top, w:r.width, h:r.height}; };
  const rkey=y=>String(rows[y][0]), ridx=r=>rows.findIndex(([k])=>String(k)===String(r));
  const nlen=n=>isDrum?1:n.len;
  const nextStart=(n)=>{ const ns=curNotes().filter(x=>x!==n&&x.r===n.r&&x.st>n.st).map(x=>x.st); return Math.min(N,...ns); };
  const showVel=(n,p,k)=>{ velEl.hidden=false; velEl.textContent=`ベロシティ ${Math.max(1,Math.round(n.vel*127))}`+(k>1?` ほか${k-1}個`:'');
    velEl.style.left=Math.max(0,Math.min(p.w-110,p.px-55))+'px'; velEl.style.top=Math.max(-34,p.py-58)+'px'; };
  const notesM={get notes(){ return curNotes(); }, set notes(a){ setCurNotes(a); }};
  const hitAt=p=>notesM.notes.find(n=>String(n.r)===rkey(p.row) && p.x>=n.st && p.x<n.st+nlen(n));
  // まとめて動かす相手：つかんだ音が選んである音のひとつなら、選んである音すべて。そうでなければその音だけ
  const groupOf=n=>PR.selSet.has(n)&&PR.selSet.size>1 ? selNotes() : [n];
  const snap=g=>g.map(n=>({n,st:n.st,ri:ridx(n.r),len:n.len,vel:n.vel}));
  // 囲んで選ぶ
  let rectEl=null;
  const rectSel=(d,p)=>{ const x0=Math.min(d.p0.x,p.x), x1=Math.max(d.p0.x,p.x), y0=Math.min(d.p0.row,p.row), y1=Math.max(d.p0.row,p.row);
    if(!rectEl){ rectEl=document.createElement('div'); rectEl.className='prrect'; roll.appendChild(rectEl); }
    Object.assign(rectEl.style,{left:Math.min(d.p0.px,p.px)+'px',top:Math.min(d.p0.py,p.py)+'px',width:Math.abs(p.px-d.p0.px)+'px',height:Math.abs(p.py-d.p0.py)+'px'});
    const inR=notesM.notes.filter(n=>{ const y=ridx(n.r); return y>=y0&&y<=y1 && n.st<x1 && n.st+nlen(n)>x0; });
    PR.selSet=new Set([...d.base,...inR]); drawNotes(); };
  let d=null;
  roll.onpointerdown=e=>{
    e.preventDefault(); try{ roll.setPointerCapture(e.pointerId); }catch(_){}
    const p=pos(e), key=rkey(p.row), hit=hitAt(p);
    if(PR.mode==='sel'){
      if(hit) d={mode:'spress', n:hit, p0:p};
      else d={mode:'rect', p0:p, base:new Set(PR.selSet), moved:false};
      return;
    }
    if(hit){
      const right=(hit.st+nlen(hit))/N*p.w, wpx=nlen(hit)/N*p.w;
      if(!PR.selSet.has(hit)) selOnly(hit);
      d={mode:'press', n:hit, p0:p, g:snap(groupOf(hit)), edge:!isDrum && p.px>right-Math.max(10,wpx*.45)};
      drawNotes();
      d.lp=setTimeout(()=>{ if(d&&d.mode==='press'){ d.mode='vel'; d.p0=p; if(navigator.vibrate) try{ navigator.vibrate(15); }catch(_){} showVel(hit,p,d.g.length); } },430);
    } else {
      const st=Math.floor(p.x), n={r:key, st, len:1, vel:.8}; notesM.notes.push(n);
      if(!isDrum) n.len=Math.max(1,Math.min(PR.lastLen[patKind]||2, nextStart(n)-st));
      d={mode:'create', n, p0:p, moved:false}; selOnly(n); drawNotes(); previewRow(key,n.vel);
      // 何もない所を長押し（動かさない）：置いた音を取り消して「囲んで選ぶ」に切りかえる
      d.lp=setTimeout(()=>{ if(d&&d.mode==='create'&&!d.moved){ notesM.notes=notesM.notes.filter(x=>x!==n); PR.selSet.clear(); d={mode:'rect', p0:p, base:new Set(), moved:false, fromEdit:true};
        if(navigator.vibrate) try{ navigator.vibrate(15); }catch(_){} drawNotes(); } },430);
    }
  };
  roll.onpointermove=e=>{ if(!d) return; const p=pos(e), dx=p.px-d.p0.px, dy=p.py-d.p0.py, far=Math.hypot(dx,dy)>6;
    if(d.mode==='rect'){ if(far) d.moved=true; if(d.moved) rectSel(d,p); return; }
    if(d.mode==='spress' && far){ if(!PR.selSet.has(d.n)) PR.selSet.add(d.n); d.mode='move'; d.g=snap(groupOf(d.n)); }
    if(d.mode==='press' && far){ clearTimeout(d.lp); d.mode=d.edge?'resize':'move'; }
    if(d.mode==='create' && far) clearTimeout(d.lp);
    const n=d.n;
    if(d.mode==='vel'){ const dv=(d.p0.py-p.py)/140; d.g.forEach(o=>o.n.vel=Math.max(.05,Math.min(1,o.vel+dv))); showVel(n,p,d.g.length); drawNotes(); }
    else if(d.mode==='create' && !isDrum && far){ d.moved=true; n.len=Math.max(1,Math.min(Math.ceil(p.x)-n.st, nextStart(n)-n.st)); drawNotes(); }
    else if(d.mode==='resize'){ d.moved=true; const o0=d.g.find(o=>o.n===n), dl=Math.max(1,Math.ceil(p.x)-n.st)-o0.len;
      d.g.forEach(o=>{ const others=d.g.length>1?N:nextStart(o.n); o.n.len=Math.max(o.len<1?o.len:1,Math.min(o.len+dl, others-o.n.st, N-o.n.st)); }); drawNotes(); }
    else if(d.mode==='move'){ const o0=d.g.find(o=>o.n===n);
      let ds=Math.round(dx/p.w*N), dr=p.row-o0.ri;
      const minSt=Math.min(...d.g.map(o=>o.st)), maxEnd=Math.max(...d.g.map(o=>o.st+(isDrum?1:Math.ceil(o.len)))), minR=Math.min(...d.g.map(o=>o.ri)), maxR=Math.max(...d.g.map(o=>o.ri));
      ds=Math.max(-minSt,Math.min(N-maxEnd,ds)); dr=Math.max(-minR,Math.min(rows.length-1-maxR,dr));
      if(d.g.some(o=>o.ri<0)) dr=0;
      const was=n.st+':'+n.r;
      d.g.forEach(o=>{ o.n.st=o.st+ds; if(o.ri>=0) o.n.r=rkey(o.ri+dr); });
      if(was!==n.st+':'+n.r){ if(String(n.r)!==was.split(':')[1]) previewRow(n.r,n.vel); drawNotes(); } }
  };
  const up=e=>{ if(!d) return; clearTimeout(d.lp); const n=d.n;
    if(rectEl){ rectEl.remove(); rectEl=null; }
    if(d.mode==='rect'){ if(!d.moved && !d.fromEdit) PR.selSet.clear(); d=null; drawNotes(); return; }
    if(d.mode==='spress'){ if(PR.selSet.has(n)) PR.selSet.delete(n); else PR.selSet.add(n); d=null; drawNotes(); return; }
    if(d.mode==='press'){ notesM.notes=notesM.notes.filter(x=>x!==n); PR.selSet.delete(n); }         // タップ＝削除（編集モード）
    else if(d.mode==='move'){ const G=new Set(d.g.map(o=>o.n));
      notesM.notes=notesM.notes.filter(x=>G.has(x) || ![...G].some(m=>String(x.r)===String(m.r) && (isDrum ? x.st===m.st : (x.st<m.st+m.len && x.st+x.len>m.st)))); previewRow(n.r,n.vel); }   // 重なった音は上書き
    else if(d.mode==='vel'){ previewRow(n.r,n.vel); }
    if(!isDrum && (d.mode==='resize'||(d.mode==='create'&&d.moved))) PR.lastLen[patKind]=n.len;
    velEl.hidden=true; d=null; commitNotes(); drawNotes(); };
  roll.onpointerup=up; roll.onpointercancel=up;
}
const ARP_ORDER=['piano4','popanti','drive','pballad','whole','epic','hardrock','strum','garp','citypop','cityep','clavfunk','rhodes','lofi','sync','offbeat','stacc','shuffle','house','bossa','koto','alberti','glockline','brassobb','brasshit','hornline','skank','anilead'];
// まとめて消したパターン（保存データ・共有リンクは近いものに置きかえる）
const ARP_ALIAS={ballad:'pballad',sync16:'sync',shuff2:'shuffle',rock8:'hardrock',eighth:'drive'};
// ビギナーの「伴奏スタイル」：ドラムとコードパターンの組み合わせ
// id は共有リンク用の番号（並びを変えても古いリンクが同じ伴奏になるよう固定）。arp2/inst2＝上に重ねる2つ目の楽器（上もの）
const STYLES=[
  {id:0, name:'ポップス（定番）', bpm:96, drum:'pop', arp:'piano4', inst:'piano', kit:'std', bass:true},
  {id:1, name:'ポップス（ノリノリ）', bpm:128, drum:'dpop', arp:'popanti', inst:'piano', kit:'std', bass:true},
  {id:15, name:'疾走系（アニソン）', bpm:172, drum:'run', arp:'drive', inst:'sbrass', kit:'power', bass:true},
  {id:2, name:'ロック', bpm:132, drum:'hard', arp:'hardrock', inst:'dist', kit:'power', bass:true},
  {id:3, name:'ギターポップ', bpm:120, drum:'rride', arp:'strum', inst:'eguitar', kit:'room', bass:true},
  {id:16, name:'弾き語り', bpm:92, drum:'none', arp:'strum', inst:'steel', kit:'std', bass:false},
  {id:4, name:'バラード', bpm:80, lhOff:3, drum:'ballad', arp:'pballad', inst:'piano', kit:'brush', bass:true, mix:{arp:1.25,drum:1.15,bass:1.25}},
  {id:5, name:'しっとり', bpm:76, drum:'xstick', arp:'garp', inst:'nylon', kit:'brush', bass:false, bassSnd:'ubass', mix:{arp:1.35,drum:1.35,bass:1.35}},
  {id:17, name:'壮大', bpm:110, wide:true, drum:'epic', arp:'epic', inst:'strings3', arp2:'hornline', inst2:'horn', mix:{arp:1.25,arp2:1.4,drum:.31,bass:.94}, kit:'orch', bass:true, bassSnd:'ubass'},
  {id:18, name:'シティポップ', bpm:100, rhOff2:-3, drum:'city', arp:'cityep', inst:'epcity', arp2:'brassobb', inst2:'brass3', kit:'city', bass:true, bassSnd:'slap3'},
  {id:9, name:'ファンキー', bpm:104, drum:'sixteen', arp:'clavfunk', inst:'clav', arp2:'brasshit', inst2:'brass3', kit:'std', bass:true},
  {id:11, name:'ジャジー', bpm:100, drum:'neosoul', arp:'rhodes', inst:'piano', kit:'std', bass:true, bassSnd:'bass'},
  {id:19, name:'ローファイ', bpm:80, drum:'lofi', arp:'lofi', inst:'lofi', kit:'lofi', bass:true, bassSnd:'ubass'},
  {id:8, name:'スキップ風', bpm:108, drum:'shuffle', arp:'shuffle', inst:'piano', kit:'std', bass:true},
  {id:10, name:'ダンス', bpm:124, drum:'dance', arp:'house', inst:'synth', kit:'elec', bass:true, bassSnd:'sbass'},
  {id:21, name:'チップチューン', bpm:150, drum:'chip', arp:'chiparp', inst:'spiano', arp2:'anilead', inst2:'chipsq', kit:'synth', bass:true, bassSnd:'cbass', mix:{bass:.8,drum:1.1}},
  {id:12, name:'ボサノバ', bpm:140, drum:'bossa', arp:'bossa', inst:'nylon', kit:'brush', bass:true, bassSnd:'ubass'},
  {id:13, name:'レゲエ', bpm:80, drum:'reggae', arp:'skank', inst:'organ', kit:'std', bass:true},
  {id:20, name:'和風', bpm:88, drum:'wa', arp:'koto', inst:'koto', kit:'room', bass:true, bassSnd:'ubass'},
  {id:14, name:'クラシック風', bpm:100, drum:'none', arp:'alberti', inst:'piano', kit:'std', bass:false, mix:{arp:1.5}},
];
// なくした伴奏（古い共有リンク用）：ゆったり・どっしり
const OLD_STYLES={6:{drum:'medium', arp:'whole', inst:'pad', kit:'room', bass:true}, 7:{drum:'half', arp:'stacc', inst:'piano', kit:'power', bass:true}};
const styleNow=()=>STYLES.find(x=>x.drum===state.drum&&x.arp===state.arp);
const styleById=id=>STYLES.find(x=>x.id===id)||OLD_STYLES[id];
// PROのベースパターン（0=ルート 12=オクターブ '3'/'5'/'6'=3度・5度・6度 'ap'=次のコードへつなぐ音）
const ev8=(f)=>[0,2,4,6,8,10,12,14].map((st,k)=>f(st,k));
const BASSES={
  auto:  {name:'ドラムに合わせる', v:null},
  whole: {name:'ルートをのばす', v:[[0,0,16,.9]]},
  half:  {name:'ルートを2分で', v:[[0,0,8,.95],[8,0,8,.8]]},
  q:     {name:'ルートを4分で', v:[[0,0,3.6,1],[4,0,3.6,.8],[8,0,3.6,.9],[12,0,3.6,.8]]},
  e8:    {name:'ルートを8分で', v:ev8((st,k)=>[st,0,1.8,k%2?.7:(k%4?.85:1)])},
  r5:    {name:'ルートと5度', v:[[0,0,6,1],[6,0,2,.7],[8,'5',6,.85],[14,'ap',2,.7]]},
  oct:   {name:'オクターブを8分で', v:ev8((st,k)=>[st,k%2?12:0,1.6,k%2?.75:.95])},
  walk:  {name:'ウォーキング（1拍ずつ歩くように）', v:[[0,0,3.8,1],[4,'3',3.8,.8],[8,'5',3.8,.85],[12,'ap',3.8,.8]]},
  boogie:{name:'ブギ（はねて上り下り）', v:[[0,0,2,1],[2,'3',2,.7],[4,'5',2,.85],[6,'6',2,.7],[8,12,2,.9],[10,'6',2,.7],[12,'5',2,.85],[14,'3',2,.7]]},
  sync:  {name:'リズムをずらす（3-3-2）', v:[[0,0,3,1],[3,0,3,.8],[6,0,2,.75],[8,0,3,.9],[11,0,3,.75],[14,'ap',2,.75]]},
  push:  {name:'次のコードを8分早く', v:[[0,0,6,1],[6,0,2,.75],[8,0,2,.85],[10,0,4,.8],[14,'ap',2,.8]]},
  slidein:{name:'スライドで入る', v:[[0,0,6,1],[6,0,2,.75],[8,'5',4,.85],[12,0,2,.8],[14,'ap',2.5,.8]]},   // 小節の終わりの音を次の頭に重ねて、すべって入る
  octslide:{name:'オクターブをすべって移る', v:[[0,0,6,1],[6,0,2.5,.75],[8,12,4.5,.9],[12,0,2,.8],[14,'ap',2,.75]]},
  sub:   {name:'低くうなる（オクターブ下）', v:[[0,'-12',8,1],[8,'-12',6,.9],[14,'-5',2,.75]]},
  funk:  {name:'16分で弾む（ファンク）', v:[[0,0,2,1],[3,12,1,.7],[6,0,1,.7],[7,0,1,.5],[8,0,2,.9],[10,12,1,.7],[11,'5',1,.6],[13,0,1,.7],[14,'ap',2,.8]]},
};
// 「ドラムに合わせる」で使う各ドラムのベースフレーズも、ベースパターンとして選べるようにする（同じものがあれば入れない）
(()=>{ const NAME={dpop:'4つ打ち（オクターブ）', xstick:'しっとり', ballad:'バラード（のばす）', dance:'4つ打ち（裏拍）', neosoul:'ジャジー（すべって入る）', none:'ルートと5度（のびやか）'};
  const have=new Set(Object.values(BASSES).filter(b=>b.v).map(b=>JSON.stringify(b.v)));
  DRUM_ORDER.forEach(k=>{ const v=DRUMS[k].bass; if(!v||have.has(JSON.stringify(v))) return; have.add(JSON.stringify(v));
    BASSES['d_'+k]={name:NAME[k]||DRUMS[k].pro||DRUMS[k].name, v}; }); })();
// ベースのポルタメントは、どのパターンも「音が重なっていたら、あとの音へすべる」に統一（マイ演奏と同じ）
// 鳴らすときは、重なった前の音をあとの音の始まりで切り、あとの音にすべる印をつける（小節の終わり→頭の重なりも）
function bassNorm(list){ if(!list) return list; if(list._n) return list._n;
  const ev=list.map(e=>[e[0],e[1],e[2],e[3],false,false]).sort((a,b)=>a[0]-b[0]);
  ev.forEach(e=>{ const end=e[0]+e[2];
    const nx=ev.find(x=>x!==e && x[0]>e[0]+.01 && x[0]<end-.01) || (end>16.01 ? ev.find(x=>x[0]<end-16-.01) : null);
    if(nx){ nx[4]=true; e[5]=true; e[2]=nx[0]>e[0] ? nx[0]-e[0] : nx[0]+16-e[0]; } });
  ev.glide=list.glide; Object.defineProperty(list,'_n',{value:ev,enumerable:false}); return ev; }
const bassList=dr=>bassNorm((state.pro&&state.bassPat&&state.bassPat!=='auto'&&BASSES[state.bassPat])?BASSES[state.bassPat].v:dr.bass);
const atMap=evs=>{ const m={}; evs.forEach(e=>{ const k=Math.floor(e[0]); (m[k]=m[k]||[]).push(e); }); return m; };
// 場面（前半2拍・3拍目から・1拍だけ・3拍）がないパターンは、1小節の弾き方から自動で作る（小節の途中でコードが変わっても形が崩れないように）
function autoScenes(A){ if(A.sit||!A.ev) return; const cut=(lo,hi)=>A.ev.filter(e=>e[0]>=lo&&e[0]<hi).map(e=>[e[0]-lo,e[1],Math.min(e[2],hi-e[0]),...e.slice(3)]);
  const hA=cut(0,8), hB=cut(8,16), bt=cut(0,4), b3=cut(0,12);
  A.sit={bar:[A.ev.map(e=>[...e])]}; if(hA.length) A.sit.halfA=[hA]; A.sit.halfB=[(hB.length&&hB.some(e=>e[0]===0))?hB:hA]; if(bt.length) A.sit.beat=[bt]; if(b3.length) A.sit.bar3=[b3]; }
for(const k in ARPS) if(!/^my\d+$/.test(k) && k!=='whole') autoScenes(ARPS[k]);
for(const k in ARPS){ const A=ARPS[k]; if(A.ev) prepNx(A.ev); if(A.sit){ for(const kd in A.sit) A.sit[kd]=A.sit[kd].map(evs=>(prepNx(evs),{evs,at:atMap(evs)})); if(!A.ev) A.ev=A.sit.bar[0].evs; }
  ARPS[k].at=atMap(ARPS[k].ev); }

// 音色の名前は、楽器にくわしくない人にもわかる言い方で
const INSTS={piano:'ピアノ',epiano:'エレピ（やわらか）',epcity:'エレピ（シティポップ）',clav:'クラビネット',lofi:'エレピ（ローファイ）',spiano:'ピアノ（8bit）',chipsq:'矩形波（8bit）',chiptri:'三角波（8bit）',chipsaw:'鋸形波（8bit）',organ:'オルガン',
  steel:'アコースティックギター',nylon:'クラシックギター',eguitar:'エレキギター',dist:'ロックギター（歪み）',
  strings3:'バイオリンなど（弦楽器）',brass3:'ラッパ隊（ブラス）',sbrass:'シンセブラス',trumpet:'トランペット',trombone:'トロンボーン',sax:'サックス',horn:'ホルン',glock:'鉄琴（キラキラ）',synth:'電子音（シンセ）',pad:'ふんわり電子音',koto:'琴',shami:'三味線'};
// 音源ファイルの名前（ひずみギターはエレキを、ローファイはエレピを加工して使う。シティポップのエレピは明るい音源 epcity を使う）
const SETOF=i=>({dist:'eguitar',lofi:'eplofi'})[i]||i;   // ローファイのエレピは、レコードノイズを焼きこんだエレピ（eplofi）
// 聴き比べて決めた音（ストリングス＝JCLive、ブラス＝JCLive）。前の候補を選んでいた保存データ・リンクはこちらに置きかえる
const INST_ALIAS={strings:'strings3',strings2:'strings3',brass:'brass3',brass2:'brass3',clav2:'clav',clav3:'clav',sbrass3:'sbrass'};
const fixInst=v=>INST_ALIAS[v]||v;
// アクセント（いちばん上の音）に重ねる音色。キーボード1台のレイヤー／スプリットでできる範囲
// 「アクセントだけ」のパターン（acc_元のキー）：そのパターンのアクセントの行（上3行）だけを取り出したもの。コード2に入れて別の音色で重ねる
//（以前の「いちばん上の音に重ねる音色」は、これをコード2で鳴らす形に置きかえた）
function accOnly(key){ const A=ARPS[key]; if(!A) return null; const nk='acc_'+key; if(ARPS[nk]) return nk;
  const f=evs=>evs.map(e=>[e[0],e[1].filter(x=>x>=6&&x<=8),...e.slice(2)]).filter(e=>e[1].length);
  const ev=f(A.ev||[]), o={name:'重ねる楽器：'+(A.name||key)+'のアクセントだけ', pro:'重ねる楽器：'+(A.pro||A.name||key)+'のアクセントだけ', legato:true, pushBy:A.pushBy, ev, at:atMap(ev)};
  if(A.sit){ o.sit={}; for(const k in A.sit) o.sit[k]=A.sit[k].map(v=>{ const e=f(v.evs); return {evs:e,at:atMap(e)}; }); }
  ARPS[nk]=o; return nk; }
// 古い保存データ・リンクの「重ねる音色」を、コード2の「アクセントだけ」に置きかえる
function migrateLay(o){ const lay=o.lay; delete o.lay; delete o.lay2; if(!lay||o.arp2) return; const k=accOnly(o.arp); if(k){ o.arp2=k; o.inst2=fixInst(lay); } }
const ensureArp2=()=>{ if(/^acc_/.test(state.arp2||'')) accOnly(state.arp2.slice(4)); };
const SYNTH_INST={spiano:'piano',chipsq:'piano',chiptri:'piano',chipsaw:'piano',synth:'synth'};
const isChip=i=>i==='spiano'||/^chip/.test(i||'');   // 8bit（ファミコンのような音）の音色
const instShort=()=>INSTS[state.inst]+(!state.pro&&state.arp2&&ARPS[state.arp2]?'＋'+INSTS[state.inst2||'epiano']:'');
// 音色・ドラムの音のジャンル分け（選ぶ画面で見出しをつけて並べる）
// 音色の分類（1つしか入らない分類は作らない）
const INST_GROUPS=[['ピアノ・鍵盤',['piano','epiano','epcity','clav','lofi','organ']],['ギター',['steel','nylon','eguitar','dist']],
  ['オーケストラ',['strings3','horn','trumpet','trombone','brass3','sax','glock']],['電子音',['synth','pad','sbrass']],['8bit',['spiano','chipsq','chiptri','chipsaw']],['和楽器',['koto','shami']]];
const KIT_GROUPS=[['生ドラム',['std','room','power','brush','city','lofi','orch']],['電子ドラム',['elec','tr808','synth']]];
// 場所を取らないよう、まずジャンルを選び、その中の音色だけを並べる（いま選んでいる音色のジャンルに印）
function groupPick(el, G, names, cur, onPick){
  const gs=G.map(([h,ks])=>[h,ks.filter(k=>names[k])]).filter(g=>g[1].length), used=new Set(gs.flatMap(g=>g[1]));
  const rest=Object.keys(names).filter(k=>!used.has(k)); if(rest.length) gs.push(['そのほか',rest]);
  const g=(gs.find(x=>x[0]===el.dataset.g)||gs.find(x=>x[1].includes(cur))||gs[0])[0];
  el.innerHTML=''; el.classList.add('gpick'); const top=document.createElement('div'), row=document.createElement('div'); top.className='chips gtabs'; row.className='chips'; el.append(top,row);
  chips(top, gs.map(([h,ks])=>[h,h+(ks.includes(cur)?' ●':'')]), g, v=>{ el.dataset.g=v; groupPick(el,G,names,cur,onPick); });
  chips(row, gs.find(x=>x[0]===g)[1].map(k=>[k,names[k]]), cur, onPick); }
const grouped=(G,names)=>{ const out=[], used=new Set(); G.forEach(([h,ks])=>{ const ok=ks.filter(k=>names[k]); if(!ok.length) return; out.push(['#',h]); ok.forEach(k=>{ out.push([k,names[k]]); used.add(k); }); });
  const rest=Object.keys(names).filter(k=>!used.has(k)); if(rest.length){ out.push(['#','そのほか']); rest.forEach(k=>out.push([k,names[k]])); } return out; };
const isSynthInst=()=>state.inst in SYNTH_INST;
// PROのミキサー：ドラム・コード・ベースの音量とミュート・ソロ
const MIX_CH0=['arp','arp2','drum','bass'], mixChs=()=>[...MIX_CH0, ...(state.pro?(state.xtr||[]).map(t=>t.id):[])];
function mixOf(ch){ if(!state.mix) state.mix={}; return state.mix[ch]||(state.mix[ch]={v:1,m:false,s:false}); }
function applyMix(){ if(!ctx||!drumBus) return;
  const pro=!!state.pro, solo=pro&&mixChs().some(c=>mixOf(c).s), t=ctx.currentTime, T=(p,v)=>p.setTargetAtTime(v,t,.03);
  const st=styleNow()||{}, sm=st.mix, sfx=(typeof STYLE_FX!=='undefined'&&STYLE_FX[st.id])||{};
  if(ECHO) T(ECHO.d.delayTime, Math.min(1.5,60/state.bpm*.75));   // エコーは付点8分
  mixChs().forEach(c=>{ const ch=CHAN[c]; if(!ch) return; const x=mixOf(c);
    // ビギナーは伴奏スタイルの音量バランスとミックス、PRO はトラックごとの設定
    const f = pro ? x : (sfx[c]||{});
    const g = !pro ? (sm&&sm[c]!=null?sm[c]:1) : (c==='drum'&&state.drumOff) ? 0 : solo ? (x.s?x.v:0) : (x.m?0:x.v);
    T(ch.vol.gain,g); T(ch.pan.pan,f.pan||0); T(ch.send.gain,f.rev||0); T(ch.esend.gain,(f.echo||0)*.8);
    T(ch.lo.gain,(f.lo||0)*9); T(ch.hi.gain,(f.hi||0)*9);
    const k=f.comp||0; T(ch.comp.threshold,-k*26); T(ch.comp.ratio,1+k*5); T(ch.mk.gain,Math.pow(10,k*7/20)); });
  document.querySelectorAll('.mix').forEach(el=>{ const x=mixOf(el.dataset.ch);
    el.querySelector('[data-k="m"]').setAttribute('aria-pressed',x.m); el.querySelector('[data-k="s"]').setAttribute('aria-pressed',x.s);
    el.querySelector('input').value=x.v; el.closest('.lane').classList.toggle('silent', pro && (solo?!x.s:x.m)); });
}
const BASS_SNDS={bass:'エレキベース',ubass:'ウッドベース（コントラバス）',slap3:'はじくベース（スラップ）',sbass:'電子音のベース',cbass:'ベース（8bit）'};   // はじくベースは聴き比べて JCLive に決定
const BASS_ALIAS={slap:'slap3',slap2:'slap3',slap4:'slap3',slap5:'slap3',slap6:'slap3'}; const fixBass=v=>BASS_ALIAS[v]||v;
const BASS_FX={bass:{gain:1,cut:2200},slap3:{gain:.8,cut:1900,loop:true},ubass:{gain:1.15,cut:1800},sbass:{gain:.75,cut:3200,loop:true},cbass:{gain:1,cut:0}};
const KITS={city:'シティポップのドラム',orch:'オーケストラの太鼓',std:'ふつうのドラム',room:'よく響くドラム',power:'力強いドラム',brush:'やさしいドラム（ブラシ）',lofi:'こもったドラム',elec:'電子ドラム',tr808:'ヒップホップ風（808）',synth:'ピコピコドラム（8bit）'};
// 有名なコード進行の名前。数字＝ダイアトニック（0=Ⅰ 1=Ⅱm 2=Ⅲm 3=Ⅳ 4=Ⅴ 5=Ⅵm 6=Ⅶm-5）、文字＝それ以外のコード（CHROM）
const CHROM={III7:{o:4,q:'maj',x:'7'}, bVII:{o:10,q:'maj',x:''}, bVI:{o:8,q:'maj',x:''}, IVm:{o:5,q:'m',x:''}, Vm:{o:7,q:'m',x:''}, II7:{o:2,q:'maj',x:'7'}, VI7:{o:9,q:'maj',x:'7'}};
// コード進行ライブラリ（Key C で書いたものを、キーからの度数で持つ）。c=分類 q=元のコードの並び p=マス segs=3拍目からのコード
const LIB_DATA=[{"c":"I","name":"まっすぐ明るい","tags":["明るい","定番"],"p":[0,0,3,4],"q":[0,3,4],"alias":"スリーコード"},{"c":"I","name":"素直で温かい","tags":["明るい","やさしい"],"p":[0,3,5,4],"q":[0,3,5,4]},{"c":"I","name":"背中を押す前向きさ","tags":["前向き","爽やか"],"p":[{"o":0,"q":"maj","x":"","b":4},3,4,5],"q":[{"o":0,"q":"maj","x":"","b":4},3,4,5]},{"c":"I","name":"晴れやかなフィナーレ","tags":["壮大","明るい"],"p":[0,{"o":0,"q":"maj","x":"","b":4},{"o":0,"q":"sus4","x":"","b":5},{"o":0,"q":"sus4","x":"","b":7}],"q":[0,{"o":0,"q":"maj","x":"","b":4},{"o":0,"q":"sus4","x":"","b":5},{"o":0,"q":"sus4","x":"","b":7}],"alias":"大団円"},{"c":"I","name":"きらめく余韻","tags":["おしゃれ","切ない"],"p":[0,{"o":5,"q":"m","x":"6","b":0},0,{"o":5,"q":"m","x":"6","b":0}],"q":[0,{"o":5,"q":"m","x":"6","b":0}]},{"c":"I","name":"ポップパンク進行","tags":["定番","明るい","切ない"],"p":[0,4,5,3],"q":[0,4,5,3],"alias":"アクシス進行"},{"c":"I","name":"サビで突き抜ける","tags":["力強い","明るい"],"p":[0,4,3,4],"q":[0,4,3,4]},{"c":"I","name":"カノン進行","tags":["定番","穏やか"],"p":[0,4,5,2,3,0,3,4],"q":[0,4,5,2,3,0,3,4]},{"c":"I","name":"まばゆく広がる","tags":["壮大","ドラマチック"],"p":[0,4,{"o":10,"q":"maj","x":"","b":null},3,{"o":8,"q":"maj","x":"","b":null},0,{"o":2,"q":"maj","x":"","b":null},4],"q":[0,4,{"o":10,"q":"maj","x":"","b":null},3,{"o":8,"q":"maj","x":"","b":null},0,{"o":2,"q":"maj","x":"","b":null},4]},{"c":"I","name":"美しいカノン進行","tags":["穏やか","やさしい"],"p":[0,{"o":7,"q":"maj","x":"","b":11},5,{"o":4,"q":"m","x":"","b":7},3,{"o":0,"q":"maj","x":"","b":4},1,4],"q":[0,{"o":7,"q":"maj","x":"","b":11},5,{"o":4,"q":"m","x":"","b":7},3,{"o":0,"q":"maj","x":"","b":4},1,4]},{"c":"I","name":"イチロクニーゴー","tags":["定番","レトロ"],"p":[0,5,1,4],"q":[0,5,1,4],"alias":"循環コード"},{"c":"I","name":"50年代進行","tags":["定番","レトロ"],"p":[0,5,3,4],"q":[0,5,3,4]},{"c":"I","name":"甘くてアンニュイ","tags":["おしゃれ","ドラマチック"],"p":[0,{"o":9,"q":"maj","x":"","b":1},1,{"o":5,"q":"m","x":"","b":null},{"o":0,"q":"maj","x":"","b":7},{"o":2,"q":"maj","x":"","b":6},3,4],"q":[0,{"o":9,"q":"maj","x":"","b":1},1,{"o":5,"q":"m","x":"","b":null},{"o":0,"q":"maj","x":"","b":7},{"o":2,"q":"maj","x":"","b":6},3,4]},{"c":"I","name":"深夜の踏切","tags":["エモい","切ない"],"p":[{"o":0,"q":"maj","x":"add9","b":null},{"o":9,"q":"m","x":"7","b":null},4,3],"q":[{"o":0,"q":"maj","x":"add9","b":null},{"o":9,"q":"m","x":"7","b":null},4,3]},{"c":"I","name":"70年代のR&B","tags":["おしゃれ","都会的"],"p":[{"o":0,"q":"maj","x":"M7","b":null},{"o":8,"q":"maj","x":"M7","b":null},{"o":5,"q":"m","x":"7","b":null},{"o":10,"q":"maj","x":"7","b":null}],"q":[{"o":0,"q":"maj","x":"M7","b":null},{"o":8,"q":"maj","x":"M7","b":null},{"o":5,"q":"m","x":"7","b":null},{"o":10,"q":"maj","x":"7","b":null}]},{"c":"I","name":"モノクロの切なさ","tags":["切ない","ドラマチック"],"p":[0,{"o":11,"q":"m-5","x":"7","b":null},5,4],"q":[0,{"o":11,"q":"m-5","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":null},5,4],"segs":{"1":[{"beat":3,"v":{"o":4,"q":"maj","x":"7","b":null}}]}},{"c":"I","name":"アニソン進行","tags":["エモい","ドラマチック"],"p":[0,{"o":11,"q":"m-5","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null},{"o":7,"q":"m","x":"7","b":null},{"o":5,"q":"maj","x":"M7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":2,"q":"m","x":"7","b":null},{"o":5,"q":"maj","x":"","b":7}],"q":[0,{"o":11,"q":"m-5","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null},{"o":7,"q":"m","x":"7","b":null},{"o":0,"q":"maj","x":"7","b":null},{"o":5,"q":"maj","x":"M7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":2,"q":"m","x":"7","b":null},{"o":5,"q":"maj","x":"","b":7},4],"segs":{"1":[{"beat":3,"v":{"o":4,"q":"maj","x":"7","b":null}}],"3":[{"beat":3,"v":{"o":0,"q":"maj","x":"7","b":null}}],"7":[{"beat":3,"v":4}]}},{"c":"I","name":"幻想の世界へ","tags":["不思議","壮大"],"p":[0,{"o":10,"q":"maj","x":"","b":null},{"o":8,"q":"maj","x":"","b":null},{"o":10,"q":"maj","x":"","b":null}],"q":[0,{"o":10,"q":"maj","x":"","b":null},{"o":8,"q":"maj","x":"","b":null},{"o":10,"q":"maj","x":"","b":null}]},{"c":"I","name":"優雅で上品","tags":["おしゃれ","やさしい"],"p":[{"o":0,"q":"maj","x":"M7","b":null},{"o":1,"q":"m-5","x":"dim7","b":null},{"o":2,"q":"m","x":"7","b":null},{"o":7,"q":"maj","x":"7","b":null}],"q":[{"o":0,"q":"maj","x":"M7","b":null},{"o":1,"q":"m-5","x":"dim7","b":null},{"o":2,"q":"m","x":"7","b":null},{"o":7,"q":"maj","x":"7","b":null}]},{"c":"I","name":"のんびりした日常","tags":["穏やか","やさしい"],"p":[0,{"o":2,"q":"m","x":"7","b":null},{"o":0,"q":"maj","x":"","b":4},3],"q":[0,{"o":2,"q":"m","x":"7","b":null},{"o":0,"q":"maj","x":"","b":4},3]},{"c":"I","name":"ふわっと切ない","tags":["切ない","穏やか"],"p":[0,{"o":4,"q":"m","x":"","b":11},5,3],"q":[0,{"o":4,"q":"m","x":"","b":11},5,3]},{"c":"I","name":"すみれ色の夕暮れ","tags":["おしゃれ","切ない"],"p":[0,{"o":4,"q":"m-5","x":"7","b":null},{"o":2,"q":"m","x":"7","b":null},{"o":11,"q":"m","x":"7","b":null}],"q":[0,{"o":4,"q":"m-5","x":"7","b":null},{"o":9,"q":"maj","x":"7","b":null},{"o":2,"q":"m","x":"7","b":null},{"o":11,"q":"m","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":null}],"segs":{"1":[{"beat":3,"v":{"o":9,"q":"maj","x":"7","b":null}}],"3":[{"beat":3,"v":{"o":4,"q":"maj","x":"7","b":null}}]}},{"c":"I","name":"イエスタデイ進行","tags":["エモい","力強い"],"p":[0,{"o":4,"q":"maj","x":"","b":null},5,4],"q":[0,{"o":4,"q":"maj","x":"","b":null},5,4]},{"c":"I","name":"ロマンチックな告白","tags":["おしゃれ","ドラマチック"],"p":[0,{"o":0,"q":"maj","x":"M7","b":11},{"o":0,"q":"maj","x":"7","b":10},{"o":9,"q":"maj","x":"7","b":null},1,{"o":1,"q":"aug","x":"","b":null},{"o":2,"q":"m","x":"7","b":0},4],"q":[0,{"o":0,"q":"maj","x":"M7","b":11},{"o":0,"q":"maj","x":"7","b":10},{"o":9,"q":"maj","x":"7","b":null},1,{"o":1,"q":"aug","x":"","b":null},{"o":2,"q":"m","x":"7","b":0},4]},{"c":"I","name":"じんわり温かい","tags":["穏やか","おしゃれ"],"p":[0,{"o":0,"q":"aug","x":"","b":null},{"o":9,"q":"m","x":"","b":0},{"o":0,"q":"maj","x":"7","b":null}],"q":[0,{"o":0,"q":"aug","x":"","b":null},{"o":9,"q":"m","x":"","b":0},{"o":0,"q":"maj","x":"7","b":null}]},{"c":"I","name":"胸が熱くなる","tags":["エモい","おしゃれ"],"p":[0,{"o":0,"q":"aug","x":"","b":6},{"o":5,"q":"maj","x":"M7","b":null},4],"q":[0,{"o":0,"q":"aug","x":"","b":6},{"o":5,"q":"maj","x":"M7","b":null},4]},{"c":"I","name":"壮大な幕開け","tags":["壮大","不思議"],"p":[{"o":0,"q":"sus4","x":"","b":null},{"o":0,"q":"sus4","x":"","b":1},{"o":0,"q":"sus4","x":"","b":3},{"o":0,"q":"sus4","x":"","b":5}],"q":[{"o":0,"q":"sus4","x":"","b":null},{"o":0,"q":"sus4","x":"","b":1},{"o":0,"q":"sus4","x":"","b":3},{"o":0,"q":"sus4","x":"","b":5},{"o":0,"q":"sus4","x":"","b":7}],"segs":{"3":[{"beat":3,"v":{"o":0,"q":"sus4","x":"","b":7}}]}},{"c":"I","name":"遊び心のあるファンファーレ","tags":["壮大","明るい"],"p":[0,{"o":7,"q":"maj","x":"","b":0},{"o":5,"q":"maj","x":"","b":0},{"o":8,"q":"maj","x":"","b":0}],"q":[0,{"o":7,"q":"maj","x":"","b":0},{"o":5,"q":"maj","x":"","b":0},{"o":8,"q":"maj","x":"","b":0},{"o":10,"q":"maj","x":"","b":0}],"segs":{"3":[{"beat":3,"v":{"o":10,"q":"maj","x":"","b":0}}]}},{"c":"I","name":"高まる緊張","tags":["壮大","不思議"],"p":[0,{"o":1,"q":"maj","x":"","b":0},{"o":2,"q":"maj","x":"","b":0},{"o":3,"q":"maj","x":"","b":0}],"q":[0,{"o":1,"q":"maj","x":"","b":0},{"o":2,"q":"maj","x":"","b":0},{"o":3,"q":"maj","x":"","b":0}]},{"c":"I","name":"ブルース進行","tags":["ブルース","力強い"],"p":[{"o":0,"q":"maj","x":"7","b":null},{"o":5,"q":"maj","x":"7","b":null},{"o":0,"q":"maj","x":"7","b":null},{"o":5,"q":"maj","x":"7","b":null},{"o":7,"q":"maj","x":"7","b":null},{"o":5,"q":"maj","x":"7","b":null},{"o":0,"q":"maj","x":"7","b":null},{"o":7,"q":"maj","x":"7","b":null}],"q":[{"o":0,"q":"maj","x":"7","b":null},{"o":5,"q":"maj","x":"7","b":null},{"o":0,"q":"maj","x":"7","b":null},{"o":5,"q":"maj","x":"7","b":null},{"o":7,"q":"maj","x":"7","b":null},{"o":5,"q":"maj","x":"7","b":null},{"o":0,"q":"maj","x":"7","b":null},{"o":7,"q":"maj","x":"7","b":null}]},{"c":"IV","name":"王道進行","tags":["定番","エモい","切ない"],"p":[3,4,2,5],"q":[3,4,2,5],"alias":"J-POP進行"},{"c":"IV","name":"YOASOBI進行","tags":["エモい","ドラマチック"],"p":[3,4,{"o":4,"q":"m","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null},{"o":2,"q":"m","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":null},5,{"o":7,"q":"m","x":"7","b":null}],"q":[3,4,{"o":4,"q":"m","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null},{"o":2,"q":"m","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":null},5,{"o":7,"q":"m","x":"7","b":null},{"o":0,"q":"maj","x":"7","b":null}],"segs":{"7":[{"beat":3,"v":{"o":0,"q":"maj","x":"7","b":null}}]}},{"c":"IV","name":"涙を誘う","tags":["切ない","エモい"],"p":[3,4,{"o":8,"q":"m-5","x":"","b":null},5],"q":[3,4,{"o":8,"q":"m-5","x":"","b":null},5]},{"c":"IV","name":"どこにでも合う万能","tags":["明るい","前向き"],"p":[3,4,5,0],"q":[3,4,5,0]},{"c":"IV","name":"最強の盛り上がり","tags":["力強い","エモい"],"p":[3,5,5,3],"q":[3,4,5,5,4,3],"segs":{"0":[{"beat":3,"v":4}],"2":[{"beat":3,"v":4}]}},{"c":"IV","name":"解き放たれる","tags":["明るい","壮大"],"p":[3,4,{"o":9,"q":"maj","x":"","b":null},{"o":9,"q":"maj","x":"","b":null}],"q":[3,4,{"o":9,"q":"maj","x":"","b":null}]},{"c":"IV","name":"ぐっとくるエモさ","tags":["エモい","前向き"],"p":[3,4,0,{"o":4,"q":"maj","x":"","b":null}],"q":[3,4,0,{"o":4,"q":"maj","x":"","b":null}]},{"c":"IV","name":"甘いひととき","tags":["穏やか","やさしい"],"p":[3,5,1,0],"q":[3,5,1,0]},{"c":"IV","name":"心の中の葛藤","tags":["ドラマチック","不思議"],"p":[3,5,{"o":0,"q":"m","x":"","b":null},{"o":7,"q":"maj","x":"","b":2},{"o":10,"q":"m","x":"","b":1},{"o":5,"q":"maj","x":"","b":0},{"o":11,"q":"m-5","x":"dim7","b":null},{"o":4,"q":"maj","x":"7","b":8}],"q":[3,5,{"o":0,"q":"m","x":"","b":null},{"o":7,"q":"maj","x":"","b":2},{"o":10,"q":"m","x":"","b":1},{"o":5,"q":"maj","x":"","b":0},{"o":11,"q":"m-5","x":"dim7","b":null},{"o":4,"q":"maj","x":"7","b":8}]},{"c":"IV","name":"邦楽ポップパンク進行","tags":["定番","爽やか"],"p":[3,0,4,5],"q":[3,0,4,5]},{"c":"IV","name":"おやすみ前のチル","tags":["おしゃれ","浮遊感"],"p":[{"o":5,"q":"maj","x":"M7","b":null},{"o":0,"q":"maj","x":"M7","b":null},{"o":4,"q":"maj","x":"","b":6},{"o":4,"q":"m","x":"","b":9}],"q":[{"o":5,"q":"maj","x":"M7","b":null},{"o":0,"q":"maj","x":"M7","b":null},{"o":4,"q":"maj","x":"","b":6},{"o":4,"q":"m","x":"","b":9}]},{"c":"IV","name":"丸サ進行","tags":["定番","おしゃれ"],"p":[{"o":5,"q":"maj","x":"M7","b":null},{"o":4,"q":"maj","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null},{"o":0,"q":"maj","x":"7","b":null}],"q":[{"o":5,"q":"maj","x":"M7","b":null},{"o":4,"q":"maj","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null},{"o":0,"q":"maj","x":"7","b":null}]},{"c":"IV","name":"丸サ進行２","tags":["おしゃれ"],"p":[{"o":5,"q":"maj","x":"M7","b":null},{"o":4,"q":"maj","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null},{"o":7,"q":"m","x":"7","b":null}],"q":[{"o":5,"q":"maj","x":"M7","b":null},{"o":4,"q":"maj","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null},{"o":7,"q":"m","x":"7","b":null},{"o":0,"q":"maj","x":"7","b":null}],"segs":{"3":[{"beat":3,"v":{"o":0,"q":"maj","x":"7","b":null}}]}},{"c":"IV","name":"丸サ進行３","tags":["おしゃれ"],"p":[{"o":5,"q":"maj","x":"M7","b":null},{"o":4,"q":"maj","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null},{"o":2,"q":"maj","x":"7","b":null}],"q":[{"o":5,"q":"maj","x":"M7","b":null},{"o":4,"q":"maj","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null},{"o":2,"q":"maj","x":"7","b":null}]},{"c":"IV","name":"一番星のきらめき","tags":["おしゃれ","エモい"],"p":[{"o":5,"q":"maj","x":"M7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null},0],"q":[{"o":5,"q":"maj","x":"M7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null},0]},{"c":"IV","name":"ゲーム音楽の香り","tags":["おしゃれ","浮遊感"],"p":[{"o":5,"q":"maj","x":"M7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":3,"q":"maj","x":"M7","b":null},{"o":2,"q":"m","x":"7","b":null}],"q":[{"o":5,"q":"maj","x":"M7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":3,"q":"maj","x":"M7","b":null},{"o":2,"q":"m","x":"7","b":null}]},{"c":"IV","name":"ちょっと珍しい上品さ","tags":["おしゃれ","やさしい"],"p":[{"o":5,"q":"maj","x":"M7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":3,"q":"m-5","x":"dim7","b":null,"sp":"b"},{"o":2,"q":"m","x":"7","b":null}],"q":[{"o":5,"q":"maj","x":"M7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":3,"q":"m-5","x":"dim7","b":null,"sp":"b"},{"o":2,"q":"m","x":"7","b":null}]},{"c":"IV","name":"夜のホテルラウンジ","tags":["おしゃれ","浮遊感"],"p":[{"o":5,"q":"maj","x":"M7","b":null},{"o":0,"q":"maj","x":"add9","b":4},{"o":2,"q":"m","x":"7","b":null},{"o":4,"q":"m","x":"7","b":null}],"q":[{"o":5,"q":"maj","x":"M7","b":null},{"o":0,"q":"maj","x":"add9","b":4},{"o":2,"q":"m","x":"7","b":null},{"o":4,"q":"m","x":"7","b":null}]},{"c":"IV","name":"木漏れ日","tags":["切ない","おしゃれ"],"p":[{"o":5,"q":"maj","x":"M7","b":null},{"o":5,"q":"m","x":"M7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":7,"q":"m","x":"7","b":9}],"q":[{"o":5,"q":"maj","x":"M7","b":null},{"o":5,"q":"m","x":"M7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":7,"q":"m","x":"7","b":9}]},{"c":"IV","name":"サビ前の高まり","tags":["前向き","ドラマチック"],"p":[3,{"o":6,"q":"m-5","x":"","b":null},4,{"o":8,"q":"m-5","x":"","b":null}],"q":[3,{"o":6,"q":"m-5","x":"","b":null},4,{"o":8,"q":"m-5","x":"","b":null}]},{"c":"IV","name":"夢の中の浮遊感","tags":["浮遊感","爽やか"],"p":[3,{"o":7,"q":"maj","x":"","b":5},3,{"o":7,"q":"maj","x":"","b":5}],"q":[3,{"o":7,"q":"maj","x":"","b":5}]},{"c":"IV","name":"メロウな王道進行","tags":["おしゃれ","エモい"],"p":[{"o":5,"q":"maj","x":"M7","b":null},{"o":7,"q":"maj","x":"7","b":5},{"o":4,"q":"m","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null}],"q":[{"o":5,"q":"maj","x":"M7","b":null},{"o":7,"q":"maj","x":"7","b":5},{"o":4,"q":"m","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null}]},{"c":"IV","name":"快晴の空","tags":["爽やか","浮遊感"],"p":[{"o":0,"q":"maj","x":"","b":5},{"o":7,"q":"sus4","x":"","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":7,"q":"maj","x":"","b":9}],"q":[{"o":0,"q":"maj","x":"","b":5},{"o":7,"q":"sus4","x":"","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":7,"q":"maj","x":"","b":9}]},{"c":"IV","name":"和の情緒","tags":["和風","浮遊感"],"p":[{"o":5,"q":"maj","x":"6","b":null},{"o":7,"q":"maj","x":"6","b":null},{"o":9,"q":"sus4","x":"7","b":null},{"o":4,"q":"sus4","x":"","b":null}],"q":[{"o":5,"q":"maj","x":"6","b":null},{"o":7,"q":"maj","x":"6","b":null},{"o":9,"q":"sus4","x":"7","b":null},{"o":4,"q":"sus4","x":"","b":null}]},{"c":"IV","name":"追いかける王道","tags":["おしゃれ","ドラマチック"],"p":[{"o":5,"q":"maj","x":"M7","b":null},{"o":10,"q":"maj","x":"7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":4,"q":"m-5","x":"dim7","b":9}],"q":[{"o":5,"q":"maj","x":"M7","b":null},{"o":10,"q":"maj","x":"7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":4,"q":"m-5","x":"dim7","b":9}]},{"c":"IV","name":"ドレスアップした王道","tags":["おしゃれ"],"p":[{"o":5,"q":"maj","x":"M7","b":null},{"o":0,"q":"aug","x":"","b":10},{"o":4,"q":"m","x":"7","b":9},{"o":2,"q":"maj","x":"","b":6}],"q":[{"o":5,"q":"maj","x":"M7","b":null},{"o":0,"q":"aug","x":"","b":10},{"o":4,"q":"m","x":"7","b":9},{"o":2,"q":"maj","x":"","b":6}]},{"c":"IV","name":"澄みきった美しさ","tags":["おしゃれ","穏やか"],"p":[{"o":5,"q":"maj","x":"M7","b":null},{"o":11,"q":"m-5","x":"7","b":5},{"o":4,"q":"m","x":"7","b":null},{"o":4,"q":"m-5","x":"dim7","b":null},{"o":2,"q":"m","x":"7","b":null},{"o":7,"q":"maj","x":"7","b":2},{"o":0,"q":"maj","x":"M7","b":null},{"o":0,"q":"maj","x":"6","b":null}],"q":[{"o":5,"q":"maj","x":"M7","b":null},{"o":11,"q":"m-5","x":"7","b":5},{"o":4,"q":"m","x":"7","b":null},{"o":4,"q":"m-5","x":"dim7","b":null},{"o":2,"q":"m","x":"7","b":null},{"o":7,"q":"maj","x":"7","b":2},{"o":0,"q":"maj","x":"M7","b":null},{"o":0,"q":"maj","x":"6","b":null}]},{"c":"VIm","name":"小室進行","tags":["定番","切ない"],"p":[5,3,4,0],"q":[5,3,4,0]},{"c":"VIm","name":"洋楽ポップパンク進行","tags":["定番","エモい"],"p":[5,3,0,4],"q":[5,3,0,4],"alias":"洋楽進行"},{"c":"VIm","name":"どんな曲にも合うマイナー","tags":["力強い","切ない"],"p":[5,4,3,4],"q":[5,4,3,4]},{"c":"VIm","name":"燃え上がる情熱","tags":["力強い","前向き"],"p":[5,4,3,0],"q":[5,4,3,0]},{"c":"VIm","name":"しっとり沈んでいく","tags":["切ない","ドラマチック"],"p":[5,{"o":8,"q":"aug","x":"","b":null},{"o":0,"q":"maj","x":"","b":7},{"o":6,"q":"m-5","x":"7","b":null}],"q":[5,{"o":8,"q":"aug","x":"","b":null},{"o":0,"q":"maj","x":"","b":7},{"o":6,"q":"m-5","x":"7","b":null}]},{"c":"VIm","name":"キュートでおしゃれ","tags":["おしゃれ","かわいい"],"p":[{"o":9,"q":"m","x":"7","b":null},{"o":8,"q":"m","x":"7","b":null},{"o":7,"q":"m","x":"7","b":null},{"o":0,"q":"maj","x":"7","b":null}],"q":[{"o":9,"q":"m","x":"7","b":null},{"o":8,"q":"m","x":"7","b":null},{"o":7,"q":"m","x":"7","b":null},{"o":0,"q":"maj","x":"7","b":null}]},{"c":"VIm","name":"洋楽っぽい切なさ","tags":["エモい","切ない"],"p":[5,0,4,3],"q":[5,0,4,3]},{"c":"VIm","name":"シティポップ進行","tags":["おしゃれ","切ない"],"p":[5,0,3,{"o":4,"q":"maj","x":"","b":null}],"q":[5,0,3,{"o":4,"q":"maj","x":"","b":null}]},{"c":"VIm","name":"ファンタジー進行","tags":["不思議","前向き"],"p":[5,{"o":2,"q":"maj","x":"","b":null},3,4],"q":[5,{"o":2,"q":"maj","x":"","b":null},3,4]},{"c":"VIm","name":"ハッピーな都会","tags":["おしゃれ","前向き"],"p":[{"o":9,"q":"m","x":"7","b":null},{"o":2,"q":"maj","x":"7","b":null},{"o":5,"q":"maj","x":"","b":7},0],"q":[{"o":9,"q":"m","x":"7","b":null},{"o":2,"q":"maj","x":"7","b":null},{"o":5,"q":"maj","x":"","b":7},0]},{"c":"VIm","name":"パイレーツ進行","tags":["情熱的","定番"],"p":[5,1,{"o":4,"q":"maj","x":"","b":null},5],"q":[5,1,{"o":4,"q":"maj","x":"","b":null},5]},{"c":"VIm","name":"カフェの午後","tags":["おしゃれ","都会的"],"p":[{"o":9,"q":"m","x":"9","b":null},{"o":2,"q":"m","x":"7","b":null},{"o":9,"q":"m","x":"9","b":null},{"o":2,"q":"m","x":"7","b":null}],"q":[{"o":9,"q":"m","x":"9","b":null},{"o":2,"q":"m","x":"7","b":null},{"o":4,"q":"m","x":"7","b":null}],"segs":{"1":[{"beat":3,"v":{"o":4,"q":"m","x":"7","b":null}}],"3":[{"beat":3,"v":{"o":4,"q":"m","x":"7","b":null}}]}},{"c":"VIm","name":"小室進行３","tags":["切ない","力強い"],"p":[5,1,4,0],"q":[5,1,4,0]},{"c":"VIm","name":"クラシック進行","tags":["クラシック","ドラマチック"],"p":[5,1,4,0,3,6,{"o":4,"q":"maj","x":"","b":null},{"o":4,"q":"maj","x":"","b":null}],"q":[5,1,4,0,3,6,{"o":4,"q":"maj","x":"","b":null}]},{"c":"VIm","name":"胸に刺さる切なさ","tags":["切ない","エモい"],"p":[5,{"o":2,"q":"m","x":"7","b":null},3,4],"q":[5,{"o":2,"q":"m","x":"7","b":null},3,4]},{"c":"VIm","name":"切なさがあふれる","tags":["切ない","前向き"],"p":[5,2,3,0],"q":[5,2,3,4,0],"segs":{"2":[{"beat":3,"v":4}]}},{"c":"VIm","name":"パラレルワールド","tags":["ドラマチック","不思議"],"p":[{"o":9,"q":"maj","x":"","b":null},3,1,{"o":4,"q":"maj","x":"","b":null}],"q":[{"o":9,"q":"maj","x":"","b":null},3,1,{"o":4,"q":"maj","x":"","b":null}]},{"c":"VIm","name":"重厚なモダンメタル","tags":["力強い","ロック"],"p":[{"o":9,"q":"5","x":"add9","b":null},{"o":5,"q":"5","x":"add9","b":null},{"o":3,"q":"5","x":"add9","b":null},{"o":0,"q":"5","x":"add9","b":null}],"q":[{"o":9,"q":"5","x":"add9","b":null},{"o":5,"q":"5","x":"add9","b":null},{"o":3,"q":"5","x":"add9","b":null},{"o":0,"q":"5","x":"add9","b":null}]},{"c":"VIm","name":"ミステリー小説","tags":["不思議","ドラマチック"],"p":[5,{"o":5,"q":"maj","x":"7","b":null},5,{"o":5,"q":"maj","x":"7","b":null}],"q":[5,{"o":5,"q":"maj","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":null}],"segs":{"1":[{"beat":3,"v":{"o":4,"q":"maj","x":"7","b":null}}],"3":[{"beat":3,"v":{"o":4,"q":"maj","x":"7","b":null}}]}},{"c":"VIm","name":"スパイ進行","tags":["不思議","切ない"],"p":[5,{"o":5,"q":"maj","x":"","b":9},{"o":6,"q":"m-5","x":"","b":9},{"o":9,"q":"m","x":"7","b":null}],"q":[5,{"o":5,"q":"maj","x":"","b":9},{"o":6,"q":"m-5","x":"","b":9},{"o":9,"q":"m","x":"7","b":null}]},{"c":"VIm","name":"革命の始まり","tags":["ドラマチック","壮大"],"p":[5,{"o":5,"q":"maj","x":"","b":9},5,{"o":11,"q":"maj","x":"7","b":9},{"o":4,"q":"maj","x":"","b":8},{"o":4,"q":"m-5","x":"","b":7},{"o":2,"q":"maj","x":"","b":6},{"o":2,"q":"m","x":"","b":5}],"q":[5,{"o":5,"q":"maj","x":"","b":9},5,{"o":11,"q":"maj","x":"7","b":9},{"o":4,"q":"maj","x":"","b":8},{"o":4,"q":"m-5","x":"","b":7},{"o":2,"q":"maj","x":"","b":6},{"o":2,"q":"m","x":"","b":5},{"o":9,"q":"maj","x":"","b":4}],"segs":{"7":[{"beat":3,"v":{"o":9,"q":"maj","x":"","b":4}}]}},{"c":"VIm","name":"困難に立ち向かう","tags":["前向き","ドラマチック"],"p":[5,{"o":7,"q":"maj","x":"","b":11},0,{"o":4,"q":"sus4","x":"","b":null}],"q":[5,{"o":7,"q":"maj","x":"","b":11},0,{"o":4,"q":"sus4","x":"","b":null},{"o":4,"q":"maj","x":"","b":null}],"segs":{"3":[{"beat":3,"v":{"o":4,"q":"maj","x":"","b":null}}]}},{"c":"VIm","name":"聖なる響き","tags":["壮大","ドラマチック"],"p":[5,{"o":7,"q":"maj","x":"","b":11},4,0,3,{"o":11,"q":"m-5","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":8}],"q":[5,{"o":7,"q":"maj","x":"","b":11},4,0,3,{"o":11,"q":"m-5","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":8}]},{"c":"VIm","name":"近未来都市","tags":["浮遊感","不思議"],"p":[5,{"o":7,"q":"maj","x":"","b":9},{"o":5,"q":"maj","x":"","b":9},{"o":4,"q":"m","x":"","b":9}],"q":[5,{"o":7,"q":"maj","x":"","b":9},{"o":5,"q":"maj","x":"","b":9},{"o":4,"q":"m","x":"","b":9}]},{"c":"VIm","name":"ついに自由へ","tags":["エモい","浮遊感"],"p":[5,{"o":4,"q":"maj","x":"7","b":8},{"o":5,"q":"maj","x":"M7","b":null},{"o":2,"q":"m","x":"9","b":null}],"q":[5,{"o":4,"q":"maj","x":"7","b":8},{"o":5,"q":"maj","x":"M7","b":null},{"o":2,"q":"m","x":"9","b":null},{"o":7,"q":"sus4","x":"","b":null}],"segs":{"3":[{"beat":3,"v":{"o":7,"q":"sus4","x":"","b":null}}]}},{"c":"VIm","name":"ディストピア","tags":["ドラマチック","不思議"],"p":[5,{"o":11,"q":"maj","x":"","b":null},1,{"o":4,"q":"maj","x":"","b":null}],"q":[5,{"o":11,"q":"maj","x":"","b":null},1,{"o":4,"q":"maj","x":"","b":null}]},{"c":"VIm","name":"華やかな舞踏会","tags":["クラシック","ドラマチック"],"p":[5,{"o":11,"q":"maj","x":"","b":9},{"o":11,"q":"m-5","x":"","b":9},5,{"o":0,"q":"maj","x":"","b":7},{"o":6,"q":"m-5","x":"","b":null},{"o":5,"q":"b5","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":null}],"q":[5,{"o":11,"q":"maj","x":"","b":9},{"o":11,"q":"m-5","x":"","b":9},5,{"o":0,"q":"maj","x":"","b":7},{"o":6,"q":"m-5","x":"","b":null},{"o":5,"q":"b5","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":null}]},{"c":"VIm","name":"燃えさかる危機","tags":["不思議","ドラマチック"],"p":[5,{"o":3,"q":"m-5","x":"","b":null},{"o":6,"q":"m-5","x":"","b":null},{"o":4,"q":"maj","x":"","b":null}],"q":[5,{"o":3,"q":"m-5","x":"","b":null},{"o":6,"q":"m-5","x":"","b":null},{"o":4,"q":"maj","x":"","b":null}]},{"c":"VIm","name":"外宇宙への旅","tags":["不思議","壮大"],"p":[5,{"o":3,"q":"m","x":"","b":null},5,{"o":5,"q":"m","x":"","b":null},5,{"o":3,"q":"m","x":"","b":null},{"o":10,"q":"m","x":"","b":null},1],"q":[5,{"o":3,"q":"m","x":"","b":null},5,{"o":5,"q":"m","x":"","b":null},5,{"o":3,"q":"m","x":"","b":null},{"o":10,"q":"m","x":"","b":null},1,{"o":6,"q":"m","x":"","b":null}],"segs":{"7":[{"beat":3,"v":{"o":6,"q":"m","x":"","b":null}}]}},{"c":"VIm","name":"大人の切なさ","tags":["おしゃれ","切ない"],"p":[5,{"o":6,"q":"m-5","x":"7","b":null},{"o":5,"q":"maj","x":"M7","b":null},{"o":2,"q":"m","x":"7","b":null}],"q":[5,{"o":6,"q":"m-5","x":"7","b":null},{"o":5,"q":"maj","x":"M7","b":null},{"o":2,"q":"m","x":"7","b":null},{"o":4,"q":"m","x":"7","b":null}],"segs":{"3":[{"beat":3,"v":{"o":4,"q":"m","x":"7","b":null}}]}},{"c":"other","name":"ジャズの基本","tags":["ジャズ","おしゃれ"],"p":[{"o":2,"q":"m","x":"7","b":null},{"o":7,"q":"maj","x":"7","b":null},{"o":0,"q":"maj","x":"M7","b":null},{"o":9,"q":"maj","x":"7","b":null}],"q":[{"o":2,"q":"m","x":"7","b":null},{"o":7,"q":"maj","x":"7","b":null},{"o":0,"q":"maj","x":"M7","b":null},{"o":9,"q":"maj","x":"7","b":null}]},{"c":"other","name":"枯葉","tags":["ジャズ","切ない"],"p":[{"o":2,"q":"m","x":"7","b":null},{"o":7,"q":"maj","x":"7","b":null},{"o":0,"q":"maj","x":"M7","b":null},{"o":5,"q":"maj","x":"M7","b":null},{"o":11,"q":"m-5","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null}],"q":[{"o":2,"q":"m","x":"7","b":null},{"o":7,"q":"maj","x":"7","b":null},{"o":0,"q":"maj","x":"M7","b":null},{"o":5,"q":"maj","x":"M7","b":null},{"o":11,"q":"m-5","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null}]},{"c":"other","name":"シネマティック","tags":["壮大","切ない"],"p":[1,5,0,4],"q":[1,5,0,4]},{"c":"other","name":"あの日の後悔","tags":["切ない","ドラマチック"],"p":[1,{"o":9,"q":"m","x":"","b":0},{"o":11,"q":"m-5","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":null}],"q":[1,{"o":9,"q":"m","x":"","b":0},{"o":11,"q":"m-5","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":null}]},{"c":"other","name":"こなれた浮遊感","tags":["おしゃれ","浮遊感"],"p":[{"o":2,"q":"m","x":"7","b":null},{"o":0,"q":"maj","x":"M7","b":null},{"o":10,"q":"maj","x":"M7","b":null},{"o":11,"q":"m-5","x":"7","b":null}],"q":[{"o":2,"q":"m","x":"7","b":null},{"o":0,"q":"maj","x":"M7","b":null},{"o":10,"q":"maj","x":"M7","b":null},{"o":11,"q":"m-5","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":null}],"segs":{"3":[{"beat":3,"v":{"o":4,"q":"maj","x":"7","b":null}}]}},{"c":"other","name":"クラシカルな探求","tags":["クラシック","不思議"],"p":[{"o":2,"q":"m-5","x":"7","b":null},{"o":1,"q":"maj","x":"","b":5},{"o":5,"q":"m-5","x":"","b":11,"sp":"k"},0],"q":[{"o":2,"q":"m-5","x":"7","b":null},{"o":1,"q":"maj","x":"","b":5},{"o":5,"q":"m-5","x":"","b":11,"sp":"k"},0]},{"c":"other","name":"盛り上げ進行","tags":["前向き","爽やか"],"p":[{"o":2,"q":"m","x":"7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":5,"q":"maj","x":"M7","b":null},4],"q":[{"o":2,"q":"m","x":"7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":5,"q":"maj","x":"M7","b":null},4]},{"c":"other","name":"大気圏の外へ","tags":["不思議","浮遊感"],"p":[{"o":2,"q":"m","x":"7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":5,"q":"m","x":"7","b":null},{"o":7,"q":"m","x":"7","b":null}],"q":[{"o":2,"q":"m","x":"7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":5,"q":"m","x":"7","b":null},{"o":7,"q":"m","x":"7","b":null}]},{"c":"other","name":"ドリアンの神秘","tags":["不思議","クール"],"p":[1,{"o":4,"q":"m","x":"","b":2},{"o":5,"q":"maj","x":"","b":2},{"o":4,"q":"m","x":"","b":2}],"q":[1,{"o":4,"q":"m","x":"","b":2},{"o":5,"q":"maj","x":"","b":2},{"o":4,"q":"m","x":"","b":2}]},{"c":"other","name":"ドリアンの香り","tags":["クール","不思議"],"p":[{"o":4,"q":"m","x":"","b":2},1,{"o":4,"q":"m","x":"","b":2},1],"q":[{"o":4,"q":"m","x":"","b":2},1]},{"c":"other","name":"めずらしい切なさ","tags":["切ない","穏やか"],"p":[2,3,5,0],"q":[2,3,5,0]},{"c":"other","name":"平成J-POPバラード","tags":["エモい","穏やか"],"p":[{"o":4,"q":"m","x":"7","b":null},{"o":9,"q":"m","x":"7","b":4},{"o":2,"q":"m","x":"7","b":null},{"o":7,"q":"maj","x":"7","b":2}],"q":[{"o":4,"q":"m","x":"7","b":null},{"o":9,"q":"m","x":"7","b":4},{"o":2,"q":"m","x":"7","b":null},{"o":7,"q":"maj","x":"7","b":2}]},{"c":"other","name":"百鬼夜行","tags":["不思議","ダーク"],"p":[{"o":4,"q":"sus4","x":"addb9","b":null},{"o":4,"q":"sus4","x":"addb9","b":5},{"o":4,"q":"sus4","x":"addb9","b":2},{"o":4,"q":"sus4","x":"addb9","b":null}],"q":[{"o":4,"q":"sus4","x":"addb9","b":null},{"o":4,"q":"sus4","x":"addb9","b":5},{"o":4,"q":"sus4","x":"addb9","b":2},{"o":4,"q":"sus4","x":"addb9","b":null}]},{"c":"other","name":"スペインの情熱","tags":["情熱的","ドラマチック"],"p":[{"o":4,"q":"maj","x":"","b":null},3,4,3],"q":[{"o":4,"q":"maj","x":"","b":null},3,4,3]},{"c":"other","name":"ひねくれた美しさ","tags":["おしゃれ","切ない"],"p":[{"o":6,"q":"m-5","x":"7","b":null},{"o":5,"q":"maj","x":"M7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null}],"q":[{"o":6,"q":"m-5","x":"7","b":null},{"o":5,"q":"maj","x":"M7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null}]},{"c":"other","name":"開放的なロック","tags":["ロック","力強い"],"p":[4,4,3,0],"q":[4,3,0],"alias":"ミクソリディアン"},{"c":"other","name":"ゆがんだ時空","tags":["ロック","不思議"],"p":[4,1,5,4],"q":[4,1,5,4],"alias":"ミクソリディアン"},{"c":"25","name":"ジャズの王道","tags":["定番","ジャズ"],"p":[{"o":2,"q":"m","x":"7","b":null},0,{"o":2,"q":"m","x":"7","b":null},0],"q":[{"o":2,"q":"m","x":"7","b":null},{"o":7,"q":"maj","x":"7","b":null},0],"segs":{"0":[{"beat":3,"v":{"o":7,"q":"maj","x":"7","b":null}}],"2":[{"beat":3,"v":{"o":7,"q":"maj","x":"7","b":null}}]},"alias":"ツーファイブ"},{"c":"25","name":"とろけるジャズ","tags":["ジャズ","おしゃれ"],"p":[{"o":2,"q":"m","x":"7","b":null},0,{"o":2,"q":"m","x":"7","b":null},0],"q":[{"o":2,"q":"m","x":"7","b":null},{"o":1,"q":"maj","x":"7","b":null},0],"segs":{"0":[{"beat":3,"v":{"o":1,"q":"maj","x":"7","b":null}}],"2":[{"beat":3,"v":{"o":1,"q":"maj","x":"7","b":null}}]},"alias":"裏コード"},{"c":"25","name":"フュージョンの浮遊感","tags":["おしゃれ","浮遊感"],"p":[{"o":2,"q":"m","x":"7","b":null},0,{"o":2,"q":"m","x":"7","b":null},0],"q":[{"o":2,"q":"m","x":"7","b":null},{"o":5,"q":"maj","x":"","b":7},0],"segs":{"0":[{"beat":3,"v":{"o":5,"q":"maj","x":"","b":7}}],"2":[{"beat":3,"v":{"o":5,"q":"maj","x":"","b":7}}]}},{"c":"25","name":"ほろ苦いジャズ","tags":["おしゃれ","切ない"],"p":[{"o":2,"q":"m","x":"7","b":null},0,{"o":2,"q":"m","x":"7","b":null},0],"q":[{"o":2,"q":"m","x":"7","b":null},{"o":5,"q":"m","x":"","b":7},0],"segs":{"0":[{"beat":3,"v":{"o":5,"q":"m","x":"","b":7}}],"2":[{"beat":3,"v":{"o":5,"q":"m","x":"","b":7}}]}},{"c":"25","name":"謎めいたジャズ","tags":["おしゃれ","不思議"],"p":[{"o":2,"q":"m","x":"7","b":null},0,{"o":2,"q":"m","x":"7","b":null},0],"q":[{"o":2,"q":"m","x":"7","b":null},{"o":5,"q":"m-5","x":"","b":7},0],"segs":{"0":[{"beat":3,"v":{"o":5,"q":"m-5","x":"","b":7}}],"2":[{"beat":3,"v":{"o":5,"q":"m-5","x":"","b":7}}]}},{"c":"25","name":"不思議なきらめき","tags":["おしゃれ","不思議"],"p":[{"o":2,"q":"m","x":"7","b":null},0,{"o":2,"q":"m","x":"7","b":null},0],"q":[{"o":2,"q":"m","x":"7","b":null},{"o":5,"q":"aug","x":"","b":7},0],"segs":{"0":[{"beat":3,"v":{"o":5,"q":"aug","x":"","b":7}}],"2":[{"beat":3,"v":{"o":5,"q":"aug","x":"","b":7}}]},"alias":"ブラックアダー"},{"c":"25","name":"裏口から帰る","tags":["ジャズ","おしゃれ"],"p":[{"o":5,"q":"m","x":"7","b":null},0,{"o":5,"q":"m","x":"7","b":null},0],"q":[{"o":5,"q":"m","x":"7","b":null},{"o":10,"q":"maj","x":"7","b":null},0],"segs":{"0":[{"beat":3,"v":{"o":10,"q":"maj","x":"7","b":null}}],"2":[{"beat":3,"v":{"o":10,"q":"maj","x":"7","b":null}}]},"alias":"バックドア"},{"c":"25","name":"4へ向かうジャズ","tags":["ジャズ"],"p":[{"o":7,"q":"m","x":"7","b":null},3,{"o":7,"q":"m","x":"7","b":null},3],"q":[{"o":7,"q":"m","x":"7","b":null},{"o":0,"q":"maj","x":"7","b":null},3],"segs":{"0":[{"beat":3,"v":{"o":0,"q":"maj","x":"7","b":null}}],"2":[{"beat":3,"v":{"o":0,"q":"maj","x":"7","b":null}}]}},{"c":"25","name":"切なさへ向かうジャズ","tags":["ジャズ","切ない"],"p":[{"o":11,"q":"m","x":"7","b":null},5,{"o":11,"q":"m","x":"7","b":null},5],"q":[{"o":11,"q":"m","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":null},5],"segs":{"0":[{"beat":3,"v":{"o":4,"q":"maj","x":"7","b":null}}],"2":[{"beat":3,"v":{"o":4,"q":"maj","x":"7","b":null}}]}},{"c":"25","name":"マイナーへ落ちていく","tags":["ジャズ","切ない"],"p":[{"o":11,"q":"m-5","x":"7","b":null},5,{"o":11,"q":"m-5","x":"7","b":null},5],"q":[{"o":11,"q":"m-5","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":null},5],"segs":{"0":[{"beat":3,"v":{"o":4,"q":"maj","x":"7","b":null}}],"2":[{"beat":3,"v":{"o":4,"q":"maj","x":"7","b":null}}]}},{"c":"IV","name":"ロマンス進行","tags":["エモい","ドラマチック"],"p":[3,4,{"o":4,"q":"maj","x":"7","b":null},5],"q":[3,4,{"o":4,"q":"maj","x":"7","b":null},5]},{"c":"IV","name":"ユーロビート進行","tags":["力強い","エモい"],"p":[3,4,5,5],"q":[3,4,5]},{"c":"IV","name":"洋楽チャート進行","tags":["明るい","前向き"],"p":[3,0,4,0],"q":[3,0,4,0]},{"c":"IV","name":"J-POP進行（改）","tags":["エモい","おしゃれ"],"p":[3,{"o":7,"q":"maj","x":"","b":5},{"o":4,"q":"maj","x":"7","b":null},5],"q":[3,{"o":7,"q":"maj","x":"","b":5},{"o":4,"q":"maj","x":"7","b":null},5]},{"c":"VIm","name":"小室進行２","tags":["切ない","前向き"],"p":[5,3,4,0],"q":[5,3,4,0,{"o":7,"q":"maj","x":"","b":11}],"segs":{"3":[{"beat":3,"v":{"o":7,"q":"maj","x":"","b":11}}]}},{"c":"VIm","name":"順次下降進行","tags":["穏やか","切ない"],"p":[5,4,3,2,1,1,0,0],"q":[5,4,3,2,1,0]},{"c":"VIm","name":"ラピュタ進行","tags":["壮大","切ない"],"p":[5,4,3,2,1,{"o":9,"q":"m","x":"","b":0},{"o":11,"q":"maj","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":null}],"q":[5,4,3,2,1,{"o":9,"q":"m","x":"","b":0},{"o":11,"q":"maj","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":null}]},{"c":"VIm","name":"バロック進行","tags":["クラシック","ドラマチック"],"p":[5,{"o":4,"q":"maj","x":"7","b":8},5,{"o":4,"q":"maj","x":"7","b":8},3,3,6,{"o":4,"q":"maj","x":"7","b":null}],"q":[5,{"o":4,"q":"maj","x":"7","b":8},5,{"o":4,"q":"maj","x":"7","b":8},3,6,{"o":4,"q":"maj","x":"7","b":null}]},{"c":"other","name":"哀愁ユーロ進行","tags":["切ない","エモい"],"p":[{"o":2,"q":"m","x":"7","b":null},{"o":7,"q":"maj","x":"7","b":null},{"o":4,"q":"m","x":"7","b":null},5],"q":[{"o":2,"q":"m","x":"7","b":null},{"o":7,"q":"maj","x":"7","b":null},{"o":4,"q":"m","x":"7","b":null},5]},{"c":"other","name":"盛り上げ進行２","tags":["前向き","ドラマチック"],"p":[{"o":2,"q":"m","x":"7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":5,"q":"maj","x":"M7","b":null},{"o":7,"q":"sus4","x":"","b":null}],"q":[{"o":2,"q":"m","x":"7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":5,"q":"maj","x":"M7","b":null},{"o":2,"q":"maj","x":"","b":6},{"o":7,"q":"sus4","x":"","b":null},4],"segs":{"2":[{"beat":3,"v":{"o":2,"q":"maj","x":"","b":6}}],"3":[{"beat":3,"v":4}]}},{"c":"other","name":"盛り上げ進行３","tags":["前向き","ドラマチック"],"p":[{"o":2,"q":"m","x":"7","b":null},{"o":3,"q":"m-5","x":"dim7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":5,"q":"maj","x":"M7","b":null},{"o":6,"q":"m-5","x":"7","b":null},{"o":6,"q":"m-5","x":"7","b":null},4,{"o":4,"q":"maj","x":"7","b":null}],"q":[{"o":2,"q":"m","x":"7","b":null},{"o":3,"q":"m-5","x":"dim7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":5,"q":"maj","x":"M7","b":null},{"o":6,"q":"m-5","x":"7","b":null},4,{"o":4,"q":"maj","x":"7","b":null}]},{"c":"other","name":"盛り上げ進行４","tags":["前向き","エモい"],"p":[{"o":2,"q":"m","x":"7","b":null},0,{"o":4,"q":"m","x":"7","b":null},{"o":2,"q":"m","x":"7","b":null}],"q":[{"o":2,"q":"m","x":"7","b":null},0,{"o":4,"q":"m","x":"7","b":null},{"o":2,"q":"m","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":null}],"segs":{"3":[{"beat":3,"v":{"o":4,"q":"maj","x":"7","b":null}}]}},{"c":"other","name":"盛り上げ進行５","tags":["前向き","ドラマチック"],"p":[{"o":2,"q":"m","x":"7","b":null},{"o":7,"q":"maj","x":"7","b":null},5,{"o":2,"q":"maj","x":"","b":null}],"q":[{"o":2,"q":"m","x":"7","b":null},{"o":7,"q":"maj","x":"7","b":null},5,{"o":2,"q":"maj","x":"","b":null},{"o":4,"q":"maj","x":"","b":null}],"segs":{"3":[{"beat":3,"v":{"o":4,"q":"maj","x":"","b":null}}]}},{"c":"other","name":"Bメロ進行","tags":["エモい","前向き"],"p":[{"o":2,"q":"m","x":"7","b":null},5,{"o":5,"q":"maj","x":"M7","b":null},{"o":7,"q":"sus4","x":"","b":null}],"q":[{"o":2,"q":"m","x":"7","b":null},5,{"o":5,"q":"maj","x":"M7","b":null},{"o":7,"q":"sus4","x":"","b":null},4],"segs":{"3":[{"beat":3,"v":4}]}},{"c":"other","name":"Bメロ進行２","tags":["切ない","ドラマチック"],"p":[{"o":2,"q":"m","x":"7","b":null},5,{"o":5,"q":"maj","x":"M7","b":null},{"o":4,"q":"sus4","x":"","b":null}],"q":[{"o":2,"q":"m","x":"7","b":null},5,{"o":5,"q":"maj","x":"M7","b":null},{"o":4,"q":"sus4","x":"","b":null},{"o":4,"q":"maj","x":"7","b":null}],"segs":{"3":[{"beat":3,"v":{"o":4,"q":"maj","x":"7","b":null}}]}},{"c":"other","name":"ループ進行","tags":["おしゃれ","浮遊感"],"p":[{"o":2,"q":"m","x":"7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":2,"q":"m","x":"7","b":null},{"o":4,"q":"m","x":"7","b":null}],"q":[{"o":2,"q":"m","x":"7","b":null},{"o":4,"q":"m","x":"7","b":null},{"o":2,"q":"m","x":"7","b":null},{"o":4,"q":"m","x":"7","b":null}]},{"c":"other","name":"ループ進行２","tags":["おしゃれ","切ない"],"p":[{"o":2,"q":"m","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null},{"o":2,"q":"m","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null}],"q":[{"o":2,"q":"m","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null},{"o":2,"q":"m","x":"7","b":null},{"o":9,"q":"m","x":"7","b":null}]},{"c":"other","name":"ハウス進行","tags":["都会的","おしゃれ"],"p":[{"o":2,"q":"m","x":"7","b":7},{"o":4,"q":"m","x":"7","b":9},{"o":2,"q":"m","x":"7","b":7},{"o":4,"q":"m","x":"7","b":9}],"q":[{"o":2,"q":"m","x":"7","b":7},{"o":4,"q":"m","x":"7","b":9}]},{"c":"other","name":"R&B進行","tags":["おしゃれ","都会的"],"p":[{"o":2,"q":"m","x":"9","b":null},{"o":7,"q":"maj","x":"7","b":null},{"o":0,"q":"maj","x":"M7","b":null},{"o":5,"q":"maj","x":"M7","b":null},{"o":11,"q":"m-5","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":null},5,{"o":9,"q":"maj","x":"7","b":null}],"q":[{"o":2,"q":"m","x":"9","b":null},{"o":7,"q":"maj","x":"7","b":null},{"o":0,"q":"maj","x":"M7","b":null},{"o":5,"q":"maj","x":"M7","b":null},{"o":11,"q":"m-5","x":"7","b":null},{"o":4,"q":"maj","x":"7","b":null},5,{"o":9,"q":"maj","x":"7","b":null}]},{"c":"other","name":"シティポップ進行２","tags":["おしゃれ","都会的"],"p":[{"o":2,"q":"m","x":"9","b":null},{"o":7,"q":"maj","x":"7","b":null},{"o":4,"q":"m","x":"7","b":null},5],"q":[{"o":2,"q":"m","x":"9","b":null},{"o":7,"q":"maj","x":"7","b":null},{"o":4,"q":"m","x":"7","b":null},5]},{"c":"I","name":"半音階的進行","tags":["おしゃれ","ドラマチック"],"p":[0,{"o":4,"q":"m","x":"7","b":11},{"o":7,"q":"m","x":"","b":10},{"o":5,"q":"maj","x":"","b":9},{"o":5,"q":"m","x":"","b":8},{"o":0,"q":"maj","x":"","b":7},{"o":2,"q":"maj","x":"","b":6},{"o":2,"q":"maj","x":"7","b":null}],"q":[0,{"o":4,"q":"m","x":"7","b":11},{"o":7,"q":"m","x":"","b":10},{"o":5,"q":"maj","x":"","b":9},{"o":5,"q":"m","x":"","b":8},{"o":0,"q":"maj","x":"","b":7},{"o":2,"q":"maj","x":"","b":6},{"o":2,"q":"maj","x":"7","b":null},{"o":7,"q":"maj","x":"7","b":null}],"segs":{"7":[{"beat":3,"v":{"o":7,"q":"maj","x":"7","b":null}}]}}];
// 以前からある進行（ライブラリにないものだけ足す）
// 絵文字は使わず、線のアイコン（SVG）で統一
const ICON={
  play:'<path d="M5 3.5v11l9-5.5z" fill="currentColor"/>',
  stop:'<rect x="4.5" y="4.5" width="9" height="9" rx="1.5" fill="currentColor"/>',
  sun:'<circle cx="9" cy="9" r="3.4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M9 1.8v2M9 14.2v2M1.8 9h2M14.2 9h2M3.9 3.9l1.4 1.4M12.7 12.7l1.4 1.4M3.9 14.1l1.4-1.4M12.7 5.3l1.4-1.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  moon:'<path d="M14.5 11.3A6 6 0 0 1 6.7 3.5a6 6 0 1 0 7.8 7.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  lock:'<rect x="3.5" y="8" width="11" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6 8V5.8a3 3 0 0 1 6 0V8" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  note:'<path d="M7 13.5V3.5l7.5-1.5v10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><ellipse cx="5.2" cy="13.6" rx="2.2" ry="1.7" fill="currentColor"/><ellipse cx="12.7" cy="12" rx="2.2" ry="1.7" fill="currentColor"/>',
};
const ico=(k,sz=14)=>`<svg class="ico" width="${sz}" height="${sz}" viewBox="0 0 18 18" aria-hidden="true">${ICON[k]}</svg>`;
const OLD_PRESETS=[
  {tags:['エモい','切ない','定番'], name:'王道進行', p:[3,4,2,5]},
  {tags:['エモい','ドラマチック'], name:'王道進行（3m→3）', p:[3,4,'III7',5]},
  {tags:['切ない','ドラマチック'], name:'小室進行', p:[5,3,4,0]},
  {tags:['穏やか','明るい'], name:'やわらかな朝', p:[0,4,5,2]},
  {tags:['明るい','定番'], name:'アクシス進行', p:[0,4,5,3]},
  {tags:['切ない','エモい'], name:'アクシス進行（6m始まり）', p:[5,3,0,4]},
  {tags:['爽やか','明るい'], name:'アクシス進行（4始まり）', p:[3,0,4,5]},
  {tags:['レトロ','穏やか','明るい'], name:'50年代進行', p:[0,5,3,4]},
  {tags:['おしゃれ','レトロ'], name:'循環コード', p:[0,5,1,4]},
  {tags:['おしゃれ'], name:'逆循環進行', p:[1,4,0,5]},
  {tags:['おしゃれ','穏やか'], name:'まどろむ午後', p:[2,5,1,4]},
  {tags:['おしゃれ'], name:'のんびりジャズ', p:[1,4,0,0]},
  {tags:['明るい','力強い'], name:'陽気なロックンロール', p:[0,3,4,0]},
  {tags:['明るい','力強い'], name:'続きが待ちきれない', p:[0,3,0,4]},
  {tags:['穏やか','切ない'], name:'下降進行', p:[3,2,1,0]},
  {tags:['情熱的','切ない','力強い'], name:'アンダルシア進行', p:[5,4,3,'III7']},
  {tags:['おしゃれ','エモい'], name:'丸サ進行（三和音）', p:[3,'III7',5,0]},
  {tags:['切ない','不思議'], name:'Creep進行', p:[0,'III7',3,'IVm']},
  {tags:['切ない','穏やか'], name:'ほろりと泣ける', p:[0,3,'IVm',0]},
  {tags:['力強い','ロック'], name:'ロック進行', p:[0,'bVII',3,0]},
  {tags:['壮大','穏やか'], name:'希望の光', p:[0,4,5,2,3,0,3,4]},
  {tags:['エモい','壮大'], name:'王道進行（8小節）', p:[3,4,2,5,1,4,0,0]},
];
const PRESETS=(()=>{ const out=LIB_DATA.map(e=>({...e}));
  const tk=t=>{ if(typeof t==='number') return t; const o=typeof t==='string'?CHROM[t]:t; return `${o.o}:${o.q}:${o.x||''}:${o.b??''}`; }, key=p=>JSON.stringify(p.map(tk));
  const have=new Set(out.filter(e=>!e.segs).map(e=>key(e.p)));
  OLD_PRESETS.forEach(e=>{ if(have.has(key(e.p))) return; const t0=tk(e.p[0]);
    out.push({...e, c: t0===0?'I':t0===3?'IV':t0===5?'VIm':'other', q:e.p}); });
  return out; })();
// ビギナーでも使えるコードのバリエーション（パレットの7つそれぞれ）
const VSP=(o,q,x,b)=>({o,q,x:x||'',b:b??null});
const VARS=[
  [0, VSP(0,'maj','M7'), VSP(0,'maj','add9'), VSP(0,'maj','',4)],
  [1, VSP(2,'m','7'), VSP(2,'m','11'), VSP(2,'maj','7')],
  [2, VSP(4,'m','7'), VSP(0,'maj','add9',4), VSP(4,'maj','7')],
  [3, VSP(5,'maj','M7'), VSP(5,'maj','M9'), VSP(5,'sus2'), VSP(0,'maj','',5), VSP(5,'m')],
  [4, VSP(7,'maj','7'), VSP(7,'maj','9'), VSP(7,'sus4'), VSP(7,'maj','add9'), VSP(5,'maj','',7), VSP(7,'maj','',11)],
  [5, VSP(9,'m','7'), VSP(9,'m','9'), VSP(9,'m','add9'), VSP(9,'sus4'), VSP(9,'m','7add11'), VSP(9,'maj','7')],
  [6, VSP(11,'m-5','7')],
];
// バリエーションの種類ごとに、使えるようになるレベル：数字（テンション）5、分数コード 6、明るい⇄暗い 7、キーの外から借りる 9
function varLv(g,x){ if(isNum(x)) return 0; const sp=specOf(x);
  if(sp.b!==null&&sp.b!==undefined) return 7;           // 分数コード
  if(!STEPS.includes(sp.o)) return 99;                   // キーの外から借りる（いまは使わない）
  const dq=DEG[g].q===''?'maj':DEG[g].q; if(sp.o===STEPS[g] && (sp.q===dq || /^sus|^5$/.test(sp.q))) return 6;   // テンション
  return 8; }                                            // 明るい⇄暗い
const sameSpec=(a,b)=>{ const x=specOf(a), y=specOf(b); return x.o===y.o&&x.q===y.q&&(x.x||'')===(y.x||'')&&(x.b??null)===(y.b??null); };
const varGroupOf=v=>{ if(v===null||v===undefined) return null; if(isNum(v)) return v; const k=VARS.findIndex(g=>g.some(x=>!isNum(x)&&sameSpec(x,v))); return k>=0?k:null; };
const tokSpec=t=>typeof t==='number'?t: typeof t==='string'?{...CHROM[t],b:null} : {x:'',b:null,...t};
// マスのコードを比べやすい形に：ダイアトニック（7などのテンションは無視）なら数字、それ以外は「根音:種類」
function tokOf(v){
  if(v===null||v===undefined) return null;
  if(isNum(v)) return v;
  const sp=specOf(v), slash=sp.b!==null&&sp.b!==undefined&&sp.b!==sp.o;
  // 明るい・暗いの和音（7 などのテンションは無視）は、根音と種類で判定。キーの外のコード（E7 など）は別のコードとして扱う
  if(!slash && (sp.q==='maj'||sp.q==='m')){ const d=STEPS.findIndex((o,k)=>o===sp.o && (DEG[k].q===''?'maj':DEG[k].q)===sp.q); return d>=0?d:`${sp.o}:${sp.q}`; }
  // sus や分数コードのバリエーション（1add9/3・4/5 など）は、元のコードとして扱う
  const vg=varGroupOf(v); if(vg!==null) return vg;
  if(slash) return `${sp.o}:${sp.q}/${sp.b}`;
  return `${sp.o}:${sp.q}`;
}
function tokKey(t){ return typeof t==='number'?t : typeof t==='string'?(CHROM[t]?`${CHROM[t].o}:${CHROM[t].q}`:t) : tokOf({b:null,...t}); }
// 進行の名前：ぴったり＞くり返し＞途中から＞近い（1つ違い。8小節は2つ違いまで）＞前半
function progLabel(){
  const n=state.bars, seq=Array.from({length:n},(_,i)=>tokOf(state.slots[i]));
  if(seq.some(t=>t===null)) return '';
  const eq=(p,q)=>p.length===q.length&&p.every((t,i)=>tokKey(t)===q[i]);
  const short=p=>p.short||p.name;
  let hit=PRESETS.find(p=>eq(p.p,seq)); if(hit) return hit.name;
  for(const L of [4,8]) if(n>L && n%L===0){ const blk=seq.slice(0,L);
    if(seq.every((t,i)=>t===blk[i%L])){ const h=PRESETS.find(p=>eq(p.p,blk)); if(h) return `${short(h)}×${n/L}`; } }
  for(const p of PRESETS){ if(p.p.length!==n) continue;
    for(let k=1;k<n;k++){ const rot=[...p.p.slice(k),...p.p.slice(0,k)]; if(eq(rot,seq)) return `${short(p)}の途中から`; } }
  let best=null, bd=99;
  for(const p of PRESETS){ if(p.p.length!==n) continue; const d=p.p.filter((t,i)=>tokKey(t)!==seq[i]).length; if(d<bd){ bd=d; best=p; } }
  if(best && bd<=(n>=8?2:1)) return `${short(best)}に近い`;
  if(n>4){ const h=PRESETS.find(p=>eq(p.p,seq.slice(0,4))); if(h) return `前半が${short(h)}`;
    let b2=null,d2=99; for(const p of PRESETS){ if(p.p.length!==4) continue; const d=p.p.filter((t,i)=>tokKey(t)!==seq[i]).length; if(d<d2){d2=d;b2=p;} }
    if(b2&&d2<=1) return `前半が${short(b2)}に近い`; }
  return '';
}

