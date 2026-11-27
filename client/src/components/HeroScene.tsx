import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame, type ThreeElements } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';
import { usePrefersReducedMotion, useWebGLSupport } from '../lib/hooks';

/**
 * Hero 3D environment: a machined gold torus knot inside a wireframe shell,
 * surrounded by a slow particle field. Everything is procedurally generated —
 * no external model or texture downloads.
 */

function GoldKnot({ reduced }: { reduced: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!mesh.current || reduced) return;
    mesh.current.rotation.y += delta * 0.22;
    mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.24) * 0.18;
  });

  return (
    <Float speed={reduced ? 0 : 1.15} rotationIntensity={reduced ? 0 : 0.32} floatIntensity={reduced ? 0 : 0.55}>
      <mesh ref={mesh} rotation={[0.4, 0.2, 0]}>
        <torusKnotGeometry args={[1.02, 0.3, 200, 28, 2, 3]} />
        <meshStandardMaterial
          color="#d6ad45"
          metalness={1}
          roughness={0.24}
          emissive="#4a3608"
          emissiveIntensity={0.4}
        />
      </mesh>
    </Float>
  );
}

function Shell() {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.y -= delta * 0.06;
  });

  return (
    <mesh ref={mesh} scale={2.35}>
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial color="#f5c542" wireframe transparent opacity={0.13} />
    </mesh>
  );
}

function Dust({ count = 320 }: { count?: number }) {
  const points = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const array = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const radius = 2.4 + Math.random() * 3.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      array[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      array[index * 3 + 1] = radius * Math.cos(phi) * 0.7;
      array[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    return array;
  }, [count]);

  useFrame((_, delta) => {
    if (points.current) points.current.rotation.y += delta * 0.035;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.022} color="#f5c542" transparent opacity={0.6} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function Rig({ reduced }: { reduced: boolean }) {
  const target = useRef(new THREE.Vector3(0, 0, 5.4));

  useFrame((state) => {
    if (reduced) return;
    const x = state.pointer.x * 0.55;
    const y = state.pointer.y * 0.35;
    state.camera.position.lerp(target.current.set(x, y + 0.15, 5.4), 0.045);
    state.camera.lookAt(0, 0, 0);
  });

  return null;
}

function Scene({ reduced }: { reduced: boolean }) {
  return (
    <>
      <color attach="background" args={['#07090d']} />
      <fog attach="fog" args={['#07090d', 6, 13]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 4]} intensity={2.1} color="#fff4d6" />
      <pointLight position={[-4, -2, -3]} intensity={26} color="#f5c542" distance={12} />
      <pointLight position={[3, -4, 2]} intensity={12} color="#7a5c12" distance={10} />
      <GoldKnot reduced={reduced} />
      <Shell />
      <Dust />
      <Rig reduced={reduced} />
    </>
  );
}

/** Static, dependency-free fallback shown without WebGL or for reduced motion. */
export function HeroFallback({ className }: { className?: string }) {
  return (
    <div className={`hero-fallback ${className ?? ''}`} aria-hidden>
      <div className="hero-fallback-ring hero-fallback-ring--outer" />
      <div className="hero-fallback-ring hero-fallback-ring--mid" />
      <div className="hero-fallback-core" />
    </div>
  );
}

export default function HeroScene({ className }: { className?: string }) {
  const reduced = usePrefersReducedMotion();
  const webgl = useWebGLSupport();

  if (!webgl) return <HeroFallback className={className} />;

  return (
    <div className={`hero-canvas ${className ?? ''}`} aria-hidden>
      <Canvas
        dpr={[1, 1.7]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 5.4], fov: 42 }}
        frameloop={reduced ? 'demand' : 'always'}
        onCreated={({ gl }: { gl: THREE.WebGLRenderer }) => {
          gl.setClearColor('#07090d', 1);
        }}
      >
        <Suspense fallback={null}>
          <Scene reduced={reduced} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export type { ThreeElements };
