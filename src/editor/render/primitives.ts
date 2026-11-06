/** Small canvas helpers shared by the node and link painters. */
import { METRICS, PIN_COLOR } from '../theme';
import type { PinType } from '@core/types/pins';

export function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

export function pinColor(t: PinType): string {
  return PIN_COLOR[t.category] ?? PIN_COLOR.wildcard;
}

/** UE draws exec pins as an arrow-shaped pentagon, data pins as circles. */
export function drawPin(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  t: PinType,
  filled: boolean,
  alpha = 1,
): void {
  const color = pinColor(t);
  c.save();
  c.globalAlpha = alpha;
  c.lineWidth = 1.6;
  c.strokeStyle = color;
  c.fillStyle = color;
  if (t.category === 'exec') {
    const s = 6;
    c.beginPath();
    c.moveTo(x - s, y - s);
    c.lineTo(x + 1, y - s);
    c.lineTo(x + s + 1, y);
    c.lineTo(x + 1, y + s);
    c.lineTo(x - s, y + s);
    c.closePath();
    if (filled) c.fill();
    else c.stroke();
  } else if (t.container === 'array') {
    const s = 3;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) c.fillRect(x + i * 4 - s / 2, y + j * 4 - s / 2, s, s);
  } else {
    c.beginPath();
    c.arc(x, y, METRICS.pinR, 0, Math.PI * 2);
    if (filled) c.fill();
    else c.stroke();
  }
  c.restore();
}

/** Small clock drawn on latent nodes (Delay…). */
export function drawClock(c: CanvasRenderingContext2D, x: number, y: number): void {
  c.save();
  c.strokeStyle = '#ffffff';
  c.lineWidth = 1.5;
  c.beginPath();
  c.arc(x, y, 7, 0, Math.PI * 2);
  c.moveTo(x, y);
  c.lineTo(x, y - 4.5);
  c.moveTo(x, y);
  c.lineTo(x + 3.5, y + 1.5);
  c.stroke();
  c.restore();
}

/** Bezier from an output (left→right) to an input, like UE's wires. */
export function wirePath(c: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
  c.beginPath();
  c.moveTo(x1, y1);
  c.bezierCurveTo(x1 + dx, y1, x2 - dx, y2, x2, y2);
}

export function bezierPoint(x1: number, y1: number, x2: number, y2: number, t: number): { x: number; y: number } {
  const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
  const p1x = x1 + dx,
    p2x = x2 - dx;
  const u = 1 - t;
  return {
    x: u * u * u * x1 + 3 * u * u * t * p1x + 3 * u * t * t * p2x + t * t * t * x2,
    y: u * u * u * y1 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y2,
  };
}
