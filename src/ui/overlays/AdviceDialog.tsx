/** Construction advice on the open project (menu ⋮): tips on how graphs are built, never errors. */
import { adviceFor } from '@core/quality/advice';
import { useStore } from '../hooks';
import { useOwnTap } from '../widgets/useOwnTap';

export function AdviceDialog({ onClose, onFocusNode }: { onClose: () => void; onFocusNode: (graphId: string, nodeId: string, classId?: string) => void }) {
  const store = useStore();
  const tap = useOwnTap();
  const advice = adviceFor(store.project);
  return (
    <div class="sheet-backdrop" {...tap.root} onClick={tap.guard(onClose)}>
      <div class="sheet lesson" onClick={(e) => e.stopPropagation()}>
        <div class="palette-head">
          <div class="lesson-title">
            <span class="eyebrow">Qualité</span>
            <strong>Conseils de construction</strong>
          </div>
          <span class="tb-spacer" />
          <button class="btn" onClick={tap.guard(onClose)}>
            Fermer
          </button>
        </div>
        <div class="lesson-body">
          <p class="muted small">
            Des règles simples regardent la forme des graphes. Elles ne connaissent pas ton intention : prends-les comme des pistes, pas comme des erreurs.
          </p>
          {advice.length === 0 && <p class="situation">Rien à signaler sur ce projet.</p>}
          {advice.map((a, i) => (
            <article key={i} class="card advice-card">
              <h4>
                {a.title} <span class="muted small">· {a.className}</span>
              </h4>
              <p>{a.text}</p>
              <button
                class="btn"
                onClick={() => {
                  onClose();
                  onFocusNode(a.graphId, a.nodeId, a.classId);
                }}
              >
                Voir le nœud
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
