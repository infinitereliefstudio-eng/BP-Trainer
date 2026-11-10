/**
 * Start screen: the learning path with its progress, the notebook of what
 * has been learnt (searchable), and free play.
 */
import { useState } from 'preact/hooks';
import { LESSONS } from '@core/lessons';
import { LEVELS } from '@core/lessons/levels';
import { lessonLabel, type Lesson, type LessonKind } from '@core/lessons/types';
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

type Tab = 'path' | 'notebook';

/** Lowercase, without accents, for the notebook search. */
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function Home({ progress, onOpen }: Props) {
  const [tab, setTab] = useState<Tab>('path');
  const done = new Set(progress.done);
  const nextLesson = LESSONS.find((l) => !done.has(l.id));
  const passed = LESSONS.filter((l) => done.has(l.id)).length;
  const open = (l: Lesson) => onOpen({ kind: 'lesson', lessonId: l.id });

  return (
    <div class="home">
      <header class="home-head">
        <div>
          <h1>BP Trainer</h1>
          <p class="muted">Les Blueprints d’Unreal Engine 5, au doigt.</p>
        </div>
        <div class="home-actions">
          {nextLesson && (
            <button class="btn primary big" onClick={() => open(nextLesson)}>
              {done.size ? 'Continuer' : 'Commencer'} : {nextLesson.title}
            </button>
          )}
          <button class="btn big" onClick={() => onOpen({ kind: 'sandbox' })}>
            Simulation libre
          </button>
        </div>
      </header>

      <div class="home-bar">
        <div class="home-tabs" role="tablist">
          <button role="tab" class={tab === 'path' ? 'active' : ''} onClick={() => setTab('path')}>
            Parcours
          </button>
          <button role="tab" class={tab === 'notebook' ? 'active' : ''} onClick={() => setTab('notebook')}>
            Carnet
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

      {tab === 'path' ? (
        <main class="home-path">
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
      ) : (
        <Notebook done={done} onOpen={open} />
      )}
    </div>
  );
}

/**
 * What each lesson leaves behind: its notions, and its "À retenir" once it
 * is passed. Searching a notion (Cast, Timeline…) finds where it was learnt.
 */
function Notebook({ done, onOpen }: { done: Set<string>; onOpen: (l: Lesson) => void }) {
  const [query, setQuery] = useState('');
  const q = plain(query.trim());
  const match = (l: Lesson) => !q || plain(`${l.title} ${l.notions.join(' ')} ${done.has(l.id) ? l.remember : ''}`).includes(q);
  const found = LESSONS.filter(match);
  return (
    <main class="home-path notebook">
      <input
        class="field search"
        type="search"
        placeholder="Chercher une notion : Cast, Timeline, Delay…"
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
      />
      {done.size === 0 && !q && <p class="muted">Ton carnet se remplit à chaque étape réussie : la phrase à retenir de la leçon s’y ajoute.</p>}
      {found.length === 0 && <p class="muted">Aucune leçon ne parle de « {query} ».</p>}
      {LEVELS.map((lv) => {
        const list = found.filter((l) => l.level === lv.id);
        if (!list.length) return null;
        return (
          <section key={lv.id} class="module">
            <h2>{lv.title}</h2>
            <div class="note-list">
              {list.map((l) => (
                <button key={l.id} class={`note-item${done.has(l.id) ? ' done' : ''}`} onClick={() => onOpen(l)}>
                  <span class="note-head">
                    <strong>{l.title}</strong>
                    <span class="muted small">{lessonLabel(l)}</span>
                  </span>
                  {done.has(l.id) ? <span class="note-text">{l.remember}</span> : <span class="note-text muted">À découvrir.</span>}
                  <span class="note-tags">
                    {l.notions.map((n) => (
                      <span key={n} class="tag">
                        {n}
                      </span>
                    ))}
                  </span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
