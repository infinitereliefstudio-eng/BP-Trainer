/**
 * The widgets of Widget Components during Play (V7.42): each one drawn on its
 * Draw Size, centred on its component, over the level and under the
 * viewport's widgets (Space Screen: same size whatever the zoom). They follow
 * their actor each frame with the level view's camera.
 *
 * Their Buttons take touches like the viewport's, as the input mode allows:
 * WidgetLayer gives the touch to the simulation.
 */
import { useEffect, useReducer, useRef } from 'preact/hooks';
import { componentTransform } from '@core/runtime/world';
import type { PlaySession } from '@editor/world/playSession';
import { WidgetSurface } from '../umg/WidgetSurface';

interface Props {
  session: PlaySession;
  /** Screen pixels per unit of the 720-high reference screen. */
  scale: number;
  onDown: (obj: string, x: number, y: number) => void;
  onUp: (obj: string, x: number, y: number) => void;
}

export function ComponentWidgets({ session, scale, onDown, onUp }: Props) {
  const [, force] = useReducer((n: number) => n + 1, 0);
  const boxes = useRef(new Map<string, HTMLDivElement>());
  const seen = useRef('');
  const sim = session.sim;
  const layer = scale > 0 ? sim.umg.componentLayer() : [];
  // The frame callback outlives a render: it reads the latest layout here.
  const current = useRef(layer);
  current.current = layer;

  useEffect(
    () =>
      session.onFrame(() => {
        // Redraw when a widget changed or one came, went, or was hidden; otherwise only move them.
        const shown = sim.umg
          .componentWidgets()
          .filter((o) => sim.umg.drawn(o))
          .map((o) => o.id)
          .join(',');
        const sig = `${sim.umg.version}|${shown}`;
        if (sig !== seen.current) {
          seen.current = sig;
          force(0);
          return;
        }
        place();
      }),
    [session, scale],
  );
  useEffect(() => place());

  /** Each widget centred on its component, where the camera shows it now. */
  function place() {
    const cam = session.camera;
    for (const s of current.current) {
      const el = boxes.current.get(s.obj.id);
      const a = sim.objectById(s.actor);
      const c = a?.components.find((k) => k.id === s.component);
      if (!el || !a || !c || !cam) continue;
      const t = componentTransform(a, c);
      const p = cam.toScreen(t.x, t.y);
      el.style.transform = `translate(${p.x - (s.w * scale) / 2}px, ${p.y - (s.h * scale) / 2}px)`;
    }
  }

  const local = (e: PointerEvent): [number, number] => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale];
  };

  return (
    <>
      {layer.map((s) => (
        <div
          key={s.obj.id}
          ref={(el) => {
            if (el) boxes.current.set(s.obj.id, el);
            else boxes.current.delete(s.obj.id);
          }}
          class={`umg-world${s.obj.widget?.state['']?.enabled === false ? ' disabled' : ''}`}
          data-widget={s.obj.objectName}
          style={{ width: `${s.w * scale}px`, height: `${s.h * scale}px` }}
          onPointerDown={(e) => {
            if (!(e.target as HTMLElement).closest('.umg-Button.hit')) return;
            e.stopPropagation();
            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
            onDown(s.obj.id, ...local(e as unknown as PointerEvent));
          }}
          onPointerUp={(e) => onUp(s.obj.id, ...local(e as unknown as PointerEvent))}
          onPointerCancel={(e) => onUp(s.obj.id, ...local(e as unknown as PointerEvent))}
        >
          <WidgetSurface laid={s.laid} scale={scale} pressed={sim.umg.pressed?.path} />
        </div>
      ))}
    </>
  );
}
