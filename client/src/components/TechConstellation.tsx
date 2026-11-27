import { useCallback, useMemo, useState } from 'react';
import SceneCanvas from './SceneCanvas';
import { TECH_ENTRIES, type TechEntry, type TechTier } from '../lib/tech';
import { createTechConstellation, type TechNode } from '../three/scenes';
import type { SceneContext, SceneController, SceneInstance } from '../three/engine';

const TIER_LABEL: Record<TechTier, string> = {
  core: 'Core',
  familiar: 'Familiar',
  learning: 'Learning',
};

/**
 * Interactive technology constellation with a fully accessible list alternative.
 * Both surfaces drive the same selection, so keyboard users never need WebGL.
 */
export default function TechConstellation() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [controller, setController] = useState<SceneController | null>(null);

  const nodes = useMemo<TechNode[]>(
    () => TECH_ENTRIES.map((entry) => ({ name: entry.name, tier: entry.tier })),
    [],
  );

  const factory = useCallback(
    (ctx: SceneContext): SceneInstance => createTechConstellation(ctx, nodes),
    [nodes],
  );

  const select = useCallback(
    (index: number) => {
      setActiveIndex(index);
      controller?.setActive(index);
    },
    [controller],
  );

  const active: TechEntry = TECH_ENTRIES[activeIndex] ?? TECH_ENTRIES[0];

  return (
    <div className="universe">
      <div className="universe-canvas">
        <SceneCanvas
          factory={factory}
          label="Three-dimensional constellation of technologies"
          onReady={setController}
          onClick={(index) => {
            if (index >= 0 && index < TECH_ENTRIES.length) setActiveIndex(index);
          }}
          fallback={<div className="scene-fallback">Technology constellation</div>}
        />
        <p className="universe-hint">
          Drag to explore · click a node to inspect it · the list below is fully keyboard accessible
        </p>
      </div>

      <div className="tech-panel" aria-live="polite">
        <div className="tech-panel-head">
          <span className={`tier tier--${active.tier}`}>{TIER_LABEL[active.tier]}</span>
          <h3 className="tech-panel-name">{active.name}</h3>
        </div>
        <p className="tech-panel-body">{active.note}</p>
        <dl className="tech-meta">
          <div>
            <dt>Category</dt>
            <dd>{active.category}</dd>
          </div>
          <div>
            <dt>Used in</dt>
            <dd>{active.projects.length ? active.projects.join(', ') : 'Learning in progress'}</dd>
          </div>
        </dl>
      </div>

      <div className="tech-list" role="list">
        {TECH_ENTRIES.map((entry, index) => (
          <button
            key={entry.name}
            type="button"
            role="listitem"
            className={`chip${index === activeIndex ? ' chip--active' : ''}`}
            aria-pressed={index === activeIndex}
            onClick={() => select(index)}
          >
            {entry.name}
            <span className={`tier tier--${entry.tier}`}>{TIER_LABEL[entry.tier]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
