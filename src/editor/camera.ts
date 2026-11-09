/** Pan & zoom between screen pixels (CSS px) and graph world units. */
export interface Point {
  x: number;
  y: number;
}

export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 2.5;

export class Camera {
  /** World coordinate shown at the top-left corner of the canvas. */
  x = 0;
  y = 0;
  zoom = 1;

  toWorld(sx: number, sy: number): Point {
    return { x: sx / this.zoom + this.x, y: sy / this.zoom + this.y };
  }

  toScreen(wx: number, wy: number): Point {
    return { x: (wx - this.x) * this.zoom, y: (wy - this.y) * this.zoom };
  }

  panBy(dsx: number, dsy: number): void {
    this.x -= dsx / this.zoom;
    this.y -= dsy / this.zoom;
  }

  /** Zoom around a screen point, keeping the world point under it fixed. */
  zoomAt(sx: number, sy: number, factor: number): void {
    const before = this.toWorld(sx, sy);
    this.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, this.zoom * factor));
    this.x = before.x - sx / this.zoom;
    this.y = before.y - sy / this.zoom;
  }

  /** Frame a world rectangle inside a viewport, with a margin. */
  fit(bounds: { x: number; y: number; w: number; h: number }, vw: number, vh: number, margin = 48, minZoom = MIN_ZOOM): void {
    const z = Math.min((vw - margin * 2) / Math.max(bounds.w, 1), (vh - margin * 2) / Math.max(bounds.h, 1));
    this.zoom = Math.min(1, Math.max(minZoom, z));
    // Centred when it fits; otherwise start from the top left, where a graph's events are.
    const fitsX = bounds.w * this.zoom <= vw - margin * 2;
    const fitsY = bounds.h * this.zoom <= vh - margin * 2;
    this.x = fitsX ? bounds.x + bounds.w / 2 - vw / 2 / this.zoom : bounds.x - margin / this.zoom;
    this.y = fitsY ? bounds.y + bounds.h / 2 - vh / 2 / this.zoom : bounds.y - margin / this.zoom;
  }
}
