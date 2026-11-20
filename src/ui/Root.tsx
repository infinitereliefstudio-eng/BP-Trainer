/** Top level: home screen, or one open workspace (a lesson or free play). */
import { useEffect, useRef, useState } from 'preact/hooks';
import { getLesson } from '@core/lessons';
import { flushSaves, startAutosave } from '@storage/persistence';
import { watchForUpdates } from '../updates';
import { App } from './App';
import { Home, type Tab as HomeTab } from './Home';
import { NoticeDialog } from './status/NoticeDialog';
import { RecoveryDialog } from './status/RecoveryDialog';
import { StatusBar, type StatusMessage } from './status/StatusBar';
import {
  type BlockedWorkspace,
  isScratch,
  type LoadedProgress,
  loadProgress,
  type OpenedWorkspace,
  openWorkspace,
  type Progress,
  saveProgress,
  startOver,
  type LessonHelp,
  practiceHelpKey,
  withCheck,
  withHelp,
  withHelpReset,
  withPassed,
  withPracticeOpen,
  type WorkspaceRef,
} from './workspace';

/** Saves what is waiting, then reloads the page (a new version, or a newer project). */
const reloadApp = () => {
  flushSaves().finally(() => location.reload());
};

export function Root() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [problem, setProblem] = useState<LoadedProgress['problem']>(undefined);
  const [saveFailed, setSaveFailed] = useState(false);
  const [ws, setWs] = useState<OpenedWorkspace | null>(null);
  const [homeTab, setHomeTab] = useState<HomeTab>('path');
  const [projects, setProjects] = useState(false);
  const [blocked, setBlocked] = useState<BlockedWorkspace | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const [newer, setNewer] = useState<string | null>(null);

  // The latest progress, so that two changes in a row both apply.
  const latest = useRef<Progress | null>(null);
  const readOnly = useRef(false);

  const reload = () =>
    loadProgress().then((loaded) => {
      latest.current = loaded.progress;
      readOnly.current = loaded.problem === 'unavailable';
      setProblem(loaded.problem);
      setProgress(loaded.progress);
    });
  useEffect(() => {
    reload();
    return watchForUpdates(setNewer);
  }, []);

  useEffect(() => {
    if (!ws) return;
    // Automated UI tests (?e2e) drive the editor through its store.
    if (location.search.includes('e2e')) (window as unknown as { bpStore: unknown }).bpStore = ws.store;
    if (isScratch(ws.ref)) return;
    return startAutosave(ws.store, ws.key);
  }, [ws]);

  const persist = (p: Progress) => {
    // A progress that could not be read is not saved over: it stays in memory.
    if (readOnly.current) return;
    saveProgress(p).then(
      () => setSaveFailed(false),
      () => setSaveFailed(true),
    );
  };

  const changeProgress = (change: (p: Progress) => Progress) => {
    if (!latest.current) return;
    const next = change(latest.current);
    if (next === latest.current) return;
    latest.current = next;
    setProgress(next);
    persist(next);
  };

  const opened = (next: OpenedWorkspace) => {
    setBlocked(null);
    for (const n of next.notices) next.store.warn(n, false);
    setNotices(next.notices);
    setWs(next);
    const ref = next.ref;
    if (ref.kind === 'sandbox' || ref.kind === 'lesson') changeProgress((p) => ({ ...p, last: ref }));
    // Opening the reference solution counts as help, like its third hint.
    if (ref.kind === 'solution') changeProgress((p) => withHelp(p, ref.lessonId, (h) => ({ ...h, solution: true })));
  };

  const open = async (ref: WorkspaceRef) => {
    // A practice starts from scratch, unless the last one was left unfinished.
    const fresh = ref.kind === 'practice' && !latest.current?.rework?.open?.includes(ref.lessonId);
    const result = await openWorkspace(ref, { fresh });
    if (result.ok && fresh && ref.kind === 'practice') changeProgress((p) => withPracticeOpen(withHelpReset(p, ref.lessonId, true), ref.lessonId, true));
    if (result.ok) opened(result.workspace);
    else setBlocked(result.blocked);
  };

  const messages: StatusMessage[] = [];
  if (saveFailed) {
    messages.push({
      id: 'save-failed',
      level: 'error',
      text: 'Ta progression n’a pas pu être enregistrée sur cet appareil : elle est gardée tant que l’appli reste ouverte.',
      action: { label: 'Réessayer', run: () => latest.current && persist(latest.current) },
    });
  }
  if (problem === 'repaired') {
    messages.push({
      id: 'progress-repaired',
      level: 'warning',
      text: 'Une partie de ta progression enregistrée était illisible : le reste est repris, et l’original est gardé dans la sauvegarde complète.',
      dismissable: true,
    });
  }
  if (problem === 'unavailable') {
    messages.push({
      id: 'progress-unavailable',
      level: 'error',
      text: 'Ta progression n’a pas pu être lue. Pour ne rien écraser, elle ne sera pas enregistrée pendant cette session : ferme et rouvre l’appli.',
    });
  }
  if (newer) {
    messages.push({
      id: 'newer',
      level: 'info',
      text: `Nouvelle version de BP Trainer disponible (v${newer}).`,
      action: { label: 'Recharger', run: reloadApp },
      dismissable: true,
    });
  }

  const overlays = (
    <>
      <StatusBar messages={messages} />
      {blocked && (
        <RecoveryDialog
          blocked={blocked}
          onStartOver={async () => opened(await startOver(blocked))}
          onRetry={() => open(blocked.ref)}
          onReload={reloadApp}
          onClose={() => setBlocked(null)}
        />
      )}
      {notices.length > 0 && <NoticeDialog notices={notices} onClose={() => setNotices([])} />}
    </>
  );

  if (!progress) return <div class="boot">Chargement…</div>;
  if (!ws) {
    return (
      <>
        <Home
          progress={progress}
          onOpen={open}
          onProgress={changeProgress}
          onReload={reload}
          initialTab={homeTab}
          projects={projects}
          onProjects={setProjects}
        />
        {overlays}
      </>
    );
  }

  const lessonId = ws.ref.kind === 'lesson' ? ws.ref.lessonId : undefined;
  const practiceId = ws.ref.kind === 'practice' ? ws.ref.lessonId : undefined;
  const checked = lessonId ?? practiceId;
  const helpKey = practiceId ? practiceHelpKey(practiceId) : lessonId;
  const altOf = ws.ref.kind === 'alternative' ? getLesson(ws.ref.lessonId) : undefined;
  const solutionOf = ws.ref.kind === 'solution' ? getLesson(ws.ref.lessonId) : undefined;
  return (
    <>
      <App
        key={ws.key}
        workspace={ws}
        alternative={altOf && ws.ref.kind === 'alternative' ? { lesson: altOf, title: altOf.alternatives?.[ws.ref.index]?.title ?? '' } : undefined}
        solution={solutionOf}
        lesson={checked ? getLesson(checked) : solutionOf}
        lessonDone={!!lessonId && progress.done.includes(lessonId)}
        practice={!!practiceId}
        onHome={() => {
          // Back from a practice: to the queue it came from.
          setHomeTab(ws.ref.kind === 'practice' ? 'review' : 'path');
          setWs(null);
        }}
        onLessonPassed={() => {
          if (lessonId) changeProgress((p) => withPassed(p, lessonId));
          // A practice passed: the next one starts from scratch.
          if (practiceId) changeProgress((p) => withPracticeOpen(p, practiceId, false));
        }}
        help={helpKey ? progress.help?.[helpKey] : undefined}
        onHelp={(change: (h: LessonHelp) => LessonHelp) => {
          if (helpKey) changeProgress((p) => withHelp(p, helpKey, change));
        }}
        onHelpReset={() => {
          if (checked) changeProgress((p) => withHelpReset(p, checked, !!practiceId));
        }}
        onChecked={(outcome) => {
          const l = checked ? getLesson(checked) : undefined;
          if (l) changeProgress((p) => withCheck(p, { lesson: l.id, rev: l.revision ?? 1, practice: !!practiceId }, outcome));
        }}
        onOpen={open}
        onProjects={() => {
          setHomeTab('path');
          setProjects(true);
          setWs(null);
        }}
      />
      {overlays}
    </>
  );
}
