/**
 * Lot 2b of the path plan: the time ladder reaches the timers in the
 * Intermédiaire. After Delay (P1, « La porte qui se referme ») and the Delay
 * in a loop (P2), « Le gyrophare » repeats an action with Set Timer by
 * Event, and stops it with its handle.
 */
import type { Project } from '../../model/project';
import { T } from '../../types/pins';
import { edit, ProjectBuilder } from '../builder';
import { noRuntimeErrors, notion, usesNode, visible } from '../checks';
import type { Lesson } from '../types';

function beaconProject(): Project {
  const pb = new ProjectBuilder('Le gyrophare');
  const b = pb.blueprint('BP_Gyrophare');
  b.component('StaticMesh', 'Socle', { shape: 'cylinder', sizeX: 50, sizeY: 50, color: '#374151' });
  b.component('PointLight', 'Lumiere', { visible: false, radius: 260, color: '#ef4444' });
  b.component('BoxCollision', 'Zone', { sizeX: 240, sizeY: 240 });
  pb.place(b, 250, 0);
  pb.playerStart(-400, 0);
  return pb.project;
}

const off = (id: string, label: string, at: string, why: string) => {
  const c = visible(id, 'BP_Gyrophare', 'Lumiere', false, label, at);
  return { ...c, test: (cx: Parameters<typeof c.test>[0]) => (c.test(cx) === true ? true : why) };
};

export const lessonBeacon: Lesson = {
  id: 'l-gyrophare',
  module: 'Le temps',
  level: 'intermediaire',
  number: 0,
  title: 'Le gyrophare',
  situation: 'Une alarme clignote toutes les demi-secondes dès le lancement. Quand le joueur s’en approche, elle s’éteint pour de bon.',
  recalls: ['overlap', 'events'],
  notions: ['Set Timer by Event', 'Clear and Invalidate Timer by Handle', 'Timer Handle'],
  remember:
    'Un timer rappelle un événement plus tard, une fois ou en boucle (Looping), sans bloquer le fil blanc. Son Timer Handle, rangé dans une variable, est le seul moyen de l’arrêter.',
  cards: [
    {
      title: 'Ce qui est en place',
      body:
        '**BP_Gyrophare** : un Socle, une **Lumiere** rouge éteinte, une **Zone** autour. Le graphe est vide.\n\n' +
        'Le test regarde la lumière à 0,7 s, 1,2 s et 1,7 s (allumée, éteinte, allumée), puis amène le joueur dans la Zone : ensuite, elle doit rester éteinte.',
    },
    {
      title: 'Pourquoi pas un Delay',
      body:
        'Un **Delay** attend une fois, puis continue le fil. Pour recommencer sans fin, il faudrait reboucler le fil sur lui-même, et rien ne permettrait de l’arrêter proprement.\n\n' +
        '**Set Timer by Event** demande au moteur : « appelle cet événement dans **Time** secondes », et avec **Looping** coché, « puis toutes les Time secondes ». Le fil blanc, lui, continue tout de suite.',
    },
    {
      title: 'Set Timer by Event',
      body:
        '- **Event** (pin rouge carrée) : l’événement à appeler. Tire un fil depuis cette pin et ajoute un **Custom Event** (catégorie Add Event) : nomme-le `Clignote`. Il apparaît dans le graphe, prêt à recevoir un fil blanc.\n' +
        '- **Time** : 0,5 ; **Looping** : coché.\n' +
        '- **Return Value** : le **Timer Handle**, le ticket du timer. Un appui long sur la pin › **Promouvoir en variable** (Promote to Variable dans UE) crée la variable qui le garde ; nomme-la `Minuteur`.\n\n' +
        '**Clear and Invalidate Timer by Handle** (Handle = Get Minuteur) arrête le timer.',
    },
    {
      title: 'Le plan',
      body:
        '1. **Event BeginPlay** → **Set Timer by Event** (Clignote, 0,5, Looping) → **Set Minuteur** (Return Value).\n' +
        '2. **Clignote** → **Toggle Visibility** (Lumiere).\n' +
        '3. **Event ActorBeginOverlap** → **Clear and Invalidate Timer by Handle** (Minuteur) → **Set Visibility** (Lumiere, décochée).\n\n' +
        'Le piège : seulement éteindre la lumière. Le timer tourne encore, et la rallume une demi-seconde plus tard.',
    },
  ],
  objectives: [
    'Au lancement, la lumière clignote : allumée, éteinte, allumée, toutes les 0,5 s.',
    'Quand le joueur entre dans la Zone, elle s’éteint et ne clignote plus.',
    'Utilise un timer.',
  ],
  hints: [
    'Il faut que quelque chose se répète tout seul, et qu’on puisse l’arrêter : c’est le rôle d’un timer et de son Handle.',
    'Nœuds : Event BeginPlay, Set Timer by Event (avec un Custom Event Clignote), Toggle Visibility, une variable Timer Handle, Event ActorBeginOverlap, Clear and Invalidate Timer by Handle, Set Visibility.',
    'Solution : BeginPlay → Set Timer by Event (Clignote, 0,5, Looping) → Set Minuteur. Clignote → Toggle Visibility (Lumiere). ActorBeginOverlap → Clear and Invalidate Timer by Handle (Minuteur) → Set Visibility (Lumiere, décochée).',
  ],
  challenge: 'Fais repartir le clignotement quand le joueur ressort de la Zone (Event ActorEndOverlap).',
  setup: beaconProject,
  scenario: [
    { wait: 0.7 },
    { checkpoint: 'a' },
    { wait: 0.5 },
    { checkpoint: 'b' },
    { wait: 0.5 },
    { checkpoint: 'c' },
    { teleport: [250, 0] },
    { wait: 0.15 },
    { checkpoint: 'd' },
    { wait: 0.5 },
    { checkpoint: 'e' },
  ],
  checks: [
    visible('a', 'BP_Gyrophare', 'Lumiere', true, 'À 0,7 s, la lumière est allumée', 'a'),
    visible('b', 'BP_Gyrophare', 'Lumiere', false, 'À 1,2 s, elle est éteinte', 'b'),
    visible('c', 'BP_Gyrophare', 'Lumiere', true, 'À 1,7 s, elle est rallumée', 'c'),
    off('d', 'Le joueur arrive : elle s’éteint', 'd', 'Le joueur est dans la Zone, mais la lumière est encore allumée.'),
    off(
      'e',
      'Une demi-seconde plus tard, elle est toujours éteinte',
      'e',
      'La lumière s’est rallumée après l’arrivée du joueur : le timer tourne encore. Arrête-le avec Clear and Invalidate Timer by Handle.',
    ),
    notion(usesNode('timer', 'BP_Gyrophare', ['time.setTimerByEvent'], 'Le graphe utilise Set Timer by Event', 'Fais clignoter la lumière avec Set Timer by Event (Looping).')),
    noRuntimeErrors(),
  ],
  solve(p) {
    const b = edit(p, 'BP_Gyrophare');
    const handle = b.variable('Minuteur', T.struct('TimerHandle'));
    const begin = b.node('event.beginPlay', {}, {}, [64, 96]);
    const timer = b.node('time.setTimerByEvent', {}, { time: 0.5, looping: true }, [360, 96]);
    const keep = b.node('var.set', { variable: handle }, {}, [700, 96]);
    b.link(begin, 'then', timer, 'exec').link(timer, 'then', keep, 'exec').link(timer, 'handle', keep, 'value');
    const blink = b.node('event.custom', { name: 'Clignote' }, {}, [64, 420]);
    b.link(blink, 'delegate', timer, 'event');
    const toggle = b.node('component.toggleVisibility', {}, {}, [380, 420]);
    b.link(blink, 'then', toggle, 'exec').target('Lumiere', toggle);
    const enter = b.node('event.actorBeginOverlap', {}, {}, [64, 720]);
    const clear = b.node('time.clearTimer', {}, {}, [380, 720]);
    const get = b.node('var.get', { variable: handle }, {}, [200, 900]);
    const hide = b.node('component.setVisibility', {}, { visible: false }, [700, 720]);
    b.link(enter, 'then', clear, 'exec').link(get, 'value', clear, 'handle').link(clear, 'then', hide, 'exec').target('Lumiere', hide);
  },
};
