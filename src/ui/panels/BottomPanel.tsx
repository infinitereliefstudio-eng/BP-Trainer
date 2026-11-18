/** Bottom panel: Compiler Results, Output Log, Debug and Find Results, like UE's tabs. */
import { useEffect, useReducer, useState } from 'preact/hooks';
import { explainCompile } from '@core/explain/compile';
import type { SimLogEntry } from '@core/runtime/simulation';
import type { PlaySession } from '@editor/world/playSession';
import { useStore } from '../hooks';
import { Why } from '../widgets/Why';
import { DebugPanel } from './DebugPanel';
import { FindResults } from './FindResults';

export type BottomTab = 'compiler' | 'log' | 'debug' | 'find';

interface Props {
  onFocusNode: (graphId: string, nodeId: string, classId?: string) => void;
  /** The running session, or the log of the last one. */
  session?: PlaySession;
  simLog?: SimLogEntry[];
  initialTab?: BottomTab;
  /** Find References: the search to run when Find Results opens. */
  findQuery?: string;
  /** A Find result touched: the node is shown with the panel closed, the phone screen being too small for both. */
  onFindJump?: (graphId: string, nodeId: string, classId?: string) => void;
}

const ICON = { error: '✕', warning: '!', info: 'i' } as const;

export function BottomPanel({ onFocusNode, session, simLog, initialTab = 'compiler', findQuery, onFindJump }: Props) {
  const store = useStore();
  const [tab, setTab] = useState<BottomTab>(initialTab);
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
        <button class={tab === 'debug' ? 'active' : ''} onClick={() => setTab('debug')}>
          Debug
        </button>
        <button class={tab === 'find' ? 'active' : ''} onClick={() => setTab('find')}>
          Find Results
        </button>
      </div>
      <div class="bottom-body">
        {tab === 'find' ? (
          <FindResults onFocusNode={onFindJump ?? onFocusNode} initialQuery={findQuery} />
        ) : tab === 'debug' ? (
          <DebugPanel session={session} onFocusNode={onFocusNode} />
        ) : tab === 'compiler' ? (
          store.compileMessages.length === 0 ? (
            <p class="hint">Touche « Compile » pour vérifier ton Blueprint.</p>
          ) : (
            store.compileMessages.map((m, i) => {
              const explain = explainCompile(m.code);
              return (
                <div key={i} class="msg-block">
                  <button class={`msg ${m.severity}`} disabled={!m.nodeId} onClick={() => m.nodeId && m.graphId && onFocusNode(m.graphId, m.nodeId)}>
                    <span class="msg-icon">{ICON[m.severity]}</span>
                    {m.text}
                  </button>
                  {explain && <Why explain={explain} />}
                </div>
              );
            })
          )
        ) : playLog ? (
          playLog.length === 0 ? (
            <p class="hint">Rien pour l’instant : les Print String et les erreurs d’exécution s’affichent ici.</p>
          ) : (
            [...playLog].reverse().map((e) => (
              <div key={e.id} class="msg-block">
                <div class={`msg ${e.level === 'log' ? 'info' : e.level}`}>
                  <span class="msg-time">{e.time.toFixed(2)} s</span>
                  {e.text}
                </div>
                {e.explain && <Why explain={e.explain} />}
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
