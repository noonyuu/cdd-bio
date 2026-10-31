// node src/update-readme.mjs --file README.md --light <URL> --dark <URL>
// 中身が変わったときだけ書き込み、変わったかどうかを "changed" / "unchanged" で出力する。

import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { injectSnippet, pictureSnippet } from "./readme.mjs";

const { values } = parseArgs({
  options: { file: { type: "string" }, light: { type: "string" }, dark: { type: "string" } },
});
if (!values.file || !values.light || !values.dark) throw new Error("--file と --light と --dark を指定してください");

const before = await readFile(values.file, "utf8");
let after;
try {
  after = injectSnippet(before, pictureSnippet(values));
} catch (error) {
  // Actions のログで注釈として目立つ形で出す
  console.error(`::error file=${values.file}::${error.message}`);
  process.exit(1);
}
if (after !== before) await writeFile(values.file, after);
console.log(after === before ? "unchanged" : "changed");
