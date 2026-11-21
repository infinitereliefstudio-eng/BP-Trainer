/**
 * The level editor's Outliner, always at hand as in UE: every item of the
 * level with its Item Label and Type, a search field, and the selection
 * shared with the level view. Touching a row selects the item and brings it
 * into view; its Details are one tab away.
 */
import { useState } from 'preact/hooks';
import { outlinerRows } from '@core/model/outliner';
import { useStore } from '../hooks';
import { isPlayerStartId, levelOf, MAIN_START_ID, playerStartsOf } from '@core/model/project';

interface Props {
  /** Bring the item into the middle of the level view. */
  onCenter: (id: string) => void;
  onDetails: () => void;
}

export function LevelOutliner({ onCenter, onDetails }: Props) {
  const store = useStore();
  const [search, setSearch] = useState('');
  const rows = outlinerRows(store.project, search);
  const f = store.focus;
  const selected = f.kind === 'actor' ? f.id : f.kind === 'playerStart' ? (f.id ?? MAIN_START_ID) : f.kind === 'worldSettings' ? 'worldSettings' : undefined;
  const pick = (id: string) => {
    if (id === 'worldSettings') {
      store.setFocus({ kind: 'worldSettings' });
      return;
    }
    store.setFocus(isPlayerStartId(id) ? { kind: 'playerStart', id } : { kind: 'actor', id });
    onCenter(id);
  };
  return (
    <div class="panel-scroll level-outliner">
      <div class="details-search">
        <input class="field search" type="search" placeholder="Search..." value={search} onInput={(e) => setSearch((e.target as HTMLInputElement).value)} />
      </div>
      <div class="outliner-cols">
        <span>Item Label</span>
        <span>Type</span>
      </div>
      {rows.map((r) => (
        <div key={r.id} class={`outliner-line${r.id === selected ? ' selected' : ''}`}>
          <button class="outliner-pick" onClick={() => pick(r.id)}>
            <span class="ol-label">{r.label}</span>
            <span class="ol-type">{r.type}</span>
          </button>
          {r.id === selected && (
            <button class="chip" onClick={onDetails}>
              Details ›
            </button>
          )}
        </div>
      ))}
      <p class="outliner-count">{levelOf(store.project).actors.length + playerStartsOf(levelOf(store.project)).length} actors</p>
    </div>
  );
}
