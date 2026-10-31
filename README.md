# Caffeine Meter

English | [日本語](README.ja.md)

Shows your GitHub contributions as coffee in a glass mug on your profile README.
One contribution is one cup, and the mug fills up with your last 7 days.

<!-- CAFFEINE-METER:START -->
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://noonyuu.github.io/cdd-bio/caffeine-dark.webp">
  <img alt="カフェインメーター" width="600" src="https://noonyuu.github.io/cdd-bio/caffeine-light.webp">
</picture>
<!-- CAFFEINE-METER:END -->

## Usage

### SVG (no setup)

1. In your profile README (the `<username>/<username>` repository), add these markers where the image should appear.

   ```markdown
   <!-- CAFFEINE-METER:START -->
   <!-- CAFFEINE-METER:END -->
   ```

2. Create `.github/workflows/caffeine-meter.yml`.

   ```yaml
   name: Caffeine meter
   on:
     schedule:
       - cron: "23 */3 * * *" # every 3 hours
     workflow_dispatch:
     push: # runs once when you commit this file
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

3. Commit and push. The first run starts automatically, then it updates every 3 hours.

### 3D (animated WebP)

1. In Settings → Pages, set Source to **GitHub Actions**. Do this before you push.
2. Add the markers to your README (same as above).
3. Create `.github/workflows/caffeine-meter.yml`.

   ```yaml
   name: Caffeine meter
   on:
     schedule:
       - cron: "23 */3 * * *" # every 3 hours
     workflow_dispatch:
     push: # runs once when you commit this file
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

4. Commit and push.

## Inputs

| Name             | Default                        | Description                                                                         |
| ---------------- | ------------------------------ | ----------------------------------------------------------------------------------- |
| `format`         | `svg`                          | `svg` or `webp`                                                                     |
| `username`       | Repository owner               | GitHub user whose contributions are counted                                         |
| `readme_path`    | `README.md`                    | README to update between the markers. Leave empty to skip                           |
| `output_branch`  | `output`                       | Branch for the SVG images                                                           |
| `keepalive`      | `true`                         | Adds an empty commit after 50 days without commits, so GitHub keeps the schedule on |
| `commit_message` | `chore: update caffeine meter` | Commit message for README updates                                                   |
| `gh_token`       | `github.token`                 | Token for fetching contributions and pushing images                                 |

## Notes

- Run it on a GitHub-hosted Ubuntu runner. The 3D version uses the Google Chrome that comes with it.
- If your default branch is not `main`, change `branches` in the workflow.
- To count contributions in private repositories, turn on **Private contributions** in your profile settings.
- The labels in the image are in Japanese.

## License

[MIT](LICENSE)
