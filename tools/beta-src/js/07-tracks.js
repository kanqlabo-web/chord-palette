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
{ const ss=setStyle; setStyle=function(st){ ss(st); const fx=STYLE_FX[st.id]; if(fx) for(const c in fx){ const x=mixOf(c); FX_KEYS.forEach(k=>{ if(fx[c][k]!=null) x[k]=fx[c][k]; }); } try{ applyMix(); }catch(e){} }; }

const TRK_COLORS=['#3567D6','#24946A','#DA6A22','#8A4FD3','#D13F6B','#1F8FA8','#B8860B','#5B6475'];
const TRK_DEF={arp:['コード',0],arp2:['コード2',3],drum:['ドラム',7],bass:['ベース',2]};
// トラックの一覧（いま鳴らすもの）。kind：arp・arp2・x:ID・drum・bass
function trackList(){ const L=[{kind:'arp'}];
  if(state.arp2 && ARPS[state.arp2]) L.push({kind:'arp2'});
  (state.xtr||[]).forEach(t=>L.push({kind:'x:'+t.id}));
  L.push({kind:'drum'}); if(state.bass) L.push({kind:'bass'});
  return L; }
const mixKey=kind=>kind.startsWith('x:')?kind.slice(2):kind;
const tkMeta=kind=>{ const x=xOf(kind); if(x) return x; state.tk=state.tk||{}; return state.tk[kind]=state.tk[kind]||{}; };
const tkName=kind=>tkMeta(kind).name || (TRK_DEF[kind]||[])[0] || '楽器';
const tkColor=kind=>{ const m=tkMeta(kind); if(m.color) return m.color; const d=TRK_DEF[kind]; if(d) return TRK_COLORS[d[1]]; const i=(state.xtr||[]).indexOf(xOf(kind)); return TRK_COLORS[(4+Math.max(0,i))%TRK_COLORS.length]; };
const tkInst=kind=>{ const x=xOf(kind); if(x) return INSTS[x.inst]||''; if(kind==='arp') return INSTS[state.inst]||''; if(kind==='arp2') return INSTS[state.inst2||'epiano']||''; if(kind==='drum') return KITS[state.kit]||''; return BASS_SNDS[state.bassSnd||'bass']||''; };
const tkPatName=kind=>{ if(kind==='drum') return patName(DRUMS[state.drum]||{name:''}); if(kind==='bass') return (BASSES[state.bassPat||'auto']||{name:'ドラムに合わせる'}).name; const k=patOf(kind); return k&&ARPS[k]?patName(ARPS[k]):'なし'; };
// メイン画面の帯に出す、トラックのまとめ
function trackSummary(){ const L=trackList(); return L.length+'つ ・ '+L.filter(t=>t.kind!=='drum'&&t.kind!=='bass').map(t=>tkInst(t.kind)).join('＋'); }

// ---- 画面（DAW 風。部品とスタイルは、このファイルの中で作る） ----
// 上：ミキサー・閉じる。下：メイン画面の再生ボタンとテンポ（同じものをこちらへ移して使う）
// 左：トラックの頭（M・S と楽器の絵）。右：小節の目盛り（コード名つき）と、コードごとに色分けした帯
// 帯をタップすると、その場所で実際に使っている弾き方（場面）を開く。楽器の絵をタップすると、そのトラックのミキサーが左から出る
// 色は画面の明るさ（ライト・ダーク）に合わせて、アプリの色をそのまま使う
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
#trk .dsp{flex:1}
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
#trk .dms2 button{width:24px;height:30px;border:0;background:var(--surface);cursor:pointer;font-weight:900;font-size:.78rem;padding:0}
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
function sceneAt(kind,b,cell){ const L=slotSteps(), has=cell.v!==null&&cell.v!==undefined;
  const lag=has?Math.min(Math.max(0,-shiftOf(b,cell.h)),cell.len-1):0, g0=b*L+cell.off+lag, bar=Math.floor(g0/16), startPi=g0%16, len=cell.len-lag;
  if(kind==='drum'){ const dr=DRUMS[state.drum]||{}; return {key:(bar%2===1&&dr.VB)?'B':'bar', bar}; }
  const pat=ARPS[patOf(kind)]; if(!pat) return null;
  if(!pat.sit){ const ev=(pat.ev||[]).filter(e=>e[0]>=startPi&&e[0]<startPi+len).map(e=>[e[0]-startPi,...e.slice(1)]); return {key:'bar', evs:ev, len, bar}; }
  const S=pat.sit; let k=len>=16?'bar':len>=12?((S.bar3&&startPi===0)?'bar3':'bar'):len>=6?(startPi===0?'halfA':'halfB'):'beat';
  // その場面がなければ、鳴らすときと同じように近い場面を使う
  const fb={beat:S.halfB?'halfB':'halfA', halfB:'halfA', halfA:'bar', bar3:'bar'};
  while(!S[k] && fb[k]) k=fb[k]; if(!S[k]) k='bar';
  const list=S[k], i=bar%list.length, key=(SIT_KEYS[k]||[k])[i]||k;
  return {key, evs:list[i].evs, len, bar}; }
const SCENE_NAME=k=>((typeof SCENES!=='undefined'?SCENES:[]).concat(typeof DRUM_SCENES!=='undefined'?DRUM_SCENES:[]).find(x=>x[0]===k)||[k,k])[1];

// 1マスの幅：4マスまでは画面に収め、それより多いときは横にスクロール
function dawBarW(){ const sc=$('dScroll'), hw=trk.querySelector('.dh')?.offsetWidth||116;
  return Math.max(state.bars<=4?56:72, Math.floor(((sc.clientWidth||innerWidth)-hw-2)/Math.min(state.bars,8))); }
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
    row.innerHTML=`<div class="dh"><div class="dms2"><button data-k="m" aria-pressed="${!!x.m}" aria-label="ミュート">M</button><button data-k="s" aria-pressed="${!!x.s}" aria-label="ソロ">S</button></div>
      <button class="dico" aria-label="${esc(tkName(kind))}のミキサー">${INST_ICO[instFam(kind)]}<span>${esc(tkName(kind))}</span></button></div>
      <div class="dtl"><canvas></canvas></div>`;
    box.appendChild(row);
    row.querySelectorAll('.dms2 button').forEach(b=>b.onclick=()=>{ x[b.dataset.k]=!x[b.dataset.k]; applyMix(); save(); renderTracks(); });
    row.querySelector('.dico').onclick=()=>{ TRK_SEL = TRK_SEL===kind ? null : kind; renderTracks(); };
    bindRegion(row.querySelector('.dtl'),kind); });
  const ad=document.createElement('div'); ad.className='drow dadd'; ad.innerHTML=`<div class="dh"><button class="daddb" id="trkAdd" aria-label="楽器を足す">${ICO.plus}</button></div>`; box.appendChild(ad);
  $('trkAdd').onclick=addTrack;
  const hint=document.createElement('p'); hint.className='dhint'; hint.textContent='色の帯（コードごとの弾き方）をタップすると、その場所で使っている弾き方をそのまま編集できます。帯の区切りを左右にドラッグすると、コードの長さ・食い・後ろ倒しを変えられます。楽器の絵をタップするとミキサー（音量・左右・コンプ・エコーなど）、上のコード名をタップするとコードを編集できます。'; box.appendChild(hint);
  const mo=document.createElement('div'); mo.className='dmore'; mo.innerHTML=`<details id="trkStyleBox"><summary>伴奏スタイルから作り直す</summary><p>選んだスタイルと同じ鳴り方・ミックスのトラックに置きかえます（いまのトラックはなくなります）。</p><div id="trkStyles"></div></details>`; box.appendChild(mo);
  const sb=$('trkStyles'); let armed=null; const sp=()=>twoPane(sb, styleCats(), null, pickSt); const bx=$('trkStyleBox'); bx.ontoggle=()=>{ TRK_STY=bx.open; if(bx.open) sp(); }; if(TRK_STY){ bx.open=true; }
  function pickSt(id){ const st=STYLES.find(x=>x.id===id); if(armed!==id){ armed=id; toast('もう一度押すと「'+st.name+'」のトラックに置きかえます'); return; }
    proFromStyle(st); if(st.bpm){ state.bpm=st.bpm; $('bpm').value=state.bpm; $('bpmOut').textContent=state.bpm; } state.tk={}; applyMix(); save(); renderAll(); ensureSounds(); renderTracks(); toast(st.name+'のトラックにしました'); }
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
function effStarts(kind,E){ const pat=ARPS[kind==='bass'||kind==='drum'?state.arp:patOf(kind)]||{}, end=state.bars*slotSteps();
  return E.map((e,k)=>{ if(k===0||!hasV(e.v)) return e.pos; const pv=E[k-1], nx=E[k+1]?E[k+1].pos:end; let a=e.ant;
    if(a==null){ const same=hasV(pv.v)&&JSON.stringify(e.v)===JSON.stringify(pv.v); a=(same&&!(pat.sit&&pat.sit.push))?0:(pat.push2nd&&e.pos%16===0&&(e.pos/16)%2===0)?0:(pat.pushBy||0); }
    a=Math.max(-(nx-e.pos-1),Math.min(a,e.pos-pv.pos-1)); return e.pos-a; }); }
// 帯：コードごとに区切り、役割の色（T・S・D）でぬって、その場所で鳴る弾き方を描く。ドラムは1本の帯
function drawRegion(cv,kind,bw,col,E){ if(!cv.clientWidth) return; const g=fit(cv), W=cv.width, H=cv.height, r=devicePixelRatio||1, N=state.bars, L=slotSteps();
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
  el.addEventListener('pointerdown',ev=>{ sx=ev.clientX; sy=ev.clientY; moved=false; drag=null; if(kind==='drum') return;
    const rc=el.getBoundingClientRect(), x=ev.clientX-rc.left, ps=stepW(), E=chordLine(), S=effStarts(kind,E);
    let best=-1, bd=18; S.forEach((s,k)=>{ if(k===0||contOf(E,k)||!(hasV(E[k].v)||hasV(E[k-1].v))) return; const d=Math.abs(s*ps-x); if(d<bd){ bd=d; best=k; } });
    if(best>0){ drag={k:best,E,ps,left:rc.left}; el.setPointerCapture(ev.pointerId); ev.preventDefault(); } });
  el.addEventListener('pointermove',ev=>{ if(Math.abs(ev.clientX-sx)>6||Math.abs(ev.clientY-sy)>6) moved=true; if(!drag||!moved) return;
    const {k,E,ps}=drag, L=slotSteps(), end=state.bars*L, prev=E[k-1].pos, next=k+1<E.length?E[k+1].pos:end;
    const s=Math.round((ev.clientX-drag.left)/ps), lo=Math.floor(prev/4)*4+4, hi=Math.ceil(next/4)*4-4; if(lo>hi) return;
    const pos=Math.max(lo,Math.min(hi,Math.round(s/4)*4)), a=Math.max(-2,Math.min(2,pos-s));
    drag.pos=pos; drag.ant=a; const E2=E.map(x=>({...x})); E2[k].pos=pos; E2[k].ant=a;
    trk.querySelectorAll('.dtrack').forEach(row=>{ const kd=row.dataset.kind; if(kd!=='drum') drawRegion(row.querySelector('canvas'),kd,ps*L,colors(),E2); });
    let tip=el.querySelector('.dtip'); if(!tip){ tip=document.createElement('span'); tip.className='dtip'; el.appendChild(tip); }
    const bt=pos%L/4+1, sl=Math.floor(pos/L)+1; tip.style.left=((pos-a)*ps)+'px';
    tip.textContent=`${sl}${state.len<4?'マス目':'小節目'}の${bt}拍目${a>0?`（${a===2?'8分':'16分'}食う）`:a<0?`（${a===-2?'8分':'16分'}後ろ）`:''}`; });
  el.addEventListener('pointerup',ev=>{ if(drag){ const d=drag; drag=null; el.querySelector('.dtip')?.remove();
      if(moved && d.pos!=null){ d.E[d.k].pos=d.pos; d.E[d.k].ant=d.ant; setChordLine(d.E); save(); renderAll(); renderTracks(); } else if(moved) renderTracks(); else tapRegion(kind,ev,el); return; }
    if(!moved) tapRegion(kind,ev,el); });
  el.addEventListener('pointercancel',()=>{ if(drag){ drag=null; el.querySelector('.dtip')?.remove(); renderTracks(); } }); }
// 帯をタップ：その場所のコード（ドラムは小節）で使っている弾き方を開く
function tapRegion(kind,ev,el){ const bw=parseFloat(trk.style.getPropertyValue('--dbw'))||96, L=slotSteps(), st=(ev.clientX-el.getBoundingClientRect().left)/bw*L;
  if(kind==='drum'){ const b=Math.max(0,Math.min(state.bars-1,Math.floor(st/L))), cell=cellsOf(b)[0], sc=sceneAt('drum',b,cell); editTrackPattern('drum', sc.key, `${b+1}${state.len<4?'マス目':'小節目'}`); return; }
  const E=chordLine(), S=effStarts(kind,E); let k=0; S.forEach((s,i)=>{ if(st>=s) k=i; }); const e=E[k];
  if(!hasV(e.v)){ toast('ここにはコードがありません'); return; }
  const cell=cellsOf(e.b)[e.h], sc=kind==='bass'?null:sceneAt(kind,e.b,cell);
  const where=`${e.b+1}${state.len<4?'マス目':'小節目'}${cell.off?`の${cell.off/4+1}拍目から`:''}`;
  editTrackPattern(kind, sc&&sc.key, where); }
// 再生中の位置（線）
function dawFrame(){ if(trk.hidden) return; const hd=$('dHead'), on=!!playing;
  if(hd){ if(on&&cur&&ctx){ const bw=parseFloat(trk.style.getPropertyValue('--dbw'))||96, frac=Math.min(1,(ctx.currentTime-cur.t)/stepDur()), hw=trk.querySelector('.dh').offsetWidth;
      const hx=hw+(cur.b+(cur.s+frac)/(cur.L||16))*bw; hd.hidden=false; hd.style.left=hx+'px';
      const sc=$('dScroll'); if(hx>sc.scrollLeft+sc.clientWidth-24 || hx<sc.scrollLeft+hw) sc.scrollLeft=Math.max(0,hx-hw-8);
      trk.querySelectorAll('.dbn').forEach(s=>s.classList.toggle('now',+s.dataset.b===cur.b)); }
    else if(!hd.hidden){ hd.hidden=true; trk.querySelectorAll('.dbn.now').forEach(s=>s.classList.remove('now')); } }
  requestAnimationFrame(dawFrame); }
// ミキサー（GarageBand の「トラック設定」のように左から出る）
const FX_ROWS=[['comp','コンプレッサー（音の大きさをそろえる）',0,1],['hi','高音（トレブル）',-1,1],['lo','低音（ベース）',-1,1],['echo','エコー（やまびこ）',0,1],['rev','リバーブ（部屋の響き）',0,1]];
const fxTxt=(k,v)=>k==='hi'||k==='lo' ? (Math.abs(v)<.03?'0':(v>0?'+':'−')+Math.round(Math.abs(v)*9)+'dB') : Math.round(v*100);
let INSP_SND=false;   // ミキサーで音色の一覧を開いているか
function renderInsp(){ const p=$('dInsp'), kind=TRK_SEL; if(!kind){ p.hidden=true; INSP_SND=false; return; } p.hidden=false;
  const x=mixOf(mixKey(kind)), pan=x.pan||0, canDel=kind==='arp2'||kind.startsWith('x:')||kind==='bass', m=tkMeta(kind);
  p.style.setProperty('--tc',tkColor(kind));
  const rng=(f,label,min,max,val,txt)=>`<label class="dirow"><span>${label}<output>${txt}</output></span><input type="range" min="${min}" max="${max}" step=".01" value="${val}" data-f="${f}"></label>`;
  const sndName = kind==='drum' ? (KITS[state.kit]||'ドラム') : kind==='bass' ? (BASS_SNDS[state.bassSnd||'bass']||'ベース') : tkInst(kind);
  p.innerHTML=`<div class="dititle"><button class="ditb" id="diSnd" aria-expanded="${INSP_SND}"><div class="dipic">${INST_ICO[instFam(kind)]}</div><b>${esc(sndName)}${ICO.chev}</b><small>タップして音色を変える</small></button></div>
    <div class="dsnd" id="diSndList" ${INSP_SND?'':'hidden'}></div>
    <div class="disec"><div class="dib"><button class="dilink" id="diPick"><span>${kind==='drum'?'パターン・フィルインを選ぶ':kind==='bass'?'パターンを選ぶ':'パターン・音域を選ぶ'}</span>${ICO.chev}</button></div></div>
    <div class="disec"><h3>出力</h3><div class="dib">
      ${rng('v','音量',0,1.5,x.v??1,Math.round((x.v??1)*100))}
      ${rng('pan','左右（パン）',-1,1,pan,panTxt(pan))}
      <div class="dims"><button data-k="m" aria-pressed="${!!x.m}">ミュート</button><button data-k="s" aria-pressed="${!!x.s}">ソロ</button></div></div></div>
    <div class="disec"><h3>エフェクト</h3><div class="dib">${FX_ROWS.map(([f,l,a,b])=>rng(f,l,a,b,x[f]||0,fxTxt(f,x[f]||0))).join('')}</div></div>
    <div class="disec"><h3>トラックの名前と色</h3><div class="dib"><input class="diname2" id="diName" maxlength="16" value="${esc(tkName(kind))}" aria-label="トラックの名前"><div class="tcolors" id="diColors"></div></div></div>
    ${canDel?'<button class="didel" id="diDel">このトラックをなくす</button>':''}`;
  $('diPick').onclick=()=>openSheet(kind);
  $('diSnd').onclick=()=>{ INSP_SND=!INSP_SND; renderInsp(); };
  if(INSP_SND){ const box=$('diSndList'), X=xOf(kind), done=()=>{ save(); renderAll(); ensureSounds(); applyMix(); renderTracks(); };
    if(kind==='bass') chips(box, Object.entries(BASS_SNDS), state.bassSnd||'bass', v=>{ state.bassSnd=v; done(); });
    else if(kind==='drum') groupPick(box, KIT_GROUPS, KITS, state.kit, v=>{ pickKit(v); done(); });
    else groupPick(box, INST_GROUPS, INSTS, X?(X.inst||'piano'):kind==='arp2'?(state.inst2||'epiano'):state.inst, v=>{ if(X) X.inst=v; else if(kind==='arp2') state.inst2=v; else { pickInst(v); } done(); }); }
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
function addTrack(){ if(!state.arp2 || !ARPS[state.arp2]){ state.arp2='whole'; state.inst2='strings3'; save(); renderAll(); ensureSounds(); renderTracks(); openSheet('arp2'); return; }
  state.xtr=state.xtr||[]; const ids=new Set(state.xtr.map(t=>t.id)); let n=1; while(ids.has('t'+n)) n++;
  const t={id:'t'+n, arp:'whole', inst:'strings3', rhLo:null, lhLo:null, rhOff:0, lhOff:0, name:'楽器'+(state.xtr.length+3)}; state.xtr.push(t);
  save(); renderAll(); ensureSounds(); applyMix(); renderTracks(); openSheet('x:'+t.id); }
function removeTrack(kind){ const x=xOf(kind);
  if(x){ state.xtr=state.xtr.filter(t=>t!==x); if(state.mix) delete state.mix[x.id]; }
  else if(kind==='arp2'){ // コード2をなくすと、足した楽器の1つ目がコード2になる（並びはそのまま）
    const t=(state.xtr||[]).shift(); if(t){ Object.assign(state,{arp2:t.arp, inst2:t.inst, rhLo2:t.rhLo, lhLo2:t.lhLo, rhOff2:t.rhOff||0, lhOff2:t.lhOff||0}); state.mix=state.mix||{}; state.mix.arp2=state.mix[t.id]||{v:1,m:false,s:false}; delete state.mix[t.id]; state.tk=state.tk||{}; state.tk.arp2={name:t.name,color:t.color}; } else state.arp2=''; }
  else if(kind==='bass') state.bass=false;
  TRK_SEL=null; applyMix(); save(); renderAll(); renderTracks(); }
// パターンを直接編集する。いつもの伴奏（組み込みのパターン）は、自分用のコピーを作って開き、何も変えずに閉じたらコピーを消して元に戻す
let PAT_TMP=null;
function editTrackPattern(kind,scene,where){ const k=patOf(kind);
  if((kind==='arp2'||xOf(kind)) && (!k || !ARPS[k])) return openSheet(kind);
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
.tpane .tpi>svg{flex:none;color:var(--muted);width:26px;height:26px}
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
groupPick=function(el,G,names,cur,onPick){ const isKit=names===KITS; twoPane(el, catsOf(G,names,k=>INST_ICO[isKit?'drum':famOfInst(k)]), cur, onPick); };

// 伴奏スタイルの分類
const STYLE_CATS=[['定番',[0,1,3,2,15]],['しっとり・やさしい',[4,5,16,14]],['おしゃれ',[18,11,12,19,9]],['おどれる・はねる',[10,8,13]],['特別な雰囲気',[17,20]]];
const styleSub=st=>[INSTS[st.inst], st.arp2&&st.inst2?INSTS[st.inst2]:null, st.drum==='none'?'ドラムなし':KITS[st.kit], st.bass===false?null:'ベース'].filter(Boolean).join('・');
const styleCats=()=>STYLE_CATS.map(([h,ids])=>[h, ids.map(id=>STYLES.find(s=>s.id===id)).filter(Boolean).map(st=>({k:st.id, label:st.name, sub:styleSub(st),
  cv:cv=>{ const g=fit(cv), col=colors(), H=cv.height; drawArpBar(g,0,0,cv.width,H*.55,ARPS[st.arp],col.t,col); if(DRUMS[st.drum]) drawDrumBar(g,0,H*.58,cv.width,H*.42,DRUMS[st.drum],col); }}))]);
// 通常モードの「伴奏スタイル」：選び方はこれまでと同じ（音色・テンポをそのままにする設定も）
{ const os=openSheet; openSheet=function(kind){ const r=os.apply(this,arguments);
    if(!state.pro && (kind==='arp'||kind==='drum'||kind==='style')) requestAnimationFrame(()=>{ const opts=$('opts'); opts.classList.remove('opts');
      twoPane(opts, styleCats(), (styleNow()||{}).id, id=>{ const st=STYLES.find(s=>s.id===id); const keep={inst:state.inst,arp2:state.arp2,inst2:state.inst2,kit:state.kit,bass:state.bass,bassSnd:state.bassSnd};
        setStyle(st); if(state.keepInst) Object.assign(state,keep); else pickInst(st.inst); renderAll(); save();
        if(st.bpm && !state.keepBpm){ state.bpm=st.bpm; $('bpm').value=state.bpm; $('bpmOut').textContent=state.bpm; save(); } closeAll(); }); });
    else { $('opts').classList.remove('tpane'); $('opts').classList.add('opts'); delete $('opts').dataset.g; }
    return r; }; }
