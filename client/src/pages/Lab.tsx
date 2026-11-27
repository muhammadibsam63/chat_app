import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Pause, Play, RotateCcw } from 'lucide-react';
import SceneCanvas from '../components/SceneCanvas';
import { PageHeader, Reveal } from '../components/ui';
import { useDocumentMeta, usePrefersReducedMotion } from '../lib/hooks';
import type { SceneContext, SceneInstance } from '../three/engine';

/* ───────────────────────── shared UI ───────────────────────── */

type Control = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
};

function Slider({ label, value, min, max, step = 1, onChange, format }: Control) {
  const id = `ctl-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="lab-control">
      <label htmlFor={id}>
        <span>{label}</span>
        <output>{format ? format(value) : value}</output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function Experiment({
  index,
  title,
  brief,
  children,
  controls,
  onReset,
  footnote,
}: {
  index: string;
  title: string;
  brief: string;
  children: React.ReactNode;
  controls?: React.ReactNode;
  onReset: () => void;
  footnote?: string;
}) {
  return (
    <Reveal as="article" className="lab-card">
      <header className="lab-card-head">
        <span className="lab-index">{index}</span>
        <div>
          <h3>{title}</h3>
          <p>{brief}</p>
        </div>
        <button type="button" className="lab-reset" onClick={onReset}>
          <RotateCcw size={13} aria-hidden /> Reset
        </button>
      </header>
      <div className="lab-stage">{children}</div>
      {controls ? <div className="lab-controls">{controls}</div> : null}
      {footnote ? <p className="lab-note">{footnote}</p> : null}
    </Reveal>
  );
}

/* ───────────────────── A · particle dimension ───────────────────── */

function ParticleDimension() {
  const reduced = usePrefersReducedMotion();
  const [count, setCount] = useState(reduced ? 900 : 2400);
  const [speed, setSpeed] = useState(0.35);
  const [size, setSize] = useState(0.03);
  const cfg = useRef({ speed, size });
  cfg.current = { speed, size };

  const factory = useCallback((ctx: SceneContext): SceneInstance => {
    const { scene, camera, quality } = ctx;
    camera.position.set(0, 0, 4.2);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    const total = Math.round(count * (quality > 0.7 ? 1 : 0.5));
    const positions = new Float32Array(total * 3);
    for (let i = 0; i < total; i += 1) {
      const r = 1.1 + Math.random() * 2.3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffd600,
      size: cfg.current.size,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    return {
      update: (elapsed) => {
        material.size = cfg.current.size;
        points.rotation.y = elapsed * cfg.current.speed;
        points.rotation.x = Math.sin(elapsed * cfg.current.speed * 0.6) * 0.25;
      },
      dispose: () => {
        geometry.dispose();
        material.dispose();
      },
    };
  }, [count]);

  return (
    <Experiment
      index="A"
      title="Particle Dimension"
      brief="Procedural point cloud on a spherical distribution, additive-blended and fully parameterised."
      onReset={() => {
        setCount(reduced ? 900 : 2400);
        setSpeed(0.35);
        setSize(0.03);
      }}
      controls={
        <>
          <Slider label="Density" value={count} min={400} max={6000} step={100} onChange={setCount} />
          <Slider
            label="Speed"
            value={speed}
            min={0}
            max={1.5}
            step={0.05}
            onChange={setSpeed}
            format={(v) => `${v.toFixed(2)}×`}
          />
          <Slider
            label="Point size"
            value={size}
            min={0.008}
            max={0.09}
            step={0.002}
            onChange={setSize}
            format={(v) => v.toFixed(3)}
          />
        </>
      }
    >
      <SceneCanvas label="Particle field" factory={factory} className="lab-canvas" />
    </Experiment>
  );
}

/* ───────────────────── B · liquid metallic ───────────────────── */

const LIQUID_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uDistort;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying float vWave;

  void main() {
    vec3 pos = position;
    float w = sin(pos.x * 2.4 + uTime) * cos(pos.y * 2.1 + uTime * 0.8);
    float w2 = sin(pos.z * 3.1 - uTime * 1.3);
    vWave = (w + w2) * 0.5;
    pos += normal * vWave * uDistort * 0.35;

    vec4 world = modelMatrix * vec4(pos, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const LIQUID_FRAG = /* glsl */ `
  uniform vec3 uGold;
  uniform float uLight;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying float vWave;

  void main() {
    float fresnel = pow(1.0 - clamp(dot(normalize(vNormalW), normalize(vViewDir)), 0.0, 1.0), 2.6);
    vec3 lightDir = normalize(vec3(0.7, 1.0, 0.55));
    float diffuse = clamp(dot(normalize(vNormalW), lightDir), 0.0, 1.0);
    float spec = pow(diffuse, 42.0);

    vec3 base = uGold * (0.16 + diffuse * 0.72);
    vec3 color = base + uGold * fresnel * 0.9 + vec3(1.0, 0.96, 0.78) * spec * 1.25;
    color *= uLight;
    color += uGold * vWave * 0.12;

    gl_FragColor = vec4(color, 1.0);
  }
`;

function LiquidMetallic() {
  const [distort, setDistort] = useState(1);
  const [light, setLight] = useState(1);
  const uniforms = useRef({
    uTime: { value: 0 },
    uDistort: { value: 1 },
    uLight: { value: 1 },
    uGold: { value: new THREE.Color('#ffd600') },
  });
  uniforms.current.uDistort.value = distort;
  uniforms.current.uLight.value = light;

  const factory = useCallback((ctx: SceneContext): SceneInstance => {
    const { scene, camera } = ctx;
    camera.position.set(0, 0, 3.4);

    const geometry = new THREE.IcosahedronGeometry(1.15, 48);
    const material = new THREE.ShaderMaterial({
      vertexShader: LIQUID_VERT,
      fragmentShader: LIQUID_FRAG,
      uniforms: uniforms.current,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    return {
      update: (elapsed) => {
        uniforms.current.uTime.value = elapsed * 0.55;
        mesh.rotation.y = elapsed * 0.16;
        mesh.rotation.x = Math.sin(elapsed * 0.2) * 0.14;
      },
      dispose: () => {
        geometry.dispose();
        material.dispose();
      },
    };
  }, []);

  return (
    <Experiment
      index="B"
      title="Liquid Metallic"
      brief="Custom vertex displacement plus a fresnel-driven fragment shader. Both sliders are shader uniforms, live per frame."
      onReset={() => {
        setDistort(1);
        setLight(1);
      }}
      footnote="Shader compiles at runtime; if a driver rejects it the stage falls back to the static mark instead of throwing."
      controls={
        <>
          <Slider
            label="Distortion"
            value={distort}
            min={0}
            max={3}
            step={0.05}
            onChange={setDistort}
            format={(v) => v.toFixed(2)}
          />
          <Slider
            label="Lighting"
            value={light}
            min={0.2}
            max={2}
            step={0.05}
            onChange={setLight}
            format={(v) => `${v.toFixed(2)}×`}
          />
        </>
      }
    >
      <SceneCanvas label="Liquid metallic shader sphere" factory={factory} className="lab-canvas" />
    </Experiment>
  );
}

/* ───────────────────── C · orbital engine ───────────────────── */

type OrbitMode = 'torus' | 'knot' | 'octa';

function OrbitalEngine() {
  const [speed, setSpeed] = useState(0.5);
  const [rings, setRings] = useState(5);
  const [mode, setMode] = useState<OrbitMode>('torus');
  const cfg = useRef({ speed, rings, mode });
  cfg.current = { speed, rings, mode };

  const factory = useCallback((ctx: SceneContext): SceneInstance => {
    const { scene, camera, renderer } = ctx;
    camera.position.set(0, 0.4, 4.6);
    scene.add(new THREE.AmbientLight(0x222222, 1.4));
    const key = new THREE.DirectionalLight(0xffe08a, 2.6);
    key.position.set(2.5, 3.5, 3.5);
    scene.add(key);

    const group = new THREE.Group();
    scene.add(group);

    const geoms: THREE.BufferGeometry[] = [];
    const mats: THREE.Material[] = [];

    for (let i = 0; i < cfg.current.rings; i += 1) {
      const scale = 0.55 + i * 0.24;
      let geometry: THREE.BufferGeometry;
      if (cfg.current.mode === 'knot') geometry = new THREE.TorusKnotGeometry(scale * 0.6, scale * 0.1, 128, 12, 2, 3);
      else if (cfg.current.mode === 'octa') geometry = new THREE.OctahedronGeometry(scale, 0);
      else geometry = new THREE.TorusGeometry(scale, 0.016 + i * 0.004, 12, 140);

      const material = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0xffd600 : 0xd6ad45,
        metalness: 0.98,
        roughness: 0.22,
        emissive: 0x3a2c04,
        emissiveIntensity: 0.5,
        wireframe: cfg.current.mode === 'octa',
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      group.add(mesh);
      geoms.push(geometry);
      mats.push(material);
    }

    void renderer;

    return {
      update: (elapsed) => {
        group.children.forEach((child, i) => {
          child.rotation.x = elapsed * cfg.current.speed * (0.3 + i * 0.12);
          child.rotation.y = elapsed * cfg.current.speed * (0.22 + i * 0.09);
        });
        group.rotation.y = elapsed * 0.05;
      },
      dispose: () => {
        geoms.forEach((g) => g.dispose());
        mats.forEach((m) => m.dispose());
      },
    };
  }, [rings, mode]);

  return (
    <Experiment
      index="C"
      title="Orbital Engine"
      brief="Nested metallic structures on independent rotation axes. Ring count and geometry mode rebuild the scene graph."
      onReset={() => {
        setSpeed(0.5);
        setRings(5);
        setMode('torus');
      }}
      controls={
        <>
          <Slider
            label="Rotation"
            value={speed}
            min={0}
            max={2}
            step={0.05}
            onChange={setSpeed}
            format={(v) => `${v.toFixed(2)}×`}
          />
          <Slider label="Structures" value={rings} min={1} max={9} onChange={setRings} />
          <div className="lab-control">
            <label htmlFor="orbit-mode">
              <span>Geometry</span>
            </label>
            <div className="lab-segment" id="orbit-mode" role="group" aria-label="Geometry mode">
              {(['torus', 'knot', 'octa'] as OrbitMode[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={mode === option ? 'is-active' : undefined}
                  aria-pressed={mode === option}
                  onClick={() => setMode(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </>
      }
    >
      <SceneCanvas label="Orbital metallic structures" factory={factory} className="lab-canvas" />
    </Experiment>
  );
}

/* ───────────────────── D · GLSL playground ───────────────────── */

const QUAD_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uPattern;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  void main() {
    vec2 uv = vUv;
    vec2 c = uv - 0.5;
    float r = length(c);
    float a = atan(c.y, c.x);

    float bands = sin(r * 34.0 - uTime * 1.4 + uPattern * 6.0) * 0.5 + 0.5;
    float rings = smoothstep(0.02, 0.0, abs(fract(r * 9.0 - uTime * 0.25) - 0.5) - 0.46);
    float swirl = noise(vec2(cos(a) * 2.4 + uTime * 0.22, sin(a) * 2.4 - uTime * 0.18));

    float energy = bands * 0.55 + swirl * 0.45;
    energy = pow(energy, 1.6) * uIntensity;

    vec3 color = mix(uColorB, uColorA, energy);
    color += uColorA * rings * 0.35 * uIntensity;
    color *= smoothstep(1.05, 0.12, r);

    gl_FragColor = vec4(color, 1.0);
  }
`;

const QUAD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

function GlslPlayground() {
  const [intensity, setIntensity] = useState(1.1);
  const [pattern, setPattern] = useState(0.5);
  const [hue, setHue] = useState(48);
  const uniforms = useRef({
    uTime: { value: 0 },
    uIntensity: { value: 1.1 },
    uPattern: { value: 0.5 },
    uColorA: { value: new THREE.Color('#ffd600') },
    uColorB: { value: new THREE.Color('#0a0a0a') },
  });

  useEffect(() => {
    uniforms.current.uIntensity.value = intensity;
    uniforms.current.uPattern.value = pattern;
    const color = new THREE.Color().setHSL(hue / 360, 0.95, 0.55);
    uniforms.current.uColorA.value.copy(color);
  }, [intensity, pattern, hue]);

  const factory = useCallback((ctx: SceneContext): SceneInstance => {
    const { scene } = ctx;
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: QUAD_FRAG,
      uniforms: uniforms.current,
    });
    const quad = new THREE.Mesh(geometry, material);
    quad.frustumCulled = false;
    scene.add(quad);

    return {
      update: (elapsed) => {
        uniforms.current.uTime.value = elapsed;
      },
      dispose: () => {
        geometry.dispose();
        material.dispose();
      },
    };
  }, []);

  return (
    <Experiment
      index="D"
      title="GLSL Playground"
      brief="Full-screen fragment shader: layered noise, radial bands and an angular swirl, all driven by uniforms."
      onReset={() => {
        setIntensity(1.1);
        setPattern(0.5);
        setHue(48);
      }}
      controls={
        <>
          <Slider
            label="Intensity"
            value={intensity}
            min={0.1}
            max={2.4}
            step={0.05}
            onChange={setIntensity}
            format={(v) => v.toFixed(2)}
          />
          <Slider
            label="Pattern"
            value={pattern}
            min={0}
            max={1}
            step={0.02}
            onChange={setPattern}
            format={(v) => v.toFixed(2)}
          />
          <Slider
            label="Hue"
            value={hue}
            min={0}
            max={360}
            step={1}
            onChange={setHue}
            format={(v) => `${v}°`}
          />
        </>
      }
    >
      <SceneCanvas label="Procedural GLSL pattern" factory={factory} className="lab-canvas" />
    </Experiment>
  );
}

/* ───────────────────── E · 3D typography ───────────────────── */

type MaterialMode = 'gold' | 'chrome' | 'matte';
type LightMode = 'studio' | 'rim' | 'dusk';

function TypographyLab() {
  const [material, setMaterial] = useState<MaterialMode>('gold');
  const [lighting, setLighting] = useState<LightMode>('studio');
  const [cameraPreset, setCameraPreset] = useState<'front' | 'angle' | 'low'>('angle');
  const cfg = useRef({ material, lighting, cameraPreset });
  cfg.current = { material, lighting, cameraPreset };

  const factory = useCallback((ctx: SceneContext): SceneInstance => {
    const { scene, camera, renderer } = ctx;

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const g = canvas.getContext('2d');
    if (g) {
      g.fillStyle = '#000000';
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.fillStyle = '#ffffff';
      g.font = '700 148px "Space Grotesk", system-ui, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('IBSAM®', canvas.width / 2, canvas.height / 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const palette: Record<MaterialMode, { color: number; metalness: number; roughness: number; emissive: number }> = {
      gold: { color: 0xffd600, metalness: 1, roughness: 0.22, emissive: 0x2a1f00 },
      chrome: { color: 0xd8dbe2, metalness: 1, roughness: 0.08, emissive: 0x0a0a0a },
      matte: { color: 0x3a3a3a, metalness: 0.2, roughness: 0.92, emissive: 0x000000 },
    };
    const chosen = palette[cfg.current.material];

    const geometry = new THREE.BoxGeometry(2.5, 0.62, 0.18);
    const material3d = new THREE.MeshStandardMaterial({
      color: chosen.color,
      metalness: chosen.metalness,
      roughness: chosen.roughness,
      emissive: chosen.emissive,
      emissiveIntensity: 0.5,
      map: texture,
    });
    const mesh = new THREE.Mesh(geometry, material3d);
    scene.add(mesh);

    const lights: THREE.Light[] = [];
    const setup = () => {
      lights.forEach((light) => scene.remove(light));
      lights.length = 0;
      if (cfg.current.lighting === 'studio') {
        const key = new THREE.DirectionalLight(0xffffff, 3);
        key.position.set(2, 2.6, 3);
        const fill = new THREE.DirectionalLight(0xbfd0ff, 1.4);
        fill.position.set(-2.6, -1.2, 2);
        lights.push(key, fill);
      } else if (cfg.current.lighting === 'rim') {
        const rim = new THREE.PointLight(0xffd600, 40, 12);
        rim.position.set(-2.4, 1.6, -2);
        const back = new THREE.PointLight(0x8899ff, 22, 12);
        back.position.set(2.4, -1.4, -1.6);
        lights.push(rim, back);
      } else {
        const dusk = new THREE.DirectionalLight(0xff9a3c, 2.2);
        dusk.position.set(-3, 0.6, 2.4);
        const amb = new THREE.AmbientLight(0x22252e, 2);
        lights.push(dusk, amb);
      }
      lights.forEach((light) => scene.add(light));
    };
    setup();
    scene.add(new THREE.AmbientLight(0xffffff, 0.18));

    const presets = {
      front: new THREE.Vector3(0, 0, 3.6),
      angle: new THREE.Vector3(1.9, 0.9, 3.1),
      low: new THREE.Vector3(-1.4, -1.5, 3.2),
    };
    const target = presets[cfg.current.cameraPreset];
    camera.position.copy(target);

    return {
      update: (elapsed) => {
        setup();
        material3d.color.setHex(palette[cfg.current.material].color);
        material3d.metalness = palette[cfg.current.material].metalness;
        material3d.roughness = palette[cfg.current.material].roughness;

        const want = presets[cfg.current.cameraPreset];
        camera.position.lerp(want, 0.06);
        camera.lookAt(0, 0, 0);

        mesh.rotation.y = Math.sin(elapsed * 0.4) * 0.22;
        mesh.rotation.x = Math.cos(elapsed * 0.3) * 0.06;
      },
      dispose: () => {
        geometry.dispose();
        material3d.dispose();
        texture.dispose();
      },
    };
  }, []);

  return (
    <Experiment
      index="E"
      title="3D Typography"
      brief="Canvas-generated type on a dimensional slab with switchable materials, lighting rigs and camera presets."
      onReset={() => {
        setMaterial('gold');
        setLighting('studio');
        setCameraPreset('angle');
      }}
      controls={
        <>
          <div className="lab-control">
            <label>
              <span>Material</span>
            </label>
            <div className="lab-segment" role="group" aria-label="Material">
              {(['gold', 'chrome', 'matte'] as MaterialMode[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={material === option ? 'is-active' : undefined}
                  aria-pressed={material === option}
                  onClick={() => setMaterial(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="lab-control">
            <label>
              <span>Lighting</span>
            </label>
            <div className="lab-segment" role="group" aria-label="Lighting">
              {(['studio', 'rim', 'dusk'] as LightMode[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={lighting === option ? 'is-active' : undefined}
                  aria-pressed={lighting === option}
                  onClick={() => setLighting(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className="lab-control">
            <label>
              <span>Camera</span>
            </label>
            <div className="lab-segment" role="group" aria-label="Camera preset">
              {(['front', 'angle', 'low'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={cameraPreset === option ? 'is-active' : undefined}
                  aria-pressed={cameraPreset === option}
                  onClick={() => setCameraPreset(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </>
      }
    >
      <SceneCanvas label="Dimensional typography study" factory={factory} className="lab-canvas" />
    </Experiment>
  );
}

/* ───────────────────── F · motion lab (GSAP + SVG) ───────────────────── */

function MotionLab() {
  const [playing, setPlaying] = useState(true);
  const [rate, setRate] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(6);
  const raf = useRef(0);
  const start = useRef(performance.now());
  const elapsed = useRef(0);
  const state = useRef({ playing: true, rate: 1, duration: 6 });
  state.current = { playing, rate, duration };

  useEffect(() => {
    const tick = (now: number) => {
      const dt = (now - start.current) / 1000;
      start.current = now;
      if (state.current.playing) {
        elapsed.current = (elapsed.current + dt * state.current.rate) % state.current.duration;
      }
      setProgress(elapsed.current / state.current.duration);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const reset = () => {
    elapsed.current = 0;
    setProgress(0);
    setPlaying(true);
  };

  const t = progress * Math.PI * 2;
  const path = useMemo(() => {
    const points: string[] = [];
    for (let i = 0; i <= 120; i += 1) {
      const p = (i / 120) * Math.PI * 2;
      const x = 160 + Math.sin(p * 2) * 96;
      const y = 96 + Math.cos(p * 3) * 44;
      points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return `${points.join(' ')} Z`;
  }, []);

  const orbX = 160 + Math.sin(t * 2) * 96;
  const orbY = 96 + Math.cos(t * 3) * 44;

  return (
    <Experiment
      index="F"
      title="Motion Lab"
      brief="A timeline-driven SVG study: orbit, arc drawing and staggered bars share one clock you control."
      onReset={() => {
        reset();
        setRate(1);
        setDuration(6);
      }}
      controls={
        <>
          <Slider
            label="Timeline"
            value={Math.round(progress * 100)}
            min={0}
            max={100}
            step={1}
            onChange={(value) => {
              elapsed.current = (value / 100) * duration;
              setProgress(value / 100);
            }}
            format={(v) => `${v}%`}
          />
          <Slider
            label="Rate"
            value={rate}
            min={0.25}
            max={3}
            step={0.05}
            onChange={setRate}
            format={(v) => `${v.toFixed(2)}×`}
          />
          <Slider
            label="Duration"
            value={duration}
            min={2}
            max={12}
            step={1}
            onChange={setDuration}
            format={(v) => `${v}s`}
          />
        </>
      }
    >
      <div className="lab-motion">
        <svg viewBox="0 0 320 192" role="img" aria-label="Animated orbital SVG study">
          <defs>
            <linearGradient id="motion-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fff0a3" />
              <stop offset="60%" stopColor="#ffd600" />
              <stop offset="100%" stopColor="#d6ad45" />
            </linearGradient>
          </defs>
          <path d={path} fill="none" stroke="rgba(255,214,0,0.22)" strokeWidth="1" />
          <path
            d={path}
            fill="none"
            stroke="url(#motion-grad)"
            strokeWidth="2"
            strokeDasharray="620"
            strokeDashoffset={620 - progress * 620}
          />
          {[0, 1, 2, 3, 4].map((i) => {
            const phase = (progress + i * 0.08) % 1;
            return (
              <rect
                key={i}
                x={54 + i * 44}
                y={168 - phase * 46}
                width="18"
                height={8 + phase * 40}
                rx="2"
                fill="rgba(255,214,0,0.5)"
              />
            );
          })}
          <circle cx={orbX} cy={orbY} r="6" fill="#fff0a3" />
          <circle cx={orbX} cy={orbY} r="12" fill="none" stroke="rgba(255,214,0,0.4)" />
        </svg>
        <div className="lab-motion-actions">
          <button type="button" onClick={() => setPlaying((value) => !value)}>
            {playing ? <Pause size={13} aria-hidden /> : <Play size={13} aria-hidden />}
            {playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" onClick={reset}>
            <RotateCcw size={13} aria-hidden /> Restart
          </button>
        </div>
      </div>
    </Experiment>
  );
}

/* ───────────────────── G · CSS depth studio ───────────────────── */

function CssDepthStudio() {
  const [depth, setDepth] = useState(120);
  const [rotate, setRotate] = useState(-18);
  const [layers, setLayers] = useState(5);
  const [preset, setPreset] = useState<'stack' | 'fan' | 'tunnel'>('stack');

  return (
    <Experiment
      index="G"
      title="CSS Depth Studio"
      brief="Layered perspective built from CSS transforms only — no WebGL, so it works everywhere."
      onReset={() => {
        setDepth(120);
        setRotate(-18);
        setLayers(5);
        setPreset('stack');
      }}
      controls={
        <>
          <Slider label="Depth" value={depth} min={0} max={260} step={4} onChange={setDepth} format={(v) => `${v}px`} />
          <Slider label="Rotate" value={rotate} min={-60} max={60} step={1} onChange={setRotate} format={(v) => `${v}°`} />
          <Slider label="Layers" value={layers} min={2} max={9} onChange={setLayers} />
          <div className="lab-control">
            <label>
              <span>Preset</span>
            </label>
            <div className="lab-segment" role="group" aria-label="Depth preset">
              {(['stack', 'fan', 'tunnel'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={preset === option ? 'is-active' : undefined}
                  aria-pressed={preset === option}
                  onClick={() => setPreset(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </>
      }
    >
      <div className="lab-css-stage" role="img" aria-label="Layered CSS depth composition">
        <div
          className="lab-css-stack"
          style={{ perspective: `${800 + depth * 4}px` }}
        >
          {Array.from({ length: layers }).map((_, i) => {
            const offset = i * (depth / layers) * 0.5;
            const transform =
              preset === 'fan'
                ? `rotateY(${rotate}deg) rotateZ(${i * 7}deg) translateZ(${-offset}px)`
                : preset === 'tunnel'
                  ? `translateZ(${-offset * 2}px) scale(${1 - i * 0.08}) rotate(${i * 4}deg)`
                  : `rotateX(${rotate / 2}deg) rotateY(${rotate}deg) translateZ(${-offset}px) translateY(${-i * 6}px)`;
            return (
              <div
                key={i}
                className="lab-css-layer"
                style={{
                  transform,
                  opacity: 1 - i * 0.09,
                  borderColor: `rgba(255,214,0,${0.42 - i * 0.03})`,
                  zIndex: layers - i,
                }}
              >
                <span>{String(i + 1).padStart(2, '0')}</span>
              </div>
            );
          })}
        </div>
      </div>
    </Experiment>
  );
}

/* ───────────────────────── page ───────────────────────── */

export default function Lab() {
  useDocumentMeta({
    title: 'Digital Lab',
    description:
      'Seven interactive experiments: procedural particles, a liquid metal shader, orbital structures, a GLSL playground, dimensional type, a motion timeline and a CSS depth studio.',
  });

  return (
    <div className="page lab-page">
      <PageHeader
        eyebrow="Digital Lab"
        title="Experiments, not decorations."
        lede="Seven working studies in WebGL, GLSL, motion and CSS. Every control on this page changes the rendered output — nothing here is a screenshot."
      />

      <div className="lab-grid">
        <ParticleDimension />
        <LiquidMetallic />
        <OrbitalEngine />
        <GlslPlayground />
        <TypographyLab />
        <MotionLab />
        <CssDepthStudio />
      </div>
    </div>
  );
}
