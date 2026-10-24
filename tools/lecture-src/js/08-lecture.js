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
// 先生用リンク：同じ先生として、別の端末（スマホ）からも操作できる（ログインの合鍵 t を入れる。受講者には見せない）
const lecTLink=()=>`${lecLink()}&t=${encodeURIComponent(LEC.rt||'local')}`;

// ---- 通信：Firebase（REST と、変わったら届く通知 EventSource）。設定がなければ同じ端末のタブどうし（BroadcastChannel）
// 先生だけ、名前なしのログイン（書きこみの権限のため）。合鍵（rt）があれば、同じ先生としてログインしなおす（1時間で切れるので、切れる前に取り直す）
async function fbAuth(){ if(LEC.tok && Date.now()<LEC.exp) return LEC.tok;
  const K=LECTURE_FB.apiKey;
  if(LEC.rt){ const r=await fetch(`https://securetoken.googleapis.com/v1/token?key=${K}`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=refresh_token&refresh_token='+encodeURIComponent(LEC.rt)});
    const j=await r.json(); if(!j.id_token) throw new Error('auth'); LEC.tok=j.id_token; LEC.uid=j.user_id; LEC.rt=j.refresh_token||LEC.rt; LEC.exp=Date.now()+50*60*1000; return LEC.tok; }
  const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${K}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})});
  const j=await r.json(); if(!j.idToken) throw new Error('auth'); LEC.tok=j.idToken; LEC.uid=j.localId; LEC.rt=j.refreshToken; LEC.exp=Date.now()+50*60*1000; return LEC.tok; }
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
#lecPanel{position:fixed;inset:0;z-index:60;background:var(--bg);overflow-y:auto;padding:max(18px,env(safe-area-inset-top,0px)) 16px calc(24px + env(safe-area-inset-bottom,0px))}
#lecPanel[hidden]{display:none}
#lecPanel .lpin{max-width:520px;margin:0 auto}
#lecPanel .lphead{display:flex;gap:10px}
#lecPanel .lphead div{flex:1;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px 12px}
#lecPanel .lphead small{display:block;color:var(--muted);font-size:.72rem}
#lecPanel .lphead b{font-family:var(--display);font-size:1.5rem;letter-spacing:.04em}
#lecPanel .lpbtn{margin-top:10px;width:100%;min-height:44px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-weight:800}
#lecPanel .lpqr{display:flex;flex-direction:column;align-items:center;gap:8px;margin-top:10px}
#lecPanel .lpqr[hidden]{display:none}
#lecPanel .lpqr{align-items:stretch}
#lecPanel .lqbox{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:12px;display:flex;flex-direction:column;align-items:center;gap:8px}
#lecPanel .lqbox h4{margin:0;align-self:flex-start;font-size:.92rem}
#lecPanel .lqbox p{margin:0;font-size:.74rem;color:var(--muted);line-height:1.6;align-self:flex-start}
#lecPanel .lqt{border-color:color-mix(in srgb,var(--d) 45%,var(--line))}
#lecPanel .lqimg{display:block;width:min(70vw,280px);height:auto;border-radius:10px;border:1px solid var(--line)}
#lecPanel .lqt .lqimg{width:min(46vw,180px)}
#lecPanel .lqbtns{display:flex;gap:8px;width:100%}
#lecPanel .lqbtns .lpbtn{flex:1;margin-top:0;display:grid;place-items:center;text-decoration:none;font-size:.86rem}
#lecPanel .llink{word-break:break-all;font-size:.74rem;color:var(--muted);text-align:center}
#lecPanel h3{margin:22px 0 8px;font-size:1rem}
#lecPanel h3 small{display:block;font-weight:600;color:var(--muted);font-size:.74rem;margin-top:2px}
#lecPanel .lplist{display:flex;flex-direction:column;gap:8px}
#lecPanel .lplv{display:block;width:100%;text-align:left;background:var(--surface);border:1.5px solid var(--line);border-radius:14px;padding:10px 14px;color:var(--ink);font:inherit;position:relative;opacity:.6}
#lecPanel .lplv.done{opacity:1}
#lecPanel .lplv.now{opacity:1;border-color:var(--ink);box-shadow:0 0 0 1.5px var(--ink)}
#lecPanel .lplv .lpn{font-family:var(--display);font-weight:900;font-size:.74rem;color:var(--muted)}
#lecPanel .lplv b{display:block;font-size:.98rem;margin:1px 0 3px;padding-right:6.5em}
#lecPanel .lplv small{display:block;color:var(--muted);font-size:.76rem;line-height:1.5}
#lecPanel .lplv em{position:absolute;top:10px;right:12px;font-style:normal;font-weight:800;font-size:.7rem;background:var(--ink);color:var(--bg);border-radius:999px;padding:2px 8px}
#lecPanel .lpend{margin-top:22px;width:100%;min-height:50px;border:0;border-radius:14px;background:var(--d);color:#fff;font:inherit;font-weight:900;font-size:1rem}
#lecPanel .lpnote{color:var(--muted);font-size:.74rem;line-height:1.6;margin:8px 2px 0}
body.lec-teacher .app{display:none}
body.lec-child #toTitle{display:none}
/* 講義版の画面は、チュートリアル中の画面と同じくらい少なく（メニュー・次のレベルへ・進行ライブラリ・PRO などは出さない） */
body.lec #menuBtn,body.lec .badges{display:none!important}
body.lec.lec-menu #menuBtn{display:grid!important}   /* レベル3（伴奏・ライブラリ）からはメニューを出す */
body.lec .protag,body.lec .sec:has(#lvCount),body.lec .sec:has(#proChips){display:none!important}   /* メニューの中でも、レベル・PRO は出さない */
body.lec .libbtn,body.lec .slothead .right,body.lec .lane .mix{visibility:hidden}
body.lec #lvBig,body.lec #moodTip{display:none!important}
body.lec .lane canvas{display:none}   /* 伴奏は名前の行だけ（小節ごとの絵は出さない） */`;
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
  const b=document.createElement('div'); b.id='lecPanel'; b.hidden=true; document.body.appendChild(b);
})();
function lecStatus(t){ const el=$('lecSt'); if(el) el.textContent=t; }

// ---- 先生 ----
// 先生はスマホで操作する（PC はスライドに使う）。先生の画面にはパレットを出さず、部屋の情報・レベルの一覧・終了だけ
// レベル1は、部屋を作った時点で開放（見方を説明してから QR コードを配るため）
const LEC_GET=n=>n===1?'パレットのコードを並べて鳴らす':LEVELS[n-1].unlock;   // そのレベルで使えるようになるもの
async function lecStartTeacher(){ const btn=$('lecTeacher'); btn.querySelector('span').textContent='部屋を作っています…';
  try{ for(let k=0;k<6;k++){ LEC.room=String(Math.floor(1000+Math.random()*9000)); LEC.pw=Math.random().toString(36).slice(2,6);
      if(!(await lecGet(lecPath()))) break; }
    LEC.role='teacher'; LEC.lv=1; if(LEC_ON()) await fbAuth();
    const ok=await lecPut(lecPath(),{owner:LEC.uid||'local', lv:1, ts:Date.now()},true); if(!ok) throw new Error('put');
    lecTeacherOn();
  }catch(e){ btn.querySelector('span').textContent='部屋を作れませんでした。Firebase の設定（アドレス・匿名ログイン・ルール）を確かめてください。'; } }
function lecTeacherOn(){ try{ localStorage.setItem('cplec-teacher',JSON.stringify({room:LEC.room,pw:LEC.pw,rt:LEC.rt||null,t:Date.now()})); }catch(e){}
  $('lecStart').hidden=true; document.body.classList.add('lec-on','lec-teacher'); lecWatch(lecOnData); renderLecBar(); }
async function lecSetLevel(n){ n=Math.max(1,Math.min(LV_MAX,n)); LEC.lv=n; renderLecBar();
  const cur=await lecGet(lecPath())||{}; await lecPut(lecPath(),{...cur, lv:n, ts:Date.now()},true); }
async function lecEnd(){ const cur=await lecGet(lecPath())||{}; await lecPut(lecPath(),{...cur, lv:LEC.lv, end:true, ts:Date.now()},true);
  try{ localStorage.removeItem('cplec-teacher'); }catch(e){} location.href=new URL('../select/', location.href).href; }   // 先生は版を選ぶ画面へ
function renderLecBar(){ const P=$('lecPanel');
  if(LEC.role!=='teacher'){ P.hidden=true; return; }
  P.hidden=false; const n=LEC.lv, qr=P.dataset.qr==='1';
  P.innerHTML=`<div class="lpin">
    <div class="lphead"><div><small>部屋番号</small><b>${LEC.room}</b></div><div><small>パスワード</small><b>${LEC.pw}</b></div><div><small>参加</small><b id="lecMem">${LEC.members}人</b></div></div>
    <button class="lpbtn" id="lecQrB">${qr?'QR コード・リンクを閉じる':'QR コード・リンクを出す'}</button>
    <div class="lpqr" ${qr?'':'hidden'}>
      <div class="lqbox"><h4>受講者用</h4><img class="lqimg" id="lecQrS" alt="受講者用の QR コード"><span class="llink">${lecLink()}</span>
        <div class="lqbtns"><a class="lpbtn" id="lecDlS" download="講義_部屋${LEC.room}_受講者用QR.png">QR を画像で保存</a><button class="lpbtn" id="lecCopy">リンクをコピー</button></div></div>
      <div class="lqbox lqt"><h4>先生用（スマホで操作するとき）</h4><p>この QR・リンクを開いた端末も、この画面で操作できます。受講者には見せないでください。</p><img class="lqimg" id="lecQrT" alt="先生用の QR コード">
        <div class="lqbtns"><a class="lpbtn" id="lecDlT" download="講義_部屋${LEC.room}_先生用QR.png">QR を画像で保存</a><button class="lpbtn" id="lecCopyT">先生用リンクをコピー</button></div></div></div>
    <h3>開放するレベル<small>タップすると、そのレベルまで開放します（とばしても、戻してもOK）</small></h3>
    <div class="lplist">${LEVELS.map((l,i)=>{ const k=i+1, st=k<n?'done':k===n?'now':'';
      return `<button class="lplv ${st}" data-lv="${k}"><span class="lpn">LEVEL ${k}</span><b>${l.name}</b><small>使えるようになるもの：${LEC_GET(k)}</small>${k===n?'<em>ここまで開放中</em>':''}</button>`; }).join('')}</div>
    <button class="lpend" id="lecEndB">講義を終了する</button>
    <p class="lpnote">終了すると、受講者の画面は「いつもの版」に切りかわり、開放したレベルまで使える状態で自由に遊べます。</p></div>`;
  $('lecQrB').onclick=()=>{ P.dataset.qr=qr?'':'1'; renderLecBar(); };
  const cp=(u,m)=>(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>toast(m),()=>toast('コピーできませんでした'));
  if($('lecCopyT')) $('lecCopyT').onclick=()=>cp(lecTLink(),'先生用リンクをコピーしました');
  if($('lecCopy')) $('lecCopy').onclick=()=>{ (navigator.clipboard?navigator.clipboard.writeText(lecLink()):Promise.reject()).then(()=>toast('リンクをコピーしました'),()=>toast('リンクを長押ししてコピーしてください')); };
  P.querySelectorAll('.lplv').forEach(b=>b.onclick=()=>lecSetLevel(+b.dataset.lv));
  $('lecEndB').onclick=()=>{ const b=$('lecEndB'); if(!b.dataset.armed){ b.dataset.armed='1'; b.textContent='もう一度押すと終了します'; return; } b.disabled=true; lecEnd(); };
  if(qr){ lecQr($('lecQrS'),$('lecDlS'),lecLink(),'受講者用'); lecQr($('lecQrT'),$('lecDlT'),lecTLink(),'先生用'); } }
// QR コード（qrcode-generator を読み込んで作る。読めないときはリンクだけ）
// QR コードを画像（PNG）で作る：長押し・「画像で保存」でそのまま保存できるように、下に部屋番号も入れる
function lecQr(img,dl,url,label){ const draw=()=>{ try{ const q=qrcode(0,'M'); q.addData(url); q.make();
      const n=q.getModuleCount(), cs=16, m=4*cs, W=n*cs+m*2, H=W+120, cv=document.createElement('canvas'); cv.width=W; cv.height=H; const g=cv.getContext('2d');
      g.fillStyle='#fff'; g.fillRect(0,0,W,H); g.fillStyle='#111';
      for(let r=0;r<n;r++) for(let c=0;c<n;c++) if(q.isDark(r,c)) g.fillRect(m+c*cs,m+r*cs,cs,cs);
      g.textAlign='center'; const txt=(t,px,bold,y)=>{ let f=px; do{ g.font=`${bold?'bold ':''}${f}px sans-serif`; f-=2; }while(g.measureText(t).width>W-40 && f>12); g.fillText(t,W/2,y); };   /* 幅に収まる大きさで */
      txt(`コード進行パレット 講義（${label}）`,44,true,W+30); txt(`部屋 ${LEC.room}　パスワード ${LEC.pw}`,36,false,W+84);
      const u=cv.toDataURL('image/png'); img.src=u; if(dl) dl.href=u; }catch(e){ img.hidden=true; if(dl) dl.hidden=true; } };
  if(window.qrcode) return draw(); const sc=document.createElement('script'); sc.src='https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js'; sc.onload=draw; sc.onerror=()=>{ img.hidden=true; if(dl) dl.hidden=true; }; document.head.appendChild(sc); }
// 講義が終わったら、いつもの版へ（開放したレベルまで使える状態で。いつもの版でもっと進んでいれば、そのまま）
function lecGoMain(lv){ try{ const k='chord-palette-level', had=+localStorage.getItem(k)||0; localStorage.setItem(k, Math.max(had, lv||0)); localStorage.setItem('chord-palette-mode','step'); }catch(e){}
  location.href=new URL('../', location.href).href; }

// ---- 部屋の中身が変わったとき（先生・受講者どちらも）
function lecOnData(d){ if(!d) return; const now=Date.now(); LEC.members=Object.values(d.m||{}).filter(t=>now-t<70000).length;
  if(LEC.role==='child'){ if(d.end) return lecGoMain(+d.lv||0);
    const n=+d.lv||0; if(n!==LVL){ LVL=n; saveLv(); closeAll(); renderAll(); } }   // 開放したときの案内は出さない
  else { const n=Math.max(1,+d.lv||1); if(n!==LEC.lv){ LEC.lv=n; renderLecBar(); }   // ほかの端末（先生用リンク）で変えたとき
    const m=$('lecMem'); if(m) m.textContent=LEC.members+'人'; } }

// ---- 受講者 ----
function lecJoin(room,pw){ LEC.role='child'; LEC.room=room; LEC.pw=pw; MODE='step';
  lecGet(lecPath()).then(d=>{ if(!d){ $('lecStart').hidden=false; toast('部屋が見つかりません。部屋番号とパスワードを確かめてください'); LEC.role=null; return; }
    $('lecStart').hidden=true; $('modePick').hidden=true; document.body.classList.add('lec-on','lec-child'); LVL=+d.lv||0; saveLv(); renderAll();
    lecWatch(lecOnData);
    // 参加していることを先生に知らせる（20秒ごと）
    const beat=()=>{ const p=`${lecPath()}/m/${LEC.me}`; if(LEC_ON()) fetch(fbUrl(p),{method:'PUT',body:JSON.stringify(Date.now())}).catch(()=>{}); else { localStorage.setItem('cplec-room:'+p,Date.now()); lecLocalSend(p,Date.now()); } };
    beat(); clearInterval(LEC.hb); LEC.hb=setInterval(beat,20000); }); }

// ---- 画面を少なく：PRO・レベルの案内タイルは使わない
{ const ra=renderAll; renderAll=function(){ if(CP.kind==='lecture' && state.pro){ state.pro=false; document.body.classList.remove('pro'); }
    const r=ra.apply(this,arguments); if(CP.kind==='lecture'){ document.body.classList.toggle('tutlite', LVL<2 && !TUT.on); document.body.classList.toggle('lec-menu', LVL>=3 && LEC.role!=='teacher'); $('lvBig').hidden=true; document.body.classList.remove('haslv'); $('moodTip').hidden=true; } return r; }; }
// ---- はじめの画面 ----
(function lecBoot(){ if(CP.kind!=='lecture') return; document.body.classList.add('lec'); renderAll();
  $('modePick').hidden=true; $('lecWarn').hidden=LEC_ON();
  $('lecTeacher').onclick=lecStartTeacher;
  $('lecChildBtn').onclick=e=>{ if(e.target.closest('.ljoin')) return; $('lecJoin').classList.add('on'); $('lecRoom').focus(); };
  $('lecGo').onclick=e=>{ e.stopPropagation(); const r=$('lecRoom').value.trim(), p=$('lecPw').value.trim().toLowerCase(); if(!/^\d{4}$/.test(r)||!p){ toast('部屋番号（4けた）とパスワードを入れてください'); return; } lecJoin(r,p); };
  // 配られたリンク（#r=部屋&p=パスワード）から開いたときは、そのまま受講者として参加
  const h=new URLSearchParams(location.hash.slice(1)), r=h.get('r'), p=h.get('p');
  const tk=h.get('t');
  if(r && p && tk){ (async()=>{ LEC.role='teacher'; LEC.room=r; LEC.pw=p.toLowerCase(); if(tk!=='local') LEC.rt=tk;   // 先生用リンク：同じ先生として操作
      try{ if(LEC_ON()) await fbAuth(); const d=await lecGet(lecPath()); if(!d) throw new Error('none'); LEC.lv=Math.max(1,+d.lv||1); history.replaceState(null,'',location.pathname); lecTeacherOn(); }
      catch(e){ LEC.role=null; LEC.rt=null; $('lecStart').hidden=false; toast('先生用リンクで部屋を開けませんでした'); } })(); return; }
  if(r && p){ lecJoin(r,p.toLowerCase()); return; }
  // 先生が同じ端末で開き直したとき（部屋はそのまま使う）
  try{ const t=JSON.parse(localStorage.getItem('cplec-teacher')); if(t && Date.now()-t.t<6*3600*1000){ const s=$('lecTeacher').querySelector('span'); s.innerHTML+=`<br>前に作った部屋（${t.room}）に戻るときは、下のボタンから。`;
      const back=document.createElement('button'); back.className='chip'; back.textContent=`部屋 ${t.room} に戻る`; back.style.marginTop='8px';
      back.onclick=async e=>{ e.stopPropagation(); LEC.role='teacher'; LEC.room=t.room; LEC.pw=t.pw; LEC.rt=t.rt||null; const d=await lecGet(lecPath()); LEC.lv=(d&&+d.lv)||0; if(LEC_ON()) await fbAuth().catch(()=>{});
        LEC.lv=Math.max(1,LEC.lv); lecTeacherOn(); };
      $('lecTeacher').after(back); } }catch(e){}
  $('lecStart').hidden=false; })();
