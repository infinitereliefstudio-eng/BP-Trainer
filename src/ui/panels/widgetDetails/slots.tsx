/** Slot of a widget's Details: what its parent panel decides (anchors and offsets in a Canvas Panel, padding and size in a box). */
import { ANCHOR_PRESETS, type HAlign, slotLabel, stretchedX, stretchedY, type VAlign, type WidgetKind, type WidgetNode, type WidgetSlot } from '@core/model/widgets';
import { setWidgetAnchors } from '@core/operations/widgetOps';
import { DESIGN_H, layoutWidgets } from '@core/umg/layout';
import { currentDesignerWidth } from '../../designer/screenSize';
import { useStore } from '../../hooks';
import { Check, Field, Group, NumberField } from '../fields';
import { Pair, Select } from './controls';

const H_ALIGN: HAlign[] = ['Fill', 'Left', 'Center', 'Right'];
const V_ALIGN: VAlign[] = ['Fill', 'Top', 'Center', 'Bottom'];

type SetSlot = (patch: Partial<WidgetSlot>) => void;

/** Slot (Vertical Box Slot, Horizontal Box Slot, Overlay Slot…): padding, size Auto or Fill, alignments. */
export function BoxSlot({ w, parent, setSlot }: { w: WidgetNode; parent: WidgetKind; setSlot: SetSlot }) {
  const s = w.slot;
  return (
    <Group title={`Slot (${slotLabel(parent)})`}>
      <Field label="Padding">
        <Pair>
          {s.padding.map((v, i) => (
            <NumberField
              key={i}
              value={v}
              onCommit={(n) => {
                const pad = [...s.padding] as WidgetSlot['padding'];
                pad[i] = n;
                setSlot({ padding: pad });
              }}
            />
          ))}
        </Pair>
      </Field>
      {(parent === 'VerticalBox' || parent === 'HorizontalBox') && (
        <Field label="Size">
          <Pair>
            <Select value={s.sizeRule} options={['Auto', 'Fill'] as const} onChange={(sizeRule) => setSlot({ sizeRule })} />
            {s.sizeRule === 'Fill' && <NumberField value={s.fill} onCommit={(fill) => setSlot({ fill: Math.max(0, fill) })} />}
          </Pair>
        </Field>
      )}
      <Field label="Horizontal Alignment">
        <Select value={s.hAlign} options={H_ALIGN} onChange={(hAlign) => setSlot({ hAlign })} />
      </Field>
      <Field label="Vertical Alignment">
        <Select value={s.vAlign} options={V_ALIGN} onChange={(vAlign) => setSlot({ vAlign })} />
      </Field>
    </Group>
  );
}

/** Slot (Canvas Panel Slot): anchors, then a position and a size, or margins on a stretched axis. */
export function CanvasSlot({ w, setSlot }: { w: WidgetNode; setSlot: SetSlot }) {
  const store = useStore();
  const s = w.slot;
  const o = s.offsets;
  const setOffset = (i: number, v: number) => {
    const next = [...o] as WidgetSlot['offsets'];
    next[i] = v;
    setSlot({ offsets: next });
  };
  const pick = (a: WidgetSlot['anchors']) => {
    // Kept in place on the Designer's screen (its Screen Size), as UE's Designer does.
    const laid = layoutWidgets(store.cls, currentDesignerWidth(), DESIGN_H, store.project);
    const rect = laid.find((l) => l.widget.id === w.id)?.rect;
    const panel = laid.find((l) => l.widget.id === w.parent)?.rect;
    store.apply(`Anchors de ${w.name}`, (c) => setWidgetAnchors(c, w.id, a, rect, panel));
  };
  const same = (a: WidgetSlot['anchors']) => a.minX === s.anchors.minX && a.maxX === s.anchors.maxX && a.minY === s.anchors.minY && a.maxY === s.anchors.maxY;
  return (
    <Group title="Slot (Canvas Panel Slot)">
      <Field label="Anchors">
        <div class="anchor-grid">
          {ANCHOR_PRESETS.map((a) => (
            <button key={a.label} class={`anchor-cell${same(a) ? ' on' : ''}`} title={a.label} aria-label={`Ancre ${a.label}`} aria-pressed={same(a)} onClick={() => pick(a)}>
              <span
                class="anchor-mark"
                style={{
                  left: `calc(${a.minX} * (100% - 14px))`,
                  top: `calc(${a.minY} * (100% - 14px))`,
                  width: a.maxX > a.minX ? 'calc(100% - 14px)' : undefined,
                  height: a.maxY > a.minY ? 'calc(100% - 14px)' : undefined,
                }}
              />
            </button>
          ))}
        </div>
      </Field>
      <Field label={stretchedX(s) ? 'Offset Left' : 'Position X'}>
        <NumberField value={o[0]} onCommit={(v) => setOffset(0, v)} />
      </Field>
      <Field label={stretchedY(s) ? 'Offset Top' : 'Position Y'}>
        <NumberField value={o[1]} onCommit={(v) => setOffset(1, v)} />
      </Field>
      <Field label={stretchedX(s) ? 'Offset Right' : 'Size X'}>
        <NumberField value={o[2]} onCommit={(v) => setOffset(2, stretchedX(s) ? v : Math.max(0, v))} />
      </Field>
      <Field label={stretchedY(s) ? 'Offset Bottom' : 'Size Y'}>
        <NumberField value={o[3]} onCommit={(v) => setOffset(3, stretchedY(s) ? v : Math.max(0, v))} />
      </Field>
      <Field label="Alignment">
        <Pair>
          <NumberField value={s.alignX} onCommit={(alignX) => setSlot({ alignX })} />
          <NumberField value={s.alignY} onCommit={(alignY) => setSlot({ alignY })} />
        </Pair>
      </Field>
      <Field label="Size To Content">
        <Check checked={s.autoSize} onChange={(autoSize) => setSlot({ autoSize })} />
      </Field>
      <Field label="ZOrder">
        <NumberField value={s.zOrder} onCommit={(zOrder) => setSlot({ zOrder: Math.round(zOrder) })} />
      </Field>
    </Group>
  );
}
