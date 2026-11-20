/**
 * The widget tree of a Widget Blueprint (UMG), as UE's Designer builds it:
 * one root, panels that hold children, and leaf widgets (Text, Progress Bar,
 * Image…). Each widget has its own properties and a "slot": the settings its
 * parent panel gives it (anchors and offsets in a Canvas Panel, padding and
 * size in a box). Plain JSON, kept in `BlueprintClass.widgets` in tree order:
 * siblings appear in the order of the list.
 */

export type WidgetKind = 'CanvasPanel' | 'VerticalBox' | 'HorizontalBox' | 'Overlay' | 'TextBlock' | 'ProgressBar' | 'Button' | 'Image' | 'Spacer' | 'UserWidget';

export const WIDGET_KINDS: WidgetKind[] = ['CanvasPanel', 'VerticalBox', 'HorizontalBox', 'Overlay', 'TextBlock', 'ProgressBar', 'Button', 'Image', 'Spacer', 'UserWidget'];

/** UE's ESlateVisibility, in its order: the value is the index. */
export const SLATE_VISIBILITY = ['Visible', 'Collapsed', 'Hidden', 'HitTestInvisible', 'SelfHitTestInvisible'] as const;
/** How UE's Details label them. */
export const SLATE_VISIBILITY_LABEL = ['Visible', 'Collapsed', 'Hidden', 'Not Hit-Testable (Self & All Children)', 'Not Hit-Testable (Self Only)'];
export const VIS_VISIBLE = 0;
export const VIS_COLLAPSED = 1;
export const VIS_HIDDEN = 2;

export type HAlign = 'Fill' | 'Left' | 'Center' | 'Right';
export type VAlign = 'Fill' | 'Top' | 'Center' | 'Bottom';
export type Justification = 'Left' | 'Center' | 'Right';

/** Left, Top, Right, Bottom, as UE's FMargin. */
export type Margin = [number, number, number, number];

/** Properties of a widget; each kind uses a subset. */
export interface WidgetProps {
  /** Behavior › Visibility: an index of SLATE_VISIBILITY. */
  visibility: number;
  /** Text: Content › Text. */
  text: string;
  /** Text: Appearance › Font › Size. */
  fontSize: number;
  /** Text: Color and Opacity. Image: Color and Opacity (its tint). */
  color: string;
  justification: Justification;
  /** Progress Bar: Progress › Percent, from 0 to 1. */
  percent: number;
  /** Progress Bar: Fill Color and Opacity. */
  fillColor: string;
  /** Button: Background Color. */
  background: string;
  /** Image: Brush › Image Size. Spacer: Size. */
  sizeX: number;
  sizeY: number;
}

/**
 * The slot: what the parent panel decides for this child. Only the fields of
 * the parent's kind are used, as UE shows "Slot (Canvas Panel Slot)" or
 * "Slot (Vertical Box Slot)" in Details.
 */
export interface WidgetSlot {
  /** Canvas Panel: Anchors Minimum and Maximum, from 0 to 1 of the panel. */
  anchors: { minX: number; minY: number; maxX: number; maxY: number };
  /**
   * Canvas Panel: Offsets. With a point anchor: Position X, Position Y, Size X,
   * Size Y. With a stretched anchor: the margins to the anchors (Offset Left…).
   */
  offsets: Margin;
  /** Canvas Panel: Alignment (the pivot), from 0 to 1 of the widget. */
  alignX: number;
  alignY: number;
  /** Canvas Panel: Size To Content. */
  autoSize: boolean;
  /** Canvas Panel: ZOrder, higher drawn on top. */
  zOrder: number;
  /** Boxes, Overlay, Button: Padding. */
  padding: Margin;
  /** Boxes: Size, Auto or Fill (with its ratio). */
  sizeRule: 'Auto' | 'Fill';
  fill: number;
  hAlign: HAlign;
  vAlign: VAlign;
}

export interface WidgetNode {
  id: string;
  /** Its name in the Hierarchy, and of its variable when Is Variable is ticked. */
  name: string;
  kind: WidgetKind;
  /** Parent widget id; the root has none. */
  parent?: string;
  /** UE's Is Variable: the widget becomes a variable of the Graph. */
  isVariable: boolean;
  props: WidgetProps;
  slot: WidgetSlot;
  /** A User Widget placed here: the Widget Blueprint it shows. */
  classId?: string;
  /**
   * Property Bindings (the Bind menu next to a property in Details): the
   * function of the Widget Blueprint that gives the value, called every frame.
   */
  bindings?: Partial<Record<BindableProp, string>>;
}

/** Properties that can be bound to a function, as UE's Bind menu offers them. */
export type BindableProp = 'text' | 'percent' | 'visibility' | 'color' | 'fillColor';

/** The bindable properties of a kind, with UE's label and the type their function returns. */
export interface BindableSpec {
  prop: BindableProp;
  label: string;
  /** Pin category and subtype of the function's Return Value. */
  type: { category: 'text' | 'float' | 'enum' | 'struct'; subtype?: string };
  /** Name UE gives the function made by Create Binding (Get + property, then _0, _1…). */
  fnName: string;
}

const BIND_VISIBILITY: BindableSpec = { prop: 'visibility', label: 'Visibility', type: { category: 'enum', subtype: 'ESlateVisibility' }, fnName: 'GetVisibility' };

export function bindableProps(kind: WidgetKind): BindableSpec[] {
  switch (kind) {
    case 'TextBlock':
      return [
        { prop: 'text', label: 'Text', type: { category: 'text' }, fnName: 'GetText' },
        { prop: 'color', label: 'Color and Opacity', type: { category: 'struct', subtype: 'LinearColor' }, fnName: 'GetColorAndOpacity' },
        BIND_VISIBILITY,
      ];
    case 'ProgressBar':
      return [
        { prop: 'percent', label: 'Percent', type: { category: 'float' }, fnName: 'GetPercent' },
        { prop: 'fillColor', label: 'Fill Color and Opacity', type: { category: 'struct', subtype: 'LinearColor' }, fnName: 'GetFillColorAndOpacity' },
        BIND_VISIBILITY,
      ];
    default:
      return [BIND_VISIBILITY];
  }
}

/** How many children a widget takes: panels many, a Button one (its content), the others none. */
export function childCapacity(kind: WidgetKind): 'many' | 'one' | 'none' {
  if (kind === 'CanvasPanel' || kind === 'VerticalBox' || kind === 'HorizontalBox' || kind === 'Overlay') return 'many';
  return kind === 'Button' ? 'one' : 'none';
}

export const isPanel = (kind: WidgetKind): boolean => childCapacity(kind) === 'many';

/** UE's class of each kind (for reference pins). */
export const WIDGET_CLASS: Record<WidgetKind, string> = {
  CanvasPanel: 'CanvasPanel',
  VerticalBox: 'VerticalBox',
  HorizontalBox: 'HorizontalBox',
  Overlay: 'Overlay',
  TextBlock: 'TextBlock',
  ProgressBar: 'ProgressBar',
  Button: 'Button',
  Image: 'Image',
  Spacer: 'Spacer',
  UserWidget: 'UserWidget',
};

/** How the Palette and the Hierarchy name each kind, as UE does. */
export const WIDGET_LABEL: Record<WidgetKind, string> = {
  CanvasPanel: 'Canvas Panel',
  VerticalBox: 'Vertical Box',
  HorizontalBox: 'Horizontal Box',
  Overlay: 'Overlay',
  TextBlock: 'Text',
  ProgressBar: 'Progress Bar',
  Button: 'Button',
  Image: 'Image',
  Spacer: 'Spacer',
  UserWidget: 'User Widget',
};

/** Default names of new widgets, as UE gives them (TextBlock, TextBlock_0…). */
export const WIDGET_DEFAULT_NAME: Record<WidgetKind, string> = {
  CanvasPanel: 'CanvasPanel',
  VerticalBox: 'VerticalBox',
  HorizontalBox: 'HorizontalBox',
  Overlay: 'Overlay',
  TextBlock: 'TextBlock',
  ProgressBar: 'ProgressBar',
  Button: 'Button',
  Image: 'Image',
  Spacer: 'Spacer',
  UserWidget: 'UserWidget',
};

/** Palette categories, as UE's. */
export const WIDGET_PALETTE: { category: string; kinds: WidgetKind[] }[] = [
  { category: 'Common', kinds: ['Button', 'Image', 'ProgressBar', 'TextBlock'] },
  { category: 'Panel', kinds: ['CanvasPanel', 'HorizontalBox', 'Overlay', 'VerticalBox'] },
  { category: 'Primitive', kinds: ['Spacer'] },
];

export const WIDGET_HELP: Record<WidgetKind, string> = {
  CanvasPanel: 'Un panneau où chaque enfant se place librement, avec des ancres : la racine habituelle d’un écran (HUD, menu).',
  VerticalBox: 'Range ses enfants l’un sous l’autre.',
  HorizontalBox: 'Range ses enfants côte à côte.',
  Overlay: 'Superpose ses enfants, chacun aligné dans toute la surface.',
  TextBlock: 'Un texte. Set Text le change pendant le jeu.',
  ProgressBar: 'Une jauge : Percent va de 0 (vide) à 1 (pleine).',
  Button: 'Un bouton cliquable. Il contient un seul enfant, souvent un Text.',
  Image: 'Une image ; ici, un rectangle de couleur.',
  Spacer: 'Un espace vide d’une taille donnée.',
  UserWidget: 'Un autre Widget Blueprint du projet, placé dans celui-ci.',
};

export function widgetPropsDefaults(kind: WidgetKind): WidgetProps {
  return {
    visibility: VIS_VISIBLE,
    text: kind === 'TextBlock' ? 'Text Block' : '',
    fontSize: 24,
    color: '#ffffff',
    justification: 'Left',
    percent: 0,
    fillColor: '#0080ff',
    background: '#e6e6e6',
    sizeX: kind === 'Spacer' ? 1 : 32,
    sizeY: kind === 'Spacer' ? 1 : 32,
  };
}

/** UE's defaults for a new slot, by the kind of the parent panel. */
export function slotDefaults(parentKind?: WidgetKind): WidgetSlot {
  const base: WidgetSlot = {
    anchors: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    offsets: [0, 0, 100, 30],
    alignX: 0,
    alignY: 0,
    autoSize: false,
    zOrder: 0,
    padding: [0, 0, 0, 0],
    sizeRule: 'Auto',
    fill: 1,
    hAlign: 'Fill',
    vAlign: 'Fill',
  };
  if (parentKind === 'Overlay') return { ...base, hAlign: 'Left', vAlign: 'Top' };
  if (parentKind === 'Button') return { ...base, padding: [4, 2, 4, 2], hAlign: 'Center', vAlign: 'Center' };
  return base;
}

/** The slot kind a parent gives, as UE names it in Details. */
export function slotLabel(parentKind: WidgetKind | undefined): string | undefined {
  if (!parentKind) return undefined;
  return parentKind === 'CanvasPanel'
    ? 'Canvas Panel Slot'
    : parentKind === 'VerticalBox'
      ? 'Vertical Box Slot'
      : parentKind === 'HorizontalBox'
        ? 'Horizontal Box Slot'
        : parentKind === 'Overlay'
          ? 'Overlay Slot'
          : parentKind === 'Button'
            ? 'Button Slot'
            : undefined;
}

/** Anchor presets of UE's Anchors menu: four rows of four. */
export const ANCHOR_PRESETS: { label: string; minX: number; minY: number; maxX: number; maxY: number }[] = [];
{
  const xs: [number, number, string][] = [
    [0, 0, 'gauche'],
    [0.5, 0.5, 'centre'],
    [1, 1, 'droite'],
    [0, 1, 'largeur'],
  ];
  const ys: [number, number, string][] = [
    [0, 0, 'haut'],
    [0.5, 0.5, 'milieu'],
    [1, 1, 'bas'],
    [0, 1, 'hauteur'],
  ];
  for (const [minY, maxY, ly] of ys) for (const [minX, maxX, lx] of xs) ANCHOR_PRESETS.push({ label: `${ly} · ${lx}`, minX, minY, maxX, maxY });
}

/** The children of a widget (or the root, for undefined), in order. */
export function widgetChildren(widgets: WidgetNode[], parent: string | undefined): WidgetNode[] {
  return widgets.filter((w) => w.parent === parent);
}

export function widgetRoot(widgets: WidgetNode[]): WidgetNode | undefined {
  return widgets.find((w) => !w.parent);
}

/** The widget and everything under it. */
export function widgetSubtree(widgets: WidgetNode[], id: string): WidgetNode[] {
  const out: WidgetNode[] = [];
  const walk = (wid: string) => {
    const w = widgets.find((x) => x.id === wid);
    if (!w) return;
    out.push(w);
    for (const c of widgetChildren(widgets, wid)) walk(c.id);
  };
  walk(id);
  return out;
}

/** The tree in display order, with depths (Hierarchy). */
export function widgetTree(widgets: WidgetNode[]): { w: WidgetNode; depth: number }[] {
  const out: { w: WidgetNode; depth: number }[] = [];
  const walk = (parent: string | undefined, depth: number) => {
    for (const w of widgetChildren(widgets, parent)) {
      out.push({ w, depth });
      walk(w.id, depth + 1);
    }
  };
  walk(undefined, 0);
  return out;
}

/** Is the slot's anchor stretched along X (Y)? Then offsets are margins, not a position and a size. */
export const stretchedX = (s: WidgetSlot): boolean => s.anchors.minX !== s.anchors.maxX;
export const stretchedY = (s: WidgetSlot): boolean => s.anchors.minY !== s.anchors.maxY;
