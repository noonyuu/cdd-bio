import { THEMES } from "./themes.mjs";

const WIDTH = 600;
const HEIGHT = 256;
const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
const FONT_STACK = `-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Yu Gothic", Meiryo, sans-serif`;

// マグ（ガラス製なので中身が見える）の形
const MUG_OUTLINE = "M58 78 H172 V180 Q172 200 152 200 H78 Q58 200 58 180 Z";
const MUG_INSIDE_TOP = 80;
const MUG_INSIDE_BOTTOM = 194;
const LIQUID_MAX_TOP = 88;
const mugInside = (top) => `M64 ${top} H166 V178 Q166 194 150 194 H80 Q64 194 64 178 Z`;

// 波は1波長ぶん横に流してループさせる。中身の幅 (64〜166) を常に覆う長さにしておく。
const WAVELENGTH = 49;
const WAVE_START_X = 64 - WAVELENGTH;
const WAVE_HALVES = 8;

const PANEL_X = 250;
const PANEL_RIGHT = 576;

const numberFormat = new Intl.NumberFormat("en-US");

export function escapeXml(text) {
  return String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function wavePath(amplitude) {
  const half = WAVELENGTH / 2;
  let path = `M${WAVE_START_X} 0 Q${WAVE_START_X + half / 2} ${-amplitude} ${WAVE_START_X + half} 0`;
  for (let index = 2; index <= WAVE_HALVES; index += 1) {
    path += ` T${WAVE_START_X + half * index} 0`;
  }
  return `${path} V130 H${WAVE_START_X} Z`;
}

function liquidTop(stats) {
  if (stats.tier === "overdose") return MUG_INSIDE_TOP - 4;
  return MUG_INSIDE_BOTTOM - stats.fillLevel * (MUG_INSIDE_BOTTOM - LIQUID_MAX_TOP);
}

function renderLiquid(stats) {
  if (stats.tier === "empty") {
    // 飲み干したあとの輪じみ
    return `<ellipse cx="115" cy="189" rx="40" ry="3" class="residue"/>`;
  }
  const top = liquidTop(stats).toFixed(1);
  return `
    <g clip-path="url(#mug-inside)">
      <g transform="translate(0 ${top})">
        <path d="${wavePath(3.5)}" class="crema anim wave-back"/>
      </g>
      <g transform="translate(0 ${(Number(top) + 5).toFixed(1)})">
        <path d="${wavePath(3)}" class="coffee anim wave-front"/>
      </g>
    </g>`;
}

const STEAM_COUNT = { empty: 0, low: 1, normal: 2, high: 3, overdose: 3 };
const STEAM_XS = [[], [115], [101, 129], [92, 115, 138]];

function renderSteam(stats) {
  return STEAM_XS[STEAM_COUNT[stats.tier]]
    .map(
      (x, index) => `
    <g transform="translate(${x} 68)">
      <path d="M0 0 c-7 -8 7 -14 0 -22 s7 -14 0 -22" class="steam anim" style="animation-delay:${(-index * 0.9).toFixed(1)}s"/>
    </g>`,
    )
    .join("");
}

function renderSleep(stats) {
  if (stats.tier !== "empty") return "";
  const letters = [
    { x: 136, y: 66, size: 13 },
    { x: 146, y: 52, size: 16 },
    { x: 158, y: 36, size: 20 },
  ];
  return letters.map((letter, index) => `<text x="${letter.x}" y="${letter.y}" font-size="${letter.size}" class="zzz anim" style="animation-delay:${(index * 0.7).toFixed(1)}s">z</text>`).join("");
}

function renderSpill(stats) {
  if (stats.tier !== "overdose") return { behind: "", front: "" };
  const drop = "M0 0 C3 5 5 8 5 11 A5 5 0 0 1 -5 11 C-5 8 -3 5 0 0 Z";
  return {
    behind: `<ellipse cx="115" cy="203" rx="70" ry="5" class="puddle"/>`,
    front: `
    <path d="M60 79 q-6 12 -1 30" class="run"/>
    <path d="M170 79 q6 18 1 44" class="run"/>
    <g transform="translate(57 104)"><path d="${drop}" class="coffee anim drip"/></g>
    <g transform="translate(173 118)"><path d="${drop}" class="coffee anim drip" style="animation-delay:-0.8s"/></g>`,
  };
}

function renderMug(stats) {
  const spill = renderSpill(stats);
  const shakeClass = stats.tier === "overdose" ? "anim shake" : "";
  return `
  <ellipse cx="115" cy="203" rx="78" ry="9" class="saucer"/>
  ${spill.behind}
  <g class="${shakeClass}">
    <path d="M172 100 C212 100 212 168 172 168" class="handle-outline"/>
    <path d="M172 100 C212 100 212 168 172 168" class="handle-inner"/>
    <path d="${MUG_OUTLINE}" class="glass"/>
    ${renderLiquid(stats)}
    <rect x="72" y="92" width="7" height="84" rx="3.5" class="shine"/>
    <rect x="84" y="92" width="3" height="36" rx="1.5" class="shine"/>
    <path d="${MUG_OUTLINE}" class="mug-outline"/>
    ${spill.front}
  </g>
  ${renderSteam(stats)}
  ${renderSleep(stats)}
  <text x="115" y="236" text-anchor="middle" class="small">直近1年 ${numberFormat.format(stats.yearTotal)}杯</text>`;
}

function renderBars(stats) {
  const slot = (PANEL_RIGHT - PANEL_X) / stats.week.length;
  const barWidth = 26;
  const base = 214;
  const maxHeight = 66;
  const max = Math.max(1, ...stats.week.map((day) => day.count));
  return stats.week
    .map((day, index) => {
      const isToday = index === stats.week.length - 1;
      const height = Math.max(2, (day.count / max) * maxHeight);
      const x = PANEL_X + index * slot + (slot - barWidth) / 2;
      const center = x + barWidth / 2;
      return `
    <rect x="${x.toFixed(1)}" y="${(base - height).toFixed(1)}" width="${barWidth}" height="${height.toFixed(1)}" rx="4" class="bar anim ${isToday ? "bar-today" : ""}" style="animation-delay:${(index * 0.08).toFixed(2)}s"/>
    <text x="${center.toFixed(1)}" y="${(base - height - 5).toFixed(1)}" text-anchor="middle" class="tiny">${numberFormat.format(day.count)}</text>
    <text x="${center.toFixed(1)}" y="230" text-anchor="middle" class="${isToday ? "day day-today" : "day"}">${isToday ? "今日" : WEEKDAY_LABELS[day.weekday]}</text>`;
    })
    .join("");
}

function renderPanel(stats) {
  const streak = stats.streak > 0 ? `${stats.streak}日連続摂取` : "連続記録なし";
  return `
  <text x="${PANEL_X}" y="44" class="title">CAFFEINE METER</text>
  <text x="${PANEL_RIGHT}" y="44" text-anchor="end" class="meta">${streak}</text>
  <text x="${PANEL_X - 2}" y="96" class="ink"><tspan class="big">${numberFormat.format(stats.weekTotal)}</tspan><tspan dx="6" class="unit">杯</tspan><tspan dx="10" class="caption">/ 直近7日</tspan></text>
  ${renderBars(stats)}`;
}

function renderStyle(stats, theme) {
  const fast = stats.tier === "overdose";
  return `
  <style>
    text { font-family: ${FONT_STACK}; }
    .card { fill: ${theme.background}; stroke: ${theme.border}; }
    .ink, .big, .unit { fill: ${theme.ink}; }
    .big { font-size: 46px; font-weight: 800; letter-spacing: -1px; }
    .unit { font-size: 20px; font-weight: 700; }
    .caption { font-size: 13px; fill: ${theme.sub}; }
    .title { font-size: 12px; font-weight: 700; letter-spacing: 3px; fill: ${theme.sub}; }
    .meta { font-size: 12px; font-weight: 600; fill: ${theme.ink}; }
    .small { font-size: 12px; fill: ${theme.sub}; }
    .tiny { font-size: 10px; fill: ${theme.sub}; }
    .day { font-size: 11px; fill: ${theme.sub}; }
    .day-today { fill: ${theme.ink}; font-weight: 700; }
    .bar { fill: ${theme.bar}; transform-box: fill-box; transform-origin: 50% 100%; animation: grow 0.6s cubic-bezier(.2,.8,.2,1) both; }
    .bar-today { fill: ${theme.barToday}; }
    .saucer { fill: ${theme.saucer}; stroke: ${theme.ink}; stroke-width: 2; }
    .glass { fill: ${theme.glass}; fill-opacity: ${theme.glassOpacity}; }
    .mug-outline { fill: none; stroke: ${theme.ink}; stroke-width: 3; stroke-linejoin: round; }
    .handle-outline { fill: none; stroke: ${theme.ink}; stroke-width: 13; }
    .handle-inner { fill: none; stroke: ${theme.background}; stroke-width: 7; }
    .shine { fill: #ffffff; fill-opacity: ${theme.shineOpacity}; }
    .crema { fill: ${theme.crema}; }
    .coffee { fill: url(#coffee-gradient); }
    .residue { fill: ${theme.coffee}; fill-opacity: 0.35; }
    .puddle { fill: ${theme.coffee}; fill-opacity: 0.85; }
    .run { fill: none; stroke: ${theme.coffee}; stroke-width: 5; stroke-linecap: round; }
    .steam { fill: none; stroke: ${theme.steam}; stroke-width: 4; stroke-linecap: round; opacity: 0.6;
             animation: steam ${fast ? 1.4 : 2.7}s ease-in-out infinite; }
    .zzz { fill: ${theme.sub}; font-weight: 700; animation: doze 2.1s ease-in-out infinite; }
    .wave-back { animation: wave 3.2s linear infinite reverse; }
    .wave-front { animation: wave 2.4s linear infinite; }
    .drip { animation: drip 1.6s ease-in infinite; }
    .shake { transform-origin: 115px 200px; animation: shake 2.4s ease-in-out infinite; }

    @keyframes wave { to { transform: translateX(${WAVELENGTH}px); } }
    @keyframes steam {
      0% { opacity: 0; transform: translateY(8px); }
      35% { opacity: 0.85; }
      100% { opacity: 0; transform: translateY(-12px); }
    }
    @keyframes doze {
      0% { opacity: 0; transform: translate(0, 4px); }
      40% { opacity: 1; }
      100% { opacity: 0; transform: translate(8px, -10px); }
    }
    @keyframes drip {
      0% { opacity: 0; transform: translateY(-14px) scale(0.4); }
      20% { opacity: 1; transform: translateY(-10px) scale(1); }
      85% { opacity: 1; transform: translateY(82px); }
      100% { opacity: 0; transform: translateY(86px); }
    }
    @keyframes shake {
      0%, 24%, 100% { transform: rotate(0deg); }
      4%, 12%, 20% { transform: rotate(-1.6deg); }
      8%, 16% { transform: rotate(1.6deg); }
    }
    @keyframes grow { from { transform: scaleY(0); } }
    @media (prefers-reduced-motion: reduce) { .anim { animation: none !important; } }
  </style>`;
}

/**
 * @param {ReturnType<import("./stats.mjs").computeStats>} stats
 * @param {"light" | "dark"} themeName
 */
export function renderSvg(stats, themeName = "light") {
  const theme = THEMES[themeName];
  const summary = `カフェインメーター: 直近7日で ${numberFormat.format(stats.weekTotal)}杯`;
  const insideTop = stats.tier === "overdose" ? MUG_INSIDE_TOP - 8 : MUG_INSIDE_TOP;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="${escapeXml(summary)}">
  <title>${escapeXml(summary)}</title>
  <defs>
    <clipPath id="mug-inside"><path d="${mugInside(insideTop)}"/></clipPath>
    <linearGradient id="coffee-gradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${theme.coffee}"/>
      <stop offset="1" stop-color="${theme.coffeeDeep}"/>
    </linearGradient>
  </defs>
  ${renderStyle(stats, theme)}
  <rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${HEIGHT - 1}" rx="14" class="card"/>
  ${renderMug(stats)}
  ${renderPanel(stats)}
</svg>
`;
}
