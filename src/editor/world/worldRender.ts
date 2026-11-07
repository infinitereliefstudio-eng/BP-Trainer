/**
 * Top-view drawing of the level, for editing (all components shown) and
 * for Play (hidden components and editor-only icons are not rendered, like in game).
 */
import { componentShape } from '@core/runtime/physics';
import { componentTransform, PLAYER_RADIUS, type ActorRT } from '@core/runtime/world';
import type { Camera } from '../camera';

export const WORLD = {
  floor: '#1b1d21',
  gridMinor: '#23262b',
  gridMajor: '#2d3138',
  axis: '#3a404a',
  label: '#9aa3b2',
  zone: 'rgba(230,230,230,0.45)',
  zoneHot: '#f2a516',
  selected: '#2c7be5',
  player: '#3fa7ff',
  start: '#3fbf5a',
};

export interface WorldScene {
  actors: ActorRT[];
  player?: ActorRT;
  playerStart?: { x: number; y: number; yaw: number };
  camera: Camera;
  width: number;
  height: number;
  playing: boolean;
  selectedId?: string;
}

const DEG = Math.PI / 180;

export function renderWorld(c: CanvasRenderingContext2D, s: WorldScene, dpr: number): void {
  const cam = s.camera;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.fillStyle = WORLD.floor;
  c.fillRect(0, 0, s.width, s.height);
  c.setTransform(dpr * cam.zoom, 0, 0, dpr * cam.zoom, -dpr * cam.x * cam.zoom, -dpr * cam.y * cam.zoom);
  drawGrid(c, s);

  // Light halos first, so meshes sit on top of the light they cast.
  const shown = s.playing ? s.actors.filter((a) => !a.hidden) : s.actors;
  for (const a of shown) {
    for (const comp of a.components) {
      if (comp.kind !== 'PointLight') continue;
      const on = comp.props.visible && comp.props.intensity > 0;
      const t = componentTransform(a, comp);
      if (on) {
        const strength = Math.min(1, comp.props.intensity / 5000) * 0.55;
        const g = c.createRadialGradient(t.x, t.y, 0, t.x, t.y, Math.max(20, comp.props.radius));
        g.addColorStop(0, hexA(comp.props.color, strength));
        g.addColorStop(1, hexA(comp.props.color, 0));
        c.fillStyle = g;
        c.beginPath();
        c.arc(t.x, t.y, Math.max(20, comp.props.radius), 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  for (const a of shown) drawActor(c, a, s);

  if (!s.playing && s.playerStart) drawPlayerStart(c, s.playerStart, cam.zoom, s.selectedId === 'playerStart');
  if (s.player && !s.player.hidden) drawPlayer(c, s.player);
}

function drawGrid(c: CanvasRenderingContext2D, s: WorldScene): void {
  const cam = s.camera;
  const x0 = cam.x,
    y0 = cam.y;
  const x1 = x0 + s.width / cam.zoom,
    y1 = y0 + s.height / cam.zoom;
  const step = cam.zoom > 0.25 ? 50 : 100;
  c.lineWidth = 1 / cam.zoom;
  for (const major of [false, true]) {
    c.strokeStyle = major ? WORLD.gridMajor : WORLD.gridMinor;
    c.beginPath();
    for (let x = Math.floor(x0 / step) * step; x <= x1; x += step) {
      if ((Math.round(x) % 100 === 0) !== major) continue;
      c.moveTo(x, y0);
      c.lineTo(x, y1);
    }
    for (let y = Math.floor(y0 / step) * step; y <= y1; y += step) {
      if ((Math.round(y) % 100 === 0) !== major) continue;
      c.moveTo(x0, y);
      c.lineTo(x1, y);
    }
    c.stroke();
  }
  c.strokeStyle = WORLD.axis;
  c.lineWidth = 2 / cam.zoom;
  c.beginPath();
  c.moveTo(x0, 0);
  c.lineTo(x1, 0);
  c.moveTo(0, y0);
  c.lineTo(0, y1);
  c.stroke();
}

function drawActor(c: CanvasRenderingContext2D, a: ActorRT, s: WorldScene): void {
  const z = s.camera.zoom;
  for (const comp of a.components) {
    const hidden = !comp.props.visible;
    if (comp.kind === 'StaticMesh') {
      if (hidden && s.playing) continue;
      const shape = componentShape(a, comp);
      if (!shape) continue;
      c.save();
      c.globalAlpha = hidden ? 0.35 : 1;
      c.fillStyle = comp.props.color;
      c.strokeStyle = 'rgba(0,0,0,0.55)';
      c.lineWidth = 2 / z;
      if (shape.kind === 'circle') {
        c.beginPath();
        c.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      } else {
        c.translate(shape.cx, shape.cy);
        c.rotate(shape.angle);
        c.fillRect(-shape.hx, -shape.hy, shape.hx * 2, shape.hy * 2);
        c.strokeRect(-shape.hx, -shape.hy, shape.hx * 2, shape.hy * 2);
        if (comp.props.shape === 'door') {
          c.fillStyle = 'rgba(0,0,0,0.5)';
          c.beginPath();
          c.arc(-shape.hx, 0, Math.max(4, shape.hy * 0.6), 0, Math.PI * 2);
          c.fill();
        }
      }
      c.restore();
    } else if (comp.kind === 'BoxCollision') {
      const shape = componentShape(a, comp);
      if (!shape || shape.kind !== 'obb') continue;
      const hot = [...a.compOverlaps].some((k) => k.startsWith(`${comp.id}|`));
      c.save();
      c.translate(shape.cx, shape.cy);
      c.rotate(shape.angle);
      c.setLineDash([10 / z, 7 / z]);
      c.lineWidth = (hot ? 2.5 : 1.5) / z;
      c.strokeStyle = hot ? WORLD.zoneHot : WORLD.zone;
      if (hot) {
        c.fillStyle = 'rgba(242,165,22,0.08)';
        c.fillRect(-shape.hx, -shape.hy, shape.hx * 2, shape.hy * 2);
      }
      c.strokeRect(-shape.hx, -shape.hy, shape.hx * 2, shape.hy * 2);
      c.restore();
    } else if (comp.kind === 'PointLight') {
      // The bulb icon is an editor sprite, as in UE: in game a light is only its glow.
      if (s.playing) continue;
      const t = componentTransform(a, comp);
      const on = comp.props.visible && comp.props.intensity > 0;
      c.beginPath();
      c.arc(t.x, t.y, 9 / Math.max(z, 0.4), 0, Math.PI * 2);
      c.fillStyle = on ? comp.props.color : '#3b3f46';
      c.fill();
      c.lineWidth = 1.5 / z;
      c.strokeStyle = on ? '#fff3c4' : '#6b7280';
      c.stroke();
    } else if (comp.kind === 'TextRender') {
      if (hidden && s.playing) continue;
      const t = componentTransform(a, comp);
      c.save();
      c.globalAlpha = hidden ? 0.35 : 1;
      c.fillStyle = comp.props.color;
      c.font = `600 ${Math.max(14, 18 / z)}px system-ui, sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(comp.props.text, t.x, t.y);
      c.restore();
    }
  }

  const r = actorRadius(a);
  if (s.selectedId === a.id) {
    c.save();
    c.strokeStyle = WORLD.selected;
    c.lineWidth = 2.5 / z;
    c.setLineDash([]);
    c.beginPath();
    c.arc(a.x, a.y, r + 12 / z, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }
  if (!s.playing) {
    c.fillStyle = WORLD.label;
    c.font = `${12 / z}px system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'top';
    c.fillText(a.label, a.x, a.y + r + 6 / z);
  }
}

function drawPlayer(c: CanvasRenderingContext2D, p: ActorRT): void {
  c.save();
  c.fillStyle = WORLD.player;
  c.strokeStyle = '#ffffff';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  const a = p.yaw * DEG;
  c.beginPath();
  c.moveTo(p.x + Math.cos(a) * PLAYER_RADIUS * 1.5, p.y + Math.sin(a) * PLAYER_RADIUS * 1.5);
  c.lineTo(p.x + Math.cos(a + 2.5) * PLAYER_RADIUS * 0.7, p.y + Math.sin(a + 2.5) * PLAYER_RADIUS * 0.7);
  c.lineTo(p.x + Math.cos(a - 2.5) * PLAYER_RADIUS * 0.7, p.y + Math.sin(a - 2.5) * PLAYER_RADIUS * 0.7);
  c.closePath();
  c.fillStyle = '#ffffff';
  c.fill();
  c.restore();
}

function drawPlayerStart(c: CanvasRenderingContext2D, ps: { x: number; y: number; yaw: number }, z: number, selected: boolean): void {
  c.save();
  c.strokeStyle = selected ? WORLD.selected : WORLD.start;
  c.lineWidth = 2.5 / z;
  c.setLineDash([6 / z, 5 / z]);
  c.beginPath();
  c.arc(ps.x, ps.y, PLAYER_RADIUS, 0, Math.PI * 2);
  c.stroke();
  c.setLineDash([]);
  const a = ps.yaw * DEG;
  c.beginPath();
  c.moveTo(ps.x, ps.y);
  c.lineTo(ps.x + Math.cos(a) * 60, ps.y + Math.sin(a) * 60);
  c.stroke();
  c.fillStyle = WORLD.label;
  c.font = `${12 / z}px system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'top';
  c.fillText('Player Start', ps.x, ps.y + PLAYER_RADIUS + 6 / z);
  c.restore();
}

/** Rough size of an actor, for selection and hit-testing. */
export function actorRadius(a: ActorRT): number {
  let r = 40;
  for (const comp of a.components) {
    const t = componentTransform(a, comp);
    const off = Math.hypot(t.x - a.x, t.y - a.y);
    const ext = comp.kind === 'StaticMesh' ? Math.hypot(comp.props.sizeX, comp.props.sizeY) / 2 : comp.kind === 'PointLight' ? 20 : 0;
    r = Math.max(r, off + ext);
  }
  return Math.min(r, 400);
}

function hexA(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  const n = m ? parseInt(m[1], 16) : 0xffffff;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha.toFixed(3)})`;
}
