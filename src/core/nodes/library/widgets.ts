/**
 * UMG, the Graph of a Widget Blueprint: its own events (Pre Construct,
 * Construct, Destruct, On Initialized, its Event Tick), the widgets ticked
 * Is Variable read as variables, and the player who owns the widget.
 *
 * A widget is not an actor: no BeginPlay (Event Construct plays that part),
 * no overlap, no Timeline, no input events. NOT_IN_WIDGET lists what its
 * palette leaves out and Compile refuses, as NOT_IN_COMPONENT does for an
 * Actor Component.
 */
import { WIDGET_CLASS } from '../../model/widgets';
import { T } from '../../types/pins';
import { dataIn, dataOut, execOut, type NodeContext, type NodeDefinition, type PinSpec } from '../definition';
import { selfIs } from './actorComponents';
import { classById } from './communication';

const CAT = 'User Interface';

/** Target of a widget function: self in a Widget Blueprint, a wire elsewhere. */
function widgetTarget(ctx: NodeContext): PinSpec {
  return dataIn('target', 'Target', T.object('Widget'), selfIs(ctx, 'UserWidget') ? { defaultsToSelf: true } : { required: true });
}

/** The widget a "Get <widget>" node reads, and its class name. */
export function widgetVariable(ctx: NodeContext, id: string): { name: string; type: string; isVariable: boolean } | undefined {
  const w = (ctx.cls.widgets ?? []).find((x) => x.id === id);
  if (!w) return undefined;
  const type = w.kind === 'UserWidget' ? (classById(ctx, w.classId ?? '')?.name ?? 'UserWidget') : WIDGET_CLASS[w.kind];
  return { name: w.name, type, isVariable: w.isVariable };
}

export const widgetNodes: NodeDefinition[] = [
  {
    id: 'event.preConstruct',
    title: 'Event Pre Construct',
    category: CAT,
    kind: 'event',
    unique: true,
    allowedIn: ['event'],
    description:
      'Avant Event Construct, à chaque fois que le widget est construit, et aussi dans le Designer (Is Design Time vaut alors true) : l’équivalent du Construction Script pour un widget.',
    keywords: ['pre construct', 'preconstruct', 'design time', 'construction'],
    pins: [execOut(), dataOut('designTime', 'Is Design Time', T.bool)],
  },
  {
    id: 'event.construct',
    title: 'Event Construct',
    category: CAT,
    kind: 'event',
    unique: true,
    allowedIn: ['event'],
    description:
      'Quand le widget est ajouté à l’écran (Add to Viewport) : le « BeginPlay » d’un widget. Attention, il revient à chaque nouvel ajout ; pour une seule fois à la création, c’est Event On Initialized.',
    keywords: ['construct', 'beginplay', 'begin play', 'debut', 'demarrage', 'ajout'],
    pins: [execOut()],
  },
  {
    id: 'event.destruct',
    title: 'Event Destruct',
    category: CAT,
    kind: 'event',
    unique: true,
    allowedIn: ['event'],
    description: 'Quand le widget est retiré de l’écran (Remove from Parent). L’objet existe encore : il peut être réaffiché.',
    keywords: ['destruct', 'retire', 'remove', 'fin'],
    pins: [execOut()],
  },
  {
    id: 'event.onInitialized',
    title: 'Event On Initialized',
    category: CAT,
    kind: 'event',
    unique: true,
    allowedIn: ['event'],
    description: 'Une seule fois, à la création du widget (Create Widget), avant tout ajout à l’écran. Pour ce qui ne doit se faire qu’une fois, comme un Bind Event.',
    keywords: ['initialized', 'initialise', 'creation', 'une fois'],
    pins: [execOut()],
  },
  {
    id: 'event.widgetTick',
    title: 'Event Tick',
    category: CAT,
    kind: 'event',
    unique: true,
    allowedIn: ['event'],
    description:
      'À chaque image, tant que le widget est à l’écran, même quand le jeu est en pause. Dans UE il donne aussi My Geometry (la place du widget), absent ici. À éviter pour suivre une valeur : préfère un événement.',
    keywords: ['tick', 'frame', 'image', 'update'],
    pins: [execOut(), dataOut('delta', 'In Delta Time', T.float)],
  },
  {
    id: 'var.widget',
    title: (n, ctx) => widgetVariable(ctx, String(n.config.widget))?.name ?? '(widget supprimé)',
    category: 'Variables|Widgets',
    kind: 'variable',
    style: 'getter',
    hiddenFromPalette: true,
    description: 'Un widget du Designer coché Is Variable : une référence pour l’utiliser comme Target (Set Text, Set Percent…). Elle se lit, elle ne se change pas.',
    pins: (n, ctx) => {
      const v = widgetVariable(ctx, String(n.config.widget));
      return [dataOut('value', v?.name ?? '?', T.object(v?.type ?? 'Widget'), { hideName: true })];
    },
  },
  {
    id: 'widget.getOwningPlayer',
    title: 'Get Owning Player',
    category: CAT,
    kind: 'pure',
    description: 'Le Player Controller à qui appartient ce widget : celui donné à Owning Player sur Create Widget.',
    keywords: ['owning player', 'owner', 'player controller', 'proprietaire', 'joueur'],
    pins: (_n, ctx) => [widgetTarget(ctx), dataOut('result', 'Return Value', T.object('PlayerController'))],
  },
  {
    id: 'widget.getOwningPlayerPawn',
    title: 'Get Owning Player Pawn',
    category: CAT,
    kind: 'pure',
    description: 'Le Pawn que possède le joueur à qui appartient ce widget : le plus court chemin d’un HUD vers le personnage.',
    keywords: ['owning player pawn', 'pawn', 'joueur', 'personnage', 'character'],
    pins: (_n, ctx) => [widgetTarget(ctx), dataOut('result', 'Return Value', T.object('Pawn'))],
  },
];

/** Events that only exist in a Widget Blueprint. */
export const WIDGET_ONLY = new Set(['event.preConstruct', 'event.construct', 'event.destruct', 'event.onInitialized', 'event.widgetTick']);

/**
 * What a Widget Blueprint's graph may not contain, as in UE: a widget is
 * not an actor (no BeginPlay, End Play, Destroyed), has no shape (no overlap,
 * hit or click events), no components, no Timeline and no Construction Script.
 * Keys and Input Actions are received by the Player Controller, which calls the widget.
 */
export const NOT_IN_WIDGET: Record<string, string> = {
  'event.beginPlay': 'un widget n’a pas d’Event BeginPlay : Event Construct joue ce rôle, quand il est ajouté à l’écran.',
  'event.tick': 'c’est l’Event Tick d’un acteur. Un widget a le sien (Event Tick, avec In Delta Time).',
  'event.endPlay': 'Event End Play est un événement d’acteur. Un widget reçoit Event Destruct quand il est retiré de l’écran.',
  'event.destroyed': 'Event Destroyed est un événement d’acteur. Un widget reçoit Event Destruct quand il est retiré de l’écran.',
  'event.actorBeginOverlap': 'un widget n’est pas dans le niveau : il n’a pas d’overlap.',
  'event.actorEndOverlap': 'un widget n’est pas dans le niveau : il n’a pas d’overlap.',
  'event.componentBeginOverlap': 'un widget n’a pas de composants.',
  'event.componentEndOverlap': 'un widget n’a pas de composants.',
  'event.hit': 'un widget n’est pas dans le niveau : il ne reçoit pas Event Hit.',
  'event.actorOnClicked': 'un widget n’est pas dans le niveau. Pour un clic, place un Button dans le Designer.',
  'event.inputKey': 'ici, c’est le Player Controller qui reçoit les touches : il appelle ensuite le widget.',
  'input.action': 'ici, c’est le Player Controller qui reçoit les Input Actions : il appelle ensuite le widget.',
  'timeline.node': 'UE n’accepte de Timeline que dans un acteur. Un widget anime avec ses Animations (onglet du Designer).',
  'cs.entry': 'un widget n’a pas de Construction Script : Event Pre Construct joue ce rôle.',
};
