/**
 * The level viewport's bar (3D-1, V7.78), at its top left as in UE 5.6 and later: the view type (Perspective, Top,
 * Bottom, Left, Right, Front, Back), the view mode (Lit, Unlit, Wireframe), and F, which frames the selection (the
 * key F of UE: a touch control here). The transform tools and the snapping come with the gizmo (3D-2).
 */
import { useEffect, useReducer } from 'preact/hooks';
import { haptic } from '@editor/haptics';
import type { OpenOverlay } from '../overlayTypes';
import { origin } from '../origins';
import { Icon } from '../widgets/icons';
import { onViewportSettings, setViewMode, setViewType, VIEW_MODES, VIEW_TYPES, viewMode, viewType } from '../viewportSettings';

const TYPE_HINT: Record<(typeof VIEW_TYPES)[number], string> = {
  Perspective: 'en 3D, tourne autour au doigt',
  Top: 'de dessus',
  Bottom: 'de dessous',
  Left: 'de côté, depuis -X',
  Right: 'de côté, depuis +X',
  Front: 'de face, depuis le bas de la vue de dessus',
  Back: 'de dos',
};
const MODE_HINT: Record<(typeof VIEW_MODES)[number], string> = {
  Lit: 'avec les lumières',
  Unlit: 'couleurs seules, sans lumière',
  Wireframe: 'les arêtes seulement',
};

export function ViewportBar({ setOverlay, onFrame }: { setOverlay: OpenOverlay; onFrame: () => void }) {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => onViewportSettings(() => force(0)), []);
  const type = viewType();
  const mode = viewMode();
  const at = (e: Event) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { sx: r.left, sy: r.bottom };
  };
  return (
    <div class="vp-bar">
      <button
        class="vp-btn"
        aria-label={type}
        onClick={(e) =>
          setOverlay({
            kind: 'menu',
            ...at(e),
            title: 'Viewport Type',
            items: VIEW_TYPES.map((t) => ({
              label: t,
              hint: t === type ? `${TYPE_HINT[t]} · en cours` : TYPE_HINT[t],
              action: () => {
                haptic('tap');
                setViewType(t);
              },
            })),
          })
        }
      >
        {type} <Icon name="chevron-down" />
      </button>
      {type !== 'Top' && (
        <button
          class="vp-btn"
          aria-label={mode}
          onClick={(e) =>
            setOverlay({
              kind: 'menu',
              ...at(e),
              title: 'View Mode',
              items: VIEW_MODES.map((m) => ({ label: m, hint: m === mode ? `${MODE_HINT[m]} · en cours` : MODE_HINT[m], action: () => setViewMode(m) })),
            })
          }
        >
          {mode} <Icon name="chevron-down" />
        </button>
      )}
      <button class="vp-btn" {...origin('touch', 'frame')} aria-label="F" title="Cadrer la sélection (F)" onClick={onFrame}>
        F
      </button>
    </div>
  );
}
