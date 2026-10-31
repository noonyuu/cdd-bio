import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { cremaCanvas } from "./textures.js";

const TAU = Math.PI * 2;

const MUG = { radius: 1, innerRadius: 0.93, height: 2.15, floor: 0.22 };
const LIQUID_RADIUS = MUG.innerRadius - 0.004;
const SAUCER_TOP = 0.1;
const SURFACE_RINGS = 22;
const SURFACE_SEGMENTS = 96;

export const SCENE_THEMES = {
  light: {
    background: "#fffaf3",
    saucer: "#f6efe6",
    shadowOpacity: 0.18,
    environment: 1.0,
    keyLight: 2.4,
    exposure: 1.0,
  },
  dark: {
    background: "#17120f",
    saucer: "#2c241f",
    shadowOpacity: 0.55,
    environment: 0.6,
    keyLight: 2.6,
    exposure: 1.05,
  },
};

/** 段階が上がるほど液面が大きく揺れる。 */
const WAVE_AMPLITUDE = { empty: 0, low: 0.008, normal: 0.012, high: 0.018, overdose: 0.026 };

// ---------- ジオメトリ ----------

function mugProfile() {
  const { radius: outer, innerRadius: inner, height, floor } = MUG;
  const points = [];
  const push = (x, y) => {
    const last = points.at(-1);
    if (!last || Math.hypot(last.x - x, last.y - y) > 1e-5) points.push(new THREE.Vector2(x, y));
  };
  const arc = (cx, cy, radius, from, to, steps) => {
    for (let step = 0; step <= steps; step += 1) {
      const angle = from + ((to - from) * step) / steps;
      push(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
    }
  };

  push(0, 0);
  arc(outer - 0.14, 0.14, 0.14, -Math.PI / 2, 0, 8);
  const lip = (outer - inner) / 2;
  arc(outer - lip, height - lip, lip, 0, Math.PI, 12);
  arc(inner - 0.12, floor + 0.12, 0.12, 0, -Math.PI / 2, 8);
  push(0, floor);
  return points;
}

function saucerProfile() {
  const points = [
    [0, 0.0],
    [0.95, 0.0],
    [1.15, 0.02],
    [1.5, 0.11],
    [1.62, 0.16],
    [1.64, 0.185],
    [1.6, 0.2],
    [1.48, 0.165],
    [1.32, 0.118],
    [1.22, SAUCER_TOP],
    [0, SAUCER_TOP],
  ];
  return points.map(([x, y]) => new THREE.Vector2(x, y));
}

const HANDLE_RADIUS = 0.095;

/** 取っ手。両端は壁に埋め、球でふさいで切り口が見えないようにする。 */
function createHandle(material) {
  const { radius, height } = MUG;
  const curve = new THREE.CubicBezierCurve3(new THREE.Vector3(radius - 0.04, height * 0.8, 0), new THREE.Vector3(radius + 0.95, height * 0.86, 0), new THREE.Vector3(radius + 0.95, height * 0.2, 0), new THREE.Vector3(radius - 0.04, height * 0.26, 0));
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, HANDLE_RADIUS, 20, false), material));
  for (const end of [curve.v0, curve.v3]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(HANDLE_RADIUS, 24, 16), material);
    cap.position.copy(end);
    group.add(cap);
  }
  return group;
}

/** 液面 */
function surfaceGeometry() {
  const positions = [0, 0, 0];
  const uvs = [0.5, 0.5];
  for (let ring = 1; ring <= SURFACE_RINGS; ring += 1) {
    const radius = (LIQUID_RADIUS * ring) / SURFACE_RINGS;
    for (let segment = 0; segment < SURFACE_SEGMENTS; segment += 1) {
      const angle = (segment / SURFACE_SEGMENTS) * TAU;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      positions.push(x, 0, z);
      uvs.push(0.5 + x / (2 * LIQUID_RADIUS), 0.5 - z / (2 * LIQUID_RADIUS));
    }
  }
  const indices = [];
  const at = (ring, segment) => 1 + (ring - 1) * SURFACE_SEGMENTS + (segment % SURFACE_SEGMENTS);
  for (let segment = 0; segment < SURFACE_SEGMENTS; segment += 1) indices.push(0, at(1, segment + 1), at(1, segment));
  for (let ring = 1; ring < SURFACE_RINGS; ring += 1) {
    for (let segment = 0; segment < SURFACE_SEGMENTS; segment += 1) {
      const a = at(ring, segment);
      const b = at(ring, segment + 1);
      const c = at(ring + 1, segment);
      const d = at(ring + 1, segment + 1);
      indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

/**
 * 液体の側面。下の2段は固定、上の3段は液面の波に追従させる。
 * 頂点カラーで上端だけクレマ色にして、泡の層の厚みを出す。
 */
const SIDE_ROWS = [
  { offset: null, radius: LIQUID_RADIUS - 0.11, color: "#24130a" },
  { offset: null, radius: LIQUID_RADIUS, color: "#2a160b" },
  { offset: -0.1, radius: LIQUID_RADIUS, color: "#3a1f0f" },
  { offset: -0.045, radius: LIQUID_RADIUS, color: "#8a5530" },
  { offset: 0, radius: LIQUID_RADIUS, color: "#c48b55" },
];

function sideGeometry() {
  const positions = [];
  const colors = [];
  for (const row of SIDE_ROWS) {
    const color = new THREE.Color(row.color);
    for (let segment = 0; segment <= SURFACE_SEGMENTS; segment += 1) {
      const angle = (segment / SURFACE_SEGMENTS) * TAU;
      positions.push(Math.cos(angle) * row.radius, 0, Math.sin(angle) * row.radius);
      colors.push(color.r, color.g, color.b);
    }
  }
  const indices = [];
  const stride = SURFACE_SEGMENTS + 1;
  for (let row = 0; row < SIDE_ROWS.length - 1; row += 1) {
    for (let segment = 0; segment < SURFACE_SEGMENTS; segment += 1) {
      const a = row * stride + segment;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  return geometry;
}

// ---------- 液体 ----------

function liquidLevel(stats) {
  if (stats.tier === "overdose") return MUG.height - 0.01;
  const bottom = MUG.floor + 0.08;
  const top = MUG.height - 0.2;
  return bottom + stats.fillLevel * (top - bottom);
}

function createLiquid(stats) {
  const level = liquidLevel(stats);
  const overflowing = stats.tier === "overdose";
  const bulge = overflowing ? 0.07 : 0;

  const crema = new THREE.CanvasTexture(cremaCanvas());
  crema.colorSpace = THREE.SRGBColorSpace;
  crema.anisotropy = 4;

  const surface = new THREE.Mesh(surfaceGeometry(), new THREE.MeshPhysicalMaterial({ map: crema, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.3 }));
  const side = new THREE.Mesh(sideGeometry(), new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.22, clearcoat: 0.5 }));
  surface.castShadow = true;
  side.castShadow = true;
  // あふれているときは液面を縁の外まで広げて、縁を覆う盛り上がりにする
  const spread = overflowing ? (MUG.radius + 0.025) / LIQUID_RADIUS : 1;
  surface.scale.set(spread, 1, spread);

  const height = (x, z, phase) => {
    const r2 = Math.min(1, (x * x + z * z) / LIQUID_RADIUS ** 2);
    const ripple = Math.sin(3.1 * x + TAU * phase) * 0.55 + Math.sin(2.4 * z - TAU * 2 * phase + 1.3) * 0.35 + Math.sin(7.5 * Math.sqrt(r2) - TAU * 3 * phase) * 0.3 * (1 - r2);
    const edgeDrop = overflowing ? -0.06 * r2 ** 6 : 0;
    return level + WAVE_AMPLITUDE[stats.tier] * ripple * (1 - r2 * 0.6) + bulge * (1 - r2) + edgeDrop;
  };

  const update = (phase) => {
    const surfacePositions = surface.geometry.attributes.position;
    for (let index = 0; index < surfacePositions.count; index += 1) {
      surfacePositions.setY(index, height(surfacePositions.getX(index), surfacePositions.getZ(index), phase));
    }
    surfacePositions.needsUpdate = true;
    surface.geometry.computeVertexNormals();

    const sidePositions = side.geometry.attributes.position;
    const stride = SURFACE_SEGMENTS + 1;
    SIDE_ROWS.forEach((row, rowIndex) => {
      for (let segment = 0; segment < stride; segment += 1) {
        const index = rowIndex * stride + segment;
        const x = sidePositions.getX(index);
        const z = sidePositions.getZ(index);
        let y;
        if (rowIndex === 0) y = MUG.floor + 0.002;
        else if (rowIndex === 1) y = Math.min(MUG.floor + 0.12, level - 0.12);
        else y = height(x, z, phase) + row.offset;
        sidePositions.setY(index, y);
      }
    });
    sidePositions.needsUpdate = true;
    side.geometry.computeVertexNormals();
  };

  const group = new THREE.Group();
  group.add(surface, side);
  return { group, update };
}

/** 飲み干したあとの輪じみ。 */
function createResidue() {
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 96), new THREE.MeshStandardMaterial({ color: "#5a321a", transparent: true, opacity: 0.35, roughness: 0.6, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = MUG.floor + 0.003;
  return ring;
}

// ---------- あふれ ----------

const COFFEE_GLOSS = () => new THREE.MeshPhysicalMaterial({ color: "#4a2410", roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04 });

/** 上が太く下で細くなる筋。TubeGeometry の各リングを中心に向かって縮める。 */
function taperedTube(path, startRadius, endRadius) {
  const tubular = 48;
  const radial = 12;
  const geometry = new THREE.TubeGeometry(path, tubular, 1, radial, false);
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let ring = 0; ring <= tubular; ring += 1) {
    const t = ring / tubular;
    const center = path.getPointAt(t);
    const radius = startRadius + (endRadius - startRadius) * t ** 0.7;
    for (let side = 0; side <= radial; side += 1) {
      const index = ring * (radial + 1) + side;
      vertex.fromBufferAttribute(positions, index).sub(center).multiplyScalar(radius).add(center);
      positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** マグの外側を伝う筋と、そこから落ちるしずく。角度はマグ座標（0 が手前）。 */
const RUNS = [
  { angle: -0.8, length: 0.85, dropOffset: 0 },
  { angle: 0.05, length: 1.5, dropOffset: 0.37 },
  { angle: 0.75, length: 0.5, dropOffset: 0.71 },
];

function onWall(angle, y, inset = 0) {
  const radius = MUG.radius + 0.018 - inset;
  return new THREE.Vector3(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
}

function createSpill() {
  const material = COFFEE_GLOSS();
  const group = new THREE.Group();

  const drops = RUNS.map((run) => {
    const points = [];
    for (let step = 0; step <= 12; step += 1) {
      const t = step / 12;
      const wobble = Math.sin(t * 5 + run.angle * 3) * 0.025;
      points.push(onWall(run.angle + wobble, MUG.height + 0.01 - t * run.length));
    }
    const path = new THREE.CatmullRomCurve3(points);
    group.add(new THREE.Mesh(taperedTube(path, 0.075, 0.03), material));

    const end = points.at(-1);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.038, 20, 14), material);
    bead.position.copy(end);
    bead.scale.set(1, 1.5, 0.8);
    group.add(bead);

    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.036, 20, 14), material);
    group.add(drop);
    return { run, drop, start: end };
  });

  const update = (phase) => {
    for (const { run, drop, start } of drops) {
      const local = (phase * 2 + run.dropOffset) % 1;
      const fall = local ** 2.2;
      const bottom = 0.04;
      drop.position.set(start.x * 1.02, start.y - (start.y - bottom) * fall, start.z * 1.02);
      const visible = local < 0.92;
      drop.visible = visible;
      drop.scale.set(1, 1 + fall * 1.6, 1);
    }
  };

  return { group, update };
}

function createPuddle() {
  const shape = new THREE.Shape();
  for (let step = 0; step <= 128; step += 1) {
    const angle = (step / 128) * TAU;
    const radius = 1.12 + Math.sin(angle * 3 + 0.4) * 0.05 + Math.sin(angle * 7 + 1.1) * 0.025;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (step === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  // 平面だとソフトボックスを強く映して赤っぽく光るので、液だれより暗く、少し鈍くする
  const puddle = new THREE.Mesh(new THREE.ShapeGeometry(shape, 64), new THREE.MeshPhysicalMaterial({ color: "#2a1408", roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.2 }));
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.y = SAUCER_TOP + 0.004;
  puddle.receiveShadow = true;
  return puddle;
}

// ---------- 環境光 ----------

/** RoomEnvironment に縦長のソフトボックスを足す。円筒のガラスに縦の映り込みが入り、輪郭が立つ。 */
function studioEnvironment(renderer) {
  const room = new RoomEnvironment();
  const softbox = (width, height, intensity, x, y, z) => {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.97, 0.93).multiplyScalar(intensity), side: THREE.DoubleSide }));
    panel.position.set(x, y, z);
    panel.lookAt(0, y, 0);
    room.add(panel);
  };
  softbox(1.2, 9, 14, -6.5, 2, 6);
  softbox(0.8, 9, 8, 6.5, 2, 3.5);
  softbox(6, 1.2, 5, 0, 9, 2);
  return new THREE.PMREMGenerator(renderer).fromScene(room, 0.03).texture;
}

// ---------- シーン ----------

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ stats: any, theme: "light" | "dark", width: number, height: number, pixelRatio: number, mugCenterX: number }} options
 */
export function createCaffeineScene(canvas, { stats, theme: themeName, width, height, pixelRatio, mugCenterX }) {
  const theme = SCENE_THEMES[themeName];

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = theme.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(theme.background);
  scene.environment = studioEnvironment(renderer);
  scene.environmentIntensity = theme.environment;

  const camera = new THREE.PerspectiveCamera(25, width / height, 0.1, 100);
  camera.position.set(0, 5.3, 10.4);
  camera.lookAt(0, 1.05, 0);
  // マグをカード左側に置くため、投影の中心だけ横にずらす（パースは正面のまま）
  camera.setViewOffset(width, height, width / 2 - mugCenterX, 0, width, height);

  const key = new THREE.DirectionalLight("#fff4e6", theme.keyLight);
  key.position.set(-4, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -3;
  key.shadow.radius = 6;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  const rim = new THREE.DirectionalLight("#ffe2c4", theme.keyLight * 0.6);
  rim.position.set(5, 4, -6);
  scene.add(key, rim);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.ShadowMaterial({ opacity: theme.shadowOpacity }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const saucer = new THREE.Mesh(new THREE.LatheGeometry(saucerProfile(), 128), new THREE.MeshPhysicalMaterial({ color: theme.saucer, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.15 }));
  saucer.castShadow = true;
  saucer.receiveShadow = true;
  scene.add(saucer);

  const glass = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    roughness: 0.03,
    transmission: 1,
    thickness: 0.18,
    ior: 1.5,
    specularIntensity: 1,
    clearcoat: 0.4,
    clearcoatRoughness: 0.05,
    attenuationColor: new THREE.Color("#eef7f6"),
    attenuationDistance: 3,
  });

  // マグ一式（揺れ・震えはこのグループごと）
  const mug = new THREE.Group();
  mug.position.y = SAUCER_TOP;
  mug.add(new THREE.Mesh(new THREE.LatheGeometry(mugProfile(), 128), glass));
  // 細い取っ手は厚みを大きく取ると屈折で背景ばかり拾って乳白色に見えるので、薄く設定する
  const handleGlass = glass.clone();
  handleGlass.thickness = 0.05;
  mug.add(createHandle(handleGlass));
  scene.add(mug);

  const updaters = [];
  if (stats.tier === "empty") {
    mug.add(createResidue());
  } else {
    const liquid = createLiquid(stats);
    mug.add(liquid.group);
    updaters.push(liquid.update);
  }
  if (stats.tier === "overdose") {
    const spill = createSpill();
    mug.add(spill.group);
    scene.add(createPuddle());
    updaters.push(spill.update);
  }

  // 取っ手の付け根がコーヒーの手前に来ると屈折で背景を拾って白く欠けるので、取っ手は少し奥へ向ける
  const baseYaw = 0.4;
  const renderAt = (phase) => {
    mug.rotation.y = baseYaw + Math.sin(phase * TAU) * 0.22;
    if (stats.tier === "overdose") {
      // ループの頭で一度だけ小刻みに震える
      const envelope = phase < 0.22 ? Math.sin((Math.PI * phase) / 0.22) ** 2 : 0;
      mug.rotation.z = Math.sin(phase * TAU * 14) * 0.022 * envelope;
    }
    for (const update of updaters) update(phase);
    renderer.render(scene, camera);
  };

  return { renderAt, renderer };
}
