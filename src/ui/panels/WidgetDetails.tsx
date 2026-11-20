/**
 * Details of a widget of the Designer, laid out as UE's: its name and Is
 * Variable on top, then Slot (what its parent panel decides: anchors and
 * offsets in a Canvas Panel, padding and size in a box), then its own
 * sections (Content, Appearance, Progress, Behavior), a Button's Events
 * and the app's help. The sections live in ./widgetDetails/.
 */
import { findClass } from '@core/model/project';
import { WIDGET_LABEL, type WidgetProps, type WidgetSlot } from '@core/model/widgets';
import { removeWidget, renameWidget, setWidgetIsVariable, updateWidgetProps, updateWidgetSlot } from '@core/operations/widgetOps';
import { useStore } from '../hooks';
import { NameField } from '../widgets/NameField';
import { Check, Field, Group } from './fields';
import { BehaviorSection, ButtonEvents, KindSections, WidgetHelp } from './widgetDetails/sections';
import { BoxSlot, CanvasSlot } from './widgetDetails/slots';

export function WidgetDetails({
  id,
  onOpenClass,
  onOpenGraph,
  onFocusNode,
}: {
  id: string;
  onOpenClass?: (classId: string) => void;
  onOpenGraph?: (graphId: string) => void;
  onFocusNode?: (graphId: string, nodeId: string) => void;
}) {
  const store = useStore();
  const cls = store.cls;
  const w = (cls.widgets ?? []).find((x) => x.id === id);
  if (!w) return null;
  const parent = w.parent ? (cls.widgets ?? []).find((x) => x.id === w.parent) : undefined;
  const label = `Modifier ${w.name}`;
  const setProps = (patch: Partial<WidgetProps>) => store.apply(label, (c) => updateWidgetProps(c, w.id, patch));
  const setSlot = (patch: Partial<WidgetSlot>) => store.apply(label, (c) => updateWidgetSlot(c, w.id, patch));
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
      {parent && parent.kind !== 'CanvasPanel' && <BoxSlot w={w} parent={parent.kind} setSlot={setSlot} />}
      <KindSections w={w} setProps={setProps} onOpenGraph={onOpenGraph} />
      <BehaviorSection w={w} setProps={setProps} onOpenGraph={onOpenGraph} />
      {w.kind === 'Button' && <ButtonEvents w={w} onFocusNode={onFocusNode} />}

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

      <WidgetHelp w={w} parent={parent} />
    </>
  );
}
