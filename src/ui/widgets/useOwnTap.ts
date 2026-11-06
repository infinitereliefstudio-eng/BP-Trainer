/**
 * Guard against "ghost" taps: when a long press opens a menu or a sheet, the
 * finger is lifted *on top of* the new layer, and the browser turns that into
 * a click on whatever is now under it. A layer created by a gesture must only
 * react to taps that also started on it.
 */
import { useRef } from 'preact/hooks';

export function useOwnTap() {
  const armed = useRef(false);
  return {
    /** Spread on the layer's root element. */
    root: {
      onPointerDownCapture: () => {
        armed.current = true;
      },
    },
    /** Wrap click handlers of the layer: they run only for taps that began on it. */
    guard<E extends Event>(fn: (e: E) => void) {
      return (e: E) => {
        if (!armed.current) return;
        fn(e);
      };
    },
  };
}
