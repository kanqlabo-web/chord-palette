// 日本語の改行を文節で：単語の途中（「コー／ド」など）で折り返さないように、文節の切れ目にだけ <wbr> を入れる
// Intl.Segmenter で単語に分け、ひらがな・閉じかっこ・句読点で始まる語は前につなげる（助詞などが行頭に来ない）。
// CSS は keep-all（<wbr> とスペースでだけ折り返す）。1行に入りきらない長い語だけ、どこでも折り返す
(function(){
  if(typeof Intl==='undefined' || !Intl.Segmenter) return;
  const seg=new Intl.Segmenter('ja',{granularity:'word'}), JA=/[぀-ヿ一-鿿]/;
  const GLUE=/^[぀-ゟーァィゥェォッャュョ、。，．・：；！？!?）)」』】〕〉》％%〜～…]/;   // この文字で始まる語は前の語にくっつける
  const OPEN=/[（(「『【〔〈《]$/;   // 開きかっこで終わる語のあとでは切らない
  const AFTER=/[、。！？!?]$/;   // 句読点のあとは切ってよい
  const SKIP='SCRIPT,STYLE,TEXTAREA,INPUT,SELECT,OPTION,svg,CANVAS,OUTPUT,[contenteditable],.nophrase';
  // 切ってよいのは「助詞・助動詞など、ひらがなだけの語」「句読点」「スペース」のあとだけ（「分数｜コード」「進み｜具合」のような名詞の途中では切らない）
  const HIRA=/^[\u3040-\u309f\u30fc]+$/;
  function phrases(t){ const out=[]; let prev=null;
    for(const {segment:w} of seg.segment(t)){
      const last=out[out.length-1];
      const cut = last!=null && !OPEN.test(last) && (AFTER.test(last) || ((/\s$/.test(last) || HIRA.test(prev)) && !GLUE.test(w)));
      if(cut||last==null) out.push(w); else out[out.length-1]+=w; prev=w; }
    return out; }
  function wrapText(n){ const t=n.nodeValue; if(t.length<6 || !JA.test(t)) return;
    const ps=phrases(t); if(ps.length<2) return;
    const f=document.createDocumentFragment(); ps.forEach((p,i)=>{ if(i) f.appendChild(document.createElement('wbr')); f.appendChild(document.createTextNode(p)); });
    n.parentNode.replaceChild(f,n); }
  function walk(root){ if(root.nodeType===3){ const p=root.parentElement; if(p && !p.closest(SKIP)) wrapText(root); return; }
    if(root.nodeType!==1 || root.closest(SKIP)) return;
    const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement&&!n.parentElement.closest(SKIP)?1:2}), list=[];
    while(tw.nextNode()) list.push(tw.currentNode); list.forEach(n=>{ if(n.parentNode) wrapText(n); }); }
  let q=new Set(), busy=false;
  const flush=()=>{ busy=false; const l=[...q]; q.clear(); mo.disconnect(); l.forEach(n=>{ if(n.isConnected) walk(n); }); mo.observe(document.body,OPT); };
  const OPT={childList:true,subtree:true,characterData:true};
  const mo=new MutationObserver(ms=>{ ms.forEach(m=>{ if(m.type==='characterData') q.add(m.target); else m.addedNodes.forEach(n=>q.add(n)); }); if(!busy){ busy=true; queueMicrotask(flush); } });
  const st=document.createElement('style'); st.textContent=`
body{word-break:keep-all;overflow-wrap:anywhere;line-break:strict}
h2,.tut h2,.tut .sub,.eyebrow{text-wrap:balance}`;
  document.head.appendChild(st);
  walk(document.body); mo.observe(document.body,OPT);
})();
