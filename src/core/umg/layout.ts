/**
 * Where each widget of a Widget Blueprint goes on the screen, as Slate lays
 * it out: two passes, the desired size of each widget from its content
 * (bottom up), then the rectangle each parent gives its children (top down)
 * from their slots. Pure arithmetic, no DOM: the Designer, Play and the tests
 * all use it.
 *
 * Units are UE's: design pixels of the screen (1280 × 720 in the Designer),
 * fonts in points (1 point = 4/3 pixel, Slate's 96 DPI).
 */
import { findClass, type BlueprintClass, type Project } from '../model/project';
import { stretchedX, stretchedY, VIS_COLLAPSED, VIS_HIDDEN, widgetChildren, widgetRoot, type WidgetNode, type WidgetProps } from '../model/widgets';
import type { Rect } from '../operations/widgetOps';

/** The Designer's screen size (an app choice: readable on a phone; UE projects often use 1920 × 1080). */
export const DESIGN_W = 1280;
export const DESIGN_H = 720;

/** Font size in points to pixels, as Slate does (96 DPI). */
export const fontPx = (points: number): number => (points * 4) / 3;
/** Average width of a character, in font pixels: an estimate, the real font is drawn by the screen. */
const CHAR_W = 0.52;
const LINE_H = 1.2;

export interface LaidOutWidget {
  /** Unique on the screen: the widget id, prefixed by the User Widgets it sits in ("w1/w7"). */
  path: string;
  widget: WidgetNode;
  /** The Widget Blueprint the widget belongs to. */
  classId: string;
  rect: Rect;
  /** Drawn: visible, and so is every parent. Hidden and Collapsed widgets are not. */
  drawn: boolean;
  depth: number;
  /** Its properties, with what the game changed (Set Text…) applied. */
  props: WidgetProps;
}

/** What a running game changed on a widget, by path (Set Text, Set Percent…). */
export type PropsOverride = (path: string) => Partial<WidgetProps> | undefined;

interface Ctx {
  project?: Project;
  override?: PropsOverride;
  guard: number;
}

type Size = [number, number];

function propsOf(w: WidgetNode, path: string, cx: Ctx): WidgetProps {
  const o = cx.override?.(path);
  return o ? { ...w.props, ...o } : w.props;
}

function treeOf(cx: Ctx, classId: string | undefined): { cls: BlueprintClass; list: WidgetNode[] } | undefined {
  const cls = classId && cx.project ? findClass(cx.project, classId) : undefined;
  return cls?.widgets ? { cls, list: cls.widgets } : undefined;
}

function desired(w: WidgetNode, list: WidgetNode[], path: string, cx: Ctx): Size {
  const p = propsOf(w, path, cx);
  if (p.visibility === VIS_COLLAPSED) return [0, 0];
  const kids = () => widgetChildren(list, w.id).filter((c) => propsOf(c, `${prefix(path)}${c.id}`, cx).visibility !== VIS_COLLAPSED);
  const childSize = (c: WidgetNode): Size => desired(c, list, `${prefix(path)}${c.id}`, cx);
  switch (w.kind) {
    case 'TextBlock': {
      const lines = (p.text || ' ').split('\n');
      const px = fontPx(p.fontSize);
      return [Math.max(...lines.map((l) => l.length)) * px * CHAR_W, lines.length * px * LINE_H];
    }
    case 'ProgressBar':
      return [100, 20];
    case 'Image':
    case 'Spacer':
      return [p.sizeX, p.sizeY];
    case 'Button': {
      const c = kids()[0];
      if (!c) return [24, 24];
      const [cw, ch] = childSize(c);
      const pad = c.slot.padding;
      return [cw + pad[0] + pad[2], ch + pad[1] + pad[3]];
    }
    case 'VerticalBox':
    case 'HorizontalBox': {
      const vertical = w.kind === 'VerticalBox';
      let main = 0;
      let cross = 0;
      for (const c of kids()) {
        const [cw, ch] = childSize(c);
        const pad = c.slot.padding;
        const sw = cw + pad[0] + pad[2];
        const sh = ch + pad[1] + pad[3];
        main += vertical ? sh : sw;
        cross = Math.max(cross, vertical ? sw : sh);
      }
      return vertical ? [cross, main] : [main, cross];
    }
    case 'Overlay': {
      let dw = 0;
      let dh = 0;
      for (const c of kids()) {
        const [cw, ch] = childSize(c);
        const pad = c.slot.padding;
        dw = Math.max(dw, cw + pad[0] + pad[2]);
        dh = Math.max(dh, ch + pad[1] + pad[3]);
      }
      return [dw, dh];
    }
    case 'CanvasPanel': {
      let dw = 0;
      let dh = 0;
      for (const c of kids()) {
        const s = c.slot;
        const [cw, ch] = s.autoSize ? childSize(c) : [s.offsets[2], s.offsets[3]];
        if (!stretchedX(s)) dw = Math.max(dw, s.offsets[0] + cw);
        if (!stretchedY(s)) dh = Math.max(dh, s.offsets[1] + ch);
      }
      return [dw, dh];
    }
    case 'UserWidget': {
      const t = cx.guard < 8 ? treeOf(cx, w.classId) : undefined;
      const root = t && widgetRoot(t.list);
      if (!t || !root) return [0, 0];
      return desired(root, t.list, `${path}/${root.id}`, { ...cx, guard: cx.guard + 1 });
    }
  }
}

const prefix = (path: string): string => {
  const i = path.lastIndexOf('/');
  return i < 0 ? '' : path.slice(0, i + 1);
};

/** Place a size in a space along one axis, with an alignment (Fill takes it all). */
function align(start: number, space: number, size: number, how: string): [number, number] {
  if (how === 'Fill') return [start, space];
  const s = Math.min(size, space);
  if (how === 'Center') return [start + (space - s) / 2, s];
  if (how === 'Right' || how === 'Bottom') return [start + space - s, s];
  return [start, s];
}

function arrange(w: WidgetNode, list: WidgetNode[], classId: string, path: string, rect: Rect, depth: number, parentDrawn: boolean, cx: Ctx, out: LaidOutWidget[]): void {
  const props = propsOf(w, path, cx);
  const drawn = parentDrawn && props.visibility !== VIS_COLLAPSED && props.visibility !== VIS_HIDDEN;
  out.push({ path, widget: w, classId, rect, drawn, depth, props });
  const pre = prefix(path);
  const all = widgetChildren(list, w.id);
  const kids = all.filter((c) => propsOf(c, `${pre}${c.id}`, cx).visibility !== VIS_COLLAPSED);
  const place = (c: WidgetNode, r: Rect) => arrange(c, list, classId, `${pre}${c.id}`, r, depth + 1, drawn, cx, out);
  const size = (c: WidgetNode): Size => desired(c, list, `${pre}${c.id}`, cx);
  // A collapsed child takes no space: listed with an empty rectangle, never drawn.
  const collapsed = (c: WidgetNode) => arrange(c, list, classId, `${pre}${c.id}`, { x: rect.x, y: rect.y, w: 0, h: 0 }, depth + 1, false, cx, out);
  switch (w.kind) {
    case 'CanvasPanel': {
      // Drawing order: ZOrder, then the Hierarchy's order.
      const sorted = all.map((c, i) => ({ c, i })).sort((a, b) => a.c.slot.zOrder - b.c.slot.zOrder || a.i - b.i);
      for (const { c } of sorted) {
        if (!kids.includes(c)) {
          collapsed(c);
          continue;
        }
        const s = c.slot;
        const o = s.offsets;
        const [dw, dh] = s.autoSize ? size(c) : [o[2], o[3]];
        let x: number;
        let cw: number;
        if (stretchedX(s)) {
          x = rect.x + s.anchors.minX * rect.w + o[0];
          cw = rect.x + s.anchors.maxX * rect.w - o[2] - x;
        } else {
          cw = dw;
          x = rect.x + s.anchors.minX * rect.w + o[0] - s.alignX * cw;
        }
        let y: number;
        let ch: number;
        if (stretchedY(s)) {
          y = rect.y + s.anchors.minY * rect.h + o[1];
          ch = rect.y + s.anchors.maxY * rect.h - o[3] - y;
        } else {
          ch = dh;
          y = rect.y + s.anchors.minY * rect.h + o[1] - s.alignY * ch;
        }
        place(c, { x, y, w: Math.max(0, cw), h: Math.max(0, ch) });
      }
      return;
    }
    case 'VerticalBox':
    case 'HorizontalBox': {
      const vertical = w.kind === 'VerticalBox';
      const avail = vertical ? rect.h : rect.w;
      const sizes = kids.map((c) => size(c));
      const padMain = (c: WidgetNode) => (vertical ? c.slot.padding[1] + c.slot.padding[3] : c.slot.padding[0] + c.slot.padding[2]);
      let used = 0;
      let fills = 0;
      kids.forEach((c, i) => {
        if (c.slot.sizeRule === 'Fill') fills += c.slot.fill;
        else used += (vertical ? sizes[i][1] : sizes[i][0]) + padMain(c);
      });
      const left = Math.max(0, avail - used);
      let at = vertical ? rect.y : rect.x;
      for (const c of all) {
        if (!kids.includes(c)) {
          collapsed(c);
          continue;
        }
        const i = kids.indexOf(c);
        const [dw, dh] = sizes[i];
        const pad = c.slot.padding;
        const slotMain = c.slot.sizeRule === 'Fill' ? (fills > 0 ? (left * c.slot.fill) / fills : 0) : (vertical ? dh : dw) + padMain(c);
        if (vertical) {
          const [x, cw] = align(rect.x + pad[0], rect.w - pad[0] - pad[2], dw, c.slot.hAlign);
          const [y, ch] = align(at + pad[1], slotMain - pad[1] - pad[3], dh, c.slot.vAlign);
          place(c, { x, y, w: Math.max(0, cw), h: Math.max(0, ch) });
        } else {
          const [x, cw] = align(at + pad[0], slotMain - pad[0] - pad[2], dw, c.slot.hAlign);
          const [y, ch] = align(rect.y + pad[1], rect.h - pad[1] - pad[3], dh, c.slot.vAlign);
          place(c, { x, y, w: Math.max(0, cw), h: Math.max(0, ch) });
        }
        at += slotMain;
      }
      return;
    }
    case 'Overlay':
    case 'Button': {
      for (const c of all) {
        if (!kids.includes(c)) {
          collapsed(c);
          continue;
        }
        const [dw, dh] = size(c);
        const pad = c.slot.padding;
        const [x, cw] = align(rect.x + pad[0], rect.w - pad[0] - pad[2], dw, c.slot.hAlign);
        const [y, ch] = align(rect.y + pad[1], rect.h - pad[1] - pad[3], dh, c.slot.vAlign);
        place(c, { x, y, w: Math.max(0, cw), h: Math.max(0, ch) });
      }
      return;
    }
    case 'UserWidget': {
      const t = cx.guard < 8 ? treeOf(cx, w.classId) : undefined;
      const root = t && widgetRoot(t.list);
      if (t && root) arrange(root, t.list, t.cls.id, `${path}/${root.id}`, rect, depth + 1, drawn, { ...cx, guard: cx.guard + 1 }, out);
      return;
    }
    default:
      return;
  }
}

/**
 * Lay a Widget Blueprint out on a screen of `width` × `height`: its root fills
 * the screen, as a widget added to the viewport does. Widgets come out in
 * drawing order (parents before children, Canvas children by ZOrder).
 */
export function layoutWidgets(cls: BlueprintClass, width: number, height: number, project?: Project, override?: PropsOverride, prefixPath = ''): LaidOutWidget[] {
  const list = cls.widgets ?? [];
  const root = widgetRoot(list);
  const out: LaidOutWidget[] = [];
  if (root) arrange(root, list, cls.id, `${prefixPath}${root.id}`, { x: 0, y: 0, w: width, h: height }, 0, true, { project, override, guard: 0 }, out);
  return out;
}
