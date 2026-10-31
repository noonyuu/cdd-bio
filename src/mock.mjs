const HISTORY_DAYS = 365;

/** 決定的な疑似乱数（プレビューが毎回同じになるように）。 */
function seededRandom(seed) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

function baselineDays(seed = 42) {
  const random = seededRandom(seed);
  const end = new Date(Date.UTC(2026, 9, 31));
  return Array.from({ length: HISTORY_DAYS }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - (HISTORY_DAYS - 1 - index));
    const weekday = date.getUTCDay();
    const weekend = weekday === 0 || weekday === 6;
    const count = Math.round(random() * (weekend ? 6 : 16));
    return { date: date.toISOString().slice(0, 10), weekday, count };
  });
}

function withLastWeek(counts) {
  const days = baselineDays();
  const offset = days.length - counts.length;
  return days.map((day, index) => (index >= offset ? { ...day, count: counts[index - offset] } : day));
}

export const SCENARIOS = {
  empty: withLastWeek([0, 0, 0, 0, 0, 0, 0]),
  low: withLastWeek([2, 0, 5, 3, 0, 4, 1]),
  normal: withLastWeek([6, 9, 2, 11, 8, 3, 7]),
  high: withLastWeek([10, 4, 12, 8, 11, 4, 7]),
  overdose: withLastWeek([18, 25, 12, 30, 22, 16, 27]),
  spike: withLastWeek([7, 2, 177, 69, 7, 2, 0]),
};
