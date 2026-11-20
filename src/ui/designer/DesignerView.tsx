/**
 * The Designer of a Widget Blueprint, as UE's Visual Designer: the screen
 * (1280 × 720 here) scaled to the phone, the widgets as the game will draw
 * them, panels outlined in dashes. Touch a widget to select it (Details),
 * drag one placed in a Canvas Panel to move it, keep the finger on it (or
 * touch twice) to open its Details. Two fingers zoom and move the view; one
 * finger on the background, or on a widget that cannot move, moves the view.
 */
import { forwardRef } from 'preact/compat';
import { useEffect, useImperativeHandle, useReducer, useRef } from 'preact/hooks';
import { widgetRoot } from '@core/model/widgets';
import { moveWidgetBy, roundWidgetOffsets } from '@core/operations/widgetOps';
import { DESIGN_H, DESIGN_W, layoutWidgets } from '@core/umg/layout';
import { BOTTOM_BAR, FAB_RAIL } from '@editor/framing';
import { haptic } from '@editor/haptics';
import { useStore } from '../hooks';
import { WidgetSurface } from '../umg/WidgetSurface';

interface Props {
  onOpenDetails: () => void;
  onOpenPalette: () => void;
}

export interface DesignerHandle {
  fitView(): void;
}

const PAD = 12;
const DRAG_START = 6;
const LONG_PRESS = 480;
const MAX_ZOOM = 5;

type Pt = { x: number; y: number };
type Gesture =
  | { mode: 'idle' }
  | { mode: 'press'; id?: string; movable: boolean; start: Pt; last: Pt; timer: number }
  | { mode: 'drag'; id: string; last: Pt }
  | { mode: 'pan'; last: Pt }
  | { mode: 'pinch'; dist: number; mid: Pt };

export const DesignerView = forwardRef<DesignerHandle, Props>(function DesignerView({ onOpenDetails, onOpenPalette }, ref) {
  const store = useStore();
  const wrap = useRef<HTMLDivElement>(null);
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  // The view: screen = t + design × fit × zoom. Fitted: centred, recomputed when the size changes.
  const view = useRef({ w: 0, h: 0, zoom: 1, tx: 0, ty: 0, fitted: true });
  const pointers = useRef(new Map<number, Pt>());
  const g = useRef<Gesture>({ mode: 'idle' });
  const lastTap = useRef<{ id: string; at: number } | null>(null);
  const cb = useRef({ onOpenDetails, onOpenPalette });
  cb.current = { onOpenDetails, onOpenPalette };

  const fitScale = () => {
    const v = view.current;
    const availW = Math.max(0, v.w - FAB_RAIL - 2 * PAD);
    const availH = Math.max(0, v.h - BOTTOM_BAR - 2 * PAD);
    return { s: Math.min(availW / DESIGN_W, availH / DESIGN_H) || 0, availW, availH };
  };
  const scale = () => fitScale().s * view.current.zoom;
  const recenter = () => {
    const v = view.current;
    const { s, availW, availH } = fitScale();
    v.zoom = 1;
    v.tx = PAD + (availW - DESIGN_W * s) / 2;
    v.ty = PAD + (availH - DESIGN_H * s) / 2;
    v.fitted = true;
  };

  useImperativeHandle(ref, () => ({
    fitView() {
      recenter();
      redraw(0);
    },
  }));

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      view.current.w = r.width;
      view.current.h = r.height;
      if (view.current.fitted) recenter();
      redraw(0);
    });
    ro.observe(el);

    const two = (): [Pt, Pt] => {
      const [a, b] = [...pointers.current.values()];
      return [a, b];
    };
    const endPress = () => {
      const cur = g.current;
      if (cur.mode === 'press') window.clearTimeout(cur.timer);
    };
    const finishDrag = () => {
      const cur = g.current;
      if (cur.mode !== 'drag') return;
      roundWidgetOffsets(store.cls, cur.id);
      store.commit();
    };

    const move = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const cur = g.current;
      const v = view.current;
      const p = { x: e.clientX, y: e.clientY };
      if (cur.mode === 'pinch') {
        const [a, b] = two();
        if (!a || !b) return;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const r = el.getBoundingClientRect();
        const s0 = scale();
        const zoom = Math.max(1, Math.min(MAX_ZOOM, (v.zoom * dist) / Math.max(1, cur.dist)));
        const s1 = fitScale().s * zoom;
        // The point under the fingers stays under them, and follows them.
        const dx = (cur.mid.x - r.left - v.tx) / s0;
        const dy = (cur.mid.y - r.top - v.ty) / s0;
        v.zoom = zoom;
        v.tx = mid.x - r.left - dx * s1;
        v.ty = mid.y - r.top - dy * s1;
        v.fitted = false;
        g.current = { mode: 'pinch', dist, mid };
        redraw(0);
        return;
      }
      if (cur.mode === 'press') {
        if (Math.hypot(p.x - cur.start.x, p.y - cur.start.y) < DRAG_START) return;
        endPress();
        if (cur.id && cur.movable) {
          const w = (store.cls.widgets ?? []).find((x) => x.id === cur.id);
          store.begin(`Déplacer ${w?.name ?? 'le widget'}`);
          g.current = { mode: 'drag', id: cur.id, last: cur.last };
        } else g.current = { mode: 'pan', last: cur.last };
      }
      const now = g.current;
      if (now.mode === 'drag') {
        moveWidgetBy(store.cls, now.id, (p.x - now.last.x) / scale(), (p.y - now.last.y) / scale());
        now.last = p;
        store.touch();
      } else if (now.mode === 'pan') {
        v.tx += p.x - now.last.x;
        v.ty += p.y - now.last.y;
        v.fitted = false;
        now.last = p;
        redraw(0);
      }
    };
    const up = (e: PointerEvent) => {
      if (!pointers.current.delete(e.pointerId)) return;
      const cur = g.current;
      if (pointers.current.size === 0) {
        endPress();
        finishDrag();
        g.current = { mode: 'idle' };
      } else if (cur.mode === 'pinch') {
        // One finger left: it goes on moving the view.
        const [rest] = [...pointers.current.values()];
        g.current = { mode: 'pan', last: rest };
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      ro.disconnect();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [store]);

  /** Every finger that lands: a second one turns any gesture into a pinch. */
  const onDownCapture = (e: PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const cur = g.current;
    if (pointers.current.size === 2) {
      if (cur.mode === 'press') window.clearTimeout(cur.timer);
      if (cur.mode === 'drag') {
        roundWidgetOffsets(store.cls, cur.id);
        store.commit();
      }
      const [a, b] = [...pointers.current.values()];
      g.current = { mode: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    } else if (pointers.current.size === 1) {
      const p = { x: e.clientX, y: e.clientY };
      g.current = { mode: 'press', movable: false, start: p, last: p, timer: 0 };
    }
  };

  /** A touch on the background: nothing selected. */
  const onDownBackground = () => {
    if (pointers.current.size === 1 && store.focus.kind === 'widget') store.setFocus({ kind: 'none' });
  };

  /** A touch on a widget: select it (inside a User Widget, the User Widget), then a drag or a long press. */
  const onWidgetDown = (path: string, e: PointerEvent) => {
    e.stopPropagation();
    const cur = g.current;
    if (pointers.current.size > 1 || cur.mode !== 'press') return;
    const cls = store.cls;
    const id = path.split('/')[0];
    const w = (cls.widgets ?? []).find((x) => x.id === id);
    if (!w) return;
    const now = Date.now();
    const twice = lastTap.current?.id === id && now - lastTap.current.at < 400;
    lastTap.current = { id, at: now };
    if (store.focus.kind !== 'widget' || store.focus.id !== id) haptic('tap');
    store.setFocus({ kind: 'widget', id });
    if (twice) {
      cb.current.onOpenDetails();
      return;
    }
    const parent = w.parent ? (cls.widgets ?? []).find((x) => x.id === w.parent) : undefined;
    cur.id = id;
    cur.movable = parent?.kind === 'CanvasPanel';
    cur.timer = window.setTimeout(() => {
      if (g.current !== cur) return;
      g.current = { mode: 'idle' };
      haptic('press');
      cb.current.onOpenDetails();
    }, LONG_PRESS);
  };

  const cls = store.cls;
  const laid = layoutWidgets(cls, DESIGN_W, DESIGN_H, store.project);
  const v = view.current;
  const s = scale();
  const f = store.focus;
  const selected = f.kind === 'widget' ? f.id : undefined;
  const empty = !widgetRoot(cls.widgets ?? []);

  return (
    <div class="designer" ref={wrap} onPointerDownCapture={onDownCapture} onPointerDown={onDownBackground}>
      {s > 0 && (
        <div class="designer-screen" style={{ left: `${v.tx}px`, top: `${v.ty}px`, width: `${DESIGN_W * s}px`, height: `${DESIGN_H * s}px` }}>
          <WidgetSurface laid={laid} scale={s} designer={{ selected, onPointerDown: onWidgetDown }} />
          {empty && (
            <button class="designer-empty" onPointerDown={(e) => e.stopPropagation()} onClick={() => cb.current.onOpenPalette()}>
              <strong>Ce Widget Blueprint est vide.</strong>
              <span>Ouvre la Palette (à gauche) et touche un widget : le premier devient la racine. Pour placer librement, commence par un Canvas Panel.</span>
            </button>
          )}
          <span class="designer-size app-only" title="Taille d’écran de référence de BP Trainer">
            {DESIGN_W} × {DESIGN_H} · aperçu ×{s.toFixed(2).replace('.', ',')}
          </span>
        </div>
      )}
    </div>
  );
});
