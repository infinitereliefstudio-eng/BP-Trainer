/**
 * A long press on a touch control (`data-ue`, see origins.ts) says what to do in UE instead (UI-4, V7.76): the
 * text goes to `show`, and the click that would follow the press is swallowed. A short tap works as before.
 * Not on the joystick and the keys of Play, where holding is the game's own gesture (they have no `data-ue`).
 */
import { useEffect } from 'preact/hooks';
import { haptic } from '@editor/haptics';

const HOLD_MS = 550;
const SLOP_PX = 10;

export function useUeHints(show: (text: string) => void): void {
  useEffect(() => {
    let timer = 0;
    let start: { x: number; y: number; id: number } | null = null;
    // The click that follows the press, on the same control (a disabled control gives none: the next tap elsewhere works).
    let swallow: { until: number; el: HTMLElement } | null = null;
    const cancel = () => {
      window.clearTimeout(timer);
      start = null;
    };
    const down = (e: PointerEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>('[data-ue]');
      if (!el?.dataset.ue) return;
      const text = el.dataset.ue;
      start = { x: e.clientX, y: e.clientY, id: e.pointerId };
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        start = null;
        swallow = { until: Date.now() + 700, el };
        haptic('press');
        show(text);
      }, HOLD_MS);
    };
    const move = (e: PointerEvent) => {
      if (start && e.pointerId === start.id && Math.hypot(e.clientX - start.x, e.clientY - start.y) > SLOP_PX) cancel();
    };
    const click = (e: MouseEvent) => {
      if (swallow && Date.now() < swallow.until && swallow.el.contains(e.target as Node)) {
        swallow = null;
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const menu = (e: Event) => {
      if ((e.target as Element | null)?.closest('[data-ue]')) e.preventDefault();
    };
    document.addEventListener('pointerdown', down, true);
    document.addEventListener('pointermove', move, true);
    document.addEventListener('pointerup', cancel, true);
    document.addEventListener('pointercancel', cancel, true);
    document.addEventListener('click', click, true);
    document.addEventListener('contextmenu', menu, true);
    return () => {
      cancel();
      document.removeEventListener('pointerdown', down, true);
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerup', cancel, true);
      document.removeEventListener('pointercancel', cancel, true);
      document.removeEventListener('click', click, true);
      document.removeEventListener('contextmenu', menu, true);
    };
  }, [show]);
}
