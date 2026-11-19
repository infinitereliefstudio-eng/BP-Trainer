/**
 * Editor shell for one workspace, laid out like UE: tabs for the level and
 * each open Blueprint, the toolbar of the editor shown, the graph or the
 * level, drawers named and placed as UE's panels (Components and My
 * Blueprint on the left, Details on the right), the bottom bar (Content
 * Drawer, Compiler Results, Output Log), Play and the lesson panel.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { compileClass } from '@core/compiler/validate';
import { LESSONS } from '@core/lessons';
import { diagnose } from '@core/explain/hypothesis';
import { checkOutcome } from '@core/lessons/outcome';
import type { CheckOutcome } from '@core/progress/attempts';
import { runLesson, runRobustness } from '@core/lessons/runner';
import { newAdvice } from '@core/quality/lessonAdvice';
import { avoidHits, sizeReport, verdict } from '@core/quality/review';
import { lessonLabel, type Lesson } from '@core/lessons/types';
import { familyOf } from '@core/model/project';
import { addNode } from '@core/operations/graphOps';
import { placeActor } from '@core/operations/levelOps';
import type { Simulation } from '@core/runtime/simulation';
import type { Value } from '@core/types/values';
import { GraphCanvas, type CanvasRequests, type GraphCanvasHandle } from '@editor/GraphCanvas';
import { haptic } from '@editor/haptics';
import { PlaySession } from '@editor/world/playSession';
import { WorldCanvas, type WorldRequests } from '@editor/world/WorldCanvas';
import { ViewportCanvas, type ViewportHandle, type ViewportRequests } from '@editor/viewport/ViewportCanvas';
import { StoreContext, useStore } from './hooks';
import { GoalStrip } from './lesson/GoalStrip';
import { LessonSheet, type LessonCheck } from './lesson/LessonSheet';
import { actorMenu, linkMenu, moreMenu, nodeMenu, pinMenu, placeMenu } from './menus';
import type { Overlay } from './overlayTypes';
import { ContentDrawer } from './content/ContentDrawer';
import { ContextMenu } from './overlays/ContextMenu';
import { AdviceDialog } from './overlays/AdviceDialog';
import { AboutDialog, ConfirmDialog, PromptDialog, ValueDialog } from './overlays/Dialogs';
import { Palette } from './overlays/Palette';
import { TimelineEditor } from './overlays/TimelineEditor';
import { BottomPanel, type BottomTab } from './panels/BottomPanel';
import { DebugPanel } from './panels/DebugPanel';
import { Details } from './panels/Details';
import { MyBlueprint } from './panels/MyBlueprint';
import { DebugBar } from './play/DebugBar';
import { LiveOutliner } from './play/LiveOutliner';
import { LevelOutliner } from './panels/LevelOutliner';
import { PlayOverlay } from './play/PlayOverlay';
import { playOrder } from './playSettings';
import { DocumentTabs } from './editor/DocumentTabs';
import { BlueprintToolbar, EdgeHandle, LevelToolbar } from './editor/EditorToolbars';
import { Toasts } from './widgets/Toasts';
import { type LessonHelp, resetLesson, type Workspace, type WorkspaceRef } from './workspace';

interface Props {
  workspace: Workspace & { fresh: boolean };
  lesson?: Lesson;
  /** Set when the workspace shows another way to solve `lesson`: nothing is saved. */
  alternative?: { lesson: Lesson; title: string };
  /** Set when the workspace shows the reference solution of this lesson: nothing is saved. */
  solution?: Lesson;
  lessonDone: boolean;
  onHome: () => void;
  onLessonPassed: () => void;
  onOpen: (ref: WorkspaceRef) => void;
  /** Help used on the lesson so far (hints, solution, first check), kept in the progress. */
  help?: LessonHelp;
  onHelp?: (change: (h: LessonHelp) => LessonHelp) => void;
  /** The lesson was started over: so is its help. */
  onHelpReset?: () => void;
  /** The lesson is redone from scratch (« À retravailler en Blueprint »), apart from its own project. */
  practice?: boolean;
  /** Vérifier was pressed: what it found, for the attempt log. */
  onChecked?: (outcome: CheckOutcome) => void;
}

export function App(props: Props) {
  return (
    <StoreContext.Provider value={props.workspace.store}>
      <Shell {...props} />
    </StoreContext.Provider>
  );
}

function Shell({ workspace, lesson, alternative, solution, lessonDone, onHome, onLessonPassed, onOpen, help, onHelp, onHelpReset, onChecked, practice }: Props) {
  const store = useStore();
  const canvas = useRef<GraphCanvasHandle>(null);
  const [view, setView] = useState<'graph' | 'level'>(lesson && !alternative && !solution ? 'level' : 'graph');
  // The Blueprint editor shows its Viewport (components) instead of a graph, as UE's Viewport tab.
  const [viewport, setViewport] = useState(false);
  /** The Blueprint editor on a graph (leaving the Viewport). */
  const showGraph = () => {
    setView('graph');
    setViewport(false);
  };
  // Another Blueprint opens on its graph.
  useEffect(() => setViewport(false), [store.classId]);
  const [left, setLeft] = useState(false);
  // Blueprint editors open in tabs, as in UE; the one being edited is always among them.
  const [tabs, setTabs] = useState<string[]>(() => [store.classId]);
  useEffect(() => {
    setTabs((t) => (t.includes(store.classId) ? t : [...t, store.classId]));
  }, [store.classId]);
  const openTabs = tabs.filter((id) => store.project.classes.some((c) => c.id === id));
  const [details, setDetails] = useState(false);
  // The level editor's right drawer: UE's Outliner and Details, one tab each on a phone.
  const [levelPanel, setLevelPanel] = useState<'outliner' | 'details'>('outliner');
  const [centerOn, setCenterOn] = useState<{ id: string; n: number } | undefined>(undefined);
  const [bottom, setBottom] = useState<false | BottomTab>(false);
  // Find References: the search Find Results opens with (a new one remounts the tab).
  const [find, setFind] = useState<{ query?: string; n: number }>({ n: 0 });
  const openFind = (query?: string) => {
    setFind((f) => ({ query, n: f.n + 1 }));
    setBottom('find');
  };
  const [selectionMode, setSelectionMode] = useState(false);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [session, setSession] = useState<PlaySession | null>(null);
  const [lastRun, setLastRun] = useState<Simulation | undefined>(undefined);
  const [check, setCheck] = useState<LessonCheck | null>(null);
  const scratch = !!alternative || !!solution;

  useEffect(() => {
    if (lesson && workspace.fresh && !scratch) setOverlay({ kind: 'lesson' });
  }, []);
  useEffect(() => () => session?.dispose(), [session]);

  // Keep the screen on while a game runs (the phone would sleep during a long Play).
  useEffect(() => {
    if (!session) return;
    type Lock = { release(): Promise<void> };
    const wl = (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<Lock> } }).wakeLock;
    if (!wl) return;
    let lock: Lock | undefined;
    let over = false;
    const take = () => {
      if (document.visibilityState !== 'visible') return;
      wl.request('screen')
        .then((l) => {
          if (over) l.release().catch(() => undefined);
          else lock = l;
        })
        .catch(() => undefined);
    };
    take();
    // The lock is dropped when the app goes to the background: take it again on return.
    document.addEventListener('visibilitychange', take);
    return () => {
      over = true;
      document.removeEventListener('visibilitychange', take);
      lock?.release().catch(() => undefined);
    };
  }, [session]);

  /** Run the lesson's checks on the project as it is; returns whether it passed. */
  const verify = (): boolean => {
    if (!lesson) return false;
    store.commit();
    const project = structuredClone(store.project);
    const run = runLesson(lesson, project);
    let quality: LessonCheck['quality'] = null;
    if (run.passed) {
      const parts = { robustness: runRobustness(lesson, project), advice: newAdvice(lesson, project), size: sizeReport(lesson, project), avoided: avoidHits(lesson, project) };
      quality = { ...parts, verdict: verdict(run, parts) };
    }
    setCheck({ run, quality });
    onChecked?.(checkOutcome(run));
    onHelp?.((h) => ({ ...h, tried: true, fails: run.passed ? h.fails : (h.fails ?? 0) + 1 }));
    if (run.sim) setLastRun(run.sim);
    haptic(run.passed ? 'success' : 'fail');
    if (run.passed) onLessonPassed();
    return run.passed;
  };

  const openDetails = () => {
    setLevelPanel('details');
    setDetails(true);
    setLeft(false);
  };

  const openClass = (classId: string) => {
    store.openClass(classId);
    showGraph();
  };

  const graphRequests: CanvasRequests = useMemo(
    () => ({
      openPalette: (req) => setOverlay({ kind: 'palette', req }),
      openNodeMenu: (nodeId, sx, sy) => setOverlay({ kind: 'menu', sx, sy, items: nodeMenu(store, nodeId, openDetails, openFind) }),
      openPinMenu: (ref, spec, sx, sy) => setOverlay({ kind: 'menu', sx, sy, title: spec.name || 'Pin', items: pinMenu(store, ref, spec) }),
      openLinkMenu: (linkId, sx, sy) => setOverlay({ kind: 'menu', sx, sy, items: linkMenu(store, linkId) }),
      editValue: (nodeId, spec) => setOverlay({ kind: 'value', nodeId, spec }),
      openDetails,
      openTimeline: (nodeId) => setOverlay({ kind: 'timeline', nodeId }),
    }),
    [store],
  );

  const viewportCanvas = useRef<ViewportHandle>(null);
  const viewportRequests: ViewportRequests = useMemo(
    () => ({
      openDetails,
      inherited: (name, owner) => store.info(`${name} vient de ${owner} : ouvre ${owner} pour le modifier.`),
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

  /** Content Drawer › Place in level: next to the Player Start, then shown in the level with its Details. */
  const placeFromDrawer = (classId: string) => {
    const start = store.project.level.playerStart;
    const res = store.applyProject('Placer un acteur', (p) => placeActor(p, classId, Math.round((start.x + 200) / 10) * 10, Math.round(start.y / 10) * 10));
    if (!res.ok) {
      store.warn(res.reason);
      return;
    }
    setView('level');
    store.setFocus({ kind: 'actor', id: res.value.id });
    openDetails();
  };

  /** Drop a node at the centre of the graph view (from My Blueprint). */
  const placeNode = (def: string, config: Record<string, Value>) => {
    showGraph();
    const c = canvas.current?.viewCenter() ?? { x: 0, y: 0 };
    const res = store.apply('Ajouter un nœud', (_cl, g) => addNode(g, def, c.x - 60, c.y - 20, config));
    if (res.ok) store.selectNodes([res.value.id]);
    else store.warn(res.reason);
    setLeft(false);
  };

  const focusNode = (graphId: string, nodeId: string, classId?: string, inset?: { top?: number; right?: number }) => {
    showGraph();
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
    haptic('stop');
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
        showGraph();
        setBottom('compiler');
        haptic('fail');
        store.error(`Play impossible : ${cls.name} contient des erreurs de compilation.`);
        return;
      }
    }
    store.compile(true);
    const s = new PlaySession(store.project, store.breakpoints, playOrder(), () => store.slotsWritten());
    for (const a of s.sim.deafActors()) {
      store.warn(`${a.label} a un événement de touche, mais Auto Receive Input est sur Disabled : il ne recevra pas les touches.`);
    }
    setLeft(false);
    setDetails(false);
    setBottom(false);
    setLastRun(undefined);
    setSession(s);
    setView('level');
  };

  const stop = () => {
    if (!session) return;
    setLastRun(session.sim);
    session.dispose();
    if (session.sim.slotsChanged) store.saveSlotsChanged();
    setSession(null);
    if (session.sim.runtimeErrors) {
      store.warn(`Session terminée avec ${session.sim.runtimeErrors} erreur(s) d’exécution : voir l’Output Log.`);
    }
  };

  const close = () => setOverlay(null);
  const lessonIndex = lesson ? LESSONS.indexOf(lesson) : -1;
  // A practice ends back at the queue, not on the next step of the path.
  const nextLesson = lessonIndex >= 0 && !practice ? LESSONS[lessonIndex + 1] : undefined;
  const playing = !!session;

  return (
    <div class={`app${playing ? ' playing' : ''}`}>
      <DocumentTabs
        view={view}
        tabs={openTabs}
        onLevel={() => setView('level')}
        onOpenTab={(id) => {
          // The Blueprint shown already: back to it as it was (Viewport or graph).
          if (id !== store.classId) store.openClass(id);
          setView('graph');
        }}
        onCloseTab={(id) => {
          const rest = openTabs.filter((t) => t !== id);
          setTabs(rest);
          if (id === store.classId && view === 'graph') {
            if (rest.length) store.openClass(rest[rest.length - 1]);
            else setView('level');
          }
        }}
        onHome={() => {
          stop();
          onHome();
        }}
        lessonLabel={lesson ? lessonLabel(lesson) : undefined}
        onLesson={lesson ? () => setOverlay({ kind: 'lesson' }) : undefined}
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
      {view === 'graph' ? (
        <BlueprintToolbar
          playing={playing}
          saveKey={workspace.key}
          onPlay={play}
          onStop={stop}
          onClassSettings={() => {
            store.setFocus({ kind: 'class' });
            openDetails();
          }}
          onClassDefaults={() => {
            store.setFocus({ kind: 'classDefaults' });
            openDetails();
          }}
          onFind={() => openFind()}
          viewport={viewport && !playing}
          onViewport={() => {
            setView('graph');
            setViewport(true);
          }}
          onGraph={() => setViewport(false)}
        />
      ) : (
        <LevelToolbar
          playing={playing}
          saveKey={workspace.key}
          onPlay={play}
          onStop={stop}
          onPlaceActors={(sx, sy) => setOverlay({ kind: 'menu', sx, sy, title: 'Place Actors', items: placeMenu(store, { x: 0, y: 0 }) })}
        />
      )}
      {solution && (
        <div class="scratch-bar">
          <span>
            <strong>Solution de référence</strong> — une façon de faire parmi d’autres. Lis-la, lance Play ; rien n’est enregistré ici.
          </span>
          <button
            class="btn"
            onClick={() => {
              stop();
              onOpen({ kind: 'lesson', lessonId: solution.id });
            }}
          >
            Revenir à mon travail
          </button>
        </div>
      )}
      {practice && lesson && (
        <div class="scratch-bar practice-bar">
          <span>
            {lesson.drill ? (
              <>
                <strong>Mini-exercice</strong> — quelques minutes, de mémoire. Les indices s’ouvrent après un premier Vérifier.
              </>
            ) : (
              <>
                <strong>Reprise de zéro</strong> — refais l’étape sans regarder ta solution. Ton projet de la leçon n’est pas touché.
              </>
            )}
          </span>
          <button
            class="btn"
            onClick={() => {
              stop();
              onHome();
            }}
          >
            Retour à la file
          </button>
        </div>
      )}
      {lesson && !scratch && !playing && lesson.kind !== 'predict' && (
        <GoalStrip
          lesson={lesson}
          check={check}
          done={lessonDone}
          onVerify={() => {
            if (verify()) setOverlay({ kind: 'lesson', tab: 'goals' });
          }}
          onDetails={() => setOverlay({ kind: 'lesson', tab: 'goals' })}
        />
      )}
      {alternative && (
        <div class="scratch-bar">
          <span>
            <strong>Autre façon de faire · {alternative.title}</strong> — rien n’est enregistré ici.
          </span>
          <button
            class="btn"
            onClick={() => {
              stop();
              onOpen({ kind: 'lesson', lessonId: alternative.lesson.id });
            }}
          >
            Revenir à ma solution
          </button>
        </div>
      )}
      <div class="editor-body">
      <EdgeHandle side="left" label={familyOf(store.cls.parent) === 'actor' ? 'Components · My Blueprint' : 'My Blueprint'} aria="Ouvrir My Blueprint" hidden={playing || view !== 'graph'} onClick={() => setLeft((v) => !v)} />
      <main class="workspace">
        {view === 'graph' && viewport && !playing ? (
          <ViewportCanvas ref={viewportCanvas} store={store} requests={viewportRequests} />
        ) : view === 'graph' ? (
          <GraphCanvas ref={canvas} store={store} requests={graphRequests} selectionMode={selectionMode} session={session ?? undefined} />
        ) : (
          <WorldCanvas store={store} session={session ?? undefined} requests={worldRequests} center={centerOn} />
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

        {!playing && view === 'graph' && viewport && (
          <div class="fabs">
            <button class="fab" disabled={!store.history.canUndo} onClick={() => store.undo()} aria-label="Annuler">
              ↶
            </button>
            <button class="fab" disabled={!store.history.canRedo} onClick={() => store.redo()} aria-label="Rétablir">
              ↷
            </button>
            <button class="fab" onClick={() => viewportCanvas.current?.fitView()} aria-label="Recentrer la vue">
              ⌖
            </button>
          </div>
        )}
        {!playing && view === 'graph' && !viewport && (
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
          </div>
        )}

        <aside class={`drawer left${left ? ' open' : ''}`} aria-hidden={!left}>
          <div class="drawer-head">
            <strong>{familyOf(store.cls.parent) === 'actor' ? 'Components · My Blueprint' : 'My Blueprint'}</strong>
            <button class="btn" onClick={() => setLeft(false)}>
              ✕
            </button>
          </div>
          <MyBlueprint openOverlay={setOverlay} placeNode={placeNode} onOpenDetails={openDetails} />
        </aside>

        <aside class={`drawer right${details ? ' open' : ''}`} aria-hidden={!details}>
          <div class="drawer-head">
            {view === 'level' ? (
              <div class="drawer-tabs" role="tablist">
                <button role="tab" class={`drawer-tab${levelPanel === 'outliner' ? ' active' : ''}`} onClick={() => setLevelPanel('outliner')}>
                  Outliner
                </button>
                <button role="tab" class={`drawer-tab${levelPanel === 'details' ? ' active' : ''}`} onClick={() => setLevelPanel('details')}>
                  Details
                </button>
              </div>
            ) : (
              <strong>Details</strong>
            )}
            <button class="btn" onClick={() => setDetails(false)}>
              ✕
            </button>
          </div>
          {view === 'level' && levelPanel === 'outliner' ? (
            <LevelOutliner onCenter={(id) => setCenterOn((c) => ({ id, n: (c?.n ?? 0) + 1 }))} onDetails={() => setLevelPanel('details')} />
          ) : (
            <Details openOverlay={setOverlay} onOpenClass={openClass} run={session?.sim ?? lastRun} onFocusNode={focusNode} onFind={openFind} placeNode={placeNode} />
          )}
        </aside>

        <div class={`bottom-wrap${bottom ? ' open' : ''}${playing ? ' playing' : ''}`}>
          <div class="bottom-bar">
          <button class="content-drawer-btn" disabled={playing} onClick={() => setOverlay({ kind: 'content' })}>
            ▤ Content Drawer
          </button>
          <button class="bottom-handle" onClick={() => setBottom((v) => (v ? false : 'compiler'))}>
            {bottom ? '▾' : '▴'} Compiler Results · Output Log · Debug · Find
            {store.compileStatus === 'error' && <span class="pill error">erreurs</span>}
          </button>
          </div>
          {bottom && (
            <BottomPanel
              key={`${bottom}:${find.n}`}
              initialTab={bottom}
              findQuery={find.query}
              onFindJump={(g, n, c) => {
                setBottom(false);
                focusNode(g, n, c);
              }}
              onFocusNode={focusNode}
              session={session ?? undefined}
              simLog={lastRun?.log}
            />
          )}
        </div>

        <Toasts />
      </main>
      <EdgeHandle
        side="right"
        label={view === 'level' ? 'Outliner · Details' : 'Details'}
        aria="Ouvrir Details"
        hidden={playing}
        onClick={() => {
          // In the level: the selection's Details if there is one, else the Outliner.
          if (!details && view === 'level') setLevelPanel(store.focus.kind === 'none' ? 'outliner' : 'details');
          setDetails((v) => !v);
        }}
      />
      </div>

      {overlay?.kind === 'palette' && <Palette req={overlay.req} onClose={close} onFocusNode={(id) => canvas.current?.focusNode(id)} />}
      {overlay?.kind === 'menu' && <ContextMenu sx={overlay.sx} sy={overlay.sy} title={overlay.title} items={overlay.items} onClose={close} />}
      {overlay?.kind === 'value' && <ValueDialog nodeId={overlay.nodeId} spec={overlay.spec} onClose={close} />}
      {overlay?.kind === 'prompt' && (
        <PromptDialog title={overlay.title} initial={overlay.initial} confirmLabel={overlay.confirmLabel} onSubmit={overlay.onSubmit} onClose={close} />
      )}
      {overlay?.kind === 'confirm' && (
        <ConfirmDialog title={overlay.title} text={overlay.text} confirmLabel={overlay.confirmLabel} onConfirm={overlay.onConfirm} onClose={close} />
      )}
      {overlay?.kind === 'content' && (
        <ContentDrawer onClose={close} openOverlay={setOverlay} onOpenDetails={openDetails} onOpenBlueprint={openClass} onPlaceActor={placeFromDrawer} />
      )}
      {overlay?.kind === 'about' && <AboutDialog onClose={close} />}
      {overlay?.kind === 'timeline' && <TimelineEditor nodeId={overlay.nodeId} onClose={close} />}
      {overlay?.kind === 'lesson' && lesson && (
        <LessonSheet
          lesson={lesson}
          next={nextLesson}
          done={lessonDone}
          onClose={close}
          onPassed={onLessonPassed}
          hints={help?.hints ?? 0}
          tried={!!help?.tried}
          fails={help?.fails ?? 0}
          onHint={(n) => onHelp?.((h) => ({ ...h, hints: Math.max(h.hints, n) }))}
          hypothesis={help?.hypothesis}
          onHypothesis={(choice) => {
            // Where the project points now: the last check if it failed, otherwise a check run for this.
            store.commit();
            const run = check && !check.run.passed ? check.run : runLesson(lesson, structuredClone(store.project));
            const found = diagnose(run);
            onHelp?.((h) => ({ ...h, hints: Math.max(h.hints, 1), hypothesis: { choice, ...(found ? { found: found.hypothesis, evidence: found.evidence } : {}) } }));
          }}
          check={check}
          onVerify={verify}
          initialTab={overlay.tab}
          onOpenSolution={() => {
            stop();
            onOpen({ kind: 'solution', lessonId: lesson.id });
          }}
          onNext={() => nextLesson && onOpen({ kind: 'lesson', lessonId: nextLesson.id })}
          onReset={() => {
            stop();
            resetLesson(workspace);
            onHelpReset?.();
            setCheck(null);
            setView('level');
            close();
          }}
          openOverlay={setOverlay}
          onFocusNode={focusNode}
          onOpenAlternative={(index) => {
            stop();
            onOpen({ kind: 'alternative', lessonId: lesson.id, index });
          }}
        />
      )}
      {overlay?.kind === 'advice' && <AdviceDialog onClose={close} onFocusNode={focusNode} />}

      <div class="rotate-hint">
        <p>Tourne ton téléphone en paysage pour utiliser l’éditeur.</p>
      </div>
    </div>
  );
}
