#!/bin/bash
# 試作版（beta/index.html）を作る。中身はいつもの版と同じで、保存データのキー（cpbeta-）と音源の場所（../snd/）だけ分ける。
# 試作の変更を入れるときは、下の python の中で beta.html に当てる（OK が出たら tools/chord-palette.src.html へ移す）
set -e
R=$(cd "$(dirname "$0")/.." && pwd); T=$R/tools; W=$(mktemp -d)
cp "$T/chord-palette.src.html" "$W/beta.html"
python3 - "$W/beta.html" <<'PY'
import sys
p=sys.argv[1]; s=open(p).read()
s=s.replace("'chord-palette","'cpbeta-chord-palette").replace("fetch(`snd/${name}.json`)","fetch(`../snd/${name}.json`)")
s=s.replace("<title>コード進行パレット</title>","<title>コード進行パレット β</title>",1)
s=s.replace("    <h1>コード進行パレット</h1>","    <h1>コード進行パレット<small style=\"font-size:.55em;margin-left:4px;color:var(--d)\">β</small></h1>",1)
a="try{ const s=JSON.parse(localStorage.getItem('cpbeta-chord-palette-v3'));"
s=s.replace(a,"try{ if(localStorage.getItem('cpbeta-chord-palette-v3')==null){ for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(k&&k.startsWith('chord-palette')) localStorage.setItem('cpbeta-'+k, localStorage.getItem(k)); } } }catch(e){}\n"+a,1)
open(p,'w').write(s)
PY
awk '/<script>/{f=1;next} /<\/script>/{f=0} f' "$W/beta.html" > "$W/js.js" && node --check "$W/js.js"
mkdir -p "$R/beta"; { cat "$T/hdr.txt"; cat "$W/beta.html"; printf '\n</body>\n</html>'; } > "$R/beta/index.html"
rm -rf "$W"; echo built beta
