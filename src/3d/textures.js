function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const smooth = (t) => t * t * (3 - 2 * t);

const OCTAVES = [
  { cells: 4, weight: 0.5 },
  { cells: 8, weight: 0.27 },
  { cells: 16, weight: 0.15 },
  { cells: 32, weight: 0.08 },
];

/** 上下左右につながる fBm ノイズ（0〜1）。クレマのまだら模様に使う。 */
function tileableNoise(size, seed) {
  const random = seededRandom(seed);
  const octaves = OCTAVES.map((octave) => ({ ...octave, grid: Float32Array.from({ length: octave.cells ** 2 }, random) }));

  const values = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let value = 0;
      for (const { cells, weight, grid } of octaves) {
        const gx = (x / size) * cells;
        const gy = (y / size) * cells;
        const x0 = Math.floor(gx);
        const y0 = Math.floor(gy);
        const tx = smooth(gx - x0);
        const ty = smooth(gy - y0);
        const at = (cx, cy) => grid[(cy % cells) * cells + (cx % cells)];
        const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
        const bottom = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
        value += (top * (1 - ty) + bottom * ty) * weight;
      }
      values[y * size + x] = value;
    }
  }
  return values;
}

function canvasOf(size, paint) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  paint(canvas.getContext("2d"), size);
  return canvas;
}

/** 上から見たクレマ。縁が濃く、中心が明るく、細かい泡とまだら模様が入る。 */
export function cremaCanvas(size = 512, seed = 11) {
  const random = seededRandom(seed);
  const mottling = tileableNoise(128, seed + 1);
  return canvasOf(size, (context) => {
    const center = size / 2;
    const gradient = context.createRadialGradient(center * 0.92, center * 0.9, 0, center, center, center);
    gradient.addColorStop(0, "#c99560");
    gradient.addColorStop(0.55, "#a96f3d");
    gradient.addColorStop(0.86, "#7b4623");
    gradient.addColorStop(1, "#552c13");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    // まだら（タイガーストライプ）
    const image = context.getImageData(0, 0, size, size);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const value = mottling[((y >> 2) % 128) * 128 + ((x >> 2) % 128)];
        const shade = (value - 0.5) * 46;
        const index = (y * size + x) * 4;
        image.data[index] += shade;
        image.data[index + 1] += shade * 0.8;
        image.data[index + 2] += shade * 0.55;
      }
    }
    context.putImageData(image, 0, 0);

    // 細かい泡
    for (let index = 0; index < 900; index += 1) {
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * center * 0.97;
      const radius = 0.6 + random() ** 3 * 3.2;
      context.beginPath();
      context.arc(center + Math.cos(angle) * distance, center + Math.sin(angle) * distance, radius, 0, Math.PI * 2);
      context.fillStyle = `rgba(255, 236, 205, ${0.12 + random() * 0.3})`;
      context.fill();
    }
  });
}
