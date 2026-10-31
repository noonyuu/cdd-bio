import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { fetchCalendar } from "./github.mjs";
import { SCENARIOS } from "./mock.mjs";
import { renderSvg } from "./render.mjs";
import { computeStats } from "./stats.mjs";

const OUT_DIR = new URL("../dist/", import.meta.url);

async function loadStats({ mock: mockName, user: login }) {
  if (mockName) {
    const days = SCENARIOS[mockName];
    if (!days) throw new Error(`--mock は ${Object.keys(SCENARIOS).join(" / ")} のどれかを指定してください`);
    return computeStats(days);
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token || !login) throw new Error("環境変数 GITHUB_TOKEN と --user <GitHubユーザー名> を指定してください");
  const { days, totalContributions } = await fetchCalendar(login, token);
  return computeStats(days, { yearTotal: totalContributions });
}

const { values } = parseArgs({ options: { mock: { type: "string" }, user: { type: "string" } } });
const stats = await loadStats(values);

await mkdir(OUT_DIR, { recursive: true });
for (const theme of ["light", "dark"]) {
  await writeFile(new URL(`caffeine-${theme}.svg`, OUT_DIR), renderSvg(stats, theme));
}

console.log(`直近7日 ${stats.weekTotal}杯 / 週平均 ${stats.averageWeek.toFixed(1)}杯 / ` + `上位 ${((1 - stats.percentile) * 100).toFixed(1)}% → ${stats.tier} (連続 ${stats.streak}日)`);
