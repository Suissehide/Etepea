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

export type Variant = "year" | "logo";
export type SceneLabels = { days: string[]; template: string; closed: string };

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
const WEEK_DEPTH = 3 * SLOT + 1.1;
const WEEKS = 5;
const CLOSED = 3;
const INTRO = 0.9;

// La semaine type : 5 jours, 3 créneaux. Clé « jour-créneau ».
const SESSIONS: Record<string, Color> = {
  "0-0": GREEN,
  "0-1": SKY,
  "1-0": ORANGE,
  "1-2": PINK,
  "2-1": SKY,
  "3-0": GREEN,
  "3-1": SKY,
  "3-2": PINK,
  "4-0": GREEN,
  "4-2": BRAND,
};

const weekZ = (week: number) => ((WEEKS - 1) / 2 - week) * WEEK_DEPTH;

// La semaine type au premier plan, puis ses copies qui s'éloignent : l'année.
function yearCells(): Cell[] {
  const cells: Cell[] = [];
  for (let week = 0; week < WEEKS; week++) {
    const base = { week, sx: 1, sz: 1, y: 0, lifts: true };
    cells.push({
      ...base,
      x: 0,
      z: weekZ(week),
      y: -0.1,
      h: 0.1,
      sx: 5 * SLOT + 0.3,
      sz: 3 * SLOT + 0.3,
      color: PLATE,
      delay: 0,
      lifts: false,
    });
    for (let day = 0; day < 5; day++) {
      for (let slot = 0; slot < 3; slot++) {
        const session =
          week === CLOSED ? undefined : SESSIONS[`${day}-${slot}`];
        cells.push({
          ...base,
          x: (day - 2) * SLOT,
          z: weekZ(week) + (slot - 1) * SLOT,
          h: session ? 0.42 : 0.08,
          color: session ?? FAINT,
          delay: 0.2 + day * 0.07 + slot * 0.1,
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

const VIEWS = {
  year: {
    size: 8.4,
    eye: new Vector3(-9, 9.5, 13),
    target: new Vector3(1.4, 0, 0),
  },
  logo: {
    size: 2.4,
    eye: new Vector3(7, 7.5, 9),
    target: new Vector3(0, 0.5, 0),
  },
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
  const cells = variant === "year" ? yearCells() : logoCells();
  const view = VIEWS[variant];
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
  host.style.position = "relative";
  host.append(renderer.domElement);

  const tags: Tag[] = [];
  if (variant === "year" && labels) {
    const side = 2.5 * SLOT + 1.6;
    labels.days.forEach((day, i) => {
      tags.push({
        el: makeTag(host, day, false),
        at: new Vector3((i - 2) * SLOT, 0, weekZ(0) + 1.5 * SLOT + 0.7),
        week: 0,
      });
    });
    tags.push({
      el: makeTag(host, labels.template, true),
      at: new Vector3(side, 0, weekZ(0) + 0.6),
      week: 0,
    });
    tags.push({
      el: makeTag(host, labels.closed, true),
      at: new Vector3(side, 0, weekZ(CLOSED) + 0.6),
      week: CLOSED,
    });
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
  camera.position.copy(view.eye);
  camera.lookAt(view.target);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = host;
    if (!w || !h) {
      return;
    }
    renderer.setSize(w, h, false);
    // Garde la scène entière visible, en portrait comme en paysage.
    const size = view.size * Math.max(1, (h / w) * 1.15);
    camera.left = (-size * w) / h;
    camera.right = (size * w) / h;
    camera.top = size;
    camera.bottom = -size;
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

  // Les copies de la semaine type partent du premier plan, l'une après l'autre.
  const weekProgress = (week: number, t: number) =>
    still || week === 0 ? 1 : ease((t - 1.1 - (week - 1) * 0.45) / 0.8);

  function draw() {
    const t = start ? (performance.now() - start) / 1000 : 0;
    cells.forEach((cell, i) => {
      const slide = weekProgress(cell.week, t);
      const grow =
        still || cell.week > 0 ? slide : ease((t - cell.delay) / INTRO);
      const z = cell.z + (1 - slide) * cell.week * WEEK_DEPTH;
      const reach =
        pointerOn && cell.lifts
          ? Math.hypot(cell.x - pointer.x, z - pointer.z)
          : 99;
      lifts[i] += (Math.max(0, 1 - reach / 2.2) * 0.7 - lifts[i]) * 0.12;
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
      const slide = weekProgress(tag.week, t);
      projected
        .copy(tag.at)
        .setZ(tag.at.z + (1 - slide) * tag.week * WEEK_DEPTH)
        .project(camera);
      // L'étiquette reste entière dans la scène, même sur un écran étroit.
      const half = tag.el.offsetWidth / 2 + 4;
      const left = Math.min(
        host.clientWidth - half,
        Math.max(half, ((projected.x + 1) / 2) * host.clientWidth),
      );
      const top = ((1 - projected.y) / 2) * host.clientHeight;
      tag.el.style.transform = `translate(${left}px, ${top}px) translate(-50%, -50%)`;
      tag.el.style.opacity = slide > 0.95 && (still || t > 0.6) ? "1" : "0";
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
