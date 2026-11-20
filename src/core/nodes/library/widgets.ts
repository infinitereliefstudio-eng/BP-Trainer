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
import { inheritedView } from '../../model/inheritance';
import { findClass, spawnPins, type NodeInstance } from '../../model/project';
import { WIDGET_CLASS } from '../../model/widgets';
import { T } from '../../types/pins';
import { dataIn, dataOut, execIn, execOut, type NodeContext, type NodeDefinition, type PinSpec } from '../definition';
import { selfIs } from './actorComponents';
import { classById } from './communication';

const CAT = 'User Interface';

/** Target of a widget function: self in a Widget Blueprint, a wire elsewhere. */
function widgetTarget(ctx: NodeContext, type = 'Widget'): PinSpec {
  return dataIn('target', 'Target', T.object(type), selfIs(ctx, 'UserWidget') ? { defaultsToSelf: true } : { required: true });
}

/** Target of a function of one kind of widget (Text Block…): a widget of the Designer, always wired. */
const kindTarget = (type: string): PinSpec => dataIn('target', 'Target', T.object(type), { required: true });

/** The Widget Blueprint picked on Create Widget's Class pin, or undefined. */
function pickedWidget(n: NodeInstance, ctx: NodeContext) {
  const id = n.defaults.class;
  const cls = typeof id === 'string' && ctx.project ? findClass(ctx.project, id) : undefined;
  return cls?.parent === 'UserWidget' ? cls : undefined;
}

/** A Button's events, as UE lists them in its Details (Events). */
export const BUTTON_EVENTS = [
  { id: 'clicked', label: 'On Clicked', help: 'Le doigt se lève sur le bouton après l’avoir enfoncé : le « clic ».' },
  { id: 'pressed', label: 'On Pressed', help: 'Le doigt se pose sur le bouton.' },
  { id: 'released', label: 'On Released', help: 'Le doigt se lève, sur le bouton ou ailleurs (avant On Clicked).' },
] as const;

export type ButtonEvent = (typeof BUTTON_EVENTS)[number]['id'];

export const buttonEventLabel = (id: unknown): string => BUTTON_EVENTS.find((e) => e.id === id)?.label ?? 'On Clicked';

const VIEWPORT = `${CAT}|Viewport`;
const WIDGET = `${CAT}|Widget`;
const PANEL = `${CAT}|Panel`;
const TEXT = `${CAT}|Text Block`;
const BAR = `${CAT}|Progress Bar`;

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
    id: 'event.widgetButton',
    title: (n, ctx) => `${buttonEventLabel(n.config.event)} (${widgetVariable(ctx, String(n.config.widget))?.name ?? 'widget supprimé'})`,
    category: CAT,
    kind: 'event',
    allowedIn: ['event'],
    hiddenFromPalette: true,
    description:
      'Un événement d’un Button du Designer coché Is Variable : On Clicked quand on le touche puis relâche dessus, On Pressed au toucher, On Released au relâcher. Il ne vient que si le mode d’entrée laisse les widgets recevoir les touchers (UI Only, ou Game and UI) ; en Game Only, le toucher est ignoré.',
    keywords: ['on clicked', 'clic', 'bouton', 'button', 'pressed', 'released'],
    pins: [execOut()],
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
    description: 'Le Player Controller à qui appartient ce widget : celui donné à Owning Player sur Create Widget. Si la pin était vide, UE a pris le premier joueur local. Dans le Designer (Pre Construct), il n’y en a pas : None.',
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
  {
    id: 'widget.create',
    title: (n, ctx) => {
      const cls = pickedWidget(n, ctx);
      return cls ? `Create ${cls.name} Widget` : 'Create Widget';
    },
    category: CAT,
    kind: 'function',
    description:
      'Crée un widget de la classe choisie : un objet, pas encore à l’écran (il faut Add to Viewport). Event On Initialized s’y exécute une fois, tout de suite, avant que les variables Expose on Spawn reçoivent leur valeur. Garde la Return Value dans une variable pour pouvoir le retirer ou le mettre à jour. Owning Player : le joueur à qui il appartient ; laissé vide, UE prend le premier joueur local.',
    keywords: ['create widget', 'widget', 'creer', 'hud', 'menu', 'ui', 'interface', 'umg'],
    pins: (n, ctx) => {
      const own = pickedWidget(n, ctx);
      const cls = own && inheritedView(own, ctx.project);
      return [
        execIn(),
        dataIn('class', 'Class', T.class('UserWidget')),
        dataIn('owner', 'Owning Player', T.object('PlayerController')),
        ...(cls ? spawnPins(cls).map((v) => dataIn(`expose:${v.id}`, v.name, v.type, { default: v.defaultValue })) : []),
        execOut(),
        dataOut('result', 'Return Value', T.object(own?.name ?? 'UserWidget')),
      ];
    },
  },
  {
    id: 'widget.addToViewport',
    title: 'Add to Viewport',
    category: VIEWPORT,
    kind: 'function',
    description:
      'Affiche le widget à l’écran, par-dessus le jeu : Event Pre Construct puis Event Construct s’y exécutent. Z Order : les plus grands passent devant. L’ajouter une 2e fois ne fait rien (UE l’écrit en Warning).',
    keywords: ['add to viewport', 'viewport', 'afficher', 'ecran', 'montrer', 'hud'],
    pins: (_n, ctx) => [execIn(), widgetTarget(ctx, 'UserWidget'), dataIn('zOrder', 'ZOrder', T.int, { default: 0 }), execOut()],
  },
  {
    id: 'widget.removeFromParent',
    title: 'Remove from Parent',
    category: WIDGET,
    kind: 'function',
    description:
      'Retire le widget de l’écran (ou du panneau où il était) : Event Destruct s’y exécute. L’objet existe toujours : Is Valid reste vrai, et Add to Viewport peut le remontrer. Sans parent, il ne se passe rien.',
    keywords: ['remove from parent', 'retirer', 'enlever', 'cacher', 'fermer', 'remove'],
    pins: (_n, ctx) => [execIn(), widgetTarget(ctx), execOut()],
  },
  {
    id: 'widget.isInViewport',
    title: 'Is In Viewport',
    category: VIEWPORT,
    kind: 'pure',
    description: 'Vrai si le widget a été ajouté au viewport (Add to Viewport) et pas encore retiré.',
    keywords: ['is in viewport', 'affiche', 'ecran', 'visible'],
    pins: (_n, ctx) => [widgetTarget(ctx, 'UserWidget'), dataOut('result', 'Return Value', T.bool)],
  },
  {
    id: 'widget.setVisibility',
    title: 'Set Visibility',
    category: WIDGET,
    kind: 'function',
    description:
      'Change la Visibility : Visible, Collapsed (caché, ne prend plus de place), Hidden (caché, garde sa place)… Plus léger que retirer et recréer : le widget reste construit.',
    keywords: ['visibility', 'visible', 'cacher', 'montrer', 'hidden', 'collapsed'],
    pins: (_n, ctx) => [execIn(), widgetTarget(ctx), dataIn('visibility', 'In Visibility', T.enum('ESlateVisibility'), { default: 0 }), execOut()],
  },
  {
    id: 'widget.getVisibility',
    title: 'Get Visibility',
    category: WIDGET,
    kind: 'pure',
    description: 'La Visibility actuelle du widget.',
    keywords: ['visibility', 'visible'],
    pins: (_n, ctx) => [widgetTarget(ctx), dataOut('result', 'Return Value', T.enum('ESlateVisibility'))],
  },
  {
    id: 'widget.isVisible',
    title: 'Is Visible',
    category: WIDGET,
    kind: 'pure',
    description: 'Vrai si sa Visibility le montre (Visible ou Not Hit-Testable), faux pour Hidden et Collapsed. Ne dit pas s’il est à l’écran : c’est Is In Viewport.',
    keywords: ['is visible', 'visible', 'cache'],
    pins: (_n, ctx) => [widgetTarget(ctx), dataOut('result', 'Return Value', T.bool)],
  },
  {
    id: 'widget.setIsEnabled',
    title: 'Set Is Enabled',
    category: WIDGET,
    kind: 'function',
    description: 'Active ou désactive le widget et ce qu’il contient. Un bouton désactivé reste visible (grisé) mais ne répond plus : il prend le toucher sans rien faire.',
    keywords: ['enabled', 'activer', 'desactiver', 'griser', 'bouton'],
    pins: (_n, ctx) => [execIn(), widgetTarget(ctx), dataIn('enabled', 'In Is Enabled', T.bool, { default: true }), execOut()],
  },
  {
    id: 'widget.getIsEnabled',
    title: 'Get Is Enabled',
    category: WIDGET,
    kind: 'pure',
    description: 'Vrai si le widget est activé (sa propre case Is Enabled).',
    keywords: ['enabled', 'active'],
    pins: (_n, ctx) => [widgetTarget(ctx), dataOut('result', 'Return Value', T.bool)],
  },
  {
    id: 'widget.setText',
    title: 'SetText (Text)',
    category: TEXT,
    kind: 'function',
    description:
      'Change le texte d’un Text Block. Si sa propriété Text était liée (Bind), la liaison s’arrête : c’est cette valeur qui reste. Appelle-le quand la valeur change (un événement), pas à chaque Tick.',
    keywords: ['set text', 'texte', 'ecrire', 'afficher', 'score', 'text'],
    pins: [execIn(), kindTarget('TextBlock'), dataIn('text', 'In Text', T.text, { default: '' }), execOut()],
  },
  {
    id: 'widget.getText',
    title: 'GetText (Text)',
    category: TEXT,
    kind: 'pure',
    description: 'Le texte affiché par le Text Block.',
    keywords: ['get text', 'texte', 'lire'],
    pins: [kindTarget('TextBlock'), dataOut('result', 'Return Value', T.text)],
  },
  {
    id: 'widget.setTextColor',
    title: 'Set Color and Opacity',
    category: TEXT,
    kind: 'function',
    description: 'Change la couleur du texte d’un Text Block.',
    keywords: ['color', 'couleur', 'opacity', 'texte'],
    pins: [execIn(), kindTarget('TextBlock'), dataIn('color', 'In Color and Opacity', T.struct('LinearColor'), { default: '#ffffff' }), execOut()],
  },
  {
    id: 'widget.setPercent',
    title: 'Set Percent',
    category: BAR,
    kind: 'function',
    description:
      'Remplit la Progress Bar : 0 vide, 1 pleine (0,5 à moitié). Ce n’est pas un pourcentage de 0 à 100 : divise la vie par la vie max. Au-delà de 1, la barre reste pleine.',
    keywords: ['set percent', 'barre', 'vie', 'progress', 'remplir', 'health'],
    pins: [execIn(), kindTarget('ProgressBar'), dataIn('percent', 'In Percent', T.float, { default: 0 }), execOut()],
  },
  {
    id: 'widget.getPercent',
    title: 'Get Percent',
    category: BAR,
    kind: 'pure',
    description: 'La valeur Percent de la Progress Bar, telle qu’elle a été donnée (même au-delà de 1).',
    keywords: ['get percent', 'barre', 'progress'],
    pins: [kindTarget('ProgressBar'), dataOut('result', 'Return Value', T.float)],
  },
  {
    id: 'widget.setFillColor',
    title: 'Set Fill Color and Opacity',
    category: BAR,
    kind: 'function',
    description: 'Change la couleur du remplissage de la Progress Bar (rouge quand la vie est basse…).',
    keywords: ['fill color', 'couleur', 'barre', 'progress'],
    pins: [execIn(), kindTarget('ProgressBar'), dataIn('color', 'In Color', T.struct('LinearColor'), { default: '#ffffff' }), execOut()],
  },
  {
    id: 'widget.addChildToVerticalBox',
    title: 'Add Child to Vertical Box',
    category: PANEL,
    kind: 'function',
    description:
      'Ajoute Content à la fin de la Vertical Box (un widget créé par Create Widget). Il quitte l’écran ou le panneau où il était. Dans UE il renvoie aussi le Slot, pour régler son Padding : pas encore ici.',
    keywords: ['add child', 'ajouter', 'liste', 'vertical box', 'enfant'],
    pins: [execIn(), kindTarget('VerticalBox'), dataIn('content', 'Content', T.object('Widget'), { required: true }), execOut()],
  },
  {
    id: 'widget.addChildToHorizontalBox',
    title: 'Add Child to Horizontal Box',
    category: PANEL,
    kind: 'function',
    description: 'Ajoute Content à la fin (à droite) de la Horizontal Box : un widget créé par Create Widget.',
    keywords: ['add child', 'ajouter', 'horizontal box', 'enfant', 'ligne'],
    pins: [execIn(), kindTarget('HorizontalBox'), dataIn('content', 'Content', T.object('Widget'), { required: true }), execOut()],
  },
  {
    id: 'widget.removeChild',
    title: 'Remove Child',
    category: PANEL,
    kind: 'function',
    description: 'Retire Content du panneau. Return Value : vrai s’il y était.',
    keywords: ['remove child', 'retirer', 'enlever', 'enfant'],
    pins: [execIn(), kindTarget('PanelWidget'), dataIn('content', 'Content', T.object('Widget'), { required: true }), execOut(), dataOut('result', 'Return Value', T.bool)],
  },
  {
    id: 'widget.clearChildren',
    title: 'Clear Children',
    category: PANEL,
    kind: 'function',
    description: 'Vide le panneau, y compris les enfants placés dans le Designer. Pratique avant de reconstruire une liste.',
    keywords: ['clear children', 'vider', 'effacer', 'liste', 'enfants'],
    pins: [execIn(), kindTarget('PanelWidget'), execOut()],
  },
  {
    id: 'widget.getChildrenCount',
    title: 'Get Children Count',
    category: PANEL,
    kind: 'pure',
    description: 'Combien d’enfants a le panneau : ceux du Designer encore là, plus ceux ajoutés.',
    keywords: ['children count', 'nombre', 'enfants', 'combien'],
    pins: [kindTarget('PanelWidget'), dataOut('result', 'Return Value', T.int)],
  },
];

/** Events that only exist in a Widget Blueprint. */
export const WIDGET_ONLY = new Set(['event.preConstruct', 'event.construct', 'event.destruct', 'event.onInitialized', 'event.widgetTick', 'event.widgetButton']);

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
