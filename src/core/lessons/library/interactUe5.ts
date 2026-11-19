/**
 * Lot 3a of the path plan: « Interagir comme dans UE5 » (Refactor R4). The
 * projects converted at lot 1 kept objects that listen to IA_Interagir
 * themselves (Auto Receive Input) and remember whether the player is near.
 * Here that pattern is rewritten the UE5 way: the player receives the
 * action and tells the object within reach, through an interface. A fourth
 * object, the chest, shows what it buys: it reacts without touching the
 * player. R3 (Avancé) later replaces the zone by aiming (Line Trace).
 */
import type { Project } from '../../model/project';
import { implementInterface, removeVariable } from '../../operations/classOps';
import { addInterface, addInterfaceFunction } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { noRuntimeErrors, notion, usesNode } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { ensurePlayerInput } from '../ue5Input';
import { goTo, tap, varId, wipe } from './kit';
import { playerBlueprint } from './props';

const OBJECTS = ['BP_Lampe', 'BP_Porte', 'BP_Generateur', 'BP_Coffre'];
const LAMP: [number, number] = [-450, -250];
const GEN: [number, number] = [450, -250];
const DOOR: [number, number] = [450, 300];
const CHEST: [number, number] = [-450, 300];

/** The UE4 habit: Auto Receive Input, bProche kept by overlaps, IA_Interagir → Branch(bProche) → `act`. */
function listensItself(b: ClassBuilder, action: string, act: (b: ClassBuilder, after: string) => void): void {
  b.cls.autoReceiveInput = true;
  const near = b.variable('bProche', T.bool, false);
  const enter = b.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const leave = b.node('event.actorEndOverlap', {}, {}, [64, 300]);
  b.link(enter, 'then', b.node('var.set', { variable: near }, { value: true }, [380, 96]), 'exec');
  b.link(leave, 'then', b.node('var.set', { variable: near }, { value: false }, [380, 300]), 'exec');
  const ev = b.node('input.action', { action, consumeInput: false }, {}, [64, 560]);
  const branch = b.node('flow.branch', {}, {}, [380, 560]);
  b.link(ev, 'started', branch, 'exec').link(b.node('var.get', { variable: near }, {}, [220, 760]), 'value', branch, 'condition');
  act(b, branch);
}

const toggleLamp = (b: ClassBuilder, after: string, pin = 'true') => {
  const tog = b.node('component.toggleVisibility', {}, {}, [720, 560]);
  b.link(after, pin, tog, 'exec').target('Lumiere', tog);
};
const openDoor = (b: ClassBuilder, after: string, pin = 'true') => {
  const rot = b.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [720, 560]);
  b.link(after, pin, rot, 'exec').target('Porte', rot);
};
const startGen = (b: ClassBuilder, after: string, pin = 'true') => {
  const running = varId(b, 'bEnMarche');
  const set = b.node('var.set', { variable: running }, {}, [720, 560]);
  const not = b.node('logic.not', {}, {}, [560, 760]);
  b.link(after, pin, set, 'exec').link(b.node('var.get', { variable: running }, {}, [400, 760]), 'value', not, 'a').link(not, 'result', set, 'value');
};

function project(): Project {
  const pb = new ProjectBuilder('Interagir comme dans UE5');
  playerBlueprint(pb);
  const p = pb.project;
  const action = ensurePlayerInput(p, ['E'], { E: 'IA_Interagir' }).get('E')!;
  const zone = (b: ClassBuilder) => b.component('BoxCollision', 'Zone', { sizeX: 220, sizeY: 220 });

  const lamp = pb.blueprint('BP_Lampe');
  lamp.component('StaticMesh', 'Pied', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#6b7280' });
  lamp.component('PointLight', 'Lumiere', { visible: false, radius: 260 });
  zone(lamp);
  listensItself(lamp, action, toggleLamp);

  const door = pb.blueprint('BP_Porte');
  door.component('StaticMesh', 'Porte', { shape: 'door', sizeX: 160, sizeY: 16, color: '#a0703c' });
  zone(door);
  listensItself(door, action, openDoor);

  const gen = pb.blueprint('BP_Generateur');
  gen.component('StaticMesh', 'Moteur', { sizeX: 120, sizeY: 80, color: '#3f6212' });
  gen.variable('bEnMarche', T.bool, false);
  zone(gen);
  listensItself(gen, action, startGen);

  const chest = pb.blueprint('BP_Coffre');
  chest.component('StaticMesh', 'Coffre', { sizeX: 100, sizeY: 60, color: '#7c4a1e' });
  chest.component('StaticMesh', 'Couvercle', { sizeX: 110, sizeY: 70, color: '#a16207', blocks: false });
  zone(chest);

  pb.place(lamp, ...LAMP);
  pb.place(gen, ...GEN);
  pb.place(door, ...DOOR);
  pb.place(chest, ...CHEST);
  pb.playerStart(0, 0);
  return p;
}

const lampOn = (cx: CheckContext) => cx.component('BP_Lampe', 'Lumiere')?.props.visible === true;
const genOn = (cx: CheckContext) => cx.variable('BP_Generateur', 'bEnMarche') === true;
const doorOpen = (cx: CheckContext) => Math.abs(Math.abs(cx.component('BP_Porte', 'Porte')?.props.yaw ?? 0) - 90) < 1;
const chestOpen = (cx: CheckContext) => cx.component('BP_Coffre', 'Couvercle')?.props.visible === false;

export const refactor4: Lesson = {
  id: 'r4-interagir-ue5',
  kind: 'refactor',
  code: 'R4',
  module: 'Interaction',
  level: 'confirme',
  number: 0,
  title: 'Interagir comme dans UE5',
  situation:
    'La lampe, la porte et le générateur écoutent chacun IA_Interagir et retiennent si le joueur est près d’eux. Ça marche, mais chaque nouvel objet recopie la même logique. Le coffre, lui, ne réagit pas encore. Réécris l’interaction comme dans un projet UE5 : le joueur reçoit l’action et prévient l’objet à portée.',
  recalls: ['loops'],
  notions: ['Blueprint Interface', 'Interface Message', 'Get Overlapping Actors', 'Auto Receive Input', 'Découplage'],
  remember:
    'Dans UE5, c’est le joueur (son pion ou son Player Controller) qui reçoit les actions. Il prévient l’objet concerné par un message d’interface ; les objets n’écoutent aucune touche et ne savent pas qui les active.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        'Le projet est réglé comme le template UE5 : **IMC_Joueur** relie E à **IA_Interagir**, BP_PlayerController l’ajoute au BeginPlay.\n\n' +
        '**BP_Lampe**, **BP_Porte** et **BP_Generateur** ont chacun :\n\n' +
        '- **Auto Receive Input** sur Player 0 (Class Settings) ;\n- une variable `bProche`, mise à true par ActorBeginOverlap et à false par ActorEndOverlap ;\n- **IA_Interagir** (Started, Consume Input décoché) → **Branch** (bProche) → leur action.\n\n' +
        '**BP_Coffre** (un Coffre, un Couvercle, une Zone) a un graphe vide. **BP_Joueur** aussi.',
    },
    {
      title: 'Ce qui cloche',
      body:
        '- **Trois copies** de la même logique (bProche, Branch) : un quatrième objet en demanderait une quatrième.\n' +
        '- **Tous les objets entendent la touche**, partout dans le niveau, et doivent vérifier eux-mêmes si ça les concerne. Il a fallu décocher Consume Input pour que chacun l’entende.\n' +
        '- Dans un vrai projet UE5, **Auto Receive Input** sur des objets du décor est un réflexe d’UE4 : ils ne reçoivent pas d’entrées, c’est le joueur qui en reçoit.\n\n' +
        'Ce qui est nouveau ici : tu connais déjà l’interface (« Interagir avec tout »). Cette fois il faut **défaire** une logique qui marche, sans rien casser.',
    },
    {
      title: 'Le cahier des charges',
      body:
        '- E près d’un objet l’actionne : la lampe bascule, la porte s’ouvre, le générateur démarre, **le coffre s’ouvre** (son Couvercle disparaît).\n- Seul l’objet à portée réagit ; E loin de tout ne fait rien.\n- **Plus aucun objet n’écoute IA_Interagir** : c’est BP_Joueur qui la reçoit.\n- Ce qui ne sert plus disparaît : `bProche`, ses overlaps, Auto Receive Input.\n\n' +
        'Le Line Trace (viser l’objet plutôt qu’être dans sa zone) viendra plus tard, dans « Le bon bouton ».',
    },
  ],
  objectives: [
    'E près de la lampe, de la porte, du générateur ou du coffre l’actionne ; loin de tout, rien.',
    'Plus aucun objet n’écoute IA_Interagir : BP_Joueur la reçoit et envoie un message d’interface.',
    'Les objets n’ont plus Auto Receive Input.',
  ],
  hints: [
    'Le joueur sait déjà qui est près de lui (Get Overlapping Actors). Les objets n’ont plus qu’à dire ce qu’ils font quand on les prévient : une interface avec une fonction Interagir.',
    'BPI_Interactif (Content Drawer › + Add › Blueprint Interface), Class Settings › Interfaces › Add, Event Interagir dans chaque objet, IA_Interagir, Get Overlapping Actors, For Each Loop, Interagir (Message) dans BP_Joueur.',
    'Solution : crée BPI_Interactif (fonction Interagir). Dans chaque objet : supprime IA_Interagir, le Branch, les overlaps et bProche, règle Auto Receive Input sur Disabled, implémente BPI_Interactif et branche l’action sur Event Interagir (le coffre : Set Visibility du Couvercle, décochée). BP_Joueur : IA_Interagir (Started) → Get Overlapping Actors → For Each Loop → Interagir (Message), Target = Array Element.',
  ],
  challenge: 'Ajoute un générateur de plus dans le niveau, à côté du premier : E les démarre-t-il tous les deux ? Que faudrait-il pour n’en actionner qu’un ?',
  setup: project,
  scenario: [
    { wait: 0.2 },
    ...tap('E'),
    { checkpoint: 'loin' },
    ...goTo(...LAMP),
    ...tap('E'),
    { checkpoint: 'lampe' },
    ...goTo(...GEN),
    ...tap('E'),
    { checkpoint: 'generateur' },
    ...goTo(...CHEST),
    ...tap('E'),
    { checkpoint: 'coffre' },
    ...goTo(...DOOR),
    ...tap('E'),
    { wait: 0.1 },
  ],
  checks: [
    {
      id: 'far',
      label: 'E loin de tout ne fait rien',
      at: 'loin',
      test: (cx) => (lampOn(cx) || genOn(cx) || doorOpen(cx) || chestOpen(cx) ? 'Un objet a réagi alors que le joueur n’était près d’aucun.' : true),
    },
    {
      id: 'lamp',
      label: 'E près de la lampe : elle s’allume, et rien d’autre',
      at: 'lampe',
      test: (cx) => (!lampOn(cx) ? 'La lampe ne s’est pas allumée.' : genOn(cx) || doorOpen(cx) || chestOpen(cx) ? 'Un autre objet a réagi en même temps que la lampe.' : true),
    },
    {
      id: 'gen',
      label: 'E près du générateur : il démarre',
      at: 'generateur',
      test: (cx) => (genOn(cx) ? true : 'bEnMarche du générateur vaut toujours false.'),
    },
    {
      id: 'chest',
      label: 'E près du coffre : il s’ouvre',
      at: 'coffre',
      test: (cx) => (chestOpen(cx) ? true : 'Le Couvercle du coffre est toujours là.'),
    },
    {
      id: 'door',
      label: 'E près de la porte : elle s’ouvre',
      test: (cx) => (doorOpen(cx) ? true : 'La porte n’a pas tourné de 90°.'),
    },
    {
      id: 'no-listener',
      label: 'Plus aucun objet n’écoute IA_Interagir',
      test: (cx) => {
        const left = OBJECTS.filter((c) => cx.nodes(c).some((n) => n.def === 'input.action' || n.def === 'event.inputKey'));
        return left.length ? `Écoute(nt) encore une entrée : ${left.join(', ')}. C’est BP_Joueur qui doit recevoir IA_Interagir.` : true;
      },
    },
    notion(usesNode('message', 'BP_Joueur', ['iface.message'], 'Le joueur prévient l’objet par un message d’interface', 'BP_Joueur doit envoyer Interagir (Message) à l’objet à portée.')),
    notion({
      id: 'auto-input',
      label: 'Les objets n’ont plus Auto Receive Input',
      test: (cx) => {
        const left = cx.project.classes.filter((c) => OBJECTS.includes(c.name) && c.autoReceiveInput).map((c) => c.name);
        return left.length ? `Auto Receive Input est encore réglé sur ${left.join(', ')} (Class Settings › Input) : il ne sert plus.` : true;
      },
    }),
    notion({
      id: 'no-near',
      label: 'Plus de variable bProche',
      test: (cx) => {
        const left = cx.project.classes.filter((c) => OBJECTS.includes(c.name) && c.variables.some((v) => v.name === 'bProche')).map((c) => c.name);
        return left.length ? `bProche est encore dans ${left.join(', ')} : le joueur sait qui est près de lui, les objets n’ont plus à le retenir.` : true;
      },
    }),
    noRuntimeErrors(),
  ],
  solve(p) {
    const r = addInterface(p, 'BPI_Interactif');
    if (!r.ok) throw new Error(r.reason);
    addInterfaceFunction(p, r.value.id, 'Interagir');
    const iface = r.value.id;
    const fn = r.value.functions[0].id;
    const action = p.inputActions.find((a) => a.name === 'IA_Interagir')!.id;

    const player = edit(p, 'BP_Joueur');
    const ev = player.node('input.action', { action }, {}, [64, 96]);
    const over = player.node('actor.getOverlappingActors', {}, {}, [340, 96]);
    const loop = player.node('flow.forEachLoop', {}, {}, [660, 96]);
    const msg = player.node('iface.message', { interface: iface, fn }, {}, [980, 96]);
    player.link(ev, 'started', over, 'exec').link(over, 'then', loop, 'exec').link(over, 'actors', loop, 'array');
    player.link(loop, 'body', msg, 'exec').link(loop, 'element', msg, 'target');

    const reacts = (name: string, act: (b: ClassBuilder, after: string, pin: string) => void) => {
      const b = edit(p, name);
      wipe(b.graph);
      const near = b.cls.variables.find((v) => v.name === 'bProche');
      if (near) removeVariable(b.cls, near.id);
      b.cls.autoReceiveInput = false;
      implementInterface(b.cls, iface);
      act(b, b.node('event.interface', { interface: iface, fn }, {}, [64, 560]), 'then');
    };
    reacts('BP_Lampe', toggleLamp);
    reacts('BP_Porte', openDoor);
    reacts('BP_Generateur', startGen);
    reacts('BP_Coffre', (b, after, pin) => {
      const hide = b.node('component.setVisibility', {}, { visible: false }, [400, 560]);
      b.link(after, pin, hide, 'exec').target('Couvercle', hide);
    });
  },
};
