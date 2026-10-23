#!/bin/bash
# 使い方: bash tools/deploy.sh [patch|minor|major] "コミットメッセージ"
#  版数（tools/VERSION、X.XX.XXX）を上げて日付を入れ、tools/build.py で各版のページを作り、commit・push する
#   patch（省略時）＝細かい修正（右）、minor＝中くらいの更新（真ん中）、major＝とても大きな機能・改革（左）
#   minor・major のときは CHANGELOG.md にも1行足すこと（右の数字はのせない）
#  コミットの最後に付ける行は、環境変数 COMMIT_TRAILER で渡せる（例：Co-Authored-By の行など）
set -e
R=$(cd "$(dirname "$0")/.." && pwd); T=$R/tools
LV=patch; case "$1" in patch|minor|major) LV=$1; shift;; esac
cd "$R"
git pull -q --rebase --autostash   # ほかのセッションの変更を先に取り込む
IFS=. read -r A B C < <(head -1 "$T/VERSION"); A=$((10#$A)); B=$((10#$B)); C=$((10#$C))
case $LV in major) A=$((A+1)); B=0; C=0;; minor) B=$((B+1)); C=0;; *) C=$((C+1));; esac
V=$(printf '%d.%02d.%03d' $A $B $C); D=$(TZ=Asia/Tokyo date +%Y-%m-%d)
printf '%s\n%s\n' "$V" "$D" > "$T/VERSION"
python3 "$T/build.py"
git add -A
git commit -qm "$1（ver $V）${COMMIT_TRAILER:+

$COMMIT_TRAILER}"
git push -q
L=$(git rev-parse HEAD); Rm=$(git ls-remote origin refs/heads/main | cut -f1)
[ "$L" = "$Rm" ] && echo "PUSHED ver $V ${L:0:7}" || echo "PUSH MISMATCH local $L remote $Rm"
