import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { SCENARIOS } from "../src/mock.mjs";
import { computeStats, percentileOf, streakOf, tierFor } from "../src/stats.mjs";

const day = (count, index = 0) => ({ date: `2026-01-${String(index + 1).padStart(2, "0")}`, weekday: index % 7, count });
const daysOf = (counts) => counts.map((count, index) => day(count, index));

describe("percentileOf", () => {
  test("同値は半分だけ数える", () => {
    assert.equal(percentileOf(5, [1, 5, 9, 10]), 0.375);
  });

  test("サンプルが無ければ 0", () => {
    assert.equal(percentileOf(5, []), 0);
  });
});

describe("tierFor", () => {
  test("7日間ゼロなら分布に関係なく枯渇", () => {
    assert.equal(tierFor(0, 0.9), "empty");
  });

  test("パーセンタイルで段階が上がる", () => {
    assert.deepEqual(
      [0.1, 0.3, 0.7, 0.95].map((percentile) => tierFor(10, percentile)),
      ["low", "normal", "high", "overdose"],
    );
  });
});

describe("streakOf", () => {
  test("今日がまだ0杯なら昨日から数える", () => {
    assert.equal(streakOf(daysOf([0, 3, 2, 1, 0])), 3);
  });

  test("今日飲んでいれば今日も数える", () => {
    assert.equal(streakOf(daysOf([0, 3, 2, 1, 4])), 4);
  });

  test("昨日も0杯なら0日", () => {
    assert.equal(streakOf(daysOf([3, 2, 0, 0])), 0);
  });
});

describe("computeStats", () => {
  test("直近7日だけを合計する", () => {
    const stats = computeStats(daysOf([100, 1, 1, 1, 1, 1, 1, 1]));
    assert.equal(stats.weekTotal, 7);
    assert.equal(stats.week.length, 7);
  });

  test("API の年間合計があればそれを使う", () => {
    assert.equal(computeStats(daysOf([1, 2, 3]), { yearTotal: 999 }).yearTotal, 999);
  });

  test("ダミーデータは名前どおりの段階になる", () => {
    for (const name of ["empty", "low", "normal", "high", "overdose"]) {
      assert.equal(computeStats(SCENARIOS[name]).tier, name, name);
    }
  });

  test("1日だけ突出した週でも満杯を超えない", () => {
    const stats = computeStats(SCENARIOS.spike);
    assert.equal(stats.tier, "overdose");
    assert.equal(stats.fillLevel, 1);
  });

  test("段階が上がるほど水位が上がる", () => {
    const levels = ["empty", "low", "normal", "high", "overdose"].map((name) => computeStats(SCENARIOS[name]).fillLevel);
    assert.deepEqual(
      levels,
      [...levels].sort((a, b) => a - b),
    );
  });
});
