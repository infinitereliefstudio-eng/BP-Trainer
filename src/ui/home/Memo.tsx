/**
 * The memo: short cards on what surrounds Blueprints in UE (framework,
 * Enhanced Input, UMG, references, shortcuts…). Reading a card adds its
 * questions to the review.
 */
import { useState } from 'preact/hooks';
import { getLesson } from '@core/lessons';
import { lessonLabel } from '@core/lessons/types';
import { MEMO, MEMO_THEMES, type MemoCard } from '@core/reference/memo';
import { QUIZ } from '@core/review';
import { RichText } from '../lesson/RichText';
import { plain } from './text';

interface Props {
  read: readonly string[];
  /** The card to show on arrival (from a review question). */
  initial?: string;
  onRead: (memoId: string) => void;
  onOpenLesson: (lessonId: string) => void;
}

export function Memo({ read, initial, onRead, onOpenLesson }: Props) {
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | undefined>(initial);
  const q = plain(query.trim());
  const match = (m: MemoCard) => !q || plain(`${m.title} ${m.summary} ${m.keywords.join(' ')} ${m.body}`).includes(q);
  const found = MEMO.filter(match);
  const card = MEMO.find((m) => m.id === openId);

  const show = (m: MemoCard) => {
    setOpenId(m.id);
    onRead(m.id);
  };

  if (card) {
    const index = MEMO.indexOf(card);
    const next = MEMO[index + 1];
    const questions = QUIZ.filter((x) => x.memo === card.id).length;
    return (
      <main class="home-path memo-reader">
        <button class="btn" onClick={() => setOpenId(undefined)}>
          ‹ Toutes les fiches
        </button>
        <article class="card memo-card">
          <span class="eyebrow">{MEMO_THEMES.find((t) => t.id === card.theme)?.title}</span>
          <h2>{card.title}</h2>
          <RichText text={card.body} />
        </article>
        {card.lessons && card.lessons.length > 0 && (
          <section class="q-section">
            <p class="eyebrow">À pratiquer dans le parcours</p>
            <div class="chip-row">
              {card.lessons.map((id) => {
                const l = getLesson(id);
                return l ? (
                  <button key={id} class="btn" onClick={() => onOpenLesson(id)}>
                    {lessonLabel(l)} · {l.title}
                  </button>
                ) : null;
              })}
            </div>
          </section>
        )}
        {questions > 0 && (
          <p class="muted small">
            Fiche lue : {questions} question{questions > 1 ? 's' : ''} sur ce sujet {questions > 1 ? 'rejoignent' : 'rejoint'} ta révision.
          </p>
        )}
        {next && (
          <button class="btn primary" onClick={() => show(next)}>
            Fiche suivante : {next.title}
          </button>
        )}
      </main>
    );
  }

  return (
    <main class="home-path notebook">
      <p class="muted">
        Ce qui entoure les Blueprints dans Unreal Engine et que le simulateur n’exécute pas : le cadre d’un jeu, les entrées, l’interface, la mémoire, l’éditeur.
        {` ${read.length} / ${MEMO.length} fiches lues.`}
      </p>
      <input
        class="field search"
        type="search"
        placeholder="Chercher : GameMode, widget, Cast, raccourci…"
        value={query}
        onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
      />
      {found.length === 0 && <p class="muted">Aucune fiche ne parle de « {query} ».</p>}
      {MEMO_THEMES.map((theme) => {
        const list = found.filter((m) => m.theme === theme.id);
        if (!list.length) return null;
        return (
          <section key={theme.id} class="module">
            <h2>{theme.title}</h2>
            <div class="note-list">
              {list.map((m) => (
                <button key={m.id} class={`note-item${read.includes(m.id) ? ' done' : ''}`} onClick={() => show(m)}>
                  <span class="note-head">
                    <strong>{m.title}</strong>
                    {read.includes(m.id) && <span class="muted small">lue</span>}
                  </span>
                  <span class="note-text muted">{m.summary}</span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
