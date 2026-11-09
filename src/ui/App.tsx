/**
 * Editor shell for one workspace: toolbar, graph or level view, drawers
 * (My Blueprint, Details), bottom panel, Play and the lesson panel.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { compileClass } from '@core/compiler/validate';
import { LESSONS } from '@core/lessons';
import { lessonLabel, type Lesson } from '@core/lessons/types';
import { addNode } from '@core/operations/graphOps';
import type { SimLogEntry } from '@core/runtime/simulation';
import type { Value } from '@core/types/values';
import { GraphCanvas, type CanvasRequests, type GraphCanvasHandle } from '@editor/GraphCanvas';
import { PlaySession } from '@editor/world/playSession';
import { WorldCanvas, type WorldRequests } from '@editor/world/WorldCanvas';
import { StoreContext, useStore } from './hooks';
import { LessonSheet } from './lesson/LessonSheet';
import { actorMenu, linkMenu, moreMenu, nodeMenu, pinMenu, placeMenu } from './menus';
import type { Overlay } from './overlayTypes';
import { ContentBrowser } from './overlays/ContentBrowser';
import { ContextMenu } from './overlays/ContextMenu';
import { AboutDialog, ConfirmDialog, PromptDialog, ValueDialog } from './overlays/Dialogs';
import { Palette } from './overlays/Palette';
import { BottomPanel, type BottomTab } from './panels/BottomPanel';
import { DebugPanel } from './panels/DebugPanel';
import { Details } from './panels/Details';
import { MyBlueprint } from './panels/MyBlueprint';
import { DebugBar } from './play/DebugBar';
import { LiveOutliner } from './play/LiveOutliner';
import { PlayOverlay } from './play/PlayOverlay';
import { playOrder } from './playSettings';
import { Toolbar, type MainView } from './Toolbar';
import { Toasts } from './widgets/Toasts';
import { resetLesson, type Workspace, type WorkspaceRef } from './workspace';

interface Props {
  workspace: Workspace & { fresh: boolean };
  lesson?: Lesson;
  lessonDone: boolean;
  onHome: () => void;
  onLessonPassed: () => void;
  onOpen: (ref: WorkspaceRef) => void;
}

export function App(props: Props) {
  return (
    <StoreContext.Provider value={props.workspace.store}>
      <Shell {...props} />
    </StoreContext.Provider>
  );
}

function Shell({ workspace, lesson, lessonDone, onHome, onLessonPassed, onOpen }: Props) {
  const store = useStore();
  const canvas = useRef<GraphCanvasHandle>(null);
  const [view, setView] = useState<MainView>(lesson ? 'level' : 'graph');
  const [left, setLeft] = useState(false);
  const [details, setDetails] = useState(false);
  const [bottom, setBottom] = useState<false | BottomTab>(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [session, setSession] = useState<PlaySession | null>(null);
  const [lastLog, setLastLog] = useState<SimLogEntry[] | undefined>(undefined);

  useEffect(() => {
    if (lesson && workspace.fresh) setOverlay({ kind: 'lesson' });
  }, []);
  useEffect(() => () => session?.dispose(), [session]);

  const openDetails = () => {
    setDetails(true);
    setLeft(false);
  };

  const openClass = (classId: string) => {
    store.openClass(classId);
    setView('graph');
  };

  const graphRequests: CanvasRequests = useMemo(
    () => ({
      openPalette: (req) => setOverlay({ kind: 'palette', req }),
      openNodeMenu: (nodeId, sx, sy) => setOverlay({ kind: 'menu', sx, sy, items: nodeMenu(store, nodeId, openDetails) }),
      openPinMenu: (ref, spec, sx, sy) => setOverlay({ kind: 'menu', sx, sy, title: spec.name || 'Pin', items: pinMenu(store, ref, spec) }),
      openLinkMenu: (linkId, sx, sy) => setOverlay({ kind: 'menu', sx, sy, items: linkMenu(store, linkId) }),
      editValue: (nodeId, spec) => setOverlay({ kind: 'value', nodeId, spec }),
      openDetails,
    }),
    [store],
  );

  const worldRequests: WorldRequests = useMemo(
    () => ({
      openActorMenu: (id, sx, sy) => setOverlay({ kind: 'menu', sx, sy, items: actorMenu(store, id, openClass) }),
      openPlaceMenu: (world, sx, sy) => setOverlay({ kind: 'menu', sx, sy, title: 'Placer dans le niveau', items: placeMenu(store, world) }),
      openDetails,
    }),
    [store],
  );

  /** Drop a node at the centre of the graph view (from My Blueprint). */
  const placeNode = (def: string, config: Record<string, Value>) => {
    setView('graph');
    const c = canvas.current?.viewCenter() ?? { x: 0, y: 0 };
    const res = store.apply('Ajouter un nœud', (_cl, g) => addNode(g, def, c.x - 60, c.y - 20, config));
    if (res.ok) store.selectNodes([res.value.id]);
    else store.warn(res.reason);
    setLeft(false);
  };

  const focusNode = (graphId: string, nodeId: string, classId?: string, inset?: { top?: number; right?: number }) => {
    setView('graph');
    if (classId && classId !== store.classId) store.openClass(classId);
    store.openGraph(graphId);
    requestAnimationFrame(() => canvas.current?.focusNode(nodeId, inset));
  };

  // A breakpoint shows the node where execution stopped, like UE does,
  // with the Debug drawer open beside it.
  const [debugOpen, setDebugOpen] = useState(false);
  const [outliner, setOutliner] = useState(false);
  const showPaused = () => {
    const p = session?.sim.paused;
    if (!p) return;
    setBottom(false);
    setDebugOpen(true);
    focusNode(p.graphId, p.nodeId, p.classId, { top: 60, right: Math.min(300, window.innerWidth * 0.8) });
  };
  useEffect(() => session?.onBreak(showPaused), [session]);
  const debugDrawer = !!session && view === 'graph' && debugOpen;

  // ------------------------------------------------------------------ play

  const play = () => {
    store.commit();
    for (const cls of store.project.classes) {
      if (compileClass(cls, store.project).status === 'error') {
        store.openClass(cls.id);
        store.compile();
        setView('graph');
        setBottom('compiler');
        store.error(`Play impossible : ${cls.name} contient des erreurs de compilation.`);
        return;
      }
    }
    store.compile(true);
    const s = new PlaySession(store.project, store.breakpoints, playOrder());
    for (const a of s.sim.deafActors()) {
      store.warn(`${a.label} a un événement de touche, mais Auto Receive Input est sur Disabled : il ne recevra pas les touches.`);
    }
    setLeft(false);
    setDetails(false);
    setBottom(false);
    setLastLog(undefined);
    setSession(s);
    setView('level');
  };

  const stop = () => {
    if (!session) return;
    setLastLog(session.sim.log);
    session.dispose();
    setSession(null);
    if (session.sim.runtimeErrors) {
      store.warn(`Session terminée avec ${session.sim.runtimeErrors} erreur(s) d’exécution : voir l’Output Log.`);
    }
  };

  const close = () => setOverlay(null);
  const lessonIndex = lesson ? LESSONS.indexOf(lesson) : -1;
  const nextLesson = lessonIndex >= 0 ? LESSONS[lessonIndex + 1] : undefined;
  const playing = !!session;

  return (
    <div class={`app${playing ? ' playing' : ''}`}>
      <Toolbar
        view={view}
        playing={playing}
        saveKey={workspace.key}
        lessonLabel={lesson ? lessonLabel(lesson) : undefined}
        onView={setView}
        onHome={() => {
          stop();
          onHome();
        }}
        onToggleLeft={() => setLeft((v) => !v)}
        onToggleDetails={() => setDetails((v) => !v)}
        onPlay={play}
        onStop={stop}
        onLesson={lesson ? () => setOverlay({ kind: 'lesson' }) : undefined}
        openOverlay={setOverlay}
        onMoreMenu={(sx, sy) =>
          setOverlay({
            kind: 'menu',
            sx,
            sy,
            items: moreMenu(store, setOverlay, {
              sandbox: workspace.ref.kind === 'sandbox',
              onClassSettings: () => {
                store.setFocus({ kind: 'class' });
                openDetails();
              },
            }),
          })
        }
      />
      <main class="workspace">
        {view === 'graph' ? (
          <GraphCanvas ref={canvas} store={store} requests={graphRequests} selectionMode={selectionMode} session={session ?? undefined} />
        ) : (
          <WorldCanvas store={store} session={session ?? undefined} requests={worldRequests} />
        )}

        {playing && session && view === 'level' && (
          <PlayOverlay session={session} onStop={stop} onShowLog={() => setBottom('log')} onOutliner={() => setOutliner((v) => !v)} />
        )}
        {playing && session && view === 'level' && (
          <aside class={`drawer right outliner-drawer${outliner ? ' open' : ''}`} aria-hidden={!outliner}>
            <div class="drawer-head">
              <strong>Outliner</strong>
              <button class="btn" onClick={() => setOutliner(false)}>
                ✕
              </button>
            </div>
            <div class="panel-scroll">
              <LiveOutliner session={session} />
            </div>
          </aside>
        )}
        {playing && session && view === 'graph' && (
          <DebugBar
            session={session}
            drawerOpen={debugDrawer}
            onToggleDrawer={() => setDebugOpen((v) => !v)}
            onLevel={() => setView('level')}
            onShowPaused={showPaused}
          />
        )}
        {playing && session && (
          <aside class={`drawer right debug-drawer${debugDrawer ? ' open' : ''}`} aria-hidden={!debugDrawer}>
            <div class="drawer-head">
              <strong>Debug</strong>
              <button class="btn" onClick={() => setDebugOpen(false)}>
                ✕
              </button>
            </div>
            <div class="panel-scroll">
              <DebugPanel session={session} onFocusNode={focusNode} compact />
            </div>
          </aside>
        )}

        {!playing && view === 'graph' && (
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
        )}

        {!playing && view === 'level' && (
          <div class="fabs">
            <button class="fab" disabled={!store.history.canUndo} onClick={() => store.undo()} aria-label="Annuler">
              ↶
            </button>
            <button class="fab" disabled={!store.history.canRedo} onClick={() => store.redo()} aria-label="Rétablir">
              ↷
            </button>
            <button
              class="fab wide"
              onClick={(e) => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setOverlay({ kind: 'menu', sx: r.left - 120, sy: r.top - 160, title: 'Placer dans le niveau', items: placeMenu(store, { x: 0, y: 0 }) });
              }}
            >
              + Placer
            </button>
            <button class="fab primary wide" onClick={play}>
              ▶ Play
            </button>
          </div>
        )}

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
          <Details openOverlay={setOverlay} onOpenClass={openClass} />
        </aside>

        <div class={`bottom-wrap${bottom ? ' open' : ''}${playing ? ' playing' : ''}`}>
          <button class="bottom-handle" onClick={() => setBottom((v) => (v ? false : 'compiler'))}>
            {bottom ? '▾' : '▴'} Compiler Results · Output Log · Debug
            {store.compileStatus === 'error' && <span class="pill error">erreurs</span>}
          </button>
          {bottom && (
            <BottomPanel
              key={bottom}
              initialTab={bottom}
              onFocusNode={focusNode}
              session={session ?? undefined}
              simLog={lastLog}
            />
          )}
        </div>

        <Toasts />
      </main>

      {overlay?.kind === 'palette' && <Palette req={overlay.req} onClose={close} onFocusNode={(id) => canvas.current?.focusNode(id)} />}
      {overlay?.kind === 'menu' && <ContextMenu sx={overlay.sx} sy={overlay.sy} title={overlay.title} items={overlay.items} onClose={close} />}
      {overlay?.kind === 'value' && <ValueDialog nodeId={overlay.nodeId} spec={overlay.spec} onClose={close} />}
      {overlay?.kind === 'prompt' && (
        <PromptDialog title={overlay.title} initial={overlay.initial} confirmLabel={overlay.confirmLabel} onSubmit={overlay.onSubmit} onClose={close} />
      )}
      {overlay?.kind === 'confirm' && (
        <ConfirmDialog title={overlay.title} text={overlay.text} confirmLabel={overlay.confirmLabel} onConfirm={overlay.onConfirm} onClose={close} />
      )}
      {overlay?.kind === 'content' && <ContentBrowser onClose={close} openOverlay={setOverlay} onOpenDetails={openDetails} />}
      {overlay?.kind === 'about' && <AboutDialog onClose={close} />}
      {overlay?.kind === 'lesson' && lesson && (
        <LessonSheet
          lesson={lesson}
          next={nextLesson}
          done={lessonDone}
          onClose={close}
          onPassed={onLessonPassed}
          onNext={() => nextLesson && onOpen({ kind: 'lesson', lessonId: nextLesson.id })}
          onReset={() => {
            stop();
            resetLesson(workspace);
            setView('level');
            close();
          }}
          openOverlay={setOverlay}
        />
      )}

      <div class="rotate-hint">
        <p>Tourne ton téléphone en paysage pour utiliser l’éditeur.</p>
      </div>
    </div>
  );
}
