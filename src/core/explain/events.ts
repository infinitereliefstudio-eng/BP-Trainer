/**
 * Why an event (or a function) never started: the key was never pressed,
 * nothing entered the collision box, nobody called the Custom Event, the
 * Dispatcher was called before its Bind, the interface message went to an
 * actor that does not implement it…
 */
import type { NodeRuns } from '../runtime/runRecord';
import { collisionQueries } from '../types/enums';
import { type DiagnoseCx, type DiagnosisStep, secs, stepAt, times, whyNot } from './diagnose';
import { delegateSource, findNodes, titleOf, type Site } from './where';

const KEY_NAMES: Record<string, string> = { E: 'E', F: 'F', SpaceBar: 'Espace' };

export function whyEventSilent(cx: DiagnoseCx, s: Site, steps: DiagnosisStep[], depth: number, seen: Set<string>): void {
  const { cls, node } = s;
  const say = (text: string) => steps.push(stepAt(s, text));
  switch (node.def) {
    case 'event.beginPlay':
    case 'event.tick':
      say(`${titleOf(s)} ne s’est pas déclenché : la partie s’est arrêtée avant la première image, ou chaque ${cls.name} a été détruit avant.`);
      return;
    case 'event.inputKey': {
      const key = String(node.config.key ?? 'E');
      const isPlayer = cx.project.playerClassId === cls.id;
      if (!isPlayer && !cls.autoReceiveInput) {
        say(`Auto Receive Input est sur Disabled dans Class Settings de ${cls.name} : ses événements de touche ne reçoivent rien. Règle-le sur Player 0.`);
      } else if (!cx.record.keys.has(key)) say(`La touche ${KEY_NAMES[key] ?? key} n’a pas été pressée pendant la partie.`);
      else say(`La touche a été pressée, mais aucun ${cls.name} n’existait encore à ce moment-là.`);
      return;
    }
    case 'event.actorBeginOverlap':
    case 'event.actorEndOverlap': {
      const boxes = cls.components.filter((c) => c.kind === 'BoxCollision' && collisionQueries(c.props.collision));
      if (!boxes.length) {
        say(
          `${cls.name} n’a aucune Box Collision dont Collision Enabled déclenche des overlaps (Query Only, ou Query and Physics) : sans elle, rien ne peut entrer en contact avec lui.`,
        );
      } else say(node.def === 'event.actorBeginOverlap' ? `Rien n’est entré dans ${boxes.map((b) => b.name).join(', ')} pendant la partie.` : `Rien n’est sorti de ${boxes.map((b) => b.name).join(', ')} pendant la partie : il faut d’abord y entrer, puis en ressortir.`);
      return;
    }
    case 'event.componentBeginOverlap':
    case 'event.componentEndOverlap': {
      const c = cls.components.find((x) => x.id === node.config.component);
      if (c && !collisionQueries(c.props.collision)) {
        say(`Collision Enabled de ${c.name} est réglé pour ne déclencher aucun overlap : mets Query Only, ou Query and Physics.`);
      } else say(`Rien n’est ${node.def.endsWith('BeginOverlap') ? 'entré dans' : 'sorti de'} ${c?.name ?? 'ce composant'} pendant la partie.`);
      return;
    }
    case 'event.destroyed':
      say(`Aucun ${cls.name} n’a été détruit pendant la partie (Destroy Actor).`);
      return;
    case 'event.actorOnClicked':
      say(`Aucun ${cls.name} n’a été touché dans le niveau pendant la partie.`);
      return;
    case 'event.hit': {
      const solid = cls.components.some((c) => c.kind === 'StaticMesh' && c.props.blocks && c.props.collision >= 2);
      if (cx.project.playerClassId === cls.id) say('Le joueur n’a buté contre aucun Static Mesh qui bloque pendant la partie.');
      else if (!solid) say(`${cls.name} n’a aucun Static Mesh qui bloque le joueur : sans obstacle, rien ne peut le heurter. Traverser une Box Collision déclenche un overlap, pas un Hit.`);
      else say(`Le joueur n’a buté contre aucun ${cls.name} pendant la partie : Event Hit ne vient que d’un contact qui bloque.`);
      return;
    }
    case 'cs.entry':
      say(`Le Construction Script ne s’exécute que si un ${cls.name} est placé dans le niveau, ou apparaît par Spawn Actor.`);
      return;
    case 'event.custom':
      whyCustomEvent(cx, s, steps, depth, seen);
      return;
    case 'event.interface':
      whyInterfaceEvent(cx, s, steps, depth, seen);
      return;
    case 'fn.entry': {
      const callers = findNodes(cx.project, (n) => (n.def === 'call.function' || n.def === 'call.pureFunction') && n.config.graph === s.graph.id);
      if (!callers.length) {
        say(`Aucun nœud n’appelle la fonction ${s.graph.name} : une fonction ne s’exécute que quand on l’appelle.`);
        return;
      }
      followCallers(cx, s, callers, steps, depth, seen);
      return;
    }
  }
  say(`${titleOf(s)} ne s’est jamais déclenché pendant la partie.`);
}

/** Callers that ran explain nothing more here; those that did not are followed. */
function followCallers(cx: DiagnoseCx, s: Site, callers: Site[], steps: DiagnosisStep[], depth: number, seen: Set<string>): void {
  for (const c of callers.slice(0, 3)) {
    const runs = cx.record.runsOf(c.graph.id, c.node.id);
    if (runs) steps.push(stepAt(c, `${titleOf(c)} (dans ${c.cls.name}) s’est exécuté ${times(runs.count)}, mais n’a pas atteint ${titleOf(s)} : la cible n’était pas le bon acteur, ou valait None.`));
    else {
      steps.push(stepAt(c, `${titleOf(s)} n’est appelé que par ${titleOf(c)} (dans ${c.cls.name}), qui ne s’est pas exécuté :`));
      whyNot(cx, c, steps, depth + 1, seen);
    }
  }
}

function whyCustomEvent(cx: DiagnoseCx, s: Site, steps: DiagnosisStep[], depth: number, seen: Set<string>): void {
  const name = String(s.node.config.name ?? '');
  const calls = findNodes(
    cx.project,
    (n, cls) => n.def === 'call.custom' && n.config.event === name && (n.config.owner ? n.config.owner === s.cls.id : cls.id === s.cls.id),
  );
  // Bind Event and Set Timer by Event take the event through its red delegate pin.
  const bound = findNodes(cx.project, (n, _c, g) => g.id === s.graph.id && (n.def === 'dispatcher.bind' || n.def === 'time.setTimerByEvent')).filter(
    (b) => delegateSource(b)?.id === s.node.id,
  );
  if (!calls.length && !bound.length) {
    steps.push(
      stepAt(
        s,
        `Personne n’appelle ce Custom Event : un Custom Event ne se déclenche que par un nœud qui l’appelle, par un Bind Event sur un Event Dispatcher, ou par Set Timer by Event.`,
      ),
    );
    return;
  }
  for (const b of bound.slice(0, 3)) {
    const runs = cx.record.runsOf(b.graph.id, b.node.id);
    if (!runs) {
      steps.push(stepAt(b, `${titleOf(s)} est relié à ${titleOf(b)}, qui ne s’est pas exécuté :`));
      whyNot(cx, b, steps, depth + 1, seen);
      continue;
    }
    if (b.node.def === 'time.setTimerByEvent') {
      steps.push(stepAt(b, `Le timer a été lancé ${times(runs.count)}, mais n’est jamais arrivé à terme : Time trop long pour la partie, Time à 0, ou Clear Timer avant la fin.`));
      continue;
    }
    whyDispatcherSilent(cx, b, runs, steps, depth, seen);
  }
  followCallers(cx, s, calls, steps, depth, seen);
}

/** The Bind ran: was the Dispatcher called after it? */
function whyDispatcherSilent(cx: DiagnoseCx, bind: Site, bound: NodeRuns, steps: DiagnosisStep[], depth: number, seen: Set<string>): void {
  const boundAt = bound.first;
  const { owner, dispatcher } = bind.node.config;
  const calls = findNodes(cx.project, (n) => n.def === 'dispatcher.call' && n.config.owner === owner && n.config.dispatcher === dispatcher);
  if (!calls.length) {
    steps.push(stepAt(bind, `Le Bind a été fait à ${secs(boundAt)}, mais aucun nœud Call n’appelle ce Dispatcher : lier un événement ne le déclenche pas, il faut ensuite un Call.`));
    return;
  }
  for (const c of calls.slice(0, 3)) {
    const runs = cx.record.runsOf(c.graph.id, c.node.id);
    if (!runs) {
      steps.push(stepAt(c, `Le Bind a été fait à ${secs(boundAt)}, mais ${titleOf(c)} (dans ${c.cls.name}) ne s’est jamais exécuté :`));
      whyNot(cx, c, steps, depth + 1, seen);
    } else if (runs.lastSeq < bound.firstSeq) {
      steps.push(
        stepAt(
          c,
          `${titleOf(c)} a été appelé à ${secs(runs.last)}, avant le Bind (à ${secs(boundAt)}) : un appel n’est reçu que par les événements déjà liés à ce moment-là. Fais le Bind plus tôt, au BeginPlay par exemple.`,
        ),
      );
    } else {
      steps.push(stepAt(c, `${titleOf(c)} a été appelé après le Bind, mais sur un autre acteur que celui où le Bind a été fait : vérifie la référence branchée sur Target des deux nœuds.`));
    }
  }
}

function whyInterfaceEvent(cx: DiagnoseCx, s: Site, steps: DiagnosisStep[], depth: number, seen: Set<string>): void {
  const { interface: iface, fn } = s.node.config;
  const messages = findNodes(cx.project, (n) => n.def === 'iface.message' && n.config.interface === iface && n.config.fn === fn);
  if (!messages.length) {
    steps.push(stepAt(s, `Aucun nœud n’envoie ce message d’interface : l’événement ne se déclenche que quand un autre Blueprint (ou celui-ci) l’envoie.`));
    return;
  }
  for (const m of messages.slice(0, 3)) {
    const runs = cx.record.runsOf(m.graph.id, m.node.id);
    if (!runs) {
      steps.push(stepAt(m, `Le message est envoyé par ${titleOf(m)} (dans ${m.cls.name}), qui ne s’est pas exécuté :`));
      whyNot(cx, m, steps, depth + 1, seen);
      continue;
    }
    const notes = cx.record.notesOf(m.graph.id, m.node.id);
    const missing = notes.get('iface.notImplemented');
    const none = notes.get('iface.noTarget');
    if (missing) steps.push(stepAt(m, `Le message a été envoyé à ${missing.detail ?? 'un acteur'}, qui n’implémente pas l’interface : ignoré sans erreur, comme dans UE.`));
    if (none) steps.push(stepAt(m, `Le message a été envoyé ${times(none.count)} avec un Target à None : il n’est allé nulle part.`));
    if (!missing && !none) steps.push(stepAt(m, `Le message a été envoyé ${times(runs.count)}, mais à un autre acteur que ${s.cls.name}.`));
  }
}
