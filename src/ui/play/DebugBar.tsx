/**
 * Shown over the graph during Play: where execution is stopped, and the
 * debugger buttons (continue, next node), or a reminder of what glows.
 */
import { useEffect, useReducer } from 'preact/hooks';
import type { PlaySession } from '@editor/world/playSession';

interface Props {
  session: PlaySession;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  onLevel: () => void;
  onShowPaused: () => void;
}

export function DebugBar({ session, drawerOpen, onToggleDrawer, onLevel, onShowPaused }: Props) {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => session.onUi(() => force(0)), [session]);
  const p = session.sim.paused;
  return (
    <div class={`debug-bar${p ? ' paused' : ''}${drawerOpen ? ' beside-drawer' : ''}`}>
      {p ? (
        <>
          <button class="db-where" onClick={onShowPaused}>
            <strong>{p.reason === 'breakpoint' ? 'Breakpoint' : 'Pas à pas'}</strong> · avant « {p.nodeTitle} » · {p.actorLabel}
          </button>
          <button class="pb-btn" onClick={() => session.resume()} aria-label="Continuer">
            ▶<span class="hide-narrow"> Continuer</span>
          </button>
          <button class="pb-btn" onClick={() => session.stepNode()} aria-label="Nœud suivant">
            ⤵<span class="hide-narrow"> Nœud suivant</span>
          </button>
        </>
      ) : (
        <span class="db-where muted">Play en cours : les fils s’allument quand ils s’exécutent.</span>
      )}
      <button class={`pb-btn${drawerOpen ? ' on' : ''}`} onClick={onToggleDrawer}>
        Debug
      </button>
      <button class="pb-btn" onClick={onLevel}>
        Niveau
      </button>
    </div>
  );
}
