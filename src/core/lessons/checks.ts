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
