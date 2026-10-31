// 使う人の README の目印コメントの間に、メーター画像の <picture> を差し込む。

export const START_MARKER = "<!-- CAFFEINE-METER:START -->";
export const END_MARKER = "<!-- CAFFEINE-METER:END -->";

const attribute = (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;");

/** ライト / ダークを GitHub のテーマ設定に合わせて切り替える。 */
export function pictureSnippet({ light, dark }) {
  return [
    "<picture>",
    `  <source media="(prefers-color-scheme: dark)" srcset="${attribute(dark)}">`,
    `  <img alt="カフェインメーター" width="600" src="${attribute(light)}">`,
    "</picture>",
  ].join("\n");
}

/** 最初の目印の組の中身を snippet に置き換える。何度実行しても結果は同じ。 */
export function injectSnippet(readme, snippet) {
  const start = readme.indexOf(START_MARKER);
  const end = start === -1 ? -1 : readme.indexOf(END_MARKER, start);
  if (start === -1 || end === -1) {
    throw new Error(`README に ${START_MARKER} と ${END_MARKER} の行を置いてください（この間に画像が入ります）`);
  }
  return `${readme.slice(0, start + START_MARKER.length)}\n${snippet}\n${readme.slice(end)}`;
}
