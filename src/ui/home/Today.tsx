/**
 * Apprendre › Aujourd'hui (UI-2, V7.84): what to do today, in one row of three cards (the step to continue, the
 * spaced review, « À retravailler en Blueprint »), then where each level stands.
 */
import { useMemo } from 'preact/hooks';
import { LESSONS } from '@core/lessons';
import { chapterOf, chaptersOf } from '@core/lessons/chapters';
import { durationLabel } from '@core/lessons/duration';
import { type Level, LEVELS } from '@core/lessons/levels';
import { type Lesson, lessonLabel } from '@core/lessons/types';
import { DAY, streak } from '@core/review/schedule';
import { notionTitle } from '@core/rework/suggest';
import type { Progress } from '../workspace';
import { continuePlan, reviewPlan, reworkPlan } from './todayPlan';

interface Props {
  progress: Progress;
  onOpen: (l: Lesson) => void;
  onReview: (intent?: 'start' | 'rework') => void;
  onPath: (level?: Level) => void;
}

const HOW = { start: 'Commencer', resume: 'Reprendre', continue: 'Continuer' } as const;

function inDays(t: number, now: number): string {
  const d = Math.max(1, Math.ceil((t - now) / DAY));
  return d === 1 ? 'demain' : `dans ${d} jours`;
}

const capitalized = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

export function Today({ progress, onOpen, onReview, onPath }: Props) {
  const now = Date.now();
  const plan = useMemo(() => continuePlan(progress, now), [progress]);
  const review = useMemo(() => reviewPlan(progress, now), [progress]);
  const rework = useMemo(() => reworkPlan(progress, now), [progress]);
  const done = new Set(progress.done);
  const days = streak(progress.days ?? [], now);
  const main = plan.main;
  const level = main && LEVELS.find((lv) => lv.id === main.lesson.level);
  // Its chapter, when its level has more than one.
  const chapter = main && chaptersOf(main.lesson.level).length > 1 ? chapterOf(main.lesson.id) : undefined;
  // The synthesis of the level before, advised when the step to continue opens a new level.
  const li = main ? LEVELS.findIndex((lv) => lv.id === main.lesson.level) : -1;
  const before = li > 0 ? LESSONS.find((l) => l.level === LEVELS[li - 1].id && l.kind === 'synthesis') : undefined;
  const advise = before && !done.has(before.id) && main && !LESSONS.some((l) => l.level === main.lesson.level && done.has(l.id)) ? before : undefined;

  return (
    <main class="home-path today">
      <p class="today-head muted">
        {capitalized(new Date(now).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))}
        {days > 0 && (
          <span class="chip-stat" title="Jours d’affilée avec une leçon, une révision ou une fiche lue">
            {days} jour{days > 1 ? 's' : ''} d’affilée
          </span>
        )}
      </p>
      {!progress.done.length && <p class="muted today-intro">Les Blueprints d’Unreal Engine 5, au doigt. Tout commence par la première étape, juste ici.</p>}

      <div class="today-cards">
        {main ? (
          <button class="today-card continue" onClick={() => onOpen(main.lesson)}>
            <span class="eyebrow how">{HOW[main.how]}</span>
            <strong>
              {lessonLabel(main.lesson)} · {main.lesson.title}
            </strong>
            <span class="today-sub">
              {level?.title}
              {chapter && ` · ${chapter.title}`}
              {main.milestone && ` · jalon ${main.milestone.at}/${main.milestone.of}`}
            </span>
            <span class="today-meta">
              {durationLabel(main.minutesLeft)}
              {main.milestone && main.milestone.at < main.milestone.of ? ' pour finir le projet' : ''}
            </span>
          </button>
        ) : (
          <button class="today-card continue" onClick={() => onPath()}>
            <span class="eyebrow how">Parcours</span>
            <strong>Tout est réussi</strong>
            <span class="today-sub">Refais une étape, ou essaie une autre façon de faire.</span>
          </button>
        )}

        <button class={`today-card${review.questions ? ' due' : ''}`} onClick={() => onReview(review.questions ? 'start' : undefined)}>
          <span class={`eyebrow${review.questions ? '' : ' quiet'}`}>Révision</span>
          <strong>{review.questions ? plural(review.questions, 'question') : 'Rien à revoir'}</strong>
          <span class="today-sub">
            {review.questions
              ? review.due > review.questions
                ? `${review.due} en attente, une séance à la fois`
                : 'ce que tu as appris ces derniers jours'
              : review.nextDue
                ? `prochaine question ${inDays(review.nextDue, now)}`
                : review.any
                  ? 'tout est à jour'
                  : 'après ta première étape réussie'}
          </span>
          {review.questions > 0 && <span class="today-meta">≈ {review.minutes} min</span>}
        </button>

        <button class={`today-card${rework.cards ? ' due' : ''}`} onClick={() => onReview('rework')}>
          <span class={`eyebrow${rework.cards ? '' : ' quiet'}`}>À retravailler</span>
          <strong>{rework.cards ? plural(rework.notions, 'notion') : 'Rien aujourd’hui'}</strong>
          <span class="today-sub">
            {rework.cards
              ? 'en Blueprint, de zéro'
              : rework.next
                ? `${notionTitle(rework.next.notion)}, ${inDays(rework.next.due, now)}`
                : 'le lendemain d’une étape réussie'}
          </span>
          {rework.cards > 0 && <span class="today-meta">{durationLabel(rework.minutes)}</span>}
        </button>
      </div>

      {plan.next && (
        <p class="today-also">
          Ou la suite du parcours :{' '}
          <button class="link-btn" onClick={() => onOpen(plan.next!)}>
            {lessonLabel(plan.next)} · {plan.next.title}
          </button>
        </p>
      )}
      {advise && (
        <button class="synthesis-advice" onClick={() => onOpen(advise)}>
          Conseillé avant le niveau {level?.title} : <strong>Synthèse {advise.code} · {advise.title}</strong>. Elle reprend tout le niveau {LEVELS[li - 1].title}, sans
          aide.
        </button>
      )}

      <section class="today-levels">
        <h3>Ton parcours</h3>
        {LEVELS.map((lv) => {
          const list = LESSONS.filter((l) => l.level === lv.id);
          if (!list.length) return null;
          const count = list.filter((l) => done.has(l.id)).length;
          const current = main?.lesson.level === lv.id;
          return (
            <button key={lv.id} class={`level-row${current ? ' current' : ''}${count === list.length ? ' full' : ''}`} onClick={() => onPath(lv.id)}>
              <span class="level-row-title">
                {lv.title}
                {current && <span class="eyebrow next-tag">En cours</span>}
              </span>
              <span class="meter">
                <span style={{ width: `${(count / list.length) * 100}%` }} />
              </span>
              <span class="level-row-count">
                {count} / {list.length}
              </span>
            </button>
          );
        })}
      </section>
    </main>
  );
}
