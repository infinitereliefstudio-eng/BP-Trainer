/**
 * V6, Avancé: "Le rayon et les miroirs" (E34). A ray that bounces: a Line
 * Trace per segment in a bounded loop, Get Reflection Vector for the new
 * direction, and a next segment that starts just off the surface. What a
 * surface does with the ray is asked through an interface, never a Cast.
 */
import { implementInterface } from '../../operations/classOps';
import { addInterfaceParam, syncInterfaceGraphs } from '../../operations/interfaceOps';
import { addInterface, addInterfaceFunction } from '../../operations/projectOps';
import { T } from '../../types/pins';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { noRuntimeErrors, notion, usesNode } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { editable, getVar, nodesOf, override, setVar, tap } from './kit';

const MAX_BOUNCES = 4;

function mirrorsProject() {
  const pb = new ProjectBuilder('Le rayon et les miroirs');
  const p = pb.project;
  const r = addInterface(p, 'BPI_Optique');
  if (!r.ok) throw new Error(r.reason);
  addInterfaceFunction(p, r.value.id, 'Toucher');
  const iface = r.value.id;
  const fn = r.value.functions[0].id;
  const out = addInterfaceParam(p, iface, fn, 'outputs', T.bool)!;
  out.name = 'Reflechit';
  /** The class answers Toucher; returns the builder inside its implementation and its Return Node. */
  const answers = (b: ClassBuilder, reflects: boolean) => {
    implementInterface(b.cls, iface);
    syncInterfaceGraphs(p, b.cls);
    const g = b.cls.graphs.find((x) => x.iface)!;
    const entry = Object.values(g.nodes).find((n) => n.def === 'fn.entry')!.id;
    const ret = Object.values(g.nodes).find((n) => n.def === 'fn.return')!.id;
    g.nodes[ret].defaults[out.id] = reflects;
    return { f: b.inGraph(g.id), g, entry, ret };
  };

  const mirror = pb.blueprint('BP_Miroir');
  mirror.component('StaticMesh', 'Glace', { sizeX: 16, sizeY: 200, color: '#7dd3fc' });
  mirror.cls.autoReceiveInput = true;
  const turns = editable(mirror, 'Pivotant', T.bool, false);
  const angle = editable(mirror, 'AutreAngle', T.float, 0);
  answers(mirror, true);
  const key = mirror.node('event.inputKey', { key: 'F' }, {}, [64, 96]);
  const can = mirror.node('flow.branch', {}, {}, [340, 96]);
  const rot = mirror.node('actor.setRotation', {}, {}, [640, 96]);
  const make = mirror.node('math.makeRotator', {}, {}, [460, 320]);
  mirror.link(key, 'pressed', can, 'exec').link(getVar(mirror, 'Pivotant', [160, 280]), 'value', can, 'condition').link(can, 'true', rot, 'exec');
  mirror.link(getVar(mirror, 'AutreAngle', [280, 360]), 'value', make, 'yaw').link(make, 'result', rot, 'rotation');

  // The receiver: lit while the ray reaches it. It checks a little less often than the emitter fires.
  const target = pb.blueprint('BP_Recepteur');
  target.component('StaticMesh', 'Capteur', { shape: 'cylinder', sizeX: 90, sizeY: 90, color: '#16a34a' });
  target.component('PointLight', 'Voyant', { visible: false, radius: 240, color: '#4ade80' });
  target.variable('Recu', T.bool, false);
  const hit = answers(target, false);
  const got = setVar(hit.f, 'Recu', [300, 0], true);
  for (const l of Object.values(hit.g.links)) if (l.from.node === hit.entry) delete hit.g.links[l.id];
  hit.f.link(hit.entry, 'then', got, 'exec').link(got, 'then', hit.ret, 'exec');
  const begin = target.node('event.beginPlay', {}, {}, [64, 96]);
  const timer = target.node('time.setTimerByEvent', {}, { time: 0.15, looping: true }, [360, 96]);
  const look = target.node('event.custom', { name: 'Verifier' }, {}, [64, 400]);
  const show = target.node('component.setVisibility', {}, {}, [400, 400]);
  const clear = setVar(target, 'Recu', [720, 400], false);
  target.link(begin, 'then', timer, 'exec').link(look, 'delegate', timer, 'event');
  target.link(look, 'then', show, 'exec').link(getVar(target, 'Recu', [200, 580]), 'value', show, 'visible').target('Voyant', show).link(show, 'then', clear, 'exec');

  const wall = pb.blueprint('BP_Mur');
  wall.component('StaticMesh', 'Mur', { sizeX: 30, sizeY: 260, color: '#4b5563' });

  // The emitter: ten shots a second. Each shot starts from the emitter, facing forward; the bounces are to write.
  const laser = pb.blueprint('BP_Emetteur');
  laser.component('StaticMesh', 'Laser', { sizeX: 60, sizeY: 40, color: '#dc2626' });
  laser.variable('Depart', T.vector);
  laser.variable('Direction', T.vector);
  laser.variable('Portee', T.float, 1500);
  const lb = laser.node('event.beginPlay', {}, {}, [64, 96]);
  const lt = laser.node('time.setTimerByEvent', {}, { time: 0.1, looping: true }, [360, 96]);
  const shot = laser.node('event.custom', { name: 'Tirer' }, {}, [64, 400]);
  const from = setVar(laser, 'Depart', [360, 400]);
  const dir = setVar(laser, 'Direction', [680, 400]);
  laser.link(lb, 'then', lt, 'exec').link(shot, 'delegate', lt, 'event').link(shot, 'then', from, 'exec').link(from, 'then', dir, 'exec');
  laser.link(laser.node('actor.getLocation', {}, {}, [160, 600]), 'result', from, 'value').link(laser.node('actor.getForward', {}, {}, [480, 600]), 'result', dir, 'value');

  // The ray goes right, down, then right again; the player stands in the middle, off its path.
  pb.place(laser, 0, -150);
  pb.place(mirror, 500, -150, -45);
  const second = pb.place(mirror, 500, 250, -45);
  override(pb, second, turns, true);
  override(pb, second, angle, -135);
  pb.place(target, 1000, 250);
  pb.place(wall, -300, 250);
  pb.playerStart(250, -30);
  return pb.project;
}

const lit = (cx: CheckContext) => !!cx.component('BP_Recepteur', 'Voyant')?.props.visible;
const looped = (cx: CheckContext) => cx.sim.log.some((l) => l.level === 'error' && /infinite|boucle/i.test(l.text));

export const lessonMirrors: Lesson = {
  id: 'l-miroirs',
  module: 'Interaction',
  level: 'avance',
  number: 0,
  title: 'Le rayon et les miroirs',
  situation:
    'Un émetteur tire un rayon dix fois par seconde. Deux miroirs doivent le renvoyer jusqu’au récepteur, qui s’allume tant que le rayon l’atteint. F fait pivoter le second miroir : le rayon part ailleurs et le récepteur s’éteint. Un mur, lui, arrête le rayon. Le tir sait d’où il part et dans quelle direction ; il reste à le faire avancer et rebondir.',
  notions: ['Line Trace By Channel', 'Out Hit', 'Get Reflection Vector', 'For Loop with Break', 'Interface Message', 'Multiply (Vector * Float)', 'Add (Vector)'],
  remember:
    'Un rayon qui rebondit, c’est une boucle bornée de Line Trace : chaque segment part d’un point dans une direction, et le suivant repart du point touché, dans la direction donnée par Get Reflection Vector. Fais repartir le segment suivant légèrement en avant de la surface, sinon il retouche aussitôt le miroir qu’il vient de quitter.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '**BP_Emetteur** : un timer appelle `Tirer` toutes les 0,1 s. `Tirer` range la position de l’émetteur dans `Depart` et sa direction avant dans `Direction` (deux Vector). La suite est à écrire. `Portee` vaut 1500 cm.\n\n' +
        'Les surfaces répondent à une interface, **BPI_Optique**, par sa fonction **Toucher**, qui renvoie un Boolean `Reflechit` :\n\n' +
        '- **BP_Miroir** renvoie vrai.\n' +
        '- **BP_Recepteur** note qu’il a été touché (il s’allume) et renvoie faux.\n' +
        '- **BP_Mur** n’implémente pas l’interface : un message vers lui renvoie la valeur par défaut, faux, sans erreur.\n\n' +
        'L’émetteur n’a donc jamais à savoir **ce** qu’il a touché : il demande « tu réfléchis ? » et suit la réponse.',
    },
    {
      title: 'Un segment',
      body:
        'Un **Line Trace By Channel** va de **Start** à **End**, deux positions :\n\n' +
        '- Start = `Depart`.\n' +
        '- End = `Depart` + `Direction` × `Portee` (**Multiply (Vector * Float)**, puis **Add (Vector)**).\n\n' +
        'Il sort **Return Value** (a-t-il touché ?), et dans Out Hit : **Hit Actor**, **Location** (le point touché) et **Normal** (la direction perpendiculaire à la surface, qui pointe vers l’extérieur).\n\n' +
        'Règle **Draw Debug Type** sur For One Frame pour voir chaque segment en Play : rouge jusqu’au point touché.\n\n' +
        'Si rien n’est touché, le rayon se perd : on arrête. Sinon, envoie **Toucher (Message)** à Hit Actor et lis `Reflechit`.',
    },
    {
      title: 'Le rebond',
      body:
        '**Get Reflection Vector** calcule la direction d’un rebond. Deux entrées :\n\n' +
        '- **Direction** : celle dans laquelle le rayon arrivait (`Direction`).\n' +
        '- **Surface Normal** : la normale de la surface, c’est-à-dire Out Hit **Normal**.\n\n' +
        'Range son résultat dans `Direction` : c’est la direction du segment suivant.\n\n' +
        'Et son point de départ ? Le point touché… à un détail près. Un rayon qui part **exactement** de la surface du miroir la retouche aussitôt, à distance 0 : il ne quitte jamais le miroir. Fais-le partir **2 cm plus loin** dans la nouvelle direction :\n\n' +
        '`Depart` = Location + `Direction` × 2.\n\n' +
        'C’est un classique de UE ; l’autre parade est de mettre le miroir touché dans Actors to Ignore du tir suivant.',
    },
    {
      title: 'La boucle, et sa limite',
      body:
        'Deux miroirs face à face se renvoient un rayon sans fin. Un jeu ne peut pas calculer « sans fin » dans une image : il faut une **limite**.\n\n' +
        '**For Loop with Break**, de 0 à 4 : cinq segments au plus, donc quatre rebonds. Chaque tour tire un segment. Le rayon s’arrête plus tôt en envoyant le fil blanc dans **Break** :\n\n' +
        '- quand le Line Trace ne touche rien ;\n' +
        '- quand la surface répond `Reflechit` = faux (récepteur, mur).\n\n' +
        'Sinon, le tour se termine après les deux Set (`Direction`, puis `Depart`), et la boucle tire le segment suivant avec ces nouvelles valeurs.\n\n' +
        'Un While Loop « tant que ça réfléchit » marcherait dans ce niveau, et gèlerait le jeu le jour où deux miroirs se font face.',
    },
  ],
  objectives: [
    'Après les deux Set de Tirer : un For Loop with Break de 0 à 4.',
    'À chaque tour : Line Trace de Depart à Depart + Direction × Portee. Rien touché : Break.',
    'Sinon : Toucher (Message) vers Hit Actor. Reflechit faux : Break. Vrai : Direction = Get Reflection Vector (Direction, Normal), puis Depart = Location + Direction × 2.',
    'Touche Vérifier : le récepteur s’allume ; après F, il s’éteint.',
  ],
  hints: [
    'Construis un seul segment d’abord (sans boucle) et regarde-le en Play avec Draw Debug Type : il doit aller de l’émetteur au premier miroir.',
    'Nœuds : For Loop with Break, Line Trace By Channel, Get Depart, Get Direction, Get Portee, Multiply (Vector * Float), Add (Vector), Branch, Toucher (Message), Branch, Get Reflection Vector, Set Direction, Set Depart.',
    'Solution : Set Direction → For Loop with Break (0 à 4) → Loop Body : Line Trace (Start = Depart, End = Depart + Direction × Portee) → Branch (Return Value) → False : Break. True : Toucher (Message, Target = Hit Actor) → Branch (Reflechit) → False : Break. True : Set Direction = Get Reflection Vector (Direction, Normal) → Set Depart = Location + Direction × 2.',
  ],
  challenge: 'Remplace le décalage de 2 cm par Actors to Ignore : garde le dernier miroir touché dans un tableau d’Actor (Clear, puis Add) et relie-le au Line Trace.',
  setup: mirrorsProject,
  scenario: [{ wait: 0.7 }, { checkpoint: 'allume' }, ...tap('F'), { wait: 0.6 }],
  checks: [
    {
      id: 'reach',
      label: 'Par les deux miroirs, le rayon atteint le récepteur',
      at: 'allume',
      test: (cx) => {
        if (looped(cx)) return 'Le jeu s’est arrêté sur « Infinite loop detected » : le rayon doit avancer dans une boucle bornée (For Loop with Break de 0 à 4).';
        if (lit(cx)) return true;
        return 'Le récepteur est resté éteint. Vérifie dans l’ordre, avec Draw Debug Type : le premier segment touche-t-il le miroir ? Le second part-il vers le bas (Direction = Get Reflection Vector avec Out Hit Normal) et de 2 cm devant la surface (sinon il retouche le même miroir) ? La surface touchée reçoit-elle Toucher (Message) ?';
      },
    },
    {
      id: 'away',
      label: 'Le second miroir pivoté, le rayon part ailleurs : le récepteur s’éteint',
      test: (cx) => (lit(cx) ? 'Le récepteur est encore allumé alors que le second miroir a tourné : chaque tir doit repartir de l’émetteur et recalculer tout le trajet.' : true),
    },
    notion(usesNode('reflect', 'BP_Emetteur', ['math.reflectionVector'], 'Le rebond est calculé par Get Reflection Vector', 'Calcule la direction du rebond avec Get Reflection Vector (Direction, Out Hit Normal).')),
    notion(usesNode('bounded', 'BP_Emetteur', ['flow.forLoopWithBreak', 'flow.forLoop'], 'Le nombre de rebonds est borné', 'Borne le trajet avec un For Loop with Break : un While Loop gèlerait le jeu entre deux miroirs face à face.')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Emetteur');
    const g = (name: string, at: [number, number]) => getVar(b, name, at);
    const iface = p.interfaces[0];
    const out = iface.functions[0].outputs![0].id;
    const setDir = nodesOf(b.graph, 'var.set').sort((x, y) => y.x - x.x)[0].id;
    const loop = b.node('flow.forLoopWithBreak', {}, { first: 0, last: MAX_BOUNCES }, [1000, 400]);
    const trace = b.node('trace.lineByChannel', {}, {}, [1700, 400]);
    const reach = b.node('math.multiplyVectorFloat', {}, {}, [1340, 740]);
    const end = b.node('math.addVector', {}, {}, [1500, 680]);
    const touched = b.node('flow.branch', {}, {}, [2100, 400]);
    const ask = b.node('iface.message', { interface: iface.id, fn: iface.functions[0].id }, {}, [2400, 400]);
    const bounces = b.node('flow.branch', {}, {}, [2740, 400]);
    const mirror = b.node('math.reflectionVector', {}, {}, [2860, 700]);
    const turn = setVar(b, 'Direction', [3040, 400]);
    const step = b.node('math.multiplyVectorFloat', {}, { b: 2 }, [3220, 700]);
    const off = b.node('math.addVector', {}, {}, [3380, 640]);
    const move = setVar(b, 'Depart', [3400, 400]);
    b.link(setDir, 'then', loop, 'exec').link(loop, 'body', trace, 'exec');
    b.link(g('Depart', [1180, 620]), 'value', trace, 'start').link(g('Direction', [1180, 750]), 'value', reach, 'a').link(g('Portee', [1180, 820]), 'value', reach, 'b');
    b.link(g('Depart', [1340, 660]), 'value', end, 'a').link(reach, 'result', end, 'b').link(end, 'result', trace, 'end');
    b.link(trace, 'then', touched, 'exec').link(trace, 'result', touched, 'condition').link(touched, 'false', loop, 'break');
    b.link(touched, 'true', ask, 'exec').link(trace, 'hitActor', ask, 'target').link(ask, 'then', bounces, 'exec').link(ask, out, bounces, 'condition').link(bounces, 'false', loop, 'break');
    b.link(g('Direction', [2680, 710]), 'value', mirror, 'direction').link(trace, 'normal', mirror, 'normal').link(bounces, 'true', turn, 'exec').link(mirror, 'result', turn, 'value');
    b.link(turn, 'out', step, 'a').link(trace, 'location', off, 'a').link(step, 'result', off, 'b').link(turn, 'then', move, 'exec').link(off, 'result', move, 'value');
  },
};
