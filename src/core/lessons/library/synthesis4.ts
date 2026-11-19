/**
 * Lot 4a of the path plan: synthesis S4 « Les fusibles », the end of the
 * Avancé. A brief with a save in it (Tristan's plan: « une sauvegarde dans
 * la synthèse Avancé »): the learner creates the SaveGame and the player's
 * variable, and meets the BeginPlay order again (a fuse must not count on
 * the player having loaded first).
 */
import type { Project } from '../../model/project';
import { addClass } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { ClassBuilder, edit, ProjectBuilder } from '../builder';
import { countPrints, noRuntimeErrors, normText, notion, usesNode } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { goTo, varId } from './kit';
import { playerBlueprint } from './props';

const SLOT = 'Station';
const FUSES: [number, number][] = [
  [-500, -250],
  [-200, -250],
  [100, -250],
];
const DOOR: [number, number] = [450, 0];
const AWAY: [number, number] = [-200, 250];

function project(): Project {
  const pb = new ProjectBuilder('Synthèse S4');
  playerBlueprint(pb);
  const fuse = pb.blueprint('BP_Fusible');
  fuse.component('StaticMesh', 'Fusible', { shape: 'cylinder', sizeX: 30, sizeY: 30, color: '#f97316', blocks: false });
  fuse.component('BoxCollision', 'Zone', { sizeX: 100, sizeY: 100 });
  const id = fuse.variable('Id', T.name, '');
  fuse.cls.variables[0].instanceEditable = true;
  FUSES.forEach((at, i) => {
    const a = pb.place(fuse, ...at);
    pb.project.level.actors.find((x) => x.id === a)!.overrides[id] = `F${i + 1}`;
  });
  const door = pb.blueprint('BP_Porte');
  door.component('StaticMesh', 'Porte', { shape: 'door', sizeX: 180, sizeY: 16, color: '#a0703c', blocks: false });
  door.component('BoxCollision', 'Zone', { sizeX: 220, sizeY: 220 });
  pb.place(door, ...DOOR);
  pb.playerStart(...AWAY);
  return pb.project;
}

const fuseLeft = (cx: CheckContext, label: string) => !!cx.actor(label) && !cx.actor(label)!.destroyed;
const doorOpen = (cx: CheckContext) => Math.abs(Math.abs(cx.component('BP_Porte', 'Porte')?.props.yaw ?? 0) - 90) < 1;

export const synthesis4: Lesson = {
  id: 's4-fusibles',
  code: 'S4',
  kind: 'synthesis',
  module: 'Synthèse',
  level: 'avance',
  number: 0,
  title: 'Les fusibles',
  situation:
    'Trois fusibles à ramasser pour rétablir le courant. La partie peut s’arrêter à tout moment : à la suivante, les fusibles déjà pris ne reviennent pas, et le joueur les a toujours.',
  recalls: ['save-game', 'sets', 'cast', 'other-bp', 'destroy', 'overlap', 'branch', 'rotation'],
  notions: ['SaveGame', 'Set', 'Ordre des BeginPlay'],
  remember:
    'Une sauvegarde se fait au moment où l’état change, et chaque acteur qui dépend d’elle la relit lui-même au BeginPlay : il ne peut pas compter sur un autre acteur qui l’aurait chargée avant lui.',
  cards: [
    {
      title: 'Cahier des charges',
      body:
        'Trois **BP_Fusible** posés, chacun avec son **Id** (F1, F2, F3) ; une **BP_Porte** fermée avec sa Zone. Graphes vides ; pas de SaveGame, pas de variable dans BP_Joueur.\n\n' +
        '1. Quand le joueur touche un fusible, il **l’a** (le joueur garde la liste de ses fusibles, sans doublon), le fusible **disparaît**, et la progression est **sauvée aussitôt**, dans le slot `Station`.\n' +
        '2. À une **nouvelle partie** (Stop, puis Play), les fusibles déjà pris **ne réapparaissent pas**, et le joueur les a toujours.\n' +
        '3. Le joueur arrive à la porte : avec les **trois** fusibles, elle s’ouvre (Yaw 90) et affiche `Courant rétabli` ; sinon elle affiche combien il en manque, par exemple `Il manque 1 fusible`.',
    },
    {
      title: 'Comment t’y prendre',
      body:
        'Une synthèse reprend l’Avancé et ce qui le précède, sans liste de nœuds. Pense à l’ordre des BeginPlay : au lancement, qui a déjà relu la sauvegarde, et qui ne peut pas compter dessus ?\n\n' +
        'Le test prend deux fusibles, passe à la porte, relance la partie, prend le troisième, puis revient à la porte. Conseillée, pas obligatoire : rien n’est bloqué si tu passes à l’Expert sans elle.',
    },
    {
      title: 'Pour aller plus loin',
      body:
        'Ici, les fusibles du joueur sont une variable de BP_Joueur, et les fusibles et la porte font un **Cast To BP_Joueur** pour l’atteindre. Avec le **BP_Inventaire** de « Le sac et le coffre », ce serait un Actor Component : le fusible demanderait « as-tu un inventaire ? » (Get Component by Class), la porte compterait ce qu’il contient, et un drone porteur pourrait ramasser les fusibles sans rien changer.\n\n' +
        'La sauvegarde, elle, ne change pas de place : celui qui charge relit ce qu’il faut au BeginPlay, et remplit l’inventaire au lieu de la variable.',
    },
  ],
  objectives: [
    'Un fusible touché disparaît, le joueur l’a, et c’est sauvé aussitôt (slot « Station »).',
    'Sans les trois : la porte dit combien il en manque.',
    'Après Stop et Play : les fusibles pris ne reviennent pas, le joueur les a encore.',
    'Avec les trois : la porte s’ouvre, « Courant rétabli ».',
  ],
  hints: [
    'Que faut-il sauver, et à quel moment ? Au lancement d’une nouvelle partie, un fusible peut-il compter sur le joueur pour avoir déjà relu la sauvegarde ?',
    'SaveGame (Blueprint Class › SaveGame) avec un Set of Name ; Cast To BP_Joueur, Add (Set), Destroy Actor, Create Save Game Object, Save Game to Slot, Load Game from Slot, Cast To, Contains (Set), Length (Set), Branch, Set Relative Rotation, Append, Print String.',
    'Solution : BP_Sauvegarde (SaveGame) avec Fusibles (Set of Name) ; BP_Joueur : variable Fusibles (Set of Name) ; BeginPlay → Load Game from Slot (Station) → Cast To BP_Sauvegarde → Set Fusibles = As › Fusibles.\n' +
      'BP_Fusible : BeginPlay → Load Game from Slot → Cast → Branch (Contains (As › Fusibles, Id)) → True : Destroy Actor. ActorBeginOverlap → Cast To BP_Joueur → Add (As › Fusibles, Id) → Create Save Game Object → Set Fusibles (sur l’objet) = As › Fusibles → Save Game to Slot (Station) → Destroy Actor.\n' +
      'BP_Porte : ActorBeginOverlap → Cast To BP_Joueur → Branch (Length >= 3) : True → Set Relative Rotation (Porte, Yaw 90) → Print « Courant rétabli » ; False → Print (« Il manque » + (3 − Length) + « fusible(s) »).',
  ],
  challenge: 'Ajoute un quatrième fusible dans le niveau : que faut-il changer pour que la porte en demande quatre, sans réécrire le graphe ?',
  setup: project,
  scenario: [
    { wait: 0.2 },
    ...goTo(...FUSES[0]),
    ...goTo(...AWAY),
    ...goTo(...FUSES[1]),
    ...goTo(...AWAY),
    { checkpoint: 'deux' },
    ...goTo(...DOOR, 0.3),
    { checkpoint: 'porte-1' },
    { restart: true },
    { wait: 0.3 },
    { checkpoint: 'reprise' },
    ...goTo(...FUSES[2]),
    ...goTo(...AWAY),
    ...goTo(...DOOR, 0.3),
  ],
  checks: [
    {
      id: 'taken',
      label: 'Un fusible touché disparaît',
      at: 'deux',
      test: (cx) => (fuseLeft(cx, 'BP_Fusible') || fuseLeft(cx, 'BP_Fusible2') ? 'Le joueur est passé sur F1 et F2, et au moins l’un des deux est toujours là.' : fuseLeft(cx, 'BP_Fusible3') ? true : 'F3 a disparu alors que le joueur ne l’a pas touché.'),
    },
    {
      id: 'saved',
      label: 'La progression est sauvée aussitôt, dans le slot « Station »',
      at: 'deux',
      test: (cx) => (cx.sim.slots[`${SLOT}|0`] ? true : 'Après deux fusibles, aucun slot « Station » : sauve au moment où le joueur prend un fusible.'),
    },
    {
      id: 'missing',
      label: 'Avec deux fusibles, la porte dit qu’il en manque un, et reste fermée',
      at: 'porte-1',
      test: (cx) => {
        if (doorOpen(cx)) return 'La porte s’est ouverte avec deux fusibles seulement.';
        return cx.prints().some((t) => normText(t).includes('manque 1')) ? true : 'Avec deux fusibles, la porte doit afficher qu’il en manque 1 (« Il manque 1 fusible »).';
      },
    },
    {
      id: 'resume',
      label: 'Nouvelle partie : F1 et F2 ne reviennent pas, F3 est là',
      at: 'reprise',
      test: (cx) => {
        const back = ['BP_Fusible', 'BP_Fusible2'].filter((l) => fuseLeft(cx, l));
        if (back.length) return `Après Stop et Play, ${back.join(' et ')} ${back.length > 1 ? 'sont revenus' : 'est revenu'} : chaque fusible doit relire la sauvegarde à son BeginPlay.`;
        return fuseLeft(cx, 'BP_Fusible3') ? true : 'Après Stop et Play, F3 a disparu alors qu’il n’a jamais été pris.';
      },
    },
    {
      id: 'open',
      label: 'Avec les trois : la porte s’ouvre, « Courant rétabli »',
      test: (cx) => {
        if (!doorOpen(cx)) return 'Le joueur a les trois fusibles (deux de la partie d’avant, un de celle-ci), et la porte reste fermée : le joueur a-t-il relu les siens au lancement ?';
        return countPrints(cx, 'Courant rétabli') ? true : 'La porte s’est ouverte, mais aucun message « Courant rétabli ».';
      },
    },
    notion(usesNode('save', 'BP_Fusible', ['save.toSlot'], 'Le fusible sauve au moment où il est pris', 'Sauve la progression au moment où le joueur prend un fusible.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const made = addClass(p, 'BP_Sauvegarde', 'SaveGame');
    if (!made.ok) throw new Error(made.reason);
    const save = new ClassBuilder(made.value, p);
    const savedSet = save.variable('Fusibles', T.set(T.name), []);
    const player = edit(p, 'BP_Joueur');
    const mine = player.variable('Fusibles', T.set(T.name), []);
    const loadInto = (b: ClassBuilder, at: [number, number]) => {
      const begin = b.node('event.beginPlay', {}, {}, at);
      const load = b.node('save.fromSlot', {}, { slot: SLOT }, [at[0] + 280, at[1]]);
      const cast = b.node('cast.to', { class: made.value.id }, {}, [at[0] + 580, at[1]]);
      const read = b.node('var.getExternal', { owner: made.value.id, variable: savedSet }, {}, [at[0] + 780, at[1] + 220]);
      b.link(begin, 'then', load, 'exec').link(load, 'then', cast, 'exec').link(load, 'result', cast, 'object').link(cast, 'as', read, 'target');
      return { cast, read };
    };

    // The player reads his fuses back.
    const p1 = loadInto(player, [64, 96]);
    const keep = player.node('var.set', { variable: mine }, {}, [1000, 96]);
    player.link(p1.cast, 'then', keep, 'exec').link(p1.read, 'value', keep, 'value');

    // Each fuse reads the save itself: it cannot count on the player's BeginPlay having run first.
    const fuse = edit(p, 'BP_Fusible');
    const id = varId(fuse, 'Id');
    const f1 = loadInto(fuse, [64, 96]);
    const has = fuse.node('set.contains', {}, {}, [1000, 320]);
    const br = fuse.node('flow.branch', {}, {}, [1000, 96]);
    fuse.link(f1.cast, 'then', br, 'exec').link(f1.read, 'value', has, 'set').link(fuse.node('var.get', { variable: id }, {}, [800, 420]), 'value', has, 'item').link(has, 'result', br, 'condition');
    fuse.link(br, 'true', fuse.node('actor.destroy', {}, {}, [1300, 96]), 'exec');

    const touch = fuse.node('event.actorBeginOverlap', {}, {}, [64, 700]);
    const castP = fuse.node('cast.to', { class: player.cls.id }, {}, [340, 700]);
    const add = fuse.node('set.add', {}, {}, [660, 700]);
    const create = fuse.node('save.create', {}, { saveClass: made.value.id }, [980, 700]);
    const fill = fuse.node('var.setExternal', { owner: made.value.id, variable: savedSet }, {}, [1300, 700]);
    const write = fuse.node('save.toSlot', {}, { slot: SLOT }, [1620, 700]);
    const gone = fuse.node('actor.destroy', {}, {}, [1940, 700]);
    const theirs = (at: [number, number]) => {
      const g = fuse.node('var.getExternal', { owner: player.cls.id, variable: mine }, {}, at);
      fuse.link(castP, 'as', g, 'target');
      return g;
    };
    fuse.link(touch, 'then', castP, 'exec').link(touch, 'other', castP, 'object').link(castP, 'then', add, 'exec');
    fuse.link(theirs([520, 900]), 'value', add, 'set').link(fuse.node('var.get', { variable: id }, {}, [520, 1000]), 'value', add, 'item');
    fuse.link(add, 'then', create, 'exec').link(create, 'then', fill, 'exec').link(create, 'result', fill, 'target').link(theirs([1150, 920]), 'value', fill, 'value');
    fuse.link(fill, 'then', write, 'exec').link(create, 'result', write, 'object').link(write, 'then', gone, 'exec');

    // The door counts.
    const door = edit(p, 'BP_Porte');
    const arrive = door.node('event.actorBeginOverlap', {}, {}, [64, 96]);
    const castD = door.node('cast.to', { class: player.cls.id }, {}, [340, 96]);
    const count = door.node('set.length', {}, {}, [520, 320]);
    const enough = door.node('math.greaterEqualInt', {}, { b: 3 }, [720, 320]);
    const choose = door.node('flow.branch', {}, {}, [700, 96]);
    const open = door.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [1000, 40]);
    const ok = door.node('debug.printString', {}, { text: 'Courant rétabli' }, [1300, 40]);
    const left = door.node('math.subtractInt', {}, { a: 3 }, [900, 500]);
    const t1 = door.node('string.append', {}, { in0: 'Il manque ' }, [1100, 500]);
    const t2 = door.node('string.append', {}, { in1: ' fusible(s)' }, [1300, 500]);
    const ko = door.node('debug.printString', {}, {}, [1300, 300]);
    const gd = door.node('var.getExternal', { owner: player.cls.id, variable: mine }, {}, [360, 320]);
    door.link(arrive, 'then', castD, 'exec').link(arrive, 'other', castD, 'object').link(castD, 'then', choose, 'exec').link(castD, 'as', gd, 'target');
    door.link(gd, 'value', count, 'set').link(count, 'result', enough, 'a').link(enough, 'result', choose, 'condition');
    door.link(choose, 'true', open, 'exec').target('Porte', open).link(open, 'then', ok, 'exec');
    door.link(count, 'result', left, 'b').link(left, 'result', t1, 'in1').link(t1, 'result', t2, 'in0').link(t2, 'result', ko, 'text').link(choose, 'false', ko, 'exec');
  },
};
