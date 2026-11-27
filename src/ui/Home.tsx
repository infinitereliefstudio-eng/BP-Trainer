/**
 * The home screen (UI-2, V7.84): a rail of spaces on the side (Apprendre, Consulter, Créer, then Réglages), the
 * pages of the space in tabs at the top, and the page itself. Root keeps the page open, so that leaving a lesson
 * comes back to where it was opened from.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { LESSONS } from '@core/lessons';
import type { Level } from '@core/lessons/levels';
import type { Lesson } from '@core/lessons/types';
import { QUIZ } from '@core/review';
import { dueQuestions } from '@core/review/schedule';
import { reworkCards } from '@core/rework/suggest';
import { MAIN_ID } from '@storage/projects';
import { Memo } from './home/Memo';
import { NodeIndex } from './home/NodeIndex';
import { Notebook } from './home/Notebook';
import { type Page, SPACES, spaceOf, type SpaceId } from './home/pages';
import { PathPage } from './home/PathPage';
import { ProjectsPage } from './home/ProjectsPage';
import { Rail } from './home/Rail';
import { Review } from './home/Review';
import { SettingsDialog } from './home/SettingsDialog';
import { Today } from './home/Today';
import { withoutLog, withRead, type Progress, type WorkspaceRef } from './workspace';

interface Props {
  progress: Progress;
  onOpen: (ref: WorkspaceRef) => void;
  onProgress: (change: (p: Progress) => Progress) => void;
  /** Reload the progress from storage (after a backup was restored). */
  onReload: () => void;
  page: Page;
  onPage: (page: Page) => void;
}

/** What a page does on arrival, when another page sends there (« Aujourd'hui » → Révision). */
interface Arrival {
  review?: 'start' | 'rework';
  level?: Level;
  memo?: string;
}

/** The page last seen in each space, while the app runs: tapping a space comes back to it. */
const lastIn: Partial<Record<SpaceId, Page>> = {};

export function Home({ progress, onOpen, onProgress, onReload, page, onPage }: Props) {
  const [arrival, setArrival] = useState<Arrival>({});
  // A new arrival remounts its page, so that it acts again even on the page already open.
  const [visit, setVisit] = useState(0);
  const [settings, setSettings] = useState(false);
  const done = useMemo(() => new Set(progress.done), [progress.done]);
  const passed = LESSONS.filter((l) => done.has(l.id)).length;
  const questions = useMemo(() => dueQuestions(QUIZ, progress, Date.now()).length, [progress]);
  const graphs = useMemo(() => reworkCards(progress, Date.now()).length, [progress]);
  const due = questions + graphs;
  const space = spaceOf(page);
  lastIn[space.id] = page;

  const main = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!arrival.level && !arrival.review) main.current?.scrollTo({ top: 0 });
  }, [page, visit]);

  const go = (p: Page, a: Arrival = {}) => {
    setArrival(a);
    setVisit((v) => v + 1);
    onPage(p);
  };
  const open = (l: Lesson) => onOpen({ kind: 'lesson', lessonId: l.id });
  const openLesson = (id: string) => onOpen({ kind: 'lesson', lessonId: id });
  const last = progress.last;

  return (
    <div class="home">
      <Rail
        page={page}
        due={due}
        onSpace={(id) => go(lastIn[id] ?? SPACES.find((s) => s.id === id)!.pages[0].id)}
        onSettings={() => setSettings(true)}
      />
      <div class="home-main" ref={main}>
        <div class="home-bar">
          {space.pages.length > 1 ? (
            <div class="home-tabs" role="tablist" aria-label={space.label}>
              {space.pages.map((p) => (
                <button key={p.id} role="tab" data-page={p.id} aria-selected={p.id === page} class={p.id === page ? 'active' : ''} onClick={() => go(p.id)}>
                  {p.label}
                  {p.id === 'review' && due > 0 && <span class="count-badge">{due}</span>}
                </button>
              ))}
            </div>
          ) : (
            <h1 class="home-title">{space.pages[0].label}</h1>
          )}
          <div class="home-progress" title={`${passed} étapes réussies sur ${LESSONS.length}`}>
            <div class="meter">
              <span style={{ width: `${(passed / LESSONS.length) * 100}%` }} />
            </div>
            <span class="muted small">
              {passed} / {LESSONS.length}
            </span>
          </div>
        </div>

        {page === 'today' && (
          <Today
            key={visit}
            progress={progress}
            onOpen={open}
            onReview={(intent) => go('review', { review: intent })}
            onPath={(level) => go('path', { level })}
          />
        )}
        {page === 'path' && <PathPage key={visit} progress={progress} onOpen={open} focusLevel={arrival.level} />}
        {page === 'review' && (
          <Review
            key={visit}
            progress={progress}
            onProgress={onProgress}
            onOpenLesson={openLesson}
            onPractice={(id) => onOpen({ kind: 'practice', lessonId: id })}
            onOpenMemo={(id) => go('memo', { memo: id })}
            intent={arrival.review}
          />
        )}
        {page === 'notebook' && <Notebook done={done} onOpen={open} log={progress.log} onClearLog={() => onProgress(withoutLog)} />}
        {page === 'nodes' && <NodeIndex onOpenLesson={openLesson} />}
        {page === 'memo' && (
          <Memo
            key={`${visit}:${arrival.memo ?? 'list'}`}
            read={progress.read ?? []}
            initial={arrival.memo}
            onRead={(id) => onProgress((p) => withRead(p, id))}
            onOpenLesson={openLesson}
          />
        )}
        {page === 'projects' && (
          <ProjectsPage
            lastId={last?.kind === 'sandbox' ? (last.projectId ?? MAIN_ID) : undefined}
            onOpen={(id) => onOpen({ kind: 'sandbox', projectId: id === MAIN_ID ? undefined : id })}
          />
        )}
      </div>

      {settings && <SettingsDialog onClose={() => setSettings(false)} onRestored={onReload} />}
    </div>
  );
}
