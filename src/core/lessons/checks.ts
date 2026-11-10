/** Reusable checks for lessons. */
import type { Check, CheckContext } from './types';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function printed(id: string, text: string, label = `Le message « ${text} » s’affiche`): Check {
  return {
    id,
    label,
    test: (cx) =>
      cx.prints().some((p) => norm(p).includes(norm(text)))
        ? true
        : cx.prints().length
          ? `Messages affichés : ${cx.prints().map((p) => `« ${p} »`).join(', ')}. Aucun ne contient « ${text} ».`
          : 'Aucun Print String ne s’est exécuté. Le fil blanc part-il bien de l’événement ?',
  };
}

export function visible(id: string, actor: string, comp: string, expected: boolean, label: string, at?: string): Check {
  return {
    id,
    label,
    at,
    test: (cx) => {
      const c = cx.component(actor, comp);
      if (!c) return `Le composant ${comp} de ${actor} est introuvable (renommé ou supprimé ?).`;
      if (c.props.visible === expected) return true;
      return expected ? `${comp} est encore éteinte à ce moment-là.` : `${comp} est encore allumée à ce moment-là.`;
    },
  };
}

export function usesNode(id: string, className: string, defs: string[], label: string, missing: string): Check {
  return {
    id,
    label,
    test: (cx) => (cx.nodes(className).some((n) => defs.includes(n.def)) ? true : missing),
  };
}

export function noRuntimeErrors(id = 'no-errors'): Check {
  return {
    id,
    label: 'Aucune erreur pendant l’exécution',
    test: (cx: CheckContext) => {
      const errs = cx.sim.log.filter((l) => l.level === 'error');
      return errs.length ? errs[0].text : true;
    },
  };
}

/** Lowercase, without accents: « Bloqué » matches "bloque". */
export const normText = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** How many printed messages contain `text` (case and accents ignored). */
export function countPrints(cx: CheckContext, text: string): number {
  return cx.prints().filter((p) => normText(p).includes(normText(text))).length;
}

/** Printed messages that are exactly a whole number, in order. */
export function printedNumbers(cx: CheckContext): string[] {
  return cx
    .prints()
    .map((p) => p.trim())
    .filter((p) => /^-?\d+$/.test(p));
}

/** One press of E, as scenario steps. */
export const PRESS_E = [{ press: 'E' as const }, { release: 'E' as const }];

/** Fails while `className` contains one of `defs`. */
export function notUsing(id: string, className: string, defs: string[], label: string, reason: string): Check {
  return { id, label, test: (cx) => (cx.nodes(className).some((n) => defs.includes(n.def)) ? reason : true) };
}

/**
 * Marks a check as the notion the lesson aims at: shown apart, never
 * blocking. A different solution that behaves right still passes.
 */
export const notion = (c: Check): Check => ({ ...c, notion: true });
