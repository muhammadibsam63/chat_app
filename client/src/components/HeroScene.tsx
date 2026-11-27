import { useCallback } from 'react';
import SceneCanvas from './SceneCanvas';
import { createHeroSculpture } from '../three/heroSculpture';
import type { SceneContext, SceneInstance } from '../three/engine';

/** Static, dependency-free stand-in when WebGL is unavailable. */
export function HeroFallback({ className }: { className?: string }) {
  return (
    <div className={`hero-fallback ${className ?? ''}`} aria-hidden="true">
      <div className="hero-fallback-grid" />
      <div className="hero-fallback-ring hero-fallback-ring--outer" />
      <div className="hero-fallback-ring hero-fallback-ring--mid" />
      <div className="hero-fallback-core" />
    </div>
  );
}

/**
 * OMEGA hero installation — a custom GLSL-shaded gold lattice knot with orbital
 * rings, procedural particles and a scroll-driven camera. The scene module is
 * imported statically (it is small); the WebGL context is created lazily by the
 * host so it never blocks first paint.
 */
export default function HeroScene({ className }: { className?: string }) {
  const factory = useCallback((ctx: SceneContext): SceneInstance => createHeroSculpture(ctx), []);

  return (
    <SceneCanvas
      className={`hero-canvas ${className ?? ''}`}
      label="Animated gold geometric sculpture with orbital rings"
      factory={factory}
      fallback={<HeroFallback />}
      cameraFov={42}
    />
  );
}
