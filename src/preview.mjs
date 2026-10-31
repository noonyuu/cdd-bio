import { mkdir, writeFile } from "node:fs/promises";
import { SCENARIOS } from "./mock.mjs";
import { renderSvg } from "./render.mjs";
import { computeStats } from "./stats.mjs";

const OUT_DIR = new URL("../dist/", import.meta.url);

const rows = Object.entries(SCENARIOS).map(([name, days]) => {
  const stats = computeStats(days);
  const cell = (theme) =>
    `<div class="cell ${theme}"><img src="data:image/svg+xml;base64,${Buffer.from(renderSvg(stats, theme)).toString("base64")}"></div>`;
  return `<section><h2>${name}</h2><div class="row">${cell("light")}${cell("dark")}</div></section>`;
});

const html = `<!doctype html>
<meta charset="utf-8">
<title>caffeine meter preview</title>
<style>
  body { margin: 24px; font-family: -apple-system, sans-serif; background: #f6f8fa; }
  h2 { font-size: 14px; margin: 24px 0 8px; }
  .row { display: flex; gap: 16px; flex-wrap: wrap; }
  .cell { padding: 16px; border-radius: 8px; }
  .cell.light { background: #ffffff; }
  .cell.dark { background: #0d1117; }
  img { display: block; }
</style>
${rows.join("\n")}
`;

await mkdir(OUT_DIR, { recursive: true });
await writeFile(new URL("preview.html", OUT_DIR), html);
console.log("dist/preview.html を書き出しました");
