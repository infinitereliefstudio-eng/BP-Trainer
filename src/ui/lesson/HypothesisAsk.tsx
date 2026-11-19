/**
 * « Hypothèse avant l'indice » (chantier n° 2, étape D): in a Débogue, the
 * learner says where he thinks the problem is before the first hint opens;
 * afterwards, what the check showed (core/explain/hypothesis.ts).
 */
import { HYPOTHESES, type HypothesisChoice, hypothesisFeedback, hypothesisLabel, type Hypothesis } from '@core/explain/hypothesis';
import type { HypothesisNote } from '@core/progress/progress';

export function HypothesisAsk({ onChoose }: { onChoose: (choice: HypothesisChoice) => void }) {
  return (
    <article class="card hypothesis">
      <h4>Avant l’indice : où est le problème, selon toi ?</h4>
      <p class="muted small">Un débogage commence par une hypothèse. Choisis, même sans être sûr : l’indice s’ouvre juste après.</p>
      <div class="hypothesis-options">
        {HYPOTHESES.map((h) => (
          <button key={h.id} class="btn option" onClick={() => onChoose(h.id)}>
            <strong>{h.label}</strong>
            <span class="muted small">{h.detail}</span>
          </button>
        ))}
        <button class="btn option" onClick={() => onChoose('unsure')}>
          <strong>Je ne sais pas encore</strong>
        </button>
      </div>
    </article>
  );
}

export function HypothesisCard({ note }: { note: HypothesisNote }) {
  const choice = note.choice as HypothesisChoice;
  const found = note.found && note.evidence ? { hypothesis: note.found as Hypothesis, evidence: note.evidence } : undefined;
  return (
    <article class="card hint-card hypothesis">
      <h4>Ton hypothèse : {hypothesisLabel(choice)}</h4>
      <p>{hypothesisFeedback(choice, found)}</p>
    </article>
  );
}
