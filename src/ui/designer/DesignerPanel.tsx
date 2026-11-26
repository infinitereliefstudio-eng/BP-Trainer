/**
 * The left of UE's Designer: the Palette (widgets to place) and the
 * Hierarchy (the tree of the Widget Blueprint). On a phone, touching a
 * Palette entry places it in the panel selected in the Hierarchy (or in the
 * root), instead of UE's drag and drop; the Hierarchy's menu (⋯) offers
 * UE's right-click actions: Rename, Wrap With, Delete, and the moves.
 */
import { useState } from 'preact/hooks';
import { childCapacity, widgetTree, WIDGET_HELP, WIDGET_LABEL, WIDGET_PALETTE, type WidgetKind, type WidgetNode } from '@core/model/widgets';
import { addWidget, moveWidgetInto, moveWidgetOrder, removeWidget, renameWidget, widgetClassContains, wrapWidget } from '@core/operations/widgetOps';
import { haptic } from '@editor/haptics';
import { useStore } from '../hooks';
import type { OpenOverlay } from '../overlayTypes';

interface Props {
  openOverlay: OpenOverlay;
  onOpenDetails: () => void;
  /** The drawer closes to show what was placed. */
  onPlaced: () => void;
  tab: 'palette' | 'hierarchy';
  onTab: (t: 'palette' | 'hierarchy') => void;
}

const WRAP: WidgetKind[] = ['CanvasPanel', 'VerticalBox', 'HorizontalBox', 'Overlay', 'Button'];

export function DesignerPanel({ openOverlay, onOpenDetails, onPlaced, tab, onTab }: Props) {
  const store = useStore();
  const cls = store.cls;
  const widgets = cls.widgets ?? [];
  const f = store.focus;
  const selected = f.kind === 'widget' ? widgets.find((w) => w.id === f.id) : undefined;
  const [query, setQuery] = useState('');

  const place = (kind: WidgetKind, classId?: string) => {
    const res = store.applyProject(`Ajouter ${WIDGET_LABEL[kind]}`, (p) => {
      const c = p.classes.find((x) => x.id === cls.id);
      return c ? addWidget(p, c, kind, selected?.id, classId) : { ok: false as const, reason: 'Widget Blueprint introuvable.' };
    });
    if (!res.ok) {
      store.warn(res.reason);
      return;
    }
    store.setFocus({ kind: 'widget', id: res.value.id });
    haptic('tap');
    onPlaced();
  };

  const others = store.project.classes.filter((c) => c.parent === 'UserWidget' && c.id !== cls.id && !widgetClassContains(store.project, c.id, cls.id));
  const q = query.trim().toLowerCase();
  const match = (label: string) => !q || label.toLowerCase().includes(q);

  const menu = (w: WidgetNode, sx: number, sy: number) => {
    const panels = widgets.filter((x) => x.id !== w.id && x.id !== w.parent && childCapacity(x.kind) !== 'none');
    openOverlay({
      kind: 'menu',
      sx,
      sy,
      title: w.name,
      items: [
        {
          label: 'Details',
          action: () => {
            store.setFocus({ kind: 'widget', id: w.id });
            onOpenDetails();
          },
        },
        {
          label: 'Rename',
          action: () =>
            openOverlay({
              kind: 'prompt',
              title: `Renommer ${w.name}`,
              initial: w.name,
              confirmLabel: 'Renommer',
              onSubmit: (name) => {
                const r = store.apply(`Renommer ${w.name}`, (c) => renameWidget(c, w.id, name));
                return r.ok ? null : r.reason;
              },
            }),
        },
        {
          label: 'Wrap With…',
          action: () =>
            openOverlay({
              kind: 'menu',
              sx,
              sy,
              title: `Wrap With (${w.name})`,
              items: WRAP.map((k) => ({
                label: WIDGET_LABEL[k],
                action: () => {
                  const r = store.apply(`Wrap With ${WIDGET_LABEL[k]}`, (c) => wrapWidget(c, w.id, k));
                  if (!r.ok) store.warn(r.reason);
                  else store.setFocus({ kind: 'widget', id: r.value.id });
                },
              })),
            }),
        },
        { label: 'Monter', hint: 'Avant son voisin : dessiné dessous, placé avant dans une boîte.', disabled: !w.parent, action: () => run(() => store.apply('Monter', (c) => moveWidgetOrder(c, w.id, -1))) },
        { label: 'Descendre', disabled: !w.parent, action: () => run(() => store.apply('Descendre', (c) => moveWidgetOrder(c, w.id, 1))) },
        {
          label: 'Déplacer dans…',
          hint: 'Le glisser-déposer de la Hierarchy d’UE.',
          disabled: !w.parent || panels.length === 0,
          action: () =>
            openOverlay({
              kind: 'menu',
              sx,
              sy,
              title: `Déplacer ${w.name} dans…`,
              items: panels.map((pnl) => ({
                label: `${pnl.name} (${WIDGET_LABEL[pnl.kind]})`,
                action: () => run(() => store.apply(`Déplacer ${w.name}`, (c) => moveWidgetInto(c, w.id, pnl.id))),
              })),
            }),
        },
        { label: 'Delete', danger: true, action: () => run(() => store.apply(`Supprimer ${w.name}`, (c) => removeWidget(c, w.id))) },
      ],
    });
  };

  const run = (fn: () => { ok: boolean; reason?: string }) => {
    const r = fn();
    if (!r.ok && r.reason) store.warn(r.reason);
  };

  return (
    <div class="designer-panel">
      <div class="drawer-tabs sub" role="tablist">
        <button role="tab" class={`drawer-tab${tab === 'palette' ? ' active' : ''}`} onClick={() => onTab('palette')}>
          Palette
        </button>
        <button role="tab" class={`drawer-tab${tab === 'hierarchy' ? ' active' : ''}`} onClick={() => onTab('hierarchy')}>
          Hierarchy
        </button>
      </div>
      <div class="panel-scroll">
        {tab === 'palette' ? (
          <>
            <input class="field palette-search" type="search" placeholder="Search Palette" value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
            <p class="hint" data-origin="app">
              {widgets.length === 0
                ? 'Touche un widget : le premier devient la racine.'
                : `Touche un widget : il va dans ${selected ? selected.name : 'la racine'}${selected && childCapacity(selected.kind) === 'none' ? ' (à côté, dans son panneau)' : ''}. Dans UE, on le glisse.`}
            </p>
            {WIDGET_PALETTE.map((g) => {
              const kinds = g.kinds.filter((k) => match(WIDGET_LABEL[k]));
              if (!kinds.length) return null;
              return (
                <section key={g.category} class="mb-section">
                  <div class="mb-head">
                    <span>{g.category}</span>
                  </div>
                  {kinds.map((k) => (
                    <button key={k} class="palette-item" onClick={() => place(k)}>
                      <span class="pi-title">{WIDGET_LABEL[k]}</span>
                      <span class="pi-desc">{WIDGET_HELP[k]}</span>
                    </button>
                  ))}
                </section>
              );
            })}
            {others.some((c) => match(c.name)) && (
              <section class="mb-section">
                <div class="mb-head">
                  <span>User Created</span>
                </div>
                {others
                  .filter((c) => match(c.name))
                  .map((c) => (
                    <button key={c.id} class="palette-item" onClick={() => place('UserWidget', c.id)}>
                      <span class="pi-title">{c.name}</span>
                      <span class="pi-desc">{WIDGET_HELP.UserWidget}</span>
                    </button>
                  ))}
              </section>
            )}
          </>
        ) : (
          <>
            <div class="mb-row hier-root">
              <span class="mb-main">
                <span class="mb-label">[{cls.name}]</span>
              </span>
            </div>
            {widgets.length === 0 && <p class="hint">Vide : place un premier widget depuis la Palette.</p>}
            {widgetTree(widgets).map(({ w, depth }) => (
              <div key={w.id} class={`mb-row${selected?.id === w.id ? ' selected' : ''}`} style={{ paddingLeft: `${14 + depth * 14}px` }}>
                <button class="mb-main" onClick={() => store.setFocus({ kind: 'widget', id: w.id })}>
                  <span class="mb-label">{w.name}</span>
                  <span class="mb-sub">
                    {w.kind === 'UserWidget' ? (store.project.classes.find((c) => c.id === w.classId)?.name ?? '?') : WIDGET_LABEL[w.kind]}
                    {w.isVariable ? ' · variable' : ''}
                    {w.props.visibility === 1 ? ' · Collapsed' : w.props.visibility === 2 ? ' · Hidden' : ''}
                  </span>
                </button>
                <button
                  class="chip"
                  aria-label={`Actions sur ${w.name}`}
                  onClick={(e) => {
                    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    menu(w, r.left, r.bottom);
                  }}
                >
                  ⋯
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
