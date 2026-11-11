/**
 * The lesson panel: explanations, objectives with the automatic check,
 * and three levels of help.
 */
import { useState } from 'preact/hooks';
import { lessonLabel, type Lesson, type Prediction } from '@core/lessons/types';
import type { LessonRun, RobustnessResult } from '@core/lessons/runner';
import type { Advice } from '@core/quality/advice';
import { haptic } from '@editor/haptics';
import type { OpenOverlay } from '../overlayTypes';
import { useOwnTap } from '../widgets/useOwnTap';
import { RichText, richInline } from './RichText';

interface Props {
  lesson: Lesson;
  next?: Lesson;
  done: boolean;
  onClose: () => void;
  onPassed: () => void;
  /** The last check and what it found, kept by the editor so the goal strip shows it too. */
  check: LessonCheck | null;
  onVerify: () => void;
  /** The tab to show first (the goal strip opens the sheet on its results). */
  initialTab?: LessonTab;
  /** Open the reference solution as a graph, in a scratch workspace. */
  onOpenSolution: () => void;
  onNext: () => void;
  onReset: () => void;
  openOverlay: OpenOverlay;
  /** Show a node of the learner's project (from a piece of advice). */
  onFocusNode: (graphId: string, nodeId: string, classId?: string) => void;
  /** Open another way to solve the lesson, in a scratch workspace. */
  onOpenAlternative: (index: number) => void;
}

/** What is looked at once the lesson works: never blocking. */
export interface Quality {
  robustness: RobustnessResult[];
  advice: Advice[];
}

export type LessonTab = 'learn' | 'goals' | 'help';
type Tab = LessonTab;

/** A run of the lesson's checks on the learner's project. */
export interface LessonCheck {
  run: LessonRun;
  quality: Quality | null;
}

export function LessonSheet({
  lesson,
  next,
  done,
  onClose,
  onPassed,
  check,
  onVerify,
  initialTab,
  onOpenSolution,
  onNext,
  onReset,
  openOverlay,
  onFocusNode,
  onOpenAlternative,
}: Props) {
  const tap = useOwnTap();
  const [tab, setTab] = useState<Tab>(initialTab ?? 'learn');
  const [hints, setHints] = useState(0);
  const run = check?.run ?? null;
  const quality = check?.quality ?? null;
  const verify = onVerify;

  return (
    <div class="sheet-backdrop" {...tap.root} onClick={tap.guard(onClose)}>
      <div class="sheet lesson" onClick={(e) => e.stopPropagation()}>
        <div class="palette-head">
          <div class="lesson-title">
            <span class="eyebrow">
              {lessonLabel(lesson)} · {lesson.module}
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
            {lesson.kind === 'predict' ? 'Prédis' : 'Objectifs'}
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
                {lesson.kind === 'predict' ? 'Répondre' : 'Voir les objectifs'}
              </button>
            </>
          )}

          {tab === 'goals' && lesson.predict && <PredictPanel p={lesson.predict} remember={lesson.remember} next={next} onPassed={onPassed} onNext={onNext} onClose={onClose} />}

          {tab === 'goals' && !lesson.predict && (
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
                  <strong>{lesson.kind === 'debug' ? 'Réparé !' : lesson.kind === 'complete' || lesson.kind === 'refactor' ? 'Exercice réussi.' : 'Leçon réussie.'}</strong>
                  <p>
                    <span class="eyebrow">À retenir</span> {lesson.remember}
                  </p>
                  {lesson.challenge && (
                    <p>
                      <span class="eyebrow">Défi</span> {lesson.challenge}
                    </p>
                  )}
                  {next && (
                    <button class="btn primary" onClick={onNext}>
                      Suivant : {lessonLabel(next)} · {next.title}
                    </button>
                  )}
                </div>
              )}
              {run?.passed && quality && (
                <QualityReview
                  lesson={lesson}
                  quality={quality}
                  onFocus={(a) => {
                    onClose();
                    onFocusNode(a.graphId, a.nodeId, a.classId);
                  }}
                  onOpenAlternative={onOpenAlternative}
                />
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
              {hints >= 3 && lesson.kind !== 'predict' && (
                <button class="btn primary" onClick={onOpenSolution}>
                  Ouvrir la solution dans l’éditeur
                </button>
              )}
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

/** "Prédis" exercises: choose an answer, then see the explanation. */
function PredictPanel({
  p,
  remember,
  next,
  onPassed,
  onNext,
  onClose,
}: { p: Prediction; remember: string; next?: Lesson; onPassed: () => void; onNext: () => void; onClose: () => void }) {
  const [choice, setChoice] = useState<number | null>(null);
  const right = choice === p.answer;
  return (
    <>
      <p class="situation">{p.question}</p>
      <div class="options">
        {p.options.map((o, i) => (
          <button
            key={o}
            class={`option${choice === i ? (right ? ' ok' : ' ko') : ''}${choice !== null && i === p.answer ? ' answer' : ''}`}
            disabled={right}
            onClick={() => {
              setChoice(i);
              haptic(i === p.answer ? 'success' : 'fail');
              if (i === p.answer) onPassed();
            }}
          >
            {o}
          </button>
        ))}
      </div>
      {choice !== null && !right && <p class="error-text">Pas tout à fait. Relis le graphe, ou ouvre l’onglet Aide, et réessaie.</p>}
      {right && (
        <div class="success">
          <strong>Bien vu.</strong>
          <p>{p.explanation}</p>
          <p>
            <span class="eyebrow">À retenir</span> {remember}
          </p>
          <p class="muted small">Ferme ce panneau et lance ▶ Play : l’Output Log montre l’ordre réel.</p>
          <div class="row-buttons flush">
            <button class="btn" onClick={onClose}>
              Fermer et lancer Play
            </button>
            {next && (
              <button class="btn primary" onClick={onNext}>
                Suivant : {lessonLabel(next)} · {next.title}
              </button>
            )}
          </div>
        </div>
      )}
    </>
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
  const required = run.results.filter((r) => !r.check.notion);
  const notions = run.results.filter((r) => r.check.notion);
  return (
    <div class="results">
      {required.map((r) => (
        <div key={r.check.id} class={`result ${r.ok ? 'ok' : 'ko'}`}>
          <span class="r-icon">{r.ok ? '✓' : '✕'}</span>
          <span>
            {r.check.label}
            {!r.ok && r.reason && <span class="r-why">{r.reason}</span>}
          </span>
        </div>
      ))}
      {notions.length > 0 && (
        <>
          <p class="eyebrow results-head">Notion visée · ne bloque pas la réussite</p>
          {notions.map((r) => (
            <div key={r.check.id} class={`result notion ${r.ok ? 'ok' : 'skipped'}`}>
              <span class="r-icon">{r.ok ? '✓' : '○'}</span>
              <span>
                {r.check.label}
                {!r.ok && r.reason && <span class="r-why">{r.reason}</span>}
              </span>
            </div>
          ))}
        </>
      )}
      {run.notes.map((n) => (
        <p key={n} class="note">
          {n}
        </p>
      ))}
      {!run.passed && run.results.some((r) => !r.ok) && (
        <p class="muted small">
          Pour comprendre un échec, ferme ce panneau, touche le nœud qui aurait dû agir, puis Details › « Pourquoi ce nœud ne s’est pas exécuté ? » : la
          réponse s’appuie sur cette vérification.
        </p>
      )}
    </div>
  );
}

/** After success: does it hold elsewhere, is it well built, how else could it be done. */
function QualityReview({
  lesson,
  quality,
  onFocus,
  onOpenAlternative,
}: { lesson: Lesson; quality: Quality; onFocus: (a: Advice) => void; onOpenAlternative: (index: number) => void }) {
  const { robustness, advice } = quality;
  const alternatives = lesson.alternatives ?? [];
  if (!robustness.length && !advice.length && !alternatives.length) return null;
  return (
    <div class="quality">
      <h4>Pour aller plus loin</h4>
      <p class="muted small">La leçon est réussie. Ce qui suit regarde si ta solution tient ailleurs et comment elle est construite : ce sont des conseils.</p>
      {robustness.length > 0 && (
        <section class="q-section">
          <p class="eyebrow">Et si…</p>
          {robustness.map((r) => (
            <div key={r.case.id} class={`result ${r.ok ? 'ok' : 'warn'}`}>
              <span class="r-icon">{r.ok ? '✓' : '!'}</span>
              <span>
                {r.ok ? 'Marche aussi si ' : 'Ne marche pas si '}
                {r.case.label}
                {!r.ok && (
                  <span class="r-why">
                    {r.reason} {r.case.advice}
                  </span>
                )}
              </span>
            </div>
          ))}
        </section>
      )}
      {advice.length > 0 && (
        <section class="q-section">
          <p class="eyebrow">Conseils de construction</p>
          {advice.map((a, i) => (
            <article key={i} class="card advice-card">
              <h4>
                {a.title} <span class="muted small">· {a.className}</span>
              </h4>
              <p>{a.text}</p>
              <button class="btn" onClick={() => onFocus(a)}>
                Voir le nœud
              </button>
            </article>
          ))}
        </section>
      )}
      {alternatives.length > 0 && (
        <section class="q-section">
          <p class="eyebrow">Une autre façon de faire</p>
          {alternatives.map((alt, i) => (
            <article key={alt.title} class="card alt-card">
              <h4>{alt.title}</h4>
              <p>
                <strong>Ce qu’elle gagne.</strong> {alt.gains}
              </p>
              <p>
                <strong>Ce qu’elle perd.</strong> {alt.loses}
              </p>
              <button class="btn" onClick={() => onOpenAlternative(i)}>
                Ouvrir ce graphe
              </button>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
