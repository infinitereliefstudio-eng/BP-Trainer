/**
 * The lesson's objectives, visible while building: one line under the
 * toolbar with the objective in view, a Vérifier button, and the result of
 * the last check. The lesson sheet covers the screen; this does not.
 */
import { useState } from 'preact/hooks';
import type { Lesson } from '@core/lessons/types';
import type { LessonCheck } from './LessonSheet';
import { richInline } from './RichText';

interface Props {
  lesson: Lesson;
  check: LessonCheck | null;
  done: boolean;
  onVerify: () => void;
  /** Open the lesson sheet on its objectives and results. */
  onDetails: () => void;
}

const KEY = 'bp-trainer.goalStrip';

function stored(): boolean {
  try {
    return localStorage.getItem(KEY) !== '0';
  } catch {
    return true;
  }
}

export function GoalStrip({ lesson, check, done, onVerify, onDetails }: Props) {
  const [open, setOpen] = useState(stored);
  const [index, setIndex] = useState(0);
  const total = lesson.objectives.length;
  const i = Math.min(index, total - 1);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(KEY, next ? '1' : '0');
    } catch {
      /* not kept */
    }
  };

  if (!open) {
    return (
      <button class="goal-tab" onClick={toggle} aria-label="Afficher les objectifs">
        Objectifs ▾
      </button>
    );
  }

  const run = check?.run;
  const required = run?.results.filter((r) => !r.check.notion) ?? [];
  const okCount = required.filter((r) => r.ok).length;
  const firstBad = required.find((r) => !r.ok);

  return (
    <div class={`goal-strip${run ? (run.passed ? ' passed' : ' failed') : ''}`}>
      <button class="goal-step" onClick={() => setIndex((i + 1) % total)} aria-label="Objectif suivant" title="Toucher pour passer à l’objectif suivant">
        <span class="goal-num">
          {i + 1}/{total}
        </span>
        <span class="goal-text">{richInline(lesson.objectives[i])}</span>
      </button>
      {run && (
        <button class="goal-result" onClick={onDetails}>
          {run.compileErrors.length > 0 ? (
            <>✕ Erreurs de compilation</>
          ) : run.passed ? (
            <>
              ✓ Réussi{check?.quality && <span class="goal-stars"> {'★'.repeat(check.quality.verdict.stars)}{'☆'.repeat(3 - check.quality.verdict.stars)}</span>} · voir le bilan
            </>
          ) : (
            <>
              ✕ {okCount}/{required.length}
              {firstBad && <span class="goal-why"> · {firstBad.check.label}</span>}
            </>
          )}
        </button>
      )}
      {!run && done && <span class="pill ok">réussie</span>}
      <button class="btn primary goal-verify" onClick={onVerify}>
        Vérifier
      </button>
      <button class="btn goal-hide" onClick={toggle} aria-label="Masquer les objectifs">
        ▴
      </button>
    </div>
  );
}
