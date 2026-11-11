/**
 * The node palette (UE's right-click menu): searchable, grouped by category,
 * and context-sensitive when opened from a dragged wire.
 */
import { useMemo, useState } from 'preact/hooks';
import { compatiblePin, paletteEntries, searchEntries, type PaletteEntry } from '@core/nodes/palette';
import { uniqueName } from '@core/model/project';
import { getDefinition } from '@core/nodes/registry';
import { haptic } from '@editor/haptics';
import { addNode, connect } from '@core/operations/graphOps';
import type { PaletteRequest } from '@editor/GraphCanvas';
import { useStore } from '../hooks';
import { useOwnTap } from '../widgets/useOwnTap';
import { recentKeys, rememberKey } from './recentNodes';

interface Props {
  req: PaletteRequest;
  onClose: () => void;
  onFocusNode: (nodeId: string) => void;
}

export function Palette({ req, onClose, onFocusNode }: Props) {
  const store = useStore();
  const [query, setQuery] = useState('');
  const [contextual, setContextual] = useState(true);
  const ctx = store.ctx;
  const tap = useOwnTap();

  const all = useMemo(() => paletteEntries(ctx, store.graph), [store.cls, store.graph]);
  const usable = useMemo(
    () => (req.from && contextual ? all.filter((e) => compatiblePin(e, ctx, req.from!)) : all),
    [all, req.from, contextual],
  );
  // Other Blueprints' members only show up when searched for or dragged from a pin.
  const results = useMemo(
    () => searchEntries(req.from || query.trim() ? usable : usable.filter((e) => !e.contextOnly), query),
    [usable, query],
  );

  // The last nodes placed, offered first when browsing: the same ten come back all the time.
  const recents = useMemo(() => {
    if (query.trim() || req.from) return [];
    const byKey = new Map(usable.map((e) => [e.key, e]));
    return recentKeys()
      .map((k) => byKey.get(k))
      .filter((e) => !!e);
  }, [usable, query, req.from]);

  const place = (e: PaletteEntry) => {
    rememberKey(e.key);
    const def = getDefinition(e.def);
    if (def?.unique) {
      const existing = Object.values(store.graph.nodes).find((n) => n.def === e.def);
      if (existing) {
        onClose();
        onFocusNode(existing.id);
        store.info(`${e.title} existe déjà : il est affiché à l’écran.`);
        return;
      }
    }
    const from = req.from;
    // Place the node so the wire lands on its side: to the right of an output, to the left of an input.
    const x = from && from.dir === 'in' ? req.world.x - 220 : req.world.x;
    const y = req.world.y - 18;
    const res = store.apply(`Ajouter ${e.title}`, (c, g) => {
      const config = { ...e.config };
      if (e.def === 'event.custom') {
        const taken = c.graphs.flatMap((gr) => Object.values(gr.nodes).filter((n) => n.def === 'event.custom').map((n) => String(n.config.name)));
        config.name = uniqueName(String(config.name || 'CustomEvent'), taken);
      }
      const added = addNode(g, e.def, x, y, config);
      if (added.ok && from) {
        const pin = compatiblePin(e, ctx, from);
        if (pin) connect(g, from.ref, { node: added.value.id, pin: pin.id }, store.ctx);
      }
      return added;
    });
    onClose();
    haptic(res.ok ? 'tap' : 'refuse');
    if (!res.ok) store.warn(res.reason);
    else store.selectNodes([res.value.id]);
  };

  let lastCat = '';
  return (
    <div class="sheet-backdrop" {...tap.root} onClick={tap.guard(onClose)}>
      <div class="sheet palette" onClick={(ev) => ev.stopPropagation()}>
        <div class="palette-head">
          <input
            class="field search"
            type="search"
            placeholder="Rechercher un nœud…"
            value={query}
            onInput={(ev) => setQuery((ev.target as HTMLInputElement).value)}
          />
          {req.from && (
            <label class="check small">
              <input type="checkbox" checked={contextual} onChange={(ev) => setContextual((ev.target as HTMLInputElement).checked)} />
              Context Sensitive
            </label>
          )}
          <button class="btn" onClick={tap.guard(onClose)}>
            Fermer
          </button>
        </div>
        <div class="palette-list">
          {results.length === 0 && <p class="hint">Aucun nœud ne correspond.</p>}
          {recents.length > 0 && <div class="palette-cat recent">Récents</div>}
          {recents.map((e) => (
            <button key={`recent:${e.key}`} class="palette-item" onClick={tap.guard(() => place(e))}>
              <span class="pi-title">{e.title}</span>
              <span class="pi-desc">{e.description}</span>
            </button>
          ))}
          {results.map((e) => {
            const header = !query && e.category !== lastCat ? e.category : null;
            lastCat = e.category;
            return (
              <div key={e.key}>
                {header && <div class="palette-cat">{header.replace(/\|/g, ' › ')}</div>}
                <button class="palette-item" onClick={tap.guard(() => place(e))}>
                  <span class="pi-title">{e.title}</span>
                  <span class="pi-desc">{e.description}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
