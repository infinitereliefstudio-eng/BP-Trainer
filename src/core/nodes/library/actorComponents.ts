/**
 * Actor Components made in Blueprint: logic added to an actor like a
 * component (BP_Sante on a crate, a turret and the player), each actor with
 * its own copy. In a component's graphs Self is the component, not an actor:
 * Get Owner gives the actor that carries it. From outside, Get Component by
 * Class finds a component without knowing the actor's Blueprint.
 */
import { findClass, findComponent, findDispatcher, signatureKey, type BlueprintClass, type NodeInstance, type Param } from '../../model/project';
import { BUILTIN_HIERARCHY, makeHierarchy, T, type PinType } from '../../types/pins';
import { dataIn, dataOut, execIn, execOut, type NodeContext, type NodeDefinition, type PinSpec } from '../definition';
import { classById } from './communication';
import { NATIVE_DISPATCHERS } from './nativeDispatchers';

/** Native component classes Get Component by Class can look for, with UE's names. */
export const NATIVE_COMPONENT_CLASSES = ['SceneComponent', 'StaticMeshComponent', 'PointLightComponent', 'BoxComponent', 'TextRenderComponent'];

/** Is this Blueprint's Self of `native` (Actor, ActorComponent…)? */
export function selfIs(ctx: NodeContext, native: string): boolean {
  return ctx.hierarchy.isA(ctx.cls.name, native);
}

/** A Target pin that means self only where self is of that class; elsewhere it must be connected, as in UE. */
function target(ctx: NodeContext, native: string): PinSpec {
  return dataIn('target', 'Target', T.object(native), selfIs(ctx, native) ? { defaultsToSelf: true } : { required: true });
}

/** The class picked on Component Class: a project Blueprint (by id) or a native component class (by name). */
export function pickedComponentClass(n: NodeInstance, ctx: NodeContext): string {
  const v = n.defaults.componentClass;
  if (typeof v !== 'string' || !v) return 'ActorComponent';
  if (v in BUILTIN_HIERARCHY) return makeHierarchy().isA(v, 'ActorComponent') ? v : 'ActorComponent';
  const cls = ctx.project && findClass(ctx.project, v);
  return cls?.parent === 'ActorComponent' ? cls.name : 'ActorComponent';
}

/** The Actor Component and its dispatcher a "On … (Component)" event answers to. */
export function componentDispatcher(ctx: NodeContext, n: NodeInstance): { comp?: ReturnType<typeof findComponent>; owner?: BlueprintClass; d?: ReturnType<typeof findDispatcher> } {
  const comp = findComponent(ctx.cls, String(n.config.component));
  const owner = comp?.classId ? classById(ctx, comp.classId) : undefined;
  return { comp, owner, d: owner ? findDispatcher(owner, String(n.config.dispatcher)) : undefined };
}

const nativeDispatcher = (n: NodeInstance) => NATIVE_DISPATCHERS[String(n.config.dispatcher)] ?? NATIVE_DISPATCHERS.OnActorBeginOverlap;
const delegateOf = (params: Param[]): PinType => ({ category: 'delegate', subtype: signatureKey(params) });

export const actorComponentNodes: NodeDefinition[] = [
  {
    id: 'component.getOwner',
    title: 'Get Owner',
    category: 'Components',
    kind: 'pure',
    description:
      'Dans un Actor Component : l’acteur qui porte ce composant. Self, ici, c’est le composant, pas un acteur : pour bouger, cacher ou détruire l’acteur, on passe par Get Owner.',
    keywords: ['owner', 'proprietaire', 'acteur', 'porteur', 'component', 'composant'],
    pins: (_n, ctx) => [target(ctx, 'ActorComponent'), dataOut('result', 'Return Value', T.object('Actor'))],
  },
  {
    id: 'actor.getOwner',
    title: 'Get Owner',
    category: 'Actor',
    kind: 'pure',
    description:
      'Dans un acteur : son Owner, l’acteur qui l’a pris en charge (un Spawn Actor avec la pin Owner, dans UE). Le plus souvent None ! À ne pas confondre avec le Get Owner d’un Actor Component, qui donne l’acteur qui le porte.',
    keywords: ['owner', 'proprietaire', 'actor', 'acteur'],
    pins: (_n, ctx) => [target(ctx, 'Actor'), dataOut('result', 'Return Value', T.object('Actor'))],
  },
  {
    id: 'actor.getComponentByClass',
    title: 'Get Component by Class',
    category: 'Actor',
    kind: 'pure',
    description:
      'Le premier composant de la classe choisie que porte l’acteur (Target), ou None s’il n’en a pas. On s’en sert sans connaître le Blueprint de l’acteur : « a-t-il une santé ? ». À tester avec Is Valid avant de s’en servir.',
    keywords: ['get component by class', 'component', 'composant', 'chercher', 'trouver', 'classe'],
    pins: (n, ctx) => [
      target(ctx, 'Actor'),
      dataIn('componentClass', 'Component Class', T.class('ActorComponent')),
      dataOut('result', 'Return Value', T.object(pickedComponentClass(n, ctx))),
    ],
  },
  {
    id: 'actor.getComponentsByClass',
    title: 'Get Components by Class',
    category: 'Actor',
    kind: 'pure',
    description: 'Tous les composants de la classe choisie que porte l’acteur (Target), dans un tableau, vide s’il n’en a aucun.',
    keywords: ['get components by class', 'components', 'composants', 'tous', 'liste', 'classe'],
    pins: (n, ctx) => [
      target(ctx, 'Actor'),
      dataIn('componentClass', 'Component Class', T.class('ActorComponent')),
      dataOut('result', 'Return Value', T.array(T.object(pickedComponentClass(n, ctx)))),
    ],
  },
  {
    id: 'event.componentDispatcher',
    title: (n, ctx) => {
      const { comp, d } = componentDispatcher(ctx, n);
      return `On ${d?.name ?? '?'} (${comp?.name ?? '?'})`;
    },
    category: 'Add Event|Components',
    kind: 'event',
    allowedIn: ['event'],
    hiddenFromPalette: true,
    description:
      'Se déclenche quand l’Actor Component appelle cet Event Dispatcher (Call). C’est le raccourci d’UE (le bouton vert + des Details du composant) : l’abonnement est fait pour toi, sans Bind Event.',
    pins: (n, ctx) => [execOut(), ...(componentDispatcher(ctx, n).d?.params ?? []).map((p) => dataOut(p.id, p.name, p.type))],
  },
  {
    id: 'event.endPlay',
    title: 'Event End Play',
    category: 'Events',
    kind: 'event',
    unique: true,
    allowedIn: ['event'],
    description:
      'Se déclenche quand l’acteur (ou le composant) quitte la partie : détruit, ou à la fin du niveau. Pour un acteur détruit, il passe avant Event Destroyed, et les composants de l’acteur reçoivent le leur juste après lui.',
    keywords: ['end play', 'fin', 'quitter', 'detruit', 'destroyed'],
    pins: [execOut(), dataOut('reason', 'End Play Reason', T.enum('EEndPlayReason'))],
  },
  {
    id: 'dispatcher.bindNative',
    title: (n) => `Bind Event to ${nativeDispatcher(n).title}`,
    category: 'Collision',
    kind: 'function',
    allowedIn: ['event'],
    hiddenFromPalette: true,
    description:
      'Abonne un événement à On Actor Begin (ou End) Overlap d’un acteur : il s’exécutera, avec Overlapped Actor et Other Actor, chaque fois qu’un acteur commence (ou finit) de le chevaucher. C’est ainsi qu’un Actor Component, qui n’a pas de forme, réagit aux overlaps de son propriétaire (Target = Get Owner).',
    keywords: ['bind', 'overlap', 'abonner', 'on actor begin overlap', 'collision'],
    pins: (n, ctx) => [execIn(), target(ctx, 'Actor'), dataIn('event', 'Event', delegateOf(nativeDispatcher(n).params), { required: true }), execOut()],
  },
  {
    id: 'dispatcher.unbindNative',
    title: (n) => `Unbind Event from ${nativeDispatcher(n).title}`,
    category: 'Collision',
    kind: 'function',
    allowedIn: ['event'],
    hiddenFromPalette: true,
    description: 'Désabonne l’événement de On Actor Begin (ou End) Overlap.',
    keywords: ['unbind', 'overlap', 'desabonner'],
    pins: (n, ctx) => [execIn(), target(ctx, 'Actor'), dataIn('event', 'Event', delegateOf(nativeDispatcher(n).params), { required: true }), execOut()],
  },
];

/**
 * What a component's Blueprint may not contain, as in UE: an Actor Component
 * has no shape (no overlap, hit or click events), receives no input (its
 * actor or the Player Controller does), has no Timeline and no Construction
 * Script. These nodes are left out of its palette and refused by Compile.
 */
export const NOT_IN_COMPONENT: Record<string, string> = {
  'event.actorBeginOverlap': 'un composant n’a pas de forme : il n’a pas d’événement d’overlap. Abonne-toi à On Actor Begin Overlap de son Owner (Bind Event).',
  'event.actorEndOverlap': 'un composant n’a pas de forme : il n’a pas d’événement d’overlap. Abonne-toi à On Actor End Overlap de son Owner (Bind Event).',
  'event.componentBeginOverlap': 'un Actor Component n’a pas de composants.',
  'event.componentEndOverlap': 'un Actor Component n’a pas de composants.',
  'event.hit': 'un composant n’a pas de forme : il ne reçoit pas Event Hit.',
  'event.actorOnClicked': 'un composant n’a pas de forme : on ne peut pas cliquer dessus.',
  'event.destroyed': 'Event Destroyed est un événement d’acteur. Un composant reçoit Event End Play quand son acteur est détruit.',
  'event.inputKey': 'un composant ne reçoit pas les entrées : c’est son acteur (ou le Player Controller) qui les reçoit et l’appelle.',
  'input.action': 'un composant ne reçoit pas les entrées : c’est son acteur (ou le Player Controller) qui les reçoit et l’appelle.',
  'timeline.node': 'UE n’accepte pas de Timeline dans un Actor Component (« Timelines are not supported »). Utilise un timer, ou un Timeline dans l’acteur.',
  'cs.entry': 'un Actor Component n’a pas de Construction Script.',
};
