/** The WebGL renderer of the 3D views (3D-0, 3D-1), in a wrapper element; undefined when WebGL is missing. */
import { WebGLRenderer } from 'three';

export function makeRenderer(wrap: HTMLElement): WebGLRenderer | undefined {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, powerPreference: 'default' });
  } catch {
    return undefined;
  }
  // Two pixels per CSS pixel at most: sharp enough on a phone, half the work of its native three.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.touchAction = 'none';
  wrap.prepend(canvas);
  return renderer;
}

/** Free the renderer and take its canvas away. */
export function dropRenderer(renderer: WebGLRenderer): void {
  renderer.dispose();
  renderer.forceContextLoss();
  renderer.domElement.remove();
}
