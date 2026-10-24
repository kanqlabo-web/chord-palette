// ---------- 講義版 ----------
// 先生の端末で「次のレベルを開放」すると、受講者の端末でもそのレベルの機能が使えるようになる（解説は先生が直接する）
// 受講者は、先生が配るリンク（部屋番号とパスワード入り）を開くだけで参加できる
//
// ■ Firebase の設定（ここだけ書きかえる）
//   apiKey・databaseURL は Firebase のコンソール（プロジェクトの設定 → マイアプリ → ウェブアプリ）に出る値
//   設定が空のときは「この端末の中だけ」で試せる（同じブラウザの別のタブが受講者になる）
const LECTURE_FB={ apiKey:'AIzaSyDMjJKqZ9NYNh_VW-FeS5AxzRjnYM_Dh-A', databaseURL:'https://chord-palette-b160a-default-rtdb.asia-southeast1.firebasedatabase.app' };

const LEC={ role:null, room:null, pw:null, lv:0, tok:null, es:null, bc:null, me:Math.random().toString(36).slice(2,10), hb:null, members:0 };
const LEC_ON=()=>!!(LECTURE_FB.apiKey && LECTURE_FB.databaseURL);
const lecPath=()=>`lectures/${LEC.room}-${LEC.pw}`;
const lecLink=()=>`${location.origin}${location.pathname}#r=${LEC.room}&p=${LEC.pw}`;

// ---- 通信：Firebase（REST と、変わったら届く通知 EventSource）。設定がなければ同じ端末のタブどうし（BroadcastChannel）
async function fbAuth(){ if(LEC.tok) return LEC.tok;   // 先生だけ、名前なしのログイン（書きこみの権限のため）
  const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${LECTURE_FB.apiKey}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})});
  const j=await r.json(); if(!j.idToken) throw new Error('auth'); LEC.tok=j.idToken; LEC.uid=j.localId; return LEC.tok; }
const fbUrl=(p,auth)=>`${LECTURE_FB.databaseURL.replace(/\/$/,'')}/${p}.json${auth?`?auth=${auth}`:''}`;
async function lecGet(p){ if(!LEC_ON()){ try{ return JSON.parse(localStorage.getItem('cplec-room:'+p)); }catch(e){ return null; } }
  const r=await fetch(fbUrl(p)); return r.ok?r.json():null; }
async function lecPut(p,v,asTeacher){ if(!LEC_ON()){ localStorage.setItem('cplec-room:'+p,JSON.stringify(v)); lecLocalSend(p,v); return true; }
  const r=await fetch(fbUrl(p,asTeacher?await fbAuth():null),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(v)}); return r.ok; }
function lecLocalSend(p,v){ if(!LEC.bc) LEC.bc=new BroadcastChannel('cplec'); LEC.bc.postMessage({p,v}); }
// 部屋の中身が変わったら f を呼ぶ
function lecWatch(f){ lecUnwatch();
  if(!LEC_ON()){ LEC.bc=LEC.bc||new BroadcastChannel('cplec'); LEC.bc.onmessage=e=>{ if(e.data.p===lecPath()) f(e.data.v); else if(e.data.p.startsWith(lecPath()+'/m/')) lecLocalMembers(f); }; lecGet(lecPath()).then(f); return; }
  const es=LEC.es=new EventSource(fbUrl(lecPath())); let data=null;
  const apply=(ev)=>{ try{ const m=JSON.parse(ev.data); if(!m) return; const p=m.path.split('/').filter(Boolean);
      if(!p.length) data=m.data; else { data=data||{}; let o=data; p.slice(0,-1).forEach(k=>o=o[k]=o[k]||{}); if(m.data===null) delete o[p[p.length-1]]; else o[p[p.length-1]]=m.data; }
      f(data); }catch(e){} };
  es.addEventListener('put',apply); es.addEventListener('patch',e=>{ try{ const m=JSON.parse(e.data); data=data||{}; let o=data; m.path.split('/').filter(Boolean).forEach(k=>o=o[k]=o[k]||{}); Object.assign(o,m.data); f(data); }catch(err){} });
  es.onerror=()=>lecStatus('つながりなおしています…'); es.onopen=()=>lecStatus(''); }
function lecUnwatch(){ if(LEC.es){ LEC.es.close(); LEC.es=null; } }
function lecLocalMembers(f){ lecGet(lecPath()).then(d=>{ const m={}; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k.startsWith('cplec-room:'+lecPath()+'/m/')) m[k.split('/').pop()]=+localStorage.getItem(k); } f({...(d||{}),m}); }); }

// ---- 画面（部品とスタイルは、このファイルの中で作る） ----
(function(){
  const css=`
#lecStart{position:fixed;inset:0;z-index:70;background:var(--bg);display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:max(28px,env(safe-area-inset-top,0px)) 16px 32px}
#lecStart .lin{width:100%;max-width:440px}
#lecStart h2{font-family:var(--display);font-weight:900;font-size:1.5rem;margin:8px 0 2px;text-align:center}
#lecStart .lsub{color:var(--muted);text-align:center;margin:0 0 20px;font-size:.88rem;line-height:1.6}
#lecStart .lcard{display:block;width:100%;text-align:left;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:16px;margin-bottom:12px;cursor:pointer;color:inherit}
#lecStart .lcard b{font-family:var(--display);font-size:1.05rem;display:block;margin-bottom:4px}
#lecStart .lcard span{color:var(--muted);font-size:.82rem;line-height:1.6}
#lecStart .ljoin{display:none;gap:8px;margin-top:10px}
#lecStart .ljoin.on{display:flex;flex-wrap:wrap}
#lecStart input{font-size:16px;padding:10px 12px;border-radius:10px;border:1.5px solid var(--line);flex:1;min-width:7em;background:var(--surface);color:var(--ink)}
#lecStart .lwarn{font-size:.78rem;color:var(--d);margin:4px 0 12px;line-height:1.6}
#lecBar{position:fixed;left:8px;right:8px;bottom:calc(8px + env(safe-area-inset-bottom,0px));z-index:45;background:var(--ink);color:var(--bg);border-radius:14px;padding:8px 12px;font-size:.8rem;box-shadow:0 6px 20px rgba(0,0,0,.25)}
#lecBar .lrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
#lecBar b{font-family:var(--display);font-size:.92rem}
#lecBar button{border:0;border-radius:999px;padding:7px 12px;font-weight:700;font-size:.8rem;cursor:pointer;background:var(--bg);color:var(--ink)}
#lecBar button.alt{background:color-mix(in srgb,var(--bg) 16%,transparent);color:var(--bg)}
#lecBar .lsp{flex:1}
#lecBar .lmore{display:none;margin-top:8px;gap:10px;flex-direction:column}
#lecBar.open .lmore{display:flex}
#lecBar .llink{word-break:break-all;font-size:.74rem;opacity:.85}
#lecBar .lqr{background:#fff;border-radius:10px;padding:8px;align-self:flex-start}
#lecBar .lqr img,#lecBar .lqr svg{display:block;width:180px;height:180px}
#lecBar .lst{opacity:.75;font-size:.72rem}
body.lec-child .lane~.transport{padding-bottom:44px}
body.lec-on .app{padding-bottom:64px}
body.lec-child #toTitle{display:none}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
  const s=document.createElement('div'); s.id='lecStart'; s.hidden=true;
  s.innerHTML=`<div class="lin"><p class="mpeye" style="text-align:center">CHORD PALETTE</p><h2>講義版</h2>
    <p class="lsub">先生が解説しながら「次のレベルを開放」すると、<br>受講者の画面にも、そのレベルの機能が増えていきます。</p>
    <p class="lwarn" id="lecWarn" hidden>Firebase の設定がまだなので、この端末の中だけで試せます（同じブラウザの別のタブで受講者のリンクを開いてください）。</p>
    <button class="lcard" id="lecTeacher"><b>先生として部屋を作る</b><span>部屋番号とパスワードを作り、受講者に配るリンクと QR コードを出します。</span></button>
    <div class="lcard" id="lecChildBtn" role="button" tabindex="0"><b>受講者として参加する</b><span>先生から聞いた部屋番号とパスワードを入れます（配られたリンクを開いた人は、そのまま参加しています）。</span>
      <div class="ljoin" id="lecJoin"><input id="lecRoom" inputmode="numeric" maxlength="4" placeholder="部屋番号（4けた）" autocomplete="off"><input id="lecPw" maxlength="8" placeholder="パスワード" autocomplete="off"><button class="chip main" id="lecGo">参加する</button></div></div>
  </div>`;
  document.body.appendChild(s);
  const b=document.createElement('div'); b.id='lecBar'; b.hidden=true; document.body.appendChild(b);
})();
function lecStatus(t){ const el=$('lecSt'); if(el) el.textContent=t; }

// ---- 先生 ----
async function lecStartTeacher(){ const btn=$('lecTeacher'); btn.querySelector('span').textContent='部屋を作っています…';
  try{ for(let k=0;k<6;k++){ LEC.room=String(Math.floor(1000+Math.random()*9000)); LEC.pw=Math.random().toString(36).slice(2,6);
      if(!(await lecGet(lecPath()))) break; }
    LEC.role='teacher'; LEC.lv=0; if(LEC_ON()) await fbAuth();
    const ok=await lecPut(lecPath(),{owner:LEC.uid||'local', lv:0, ts:Date.now()},true); if(!ok) throw new Error('put');
    try{ localStorage.setItem('cplec-teacher',JSON.stringify({room:LEC.room,pw:LEC.pw,uid:LEC.uid||null,t:Date.now()})); }catch(e){}
    MODE='free'; saveLv(); $('lecStart').hidden=true; document.body.classList.add('lec-on'); lecWatch(lecOnData); renderLecBar(); renderAll();
  }catch(e){ btn.querySelector('span').textContent='部屋を作れませんでした。Firebase の設定（アドレス・匿名ログイン・ルール）を確かめてください。'; } }
async function lecSetLevel(n){ n=Math.max(0,Math.min(LV_MAX,n)); LEC.lv=n; renderLecBar();
  const cur=await lecGet(lecPath())||{}; await lecPut(lecPath(),{...cur, lv:n, ts:Date.now()},true); }
function renderLecBar(){ const b=$('lecBar'); b.hidden=false; const open=b.classList.contains('open');
  if(LEC.role==='teacher'){ const n=LEC.lv, nx=LEVELS[n];
    b.innerHTML=`<div class="lrow"><b>部屋 ${LEC.room}</b><span>パスワード ${LEC.pw}</span><span class="lst" id="lecSt"></span><span class="lsp"></span><span>参加 ${LEC.members}人</span><button class="alt" id="lecMore">${open?'閉じる':'リンク・QR'}</button></div>
      <div class="lrow" style="margin-top:6px"><span>開放: ${n?`LEVEL ${n}「${LEVELS[n-1].name}」まで`:'まだなし'}</span><span class="lsp"></span>
        ${n?`<button class="alt" id="lecBack" aria-label="1つ戻す">戻す</button><button class="alt" id="lecShow">LEVEL ${n} の解説</button>`:''}${nx?`<button id="lecNext">LEVEL ${n+1} を開放</button>`:''}</div>
      <div class="lmore"><span class="llink" id="lecLinkTx">${lecLink()}</span><div class="lrow"><button id="lecCopy">リンクをコピー</button></div><div class="lqr" id="lecQr"></div></div>`;
    $('lecMore').onclick=()=>{ b.classList.toggle('open'); renderLecBar(); };
    if($('lecNext')) $('lecNext').onclick=()=>lecSetLevel(LEC.lv+1);
    if($('lecBack')) $('lecBack').onclick=()=>lecSetLevel(LEC.lv-1);
    if($('lecShow')) $('lecShow').onclick=()=>startLevel(LEC.lv,true);
    $('lecCopy').onclick=()=>{ (navigator.clipboard?navigator.clipboard.writeText(lecLink()):Promise.reject()).then(()=>toast('リンクをコピーしました'),()=>toast('リンクを長押ししてコピーしてください')); };
    if(open) lecQr($('lecQr'));
  } else {
    b.innerHTML=`<div class="lrow"><b>講義に参加中</b><span>部屋 ${LEC.room}</span><span class="lst" id="lecSt"></span><span class="lsp"></span><span>${LVL?`LEVEL ${LVL} まで`:'先生の合図を待っています'}</span></div>`; } }
// QR コード（qrcode-generator を読み込んで作る。読めないときはリンクだけ）
function lecQr(el){ const draw=()=>{ try{ const q=qrcode(0,'M'); q.addData(lecLink()); q.make(); el.innerHTML=q.createSvgTag({cellSize:4,margin:0,scalable:true}); }catch(e){ el.hidden=true; } };
  if(window.qrcode) return draw(); const sc=document.createElement('script'); sc.src='https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'; sc.onload=draw; sc.onerror=()=>{ el.hidden=true; }; document.head.appendChild(sc); }

// ---- 部屋の中身が変わったとき（先生・受講者どちらも）
function lecOnData(d){ if(!d) return; const now=Date.now(); LEC.members=Object.values(d.m||{}).filter(t=>now-t<70000).length;
  if(LEC.role==='child'){ const n=+d.lv||0; if(n!==LVL){ const up=n>LVL; LVL=n; saveLv(); closeAll(); renderAll();
      if(up && n>0){ toast(`LEVEL ${n}「${LEVELS[n-1].name}」が開放されました`); if(!TUT.on) setTimeout(()=>showWhere(n),500); } } }
  renderLecBar(); }

// ---- 受講者 ----
function lecJoin(room,pw){ LEC.role='child'; LEC.room=room; LEC.pw=pw; MODE='step';
  lecGet(lecPath()).then(d=>{ if(!d){ $('lecStart').hidden=false; toast('部屋が見つかりません。部屋番号とパスワードを確かめてください'); LEC.role=null; return; }
    $('lecStart').hidden=true; $('modePick').hidden=true; document.body.classList.add('lec-on','lec-child'); LVL=+d.lv||0; saveLv(); renderAll();
    lecWatch(lecOnData); renderLecBar();
    // 参加していることを先生に知らせる（20秒ごと）
    const beat=()=>{ const p=`${lecPath()}/m/${LEC.me}`; if(LEC_ON()) fetch(fbUrl(p),{method:'PUT',body:JSON.stringify(Date.now())}).catch(()=>{}); else { localStorage.setItem('cplec-room:'+p,Date.now()); lecLocalSend(p,Date.now()); } };
    beat(); clearInterval(LEC.hb); LEC.hb=setInterval(beat,20000); }); }

// ---- はじめの画面 ----
(function lecBoot(){ if(CP.kind!=='lecture') return;
  $('modePick').hidden=true; $('lecWarn').hidden=LEC_ON();
  $('lecTeacher').onclick=lecStartTeacher;
  $('lecChildBtn').onclick=e=>{ if(e.target.closest('.ljoin')) return; $('lecJoin').classList.add('on'); $('lecRoom').focus(); };
  $('lecGo').onclick=e=>{ e.stopPropagation(); const r=$('lecRoom').value.trim(), p=$('lecPw').value.trim().toLowerCase(); if(!/^\d{4}$/.test(r)||!p){ toast('部屋番号（4けた）とパスワードを入れてください'); return; } lecJoin(r,p); };
  // 配られたリンク（#r=部屋&p=パスワード）から開いたときは、そのまま受講者として参加
  const h=new URLSearchParams(location.hash.slice(1)), r=h.get('r'), p=h.get('p');
  if(r && p){ lecJoin(r,p.toLowerCase()); return; }
  // 先生が同じ端末で開き直したとき（部屋はそのまま使う）
  try{ const t=JSON.parse(localStorage.getItem('cplec-teacher')); if(t && Date.now()-t.t<6*3600*1000){ const s=$('lecTeacher').querySelector('span'); s.innerHTML+=`<br>前に作った部屋（${t.room}）に戻るときは、下のボタンから。`;
      const back=document.createElement('button'); back.className='chip'; back.textContent=`部屋 ${t.room} に戻る`; back.style.marginTop='8px';
      back.onclick=async e=>{ e.stopPropagation(); LEC.role='teacher'; LEC.room=t.room; LEC.pw=t.pw; const d=await lecGet(lecPath()); LEC.lv=(d&&+d.lv)||0; if(LEC_ON()) await fbAuth().catch(()=>{});
        MODE='free'; $('lecStart').hidden=true; document.body.classList.add('lec-on'); lecWatch(lecOnData); renderLecBar(); renderAll(); };
      $('lecTeacher').after(back); } }catch(e){}
  $('lecStart').hidden=false; })();
