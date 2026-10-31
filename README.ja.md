# Caffeine Meter

[English](README.md) | 日本語

GitHub の contribution を、ガラスのマグに注いだコーヒーとしてプロフィール README に表示します。
contribution 1 件を 1 杯と数えて、直近 7 日の量をマグに注ぎます。

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://noonyuu.github.io/cdd-bio/caffeine-dark.webp">
  <img alt="カフェインメーター" width="600" src="https://noonyuu.github.io/cdd-bio/caffeine-light.webp">
</picture>

## 使い方

### SVG 版（設定なし）

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
     push: # このファイルをコミットしたときに初回が動く
       branches: [main]
       paths: [.github/workflows/caffeine-meter.yml]
   permissions:
     contents: write
   jobs:
     brew:
       runs-on: ubuntu-24.04
       steps:
         - uses: actions/checkout@v7
         - uses: noonyuu/cdd-bio@v1
   ```

3. コミットして push します。初回が自動で動き、以降は 3 時間ごとに更新されます。

### 3D 版（アニメーション WebP）

1. Settings → Pages で、Source を **GitHub Actions** にします。push より先に済ませてください。
2. README に目印を置きます（SVG 版と同じ）。
3. `.github/workflows/caffeine-meter.yml` を作ります。

   ```yaml
   name: Caffeine meter
   on:
     schedule:
       - cron: "23 */3 * * *" # 3時間ごと
     workflow_dispatch:
     push: # このファイルをコミットしたときに初回が動く
       branches: [main]
       paths: [.github/workflows/caffeine-meter.yml]
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

4. コミットして push します。

## 入力

| 名前             | 既定値                         | 説明                                                                           |
| ---------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| `format`         | `svg`                          | `svg` か `webp`                                                                |
| `username`       | リポジトリの持ち主             | contribution を数える GitHub ユーザー名                                        |
| `readme_path`    | `README.md`                    | 目印の間に画像を差し込む README。空にすると README は書き換えない              |
| `output_branch`  | `output`                       | SVG 版の画像を置くブランチ                                                     |
| `keepalive`      | `true`                         | 50 日コミットがなければ空のコミットを入れて、GitHub が定期実行を止めるのを防ぐ |
| `commit_message` | `chore: update caffeine meter` | README を更新したときのコミットメッセージ                                      |
| `gh_token`       | `github.token`                 | contribution の取得と画像の push に使うトークン                                |

## 注意

- GitHub が用意する Ubuntu ランナーで動かしてください。3D 版はランナーに入っている Google Chrome を使います。
- デフォルトブランチが `main` 以外の場合は、ワークフローの `branches` を替えてください。
- private リポジトリでの contribution も数えたい場合は、プロフィール設定で **Private contributions** を表示する設定にしてください。

## ライセンス

[MIT](LICENSE)
