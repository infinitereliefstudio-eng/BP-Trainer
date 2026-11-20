/**
 * Details of a widget of the Designer, laid out as UE's: its name and Is
 * Variable on top, then Slot (what its parent panel decides: anchors and
 * offsets in a Canvas Panel, padding and size in a box), then its own
 * sections (Content, Appearance, Progress, Behavior).
 */
import type { ComponentChildren } from 'preact';
import { findClass } from '@core/model/project';
import {
  ANCHOR_PRESETS,
  SLATE_VISIBILITY_LABEL,
  slotLabel,
  stretchedX,
  stretchedY,
  WIDGET_LABEL,
  type BindableProp,
  type HAlign,
  type Justification,
  type VAlign,
  type WidgetNode,
  type WidgetProps,
  type WidgetSlot,
} from '@core/model/widgets';
import {
  bindingCandidates,
  createWidgetBinding,
  removeWidget,
  renameWidget,
  setWidgetAnchors,
  setWidgetBinding,
  setWidgetIsVariable,
  updateWidgetProps,
  updateWidgetSlot,
} from '@core/operations/widgetOps';
import { DESIGN_H, DESIGN_W, layoutWidgets } from '@core/umg/layout';
import { useStore } from '../hooks';
import { NameField } from '../widgets/NameField';
import { AppHelp, Check, Field, Group, NumberField } from './fields';

const H_ALIGN: HAlign[] = ['Fill', 'Left', 'Center', 'Right'];
const V_ALIGN: VAlign[] = ['Fill', 'Top', 'Center', 'Bottom'];
const JUSTIFY: Justification[] = ['Left', 'Center', 'Right'];

function Select<T extends string>({ value, options, onChange, labels }: { value: T; options: readonly T[]; onChange: (v: T) => void; labels?: string[] }) {
  return (
    <select class="field" value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value as T)}>
      {options.map((o, i) => (
        <option key={o} value={o}>
          {labels?.[i] ?? o}
        </option>
      ))}
    </select>
  );
}

function Color({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input class="field color" type="color" value={value} onChange={(e) => onChange((e.target as HTMLInputElement).value)} />;
}

function Pair({ children }: { children: ComponentChildren }) {
  return <span class="d-pair">{children}</span>;
}

/**
 * A property with UE's Bind menu beside it: Create Binding (a new function
 * GetText_0, opened in the Graph), a compatible function of the Blueprint,
 * or Remove Binding. Bound, the property shows its function instead of its value.
 */
function Bindable({ w, prop, onOpenGraph, children }: { w: WidgetNode; prop: BindableProp; onOpenGraph?: (graphId: string) => void; children: ComponentChildren }) {
  const store = useStore();
  const cls = store.cls;
  const bound = w.bindings?.[prop];
  const fn = bound ? cls.graphs.find((g) => g.id === bound) : undefined;
  const choices = bindingCandidates(cls, w.kind, prop);
  const pick = (v: string) => {
    if (v === '__create') {
      const r = store.applyProject('Create Binding', (p) => createWidgetBinding(p, store.cls, w.id, prop));
      if (r.ok) onOpenGraph?.(r.value.id);
      else store.warn(r.reason);
    } else if (v === '__remove') {
      store.apply('Remove Binding', (c) => setWidgetBinding(c, w.id, prop, undefined));
    } else if (v) {
      const r = store.apply('Lier la propriété', (c) => setWidgetBinding(c, w.id, prop, v));
      if (!r.ok) store.warn(r.reason);
    }
  };
  return (
    <span class="bind-row">
      {fn ? (
        <button class="btn bind-fn" onClick={() => onOpenGraph?.(fn.id)} title="Ouvrir la fonction liée">
          ƒ {fn.name}
        </button>
      ) : (
        children
      )}
      <select class={`field bind-btn${fn ? ' on' : ''}`} value="" aria-label={`Bind ${prop}`} onChange={(e) => pick((e.target as HTMLSelectElement).value)}>
        <option value="">Bind</option>
        {fn && <option value="__remove">Remove Binding</option>}
        <option value="__create">Create Binding</option>
        {choices
          .filter((g) => g.id !== bound)
          .map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
      </select>
    </span>
  );
}

export function WidgetDetails({ id, onOpenClass, onOpenGraph }: { id: string; onOpenClass?: (classId: string) => void; onOpenGraph?: (graphId: string) => void }) {
  const store = useStore();
  const cls = store.cls;
  const w = (cls.widgets ?? []).find((x) => x.id === id);
  if (!w) return null;
  const parent = w.parent ? (cls.widgets ?? []).find((x) => x.id === w.parent) : undefined;
  const label = `Modifier ${w.name}`;
  const setProps = (patch: Partial<WidgetProps>) => store.apply(label, (c) => updateWidgetProps(c, w.id, patch));
  const setSlot = (patch: Partial<WidgetSlot>) => store.apply(label, (c) => updateWidgetSlot(c, w.id, patch));
  const p = w.props;
  const s = w.slot;
  const placed = w.kind === 'UserWidget' && w.classId ? findClass(store.project, w.classId) : undefined;

  return (
    <>
      <Group title="Widget">
        <Field label="Name">
          <NameField value={w.name} onCommit={(name) => store.apply('Renommer le widget', (c) => renameWidget(c, w.id, name))} />
        </Field>
        <Field label="Is Variable">
          <Check checked={w.isVariable} onChange={(v) => store.apply(v ? 'Is Variable' : 'Retirer Is Variable', (c) => setWidgetIsVariable(c, w.id, v))} />
        </Field>
        <Field label="Class">
          <span>{placed ? placed.name : WIDGET_LABEL[w.kind]}</span>
        </Field>
        {placed && onOpenClass && (
          <Field label="Widget Blueprint">
            <button class="btn" onClick={() => onOpenClass(placed.id)}>
              Ouvrir {placed.name}
            </button>
          </Field>
        )}
      </Group>

      {parent?.kind === 'CanvasPanel' && <CanvasSlot w={w} setSlot={setSlot} />}
      {parent && parent.kind !== 'CanvasPanel' && (
        <Group title={`Slot (${slotLabel(parent.kind)})`}>
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
          {(parent.kind === 'VerticalBox' || parent.kind === 'HorizontalBox') && (
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
      )}

      {w.kind === 'TextBlock' && (
        <Group title="Content">
          <Field label="Text">
            <Bindable w={w} prop="text" onOpenGraph={onOpenGraph}>
              <textarea
                class="field"
                rows={2}
                value={p.text}
                onBlur={(e) => {
                  const text = (e.target as HTMLTextAreaElement).value;
                  if (text !== p.text) setProps({ text });
                }}
              />
            </Bindable>
          </Field>
        </Group>
      )}
      {w.kind === 'TextBlock' && (
        <Group title="Appearance">
          <Field label="Color and Opacity">
            <Bindable w={w} prop="color" onOpenGraph={onOpenGraph}>
              <Color value={p.color} onChange={(color) => setProps({ color })} />
            </Bindable>
          </Field>
          <Field label="Font Size">
            <NumberField value={p.fontSize} onCommit={(fontSize) => setProps({ fontSize: Math.max(1, Math.round(fontSize)) })} />
          </Field>
          <Field label="Justification">
            <Select value={p.justification} options={JUSTIFY} onChange={(justification) => setProps({ justification })} />
          </Field>
        </Group>
      )}
      {w.kind === 'ProgressBar' && (
        <Group title="Progress">
          <Field label="Percent">
            <Bindable w={w} prop="percent" onOpenGraph={onOpenGraph}>
              <NumberField value={p.percent} onCommit={(percent) => setProps({ percent: Math.max(0, Math.min(1, percent)) })} />
            </Bindable>
          </Field>
          <Field label="Fill Color and Opacity">
            <Bindable w={w} prop="fillColor" onOpenGraph={onOpenGraph}>
              <Color value={p.fillColor} onChange={(fillColor) => setProps({ fillColor })} />
            </Bindable>
          </Field>
        </Group>
      )}
      {w.kind === 'Button' && (
        <Group title="Appearance">
          <Field label="Background Color">
            <Color value={p.background} onChange={(background) => setProps({ background })} />
          </Field>
        </Group>
      )}
      {(w.kind === 'Image' || w.kind === 'Spacer') && (
        <Group title={w.kind === 'Image' ? 'Appearance' : 'Spacer'}>
          {w.kind === 'Image' && (
            <Field label="Color and Opacity">
              <Color value={p.color} onChange={(color) => setProps({ color })} />
            </Field>
          )}
          <Field label={w.kind === 'Image' ? 'Image Size' : 'Size'}>
            <Pair>
              <NumberField value={p.sizeX} onCommit={(sizeX) => setProps({ sizeX: Math.max(0, sizeX) })} />
              <NumberField value={p.sizeY} onCommit={(sizeY) => setProps({ sizeY: Math.max(0, sizeY) })} />
            </Pair>
          </Field>
        </Group>
      )}

      <Group title="Behavior">
        <Field label="Visibility">
          <Bindable w={w} prop="visibility" onOpenGraph={onOpenGraph}>
            <select class="field" value={String(p.visibility)} onChange={(e) => setProps({ visibility: Number((e.target as HTMLSelectElement).value) })}>
              {SLATE_VISIBILITY_LABEL.map((l, i) => (
                <option key={l} value={String(i)}>
                  {l}
                </option>
              ))}
            </select>
          </Bindable>
        </Field>
      </Group>

      <Group title="Widget" app>
        <button
          class="btn danger"
          onClick={() => {
            const r = store.apply(`Supprimer ${w.name}`, (c) => removeWidget(c, w.id));
            if (!r.ok) store.warn(r.reason);
          }}
        >
          Supprimer {w.name}
        </button>
      </Group>

      <AppHelp>
        <p>
          <b>Is Variable</b> : coché, {w.name} devient une variable du Graph (My Blueprint › Variables) : on peut alors lui appliquer Set Text, Set Percent ou Set
          Visibility. Un Button l’est d’office, pour ses événements.
        </p>
        {parent?.kind === 'CanvasPanel' && (
          <p>
            <b>Anchors</b> : le point (ou la zone) de l’écran auquel {w.name} reste attaché quand la taille de l’écran change. Avec une ancre en un point, Position
            part de ce point et Alignment dit quel point du widget s’y pose (0,5 et 0,5 : son centre). Une ancre étirée sur un axe fait des Offsets des marges.
          </p>
        )}
        {parent && parent.kind !== 'CanvasPanel' && (
          <p>
            <b>Slot</b> : dans une {WIDGET_LABEL[parent.kind]}, on ne place pas un widget au pixel : il prend sa taille voulue (Auto) ou une part de la place
            restante (Fill), puis s’aligne.
          </p>
        )}
        <p>
          <b>Visibility</b> : Collapsed ne prend plus de place, Hidden garde sa place. Les deux Not Hit-Testable restent visibles mais ne reçoivent pas les touchers.
        </p>
      </AppHelp>
    </>
  );
}

/** Slot (Canvas Panel Slot): anchors, then a position and a size, or margins on a stretched axis. */
function CanvasSlot({ w, setSlot }: { w: WidgetNode; setSlot: (patch: Partial<WidgetSlot>) => void }) {
  const store = useStore();
  const s = w.slot;
  const o = s.offsets;
  const setOffset = (i: number, v: number) => {
    const next = [...o] as WidgetSlot['offsets'];
    next[i] = v;
    setSlot({ offsets: next });
  };
  const pick = (a: WidgetSlot['anchors']) => {
    // Kept in place on the 1280 × 720 screen, as UE's Designer does.
    const laid = layoutWidgets(store.cls, DESIGN_W, DESIGN_H, store.project);
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
