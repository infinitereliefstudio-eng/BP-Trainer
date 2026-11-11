/** Top level: home screen, or one open workspace (a lesson or free play). */
import { useEffect, useRef, useState } from 'preact/hooks';
import { getLesson } from '@core/lessons';
import { startAutosave } from '@storage/persistence';
import { App } from './App';
import { Home } from './Home';
import { isScratch, loadProgress, openWorkspace, saveProgress, withPassed, type Progress, type Workspace, type WorkspaceRef } from './workspace';

export function Root() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [ws, setWs] = useState<(Workspace & { fresh: boolean }) | null>(null);

  // The latest progress, so that two changes in a row both apply.
  const latest = useRef<Progress | null>(null);

  const reload = () =>
    loadProgress().then((p) => {
      latest.current = p;
      setProgress(p);
    });
  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (!ws) return;
    // Automated UI tests (?e2e) drive the editor through its store.
    if (location.search.includes('e2e')) (window as unknown as { bpStore: unknown }).bpStore = ws.store;
    if (isScratch(ws.ref)) return;
    return startAutosave(ws.store, ws.key);
  }, [ws]);

  const changeProgress = (change: (p: Progress) => Progress) => {
    if (!latest.current) return;
    const next = change(latest.current);
    if (next === latest.current) return;
    latest.current = next;
    setProgress(next);
    saveProgress(next);
  };

  const open = async (ref: WorkspaceRef) => {
    const next = await openWorkspace(ref);
    setWs(next);
    if (!isScratch(ref)) changeProgress((p) => ({ ...p, last: ref }));
  };

  if (!progress) return <div class="boot">Chargement…</div>;
  if (!ws) return <Home progress={progress} onOpen={open} onProgress={changeProgress} onReload={reload} />;

  const lessonId = ws.ref.kind === 'lesson' ? ws.ref.lessonId : undefined;
  const altOf = ws.ref.kind === 'alternative' ? getLesson(ws.ref.lessonId) : undefined;
  const solutionOf = ws.ref.kind === 'solution' ? getLesson(ws.ref.lessonId) : undefined;
  return (
    <App
      key={ws.key}
      workspace={ws}
      alternative={altOf && ws.ref.kind === 'alternative' ? { lesson: altOf, title: altOf.alternatives?.[ws.ref.index]?.title ?? '' } : undefined}
      solution={solutionOf}
      lesson={lessonId ? getLesson(lessonId) : solutionOf}
      lessonDone={!!lessonId && progress.done.includes(lessonId)}
      onHome={() => setWs(null)}
      onLessonPassed={() => {
        if (lessonId) changeProgress((p) => withPassed(p, lessonId));
      }}
      onOpen={open}
    />
  );
}
