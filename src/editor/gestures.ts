/**
 * Touch (and mouse) gestures on the graph canvas, turned into intents:
 * tap, double tap, long press, drag (node, wire, pan, rectangle), pinch.
 *
 * The controller decides *what kind* of gesture is happening; the host
 * (GraphCanvas) decides what it means for the model.
 */
import type { Hit } from './hit';

export interface GestureHost {
  hitAt(sx: number, sy: number): Hit;
  selectionMode(): boolean;
  onTap(hit: Hit, sx: number, sy: number): void;
  onDoubleTap(hit: Hit, sx: number, sy: number): void;
  onLongPress(hit: Hit, sx: number, sy: number): void;
  onPan(dx: number, dy: number): void;
  onPinch(cx: number, cy: number, factor: number, dx: number, dy: number): void;
  onNodeDragStart(nodeId: string, resize?: boolean): void;
  onNodeDrag(dsx: number, dsy: number): void;
  onNodeDragEnd(): void;
  onWireStart(hit: Extract<Hit, { kind: 'pin' }>, sx: number, sy: number): void;
  onWireMove(sx: number, sy: number): void;
  onWireEnd(sx: number, sy: number): void;
  onWireCancel(): void;
  onRectStart(sx: number, sy: number): void;
  onRectMove(sx: number, sy: number): void;
  onRectEnd(): void;
}

type Mode = 'idle' | 'pending' | 'pan' | 'node' | 'wire' | 'rect' | 'pinch' | 'consumed';

const DRAG_SLOP = 8;
const LONG_PRESS_MS = 450;
const DOUBLE_TAP_MS = 320;

export class GestureController {
  private pointers = new Map<number, { x: number; y: number }>();
  private mode: Mode = 'idle';
  private start = { x: 0, y: 0 };
  private last = { x: 0, y: 0 };
  private startHit: Hit = { kind: 'empty' };
  private longTimer: number | undefined;
  private lastTap = { t: 0, x: 0, y: 0 };
  private pinchPrev = { d: 0, cx: 0, cy: 0 };

  constructor(
    private readonly el: HTMLElement,
    private readonly host: GestureHost,
  ) {
    el.addEventListener('pointerdown', this.down);
    el.addEventListener('pointermove', this.move);
    el.addEventListener('pointerup', this.up);
    el.addEventListener('pointercancel', this.cancel);
    el.addEventListener('wheel', this.wheel, { passive: false });
    el.addEventListener('contextmenu', this.contextMenu);
  }

  dispose(): void {
    this.el.removeEventListener('pointerdown', this.down);
    this.el.removeEventListener('pointermove', this.move);
    this.el.removeEventListener('pointerup', this.up);
    this.el.removeEventListener('pointercancel', this.cancel);
    this.el.removeEventListener('wheel', this.wheel);
    this.el.removeEventListener('contextmenu', this.contextMenu);
    this.clearLong();
  }

  private local(e: PointerEvent | MouseEvent): { x: number; y: number } {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private down = (e: PointerEvent): void => {
    this.el.setPointerCapture(e.pointerId);
    const p = this.local(e);
    this.pointers.set(e.pointerId, p);

    if (this.pointers.size === 2) {
      this.abortSingle();
      this.mode = 'pinch';
      this.pinchPrev = this.pinchState();
      return;
    }
    if (this.pointers.size > 2) return;

    this.mode = 'pending';
    this.start = p;
    this.last = p;
    this.startHit = this.host.hitAt(p.x, p.y);
    this.clearLong();
    this.longTimer = window.setTimeout(() => {
      if (this.mode !== 'pending') return;
      this.mode = 'consumed';
      navigator.vibrate?.(12);
      this.host.onLongPress(this.startHit, this.start.x, this.start.y);
    }, LONG_PRESS_MS);
  };

  private move = (e: PointerEvent): void => {
    if (!this.pointers.has(e.pointerId)) return;
    const p = this.local(e);
    this.pointers.set(e.pointerId, p);

    if (this.mode === 'pinch' && this.pointers.size >= 2) {
      const now = this.pinchState();
      const factor = this.pinchPrev.d > 0 ? now.d / this.pinchPrev.d : 1;
      this.host.onPinch(now.cx, now.cy, factor, now.cx - this.pinchPrev.cx, now.cy - this.pinchPrev.cy);
      this.pinchPrev = now;
      return;
    }

    if (this.mode === 'pending') {
      if (Math.hypot(p.x - this.start.x, p.y - this.start.y) < DRAG_SLOP) return;
      this.clearLong();
      this.beginDrag();
    }

    const dx = p.x - this.last.x;
    const dy = p.y - this.last.y;
    this.last = p;
    switch (this.mode) {
      case 'pan':
        this.host.onPan(dx, dy);
        break;
      case 'node':
        this.host.onNodeDrag(dx, dy);
        break;
      case 'wire':
        this.host.onWireMove(p.x, p.y);
        break;
      case 'rect':
        this.host.onRectMove(p.x, p.y);
        break;
    }
  };

  private beginDrag(): void {
    const h = this.startHit;
    if (h.kind === 'pin') {
      this.mode = 'wire';
      this.host.onWireStart(h, this.start.x, this.start.y);
    } else if (h.kind === 'node' || h.kind === 'value' || h.kind === 'resize') {
      this.mode = 'node';
      this.host.onNodeDragStart(h.node, h.kind === 'resize');
    } else if (this.host.selectionMode()) {
      this.mode = 'rect';
      this.host.onRectStart(this.start.x, this.start.y);
    } else {
      this.mode = 'pan';
    }
  }

  private up = (e: PointerEvent): void => {
    if (!this.pointers.has(e.pointerId)) return;
    const p = this.local(e);
    this.pointers.delete(e.pointerId);
    this.clearLong();

    if (this.mode === 'pinch') {
      // Lifting one finger of a pinch ends the gesture without a tap.
      if (this.pointers.size === 0) this.mode = 'idle';
      else this.mode = 'consumed';
      return;
    }
    if (this.pointers.size > 0) return;

    switch (this.mode) {
      case 'pending': {
        const now = performance.now();
        const isDouble =
          now - this.lastTap.t < DOUBLE_TAP_MS && Math.hypot(p.x - this.lastTap.x, p.y - this.lastTap.y) < 24;
        if (isDouble) {
          this.lastTap = { t: 0, x: 0, y: 0 };
          this.host.onDoubleTap(this.startHit, p.x, p.y);
        } else {
          this.lastTap = { t: now, x: p.x, y: p.y };
          this.host.onTap(this.startHit, p.x, p.y);
        }
        break;
      }
      case 'node':
        this.host.onNodeDragEnd();
        break;
      case 'wire':
        this.host.onWireEnd(p.x, p.y);
        break;
      case 'rect':
        this.host.onRectEnd();
        break;
    }
    this.mode = 'idle';
  };

  private cancel = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
    this.abortSingle();
    if (this.pointers.size === 0) this.mode = 'idle';
  };

  /** Stop a one-finger gesture cleanly (a second finger landed). */
  private abortSingle(): void {
    this.clearLong();
    if (this.mode === 'node') this.host.onNodeDragEnd();
    if (this.mode === 'wire') this.host.onWireCancel();
    if (this.mode === 'rect') this.host.onRectEnd();
  }

  private pinchState(): { d: number; cx: number; cy: number } {
    const [a, b] = [...this.pointers.values()];
    return { d: Math.hypot(b.x - a.x, b.y - a.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  }

  private clearLong(): void {
    if (this.longTimer !== undefined) window.clearTimeout(this.longTimer);
    this.longTimer = undefined;
  }

  /** Mouse wheel / trackpad zoom, for testing on a computer. */
  private wheel = (e: WheelEvent): void => {
    e.preventDefault();
    const p = this.local(e);
    if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      this.host.onPinch(p.x, p.y, Math.exp(-e.deltaY * 0.0015), 0, 0);
    } else {
      this.host.onPan(-e.deltaX, -e.deltaY);
    }
  };

  /** Right click on a computer = long press on a phone. */
  private contextMenu = (e: MouseEvent): void => {
    e.preventDefault();
    if (this.mode === 'consumed') return;
    const p = this.local(e);
    this.clearLong();
    this.mode = 'consumed';
    this.host.onLongPress(this.host.hitAt(p.x, p.y), p.x, p.y);
  };
}
