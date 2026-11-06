/** Paints one node, in world coordinates (the caller applies the camera). */
import type { PinSpec } from '@core/nodes/definition';
import type { NodeGeom } from '../layout';
import { GRAPH, HEADER_COLOR, METRICS } from '../theme';
import { drawClock, drawPin, roundRect } from './primitives';

export interface NodePaintState {
  selected: boolean;
  error: boolean;
  pendingPin?: string;
  /** Returns false for pins a wire being dragged cannot plug into. */
  pinEnabled?: (p: PinSpec) => boolean;
  breakpoint?: boolean;
  /** Execution is stopped just before this node. */
  paused?: boolean;
  /** 1 when the node just ran, fading to 0. */
  heat?: number;
}

export function drawNode(c: CanvasRenderingContext2D, g: NodeGeom, s: NodePaintState): void {
  const { x, y } = g.node;
  const r = g.style === 'getter' ? g.h / 2 : METRICS.radius;

  // Body
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.55)';
  c.shadowBlur = 10;
  c.shadowOffsetY = 3;
  roundRect(c, x, y, g.w, g.h, r);
  c.fillStyle = GRAPH.nodeBody;
  c.fill();
  c.restore();

  // Header
  if (g.style === 'standard' && g.def) {
    const [top, bottom] = HEADER_COLOR[g.def.kind];
    const grad = c.createLinearGradient(x, y, x + g.w, y);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    c.save();
    roundRect(c, x, y, g.w, g.h, r);
    c.clip();
    c.fillStyle = grad;
    c.fillRect(x, y, g.w, g.headerH);
    c.restore();
    c.fillStyle = GRAPH.text;
    c.font = METRICS.font;
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    const tx = x + METRICS.padX + (g.def.kind === 'latent' ? 20 : 0);
    if (g.def.kind === 'latent') drawClock(c, x + METRICS.padX + 7, y + g.headerH / 2);
    c.fillText(g.title, tx, y + g.headerH / 2 + 0.5);
  } else if (g.style === 'compact') {
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.font = METRICS.symbolFont;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const leftEdge = Math.max(...g.pins.filter((p) => p.spec.dir === 'in').map((p) => (p.value ? p.value.x + p.value.w : 18)), 18);
    c.fillText(g.def?.symbol ?? g.title, x + (leftEdge + g.w - 14) / 2, y + g.h / 2 + 1);
  } else if (g.style === 'getter') {
    c.fillStyle = GRAPH.text;
    c.font = METRICS.font;
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillText(g.title, x + 14, y + g.h / 2 + 0.5);
  }

  // Outline
  if (s.heat && s.heat > 0) {
    roundRect(c, x - 3, y - 3, g.w + 6, g.h + 6, r + 3);
    c.lineWidth = 4;
    c.strokeStyle = `rgba(255, 214, 90, ${0.75 * s.heat})`;
    c.stroke();
  }
  roundRect(c, x, y, g.w, g.h, r);
  c.lineWidth = s.paused ? 4 : s.selected || s.error ? 2.5 : 1;
  c.strokeStyle = s.paused ? GRAPH.paused : s.error ? GRAPH.error : s.selected ? GRAPH.selected : GRAPH.nodeBorder;
  c.stroke();
  if (s.paused) drawPausedArrow(c, x + g.w / 2, y - 6);
  if (s.breakpoint) {
    c.beginPath();
    c.arc(x + 1, y + 1, 7, 0, Math.PI * 2);
    c.fillStyle = GRAPH.breakpoint;
    c.fill();
    c.lineWidth = 1.5;
    c.strokeStyle = '#2a0000';
    c.stroke();
  }

  // Pins
  c.font = METRICS.labelFont;
  c.textBaseline = 'middle';
  for (const p of g.pins) {
    const px = x + p.x;
    const py = y + p.y;
    const enabled = s.pinEnabled ? s.pinEnabled(p.spec) : true;
    const alpha = enabled ? 1 : 0.25;
    if (s.pendingPin === p.spec.id) {
      c.save();
      c.strokeStyle = GRAPH.pending;
      c.lineWidth = 2;
      c.beginPath();
      c.arc(px, py, 11, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
    drawPin(c, px, py, p.spec.type, p.linked, alpha);
    c.globalAlpha = alpha;
    if (!p.spec.hideName && p.spec.name) {
      c.fillStyle = GRAPH.text;
      if (p.spec.dir === 'in') {
        c.textAlign = 'left';
        c.fillText(p.spec.name, x + p.labelX, py);
      } else {
        c.textAlign = 'right';
        c.fillText(p.spec.name, x + p.labelX, py);
      }
    }
    if (p.value) drawValueBox(c, x, y, p);
    else if (p.spec.dir === 'in' && p.spec.defaultsToSelf && !p.linked) {
      c.fillStyle = GRAPH.textDim;
      c.textAlign = 'left';
      const lw = c.measureText(p.spec.name).width;
      c.fillText('self', x + p.labelX + lw + 8, py);
    }
    c.globalAlpha = 1;
  }
}

/** The big arrow UE shows above the node where execution stopped. */
function drawPausedArrow(c: CanvasRenderingContext2D, cx: number, bottom: number): void {
  c.beginPath();
  c.moveTo(cx, bottom);
  c.lineTo(cx - 13, bottom - 16);
  c.lineTo(cx - 5, bottom - 16);
  c.lineTo(cx - 5, bottom - 30);
  c.lineTo(cx + 5, bottom - 30);
  c.lineTo(cx + 5, bottom - 16);
  c.lineTo(cx + 13, bottom - 16);
  c.closePath();
  c.fillStyle = GRAPH.paused;
  c.fill();
  c.lineWidth = 1.5;
  c.strokeStyle = '#3a2c00';
  c.stroke();
}

function drawValueBox(c: CanvasRenderingContext2D, nx: number, ny: number, p: NodeGeom['pins'][number]): void {
  const v = p.value!;
  const bx = nx + v.x;
  const by = ny + v.y;
  if (p.spec.type.category === 'bool') {
    roundRect(c, bx, by + 1, 16, 16, 3);
    c.fillStyle = GRAPH.valueBg;
    c.fill();
    c.strokeStyle = GRAPH.valueBorder;
    c.lineWidth = 1;
    c.stroke();
    if (v.text === 'true') {
      c.strokeStyle = '#ffffff';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(bx + 3.5, by + 9.5);
      c.lineTo(bx + 7, by + 13);
      c.lineTo(bx + 13, by + 5);
      c.stroke();
    }
    return;
  }
  roundRect(c, bx, by, v.w, v.h, 3);
  c.fillStyle = GRAPH.valueBg;
  c.fill();
  c.strokeStyle = GRAPH.valueBorder;
  c.lineWidth = 1;
  c.stroke();
  c.save();
  c.beginPath();
  c.rect(bx + 2, by, v.w - 4, v.h);
  c.clip();
  c.fillStyle = GRAPH.text;
  c.textAlign = 'left';
  c.fillText(v.text, bx + 6, by + v.h / 2 + 0.5);
  c.restore();
}
