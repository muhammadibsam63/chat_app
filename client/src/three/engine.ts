import * as THREE from 'three';

/**
 * Shared WebGL plumbing for every OMEGA scene.
 * Handles: renderer setup, responsive sizing, off-screen pausing, reduced-motion
 * static rendering, pointer raycasting, and complete resource disposal.
 */

export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function webglSupported(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

export type SceneContext = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  pointer: THREE.Vector2;
  reduced: boolean;
  /** 0 before the host enters the viewport, 1 once it has fully scrolled past. */
  scroll: () => number;
  /** 1 on desktop, reduced on narrow/mobile viewports. */
  quality: number;
};

export type SceneInstance = {
  update?: (elapsed: number, delta: number) => void;
  /** Objects that respond to pointer selection. */
  targets?: () => THREE.Object3D[];
  setActive?: (index: number) => void;
  dispose?: () => void;
};

export type SceneController = {
  dispose: () => void;
  setActive: (index: number) => void;
  supported: boolean;
};

const NOOP_CONTROLLER: SceneController = {
  dispose: () => undefined,
  setActive: () => undefined,
  supported: false,
};

/** Compiles a shader pair standalone so UI can report real compile status. */
export function probeShader(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  vertexSrc: string,
  fragmentSrc: string,
): { ok: boolean; log: string } {
  const build = (type: number, src: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) ?? 'unknown shader error';
      gl.deleteShader(shader);
      return { error: log };
    }
    return { shader };
  };

  const v = build(gl.VERTEX_SHADER, vertexSrc);
  if (!v || 'error' in v) return { ok: false, log: v && 'error' in v ? v.error : 'vertex compile failed' };
  const f = build(gl.FRAGMENT_SHADER, fragmentSrc);
  if (!f || 'error' in f) {
    gl.deleteShader(v.shader);
    return { ok: false, log: f && 'error' in f ? f.error : 'fragment compile failed' };
  }
  const program = gl.createProgram();
  if (!program) return { ok: false, log: 'program allocation failed' };
  gl.attachShader(program, v.shader);
  gl.attachShader(program, f.shader);
  gl.linkProgram(program);
  const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  const log = linked ? '' : gl.getProgramInfoLog(program) ?? 'link failed';
  gl.deleteProgram(program);
  gl.deleteShader(v.shader);
  gl.deleteShader(f.shader);
  return { ok: Boolean(linked), log };
}

/** Procedural gold studio environment so metals reflect designed light, not flat grey. */
export function studioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const g = canvas.getContext('2d');

  if (!g) {
    const fallback = new THREE.DataTexture(new Uint8Array([8, 8, 8, 255]), 1, 1);
    fallback.needsUpdate = true;
    return fallback;
  }

  g.fillStyle = '#050505';
  g.fillRect(0, 0, 512, 256);

  const key = g.createRadialGradient(130, 58, 0, 130, 58, 200);
  key.addColorStop(0, 'rgba(255,214,0,0.98)');
  key.addColorStop(0.45, 'rgba(214,173,69,0.34)');
  key.addColorStop(1, 'rgba(255,214,0,0)');
  g.fillStyle = key;
  g.fillRect(0, 0, 512, 256);

  const fill = g.createRadialGradient(392, 178, 0, 392, 178, 168);
  fill.addColorStop(0, 'rgba(255,240,163,0.62)');
  fill.addColorStop(1, 'rgba(255,240,163,0)');
  g.fillStyle = fill;
  g.fillRect(0, 0, 512, 256);

  const strip = g.createLinearGradient(0, 0, 0, 256);
  strip.addColorStop(0, 'rgba(255,255,255,0.16)');
  strip.addColorStop(0.42, 'rgba(255,255,255,0)');
  g.fillStyle = strip;
  g.fillRect(0, 0, 512, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromEquirectangular(tex).texture;
    pmrem.dispose();
    tex.dispose();
    return env;
  } catch {
    return tex;
  }
}

function disposeScene(scene: THREE.Scene): void {
  const seen = new Set<unknown>();
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry && !seen.has(mesh.geometry)) {
      seen.add(mesh.geometry);
      mesh.geometry.dispose();
    }
    const material = (mesh as unknown as { material?: THREE.Material | THREE.Material[] }).material;
    const list = Array.isArray(material) ? material : material ? [material] : [];
    list.forEach((mat) => {
      if (seen.has(mat)) return;
      seen.add(mat);
      Object.values(mat as unknown as Record<string, unknown>).forEach((value) => {
        if (value instanceof THREE.Texture && !seen.has(value)) {
          seen.add(value);
          value.dispose();
        }
      });
      mat.dispose();
    });
  });
  scene.clear();
}

export function mountScene(
  canvas: HTMLCanvasElement,
  host: HTMLElement,
  factory: (ctx: SceneContext) => SceneInstance,
  options: { onClick?: (object: THREE.Object3D) => void; cameraFov?: number } = {},
): SceneController {
  if (!webglSupported()) {
    host.setAttribute('data-scene', 'fallback');
    return NOOP_CONTROLLER;
  }

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch {
    host.setAttribute('data-scene', 'fallback');
    return NOOP_CONTROLLER;
  }

  const reduced = prefersReducedMotion();
  const narrow = window.matchMedia('(max-width: 900px)').matches;
  const quality = narrow ? 0.55 : 1;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, narrow ? 1.6 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(options.cameraFov ?? 42, 1, 0.1, 80);
  const pointer = new THREE.Vector2(0, 0);

  const resize = () => {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();

  const scroll = () => {
    const rect = host.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const span = rect.height + vh;
    const p = 1 - (rect.top + rect.height) / span;
    return Math.min(1, Math.max(0, p));
  };

  const ctx: SceneContext = { renderer, scene, camera, pointer, reduced, scroll, quality };

  let instance: SceneInstance;
  try {
    instance = factory(ctx);
  } catch {
    host.setAttribute('data-scene', 'fallback');
    renderer.dispose();
    return NOOP_CONTROLLER;
  }

  const raycaster = new THREE.Raycaster();
  const track = (event: PointerEvent) => {
    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -(((event.clientY - rect.top) / rect.height) * 2 - 1),
    );
  };

  const handlePointer = (event: PointerEvent) => {
    if (!instance.targets || !options.onClick) return;
    track(event);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(instance.targets(), false);
    if (hits.length > 0) options.onClick(hits[0].object);
  };

  const handleMove = (event: PointerEvent) => {
    if (!instance.targets) return;
    track(event);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(instance.targets(), false);
    canvas.style.cursor = hits.length > 0 && options.onClick ? 'pointer' : 'default';
  };

  host.addEventListener('pointermove', handleMove, { passive: true });
  canvas.addEventListener('pointerdown', handlePointer);

  let frameId = 0;
  let visible = true;
  const clock = new THREE.Clock();
  const started = performance.now();

  const frame = () => {
    frameId = requestAnimationFrame(frame);
    const delta = Math.min(clock.getDelta(), 0.05);
    if (!visible || document.hidden) return;
    const elapsed = (performance.now() - started) / 1000;
    instance.update?.(elapsed, delta);
    renderer.render(scene, camera);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
    },
    { rootMargin: '140px' },
  );
  observer.observe(host);

  const resizer = new ResizeObserver(() => resize());
  resizer.observe(host);

  if (reduced) {
    instance.update?.(0, 0);
    renderer.render(scene, camera);
    host.setAttribute('data-scene', 'reduced');
  } else {
    frame();
    host.setAttribute('data-scene', 'ready');
  }

  return {
    supported: true,
    setActive: (index: number) => instance.setActive?.(index),
    dispose: () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      resizer.disconnect();
      host.removeEventListener('pointermove', handleMove);
      canvas.removeEventListener('pointerdown', handlePointer);
      instance.dispose?.();
      disposeScene(scene);
      renderer.dispose();
      host.setAttribute('data-scene', 'disposed');
    },
  };
}
