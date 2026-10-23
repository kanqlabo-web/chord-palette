# 講義版の Firebase 設定

講義版（/chord-palette/lecture/）は、先生の端末が「どのレベルまで開放したか」を Firebase に書き、受講者の端末がそれを読んでついてくる仕組みです。
設定がまだのあいだは、同じブラウザの別タブどうしでだけ動きます（練習用）。

## 1. プロジェクトを作る
1. https://console.firebase.google.com/ を開き「プロジェクトを追加」。名前は自由（例: chord-palette-lecture）。Google アナリティクスはオフで大丈夫です。
2. 左のメニュー「構築」→「Realtime Database」→「データベースを作成」。場所はどこでも可（近いのは asia-southeast1）。「ロックモード」で始めて大丈夫です（あとでルールを貼ります）。

## 2. 匿名ログインを有効にする
「構築」→「Authentication」→「始める」→「Sign-in method」→「匿名」を有効にして保存。
（先生の端末だけが、部屋の持ち主として書きこむために使います。受講者はログインしません）

## 3. ルールを貼る
「Realtime Database」→「ルール」タブに、次をそのまま貼って「公開」。

```json
{
  "rules": {
    "lectures": {
      "$id": {
        ".read": true,
        ".write": "auth != null && (!data.exists() || data.child('owner').val() === auth.uid)",
        "m": {
          "$mid": { ".write": "newData.isNumber() || !newData.exists()" }
        }
      }
    }
  }
}
```

- 部屋は `lectures/{部屋番号}-{パスワード}` に作られます。パスワードを知らない人は場所がわからないので読めません。
- 部屋の中身を書きかえられるのは、部屋を作った先生の端末だけです。
- `m` は受講者の「参加中」の合図（時刻だけ）です。

## 4. アプリに鍵を入れる
1. 「プロジェクトの設定」（歯車）→「全般」→「マイアプリ」でウェブアプリ（</>）を追加。表示される `apiKey` を控えます。
2. Realtime Database の画面上部にあるアドレス（`https://〜.firebaseio.com` または `https://〜.firebasedatabase.app`）を控えます。
3. `tools/lecture-src/js/08-lecture.js` の先頭にある次の行に貼ります。

```js
const LECTURE_FB={ apiKey:'ここに apiKey', databaseURL:'ここにアドレス' };
```

4. `bash tools/deploy.sh patch "講義版: Firebase をつなぐ"` で公開。
（apiKey はウェブに公開して大丈夫な種類の鍵です。守りは上のルールが担当します）

自分でやるのが面倒なら、apiKey とアドレスの2つを教えてもらえれば、こちらで貼って公開します。

## 使いかた
- 先生: 講義版を開く →「先生として部屋を作る」→ 下のバーの「リンク・QR」で受講者に配る → 「LEVEL n を開放」で1つずつ開ける。「LEVEL n の解説」でその回の説明画面を出せます。「戻す」で1つ戻せます。
- 受講者: 配られたリンク（または QR）を開くだけで参加。部屋番号とパスワードを手で入れても参加できます。
- 先生の端末を閉じても、次に開いたとき「前の部屋に戻る」が出ます。
