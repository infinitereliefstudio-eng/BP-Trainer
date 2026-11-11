/**
 * Spaced review: a few questions on what was learnt days ago. A right answer
 * pushes the question further away, a wrong one brings it back tomorrow.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { getLesson } from '@core/lessons';
import { lessonLabel } from '@core/lessons/types';
import { getMemo } from '@core/reference/memo';
import { QUIZ, type QuizQuestion } from '@core/review';
import { DAY, dueDate, dueQuestions, knownCount, shuffled, unlocked } from '@core/review/schedule';
import { haptic } from '@editor/haptics';
import { withAnswer, type Progress } from '../workspace';

interface Props {
  progress: Progress;
  onProgress: (change: (p: Progress) => Progress) => void;
  onOpenLesson: (lessonId: string) => void;
  onOpenMemo: (memoId: string) => void;
}

/** Questions per session: short enough to finish on a phone. */
const SESSION = 8;

interface Session {
  queue: QuizQuestion[];
  /** Whether answers move the questions in the schedule (not when practising ahead). */
  scheduled: boolean;
  index: number;
  right: number;
  /** Questions already missed once in this session: asked again at the end, not rescheduled twice. */
  missed: string[];
  seed: number;
}

function sourceOf(q: QuizQuestion): string {
  const lesson = q.lesson && getLesson(q.lesson);
  if (lesson) return `${lessonLabel(lesson)} · ${lesson.title}`;
  const memo = q.memo && getMemo(q.memo);
  return memo ? `Mémo · ${memo.title}` : '';
}

function inDays(t: number, now: number): string {
  const d = Math.max(1, Math.ceil((t - now) / DAY));
  return d === 1 ? 'demain' : `dans ${d} jours`;
}

export function Review({ progress, onProgress, onOpenLesson, onOpenMemo }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const now = Date.now();
  // On a phone in landscape the header fills half the screen: bring each question into view.
  const top = useRef<HTMLElement>(null);
  useEffect(() => {
    if (session) top.current?.scrollIntoView({ block: 'start' });
  }, [session?.index, !!session]);

  const open = useMemo(() => QUIZ.filter((q) => unlocked(q, progress)), [progress.done, progress.read]);
  const due = useMemo(() => dueQuestions(QUIZ, progress, now), [progress]);
  const known = knownCount(QUIZ, progress);
  const nextDue = open.map((q) => dueDate(q, progress)).filter((t) => t > now).sort((a, b) => a - b)[0];

  const start = (queue: QuizQuestion[], scheduled: boolean) => {
    setChoice(null);
    setSession({ queue, scheduled, index: 0, right: 0, missed: [], seed: Math.floor(Math.random() * 1e9) });
  };

  if (!session) {
    return (
      <main class="home-path review">
        <section class="review-intro">
          <h2>Révision</h2>
          <p class="muted">
            Ce qu’on ne revoit pas s’oublie. Chaque leçon réussie et chaque fiche du mémo lue ajoute une question ici : elle revient le lendemain, puis de
            plus en plus tard tant que tu réponds juste.
          </p>
          <div class="stat-row">
            <div class="stat">
              <strong>{due.length}</strong>
              <span>à revoir</span>
            </div>
            <div class="stat">
              <strong>{known}</strong>
              <span>acquises</span>
            </div>
            <div class="stat">
              <strong>
                {open.length} / {QUIZ.length}
              </strong>
              <span>débloquées</span>
            </div>
          </div>
          {due.length > 0 ? (
            <button class="btn primary big" onClick={() => start(due.slice(0, SESSION), true)}>
              Réviser {Math.min(due.length, SESSION)} question{Math.min(due.length, SESSION) > 1 ? 's' : ''}
            </button>
          ) : open.length > 0 ? (
            <>
              <p>
                <strong>Rien à revoir pour l’instant.</strong> {nextDue ? `Prochaine question ${inDays(nextDue, now)}.` : ''}
              </p>
              <button class="btn big" onClick={() => start(shuffled(open, now).slice(0, SESSION), false)}>
                S’entraîner quand même
              </button>
            </>
          ) : (
            <p>
              <strong>Aucune question débloquée.</strong> Réussis une première leçon du parcours, ou lis une fiche du mémo.
            </p>
          )}
        </section>
      </main>
    );
  }

  const q = session.queue[session.index];
  if (!q) {
    const total = session.queue.length - session.missed.length;
    return (
      <main class="home-path review">
        <section class="review-intro">
          <h2>Séance terminée</h2>
          <p>
            <strong>
              {session.right} bonne{session.right > 1 ? 's' : ''} réponse{session.right > 1 ? 's' : ''} du premier coup sur {total}.
            </strong>
          </p>
          {session.missed.length > 0 && <p class="muted">Les questions manquées reviendront demain.</p>}
          <div class="row-buttons flush">
            <button class="btn primary big" onClick={() => setSession(null)}>
              Terminer
            </button>
          </div>
        </section>
      </main>
    );
  }

  const options = shuffled(q.options, session.seed + session.index);
  const answer = q.options[0];
  const isRight = choice === answer;
  const retry = session.missed.includes(q.id);

  const pick = (o: string) => {
    if (choice !== null) return;
    setChoice(o);
    const ok = o === answer;
    haptic(ok ? 'success' : 'fail');
    if (session.scheduled && !retry) onProgress((p) => withAnswer(p, q.id, ok));
  };

  const next = () => {
    const missedNow = !isRight && !retry;
    setSession({
      ...session,
      index: session.index + 1,
      right: session.right + (isRight && !retry ? 1 : 0),
      // A missed question comes back once at the end of the session.
      queue: missedNow ? [...session.queue, q] : session.queue,
      missed: missedNow ? [...session.missed, q.id] : session.missed,
    });
    setChoice(null);
  };

  return (
    <main class="home-path review">
      <section class="quiz" ref={top}>
        <div class="quiz-head">
          <span class="eyebrow">{sourceOf(q)}</span>
          <span class="muted small">
            {session.index + 1} / {session.queue.length}
          </span>
        </div>
        <div class="meter">
          <span style={{ width: `${(session.index / session.queue.length) * 100}%` }} />
        </div>
        <p class="situation">{q.question}</p>
        <div class="options">
          {options.map((o) => (
            <button
              key={o}
              class={`option${choice === o ? (isRight ? ' ok' : ' ko') : ''}${choice !== null && o === answer ? ' answer' : ''}`}
              disabled={choice !== null}
              onClick={() => pick(o)}
            >
              {o}
            </button>
          ))}
        </div>
        {choice !== null && (
          <div class={isRight ? 'success' : 'note quiz-why'}>
            <strong>{isRight ? 'Juste.' : 'Pas cette fois.'}</strong>
            <p>{q.why}</p>
            <div class="row-buttons flush">
              <button class="btn primary" onClick={next}>
                {session.index + 1 < session.queue.length || !isRight ? 'Question suivante' : 'Voir le résultat'}
              </button>
              {!isRight && q.lesson && (
                <button class="btn" onClick={() => onOpenLesson(q.lesson!)}>
                  Revoir la leçon
                </button>
              )}
              {!isRight && q.memo && (
                <button class="btn" onClick={() => onOpenMemo(q.memo!)}>
                  Relire la fiche
                </button>
              )}
            </div>
          </div>
        )}
        <button class="btn quiz-quit" onClick={() => setSession(null)}>
          Arrêter la séance
        </button>
      </section>
    </main>
  );
}
