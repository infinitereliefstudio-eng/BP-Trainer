/**
 * Start screen: the learning path with its progress, the spaced review, the
 * notebook of what has been learnt, the node index, the UE memo, and free play.
 */
import { useMemo, useState } from 'preact/hooks';
import { getLesson, LESSONS } from '@core/lessons';
import { LEVELS } from '@core/lessons/levels';
import type { Lesson, LessonKind } from '@core/lessons/types';
import { QUIZ } from '@core/review';
import { dueQuestions, streak } from '@core/review/schedule';
import { APP_VERSION } from '../version';
import { BackupDialog } from './home/BackupDialog';
import { Memo } from './home/Memo';
import { NodeIndex } from './home/NodeIndex';
import { Notebook } from './home/Notebook';
import { Review } from './home/Review';
import { withRead, type Progress, type WorkspaceRef } from './workspace';

interface Props {
  progress: Progress;
  onOpen: (ref: WorkspaceRef) => void;
  onProgress: (change: (p: Progress) => Progress) => void;
  /** Reload the progress from storage (after a backup was restored). */
  onReload: () => void;
}

const KIND_LABEL: Record<Exclude<LessonKind, 'build'>, string> = {
  predict: 'Prédis le résultat',
  debug: 'Débogue',
  complete: 'Complète le graphe',
  refactor: 'Refactor : réécris-le mieux',
};

type Tab = 'path' | 'review' | 'notebook' | 'nodes' | 'memo';

export function Home({ progress, onOpen, onProgress, onReload }: Props) {
  const [tab, setTab] = useState<Tab>('path');
  const [memoId, setMemoId] = useState<string | undefined>(undefined);
  const [backup, setBackup] = useState(false);
  const done = new Set(progress.done);
  const nextLesson = LESSONS.find((l) => !done.has(l.id));
  const passed = LESSONS.filter((l) => done.has(l.id)).length;
  const open = (l: Lesson) => onOpen({ kind: 'lesson', lessonId: l.id });
  const openLesson = (id: string) => onOpen({ kind: 'lesson', lessonId: id });
  const due = useMemo(() => dueQuestions(QUIZ, progress, Date.now()).length, [progress]);
  const days = streak(progress.days ?? [], Date.now());

  // "Reprendre" : the last workspace, when it is not what "Continuer" already offers.
  const last = progress.last;
  const lastLesson = last?.kind === 'lesson' ? getLesson(last.lessonId) : undefined;
  const resume = lastLesson && lastLesson !== nextLesson && !done.has(lastLesson.id) ? lastLesson : undefined;

  const go = (t: Tab) => {
    setMemoId(undefined);
    setTab(t);
  };

  return (
    <div class="home">
      <header class="home-head">
        <div>
          <h1>BP Trainer</h1>
          <p class="muted">Les Blueprints d’Unreal Engine 5, au doigt.</p>
          <p class="home-chips">
            {days > 0 && (
              <span class="chip-stat" title="Jours d’affilée avec une leçon, une révision ou une fiche lue">
                {days} jour{days > 1 ? 's' : ''} d’affilée
              </span>
            )}
            <button class="chip-stat link" onClick={() => setBackup(true)}>
              Sauvegarde · v{APP_VERSION}
            </button>
          </p>
        </div>
        <div class="home-actions">
          {nextLesson && (
            <button class="btn primary big" onClick={() => open(nextLesson)}>
              {done.size ? 'Continuer' : 'Commencer'} : {nextLesson.title}
            </button>
          )}
          {resume && (
            <button class="btn big" onClick={() => open(resume)}>
              Reprendre : {resume.title}
            </button>
          )}
          <button class="btn big" onClick={() => onOpen({ kind: 'sandbox' })}>
            Simulation libre
          </button>
        </div>
      </header>

      <div class="home-bar">
        <div class="home-tabs" role="tablist">
          <button role="tab" class={tab === 'path' ? 'active' : ''} onClick={() => go('path')}>
            Parcours
          </button>
          <button role="tab" class={tab === 'review' ? 'active' : ''} onClick={() => go('review')}>
            Révision{due > 0 && <span class="count-badge">{due}</span>}
          </button>
          <button role="tab" class={tab === 'notebook' ? 'active' : ''} onClick={() => go('notebook')}>
            Carnet
          </button>
          <button role="tab" class={tab === 'nodes' ? 'active' : ''} onClick={() => go('nodes')}>
            Nœuds
          </button>
          <button role="tab" class={tab === 'memo' ? 'active' : ''} onClick={() => go('memo')}>
            Mémo UE
          </button>
        </div>
        <div class="home-progress" title={`${passed} étapes réussies sur ${LESSONS.length}`}>
          <div class="meter">
            <span style={{ width: `${(passed / LESSONS.length) * 100}%` }} />
          </div>
          <span class="muted small">
            {passed} / {LESSONS.length}
          </span>
        </div>
      </div>

      {tab === 'path' && (
        <main class="home-path">
          {due > 0 && (
            <button class="review-banner" onClick={() => go('review')}>
              <span>
                <strong>
                  {due} question{due > 1 ? 's' : ''} à revoir
                </strong>
                <span class="muted"> · deux minutes pour ne pas oublier ce que tu as appris</span>
              </span>
              <span class="review-go">Réviser ›</span>
            </button>
          )}
          {LEVELS.map((lv) => {
            const list = LESSONS.filter((l) => l.level === lv.id);
            const count = list.filter((l) => done.has(l.id)).length;
            return (
              <section key={lv.id} class="module">
                <h2>
                  {lv.title}
                  <span class={`level-count${count === list.length ? ' full' : ''}`}>
                    {count} / {list.length}
                  </span>
                  <span class="muted small">{lv.summary}</span>
                </h2>
                <div class="lesson-list">
                  {list.map((l) => (
                    <button
                      key={l.id}
                      class={`lesson-item${done.has(l.id) ? ' done' : ''}${l === nextLesson ? ' next' : ''}${l.kind && l.kind !== 'build' ? ` exercise ${l.kind}` : ''}`}
                      onClick={() => open(l)}
                    >
                      <span class="li-num">{done.has(l.id) ? '✓' : (l.code ?? l.number)}</span>
                      <span class="li-text">
                        {l.kind && l.kind !== 'build' && <span class="eyebrow">{KIND_LABEL[l.kind]}</span>}
                        {l === nextLesson && <span class="eyebrow next-tag">À suivre</span>}
                        <strong>{l.title}</strong>
                        <span>{l.situation}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
          <p class="muted small">Tous les niveaux sont ouverts : suis l’ordre, ou commence où tu veux.</p>
        </main>
      )}
      {tab === 'review' && (
        <Review
          progress={progress}
          onProgress={onProgress}
          onOpenLesson={openLesson}
          onOpenMemo={(id) => {
            setMemoId(id);
            setTab('memo');
          }}
        />
      )}
      {tab === 'notebook' && <Notebook done={done} onOpen={open} />}
      {tab === 'nodes' && <NodeIndex onOpenLesson={openLesson} />}
      {tab === 'memo' && (
        <Memo key={memoId ?? 'list'} read={progress.read ?? []} initial={memoId} onRead={(id) => onProgress((p) => withRead(p, id))} onOpenLesson={openLesson} />
      )}

      {backup && <BackupDialog onClose={() => setBackup(false)} onRestored={onReload} />}
    </div>
  );
}
