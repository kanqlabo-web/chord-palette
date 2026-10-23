#!/bin/bash
# 使い方: deploy.sh "コミットメッセージ"   — バージョンを自動で上げて、index.html を作り、push して、リモートと一致するか確認する
set -e
S=/tmp/claude-0/-home-claude/cb90b389-4cb1-5166-985c-0cf20ec415ab/scratchpad
cd /home/claude/chord-palette
N=$(( $(git rev-list --count HEAD) + 1 )); D=$(TZ=Asia/Tokyo date +%Y-%m-%d)
sed -i -E "s/ver 1\.[0-9]+（[0-9-]+）/ver 1.$N（$D）/g" /home/claude/chord-palette.html
{ cat $S/hdr.txt; cat /home/claude/chord-palette.html; printf '\n</body>\n</html>'; } > index.html
# 試作版も同じ中身で作り直し、ソースも tools/ に残す
bash $S/build_beta.sh >/dev/null && cp $S/site/beta/index.html beta/index.html
cp /home/claude/chord-palette.html tools/chord-palette.src.html; cp $S/build_beta.sh $S/deploy.sh tools/
git add -A && git commit -qm "$1（ver 1.$N）

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Lc8ncBESE1t4zMTwrtxnnQ"
git push -q
L=$(git rev-parse HEAD); R=$(git ls-remote origin refs/heads/main | cut -f1)
[ "$L" = "$R" ] && echo "PUSHED ver 1.$N ${L:0:7}" || echo "PUSH MISMATCH local $L remote $R"
# GitHub Pages の公開が終わるまで待って結果を出す（最大約3分。終わらなければ状態だけ表示）
for i in $(seq 1 18); do st=$(gh run list -L 1 --json status,headSha --jq '.[0].status+" "+.[0].headSha[0:7]' 2>/dev/null); case "$st" in "completed "*) break;; esac; sleep 10; done
gh run list -L 1 2>/dev/null | cut -f1-2,5,9
