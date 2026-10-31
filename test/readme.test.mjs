import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { END_MARKER, START_MARKER, injectSnippet, pictureSnippet } from "../src/readme.mjs";

const urls = { light: "https://example.com/light.svg", dark: "https://example.com/dark.svg" };
const readme = `# Hi\n\n${START_MARKER}\n${END_MARKER}\n\n## About\n`;

describe("injectSnippet", () => {
  test("目印の間に画像が入り、前後はそのまま", () => {
    const result = injectSnippet(readme, pictureSnippet(urls));
    assert.ok(result.startsWith(`# Hi\n\n${START_MARKER}\n<picture>`));
    assert.ok(result.endsWith(`</picture>\n${END_MARKER}\n\n## About\n`));
    assert.match(result, /srcset="https:\/\/example\.com\/dark\.svg"/);
    assert.match(result, /src="https:\/\/example\.com\/light\.svg"/);
  });

  test("何度実行しても同じ結果になる（毎回コミットされない）", () => {
    const once = injectSnippet(readme, pictureSnippet(urls));
    assert.equal(injectSnippet(once, pictureSnippet(urls)), once);
  });

  test("目印の中に前回の内容があっても置き換える", () => {
    const old = injectSnippet(readme, pictureSnippet({ light: "old-light", dark: "old-dark" }));
    const result = injectSnippet(old, pictureSnippet(urls));
    assert.doesNotMatch(result, /old-/);
  });

  test("目印がなければ置き方を案内して止まる", () => {
    assert.throws(() => injectSnippet("# Hi\n", "x"), /CAFFEINE-METER:START/);
    assert.throws(() => injectSnippet(`${END_MARKER}\n${START_MARKER}\n`, "x"), /CAFFEINE-METER:END/);
  });
});

test("URL に含まれる記号は属性用にエスケープする", () => {
  assert.match(pictureSnippet({ light: 'a"b&c', dark: "d" }), /src="a&quot;b&amp;c"/);
});
