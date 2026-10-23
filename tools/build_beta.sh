#!/bin/bash
set -e
S=/tmp/claude-0/-home-claude/52072b9f-f344-5d3e-b0b9-e04f06b37d29/scratchpad
cp /home/claude/chord-palette.html $S/beta.html && python3 $S/beta_patch.py $S/beta.html >/dev/null && python3 $S/beta_patch2.py $S/beta.html >/dev/null
python3 - <<'PY'
S='/tmp/claude-0/-home-claude/52072b9f-f344-5d3e-b0b9-e04f06b37d29/scratchpad'
p=S+'/beta.html'; s=open(p).read()
s=s.replace("'chord-palette","'cpbeta-chord-palette").replace("fetch(`snd/${name}.json`)","fetch(`../snd/${name}.json`)")
s=s.replace("<title>コード進行パレット</title>","<title>コード進行パレット β</title>",1)
s=s.replace("    <h1>コード進行パレット</h1>","    <h1>コード進行パレット<small style=\"font-size:.55em;margin-left:4px;color:var(--d)\">β</small></h1>",1)
a="try{ const s=JSON.parse(localStorage.getItem('cpbeta-chord-palette-v3'));"
s=s.replace(a,"try{ if(localStorage.getItem('cpbeta-chord-palette-v3')==null){ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k&&k.startsWith('chord-palette')) localStorage.setItem('cpbeta-'+k, localStorage.getItem(k)); } } }catch(e){}\n"+a,1)
open(p,'w').write(s)
PY
awk '/<script>/{f=1;next} /<\/script>/{f=0} f' $S/beta.html > $S/js.js && node --check $S/js.js
mkdir -p $S/site/beta; { cat $S/hdr.txt; cat $S/beta.html; printf '\n</body>\n</html>'; } > $S/site/beta/index.html
echo built
