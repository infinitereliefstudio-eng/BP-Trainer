/**
 * "Why did this node not run?" — answered from what the play session
 * recorded (RunRecord): walk back the exec wires to the first node that
 * ran but did not continue, or to the event that never fired, and say why
 * in plain words. A node that did run gets the silent things UE does not
 * log (ignored Delay calls, a closed Do Once, a Set nobody read again…).
 */
import type { Project } from '../model/project';
import { getDefinition } from '../nodes/registry';
import type { NoteCode, RunRecord } from '../runtime/runRecord';
import { whyEventSilent } from './events';
import { execSources, isEntry, isExec, isImpure, locate, pinLabel, pinsOf, readers, titleOf, type Site } from './where';

export interface DiagnosisStep {
  text: string;
  /** The node this step is about, to jump to it. */
  at?: { classId: string; graphId: string; nodeId: string };
}

export interface Diagnosis {
  ran: boolean;
  steps: DiagnosisStep[];
}

export interface DiagnoseCx {
  project: Project;
  record: RunRecord;
  /** Display name of a runtime actor id. */
  label(actorId: string): string;
}

const MAX_DEPTH = 12;

export const secs = (t: number) => `${t.toFixed(2).replace('.', ',')} s`;
export const times = (n: number) => (n === 1 ? 'une fois' : `${n} fois`);

export function stepAt(s: Site, text: string): DiagnosisStep {
  return { text, at: { classId: s.cls.id, graphId: s.graph.id, nodeId: s.node.id } };
}

export function diagnoseNode(cx: DiagnoseCx, graphId: string, nodeId: string): Diagnosis {
  const s = locate(cx.project, graphId, nodeId);
  if (!s) return { ran: false, steps: [{ text: 'Ce nœud n’existait pas encore lors de la dernière partie : relance Play pour le tester.' }] };
  if (!cx.record.classes.has(s.cls.id)) {
    return {
      ran: false,
      steps: [
        {
          text: `Aucun acteur ${s.cls.name} n’a existé pendant la partie. Un Blueprint ne fait rien tant qu’il n’a pas d’instance : place-le dans le niveau, ou crée-le avec Spawn Actor.`,
        },
      ],
    };
  }
  if (!isImpure(s)) return { ran: false, steps: explainPure(cx, s) };
  const runs = cx.record.runsOf(s.graph.id, s.node.id);
  if (runs) return { ran: true, steps: explainRan(cx, s) };
  const steps: DiagnosisStep[] = [];
  whyNot(cx, s, steps, 0, new Set());
  return { ran: false, steps };
}

// ------------------------------------------------------------- it ran

function explainRan(cx: DiagnoseCx, s: Site): DiagnosisStep[] {
  const r = cx.record.runsOf(s.graph.id, s.node.id)!;
  const when = r.count === 1 ? `à ${secs(r.first)}` : `de ${secs(r.first)} à ${secs(r.last)}`;
  const steps: DiagnosisStep[] = [stepAt(s, `${titleOf(s)} s’est exécuté ${times(r.count)}, ${when}.`)];
  const outs = pinsOf(s).filter((p) => p.dir === 'out' && isExec(p));
  if (outs.length > 1) {
    const list = outs.map((p) => {
      const k = cx.record.takenCount(s.graph.id, s.node.id, p.id);
      return `${p.name || p.id} ${k ? times(k) : 'jamais'}`;
    });
    steps.push({ text: `Sorties prises : ${list.join(', ')}.` });
  }
  for (const [code, n] of cx.record.notesOf(s.graph.id, s.node.id)) steps.push({ text: noteText(code, n.count, n.detail, s) });
  const w = cx.record.writes.get(`${s.graph.id}:${s.node.id}`);
  if (w) {
    const read = cx.record.reads.get(`${w.actor}:${w.variable}`);
    const owner = cx.project.classes.find((c) => c.variables.some((v) => v.id === w.variable));
    const name = owner?.variables.find((v) => v.id === w.variable)?.name ?? 'la variable';
    if (read === undefined || read.seq < w.seq) {
      steps.push({
        text: `${name} a bien changé dans ${cx.label(w.actor)} à ${secs(w.time)}, mais aucun Blueprint ne l’a relue ensuite. Un Set ne prévient personne : pour que ${owner?.name ?? 'l’autre Blueprint'} réagisse, appelle un de ses événements ou une de ses fonctions, ou fais-lui relire la variable au moment où il en a besoin.`,
      });
    } else steps.push({ text: `${name} a été relue après ce Set, à ${secs(read.time)}.` });
  }
  return steps;
}

function noteText(code: NoteCode, n: number, detail: string | undefined, s: Site): string {
  switch (code) {
    case 'delay.ignored':
      return `${n === 1 ? 'Un appel est arrivé' : `${n} appels sont arrivés`} pendant l’attente et ${n === 1 ? 'a été ignoré' : 'ont été ignorés'} : un Delay déjà en cours ne repart pas. Retriggerable Delay, lui, recommence l’attente à chaque appel.`;
    case 'delay.restarted':
      return `L’attente a été relancée ${times(n)} par un nouvel appel : Completed n’arrive qu’une fois la durée écoulée depuis le dernier appel.`;
    case 'doOnce.closed':
      return `${times(n)}, Do Once était déjà fermé et n’a rien laissé passer : seul le premier passage sort par Completed, jusqu’à un Reset.`.replace(/^./, (c) => c.toUpperCase());
    case 'gate.closed':
      return `${times(n)}, le Gate était fermé : Enter n’est sorti par Exit que pendant qu’il était ouvert.`.replace(/^./, (c) => c.toUpperCase());
    case 'dispatcher.noListener':
      return `${times(n)}, personne n’écoutait ${detail ? `le Dispatcher de ${detail}` : 'ce Dispatcher'} : aucun Bind Event n’avait encore été fait. L’appel ne fait alors rien, sans erreur.`.replace(/^./, (c) => c.toUpperCase());
    case 'iface.notImplemented':
      return `${times(n)}, le message est allé à ${detail ?? 'un acteur'}, qui n’implémente pas l’interface : il est ignoré sans erreur, comme dans UE. Ajoute l’interface dans Class Settings de son Blueprint.`.replace(/^./, (c) => c.toUpperCase());
    case 'iface.noTarget':
      return `${times(n)}, Target valait None : le message n’est allé nulle part, sans erreur.`.replace(/^./, (c) => c.toUpperCase());
    case 'call.noTarget':
      return `${times(n)}, ${detail ?? 'l’acteur visé'} n’avait pas de Custom Event ${titleOf(s)} : l’appel n’a rien fait.`.replace(/^./, (c) => c.toUpperCase());
  }
}

// --------------------------------------------------------- pure nodes

function explainPure(cx: DiagnoseCx, s: Site): DiagnosisStep[] {
  const steps: DiagnosisStep[] = [
    stepAt(s, `${titleOf(s)} est un nœud pur : il n’a pas de fil d’exécution. Il calcule sa valeur à chaque fois qu’un nœud exécuté la lit, et seulement à ce moment-là.`),
  ];
  const list = readers(s);
  if (!list.length) {
    steps.push({ text: 'Aucun nœud exécuté ne lit sa sortie : relie-la à un nœud qui a un fil d’exécution.' });
    return steps;
  }
  for (const r of list.slice(0, 3)) {
    const runs = cx.record.runsOf(r.graph.id, r.node.id);
    if (runs) steps.push(stepAt(r, `Il est lu par ${titleOf(r)}, qui s’est exécuté ${times(runs.count)} : il a donc été calculé autant de fois.`));
    else {
      steps.push(stepAt(r, `Il est lu par ${titleOf(r)}, qui ne s’est jamais exécuté :`));
      whyNot(cx, r, steps, 1, new Set());
    }
  }
  return steps;
}

// ------------------------------------------------------ it never ran

export function whyNot(cx: DiagnoseCx, start: Site, steps: DiagnosisStep[], depth: number, seen: Set<string>): void {
  const keyOf = (x: Site) => `${x.graph.id}:${x.node.id}`;
  if (seen.has(keyOf(start)) || depth > MAX_DEPTH) return;
  seen.add(keyOf(start));
  // A straight wire of nodes that did not run is told in one step, up to where it starts.
  let s = start;
  let skipped = 0;
  for (;;) {
    if (isEntry(s)) break;
    const sources = execSources(s);
    if (sources.length !== 1) break;
    const src = sources[0].site;
    if (isEntry(src) || cx.record.runsOf(src.graph.id, src.node.id) || seen.has(keyOf(src))) break;
    seen.add(keyOf(src));
    s = src;
    skipped++;
  }
  if (skipped === 1) steps.push(stepAt(s, `${titleOf(start)} attend ${titleOf(s)}, qui ne s’est pas exécuté non plus.`));
  else if (skipped > 1) {
    steps.push(stepAt(s, `${titleOf(start)} ne s’est pas exécuté, ni les ${skipped} nœuds qui le précèdent sur le même fil, jusqu’à ${titleOf(s)}.`));
  }
  if (isEntry(s)) {
    whyEventSilent(cx, s, steps, depth, seen);
    return;
  }
  const sources = execSources(s);
  if (!sources.length) {
    steps.push(stepAt(s, `Aucun fil d’exécution n’arrive sur ${titleOf(s)} : relie sa pin d’entrée blanche à la sortie d’un événement ou d’un autre nœud.`));
    return;
  }
  for (const { site: src, pin } of sources.slice(0, 3)) {
    const runs = cx.record.runsOf(src.graph.id, src.node.id);
    if (!runs) {
      steps.push(stepAt(src, `${titleOf(s)} attend ${titleOf(src)}, qui ne s’est pas exécuté non plus.`));
      whyNot(cx, src, steps, depth + 1, seen);
      continue;
    }
    steps.push(stepAt(src, stoppedAt(cx, src, pin, runs.count)));
  }
}

/** `src` ran `count` times but never left through `pin`. */
function stoppedAt(cx: DiagnoseCx, src: Site, pin: string, count: number): string {
  const n = times(count);
  const notes = cx.record.notesOf(src.graph.id, src.node.id);
  switch (src.node.def) {
    case 'flow.branch':
      return pin === 'true'
        ? `Branch s’est exécuté ${n}, et sa Condition valait false à chaque fois : il est toujours sorti par False. Vérifie la valeur qui arrive sur Condition (un Print String, ou un breakpoint puis la valeur des pins).`
        : `Branch s’est exécuté ${n}, et sa Condition valait true à chaque fois : il n’est jamais sorti par False.`;
    case 'cast.to':
      return pin === 'then'
        ? `${titleOf(src)} a échoué les ${count} fois : l’objet reçu n’était pas de cette classe, ou valait None. Un Cast raté n’est pas une erreur : il sort par Cast Failed sans rien dire.`
        : `${titleOf(src)} a réussi à chaque fois : il n’est jamais sorti par Cast Failed.`;
    case 'flow.isValid':
      return pin === 'valid'
        ? `Is Valid a trouvé une référence vide (None) ou un acteur détruit, les ${count} fois.`
        : `Is Valid a trouvé une référence valide à chaque fois.`;
    case 'flow.doOnce':
      return `Do Once s’est exécuté ${n}, mais il était déjà fermé${notes.get('doOnce.closed') ? '' : ' (Start Closed)'} : il ne laisse passer que le premier passage, jusqu’à un Reset.`;
    case 'flow.gate':
      return `Le Gate était fermé chaque fois qu’on y est entré : rien n’est sorti par Exit.`;
    case 'time.delay':
    case 'time.retriggerableDelay': {
      const ignored = notes.get('delay.ignored')?.count ?? 0;
      const restarted = notes.get('delay.restarted')?.count ?? 0;
      let text = `${titleOf(src)} a démarré, mais son attente n’est jamais arrivée au bout : la partie s’est arrêtée avant, ou l’acteur a été détruit.`;
      if (restarted) text += ` Elle a été relancée ${times(restarted)} par de nouveaux appels.`;
      if (ignored) text += ` ${ignored === 1 ? 'Un appel a été ignoré' : `${ignored} appels ont été ignorés`} pendant l’attente.`;
      return text;
    }
  }
  const def = getDefinition(src.node.def);
  const outs = pinsOf(src).filter((p) => p.dir === 'out' && isExec(p));
  const taken = outs.filter((p) => p.id !== pin && cx.record.takenCount(src.graph.id, src.node.id, p.id) > 0).map((p) => `« ${p.name || p.id} »`);
  if (def?.kind === 'latent') return `${titleOf(src)} a démarré ${n}, mais n’est jamais arrivé au bout pendant la partie.`;
  return `${titleOf(src)} s’est exécuté ${n}, mais n’est jamais sorti par ${pinLabel(src, pin)}${taken.length ? ` : il est sorti par ${taken.join(', ')}` : ''}.`;
}
