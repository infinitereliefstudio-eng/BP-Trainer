/**
 * V2, Confirmé: time. Waves of enemies (Set Timer by Event, Spawn Actor,
 * Expose on Spawn) and a lift moved on Tick with Delta Seconds, tested at
 * 30 frames per second.
 */
import { updateVariable } from '../../operations/classOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { countPrints, noRuntimeErrors, usesNode, notion } from '../checks';
import type { CheckContext, Lesson } from '../types';

// --------------------------------------------------------------- Les vagues

function wavesProject() {
  const pb = new ProjectBuilder('Les vagues');
  const enemy = pb.blueprint('BP_Ennemi');
  enemy.component('StaticMesh', 'Corps', { shape: 'cylinder', sizeX: 50, sizeY: 50, color: '#dc2626', blocks: false });
  const vie = enemy.variable('Vie', T.int, 0);
  const begin = enemy.node('event.beginPlay', {}, {}, [64, 96]);
  const text = enemy.node('string.append', {}, { in0: 'Vie : ' }, [300, 300]);
  const say = enemy.node('debug.printString', {}, {}, [520, 96]);
  enemy.link(begin, 'then', say, 'exec').link(enemy.node('var.get', { variable: vie }, {}, [100, 300]), 'value', text, 'in1').link(text, 'result', say, 'text');
  const spawner = pb.blueprint('BP_Spawner');
  spawner.component('StaticMesh', 'Socle', { sizeX: 120, sizeY: 120, color: '#4b5563', blocks: false });
  spawner.variable('Vague', T.int, 0);
  pb.place(spawner, 0, 0);
  pb.playerStart(-400, 0);
  return pb.project;
}

const enemies = (cx: CheckContext) => cx.sim.actors.filter((a) => a.className === 'BP_Ennemi' && !a.destroyed).length;

export const lessonWaves: Lesson = {
  id: 'l-vagues',
  module: 'Le temps',
  level: 'confirme',
  number: 0,
  title: 'Les vagues',
  situation: 'Le spawner crée un ennemi par seconde, trois vagues en tout. L’ennemi de la vague N a N × 10 de vie, et l’affiche à son BeginPlay. Puis le spawner s’arrête.',
  notions: ['Set Timer by Event', 'Spawn Actor', 'Expose on Spawn', 'Clear and Invalidate Timer by Handle'],
  remember: 'Le BeginPlay d’un acteur créé par Spawn Actor a déjà tourné quand Return Value sort : ce qu’il doit savoir dès le départ se donne par Expose on Spawn, pas par un Set après.',
  cards: [
    {
      title: 'Répéter dans le temps',
      body:
        '**Set Timer by Event** appelle un Custom Event dans *Time* secondes, en boucle si **Looping** est coché. Tire un fil depuis sa pin **Event** pour créer ce Custom Event.\n\n' +
        'Pour l’arrêter, garde son **Return Value** (un Timer Handle) dans une variable, puis **Clear and Invalidate Timer by Handle**.',
    },
    {
      title: 'Donner une valeur à la naissance',
      body:
        '**Spawn Actor** crée l’acteur, exécute son **BeginPlay**, puis seulement sort par sa pin blanche. Un **Set Vie** placé après arrive donc trop tard : le BeginPlay a déjà affiché 0.\n\n' +
        'Dans BP_Ennemi, coche **Expose on Spawn** sur `Vie` : elle devient une pin du nœud Spawn Actor, posée **avant** le BeginPlay.',
    },
  ],
  objectives: [
    'Dans BP_Ennemi, coche Expose on Spawn sur Vie.',
    'Dans BP_Spawner : au BeginPlay, un timer en Looping toutes les 1 s.',
    'À chaque appel : Vague + 1, puis Spawn Actor BP_Ennemi avec Vie = Vague × 10 (à une position différente à chaque vague si tu veux).',
    'Après la 3e vague, arrête le timer. Touche Vérifier.',
  ],
  hints: [
    'Trois choses : le timer, le Custom Event qu’il appelle, et l’arrêt quand Vague atteint 3.',
    'Nœuds : Set Timer by Event (Looping), Custom Event NouvelleVague, Increment Int (Vague), Spawn Actor (Class = BP_Ennemi), × (Integer), Branch, >= (Integer), Clear and Invalidate Timer by Handle, une variable Timer Handle.',
    'Solution : BeginPlay → Set Timer by Event (NouvelleVague, 1, Looping) → Set Minuteur (Return Value). NouvelleVague → Increment Vague → Spawn Actor (Vie = Vague × 10) → Branch (Vague >= 3) → True : Clear and Invalidate Timer by Handle (Minuteur).',
  ],
  challenge: 'Fais apparaître chaque ennemi 150 cm plus loin que le précédent : Make Vector avec X = Vague × 150.',
  setup: wavesProject,
  scenario: [{ wait: 4.5 }],
  checks: [
    {
      id: 'expose',
      label: 'Vie est Expose on Spawn',
      test: (cx) =>
        cx.project.classes.find((c) => c.name === 'BP_Ennemi')?.variables.find((v) => v.name === 'Vie')?.exposeOnSpawn
          ? true
          : 'Coche Expose on Spawn sur Vie (Details de la variable, dans BP_Ennemi).',
    },
    {
      id: 'count',
      label: 'Trois ennemis, puis plus rien',
      test: (cx) => {
        const n = enemies(cx);
        if (n === 3) return true;
        if (n > 3) return `${n} ennemis après 4,5 s : le timer ne s’arrête pas après la 3e vague.`;
        return `${n} ennemi(s) après 4,5 s : il en faut un par seconde (timer en Looping), 3 au total.`;
      },
    },
    {
      id: 'life',
      label: 'Chacun affiche sa vie à son BeginPlay : 10, 20, 30',
      test: (cx) => {
        if (['10', '20', '30'].every((v) => countPrints(cx, `Vie : ${v}`) === 1)) return true;
        if (countPrints(cx, 'Vie : 0') > 0) {
          return 'Un ennemi affiche « Vie : 0 » : sa vie lui a été donnée après son BeginPlay. Donne-la par la pin Vie du Spawn Actor (Expose on Spawn).';
        }
        return `Messages : ${cx.prints().join(', ') || 'aucun'}. Il fallait Vie : 10, Vie : 20, Vie : 30.`;
      },
    },
    notion(usesNode('timer', 'BP_Spawner', ['time.setTimerByEvent'], 'Le spawner utilise Set Timer by Event', 'Répète la création avec Set Timer by Event.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const enemy = edit(p, 'BP_Ennemi');
    const vie = enemy.cls.variables[0].id;
    updateVariable(enemy.cls, vie, { exposeOnSpawn: true });
    const s = edit(p, 'BP_Spawner');
    const vague = s.cls.variables[0].id;
    const handle = s.variable('Minuteur', T.struct('TimerHandle'));
    const begin = s.node('event.beginPlay', {}, {}, [64, 96]);
    const timer = s.node('time.setTimerByEvent', {}, { time: 1, looping: true }, [360, 96]);
    const keep = s.node('var.set', { variable: handle }, {}, [700, 96]);
    s.link(begin, 'then', timer, 'exec').link(timer, 'then', keep, 'exec').link(timer, 'handle', keep, 'value');
    const ev = s.node('event.custom', { name: 'NouvelleVague' }, {}, [64, 420]);
    s.link(ev, 'delegate', timer, 'event');
    const inc = s.node('var.incrementInt', {}, {}, [360, 420]);
    const spawn = s.node('actor.spawn', {}, { class: enemy.cls.id }, [700, 420]);
    const mul = s.node('math.multiplyInt', {}, { b: 10 }, [560, 640]);
    const ge = s.node('math.greaterEqualInt', {}, { b: 3 }, [900, 640]);
    const br = s.node('flow.branch', {}, {}, [1040, 420]);
    const stop = s.node('time.clearTimer', {}, {}, [1340, 420]);
    s.link(ev, 'then', inc, 'exec').link(s.node('var.get', { variable: vague }, {}, [200, 640]), 'value', inc, 'value');
    s.link(inc, 'then', spawn, 'exec').link(inc, 'result', mul, 'a').link(mul, 'result', spawn, `expose:${vie}`);
    s.link(spawn, 'then', br, 'exec').link(inc, 'result', ge, 'a').link(ge, 'result', br, 'condition');
    s.link(br, 'true', stop, 'exec').link(s.node('var.get', { variable: handle }, {}, [1200, 640]), 'value', stop, 'handle');
  },
};

// ------------------------------------------------------------ L'ascenseur

function liftProject() {
  const pb = new ProjectBuilder('L’ascenseur');
  const b = pb.blueprint('BP_Ascenseur');
  b.component('StaticMesh', 'Plateforme', { sizeX: 140, sizeY: 140, color: '#0ea5e9', blocks: false });
  b.variable('Vitesse', T.float, 200);
  pb.place(b, 0, 0);
  pb.playerStart(-300, 250);
  return pb.project;
}

const liftX = (cx: CheckContext) => Math.round(cx.actor('BP_Ascenseur')?.x ?? 0);

export const lessonLift: Lesson = {
  id: 'l-ascenseur',
  module: 'Le temps',
  level: 'confirme',
  number: 0,
  title: 'L’ascenseur',
  situation: 'La plateforme avance à 200 cm/s et s’arrête à X = 600. Le test tourne à 30 images par seconde, comme sur un appareil lent.',
  notions: ['Event Tick', 'Delta Seconds', 'Add Actor World Offset', 'Vitesse en cm/s'],
  remember: 'Sur Tick, une vitesse se multiplie par Delta Seconds : le mouvement dépend alors du temps écoulé, plus du nombre d’images par seconde.',
  cards: [
    {
      title: 'À chaque image',
      body:
        '**Event Tick** s’exécute à chaque image. Sa sortie **Delta Seconds** dit combien de temps s’est écoulé depuis la précédente : 1/60 s à 60 images par seconde, 1/30 s à 30.\n\n' +
        'Avancer de 3 cm par Tick donne 180 cm/s à 60 images… et 90 cm/s à 30. Avancer de **Vitesse × Delta Seconds** donne toujours Vitesse cm/s.',
    },
    {
      title: 'Déplacer et s’arrêter',
      body:
        '**Add Actor World Offset** déplace l’acteur de *Delta Location* (un vecteur : X, Y, Z). Pour s’arrêter à 600, regarde **Get Actor Location** › **Break Vector** › X, et ne bouge que si X < 600.',
    },
  ],
  objectives: [
    'Sur Event Tick, avance la plateforme de Vitesse × Delta Seconds en X.',
    'Arrête-la à X = 600.',
    'Touche Vérifier (le test tourne à 30 images par seconde).',
  ],
  hints: [
    'Le calcul : Vitesse × Delta Seconds, dans le X d’un Make Vector, branché sur Delta Location.',
    'Nœuds : Event Tick, Get Actor Location, Break Vector, < (Float), Branch, Get Vitesse, × (Float), Make Vector, Add Actor World Offset.',
    'Solution : Tick → Branch (X de Get Actor Location < 600) → True : Add Actor World Offset (Make Vector (Vitesse × Delta Seconds, 0, 0)).',
  ],
  challenge: 'Refais-le sans Tick : Set Timer by Event en Looping toutes les 0,05 s, et Vitesse × 0,05.',
  setup: liftProject,
  scenario: [{ fps: 30 }, { wait: 1.5 }, { checkpoint: 'mi' }, { wait: 3 }, { checkpoint: 'fin' }],
  checks: [
    {
      id: 'speed',
      label: 'À 1,5 s, la plateforme a parcouru environ 300 cm',
      at: 'mi',
      test: (cx) => {
        const x = liftX(cx);
        if (x >= 270 && x <= 330) return true;
        if (x === 0) return 'La plateforme n’a pas bougé : Add Actor World Offset, sur Event Tick.';
        return `La plateforme a parcouru ${x} cm en 1,5 s au lieu de 300. Le test tourne à 30 images par seconde : si tu ajoutes une distance fixe à chaque Tick, multiplie plutôt Vitesse par Delta Seconds.`;
      },
    },
    {
      id: 'stop',
      label: 'Elle s’arrête à 600',
      at: 'fin',
      test: (cx) => {
        const x = liftX(cx);
        if (x >= 595 && x <= 620) return true;
        return x > 620 ? `Elle a continué jusqu’à ${x} : arrête-la quand X atteint 600.` : `Elle s’est arrêtée à ${x} au lieu de 600.`;
      },
    },
    notion(usesNode('tick', 'BP_Ascenseur', ['event.tick'], 'Le mouvement se fait sur Event Tick', 'Déplace la plateforme sur Event Tick.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Ascenseur');
    const speed = b.cls.variables[0].id;
    const tick = b.node('event.tick', {}, {}, [64, 96]);
    const loc = b.node('actor.getLocation', {}, {}, [200, 320]);
    const split = b.node('math.breakVector', {}, {}, [400, 320]);
    const less = b.node('math.lessFloat', {}, { b: 600 }, [600, 320]);
    const br = b.node('flow.branch', {}, {}, [700, 96]);
    const mul = b.node('math.multiplyFloat', {}, {}, [800, 420]);
    const vec = b.node('math.makeVector', {}, {}, [1000, 420]);
    const move = b.node('actor.addOffset', {}, {}, [1000, 96]);
    b.link(tick, 'then', br, 'exec').link(loc, 'result', split, 'in').link(split, 'x', less, 'a').link(less, 'result', br, 'condition');
    b.link(br, 'true', move, 'exec').link(b.node('var.get', { variable: speed }, {}, [600, 520]), 'value', mul, 'a').link(tick, 'delta', mul, 'b');
    b.link(mul, 'result', vec, 'x').link(vec, 'result', move, 'delta');
  },
};
