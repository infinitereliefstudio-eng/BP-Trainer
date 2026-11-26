/**
 * The viewport bar (3D-1, V7.78; tools and snaps 3D-2, V7.79), at the top left of the level and of the Blueprint's
 * Viewport, as in UE 5.6 and later: the view type (Perspective, Top, Bottom, Left, Right, Front, Back), the view mode
 * (Lit, Unlit, Wireframe), the transform tools (Select, Move, Rotate, Scale: Q, W, E, R in UE), the coordinate space
 * (World, Local), the grid, rotation and scale snaps, and F, which frames the selection (a touch control here).
 * In the Top view, drawn by the 2D canvas, there is no gizmo: the tools and snaps are not shown.
 */
import { useEffect, useReducer } from 'preact/hooks';
import { haptic } from '@editor/haptics';
import type { OpenOverlay } from '../overlayTypes';
import { origin } from '../origins';
import {
  bpViewType,
  GRID_SNAPS,
  gridSnap,
  onViewportSettings,
  ROTATION_SNAPS,
  rotationSnap,
  SCALE_SNAPS,
  scaleSnap,
  setBpViewType,
  setGridSnap,
  setRotationSnap,
  setScaleSnap,
  setSpace,
  setTool,
  setViewMode,
  setViewType,
  space,
  TOOLS,
  type Tool,
  tool,
  VIEW_MODES,
  VIEW_TYPES,
  viewMode,
  viewType,
} from '../viewportSettings';
import { Icon, type IconName } from '../widgets/icons';

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
const TOOL_ICON: Record<Tool, IconName> = { Select: 'select', Move: 'move', Rotate: 'rotate', Scale: 'scale' };
const TOOL_KEY: Record<Tool, string> = { Select: 'Q', Move: 'W', Rotate: 'E', Scale: 'R' };

interface Props {
  /** The level's viewport or the Blueprint's: each keeps its own view type. */
  context: 'level' | 'blueprint';
  setOverlay: OpenOverlay;
  onFrame: () => void;
  onInfo: (text: string) => void;
}

export function ViewportBar({ context, setOverlay, onFrame, onInfo }: Props) {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => onViewportSettings(() => force(0)), []);
  const type = context === 'level' ? viewType() : bpViewType();
  const setType = context === 'level' ? setViewType : setBpViewType;
  const mode = viewMode();
  const current = tool();
  const at = (e: Event) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { sx: r.left, sy: r.bottom };
  };
  const snapMenu = (e: Event, title: string, values: readonly number[], now: number, unit: string, set: (v: number) => void) =>
    setOverlay({
      kind: 'menu',
      ...at(e),
      title,
      items: values.map((v) => ({
        label: v === 0 ? 'Off' : `${v}${unit}`,
        hint: v === now ? 'en cours' : undefined,
        action: () => set(v),
      })),
    });
  const pickTool = (t: Tool) => {
    haptic('tap');
    setTool(t);
    if (t === 'Scale' && context === 'level') onInfo('Scale : un acteur posé n’a pas d’échelle ici. Change la taille de ses composants dans le Viewport de son Blueprint.');
  };
  const in3d = type !== 'Top';
  const grid = gridSnap(),
    rot = rotationSnap(),
    scl = scaleSnap();

  return (
    <div class="vp-bar" data-context={context}>
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
                setType(t);
              },
            })),
          })
        }
      >
        {type} <Icon name="chevron-down" />
      </button>
      {in3d && (
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
      {in3d && (
        <span class="vp-group">
          {TOOLS.map((t) => (
            <button key={t} class={`vp-btn icon${t === current ? ' on' : ''}`} aria-label={t} aria-pressed={t === current} title={`${t} (${TOOL_KEY[t]})`} onClick={() => pickTool(t)}>
              <Icon name={TOOL_ICON[t]} />
            </button>
          ))}
        </span>
      )}
      {in3d && (
        <button
          class="vp-btn icon"
          aria-label={space()}
          title={space() === 'World' ? 'Axes du monde (World)' : 'Axes de l’objet (Local)'}
          onClick={() => setSpace(space() === 'World' ? 'Local' : 'World')}
        >
          <Icon name={space() === 'World' ? 'globe' : 'cube'} />
        </button>
      )}
      {in3d && (
        <button
          class={`vp-btn snap${grid ? ' on' : ''}`}
          aria-label="Grid Snap"
          onClick={(e) => snapMenu(e, 'Grid Snap', GRID_SNAPS, grid, ' cm', setGridSnap)}
        >
          <Icon name="grid" /> {grid || 'Off'}
        </button>
      )}
      {in3d && (
        <button
          class={`vp-btn snap${rot ? ' on' : ''}`}
          aria-label="Rotation Snap"
          onClick={(e) => snapMenu(e, 'Rotation Snap', ROTATION_SNAPS, rot, '°', setRotationSnap)}
        >
          <Icon name="angle" /> {rot ? `${rot}°` : 'Off'}
        </button>
      )}
      {in3d && context === 'blueprint' && (
        <button
          class={`vp-btn snap${scl ? ' on' : ''}`}
          aria-label="Scale Snap"
          onClick={(e) => snapMenu(e, 'Scale Snap', SCALE_SNAPS, scl, ' cm', setScaleSnap)}
        >
          <Icon name="size" /> {scl || 'Off'}
        </button>
      )}
      <button class="vp-btn" {...origin('touch', 'frame')} aria-label="F" title="Cadrer la sélection (F)" onClick={onFrame}>
        F
      </button>
    </div>
  );
}
