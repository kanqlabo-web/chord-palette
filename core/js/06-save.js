// ---------- 保存・共有 ----------
// 共有リンク：進行と音の設定を URL の「#s=…」に詰める（サーバー不要。開いた人のブラウザで復元）
const SHARE_KEYS=['slots','segs','ant','bars','len','key','bpm','drum','arp','inst','wide','arp2','inst2','kit','bass','bassSnd','bassPat','fill','mix','pro','lhOff','rhOff','lhOff2','rhOff2','bassOff','sOff','rhLo','lhLo','rhLo2','lhLo2','bassLo'];   // 曲を再現するのに必要なもの（PROかどうかも）。開いた人の進み具合は変えない
function packSong(){ const o={v:1}; SHARE_KEYS.forEach(k=>o[k]=state[k]);
  // リンクを短くするため、使っている小節だけ・空の情報は省く
  o.slots=state.slots.slice(0,state.bars);
  const sg=(state.segs||[]).slice(0,state.bars).map(a=>(a||[]).filter(x=>x&&x.v!=null)); if(sg.some(a=>a.length)) o.segs=sg; else delete o.segs;
  const an=(state.ant||[]).slice(0,state.bars); if(an.some(x=>x)) o.ant=an; else delete o.ant;
  if(!state.pro){ delete o.mix; delete o.bassPat; }
  if(!o.ant) delete o.ant;
  if(/^my\d+$/.test(state.drum)) o.myDrum=listOf('drum')[+state.drum.slice(2)];
  if(/^my\d+$/.test(state.arp)) o.myArp=listOf('arp')[+state.arp.slice(2)];
  if(!state.arp2){ delete o.arp2; delete o.inst2; } else if(/^my\d+$/.test(state.arp2)) o.myArp2=listOf('arp')[+state.arp2.slice(2)];
  if(state.pro && /^my\d+$/.test(state.bassPat)) o.myBass=listOf('bass')[+state.bassPat.slice(2)];
  return o; }
function unpackSong(o){ if(!o||!Array.isArray(o.slots)) return false;
  SHARE_KEYS.forEach(k=>{ if(o[k]!==undefined) state[k]=o[k]; }); if(o.lay) state.lay=o.lay;   // 古いリンクの「重ねる音色」→ コード2へ
  state.bassSnd=fixBass(state.bassSnd||'bass');
  if(o.myDrum){ listOf('drum').push({...o.myDrum,name:(o.myDrum.name||'共有された演奏')}); state.drum='my'+(listOf('drum').length-1); }
  if(o.myArp){ listOf('arp').push({...o.myArp,name:(o.myArp.name||'共有された演奏')}); state.arp='my'+(listOf('arp').length-1); }
  if(o.myArp2){ listOf('arp').push({...o.myArp2,name:(o.myArp2.name||'共有された演奏')}); state.arp2='my'+(listOf('arp').length-1); }
  if(o.arp2===undefined){ state.arp2=''; }
  if(o.myBass){ listOf('bass').push({...o.myBass,name:(o.myBass.name||'共有された演奏')}); state.bassPat='my'+(listOf('bass').length-1); }
  rebuildMy(); migrateLay(state); ensureArp2(); if(state.arp2 && !ARPS[state.arp2]) state.arp2=ARP_ALIAS[state.arp2]||''; if(ARP_ALIAS[state.arp]) state.arp=ARP_ALIAS[state.arp]; if(!DRUMS[state.drum]) state.drum='pop'; if(!ARPS[state.arp]) state.arp='piano4';
  state.inst=fixInst(state.inst); state.inst2=fixInst(state.inst2); if(state.arp2 && !ARPS[state.arp2] && !/^(acc_|my\d)/.test(state.arp2)) state.arp2=''; if(!INSTS[state.inst]) state.inst='piano'; state.kit=fixKit(state.kit); if(!KITS[state.kit]) state.kit='std';
  state.slots=Array.from({length:16},(_,i)=>state.slots[i]??null); state.segs=Array.from({length:16},(_,i)=>(state.segs||[])[i]||[]); state.ant=Array.from({length:16},(_,i)=>(state.ant||[])[i]??null);
  state.pro=!!state.pro; document.body.classList.toggle('pro',state.pro); page=0; selected=null; try{ applyMix(); }catch(e){}
  $('bpm').value=state.bpm; $('bpmOut').textContent=state.bpm; renderAll(); save(); ensureSounds(); return true; }
const b64e=str=>{ const u=new TextEncoder().encode(str); let b=''; u.forEach(c=>b+=String.fromCharCode(c)); return btoa(b).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); };
const b64d=t=>{ const b=atob(t.replace(/-/g,'+').replace(/_/g,'/')); return new TextDecoder().decode(Uint8Array.from(b,c=>c.charCodeAt(0))); };
// 短いリンク：「#c=コード,コード,…&t=テンポ&y=伴奏スタイル…」。初期値と同じものは書かない
const tokE=v=> v==null?'_' : isNum(v)?String(v) : '~'+[v.o,v.q,v.x||'',v.b??'',v.sp||''].map(x=>encodeURIComponent(String(x))).join('.').replace(/\.+$/,'');
const tokD=t=>{ if(t==='_'||t==='') return null; if(t[0]!=='~') return +t; const [o,q,x,b,s]=t.slice(1).split('.').map(decodeURIComponent); const v={o:+o,q:q??'',x:x||'',b:(b===undefined||b==='')?null:+b}; if(s) v.sp=s; return v; };
const MIX0=m=>!m||Object.values(m).every(c=>!c||((c.v??1)===1&&!c.m&&!c.s));
function shortHash(o){ const P=[];
  const segs=o.segs||[], ant=o.ant||[];
  P.push('c='+o.slots.map((v,i)=>tokE(v)+(ant[i]?'@'+ant[i]:'')+(segs[i]||[]).map(g=>'|'+g.beat+':'+tokE(g.v)+(g.ant?'@'+g.ant:'')).join('')).join(','));
  P.push('t='+o.bpm);
  const y=STYLES.find(st=>st.drum===o.drum&&st.arp===o.arp&&st.inst===o.inst&&!!st.wide===!!o.wide&&(st.arp2||'')===(o.arp2||'')&&(!st.arp2||st.inst2===o.inst2)&&st.kit===o.kit&&(st.bass!==false)===!!o.bass&&(st.bassSnd||'bass')===(o.bassSnd||'bass'));
  if(y && !o.myDrum && !o.myArp) P.push('y='+y.id);
  else { P.push('d='+encodeURIComponent(o.drum),'a='+encodeURIComponent(o.arp),'i='+o.inst,'m='+o.kit); if(o.wide) P.push('w=1'); if(!o.bass) P.push('b=0'); if((o.bassSnd||'bass')!=='bass') P.push('n='+o.bassSnd); }
  if(o.key&&o.key!=='C') P.push('k='+KEYS.findIndex(k=>k.id===o.key));
  if(o.len&&o.len!==4) P.push('l='+o.len);
  if(o.fill) P.push('f=1');
  if(o.pro) P.push('P=1');
  if(o.arp2 && !(y && !o.myDrum && !o.myArp)){ if(!o.myArp2) P.push('a2='+encodeURIComponent(o.arp2)); P.push('i2='+(o.inst2||'epiano')); }
  if(o.pro && o.lhOff) P.push('Lo='+o.lhOff); if(o.pro && o.rhOff) P.push('Ro='+o.rhOff);
  if(o.pro && o.lhOff2) P.push('L2='+o.lhOff2); if(o.pro && o.rhOff2) P.push('R2='+o.rhOff2); if(o.pro && o.bassOff) P.push('Bo='+o.bassOff);
  if(o.pro) [['rhLo','RL'],['lhLo','LL'],['rhLo2','R2L'],['lhLo2','L2L'],['bassLo','BL']].forEach(([k,q])=>{ if(o[k]!=null) P.push(q+'='+o[k]); });
  if(o.bassPat&&o.bassPat!=='auto'&&!o.myBass) P.push('p='+encodeURIComponent(o.bassPat));
  if(o.mix&&!MIX0(o.mix)) P.push('x='+b64e(JSON.stringify(o.mix)));
  const my={}; ['myDrum','myArp','myArp2','myBass'].forEach(k=>{ if(o[k]) my[k]=o[k]; }); if(Object.keys(my).length) P.push('j='+b64e(JSON.stringify(my)));
  return P.join('&'); }
function parseShort(h){ const q={}; h.split('&').forEach(kv=>{ const i=kv.indexOf('='); if(i>0) q[kv.slice(0,i)]=kv.slice(i+1); });
  if(q.c===undefined) return null;
  const slots=[], segs=[], ant=[];
  q.c.split(',').forEach(cell=>{ const [head,...rest]=cell.split('|'); const [t,a]=head.split('@'); slots.push(tokD(t)); ant.push(a?+a:null);
    segs.push(rest.map(r=>{ const c=r.indexOf(':'), [tv,ga]=r.slice(c+1).split('@'); const g={beat:+r.slice(0,c),v:tokD(tv)}; if(ga) g.ant=+ga; return g; })); });
  const o={v:2,slots,segs,ant,bars:slots.length,bpm:+q.t||96,key:q.k?(KEYS[+q.k]||KEYS[0]).id:'C',len:+q.l||4,fill:q.f==='1',pro:q.P==='1',lhOff:+q.Lo||0,rhOff:+q.Ro||0,lhOff2:+q.L2||0,rhOff2:+q.R2||0,bassOff:+q.Bo||0,rhLo:q.RL!=null?+q.RL:null,lhLo:q.LL!=null?+q.LL:null,rhLo2:q.R2L!=null?+q.R2L:null,lhLo2:q.L2L!=null?+q.L2L:null,bassLo:q.BL!=null?+q.BL:null,bassPat:q.p?decodeURIComponent(q.p):'auto',mix:q.x?JSON.parse(b64d(q.x)):{}};
  const st=q.y!==undefined?styleById(+q.y):null;
  if(st) Object.assign(o,{sOff:sOffOf(st),wide:!!st.wide,drum:st.drum,arp:st.arp,inst:st.inst,arp2:st.arp2||'',inst2:st.inst2||'epiano',kit:st.kit,bass:st.bass!==false,bassSnd:st.bassSnd||'bass'});
  else Object.assign(o,{wide:q.w==='1',drum:decodeURIComponent(q.d||'pop'),arp:decodeURIComponent(q.a||'piano4'),inst:q.i||'piano',lay:q.z||'',kit:q.m||'std',bass:q.b!=='0',bassSnd:q.n||'bass'});
  if(q.a2||q.i2){ o.arp2=q.a2?decodeURIComponent(q.a2):''; o.inst2=q.i2||'epiano'; o.lay2=q.z2||''; }
  if(q.j) Object.assign(o,JSON.parse(b64d(q.j)));
  return o; }
const shareUrl=o=>location.origin+location.pathname+'#'+shortHash(o);
// 新しいバージョンの確認：GitHub Pages はページを最大10分ほどキャッシュするので、開いたとき・戻ってきたときに最新版を見に行く
const APP_VER=(document.querySelector('.appver')||{}).textContent||'';
async function checkUpdate(){ try{ if(!/^https?:/.test(location.protocol)) return;
  const r=await fetch(location.pathname+'?check='+Date.now(),{cache:'no-store'}); if(!r.ok) return; const tx=await r.text();
  const m=tx.match(/class="appver">([^<]+)</); if(m && APP_VER && m[1]!==APP_VER){ const b=$('updBar'); b.hidden=false;
    b.onclick=()=>{ save(); location.replace(location.pathname+'?v='+Date.now()+location.hash); }; } }catch(e){} }
setTimeout(checkUpdate,1500); document.addEventListener('visibilitychange',()=>{ if(!document.hidden) checkUpdate(); });
function toast(t){ const el=$('toast'); el.textContent=t; el.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>el.hidden=true,2600); }
// 短縮リンク：is.gd で短いリンクを作る（作れなければ、ふつうのリンクのまま）
function shortenUrl(url){ return new Promise(res=>{ const cb='isgd'+Date.now(), sc=document.createElement('script'); let done=false;
  const fin=v=>{ if(done) return; done=true; delete window[cb]; sc.remove(); res(v); };
  window[cb]=d=>fin(d&&d.shorturl||null); sc.onerror=()=>fin(null); setTimeout(()=>fin(null),5000);
  sc.src='https://is.gd/create.php?format=json&callback='+cb+'&url='+encodeURIComponent(url); document.head.appendChild(sc); }); }
async function shareSong(o,name){
  const long=shareUrl(o), title=(name||$('progName').textContent||'コード進行')+'｜コード進行パレット';
  const box=$('shareBox'); box.innerHTML='<p class="small" style="margin:8px 0 0">短いリンクを作っています……</p>';
  const url=(await shortenUrl(long))||long;
  // 短くするのに少し時間がかかるので、共有・コピーはもう一度ボタンで（スマホは、押した直後でないと共有画面を開けないため）
  box.innerHTML=''; const d=document.createElement('div'); d.className='sharebox';
  d.innerHTML=`<small>${url===long?'共有リンク（短くできなかったので、そのままのリンクです）':'共有リンクができました'}</small><input readonly><div class="chips">${navigator.share?'<button class="chip main" data-a="share">共有する</button>':''}<button class="chip" data-a="copy">コピー</button></div>`;
  const inp=d.querySelector('input'); inp.value=url; box.appendChild(d);
  const sh=d.querySelector('[data-a="share"]'); if(sh) sh.onclick=async()=>{ try{ await navigator.share({title,url}); }catch(e){} };
  d.querySelector('[data-a="copy"]').onclick=async()=>{ try{ await navigator.clipboard.writeText(url); toast('リンクをコピーしました'); }catch(e){ inp.focus(); inp.select(); toast('リンクを選択しました。コピーしてください'); } };
}
const SONGS_KEY=STK('chord-palette-songs');
const loadSongs=()=>{ try{ return JSON.parse(localStorage.getItem(SONGS_KEY))||[]; }catch(e){ return []; } };
const saveSongs=a=>{ try{ localStorage.setItem(SONGS_KEY,JSON.stringify(a)); }catch(e){ toast('保存できませんでした（ブラウザの容量がいっぱいかもしれません）'); } };
function songDegs(o){ return (o.slots||[]).slice(0,o.bars||4).map(v=>v==null?'－':nameOf(v,'num',false)).join(' - '); }
function renderSongs(){
  const list=loadSongs(), box=$('songList'); box.innerHTML='';
  $('songAcc').hidden=!list.length; if(!list.length) return;
  list.forEach((sg,i)=>{ const d=document.createElement('div'); d.className='song';
    d.innerHTML=`<div><b></b><small>${songDegs(sg.data)}</small></div><button data-a="open">開く</button><button data-a="share">共有</button><button data-a="del" class="del">削除</button>`;
    d.querySelector('b').textContent=sg.name;
    d.querySelector('[data-a="open"]').onclick=()=>{ if(playing) stop(); unpackSong(JSON.parse(JSON.stringify(sg.data))); closeAll(); toast(`「${sg.name}」を開きました`); };
    d.querySelector('[data-a="share"]').onclick=()=>shareSong(sg.data,sg.name);
    const del=d.querySelector('[data-a="del"]'); del.onclick=()=>{ if(!del.dataset.armed){ del.dataset.armed=1; del.textContent='本当に消す'; return; } const a=loadSongs(); a.splice(i,1); saveSongs(a); renderSongs(); };
    box.appendChild(d); });
}
$('shareNow').onclick=()=>shareSong(packSong());
// ---- セーブデータ：このアプリが端末に保存しているものを、まるごと1つのファイルに ----
// ファイルを渡す：ふつうのブラウザはそのままダウンロード。claude.ai の中で開いたときは、保存の確認を出す（wav・mid は zip に包む）
let DLCAP; const dlCap=()=>DLCAP??=(window.claude&&window.claude.use?window.claude.use('downloads').catch(()=>null):Promise.resolve(null));
function crc32(u){ let c,t=crc32.t; if(!t){ t=crc32.t=new Uint32Array(256); for(let n=0;n<256;n++){ c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0; } }
  c=0xFFFFFFFF; for(let i=0;i<u.length;i++) c=t[(c^u[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
async function zipOne(blob,name){ const d=new Uint8Array(await blob.arrayBuffer()), nm=new TextEncoder().encode(name), crc=crc32(d);
  const L=new DataView(new ArrayBuffer(30)); [[0,0x04034b50,4],[4,20,2],[6,0x0800,2],[8,0,2],[10,0,2],[12,0,2],[14,crc,4],[18,d.length,4],[22,d.length,4],[26,nm.length,2],[28,0,2]].forEach(([o,v,n])=>n===4?L.setUint32(o,v,true):L.setUint16(o,v,true));
  const C=new DataView(new ArrayBuffer(46)); [[0,0x02014b50,4],[4,20,2],[6,20,2],[8,0x0800,2],[10,0,2],[12,0,2],[14,0,2],[16,crc,4],[20,d.length,4],[24,d.length,4],[28,nm.length,2],[30,0,2],[32,0,2],[34,0,2],[36,0,2],[38,0,4],[42,0,4]].forEach(([o,v,n])=>n===4?C.setUint32(o,v,true):C.setUint16(o,v,true));
  const E=new DataView(new ArrayBuffer(22)), cdOff=30+nm.length+d.length, cdLen=46+nm.length; [[0,0x06054b50,4],[4,0,2],[6,0,2],[8,1,2],[10,1,2],[12,cdLen,4],[16,cdOff,4],[20,0,2]].forEach(([o,v,n])=>n===4?E.setUint32(o,v,true):E.setUint16(o,v,true));
  return new Blob([L,nm,d,C,nm,E],{type:'application/zip'}); }
async function download(blob,name){ const cap=await dlCap();
  if(cap){ try{ if(!/\.(json|txt|csv|zip)$/i.test(name)){ blob=await zipOne(blob,name); name=name.replace(/\.[^.]+$/,'')+'.zip'; } await cap.save({filename:name,data:blob}); }
    catch(e){ if(e&&e.code!=='declined') toast('この画面ではファイルを保存できません'); } return; }
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },4000); }
const ymd=()=>{ const d=new Date(), z=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}${z(d.getMonth()+1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}`; };
$('saveExport').onclick=()=>{ save(); saveLv(); const data={};
  try{ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k&&k.startsWith(STK('chord-palette'))) data[k.slice(CP.store.length)]=localStorage.getItem(k); } }catch(e){}
  download(new Blob([JSON.stringify({app:'chord-palette',save:1,date:new Date().toISOString(),data},null,1)],{type:'application/json'}),`chord-palette-save-${ymd()}.json`);
  toast('セーブデータをファイルに保存しました'); };
$('saveImport').onclick=()=>$('saveFile').click();
$('saveFile').onchange=async e=>{ const f=e.target.files&&e.target.files[0]; e.target.value=''; if(!f) return;
  let o; try{ o=JSON.parse(await f.text()); }catch(err){ toast('ファイルを読み込めませんでした'); return; }
  if(!o||o.app!=='chord-palette'||!o.data){ toast('コード進行パレットのセーブデータではありません'); return; }
  if(!confirm('いまのデータを、このセーブデータで置き換えます。よろしいですか？')) return;
  try{ Object.keys(localStorage).filter(k=>k.startsWith(STK('chord-palette'))).forEach(k=>localStorage.removeItem(k));
    Object.entries(o.data).forEach(([k,v])=>{ if(k.startsWith('chord-palette')) localStorage.setItem(CP.store+k,v); }); }catch(err){ toast('保存できませんでした'); return; }
  location.hash=''; location.reload(); };
// ---- 曲を書き出す：MIDI（いまの伴奏を、そのまま音符にする） ----
let CAPTURE=null;
function captureSong(){ const C=[]; const sbSv=LHCTX.satb; LHCTX.satb=null; resetP2(); const sv={playedSteps,gpos,LOOPN,lastR,barTones,pushedKey,lastBassM,held,bassHeld,lastBassVoice};
  const lhSv=[LHCTX.prev,LHCTX.prevB]; LHCTX.prev=LHCTX.prevB=null; CAPTURE=C; ACC_TOP=null; lastR=null; barTones=null; pushedKey=null; lastBassM=null; held=[]; bassHeld=[]; lastBassVoice=null; playedSteps=0; gpos=0; LOOPN=0; LOOPN=0;
  const T=state.bars*slotSteps(), sd=stepDur(); let t=0; const eeSv=ENDED_EARLY; ENDED_EARLY=false; CAP_LEN=T; LAST_MEL[0]={}; LAST_MEL[1]={};
  try{ for(let n=0;n<T;n++){ scheduleStep(n,t); t+=sd; playedSteps++; } if(!ENDED_EARLY) endHit(t); }
  finally{ CAPTURE=null; CAP_LEN=null; ENDED_EARLY=eeSv; [LHCTX.prev,LHCTX.prevB]=lhSv; LHCTX.satb=sbSv; ({playedSteps,gpos,LOOPN,lastR,barTones,pushedKey,lastBassM,held,bassHeld,lastBassVoice}=sv); if(!playing) visQ=[]; }
  return {ev:C, end:t+sd*16}; }
const GM_PROG={sbrass:62,epcity:4,clav:7,piano:0,spiano:0,epiano:4,lofi:4,organ:16,steel:25,nylon:24,eguitar:27,dist:30,pad:89,synth:81,strings3:48,trumpet:56,trombone:57,sax:65,brass3:61,horn:60,glock:9,koto:107,shami:106};
const GM_BASS={bass:33,ubass:32,slap3:36,sbass:38,ebass:34};
function midiFile(){ const {ev}=captureSong(), PPQ=480, tk=sec=>Math.max(0,Math.round(sec*state.bpm/60*PPQ));
  const vlq=n=>{ const b=[n&127]; while(n>>=7) b.unshift((n&127)|128); return b; };
  const str=t=>[...new TextEncoder().encode(t)];
  const track=(name,ch,prog,list)=>{ const es=[]; list.forEach(e=>{ const on=tk(e.t), off=Math.max(on+1,tk(e.t+e.d)), v=Math.max(1,Math.min(127,Math.round(e.v*112)));
      es.push([on,1,[0x90|ch,e.n,v]],[off,0,[0x80|ch,e.n,0]]); });
    es.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    const out=[0,0xFF,3,...vlq(str(name).length),...str(name)]; if(prog!=null) out.push(0,0xC0|ch,prog);
    let last=0; es.forEach(([t,,m])=>{ out.push(...vlq(t-last),...m); last=t; }); out.push(0,0xFF,0x2F,0);
    return [...str('MTrk'),...u32(out.length),...out]; };
  const u32=n=>[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255], u16=n=>[(n>>8)&255,n&255];
  const us=Math.round(60000000/state.bpm), tempo=[0,0xFF,0x51,3,(us>>16)&255,(us>>8)&255,us&255, 0,0xFF,0x58,4,4,2,24,8, 0,0xFF,0x2F,0];
  const tracks=[[...str('MTrk'),...u32(tempo.length),...tempo],
    track('コード',0,GM_PROG[state.inst]??0,ev.filter(e=>e.k==='key')),
    ...(ev.some(e=>e.k==='key2')?[track('重ねる楽器',3,GM_PROG[state.inst2]??4,ev.filter(e=>e.k==='key2'))]:[]),
    track('ベース',1,GM_BASS[state.bassSnd]??33,ev.filter(e=>e.k==='bass')),
    track('ドラム',9,null,ev.filter(e=>e.k==='drum'))];
  return new Blob([new Uint8Array([...str('MThd'),...u32(6),...u16(1),...u16(tracks.length),...u16(PPQ),...tracks.flat()])],{type:'audio/midi'}); }
const songFileName=ext=>`chord-palette-${ymd()}.${ext}`;   // 日本語のファイル名は一部の環境で化けるので英数字で
$('expMidi').onclick=()=>{ if(!state.slots.slice(0,state.bars).some(v=>v!=null)){ toast('マスにコードを置いてから書き出してください'); return; }
  download(midiFile(),songFileName('mid')); toast('MIDIファイルを書き出しました'); };
// ---- 曲を書き出す：音声（1周再生しながら録音して WAV に） ----
const EXPORT={on:false,stopping:false,len:0,bufs:null,sp:null};
function wavOf(L,Rr,sr){ const n=L.length, b=new ArrayBuffer(44+n*4), d=new DataView(b), w=(o,t)=>[...t].forEach((c,i)=>d.setUint8(o+i,c.charCodeAt(0)));
  w(0,'RIFF'); d.setUint32(4,36+n*4,true); w(8,'WAVE'); w(12,'fmt '); d.setUint32(16,16,true); d.setUint16(20,1,true); d.setUint16(22,2,true);
  d.setUint32(24,sr,true); d.setUint32(28,sr*4,true); d.setUint16(32,4,true); d.setUint16(34,16,true); w(36,'data'); d.setUint32(40,n*4,true);
  for(let i=0,o=44;i<n;i++,o+=4){ d.setInt16(o,Math.max(-1,Math.min(1,L[i]))*32767,true); d.setInt16(o+2,Math.max(-1,Math.min(1,Rr[i]))*32767,true); }
  return new Blob([b],{type:'audio/wav'}); }
function endExport(ok){ const E=EXPORT; if(!E.on) return; E.on=false; E.stopping=false;
  try{ masterOut.disconnect(E.sp); E.sp.disconnect(); }catch(e){} const bufs=E.bufs; E.bufs=null; E.sp=null; $('expAudio').textContent='音声ファイル';
  if(!ok){ toast('録音を中止しました'); return; }
  const len=bufs.L.reduce((a,x)=>a+x.length,0), L=new Float32Array(len), Rr=new Float32Array(len); let o=0;
  bufs.L.forEach((x,i)=>{ L.set(x,o); Rr.set(bufs.R[i],o); o+=x.length; });
  let st=0; while(st<len && Math.abs(L[st])<1e-4 && Math.abs(Rr[st])<1e-4) st++;   // 頭の無音を切る
  download(wavOf(L.subarray(st),Rr.subarray(st),ctx.sampleRate),songFileName('wav')); toast('音声ファイルを書き出しました'); }
$('expAudio').onclick=()=>{ if(EXPORT.on){ if(playing) stop(); return; }
  if(!state.slots.slice(0,state.bars).some(v=>v!=null)){ toast('マスにコードを置いてから書き出してください'); return; }
  if(playing) stop(); closeAll();
  ensureSounds().then(()=>whenRunning(()=>{ const sp=ctx.createScriptProcessor(4096,2,2), bufs={L:[],R:[]};
    sp.onaudioprocess=e=>{ const i=e.inputBuffer; if(EXPORT.on){ bufs.L.push(new Float32Array(i.getChannelData(0))); bufs.R.push(new Float32Array(i.getChannelData(1))); }
      for(let c=0;c<e.outputBuffer.numberOfChannels;c++) e.outputBuffer.getChannelData(c).fill(0); };
    masterOut.connect(sp); sp.connect(ctx.destination);
    Object.assign(EXPORT,{on:true,stopping:false,len:state.bars*slotSteps(),bufs,sp}); $('expAudio').textContent='録音を中止';
    toast('録音中……（1周再生します）'); play(); })); };
// リセット：押し間違いを防ぐため2回押しで実行
function armed(btn,label,fn){ btn.onclick=()=>{ if(!btn.dataset.armed){ btn.dataset.armed=1; const o=btn.textContent; btn.textContent=label; btn.classList.add('danger');
  clearTimeout(btn._t); btn._t=setTimeout(()=>{ delete btn.dataset.armed; btn.textContent=o; btn.classList.remove('danger'); },3000); return; }
  clearTimeout(btn._t); delete btn.dataset.armed; btn.classList.remove('danger'); fn(); }; }
armed($('resetSlots'),'もう一度押すと空にします',()=>{ if(playing) stop(); state.slots=Array(16).fill(null); state.segs=Array.from({length:16},()=>[]); state.ant=Array(16).fill(null); page=0; selected=null; renderAll(); save(); closeAll(); toast('マスを空にしました'); $('resetSlots').textContent='マスを空にする'; });
armed($('resetAll'),'もう一度押すと全部戻します',()=>{ if(playing) stop(); const keep={myDrums:state.myDrums,myArps:state.myArps,myBasses:state.myBasses};
  state={...JSON.parse(JSON.stringify(DEFAULT_STATE)),...keep, slots:Array(16).fill(null), segs:Array.from({length:16},()=>[]), ant:Array(16).fill(null), mix:{}};
  rebuildMy(); document.body.classList.toggle('pro',!!state.pro); page=0; selected=null; $('bpm').value=state.bpm; $('bpmOut').textContent=state.bpm;
  renderAll(); save(); applyMix(); closeAll(); toast('最初の状態に戻しました'); $('resetAll').textContent='設定もすべて最初に戻す'; });
$('menuBtn').addEventListener('click',renderSongs);
// 共有リンクから開いたとき：その進行を読み込む（チュートリアルは自動では出さない）
let OPENED_SHARE=false;
(()=>{ const raw=location.hash.replace(/^#/,''); let h=raw; try{ h=decodeURIComponent(raw); }catch(e){}
  const isShort=/^c=/.test(raw)||/^c=/.test(h);
  const m=isShort?null:(h.match(/[#&]?s=([A-Za-z0-9_+\/-]+)/) || location.search.match(/[?&]s=([A-Za-z0-9_+\/-]+)/)); if(!isShort && !m) return;
  OPENED_SHARE=true;   // 共有リンクから来たら、読み込めなくてもタイトル画面は出さない
  try{ const o=isShort ? parseShort(/^c=/.test(raw)?raw:h) : JSON.parse(b64d(m[1])); if(!o) throw 0;
    // 開く前に自分の作りかけの曲があれば「保存した進行」に残しておく
    if(state.slots.some(v=>v!=null)){ const a=loadSongs(); a.unshift({name:'共有リンクを開く前の曲（'+new Date().toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})+'）',date:Date.now(),data:packSong()}); saveSongs(a); }
    if(unpackSong(o)){ OPENED_SHARE=true; SHARE_VIEW=true; renderAll(); setTimeout(()=>toast('共有された曲を開きました（すべての機能を使えます）'),400); } }catch(e){ setTimeout(()=>toast('リンクを読み込めませんでした（リンクが途中で切れているかもしれません）'),400); }
  try{ history.replaceState(null,'',location.pathname+location.search.replace(/[?&]s=[^&]*/,'')); }catch(e){} })();
histReset();
function showModePick(){ const el=$('modePick'); el.hidden=false; $('tsLevels').hidden=true;
  const close=()=>{ el.hidden=true; renderAll(); };
  // つづきから：前回の状態（レベルの進み具合と、作りかけの進行）から
  const hasSave=!FIRST_RUN || LVL>0;
  $('tsCont').hidden=!hasSave;
  $('tsContSub').textContent = MODE==='free' ? 'すべての機能で自由に作る'
    : LVL>=LV_MAX ? '全レベルクリア・自由に作る' : LVL===0 ? 'レベル1から' : `レベル${LVL}までクリア・次は LEVEL ${LVL+1}「${LEVELS[LVL].name}」`;
  $('tsCont').onclick=()=>{ close(); if(MODE==='step' && LVL===0) startLevel(1); };
  // はじめから：進み具合を消してレベル1から（進んでいるときは2回押しで）
  const nb=$('tsNew'); nb.classList.remove('armed'); $('tsNewSub').textContent='レベル1から、1つずつ覚えていきます。';
  nb.onclick=()=>{ if(MODE==='step' && LVL>0 && !nb.classList.contains('armed')){ nb.classList.add('armed'); $('tsNewSub').textContent='もう一度押すと、進み具合を消してレベル1から始めます（セーブデータは消えません）。'; return; }
    MODE='step'; LVL=0; saveLv(); close(); startLevel(1); };
  // 途中のレベルから
  $('tsMid').onclick=()=>{ const box=$('tsLevels'); box.hidden=!box.hidden;
    box.innerHTML=LEVELS.map((l,k)=>`<button data-l="${k+1}"><i>LEVEL ${k+1}</i><b>${l.name}</b></button>`).join('');
    box.querySelectorAll('button').forEach(b=>b.onclick=()=>{ const n=+b.dataset.l; MODE='step'; LVL=n-1; saveLv(); close(); startLevel(n); }); };
  // フリーモード
  $('tsFree').onclick=()=>{ MODE='free'; saveLv(); MOODPOP.pending=false; close(); toast('すべての機能を使えます'); };
}
if(!OPENED_SHARE) showModePick();
