// ---------- PRO：トラック（試作版） ----------
// メイン画面の伴奏は1行にまとめ、タップで「トラック」の画面を開く。楽器ごとの行に、いま使っているパターンと音色を出し、
// パターンをタップするとそのまま編集できる。行を左へスワイプ（か、つまみのボタン）で音量・左右（パン）・響き（リバーブ）
// 楽器（コード楽器）はいくつでも足せる（state.xtr）。名前と色も変えられる

// 伴奏スタイルを PRO の設定に読み込む（通常モードと同じ鳴り方になるように、音域のずらし方・ミキサーもそのまま写す）
function proFromStyle(st){ setStyle(st); const o=sOffOf(st);
  Object.assign(state,{rhLo:null,lhLo:null,rhLo2:null,lhLo2:null,bassLo:null, rhOff:o.rh, lhOff:o.lh, rhOff2:o.rh2, lhOff2:o.lh2, bassOff:o.bass, xtr:[]}); }

// 伴奏スタイルごとのミックス（左右・リバーブ・エコー・コンプ・高音・低音）。通常モードでもこのまま鳴り、PRO に読み込むとトラックの設定になる
// rev・echo・comp は 0〜1、pan・hi・lo は −1〜1（hi・lo は ±9dB）
const STYLE_FX={
  0:{arp:{rev:.22,comp:.3,hi:.1}, drum:{rev:.12,comp:.35}, bass:{comp:.5,lo:.1}},
  1:{arp:{pan:-.1,rev:.18,comp:.35,hi:.15}, drum:{rev:.1,comp:.45}, bass:{comp:.5}},
  15:{arp:{rev:.2,echo:.12,comp:.4,hi:.15}, drum:{rev:.08,comp:.5,hi:.1}, bass:{comp:.55,lo:.15}},
  2:{arp:{pan:-.15,rev:.12,comp:.3,lo:-.15}, drum:{rev:.15,comp:.55}, bass:{comp:.6,lo:.15}},
  3:{arp:{pan:.15,rev:.2,echo:.1,comp:.3}, drum:{rev:.18,comp:.4}, bass:{comp:.5}},
  16:{arp:{rev:.25,comp:.35,hi:.1}},
  4:{arp:{rev:.35,comp:.2}, drum:{rev:.3,comp:.25}, bass:{rev:.08,comp:.4}},
  5:{arp:{rev:.35,echo:.08,comp:.2}, drum:{pan:.1,rev:.3}},
  17:{arp:{rev:.45,comp:.15}, arp2:{pan:.2,rev:.5,comp:.15}, drum:{rev:.4}, bass:{rev:.2,comp:.3}},
  18:{arp:{pan:-.2,rev:.22,echo:.08,comp:.3,hi:.1}, arp2:{pan:.25,rev:.25,comp:.35,hi:.1}, drum:{rev:.12,comp:.4}, bass:{comp:.55,hi:.1}},
  9:{arp:{pan:-.25,rev:.1,comp:.4,hi:.1}, arp2:{pan:.2,rev:.2,comp:.35}, drum:{rev:.08,comp:.5}, bass:{comp:.6}},
  11:{arp:{rev:.28,comp:.2,hi:-.1}, drum:{rev:.2,comp:.25}, bass:{rev:.05,comp:.35}},
  19:{arp:{rev:.25,echo:.15,comp:.45,hi:-.35}, drum:{rev:.1,comp:.5,hi:-.3}, bass:{comp:.4,hi:-.2}},
  8:{arp:{rev:.2,comp:.25}, drum:{rev:.15,comp:.35}, bass:{comp:.45}},
  10:{arp:{rev:.25,echo:.2,comp:.4,hi:.15}, drum:{rev:.05,comp:.6,lo:.15}, bass:{comp:.6,lo:.1}},
  12:{arp:{pan:-.1,rev:.25,comp:.25}, drum:{pan:.15,rev:.2,comp:.2}, bass:{rev:.05,comp:.35}},
  13:{arp:{pan:.15,rev:.2,echo:.18,comp:.3}, drum:{rev:.12,comp:.4}, bass:{comp:.5,lo:.15,hi:-.15}},
  20:{arp:{rev:.35,echo:.12,comp:.2}, drum:{rev:.3,comp:.25}, bass:{rev:.1,comp:.35}},
  14:{arp:{rev:.38,comp:.1}}};
const FX_KEYS=['pan','rev','echo','comp','hi','lo'];
// 伴奏スタイルを選んだら、そのミックスもトラックの設定に写す（音量はこれまでどおり st.mix から）
{ const ss=setStyle; setStyle=function(st){ ss(st); state.wide=true; state.drumOff=false;   // 左右の広がりは「広げる」が基本（共有リンクで開いた古い曲は、そのときの設定のまま）
  const fx=STYLE_FX[st.id]; if(fx) for(const c in fx){ const x=mixOf(c); FX_KEYS.forEach(k=>{ if(fx[c][k]!=null) x[k]=fx[c][k]; }); } try{ applyMix(); }catch(e){} }; }

const TRK_COLORS=['#3567D6','#24946A','#DA6A22','#8A4FD3','#D13F6B','#1F8FA8','#B8860B','#5B6475'];
const TRK_DEF={arp:['コード',0],arp2:['コード2',3],drum:['ドラム',7],bass:['ベース',2]};
// トラックの一覧（いま鳴らすもの）。kind：arp・arp2・x:ID・drum・bass
// 足したドラム・ベースを、いつものドラム・ベースとして扱って f を実行する（その場で入れ替えて、すぐ戻す）
function withTrk(kind,f){ const x=xOf(kind), ty=x&&x.type; if(ty!=='drum'&&ty!=='bass') return f(kind);
  const K=ty==='drum'?['drum','kit']:['bassPat','bassSnd'], sv=K.map(k=>state[k]), sb=state.bass;
  K.forEach(k=>state[k]=x[k]); if(ty==='bass') state.bass=true;
  try{ return f(ty); } finally { K.forEach((k,i)=>state[k]=sv[i]); state.bass=sb; } }
function trackList(){ const L=[{kind:'arp'}];
  if(state.arp2 && ARPS[state.arp2]) L.push({kind:'arp2'});
  const X=state.xtr||[], of=ty=>X.filter(t=>(t.type||'chord')===ty).map(t=>({kind:'x:'+t.id}));
  L.push(...of('chord'));   // 上からコード・ベース・ドラム（ベース・ドラムは2つ以上でも）
  if(state.bass) L.push({kind:'bass'}); L.push(...of('bass'));
  if(state.drum!=='none' && !state.drumOff) L.push({kind:'drum'}); L.push(...of('drum'));
  return L; }
const mixKey=kind=>kind.startsWith('x:')?kind.slice(2):kind;
const tkMeta=kind=>{ const x=xOf(kind); if(x) return x; state.tk=state.tk||{}; return state.tk[kind]=state.tk[kind]||{}; };
const tkName=kind=>tkMeta(kind).name || (TRK_DEF[kind]||[])[0] || '楽器';
const tkColor=kind=>{ const m=tkMeta(kind); if(m.color) return m.color; const d=TRK_DEF[kind]; if(d) return TRK_COLORS[d[1]]; const i=(state.xtr||[]).indexOf(xOf(kind)); return TRK_COLORS[(4+Math.max(0,i))%TRK_COLORS.length]; };
const tkInst=kind=>withTrk(kind,kind=>{ const x=xOf(kind); if(x) return INSTS[x.inst]||''; if(kind==='arp') return INSTS[state.inst]||''; if(kind==='arp2') return INSTS[state.inst2||'epiano']||''; if(kind==='drum') return KITS[state.kit]||''; return BASS_SNDS[state.bassSnd||'bass']||''; });
const tkPatName=kind=>withTrk(kind,kind=>{ if(kind==='drum') return patName(DRUMS[state.drum]||{name:''}); if(kind==='bass') return (BASSES[state.bassPat||'auto']||{name:'ドラムに合わせる'}).name; const k=patOf(kind); return k&&ARPS[k]?patName(ARPS[k]):'なし'; });
// メイン画面の帯に出す、トラックのまとめ
function trackSummary(){ const L=trackList(); return L.length+'つ ・ '+L.filter(t=>!isDrumK(t.kind)&&!isBassK(t.kind)).map(t=>tkInst(t.kind)).join('＋'); }

// ---- 画面（DAW 風。部品とスタイルは、このファイルの中で作る） ----
// 上：ミキサー・閉じる。下：メイン画面の再生ボタンとテンポ（同じものをこちらへ移して使う）
// 左：トラックの頭（M・S と楽器の絵）。右：小節の目盛り（コード名つき）と、コードごとに色分けした帯
// 帯をタップすると、その場所で実際に使っている弾き方（場面）を開く。楽器の絵をタップすると、そのトラックのミキサーが左から出る
// 色は画面の明るさ（ライト・ダーク）に合わせて、アプリの色をそのまま使う
// ミュート（スピーカーに×）・ソロ（ヘッドホン）
const ICO_MUTE='<svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 6h2.2L8 3.2v9.6L4.7 10H2.5z" fill="currentColor"/><path d="M10.5 6l3.5 4M14 6l-3.5 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>', ICO_SOLO='<svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.8 10V8.5a5.2 5.2 0 0 1 10.4 0V10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><rect x="2" y="9" width="3.2" height="4.6" rx="1.2" fill="currentColor"/><rect x="10.8" y="9" width="3.2" height="4.6" rx="1.2" fill="currentColor"/></svg>';
const ICO={
  mix:'<svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"><path d="M5 3v16M11 3v16M17 3v16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><rect x="2.5" y="11" width="5" height="3.4" rx="1.2" fill="var(--surface)" stroke="currentColor" stroke-width="1.6"/><rect x="8.5" y="5" width="5" height="3.4" rx="1.2" fill="var(--surface)" stroke="currentColor" stroke-width="1.6"/><rect x="14.5" y="13" width="5" height="3.4" rx="1.2" fill="var(--surface)" stroke="currentColor" stroke-width="1.6"/></svg>',
  play:'<svg width="26" height="26" viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3.5l11 6.5-11 6.5z" fill="currentColor"/></svg>',
  stop:'<svg width="22" height="22" viewBox="0 0 18 18" aria-hidden="true"><rect x="3" y="3" width="12" height="12" rx="2" fill="currentColor"/></svg>',
  undo:'<svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true"><path d="M6.5 4L3 7.5 6.5 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 7.5h7a4 4 0 0 1 0 8H8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  redo:'<svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true" style="transform:scaleX(-1)"><path d="M6.5 4L3 7.5 6.5 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 7.5h7a4 4 0 0 1 0 8H8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  close:'<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  plus:'<svg width="28" height="28" viewBox="0 0 30 30" aria-hidden="true"><path d="M15 4v22M4 15h22" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  chev:'<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 3l3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'};
// 楽器の絵（線で描く）。音色の種類ごと
const INST_ICO=(()=>{ const S=(d,w=28)=>`<svg width="${w}" height="${w}" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  return {
    keys:S('<rect x="3" y="6" width="22" height="16" rx="2"/><path d="M8.5 6v16M14 6v16M19.5 6v16"/><path d="M6.8 6v9M10.2 6v9M17.8 6v9M21.2 6v9" stroke-width="2.6"/>'),
    guitar:S('<path d="M17 11l7-7M21.5 3.5l3 3"/><path d="M15.5 9.5c-2-1-4.5-.5-5.5 1.5-.6 1.2-2 1-3.2 1.4C4 13.3 3 16.5 5 19.5l3.5 3.5c3 2 6.2 1 7.1-1.8.4-1.2.2-2.6 1.4-3.2 2-1 2.5-3.5 1.5-5.5z"/><circle cx="11.5" cy="16.5" r="1.8"/>'),
    strings:S('<path d="M20 4l4 4M17.5 6.5l4 4"/><path d="M14 9c-1.6-1-3.8-.6-4.6 1-.5 1-1.6 1-2.6 1.3-2.3.6-3 3.4-1.3 5.9l3.3 3.3c2.5 1.7 5.3 1 5.9-1.3.3-1 .3-2.1 1.3-2.6 1.6-.8 2-3 1-4.6"/><path d="M4 24l9-9"/>'),
    brass:S('<path d="M3 13h13M3 16h13"/><path d="M16 11.5l8-5v15l-8-5z"/><path d="M7 13v-3h2v3M11 13v-3h2v3"/>'),
    sax:S('<path d="M17 3v13a5.5 5.5 0 0 1-11 0v-2"/><path d="M6 14c-1.5 0-2.5 1-2.5 2.5"/><path d="M17 3l4-1M13.5 8h2M13.5 11.5h2"/>'),
    synth:S('<rect x="3" y="6" width="22" height="16" rx="2"/><path d="M6 15c1.5-5 3-5 4 0s2.5 5 4 0 2.5-5 4 0 2 4 4 0"/>'),
    bells:S('<path d="M4 8l20 3M4 13l20 3M4 18l20 3"/><path d="M8 4v20M16 6v18" stroke-width="1.2"/>'),
    wa:S('<path d="M4 22L22 4"/><path d="M8 24l16-8M4 18l14-12"/><path d="M6 20l4-1M10 16l4-1M14 12l4-1" stroke-width="1.3"/>'),
    drum:S('<ellipse cx="14" cy="11" rx="10" ry="3.5"/><path d="M4 11v8c0 2 4.5 3.5 10 3.5s10-1.5 10-3.5v-8"/><path d="M9 14.2v7M19 14.2v7"/><path d="M7 3l5 6M23 4l-5 5"/>'),
    bass:S('<path d="M18 10l7-7M22 2.5l3 3"/><path d="M16.5 8.5c-2.4-1-5-.3-6 2-.5 1-1.7 1-3 1.5-3 1-4 5-1.5 8l2 2c3 2.5 7 1.5 8-1.5.5-1.3.5-2.5 1.5-3 2.3-1 3-3.6 2-6"/><path d="M10 15l4 4" stroke-width="1.3"/>')}; })();
// ---------- 楽器の絵：音色ごとに形を変え、種類ごとに色を付ける（同じ絵が並ばないように） ----------
const ICO_COL={keys:'#4f7be8',guitar:'#e0892f',strings:'#c2563f',brass:'#c99a1f',sax:'#c99a1f',synth:'#8b5cf6',bells:'#c2563f',wa:'#2f9e6e',drum:'#64748b',edrum:'#8b5cf6',bass:'#0f9b8e'};
const SICO=(()=>{ const F='fill="currentColor" fill-opacity=".18"';
  const S=(fam,d)=>`<svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color:${ICO_COL[fam]}">${d}</svg>`;
  const kb=(y,h)=>`<rect ${F} x="3" y="${y}" width="22" height="${h}" rx="1.5"/><path d="M7 ${y+h*.45}v${h*.55}M11 ${y+h*.45}v${h*.55}M15 ${y+h*.45}v${h*.55}M19 ${y+h*.45}v${h*.55}" stroke-width="1.1"/>`;
  const tp=`<path d="M3 15h11"/><path ${F} d="M14 12.5l10-5v15l-10-5z"/><path d="M5.5 15v-4h6.5v4M7.7 11V9M9.9 11V9" stroke-width="1.3"/>`;
  const ag=`<path d="M14 2.5v8M12.5 2.5h3"/><path ${F} d="M14 10c-2.8 0-4.5 1.6-4.5 3.8 0 1.2.6 1.8.6 2.4 0 .8-1.6 1.6-1.6 3.8 0 3 2.5 5.5 5.5 5.5s5.5-2.5 5.5-5.5c0-2.2-1.6-3-1.6-3.8 0-.6.6-1.2.6-2.4 0-2.2-1.7-3.8-4.5-3.8z"/><circle cx="14" cy="17" r="1.8"/><path d="M12 22.5h4"/>`;
  const dr=`<ellipse ${F} cx="14" cy="13" rx="9" ry="3.2"/><path d="M5 13v7c0 1.8 4 3.2 9 3.2s9-1.4 9-3.2v-7"/><path d="M9.5 16v6.5M18.5 16v6.5" stroke-width="1.2"/>`;
  const pads=(n)=>{ let s=`<rect ${F} x="3" y="4" width="22" height="20" rx="2.5"/>`; const c=n===6?3:2, r=n===6?2:2, w=c===3?5:7.5; for(let i=0;i<c;i++) for(let j=0;j<r;j++) s+=`<rect x="${6+i*(w+1.5)}" y="${11+j*6}" width="${w}" height="4.5" rx="1"/>`; return s; };
  return {
    piano:S('keys',`<path ${F} d="M4 19V9.5C4 6.5 6.5 4 9.5 4H12c3.2 0 4 2.6 6 4.6 1.6 1.6 6 1.8 6 6.4V19z"/><path d="M4 19h20v4H4z"/><path d="M7.5 19v4M11 19v4M14.5 19v4M18 19v4M21.5 19v4" stroke-width="1.1"/>`),
    epiano:S('keys',kb(6,8)+`<path d="M8 14l12 10M20 14L8 24"/>`),
    epcity:S('keys',kb(10,8)+`<path d="M7 18l-2 5M21 18l2 5"/><path ${F} d="M22.5 1.5l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z"/>`),
    clav:S('keys',kb(13,10)+`<path d="M4 5h20M4 9h20" stroke-width="1.1"/><path d="M10 4l1.5 6M18 4l-1.5 6"/>`),
    lofi:S('keys',`<rect ${F} x="3" y="6" width="22" height="16" rx="2"/><circle cx="10" cy="13" r="2.4"/><circle cx="18" cy="13" r="2.4"/><path d="M12.4 13h3.2M8 22l1.5-3.5h9L20 22"/>`),
    spiano:S('keys',kb(13,10)+`<path d="M4 8c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/>`),
    organ:S('keys',`<path ${F} d="M5 23V11l2-2 2 2v12zM10.5 23V6.5l2-2 2 2V23zM16 23V8.5l2-2 2 2V23zM21.5 23V12l1.5-1.5 1.5 1.5v11z"/><path d="M3 23.5h22"/>`),
    steel:S('guitar',ag),
    nylon:S('guitar',`<g transform="rotate(40 14 14)">${ag}</g><circle cx="13" cy="15.5" r="3.2" stroke-width="1"/>`),
    eguitar:S('guitar',`<path d="M17.5 10.5L25 3M23 2l3 3"/><path ${F} d="M16 9c-1.5-1.5-3-.5-3.5 1l-1 2.5c-.4 1-1.5 1-2.5.6-2-.8-4.5 0-5 2.4-.6 2.6 1 4.4 2.5 5.9s3.3 3.1 5.9 2.5c2.4-.5 3.2-3 2.4-5-.4-1-.4-2.1.6-2.5l2.5-1c1.5-.5 2.5-2 1-3.5z"/><path d="M8.5 15.5l4 4M10.5 13.5l4 4" stroke-width="1.2"/>`),
    dist:S('guitar',`<rect ${F} x="3" y="5" width="22" height="19" rx="2"/><circle cx="14" cy="15.5" r="5.2"/><path d="M6 8.5h3M11 8.5h1.5"/><path d="M15.2 11.5l-2.6 4.2h3.2l-2.6 4.2" stroke-width="1.5"/>`),
    strings3:S('strings',`<path ${F} d="M12 8c-2 0-3.2 1.3-3.2 2.8 0 .9.6 1.4.6 2 0 .7-1.6 1.4-1.6 3.4 0 2.8 2 4.8 4.2 4.8s4.2-2 4.2-4.8c0-2-1.6-2.7-1.6-3.4 0-.6.6-1.1.6-2C15.2 9.3 14 8 12 8z"/><path d="M12 8V3M10.8 3h2.4M10.6 15.5h2.8M12 21v3"/><path d="M5 25L24.5 5.5" stroke-width="1.3"/>`),
    horn:S('brass',`<circle cx="12" cy="15" r="7.5"/><circle cx="12" cy="15" r="3.6"/><path ${F} d="M17.5 9.5L23 3.5l2.5 7.5z"/><path d="M4.5 15H2"/>`),
    trumpet:S('brass',tp),
    trombone:S('brass',`<path ${F} d="M7.5 14L2.5 9v10z"/><path d="M7.5 12.5h16a1.5 1.5 0 0 1 0 3H12M12 15.5v4.5h12"/>`),
    brass3:S('brass',`<g transform="translate(0 -4.5) scale(.9)">${tp}</g><g transform="translate(2.5 7) scale(.9)">${tp}</g>`),
    sbrass:S('synth',`<g transform="translate(0 -3) scale(.95)">${tp}</g><path d="M4 24l3-3 3 3 3-3 3 3 3-3"/>`),
    sax:S('sax',`<path ${F} d="M18 3.5v13a5.5 5.5 0 0 1-11 0V15h4v1.5a1.5 1.5 0 0 0 3 0v-13z"/><path d="M18 3.5l4-1.8M14 8h-1.8M14 11.5h-1.8"/><path ${F} d="M7 15c-1.5-1.5-3-1-4 .5"/>`),
    glock:S('bells',`<path ${F} d="M3 8h4v15H3zM8.5 9h4v13h-4zM14 10h4v11h-4zM19.5 11h4v9h-4z"/><path d="M14 3.5l8.5 4.5"/><circle cx="24" cy="8.8" r="1.6"/>`),
    synth:S('synth',`<rect ${F} x="2.5" y="7" width="23" height="15" rx="2"/><circle cx="7" cy="11" r="1.6"/><circle cx="12" cy="11" r="1.6"/><path d="M16 11h6"/><path d="M2.5 15h23M7 15v7M11.5 15v7M16 15v7M20.5 15v7" stroke-width="1.1"/>`),
    pad:S('synth',`<path ${F} d="M8 17.5a4.5 4.5 0 0 1 .5-9 6 6 0 0 1 11.3 1.6A3.8 3.8 0 0 1 20 17.5z"/><path d="M4 23c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>`),
    koto:S('wa',`<path ${F} d="M3 20.5L21.5 4l3.5 3.5L6.5 24z"/><path d="M5 22L23 5.5" stroke-width="1"/><path d="M8.5 16.5l2.5 2.5M12.5 13l2.5 2.5M16.5 9.5L19 12"/>`),
    shami:S('wa',`<rect ${F} x="4.5" y="15" width="9" height="9" rx="1.5" transform="rotate(-45 9 19.5)"/><path d="M12 17L24 5M22 3.5l3 3"/><path ${F} d="M15.5 23l6.5-2.5-2 5.5z"/>`),
    // ドラムの音
    'kit:std':S('drum',dr+`<path d="M7 3.5l5 6.5M22 3.5l-5 6.5"/>`),
    'kit:room':S('drum',dr+`<path d="M2 8.5a7 7 0 0 0 0 9M26 8.5a7 7 0 0 1 0 9M9 4c3-1.5 7-1.5 10 0"/>`),
    'kit:power':S('drum',dr+`<path ${F} d="M15.5 1.5L11 8h3.5l-2 5.5L18 6h-3.5z"/>`),
    'kit:brush':S('drum',dr+`<path d="M6 2l4 7M9 1.5l2.5 7.5M12 1.8l1 7.2"/>`),
    'kit:city':S('drum',`<g transform="translate(3 3) scale(.8)">${dr}</g><path ${F} d="M16 5.5h11l-5.5-2z"/><path d="M21.5 5.5V24M19 24h5"/>`),
    'kit:lofi':S('drum',dr+`<path d="M4 4.5c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0"/>`),
    'kit:orch':S('drum',`<path ${F} d="M3.5 10h21l-3.5 9.5H7z"/><path d="M8 19.5l-2 5M20 19.5l2 5M10 6l4 4M18 6l-4 4"/><circle cx="9.5" cy="5.5" r="1.3"/><circle cx="18.5" cy="5.5" r="1.3"/>`),
    'kit:elec':S('edrum',pads(4)+`<circle cx="8" cy="7.5" r="1"/><circle cx="12" cy="7.5" r="1"/>`),
    'kit:tr808':S('edrum',pads(6)+`<path d="M6 7.5h5M15 7.5h7"/>`),
    'kit:synth':S('edrum',pads(4)+`<path d="M6 8c1.5-2.5 3-2.5 4 0s2.5 2.5 4 0 2.5-2.5 4 0 2 2 3 0" stroke-width="1.2"/>`),
    // ベースの音
    'bs:bass':S('bass',`<path d="M16 12L25.5 2.5M23.5 1.5l3 3"/><path ${F} d="M15 10.5c-1.8-1-3.6-.4-4.2 1.2-.4 1-1.4 1.2-2.6 1.4-2.8.5-4.4 3.6-2.6 6.4l2.9 2.9c2.8 1.8 5.9.2 6.4-2.6.2-1.2.4-2.2 1.4-2.6 1.6-.6 2.2-2.4 1.2-4.2z"/><path d="M8.5 17l3 3M10.5 15.5l2.5 2.5" stroke-width="1.2"/>`),
    'bs:ubass':S('bass',`<path d="M14 2v8M12.5 2h3"/><path ${F} d="M14 9.5c-3 0-4.8 1.8-4.8 4 0 1.2.7 1.8.7 2.5 0 .9-2 1.7-2 4.3 0 2.6 2.7 4.7 6.1 4.7s6.1-2.1 6.1-4.7c0-2.6-2-3.4-2-4.3 0-.7.7-1.3.7-2.5 0-2.2-1.8-4-4.8-4z"/><path d="M12.6 16.5v3M15.4 16.5v3M14 25v2.5"/>`),
    'bs:slap3':S('bass',`<path d="M17 11L25.5 2.5M23.5 1.5l3 3"/><path ${F} d="M16 9.5c-1.8-1-3.6-.4-4.2 1.2-.4 1-1.4 1.2-2.6 1.4-2.8.5-4.4 3.6-2.6 6.4l2.9 2.9c2.8 1.8 5.9.2 6.4-2.6.2-1.2.4-2.2 1.4-2.6 1.6-.6 2.2-2.4 1.2-4.2z"/><path d="M3 4l3 2M2 9h3.5M7 1.5l1 3" stroke-width="1.5"/>`),
    'bs:sbass':S('bass',`<rect ${F} x="3" y="5" width="22" height="18" rx="2.5"/><path d="M6 18v-7h4v7h4v-7h4v7h4"/>`),
  }; })();
const icoInst=k=>SICO[k]||SICO.piano, icoKit=k=>SICO['kit:'+k]||SICO['kit:std'], icoBass=k=>SICO['bs:'+k]||SICO['bs:bass'];
const tkIco=kind=>withTrk(kind,kind=>{ if(kind==='drum') return icoKit(state.kit); if(kind==='bass') return icoBass(state.bassSnd||'bass'); const x=xOf(kind); return icoInst(x?x.inst:kind==='arp2'?(state.inst2||'epiano'):state.inst); });
const instFam=kind=>{ if(kind==='drum') return 'drum'; if(kind==='bass') return 'bass'; const x=xOf(kind), k=x?x.inst:kind==='arp2'?(state.inst2||'epiano'):state.inst;
  if(/^(steel|nylon|eguitar|dist)$/.test(k)) return 'guitar'; if(/^strings/.test(k)) return 'strings'; if(/^(brass|sbrass|trumpet|trombone|horn)/.test(k)) return 'brass';
  if(k==='sax') return 'sax'; if(/^(synth|pad)$/.test(k)) return 'synth'; if(k==='glock') return 'bells'; if(/^(koto|shami)$/.test(k)) return 'wa'; return 'keys'; };
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const panTxt=p=>Math.abs(p)<.03?'中':p<0?'左'+Math.round(-p*100):'右'+Math.round(p*100);
(function(){
  const css=`
#trk{position:fixed;inset:0;z-index:29;background:var(--bg);color:var(--ink);display:flex;flex-direction:column;--dhw:116px;--dbw:96px;--drh:84px}
#trk[hidden]{display:none}
#trk button{font:inherit}
#trk .dtb,#trk .dico,#trk .ditb,#trk .dms2 button,#trk .dims button,#trk .dilink,#trk .dcn{color:var(--ink)}
#trk .dtop{display:flex;align-items:center;gap:8px;padding:max(10px,env(safe-area-inset-top,0px)) 12px 8px;flex:none}
#trk .dtop h2{font-family:var(--display);font-weight:900;font-size:1.05rem;margin:0 4px;white-space:nowrap}
#trk .dsp{flex:1;min-width:0;display:flex;justify-content:center}
#trk .dsp .pages{width:min(100%,300px)}
#trk .dscroll{overflow-x:hidden}
#trk .dtb{width:42px;height:42px;border:1px solid var(--line);border-radius:12px;background:var(--surface);cursor:pointer;display:grid;place-items:center;padding:0;flex:none}
#trk .dtb[aria-pressed=true]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
#trk .dtb[aria-pressed=true] svg rect{fill:var(--ink)}
#trk .dtb:disabled{opacity:.35}
#trk .dtb.dx{border-radius:50%;width:44px;height:44px}
#trk .dbpm{height:42px;border:1px solid var(--line);border-radius:12px;background:var(--surface);padding:0 10px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;flex:none}
#trk .dbpm b{font-variant-numeric:tabular-nums;font-size:.95rem;line-height:1.1}
#trk .dbpm small{font-size:.58rem;color:var(--muted)}
#trk .dbpmpop{position:absolute;z-index:9;background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 12px;display:flex;align-items:center;gap:10px;box-shadow:0 8px 24px rgba(0,0,0,.18)}
#trk .dbpmpop input{width:180px;accent-color:var(--ink)}
#trk .dbody{flex:1;display:flex;min-height:0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
#trk .dscroll{flex:1;min-width:0;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;position:relative}
#trk .dgrid{position:relative;min-width:100%;width:max-content}
#trk .drow{display:flex}
#trk .dh{position:sticky;left:0;z-index:2;width:var(--dhw);flex:none;background:var(--bg);border-right:1px solid var(--line);box-sizing:border-box}
#trk .dtl{position:relative;flex:none}
#trk .druler{position:sticky;top:0;z-index:4;background:var(--bg);border-bottom:1px solid var(--line)}
#trk .druler .dh{z-index:5;height:34px}
#trk .druler .dtl{height:34px}
#trk .dbn{position:absolute;top:2px;font-size:.66rem;color:var(--muted);padding-left:4px;border-left:1px solid var(--line);height:30px;box-sizing:border-box}
#trk .dbn.now{color:var(--ink);font-weight:700}
#trk .dcn{position:absolute;bottom:3px;border:0;background:none;padding:0 4px;cursor:pointer;font-weight:700;font-size:.74rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-align:left}
#trk .dtrack .dh{height:var(--drh);display:flex;align-items:center;gap:6px;padding:0 6px 0 10px;border-bottom:1px solid var(--line)}
#trk .dtrack .dh::before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:4px;border-radius:0 3px 3px 0;background:var(--tc)}
#trk .dms2{display:flex;border:1.5px solid var(--line);border-radius:9px;overflow:hidden;flex:none}
#trk .dms2 button{width:26px;height:30px;border:0;background:var(--surface);cursor:pointer;padding:0;display:grid;place-items:center}
#trk .dms2 button+button{border-left:1.5px solid var(--line)}
#trk .dms2 button[data-k=m][aria-pressed=true]{background:var(--ink);color:var(--bg)}
#trk .dms2 button[data-k=s][aria-pressed=true]{background:var(--warn);color:#1B2230}
#trk .dico{flex:1;min-width:0;height:66px;border:0;border-radius:12px;background:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:0 2px}
#trk .dico span{font-size:.62rem;color:var(--muted);max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#trk .dtrack.sel .dico{background:var(--surface);box-shadow:0 0 0 1.5px var(--tc) inset}
#trk .dtrack .dtl{height:var(--drh);border-bottom:1px solid var(--line);cursor:pointer;touch-action:pan-y}
#trk .dtrack .dtl canvas{position:absolute;left:0;top:0;width:100%;height:100%}
#trk .dtrack.silent .dtl canvas{opacity:.35}
#trk .dadd .dh{display:flex;align-items:center;justify-content:center;height:70px;border-right:1px solid var(--line)}
#trk .daddb{width:52px;height:52px;border:0;background:none;cursor:pointer;color:var(--ink);display:grid;place-items:center}
#trk .dfill{flex:1}
#trk .dfill .dh{height:100%}
#trk .dhead{position:absolute;top:0;width:2px;background:var(--ink);z-index:3;pointer-events:none}
#trk .dhead::before{content:"";position:absolute;top:0;left:-6px;border:7px solid transparent;border-top:9px solid var(--ink);border-bottom:0}
#trk .dfoot{flex:none;display:flex;align-items:center;justify-content:center;gap:14px;padding:10px 12px max(12px,env(safe-area-inset-bottom,0px))}
#trk .dfoot .transport{width:min(600px,100%);margin:0}
#trk .dsnd{padding:4px 0 2px}
#trk .dsnd .chips{justify-content:center}
#trk .ditb{border:0;background:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;padding:4px 8px;border-radius:14px;width:100%}
#trk .ditb b{font-family:var(--display);font-weight:900;font-size:1.15rem;color:var(--t);display:flex;align-items:center;gap:6px}
#trk .ditb small{font-size:.7rem;color:var(--muted)}
#trk .ditb[aria-expanded=true] b svg{transform:rotate(90deg)}
#trk .diname2{width:100%;box-sizing:border-box;background:var(--surface);border:1px solid var(--line);border-radius:10px;padding:9px 10px;color:var(--ink);font:inherit;font-size:.9rem}
#trk .dgrip{position:absolute;top:0;bottom:0;width:2px;background:var(--ink);pointer-events:none;z-index:3}
#trk .dtip{position:absolute;z-index:6;top:4px;transform:translateX(-50%);background:var(--ink);color:var(--bg);font-size:.7rem;font-weight:700;border-radius:999px;padding:3px 8px;white-space:nowrap;pointer-events:none}
#trk .dhint{font-size:.72rem;color:var(--muted);line-height:1.6;margin:0;padding:10px 12px;position:sticky;left:0;width:min(100vw,600px);box-sizing:border-box}
#trk .dmore{position:sticky;left:0;width:min(100vw,600px);box-sizing:border-box;padding:0 12px 24px}
#trk .dmore details{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 12px}
#trk .dmore summary{font-weight:700;font-size:.84rem;cursor:pointer}
#trk .dmore p{font-size:.74rem;color:var(--muted);margin:8px 0}
#trk .tstyles{display:flex;flex-wrap:wrap;gap:6px}
/* ミキサー（左から出る。トラックは右へずれる） */
#trk .dinsp{width:min(340px,68vw);flex:none;overflow-y:auto;overscroll-behavior:contain;background:var(--surface);border-right:1px solid var(--line);padding:0 12px 24px;box-sizing:border-box}
#trk .dinsp[hidden]{display:none}
#trk .dititle{display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 0 6px;position:relative}
#trk .dipic{width:84px;height:64px;border-radius:14px;background:var(--bg);display:grid;place-items:center;color:var(--tc)}
#trk .dipic svg{width:44px;height:44px}
#trk .diname{border:0;background:none;text-align:center;font-family:var(--display);font-weight:900;font-size:1.2rem;color:var(--t);width:100%;padding:2px 0;border-bottom:1.5px dashed transparent}
#trk .diname:focus{outline:0;border-bottom-color:var(--line)}
#trk .disec{background:var(--bg);border-radius:12px;margin-top:10px;overflow:hidden}
#trk .disec h3{margin:0;padding:9px 12px;font-size:.8rem;font-weight:700;text-align:center;color:var(--muted);border-bottom:1px solid var(--line)}
#trk .dib{padding:10px 12px 12px;display:flex;flex-direction:column;gap:10px}
#trk .dirow{display:flex;flex-direction:column;gap:2px;font-size:.8rem}
#trk .dirow span{display:flex;justify-content:space-between}
#trk .dirow output{font-variant-numeric:tabular-nums;color:var(--muted)}
#trk .dirow input{width:100%;accent-color:var(--t)}
#trk .dims{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#trk .dims button{height:40px;border:1.5px solid var(--line);border-radius:10px;background:var(--surface);cursor:pointer;font-weight:900}
#trk .dims button[data-k=m][aria-pressed=true]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
#trk .dims button[data-k=s][aria-pressed=true]{background:var(--warn);color:#1B2230;border-color:var(--warn)}
#trk .dilink{display:flex;align-items:center;gap:8px;justify-content:space-between;border:1px solid var(--line);background:var(--surface);border-radius:10px;padding:10px 12px;cursor:pointer;font-size:.8rem;font-weight:700;width:100%;text-align:left}
#trk .tcolors{display:flex;gap:8px;flex-wrap:wrap}
#trk .tcolors button{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0}
#trk .tcolors button[aria-pressed=true]{box-shadow:0 0 0 2px var(--surface) inset;border-color:var(--ink)}
#trk .didel{border:1.5px solid var(--line);background:none;color:var(--d);border-radius:10px;padding:10px;cursor:pointer;font-weight:700;font-size:.82rem;margin-top:12px;width:100%}
body.pro #arp2Lane,body.pro #bassLane{display:none}
body.pro .mix{display:none}
body.pro #drumLane .lanehead{display:none}
body.pro #drumLane{margin-top:-6px}
body.pro .lane canvas{height:28px}
body.pro #sheet .proedit{display:none!important}
#patSheet .pdirect{display:flex;gap:6px;align-items:center;margin:-4px 0 10px;flex-wrap:wrap}
#patSheet .pdirect small{color:var(--muted);font-size:.74rem;flex:1;min-width:12em}
body.pro #accNote{display:none}
button.badge{font:inherit;font-size:.72rem;cursor:pointer}
@media (max-height:500px){ #trk{--drh:66px} #trk .dico{height:56px} #trk .dfoot{padding-top:4px;padding-bottom:max(4px,env(safe-area-inset-bottom,0px))} #trk .dfoot .play{width:52px;height:52px} #trk .dtop{padding-top:max(6px,env(safe-area-inset-top,0px));padding-bottom:6px} }`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  const el=document.createElement('div'); el.id='trk'; el.hidden=true; el.setAttribute('role','dialog'); el.setAttribute('aria-label','トラック');
  el.innerHTML=`<div class="dtop">
      <button class="dtb" id="dMix" aria-label="ミキサー" aria-pressed="false">${ICO.mix}</button>
      <span class="dsp"></span>
      <button class="dtb dx" id="dClose" aria-label="閉じる">${ICO.close}</button></div>
    <div class="dbody"><div class="dinsp" id="dInsp" hidden></div><div class="dscroll" id="dScroll"><div class="dgrid" id="trkList"></div></div></div>
    <div class="dfoot" id="dFoot"></div>`;
  document.body.appendChild(el);
  // 編集画面の上に「別のパターンを選ぶ」
  const pd=document.createElement('div'); pd.className='pdirect'; pd.id='patDirect'; pd.hidden=true;
  pd.innerHTML=`<button class="chip" id="patPick">別のパターンを選ぶ</button><small id="patDirectNote"></small>`;
  const ps=$('patSheet'); ps.insertBefore(pd, ps.children[1]);
})();
const trk=$('trk');
let TRK_SEL=null, TRK_STY=false;   // ミキサーを開いているトラック
// 再生ボタン・テンポ（メイン画面の .transport）を、開いているあいだはこちらの下へ移す
const TP=document.querySelector('.app>.transport'), TP_MARK=document.createComment('transport');
function tpIn(){ if(TP && TP.parentNode!==$('dFoot')){ TP.parentNode.insertBefore(TP_MARK,TP); $('dFoot').appendChild(TP); } }
function tpOut(){ if(TP_MARK.parentNode) TP_MARK.parentNode.replaceChild(TP,TP_MARK); }
function openTracks(){ trk.hidden=false; tpIn(); renderTracks(); requestAnimationFrame(dawFrame); }
function closeTracks(){ trk.hidden=true; tpOut(); TRK_SEL=null; $('dInsp').hidden=true; renderAll(); }
$('dClose').onclick=closeTracks;
$('dMix').onclick=()=>{ TRK_SEL = TRK_SEL ? null : trackList()[0].kind; renderTracks(); };
$('bpm').addEventListener('input',()=>applyMix());   // エコーの間隔をテンポに合わせる

// ---- その場所で実際に使っている弾き方（場面）を調べる。鳴らすときの選び方（sitVar）と同じ
const SIT_KEYS={bar:['bar','bar2','bar3rd','bar4th'], bar3:['bar3','bar32']};
function sceneAt(kind,b,cell){ if(xType(kind)==='drum') return withTrk(kind,k=>sceneAt(k,b,cell)); const L=slotSteps(), has=cell.v!==null&&cell.v!==undefined;
  const lag=has?Math.min(Math.max(0,-shiftOf(b,cell.h)),cell.len-1):0, g0=b*L+cell.off+lag, bar=Math.floor(g0/16), startPi=g0%16, len=cell.len-lag;
  if(kind==='drum'){ const dr=DRUMS[state.drum]||{}; return {key:(bar%2===1&&dr.VB)?'B':'bar', bar, off:startPi}; }
  const pat=ARPS[patOf(kind)]; if(!pat) return null;
  if(!pat.sit){ const ev=(pat.ev||[]).filter(e=>e[0]>=startPi&&e[0]<startPi+len).map(e=>[e[0]-startPi,...e.slice(1)]); return {key:'bar', evs:ev, len, bar, off:startPi}; }
  const S=pat.sit; let k=len>=16?'bar':len>=12?((S.bar3&&startPi===0)?'bar3':'bar'):len>=6?(startPi===0?'halfA':'halfB'):'beat';
  // その場面がなければ、鳴らすときと同じように近い場面を使う
  const fb={beat:S.halfB?'halfB':'halfA', halfB:'halfA', halfA:'bar', bar3:'bar'};
  while(!S[k] && fb[k]) k=fb[k]; if(!S[k]) k='bar';
  const list=S[k], i=bar%list.length, key=(SIT_KEYS[k]||[k])[i]||k;
  return {key, evs:list[i].evs, len, bar, off:0}; }
const SCENE_NAME=k=>((typeof SCENES!=='undefined'?SCENES:[]).concat(typeof DRUM_SCENES!=='undefined'?DRUM_SCENES:[]).find(x=>x[0]===k)||[k,k])[1];

// 1マスの幅：メイン画面と同じく4マスずつ画面に収める（8・16マスは上のページで切りかえ。横にはスクロールしない）
function dawBarW(){ const sc=$('dScroll'), hw=trk.querySelector('.dh')?.offsetWidth||116;
  return Math.max(40, Math.floor(((sc.clientWidth||innerWidth)-hw-2)/4)); }
const roleCol=(col,r)=>r==='X'?col.muted:col[r.toLowerCase()];
function renderTracks(){ if(trk.hidden) return; if(!state.pro){ trk.hidden=true; tpOut(); TRK_SEL=null; return; }
  const box=$('trkList'); box.innerHTML='';
  const L=trackList(), solo=L.some(t=>mixOf(mixKey(t.kind)).s), N=state.bars, col=colors();
  if(TRK_SEL && !L.some(t=>t.kind===TRK_SEL)) TRK_SEL=null;
  $('dMix').setAttribute('aria-pressed',!!TRK_SEL);
  // 目盛り：小節の番号と、そこで鳴るコード（タップでコードを編集）
  const ru=document.createElement('div'); ru.className='drow druler'; ru.innerHTML=`<div class="dh"></div><div class="dtl"></div>`; box.appendChild(ru);
  L.forEach(({kind})=>{ const mk=mixKey(kind), x=mixOf(mk), row=document.createElement('div');
    row.className='drow dtrack'+(TRK_SEL===kind?' sel':''); row.dataset.kind=kind; row.classList.toggle('silent', solo?!x.s:!!x.m); row.style.setProperty('--tc',tkColor(kind));
    row.innerHTML=`<div class="dh"><div class="dms2"><button data-k="m" aria-pressed="${!!x.m}" aria-label="ミュート">${ICO_MUTE}</button><button data-k="s" aria-pressed="${!!x.s}" aria-label="ソロ">${ICO_SOLO}</button></div>
      <button class="dico" aria-label="${esc(tkName(kind))}のミキサー">${tkIco(kind)}<span>${esc(tkName(kind))}</span></button></div>
      <div class="dtl"><canvas></canvas></div>`;
    box.appendChild(row);
    row.querySelectorAll('.dms2 button').forEach(b=>b.onclick=()=>{ x[b.dataset.k]=!x[b.dataset.k]; applyMix(); save(); renderTracks(); });
    row.querySelector('.dico').onclick=()=>{ TRK_SEL = TRK_SEL===kind ? null : kind; renderTracks(); };
    bindRegion(row.querySelector('.dtl'),kind); });
  const ad=document.createElement('div'); ad.className='drow dadd'; ad.innerHTML=`<div class="dh"><button class="daddb" id="trkAdd" aria-label="楽器を足す">${ICO.plus}</button></div>`; box.appendChild(ad);
  $('trkAdd').onclick=addTrack;
  const hint=document.createElement('p'); hint.className='dhint'; hint.textContent='色の帯をタップすると、弾き方を編集できます。帯の区切りをドラッグすると、コードの長さや食いを変えられます。楽器の絵をタップするとミキサーが開きます。'; box.appendChild(hint);    // ミキサーが開いて狭いときも、見えている幅で折り返す
  const mo=document.createElement('div'); mo.className='dmore'; box.appendChild(mo);
  { const fitW=()=>{ const sc=$('dScroll'), w=sc?sc.clientWidth:0; if(!w) return; const narrow=w<240;   // ミキサーが開いて狭いときは説明を隠す。ふだんは見えている幅で折り返す
      hint.hidden=mo.hidden=narrow; if(!narrow){ const px=Math.min(600,w)+'px'; hint.style.width=px; mo.style.width=px; } };
    requestAnimationFrame(fitW); setTimeout(fitW,400); }
  pickRow(mo,'トラックをまとめて置きかえる','伴奏スタイルから作り直す','選んだスタイルと同じ鳴り方・ミックスにします（いまのトラックはなくなります）',null,null,
    ()=>openPicker('伴奏スタイルから作り直す', styleCats, null, id=>{ const st=STYLES.find(x=>x.id===id); 
      proFromStyle(st); if(st.bpm){ state.bpm=st.bpm; $('bpm').value=state.bpm; $('bpmOut').textContent=state.bpm; } state.tk={}; applyMix(); save(); renderAll(); ensureSounds(); renderTracks(); return true; }));
  const hd=document.createElement('div'); hd.className='dhead'; hd.id='dHead'; hd.hidden=true; box.appendChild(hd);
  requestAnimationFrame(()=>{ const bw=dawBarW(); trk.style.setProperty('--dbw',bw+'px');
    box.querySelectorAll('.dtl').forEach(t=>t.style.width=(bw*N)+'px');
    // 目盛り
    const rt=ru.querySelector('.dtl'); let h='';
    for(let b=0;b<N;b++) h+=`<span class="dbn" data-b="${b}" style="left:${b*bw}px">${b+1}</span>`;
    const E=chordLine(), S=effStarts('arp',E), ps=bw/slotSteps();
    E.forEach((e,k)=>{ if(contOf(E,k)) return; const em=e.v===null||e.v===undefined, x0=Math.max(0,S[k]); let j=k+1; while(j<E.length&&contOf(E,j)) j++; const x1=j<E.length?S[j]:N*slotSteps();
      h+=`<button class="dcn" data-b="${e.b}" data-h="${e.h}" style="left:${x0*ps}px;max-width:${(x1-x0)*ps}px;color:${em?col.muted:roleCol(col,roleAt(e.b,e.h,e.v))}">${em?'—':esc(chordText(e.v))}</button>`; });
    rt.innerHTML=h; rt.querySelectorAll('.dcn').forEach(x=>x.onclick=()=>openEditor(+x.dataset.b,+x.dataset.h));
    box.querySelectorAll('.dtrack').forEach((row,i)=>drawRegion(row.querySelector('canvas'),L[i].kind,bw,col));
    const last=[...box.querySelectorAll('.dtrack')].pop(); if(last){ hd.style.height=(last.offsetTop+last.offsetHeight)+'px'; } });
  renderInsp(); }
// 曲の中のコードの並び（マスをまたいで1列に）。pos＝16分の位置、ant＝食い（＋）・後ろ倒し（－）。決めていなければ null
function chordLine(){ const L=slotSteps(), E=[]; for(let b=0;b<state.bars;b++) cellsOf(b).forEach(c=>{ const a=c.h?(segsOf(b)[c.h-1]||{}).ant:(state.ant||[])[b]; E.push({pos:b*L+c.off, v:c.v, ant:a==null?null:a, b, h:c.h}); }); return E; }
// 並びを、マス（slots）・マスの途中の変わり目（segs）・食い（ant）に書きもどす
function setChordLine(E){ const L=slotSteps(); state.ant=state.ant||Array(16).fill(null); state.segs=state.segs||[];
  for(let b=0;b<state.bars;b++){ const s0=b*L, inS=E.filter(e=>e.pos>=s0&&e.pos<s0+L), head=inS.find(e=>e.pos===s0), prev=E.filter(e=>e.pos<s0).pop();
    state.slots[b]=head?head.v:(prev?prev.v:null); state.ant[b]=head&&head.ant!=null?head.ant:null;
    state.segs[b]=inS.filter(e=>e.pos>s0&&e.v!=null).map(e=>({beat:(e.pos-s0)/4+1, v:e.v, ...(e.ant!=null?{ant:e.ant}:{})})); } }
// 実際に鳴り始める位置（食い・後ろ倒し、パターンの決まった食いも入れる。鳴らすときと同じ決め方）
const hasV=v=>v!==null&&v!==undefined;
const contOf=(E,k)=>k>0 && hasV(E[k].v) && E[k].h===0 && E[k].ant==null && JSON.stringify(E[k].v)===JSON.stringify(E[k-1].v);
function effStarts(kind,E){ const pat=ARPS[isBassK(kind)||isDrumK(kind)?state.arp:patOf(kind)]||{}, end=state.bars*slotSteps();
  return E.map((e,k)=>{ if(k===0||!hasV(e.v)) return e.pos; const pv=E[k-1], nx=E[k+1]?E[k+1].pos:end; let a=e.ant;
    if(a==null){ const same=hasV(pv.v)&&JSON.stringify(e.v)===JSON.stringify(pv.v); a=(same&&!(pat.sit&&pat.sit.push))?0:(pat.push2nd&&e.pos%16===0&&(e.pos/16)%2===0)?0:(pat.pushBy||0); }
    a=Math.max(-(nx-e.pos-1),Math.min(a,e.pos-pv.pos-1)); return e.pos-a; }); }
// 帯：コードごとに区切り、役割の色（T・S・D）でぬって、その場所で鳴る弾き方を描く。ドラムは1本の帯
function drawRegion(cv,kind,bw,col,E){ { const xt=xType(kind); if(xt==='drum'||xt==='bass') return withTrk(kind,k=>drawRegion(cv,k,bw,col,E)); } if(!cv.clientWidth) return; const g=fit(cv), W=cv.width, H=cv.height, r=devicePixelRatio||1, N=state.bars, L=slotSteps();
  g.clearRect(0,0,W,H); const w=bw*r, ps=w/L, pad=5*r, ty=pad+3*r, th=H-2*pad-6*r;
  const box=(x,y,ww,hh,c,a)=>{ g.globalAlpha=a; g.fillStyle=c; rr(g,x,y,ww,hh,7*r); g.fill(); g.globalAlpha=1; g.strokeStyle=c; g.lineWidth=1.2*r; rr(g,x,y,ww,hh,7*r); g.stroke(); };
  if(kind==='drum'){ const dr=DRUMS[state.drum]; box(1.5*r,pad,W-3*r,H-2*pad,col.muted,.14); if(!dr) return;
    for(let b=0;b<N;b++){ const start=b*L, db=Math.floor(start/16); drawDrumBar(g,b*w+5*r,ty,w-10*r,th,(db%2===1&&dr.VB)?{...dr,V:dr.VB}:dr,col,fillModeOf(db,dr),start%16,L); } return; }
  E=E||chordLine(); const S=effStarts(kind,E);
  E.forEach((e,k)=>{ if(!hasV(e.v)) return; const s0=S[k], s1=k+1<E.length?S[k+1]:N*L, len=s1-s0; if(len<=0) return;
    const c=roleCol(col,roleAt(e.b,e.h,e.v)), x=s0*ps+2*r, ww=len*ps-4*r;
    if(!contOf(E,k)){ let j=k+1; while(j<E.length&&contOf(E,j)) j++; const ge=j<E.length?S[j]:N*L; box(x,pad,(ge-s0)*ps-4*r,H-2*pad,c,.2); }
    if(kind==='bass') drawBassBar(g,x+3*r,ty,ww-6*r,th,(bassList(DRUMS[state.drum])||[]).filter(q=>q[0]<len),c,col,len);
    else { const cell=cellsOf(e.b)[e.h], sc=cell&&sceneAt(kind,e.b,cell); if(sc) drawArpBar(g,x+3*r,ty,ww-6*r,th,{ev:sc.evs},c,col,Math.max(1,len)); }
    // 区切りのつまみ（ドラッグで動かせる）
    if(k>0&&!contOf(E,k)){ g.fillStyle=col.ink; g.globalAlpha=.55; rr(g,s0*ps-1.5*r,H/2-9*r,3*r,18*r,1.5*r); g.fill(); g.globalAlpha=1; } }); }
// 帯をさわる：区切りの近くを左右にドラッグすると、そのコードが鳴り始める位置を動かす（拍の位置＋食い・後ろ倒し 16分2つまで）
// それ以外の所をタップすると、その場所で使っている弾き方を開く
function bindRegion(el,kind){ let drag=null, sx=0, sy=0, moved=false;
  const stepW=()=>(parseFloat(trk.style.getPropertyValue('--dbw'))||96)/slotSteps();
  el.addEventListener('pointerdown',ev=>{ sx=ev.clientX; sy=ev.clientY; moved=false; drag=null; if(isDrumK(kind)) return;
    const rc=el.getBoundingClientRect(), x=ev.clientX-rc.left, ps=stepW(), E=chordLine(), S=effStarts(kind,E);
    let best=-1, bd=18; S.forEach((s,k)=>{ if(k===0||contOf(E,k)||!(hasV(E[k].v)||hasV(E[k-1].v))) return; const d=Math.abs(s*ps-x); if(d<bd){ bd=d; best=k; } });
    if(best>0){ drag={k:best,E,ps,left:rc.left}; el.setPointerCapture(ev.pointerId); ev.preventDefault(); } });
  el.addEventListener('pointermove',ev=>{ if(Math.abs(ev.clientX-sx)>6||Math.abs(ev.clientY-sy)>6) moved=true; if(!drag||!moved) return;
    const {k,E,ps}=drag, L=slotSteps(), end=state.bars*L, prev=E[k-1].pos, next=k+1<E.length?E[k+1].pos:end;
    const s=Math.round((ev.clientX-drag.left)/ps), lo=Math.floor(prev/4)*4+4, hi=Math.ceil(next/4)*4-4; if(lo>hi) return;
    const pos=Math.max(lo,Math.min(hi,Math.round(s/4)*4)), a=Math.max(-2,Math.min(2,pos-s));
    drag.pos=pos; drag.ant=a; const E2=E.map(x=>({...x})); E2[k].pos=pos; E2[k].ant=a;
    trk.querySelectorAll('.dtrack').forEach(row=>{ const kd=row.dataset.kind; if(!isDrumK(kd)) drawRegion(row.querySelector('canvas'),kd,ps*L,colors(),E2); });
    let tip=el.querySelector('.dtip'); if(!tip){ tip=document.createElement('span'); tip.className='dtip'; el.appendChild(tip); }
    const bt=pos%L/4+1, sl=Math.floor(pos/L)+1; tip.style.left=((pos-a)*ps)+'px';
    tip.textContent=`${sl}${state.len<4?'マス目':'小節目'}の${bt}拍目${a>0?`（${a===2?'8分':'16分'}食う）`:a<0?`（${a===-2?'8分':'16分'}後ろ）`:''}`; });
  el.addEventListener('pointerup',ev=>{ if(drag){ const d=drag; drag=null; el.querySelector('.dtip')?.remove();
      if(moved && d.pos!=null){ d.E[d.k].pos=d.pos; d.E[d.k].ant=d.ant; setChordLine(d.E); save(); renderAll(); renderTracks(); } else if(moved) renderTracks(); else tapRegion(kind,ev,el); return; }
    if(!moved) tapRegion(kind,ev,el); });
  el.addEventListener('pointercancel',()=>{ if(drag){ drag=null; el.querySelector('.dtip')?.remove(); renderTracks(); } }); }
// 帯をタップ：その場所のコード（ドラムは小節）で使っている弾き方を開く
function tapRegion(kind,ev,el){ const bw=parseFloat(trk.style.getPropertyValue('--dbw'))||96, L=slotSteps(), st=(ev.clientX-el.getBoundingClientRect().left)/bw*L;
  if(isDrumK(kind)){ const b=Math.max(0,Math.min(state.bars-1,Math.floor(st/L))), cell=cellsOf(b)[0], sc=sceneAt(kind,b,cell); openBlk(kind, sc.key, `${b+1}${state.len<4?'マス目':'小節目'}`, b*L, (b+1)*L); return; }
  const E=chordLine(), S=effStarts(kind,E); let k=0; S.forEach((s,i)=>{ if(st>=s) k=i; }); const e=E[k];
  if(!hasV(e.v)){ toast('ここにはコードがありません'); return; }
  const cell=cellsOf(e.b)[e.h], sc=isBassK(kind)?null:sceneAt(kind,e.b,cell);
  const where=`${e.b+1}${state.len<4?'マス目':'小節目'}${cell.off?`の${cell.off/4+1}拍目から`:''}`;
  let j=k+1; while(j<E.length&&contOf(E,j)) j++; let k0=k; while(k0>0&&contOf(E,k0)) k0--;
  openBlk(kind, sc&&sc.key, where+'「'+chordText(e.v)+'」', Math.max(0,S[k0]), j<E.length?S[j]:state.bars*L); }
// 再生中の位置（線）
let dawPlayPg=-1;
function dawFrame(){ if(trk.hidden) return; const hd=$('dHead'), on=!!playing;
  if(hd){ if(on&&cur&&ctx){ const bw=parseFloat(trk.style.getPropertyValue('--dbw'))||96, frac=Math.min(1,(ctx.currentTime-cur.t)/stepDur()), hw=trk.querySelector('.dh').offsetWidth;
      const hx=hw+(cur.b+(cur.s+frac)/(cur.L||16))*bw; hd.hidden=false; hd.style.left=hx+'px';
      const pg=Math.floor(cur.b/4); if(pg!==dawPlayPg){ dawPlayPg=pg; if(pg!==page && pg*4<state.bars){ page=pg; renderSlots(); } }   // 鳴っている所が次のページへ進んだときだけ切りかえる（再生中もほかのページを見られる）
      trk.querySelectorAll('.dbn').forEach(s=>s.classList.toggle('now',+s.dataset.b===cur.b)); }
    else if(!on) dawPlayPg=-1; if(!on&&!hd.hidden){ hd.hidden=true; trk.querySelectorAll('.dbn.now').forEach(s=>s.classList.remove('now')); } }
  requestAnimationFrame(dawFrame); }
// ミキサー（GarageBand の「トラック設定」のように左から出る）
const FX_ROWS=[['comp','コンプ（音量をそろえる）',0,1],['hi','高音（トレブル）',-1,1],['lo','低音（ベース）',-1,1],['echo','エコー（やまびこ）',0,1],['rev','リバーブ（部屋の響き）',0,1]];
const fxTxt=(k,v)=>k==='hi'||k==='lo' ? (Math.abs(v)<.03?'0':(v>0?'+':'−')+Math.round(Math.abs(v)*9)+'dB') : Math.round(v*100);
let INSP_SND=false;   // ミキサーで音色の一覧を開いているか
function renderInsp(){ const p=$('dInsp'), kind=TRK_SEL; if(!kind){ p.hidden=true; INSP_SND=false; return; } p.hidden=false;
  const x=mixOf(mixKey(kind)), pan=x.pan||0, canDel=true, m=tkMeta(kind);
  p.style.setProperty('--tc',tkColor(kind));
  const rng=(f,label,min,max,val,txt)=>`<label class="dirow"><span>${label}<output>${txt}</output></span><input type="range" min="${min}" max="${max}" step=".01" value="${val}" data-f="${f}"></label>`;
  const sndName = tkInst(kind)||'';
  p.innerHTML=`<div class="dititle"><button class="ditb" id="diSnd" ><div class="dipic">${tkIco(kind)}</div><b>${esc(sndName)}${ICO.chev}</b><small>タップして楽器を変える</small></button></div>
    <div class="disec"><div class="dib"><button class="dilink" id="diPick"><span>${isDrumK(kind)?'パターン・フィルインを選ぶ':isBassK(kind)?'パターンを選ぶ':'パターン・音域を選ぶ'}</span>${ICO.chev}</button></div></div>
    <div class="disec"><h3>出力</h3><div class="dib">
      ${rng('v','音量',0,1.5,x.v??1,Math.round((x.v??1)*100))}
      ${rng('pan','左右（パン）',-1,1,pan,panTxt(pan))}
      <div class="dims"><button data-k="m" aria-pressed="${!!x.m}">ミュート</button><button data-k="s" aria-pressed="${!!x.s}">ソロ</button></div></div></div>
    <div class="disec"><h3>エフェクト</h3><div class="dib">${FX_ROWS.map(([f,l,a,b])=>rng(f,l,a,b,x[f]||0,fxTxt(f,x[f]||0))).join('')}</div></div>
    <div class="disec"><h3>トラックの名前と色</h3><div class="dib"><input class="diname2" id="diName" maxlength="16" value="${esc(tkName(kind))}" aria-label="トラックの名前"><div class="tcolors" id="diColors"></div></div></div>
    ${canDel?'<button class="didel" id="diDel">このトラックをなくす</button>':''}`;
  $('diPick').onclick=()=>(xType(kind)==='drum'||xType(kind)==='bass')?xPatPick(kind):openSheet(kind);
  $('diSnd').onclick=()=>{ const X=xOf(kind), done=()=>{ save(); renderAll(); ensureSounds(); applyMix(); renderTracks(); return false; };
    if(isBassK(kind)) openPicker('ベースの音を選ぶ', ()=>[['ベース',Object.entries(BASS_SNDS).map(([k,l])=>({k,label:l,ico:icoBass(k)}))]], X?(X.bassSnd||'bass'):(state.bassSnd||'bass'), v=>{ if(X) X.bassSnd=v; else state.bassSnd=v; return done(); });
    else if(isDrumK(kind)) openPicker('ドラムの音を選ぶ', ()=>catsOf(KIT_GROUPS,KITS,icoKit), X?(X.kit||'std'):state.kit, v=>{ if(X) X.kit=v; else pickKit(v); return done(); });
    else openPicker('楽器を選ぶ', ()=>catsOf(INST_GROUPS,INSTS,icoInst), X?(X.inst||'piano'):kind==='arp2'?(state.inst2||'epiano'):state.inst, v=>{ if(X) X.inst=v; else if(kind==='arp2') state.inst2=v; else pickInst(v); return done(); }); };
  p.querySelectorAll('.dirow input').forEach(inp=>inp.oninput=()=>{ const f=inp.dataset.f; x[f]=+inp.value; inp.previousElementSibling.querySelector('output').textContent= f==='pan'?panTxt(x.pan):f==='v'?Math.round(x.v*100):fxTxt(f,x[f]); applyMix(); save(); });
  p.querySelectorAll('.dims button').forEach(b=>b.onclick=()=>{ x[b.dataset.k]=!x[b.dataset.k]; applyMix(); save(); renderTracks(); });
  const nm=$('diName'); nm.onchange=()=>{ const v=nm.value.trim(); if(v) m.name=v; else delete m.name; save(); nm.blur(); renderTracks(); renderAll(); }; nm.onkeydown=e=>{ if(e.key==='Enter') nm.blur(); };
  const cl=$('diColors'); TRK_COLORS.forEach(c=>{ const b=document.createElement('button'); b.style.background=c; b.setAttribute('aria-label','色'); b.setAttribute('aria-pressed',tkColor(kind)===c); b.onclick=()=>{ m.color=c; save(); renderTracks(); }; cl.appendChild(b); });
  const del=$('diDel'); if(del) del.onclick=()=>{ if(!del.dataset.armed){ del.dataset.armed='1'; del.textContent='もう一度押すとなくします'; return; } removeTrack(kind); }; }
// メイン画面が描き直されたら、トラックの画面も合わせる（ミキサーで入力しているあいだは描き直さない）
{ const ra=renderAll; renderAll=function(){ const r=ra.apply(this,arguments); if(typeof trk!=='undefined' && !trk.hidden && !document.activeElement?.closest?.('#dInsp')) renderTracks(); return r; }; }
addEventListener('resize',()=>{ if(!trk.hidden) renderTracks(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',()=>{ if(!trk.hidden) renderTracks(); });
// 楽器を足す：コード2が空いていればコード2に、そうでなければ足した楽器（state.xtr）に。足したらパターンを選ぶ画面を開く
// 楽器を足す：選ぶ画面で選んで「決定」したときだけ足す。ドラム・ベースは、ないときだけ選べる
function xPatPick(kind){ const drum=isDrumK(kind), done=()=>{ save(); renderAll(); ensureSounds(); renderTracks(); return true; };
  if(drum) openPicker('ドラムの演奏を選ぶ', ()=>patCats(kind), patOf(kind), v=>{ setPatOf(kind,v); return done(); }, false);
  else openPicker('ベースの弾き方を選ぶ', ()=>[['ベースの弾き方',Object.keys(BASSES).map(k=>({k,label:BASSES[k].name}))]], patOf(kind)||'auto', v=>{ setPatOf(kind,v); return done(); }, false); }
const FAM_PAT={keys:'piano4',guitar:'strum',strings:'whole',brass:'brassobb',sax:'hornline',synth:'anilead',bells:'glockline',wa:'koto'};
function addTrack(){ const hasDrum=state.drum!=='none'&&!state.drumOff, cats=()=>{ const c=catsOf(INST_GROUPS,INSTS,icoInst);
    c.push(['ドラム',KIT_GROUPS.flatMap(([h,ks])=>ks.map(k=>({k:'@drum:'+k,label:KITS[k],sub:h,ico:icoKit(k)})))]);
    c.push(['ベース',Object.entries(BASS_SNDS).map(([k,l])=>({k:'@bass:'+k,label:l,ico:icoBass(k)}))]); return c; };
  const newX=o=>{ state.xtr=state.xtr||[]; const ids=new Set(state.xtr.map(t=>t.id)); let n=1; while(ids.has('t'+n)) n++; state.xtr.push({id:'t'+n,...o}); };
  openPicker('楽器を足す', cats, null, v=>{
    if(v.startsWith('@drum:')){ const kit=v.slice(6), nd=(state.xtr||[]).filter(t=>t.type==='drum').length;
      if(!hasDrum){ state.drumOff=false; if(state.drum==='none') state.drum='pop'; state.kit=kit; mixOf('drum').m=false; }
      else newX({type:'drum', drum:state.drum, kit, name:'ドラム'+(nd+2)}); }
    else if(v.startsWith('@bass:')){ const snd=v.slice(6), nb=(state.xtr||[]).filter(t=>t.type==='bass').length;
      if(!state.bass){ state.bass=true; state.bassSnd=snd; state.bassPat=state.bassPat||'auto'; }
      else newX({type:'bass', bassPat:state.bassPat||'auto', bassSnd:snd, name:'ベース'+(nb+2)}); }
    else { const pat=ARPS[FAM_PAT[famOfInst(v)]]?FAM_PAT[famOfInst(v)]:'whole';
      if(!state.arp2 || !ARPS[state.arp2]){ state.arp2=pat; state.inst2=v; }
      else { state.xtr=state.xtr||[]; const ids=new Set(state.xtr.map(t=>t.id)); let n=1; while(ids.has('t'+n)) n++;
        state.xtr.push({id:'t'+n, arp:pat, inst:v, rhLo:null, lhLo:null, rhOff:0, lhOff:0, name:'楽器'+(state.xtr.length+3)}); } }
    save(); renderAll(); ensureSounds(); applyMix(); renderTracks(); toast('トラックを足しました'); }, false); }
function removeTrack(kind){ const x=xOf(kind);
  if(x){ state.xtr=state.xtr.filter(t=>t!==x); if(state.mix) delete state.mix[x.id]; }
  else if(kind==='arp2'){ // コード2をなくすと、足した楽器の1つ目がコード2になる（並びはそのまま）
    const t=(state.xtr||[]).shift(); if(t){ Object.assign(state,{arp2:t.arp, inst2:t.inst, rhLo2:t.rhLo, lhLo2:t.lhLo, rhOff2:t.rhOff||0, lhOff2:t.lhOff||0}); state.mix=state.mix||{}; state.mix.arp2=state.mix[t.id]||{v:1,m:false,s:false}; delete state.mix[t.id]; state.tk=state.tk||{}; state.tk.arp2={name:t.name,color:t.color}; } else state.arp2=''; }
  else if(kind==='bass') state.bass=false;
  else if(kind==='drum'){ state.drumOff=true; }   // 鳴らさない（ベースの「ドラムに合わせる」はそのまま）
  else if(kind==='arp'){ // コード（1つ目）をなくすと、コード2が1つ目になる。ほかにコードの楽器がなければなくせない
    if(!state.arp2 || !ARPS[state.arp2]){ toast('コードの楽器は1つは残してください'); return; }
    Object.assign(state,{arp:state.arp2, inst:state.inst2||'epiano', rhLo:state.rhLo2??null, lhLo:state.lhLo2??null, rhOff:state.rhOff2||0, lhOff:state.lhOff2||0});
    state.mix=state.mix||{}; state.mix.arp=state.mix.arp2||{v:1,m:false,s:false}; state.tk=state.tk||{}; state.tk.arp=state.tk.arp2||{}; return removeTrack('arp2'); }
  TRK_SEL=null; applyMix(); save(); renderAll(); renderTracks(); }
// パターンを直接編集する。いつもの伴奏（組み込みのパターン）は、自分用のコピーを作って開き、何も変えずに閉じたらコピーを消して元に戻す
let PAT_TMP=null;
function editTrackPattern(kind,scene,where){ const k=patOf(kind);
  if((kind==='arp2'||xType(kind)==='chord') && (!k || !ARPS[k])) return openSheet(kind);
  const wasMy=/^my\d+$/.test(k||''), nm=tkPatName(kind);
  if(scene) PR.scene=scene;
  openPatEditor(kind,'edit');
  PAT_TMP = wasMy ? null : {kind, prev:k, list:listOf(kind), snap:JSON.stringify(curMy())};
  const here = scene&&where ? `${where}で使っている「${SCENE_NAME(curScene())}」の弾き方です。` : '';
  $('patDirect').hidden=false; $('patDirectNote').textContent = here + (wasMy ? '' : '「'+nm+'」と同じ鳴り方のコピーです。変えると自分用のパターンとして残ります');
}
$('patPick').onclick=()=>{ const kind=patKind; closePatTmp(); closeAll(); openSheet(kind); };
// 編集画面を閉じたとき：コピーに何も変えていなければ、コピーを消して元のパターンに戻す
function closePatTmp(){ const T=PAT_TMP; PAT_TMP=null; $('patDirect').hidden=true; if(!T) return;
  const i=T.list.length-1, m=T.list[i]; if(m && JSON.stringify(m)===T.snap && patOf(T.kind)==='my'+i){ T.list.pop(); setPatOf(T.kind,T.prev); rebuildMy(); save(); renderAll(); } renderTracks(); }
new MutationObserver(()=>{ if(!$('patSheet').classList.contains('on') && (PAT_TMP || !$('patDirect').hidden)) closePatTmp(); }).observe($('patSheet'),{attributes:true,attributeFilter:['class']});
// メイン画面：PRO では伴奏の帯をタップするとトラックの画面
$('arpLane').onclick=()=>state.pro?openTracks():openSheet('arp');
$('drumLane').onclick=()=>state.pro?openTracks():openSheet('drum');
// シートで選び直したら、トラックの画面も描き直す
['sheet','edSheet','patSheet'].forEach(id=>new MutationObserver(()=>{ if(!$(id).classList.contains('on')) renderTracks(); }).observe($(id),{attributes:true,attributeFilter:['class']}));
// 右上の「Key」「楽器」の表示は、押すとそれを変える場所が開く
$('keyBadge').onclick=()=>{ $('menuBtn').click(); setTimeout(()=>$('keyChips').scrollIntoView({block:'center',behavior:'smooth'}),60); };
$('instBadge').onclick=()=>{ if(!$('arpLane').hidden) $('arpLane').click(); };

// ---------- 選ぶ画面を「分類 → 一覧」の2段に（GarageBand の音色ライブラリのように） ----------
// 左に分類、右にその分類の一覧（絵・名前・説明）。いま選んでいるものがある分類には印がつく
(function(){ const st=document.createElement('style'); st.textContent=`
.tpane{display:grid;grid-template-columns:minmax(92px,32%) 1fr;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--surface);height:min(48vh,360px);margin:2px 0}
.tpane .tpl{overflow-y:auto;background:var(--bg);border-right:1px solid var(--line);overscroll-behavior:contain}
.tpane .tpr{overflow-y:auto;overscroll-behavior:contain}
.tpane .tpc{display:flex;justify-content:space-between;align-items:center;gap:6px;width:100%;border:0;border-bottom:1px solid var(--line);background:none;padding:13px 10px 13px 12px;font:inherit;font-size:.82rem;font-weight:700;color:var(--ink);text-align:left;cursor:pointer}
.tpane .tpc[aria-pressed=true]{background:var(--surface);box-shadow:inset 3px 0 0 var(--t)}
.tpane .tpc i{width:7px;height:7px;border-radius:50%;background:var(--t);flex:none}
.tpane .tpc svg{flex:none;color:var(--muted)}
.tpane .tpi{display:flex;align-items:center;gap:10px;width:100%;border:0;border-bottom:1px solid var(--line);background:none;padding:10px 12px;cursor:pointer;text-align:left;font:inherit;color:var(--ink)}
.tpane .tpi[aria-pressed=true]{background:color-mix(in srgb,var(--t) 16%,var(--surface))}
.tpane .tpi>svg{flex:none;color:var(--muted);width:32px;height:32px}
.tpane .tpi[aria-pressed=true]>svg{color:var(--t)}
.tpane .tpi span{flex:1;min-width:0}
.tpane .tpi b{display:block;font-size:.86rem;font-weight:700;line-height:1.35}
.tpane .tpi small{display:block;color:var(--muted);font-size:.7rem;line-height:1.4;margin-top:1px}
.tpane .tpi canvas{width:70px;height:30px;flex:none;border-radius:6px;background:var(--bg)}
.tpane .tpi .tck{flex:none;color:var(--t)}`; document.head.appendChild(st); })();
const ICO_CK='<svg class="tck" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
// cats：[[分類の名前, [{k, label, sub, ico（svg）か cv（キャンバスに描く関数）}]]]
function twoPane(el, cats, cur, onPick){ cats=cats.filter(c=>c[1].length);
  const has=c=>c[1].some(i=>i.k===cur), g=(cats.find(c=>c[0]===el.dataset.g)||cats.find(has)||cats[0])[0];
  el.innerHTML=''; el.classList.add('tpane'); el.classList.remove('chips','gpick');
  const L=document.createElement('div'), R=document.createElement('div'); L.className='tpl'; R.className='tpr'; el.append(L,R);
  cats.forEach(c=>{ const b=document.createElement('button'); b.className='tpc'; b.setAttribute('aria-pressed',c[0]===g);
    b.innerHTML=`<span>${esc(c[0])}</span>${has(c)?'<i aria-label="選んでいるものがあります"></i>':ICO.chev}`; b.onclick=()=>{ el.dataset.g=c[0]; twoPane(el,cats,cur,onPick); }; L.appendChild(b); });
  const draws=[]; cats.find(c=>c[0]===g)[1].forEach(it=>{ const b=document.createElement('button'); b.className='tpi'; b.setAttribute('aria-pressed',it.k===cur);
    b.innerHTML=`${it.cv?'<canvas></canvas>':(it.ico||'')}<span><b>${esc(it.label)}</b>${it.sub?`<small>${esc(it.sub)}</small>`:''}</span>${it.k===cur?ICO_CK:''}`;
    b.onclick=()=>onPick(it.k); R.appendChild(b); if(it.cv) draws.push([b.querySelector('canvas'),it.cv]); });
  const sel=R.querySelector('[aria-pressed=true]'); if(sel) requestAnimationFrame(()=>{ R.scrollTop=Math.max(0,sel.offsetTop-R.clientHeight/3); });
  if(draws.length) requestAnimationFrame(()=>draws.forEach(([cv,f])=>{ if(cv.clientWidth) f(cv); })); }
// 音色の絵
const famOfInst=k=>/^(steel|nylon|eguitar|dist)$/.test(k)?'guitar':/^strings/.test(k)?'strings':/^(brass|sbrass|trumpet|trombone|horn)/.test(k)?'brass':k==='sax'?'sax':/^(synth|pad)$/.test(k)?'synth':k==='glock'?'bells':/^(koto|shami)$/.test(k)?'wa':'keys';
const catsOf=(G,names,ico)=>{ const used=new Set(), out=G.map(([h,ks])=>[h,ks.filter(k=>names[k]).map(k=>{ used.add(k); return {k,label:names[k],ico:ico(k)}; })]);
  const rest=Object.keys(names).filter(k=>!used.has(k)); if(rest.length) out.push(['そのほか',rest.map(k=>({k,label:names[k],ico:ico(k)}))]); return out; };
// これまでの「分類のチップ＋一覧のチップ」（groupPick）を、2段の選ぶ画面に置きかえる（音色・ドラムの音）
groupPick=function(el,G,names,cur,onPick){ const isKit=names===KITS, ico=isKit?icoKit:icoInst;
  pickRow(el, isKit?'ドラムの音':'楽器（音色）', cur!=null&&names[cur]?names[cur]:'えらぶ', '', ico(cur), null, ()=>openPicker(isKit?'ドラムの音を選ぶ':'楽器を選ぶ', ()=>catsOf(G,names,ico), cur, v=>{ cur=v; onPick(v); return false; })); };

// 選んでいるものを1行で出し、タップで全画面の選ぶ画面を開く
function pickRow(el,head,label,sub,ico,cv,open){ el.classList.remove('chips','gpick','tpane','opts'); el.innerHTML='';
  const b=document.createElement('button'); b.className='prow1'; b.innerHTML=`${cv?'<canvas></canvas>':(ico||'')}<span><small>${esc(head)}</small><b>${esc(label)}</b>${sub?`<em>${esc(sub)}</em>`:''}</span>${ICO.chev}`;
  b.onclick=open; el.appendChild(b); if(cv) requestAnimationFrame(()=>{ const c=b.querySelector('canvas'); if(c.clientWidth) cv(c); }); }
// 全画面の選ぶ画面（GarageBand のサウンドライブラリのように）。onPick が true を返したら閉じる
(function(){ const st=document.createElement('style'); st.textContent=`
#pickScr{position:fixed;inset:0;z-index:46;background:var(--bg);display:flex;flex-direction:column}
#pickScr[hidden]{display:none}
#pickScr .phd{display:flex;align-items:center;gap:8px;padding:max(10px,env(safe-area-inset-top,0px)) 12px 10px;border-bottom:1px solid var(--line)}
#pickScr .phd h2{flex:1;text-align:center;margin:0;font-family:var(--display);font-weight:900;font-size:1.1rem}
#pickScr .phd button{min-width:44px;height:44px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-weight:700;cursor:pointer;display:grid;place-items:center;padding:0 12px}
#pickScr .phd .pok{background:var(--t);border-color:var(--t);color:#fff}
#pickScr .tpane{flex:1;height:auto;border:0;border-radius:0;margin:0;grid-template-columns:minmax(110px,30%) 1fr;padding-bottom:env(safe-area-inset-bottom,0px)}
#pickScr .tpane .tpi{padding:14px 16px}
#pickScr .tpane .tpi canvas{width:96px;height:36px}
#pickScr .tpane .tpc{padding:16px 12px 16px 16px;font-size:.9rem}
@media (min-width:760px){ #pickScr .tpane{grid-template-columns:240px 1fr} }
.prow1{display:flex;align-items:center;gap:12px;width:100%;border:1.5px solid var(--line);border-radius:14px;background:var(--surface);padding:10px 12px;cursor:pointer;text-align:left;font:inherit;color:var(--ink)}
.prow1>svg:first-child{width:30px;height:30px;color:var(--t);flex:none}
.prow1 canvas{width:84px;height:34px;flex:none;border-radius:6px;background:var(--bg)}
.prow1 span{flex:1;min-width:0}
.prow1 small{display:block;font-size:.68rem;color:var(--muted)}
.prow1 b{display:block;font-size:.95rem;font-weight:700}
.prow1 em{display:block;font-style:normal;font-size:.7rem;color:var(--muted)}
.prow1>svg:last-child{flex:none;color:var(--muted)}`; document.head.appendChild(st);
  const el=document.createElement('div'); el.id='pickScr'; el.hidden=true; el.setAttribute('role','dialog');
  el.innerHTML=`<div class="phd"><button id="pickBack" aria-label="もどる">${ICO.close}</button><h2 id="pickTitle"></h2><button class="pok" id="pickOk">決定</button></div><div id="pickBody"></div>`;
  document.body.appendChild(el); })();
let PICK=null;
// タップで選ぶだけ。「決定」で適用、✕はキャンセル。音色（live）は聴き比べられるようにタップで鳴らし、✕なら開いたときの音色に戻す
// live='play'（伴奏スタイル）：タップでその伴奏にして裏で鳴らす。決定しなければ元に戻す
function openPicker(title,cats,cur,onPick,live){ if(live==null) live=/の音を選ぶ|楽器を選ぶ/.test(title)?true:/伴奏スタイル/.test(title)?'play':false;
  PICK={cats,cur,cur0:cur,onPick,live,snap:live?JSON.stringify(state):null}; $('pickTitle').textContent=title; $('pickScr').hidden=false; delete $('pickBody').dataset.g; drawPicker(); }
function drawPicker(){ const P=PICK; twoPane($('pickBody'), P.cats(), P.cur, k=>{ P.cur=k; if(P.live) P.onPick(k); if(P.live==='play' && !playing){ P.started=true; play(); } drawPicker(); }); }
function closePicker(){ $('pickScr').hidden=true; PICK=null; }
$('pickBack').onclick=()=>{ const P=PICK; if(P&&P.started&&playing) stop();
  if(P&&P.live&&P.cur!==P.cur0){ const o=JSON.parse(P.snap); Object.keys(state).forEach(k=>delete state[k]); Object.assign(state,o); rebuildMy(); $('bpm').value=state.bpm; $('bpmOut').textContent=state.bpm; save(); renderAll(); ensureSounds(); applyMix(); renderTracks(); if($('sheet').classList.contains('on')&&sheetKind) openSheet(sheetKind); } closePicker(); };
$('pickOk').onclick=()=>{ const P=PICK; if(P&&P.started&&playing) stop(); closePicker(); if(P && !P.live && P.cur!=null && P.cur!==P.cur0) P.onPick(P.cur); };
// ベースの音も、1行の要約＋選ぶ画面に（通常モードは「なし」も選べる。PRO はトラックをなくすことで）
bassSndRow=function(){ const el=$('bassSndChips'), on=!!state.bass, k=state.bassSnd||'bass';
  pickRow(el,'ベースの音', on?(BASS_SNDS[k]||'ベース'):'なし', '', on?icoBass(k):'', null, ()=>openPicker('ベースの音を選ぶ',
    ()=>[['ベース',[...Object.entries(BASS_SNDS).map(([b,l])=>({k:b,label:l,ico:icoBass(b)})), ...(state.pro?[]:[{k:'none',label:'なし',sub:'ベースを鳴らさない'}])]]],
    on?k:'none', v=>{ if(v==='none') state.bass=false; else { state.bass=true; state.bassSnd=v; } save(); renderAll(); ensureSounds().then(()=>{ if(!playing&&state.bass) whenRunning(()=>{ const t=ctx.currentTime+.03; [0,7,12].forEach((n,j)=>bassTone(36+n,t+j*.18,.16,.9)); }); }); bassSndRow(); return false; })); };

// 伴奏スタイルの分類
const STYLE_CATS=[['定番',[0,1,3,2,15]],['しっとり・やさしい',[4,5,16,14]],['おしゃれ',[18,11,12,19,9]],['おどれる・はねる',[10,8,13]],['特別な雰囲気',[17,20]]];
const styleSub=st=>[INSTS[st.inst], st.arp2&&st.inst2?INSTS[st.inst2]:null, st.drum==='none'?'ドラムなし':KITS[st.kit], st.bass===false?null:'ベース'].filter(Boolean).join('・');
const styleCats=()=>STYLE_CATS.map(([h,ids])=>[h, ids.map(id=>STYLES.find(s=>s.id===id)).filter(Boolean).map(st=>({k:st.id, label:st.name, sub:styleSub(st),
  cv:cv=>{ const g=fit(cv), col=colors(), H=cv.height; drawArpBar(g,0,0,cv.width,H*.55,ARPS[st.arp],col.t,col); if(DRUMS[st.drum]) drawDrumBar(g,0,H*.58,cv.width,H*.42,DRUMS[st.drum],col); }}))]);
// 演奏のパターンの分類（PRO）：自分で作ったもの／伴奏スタイルで使うもの／重ねる上もの／そのほか
const LAYER_PATS=new Set(['glockline','brassobb','brasshit','hornline','anilead']);
function patCats(kind){ const drum=isDrumK(kind), src=drum?DRUMS:ARPS, order=drum?drumOrder():arpOrder(), X=xOf(kind), p2like=kind==='arp2'||!!X;
  const used={}; STYLES.forEach(st=>{ const k=drum?st.drum:st.arp; (used[k]=used[k]||[]).push(st.name); if(!drum&&st.arp2) (used[st.arp2]=used[st.arp2]||[]).push(st.name+'の上もの'); });
  const col=colors(), cv=k=>c=>{ const g=fit(c); if(drum) drawDrumBar(g,0,0,c.width,c.height,DRUMS[k],col); else drawArpBar(g,0,0,c.width,c.height,ARPS[k],col.t,col); };
  const it=k=>({k, label:patName(src[k]), sub:/^my\d+$/.test(k)?'自分で作ったパターン':used[k]?used[k].join('・')+'で使う':'', cv:cv(k)});
  const my=order.filter(k=>/^my\d+$/.test(k)), rest=order.filter(k=>!/^my\d+$/.test(k));
  const cats=[['自分で作ったもの',my.map(it)], ['伴奏スタイルの演奏',rest.filter(k=>used[k]&&!LAYER_PATS.has(k)).map(it)], ['重ねる上もの',rest.filter(k=>LAYER_PATS.has(k)).map(it)], ['そのほか',rest.filter(k=>!used[k]&&!LAYER_PATS.has(k)).map(it)]];
  if(drum) cats.forEach(c=>c[1]=c[1].filter(x=>x.k!=='none'));   // 「なし」はトラックをなくすことで（PRO）
  return cats; }
{ const os=openSheet; openSheet=function(kind){ sheetSnap(); const r=os.apply(this,arguments); const opts=$('opts');
    if(!state.pro && (kind==='arp'||kind==='drum'||kind==='style')) requestAnimationFrame(()=>{ const st=styleNow();
      pickRow(opts,'伴奏スタイル',st?st.name:'（組み合わせ中）',st?styleSub(st):'',null, st?c=>{ const g=fit(c), col=colors(), H=c.height; drawArpBar(g,0,0,c.width,H*.55,ARPS[st.arp],col.t,col); if(DRUMS[st.drum]) drawDrumBar(g,0,H*.58,c.width,H*.42,DRUMS[st.drum],col); }:null,
        ()=>openPicker('伴奏スタイルを選ぶ', styleCats, st&&st.id, id=>{ const st=STYLES.find(s=>s.id===id); const keep={inst:state.inst,arp2:state.arp2,inst2:state.inst2,kit:state.kit,bass:state.bass,bassSnd:state.bassSnd};
          setStyle(st); if(state.keepInst) Object.assign(state,keep); else pickInst(st.inst); renderAll(); save();
          if(st.bpm && !state.keepBpm){ state.bpm=st.bpm; $('bpm').value=state.bpm; $('bpmOut').textContent=state.bpm; save(); } openSheet(kind); return true; })); });
    else if(state.pro && kind!=='bass' && kind!=='style') requestAnimationFrame(()=>{ if(sheetKind!==kind) return; const k=patOf(kind)||'', drum=kind==='drum', src=drum?DRUMS:ARPS;
      pickRow(opts,'演奏（パターン）',k&&src[k]?patName(src[k]):'なし（使わない）','',null, k&&src[k]?c=>{ const g=fit(c), col=colors(); if(drum) drawDrumBar(g,0,0,c.width,c.height,src[k],col); else drawArpBar(g,0,0,c.width,c.height,src[k],col.t,col); }:null,
        ()=>openPicker(drum?'ドラムの演奏を選ぶ':'演奏を選ぶ', ()=>patCats(kind), k, v=>{ setPatOf(kind,v); save(); renderAll(); ensureSounds(); renderTracks(); openSheet(kind); return true; })); });
    else { opts.classList.add('opts'); }
    $('part2Sec').hidden=true;   // 通常モード：2つ目の楽器は伴奏スタイルにおまかせ
    if(!state.pro && kind==='arp2'){ opts.hidden=true; opts.previousElementSibling.hidden=true; } else { opts.hidden=false; if(opts.previousElementSibling) opts.previousElementSibling.hidden=false; }
    const X=xOf(kind), ins=kind==='arp2'?state.inst2:X?X.inst:state.inst; if(kind!=='drum' && kind!=='bass' && NO_WIDE.has(ins)) $('wideSec').hidden=true;
    return r; }; }
const NO_WIDE=new Set(['epcity','lofi','dist']);   // 左右に広げても変わらない音色

// ---------- シートは「決定」で確定、✕・外側タップはキャンセル（開いたときの状態に戻す） ----------
let SHEET_SNAP=null;
function sheetSnap(){ if(!sheet.classList.contains('on')) SHEET_SNAP=JSON.stringify(state); }
function sheetRestore(){ if(!SHEET_SNAP || !sheet.classList.contains('on')) return; const o=JSON.parse(SHEET_SNAP); SHEET_SNAP=null;
  Object.keys(state).forEach(k=>delete state[k]); Object.assign(state,o); rebuildMy();
  $('bpm').value=state.bpm; $('bpmOut').textContent=state.bpm; save(); renderAll(); applyMix(); ensureSounds(); if(!$('trk').hidden) renderTracks(); }
{ const st=document.createElement('style'); st.textContent=`
  #sheetFoot{position:sticky;bottom:calc(-16px - env(safe-area-inset-bottom,0px));margin:18px -16px calc(-16px - env(safe-area-inset-bottom,0px));padding:10px 16px calc(12px + env(safe-area-inset-bottom,0px));background:var(--surface);border-top:1px solid var(--line);z-index:2}
  #sheetOk{width:100%;min-height:48px;border:0;border-radius:12px;background:var(--ink);color:var(--surface);font:inherit;font-weight:800;font-size:1rem}`;
  document.head.appendChild(st);
  const f=document.createElement('div'); f.id='sheetFoot'; f.innerHTML='<button id="sheetOk">決定</button>'; sheet.appendChild(f);
  $('sheetOk').onclick=()=>{ SHEET_SNAP=null; closeAll(); };
  $('closeSheet').setAttribute('aria-label','キャンセル');
  $('closeSheet').onclick=()=>{ sheetRestore(); closeAll(); };
  scrim.onclick=()=>{ sheetRestore(); closeAll(); };
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') sheetRestore(); },true); }

// ---------- 4マスずつのページ：メイン画面のページ表示をトラックの画面の上へ移して、同じ page で切りかえる ----------
const PG_MARK=document.createComment('pages');
{ const ti=tpIn, to=tpOut;
  tpIn=function(){ ti(); const pg=$('pages'); if(pg.parentNode!==trk.querySelector('.dsp')){ pg.parentNode.insertBefore(PG_MARK,pg); trk.querySelector('.dsp').appendChild(pg); } };
  tpOut=function(){ to(); if(PG_MARK.parentNode) PG_MARK.parentNode.replaceChild($('pages'),PG_MARK); }; }
function dawPage(){ if(trk.hidden) return; const bw=parseFloat(trk.style.getPropertyValue('--dbw'))||dawBarW(); if(page*4>=state.bars) page=0; $('dScroll').scrollLeft=page*4*bw; }
{ const rs=renderSlots; renderSlots=function(){ const r=rs.apply(this,arguments); if(typeof trk!=='undefined' && !trk.hidden) dawPage(); return r; }; }
{ const rt=renderTracks; renderTracks=function(){ const r=rt.apply(this,arguments); if(!trk.hidden) requestAnimationFrame(()=>{ dawPage(); blkMark(); }); return r; }; }

// ---------- 帯をタップ：そのトラックの弾き方を、全画面のピアノロールで直接編集する ----------
// 曲の全部のマス（8小節なら8小節）を、その場所で実際に使う弾き方（場面）で並べて見せる。縦横にスクロール、2本指で拡大・縮小。
// 同じ弾き方（場面）を何度も使うときは、編集できるのは1か所だけ。ほかはうすく表示（くり返し）、ダブルタップでそこを編集する所にできる。
// 鉛筆と鍵（ガレージバンドと同じ）：鉛筆を押しているあいだ（鍵をかけるとずっと）音を置く・消す。外すと、音を選んで動かす。
// いつもの伴奏（組み込みのパターン）は、開いたときに自分用のコピーへ切りかえて編集（そのまま「決定」ならコピーを消して元に戻す）。✕はキャンセル
// マイパターンの画面は使わない（名前・リズムなどの設定だけ「設定」から開く）
let BLKE=null, BSEGS=[], BD=null, PINCH=null;
let BSW=18, BRH=30;   // 16分1つの幅・1行の高さ（拡大・縮小で変わる）
const BLW=78, BRUL=44;   // 左の行の名前の幅・上の目盛りの高さ
PR.blkLock=false;   // 鉛筆の固定（ガレージバンドと同じく、ふだんは「選ぶ」。鉛筆は描き込むときだけ）
const PEN_SVG='<svg width="19" height="19" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 16l.9-3.6L13 4.3l2.7 2.7-8.1 8.1z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M11.3 6l2.7 2.7" stroke="currentColor" stroke-width="1.7"/></svg>';
const LOCK_SVG='<svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><rect x="4.5" y="9" width="11" height="8" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M7 9V6.6a3 3 0 0 1 6 0V9" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';
const UNDO_SVG='<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M6.5 4L3 7.5 6.5 11" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 7.5h7a4 4 0 0 1 0 8H8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>';
{ const st=document.createElement('style'); st.textContent=`
#blkEd{position:fixed;inset:0;z-index:42;display:flex;flex-direction:column;background:var(--surface);color:var(--ink)}
#blkEd[hidden]{display:none}
#blkEd .bh{display:flex;align-items:center;gap:8px;padding:max(10px,env(safe-area-inset-top,0px)) 12px 8px 16px;border-bottom:1px solid var(--line)}
#blkEd .bh h2{flex:1;min-width:0;margin:0;font-family:var(--display);font-weight:900;font-size:1rem;line-height:1.3}
#blkEd .bh h2 small{display:block;font-weight:700;font-size:.72rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#blkEd .bplay{width:42px;height:42px;border-radius:50%;border:0;background:var(--ink);color:var(--surface);display:grid;place-items:center;flex:none}
#blkEd .bplay svg{width:20px;height:20px}
#blkEd .btool{display:flex;align-items:center;gap:6px;padding:8px 12px 0 16px}
#blkEd .bpill{display:flex;gap:2px;padding:3px;border-radius:999px;background:color-mix(in srgb,var(--ink) 10%,transparent);flex:none;transition:background .15s}
#blkEd .bpill button{width:42px;height:34px;border:0;border-radius:999px;background:transparent;color:var(--muted);display:grid;place-items:center;touch-action:none;-webkit-touch-callout:none;user-select:none;-webkit-user-select:none}
#blkEd .bpill button.on{background:var(--ink);color:var(--surface)}
#blkEd .bpill.lock{background:var(--ink)}
#blkEd .bpill.lock button{color:var(--surface)}
#blkEd .bpill.lock button.on{background:color-mix(in srgb,var(--surface) 26%,transparent)}
#blkEd .bpill.lock #blkPen{transform:translateX(44px)}
#blkEd .bpill.lock #blkLock{transform:translateX(-44px)}
#blkEd .bpill button{transition:transform .15s}
#blkEd .tb{min-width:36px;height:36px;padding:0 6px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-weight:800;font-size:1.05rem;display:grid;place-items:center;flex:none}
#blkEd .tb:disabled{opacity:.35}
#blkEd .bgap{flex:1}
#blkEd .bscroll{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y;--lw:${BLW}px;--rh:${BRH}px}
#blkEd .bruler{display:flex;position:sticky;top:0;z-index:5;background:var(--surface);border-bottom:1px solid var(--line);height:${BRUL}px}
#blkEd .bcorner{position:sticky;left:0;z-index:6;width:var(--lw);flex:none;background:var(--surface);border-right:1px solid var(--line)}
#blkEd .brt{position:relative;flex:none}
#blkEd .brt .bn{position:absolute;top:3px;font-size:.66rem;color:var(--muted);padding-left:4px;border-left:1.5px solid var(--line);height:38px;box-sizing:border-box}
#blkEd .brt .bc{position:absolute;top:16px;font-weight:800;font-size:.8rem;padding-left:5px;white-space:nowrap;overflow:hidden;line-height:1.15}
#blkEd .brt .bc small{display:block;font-size:.58rem;font-weight:700;color:var(--muted)}
#blkEd .brt .bc.loop{opacity:.42}
#blkEd .bmain{display:flex}
#blkEd .blabs{position:sticky;left:0;z-index:4;width:var(--lw);flex:none;background:var(--surface);border-right:1px solid var(--line)}
#blkEd .blabs span{height:var(--rh);display:flex;align-items:center;padding-left:8px;font-size:.62rem;font-weight:700;color:var(--muted);white-space:nowrap;overflow:hidden;box-sizing:border-box}
#blkEd .blabs span.mel{color:color-mix(in srgb,var(--ink) 70%,transparent);background:color-mix(in srgb,var(--ink) 5%,transparent)}
#blkEd .blabs span.mel1{border-bottom:1.5px solid color-mix(in srgb,var(--ink) 35%,transparent)}
#blkEd .broll{position:relative;flex:none;touch-action:pan-x pan-y;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
#blkEd .bmel{position:absolute;left:0;right:0;top:0;background:color-mix(in srgb,var(--ink) 5%,transparent);border-bottom:1.5px solid color-mix(in srgb,var(--ink) 35%,transparent);pointer-events:none}
#blkEd .bseg{position:absolute;top:0;bottom:0;background:color-mix(in srgb,var(--c) 13%,transparent);border-left:2px solid var(--c);box-sizing:border-box;pointer-events:none}
#blkEd .bseg.cur{background:color-mix(in srgb,var(--c) 24%,transparent)}
#blkEd .bseg.loop{background:repeating-linear-gradient(135deg,color-mix(in srgb,var(--c) 9%,transparent) 0 6px,transparent 6px 12px);border-left-style:dashed}
#blkEd .prn{touch-action:none}
#blkEd .prn.loop{opacity:.3;pointer-events:none}
#blkEd .bph{position:absolute;top:0;bottom:0;width:2px;background:var(--ink);pointer-events:none;z-index:3}
#blkEd .bsub{padding:6px 16px 0;font-size:.7rem;color:var(--muted);line-height:1.5;margin:0}
#blkEd #blkHelp{padding-bottom:4px}
#blkEd .bbot{position:relative}
#blkEd .bdeco[hidden],#blkMenu[hidden]{display:none}
#blkMenu{position:fixed;z-index:46;display:flex;background:var(--ink);color:var(--surface);border-radius:12px;padding:4px;box-shadow:0 8px 24px rgba(10,14,20,.25)}
#blkMenu button{border:0;background:transparent;color:inherit;font:inherit;font-weight:800;font-size:.86rem;padding:9px 12px;border-radius:9px;white-space:nowrap}
#blkMenu button+button{border-left:1px solid color-mix(in srgb,var(--surface) 25%,transparent);border-radius:0}
#blkMenu .bvel{display:flex;align-items:center;gap:8px;padding:6px 10px;font-weight:800;font-size:.84rem}
#blkMenu .bvel b{min-width:2.2em;text-align:right}
#blkMenu .bvel input{width:min(52vw,220px)}
#blkEd .bhdl{position:absolute;z-index:4;width:24px;height:24px;margin:calc((var(--rh) - 24px)/2) 0 0 -12px;border-radius:50%;background:var(--ink);color:var(--surface);display:grid;place-items:center;font-size:.72rem;font-weight:900;font-style:normal;touch-action:none;box-shadow:0 0 0 2px var(--surface)}
#blkEd .bdeco .bdx{float:right;margin-top:6px}
#blkEd .bdeco{position:absolute;left:0;right:0;bottom:100%;z-index:7;max-height:48vh;overflow:auto;padding:2px 16px 12px;background:var(--surface);border-top:1px solid var(--line);box-shadow:0 -10px 24px rgba(10,14,20,.14)}
#blkEd .bdeco h3{font-size:.8rem}
#blkEd .bfoot{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 16px calc(10px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--line);margin-top:8px}
#blkEd .bfoot .chip{flex:none}
#blkOk{flex:1;min-width:120px;min-height:46px;border:0;border-radius:12px;background:var(--ink);color:var(--surface);font:inherit;font-weight:800;font-size:1rem}
#patSheet.inblk{z-index:44}
#patSheet.inblk .pgrid,#patSheet.inblk #patHelp,#patSheet.inblk #patPlay,#patSheet.inblk #patDirect{display:none!important}
body.blkset .scrim{z-index:43}
#trk .dblk{position:absolute;top:3px;bottom:3px;border:2.5px solid var(--ink);border-radius:9px;pointer-events:none;z-index:2}`;
  document.head.appendChild(st);
  const el=document.createElement('div'); el.id='blkEd'; el.hidden=true; el.setAttribute('role','dialog');
  el.innerHTML=`<div class="bh"><h2 id="blkTitle"></h2><button class="bplay" id="blkPlay" aria-label="再生"></button><button class="iconbtn" id="blkX" aria-label="キャンセル"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></div>
    <div class="btool"><div class="bpill" id="blkPill"><button id="blkPen" aria-label="鉛筆（押しているあいだ音を置く・消す。右へずらすと固定）">${PEN_SVG}</button><button id="blkLock" aria-label="鉛筆に鍵をかける">${LOCK_SVG}</button></div>
      <button class="tb" id="blkUndo" aria-label="元に戻す">${UNDO_SVG}</button><button class="tb" id="blkRedo" aria-label="やり直す"><span style="display:grid;transform:scaleX(-1)">${UNDO_SVG}</span></button>
      <span class="bgap"></span><button class="tb" id="blkZo" aria-label="縮小">−</button><button class="tb" id="blkZi" aria-label="拡大">＋</button></div>
    <p class="bsub" id="blkHelp"></p>
    <div class="bscroll" id="bScroll"></div>
    <div class="bbot"><div class="bdeco" id="blkDeco" hidden><button class="chip bdx" id="blkDecoX">閉じる</button><div id="prFall"></div></div>
    <p class="bsub" id="blkNote"></p>
    <div class="bfoot"><button class="chip" id="blkPick">ほかの弾き方</button><button class="chip" id="blkSet">設定</button><button id="blkOk">決定</button></div></div><div id="blkMenu" hidden></div>`;
  document.body.appendChild(el); }
function blkPlayIco(){ const b=$('blkPlay'); if(b){ b.innerHTML=playing?STOP_SVG:PLAY_SVG; b.setAttribute('aria-label',playing?'止める':'再生'); } }
// コードの楽器はメロディ行をいつも出しておく（はじめはスクロールで上に隠れている）
const blkMel=()=>!isDrumK(BLKE.kind)&&!isBassK(BLKE.kind);
function blkRows(){ const k=BLKE.kind; return isDrumK(k)?DRUM_ROWS:isBassK(k)?BASS_ROWS:[...MEL_ROWS,...KEY_ROWS]; }
const blkDraw=()=>!!(PR.blkLock||(BLKE&&BLKE.hold));   // 鉛筆（音を置く・消す）か、選ぶか
const sceneLen=k=>{ const L=scenesOf(patKind); return L?((L.find(x=>x[0]===k)||[0,0,16])[2]):16; };
// 場面の音（読むだけ。ない場面を作らない）
const notesOfScene=k=>{ const m=curMy(); return k==='bar'?m.notes:((m.sitNotes||{})[k]||[]); };
// 曲の中の区切り：その場所で鳴る場面（key）と、場面の中のどこから使うか（off）
function blkSegs(){ const kind=BLKE.kind, L=slotSteps(), col=colors(), out=[];
  if(isDrumK(kind)){ for(let b=0;b<state.bars;b++){ const sc=sceneAt(kind,b,cellsOf(b)[0]); out.push({x0:b*L, len:L, key:sc.key, off:(b*L)%16, c:col.muted, b}); } return out; }
  const E=chordLine(), S=effStarts(kind,E), end=state.bars*L;
  E.forEach((e,k)=>{ if(!hasV(e.v)) return; const x0=Math.max(0,S[k]), x1=k+1<E.length?S[k+1]:end; if(x1<=x0) return;
    let key='bar', off=0; if(!isBassK(kind)){ const sc=sceneAt(kind,e.b,cellsOf(e.b)[e.h]); if(!sc) return; key=sc.key; off=sc.off||0; }
    out.push({x0, len:Math.min(x1-x0, sceneLen(key)-off), key, off, c:roleCol(col,roleAt(e.b,e.h,e.v)), v:e.v, b:e.b}); });
  return out; }
function blkUses(key){ return BSEGS.filter(s=>s.key===key).length; }
// 同じ場面は1か所だけ編集できる（act）。ほかはくり返し（loop）としてうすく出す
function blkAct(){ const A=BLKE.act=BLKE.act||{}, ax=BLKE.x0||0;
  [...new Set(BSEGS.map(s=>s.key))].forEach(k=>{ const ix=BSEGS.map((s,i)=>s.key===k?i:-1).filter(i=>i>=0);
    if(!ix.includes(A[k])) A[k]=ix.find(i=>BSEGS[i].x0+BSEGS[i].len>ax)??ix[0];
    ix.forEach(i=>BSEGS[i].loop=i!==A[k]); }); }
// mode: 'edit'（今のを編集。マイパターンでなければコピー）／'new'（空っぽから）／'copy'（複製して）
function openBlk(kind,scene,where,x0,x1,mode){ const k=patOf(kind);
  if((kind==='arp2'||xType(kind)==='chord') && (!k || !ARPS[k])) return openSheet(kind);
  const snap=JSON.stringify(state), wasMy=/^my\d+$/.test(k||'') && mode!=='new' && mode!=='copy';
  BLKE={kind, x0:x0||0, x1, snap, wasMy, prev:k, nm:tkPatName(kind), cur:scene||'bar', act:{}};
  patKind=kind; PR.scene=scene||'bar'; PR.mode='edit'; PR.selSet.clear();
  if(mode==='new') newMy(kind,null); else if(!wasMy) newMy(kind, k||'auto');
  BLKE.copy=wasMy?null:JSON.stringify(curMy());
  $('patGrid').innerHTML=''; $('blkDeco').hidden=true; blkMenuClose();
  $('blkEd').hidden=false; blkPlayIco(); renderAll(); renderTracks(); drawBlk();
  requestAnimationFrame(()=>{ const sc=$('bScroll'); sc.scrollLeft=Math.max(0,BLKE.x0*BSW-4); sc.scrollTop=blkMel()?Math.round((MEL_ROWS.length-.45)*BRH):0; }); }   // メロディ行は、下の端が少しだけ見える所まで隠す
function blkModeUI(){ if(!BLKE) return; const d=blkDraw(), isDrum=isDrumK(BLKE.kind);
  $('blkPill').classList.toggle('lock',!!PR.blkLock); $('blkPen').classList.toggle('on',d); $('blkLock').classList.toggle('on',!!PR.blkLock);
  $('blkLock').setAttribute('aria-pressed',PR.blkLock?'true':'false');
  if(d && PR.selSet.size){ PR.selSet.clear(); blkMenuClose(); document.querySelectorAll('#bRoll .prn.sel').forEach(x=>x.classList.remove('sel')); document.querySelectorAll('#bRoll .bhdl').forEach(x=>x.remove()); blkSelBar(); }
  $('blkHelp').textContent = d ? '鉛筆：タップで音を置く、音をタップで消す。鉛筆を右へずらすと固定'
      : `タップで選ぶ・もう一度でメニュー。ドラッグで移動${isDrum?'':'、⇔で長さ'}。まとめて選ぶ：長押ししてなぞる／音を押さえてほかをタップ／行の名前を長押し`; }
function drawBlk(){ if(!BLKE) return; const kind=BLKE.kind, rows=blkRows(), L=slotSteps(), W=state.bars*L*BSW, isDrum=isDrumK(kind), mel=blkMel();
  BSEGS=blkSegs(); blkAct(); const ri=r=>rows.findIndex(([k])=>String(k)===String(r)), m=curMy();
  $('blkTitle').innerHTML=`${esc(tkName(kind))}の弾き方<small>${esc(m.name||'')}</small>`;
  const c=BLKE.cur, n=blkUses(c);
  $('blkNote').textContent = (blkDraw()?'':'音を置くときは、鉛筆を押しながらタップ（右へずらすと固定）。') + (BSEGS.some(s=>s.loop) ? 'うすい所は同じ弾き方のくり返し（いっしょに変わる）。ダブルタップでそこを編集。' : '')
    + (BLKE.wasMy ? '' : `「${BLKE.nm}」のコピーです（変えなければ元のまま）。`);
  let ru='', segs='', notes='';
  for(let b=0;b<state.bars;b++) ru+=`<span class="bn" style="left:${b*L*BSW}px">${b+1}</span>`;
  BSEGS.forEach((s,si)=>{ const lab = (isDrum ? (s.key==='B'?'2小節目':'') : SCENE_NAME(s.key)) + (s.loop?'（くり返し）':'');
    if(!isDrum) ru+=`<span class="bc${s.loop?' loop':''}" style="left:${s.x0*BSW}px;max-width:${s.len*BSW-2}px;color:${s.c}">${esc(chordText(s.v))}<small>${esc(lab)}</small></span>`;
    else if(lab) ru+=`<span class="bc${s.loop?' loop':''}" style="left:${s.x0*BSW}px;top:20px"><small>${lab}</small></span>`;
    segs+=`<div class="bseg${s.loop?' loop':s.key===c?' cur':''}" style="left:${s.x0*BSW}px;width:${s.len*BSW}px;--c:${s.c}"></div>`;
    notesOfScene(s.key).forEach((n,i)=>{ if(n.st<s.off||n.st>=s.off+s.len) return; const y=ri(n.r); if(y<0) return;
      const w=isDrum?1:Math.min(n.len, s.off+s.len-n.st);
      notes+=`<i class="prn${isDrum?' dr':''}${s.loop?' loop':PR.selSet.has(n)?' sel':''}${n.fall?' fall':''}${n.up?' up':''}${n.oc<0?' ocd':n.oc>0?' ocu':''}${n.when?' cond':''}" data-s="${si}" data-i="${i}" style="left:${(s.x0+n.st-s.off)*BSW}px;width:${w*BSW}px;top:calc(${y} * var(--rh));--v:${n.vel}"><b style="height:${Math.round(n.vel*100)}%"></b></i>`; }); });
  { const si=BLKE.act[PR.scene], s=BSEGS[si], ln=BLKE.last;   // ⇔：最後に選んだ音の右はし（選んだ音の長さを変える）
    if(!isDrum && s && ln && PR.selSet.has(ln) && !blkDraw() && ln.st>=s.off && ln.st<s.off+s.len && ri(ln.r)>=0)
      notes+=`<i class="bhdl" style="left:${(s.x0+ln.st-s.off+Math.min(ln.len,s.off+s.len-ln.st))*BSW}px;top:calc(${ri(ln.r)} * var(--rh))">⇔</i>`; }
  const sc=$('bScroll'), sl=sc.scrollLeft, stp=sc.scrollTop; sc.style.setProperty('--rh',BRH+'px');
  const bg=`repeating-linear-gradient(90deg,color-mix(in srgb,var(--ink) 40%,transparent) 0 1.5px,transparent 1.5px ${BSW*16}px),repeating-linear-gradient(90deg,var(--line) 0 1px,transparent 1px ${BSW*4}px),repeating-linear-gradient(180deg,transparent 0 ${BRH-1}px,var(--line) ${BRH-1}px ${BRH}px)`;
  const ML=MEL_ROWS.length;
  sc.innerHTML=`<div style="width:${BLW+W}px;${mel?`min-height:${sc.clientHeight+Math.round((ML-.45)*BRH)}px`:''}"><div class="bruler"><div class="bcorner"></div><div class="brt" style="width:${W}px">${ru}</div></div>
    <div class="bmain"><div class="blabs">${rows.map(([,l],i)=>`<span class="${mel&&i<ML?'mel'+(i===ML-1?' mel1':''):''}">${l}</span>`).join('')}</div><div class="broll" id="bRoll" style="width:${W}px;height:${rows.length*BRH}px;background-image:${bg}">${mel?`<div class="bmel" style="height:${ML*BRH}px"></div>`:''}${segs}${notes}<div class="bph" id="bPh" hidden></div></div></div></div>`;
  sc.scrollLeft=sl; sc.scrollTop=stp; bindBig(rows); blkModeUI(); blkSelBar(); }
// 選んだ音の飾り（下から出るパネル）。強さ・消す・コピーは、選んだ音をもう一度タップしたときのメニューで
function blkSelBar(){ const ns=BLKE?selNotes():[];
  if(!ns.length || $('blkDeco').hidden){ $('blkDeco').hidden=true; return; }
  if(isArpK(patKind)) fallRow(); else $('blkDeco').hidden=true; }
$('blkDecoX').onclick=()=>{ $('blkDeco').hidden=true; };
// 小さなメニュー（ガレージバンドの、選んだ音をタップしたときのメニュー）
function blkMenuClose(){ const m=$('blkMenu'); m.hidden=true; m.innerHTML=''; }
function blkMenu(x,y,items){ const m=$('blkMenu'); m.innerHTML=''; items.forEach(([l,f])=>{ const b=document.createElement('button'); b.textContent=l; b.onclick=ev=>{ ev.stopPropagation(); f(); }; m.appendChild(b); });
  m.hidden=false; const w=m.offsetWidth, h=m.offsetHeight; m.style.left=Math.max(8,Math.min(innerWidth-w-8,x-w/2))+'px'; m.style.top=(y-h-10<60?y+16:y-h-10)+'px'; }
function blkVelMenu(x,y){ const ns=selNotes(); if(!ns.length) return; const m=$('blkMenu'), v0=Math.max(1,Math.round(ns[ns.length-1].vel*127));
  m.innerHTML=`<label class="bvel">強さ <b>${v0}</b><input type="range" min="1" max="127" value="${v0}"></label>`; m.hidden=false;
  const inp=m.querySelector('input'), out=m.querySelector('b');
  inp.oninput=()=>{ const v=+inp.value; out.textContent=v; ns.forEach(n=>n.vel=v/127);
    document.querySelectorAll('#bRoll .prn.sel').forEach(el=>{ el.style.setProperty('--v',v/127); const b=el.querySelector('b'); if(b) b.style.height=Math.round(v/127*100)+'%'; }); };
  inp.onchange=()=>{ commitNotes(); };
  const w=m.offsetWidth, h=m.offsetHeight; m.style.left=Math.max(8,Math.min(innerWidth-w-8,x-w/2))+'px'; m.style.top=(y-h-10<60?y+16:y-h-10)+'px'; }
const blkFam=k=>isDrumK(k)?'drum':isBassK(k)?'bass':'chord';
function blkNoteMenu(x,y){ const isArp=isArpK(patKind), it=[
    ['消す',()=>{ blkMenuClose(); setCurNotes(curNotes().filter(n=>!PR.selSet.has(n))); PR.selSet.clear(); commitNotes(); }],
    ['コピー',()=>{ blkMenuClose(); const ns=selNotes(), s0=Math.min(...ns.map(n=>n.st)); PR.clip={fam:blkFam(BLKE.kind), notes:ns.map(n=>({...n, st:n.st-s0}))}; toast(`${ns.length}個コピーしました（何もない所をタップで貼り付け）`); }],
    ['強さ',()=>blkVelMenu(x,y)]];
  if(isArp) it.push(['飾り…',()=>{ blkMenuClose(); $('blkDeco').hidden=false; blkSelBar(); }]);
  blkMenu(x,y,it); }
function bindBig(rows){ const roll=$('bRoll'), isDrum=isDrumK(BLKE.kind);
  roll.addEventListener('touchstart',e=>{ if(e.target.closest('.prn,.bhdl') && e.cancelable) e.preventDefault(); },{passive:false});   // 音をつかんだときはスクロールしない
  roll.addEventListener('touchmove',e=>{ if(BD && BD.mode==='rect' && e.cancelable) e.preventDefault(); },{passive:false});   // 囲んで選んでいるときも
  const pos=e=>{ const r=roll.getBoundingClientRect(), x=(e.clientX-r.left)/BSW, row=Math.floor((e.clientY-r.top)/BRH); return {x, row:Math.max(0,Math.min(rows.length-1,row)), px:e.clientX-r.left, py:e.clientY-r.top}; };
  const segAt=x=>BSEGS.find(s=>x>=s.x0&&x<s.x0+s.len);
  const ridx=r=>rows.findIndex(([k])=>String(k)===String(r));
  const noteOf=el=>{ const s=BSEGS[+el.dataset.s]; return s&&notesOfScene(s.key)[+el.dataset.i]; };
  const elOf=(si,n)=>roll.querySelector(`.prn[data-s="${si}"][data-i="${notesOfScene(BSEGS[si].key).indexOf(n)}"]`);
  const toScene=s=>{ if(PR.scene!==s.key) PR.selSet.clear(); BLKE.cur=s.key; PR.scene=s.key; };
  const paint=()=>{ roll.querySelectorAll('.prn:not(.loop)').forEach(el=>el.classList.toggle('sel',PR.selSet.has(noteOf(el)))); const h=roll.querySelector('.bhdl'); if(h) h.remove(); };
  const grab=(D,g)=>{ D.g=g.map(x=>({n:x, st:x.st, len:x.len, ri:ridx(x.r), el:elOf(D.si,x)})); };
  roll.onpointerdown=e=>{ if(PINCH) return; blkMenuClose();
    const el=e.target.closest('.prn'), draw=blkDraw();
    if(BD){ const other=BD.pid!==e.pointerId;
      // 音を押さえたまま、ほかの音をタップ：選ぶ音に足す（もう一度で外す）
      // （離したときに足す。2本指で拡大しはじめたときは足さない）
      if(other && BD.mode==='press' && !BD.draw && el && BSEGS[+el.dataset.s]===BD.s && Date.now()-BD.t0>200){ const n=noteOf(el); if(n) BD.add={pid:e.pointerId, n}; return; }
      clearTimeout(BD.lp); BD=null; if(other) return; }   // 2本目の指：操作をやめる
    const si0=BLKE.act[PR.scene], hd=e.target.closest('.bhdl');
    if(hd && si0!=null){ e.preventDefault(); try{ roll.setPointerCapture(e.pointerId); }catch(_){} const s=BSEGS[si0];   // ⇔：選んだ音の長さ
      BD={mode:'resize', pid:e.pointerId, s, si:si0, n:BLKE.last, sx:e.clientX, sy:e.clientY}; grab(BD,selNotes()); hd.remove(); return; }
    if(el){ e.preventDefault(); try{ roll.setPointerCapture(e.pointerId); }catch(_){} const si=+el.dataset.s, s=BSEGS[si], n=noteOf(el); if(!n) return;
      toScene(s); BD={mode:'press', pid:e.pointerId, s, si, n, draw, sx:e.clientX, sy:e.clientY, was:PR.selSet.has(n), t0:Date.now()};
      grab(BD, (!draw && PR.selSet.has(n)) ? selNotes() : [n]); }
    else { BD={mode:'tap', pid:e.pointerId, sx:e.clientX, sy:e.clientY, p:pos(e), draw};
      if(!draw) BD.lp=setTimeout(()=>{ if(BD&&BD.mode==='tap'){ BD.mode='rect'; BD.p0=BD.p; if(navigator.vibrate) try{ navigator.vibrate(15); }catch(_){} } },430); } };   // 何もない所を長押し：囲んで選ぶ
  let rectEl=null;
  roll.onpointermove=e=>{ if(!BD||BD.pid!==e.pointerId) return; const dx=e.clientX-BD.sx, dy=e.clientY-BD.sy, far=Math.hypot(dx,dy)>6;
    if(BD.mode==='tap'){ if(far){ clearTimeout(BD.lp); BD=null; } return; }
    if(BD.mode==='rect'){ const p=pos(e), a=BD.p0, x0=Math.min(a.px,p.px), x1=Math.max(a.px,p.px), y0=Math.min(a.py,p.py), y1=Math.max(a.py,p.py);
      if(!rectEl){ rectEl=document.createElement('div'); rectEl.className='prrect'; roll.appendChild(rectEl); }
      Object.assign(rectEl.style,{left:x0+'px',top:y0+'px',width:(x1-x0)+'px',height:(y1-y0)+'px'});
      let key=null; const hit=new Set();
      roll.querySelectorAll('.prn:not(.loop)').forEach(el=>{ const L=el.offsetLeft, T=el.offsetTop, in_=L<x1&&L+el.offsetWidth>x0&&T<y1&&T+el.offsetHeight>y0, s=BSEGS[+el.dataset.s];
        if(in_ && (key==null||key===s.key)){ key=s.key; hit.add(noteOf(el)); BLKE.last=noteOf(el); } });
      if(key!=null && PR.scene!==key){ BLKE.cur=key; PR.scene=key; }
      PR.selSet=hit; paint(); return; }
    if(BD.mode==='press' && far){ if(BD.draw||BD.multi){ BD.mode='none'; return; }   // 鉛筆は置く・消すだけ
      BD.mode='move'; if(!BD.was){ PR.selSet=new Set([BD.n]); } BLKE.last=BD.n; paint(); }   // 選んでいない音をドラッグ：その音を選んで動かす
    if(BD.mode==='none') return;
    const {s}=BD, lo=s.off, hi=s.off+s.len, ds=Math.round(dx/BSW);
    if(BD.mode==='resize') BD.g.forEach(o=>{ const n=o.n, nx=Math.min(hi,...notesOfScene(s.key).filter(x=>x!==n&&String(x.r)===String(n.r)&&x.st>n.st).map(x=>x.st));
      n.len=Math.max(1,Math.min(nx-n.st, o.len+ds)); if(o.el) o.el.style.width=(Math.min(n.len,hi-n.st)*BSW)+'px'; });
    else if(BD.mode==='move'){ const wOf=o=>isDrum?1:Math.min(o.len,hi-lo), dmin=Math.max(...BD.g.map(o=>lo-o.st)), dmax=Math.min(...BD.g.map(o=>hi-wOf(o)-o.st)), d=Math.max(dmin,Math.min(dmax,ds));
      const ok=BD.g.every(o=>o.ri>=0), rmin=ok?-Math.min(...BD.g.map(o=>o.ri)):0, rmax=ok?rows.length-1-Math.max(...BD.g.map(o=>o.ri)):0, dr=Math.max(rmin,Math.min(rmax,Math.round(dy/BRH)));
      BD.g.forEach((o,k)=>{ const n=o.n; n.st=o.st+d; if(o.el) o.el.style.left=((s.x0+n.st-s.off)*BSW)+'px';
        if(ok){ const r=String(rows[o.ri+dr][0]); if(String(n.r)!==r){ n.r=r; if(o.n===BD.n) previewRow(r,n.vel); } if(o.el) o.el.style.top=`calc(${o.ri+dr} * var(--rh))`; } }); } };
  const up=e=>{ if(BD && BD.add && e && BD.add.pid===e.pointerId){ const n=BD.add.n; BD.add=null;   // 押さえている音に、ほかの音を足す（もう一度で外す）
      PR.selSet.add(BD.n); if(PR.selSet.has(n)&&n!==BD.n) PR.selSet.delete(n); else PR.selSet.add(n); BD.multi=true; BLKE.last=n; paint(); return; }
    if(!BD||(e&&BD.pid!==e.pointerId)) return; const D=BD; BD=null; clearTimeout(D.lp);
    if(D.mode==='rect'){ if(rectEl){ rectEl.remove(); rectEl=null; } drawBlk(); return; }
    if(D.mode==='none') return;
    if(D.mode==='tap'){ const s=segAt(D.p.x), now=Date.now(), T=BLKE.lastTap, dbl=T&&T.s===s&&now-T.t<400;
      BLKE.lastTap={t:now,s}; clearTimeout(BLKE.tapT);
      if(!s){ if(D.draw) toast('ここにはコードがありません'); else if(PR.selSet.size){ PR.selSet.clear(); drawBlk(); } return; }
      if(s.loop){ if(dbl){ BLKE.act[s.key]=BSEGS.indexOf(s); BLKE.cur=s.key; PR.scene=s.key; PR.selSet.clear(); BLKE.lastTap=null; drawBlk(); }   // ダブルタップ：ここを編集する所に
        else BLKE.tapT=setTimeout(()=>toast('うすい所は、同じ弾き方のくり返しです。ダブルタップでここを編集できます'),420); return; }
      const st=s.off+Math.floor(D.p.x-s.x0);
      if(!D.draw){   // 選ぶ：何もない所をタップで選択を外す。何も選んでいなくてコピーした音があれば「貼り付け」
        if(PR.selSet.size){ PR.selSet.clear(); drawBlk(); return; }
        const C=PR.clip; if(C && C.fam===blkFam(BLKE.kind) && e) blkMenu(e.clientX,e.clientY,[['貼り付け',()=>{ blkMenuClose(); toScene(s);
          const list=curNotes(), add=C.notes.map(n=>({...n, st:st+n.st})).filter(n=>n.st<s.off+s.len && ridx(n.r)>=0);
          add.forEach(n=>{ if(!isDrum) n.len=Math.min(n.len, s.off+s.len-n.st); list.push(n); }); PR.selSet=new Set(add); BLKE.last=add[add.length-1]; commitNotes(); }]]);
        return; }
      const key=String(rows[D.p.row][0]); toScene(s);
      const list=curNotes(), nx=Math.min(s.off+s.len,...list.filter(x=>String(x.r)===key&&x.st>st).map(x=>x.st));
      const n={r:key, st, len:isDrum?1:Math.max(1,Math.min(PR.lastLen[patKind]||2, nx-st)), vel:.8}; list.push(n); previewRow(key,n.vel);
      if(isDeg(key)) curMy().melody=true;   // メロディ行を使った（いままでの編集画面との互換のため）
      commitNotes(); return; }
    if(D.mode==='press'){
      if(D.draw){ setCurNotes(curNotes().filter(x=>x!==D.n)); commitNotes(); return; }   // 鉛筆：音をタップで消す
      if(D.multi){ drawBlk(); return; }
      // 選ぶ：タップで選ぶ。選んである音をもう一度タップでメニュー
      if(D.was && e){ BLKE.last=D.n; drawBlk(); blkNoteMenu(e.clientX, e.clientY); return; }
      PR.selSet=new Set([D.n]); BLKE.last=D.n; previewRow(D.n.r,D.n.vel); drawBlk(); return; }
    if(D.mode==='move'){ const G=new Set(D.g.map(o=>o.n));
      setCurNotes(curNotes().filter(x=>G.has(x) || !D.g.some(({n})=>String(x.r)===String(n.r) && (isDrum ? x.st===n.st : (x.st<n.st+n.len && x.st+x.len>n.st))))); }
    else if(D.mode==='resize' && !isDrum && D.n) PR.lastLen[patKind]=D.n.len;
    commitNotes(); };
  roll.onpointerup=up; roll.onpointercancel=e=>{ if(BD&&BD.pid===e.pointerId&&(BD.mode==='tap'||BD.mode==='rect')){ clearTimeout(BD.lp); if(rectEl){ rectEl.remove(); rectEl=null; } BD=null; } else up(e); };
  // 行の名前を長押し：その高さの音をすべて選ぶ
  let lp=null; const labs=$('bScroll').querySelector('.blabs');
  labs.onpointerdown=e=>{ const sp=e.target.closest('span'); if(!sp||blkDraw()) return; const i=[...labs.children].indexOf(sp), x0=e.clientX, y0=e.clientY;
    clearTimeout(lp); lp=setTimeout(()=>{ lp=null; const si=BLKE.act[BLKE.cur], s=BSEGS[si]; if(!s) return; const r=String(rows[i][0]);
      const ns=notesOfScene(s.key).filter(n=>String(n.r)===r && n.st>=s.off && n.st<s.off+s.len); PR.scene=s.key; PR.selSet=new Set(ns); BLKE.last=ns[ns.length-1]; if(navigator.vibrate) try{ navigator.vibrate(15); }catch(_){} drawBlk(); },430);
    labs.onpointermove=ev=>{ if(Math.hypot(ev.clientX-x0,ev.clientY-y0)>8){ clearTimeout(lp); lp=null; } }; };
  labs.onpointerup=labs.onpointercancel=()=>{ clearTimeout(lp); lp=null; }; }
// 拡大・縮小（2本指、または −・＋）。指のまん中（ボタンは画面のまん中）の位置をそのままに
function blkZoom(w,h,A){ w=Math.max(7,Math.min(48,w)); h=Math.max(20,Math.min(54,h)); if(Math.abs(w-BSW)<.2 && Math.abs(h-BRH)<.2) return;
  BSW=w; BRH=h; const sc=$('bScroll'); drawBlk(); sc.scrollLeft=A.ux*BSW-A.cx+BLW; sc.scrollTop=A.uy*BRH-A.cy+BRUL; }
function blkAnchor(cx,cy){ const sc=$('bScroll'); return {cx, cy, ux:(sc.scrollLeft+cx-BLW)/BSW, uy:(sc.scrollTop+cy-BRUL)/BRH}; }
{ const sc=$('bScroll'); let want=null;
  const dist=(a,b)=>[Math.abs(a.clientX-b.clientX),Math.abs(a.clientY-b.clientY)];
  sc.addEventListener('touchstart',e=>{ if(e.touches.length!==2 || !BLKE || ![...e.touches].every(t=>sc.contains(t.target))) return;   /* 鉛筆を押さえながらのタップは拡大ではない */
    if(BD && BD.mode==='press' && !BD.draw && Date.now()-BD.t0>200) return;   /* 音を押さえたまま、ほかの音をタップ（まとめて選ぶ）も拡大ではない */ const [a,b]=e.touches, r=sc.getBoundingClientRect(), [dx,dy]=dist(a,b);
    if(BD){ clearTimeout(BD.lp); BD=null; }
    want=null; PINCH={dx, dy, d:Math.hypot(dx,dy), w:BSW, h:BRH, sl:sc.scrollLeft, st:sc.scrollTop, A:blkAnchor((a.clientX+b.clientX)/2-r.left,(a.clientY+b.clientY)/2-r.top)}; },{passive:true});
  // 描き直しで指の下の要素が入れかわっても届くように、動き・離すは document で受ける
  document.addEventListener('touchmove',e=>{ if(!PINCH || e.touches.length<2) return; if(e.cancelable) e.preventDefault(); const [a,b]=e.touches, [dx,dy]=dist(a,b), P=PINCH;
    const both=Math.hypot(dx,dy)/Math.max(1,P.d), fx=P.dx>50?dx/P.dx:(P.dy>50?1:both), fy=P.dy>50?dy/P.dy:(P.dx>50?1:both);   // 横に開けば横、縦に開けば縦
    // 指を動かしているあいだは見た目だけ拡大（描き直すと指の下の要素が消えて、指の動きが届かなくなるため）。離したら描き直す
    const w=Math.max(7,Math.min(48,P.w*fx)), h=Math.max(20,Math.min(54,P.h*fy)), in_=sc.firstElementChild; want=[w,h];
    if(in_){ in_.style.transformOrigin=`${P.A.cx+P.sl}px ${P.A.cy+P.st}px`; in_.style.transform=`scale(${w/P.w},${h/P.h})`; } },{passive:false});
  const end=()=>{ const P=PINCH; PINCH=null; if(!P||!want) return; const w=want; want=null; const in_=sc.firstElementChild; if(in_) in_.style.transform='';
    if(BLKE) blkZoom(w[0],w[1],P.A); };
  document.addEventListener('touchend',e=>{ if(e.touches.length<2) end(); });
  document.addEventListener('touchcancel',end); }
const zoomBtn=f=>{ if(!BLKE) return; const sc=$('bScroll'); blkZoom(BSW*f, BRH*Math.sqrt(f), blkAnchor(BLW+(sc.clientWidth-BLW)/2, BRUL+(sc.clientHeight-BRUL)/2)); };
$('blkZi').onclick=()=>zoomBtn(1.25); $('blkZo').onclick=()=>zoomBtn(.8);
// 鉛筆と鍵：鉛筆は押しているあいだだけ音を置く（タップすると鍵をかける／外す）。鍵はずっと鉛筆のまま
{ const pen=$('blkPen');
  // ガレージバンドと同じ：押しているあいだだけ鉛筆。右へずらすと固定、固定中は左へずらす（またはタップ）と外れる
  pen.onpointerdown=e=>{ if(!BLKE) return; e.preventDefault(); try{ pen.setPointerCapture(e.pointerId); }catch(_){} BLKE.hold=true; BLKE.holdT=Date.now(); BLKE.hx=e.clientX; BLKE.slid=false; blkModeUI(); };
  pen.onpointermove=e=>{ if(!BLKE||!BLKE.hold||BLKE.slid) return; const dx=e.clientX-BLKE.hx;
    if(dx>22 && !PR.blkLock){ PR.blkLock=true; BLKE.slid=true; blkModeUI(); } else if(dx<-22 && PR.blkLock){ PR.blkLock=false; BLKE.slid=true; blkModeUI(); } };
  const end=()=>{ if(!BLKE||!BLKE.hold) return; const quick=Date.now()-BLKE.holdT<300; BLKE.hold=false;
    if(quick && !BLKE.slid){ if(PR.blkLock) PR.blkLock=false; else toast('鉛筆は押しているあいだだけ使えます。右へずらすと固定できます'); } blkModeUI(); };
  pen.onpointerup=end; pen.onpointercancel=end;
  $('blkLock').onclick=()=>{ PR.blkLock=!PR.blkLock; blkModeUI(); }; }
$('blkUndo').onclick=()=>{ histGo(-1); blkAfterHist(); }; $('blkRedo').onclick=()=>{ histGo(1); blkAfterHist(); };
function blkAfterHist(){ if(!BLKE) return; PR.selSet.clear(); if(/^my\d+$/.test(patOf(BLKE.kind)||'') && curMy()){ renderTracks(); drawBlk(); } else hideBlk(); }
function blkMark(){ trk.querySelectorAll('.dblk').forEach(x=>x.remove()); }
function hideBlk(){ BLKE=null; BD=null; PR.selSet.clear(); $('blkEd').hidden=true; $('bScroll').innerHTML=''; renderAll(); renderTracks(); }
function blkCancel(){ if(!BLKE) return; const o=JSON.parse(BLKE.snap);
  Object.keys(state).forEach(k=>delete state[k]); Object.assign(state,o); rebuildMy(); save(); applyMix(); ensureSounds(); hideBlk(); }
function blkOk(){ if(!BLKE) return; const B=BLKE, list=listOf(B.kind), i=list.length-1;
  if(!B.wasMy && JSON.stringify(list[i])===B.copy && patOf(B.kind)==='my'+i){ list.pop(); setPatOf(B.kind,B.prev); rebuildMy(); save(); }
  else if(!B.wasMy && list[i]) toast(`自分用のパターン「${list[i].name}」にしました`);
  hideBlk(); }
$('blkOk').onclick=blkOk; $('blkX').onclick=blkCancel;
$('blkPlay').onclick=()=>{ playing?stop():play(); };
document.addEventListener('keydown',e=>{ if(e.key==='Escape' && BLKE){ if($('patSheet').classList.contains('inblk')) closeAll(); else blkCancel(); } });
// ほかの弾き方を選ぶ：選んだら、その弾き方で開き直す（キャンセルすれば開いたときに戻る）
$('blkPick').onclick=()=>{ const B=BLKE, kind=B.kind, drum=isDrumK(kind), bass=isBassK(kind);
  const cats = bass ? ()=>[['ベースの弾き方',Object.keys(BASSES).map(k=>({k,label:BASSES[k].name}))]] : ()=>patCats(kind);
  openPicker(drum?'ドラムの演奏を選ぶ':bass?'ベースの弾き方を選ぶ':'演奏を選ぶ', cats, patOf(kind), v=>{
    const list=listOf(kind), i=list.length-1; if(!B.wasMy && JSON.stringify(list[i])===B.copy && patOf(kind)==='my'+i){ list.pop(); rebuildMy(); }
    setPatOf(kind,v); if(kind==='bass') state.bass=true; save(); renderAll(); ensureSounds();
    const sc=$('bScroll'), sl=sc.scrollLeft, stp=sc.scrollTop; BLKE=null; openBlk(kind, null, '', B.x0, B.x1); if(BLKE){ BLKE.snap=B.snap; requestAnimationFrame(()=>{ sc.scrollLeft=sl; sc.scrollTop=stp; }); } return true; }); };
// 設定：名前・リズム・タイミングなど（いままでの編集画面の、音を置く所より下だけ）。ここまでの変更はそのまま
const BLK_SET_T=()=>`このパターンの設定（${tkName(BLKE.kind)}）`;
$('blkSet').onclick=()=>{ if(!BLKE) return; PR.scene=BLKE.cur; PR.selSet.clear(); $('blkDeco').hidden=true; blkMenuClose();
  document.body.classList.add('blkset'); $('patSheet').classList.add('inblk','on'); scrim.classList.add('on'); $('patMoreAcc').open=true; renderPatEditor(); };
{ const rp=renderPatEditor; renderPatEditor=function(){ const r=rp.apply(this,arguments); if($('patSheet').classList.contains('inblk') && BLKE) $('patTitle').textContent=BLK_SET_T(); return r; }; }
new MutationObserver(()=>{ const ps=$('patSheet'); if(ps.classList.contains('on') || !ps.classList.contains('inblk')) return;
  ps.classList.remove('inblk'); document.body.classList.remove('blkset'); $('patGrid').innerHTML='';
  if(!BLKE) return; if(/^my\d+$/.test(patOf(BLKE.kind)||'') && curMy()){ BLKE.act={}; PR.selSet.clear(); renderTracks(); drawBlk(); } else hideBlk(); }).observe($('patSheet'),{attributes:true,attributeFilter:['class']});
// マイパターンの画面はなくす：「パターンを編集」「＋ 新しく作る」などは、すべてピアノロールを開く
openPatEditor=function(kind,mode){ closeAll(); openBlk(kind, PR.scene, '', page*4*slotSteps(), null, mode); };
editTrackPattern=function(kind,scene){ openBlk(kind, scene, '', 0, null); };
{ const cn=commitNotes; commitNotes=function(){ const r=cn.apply(this,arguments); if(BLKE){ renderAll(); renderTracks(); drawBlk(); } return r; }; }
{ const pl=play, sp=stop; play=function(){ const r=pl.apply(this,arguments); Promise.resolve(r).then(blkPlayIco); return r; }; stop=function(){ const r=sp.apply(this,arguments); blkPlayIco(); return r; }; }
// 再生中の位置（線）
(function bphLoop(){ const ph=$('bPh'); if(ph && BLKE){ if(playing&&cur&&ctx){ const L=slotSteps(), frac=Math.min(1,(ctx.currentTime-cur.t)/stepDur()); ph.hidden=false; ph.style.left=((cur.b+(cur.s+frac)/(cur.L||16))*L*BSW)+'px'; } else ph.hidden=true; } requestAnimationFrame(bphLoop); })();
{ const st=document.createElement('style'); st.textContent=`.accOff{visibility:hidden;pointer-events:none}`; document.head.appendChild(st); }
// トラック画面は横にスクロールさせない（ページは上の四角で切りかえる）。ミキサーの開け閉めのあとも、いまのページの位置にもどす
{ const st=document.createElement('style'); st.textContent=`#trk .dscroll{overflow-x:hidden;overflow-y:auto}
.mbtn{display:inline-grid;place-items:center}.mbtn svg{width:12px;height:12px}`; document.head.appendChild(st); }
// スワイプでミキサーを開け閉め（指について動く）：トラックの頭（M・S・楽器の絵）や左のはしを右へ → そのトラックのミキサー、どこでも左へ → 閉じる
// スライダー・入力欄・色の帯（.dtl）の上では反応しない。タップで開け閉めしたときも横にすべらせる
{ const ins=$('dInsp'), body=ins.parentElement; let G=null, busy=false;
  const W=()=>ins.offsetWidth||Math.min(340,innerWidth*.68);
  const setX=(x,anim)=>{ ins.style.transition=anim?'margin-left .22s ease':'none'; ins.style.marginLeft=x+'px'; };
  const rt=renderTracks;
  renderTracks=function(){
    const was=ins.hidden;
    if(!was && !TRK_SEL && !trk.hidden && !busy && !G){ busy=true; setX(-W(),true);   // 閉じるときは左へすべらせてから
      setTimeout(()=>{ busy=false; rt.apply(this,arguments); setX(0,false); },220); return; }
    const r=rt.apply(this,arguments);
    if(was && !ins.hidden && !G){ setX(-W(),false); requestAnimationFrame(()=>requestAnimationFrame(()=>setX(0,true))); }   // 開くときは左から出す
    return r; };
  const settle=open=>{ const w=W(); setX(open?0:-w,true);
    setTimeout(()=>{ G=null; if(!open){ TRK_SEL=null; busy=true; rt(); busy=false; setX(0,false); } },230); };
  body.addEventListener('touchstart',e=>{ if(G||busy) return; const t=e.touches[0];
    if(e.touches.length!==1 || e.target.closest('input,textarea,select,.dtl')) return;
    const row=e.target.closest('.dtrack'), tg=e.target;
    const g={x:t.clientX, y:t.clientY, at:Date.now(), kind:row?row.dataset.kind:null, edge:t.clientX<28, open:!!TRK_SEL, mode:null, dx:0};
    const mv=ev=>{ const p=ev.touches[0], dx=p.clientX-g.x, dy=p.clientY-g.y; g.dx=dx;
      if(!g.mode){ if(Math.abs(dx)<10 && Math.abs(dy)<10) return;
        if(Math.abs(dx)<Math.abs(dy)*1.3) g.mode='no';
        else if(g.open && dx<0) g.mode='close';
        else if(!g.open && dx>0 && (g.kind||g.edge)){ const L=trackList(); const k=g.kind||(L[0]&&L[0].kind); if(!k){ g.mode='no'; } else { g.mode='open'; G=g; TRK_SEL=k; rt(); setX(-W(),false); } }
        else g.mode='no';
        if(g.mode==='close') G=g; }
      if(g.mode==='close') setX(Math.min(0,dx),false);
      else if(g.mode==='open') setX(Math.min(0,-W()+dx),false); };
    const end=()=>{ tg.removeEventListener('touchmove',mv); tg.removeEventListener('touchend',end); tg.removeEventListener('touchcancel',end);
      const fast=Date.now()-g.at<350, w=W();
      if(g.mode==='close') settle(!(g.dx<-w/3 || (fast&&g.dx<-40)));
      else if(g.mode==='open') settle(g.dx>w/3 || (fast&&g.dx>40)); };
    tg.addEventListener('touchmove',mv,{passive:true}); tg.addEventListener('touchend',end); tg.addEventListener('touchcancel',end); },{passive:true}); }
