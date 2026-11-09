/**
 * Nodes that let Blueprints talk to each other: references, Cast, variables
 * of another Blueprint, Event Dispatchers, callable Custom Events and
 * Blueprint Interfaces.
 */
import { inheritedView } from '../../model/inheritance';
import {
  findDispatcher,
  findInterface,
  findVariable,
  signatureKey,
  type BlueprintClass,
  type NodeInstance,
  type Param,
} from '../../model/project';
import { T, type PinType } from '../../types/pins';
import { defaultValueFor } from '../../types/values';
import { dataIn, dataOut, execIn, execOut, type NodeContext, type NodeDefinition, type PinSpec } from '../definition';

export function classById(ctx: NodeContext, id: unknown): BlueprintClass | undefined {
  if (ctx.cls.id === id) return ctx.cls;
  const c = ctx.project?.classes.find((x) => x.id === id);
  return c && inheritedView(c, ctx.project);
}

const delegateType = (params: { type: PinType }[]): PinType => ({ category: 'delegate', subtype: signatureKey(params) });

/** Target pin for a member of `owner`: self when it is this Blueprint, else a required reference. */
function targetPin(ctx: NodeContext, owner: BlueprintClass | undefined): PinSpec {
  const own = !owner || owner.id === ctx.cls.id;
  return dataIn('target', 'Target', T.object(owner?.name ?? 'Actor'), own ? { defaultsToSelf: true } : { required: true });
}

function dispatcherOf(ctx: NodeContext, n: NodeInstance) {
  const owner = classById(ctx, n.config.owner);
  return { owner, d: owner ? findDispatcher(owner, String(n.config.dispatcher)) : undefined };
}

/** Parameters carried by a Custom Event: those of the dispatcher it was made for. */
export function customEventParams(ctx: NodeContext, n: NodeInstance): Param[] {
  if (!n.config.signature) return [];
  const owner = classById(ctx, n.config.signatureOwner);
  return (owner && findDispatcher(owner, String(n.config.signature))?.params) || [];
}

/** The Custom Event named `name` in a class, if any. */
export function findCustomEvent(cls: BlueprintClass, name: string): NodeInstance | undefined {
  for (const g of cls.graphs) {
    for (const n of Object.values(g.nodes)) if (n.def === 'event.custom' && n.config.name === name) return n;
  }
  return undefined;
}

export function interfaceFn(ctx: NodeContext, n: NodeInstance) {
  const iface = ctx.project ? findInterface(ctx.project, String(n.config.interface)) : undefined;
  return { iface, fn: iface?.functions.find((f) => f.id === n.config.fn) };
}

export const communicationNodes: NodeDefinition[] = [
  // ------------------------------------------------------------- casting
  {
    id: 'cast.to',
    title: (n, ctx) => `Cast To ${classById(ctx, n.config.class)?.name ?? '?'}`,
    category: 'Utilities|Casting',
    kind: 'function',
    hiddenFromPalette: true,
    description:
      "Vérifie qu'un objet est bien de ce type de Blueprint. Si oui, l'exécution sort par le haut et « As… » donne la référence typée ; sinon elle sort par Cast Failed.",
    pins: (n, ctx) => {
      const name = classById(ctx, n.config.class)?.name ?? 'Actor';
      return [
        execIn(),
        dataIn('object', 'Object', T.object('Object'), { required: true }),
        execOut(),
        execOut('failed', 'Cast Failed'),
        dataOut('as', `As ${name}`, T.object(name)),
      ];
    },
  },
  {
    id: 'actor.getPlayerPawn',
    title: 'Get Player Pawn',
    category: 'Game',
    kind: 'pure',
    description: 'Renvoie le pion du joueur. Il faut souvent un Cast pour accéder à ses variables.',
    keywords: ['player', 'joueur', 'pawn', 'pion'],
    pins: [dataIn('index', 'Player Index', T.int, { default: 0 }), dataOut('result', 'Return Value', T.object('Pawn'))],
  },
  {
    id: 'flow.isValid',
    title: 'Is Valid',
    category: 'Utilities',
    kind: 'flow',
    description: "Vérifie qu'une référence pointe vers un objet qui existe encore. À placer avant d'utiliser une référence qui peut être vide (None).",
    keywords: ['valid', 'valide', 'none', 'null'],
    pins: [execIn(), dataIn('object', 'Input Object', T.object('Object')), execOut('valid', 'Is Valid'), execOut('notValid', 'Is Not Valid')],
  },
  {
    id: 'util.isValid',
    title: 'IsValid',
    category: 'Utilities',
    kind: 'pure',
    description: 'Vrai si la référence pointe vers un objet qui existe. Version « pure » de Is Valid.',
    keywords: ['valid', 'valide', 'none', 'null'],
    pins: [dataIn('object', 'Object', T.object('Object')), dataOut('result', 'Return Value', T.bool)],
  },
  {
    id: 'actor.getOverlappingActors',
    title: 'Get Overlapping Actors',
    category: 'Collision',
    kind: 'function',
    description: 'Donne la liste des acteurs qui chevauchent actuellement cet acteur.',
    keywords: ['overlap', 'collision', 'liste', 'autour'],
    pins: [
      execIn(),
      dataIn('target', 'Target', T.object('Actor'), { defaultsToSelf: true }),
      execOut(),
      dataOut('actors', 'Overlapping Actors', T.array(T.object('Actor'))),
    ],
  },
  {
    id: 'flow.forEachLoop',
    title: 'For Each Loop',
    category: 'Utilities|Array',
    kind: 'flow',
    description: "Exécute Loop Body pour chaque élément d'un tableau, puis Completed. Toute la boucle s'exécute dans la même frame.",
    keywords: ['loop', 'boucle', 'each', 'tableau', 'array'],
    pins: [
      execIn(),
      dataIn('array', 'Array', T.array(T.wildcard)),
      execOut('body', 'Loop Body'),
      dataOut('element', 'Array Element', T.wildcard),
      dataOut('index', 'Array Index', T.int),
      execOut('completed', 'Completed'),
    ],
  },
  {
    id: 'array.length',
    title: 'Length',
    category: 'Utilities|Array',
    kind: 'pure',
    description: "Nombre d'éléments d'un tableau.",
    keywords: ['length', 'taille', 'nombre', 'array', 'tableau'],
    pins: [dataIn('array', 'Target Array', T.array(T.wildcard)), dataOut('result', 'Return Value', T.int)],
  },

  // -------------------------------------------------- other Blueprints' vars
  {
    id: 'var.getExternal',
    title: (n, ctx) => {
      const owner = classById(ctx, n.config.owner);
      return `Get ${(owner && findVariable(owner, String(n.config.variable))?.name) ?? '?'}`;
    },
    category: 'Variables',
    kind: 'pure',
    hiddenFromPalette: true,
    description: "Lit une variable d'un autre Blueprint, à travers une référence vers lui (Target).",
    pins: (n, ctx) => {
      const owner = classById(ctx, n.config.owner);
      const v = owner && findVariable(owner, String(n.config.variable));
      return [targetPin(ctx, owner), dataOut('value', v?.name ?? '?', v?.type ?? T.wildcard)];
    },
  },
  {
    id: 'var.setExternal',
    title: (n, ctx) => {
      const owner = classById(ctx, n.config.owner);
      return `Set ${(owner && findVariable(owner, String(n.config.variable))?.name) ?? '?'}`;
    },
    category: 'Variables',
    kind: 'function',
    hiddenFromPalette: true,
    description: "Change une variable d'un autre Blueprint, à travers une référence vers lui (Target).",
    pins: (n, ctx) => {
      const owner = classById(ctx, n.config.owner);
      const v = owner && findVariable(owner, String(n.config.variable));
      const type = v?.type ?? T.wildcard;
      return [execIn(), targetPin(ctx, owner), dataIn('value', v?.name ?? '?', type, { default: defaultValueFor(type) }), execOut(), dataOut('out', '', type, { hideName: true })];
    },
  },

  // ---------------------------------------------------- event dispatchers
  {
    id: 'dispatcher.call',
    title: (n, ctx) => `Call ${dispatcherOf(ctx, n).d?.name ?? '?'}`,
    category: 'Event Dispatchers',
    kind: 'function',
    hiddenFromPalette: true,
    description: "Déclenche l'Event Dispatcher : tous les événements qui s'y sont abonnés (Bind) s'exécutent tout de suite, avec ces paramètres.",
    pins: (n, ctx) => {
      const { owner, d } = dispatcherOf(ctx, n);
      return [execIn(), targetPin(ctx, owner), ...(d?.params ?? []).map((p) => dataIn(p.id, p.name, p.type, { default: defaultValueFor(p.type) })), execOut()];
    },
  },
  {
    id: 'dispatcher.bind',
    title: (n, ctx) => `Bind Event to ${dispatcherOf(ctx, n).d?.name ?? '?'}`,
    category: 'Event Dispatchers',
    kind: 'function',
    hiddenFromPalette: true,
    description:
      "Abonne un événement à l'Event Dispatcher d'un acteur : à chaque Call, l'événement relié à la pin Event s'exécutera. Se fait souvent au BeginPlay.",
    pins: (n, ctx) => {
      const { owner, d } = dispatcherOf(ctx, n);
      return [execIn(), targetPin(ctx, owner), dataIn('event', 'Event', delegateType(d?.params ?? []), { required: true }), execOut()];
    },
  },
  {
    id: 'dispatcher.unbind',
    title: (n, ctx) => `Unbind Event from ${dispatcherOf(ctx, n).d?.name ?? '?'}`,
    category: 'Event Dispatchers',
    kind: 'function',
    hiddenFromPalette: true,
    description: "Désabonne un événement de l'Event Dispatcher.",
    pins: (n, ctx) => {
      const { owner, d } = dispatcherOf(ctx, n);
      return [execIn(), targetPin(ctx, owner), dataIn('event', 'Event', delegateType(d?.params ?? []), { required: true }), execOut()];
    },
  },
  {
    id: 'dispatcher.unbindAll',
    title: (n, ctx) => `Unbind All Events from ${dispatcherOf(ctx, n).d?.name ?? '?'}`,
    category: 'Event Dispatchers',
    kind: 'function',
    hiddenFromPalette: true,
    description: "Retire tous les abonnements de l'Event Dispatcher.",
    pins: (n, ctx) => [execIn(), targetPin(ctx, dispatcherOf(ctx, n).owner), execOut()],
  },

  // ------------------------------------------------- calling custom events
  {
    id: 'call.custom',
    title: (n) => String(n.config.event ?? '?'),
    category: 'Call Function',
    kind: 'function',
    hiddenFromPalette: true,
    description: "Appelle un Custom Event, dans ce Blueprint ou dans un autre à travers une référence. Il s'exécute immédiatement.",
    pins: (n, ctx) => {
      const owner = classById(ctx, n.config.owner) ?? ctx.cls;
      const ev = findCustomEvent(owner, String(n.config.event));
      const params = ev ? customEventParams(ctx, ev) : [];
      return [execIn(), targetPin(ctx, owner), ...params.map((p) => dataIn(p.id, p.name, p.type, { default: defaultValueFor(p.type) })), execOut()];
    },
  },

  // ----------------------------------------------------------- interfaces
  {
    id: 'event.interface',
    title: (n, ctx) => `Event ${interfaceFn(ctx, n).fn?.name ?? '?'}`,
    category: 'Add Event|Interfaces',
    kind: 'event',
    allowedIn: ['event'],
    hiddenFromPalette: true,
    description: "L'implémentation d'une fonction d'interface dans ce Blueprint : elle s'exécute quand quelqu'un lui envoie ce message.",
    pins: (n, ctx) => [execOut(), ...(interfaceFn(ctx, n).fn?.inputs ?? []).map((p) => dataOut(p.id, p.name, p.type))],
  },
  {
    id: 'iface.message',
    title: (n, ctx) => `${interfaceFn(ctx, n).fn?.name ?? '?'} (Message)`,
    category: 'Interface Messages',
    kind: 'function',
    hiddenFromPalette: true,
    description:
      "Envoie un message d'interface à n'importe quel objet. S'il implémente l'interface, sa version de la fonction s'exécute ; sinon il ne se passe rien, sans erreur, et les sorties gardent leur valeur par défaut.",
    pins: (n, ctx) => {
      const fn = interfaceFn(ctx, n).fn;
      return [
        execIn(),
        dataIn('target', 'Target', T.object('Object'), { defaultsToSelf: true }),
        ...(fn?.inputs ?? []).map((p) => dataIn(p.id, p.name, p.type, { default: defaultValueFor(p.type) })),
        execOut(),
        ...(fn?.outputs ?? []).map((p) => dataOut(p.id, p.name, p.type)),
      ];
    },
  },
  {
    id: 'iface.doesImplement',
    title: (n, ctx) => `Does Implement Interface (${(ctx.project && findInterface(ctx.project, String(n.config.interface))?.name) ?? '?'})`,
    category: 'Utilities|Interfaces',
    kind: 'pure',
    hiddenFromPalette: true,
    description: "Vrai si l'objet implémente cette Blueprint Interface (Class Settings › Implemented Interfaces).",
    pins: [dataIn('object', 'Test Object', T.object('Object')), dataOut('result', 'Return Value', T.bool)],
  },
];
