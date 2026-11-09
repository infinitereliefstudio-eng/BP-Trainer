/**
 * Debug tab: values on the paused node (or the selected one), the debugged
 * actor's variables, and the Execution Trace.
 */
import { nodeTitle } from '@core/nodes/registry';
import type { Simulation } from '@core/runtime/simulation';
import { isRef, type RValue } from '@core/runtime/world';
import type { PinType } from '@core/types/pins';
import { formatValue, type Value } from '@core/types/values';
import type { PlaySession } from '@editor/world/playSession';
import { useStore } from '../hooks';

interface Props {
  session?: PlaySession;
  onFocusNode: (graphId: string, nodeId: string, classId?: string) => void;
  /** One column, for the side drawer. */
  compact?: boolean;
}

export function formatRuntime(sim: Simulation, v: RValue | undefined, type?: PinType): string {
  if (v === undefined) return '—';
  if (isRef(v)) return sim.displayName(v);
  if (v === null) return 'None';
  if (Array.isArray(v)) {
    const items = v.slice(0, 4).map((x) => formatRuntime(sim, x, type && { ...type, container: undefined }));
    return `[${v.length}] ${items.join(', ')}${v.length > 4 ? '…' : ''}`;
  }
  return type ? formatValue(v as Value, type) : String(v);
}

export function DebugPanel({ session, onFocusNode, compact }: Props) {
  const store = useStore();
  if (!session) {
    return (
      <p class="hint">
        Lance Play pour déboguer. Ajoute un breakpoint (appui long sur un nœud) : l’exécution s’arrêtera juste avant lui.
      </p>
    );
  }
  const sim = session.sim;
  const paused = sim.paused;
  // A parent's graphs also run on its children's actors.
  const instances = [...sim.actors, sim.player].filter((a) => sim.isA(a, store.classId));
  const actor = paused
    ? [...sim.actors, sim.player].find((a) => a.id === paused.actorId)
    : (instances.find((a) => a.id === session.selected) ?? instances[0]);
  const selected = store.selection.size === 1 ? [...store.selection][0] : undefined;
  const watchId = paused?.nodeId ?? selected;
  const watchGraph = paused?.graphId ?? store.graphId;
  const watches = (paused ? sim.watch() : watchId && actor ? sim.watchNode(actor.id, watchGraph, watchId) : []).filter(
    (w) => w.type.category !== 'delegate',
  );
  const cls = actor && sim.classOf(actor);
  const watchedNode = watchId ? store.project.classes.flatMap((c) => c.graphs).find((g) => g.id === watchGraph)?.nodes[watchId] : undefined;

  return (
    <div class={`debug-panel${compact ? ' compact' : ''}`}>
      <section>
        <div class="dbg-head">
          <span>Objet débogué</span>
          {paused ? (
            <strong>{actor?.label}</strong>
          ) : instances.length ? (
            <select class="field small-field" value={actor?.id} onChange={(e) => session.select((e.target as HTMLSelectElement).value)}>
              {instances.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          ) : (
            <span class="muted">aucune instance de {store.cls.name} dans le niveau</span>
          )}
        </div>
        {watchId && watchedNode ? (
          <>
            <div class="dbg-sub">
              {paused ? 'Pause avant' : 'Dernière exécution de'} « {nodeTitle(watchedNode, store.ctx)} »
            </div>
            {watches.length === 0 && <p class="hint">Ce nœud n’a pas de pin de données.</p>}
            {watches.map((w) => (
              <div key={w.pin} class="dbg-row">
                <span class="dbg-pin">
                  {w.direction === 'in' ? '→' : '←'} {w.label}
                </span>
                <span class="dbg-val">{'known' in w && !w.known ? '— (pas encore exécuté)' : formatRuntime(sim, w.value, w.type)}</span>
              </div>
            ))}
          </>
        ) : (
          <p class="hint">Touche un nœud du graphe pour voir les valeurs de sa dernière exécution.</p>
        )}
        {cls && cls.variables.length > 0 && actor && (
          <>
            <div class="dbg-sub">Variables</div>
            {cls.variables.map((v) => (
              <div key={v.id} class="dbg-row">
                <span class="dbg-pin">{v.name}</span>
                <span class="dbg-val">{formatRuntime(sim, actor.vars[v.id], v.type)}</span>
              </div>
            ))}
          </>
        )}
      </section>
      <section>
        <div class="dbg-head">
          <span>Execution Trace</span>
          {!compact && <span class="muted small">les plus récents en haut</span>}
        </div>
        {sim.trace.length === 0 && <p class="hint">Aucun nœud exécuté pour l’instant.</p>}
        {sim.trace
          .slice(-60)
          .reverse()
          .map((t) => (
            <button key={t.id} class="dbg-trace" onClick={() => onFocusNode(t.graphId, t.nodeId, t.classId)}>
              <span class="msg-time">{t.time.toFixed(2)} s</span>
              <span class="dbg-node">{t.nodeTitle}</span>
              <span class="muted">{t.actorLabel}</span>
            </button>
          ))}
      </section>
    </div>
  );
}
