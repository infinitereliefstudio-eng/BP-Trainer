/**
 * The lesson panel: explanations, objectives with the automatic check,
 * and three levels of help.
 */
import { useState } from 'preact/hooks';
import type { Lesson } from '@core/lessons/types';
import { runLesson, type LessonRun } from '@core/lessons/runner';
import { useStore } from '../hooks';
import type { OpenOverlay } from '../overlayTypes';
import { useOwnTap } from '../widgets/useOwnTap';
import { RichText, richInline } from './RichText';

interface Props {
  lesson: Lesson;
  next?: Lesson;
  done: boolean;
  onClose: () => void;
  onPassed: () => void;
  onNext: () => void;
  onReset: () => void;
  openOverlay: OpenOverlay;
}

type Tab = 'learn' | 'goals' | 'help';

export function LessonSheet({ lesson, next, done, onClose, onPassed, onNext, onReset, openOverlay }: Props) {
  const store = useStore();
  const tap = useOwnTap();
  const [tab, setTab] = useState<Tab>('learn');
  const [run, setRun] = useState<LessonRun | null>(null);
  const [hints, setHints] = useState(0);

  const verify = () => {
    store.commit();
    const res = runLesson(lesson, structuredClone(store.project));
    setRun(res);
    if (res.passed) onPassed();
  };

  return (
    <div class="sheet-backdrop" {...tap.root} onClick={tap.guard(onClose)}>
      <div class="sheet lesson" onClick={(e) => e.stopPropagation()}>
        <div class="palette-head">
          <div class="lesson-title">
            <span class="eyebrow">
              Leçon {lesson.number} · {lesson.module}
            </span>
            <strong>{lesson.title}</strong>
          </div>
          {done && <span class="pill ok">réussie</span>}
          <span class="tb-spacer" />
          <button class="btn" onClick={tap.guard(onClose)}>
            Fermer
          </button>
        </div>
        <div class="lesson-tabs" role="tablist">
          <button class={tab === 'learn' ? 'active' : ''} onClick={() => setTab('learn')}>
            Comprendre
          </button>
          <button class={tab === 'goals' ? 'active' : ''} onClick={() => setTab('goals')}>
            Objectifs
          </button>
          <button class={tab === 'help' ? 'active' : ''} onClick={() => setTab('help')}>
            Aide
          </button>
        </div>
        <div class="lesson-body">
          {tab === 'learn' && (
            <>
              <p class="situation">{lesson.situation}</p>
              {lesson.cards.map((c) => (
                <article key={c.title} class="card">
                  <h4>{c.title}</h4>
                  <RichText text={c.body} />
                </article>
              ))}
              <p class="muted small">Notions : {lesson.notions.join(' · ')}</p>
              <button class="btn primary" onClick={() => setTab('goals')}>
                Voir les objectifs
              </button>
            </>
          )}

          {tab === 'goals' && (
            <>
              <p class="situation">{lesson.situation}</p>
              <ol class="objectives">
                {lesson.objectives.map((o) => (
                  <li key={o}>{richInline(o)}</li>
                ))}
              </ol>
              <button class="btn primary big" onClick={verify}>
                Vérifier
              </button>
              {run && <RunResult run={run} />}
              {run?.passed && (
                <div class="success">
                  <strong>Leçon réussie.</strong>
                  {lesson.challenge && (
                    <p>
                      <span class="eyebrow">Défi</span> {lesson.challenge}
                    </p>
                  )}
                  {next && (
                    <button class="btn primary" onClick={onNext}>
                      Leçon suivante : {next.title}
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {tab === 'help' && (
            <>
              {lesson.hints.slice(0, hints).map((h, i) => (
                <article key={i} class="card hint-card">
                  <h4>{['Indice', 'Les nœuds à utiliser', 'La solution'][i]}</h4>
                  <p>{h}</p>
                </article>
              ))}
              {hints < 3 && (
                <button class="btn" onClick={() => setHints(hints + 1)}>
                  {['Afficher un indice', 'Quels nœuds utiliser ?', 'Voir la solution'][hints]}
                </button>
              )}
              <div class="reset-zone">
                <button
                  class="btn danger"
                  onClick={() =>
                    openOverlay({
                      kind: 'confirm',
                      title: 'Recommencer la leçon ?',
                      text: 'Ton travail sur cette leçon sera remplacé par le projet de départ.',
                      confirmLabel: 'Recommencer',
                      onConfirm: onReset,
                    })
                  }
                >
                  Recommencer la leçon
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function RunResult({ run }: { run: LessonRun }) {
  if (run.compileErrors.length) {
    return (
      <div class="results">
        <p class="error-text">La compilation a échoué : corrige ces erreurs d’abord.</p>
        {run.compileErrors.map((m, i) => (
          <div key={i} class="result ko">
            <span class="r-icon">✕</span>
            <span>{m.text}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div class="results">
      {run.results.map((r) => (
        <div key={r.check.id} class={`result ${r.ok ? 'ok' : 'ko'}`}>
          <span class="r-icon">{r.ok ? '✓' : '✕'}</span>
          <span>
            {r.check.label}
            {!r.ok && r.reason && <span class="r-why">{r.reason}</span>}
          </span>
        </div>
      ))}
      {run.notes.map((n) => (
        <p key={n} class="note">
          {n}
        </p>
      ))}
    </div>
  );
}
