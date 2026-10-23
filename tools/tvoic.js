const {chromium}=require('playwright');
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); await p.goto('http://localhost:8765/'); await p.waitForTimeout(600);
console.log(await p.evaluate(async()=>{ $('modePick').hidden=true; MODE='free'; const out=[]; let bad=0, tot=0;
 for(const st of STYLES){ setStyle(st); state.key='C'; let prev=null;
  for(const o of [0,2,4,5,7,9,11]) for(const [q,x] of [['maj','M7'],['m','7'],['maj','7'],['maj','M9'],['m','M7'],['maj','add9'],['maj','6'],['m','9']]){ for(const pr of [null,[57,60,64,67],[60,64,67,71],[62,65,69,72]]){
    const bt=chordNotes({o,q,x,b:null},pr), R=bt.R; tot++; const e=R.length>=2&&(R[1]-R[0]===1||R[R.length-1]-R[R.length-2]===1); if(e){ bad++; if(out.length<12) out.push(st.name+' '+o+q+x+' '+R.map(midiName).join(' ')); } } } }
 return `edge-semitone voicings: ${bad}/${tot}\n`+out.join('\n'); })); await b.close(); })();
