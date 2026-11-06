/** Left drawer: Components, then My Blueprint (graphs, variables…). */
import type { ComponentChildren } from 'preact';
import { COMPONENT_LABEL, type Component, type ComponentKind } from '@core/model/project';
import { addComponent, addVariable } from '@core/operations/classOps';
import type { Value } from '@core/types/values';
import { PIN_COLOR } from '@editor/theme';
import { useStore } from '../hooks';
import type { OpenOverlay } from '../overlayTypes';

interface Props {
  openOverlay: OpenOverlay;
  placeNode: (def: string, config: Record<string, Value>) => void;
  onOpenDetails: () => void;
}

const ADDABLE: ComponentKind[] = ['StaticMesh', 'PointLight', 'BoxCollision', 'TextRender', 'Scene'];

export function MyBlueprint({ openOverlay, placeNode, onOpenDetails }: Props) {
  const store = useStore();
  const cls = store.cls;
  const focus = store.focus;

  const addComp = (sx: number, sy: number) =>
    openOverlay({
      kind: 'menu',
      sx,
      sy,
      title: 'Ajouter un composant',
      items: ADDABLE.map((k) => ({
        label: COMPONENT_LABEL[k],
        action: () => {
          const c = store.apply(`Ajouter ${COMPONENT_LABEL[k]}`, (cl) => addComponent(cl, k));
          store.setFocus({ kind: 'component', id: c.id });
        },
      })),
    });

  const addVar = () => {
    const v = store.apply('Ajouter une variable', (cl) => addVariable(cl));
    store.setFocus({ kind: 'variable', id: v.id });
    onOpenDetails();
  };

  return (
    <div class="panel-scroll">
      <Section
        title="Components"
        onAdd={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          addComp(r.left, r.bottom);
        }}
      >
        {tree(cls.components).map(({ c, depth }) => (
          <Row
            key={c.id}
            selected={focus.kind === 'component' && focus.id === c.id}
            indent={depth}
            onClick={() => store.setFocus({ kind: 'component', id: c.id })}
            label={c.name}
            sub={COMPONENT_LABEL[c.kind]}
            actions={c.parent ? [{ label: 'Get', onClick: () => placeNode('var.component', { component: c.id }) }] : []}
          />
        ))}
      </Section>

      <Section title="Graphs">
        {cls.graphs.map((g) => (
          <Row key={g.id} label={g.name} selected={store.graphId === g.id} onClick={() => store.openGraph(g.id)} />
        ))}
      </Section>

      <Section title="Functions" note="Arrive à l’étape 3." />

      <Section title="Variables" onAdd={addVar}>
        {cls.variables.length === 0 && <p class="hint">Touche + pour créer une variable.</p>}
        {cls.variables.map((v) => (
          <Row
            key={v.id}
            selected={focus.kind === 'variable' && focus.id === v.id}
            dot={PIN_COLOR[v.type.category]}
            label={v.name}
            onClick={() => {
              store.setFocus({ kind: 'variable', id: v.id });
              onOpenDetails();
            }}
            actions={[
              { label: 'Get', onClick: () => placeNode('var.get', { variable: v.id }) },
              { label: 'Set', onClick: () => placeNode('var.set', { variable: v.id }) },
            ]}
          />
        ))}
      </Section>

      <Section title="Event Dispatchers" note="Arrive à l’étape 3." />
      <Section title="Interfaces" note="Arrive à l’étape 3." />
    </div>
  );
}

function tree(list: Component[]): { c: Component; depth: number }[] {
  const out: { c: Component; depth: number }[] = [];
  const walk = (parent: string | undefined, depth: number) => {
    for (const c of list.filter((x) => x.parent === parent)) {
      out.push({ c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(undefined, 0);
  return out;
}

function Section(props: {
  title: string;
  onAdd?: (e: MouseEvent) => void;
  note?: string;
  children?: ComponentChildren;
}) {
  return (
    <section class="mb-section">
      <div class="mb-head">
        <span>{props.title}</span>
        {props.onAdd && (
          <button class="mb-add" aria-label={`Ajouter dans ${props.title}`} onClick={props.onAdd}>
            +
          </button>
        )}
      </div>
      {props.note && <p class="hint">{props.note}</p>}
      {props.children}
    </section>
  );
}

function Row(props: {
  label: string;
  sub?: string;
  dot?: string;
  indent?: number;
  selected?: boolean;
  onClick: () => void;
  actions?: { label: string; onClick: () => void }[];
}) {
  return (
    <div class={`mb-row${props.selected ? ' selected' : ''}`} style={{ paddingLeft: `${12 + (props.indent ?? 0) * 14}px` }}>
      <button class="mb-main" onClick={props.onClick}>
        {props.dot && <span class="dot" style={{ background: props.dot }} />}
        <span class="mb-label">{props.label}</span>
        {props.sub && <span class="mb-sub">{props.sub}</span>}
      </button>
      {props.actions?.map((a) => (
        <button key={a.label} class="chip" onClick={a.onClick}>
          {a.label}
        </button>
      ))}
    </div>
  );
}
