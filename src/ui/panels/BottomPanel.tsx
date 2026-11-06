/** Bottom panel: Compiler Results and Output Log, like UE's tabs. */
import { useState } from 'preact/hooks';
import { useStore } from '../hooks';

interface Props {
  onFocusNode: (graphId: string, nodeId: string) => void;
}

const ICON = { error: '✕', warning: '!', info: 'i' } as const;

export function BottomPanel({ onFocusNode }: Props) {
  const store = useStore();
  const [tab, setTab] = useState<'compiler' | 'log'>('compiler');
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
