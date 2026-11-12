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

type Cell = { x: number; z: number; h: number; color: Color; delay: number };

const FAINT = new Color("#d5deee");
const INK = new Color("#04182b");
const BRAND = new Color("#2563eb");
const GAP = 1.2;
const INTRO = 0.9;

// Une année de séances : 7 jours de large, les semaines qui s'éloignent.
function yearCells(): Cell[] {
  let seed = 5;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const cells: Cell[] = [];
  for (let week = 0; week < 18; week++) {
    for (let day = 0; day < 7; day++) {
      const session = day < 5 && rand() < 0.36;
      const accent = session && rand() < 0.3;
      cells.push({
        x: day - 3,
        z: 8.5 - week,
        h: session ? 0.7 + rand() * 1.5 : 0.24,
        color: accent ? BRAND : session ? INK : FAINT,
        delay: week * 0.07 + day * 0.02,
      });
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
        h: step < 0 ? 0.3 : 0.8 + step * 0.55,
        color: step === 2 ? BRAND : step < 0 ? FAINT : INK,
        delay: step < 0 ? (col + row) * 0.05 : 0.35 + step * 0.22,
      });
    }
  }
  return cells;
}

const VIEWS = {
  year: {
    size: 6.7,
    eye: new Vector3(-9, 9.5, 13),
    target: new Vector3(0.4, 0, -1),
  },
  logo: {
    size: 2.4,
    eye: new Vector3(7, 7.5, 9),
    target: new Vector3(0, 0.5, 0),
  },
};

export function mount(host: HTMLElement, variant: Variant) {
  const cells = variant === "year" ? yearCells() : logoCells();
  const view = VIEWS[variant];
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.domElement.style.cssText = "display:block;width:100%;height:100%";
  host.append(renderer.domElement);

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
    // Garde la trame entière visible, en portrait comme en paysage.
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

  function draw() {
    const t = start ? (performance.now() - start) / 1000 : 0;
    cells.forEach((cell, i) => {
      const p = still ? 1 : Math.min(1, Math.max(0, (t - cell.delay) / INTRO));
      const eased = 1 - (1 - p) ** 3;
      const reach = pointerOn
        ? Math.hypot(cell.x * GAP - pointer.x, cell.z * GAP - pointer.z)
        : 99;
      lifts[i] += (Math.max(0, 1 - reach / 2.4) * 0.9 - lifts[i]) * 0.12;
      const height = Math.max(0.001, cell.h * eased + lifts[i] * eased);
      dummy.position.set(cell.x * GAP, height / 2, cell.z * GAP);
      dummy.scale.set(1, height, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (variant === "logo" && !still) {
      mesh.rotation.y = Math.sin(t * 0.4) * 0.22;
    }
    renderer.render(scene, camera);
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
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
