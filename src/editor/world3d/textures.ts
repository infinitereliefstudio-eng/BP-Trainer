/**
 * Textures drawn on a 2D canvas for the 3D view (3D-0, V7.77): the soft glow a Point Light leaves on the floor, and
 * the text of Text Render components (sprites that always face the camera).
 */
import { CanvasTexture, SRGBColorSpace, Sprite, SpriteMaterial } from 'three';

let glow: CanvasTexture | undefined;

/** A white disc fading to transparent: tinted by each light's colour. Shared by every halo. */
export function glowTexture(): CanvasTexture {
  if (glow) return glow;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glow = new CanvasTexture(c);
  glow.colorSpace = SRGBColorSpace;
  return glow;
}

/** Height of a Text Render's letters in the 3D view, in cm. */
const TEXT_CM = 42;

/** A Text Render as a sprite: its text in its colour, facing the camera. */
export function textSprite(text: string, color: string): Sprite {
  const c = document.createElement('canvas');
  const g = c.getContext('2d')!;
  const px = 64;
  const font = `600 ${px}px system-ui, sans-serif`;
  g.font = font;
  const w = Math.max(8, Math.ceil(g.measureText(text).width) + 16);
  c.width = w;
  c.height = Math.ceil(px * 1.35);
  g.font = font;
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  // A dark edge keeps light text readable over a lit floor.
  g.lineWidth = 8;
  g.strokeStyle = 'rgba(0,0,0,0.55)';
  g.strokeText(text, w / 2, c.height / 2);
  g.fillText(text, w / 2, c.height / 2);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const s = new Sprite(new SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set((TEXT_CM * c.width) / c.height, TEXT_CM, 1);
  return s;
}
