# Re:Verse Dominion

ブラウザだけで動く、オセロ的な「裏返し」を核にしたカードバトル。サーバ不要・**localStorage** にすべて保存します。HTML / CSS / JavaScript のみ。

## 起動方法

カードデータ `cards.json` を `fetch` で読み込むため、**ローカルサーバ経由での起動を推奨**します。

```bash
cd card-game
python3 -m http.server
# ブラウザで http://localhost:8000 を開く
```

`index.html` をダブルクリック（`file://`）でも動くように、`cards.json` のコピー `js/cards.fallback.js` を同梱しています。`fetch` が失敗した場合は自動でこちらを使います。

> `cards.json` を編集したら、フォールバックも更新してください：
> ```bash
> node -e "const fs=require('fs');fs.writeFileSync('js/cards.fallback.js','window.CARDS_FALLBACK = '+fs.readFileSync('cards.json','utf8')+';')"
> ```

## GitHub Pages で公開して遊ぶ

GitHub Pages は HTTPS で配信されるため、`cards.json` の `fetch` がそのまま通り、**追加設定なしで動きます**（パスはすべて相対参照）。

### 手順（Webブラウザだけで完結）

1. GitHub で新しい **public** リポジトリを作成（例：`reverse-dominion`）
2. このフォルダ内の中身（`index.html` がトップに来るように）をすべてアップロード
   - リポジトリの「Add file > Upload files」に**ファイルをドラッグ&ドロップ** → Commit
   - ⚠️ `card-game` フォルダごとではなく、**中身**（`index.html`, `style.css`, `cards.json`, `js/` …）を置く
3. リポジトリの **Settings → Pages** を開く
4. **Build and deployment > Source** で「**Deploy from a branch**」を選択
5. **Branch** で `main` ／ フォルダは `/(root)` を選び **Save**
6. 1〜2分ほど待つと `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開されます

### 手順（git コマンド派）

```bash
cd card-game
git init -b main
git add .
git commit -m "Re:Verse Dominion"
git remote add origin https://github.com/<ユーザー名>/<リポジトリ名>.git
git push -u origin main
# その後、Settings → Pages → Deploy from a branch → main /(root) → Save
```

> リポジトリは **public** にしてください（無料プランの private では Pages のブランチ公開が使えません）。
> `.nojekyll` を同梱しているので Jekyll のビルドは行われず、静的ファイルがそのまま配信されます。

## ファイル構成

```
card-game/
├── index.html            画面の枠
├── style.css             テーマ（インク色＋金＋シアン）
├── cards.json            カードマスタ（正本）
└── js/
    ├── cards.fallback.js  cards.json の自動生成コピー（file:// 用）
    ├── data.js            データ読込・係数/実効値・方向定義
    ├── storage.js         localStorage 永続化・名前レジストリ
    ├── engine.js          バトルの純粋ロジック（UI非依存）
    ├── gacha.js           ガチャ抽選（排出率・確定枠）
    ├── battle.js          バトル進行・盤面描画・CPU AI・5連戦・報酬
    ├── world.js           ダンジョン/競技場/ランキング（モック）
    ├── ui.js              画面描画・モーダル・トースト
    └── main.js            初期化・登録/改名・イベント配線
```

## 実装済みの要件

- カード一覧は `cards.json` で管理（N / R / SR / SSR / UR）
- プレイヤー名登録（重複不可・後から変更可）
- 所持カード保存（1枚ごとのインスタンス管理）
- ガチャ：🪙ノーマル（SSR/UR出ない）／💎レア（R以上1枚確定・SSR/UR出ない）
- 所持カード一覧・売却でコイン獲得
- デッキ6枚編成（試合は5枚設置、1枚控え）
- 合成：**スキル継承**（固有は不変・継承枠に付与）／**上位レア昇華**（SSR・URはここでのみ入手）
- ダンジョン：レベル別・5連戦・5戦目ボス。勝利で**味方化したカードを1枚選んで入手**。敗北で追放
- ダンジョン進捗ランキング（全体順位）
- 競技場：カード登録→自動対戦で報酬

### バトル仕様

- フィールドは 4x4。ランダムで 0〜6 のブロックマス（設置不可）
- カードは8方向の攻撃マークを持ち、その先に相手がいれば攻撃
- 攻撃力 > 相手の防御力 で**味方化（裏返し）**、そうでなければ**ブロック**演出
- 攻撃されたカードのマークが攻撃元を向いていれば**反撃フェーズ**。反撃の攻撃力が上回れば攻撃元が寝返る
- **マーク数が多いほど係数で弱体化**（`markCoef`：1方向=×1.00 〜 8方向=×0.51）
- スキルは「攻撃時／防御時／登場時／勝利時／反撃時」発動。例：攻撃力増加、防御力増加、防御無視、加護（1回ブロック）、登場時に隣接味方の防御強化、**連鎖**（勝利時に攻撃方向の先のカードも味方化＝レア）

## サーバ化の指針（現状はモック）

完全なオフライン構成のため、本来サーバが必要な以下は**ローカルのモックプレイヤー**で再現しています。実運用ではここを差し替えます。

- **競技場の対人自動対戦**：`world.js > runLeague()` を、登録デッキを保存するAPI＋定時バッチに置換
- **全プレイヤー横断ランキング**：`world.js > ranking()` を、サーバ集計の取得に置換
- **名前の重複チェック**：`storage.js > nameTaken()` を、サーバ側のユニーク制約に置換

`engine.js` はUI非依存の純粋ロジックなので、サーバ側の対戦判定にもそのまま再利用できます。

## 既知の調整ポイント

- 初期ダイヤ30のためレアガチャ10連(45)は最初は引けません（売却・ダンジョンで貯める設計）。`storage.js` の初期値で調整可能
- カードのステータス・スキル・排出率は `cards.json` と `gacha.js` で調整できます
