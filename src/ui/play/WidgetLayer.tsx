/**
 * The game's UMG screen during Play: the widgets added to the viewport, drawn
 * over the level, back to front. The screen is 720 units high whatever the
 * phone (as a DPI scale does in UE), so a HUD laid out in the 1280 × 720
 * Designer looks the same; its width follows the phone's.
 *
 * Buttons take touches (On Pressed, On Released, On Clicked) when the input
 * mode lets the widgets have them; a touch that is ignored says why.
 */
import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'preact/hooks';
import type { TouchOutcome } from '@core/runtime/simulation';
import { touchWhy } from '@core/umg/touch';
import { DESIGN_H } from '@core/umg/layout';
import type { PlaySession } from '@editor/world/playSession';
import { WidgetSurface } from '../umg/WidgetSurface';

type Ignored = Extract<TouchOutcome, { kind: 'ignored' }>;

export function WidgetLayer({ session }: { session: PlaySession }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [, force] = useReducer((n: number) => n + 1, 0);
  const seen = useRef(-1);
  const [notice, setNotice] = useState<{ o: Ignored; open: boolean; id: number } | undefined>();

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

  // An ignored touch is said for a few seconds, unless its explanation is open.
  useEffect(() => {
    if (!notice || notice.open) return;
    const t = window.setTimeout(() => setNotice(undefined), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const scale = size.h > 0 ? size.h / DESIGN_H : 0;
  const width = scale > 0 ? size.w / scale : 0;
  const layer = scale > 0 ? session.sim.umg.layer(width) : [];
  /** A finger on a Button's box: where it is on the 720-high screen. */
  const at = (e: PointerEvent): [number, number] => {
    const r = ref.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale];
  };
  const down = (e: PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const [x, y] = at(e);
    const out = session.sim.touchDown(x, y, width);
    if (out.kind === 'ignored') setNotice({ o: out, open: false, id: Date.now() });
    session.notifyUi();
  };
  const up = (e: PointerEvent) => {
    const [x, y] = at(e);
    session.sim.touchUp(x, y, width);
    session.notifyUi();
  };

  return (
    <div class="umg-layer" ref={ref} aria-hidden={layer.length === 0}>
      {layer.map((s) => (
        <div
          key={s.obj.id}
          class={`umg-screen${s.obj.widget?.state['']?.enabled === false ? ' disabled' : ''}`}
          data-widget={s.obj.objectName}
          onPointerDown={(e) => (e.target as HTMLElement).closest('.umg-Button.hit') && down(e as unknown as PointerEvent)}
          onPointerUp={(e) => up(e as unknown as PointerEvent)}
          onPointerCancel={(e) => up(e as unknown as PointerEvent)}
        >
          <WidgetSurface laid={s.laid} scale={scale} pressed={session.sim.umg.pressed?.path} />
        </div>
      ))}
      {notice && (
        <div class="umg-notice" key={notice.id}>
          <span>{touchWhy(notice.o).short}</span>
          <button class="btn small" onClick={() => setNotice({ ...notice, open: !notice.open })}>
            {notice.open ? 'Fermer' : 'Pourquoi ?'}
          </button>
          {notice.open && <p class="umg-why">{touchWhy(notice.o).why}</p>}
        </div>
      )}
    </div>
  );
}
