import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { fetchCalendar } from "./github.mjs";
import { SCENARIOS } from "./mock.mjs";
import { computeStats } from "./stats.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const OUT_DIR = join(ROOT, "dist");
const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
};

const { values: options } = parseArgs({
  options: {
    user: { type: "string" },
    mock: { type: "string" },
    theme: { type: "string", default: "both" },
    fps: { type: "string", default: "20" },
    seconds: { type: "string", default: "4" },
    quality: { type: "string", default: "80" },
    frames: { type: "boolean", default: false },
    swiftshader: { type: "boolean", default: false },
  },
});

async function loadStats() {
  if (options.mock) {
    const days = SCENARIOS[options.mock];
    if (!days) throw new Error(`--mock は ${Object.keys(SCENARIOS).join(" / ")} のどれかを指定してください`);
    return computeStats(days);
  }
  const token = process.env.GITHUB_TOKEN;
  if (!token || !options.user) throw new Error("環境変数 GITHUB_TOKEN と --user <GitHubユーザー名> を指定してください");
  const { days, totalContributions } = await fetchCalendar(options.user, token);
  return computeStats(days, { yearTotal: totalContributions });
}

/** プロジェクト直下を配信するだけの静的サーバー（card.html が node_modules の three.js とフォントを読む）。 */
function startServer() {
  const server = createServer(async (request, response) => {
    const path = normalize(decodeURIComponent(new URL(request.url, "http://localhost").pathname));
    const file = join(ROOT, path);
    if (!file.startsWith(ROOT + sep)) return response.writeHead(403).end();
    try {
      const body = await readFile(file);
      response.writeHead(200, { "Content-Type": CONTENT_TYPES[extname(file)] ?? "application/octet-stream" });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

async function captureTheme(browser, baseUrl, stats, theme) {
  const context = await browser.newContext({ viewport: { width: 640, height: 300 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  page.on("pageerror", (error) => console.error(`[${theme}] page error: ${error.message}`));
  await page.goto(`${baseUrl}/src/3d/card.html`);
  await page.waitForFunction(() => window.cdd);

  const { renderer, fonts } = await page.evaluate((setupOptions) => window.cdd.setup(setupOptions), { stats, theme });
  console.log(`[${theme}] WebGL: ${renderer}`);
  console.log(`[${theme}] fonts: ${fonts.join(" / ")}`);

  const fps = Number(options.fps);
  const frameCount = Math.round(fps * Number(options.seconds));
  const card = page.locator("#card");
  const frames = [];
  const started = performance.now();
  for (let index = 0; index < frameCount; index += 1) {
    await page.evaluate((phase) => window.cdd.renderAt(phase), index / frameCount);
    frames.push(await card.screenshot({ omitBackground: true }));
  }
  const captureMs = performance.now() - started;
  await context.close();

  if (options.frames) {
    const framesDir = join(OUT_DIR, "frames", theme);
    await rm(framesDir, { recursive: true, force: true });
    await mkdir(framesDir, { recursive: true });
    await Promise.all(frames.map((frame, index) => writeFile(join(framesDir, `${String(index).padStart(3, "0")}.png`), frame)));
  }

  const encodeStarted = performance.now();
  const webp = await sharp(frames, { join: { animated: true } })
    .webp({
      loop: 0,
      delay: Array(frameCount).fill(Math.round(1000 / fps)),
      quality: Number(options.quality),
      effort: 6,
      smartSubsample: true,
    })
    .toBuffer();
  const encodeMs = performance.now() - encodeStarted;
  await writeFile(join(OUT_DIR, `caffeine-${theme}.webp`), webp);

  console.log(`[${theme}] ${frameCount} frames: 撮影 ${(captureMs / 1000).toFixed(1)}s (${(captureMs / frameCount).toFixed(0)}ms/frame), ` + `エンコード ${(encodeMs / 1000).toFixed(1)}s, ${(webp.length / 1024).toFixed(0)}KB`);
}

const stats = await loadStats();
console.log(`直近7日 ${stats.weekTotal}杯 → ${stats.tier}`);
await mkdir(OUT_DIR, { recursive: true });

const server = await startServer();
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  channel: "chrome",
  args: options.swiftshader ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] : [],
});
try {
  const themes = options.theme === "both" ? ["light", "dark"] : [options.theme];
  for (const theme of themes) await captureTheme(browser, baseUrl, stats, theme);
} finally {
  await browser.close();
  server.close();
}
