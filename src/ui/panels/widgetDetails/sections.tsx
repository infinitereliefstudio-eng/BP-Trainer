/** The sections of a widget's Details after its Slot: its own properties (Content, Appearance, Progress…), Behavior, a Button's Events, and the app's help. */
import { SLATE_VISIBILITY_LABEL, type Justification, type WidgetNode, type WidgetProps, WIDGET_LABEL } from '@core/model/widgets';
import { BUTTON_EVENTS } from '@core/nodes/library/widgets';
import { addButtonEvent } from '@core/operations/widgetOps';
import { useStore } from '../../hooks';
import { AppHelp, Check, Field, Group, NumberField } from '../fields';
import { Bindable, Color, Pair, Select } from './controls';

const JUSTIFY: Justification[] = ['Left', 'Center', 'Right'];

type SetProps = (patch: Partial<WidgetProps>) => void;
type OpenGraph = ((graphId: string) => void) | undefined;

/** What the kind of widget has of its own: a Text's Content and Appearance, a Progress Bar's Progress, a Button's colour, an Image's or a Spacer's size. */
export function KindSections({ w, setProps, onOpenGraph }: { w: WidgetNode; setProps: SetProps; onOpenGraph: OpenGraph }) {
  const p = w.props;
  return (
    <>
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
    </>
  );
}

/** Behavior: Visibility (bindable) and Is Enabled. */
export function BehaviorSection({ w, setProps, onOpenGraph }: { w: WidgetNode; setProps: SetProps; onOpenGraph: OpenGraph }) {
  const p = w.props;
  return (
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
      <Field label="Is Enabled">
        <Check checked={p.enabled !== false} onChange={(enabled) => setProps({ enabled })} />
      </Field>
    </Group>
  );
}

/** A Button's Events: the + that adds On Clicked, On Pressed or On Released to the Graph (Is Variable needed). */
export function ButtonEvents({ w, onFocusNode }: { w: WidgetNode; onFocusNode?: (graphId: string, nodeId: string) => void }) {
  const store = useStore();
  return (
    <Group title="Events">
      {!w.isVariable && <p class="hint">Coche Is Variable pour ajouter les événements de ce bouton.</p>}
      {BUTTON_EVENTS.map((e) => {
        const placed = store.cls.graphs.some((g) => Object.values(g.nodes).some((n) => n.def === 'event.widgetButton' && n.config.widget === w.id && n.config.event === e.id));
        return (
          <Field key={e.id} label={e.label}>
            <button
              class={`btn${placed ? '' : ' primary'}`}
              disabled={!w.isVariable}
              title={e.help}
              onClick={() => {
                const r = store.apply(`Ajouter ${e.label}`, (c) => addButtonEvent(c, w.id, e.id));
                if (r.ok) onFocusNode?.(r.value.graphId, r.value.nodeId);
                else store.warn(r.reason);
              }}
            >
              {placed ? 'Voir' : '+'}
            </button>
          </Field>
        );
      })}
    </Group>
  );
}

/** The app's help under the Details: Is Variable, Anchors or Slot, Visibility. */
export function WidgetHelp({ w, parent }: { w: WidgetNode; parent?: WidgetNode }) {
  return (
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
        <b>Visibility</b> : Collapsed ne prend plus de place, Hidden garde sa place. Les deux Not Hit-Testable restent visibles mais le toucher les traverse (c'est le défaut d'un Canvas Panel et d'un Text) ; une Image restée Visible par-dessus un bouton lui prend ses touchers. <b>Is Enabled</b> décoché : le widget et son contenu sont grisés et ne répondent plus.
      </p>
    </AppHelp>
  );
}
