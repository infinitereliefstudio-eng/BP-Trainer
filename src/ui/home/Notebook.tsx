/**
 * What each lesson leaves behind: its notions, and its "À retenir" once it
 * is passed. Searching a notion (Cast, Timeline…) finds where it was learnt.
 */
import { useState } from 'preact/hooks';
import { LESSONS } from '@core/lessons';
import { LEVELS } from '@core/lessons/levels';
import { lessonLabel, type Lesson } from '@core/lessons/types';
import { plain } from './text';

export function Notebook({ done, onOpen }: { done: Set<string>; onOpen: (l: Lesson) => void }) {
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
