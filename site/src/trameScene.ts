import {
  AmbientLight,
  Color,
  DirectionalLight,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  OrthographicCamera,
  Plane,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export type Variant = "cycle" | "logo";
export type SceneLabels = { days: string[]; cycle: string };

type Cell = {
  x: number;
  z: number;
  y: number;
  h: number;
  sx: number;
  sz: number;
  color: Color;
  delay: number;
  week: number;
  lifts: boolean;
};
type Tag = { el: HTMLElement; at: Vector3; week: number };

const FAINT = new Color("#d5deee");
const PLATE = new Color("#edf1f8");
const INK = new Color("#04182b");
const BRAND = new Color("#2563eb");
// Les couleurs de séance du planning de l'application.
const GREEN = new Color("#a6cf52");
const SKY = new Color("#8cc6ea");
const PINK = new Color("#ee86b4");
const ORANGE = new Color("#f0a43c");

const SLOT = 1.2;
const DAYS = 5;
const SLOTS = 2;
const PER_CYCLE = 3;
const WEEKS = PER_CYCLE * 2;
const PITCH = SLOTS * SLOT + 1.1;
const CYCLE_GAP = 1.7;
const INTRO = 0.9;
const LIFT = 0.7;

// Les trois semaines du cycle. Clé « jour-créneau ».
const CYCLE: Record<string, Color>[] = [
  {
    "0-0": GREEN,
    "0-1": SKY,
    "1-0": ORANGE,
    "2-1": SKY,
    "3-0": GREEN,
    "3-1": PINK,
    "4-0": GREEN,
  },
  {
    "0-0": GREEN,
    "1-0": SKY,
    "1-1": PINK,
    "2-0": ORANGE,
    "3-1": SKY,
    "4-0": GREEN,
    "4-1": BRAND,
  },
  {
    "0-1": SKY,
    "1-0": GREEN,
    "2-0": GREEN,
    "2-1": PINK,
    "3-0": ORANGE,
    "4-1": SKY,
  },
];

const offset = (week: number) =>
  week * PITCH + Math.floor(week / PER_CYCLE) * CYCLE_GAP;
const weekZ = (week: number) => offset(WEEKS - 1) / 2 - offset(week);
// Une semaine du second cycle part de la semaine qu'elle recopie.
const startZ = (week: number) =>
  weekZ(week < PER_CYCLE ? week : week - PER_CYCLE);

function cycleCells(): Cell[] {
  const cells: Cell[] = [];
  for (let week = 0; week < WEEKS; week++) {
    const base = { week, sx: 1, sz: 1, y: 0, lifts: true };
    cells.push({
      ...base,
      x: 0,
      z: weekZ(week),
      y: -0.1,
      h: 0.1,
      sx: DAYS * SLOT + 0.3,
      sz: SLOTS * SLOT + 0.3,
      color: PLATE,
      delay: 0,
      lifts: false,
    });
    for (let day = 0; day < DAYS; day++) {
      for (let slot = 0; slot < SLOTS; slot++) {
        const session = CYCLE[week % PER_CYCLE][`${day}-${slot}`];
        cells.push({
          ...base,
          x: (day - (DAYS - 1) / 2) * SLOT,
          z: weekZ(week) + (slot - (SLOTS - 1) / 2) * SLOT,
          h: session ? 0.42 : 0.08,
          color: session ?? FAINT,
          delay: 0.15 + day * 0.06 + slot * 0.08,
        });
      }
    }
  }
  return cells;
}

// Le logo : neuf cubes, la diagonale qui monte jusqu'au cube bleu.
function logoCells(): Cell[] {
  const cells: Cell[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const step = col + row === 2 ? col : -1;
      cells.push({
        x: col - 1,
        z: row - 1,
        y: 0,
        h: step < 0 ? 0.3 : 0.8 + step * 0.55,
        sx: 1,
        sz: 1,
        color: step === 2 ? BRAND : step < 0 ? FAINT : INK,
        delay: step < 0 ? (col + row) * 0.05 : 0.35 + step * 0.22,
        week: 0,
        lifts: true,
      });
    }
  }
  return cells;
}

const EYES = {
  cycle: new Vector3(6, 12, 9),
  logo: new Vector3(7, 7.5, 9),
};

const ease = (p: number) => 1 - (1 - Math.min(1, Math.max(0, p))) ** 3;

function makeTag(host: HTMLElement, text: string, pill: boolean) {
  const el = document.createElement("span");
  el.textContent = text;
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = `position:absolute;left:0;top:0;pointer-events:none;white-space:nowrap;font-size:0.8rem;line-height:1;color:#566273;transition:opacity .4s;${
    pill
      ? "padding:0.4rem 0.6rem;border:1px solid #e4e8ee;border-radius:0.6rem;background:#fff;color:#04182b;font-weight:500"
      : ""
  }`;
  host.append(el);
  return el;
}

export function mount(
  host: HTMLElement,
  variant: Variant,
  labels?: SceneLabels,
) {
  const cells = variant === "cycle" ? cycleCells() : logoCells();
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
  host.style.position = "relative";
  host.append(renderer.domElement);

  const tags: Tag[] = [];
  if (variant === "cycle" && labels) {
    labels.days.forEach((day, i) => {
      tags.push({
        el: makeTag(host, day, false),
        at: new Vector3(
          (i - (DAYS - 1) / 2) * SLOT,
          0,
          weekZ(0) + (SLOTS * SLOT) / 2 + 0.8,
        ),
        week: 0,
      });
    });
    const side = (DAYS * SLOT) / 2 + 1.5;
    for (const [n, week] of [1, PER_CYCLE + 1].entries()) {
      tags.push({
        el: makeTag(host, `${labels.cycle} ${n + 1}`, true),
        at: new Vector3(side, 0, weekZ(week)),
        week,
      });
    }
  }

  const scene = new Scene();
  scene.add(new AmbientLight(0xffffff, 2.1));
  const sun = new DirectionalLight(0xffffff, 2.4);
  sun.position.set(-4, 10, 6);
  scene.add(sun);

  const geometry = new RoundedBoxGeometry(1, 1, 1, 3, 0.12);
  const material = new MeshStandardMaterial({ roughness: 0.6 });
  const mesh = new InstancedMesh(geometry, material, cells.length);
  cells.forEach((cell, i) => {
    mesh.setColorAt(i, cell.color);
  });
  scene.add(mesh);

  const camera = new OrthographicCamera();
  camera.position.copy(EYES[variant]);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();

  // Emprise de toute la scène vue par la caméra : sert à ne jamais rien couper.
  const box = { minX: 1e9, maxX: -1e9, minY: 1e9, maxY: -1e9 };
  const corner = new Vector3();
  const extend = (x: number, y: number, z: number) => {
    corner.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
    box.minX = Math.min(box.minX, corner.x);
    box.maxX = Math.max(box.maxX, corner.x);
    box.minY = Math.min(box.minY, corner.y);
    box.maxY = Math.max(box.maxY, corner.y);
  };
  for (const cell of cells) {
    for (const dx of [-0.5, 0.5]) {
      for (const dz of [-0.5, 0.5]) {
        const x = cell.x + dx * cell.sx;
        const z = cell.z + dz * cell.sz;
        extend(x, cell.y, z);
        extend(x, cell.y + cell.h + (cell.lifts ? LIFT : 0), z);
      }
    }
  }
  for (const tag of tags) {
    extend(tag.at.x, tag.at.y, tag.at.z);
  }
  // Le logo pivote : on lui laisse de la marge.
  const slack = variant === "logo" ? 1.25 : 1;
  const padX = tags.length ? 56 : 12;
  const padY = 20;

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = host;
    if (!w || !h) {
      return;
    }
    renderer.setSize(w, h, false);
    const perPixel =
      Math.max(
        (box.maxX - box.minX) / Math.max(1, w - 2 * padX),
        (box.maxY - box.minY) / Math.max(1, h - 2 * padY),
      ) * slack;
    const cx = (box.minX + box.maxX) / 2;
    const cy = (box.minY + box.maxY) / 2;
    camera.left = cx - (perPixel * w) / 2;
    camera.right = cx + (perPixel * w) / 2;
    camera.top = cy + (perPixel * h) / 2;
    camera.bottom = cy - (perPixel * h) / 2;
    camera.near = 0.1;
    camera.far = 80;
    camera.updateProjectionMatrix();
    draw();
  };

  const lifts = new Float32Array(cells.length);
  const pointer = new Vector3();
  let pointerOn = false;
  let start = 0;
  const dummy = new Object3D();
  const projected = new Vector3();

  // Le second cycle sort du premier, semaine par semaine.
  const slideOf = (week: number, t: number) =>
    still || week < PER_CYCLE
      ? 1
      : ease((t - 2 - (week - PER_CYCLE) * 0.22) / 0.9);

  function draw() {
    const t = start ? (performance.now() - start) / 1000 : 0;
    cells.forEach((cell, i) => {
      const slide = slideOf(cell.week, t);
      const grow =
        still || cell.week >= PER_CYCLE
          ? slide
          : ease((t - cell.week * 0.35 - cell.delay) / INTRO);
      const z = cell.z + (1 - slide) * (startZ(cell.week) - weekZ(cell.week));
      const reach =
        pointerOn && cell.lifts
          ? Math.hypot(cell.x - pointer.x, z - pointer.z)
          : 99;
      lifts[i] += (Math.max(0, 1 - reach / 2.2) * LIFT - lifts[i]) * 0.12;
      const height = Math.max(0.001, (cell.h + lifts[i]) * grow);
      dummy.position.set(cell.x, cell.y + height / 2, z);
      dummy.scale.set(cell.sx, height, cell.sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (variant === "logo" && !still) {
      mesh.rotation.y = Math.sin(t * 0.4) * 0.22;
    }
    renderer.render(scene, camera);

    for (const tag of tags) {
      const slide = slideOf(tag.week, t);
      projected
        .copy(tag.at)
        .setZ(tag.at.z + (1 - slide) * (startZ(tag.week) - weekZ(tag.week)))
        .project(camera);
      // L'étiquette reste entière dans la scène, même sur un écran étroit.
      const half = tag.el.offsetWidth / 2 + 4;
      const left = Math.min(
        host.clientWidth - half,
        Math.max(half, ((projected.x + 1) / 2) * host.clientWidth),
      );
      const top = ((1 - projected.y) / 2) * host.clientHeight;
      tag.el.style.transform = `translate(${left}px, ${top}px) translate(-50%, -50%)`;
      tag.el.style.opacity = slide > 0.95 && (still || t > 0.9) ? "1" : "0";
    }
  }

  let frame = 0;
  const loop = () => {
    draw();
    frame = requestAnimationFrame(loop);
  };

  const raycaster = new Raycaster();
  const ground = new Plane(new Vector3(0, 1, 0), 0);
  const ndc = new Vector2();
  const onMove = (event: PointerEvent) => {
    const rect = host.getBoundingClientRect();
    ndc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    pointerOn = raycaster.ray.intersectPlane(ground, pointer) !== null;
  };

  const sizes = new ResizeObserver(resize);
  sizes.observe(host);
  // La boucle ne tourne que lorsque la scène est à l'écran.
  const visible = new IntersectionObserver(([entry]) => {
    cancelAnimationFrame(frame);
    if (!entry.isIntersecting) {
      return;
    }
    start ||= performance.now();
    if (still) {
      draw();
    } else {
      loop();
    }
  });
  visible.observe(host);
  if (!still) {
    addEventListener("pointermove", onMove, { passive: true });
  }
  resize();

  return () => {
    cancelAnimationFrame(frame);
    sizes.disconnect();
    visible.disconnect();
    removeEventListener("pointermove", onMove);
    for (const tag of tags) {
      tag.el.remove();
    }
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
