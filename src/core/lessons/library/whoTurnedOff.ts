/**
 * Lot 3a of the path plan: « Qui a éteint la lumière ? », a Débogue solved
 * with Find References / Find in all Blueprints (V7.8). Eight Blueprints,
 * three of which talk to the lamp; one of them turns it off two seconds
 * after the start. Opening them one by one is slow: the search finds the
 * callers of Eteindre at once.
 */
import type { Project } from '../../model/project';
import { T } from '../../types/pins';
import { edit, ProjectBuilder, type ClassBuilder } from '../builder';
import { noRuntimeErrors, notion, countPrints } from '../checks';
import type { CheckContext, Lesson } from '../types';
import { DEBUG_METHOD, editable, goTo, override, ref, say, varId, wipe } from './kit';
import { playerBlueprint } from './props';

const LAMP: [number, number] = [0, -320];
const SWITCH: [number, number] = [-700, 320];

/** Calls the lamp's Custom Event `event` through the reference variable `Lampe`. */
function callLamp(b: ClassBuilder, lamp: ClassBuilder, event: string, after: string, pin: string, at: [number, number]): string {
  const get = b.node('var.get', { variable: varId(b, 'Lampe') }, {}, [at[0] - 120, at[1] + 200]);
  const call = b.node('call.custom', { owner: lamp.cls.id, event }, {}, at);
  b.link(after, pin, call, 'exec').link(get, 'value', call, 'target');
  return call;
}

/** BP_Ventilation: after 2 s it starts. `fixed` leaves out the leftover call that turns the lamp off. */
function ventilationGraph(b: ClassBuilder, lamp: ClassBuilder, fixed: boolean): void {
  const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
  const delay = b.node('time.delay', {}, { duration: 2 }, [340, 96]);
  const on = b.node('var.set', { variable: varId(b, 'bTourne') }, { value: true }, [620, 96]);
  const text = say(b, [920, 96], 'Ventilation en marche');
  b.link(begin, 'then', delay, 'exec').link(delay, 'completed', on, 'exec').link(on, 'then', text, 'exec');
  if (!fixed) {
    b.node('util.comment', { text: 'Économie d’énergie (test)', w: 340, h: 300, color: '#6b7280' }, {}, [1180, 40]);
    callLamp(b, lamp, 'Eteindre', text, 'then', [1220, 96]);
  }
}

function project(): Project {
  const pb = new ProjectBuilder('Qui a éteint la lumière ?');
  playerBlueprint(pb);

  const lamp = pb.blueprint('BP_Lampe');
  lamp.component('StaticMesh', 'Pied', { shape: 'cylinder', sizeX: 40, sizeY: 40, color: '#6b7280' });
  lamp.component('PointLight', 'Lumiere', { visible: true, radius: 320 });
  for (const [name, on, y] of [
    ['Eteindre', false, 96],
    ['Allumer', true, 420],
  ] as const) {
    const ev = lamp.node('event.custom', { name }, {}, [64, y]);
    const vis = lamp.node('component.setVisibility', {}, { visible: on }, [400, y]);
    lamp.link(ev, 'then', vis, 'exec').target('Lumiere', vis);
  }
  const lampId = pb.place(lamp, ...LAMP);

  // Three Blueprints hold a reference to the lamp.
  const withLamp = (name: string) => {
    const b = pb.blueprint(name);
    editable(b, 'Lampe', T.object('BP_Lampe'));
    return b;
  };

  const sw = withLamp('BP_Interrupteur');
  sw.component('StaticMesh', 'Plaque', { sizeX: 80, sizeY: 80, color: '#334155', blocks: false });
  sw.component('BoxCollision', 'Zone', { sizeX: 160, sizeY: 160 });
  const out = sw.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  callLamp(sw, lamp, 'Eteindre', out, 'then', [440, 96]);

  const sensor = withLamp('BP_Detecteur');
  sensor.component('StaticMesh', 'Capteur', { shape: 'cylinder', sizeX: 30, sizeY: 30, color: '#a855f7', blocks: false });
  sensor.component('BoxCollision', 'Zone', { sizeX: 200, sizeY: 200 });
  const inside = sensor.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  callLamp(sensor, lamp, 'Allumer', inside, 'then', [440, 96]);

  const vent = withLamp('BP_Ventilation');
  vent.component('StaticMesh', 'Helice', { shape: 'cylinder', sizeX: 80, sizeY: 80, color: '#0ea5e9' });
  vent.variable('bTourne', T.bool, false);
  ventilationGraph(vent, lamp, false);

  // And others that do not: the search shows they can be left aside.
  const gen = pb.blueprint('BP_Generateur');
  gen.component('StaticMesh', 'Moteur', { sizeX: 120, sizeY: 80, color: '#3f6212' });
  const lumiere = gen.variable('Lumiere', T.bool, true);
  const g1 = gen.node('event.beginPlay', {}, {}, [64, 96]);
  const g2 = gen.node('var.set', { variable: lumiere }, { value: true }, [340, 96]);
  gen.link(g1, 'then', g2, 'exec').link(g2, 'then', say(gen, [660, 96], 'Générateur prêt'), 'exec');

  const door = pb.blueprint('BP_Porte');
  door.component('StaticMesh', 'Porte', { sizeX: 20, sizeY: 160, color: '#a0703c' });
  door.component('BoxCollision', 'Zone', { sizeX: 260, sizeY: 260 });
  const d1 = door.node('event.actorBeginOverlap', {}, {}, [64, 96]);
  const d2 = door.node('component.setRelativeRotation', {}, { rotation: { x: 0, y: 0, z: 90 } }, [400, 96]);
  door.link(d1, 'then', d2, 'exec').target('Porte', d2);

  const desk = pb.blueprint('BP_Console');
  desk.component('StaticMesh', 'Pupitre', { sizeX: 100, sizeY: 50, color: '#1f2937' });
  desk.component('TextRender', 'Ecran', { y: -50, text: 'OK' });
  const c1 = desk.node('event.beginPlay', {}, {}, [64, 96]);
  const c2 = desk.node('component.setText', {}, { value: 'Salle des machines' }, [400, 96]);
  desk.link(c1, 'then', c2, 'exec').target('Ecran', c2);

  const swId = pb.place(sw, ...SWITCH);
  const sensorId = pb.place(sensor, -250, -320);
  const ventId = pb.place(vent, 450, 300);
  for (const [b, id] of [
    [sw, swId],
    [sensor, sensorId],
    [vent, ventId],
  ] as const)
    override(pb, id, varId(b, 'Lampe'), ref(lampId));
  pb.place(gen, 500, -300);
  pb.place(door, 800, 0);
  pb.place(desk, -600, -50);
  pb.playerStart(0, 150);
  return pb.project;
}

const lampOn = (cx: CheckContext) => cx.component('BP_Lampe', 'Lumiere')?.props.visible === true;

export const debug21: Lesson = {
  id: 'd21-qui-eteint',
  kind: 'debug',
  code: 'D21',
  module: 'Communication',
  level: 'confirme',
  number: 0,
  title: 'Qui a éteint la lumière ?',
  situation:
    'La salle des machines compte huit Blueprints. Au lancement la lampe est allumée, mais deux secondes plus tard elle s’éteint toute seule, alors que le joueur n’a rien touché. Trouve qui l’éteint, sans ouvrir les Blueprints un par un.',
  notions: ['Find References', 'Find in all Blueprints', 'Custom Event d’un autre Blueprint'],
  remember:
    'Quand quelque chose change « tout seul », la question est « qui y touche ? » : Find References sur l’événement ou la variable concernée, puis All Blueprints, donne la liste des suspects en une fois.',
  cards: [
    DEBUG_METHOD,
    {
      title: 'Ce qui est nouveau : chercher avant d’ouvrir',
      body:
        '**BP_Lampe** a deux Custom Events : `Eteindre` et `Allumer`. Les autres Blueprints l’appellent à travers une variable `Lampe` (réglée sur chaque acteur posé).\n\n' +
        'Plutôt que d’ouvrir les huit Blueprints : dans BP_Lampe, **appui long sur Event Eteindre › Find References**. Le panneau **Find Results** s’ouvre en bas ; le bouton **All Blueprints** étend la recherche à tout le projet. Toucher un résultat ouvre le nœud.\n\n' +
        'La barre d’outils a aussi un bouton **Find** pour chercher un mot (un nom de variable, un texte tapé dans un nœud). Une recherche par mot trouve plus de choses que Find References : ici, « Lumiere » est aussi une variable de BP_Generateur, qui n’a rien à voir avec la lampe.',
    },
    {
      title: 'Ce qui doit continuer à marcher',
      body:
        '- **BP_Ventilation** démarre 2 s après le lancement (`bTourne` passe à true, message « Ventilation en marche »).\n' +
        '- **BP_Interrupteur**, près de la sortie, éteint la lampe quand le joueur passe dessus.\n' +
        '- **BP_Detecteur** la rallume quand le joueur s’approche d’elle.\n\n' +
        'Corrige le moins possible : une seule chose est en trop.',
    },
  ],
  objectives: [
    'La lampe reste allumée après le lancement.',
    'La ventilation démarre toujours au bout de 2 s.',
    'L’interrupteur de la sortie éteint toujours la lampe.',
  ],
  hints: [
    'Qui appelle Eteindre ? Find References sur Event Eteindre dans BP_Lampe, puis All Blueprints : deux Blueprints l’appellent. L’un des deux le fait au bon moment.',
    'Find References (appui long sur Event Eteindre), All Blueprints, puis toucher le résultat dans BP_Ventilation.',
    'Solution : dans BP_Ventilation, supprime l’appel Eteindre (et son Get Lampe) qui suit le Print String « Ventilation en marche », reste d’un test d’économie d’énergie. Ne touche pas à BP_Interrupteur.',
  ],
  challenge: 'Fais la même enquête dans l’autre sens : Find References sur Event Allumer. Qui rallume la lampe, et quand ?',
  setup: project,
  scenario: [{ wait: 3 }, { checkpoint: 'apres' }, ...goTo(-250, -300, 0.3), { checkpoint: 'detecteur' }, ...goTo(...SWITCH, 0.3)],
  checks: [
    {
      id: 'stays-on',
      label: 'Trois secondes après le lancement, la lampe est toujours allumée',
      at: 'apres',
      test: (cx) => (lampOn(cx) ? true : 'La lampe s’est éteinte toute seule. Qui appelle Eteindre ? Find References sur Event Eteindre, dans BP_Lampe.'),
    },
    {
      id: 'vent',
      label: 'La ventilation démarre au bout de 2 s',
      at: 'apres',
      test: (cx) =>
        cx.variable('BP_Ventilation', 'bTourne') === true && countPrints(cx, 'Ventilation en marche') > 0
          ? true
          : 'La ventilation ne démarre plus (bTourne ou le message « Ventilation en marche ») : la correction a enlevé trop de choses.',
    },
    {
      id: 'sensor',
      label: 'Près de la lampe, le détecteur la garde allumée',
      at: 'detecteur',
      test: (cx) => (lampOn(cx) ? true : 'Près du détecteur, la lampe est éteinte.'),
    },
    {
      id: 'switch',
      label: 'L’interrupteur de la sortie éteint toujours la lampe',
      test: (cx) => (lampOn(cx) ? 'Le joueur est passé sur l’interrupteur, et la lampe est restée allumée : BP_Interrupteur faisait bien son travail.' : true),
    },
    notion({
      id: 'small',
      label: 'BP_Ventilation n’appelle plus Eteindre',
      test: (cx) => {
        const lamp = cx.project.classes.find((c) => c.name === 'BP_Lampe');
        return cx.nodes('BP_Ventilation').some((n) => n.def === 'call.custom' && n.config.owner === lamp?.id && n.config.event === 'Eteindre')
          ? 'BP_Ventilation appelle encore Eteindre : la lampe tient peut-être par un autre moyen, mais l’appel de trop est toujours là.'
          : true;
      },
    }),
    noRuntimeErrors(),
  ],
  solve(p) {
    const vent = edit(p, 'BP_Ventilation');
    wipe(vent.graph);
    ventilationGraph(vent, edit(p, 'BP_Lampe'), true);
  },
};
