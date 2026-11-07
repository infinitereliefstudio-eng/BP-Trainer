import { T } from '../../types/pins';
import { dataIn, dataOut, execIn, execOut, type NodeDefinition } from '../definition';

const CAT = 'Utilities|Flow Control';
const TIMER = 'Utilities|Time';
const HANDLE = T.struct('TimerHandle');
/** The red Event pin of Set Timer by Event: a Custom Event without parameters. */
const EVENT = { category: 'delegate' as const, subtype: '' };

export const timeNodes: NodeDefinition[] = [
  {
    id: 'time.delay',
    title: 'Delay',
    category: CAT,
    kind: 'latent',
    allowedIn: ['event'],
    description:
      "Attend Duration secondes puis continue par Completed. S'il est rappelé pendant l'attente, l'appel est ignoré. Interdit dans une fonction.",
    keywords: ['wait', 'attendre', 'sleep', 'timer'],
    pins: [execIn(), dataIn('duration', 'Duration', T.float, { default: 0.2 }), execOut('completed', 'Completed')],
  },
  {
    id: 'time.retriggerableDelay',
    title: 'Retriggerable Delay',
    category: CAT,
    kind: 'latent',
    allowedIn: ['event'],
    description:
      "Comme Delay, mais chaque nouvel appel pendant l'attente remet le compte à zéro. Pratique pour « 3 s après le dernier passage ».",
    keywords: ['wait', 'attendre', 'reset', 'timer'],
    pins: [execIn(), dataIn('duration', 'Duration', T.float, { default: 0.2 }), execOut('completed', 'Completed')],
  },
  {
    id: 'time.setTimerByEvent',
    title: 'Set Timer by Event',
    category: TIMER,
    kind: 'function',
    description:
      "Appelle l'événement relié à Event dans Time secondes, une fois, ou toutes les Time secondes si Looping est coché. L'exécution continue tout de suite. Garde le Timer Handle dans une variable pour l'arrêter. Le même événement relancé remplace son timer ; Time à 0 l'arrête.",
    keywords: ['timer', 'minuteur', 'repeter', 'boucle', 'intervalle', 'chaque seconde'],
    pins: [
      execIn(),
      dataIn('event', 'Event', EVENT, { required: true }),
      dataIn('time', 'Time', T.float, { default: 1 }),
      dataIn('looping', 'Looping', T.bool, { default: false }),
      execOut(),
      dataOut('handle', 'Return Value', HANDLE),
    ],
  },
  {
    id: 'time.clearTimer',
    title: 'Clear and Invalidate Timer by Handle',
    category: TIMER,
    kind: 'function',
    description: 'Arrête le timer et rend le Handle invalide (la variable reliée est remise à zéro).',
    keywords: ['timer', 'stop', 'arreter', 'clear', 'annuler'],
    pins: [execIn(), dataIn('handle', 'Handle', HANDLE, { byRef: true }), execOut()],
  },
  {
    id: 'time.pauseTimer',
    title: 'Pause Timer by Handle',
    category: TIMER,
    kind: 'function',
    description: 'Met le timer en pause : son compte à rebours ne bouge plus jusqu’à Unpause Timer by Handle.',
    keywords: ['timer', 'pause'],
    pins: [execIn(), dataIn('handle', 'Handle', HANDLE), execOut()],
  },
  {
    id: 'time.unpauseTimer',
    title: 'Unpause Timer by Handle',
    category: TIMER,
    kind: 'function',
    description: 'Relance un timer mis en pause, là où il en était.',
    keywords: ['timer', 'reprendre', 'resume'],
    pins: [execIn(), dataIn('handle', 'Handle', HANDLE), execOut()],
  },
  {
    id: 'time.isTimerActive',
    title: 'Is Timer Active by Handle',
    category: TIMER,
    kind: 'pure',
    description: 'Vrai si le timer tourne (ni terminé, ni arrêté, ni en pause).',
    keywords: ['timer', 'actif', 'active', 'tourne'],
    pins: [dataIn('handle', 'Handle', HANDLE), dataOut('result', 'Return Value', T.bool)],
  },
  {
    id: 'time.timerRemaining',
    title: 'Get Timer Remaining Time by Handle',
    category: TIMER,
    kind: 'pure',
    description: 'Secondes avant le prochain appel du timer ; -1 si le timer ne tourne pas.',
    keywords: ['timer', 'restant', 'remaining', 'temps'],
    pins: [dataIn('handle', 'Handle', HANDLE), dataOut('result', 'Return Value', T.float)],
  },
  {
    id: 'time.getGameTime',
    title: 'Get Game Time in Seconds',
    category: TIMER,
    kind: 'pure',
    description: 'Le temps écoulé depuis le lancement de la partie, en secondes (sans les pauses).',
    keywords: ['time', 'temps', 'horloge', 'secondes'],
    pins: [dataOut('result', 'Return Value', T.float)],
  },
];
