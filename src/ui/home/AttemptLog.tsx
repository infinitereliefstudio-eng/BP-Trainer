/**
 * Carnet › Journal des essais: the last attempts at each step, as the log
 * keeps them (core/progress/attempts.ts). Read-only, apart from emptying it:
 * the spaced Blueprint reviews will be planned from it.
 */
import { useState } from 'preact/hooks';
import { getLesson } from '@core/lessons';
import { lessonLabel } from '@core/lessons/types';
import { type Attempt, type AttemptLog as Log, type ErrorKind, readableLog } from '@core/progress/attempts';
import type { HelpLevel } from '@core/progress/helpLevel';

const SHOWN = 30;

export const ERROR_LABEL: Record<ErrorKind, string> = {
  compile: 'Erreur de compilation',
  'accessed-none': 'Accessed None',
  runtime: 'Erreur d’exécution',
  'never-fired': 'Événement jamais déclenché',
  'not-reached': 'Nœud jamais atteint',
  order: 'Ordre des BeginPlay',
  hold: 'Touche tenue',
};

const HELP: Record<HelpLevel, string> = { alone: 'sans aide', hints: 'avec indices', solution: 'solution vue' };

const when = (t: number) => new Date(t).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function status(a: Attempt): { text: string; cls: string } {
  if (a.passed) return { text: a.again ? 'Réussie à nouveau' : 'Réussie', cls: 'ok' };
  if (a.closed) return { text: 'Recommencée', cls: 'ko' };
  return { text: 'Pas encore réussie', cls: 'ko' };
}

function Row({ a }: { a: Attempt }) {
  const lesson = getLesson(a.lesson);
  const st = status(a);
  const labelOf = (id: string) => lesson?.checks.find((c) => c.id === id)?.label ?? id;
  const errors = Object.entries(a.errors) as [ErrorKind, number][];
  const failed = Object.entries(a.failed);
  return (
    <li class="attempt">
      <span class="note-head">
        <strong>{lesson ? `${lessonLabel(lesson)} · ${lesson.title}` : a.lesson}</strong>
        <span class="muted small">{when(a.end)}</span>
      </span>
      <span class="small">
        <span class={`attempt-status ${st.cls}`}>{st.text}</span> · {a.checks} vérification{a.checks > 1 ? 's' : ''} · {HELP[a.help]}
        {lesson && (lesson.revision ?? 1) !== a.rev ? ' · leçon modifiée depuis' : ''}
      </span>
      {(errors.length > 0 || failed.length > 0) && (
        <span class="note-tags">
          {errors.map(([k, n]) => (
            <span key={k} class="tag warn">
              {ERROR_LABEL[k]}
              {n > 1 ? ` ×${n}` : ''}
            </span>
          ))}
          {failed.map(([id, n]) => (
            <span key={id} class="tag">
              {labelOf(id)}
              {n > 1 ? ` ×${n}` : ''}
            </span>
          ))}
        </span>
      )}
    </li>
  );
}

export function AttemptLog({ log, onClear }: { log?: Log; onClear: () => void }) {
  const [all, setAll] = useState(false);
  if (!log) return null;
  if (!readableLog(log)) return <p class="muted small">Ton journal des essais vient d’une version plus récente de l’appli : recharge-la pour le voir.</p>;
  const list = [...log.attempts].reverse();
  if (!list.length) return null;
  const shown = all ? list : list.slice(0, SHOWN);
  return (
    <details class="attempt-log">
      <summary>
        Journal des essais <span class="level-count">{list.length}</span>
      </summary>
      <p class="muted small">
        Chaque essai d’une étape, du premier Vérifier jusqu’à la réussite (ou Recommencer) : combien de vérifications, quelle aide, et les erreurs rencontrées. Il reste sur ce téléphone et part
        avec la sauvegarde complète. Il servira à te reproposer des Blueprints à refaire quelques jours plus tard.
      </p>
      <ul>
        {shown.map((a) => (
          <Row key={`${a.lesson}:${a.start}`} a={a} />
        ))}
      </ul>
      <div class="row-buttons flush">
        {!all && list.length > SHOWN && (
          <button class="btn" onClick={() => setAll(true)}>
            Tout afficher ({list.length})
          </button>
        )}
        <button
          class="btn"
          onClick={() => {
            if (confirm('Effacer tout le journal des essais ? Ta progression, tes réussites et tes révisions ne changent pas.')) onClear();
          }}
        >
          Effacer le journal
        </button>
      </div>
    </details>
  );
}
