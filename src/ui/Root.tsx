/** Top level: home screen, or one open workspace (a lesson or free play). */
import { useEffect, useState } from 'preact/hooks';
import { getLesson } from '@core/lessons';
import { startAutosave } from '@storage/persistence';
import { App } from './App';
import { Home } from './Home';
import { isScratch, loadProgress, openWorkspace, saveProgress, type Progress, type Workspace, type WorkspaceRef } from './workspace';

export function Root() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [ws, setWs] = useState<(Workspace & { fresh: boolean }) | null>(null);

  useEffect(() => {
    loadProgress().then(setProgress);
  }, []);

  useEffect(() => {
    if (!ws) return;
    // Automated UI tests (?e2e) drive the editor through its store.
    if (location.search.includes('e2e')) (window as unknown as { bpStore: unknown }).bpStore = ws.store;
    if (isScratch(ws.ref)) return;
    return startAutosave(ws.store, ws.key);
  }, [ws]);

  const updateProgress = (p: Progress) => {
    setProgress(p);
    saveProgress(p);
  };

  const open = async (ref: WorkspaceRef) => {
    const next = await openWorkspace(ref);
    setWs(next);
    if (progress && !isScratch(ref)) updateProgress({ ...progress, last: ref });
  };

  if (!progress) return <div class="boot">Chargement…</div>;
  if (!ws) return <Home progress={progress} onOpen={open} />;

  const lessonId = ws.ref.kind === 'lesson' ? ws.ref.lessonId : undefined;
  const altOf = ws.ref.kind === 'alternative' ? getLesson(ws.ref.lessonId) : undefined;
  return (
    <App
      key={ws.key}
      workspace={ws}
      alternative={altOf && ws.ref.kind === 'alternative' ? { lesson: altOf, title: altOf.alternatives?.[ws.ref.index]?.title ?? '' } : undefined}
      lesson={lessonId ? getLesson(lessonId) : undefined}
      lessonDone={!!lessonId && progress.done.includes(lessonId)}
      onHome={() => setWs(null)}
      onLessonPassed={() => {
        if (lessonId && !progress.done.includes(lessonId)) updateProgress({ ...progress, done: [...progress.done, lessonId] });
      }}
      onOpen={open}
    />
  );
}
