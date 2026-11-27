import { useEffect, useRef, useState, type ReactNode } from 'react';
import type * as THREE from 'three';
import {
  mountScene,
  webglSupported,
  type SceneContext,
  type SceneController,
  type SceneInstance,
} from '../three/engine';

type SceneCanvasProps = {
  /** Stable factory (wrap in useCallback) that builds the scene graph. */
  factory: (ctx: SceneContext) => SceneInstance;
  onClick?: (object: THREE.Object3D) => void;
  className?: string;
  /** Accessible description; the canvas itself is decorative to screen readers. */
  label: string;
  fallback?: ReactNode;
  cameraFov?: number;
  /** Receives the controller so pages can sync a 3D highlight from an accessible list. */
  onReady?: (controller: SceneController) => void;
};

/**
 * Thin React host around the imperative WebGL engine. The engine owns the render
 * loop, visibility pausing, resizing and disposal; this component only supplies
 * the canvas element and exposes the controller for external selection changes.
 */
export default function SceneCanvas({
  factory,
  onClick,
  className,
  label,
  fallback,
  cameraFov,
  onReady,
}: SceneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [supported, setSupported] = useState(() => webglSupported());
  const controllerRef = useRef<SceneController | null>(null);
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  useEffect(() => {
    if (!supported) return;
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    let controller: SceneController;
    try {
      controller = mountScene(canvas, host, factory, {
        onClick: (object) => onClickRef.current?.(object),
        cameraFov,
      });
    } catch {
      setSupported(false);
      return;
    }

    controllerRef.current = controller;
    if (!controller.supported) setSupported(false);
    onReady?.(controller);

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, [factory, supported, cameraFov]);

  return (
    <div ref={hostRef} className={className} role="img" aria-label={label}>
      {supported ? (
        <canvas ref={canvasRef} className="scene-canvas" aria-hidden="true" />
      ) : (
        <div className="scene-fallback" aria-hidden="true">
          {fallback ?? <div className="scene-fallback-mark">IBSAM®</div>}
        </div>
      )}
    </div>
  );
}

/** Imperative handle used by pages that highlight a node from an accessible list. */
export function useSceneSelection() {
  const controller = useRef<SceneController | null>(null);
  return {
    bind: (next: SceneController | null) => {
      controller.current = next;
    },
    select: (index: number) => controller.current?.setActive(index),
  };
}
