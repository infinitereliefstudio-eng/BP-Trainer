/**
 * Apprendre › Parcours (UI-2, V7.85): a band per level, folded but the one in progress; in a level, its chapters
 * (core/lessons/chapters.ts), folded but the one of the step to do next. A search and filters on top show every
 * matching step unfolded; a legend explains the codes. What is unfolded, searched and filtered is kept while the
 * app runs, so that coming back from a lesson finds the path as it was left.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { LESSONS } from '@core/lessons';
import { type ChapterSteps, chapterOf, chaptersOf } from '@core/lessons/chapters';
import { type Level, LEVELS } from '@core/lessons/levels';
import type { Lesson } from '@core/lessons/types';
import { acquiredNotions } from '@core/notions';
import { Icon } from '../widgets/icons';
import type { Progress } from '../workspace';
import { CodeLegend } from './CodeLegend';
import {
  FORMAT_LABEL,
  type FormatFilter,
  isFiltered,
  LENGTH_LABEL,
  type LengthFilter,
  matches,
  NO_FILTER,
  type PathFilter,
  STATE_LABEL,
  type StateFilter,
} from './pathFilter';
import { StepCard } from './StepCard';
import { nextStep } from './todayPlan';

interface Props {
  progress: Progress;
  onOpen: (l: Lesson) => void;
  /** A level tapped on « Aujourd'hui »: unfolded and brought into view. */
  focusLevel?: Level;
}

/** Kept while the app runs. */
const kept = {
  levels: new Set<string>(),
  chapters: new Set<string>(),
  filter: NO_FILTER,
  filtersOpen: false,
  /** The step to do next when the page was last shown: its level and chapter unfold when it changes. */
  next: undefined as string | undefined,
};

const chapterKey = (c: ChapterSteps) => c.from;

export function PathPage({ progress, onOpen, focusLevel }: Props) {
  const done = new Set(progress.done);
  const next = nextStep(progress);
  const acquired = useMemo(() => acquiredNotions(progress.done), [progress.done]);
  const [, redraw] = useState(0);
  const [legend, setLegend] = useState(false);
  const page = useRef<HTMLElement>(null);
  const refresh = () => redraw((n) => n + 1);

  // The level and chapter of the step to do next unfold, once each time it changes.
  if (next && kept.next !== next.id) {
    kept.next = next.id;
    kept.levels.add(next.level);
    const c = chapterOf(next.id);
    if (c) kept.chapters.add(chapterKey(c));
  }
  useEffect(() => {
    if (!focusLevel) return;
    kept.filter = NO_FILTER;
    kept.levels.add(focusLevel);
    refresh();
    requestAnimationFrame(() => page.current?.querySelector(`#level-${focusLevel}`)?.scrollIntoView({ block: 'start' }));
  }, []);

  const filter = kept.filter;
  const filtered = isFiltered(filter);
  const setFilter = (f: Partial<PathFilter>) => {
    kept.filter = { ...kept.filter, ...f };
    refresh();
  };
  const toggle = (set: Set<string>, key: string) => {
    if (set.has(key)) set.delete(key);
    else set.add(key);
    refresh();
  };

  const levels = LEVELS.filter((lv) => LESSONS.some((l) => l.level === lv.id));
  const allChapters = levels.flatMap((lv) => chaptersOf(lv.id)).filter((c) => chaptersOf(c.level).length > 1);
  const allOpen = levels.every((lv) => kept.levels.has(lv.id)) && allChapters.every((c) => kept.chapters.has(chapterKey(c)));
  const unfoldAll = () => {
    if (allOpen) {
      kept.levels.clear();
      kept.chapters.clear();
    } else {
      for (const lv of levels) kept.levels.add(lv.id);
      for (const c of allChapters) kept.chapters.add(chapterKey(c));
    }
    refresh();
  };

  const card = (l: Lesson) => <StepCard key={l.id} lesson={l} done={done.has(l.id)} next={l === next} acquired={acquired} progress={progress} onOpen={onOpen} />;
  const shown = filtered ? LESSONS.filter((l) => matches(l, filter, progress)) : LESSONS;
  const shownIds = new Set(shown.map((l) => l.id));

  return (
    <main class="home-path path" ref={page}>
      <div class="path-tools">
        <label class="path-search-box">
          <Icon name="search" />
          <input
            class="path-search"
            type="search"
            placeholder="Chercher une étape, une notion, un code…"
            aria-label="Chercher dans le parcours"
            value={filter.query}
            onInput={(e) => setFilter({ query: (e.target as HTMLInputElement).value })}
          />
          {filter.query && (
            <button class="path-clear" aria-label="Effacer la recherche" onClick={() => setFilter({ query: '' })}>
              <Icon name="close" />
            </button>
          )}
        </label>
        <button
          class={`btn path-tool${kept.filtersOpen || (filtered && !filter.query) ? ' on' : ''}`}
          aria-expanded={kept.filtersOpen}
          onClick={() => {
            kept.filtersOpen = !kept.filtersOpen;
            refresh();
          }}
        >
          <Icon name="filter" /> Filtres
        </button>
        <button class={`btn path-tool${legend ? ' on' : ''}`} aria-expanded={legend} onClick={() => setLegend(!legend)}>
          Codes
        </button>
        {!filtered && (
          <button class="btn path-tool" onClick={unfoldAll}>
            <Icon name={allOpen ? 'chevron-up' : 'chevron-down'} /> {allOpen ? 'Tout replier' : 'Tout déplier'}
          </button>
        )}
      </div>

      {kept.filtersOpen && (
        <div class="path-filters">
          <FilterRow label="État" value={filter.state} labels={STATE_LABEL} onPick={(state: StateFilter) => setFilter({ state })} />
          <FilterRow label="Format" value={filter.format} labels={FORMAT_LABEL} onPick={(format: FormatFilter) => setFilter({ format })} />
          <FilterRow label="Durée" value={filter.length} labels={LENGTH_LABEL} onPick={(length: LengthFilter) => setFilter({ length })} />
        </div>
      )}
      {legend && <CodeLegend onClose={() => setLegend(false)} />}

      {filtered && (
        <p class="path-found muted">
          {shown.length ? `${shown.length} étape${shown.length > 1 ? 's' : ''}` : 'Aucune étape ne correspond.'}{' '}
          <button class="link-btn" onClick={() => setFilter(NO_FILTER)}>
            Tout afficher
          </button>
        </p>
      )}

      {levels.map((lv, li) => {
        const list = LESSONS.filter((l) => l.level === lv.id);
        const hits = list.filter((l) => shownIds.has(l.id));
        if (!hits.length) return null;
        const count = list.filter((l) => done.has(l.id)).length;
        const open = filtered || kept.levels.has(lv.id);
        const before = li > 0 ? LESSONS.find((l) => l.level === levels[li - 1].id && l.kind === 'synthesis') : undefined;
        const advise = before && !done.has(before.id) && count === 0 ? before : undefined;
        const chapters = chaptersOf(lv.id);
        return (
          <section key={lv.id} class={`module level-band${open ? ' open' : ''}`} id={`level-${lv.id}`}>
            <h2>
              <button class="band-head" aria-expanded={open} onClick={() => !filtered && toggle(kept.levels, lv.id)}>
                <Icon name={open ? 'chevron-down' : 'chevron-right'} />
                <span class="band-title">{lv.title}</span>
                <span class={`level-count${count === list.length ? ' full' : ''}`}>
                  {count} / {list.length}
                </span>
                {next?.level === lv.id && !open && <span class="eyebrow next-tag">À suivre ici</span>}
                <span class="meter band-meter">
                  <span style={{ width: `${(count / list.length) * 100}%` }} />
                </span>
              </button>
            </h2>
            {open && !filtered && (
              <p class="band-about muted small">
                {lv.summary} <span class="level-help">{lv.help}</span>
              </p>
            )}
            {open && advise && !filtered && (
              <button class="synthesis-advice" onClick={() => onOpen(advise)}>
                Conseillé avant ce niveau : <strong>Synthèse {advise.code} · {advise.title}</strong>. Elle reprend tout le niveau {levels[li - 1].title}, sans aide.
              </button>
            )}
            {open &&
              (chapters.length < 2 ? (
                <div class="lesson-list">{hits.map(card)}</div>
              ) : (
                chapters.map((c) => {
                  const steps = c.steps.filter((l) => shownIds.has(l.id));
                  if (!steps.length) return null;
                  const cOpen = filtered || kept.chapters.has(chapterKey(c));
                  const cDone = c.steps.filter((l) => done.has(l.id)).length;
                  const hasNext = !!next && c.steps.includes(next);
                  return (
                    <div key={c.from} class={`chapter${cOpen ? ' open' : ''}`}>
                      <button class="chapter-head" aria-expanded={cOpen} onClick={() => !filtered && toggle(kept.chapters, chapterKey(c))}>
                        <Icon name={cOpen ? 'chevron-down' : 'chevron-right'} />
                        <span class="chapter-title">{c.title}</span>
                        <span class={`chapter-count${cDone === c.steps.length ? ' full' : ''}`}>
                          {cDone === c.steps.length ? <Icon name="check" /> : null}
                          {cDone} / {c.steps.length}
                        </span>
                        {hasNext && !cOpen && <span class="eyebrow next-tag">À suivre</span>}
                      </button>
                      {cOpen && <div class="lesson-list">{steps.map(card)}</div>}
                    </div>
                  );
                })
              ))}
          </section>
        );
      })}
      {!filtered && <p class="muted small">Tous les niveaux sont ouverts : suis l’ordre, ou commence où tu veux.</p>}
    </main>
  );
}

function FilterRow<T extends string>({ label, value, labels, onPick }: { label: string; value: T; labels: Record<T, string>; onPick: (v: T) => void }) {
  return (
    <div class="filter-row">
      <span class="filter-label">{label}</span>
      <div class="segmented">
        {(Object.keys(labels) as T[]).map((k) => (
          <button key={k} class={k === value ? 'active' : ''} aria-pressed={k === value} onClick={() => onPick(k)}>
            {labels[k]}
          </button>
        ))}
      </div>
    </div>
  );
}
