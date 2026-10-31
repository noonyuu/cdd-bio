# cdd-bio

CDD（カフェイン駆動開発）の摂取量を GitHub プロフィールに表示するマグカップメーター。
contribution を 1杯 と数えて、直近 7 日のカフェイン量をガラスのマグに注ぎます。

<!-- CAFFEINE-METER:START -->
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://noonyuu.github.io/cdd-bio/caffeine-dark.webp">
  <img alt="カフェインメーター" width="600" src="https://noonyuu.github.io/cdd-bio/caffeine-light.webp">
</picture>
<!-- CAFFEINE-METER:END -->

GitHub Action として配布しているので、自分のプロフィールリポジトリにワークフローを 1 本置くだけで使えます。
README の目印コメントの間に画像が入り、3 時間ごとに自動で更新されます。

## 使い方

### SVG 版（設定なし）

CSS アニメーションだけで描いた軽量版です（約 8KB、生成は数秒）。

1. プロフィールの README（`<ユーザー名>/<ユーザー名>` リポジトリ）の、画像を出したい場所に目印を置きます。

   ```markdown
   <!-- CAFFEINE-METER:START -->
   <!-- CAFFEINE-METER:END -->
   ```

2. `.github/workflows/caffeine-meter.yml` を作ります。

   ```yaml
   name: Caffeine meter
   on:
     schedule:
       - cron: "23 */3 * * *" # 3時間ごと
     workflow_dispatch:
   permissions:
     contents: write
   jobs:
     brew:
       runs-on: ubuntu-24.04
       steps:
         - uses: actions/checkout@v7
         - uses: noonyuu/cdd-bio@v1
   ```

3. Actions タブで **Caffeine meter** を開き、**Run workflow** で一度動かします。

画像は `output` ブランチに置かれ、README の目印の間に `<picture>` が入ります。

### 3D 版（WebP）

three.js で描いたガラスのマグを、4 秒ループのアニメーション WebP にしたものです（約 400KB、生成は数分）。

1. Settings → Pages で、Source を **GitHub Actions** にします。
2. README に目印を置きます（SVG 版と同じ）。
3. `.github/workflows/caffeine-meter.yml` を作ります。

   ```yaml
   name: Caffeine meter
   on:
     schedule:
       - cron: "23 */3 * * *" # 3時間ごと
     workflow_dispatch:
   concurrency:
     group: caffeine-meter
     cancel-in-progress: false
   jobs:
     brew:
       runs-on: ubuntu-24.04
       permissions:
         contents: write
         pages: write
         id-token: write
       environment:
         name: github-pages
         url: ${{ steps.meter.outputs.page_url }}
       steps:
         - uses: actions/checkout@v7
         - uses: noonyuu/cdd-bio@v1
           id: meter
           with:
             format: webp
   ```

4. Actions タブで **Run workflow** を一度動かします。

WebP は Pages から配信します。`raw.githubusercontent.com` は `.webp` を画像として返さない（`application/octet-stream` になる）ためです。
そのリポジトリの Pages は、このメーターの画像の配信に使われます。

### 入力

| 名前             | 既定値                         | 説明                                                                           |
| ---------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| `format`         | `svg`                          | `svg` か `webp`                                                                |
| `username`       | リポジトリの持ち主             | contribution を数える GitHub ユーザー名                                        |
| `readme_path`    | `README.md`                    | 目印の間に画像を差し込む README。空にすると README は書き換えない              |
| `output_branch`  | `output`                       | `svg` のときに画像を置くブランチ                                               |
| `keepalive`      | `true`                         | 50 日コミットがなければ空のコミットを入れて、GitHub が定期実行を止めるのを防ぐ |
| `commit_message` | `chore: update caffeine meter` | README を更新したときのコミットメッセージ                                      |
| `gh_token`       | `github.token`                 | contribution の取得と画像の push に使うトークン                                |

### 出力

| 名前        | 説明                          |
| ----------- | ----------------------------- |
| `light_url` | ライトテーマ用の画像の URL    |
| `dark_url`  | ダークテーマ用の画像の URL    |
| `page_url`  | `webp` のときの Pages の URL  |

### 注意

- GitHub が用意する Ubuntu ランナーで動かしてください。3D 版はランナーに入っている Google Chrome を使います。`ubuntu-latest` は 2026 年 11 月に新しい Ubuntu へ切り替わる予定なので、例では `ubuntu-24.04` に固定しています。
- ランナーの Node.js（22 以上）で動きます。前のステップで古い Node.js に切り替えている場合は動きません。
- private リポジトリでの contribution も数えたい場合は、GitHub のプロフィール設定で **Private contributions** を表示する設定にしてください。
- README の更新でコミットが入るのは、初回と `format` を変えたときだけです（画像の URL は毎回同じなので）。

## しくみ

直近 7 日の合計を、過去 1 年の「7 日間」すべての合計と比べて段階を決めます。
上限を固定していないので、普段どれくらい書いているかに合わせて目盛りが勝手に調整されます。

| 段階           | 条件                | マグ                                                   |
| -------------- | ------------------- | ------------------------------------------------------ |
| カフェイン枯渇 | 直近 7 日が 0 杯    | 空のグラス                                             |
| 低カフェイン   | 過去 1 年の下位 25% | 底に少し                                               |
| 適量           | 25〜60%             | 半分くらい                                             |
| カフェイン過多 | 60〜90%             | なみなみ。表面の揺れが大きくなる                       |
| 致死量寸前     | 上位 10%            | 縁から盛り上がってあふれ、筋になって垂れ、マグが震える |

段階はマグの見た目だけで表します。テキストは直近 7 日の杯数、曜日ごとの棒グラフ、連続摂取日数（今日がまだ 0 杯なら昨日まで）、直近 1 年の合計です。

3D 版は `src/3d/card.html`（three.js のマグ + HTML のテキスト）をヘッドレス Chrome で 80 枚撮影し、`sharp` でアニメーション WebP にまとめています。
動きはすべてループ 1 周の周期関数になっているので、最後のフレームが最初のフレームに継ぎ目なくつながります。

## ローカルで動かす

3D 版の撮影には Google Chrome が必要です。

```bash
pnpm install
pnpm test                                                                 # テスト
GITHUB_TOKEN=$(gh auth token) node src/render3d.mjs --user <ユーザー名>   # 実データで dist/ に WebP を書き出す
node src/render3d.mjs --mock overdose --theme dark --frames              # ダミーデータで書き出し、フレームの PNG も残す
node src/render3d.mjs --mock overdose --swiftshader                      # CI と同じ CPU 描画で時間を測る
GITHUB_TOKEN=$(gh auth token) node src/generate.mjs --user <ユーザー名>   # SVG 版を書き出す
pnpm run preview                                                          # SVG 版の全段階を dist/preview.html に並べる
```

3D 版をブラウザでループ再生しながら調整するときは、プロジェクト直下を静的サーバーで配信して
`/src/3d/card.html?scenario=overdose&theme=dark` を開きます（`scenario` は `empty` / `low` / `normal` / `high` / `overdose` / `spike`）。
