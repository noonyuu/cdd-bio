export const WINDOW_DAYS = 7;

/** 直近の値が過去の分布のどこにいるか (0〜1)。同値は半分だけ数える。 */
export function percentileOf(value, samples) {
  if (samples.length === 0) return 0;
  let below = 0;
  let equal = 0;
  for (const sample of samples) {
    if (sample < value) below += 1;
    else if (sample === value) equal += 1;
  }
  return (below + equal / 2) / samples.length;
}

/** @returns {"empty" | "low" | "normal" | "high" | "overdose"} マグの見た目を切り替える段階 */
export function tierFor(weekTotal, percentile) {
  if (weekTotal === 0) return "empty";
  if (percentile < 0.25) return "low";
  if (percentile < 0.6) return "normal";
  if (percentile < 0.9) return "high";
  return "overdose";
}

/** 0〜1。枯渇は空、致死量寸前は縁まで満タン（そこからあふれる）。 */
export function fillLevelFor(tier, percentile) {
  if (tier === "empty") return 0;
  if (tier === "overdose") return 1;
  return 0.15 + 0.8 * percentile;
}

/** 今日がまだ0杯なら今日は数えず、昨日からさかのぼる。 */
export function streakOf(days) {
  let index = days.length - 1;
  if (index >= 0 && days[index].count === 0) index -= 1;
  let streak = 0;
  while (index >= 0 && days[index].count > 0) {
    streak += 1;
    index -= 1;
  }
  return streak;
}

/**
 * @param {{ date: string, weekday: number, count: number }[]} days 古い順のカレンダー
 * @param {{ yearTotal?: number }} [options] GitHub が出す年間合計（プロフィールの数字と揃えたいとき）
 */
export function computeStats(days, { yearTotal } = {}) {
  const windowSums = [];
  let running = 0;
  for (let index = 0; index < days.length; index += 1) {
    running += days[index].count;
    if (index >= WINDOW_DAYS) running -= days[index - WINDOW_DAYS].count;
    if (index >= WINDOW_DAYS - 1) windowSums.push(running);
  }

  const week = days.slice(-WINDOW_DAYS);
  const weekTotal = week.reduce((sum, day) => sum + day.count, 0);
  const percentile = percentileOf(weekTotal, windowSums);
  const averageWeek = windowSums.length === 0 ? 0 : windowSums.reduce((sum, value) => sum + value, 0) / windowSums.length;
  const tier = tierFor(weekTotal, percentile);

  return {
    week,
    weekTotal,
    yearTotal: yearTotal ?? days.reduce((sum, day) => sum + day.count, 0),
    averageWeek,
    percentile,
    tier,
    fillLevel: fillLevelFor(tier, percentile),
    streak: streakOf(days),
  };
}
