/** Start screen: the learning path and free play. */
import { LESSONS } from '@core/lessons';
import { LEVELS } from '@core/lessons/levels';
import type { LessonKind } from '@core/lessons/types';
import type { Progress, WorkspaceRef } from './workspace';

interface Props {
  progress: Progress;
  onOpen: (ref: WorkspaceRef) => void;
}

const KIND_LABEL: Record<Exclude<LessonKind, 'build'>, string> = {
  predict: 'Prédis le résultat',
  debug: 'Débogue',
  complete: 'Complète le graphe',
  refactor: 'Refactor : réécris-le mieux',
};

export function Home({ progress, onOpen }: Props) {
  const done = new Set(progress.done);
  const nextLesson = LESSONS.find((l) => !done.has(l.id));

  return (
    <div class="home">
      <header class="home-head">
        <div>
          <h1>BP Trainer</h1>
          <p class="muted">Les Blueprints d’Unreal Engine 5, au doigt.</p>
        </div>
        <div class="home-actions">
          {nextLesson && (
            <button class="btn primary big" onClick={() => onOpen({ kind: 'lesson', lessonId: nextLesson.id })}>
              {done.size ? 'Continuer' : 'Commencer'} : {nextLesson.title}
            </button>
          )}
          <button class="btn big" onClick={() => onOpen({ kind: 'sandbox' })}>
            Simulation libre
          </button>
        </div>
      </header>
      <main class="home-path">
        {LEVELS.map((lv) => (
          <section key={lv.id} class="module">
            <h2>
              {lv.title} <span class="muted small">{lv.summary}</span>
            </h2>
            <div class="lesson-list">
              {LESSONS.filter((l) => l.level === lv.id).map((l) => (
                <button
                  key={l.id}
                  class={`lesson-item${done.has(l.id) ? ' done' : ''}${l.kind && l.kind !== 'build' ? ` exercise ${l.kind}` : ''}`}
                  onClick={() => onOpen({ kind: 'lesson', lessonId: l.id })}
                >
                  <span class="li-num">{done.has(l.id) ? '✓' : (l.code ?? l.number)}</span>
                  <span class="li-text">
                    {l.kind && l.kind !== 'build' && <span class="eyebrow">{KIND_LABEL[l.kind]}</span>}
                    <strong>{l.title}</strong>
                    <span>{l.situation}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
        <p class="muted small">
          {done.size} étape{done.size > 1 ? 's' : ''} réussie{done.size > 1 ? 's' : ''} sur {LESSONS.length}. Tous les niveaux sont ouverts : commence
          où tu veux.
        </p>
      </main>
    </div>
  );
}
