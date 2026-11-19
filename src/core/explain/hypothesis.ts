/**
 * « Hypothèse avant l'indice » (chantier n° 2, étape D): in a Débogue, the
 * learner says where he thinks the problem is before the first hint opens.
 * Three families of causes, the ones a Blueprint beginner meets the most:
 * the event (what starts the chain), the reference (whom a node talks to),
 * the condition or a value (what is decided or computed).
 *
 * What the check found is told afterwards, taken from the run only, like
 * « Montre-moi » (stops.ts): an Accessed None or a Cast that never
 * succeeded points to a reference, a Branch that never went one way to a
 * condition, an event with wires that never fired to the event. Anything
 * else (a value, the order of nodes) is not decided: the learner tests his
 * hypothesis himself.
 */
import type { LessonRun } from '../lessons/runner';
import type { Lesson } from '../lessons/types';
import { whereItStopped } from './stops';

export type Hypothesis = 'event' | 'reference' | 'condition';
export type HypothesisChoice = Hypothesis | 'unsure';

export const HYPOTHESES: { id: Hypothesis; label: string; detail: string }[] = [
  { id: 'event', label: 'L’événement', detail: 'ce qui déclenche la chaîne : il ne part pas, ou pas quand il faut' },
  { id: 'reference', label: 'La référence', detail: 'à qui un nœud s’adresse : vide (None), le mauvais acteur, un Cast qui échoue' },
  { id: 'condition', label: 'La condition ou une valeur', detail: 'ce qui est décidé ou calculé : un Branch, une comparaison, une valeur réglée' },
];

export const hypothesisLabel = (h: HypothesisChoice) => (h === 'unsure' ? 'Je ne sais pas encore' : HYPOTHESES.find((x) => x.id === h)!.label);

/** The steps that ask for a hypothesis before their first hint: the Débogue, drills to repair included. */
export const asksHypothesis = (lesson: Lesson) => lesson.kind === 'debug';

export interface Diagnosis {
  hypothesis: Hypothesis;
  /** What the check showed, in one sentence. */
  evidence: string;
}

const ACCESSED_NONE = /\bAccessed None\b/;

/** Where the run points, when it points to one of the three; undefined when it does not decide. */
export function diagnose(run: LessonRun): Diagnosis | undefined {
  if (run.passed || run.compileErrors.length) return undefined;
  const none = run.runtimeErrors.find((e) => ACCESSED_NONE.test(e));
  if (none) return { hypothesis: 'reference', evidence: 'une erreur Accessed None dans l’Output Log, un nœud a reçu une référence vide (None).' };
  if (!run.sim) return undefined;
  for (const stop of whereItStopped(run.sim.project, run.sim)) {
    if (stop.kind === 'silent') return { hypothesis: 'event', evidence: stop.text };
    if (stop.kind === 'stopped' && stop.after === 'cast.to') return { hypothesis: 'reference', evidence: stop.text };
    if (stop.kind === 'stopped' && stop.after === 'flow.branch') return { hypothesis: 'condition', evidence: stop.text };
  }
  return undefined;
}

/** What to tell the learner once he has chosen. */
export function hypothesisFeedback(choice: HypothesisChoice, found: Diagnosis | undefined): string {
  if (!found) {
    return choice === 'unsure'
      ? 'La vérification ne désigne pas une cause à coup sûr : ce peut être une valeur, ou l’ordre des nœuds. Lance ▶ Play et regarde ce qui se passe, puis pose-toi la question.'
      : 'La vérification ne tranche pas : à toi de tester ton hypothèse. Un Print String de la valeur suspecte, ou un breakpoint sur le nœud, te dira si tu as raison.';
  }
  const label = hypothesisLabel(found.hypothesis).toLowerCase();
  if (choice === found.hypothesis) return `Bien vu, c’est ${label}. La vérification montre : ${found.evidence} Vérifie-le avant de corriger, puis ne change qu’une chose.`;
  return `La vérification montre : ${found.evidence} Ça désigne plutôt ${label} : regarde là d’abord.`;
}
