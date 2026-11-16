/**
 * V6, Avancé: "Débogue D13 — Les vagues qui se terminent trop tôt" (E37).
 * The director counts live targets with an Integer: the wave "ends" as soon
 * as the count touches 0, long before every target is created, and a target
 * that reports twice is subtracted twice. A Set of the live targets and the
 * number created so far tell the truth.
 */
import { addDispatcher, addDispatcherParam } from '../../operations/classOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { countPrints, noRuntimeErrors, notion, usesNode } from '../checks';
import type { CheckContext, Lesson, ScenarioStep } from '../types';
import { DEBUG_METHOD, editable, getVar, say, setVar, varOf, wipe } from './kit';

const DONE = 'Vague terminée';
const GAP = 150;
const AWAY: ScenarioStep = { teleport: [-400, 300] };

/** The director's graph: counting with an Integer (the bug), or with a Set (the fix). */
function directorGraph(b: ClassBuilder, targetCls: string, dispatcher: string, param: string, fixed: boolean): void {
  const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
  const timer = b.node('time.setTimerByEvent', {}, { time: 0.5, looping: true }, [360, 96]);
  const keep = setVar(b, 'Minuteur', [700, 96]);
  const next = b.node('event.custom', { name: 'NouvelleCible' }, {}, [64, 420]);
  b.link(begin, 'then', timer, 'exec').link(next, 'delegate', timer, 'event').link(timer, 'then', keep, 'exec').link(timer, 'handle', keep, 'value');
  // NouvelleCible: spawn at X = Crees × 150, listen to it, count it.
  const spawn = b.node('actor.spawn', {}, { class: targetCls }, [360, 420]);
  const x = b.node('math.multiplyInt', {}, { b: GAP }, [64, 660]);
  const at = b.node('math.makeVector', {}, {}, [200, 660]);
  const bind = b.node('dispatcher.bind', { owner: targetCls, dispatcher }, {}, [720, 420]);
  const gone = b.node('event.custom', { name: 'CibleDetruite', signature: dispatcher, signatureOwner: targetCls }, {}, [64, 980]);
  const made = b.node('var.incrementInt', {}, {}, [1400, 420]);
  const all = b.node('math.greaterEqualInt', {}, {}, [1560, 660]);
  const last = b.node('flow.branch', {}, {}, [1720, 420]);
  const stop = b.node('time.clearTimer', {}, {}, [2020, 420]);
  b.link(next, 'then', spawn, 'exec').link(getVar(b, 'Crees', [-100, 670]), 'value', x, 'a').link(x, 'result', at, 'x').link(at, 'result', spawn, 'location');
  b.link(spawn, 'then', bind, 'exec').link(spawn, 'result', bind, 'target').link(gone, 'delegate', bind, 'event');
  let counted: string;
  if (fixed) {
    counted = b.node('set.add', {}, {}, [1060, 420]);
    b.link(getVar(b, 'Actives', [900, 600]), 'value', counted, 'set').link(spawn, 'result', counted, 'item');
  } else {
    counted = b.node('var.incrementInt', {}, {}, [1060, 420]);
    b.link(getVar(b, 'Actifs', [900, 600]), 'value', counted, 'value');
  }
  b.link(bind, 'then', counted, 'exec').link(counted, 'then', made, 'exec').link(getVar(b, 'Crees', [1240, 600]), 'value', made, 'value');
  b.link(made, 'then', last, 'exec').link(made, 'result', all, 'a').link(getVar(b, 'Prevu', [1400, 760]), 'value', all, 'b').link(all, 'result', last, 'condition');
  b.link(last, 'true', stop, 'exec').link(getVar(b, 'Minuteur', [1860, 620]), 'value', stop, 'handle');
  // CibleDetruite: is the wave over?
  const over = b.node('flow.branch', {}, {}, [fixed ? 1040 : 720, 980]);
  const tell = say(b, [fixed ? 1340 : 1020, 980], DONE);
  if (fixed) {
    const remove = b.node('set.remove', {}, {}, [400, 980]);
    const was = b.node('flow.branch', {}, {}, [720, 980]);
    const allMade = b.node('math.equalInt', {}, {}, [560, 1240]);
    const empty = b.node('math.equalInt', {}, { b: 0 }, [720, 1380]);
    const size = b.node('set.length', {}, {}, [560, 1380]);
    const both = b.node('logic.and', {}, {}, [900, 1260]);
    b.link(gone, 'then', remove, 'exec').link(getVar(b, 'Actives', [240, 1160]), 'value', remove, 'set').link(gone, param, remove, 'item');
    b.link(remove, 'then', was, 'exec').link(remove, 'result', was, 'condition').link(was, 'true', over, 'exec');
    b.link(getVar(b, 'Crees', [400, 1240]), 'value', allMade, 'a').link(getVar(b, 'Prevu', [400, 1310]), 'value', allMade, 'b');
    b.link(getVar(b, 'Actives', [400, 1390]), 'value', size, 'set').link(size, 'result', empty, 'a');
    b.link(allMade, 'result', both, 'a').link(empty, 'result', both, 'b').link(both, 'result', over, 'condition');
  } else {
    const less = b.node('var.decrementInt', {}, {}, [400, 980]);
    const zero = b.node('math.equalInt', {}, { b: 0 }, [560, 1200]);
    b.link(gone, 'then', less, 'exec').link(getVar(b, 'Actifs', [240, 1160]), 'value', less, 'value').link(less, 'then', over, 'exec');
    b.link(less, 'result', zero, 'a').link(zero, 'result', over, 'condition');
  }
  b.link(over, 'true', tell, 'exec');
}

function waveProject() {
  const pb = new ProjectBuilder('Débogue D13');
  const target = pb.blueprint('BP_Cible');
  target.component('StaticMesh', 'Cible', { shape: 'cylinder', sizeX: 60, sizeY: 60, color: '#dc2626', blocks: false });
  target.component('BoxCollision', 'Zone', { sizeX: 110, sizeY: 110 });
  const d = addDispatcher(target.cls, 'OnDetruite');
  addDispatcherParam(target.cls, d.id, T.object('BP_Cible'));
  d.params[0].name = 'Cible';
  // Touched by the player: report, then die. Dying reports again.
  const over = target.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const isPlayer = target.node('logic.equalObject', {}, {}, [220, 300]);
  const br = target.node('flow.branch', {}, {}, [400, 96]);
  const hit = target.node('dispatcher.call', { owner: target.cls.id, dispatcher: d.id }, {}, [700, 96]);
  const die = target.node('actor.destroy', {}, {}, [1040, 96]);
  target.link(over, 'then', br, 'exec').link(over, 'other', isPlayer, 'a').link(target.node('actor.getPlayerPawn', {}, {}, [40, 380]), 'result', isPlayer, 'b').link(isPlayer, 'result', br, 'condition');
  target.link(br, 'true', hit, 'exec').link(target.node('actor.self', {}, {}, [560, 300]), 'self', hit, d.params[0].id).link(hit, 'then', die, 'exec');
  const dead = target.node('event.destroyed', {}, {}, [64, 520]);
  const bye = target.node('dispatcher.call', { owner: target.cls.id, dispatcher: d.id }, {}, [400, 520]);
  target.link(dead, 'then', bye, 'exec').link(target.node('actor.self', {}, {}, [240, 700]), 'self', bye, d.params[0].id);

  const dir = pb.blueprint('BP_Directeur');
  dir.component('StaticMesh', 'Tour', { sizeX: 70, sizeY: 70, color: '#0f766e', blocks: false });
  editable(dir, 'Prevu', T.int, 5);
  dir.variable('Crees', T.int, 0);
  dir.variable('Actifs', T.int, 0);
  dir.variable('Minuteur', T.struct('TimerHandle'));
  directorGraph(dir, target.cls.id, d.id, d.params[0].id, false);
  pb.place(dir, -400, -250);
  pb.playerStart(-400, 300);
  return pb.project;
}

const done = (cx: CheckContext) => countPrints(cx, DONE);
/** Wait for the next target, step on it, step back. */
const kill = (i: number, before: number): ScenarioStep[] => [{ wait: before }, { teleport: [i * GAP, 0] }, { wait: 0.1 }, AWAY];

export const debug13: Lesson = {
  id: 'd13-vagues',
  kind: 'debug',
  code: 'D13',
  module: 'Le temps',
  level: 'avance',
  number: 0,
  title: 'Les vagues qui se terminent trop tôt',
  situation:
    'Le directeur crée 5 cibles, une toutes les 0,5 s, et doit annoncer « Vague terminée » quand la dernière a été éliminée. Mais si le joueur élimine la première cible avant que la deuxième apparaisse, l’annonce tombe aussitôt. Autre détail : chaque cible prévient deux fois, quand elle est touchée puis quand elle est détruite.',
  notions: ['Spawn Actor', 'Bind Event', 'Set', 'Remove', 'Length', 'Prévu, créé, actif', 'Compter une seule fois'],
  remember:
    '« Il n’en reste plus » ne veut pas dire « c’est fini » tant que tout n’a pas été créé : la fin d’une vague, c’est créés == prévus ET plus aucun actif. Et pour suivre des acteurs, range-les dans un Set plutôt que de tenir un compteur : retirer deux fois le même ne change rien, et Remove dit s’il était encore là.',
  cards: [
    DEBUG_METHOD,
    {
      title: 'Ce qui est en place',
      body:
        '**BP_Cible** : quand le joueur la touche, elle fait **Call OnDetruite** (avec elle-même en paramètre) puis **Destroy Actor**. Son **Event Destroyed** fait de nouveau Call OnDetruite. Deux annonces par cible, donc : c’est fréquent dans un vrai projet (un coup, puis une mort), et **ce n’est pas la cible qu’on corrige ici**.\n\n' +
        '**BP_Directeur** : un timer appelle `NouvelleCible` toutes les 0,5 s. Elle crée une cible (**Spawn Actor**), s’abonne à son `OnDetruite` (**Bind**, relié au Return Value du Spawn), ajoute 1 à `Actifs` et à `Crees`, et arrête le timer quand `Crees` atteint `Prevu`.\n\n' +
        '`CibleDetruite` retire 1 à `Actifs` ; à 0, elle annonce la fin.\n\n' +
        'Reproduis : lance Play et marche sur la première cible dès qu’elle apparaît.',
    },
    {
      title: 'Trois nombres qu’on confond',
      body:
        '- **Prévu** : combien la vague doit en créer (5). Ne change pas.\n' +
        '- **Créés** : combien sont déjà apparus. Monte de 0 à 5.\n' +
        '- **Actifs** : combien sont en jeu **en ce moment**. Monte et descend.\n\n' +
        'Le graphe conclut « terminé » quand Actifs vaut 0. Or Actifs vaut 0 à chaque fois que le joueur a éliminé tout ce qui est apparu **jusque-là**, même s’il en reste quatre à venir.\n\n' +
        'La bonne question a deux moitiés, reliées par un **AND** : tout a-t-il été créé (`Crees == Prevu`) **et** n’y a-t-il plus personne en jeu ?',
    },
    {
      title: 'Un Set plutôt qu’un compteur',
      body:
        'Un compteur ne sait pas **qui** il a compté. La cible prévient deux fois : `Actifs` descend de 2 pour une seule cible, devient négatif, et ne veut plus rien dire.\n\n' +
        'Un **Set** est une collection **sans doublon**. Crée une variable `Actives`, de type BP_Cible, conteneur **Set** (dans Details de la variable, le menu à côté du type).\n\n' +
        '- **Add** (Target Set = Get Actives, Item = la cible créée) : à la création.\n' +
        '- **Remove** : à la notification. Si la cible n’y est plus, il ne se passe rien, et son **Return Value** vaut faux.\n' +
        '- **Length** : combien il en reste.\n\n' +
        'Le Return Value de Remove est précieux : il dit « c’est la première fois qu’on me parle de cette cible ». La seconde notification s’arrête là.',
    },
    {
      title: 'Le plan',
      body:
        '1. Dans `NouvelleCible`, remplace l’Increment Int de `Actifs` par **Add** dans `Actives`, avec le Return Value du Spawn Actor.\n' +
        '2. Dans `CibleDetruite`, remplace le Decrement Int par **Remove** (Item = le paramètre `Cible` de l’événement).\n' +
        '3. Un **Branch** sur le Return Value de Remove : False, on ne fait rien.\n' +
        '4. True : un second Branch, « `Crees == Prevu` AND `Length (Actives) == 0` », avant l’annonce.\n\n' +
        'L’annonce ne peut alors sortir qu’une fois : à la toute dernière cible retirée, la première fois qu’on en parle.',
    },
  ],
  objectives: [
    'Éliminer les premières cibles avant l’apparition des suivantes n’annonce rien.',
    '« Vague terminée » s’affiche quand les 5 cibles ont été créées et qu’il n’en reste aucune.',
    'L’annonce ne s’affiche qu’une fois, bien que chaque cible prévienne deux fois.',
  ],
  hints: [
    'Actifs == 0 est vrai dès que le joueur a éliminé tout ce qui est apparu jusque-là. Quelle autre condition faut-il ?',
    'Nœuds : une variable Set de BP_Cible, Add et Remove (Utilities › Set), Length, Equal (Integer) deux fois, AND Boolean, un Branch de plus.',
    'Solution : NouvelleCible → Spawn → Bind → Add (Actives, Return Value) → Increment Crees → … CibleDetruite → Remove (Actives, Cible) → Branch (Return Value de Remove) → Branch (Crees == Prevu AND Length (Actives) == 0) → Print « Vague terminée ».',
  ],
  challenge: 'Ajoute une touche E qui relance une vague : remets Crees à 0, vide Actives (Clear) et relance le timer. Que se passe-t-il si une ancienne cible est encore en jeu ?',
  setup: waveProject,
  scenario: [...kill(0, 0.6), { wait: 0.1 }, { checkpoint: 'tot' }, ...kill(1, 0.35), ...kill(2, 0.4), ...kill(3, 0.4), { checkpoint: 'quatre' }, ...kill(4, 0.6), { wait: 0.2 }],
  checks: [
    {
      id: 'early',
      label: 'La première cible éliminée, 4 restent à venir : aucune annonce',
      at: 'tot',
      test: (cx) => (done(cx) === 0 ? true : 'La vague s’annonce terminée alors qu’une seule cible sur 5 a été créée. « Plus aucune cible en jeu » ne suffit pas : il faut aussi que toutes aient été créées (Crees == Prevu).'),
    },
    {
      id: 'four',
      label: 'Quatre cibles éliminées, la 5e pas encore apparue : aucune annonce',
      at: 'quatre',
      test: (cx) => (done(cx) === 0 ? true : 'Annonce prématurée : la 5e cible n’est pas encore apparue. La fin demande Crees == Prevu ET plus aucune cible active.'),
    },
    {
      id: 'end',
      label: 'La 5e éliminée : « Vague terminée », une seule fois',
      test: (cx) => {
        const n = done(cx);
        if (n === 1) return true;
        if (n === 0) {
          return 'La fin n’est jamais annoncée. Chaque cible prévient deux fois : un compteur qui descend deux fois par cible passe sous 0 et ne retombe plus dessus. Un Set, lui, ne retire une cible qu’une fois.';
        }
        return `« Vague terminée » s’affiche ${n} fois. La seconde notification de la dernière cible repasse le test : ne continue que si Remove a vraiment retiré la cible (son Return Value).`;
      },
    },
    {
      id: 'all',
      label: 'Les 5 cibles ont bien été créées, puis le timer s’est arrêté',
      test: (cx) => (varOf(cx, 'BP_Directeur', 'Crees') === 5 ? true : `Crees vaut ${String(varOf(cx, 'BP_Directeur', 'Crees'))} : la création des cibles ne doit pas changer.`),
    },
    notion(usesNode('set', 'BP_Directeur', ['set.add'], 'Les cibles actives sont rangées dans un Set', 'Suis les cibles en jeu dans un Set (Add à la création, Remove à la notification).')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const dir = edit(p, 'BP_Directeur');
    const target = p.classes.find((c) => c.name === 'BP_Cible')!;
    dir.variable('Actives', T.set(T.object('BP_Cible')), []);
    wipe(dir.graph);
    directorGraph(dir, target.id, target.dispatchers[0].id, target.dispatchers[0].params[0].id, true);
  },
};
