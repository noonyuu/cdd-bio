import { THEMES } from "../themes.mjs";
import { createCaffeineScene } from "./scene.js";

const WIDTH = 600;
const HEIGHT = 256;
const MUG_CENTER_X = 118;
const BAR_MAX_HEIGHT = 66;
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const format = (value) => new Intl.NumberFormat("en-US").format(value);

const $ = (selector) => document.querySelector(selector);

function applyTheme(themeName) {
  const palette = THEMES[themeName];
  const variables = {
    "--ink": palette.ink,
    "--sub": palette.sub,
    "--border": palette.border,
    "--bar": palette.bar,
    "--bar-today": palette.barToday,
  };
  for (const [name, value] of Object.entries(variables)) $("#card").style.setProperty(name, value);
}

function fillPanel(stats) {
  $(".year").innerHTML = `直近1年<b>${format(stats.yearTotal)}</b>杯`;
  $(".streak").innerHTML = stats.streak > 0 ? `<b>${stats.streak}</b>日連続摂取` : "連続記録なし";
  $(".amount").innerHTML = `<span class="number">${format(stats.weekTotal)}</span><span class="unit">杯</span><span class="window">/ 直近7日</span>`;

  const max = Math.max(1, ...stats.week.map((day) => day.count));
  $(".bars").innerHTML = stats.week
    .map((day, index) => {
      const isToday = index === stats.week.length - 1;
      const height = Math.max(2, (day.count / max) * BAR_MAX_HEIGHT);
      return `<li class="${isToday ? "today" : ""}">
        <span class="count">${format(day.count)}</span>
        <span class="fill" style="height:${height.toFixed(1)}px"></span>
        <span class="day">${isToday ? "今日" : WEEKDAYS[day.weekday]}</span>
      </li>`;
    })
    .join("");
}

const FONT_FACES = ['500 12px "Zen Kaku Gothic New"', '700 12px "Zen Kaku Gothic New"', '600 12px "Fraunces Variable"', 'italic 500 12px "Fraunces Variable"'];

async function loadFonts() {
  const text = $("#card").textContent;
  const loaded = await Promise.all(FONT_FACES.map((face) => document.fonts.load(face, text)));
  const missing = FONT_FACES.filter((_, index) => loaded[index].length === 0);
  if (missing.length > 0) throw new Error(`フォントを読み込めませんでした: ${missing.join(", ")}`);
  await document.fonts.ready;
  return loaded.map((faces, index) => `${FONT_FACES[index]} (${faces.length} subsets)`);
}

let scene;

async function setup({ stats, theme, pixelRatio = 2 }) {
  applyTheme(theme);
  fillPanel(stats);
  const fonts = await loadFonts();
  scene = createCaffeineScene($("#scene"), {
    stats,
    theme,
    width: WIDTH,
    height: HEIGHT,
    pixelRatio,
    mugCenterX: MUG_CENTER_X,
  });
  const gl = scene.renderer.getContext();
  const debug = gl.getExtension("WEBGL_debug_renderer_info");
  return { renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), fonts };
}

function renderAt(phase) {
  scene.renderAt(phase);
}

window.cdd = { setup, renderAt };

// ブラウザで開いたときの再生モード
const params = new URLSearchParams(location.search);
if (params.has("scenario")) {
  const [{ SCENARIOS }, { computeStats }] = await Promise.all([import("../mock.mjs"), import("../stats.mjs")]);
  const theme = params.get("theme") ?? "light";
  document.body.style.background = theme === "dark" ? "#0d1117" : "#ffffff";
  document.body.style.padding = "16px";
  await setup({ stats: computeStats(SCENARIOS[params.get("scenario")]), theme, pixelRatio: window.devicePixelRatio });
  const loopSeconds = Number(params.get("loop") ?? 4);
  const tick = (now) => {
    renderAt(((now / 1000) % loopSeconds) / loopSeconds);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
