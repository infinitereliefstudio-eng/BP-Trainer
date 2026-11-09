/**
 * In a node's Details: "Pourquoi ce nœud ne s'est pas exécuté ?", answered
 * from the running or last play session. Each step can jump to its node.
 */
import { useEffect, useReducer, useState } from 'preact/hooks';
import { diagnoseNode, type Diagnosis } from '@core/explain/diagnose';
import type { Simulation } from '@core/runtime/simulation';
import { Group } from './fields';

interface Props {
  run?: Simulation;
  graphId: string;
  nodeId: string;
  onFocusNode: (graphId: string, nodeId: string, classId?: string) => void;
}

export function NodeDiagnosis({ run, graphId, nodeId, onFocusNode }: Props) {
  const [result, setResult] = useState<Diagnosis | null>(null);
  const [, force] = useReducer((n: number) => n + 1, 0);
  // A new selection or a new session clears the previous answer.
  useEffect(() => setResult(null), [run, graphId, nodeId]);
  if (!run) {
    return (
      <Group title="Exécution">
        <p class="muted small">Lance Play : ensuite, ce panneau peut dire si ce nœud s’est exécuté, et sinon pourquoi.</p>
      </Group>
    );
  }
  const ask = () => {
    setResult(diagnoseNode({ project: run.project, record: run.record, label: (id) => run.allActors().find((a) => a.id === id)?.label ?? id }, graphId, nodeId));
    force(0);
  };
  return (
    <Group title="Exécution">
      <button class="btn" onClick={ask}>
        {result ? 'Mettre à jour' : 'Pourquoi ce nœud ne s’est pas exécuté ?'}
      </button>
      {result && (
        <ol class="diag">
          {result.steps.map((s, i) => (
            <li key={i}>
              {s.text}
              {s.at && (s.at.nodeId !== nodeId || s.at.graphId !== graphId) && (
                <button class="link" onClick={() => onFocusNode(s.at!.graphId, s.at!.nodeId, s.at!.classId)}>
                  voir le nœud
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
      {result && <p class="muted small">D’après la partie, jusqu’à {run.time.toFixed(2).replace('.', ',')} s.</p>}
    </Group>
  );
}
