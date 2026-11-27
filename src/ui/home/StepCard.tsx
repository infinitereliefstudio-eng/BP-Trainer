/**
 * One step of the learning path as a card: its number or code, its format, its title and situation, and a line
 * under it (duration, notions still missing, how it was passed). Used by Parcours and Aujourd'hui (UI-2, V7.84).
 */
import { getLesson } from '@core/lessons';
import { availability } from '@core/lessons/chain';
import { durationLabel, estimatedMinutes, milestoneMinutes } from '@core/lessons/duration';
import { isChainExercise, type Lesson, type LessonKind } from '@core/lessons/types';
import { missingNotions } from '@core/notions';
import type { HelpLevel } from '@core/progress/progress';
import type { Progress } from '../workspace';

const KIND_LABEL: Record<Exclude<LessonKind, 'build'>, string> = {
  predict: 'Prédis le résultat',
  debug: 'Débogue',
  complete: 'Complète le graphe',
  refactor: 'Refactor : réécris-le mieux',
  synthesis: 'Synthèse du niveau : cahier des charges',
};

/** The eyebrow of an exercise card: its format, or its step in a chain. */
export function eyebrowOf(l: Lesson): string | undefined {
  if (l.chain?.step === 'transfer') return 'Transfert : sans plan';
  if (l.chain?.step === 'autonomy') return 'En autonomie : cahier des charges';
  if (l.code?.startsWith('M')) return 'Entraînement : à toi de choisir les outils';
  if (l.code?.startsWith('X')) return 'Projet Expert : plusieurs séances';
  return l.kind && l.kind !== 'build' ? KIND_LABEL[l.kind] : undefined;
}

const HELP_LABEL: Record<HelpLevel, string> = { alone: 'réussie seul', hints: 'avec indices', solution: 'solution vue' };

const dateLabel = (t: number) => new Date(t).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * A step's duration. A project in milestones (V7.74) says the milestone in
 * progress and the whole: « jalon 2/6 ≈ 1 h 45 · ≈ 10 h 30 en tout ».
 */
function stepDuration(lesson: Lesson, done: boolean, passed: number | undefined): string {
  const each = milestoneMinutes(lesson);
  const total = durationLabel(estimatedMinutes(lesson));
  if (each.length < 2) return total;
  if (done && (passed ?? each.length) >= each.length) return `${each.length} jalons · ${total}`;
  const at = Math.min(passed ?? 0, each.length - 1);
  return `jalon ${at + 1}/${each.length} ${durationLabel(each[at])} · ${total} en tout`;
}

/** Under a card: duration, notions still missing, how it was passed, when a delayed step is offered. */
function StepMeta({ lesson, done, acquired, progress }: { lesson: Lesson; done: boolean; acquired: ReadonlySet<string>; progress: Progress }) {
  const parts: string[] = [stepDuration(lesson, done, progress.milestones?.[lesson.id])];
  if (done) {
    const how = progress.passedWith?.[lesson.id];
    if (how) parts.push(HELP_LABEL[how]);
  } else {
    const wait = availability(lesson, progress.done, progress.doneAt);
    if (wait.after) parts.push(`après ${getLesson(wait.after)?.code ?? ''} ${getLesson(wait.after)?.title ?? ''}`.replace('  ', ' '));
    else if (wait.from) parts.push(`conseillé à partir du ${dateLabel(wait.from)}`);
    const missing = missingNotions(lesson.id, acquired);
    if (missing.length) parts.push(`demande : ${missing.map((n) => n.title).join(', ')}`);
  }
  return <span class="li-meta">{parts.join(' · ')}</span>;
}

interface Props {
  lesson: Lesson;
  done: boolean;
  /** The step the path advises next. */
  next: boolean;
  acquired: ReadonlySet<string>;
  progress: Progress;
  onOpen: (l: Lesson) => void;
}

export function StepCard({ lesson: l, done, next, acquired, progress, onOpen }: Props) {
  const exercise = (l.kind && l.kind !== 'build') || isChainExercise(l);
  return (
    <button class={`lesson-item${done ? ' done' : ''}${next ? ' next' : ''}${exercise ? ` exercise ${l.chain?.step ?? l.kind}` : ''}`} onClick={() => onOpen(l)}>
      <span class="li-num">{done ? '✓' : (l.code ?? l.number)}</span>
      <span class="li-text">
        {eyebrowOf(l) && <span class="eyebrow">{eyebrowOf(l)}</span>}
        {next && <span class="eyebrow next-tag">À suivre</span>}
        <strong>{l.title}</strong>
        <span>{l.situation}</span>
        <StepMeta lesson={l} done={done} acquired={acquired} progress={progress} />
      </span>
    </button>
  );
}
