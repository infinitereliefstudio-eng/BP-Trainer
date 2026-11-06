/** Start screen: the learning path and free play. */
import { LESSONS } from '@core/lessons';
import type { Progress, WorkspaceRef } from './workspace';

interface Props {
  progress: Progress;
  onOpen: (ref: WorkspaceRef) => void;
}

export function Home({ progress, onOpen }: Props) {
  const done = new Set(progress.done);
  const nextLesson = LESSONS.find((l) => !done.has(l.id));
  const modules = [...new Set(LESSONS.map((l) => l.module))];
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
        {modules.map((m, mi) => (
          <section key={m} class="module">
            <h2>
              <span class="eyebrow">Module {mi + 1}</span> {m}
            </h2>
            <div class="lesson-list">
              {LESSONS.filter((l) => l.module === m).map((l) => (
                <button
                  key={l.id}
                  class={`lesson-item${done.has(l.id) ? ' done' : ''}${l.kind && l.kind !== 'build' ? ` exercise ${l.kind}` : ''}`}
                  onClick={() => onOpen({ kind: 'lesson', lessonId: l.id })}
                >
                  <span class="li-num">{done.has(l.id) ? '✓' : (l.code ?? l.number)}</span>
                  <span class="li-text">
                    {l.kind === 'predict' && <span class="eyebrow">Prédis le résultat</span>}
                    {l.kind === 'debug' && <span class="eyebrow">Débogue</span>}
                    <strong>{l.title}</strong>
                    <span>{l.situation}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
        <p class="muted small">
          {done.size} étape{done.size > 1 ? 's' : ''} réussie{done.size > 1 ? 's' : ''} sur {LESSONS.length}. La leçon de synthèse arrive à la
          prochaine étape.
        </p>
      </main>
    </div>
  );
}
