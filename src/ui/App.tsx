/**
 * App shell: toolbar, graph, drawers (My Blueprint, Details), bottom panel,
 * floating controls and the overlay layer.
 */
import { useMemo, useRef, useState } from 'preact/hooks';
import type { EditorStore } from '@core/store/editorStore';
import type { Value } from '@core/types/values';
import { addNode } from '@core/operations/graphOps';
import { GraphCanvas, type CanvasRequests, type GraphCanvasHandle } from '@editor/GraphCanvas';
import { StoreContext, useStore } from './hooks';
import { linkMenu, moreMenu, nodeMenu, pinMenu } from './menus';
import type { Overlay } from './overlayTypes';
import { ContentBrowser } from './overlays/ContentBrowser';
import { ContextMenu } from './overlays/ContextMenu';
import { AboutDialog, ConfirmDialog, PromptDialog, ValueDialog } from './overlays/Dialogs';
import { Palette } from './overlays/Palette';
import { BottomPanel } from './panels/BottomPanel';
import { Details } from './panels/Details';
import { MyBlueprint } from './panels/MyBlueprint';
import { Toolbar } from './Toolbar';
import { Toasts } from './widgets/Toasts';

export function App({ store }: { store: EditorStore }) {
  return (
    <StoreContext.Provider value={store}>
      <Shell />
    </StoreContext.Provider>
  );
}

function Shell() {
  const store = useStore();
  const canvas = useRef<GraphCanvasHandle>(null);
  const [left, setLeft] = useState(false);
  const [details, setDetails] = useState(false);
  const [bottom, setBottom] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [overlay, setOverlay] = useState<Overlay | null>(null);

  const openDetails = () => {
    setDetails(true);
    setLeft(false);
  };

  const requests: CanvasRequests = useMemo(
    () => ({
      openPalette: (req) => setOverlay({ kind: 'palette', req }),
      openNodeMenu: (nodeId, sx, sy) => setOverlay({ kind: 'menu', sx, sy, items: nodeMenu(store, nodeId, openDetails) }),
      openPinMenu: (ref, spec, sx, sy) =>
        setOverlay({ kind: 'menu', sx, sy, title: spec.name || 'Pin', items: pinMenu(store, ref, spec) }),
      openLinkMenu: (linkId, sx, sy) => setOverlay({ kind: 'menu', sx, sy, items: linkMenu(store, linkId) }),
      editValue: (nodeId, spec) => setOverlay({ kind: 'value', nodeId, spec }),
      openDetails,
    }),
    [store],
  );

  /** Drop a node at the centre of the view (from My Blueprint). */
  const placeNode = (def: string, config: Record<string, Value>) => {
    const c = canvas.current?.viewCenter() ?? { x: 0, y: 0 };
    const res = store.apply('Ajouter un nœud', (_cl, g) => addNode(g, def, c.x - 60, c.y - 20, config));
    if (res.ok) store.selectNodes([res.value.id]);
    else store.warn(res.reason);
    setLeft(false);
  };

  const focusNode = (graphId: string, nodeId: string) => {
    store.openGraph(graphId);
    requestAnimationFrame(() => canvas.current?.focusNode(nodeId));
  };

  const close = () => setOverlay(null);

  return (
    <div class="app">
      <Toolbar
        onToggleLeft={() => setLeft((v) => !v)}
        onToggleDetails={() => setDetails((v) => !v)}
        openOverlay={setOverlay}
        onMoreMenu={(sx, sy) => setOverlay({ kind: 'menu', sx, sy, items: moreMenu(store, setOverlay) })}
      />
      <main class="workspace">
        <GraphCanvas ref={canvas} store={store} requests={requests} selectionMode={selectionMode} />

        <div class="fabs">
          <button class="fab" disabled={!store.history.canUndo} onClick={() => store.undo()} aria-label="Annuler">
            ↶
          </button>
          <button class="fab" disabled={!store.history.canRedo} onClick={() => store.redo()} aria-label="Rétablir">
            ↷
          </button>
          <button class={`fab wide${selectionMode ? ' on' : ''}`} onClick={() => setSelectionMode((v) => !v)}>
            Sélection
          </button>
          <button class="fab" onClick={() => canvas.current?.fitView()} aria-label="Recentrer la vue">
            ⌖
          </button>
          <button
            class="fab primary"
            aria-label="Ajouter un nœud"
            onClick={() => {
              const w = canvas.current?.viewCenter() ?? { x: 0, y: 0 };
              setOverlay({ kind: 'palette', req: { sx: 0, sy: 0, world: { x: w.x - 60, y: w.y - 20 } } });
            }}
          >
            +
          </button>
        </div>

        <aside class={`drawer left${left ? ' open' : ''}`} aria-hidden={!left}>
          <div class="drawer-head">
            <strong>My Blueprint</strong>
            <button class="btn" onClick={() => setLeft(false)}>
              ✕
            </button>
          </div>
          <MyBlueprint openOverlay={setOverlay} placeNode={placeNode} onOpenDetails={openDetails} />
        </aside>

        <aside class={`drawer right${details ? ' open' : ''}`} aria-hidden={!details}>
          <div class="drawer-head">
            <strong>Details</strong>
            <button class="btn" onClick={() => setDetails(false)}>
              ✕
            </button>
          </div>
          <Details openOverlay={setOverlay} />
        </aside>

        <div class={`bottom-wrap${bottom ? ' open' : ''}`}>
          <button class="bottom-handle" onClick={() => setBottom((v) => !v)}>
            {bottom ? '▾' : '▴'} Compiler Results · Output Log
            {store.compileStatus === 'error' && <span class="pill error">erreurs</span>}
          </button>
          {bottom && <BottomPanel onFocusNode={focusNode} />}
        </div>

        <Toasts />
      </main>

      {overlay?.kind === 'palette' && (
        <Palette req={overlay.req} onClose={close} onFocusNode={(id) => canvas.current?.focusNode(id)} />
      )}
      {overlay?.kind === 'menu' && (
        <ContextMenu sx={overlay.sx} sy={overlay.sy} title={overlay.title} items={overlay.items} onClose={close} />
      )}
      {overlay?.kind === 'value' && <ValueDialog nodeId={overlay.nodeId} spec={overlay.spec} onClose={close} />}
      {overlay?.kind === 'prompt' && (
        <PromptDialog
          title={overlay.title}
          initial={overlay.initial}
          confirmLabel={overlay.confirmLabel}
          onSubmit={overlay.onSubmit}
          onClose={close}
        />
      )}
      {overlay?.kind === 'confirm' && (
        <ConfirmDialog
          title={overlay.title}
          text={overlay.text}
          confirmLabel={overlay.confirmLabel}
          onConfirm={overlay.onConfirm}
          onClose={close}
        />
      )}
      {overlay?.kind === 'content' && <ContentBrowser onClose={close} openOverlay={setOverlay} />}
      {overlay?.kind === 'about' && <AboutDialog onClose={close} />}

      <div class="rotate-hint">
        <p>Tourne ton téléphone en paysage pour utiliser l’éditeur.</p>
      </div>
    </div>
  );
}
