import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { SCENARIOS } from "../src/mock.mjs";
import { escapeXml, renderSvg } from "../src/render.mjs";
import { computeStats } from "../src/stats.mjs";

const render = (name, theme = "light") => renderSvg(computeStats(SCENARIOS[name]), theme);
const count = (svg, pattern) => svg.match(pattern)?.length ?? 0;

describe("renderSvg", () => {
  test("GitHub の <img> で使えない要素を含まない", () => {
    for (const name of Object.keys(SCENARIOS)) {
      for (const theme of ["light", "dark"]) {
        const svg = render(name, theme);
        assert.doesNotMatch(svg, /<script|<foreignObject|<image|@import|href="http/i, `${name}/${theme}`);
      }
    }
  });

  test("枯渇では湯気もしずくも出ず、寝ている", () => {
    const svg = render("empty");
    assert.equal(count(svg, /class="steam/g), 0);
    assert.equal(count(svg, /class="coffee anim drip"/g), 0);
    assert.equal(count(svg, /class="zzz/g), 3);
  });

  test("湯気の本数は段階に応じて増える", () => {
    assert.deepEqual(
      ["low", "normal", "high"].map((name) => count(render(name), /class="steam/g)),
      [1, 2, 3],
    );
  });

  test("致死量寸前ではあふれて揺れる", () => {
    const svg = render("overdose");
    assert.equal(count(svg, /class="coffee anim drip"/g), 2);
    assert.match(svg, /class="anim shake"/);
  });

  test("ライトとダークで配色が変わる", () => {
    assert.match(render("normal", "light"), /#fffaf3/);
    assert.match(render("normal", "dark"), /#17120f/);
  });

  test("直近7日分の棒が並ぶ", () => {
    assert.equal(count(render("normal"), /class="bar anim/g), 7);
  });
});

describe("helpers", () => {
  test("XML の特殊文字をエスケープする", () => {
    assert.equal(escapeXml(`<a href="x">&</a>`), "&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
  });
});
