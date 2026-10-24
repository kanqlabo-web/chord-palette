# Claude 向けルール（トークン節約）

このファイルは毎回自動で読まれます。短く保ってください。くわしい仕組みは `tools/HANDOFF.md`（最初に読む）。

## 読むもの・読まないもの
- 直すのは `tools/` の中だけ。読むのも `tools/src/`・`tools/beta-src/`・`tools/lecture-src/` の関係するファイルだけ
- 読まない: `index.html`・`core/`・`beta/`・`lecture/`（build.py が作る出力）、`snd/*.json`（base64 の音源。1つ数百KB）、`CHANGELOG.md` の全体
- `js/02-mypattern.js` の `const LIB_DATA=`（進行ライブラリ、4万字の1行。src は581行目付近、beta-src は587行目付近）は読まない。このファイルを全体で読むときは、この行を避けて範囲を分ける
- 同じファイルを読み直さない。一度読んだ内容は覚えておく

## 探し方
- まず `grep -n` で場所を探し、`sed -n 'A,Bp'` や Read の offset/limit で必要な行だけ見る
- 長い行が出そうなときは `grep -n -o '.\{0,80\}キーワード.\{0,80\}'` のように前後だけ出す
- ファイル一覧は `ls` で十分。`find` や再帰の一覧は範囲をしぼる
- `beta-src` は差しかえ分だけ。本体との違いは `diff tools/src/js/X.js tools/beta-src/js/X.js | head -50` で見る

## 直し方
- 変更は Edit（部分の置きかえ）で、変わる所だけ。ファイル全体の書き直し（Write）はしない
- 同じ直しを src と beta-src の両方にするときも、それぞれ部分編集で

## 確認
- 必要なテストだけ動かす。公開前の必須は `node tools/tparall.js`（「ALL SAME」が出れば OK）
- 出力は `| tail -20` や `| grep -E 'ALL SAME|DIFF|Error'` でしぼる。ログを丸ごと出さない
- スクリーンショットは本当に必要なときだけ、少なく、小さく（viewport を小さめ、`clip` で部分だけ）。画像を何度も読み直さない
- 公開は `bash tools/deploy.sh`。その出力も `tail` でしぼる

## 返事
- ユーザーへの返事は短く（です・ます、短い前置き＋見出し付きの箇条書き）。作業の経過を長々と書かない
- サブエージェントは使わない（ユーザーが頼んだときだけ）
