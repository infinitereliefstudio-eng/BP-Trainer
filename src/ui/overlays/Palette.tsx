/**
 * The node palette, UE's right-click menu « All Actions for this Blueprint »:
 * a search field, the Context Sensitive box, and the actions as a tree of
 * categories that fold. Browsing, the categories start folded; searching or
 * dragging from a pin, they open on what matches.
 */
import { useMemo, useState } from 'preact/hooks';
import { buildTree, compatiblePin, paletteEntries, searchEntries, type CategoryNode, type PaletteEntry } from '@core/nodes/palette';
import { findVariable, uniqueName } from '@core/model/project';
import { getDefinition } from '@core/nodes/registry';
import type { NodeContext } from '@core/nodes/definition';
import { pinColor } from '@editor/render/primitives';
import { haptic } from '@editor/haptics';
import { addNode, connect } from '@core/operations/graphOps';
import type { PaletteRequest } from '@editor/GraphCanvas';
import { useStore } from '../hooks';
import { useOwnTap } from '../widgets/useOwnTap';
import { recentKeys, rememberKey } from './recentNodes';
import { Icon } from '../widgets/icons';

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
  // Other Blueprints' members show up when searched for, dragged from a pin, or with Context Sensitive off.
  const results = useMemo(
    () => searchEntries(req.from || query.trim() || !contextual ? usable : usable.filter((e) => !e.contextOnly), query),
    [usable, query, contextual],
  );
  const tree = useMemo(() => buildTree(results), [results]);
  // Searching or dragging from a pin opens every category, as UE does with a filtered list.
  const filtered = !!query.trim() || !!req.from;
  const [, setOpenTick] = useState(0);
  const toggle = (path: string) => {
    if (openCategories.has(path)) openCategories.delete(path);
    else openCategories.add(path);
    setOpenTick((n) => n + 1);
  };

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

  const item = (e: PaletteEntry, depth: number, key = e.key) => (
    <button key={key} class="palette-item" style={{ paddingLeft: `${12 + depth * 14}px` }} onClick={tap.guard(() => place(e))}>
      <span class="pi-title">
        <EntryIcon entry={e} ctx={ctx} />
        {e.title}
      </span>
      <span class="pi-desc">{e.description}</span>
    </button>
  );
  const branch = (cat: CategoryNode, depth: number): preact.JSX.Element => {
    const open = filtered || openCategories.has(cat.path);
    return (
      <div key={cat.path}>
        <button class="palette-cat-row" style={{ paddingLeft: `${8 + depth * 14}px` }} aria-expanded={open} onClick={tap.guard(() => toggle(cat.path))}>
          <span class="d-caret"><Icon name={open ? 'chevron-down' : 'chevron-right'} /></span>
          {cat.name}
        </button>
        {open && (
          <>
            {cat.children.map((c) => branch(c, depth + 1))}
            {cat.entries.map((e) => item(e, depth + 1))}
          </>
        )}
      </div>
    );
  };

  return (
    <div class="sheet-backdrop" {...tap.root} onClick={tap.guard(onClose)}>
      <div class="sheet palette" onClick={(ev) => ev.stopPropagation()}>
        <div class="palette-title-row">
          <span class="palette-title">All Actions for this Blueprint</span>
          <label class="check small">
            <input type="checkbox" checked={contextual} onChange={(ev) => setContextual((ev.target as HTMLInputElement).checked)} />
            Context Sensitive
          </label>
        </div>
        <div class="palette-head">
          <input
            class="field search"
            type="search"
            placeholder="Search"
            value={query}
            onInput={(ev) => setQuery((ev.target as HTMLInputElement).value)}
          />
          <button class="btn" onClick={tap.guard(onClose)}>
            Fermer
          </button>
        </div>
        <div class="palette-list">
          {results.length === 0 && <p class="hint">Aucun nœud ne correspond.</p>}
          {recents.length > 0 && <div class="palette-cat recent app-only">Récents · BP Trainer</div>}
          {recents.map((e) => item(e, 0, `recent:${e.key}`))}
          {tree.map((c) => branch(c, 0))}
        </div>
      </div>
    </div>
  );
}

/** Categories opened by the user while browsing, kept while the app is open. */
const openCategories = new Set<string>();

/** UE's icon before an action: red event, blue (impure) or green (pure) function, the colour of a variable's type. */
function EntryIcon({ entry, ctx }: { entry: PaletteEntry; ctx: NodeContext }) {
  const kind = getDefinition(entry.def)?.kind;
  if (kind === 'variable') {
    const v = findVariable(ctx.cls, String(entry.config.variable ?? ''));
    return <span class="pi-icon var" style={{ color: v ? pinColor(v.type) : '#9a9a9a' }}>●</span>;
  }
  if (kind === 'event') return <span class="pi-icon event">◆</span>;
  if (kind === 'pure') return <span class="pi-icon pure">ƒ</span>;
  if (kind === 'flow') return <span class="pi-icon flow">⇉</span>;
  if (kind === 'comment') return <span class="pi-icon flow">▭</span>;
  return <span class="pi-icon fn">ƒ</span>;
}
