import * as THREE from 'three';
import { SceneContext, SceneInstance, studioEnvironment } from './engine';

/**
 * OMEGA hero installation.
 *
 * A parametric gold lattice knot with vertex-shader surface distortion, wrapped in
 * a fresnel rim shell, orbited by independent ring structures, procedural particles
 * and an architectural floor grid. Scroll drives the camera through three states.
 * All glow is additive geometry/shader work — no post-processing pass required.
 */
export function createHeroSculpture(ctx: SceneContext): SceneInstance {
  const { scene, camera, quality, reduced, renderer } = ctx;
  const dense = quality > 0.7;

  scene.environment = studioEnvironment(renderer);
  scene.fog = new THREE.FogExp2(0x050505, 0.062);

  camera.position.set(0, 0.12, dense ? 4.9 : 5.6);

  // ── lighting ────────────────────────────────────────────────
  const key = new THREE.DirectionalLight(0xffe08a, 3.4);
  key.position.set(-4.2, 5.4, 3.6);

  const rim = new THREE.DirectionalLight(0xcdd9ff, 1.15);
  rim.position.set(4.4, -1.8, -5);

  const inner = new THREE.PointLight(0xffd600, 26, 9, 2);
  inner.position.set(0, 0, 0);

  const ambient = new THREE.AmbientLight(0x161616, 1.1);
  scene.add(key, rim, inner, ambient);

  // ── shared uniforms ─────────────────────────────────────────
  const uTime = { value: 0 };
  const uAmp = { value: reduced ? 0.05 : 0.13 };

  const sculpture = new THREE.Group();
  sculpture.scale.setScalar(dense ? 1 : 0.86);
  scene.add(sculpture);

  // ── core: lattice knot with shader displacement ─────────────
  const knotGeo = new THREE.TorusKnotGeometry(
    0.82,
    0.25,
    dense ? 280 : 170,
    dense ? 42 : 26,
    2,
    3,
  );

  const knotMat = new THREE.MeshStandardMaterial({
    color: 0xd6ad45,
    metalness: 1,
    roughness: 0.17,
    envMapIntensity: 1.65,
  });

  knotMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uTime;
    shader.uniforms.uAmp = uAmp;
    shader.vertexShader = `uniform float uTime;\nuniform float uAmp;\n${shader.vertexShader}`.replace(
      '#include <begin_vertex>',
      `
      vec3 transformed = vec3( position );
      float wave = sin( position.y * 6.2 + uTime * 1.15 ) * cos( position.x * 5.1 - uTime * 0.85 );
      float pulse = sin( length( position.xz ) * 8.0 + uTime * 1.7 ) * 0.35;
      transformed += normal * ( wave + pulse ) * uAmp;
      `,
    );
  };
  knotMat.customProgramCacheKey = () => 'omega-lattice-knot';

  const knot = new THREE.Mesh(knotGeo, knotMat);
  sculpture.add(knot);

  // fresnel rim shell — reads as volumetric glow without a bloom pass
  const shellMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0xffd600) },
      uTime,
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4( position, 1.0 );
        vNormal = normalize( normalMatrix * normal );
        vView = normalize( -mv.xyz );
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float fresnel = pow( 1.0 - abs( dot( normalize( vNormal ), normalize( vView ) ) ), 2.6 );
        float breathe = 0.82 + 0.18 * sin( uTime * 1.4 );
        gl_FragColor = vec4( uColor * fresnel * breathe, fresnel * 0.8 );
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const shell = new THREE.Mesh(knotGeo, shellMat);
  shell.scale.setScalar(1.045);
  sculpture.add(shell);

  // ── independent orbital rings ───────────────────────────────
  const rings = new THREE.Group();
  sculpture.add(rings);

  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xffd600,
    metalness: 1,
    roughness: 0.28,
    emissive: 0xffd600,
    emissiveIntensity: 0.32,
    envMapIntensity: 1.2,
  });

  type RingSpec = { radius: number; tube: number; tilt: [number, number, number]; speed: number };
  const specs: RingSpec[] = [
    { radius: 1.42, tube: 0.008, tilt: [1.24, 0.2, 0.1], speed: 0.22 },
    { radius: 1.78, tube: 0.012, tilt: [0.42, 1.15, -0.24], speed: -0.16 },
    { radius: 2.12, tube: 0.006, tilt: [1.05, -0.62, 0.4], speed: 0.11 },
  ];

  const ringMeshes: THREE.Mesh[] = specs.map((spec) => {
    const geo = new THREE.TorusGeometry(spec.radius, spec.tube, 8, dense ? 220 : 140);
    const mesh = new THREE.Mesh(geo, ringMat);
    mesh.rotation.set(...spec.tilt);
    mesh.userData.speed = spec.speed;
    rings.add(mesh);
    return mesh;
  });

  // gold beads travelling one ring
  const beadGeo = new THREE.SphereGeometry(0.026, 10, 10);
  const beadMat = new THREE.MeshStandardMaterial({
    color: 0xfff0a3,
    metalness: 1,
    roughness: 0.12,
    emissive: 0xffd600,
    emissiveIntensity: 0.9,
  });
  const beads = new THREE.Group();
  const beadCount = dense ? 9 : 6;
  for (let i = 0; i < beadCount; i += 1) {
    const bead = new THREE.Mesh(beadGeo, beadMat);
    const angle = (i / beadCount) * Math.PI * 2;
    bead.position.set(Math.cos(angle) * 1.42, Math.sin(angle) * 1.42, 0);
    beads.add(bead);
  }
  beads.rotation.set(...specs[0].tilt);
  rings.add(beads);

  // ── procedural particle field ───────────────────────────────
  const particleCount = dense ? 1100 : 460;
  const positions = new Float32Array(particleCount * 3);
  const seeds = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i += 1) {
    const radius = 1.35 + Math.random() * 2.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi) * 0.72;
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    seeds[i] = Math.random();
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const particleMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime,
      uSize: { value: dense ? 2.1 : 1.7 },
      uColor: { value: new THREE.Color(0xfff0a3) },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uSize;
      attribute float aSeed;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float a = uTime * 0.07 + aSeed * 6.283;
        float c = cos( a );
        float s = sin( a );
        p.xz = mat2( c, -s, s, c ) * p.xz;
        p.y += sin( uTime * 0.5 + aSeed * 12.0 ) * 0.09;
        vec4 mv = modelViewMatrix * vec4( p, 1.0 );
        gl_PointSize = uSize * ( 260.0 / max( 0.001, -mv.z ) ) * ( 0.55 + aSeed );
        gl_Position = projectionMatrix * mv;
        vAlpha = 0.28 + 0.72 * aSeed;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        float r = length( gl_PointCoord - 0.5 );
        if ( r > 0.5 ) discard;
        float a = smoothstep( 0.5, 0.0, r );
        gl_FragColor = vec4( uColor, a * vAlpha * 0.9 );
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const particles = new THREE.Points(particleGeo, particleMat);
  sculpture.add(particles);

  // ── atmospheric backlight plane ─────────────────────────────
  const glowMat = new THREE.ShaderMaterial({
    uniforms: { uTime },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float d = distance( vUv, vec2( 0.5 ) );
        float halo = smoothstep( 0.62, 0.0, d ) * ( 0.62 + 0.12 * sin( uTime * 0.6 ) );
        gl_FragColor = vec4( vec3( 1.0, 0.84, 0.0 ) * halo, halo * 0.5 );
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const glow = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), glowMat);
  glow.position.z = -2.4;
  sculpture.add(glow);

  // ── architectural grid ──────────────────────────────────────
  const grid = new THREE.GridHelper(26, 52, 0x4a3a10, 0x1b1b1b);
  grid.position.y = -2.15;
  const gridMat = grid.material as THREE.Material;
  gridMat.transparent = true;
  gridMat.opacity = 0.42;
  sculpture.add(grid);

  // ── animation ───────────────────────────────────────────────
  return {
    update: (elapsed) => {
      uTime.value = elapsed;
      const progress = ctx.scroll();

      const targetZ = dense ? 4.9 - progress * 1.45 : 5.6 - progress * 1.2;
      const targetY = 0.12 + progress * 0.55;
      const targetX = progress * -0.62;

      camera.position.x += (targetX - camera.position.x) * 0.06;
      camera.position.y += (targetY - camera.position.y) * 0.06;
      camera.position.z += (targetZ - camera.position.z) * 0.06;
      camera.lookAt(0, 0.05 + progress * 0.12, 0);

      knot.rotation.y = elapsed * 0.16;
      knot.rotation.x = Math.sin(elapsed * 0.22) * 0.08;
      shell.rotation.copy(knot.rotation);

      sculpture.rotation.y = progress * 1.15;
      sculpture.rotation.x = Math.sin(elapsed * 0.18) * 0.04;

      ringMeshes.forEach((ring) => {
        ring.rotation.z += (ring.userData.speed as number) * 0.01;
      });
      beads.rotation.z -= 0.0032;

      particles.rotation.y = elapsed * 0.035;
      inner.intensity = 24 + Math.sin(elapsed * 1.1) * 5;
    },
    dispose: () => {
      // geometry/material disposal is handled centrally by the engine
    },
  };
}
