/**
 * Révision › « À retravailler en Blueprint » : the notions due for a new
 * practice as a graph, grouped by the passed step that practises them, to
 * redo from scratch (core/rework). Never blocking: a card can be put off
 * until tomorrow, or practised with another step.
 */
import { useMemo, useState } from 'preact/hooks';
import { estimatedMinutes } from '@core/lessons/duration';
import { lessonLabel } from '@core/lessons/types';
import { DAY } from '@core/review/schedule';
import { nextRework } from '@core/rework/schedule';
import { notionTitle, type ReworkCard, reworkCards, whyNow } from '@core/rework/suggest';
import { type Progress, withPostponed } from '../workspace';

/** Shown at once: a short sitting on a phone. */
const SHOWN = 3;

function inDays(t: number, now: number): string {
  const d = Math.max(1, Math.ceil((t - now) / DAY));
  return d === 1 ? 'demain' : `dans ${d} jours`;
}

function Card({ card, progress, now, onPractice, onPostpone }: { card: ReworkCard; progress: Progress; now: number; onPractice: (id: string) => void; onPostpone: () => void }) {
  const [pick, setPick] = useState(0);
  const step = card.steps[pick % card.steps.length];
  const underway = progress.rework?.open?.includes(step.id);
  // The same reason for every notion of the card is said once.
  const reasons = [...new Set(card.notions.map((s) => whyNow(s, now)))];
  return (
    <li class="rework-item">
      <span class="note-head">
        <strong>{card.notions.map((s) => notionTitle(s.notion)).join(' · ')}</strong>
        <span class="muted small">≈ {estimatedMinutes(step)} min</span>
      </span>
      {reasons.map((r) => (
        <span key={r} class="small muted">
          {r}
        </span>
      ))}
      <span class="small">
        À refaire de zéro : <strong>{lessonLabel(step)}</strong> · {step.title}
      </span>
      <div class="row-buttons flush">
        <button class="btn primary" onClick={() => onPractice(step.id)}>
          {underway ? 'Reprendre où j’en étais' : 'Refaire de zéro'}
        </button>
        {card.steps.length > 1 && (
          <button class="btn" onClick={() => setPick(pick + 1)}>
            Une autre étape
          </button>
        )}
        <button class="btn" onClick={onPostpone}>
          Reporter à demain
        </button>
      </div>
    </li>
  );
}

export function ReworkQueue({ progress, onProgress, onPractice }: { progress: Progress; onProgress: (change: (p: Progress) => Progress) => void; onPractice: (lessonId: string) => void }) {
  const [all, setAll] = useState(false);
  const now = Date.now();
  const cards = useMemo(() => reworkCards(progress, now), [progress]);
  const next = useMemo(() => (cards.length ? undefined : nextRework(progress, now)), [progress, cards.length]);
  const shown = all ? cards : cards.slice(0, SHOWN);
  const postpone = (card: ReworkCard) =>
    onProgress((p) => card.notions.reduce((q, s) => withPostponed(q, s.notion, now + DAY, now), p));
  return (
    <section class="review-intro rework">
      <h2>À retravailler en Blueprint</h2>
      <p class="muted">
        Reconnaître un nœud ne suffit pas : il faut savoir encore le câbler quelques jours plus tard. Chaque notion revient le lendemain de l’étape qui l’enseigne, puis à J+3,
        J+7, J+14 et J+21 tant que tu la refais sans aide. Une erreur ou la solution vue la ramène au lendemain. Ton projet de la leçon n’est jamais touché.
      </p>
      {cards.length > 0 ? (
        <>
          <ul class="rework-list">
            {shown.map((card) => (
              <Card key={card.notions.map((s) => s.notion).join('+')} card={card} progress={progress} now={now} onPractice={onPractice} onPostpone={() => postpone(card)} />
            ))}
          </ul>
          {!all && cards.length > SHOWN && (
            <button class="btn" onClick={() => setAll(true)}>
              Voir les {cards.length - SHOWN} autre{cards.length - SHOWN > 1 ? 's' : ''}
            </button>
          )}
        </>
      ) : next ? (
        <p>
          <strong>Rien à refaire aujourd’hui.</strong> Prochaine reprise : {notionTitle(next.notion)}, {inDays(next.due, now)}.
        </p>
      ) : (
        <p>
          <strong>Rien pour l’instant.</strong> Une notion arrive ici le lendemain de la première étape réussie qui l’enseigne.
        </p>
      )}
    </section>
  );
}
