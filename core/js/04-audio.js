// ---------- audio ----------
let PAN=null, PAN_NEXT=null, BOWBAR=0;
const PIANOISH=new Set(['piano','spiano','epiano','epcity','lofi','organ','clav']);   // 次に鳴らす音の左右の位置（-1=左〜1=右、null=まん中）
let ctx=null, master, masterOut=null, noiseBuf, compBus=null, compVol=null, compBus2=null, compVol2=null, drumBus=null, bassBus=null, OUT=null, PART2=false;
let REVERB=null;
const CHAN={};   // 楽器ごとの出口。キーは mix の名前（arp・arp2・drum・bass・足した楽器の id）
// 出口を作る：入口 → 低音・高音（EQ）→ コンプ → 音量（2ch にそろえる）→ 左右（パン）→ マスター。音量のあとからリバーブ・エコーへ送る
// どの効果も 0 なら音は変わらない（EQ は 0dB、コンプは素通し）
function mkChan(c){ if(CHAN[c]) return CHAN[c];
  const inp=ctx.createGain(), lo=ctx.createBiquadFilter(), hi=ctx.createBiquadFilter(), comp=ctx.createDynamicsCompressor(), mk=ctx.createGain();
  lo.type='lowshelf'; lo.frequency.value=220; lo.gain.value=0; hi.type='highshelf'; hi.frequency.value=3200; hi.gain.value=0;
  comp.threshold.value=0; comp.ratio.value=1; comp.knee.value=10; comp.attack.value=.006; comp.release.value=.18;
  const vol=ctx.createGain(); vol.channelCount=2; vol.channelCountMode='explicit'; vol.channelInterpretation='speakers';
  const pan=ctx.createStereoPanner(), send=ctx.createGain(), esend=ctx.createGain(); send.gain.value=0; esend.gain.value=0;
  inp.connect(lo); lo.connect(hi); hi.connect(comp); comp.connect(mk); mk.connect(vol); vol.connect(pan); pan.connect(master); pan.connect(send); send.connect(REVERB); pan.connect(esend); esend.connect(ECHO.in);
  return CHAN[c]={inp,lo,hi,comp,mk,vol,pan,send,esend}; }
// エコー：付点8分（テンポに合わせる）で、だんだん小さく・こもっていく
let ECHO=null;
function mkEcho(){ const inp=ctx.createGain(), d=ctx.createDelay(2), fb=ctx.createGain(), lp=ctx.createBiquadFilter(), hp=ctx.createBiquadFilter(), out=ctx.createGain();
  lp.type='lowpass'; lp.frequency.value=2600; hp.type='highpass'; hp.frequency.value=280; fb.gain.value=.34; out.gain.value=.7; d.delayTime.value=.45;
  inp.connect(hp); hp.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(out); out.connect(master); return {in:inp,d}; }
// リバーブ：部屋の響き（ノイズを少しずつ小さくした響きを、左右で少し変えて作る）
function mkReverb(){ const sr=ctx.sampleRate, n=Math.floor(sr*2.4), ir=ctx.createBuffer(2,n,sr);
  for(let c=0;c<2;c++){ const d=ir.getChannelData(c); for(let i=0;i<n;i++){ const x=i/sr; d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.2)*Math.exp(-x*1.6)*(x<.012?x/.012:1); } }
  const cv=ctx.createConvolver(); cv.buffer=ir; const g=ctx.createGain(); g.gain.value=.8; cv.connect(g); g.connect(master); return cv; }
// 最後の音量の整え方：まとめる（軽いコンプ）→ 音割れ止め（リミッター）→ それでも越えた分だけ丸める。
// ブラウザのコンプは自動で音量を持ち上げるため、そのぶんをすぐ後ろで下げてから次へ渡す
const MASTER_CFG={trim:.5, glue:{th:-16,ratio:2.5,knee:8,atk:.006,rel:.18}, lim:{th:-4,ratio:20,knee:0,atk:.0015,rel:.09}, out:1};
function mkMaster(inp){ const C=MASTER_CFG, mkC=o=>{ const c=ctx.createDynamicsCompressor(); c.threshold.value=o.th; c.ratio.value=o.ratio; c.knee.value=o.knee; c.attack.value=o.atk; c.release.value=o.rel; return c; };
  const pre=ctx.createGain(); pre.gain.value=C.trim; const glue=mkC(C.glue), lim=mkC(C.lim), out=ctx.createGain(); out.gain.value=C.out;
  const sc=ctx.createWaveShaper(), N=4096, cv=new Float32Array(N); for(let i=0;i<N;i++){ const x=(i/(N-1)*2-1)*2, a=Math.abs(x); cv[i]=Math.sign(x)*(a<.9?a:.9+.1*Math.tanh((a-.9)/.1)); } sc.curve=cv;
  const half=ctx.createGain(); half.gain.value=.5;   // 丸める曲線は −2〜2 を受けるので、半分にしてから通す
  inp.connect(pre); pre.connect(glue); glue.connect(lim); lim.connect(out); out.connect(half); half.connect(sc); return sc; }
function ensureAudio(noResume){
  if(ctx && ctx.state==='closed') ctx=null;
  if(!ctx){
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    master=ctx.createGain(); master.gain.value=.85; masterOut=mkMaster(master); masterOut.connect(ctx.destination);
    REVERB=mkReverb(); ECHO=mkEcho(); for(const k in CHAN) delete CHAN[k];
    // ミキサーは出さないが、伴奏スタイルごとのミックス（左右・響き・コンプなど）は試作版と同じ道を通す
    compVol=mkChan('arp').inp; drumBus=mkChan('drum').inp; bassBus=mkChan('bass').inp;
    compVol2=mkChan('arp2').inp; compBus2=ctx.createGain(); compBus2.connect(compVol2);   // 楽器2（PRO）
    compBus=ctx.createGain(); compBus.connect(compVol); applyMix();   // 伴奏（コード）だけを通す道。ダンスではキックに合わせて音量を沈める（サイドチェイン風）
    noiseBuf=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);
    const ch=noiseBuf.getChannelData(0); for(let i=0;i<ch.length;i++) ch[i]=Math.random()*2-1;
  }
  // iPhone は別アプリから戻ると 'interrupted' という状態になる。'suspended' 以外でも起こし直す
  if(!noResume&&ctx.state!=='running') ctx.resume().catch(()=>{});
}
// 起こし直せないときは、音の出口を作り直す（読み込んだ音源はそのまま使える）
function resetAudio(){ const old=ctx; ctx=null; try{ old&&old.close(); }catch(e){} held=[]; bassHeld=[]; ensureAudio(); }
async function wakeAudio(){
  ensureAudio(); if(ctx.state==='running') return true;
  await Promise.race([ctx.resume().catch(()=>{}), new Promise(r=>setTimeout(r,350))]);
  if(ctx.state!=='running'){ resetAudio(); await Promise.race([ctx.resume().catch(()=>{}), new Promise(r=>setTimeout(r,350))]); }
  return ctx.state==='running';
}
const mtof=m=>440*Math.pow(2,(m-69)/12);
// sampled instruments (FluidR3 GM soundfont via WebAudioFont data), shipped as snd/*.json
const SETS={}, LOADED={}, FAILED={};
function decode(ab){ return new Promise((res,rej)=>{ const p=ctx.decodeAudioData(ab,res,rej); if(p&&p.then) p.then(res,rej); }); }
async function decZone(z){ if(z.buf) return; const bin=atob(z.f), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); z.buf=await decode(u.buffer); delete z.f; }
function loadSet(name){
  if(!SETS[name]){
    if(!ctx) ensureAudio(true);
    SETS[name]=fetch(`${CP.snd}${name}.json`).then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); }).then(async data=>{
      const zones=Array.isArray(data)?data:Object.values(data).flat();
      await Promise.all(zones.map(decZone));
      // 弦楽器：音源の音域ごとの大きさの差（3〜4dB 小さい音域がある）をそろえて、内声だけ引っこまないように
      if(/^strings/.test(name)) zones.forEach(z=>{ if(!z.buf) return; const d=z.buf.getChannelData(0), N=Math.min(d.length,Math.floor(z.buf.sampleRate*.8)), a=Math.floor(N*.25); let q=0; for(let i=a;i<N;i++) q+=d[i]*d[i];
        const db=20*Math.log10(Math.sqrt(q/Math.max(1,N-a))||1e-6); z.gn=Math.max(.7,Math.min(1.8,Math.pow(10,(-11.5-db)/20))); });
      LOADED[name]=data; return data;
    }).catch(e=>{ FAILED[name]=true; console.warn('sound load failed',name,e); });
    SETS[name].finally(()=>{ $('instBadge').textContent=instShort()+(loadingNow()?' 読込中…':''); });
  }
  return SETS[name];
}
function neededSets(){ const n=[]; if(state.kit!=='synth') n.push('kit-'+(state.kit==='lofi'||state.kit==='city'?'std':state.kit)); if(!isSynthInst()) n.push(SETOF(state.inst));
  if(state.arp2&&ARPS[state.arp2]){ if(!(state.inst2 in SYNTH_INST)) n.push(SETOF(state.inst2||'epiano')); } const b=state.bassSnd||'bass'; if(b!=='sbass' && (!isSynthInst()||b!=='bass')) n.push(b); return n; }
function loadingNow(){ return neededSets().some(n=>!LOADED[n]&&!FAILED[n]); }
function ensureSounds(){ const p=Promise.all(neededSets().map(loadSet)); renderBadge(); return p; }
function renderBadge(){ $('instBadge').textContent=instShort()+(loadingNow()?' 読込中…':''); }
function playZone(zones,m,t,dur,vel,rel,cutoff,loop,atk){
  let z=zones.find(z=>m>=z.lo&&m<=z.hi);
  if(!z) z=zones.reduce((a,b)=>Math.abs((b.lo+b.hi)/2-m)<Math.abs((a.lo+a.hi)/2-m)?b:a);
  if(!z||!z.buf) return false;
  const s=ctx.createBufferSource(); s.buffer=z.buf;
  const base=z.op-100*z.ct-z.ft, rate=Math.pow(2,(100*m-base)/1200); s.playbackRate.value=rate;
  if(GLIDE){ s.playbackRate.setValueAtTime(rate*GLIDE.ratio,t); s.playbackRate.exponentialRampToValueAtTime(rate,t+GLIDE.time); }   // ポルタメント
  if(loop&&z.ls>1&&z.le>z.ls+10){ s.loop=true; s.loopStart=z.ls/z.sr; s.loopEnd=z.le/z.sr; }
  if(z.gn) vel*=z.gn;   // 音域ごとの大きさをそろえた分
  const g=ctx.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vel,t+(atk||.004));
  g.gain.setValueAtTime(vel,t+dur); g.gain.setTargetAtTime(0,t+dur,rel);
  if(cutoff){ const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=cutoff; lp.Q.value=.5; s.connect(lp); lp.connect(g); }
  else s.connect(g);
  if(PAN!=null && ctx.createStereoPanner){ const pn=ctx.createStereoPanner(); pn.pan.value=PAN; g.connect(pn); pn.connect(OUT||master); } else g.connect(OUT||master);
  s.start(t); s.stop(t+dur+rel*7);
  // ポルタメントで伸ばすときのために、音程と音量の操作先を覚えておく（伸ばしても途切れないようループさせる）
  if(z.ls>1&&z.le>z.ls+10){ s.loopStart=z.ls/z.sr; s.loopEnd=z.le/z.sr; }
  g.voice={params:[[s.playbackRate,mm=>Math.pow(2,(100*mm-base)/1200)]], srcs:[s], level:vel, rel, onLegato:()=>{ if(s.loopEnd>0) s.loop=true; }};
  return g;
}
const INST_FX={piano:{gain:3.6,rel:.2,hold:1.15},nylon:{gain:3.6,rel:.2,hold:1.3},
  // 音量は元の音源の大きさに合わせてそろえた（ピアノと同じくらいに聞こえるように）
  epiano:{gain:1.0,rel:.3,hold:1.1},clav:{gain:1.15,rel:.08,hold:1,loop:true},
  steel:{gain:3.2,rel:.2,hold:1.25},strings3:{gain:2.15,rel:.45,hold:1,loop:true,atk:.09,cutMin:7000},   // この行：アコギ・弦楽器（クラビネットは上の行：はじいて短く止める鍵盤。ファンク・シティポップ）
  brass3:{gain:2.6,rel:.1,hold:1,loop:true,cutMin:8000},sbrass:{gain:1.5,rel:.12,hold:1,loop:true,cutMin:9000},trumpet:{gain:2.3,rel:.1,hold:1,loop:true},trombone:{gain:1.8,rel:.1,hold:1,loop:true},sax:{gain:1.7,rel:.12,hold:1,loop:true},
  horn:{gain:1.5,rel:.2,hold:1,loop:true,atk:.035},glock:{gain:2.4,rel:.8,hold:1.6},
  koto:{gain:3.4,rel:.3,hold:1.4},shami:{gain:3.0,rel:.15,hold:1.1},
  organ:{gain:2.2,rel:.05,hold:1,loop:true},
  eguitar:{gain:3.2,rel:.15,hold:1.1},dist:{gain:1.9,rel:.12,hold:1,loop:true},pad:{gain:2.4,rel:.45,hold:1,loop:true}};
// v = ベロシティ(0〜1)。弱いほど音量を下げ、高音も丸くする
// アンプ風のひずみ：入力を持ち上げて波形をつぶし、低すぎ・高すぎを削ってキャビネットっぽい箱鳴りにする
let DIST=null;
function distChain(dest){
  dest=dest||compBus; if(!DIST||DIST.ctx!==ctx) DIST={ctx,m:new Map()}; if(DIST.m.get(dest)) return DIST.m.get(dest);
  const inp=ctx.createGain(); inp.gain.value=4;
  const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=110;
  const sh=ctx.createWaveShaper(); const n=2048, c=new Float32Array(n), k=9; for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; c[i]=Math.tanh(k*x)/Math.tanh(k); } sh.curve=c; sh.oversample='4x';
  const mid=ctx.createBiquadFilter(); mid.type='peaking'; mid.frequency.value=750; mid.Q.value=.8; mid.gain.value=-4;
  const pres=ctx.createBiquadFilter(); pres.type='peaking'; pres.frequency.value=2200; pres.Q.value=1; pres.gain.value=4;
  const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=4800; lp.Q.value=.7;
  const lp2=ctx.createBiquadFilter(); lp2.type='lowpass'; lp2.frequency.value=6500;
  const out=ctx.createGain(); out.gain.value=.16;
  inp.connect(hp); hp.connect(sh); sh.connect(mid); mid.connect(pres); pres.connect(lp); lp.connect(lp2); lp2.connect(out); out.connect(dest);
  DIST.m.set(dest,inp); return inp;
}
// ローファイ：高音を削り、軽くつぶして、テープのように音程をゆっくり揺らす。再生中はレコードのノイズを薄く流す
let LOFI=null;
function lofiChain(dest){
  dest=dest||compBus; if(LOFI&&LOFI.ctx===ctx){ if(LOFI.k.get(dest)) return LOFI.k.get(dest); return lofiKey(dest); }
  lofiBase(); return lofiKey(dest); }
function lofiKey(dest){
  const inp=ctx.createGain(); inp.gain.value=1;
  const d=ctx.createDelay(.05); d.delayTime.value=.012;
  const lfo=ctx.createOscillator(), lg=ctx.createGain(); lfo.frequency.value=.6; lg.gain.value=.0022; lfo.connect(lg); lg.connect(d.delayTime); lfo.start();
  const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=140;
  const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=2600; lp.Q.value=.3;
  const sh=ctx.createWaveShaper(); const n=1024, c=new Float32Array(n); for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; c[i]=Math.tanh(1.8*x)/Math.tanh(1.8); } sh.curve=c;
  const out=ctx.createGain(); out.gain.value=.9;
  inp.connect(d); d.connect(hp); hp.connect(lp); lp.connect(sh); sh.connect(out); out.connect(dest);
  LOFI.k.set(dest,inp); return inp; }
function lofiBase(){
  // レコードのノイズ（サーッという音＋ときどきプチッ）
  const sr=ctx.sampleRate, len=sr*3, buf=ctx.createBuffer(1,len,sr), ch=buf.getChannelData(0); let lpv=0;
  for(let i=0;i<len;i++){ lpv=lpv*.92+(Math.random()*2-1)*.08; ch[i]=lpv*.5 + (Math.random()<.00012 ? (Math.random()*2-1)*.9 : 0); }
  const ns=ctx.createBufferSource(); ns.buffer=buf; ns.loop=true; const nf=ctx.createBiquadFilter(); nf.type='bandpass'; nf.frequency.value=2500; nf.Q.value=.4;
  const ng=ctx.createGain(); ng.gain.value=0; ns.connect(nf); nf.connect(ng); ng.connect(master); ns.start();
  LOFI={ctx,ng,drum:new Map(),k:new Map()}; }
function lofiNoise(on){ if(!ctx) return; if(on && !(LOFI&&LOFI.ctx===ctx)) lofiBase(); if(LOFI&&LOFI.ctx===ctx) LOFI.ng.gain.setTargetAtTime(on?.05:0,ctx.currentTime,.15); }
function lofiDrum(dest){ if(!(LOFI&&LOFI.ctx===ctx)) lofiBase(); let n=LOFI.drum.get(dest); if(n) return n;
  const inp=ctx.createGain(); const lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=3200;
  const sh=ctx.createWaveShaper(); const k=2.5, N=1024, c=new Float32Array(N); for(let i=0;i<N;i++){ const x=i/(N-1)*2-1; c[i]=Math.tanh(k*x)/Math.tanh(k); } sh.curve=c;
  const g=ctx.createGain(); g.gain.value=.8; inp.connect(lp); lp.connect(sh); sh.connect(g); g.connect(dest); LOFI.drum.set(dest,inp); return inp; }
let EPD=null;
// 強く弾いた電子ピアノ：アンプで歪ませるのではなく、鍵盤を強く叩いたときに金属の棒（トーン）が「ガッ」と鳴る感じ。
// ごく軽く飽和させて倍音を足し、2.5kHz あたりの金属っぽい鳴りと 700Hz あたりの芯を少し前に。高音は削らない
function epDrive(dest){ dest=dest||compBus; if(!EPD||EPD.ctx!==ctx) EPD={ctx,m:new Map()}; if(EPD.m.get(dest)) return EPD.m.get(dest);
  const inp=ctx.createGain(); inp.gain.value=1.2;
  const sh=ctx.createWaveShaper(); const N=2048, c=new Float32Array(N); for(let i=0;i<N;i++){ const x=i/(N-1)*2-1; c[i]=Math.tanh(1.3*x)/Math.tanh(1.3); } sh.curve=c; sh.oversample='2x';
  const hp=ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=45;
  const low=ctx.createBiquadFilter(); low.type='lowshelf'; low.frequency.value=200; low.gain.value=4;        // 太さ：低音〜低い中域をしっかり
  const mud=ctx.createBiquadFilter(); mud.type='peaking'; mud.frequency.value=450; mud.Q.value=1.2; mud.gain.value=-2;   // こもりの元を少し削る
  const bark=ctx.createBiquadFilter(); bark.type='peaking'; bark.frequency.value=2400; bark.Q.value=1; bark.gain.value=2.5;
  const air=ctx.createBiquadFilter(); air.type='highshelf'; air.frequency.value=5000; air.gain.value=8;      // キラキラ：高音の抜け
  const shine=ctx.createBiquadFilter(); shine.type='peaking'; shine.frequency.value=10000; shine.Q.value=.7; shine.gain.value=4;   // いちばん上のきらめき
  const out=ctx.createGain(); out.gain.value=.72;
  inp.connect(sh); sh.connect(hp); hp.connect(low); low.connect(mud); mud.connect(bark); bark.connect(air); air.connect(shine); shine.connect(out); out.connect(dest);
  // キラキラを今の約5倍に：3.5kHz より上だけを取り出して、軽く歪ませて倍音（きらめき）を足し、元の音に重ねる
  const sp1=ctx.createBiquadFilter(); sp1.type='highpass'; sp1.frequency.value=3500; sp1.Q.value=.7;
  const sp2=ctx.createBiquadFilter(); sp2.type='highpass'; sp2.frequency.value=3500; sp2.Q.value=.7;
  const spx=ctx.createWaveShaper(); const c2=new Float32Array(N); for(let i=0;i<N;i++){ const x=i/(N-1)*2-1; c2[i]=Math.tanh(3*x)/Math.tanh(3); } spx.curve=c2; spx.oversample='4x';
  const spt=ctx.createBiquadFilter(); spt.type='highpass'; spt.frequency.value=4500; spt.Q.value=.7;   // 歪みで出た低い濁りは捨てる
  const spg=ctx.createGain(); spg.gain.value=2;
  bark.connect(sp1); sp1.connect(sp2); sp2.connect(spx); spx.connect(spt); spt.connect(spg); spg.connect(out);
  EPD.m.set(dest,inp); return inp; }
function keyTone(m,t,dur,v,inst){
  v=Math.max(.05,Math.min(1,v)); if(CAPTURE){ CAPTURE.push({k:PART2?'key2':'key',n:m,t,d:dur,v}); return null; }
  const BUS=PART2?compBus2:compBus;
  const I=inst||state.inst;
  if(I==='epcity' && LOADED.epiano){
    // 強く弾いた電子ピアノ（シティポップ）：アタックを少し立て、トーンの金属っぽい鳴りを足す（歪ませすぎない）
    OUT=epDrive(BUS); const fx=INST_FX.epiano, lv=.36*fx.gain*Math.pow(v,1.3)*.75, dd=Math.max(dur*fx.hold,.08);
    const g=playZone(LOADED.epiano,m,t,dd,lv,.25,16000,false); OUT=null;
    if(g){ try{ const G=g.gain; G.cancelScheduledValues(t); G.setValueAtTime(0,t); G.linearRampToValueAtTime(lv*2.1,t+.002); G.setTargetAtTime(lv,t+.006,.035); G.setValueAtTime(lv,t+dd); G.setTargetAtTime(0,t+dd,.22); }catch(e){} }
    return g; }
  if(I==='lofi' && LOADED.epiano){
    // ローファイ：エレピを、こもらせて少し揺らす（古いテープ・レコードの感じ）
    OUT=lofiChain(BUS); const fx=INST_FX.epiano;
    const g=playZone(LOADED.epiano,m,t,Math.max(dur*fx.hold,.08),.36*fx.gain*Math.pow(v,1.5),.35,700+2600*v,false); OUT=null; return g; }
  if(I==='dist' && LOADED.eguitar){
    // ひずみギター：クリーンのエレキをアンプ風のひずみに通す。短い音（ブリッジミュート）はこもらせて「ズン」と
    OUT=distChain(BUS); const mute=dur<.12;
    const g=playZone(LOADED.eguitar,m,t,Math.max(dur,.06),.9*Math.pow(v,1.1),mute?.05:.1,mute?900:5000,false); OUT=null; return g; }
  const fx=INST_FX[I], set=LOADED[I];
  OUT=(playing||PREV)?BUS:null;
  PAN = state.wide ? (PAN_NEXT??0) : null;   // 左右の広がり（位置は playEvents で決める）
  const lv0=.36*(fx?fx.gain:1)*Math.pow(v,1.6), dd=Math.max(dur*((fx&&fx.hold)||1),.08);
  const g = fx&&set&&playZone(set,m,t,dd,lv0,fx.rel,Math.max(fx.cutMin||0,900+9000*v*v),fx.loop,fx.atk); PAN=null;
  // ストリングスのボウイング：小節ごとにダウンボウとアップボウを交互に。ダウンは弾き始めが強くて少しずつ弱く、アップは弱く入って少しずつ強く。
  // 弓を返す所（小節の変わり目）は短く切って、次の弓へはっきり切り替える
  if(g && /^strings/.test(I)){ const up=BOWBAR%2===1, a=t+(fx.atk||.05), e=t+dd;
    try{ const G=g.gain; G.cancelScheduledValues(t); G.setValueAtTime(0,t); G.linearRampToValueAtTime(lv0*(up?.7:1),a);
      G.linearRampToValueAtTime(lv0*(up?1:.78),Math.max(a+.01,e-.03)); G.setTargetAtTime(0,e,.06); }catch(e){} }
  const r = g || synthTone(m,t,dur,.34*Math.pow(v,1.3)); OUT=null; return r;
}
function bassTone(m,t,dur,vel=1){ if(CAPTURE){ CAPTURE.push({k:'bass',n:m,t,d:dur,v:vel}); return null; } OUT=(playing||PREV)?bassBus:null; const r=bassTone_(m,t,dur,vel); OUT=null; return r; }
let lastBassVoice=null;
function bassTone_(m,t,dur,vel=1){
  const nm=state.bassSnd||'bass', fx=BASS_FX[nm]||BASS_FX.bass;   // シンセ系の音色で「エレキベース」のときは軽いシンセベースを使う
  // ポルタメント：前の音を弾き直さず、そのまま音程だけすべらせて伸ばす（アタックが付かない。弦を押さえたままスライドする感じ）
  const lv=lastBassVoice;
  if(GLIDE && lv && lv.ctx===ctx && lv.end>=t-.03){ legatoVoice(lv,m,t,dur); return lv.g; }
  let g;
  if(nm==='sbass') g=analogBass(m,t,dur,vel);
  else g=(!isSynthInst()||nm!=='bass')&&LOADED[nm]&&playZone(LOADED[nm],m,t,dur,.7*vel*fx.gain,.08,fx.cut,fx.loop);
  g=g||synthBass(m,t,dur,vel); bassHeld.push(g);
  lastBassVoice=g.voice?{...g.voice,g,ctx,end:t+dur}:null; return g;
}
function legatoVoice(lv,m,t,dur){
  const gt=GLIDE.time;
  lv.params.forEach(([pr,k])=>{ const to=k(m); pr.cancelScheduledValues(t); pr.setValueAtTime(to*GLIDE.ratio,t); pr.exponentialRampToValueAtTime(to,t+gt); });
  const g=lv.g.gain; g.cancelScheduledValues(t); g.setValueAtTime(lv.level,t); g.setValueAtTime(lv.level,t+dur); g.setTargetAtTime(.0001,t+dur,lv.rel);
  lv.srcs.forEach(s=>{ try{ s.stop(t+dur+lv.rel*7); }catch(e){} });
  if(lv.onLegato) lv.onLegato(t,dur,m);
  lv.end=t+dur;
}
const DRUM_VOL={36:1.15,37:.75,75:1.1,38:.9,42:.3,44:.3,46:.22,49:.28,51:.26,50:.8,47:.8,45:.85};
function drum(note,t,vel=1){ if(CAPTURE){ CAPTURE.push({k:'drum',n:note,t,d:.1,v:vel}); return; } OUT=playing?drumBus:null; drumIn(note,t,vel); OUT=null; }
// ドラムの音ごとの大きさの調整（ほかのキットとそろえる）。シティポップのドラムは JCLive の音源で、キックとスネアが大きめなので下げる
const KIT_GAIN={city:{36:.62,38:.75,42:.55,44:.6,46:.5,49:.3,51:.4}};
const KIT_ALIAS={cityA:'city',cityB:'city',cityD:'city'}; const fixKit=v=>KIT_ALIAS[v]||v;
// シティポップのドラム：タオルでミュートした古いジャズ用スネア（Ludwig 5×14 のような）と、フェルトで止めたキック。
// 鳴りを止めた「ボスッ・パフッ」とした短い音に、紙っぽい「クシャッ」を少し。高音のシャリシャリは抑えて、70年代の乾いた音に
let CITYD=null;
function cityDrum(dest,note){
  if(!CITYD||CITYD.ctx!==ctx) CITYD={ctx,m:new Map()};
  let c=CITYD.m.get(dest);
  if(!c){ const comp=ctx.createDynamicsCompressor(); comp.threshold.value=-18; comp.ratio.value=3; comp.attack.value=.015; comp.release.value=.09; comp.knee.value=8;
    const out=ctx.createGain(); out.gain.value=.9; comp.connect(out); out.connect(dest);
    const sat=ctx.createWaveShaper(); const N=1024, cv0=new Float32Array(N); for(let i=0;i<N;i++){ const x=i/(N-1)*2-1; cv0[i]=Math.tanh(2.6*x)/Math.tanh(2.6); } sat.curve=cv0;
    const tape=ctx.createBiquadFilter(); tape.type='lowpass'; tape.frequency.value=9000; tape.Q.value=.5; sat.connect(tape); tape.connect(comp);
    // キック：フェルトで止めた「ボスッ」
    const kLp=ctx.createBiquadFilter(); kLp.type='lowpass'; kLp.frequency.value=1600; kLp.Q.value=.6;
    const kBody=ctx.createBiquadFilter(); kBody.type='peaking'; kBody.frequency.value=90; kBody.Q.value=1; kBody.gain.value=3; kLp.connect(kBody); kBody.connect(sat);
    // スネア：タオルミュート。胴の「パフッ」（200Hz）と、紙っぽい「クシャッ」（1.2kHz）、響き（5kHz より上）は抑える
    const sBody=ctx.createBiquadFilter(); sBody.type='peaking'; sBody.frequency.value=200; sBody.Q.value=.9; sBody.gain.value=4;
    const sPaper=ctx.createBiquadFilter(); sPaper.type='peaking'; sPaper.frequency.value=1200; sPaper.Q.value=1.3; sPaper.gain.value=3;
    const sDamp=ctx.createBiquadFilter(); sDamp.type='lowpass'; sDamp.frequency.value=4800; sDamp.Q.value=.4; sBody.connect(sPaper); sPaper.connect(sDamp); sDamp.connect(sat);
    // ハイハット・シンバル・タム：暗めで古い音
    const oLp=ctx.createBiquadFilter(); oLp.type='lowpass'; oLp.frequency.value=7500; const oHp=ctx.createBiquadFilter(); oHp.type='highpass'; oHp.frequency.value=200; oHp.connect(oLp); oLp.connect(sat);
    c={kick:kLp, snare:sBody, other:oHp}; CITYD.m.set(dest,c); }
  return note===36?c.kick : (note===38||note===37)?c.snare : c.other; }
function drumIn(note,t,vel=1){
  const KG=KIT_GAIN[state.kit]; if(KG&&KG[note]) vel*=KG[note];
  const lofi=state.kit==='lofi', city=state.kit==='city', kit=LOADED['kit-'+(lofi||city?'std':state.kit)];
  if(kit&&kit[note]){ const sv=OUT; if(lofi) OUT=lofiDrum(OUT||master); if(city) OUT=cityDrum(OUT||master,note);
    const dur = city ? (note===36?.16:note===38?.13:note===42?.07:note===44?.07:note===46?.22:note===49?3:note===51?2:.35) : (note===49?2.5:1.2);   // シティポップは短く締める（シンバルは最後まで鳴らす）
    const ok=playZone(kit[note],note,t,dur,DRUM_VOL[note]*vel*(lofi?.9:1),city?(note===49||note===51?.8:.04):.25); OUT=sv; if(ok) return; }
  const f={36:kick,37:rim,38:snare,42:t=>hat(t,vel>.7),44:t=>hat(t,false),46:ohat,49:t=>noise(t,'highpass',6000,1.2,.1*vel),51:t=>noise(t,'bandpass',6500,.4,.07*vel,2),
    50:t=>tom(t,220),47:t=>tom(t,160),45:t=>tom(t,115),75:clave}[note]; if(f) f(t);
}
function tom(t,f){ const g=ctx.createGain(); g.connect(OUT||master); const o=osc('sine',f,t,t+.4,g); o.frequency.exponentialRampToValueAtTime(f*.6,t+.3);
  g.gain.setValueAtTime(.7,t); g.gain.exponentialRampToValueAtTime(.0001,t+.35); }
function previewKit(){ whenRunning(previewKitNow); }
function previewKitNow(){ const t=ctx.currentTime+.03, sd=.13; drum(36,t); drum(42,t); drum(42,t+sd,.5); drum(38,t+sd*2); drum(42,t+sd*2); drum(36,t+sd*3); drum(46,t+sd*3); }
function osc(type,f,t,end,dest,detune=0){ const o=ctx.createOscillator(); o.type=type; o.frequency.value=f; o.detune.value=detune;
  if(GLIDE){ o.frequency.setValueAtTime(f*GLIDE.ratio,t); o.frequency.exponentialRampToValueAtTime(f,t+GLIDE.time); }   // ポルタメント
  o.connect(dest); o.start(t); o.stop(end); return o; }
// 減衰つきエンベロープ（短い音でも音量が戻らない形）
function env(g,t,peak,sus,dec,dur,rel,att=.005){
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(peak,t+att);
  g.gain.setTargetAtTime(peak*sus,t+att,dec/3);
  g.gain.setTargetAtTime(.0001,t+Math.max(dur,att+.01),rel);
}
function synthTone(m,t,dur,vel){
  const f=mtof(m), g=ctx.createGain(), lp=ctx.createBiquadFilter(); lp.type='lowpass';
  g.connect(lp); lp.connect(OUT||master); dur=Math.max(dur,.06);
  const inst=SYNTH_INST[state.inst]||state.inst;
  if(inst==='piano'){
    lp.frequency.setValueAtTime(3200,t); lp.frequency.exponentialRampToValueAtTime(1100,t+.5);
    const end=t+dur+.8; osc('triangle',f,t,end,g); const g2=ctx.createGain(); g2.gain.value=.3; g2.connect(g); osc('sine',f*2,t,end,g2);
    env(g,t,vel,.35,.3,dur,.1,.006);
  } else if(inst==='organ'){
    lp.frequency.value=3500; const end=t+dur+.2;
    [[1,.6],[2,.35],[3,.22],[4,.12]].forEach(([r,a])=>{ const gg=ctx.createGain(); gg.gain.value=a; gg.connect(g); osc('sine',f*r,t,end,gg); });
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vel*.8,t+.01); g.gain.setValueAtTime(vel*.8,t+dur); g.gain.linearRampToValueAtTime(0,t+dur+.05);
  } else if(inst==='nylon'){
    lp.Q.value=2; lp.frequency.setValueAtTime(5000,t); lp.frequency.exponentialRampToValueAtTime(700,t+.25);
    const end=t+dur+1.2; osc('sawtooth',f,t,end,g);
    env(g,t,vel*.9,.25,.4,dur,.15,.003);
  } else {
    lp.frequency.setValueAtTime(900,t); lp.frequency.linearRampToValueAtTime(2200,t+.15); const end=t+dur+.6;
    osc('sawtooth',f,t,end,g,-8); osc('sawtooth',f,t,end,g,8);
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vel*.55,t+.03); g.gain.setValueAtTime(vel*.5,t+dur); g.gain.setTargetAtTime(.0001,t+dur,.15);
  }
  return g;
}
// シンセベース（Moog Sub 37 風）：ノコギリ波2本（少しずらす）＋1オクターブ上の矩形波を軽くひずませ、
// 24dB のローパス（12dB のフィルターを2段）にレゾナンスを少し。フィルターは弾くたびに開いて、すばやく閉じる「ブーン」としたアタック。
// 音程は本来のベースの高さ（倍音が多いので、スマホのスピーカーでも音程が聞こえる）
let SAT_CURVE=null;
function satCurve(){ if(SAT_CURVE) return SAT_CURVE; const n=1024, c=new Float32Array(n); for(let i=0;i<n;i++){ const x=i/(n-1)*2-1; c[i]=Math.tanh(1.8*x)/Math.tanh(1.8); } return SAT_CURVE=c; }
function analogBass(m,t,dur,vel=1){
  const g=ctx.createGain(); g.connect(OUT||master);
  const f=mtof(m), end=t+dur+.4;
  const pre=ctx.createGain(); pre.gain.value=.55;
  const sh=ctx.createWaveShaper(); sh.curve=satCurve();
  const lp1=ctx.createBiquadFilter(); lp1.type='lowpass'; lp1.Q.value=3.2;
  const lp2=ctx.createBiquadFilter(); lp2.type='lowpass'; lp2.Q.value=.7;
  pre.connect(sh); sh.connect(lp1); lp1.connect(lp2); lp2.connect(g);
  const MUL=[[1,'sawtooth',1,-4],[1,'sawtooth',1,4],[2,'square',.32,0]], oscs=[];
  MUL.forEach(([k,type,lv,dt])=>{ const og=ctx.createGain(); og.gain.value=lv; og.connect(pre); oscs.push([osc(type,f*k,t,end,og,dt),k]); });
  // フィルター：音程に合わせて少し開き（キートラック）、強く弾くほど明るく
  const cut=mm=>Math.min(1400,110+mtof(mm)*2.4), sus=mm=>cut(mm)+260;
  const peak=cut(m)+900+2000*vel;
  [lp1,lp2].forEach(lp=>{
    if(GLIDE){ lp.frequency.setValueAtTime(sus(m),t); }   // すべらせるときはフィルターを開き直さない（レガート）
    else { lp.frequency.setValueAtTime(cut(m),t); lp.frequency.linearRampToValueAtTime(peak,t+.004); lp.frequency.setTargetAtTime(sus(m),t+.006,.11); } });
  const L=.22*vel;
  if(GLIDE) g.gain.setValueAtTime(L,t); else { g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(L,t+.003); }
  g.gain.setValueAtTime(L,t+dur); g.gain.setTargetAtTime(.0001,t+dur,.04);
  g.voice={params:oscs.map(([o,k])=>[o.frequency,mm=>mtof(mm)*k]), srcs:oscs.map(([o])=>o), level:L, rel:.04,
    onLegato:(t2,d2,mm)=>[lp1,lp2].forEach(lp=>{ lp.frequency.cancelScheduledValues(t2); lp.frequency.setTargetAtTime(sus(mm),t2,.05); })};
  return g;
}
function synthBass(m,t,dur,vel=1){
  const g=ctx.createGain(), lp=ctx.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=700; lp.connect(g); g.connect(OUT||master);
  osc('triangle',mtof(m),t,t+dur+.5,lp);
  const g2=ctx.createGain(); g2.gain.value=.35; g2.connect(lp); osc('sine',mtof(m)*2,t,t+dur+.5,g2);   // 低い音でもスマホのスピーカーで聞こえるように倍音を足す
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.34*vel,t+.01); g.gain.setTargetAtTime(.34*vel*.5,t+.02,.45); g.gain.setTargetAtTime(.0001,t+dur,.06);   // 弾いた後は少しずつ減衰（ずっと同じ音量で伸ばすと低音がこもる）
  return g;
}
function noise(t,type,freq,dur,vol,q=1){
  const s=ctx.createBufferSource(); s.buffer=noiseBuf; const f=ctx.createBiquadFilter(); f.type=type; f.frequency.value=freq; f.Q.value=q;
  const g=ctx.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  s.connect(f); f.connect(g); g.connect(OUT||master); s.start(t); s.stop(t+dur+.02);
}
function kick(t){ const g=ctx.createGain(); g.connect(OUT||master); const o=osc('sine',140,t,t+.35,g); o.frequency.setValueAtTime(140,t); o.frequency.exponentialRampToValueAtTime(42,t+.13);
  g.gain.setValueAtTime(.95,t); g.gain.exponentialRampToValueAtTime(.0001,t+.32); }
function snare(t){ noise(t,'bandpass',1900,.17,.5,.7); const g=ctx.createGain(); g.connect(OUT||master); osc('triangle',200,t,t+.1,g);
  g.gain.setValueAtTime(.35,t); g.gain.exponentialRampToValueAtTime(.0001,t+.08); }
const hat=(t,a)=>noise(t,'highpass',8000,.035,a?.1:.055);
const ohat=t=>noise(t,'highpass',7500,.18,.07);
const rim=t=>noise(t,'bandpass',3200,.03,.4,4);
// クラベス（音源がないとき）：2.5kHz 付近の短い木の響き
const clave=t=>{ const g=ctx.createGain(); g.connect(OUT||master); osc('sine',2500,t,t+.12,g); g.gain.setValueAtTime(.35,t); g.gain.exponentialRampToValueAtTime(.0001,t+.1); };

// 音が止まっている（スマホで音の準備ができていない）間に試し弾きをためこまない。
// 準備ができてから、最後の1回分だけ鳴らす
let pendingSound=null;
function whenRunning(fn){
  ensureAudio();
  if(ctx.state==='running'){ pendingSound=null; fn(); return; }
  pendingSound=fn;
  ctx.resume().then(()=>{ if(pendingSound===fn && ctx.state==='running'){ pendingSound=null; fn(); } }).catch(()=>{});
}
function preview(d){
  if(playing||d===null||d===undefined) return;
  whenRunning(()=>{ if(!playing) previewNow(d); });
}
let PREV=false;   // コードをタップして鳴らしているところ
// タップで鳴らすときの左右の位置（演奏中の決め方と同じ：鍵盤は低い音ほど左、弦楽器は低い順に まん中・左・右…、ほかはまん中）
function previewPan(m,srt){ const I=state.inst;
  if(PIANOISH.has(I)) return Math.max(-.35,Math.min(.35,(m-62)/40));
  if(/^strings/.test(I)){ const ri=srt.indexOf(m), wd=.45*Math.max(.15,Math.min(1,(m-36)/42)); return ri<=0 ? 0 : (ri%2 ? -wd : wd); }
  return 0; }
function previewNow(d){
  // チュートリアルの中でタップして鳴らすコードは、いつもピアノ＋ベース
  const sv=TUT.on?{inst:state.inst,bass:state.bass,bassSnd:state.bassSnd}:null; if(sv) Object.assign(state,{inst:'piano',bass:true,bassSnd:'bass'});
  // 演奏中と同じ出口（楽器ごとのミックス）を通し、左右の位置も演奏中と同じ決め方で置く
  PREV=true;
  try{ const t=ctx.currentTime+.02, {tones,bass,strings}=chordNotes(d,null), ns=(strings||[...tones.slice(0,4),tones[9]]).filter(m=>m!=null), srt=[...new Set(ns)].sort((a,b)=>a-b);
    ns.forEach((m,i,a)=>{ PAN_NEXT=previewPan(m,srt); keyTone(m,t+i*.02,.9,i===a.length-1?.62:.5); }); PAN_NEXT=null; if(state.bass) bassTone(bass,t,.9); }
  finally{ PREV=false; if(sv) Object.assign(state,sv); }
}

// ---------- scheduler ----------
const COMP_LEVEL=.85;
let lastR=null, barTones=null;
// 次の和音を弾くとき、前の和音を自然に離す（音が重なって濁るのを防ぐ）
let held=[];
function choke(t){ held=held.filter(h=>{ if(h.end>t){ try{ h.g.gain.cancelScheduledValues(t); h.g.gain.setTargetAtTime(0,t,.025); }catch(e){} } return false; }); }
let playedSteps=0, gpos=0, LOOPN=0, ENDED_EARLY=false;   // ENDED_EARLY：1周で止めるとき、最後の小節で次（頭のコード）を食う所で締めの「ジャーン」を鳴らした
// 1周だけ鳴らして止める再生か（コード一覧の試し聴き・音声の書き出し・最初の1周）
let CAP_LEN=null;
const oneLen=()=> CAPTURE ? CAP_LEN : (EXPORT&&EXPORT.on) ? EXPORT.len : LIB.bk ? state.bars*slotSteps() : TUT.on ? TUT.loopLen : MOODPOP.pending ? state.bars*slotSteps() : null;   // LOOPN：進行を何周したか（フィルの位置を進行の頭にそろえるため）
const totalBars=()=>state.bars*slotSteps()/16;
const isFillBar=b=>b%4===3;
const fillModeOf=(b,dr)=> state.fill && dr.F && isFillBar(b) ? (b%8===7?'big':'small') : null;   // フィルは再生を始めてから4小節ごと（コードの切り替えやマスの数とは関係なし）
let playing=false, timer=null, nextTime=0, visQ=[], cur=null;
const stepDur=()=>60/state.bpm/4;
const ANT_CHOICES=[[2,'8分前（食い）'],[1,'16分前（食い）'],[0,'ちょうど'],[-1,'16分後ろ'],[-2,'8分後ろ']];
let pushedKey=null;
const antOf=i=>{ if(!state.pro&&!SHARE_VIEW) return 0; const a=state.ant?state.ant[i]:null; return a||0; };   // 食い・後ろ倒しはPROだけ
// マス i の h 番目のコードのタイミング（＋＝食い、－＝後ろ倒し）
// 食い・後ろ倒しの設定そのもの（null＝設定なし。伴奏パターンの決まった食い pushBy を使う）
const rawShiftOf=(i,h)=>{ if(!state.pro&&!SHARE_VIEW) return null; const a=h?((segsOf(i)[h-1]||{}).ant):(state.ant||[])[i]; return a==null?null:a; };
const shiftOf=(i,h)=>{ if(!state.pro&&!SHARE_VIEW) return 0; if(!h) return antOf(i); const sg=segsOf(i)[h-1]; return (sg&&sg.ant)||0; };
const shiftMark=a=>a>0?'←食':a<0?'後→':'';
// 最後に鳴らした音がアクセント（いちばん上の音）だったら、その高さを覚えておき、次のコードのいちばん上の音をそこへつなげる
let ACC_TOP=null;
const TIE_LAST=[null,null], SOUNDING=[[],[]], LAST_SOLO=[null,null];   // SOUNDING：パートごとの同じタイミングの音、LAST_SOLO：直前に1音だけで弾いた音（同じ高さにならないように）   // パートごとの直前の音（同じ高さが続いたらつなぐため）
function playEvents(evs,bt,ct,sd,pat){
  if(bt&&bt.ivs&&bt.rpc!=null) setScaleFor([...bt.ivs.map(i=>(bt.rpc+i)%12), ...(bt.bpc!=null?[bt.bpc]:[])]);
  const tones=bt.tones, notes=[];
  if(evs.length) ACC_TOP = pat&&pat.accLink && evs.some(e=>e[1].includes(6)) && tones[6]!=null ? tones[6] : null;   // 「アクセントのあと上げてつなぐ」パターンだけ
  const RHS=new Set([1,2,3,6,7,8,9]);
  // 4音目の行：4音のコードは4つ目の音。3音のコードでは、同じタイミングで「右手 下」を弾いていないとき（分散）だけ、右手 中の1オクターブ上で鳴らす
  const BLK=new Set(evs.filter(e=>e[1].includes(1)).map(e=>e[0]));
  evs.forEach(([st0,ns0,len,vel,dir,tr,nxk,nxr,nxN,oc,when])=>{
    const isNT=tr==='nt'||tr==='ntd'||tr==='ntu';
    if(isNT && (NX_V==null || NX_ANT>0 || ornPitch(tr,bt)==null)) return;   // 次のコードの上の音へつなぐ飾りは、次のコードがないとき・次のコードを食うときは弾かない
    if(when && !whenOK(when,bt)) return;   // 鳴らす条件（上の音の動き）が合わないとき   // tr：数字＝半音ずらす、'fall'＝最後にフォール
    let ns=ns0; const degs=ns.filter(isDeg); ns=ns.filter(ix=>!isDeg(ix));   // メロディ行（d1〜d8）は別に鳴らす
    // 右手を1〜2音ずつ弾く（分散和音）ときは、4音のコードでも色の音（3度・7度・9度）が抜けないように ra を使う
    const arp = bt.ra && !usesR4(pat) && ns.length<3 && ns.every(ix=>RHS.has(ix));
    if(!arp && tones[9]!=null){ if(ns.includes(1)&&ns.includes(2)&&ns.includes(3)&&!ns.includes(9)) ns=[...ns,9]; if(ns.includes(6)&&ns.includes(7)&&ns.includes(8)) ns=[...ns,10]; }
    // ストリングスは開離配置：右手の真ん中の音を1オクターブ上げ、左手に5度を足して、広い音域で鳴らす（弓で弾くように立ち上がりもゆっくり）
    if(!arp && !(pat&&pat.satb) && /^strings/.test(state.inst) && ns.includes(1)&&ns.includes(2)&&ns.includes(3)){ ns=ns.map(ix=>ix===2?7:ix); if(ns.includes(0)&&!ns.includes(4)) ns=[...ns,4]; ns=[...new Set(ns)]; }
    ns=ns.filter(ix=>tones[ix]!=null || (ix===9 && tones[2]!=null && !BLK.has(st0)));   // ギターの4・5弦のコードなど、ない弦は鳴らさない（4音目は3音のコードでも鳴らす）
    const top=dir==='u'?ns[0]:ns[ns.length-1];
    const sh=(typeof tr==='number'?tr:0)+(oc||0), TN0=(tr==='up'&&bt.up)?bt.up:tones, TN=TN0[9]!=null||TN0[2]==null?TN0:Object.assign([...TN0],{9:TN0[2]+12});   // oc：1オクターブ上・下   // 'up'：1つ上の和音の音で弾く／'dn'：1つ下の音階の音（刺繍音）
    const I0=notes.length, NB=NB_SET.has(tr), CP=[...new Set(Object.values(tones).filter(x=>x!=null).map(x=>((x%12)+12)%12))], MO=(pat&&pat.melOct)||0;
    const NT=isNT?ornPitch(tr,bt):null, nxM0=tr==='nx'?nxPitch(nxk||1,nxN||1,bt):NT, nxM=nxM0!=null&&[6,7,8].includes(+nxr)?nxM0+12:nxM0;   // アクセント行（1オクターブ上）でつなぐときは、その高さで
    degs.forEach((ix,k)=>{ const m0=degPitch(ix)+sh+MO, m=nxM??m0; if(NB) nbSplit(m,tr,len,CP).forEach(p=>notes.push({ix:3,k,len:p.len,vel,dir,st0:st0+p.d,ev0:st0,top:false,mel:true,m:p.m,orig:p.m,row:ix})); else notes.push({ix:3,k,len,vel,dir,st0,ev0:st0,top:false,mel:true,m,orig:m,row:ix}); });   // メロディ行：キーの音階の音
    if(tr==='up' && bt.upV && LHCTX) LHCTX.satb=bt.upV;   // 和声法：次の和音へは、上がったあとの形からつなぐ
    ns.forEach((ix,k)=>{ const m0=(arp ? (ix<=3 ? bt.ra[ix-1] : bt.ra[ix-6]+12) : TN[ix])+sh, m=nxM??m0; if(NB) nbSplit(m,tr,len,CP).forEach(p=>notes.push({ix,k,len:p.len,vel,dir,st0:st0+p.d,ev0:st0,top:ix===top,m:p.m,orig:p.m,row:ix})); else notes.push({ix,k,len,vel,dir,st0,ev0:st0,top:ix===top, m,orig:m,row:ix}); });   // tr＝半音いくつずらすか
    // フォール（'fall'）：のばした音の終わりで、音程を一気に下げながら抜く（ブラスの「プァー↘」）
    if(tr==='fall') notes.slice(-ns.length).forEach(n=>n.fall=true);
    if(tr==='scoop') notes.slice(I0).forEach(n=>n.scoop=true);
    if(!isNT && bt) notes.slice(I0).forEach(n=>{ if(!n.mel && RHS.has(n.ix)) bt._top=Math.max(bt._top??-1,n.m); });   // いまの小節で弾いた右手のいちばん上の音（飾りの条件用）   // しゃくり：この音（メロディ行も）を下からずり上げる
    // 和音の音を2音だけ同時に鳴らすとき（刻み・2声のオブリ）は、半音（短2度・長7度）でぶつからないようにする。
    // ぶつかったら、テンション（9度など）の方を、すぐ下の和音の基本の音（ルート・3度・5度・7度）へ替える。3音以上の「パー」はテンションごとそのまま
    // メロディ行・次のコードへつなぐ音（1音ずつのフレーズ）：和音の音の半音上（濁る音）に当たったら、その和音の音へよける
    // メロディ行・つなぎの音は、今のコードの音階に合わせる（キーの中のコードはそのまま。キーの外のコードでは、その部分転調の音階で）
    if(bt) notes.slice(I0).forEach(n=>{ if(n.mel||tr==='nx') n.m=melNote(n.m,bt); });
    if((tr==='nx'||NB) && bt){ const S=chordScaleOf(bt); if(S) notes.slice(I0).forEach(n=>{ if(n.mel) return; const pc=((n.m%12)+12)%12; if(S.has(pc)) return;
        const a=n.m+1, b=n.m-1, ca=CP.includes(((a%12)+12)%12), cb=CP.includes(((b%12)+12)%12);   // 半音となりの音階の音へ（コードの音を優先、なければ下へ）
        const okA=S.has(((a%12)+12)%12), okB=S.has(((b%12)+12)%12); n.m = okA&&okB ? (ca&&!cb?a:b) : okA ? a : okB ? b : n.m; }); }
    const cn=notes.slice(I0).filter(n=>!n.mel && n.st0===st0);
    if(cn.length===2 && !(pat&&pat.satb) && bt.rpc!=null){ const [a,b]=cn[0].m<=cn[1].m?[cn[0],cn[1]]:[cn[1],cn[0]], d=(((b.m-a.m)%12)+12)%12;
      if(d===1||d===11){ const iv=bt.ivs||[], core=[0,bt.third,bt.fifth].concat(iv.some(i=>i===10||i===11)?[bt.seventh]:[]).map(i=>(bt.rpc+i)%12), pc=x=>((x%12)+12)%12, isC=n=>core.includes(pc(n.m));
        const mv=(isC(a)&&!isC(b))?b:a; let x=mv.m-1, k=0; while(!core.includes(pc(x))&&k++<12) x--;
        if(mv===b && x<=a.m){ x=b.m+1; k=0; while(!core.includes(pc(x))&&k++<12) x++; }
        mv.m=x; } }
    // 別の行（別の音）を選んでいるのに、よける処理などで同じ高さになってしまったら、よける前の音に戻す（戻しても同じなら、音階で1つ下へ）
    { const evN=notes.slice(I0);
      evN.forEach((n,i)=>{ evN.slice(0,i).forEach(o=>{ if(o.st0===n.st0 && o.row!==n.row && o.m===n.m){ const t=(n.m!==n.orig)?n:(o.m!==o.orig)?o:null;
        if(t) t.m=t.orig; if(o.m===n.m){ const lo=(String(n.row)<String(o.row))?n:o; lo.m=scaleDown(lo.m); } } }); });
      // メロディ（1音ずつのフレーズ）：直前の音と別の行なのに同じ高さになったら、よける前の音に戻す
      const LM=LAST_MEL[PART2?1:0];
      evN.filter(n=>n.mel||tr==='nx').sort((a,b)=>a.st0-b.st0).forEach(n=>{
        if(LM.m!=null && (LM.row!==n.row || tr==='nx') && LM.m===n.m && (LM.orig!==n.orig || tr==='nx')){ if(n.m!==n.orig) n.m=n.orig; else if(tr==='nx') n.m=pentaStep(n.m,-1,null); }
        LM.m=n.m; LM.row=n.row; LM.orig=n.orig; }); }
  });
  if(!notes.length) return;
  // 別の行（別の音のつもり）なのに同じ高さになったら、ずらす（同じ行の弾き直し・メロディ行・ペダルでのばした和音の音を分散で弾き直すのはそのまま）
  //  ・同じタイミングで、別の行の音と同じ高さ（左手の8度と右手のいちばん下など）
  //  ・1音ずつの分散で、直前の1音（別の行）と同じ高さ（Gsus4 で D・D と続くなど）
  //  ・左手でのばしている音と同じ高さを右手で弾く（その逆も）
  // 右手は上の和音の音へ、左手は下の和音の音へ。置き場所がなければ、その音は弾かない
  { const pk=PART2?1:0, S=SOUNDING[pk]=SOUNDING[pk].filter(x=>x.bt===bt && x.end>ct+.001), CPs=new Set(Object.values(tones).filter(x=>x!=null).map(x=>((x%12)+12)%12)), drop=new Set(), LS=LAST_SOLO[pk];
    const LHR=new Set([0,4,5]), T0=n=>ct+(n.st0-Math.floor(n.ev0??n.st0))*sd, solo=n=>!n.mel && notes.filter(o=>!o.mel && o.st0===n.st0).length===1;
    notes.forEach(n=>{ const t0=T0(n), busy=m=>S.some(x=>x.m===m && Math.abs(x.start-t0)<.001) || notes.some(o=>o!==n && !drop.has(o) && o.m===m && o.st0===n.st0) || (solo(n) && LS && LS.bt===bt && LS.m===m);
      const hit=S.find(x=>x.m===n.m && x.row!==n.row && (Math.abs(x.start-t0)<.001 || (x.end>t0+.001 && LHR.has(x.row)!==LHR.has(n.row)))) || (solo(n) && LS && LS.bt===bt && LS.m===n.m && LS.row!==n.row && LS.t<t0-.001);
      if(hit && !n.mel && n.row!=null && !(pat&&pat.satb)){ const lh=LHR.has(n.row), dir=lh?-1:1; let x=n.m+dir, k=0;
        while(k++<24 && (!CPs.has(((x%12)+12)%12) || busy(x))) x+=dir;
        if(k<24 && x>=28) n.m=x; else drop.add(n); }
      if(!drop.has(n)){ S.push({m:n.m,row:n.row,start:t0,end:t0+n.len*sd,bt}); if(solo(n)) LAST_SOLO[pk]={m:n.m,row:n.row,t:t0,bt}; } });
    if(drop.size){ for(let i=notes.length-1;i>=0;i--) if(drop.has(notes[i])) notes.splice(i,1); if(!notes.length) return; } }
  // ギターのストローク：同じタイミングの音を、低い弦→高い弦（ダウン）／高い弦→低い弦（アップ）の順に少しずつずらして鳴らす
  // ストロークのズレはギターの音色のときだけ（どのパターンでも3音以上を同時に鳴らすところ）。ピアノなどではギターのパターンでもずらさない
  const strum = GUITARS.has(state.inst) && notes.length>=3;
  let order=notes, spd=0;
  if(strum){
    const dir=notes.find(n=>n.dir)?.dir || (notes[0].st0%2===0?'d':'u');   // 決まっていなければ、16分の表はダウン・裏はアップ
    order=[...notes].sort((a,b)=>dir==='u'?b.m-a.m:a.m-b.m);
    order.forEach(n=>n.top=false); (dir==='u'?order[0]:order[order.length-1]).top=true;
    spd=.009*(pat.pluck?.35:1);   // 1弦ごとに9ミリ秒（ギターポップで調整した幅）。指弾き（ボサノバ）は、ほんの少しだけずらす
  }
  order.forEach((n,k)=>{
    const ix=n.ix;
    let w = 1;   // 和音のどの音も同じ強さ（内声を弱めない）
    if(state.bass && n.m<48 && !(pat&&(pat.satb||pat.bossaV||pat.lhFull))) w*=.55;   // ボサノバのギターの親指（ルート・5度）は下げない   // 和声法のストリングスはチェロ・コントラバスも主役なので下げない
    if(pat&&pat.satb && ix===4) w=.85;   // 和声法：コントラバス（バスのオクターブ下）だけ少し控えめ
    const hv = 1+(Math.random()-.5)*.14;                 // 人間っぽい揺れ
    const ht = (pat&&pat.loose) ? (Math.random()-.4)*.016 : n.st0%4===0 ? 0 : (Math.random()-.5)*.004;   // 拍の頭はジャストで（loose：人間っぽく前後に揺らす。少し後ろ寄り）
    const off = (strum ? k*spd : n.k*.0015) + (n.st0-Math.floor(n.ev0??n.st0))*sd;   // 16分のあいだの音・フォールは、その分だけ遅らせて鳴らす   // 16分のあいだの音（32分・3連符）は、その分だけ遅らせて鳴らす
    // 左右の広がり：そのコードの音を低い順に並べ、いちばん低い音はまん中、そこから上へ 左・右・左・右…と交互に置いてバランスを取る
    if(state.wide){ const same=[...new Set(notes.map(x=>x.m))].sort((a,b)=>a-b), pool=same.length>=2?same:[...new Set([tones[4],tones[0],tones[1],tones[2],tones[3],n.m].filter(x=>x!=null))].sort((a,b)=>a-b);
      // ↑同時に鳴らす音（1音だけのときはそのコードの基本の音）の中での順番
      let ri=pool.indexOf(n.m); if(ri<0){ ri=0; pool.forEach((x,i)=>{ if(Math.abs(x-n.m)<Math.abs(pool[ri]-n.m)) ri=i; }); }
      // 低い音ほど幅を狭く（低音は広げると落ち着かない）。いちばん外でも ±0.45
      const wd=.45*Math.max(.15,Math.min(1,(n.m-36)/42));
      PAN_NEXT = ri===0 ? 0 : (ri%2 ? -wd : wd);
      // 鍵盤楽器は、ピアノ音源のように低い音ほど左・高い音ほど右（弾いている人の位置から聴いた並び）。広げすぎない（±0.35）
      if(PIANOISH.has(state.inst)) PAN_NEXT=Math.max(-.35,Math.min(.35,(n.m-62)/40));
      // 交互に振り分けるのは弦楽器だけ。ほかの楽器（ホルン・ギターなど）はまん中
      else if(!/^strings/.test(state.inst)) PAN_NEXT=0; }
    // 同じ高さの音が続くとき（tie）：弾き直さずに、前の音をそのままのばしてつなぐ
    const t0=ct+ht+off, pk=PART2?1:0, pv=TIE_LAST[pk];
    if(pat&&pat.tie && notes.length===1 && pv && pv.m===n.m && pv.end>=t0-.03 && pv.end<t0+sd){ const e=t0+n.len*sd;
      if(pv.cap) pv.cap.d=e-pv.cap.t;
      else if(pv.g&&pv.g.voice){ const V=pv.g.voice; try{ const G=pv.g.gain; G.cancelScheduledValues(t0); G.setValueAtTime(V.level,t0); G.setValueAtTime(V.level,e); G.setTargetAtTime(0,e,V.rel);
          V.srcs.forEach(x=>{ if(x.loopEnd>0) x.loop=true; x.stop(e+V.rel*7); }); }catch(err){}
        const h=held.find(x=>x.g===pv.g); if(h) h.end=e+n.len*sd*.4+.5; }
      pv.end=e; return; }
    const g=keyTone(n.m, t0, n.len*sd, COMP_LEVEL*n.vel*w*hv*((pat&&pat.vol)||1)); if(g) held.push({g,end:ct+n.len*sd*1.4+.5});
    TIE_LAST[pk]={m:n.m, end:t0+n.len*sd, g, cap:CAPTURE?CAPTURE[CAPTURE.length-1]:null};
    // フォール：音の終わりから約0.14秒で10半音ほど一気に下げ、同時に消す（がっつり・短く）
    // しゃくり：2半音下から約0.1秒でずり上げて、本来の高さに入る（ブラス・歌のような「ンパー」）
    if(n.scoop && g && g.voice){ const t0=ct+ht+off;
      try{ g.voice.params.forEach(([pr,k])=>{ pr.cancelScheduledValues(t0); pr.setValueAtTime(k(n.m-2),t0); pr.linearRampToValueAtTime(k(n.m-.3),t0+.07); pr.linearRampToValueAtTime(k(n.m),t0+.11); }); }catch(e){} }
    if(n.fall && g && g.voice){ const te=ct+ht+off+n.len*sd-.03;
      try{ g.voice.params.forEach(([pr,k])=>{ pr.cancelScheduledValues(te); pr.setValueAtTime(k(n.m),te); pr.exponentialRampToValueAtTime(k(n.m-10),te+.14); });
        g.gain.cancelScheduledValues(te); g.gain.setValueAtTime(g.voice.level,te); g.gain.linearRampToValueAtTime(g.voice.level*.7,te+.06); g.gain.linearRampToValueAtTime(.0001,te+.15); }catch(e){} }
  });
}
// ベース：5度はコードの本当の5度に。コードが変わる所で必ず切る（次のコードにはみ出さない）
let bassHeld=[];
function chokeBass(t,keep){ bassHeld.forEach(g=>{ if(keep && g===keep) return; try{ g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(0,t,.02); }catch(e){} }); bassHeld=keep?[keep]:[]; }
// ベースの音：0=ルート 12=オクターブ '3'=3度 '5'=5度 '6'=6度 'ap'=次のコードへつなぐ音（今のコードの音から選ぶ）
// シャッフル（ブギ）の「6」：明るいコードは6度、暗いコード（m・m-5）は短7度（Am なら F♯ではなく G）。どちらも和音やキーとぶつからない
const sixthOf=bt=>(bt.third===3||bt.fifth===6)?10:9;
const bassPcOf=v=>{ const sp=specOf(v); return (keyObj().pc+((sp.b!==null&&sp.b!==undefined)?sp.b:sp.o))%12; };
// ルートより下の音（5度下・オクターブ下）を使っているか（帯の描き方を変える）
const bassLow=list=>(list||[]).some(e=>e[1]==='-5'||e[1]==='-12');
// ポルタメント：直前に鳴らしたベースの音から、次の音へ音程をすべらせる
let lastBassM=null, GLIDE=null;
function playBass(list,s,t,bt,sd,room=16,nextV=null){ list.forEach(([st,iv,len,vel,slide,legOut])=>{ if(st!==s) return;
  let n;
  if(iv==='ap'){
    if(nextV===null||nextV===undefined){ n=bt.slash?12:bt.fifth; }
    else {
      // 次のコードのルートに一番近い「今のコードの音」（ルート・3度・5度・オクターブ）を選ぶ。今の和音とぶつからない
      const pc=bassPcOf(nextV), cand=bt.slash?[0,12]:[0,bt.third,bt.fifth,12].filter(x=>x<=12);
      let best=12, bd=99;
      cand.forEach(c=>{ const m=bt.bass+c; for(const o of [-12,0,12]){ const d=Math.abs(m-(28+((pc-4+12)%12)+o)); if(d<bd&&c!==0){ bd=d; best=c; } } });
      n=best; }
  } else if(iv==='-12'){ n=-12; }
  else if(iv==='-5'){ n = bt.slash ? -12 : bt.fifth-12; }
  else if(typeof iv==='string'){ n = bt.slash ? 12 : iv==='3'?bt.third : iv==='5'?bt.fifth : iv==='6'?sixthOf(bt) : iv==='7'?bt.seventh : 0; }
  else n = iv===7 ? (bt.slash?12:bt.fifth) : iv;
  const m=bt.bass+n;
  if(slide && lastBassM!=null) GLIDE={ratio:mtof(lastBassM)/mtof(m), time:list.glide||.08};
  bassTone(m,t,Math.min(len,room)*sd*(legOut?1.01:.92),vel); GLIDE=null; lastBassM=m; }); }
// 場面ごとの演奏を選ぶ：コードの長さと、小節のどこから鳴るかで（同じ場面が続くときは小節ごとに弾き分ける）
function sitVar(pat,len,startPi,b){ const S=pat.sit, kind=len>=16?'bar':len>=12?((S.bar3&&startPi===0)?'bar3':'bar'):len>=6?(startPi===0?'halfA':'halfB'):'beat';   // bar3：3拍（4拍目で次のコードに変わる）
  const list=S[kind] || (kind==='beat'?(S.halfB||S.halfA):kind==='halfB'?S.halfA:kind==='halfA'?S.bar:S.halfA) || S.bar; return list[b%list.length]; }
// パターンを続けたままコードを変えるとき：その位置の音＋その瞬間に伸びている音（新しいコードで弾き直す）
let PUSHCONT=false;
function contEvs(pat,pi){ const now=pat.at[pi]||[], have=new Set(now.flatMap(e=>e[1]));
  const hold=(pat.ev||[]).filter(e=>e[0]<pi && e[0]+e[2]>pi).map(e=>[pi,Array.isArray(e[1])?e[1].filter(x=>!have.has(x)):e[1],e[0]+e[2]-pi,e[3]*.9,e[4]]).filter(e=>!Array.isArray(e[1])||e[1].length);
  return [...now,...hold]; }
function contBass(bl,bi){ if(bl.some(e=>e[0]===bi)) return {list:bl,bi};
  const h=bl.find(e=>e[0]<bi && e[0]+e[2]>bi); return h ? {list:[[bi,h[1]==='ap'?0:h[1],h[0]+h[2]-bi,h[3]*.9]],bi} : {list:bl,bi:0}; }
// コード（伴奏の楽器）の部分。楽器2のときは、状態を入れ替えて同じ処理で鳴らす
function chordPart(g,t,L,s,b,dr,sd,tt){
  const pat=ARPS[state.arp];
  const ct=t+((dr.swing||pat.swing)&&s%4===2?sd*.34:0)+((dr.swing16||pat.swing16)&&s%2===1?sd*(dr.swing16?.3:.22):0);   // フレーズは MIDI のタイミングそのまま   // シャッフル系は裏拍を跳ねさせる
  const bassOf=bb=>bassList(dr);
  // いま鳴らすコード（マス i の中の何番目のコードか）
  const i=Math.floor(g/L), off=g%L, cells=cellsOf(i), ci=cells.findIndex(c=>off>=c.off&&off<c.off+c.len), cell=cells[ci], rel=off-cell.off;
  let nx, ni, nh;
  if(ci<cells.length-1){ nx=cells[ci+1]; ni=i; nh=nx.h; } else { ni=(i+1)%state.bars; nx=cellsOf(ni)[0]; nh=0; }
  const nxKey=ni+':'+nh, has=c=>c.v!==null&&c.v!==undefined;
  NX_V = has(nx) ? nx.v : null; NX_ANT=0;
  // タイミング：＋＝食い（前に出す）、－＝後ろ倒し（遅らせる）。単位は16分音符
  const rs=has(nx)?rawShiftOf(ni,nh):null;
  const sameNx = has(nx) && has(cell) && JSON.stringify(nx.v)===JSON.stringify(cell.v);   // 次も同じコードなら、決まった食いはしない
  const nSt0=((ni*L)%16+nx.off)%16, nb0=nSt0===0?b+1:b;   // 次のコードが始まる小節（2小節目に入る時だけ食うパターン用）
  const autoPush = (pat.push2nd && nSt0===0 && nb0%2===0) ? 0 : (pat.pushBy||0);
  const an  = has(nx)   ? Math.min(Math.max(0, rs!=null ? rs : ((sameNx&&!(pat.sit&&pat.sit.push))?0:autoPush)), cell.len-1) : 0;        // 次のコードがこのマスに食い込む長さ（設定がなければ伴奏パターンの決まった食い）
  NX_ANT=an;
  const lag = has(cell) ? Math.min(Math.max(0,-shiftOf(i,cell.h)), cell.len-1) : 0;     // このコードの入りを遅らせる長さ
  const nLag= has(nx)   ? Math.min(Math.max(0,-shiftOf(ni,nh)), nx.len-1) : 0;          // 次のコードが遅れる分、このコードを伸ばす
  if(an>0 && rel>=cell.len-an){
    // 1周で止めるときの最後の小節：頭のコードへ食う所で、そのまま締めの「ジャーン」（食ったタイミングで終わる）
    { const L1=oneLen(), left=L1!=null?L1-playedSteps:null; if(left!=null && left>0 && left<=an && ni===0 && nh===0){ if(!ENDED_EARLY){ ENDED_EARLY=true; endHit(ct); } return {i,off}; } }
    // 次のコードを「食って」先に鳴らす。
    // パターンにその位置で弾く音があれば、パターンはそのまま続けてコードだけ先に変える（16ビート系）。
    // なければ、これまでどおり次のコードを先に弾いて、小節の頭までのばす（タイ）
    const pi=g%16;
    if(rel===cell.len-an){
      barTones=chordAt(nx.v, ni*L+nx.off); lastR=barTones.R; choke(ct);
      if(pat.sit){ PUSHCONT=false; pushedKey=nxKey;   // 次のコードの弾き始めを先に弾いて、そのままのばす（タイ）
        const nStart=((ni*L)%16+nx.off)%16, nb=nStart===0?b+1:b, v=pat.sit.push ? ((nx.len<8 && pat.sit.push.length>1) ? (pat.sit.push.find(x=>!x.evs.some(e=>e[5]==='fall'))||pat.sit.push[nb%pat.sit.push.length]) : pat.sit.push[nb%pat.sit.push.length]) : sitVar(pat, nx.len, nStart, nb);   // 短いコード（1拍など）へ食うときは、のばさない短い方（フォールなし）   // 食う先が何小節目かで弾き方を変えられる（2小節パターン）
        playEvents((v.at[0]||[]).map(e=>[e[0],e[1],pat.sit.push?e[2]:e[2]+an,e[3],e[4],e[5]]), barTones, ct, sd, pat);   // 「食ったとき」の弾き方があれば書いた長さのまま（食った分のばさない）。e[5]＝フォールなども引き継ぐ
        if(state.bass){ const e0=bassOf(b).find(e=>e[0]===0); chokeBass(ct, e0&&e0[4]&&lastBassVoice?lastBassVoice.g:null); playBass(bassOf(b),0,ct,barTones,sd,an+nx.len); } }
      else if(pat.at[pi]){ PUSHCONT=true; pushedKey=null; playEvents(contEvs(pat,pi), barTones, ct, sd, pat);
        if(state.bass){ const r=contBass(bassOf(b),pi); chokeBass(ct); playBass(r.list,r.bi,ct,barTones,sd,cell.len-rel,nx.v); } }
      else { PUSHCONT=false; pushedKey=nxKey; playEvents(pat.at[0]||[], barTones, ct, sd, pat);
        if(state.bass){ const e0=bassOf(b).find(e=>e[0]===0); chokeBass(ct, e0&&e0[4]&&lastBassVoice?lastBassVoice.g:null); playBass(bassOf(b),0,ct,barTones,sd,an+nx.len); } }
    } else if(PUSHCONT && barTones){
      const evs=pat.at[pi]; if(evs){ if(!pat.legato && evs.some(e=>e[1].length>1)) choke(ct); playEvents(evs, barTones, ct, sd, pat); }
      if(state.bass) playBass(bassOf(b),pi,tt,barTones,sd,cell.len-rel,nx.v);
    }
  } else if(has(cell) && lag>0 && rel<lag){
    // 後ろ倒し：遅らせている間は、前のコードのままパターンを続ける
    if(barTones){ const evs=pat.at[g%16]; if(evs && rel>0) playEvents(evs, barTones, ct, sd, pat); }
  } else if(has(cell)){
    // コードが変わった所から、パターンを頭から弾く（短いコードはパターンの前の部分だけ）
    const key=i+':'+cell.h, head=rel===lag, pushed = rel===0 && pushedKey===key;
    if((head&&!pushed)||!barTones){ barTones=chordAt(cell.v, i*L+cell.off); lastR=barTones.R; }
    if(rel===0) pushedKey=null;
    // 小節の途中（3拍目など）で変わるコードは、パターンを頭から弾き直さず、小節の中の位置のまま続けてコードだけ変える
    //（その瞬間に伸ばしている音は、新しいコードで弾き直す）。8分のくり返しのパターンは、これまでと同じ鳴り方になる
    // 後ろ倒し（拍をずらした）ときも同じ：パターンにその位置で弾く音があれば、続けたままコードだけ変える
    // パターンの位置は「小節の中の位置」。1マスが2拍・1拍のときも、小節の途中のコードはパターンを続けたままコードだけ変える
    const startPi=(g-rel+lag+1600)%16;   // このコードが鳴り始める、小節の中の位置
    let pi = g%16, mid = pi!==0 && (cell.off>0 || L<16 || !!pat.at[pi]);
    let evs = pushed ? null : (head && !mid) ? pat.at[0] : pat.at[pi];
    if(pat.sit){ let v=sitVar(pat, cell.len-lag, startPi, b);
      // 1小節の弾き方を、それより短いコード（3拍など）で使うとき：次のコードへつなぐ音（nx）を、そのコードの終わりに合わせて前へずらす（途中で切れて1音だけ鳴るのを防ぐ）
      const cl=cell.len-lag; if(cl<16 && v.evs && v.evs.some(e=>e[5]==='nx') && Math.max(...v.evs.filter(e=>e[5]==='nx').map(e=>e[0]+e[2]))>cl-2){ v._sh=v._sh||{}; if(!v._sh[cl]){ const nxs=v.evs.filter(e=>e[5]==='nx'), d=Math.max(0,Math.max(...nxs.map(e=>e[0]+e[2]))-(cl-2)), ev2=prepNx(v.evs.map(e=>e[5]==='nx'?[e[0]-d,...e.slice(1)]:e).filter(e=>e[0]>=0).map(e=>[...e])); v._sh[cl]={evs:ev2,at:atMap(ev2)}; } v=v._sh[cl]; }
      evs = (pushed && rel===lag) ? (pat.pushKeepLH ? ((v.at[0]||[]).filter(e=>e[1].every(r=>r===0||r===4)).length ? (v.at[0]||[]).filter(e=>e[1].every(r=>r===0||r===4)) : null) : null) : (v.at[rel-lag]||null); }   // pushKeepLH：食って入った小節でも、頭の左手（根音・5度）だけは弾く（ボサノバの親指）   // 場面ごとの演奏
    else if(head && mid && !pushed){ const ce=contEvs(pat,pi); evs = ce.length ? ce : pat.at[0]; }
    if(head && !pushed) choke(ct);
    else if(evs && !pat.legato && evs.some(e=>e[1].length>1)) choke(ct);
    if(evs) playEvents(evs, barTones, ct, sd, pat);
    let bl=state.bass?bassOf(b):null, bi=(head&&!mid)?0:pi;
    if(bl && head && mid && !pushed){ const r=contBass(bl,bi); bl=r.list; bi=r.bi; }
    if(state.bass && head && !pushed){ const e0=bl.find(e=>e[0]===bi); chokeBass(tt, e0&&e0[4]&&lastBassVoice?lastBassVoice.g:null); }
    if(state.bass && !pushed && (head || lag===0 || rel>=lag+2)) playBass(bl,bi,tt,barTones,sd,cell.len-rel+nLag,nx.v);   // 遅らせた直後はベースを詰め込まない
  }
  return {i,off};
}
const P2={barTones:null,lastR:null,pushedKey:null,PUSHCONT:false,held:[],ACC:null,prev:null,prevB:null,satb:null};
function resetP2(){ TIE_LAST[0]=TIE_LAST[1]=null; SOUNDING[0]=[]; SOUNDING[1]=[]; LAST_SOLO[0]=LAST_SOLO[1]=null; Object.assign(P2,{barTones:null,lastR:null,pushedKey:null,PUSHCONT:false,held:[],ACC:null,prev:null,prevB:null,satb:null}); }
function withPart2(f){
  const sv={barTones,lastR,pushedKey,PUSHCONT,held,ACC:ACC_TOP,prev:LHCTX.prev,prevB:LHCTX.prevB,satb:LHCTX.satb,arp:state.arp,inst:state.inst,bass:state.bass};
  ({barTones,lastR,pushedKey,PUSHCONT,held}=P2); ACC_TOP=P2.ACC; LHCTX.prev=P2.prev; LHCTX.prevB=P2.prevB; LHCTX.satb=P2.satb;
  state.arp=state.arp2; state.inst=state.inst2||'epiano'; state.bass=false; PART2=true;
  try{ return f(); } finally { PART2=false;
    Object.assign(P2,{barTones,lastR,pushedKey,PUSHCONT,held,ACC:ACC_TOP,prev:LHCTX.prev,prevB:LHCTX.prevB,satb:LHCTX.satb});
    ({barTones,lastR,pushedKey,PUSHCONT,held}=sv); ACC_TOP=sv.ACC; LHCTX.prev=sv.prev; LHCTX.prevB=sv.prevB; LHCTX.satb=sv.satb;
    Object.assign(state,{arp:sv.arp,inst:sv.inst,bass:sv.bass}); } }
function scheduleStep(g,t){
  const L=slotSteps(), s=g%16, b=LOOPN*(L*state.bars/16)+Math.floor(g/16);     // b = 進行の頭から数えて何小節目か（ドラム用。途中で長さを変えてもずれない）
  if(ENDED_EARLY){ if(!document.hidden) visQ.push({t,b:Math.floor(g/L),s:g%L,L,beat:g%4===0,abs:playedSteps,g,ln:LOOPN}); return; }   // 締めたあとは何も鳴らさない
  const dr=DRUMS[state.drum], sd=stepDur(), fm=fillModeOf(b,dr), inFill=fm && s>=(fm==='big'?8:12);
  // シャッフルのフィルは3連符：拍の中の 0・1・2 番目を 1/3 ずつ並べる
  const tt = dr.swing&&inFill ? t+[0,1/3,2/3,0][s%4]*sd : t+(dr.swing&&s%4===2?sd*.34:0)+(dr.swing16&&s%2===1?sd*.3:0);
  const V = inFill ? (fm==='big'?dr.F:dr.FS) : (b%2===1 && dr.VB ? dr.VB : dr.V);
  for(const n in V){ const v=V[n][s]; if(v) drum(+n,tt,dr.dyn?Math.pow(v,dr.dyn):v); }   // dyn：強弱のメリハリ（ゴーストをより小さく）
  // サイドチェイン風：キック（4分）のたびに伴奏の音量をぐっと沈めて、裏拍でふくらませる
  if(dr.duck && compBus && !CAPTURE && s%4===0){ const gg=compBus.gain; gg.cancelScheduledValues(tt); gg.setValueAtTime(1,tt); gg.linearRampToValueAtTime(.18,tt+.008); gg.setTargetAtTime(1,tt+.03,sd*.9); }
  else if(!dr.duck && compBus && !CAPTURE && s===0 && compBus.gain.value<.99){ compBus.gain.cancelScheduledValues(tt); compBus.gain.setValueAtTime(1,tt); }
  if(state.fill && dr.F && s===0 && b%4===0 && b>0 && dr.crash0!==false) drum(49,tt,.6);   // シティポップはフィルの最後（前の小節の最後の16分）でクラッシュ済み
  BOWBAR=b; const {i,off}=chordPart(g,t,L,s,b,dr,sd,tt);
  // 2つ目の楽器（コード2・上もの）。同じコード進行を、別のパターン・別の音色で重ねる（ベースは1回だけ）。通常モードは伴奏スタイルが決める
  if(state.arp2 && ARPS[state.arp2]) withPart2(()=>chordPart(g,t,L,s,b,dr,sd,tt));
  if(!document.hidden) visQ.push({t,b:i,s:off,L,beat:g%4===0,abs:playedSteps,g,ln:LOOPN});
}
// 1周で止めるときの締め：最初のコードを「ジャーン」と長く鳴らす（キック＋シンバル、ベースはルート）
function endHit(t){ const c=cellsOf(0)[0], v=c&&c.v; if(v==null) return;
  const bt=chordNotes(v,lastR), sd=stepDur(), pat=ARPS[state.arp]||{};
  choke(t); chokeBass(t); if(P2.held.length) withPart2(()=>choke(t)); playEvents([[0,[0,1,2,3,4],14,.55,'d']], bt, t, sd, pat);
  if(state.bass) bassTone(bt.bass, t, sd*14, .6);
  if(state.drum!=='none'){ drum(36,t,.55); drum(49,t,.4); } }
function tick(){
  // 音声の書き出し：1周したら最初のコードで締めて、余韻まで録音してから止める
  if(EXPORT.on && playedSteps>=EXPORT.len){
    if(!EXPORT.stopping){ EXPORT.stopping=true; if(!ENDED_EARLY) endHit(nextTime); const ms=Math.max(0,(nextTime-ctx.currentTime)*1000);
      setTimeout(()=>{ if(playing){ playing=false; stop(); } setTimeout(()=>endExport(true),2600); },ms+100); }
    return;
  }
  // コード一覧の試し聴きは、1周したら最初のコードで締めて止める
  if(LIB.bk && playedSteps>=state.bars*slotSteps()){
    if(!LIB.stopping){ LIB.stopping=true; if(!ENDED_EARLY) endHit(nextTime); const ms=Math.max(0,(nextTime-ctx.currentTime)*1000)+1600;
      LIB.endT=setTimeout(()=>{ if(LIB.bk) libStop(); },ms); }
    return;
  }
  // 最初のチュートリアルのあと、はじめて1周聴き終わったら止めて「雰囲気のつくり方」の案内を出す
  if(!TUT.on && MOODPOP.pending && playedSteps>=state.bars*slotSteps()){
    if(!MOODPOP.stopping){ MOODPOP.stopping=true; if(!ENDED_EARLY) endHit(nextTime); const ms=Math.max(0,(nextTime-ctx.currentTime)*1000)+900;
      setTimeout(()=>{ MOODPOP.stopping=false; MOODPOP.pending=false; if(playing) stop(); showMoodPop(); },ms); }
    return;
  }
  // チュートリアル中は、進行を1周したら止める
  if(TUT.on && playedSteps>=TUT.loopLen){
    if(!TUT.stopping){ TUT.stopping=true; if(!ENDED_EARLY) endHit(nextTime); const ms=Math.max(0,(nextTime-ctx.currentTime)*1000)+900;
      TUT.stopT=setTimeout(()=>{ TUT.stopping=false; if(playing) stop(); const f=TUT.onLoopEnd; TUT.onLoopEnd=null; if(f) f(); },ms); }
    return;
  }
  // 裏で止まっていた後に一気に鳴らさないよう、遅れすぎたら今の時刻から再開
  if(nextTime<ctx.currentTime-.25) nextTime=ctx.currentTime+.05;
  // 画面を閉じている間はタイマーが間引かれるので、先まで多めに予約しておく
  const ahead = document.hidden ? 1.2 : .12;
  while(nextTime<ctx.currentTime+ahead){
    const T=state.bars*slotSteps(); gpos%=T;
    scheduleStep(gpos,nextTime); nextTime+=stepDur(); gpos=(gpos+1)%T; if(gpos===0) LOOPN++; playedSteps++;
  }
}
const MOODPOP={pending:false,stopping:false,level:2,all:false};
function showClearPop(n){ const l=LEVELS[n-1]; $('moodTip').hidden=true; MOODPOP.all=true;
  $('moodPopChips').innerHTML=(l.chips||[]).map(([t,c])=>`<span style="--fn:var(${c})">${t}</span>`).join('');
  $('moodPopEye').textContent=`LEVEL ${n} CLEAR`; $('moodPopTitle').textContent=`レベル${n}クリア！`;
  $('moodPopText').innerHTML=`アンロック：<b>${l.unlock}</b>${libAdd(n)}`; MOODPOP.whereN=n;
  $('moodPopLater').hidden=true; $('moodPopGo').textContent='OK'; $('moodPop').hidden=false; }
function showMoodPop(all){ $('moodTip').hidden=true; MOODPOP.all=!!all;
  if(all){ $('moodPopChips').innerHTML='<span style="--fn:var(--d)">PRO</span>'; $('moodPopEye').textContent='ALL CLEAR';
    $('moodPopTitle').textContent='全レベルクリア！'; $('moodPopText').innerHTML='PROモードが使えるようになりました。<br>設定メニューからオンにできます。';
    $('moodPopLater').hidden=true; $('moodPopGo').textContent='OK'; }
  else { const l=LEVELS[MOODPOP.level-1];
    $('moodPopChips').innerHTML=(l.chips||[]).map(([t,c])=>`<span style="--fn:var(${c})">${t}</span>`).join('');
    $('moodPopEye').textContent=`LEVEL ${MOODPOP.level}`; $('moodPopTitle').textContent=`次は「${l.name}」`;
    $('moodPopText').innerHTML=`${l.goal}${l.unlock?`<br><small>クリア報酬：${l.unlock}</small>`:''}`; $('moodPopLater').hidden=false; $('moodPopGo').textContent='はじめる'; }
  $('moodPop').hidden=false; }
let starting=false;
// ---------- バックグラウンド再生 ----------
// ・Worker のタイマーで刻む（画面を閉じてもメインのタイマーほど間引かれない）
// ・無音の audio をループ再生して「メディア再生中」にし、ロック画面でも止まらないようにする（iPhone はオーディオセッションも playback に）
// ・ロック画面・通知の再生／停止ボタン（Media Session）
let tickWorker=null;
try{ tickWorker=new Worker(URL.createObjectURL(new Blob(['let t=null;onmessage=e=>{clearInterval(t);t=null;if(e.data>0)t=setInterval(()=>postMessage(0),e.data)}'],{type:'text/javascript'})));
  tickWorker.onmessage=()=>{ if(playing) tick(); }; tickWorker.onerror=()=>{ tickWorker=null; }; }catch(e){ tickWorker=null; }
let bgAudio=null;
function silentWav(sec){ const sr=8000, n=sr*sec, b=new ArrayBuffer(44+n), v=new DataView(b), w=(o,str)=>{ for(let i=0;i<str.length;i++) v.setUint8(o+i,str.charCodeAt(i)); };
  w(0,'RIFF'); v.setUint32(4,36+n,true); w(8,'WAVE'); w(12,'fmt '); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
  v.setUint32(24,sr,true); v.setUint32(28,sr,true); v.setUint16(32,1,true); v.setUint16(34,8,true); w(36,'data'); v.setUint32(40,n,true);
  for(let i=0;i<n;i++) v.setUint8(44+i,128);
  return URL.createObjectURL(new Blob([b],{type:'audio/wav'})); }
function bgStart(){
  try{ if(navigator.audioSession) navigator.audioSession.type='playback'; }catch(e){}
  try{ if(!bgAudio){ bgAudio=new Audio(silentWav(5)); bgAudio.loop=true; bgAudio.setAttribute('playsinline',''); }
    const pr=bgAudio.play(); if(pr&&pr.catch) pr.catch(()=>{}); }catch(e){}
  if('mediaSession' in navigator){ try{
    navigator.mediaSession.metadata=new MediaMetadata({title:$('progName').textContent||'コード進行パレット', artist:'コード進行パレット', album:`Key ${state.key} ・ BPM ${state.bpm}`});
    navigator.mediaSession.playbackState='playing'; }catch(e){} }
}
function bgStop(){ try{ if(bgAudio) bgAudio.pause(); }catch(e){} if('mediaSession' in navigator) try{ navigator.mediaSession.playbackState='paused'; }catch(e){} }
if('mediaSession' in navigator){ try{
  navigator.mediaSession.setActionHandler('play',()=>{ if(!playing) play(); });
  navigator.mediaSession.setActionHandler('pause',()=>{ if(playing) stop(); });
  navigator.mediaSession.setActionHandler('stop',()=>{ if(playing) stop(); }); }catch(e){} }
document.addEventListener('visibilitychange',()=>{ if(!ctx) return;
  if(playing && ctx.state!=='running') ctx.resume().catch(()=>{});
  if(!document.hidden){ visQ=[]; dirty=true;
    // 戻ってきても音が止まったまま（時計が進まない）なら、いったん停止にして、次のタップで起こし直せるようにする
    if(playing) setTimeout(()=>{ if(playing && ctx.state!=='running') stop(); },700); } });
// 画面のどこかを触ったら、止まっている音の出口を起こす（iPhone は操作の中でしか起こせない）
['pointerdown','touchend','keydown'].forEach(t=>document.addEventListener(t,()=>{ if(ctx && ctx.state!=='running') ctx.resume().catch(()=>{}); },{passive:true,capture:true}));
async function play(){ ensureAudio(); pendingSound=null; if(starting) return; bgStart();
  if(ctx.state!=='running'){ starting=true; await wakeAudio(); starting=false; }
  if(loadingNow()){ starting=true; $('play').setAttribute('aria-label','読み込み中'); $('play').style.opacity=.55;
    await Promise.race([ensureSounds(), new Promise(r=>setTimeout(r,8000))]); starting=false; $('play').style.opacity=''; }
  ACC_TOP=null; lastR=null; barTones=null; pushedKey=null; lastBassM=null; LHCTX.prev=null; LHCTX.prevB=null; LHCTX.satb=null; resetP2(); playing=true; playedSteps=0; gpos=0; LOOPN=0; ENDED_EARLY=false; LAST_MEL[0]={}; LAST_MEL[1]={}; lofiNoise(state.inst==='lofi'||state.kit==='lofi');
  if(TUT.on){ TUT.loopLen=state.bars*slotSteps(); TUT.stopping=false; clearTimeout(TUT.stopT); } visQ=[]; cur=null; nextTime=ctx.currentTime+.06; tick(); timer=setInterval(tick,25); if(tickWorker) tickWorker.postMessage(25);
  $('play').innerHTML=STOP_SVG; $('play').setAttribute('aria-label','停止'); }
function stop(){ lofiNoise(false); if(EXPORT.on && !EXPORT.stopping) setTimeout(()=>endExport(false),0); if(compBus){ compBus.gain.cancelScheduledValues(0); compBus.gain.setValueAtTime(1,ctx.currentTime); } playing=false; clearInterval(timer); if(tickWorker) tickWorker.postMessage(0); bgStop(); visQ=[]; cur=null; dirty=true;
  $('play').innerHTML=PLAY_SVG; $('play').setAttribute('aria-label','再生'); $('play').classList.remove('beat');
  slotsEl.querySelectorAll('.slot').forEach(s=>s.classList.remove('now')); renderPages(); if(LIB.bk) libStop(); }
$('play').onclick=()=>playing?stop():play();
$('undoBtn').onclick=$('patUndo').onclick=()=>histGo(-1);
$('redoBtn').onclick=$('patRedo').onclick=()=>histGo(1);
document.addEventListener('keydown',e=>{ if(!(e.ctrlKey||e.metaKey) || /^(INPUT|TEXTAREA)$/.test(e.target.tagName) || TUT.on) return;
  const k=e.key.toLowerCase(); if(k==='z'){ e.preventDefault(); histGo(e.shiftKey?1:-1); } else if(k==='y'){ e.preventDefault(); histGo(1); } });

