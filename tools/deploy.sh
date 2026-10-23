#!/bin/bash
# 使い方: bash tools/deploy.sh "コミットメッセージ"
#  版数を1つ上げて（日付も入れる）、tools/chord-palette.src.html から index.html と beta/index.html を作り、commit・push する
#  コミットの最後に付ける行は、環境変数 COMMIT_TRAILER で渡せる（例：Co-Authored-By の行など）
set -e
R=$(cd "$(dirname "$0")/.." && pwd); T=$R/tools; SRC=$T/chord-palette.src.html
cd "$R"
git pull -q --rebase --autostash   # ほかのセッションの変更を先に取り込む
N=$(( $(grep -o "ver 1\.[0-9]*" index.html | head -1 | cut -d. -f2) + 1 ))   # 今の版数＋1（浅いクローンでもずれないように）
D=$(TZ=Asia/Tokyo date +%Y-%m-%d)
sed -i -E "s/ver 1\.[0-9]+（[0-9-]*）/ver 1.$N（$D）/g" "$SRC"
{ cat "$T/hdr.txt"; cat "$SRC"; printf '\n</body>\n</html>'; } > index.html
awk '/<script>/{f=1;next} /<\/script>/{f=0} f' index.html > /tmp/cp-main.js && node --check /tmp/cp-main.js
bash "$T/build_beta.sh"
git add -A
git commit -qm "$1（ver 1.$N）${COMMIT_TRAILER:+

$COMMIT_TRAILER}"
git push -q
L=$(git rev-parse HEAD); Rm=$(git ls-remote origin refs/heads/main | cut -f1)
[ "$L" = "$Rm" ] && echo "PUSHED ver 1.$N ${L:0:7}" || echo "PUSH MISMATCH local $L remote $Rm"
