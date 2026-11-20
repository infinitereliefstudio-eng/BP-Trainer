/**
 * The game's UMG screen during Play: the widgets added to the viewport, drawn
 * over the level, back to front. The screen is 720 units high whatever the
 * phone (as a DPI scale does in UE), so a HUD laid out in the 1280 × 720
 * Designer looks the same; its width follows the phone's.
 */
import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'preact/hooks';
import { DESIGN_H } from '@core/umg/layout';
import type { PlaySession } from '@editor/world/playSession';
import { WidgetSurface } from '../umg/WidgetSurface';

export function WidgetLayer({ session }: { session: PlaySession }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [, force] = useReducer((n: number) => n + 1, 0);
  const seen = useRef(-1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Redraw only when something on the screen changed (Set Text, a Binding with a new value, Add to Viewport…).
  useEffect(
    () =>
      session.onFrame(() => {
        if (session.sim.umg.version !== seen.current) {
          seen.current = session.sim.umg.version;
          force(0);
        }
      }),
    [session],
  );

  const scale = size.h > 0 ? size.h / DESIGN_H : 0;
  const layer = scale > 0 ? session.sim.umg.layer(size.w / scale) : [];
  return (
    <div class="umg-layer" ref={ref} aria-hidden={layer.length === 0}>
      {layer.map((s) => (
        <div key={s.obj.id} class="umg-screen" data-widget={s.obj.objectName}>
          <WidgetSurface laid={s.laid} scale={scale} />
        </div>
      ))}
    </div>
  );
}
