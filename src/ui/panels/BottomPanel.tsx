/** Bottom panel: Compiler Results and Output Log, like UE's tabs. */
import { useEffect, useReducer, useState } from 'preact/hooks';
import type { SimLogEntry } from '@core/runtime/simulation';
import type { PlaySession } from '@editor/world/playSession';
import { useStore } from '../hooks';

interface Props {
  onFocusNode: (graphId: string, nodeId: string) => void;
  /** The running session, or the log of the last one. */
  session?: PlaySession;
  simLog?: SimLogEntry[];
  initialTab?: 'compiler' | 'log';
}

const ICON = { error: '✕', warning: '!', info: 'i' } as const;

export function BottomPanel({ onFocusNode, session, simLog, initialTab = 'compiler' }: Props) {
  const store = useStore();
  const [tab, setTab] = useState<'compiler' | 'log'>(initialTab);
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => session?.onUi(() => force(0)), [session]);
  const playLog = session?.sim.log ?? simLog;
  return (
    <div class="bottom">
      <div class="bottom-tabs">
        <button class={tab === 'compiler' ? 'active' : ''} onClick={() => setTab('compiler')}>
          Compiler Results
        </button>
        <button class={tab === 'log' ? 'active' : ''} onClick={() => setTab('log')}>
          Output Log
        </button>
      </div>
      <div class="bottom-body">
        {tab === 'compiler' ? (
          store.compileMessages.length === 0 ? (
            <p class="hint">Touche « Compile » pour vérifier ton Blueprint.</p>
          ) : (
            store.compileMessages.map((m, i) => (
              <button
                key={i}
                class={`msg ${m.severity}`}
                disabled={!m.nodeId}
                onClick={() => m.nodeId && m.graphId && onFocusNode(m.graphId, m.nodeId)}
              >
                <span class="msg-icon">{ICON[m.severity]}</span>
                {m.text}
              </button>
            ))
          )
        ) : playLog ? (
          playLog.length === 0 ? (
            <p class="hint">Rien pour l’instant : les Print String et les erreurs d’exécution s’affichent ici.</p>
          ) : (
            [...playLog].reverse().map((e) => (
              <div key={e.id} class={`msg ${e.level === 'log' ? 'info' : e.level}`}>
                <span class="msg-time">{e.time.toFixed(2)} s</span>
                {e.text}
              </div>
            ))
          )
        ) : (
          [...store.log].reverse().map((e) => (
            <div key={e.id} class={`msg ${e.level}`}>
              <span class="msg-time">{new Date(e.time).toLocaleTimeString()}</span>
              {e.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
