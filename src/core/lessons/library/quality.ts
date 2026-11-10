/**
 * V3 step E, quality of solutions, for lessons written before it: what to
 * try once a lesson works (robustness cases), and other ways to solve it.
 * Kept apart from the lessons so each lesson file stays about its own subject;
 * core/lessons/index.ts attaches them by lesson id.
 */
import type { Project } from '../../model/project';
import { readTimeline, timelineConfig, trackPin } from '../../nodes/library/timeline';
import { T } from '../../types/pins';
import { edit } from '../builder';
import { printedNumbers } from '../checks';
import type { Alternative, CheckContext, RobustnessCase } from '../types';

interface Quality {
  robustness?: RobustnessCase[];
  alternatives?: Alternative[];
}

const lit = (cx: CheckContext, actor: string) => !!cx.component(actor, 'Lumiere')?.props.visible;

/** Another instance of a class, placed in the learner's level. */
function place(p: Project, className: string, name: string, x: number, y: number, overrides: Record<string, string | null> = {}): void {
  const cls = p.classes.find((c) => c.name === className);
  if (cls) p.level.actors.push({ id: `robust-${name}`, classId: cls.id, name, x, y, yaw: 0, overrides });
}

/** The learner's reference variable towards `target` in `className`, whatever they named it. */
function referenceTo(p: Project, className: string, target: string): string | undefined {
  return p.classes.find((c) => c.name === className)?.variables.find((v) => v.type.category === 'object' && v.type.subtype === target && !v.type.container)?.id;
}

export const QUALITY: Record<string, Quality> = {
  // ------------------------------------------------------- L’interrupteur
  'l03-interrupteur': {
    robustness: [
      {
        id: 'two-lamps',
        label: 'il y a une seconde lampe, plus loin',
        advice: 'Chaque lampe doit réagir à sa propre zone et allumer sa propre Lumiere : pas de recherche d’une lampe dans le niveau.',
        mutate: (p) => place(p, 'BP_Lampe', 'BP_Lampe2', 900, 0),
        scenario: [{ wait: 0.2 }, { teleport: [-60, 0] }, { wait: 0.3 }, { checkpoint: 'une' }, { teleport: [840, 0] }, { wait: 0.3 }, { checkpoint: 'autre' }],
        checks: [
          { id: 'first', label: 'la première seule', at: 'une', test: (cx) => (lit(cx, 'BP_Lampe') && !lit(cx, 'BP_Lampe2') ? true : 'Le joueur est dans la zone de la première lampe : elle seule devrait être allumée.') },
          { id: 'second', label: 'puis la seconde seule', at: 'autre', test: (cx) => (!lit(cx, 'BP_Lampe') && lit(cx, 'BP_Lampe2') ? true : 'Le joueur est passé à la seconde lampe : la première devrait s’éteindre et la seconde s’allumer.') },
        ],
      },
    ],
    alternatives: [
      {
        title: 'Écouter la Zone elle-même',
        gains: 'On Component Begin / End Overlap (Zone) ne réagit qu’à cette zone : le jour où la lampe en a une seconde, rien ne se mélange.',
        loses: 'Il faut un couple d’événements par zone, là où ActorBeginOverlap les couvre toutes d’un coup.',
        build(p) {
          const b = edit(p, 'BP_Lampe');
          const zone = b.componentId('Zone');
          const begin = b.node('event.componentBeginOverlap', { component: zone }, {}, [64, 96]);
          const on = b.node('component.setVisibility', {}, { visible: true }, [460, 96]);
          const end = b.node('event.componentEndOverlap', { component: zone }, {}, [64, 420]);
          const off = b.node('component.setVisibility', {}, { visible: false }, [460, 420]);
          b.link(begin, 'then', on, 'exec').target('Lumiere', on);
          b.link(end, 'then', off, 'exec').target('Lumiere', off);
        },
      },
    ],
  },

  // -------------------------------------------------- Interrupteur à touche
  'l04-touche': {
    alternatives: [
      {
        title: 'Avec un FlipFlop',
        gains: 'Pas de variable à créer ni à tenir à jour : FlipFlop alterne tout seul entre A et B.',
        loses: 'L’état n’existe que dans le FlipFlop : aucun autre nœud ne peut demander « la lampe est-elle allumée ? ».',
        build(p) {
          const b = edit(p, 'BP_Lampe');
          const key = b.node('event.inputKey', { key: 'E' }, {}, [64, 200]);
          const flip = b.node('flow.flipFlop', {}, {}, [340, 200]);
          const on = b.node('component.setVisibility', {}, { visible: true }, [640, 80]);
          const off = b.node('component.setVisibility', {}, { visible: false }, [640, 400]);
          b.link(key, 'pressed', flip, 'exec').link(flip, 'a', on, 'exec').link(flip, 'b', off, 'exec');
          b.target('Lumiere', on).target('Lumiere', off);
        },
      },
      {
        title: 'Avec Toggle Visibility',
        gains: 'Un seul nœud : il inverse la visibilité, quelle qu’elle soit.',
        loses: 'Ne sert que pour la visibilité. Dès qu’un appui doit faire deux choses différentes (un son à l’allumage, un autre à l’extinction), il faut revenir au Branch.',
        build(p) {
          const b = edit(p, 'BP_Lampe');
          const key = b.node('event.inputKey', { key: 'E' }, {}, [64, 200]);
          const toggle = b.node('component.toggleVisibility', {}, {}, [400, 200]);
          b.link(key, 'pressed', toggle, 'exec').target('Lumiere', toggle);
        },
      },
    ],
  },

  // ------------------------------------------------------- Ouvrir une porte
  'l05-porte': {
    alternatives: [
      {
        title: 'Sans DoOnce',
        gains: 'Deux nœuds de moins : Set Relative Rotation à 90° donne le même résultat à chaque passage, la porte ne peut pas tourner deux fois.',
        loses: 'Tout ce qu’on ajoutera derrière (un son, un message, un compteur) se rejouera à chaque passage. Avec Add Relative Rotation, la porte tournerait de 90° de plus à chaque fois.',
        build(p) {
          const b = edit(p, 'BP_Porte');
          const e = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
          const rot = b.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [420, 96]);
          b.link(e, 'then', rot, 'exec').target('Porte', rot);
        },
      },
    ],
  },

  // ------------------------------------------------------ Ramasser un objet
  'l06-cle': {
    robustness: [
      {
        id: 'two-keys',
        label: 'il y a une seconde clé, que le joueur ne touche pas',
        advice: 'Destroy Actor doit viser Self (sa Target par défaut) : la clé touchée se détruit elle-même, pas « une clé » trouvée dans le niveau.',
        mutate: (p) => place(p, 'BP_Cle', 'BP_Cle2', 300, 500),
        scenario: [{ wait: 0.5 }, { walk: [1, 0], seconds: 1.2 }, { wait: 0.2 }],
        checks: [
          {
            id: 'other-stays',
            label: 'elle reste là',
            test: (cx) => {
              if (!cx.actor('BP_Cle2')) return 'La seconde clé, que le joueur n’a pas touchée, a disparu elle aussi.';
              return cx.actor('BP_Cle') ? 'La clé touchée est restée dans le niveau.' : true;
            },
          },
        ],
      },
    ],
  },

  // ----------------------------------------------------------- Le compteur
  'l-compteur': {
    robustness: [
      {
        id: 'two-counters',
        label: 'il y a une seconde borne',
        advice: 'Le total doit rester dans une variable de BP_Compteur : chaque borne placée a alors son propre compte.',
        mutate: (p) => place(p, 'BP_Compteur', 'BP_Compteur2', 1200, 0),
        scenario: [
          { wait: 0.2 },
          { teleport: [0, 0] },
          { wait: 0.3 },
          { teleport: [-500, 0] },
          { wait: 0.3 },
          { teleport: [0, 0] },
          { wait: 0.3 },
          { teleport: [-500, 0] },
          { wait: 0.3 },
          { teleport: [1200, 0] },
          { wait: 0.3 },
          { checkpoint: 'fin' },
        ],
        checks: [
          {
            id: 'own-count',
            label: 'chacune compte pour elle',
            at: 'fin',
            test: (cx) => {
              const n = printedNumbers(cx).join(', ');
              return n === '1, 2, 1' ? true : `Deux passages à la première borne puis un à la seconde : il fallait afficher 1, 2, 1 (affiché : ${n || 'rien'}).`;
            },
          },
        ],
      },
    ],
  },

  // ---------------------------------------------------- Générateur et lampe
  'l09-generateur': {
    robustness: [
      {
        id: 'third-lamp',
        label: 'on ajoute une troisième lampe, reliée au générateur',
        advice: 'La lampe doit lire le générateur désigné par sa variable Instance Editable, pas un générateur trouvé ou fixé dans le graphe.',
        mutate(p) {
          const ref = referenceTo(p, 'BP_Lampe', 'BP_Generateur');
          const gen = p.level.actors.find((a) => a.name === 'BP_Generateur');
          place(p, 'BP_Lampe', 'BP_Lampe3', 300, 80, ref && gen ? { [ref]: `actor:${gen.id}` } : {});
        },
        scenario: [{ wait: 0.3 }, { press: 'E' }, { release: 'E' }, { wait: 0.1 }, { checkpoint: 'marche' }],
        checks: [{ id: 'third', label: 'elle s’allume aussi', at: 'marche', test: (cx) => (lit(cx, 'BP_Lampe3') ? true : 'La troisième lampe, pourtant reliée au générateur dans son Details, reste éteinte.') }],
      },
    ],
  },

  // ---------------------------------------------------- Le générateur prévient
  'l10-dispatcher': {
    robustness: [
      {
        id: 'orphan',
        label: 'une lampe est placée sans générateur relié',
        advice:
          'Bind Event avec un Target à None produit « Accessed None ». Fais passer le Bind par un Is Valid (Generateur) : la lampe sans générateur reste simplement éteinte. La solution proposée par la leçon ne le fait pas non plus.',
        mutate: (p) => place(p, 'BP_Lampe', 'BP_Lampe4', 600, 80),
        scenario: [{ wait: 0.3 }, { press: 'E' }, { release: 'E' }, { wait: 0.1 }, { checkpoint: 'marche' }],
        checks: [
          {
            id: 'no-error',
            label: 'aucune erreur',
            at: 'marche',
            test: (cx) => {
              const err = cx.sim.log.find((l) => l.level === 'error');
              if (err) return `La lampe sans générateur provoque une erreur : ${err.text.split('. Node')[0]}.`;
              return lit(cx, 'BP_Lampe') ? true : 'Les lampes reliées ne s’allument plus.';
            },
          },
        ],
      },
    ],
  },

  // ------------------------------------------------------------ L’ascenseur
  'l-ascenseur': {
    robustness: [
      {
        id: 'fast-device',
        label: 'le jeu tourne à 120 images par seconde',
        advice: 'Multiplie Vitesse par Delta Seconds : la distance par image s’adapte alors au nombre d’images.',
        scenario: [{ fps: 120 }, { wait: 1.5 }, { checkpoint: 'mi' }, { wait: 3 }, { checkpoint: 'fin' }],
        checks: [
          {
            id: 'same-speed',
            label: 'même vitesse',
            at: 'mi',
            test: (cx) => {
              const x = Math.round(cx.actor('BP_Ascenseur')?.x ?? 0);
              return x >= 270 && x <= 330 ? true : `À 120 images par seconde, la plateforme parcourt ${x} cm en 1,5 s au lieu de 300.`;
            },
          },
          {
            id: 'same-stop',
            label: 'même arrêt',
            at: 'fin',
            test: (cx) => {
              const x = Math.round(cx.actor('BP_Ascenseur')?.x ?? 0);
              return x >= 595 && x <= 620 ? true : `À 120 images par seconde, elle s’arrête à ${x} au lieu de 600.`;
            },
          },
        ],
      },
    ],
    alternatives: [
      {
        title: 'Avec un timer',
        gains: 'Pas d’Event Tick : le timer ne tourne que tant qu’on en a besoin, et Clear Timer l’arrête pour de bon.',
        loses: 'Le mouvement se fait par pas (20 par seconde ici) : moins fluide qu’à chaque image. Et la durée du pas doit rester la même dans Time et dans le calcul.',
        build(p) {
          const b = edit(p, 'BP_Ascenseur');
          const speed = b.cls.variables[0].id;
          const handle = b.variable('Minuteur', T.struct('TimerHandle'));
          const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
          const timer = b.node('time.setTimerByEvent', {}, { time: 0.05, looping: true }, [360, 96]);
          const keep = b.node('var.set', { variable: handle }, {}, [720, 96]);
          const ev = b.node('event.custom', { name: 'Avancer' }, {}, [64, 420]);
          const loc = b.node('actor.getLocation', {}, {}, [64, 640]);
          const split = b.node('math.breakVector', {}, {}, [280, 640]);
          const less = b.node('math.lessFloat', {}, { b: 600 }, [480, 640]);
          const br = b.node('flow.branch', {}, {}, [400, 420]);
          const mul = b.node('math.multiplyFloat', {}, { b: 0.05 }, [640, 760]);
          const vec = b.node('math.makeVector', {}, {}, [820, 700]);
          const move = b.node('actor.addOffset', {}, {}, [760, 400]);
          const stop = b.node('time.clearTimer', {}, {}, [760, 560]);
          b.link(begin, 'then', timer, 'exec').link(ev, 'delegate', timer, 'event').link(timer, 'then', keep, 'exec').link(timer, 'handle', keep, 'value');
          b.link(ev, 'then', br, 'exec').link(loc, 'result', split, 'in').link(split, 'x', less, 'a').link(less, 'result', br, 'condition');
          b.link(br, 'true', move, 'exec').link(br, 'false', stop, 'exec');
          b.link(b.node('var.get', { variable: speed }, {}, [440, 800]), 'value', mul, 'a').link(mul, 'result', vec, 'x').link(vec, 'result', move, 'delta');
          b.link(b.node('var.get', { variable: handle }, {}, [560, 600]), 'value', stop, 'handle');
        },
      },
      {
        title: 'Avec un Timeline',
        gains: 'Aucun calcul de vitesse ni test d’arrêt : la piste va de 0 à 600 en 3 secondes et s’arrête d’elle-même. La courbe peut ralentir à l’arrivée.',
        loses: 'On règle une durée, plus une vitesse : changer la distance oblige à refaire la piste. Et la variable Vitesse ne sert plus.',
        build(p) {
          const b = edit(p, 'BP_Ascenseur');
          const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
          const tl = b.node('timeline.node', {}, {}, [360, 96]);
          const data = readTimeline(b.graph.nodes[tl]);
          data.name = 'Trajet';
          data.length = 3;
          data.tracks[0].name = 'X';
          data.tracks[0].keys = [{ t: 0, v: 0 }, { t: 3, v: 600 }];
          Object.assign(b.graph.nodes[tl].config, timelineConfig(data));
          const vec = b.node('math.makeVector', {}, {}, [660, 360]);
          const set = b.node('actor.setLocation', {}, {}, [900, 96]);
          b.link(begin, 'then', tl, 'play').link(tl, 'update', set, 'exec');
          b.link(tl, trackPin(data.tracks[0].id), vec, 'x').link(vec, 'result', set, 'location');
        },
      },
    ],
  },

  // ---------------------------------------------------- La porte qui glisse
  'l-porte-glisse': {
    alternatives: [
      {
        title: 'Sur Tick, avec FInterp To Constant',
        gains: 'Pas de Timeline : les overlaps ne font que changer une cible (0 ou 200), et le panneau la rejoint à vitesse constante, d’où qu’il parte.',
        loses: 'Un Tick tourne en permanence, même porte immobile. Et la courbe ne se règle plus : pas de départ rapide ni d’arrivée douce comme avec une piste.',
        build(p) {
          const b = edit(p, 'BP_PorteCoulissante');
          const nodes = Object.values(b.graph.nodes);
          const begin = nodes.find((n) => n.def === 'event.actorBeginOverlap')!.id;
          const end = nodes.find((n) => n.def === 'event.actorEndOverlap')!.id;
          const move = nodes.find((n) => n.def === 'component.setRelativeLocation')!.id;
          for (const l of Object.values(b.graph.links)) if (l.from.node === begin) delete b.graph.links[l.id];
          const target = b.variable('Cible', T.float, 0);
          const pos = b.variable('Position', T.float, 0);
          const open = b.node('var.set', { variable: target }, { value: 200 }, [360, 96]);
          const close = b.node('var.set', { variable: target }, { value: 0 }, [360, 420]);
          const tick = b.node('event.tick', {}, {}, [64, 700]);
          const interp = b.node('math.fInterpToConstant', {}, { speed: 200 }, [360, 900]);
          const keep = b.node('var.set', { variable: pos }, {}, [660, 700]);
          const vec = b.node('math.makeVector', {}, {}, [900, 900]);
          b.graph.nodes[move].x = 1140;
          b.graph.nodes[move].y = 700;
          b.link(begin, 'then', open, 'exec').link(end, 'then', close, 'exec');
          b.link(tick, 'then', keep, 'exec').link(keep, 'then', move, 'exec').link(tick, 'delta', interp, 'delta');
          b.link(b.node('var.get', { variable: pos }, {}, [120, 900]), 'value', interp, 'current');
          b.link(b.node('var.get', { variable: target }, {}, [120, 1000]), 'value', interp, 'target');
          b.link(interp, 'result', keep, 'value').link(keep, 'out', vec, 'x').link(vec, 'result', move, 'location');
        },
      },
    ],
  },
};
