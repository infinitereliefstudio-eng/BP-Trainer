/** Left drawer: Components, then My Blueprint (graphs, variables…). */
import type { ComponentChildren } from 'preact';
import { COMPONENT_LABEL, type Component, type ComponentKind } from '@core/model/project';
import { addComponent, addDispatcher, addVariable } from '@core/operations/classOps';
import { ensureConstructionScript } from '@core/operations/constructionOps';
import { addFunction } from '@core/operations/functionOps';
import { addLocalVariable } from '@core/operations/localOps';
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
          // A child Blueprint attaches new components to the root it inherits.
          const inheritedRoot = store.cls.parentClassId ? store.ctx.cls.components.find((x) => !x.parent)?.id : undefined;
          const c = store.apply(`Ajouter ${COMPONENT_LABEL[k]}`, (cl) => {
            const added = addComponent(cl, k);
            if (!added.parent && inheritedRoot) added.parent = inheritedRoot;
            return added;
          });
          store.setFocus({ kind: 'component', id: c.id });
        },
      })),
    });

  const functions = cls.graphs.filter((g) => g.kind === 'function' && !g.iface);
  const openFn = store.graph.kind === 'function' && store.graph.fn ? store.graph : undefined;
  const inEventGraph = store.graph.kind === 'event';
  const construction = cls.graphs.find((g) => g.kind === 'construction');
  const implemented = store.project.interfaces.filter((i) => cls.interfaces.includes(i.id));

  const addFn = () => {
    const g = store.apply('Ajouter une fonction', (cl) => addFunction(cl));
    store.openGraph(g.id);
    store.setFocus({ kind: 'function', id: g.id });
    onOpenDetails();
  };

  const addDisp = () => {
    const d = store.apply('Ajouter un Event Dispatcher', (cl) => addDispatcher(cl));
    store.setFocus({ kind: 'dispatcher', id: d.id });
    onOpenDetails();
  };

  const addVar = () => {
    const v = store.apply('Ajouter une variable', (cl) => addVariable(cl));
    store.setFocus({ kind: 'variable', id: v.id });
    onOpenDetails();
  };

  // What a child Blueprint gets from its parent, listed after its own members (read-only here).
  const view = store.ctx.cls;
  const fromParent = () => store.info('Hérité de la classe parente : on le modifie dans le Blueprint parent.');
  const inherited = {
    variables: view.variables.filter((v) => !cls.variables.some((o) => o.id === v.id)),
    functions: view.graphs.filter((g) => g.kind === 'function' && !g.iface && !cls.graphs.some((o) => o.id === g.id)),
  };

  const addLocal = () => {
    if (!openFn) return;
    const l = store.apply('Ajouter une variable locale', (cl) => addLocalVariable(store.project, cl, openFn.id));
    if (l) store.setFocus({ kind: 'local', graph: openFn.id, id: l.id });
    onOpenDetails();
  };
  /** The graph implementing an interface function with outputs: this class's, or the parent's. */
  const implGraph = (ifaceId: string, fnId: string) => view.graphs.find((g) => g.iface?.interface === ifaceId && g.iface.fn === fnId);

  return (
    <div class="panel-scroll">
      <Section
        title="Components"
        onAdd={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          addComp(r.left, r.bottom);
        }}
      >
        {tree(view.components).map(({ c, depth }) => {
          const mine = cls.components.some((o) => o.id === c.id);
          return (
            <Row
              key={c.id}
              selected={focus.kind === 'component' && focus.id === c.id}
              indent={depth}
              onClick={mine ? () => store.setFocus({ kind: 'component', id: c.id }) : fromParent}
              label={c.name}
              sub={`${COMPONENT_LABEL[c.kind]}${mine ? '' : ' · hérité'}`}
              actions={c.parent ? [{ label: 'Get', onClick: () => placeNode('var.component', { component: c.id }) }] : []}
            />
          );
        })}
      </Section>

      <Section title="Graphs">
        {cls.graphs
          .filter((g) => g.kind === 'event')
          .map((g) => (
            <Row key={g.id} label={g.name} selected={store.graphId === g.id} onClick={() => store.openGraph(g.id)} />
          ))}
        <Row
          label="ConstructionScript"
          sub={construction && Object.keys(construction.nodes).length > 1 ? undefined : 'vide'}
          selected={store.graph.kind === 'construction'}
          onClick={() => {
            // Every Blueprint has one in UE; here it is created the first time it is opened.
            const g = construction ?? store.apply('Ouvrir le Construction Script', (cl) => ensureConstructionScript(cl));
            store.openGraph(g.id);
          }}
        />
      </Section>

      <Section title="Functions" onAdd={addFn}>
        {functions.length === 0 && <p class="hint">Touche + pour créer une fonction : un bloc de logique réutilisable.</p>}
        {functions.map((g) => (
          <Row
            key={g.id}
            label={g.name}
            sub={g.fn?.pure ? 'pure' : undefined}
            selected={store.graphId === g.id || (focus.kind === 'function' && focus.id === g.id)}
            onClick={() => {
              store.openGraph(g.id);
              store.setFocus({ kind: 'function', id: g.id });
              onOpenDetails();
            }}
            actions={[{ label: 'Appeler', onClick: () => placeNode(g.fn?.pure ? 'call.pureFunction' : 'call.function', { owner: cls.id, graph: g.id }) }]}
          />
        ))}
        {inherited.functions.map((g) => (
          <Row
            key={g.id}
            label={g.name}
            sub={`hérité${g.fn?.pure ? ' · pure' : ''}`}
            onClick={fromParent}
            actions={[{ label: 'Appeler', onClick: () => placeNode(g.fn?.pure ? 'call.pureFunction' : 'call.function', { owner: cls.id, graph: g.id }) }]}
          />
        ))}
      </Section>

      {openFn && (
        <Section title={`Local Variables (${openFn.name})`} onAdd={addLocal}>
          {(openFn.fn?.locals ?? []).length === 0 && (
            <p class="hint">Touche + pour une variable locale : elle n'existe que pendant un appel de {openFn.name}.</p>
          )}
          {(openFn.fn?.locals ?? []).map((l) => (
            <Row
              key={l.id}
              selected={focus.kind === 'local' && focus.id === l.id}
              dot={PIN_COLOR[l.type.category]}
              label={l.name}
              sub="locale"
              onClick={() => {
                store.setFocus({ kind: 'local', graph: openFn.id, id: l.id });
                onOpenDetails();
              }}
              actions={[
                { label: 'Get', onClick: () => placeNode('var.getLocal', { variable: l.id }) },
                { label: 'Set', onClick: () => placeNode('var.setLocal', { variable: l.id }) },
              ]}
            />
          ))}
        </Section>
      )}

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
        {inherited.variables.map((v) => (
          <Row
            key={v.id}
            dot={PIN_COLOR[v.type.category]}
            label={v.name}
            sub="hérité"
            onClick={fromParent}
            actions={[
              { label: 'Get', onClick: () => placeNode('var.get', { variable: v.id }) },
              { label: 'Set', onClick: () => placeNode('var.set', { variable: v.id }) },
            ]}
          />
        ))}
      </Section>

      <Section title="Event Dispatchers" onAdd={addDisp}>
        {cls.dispatchers.length === 0 && <p class="hint">Touche + pour créer un Event Dispatcher.</p>}
        {cls.dispatchers.map((d) => {
          const cfg = { owner: cls.id, dispatcher: d.id };
          return (
            <Row
              key={d.id}
              dot={PIN_COLOR.delegate}
              label={d.name}
              selected={focus.kind === 'dispatcher' && focus.id === d.id}
              onClick={() => {
                store.setFocus({ kind: 'dispatcher', id: d.id });
                onOpenDetails();
              }}
              actions={[
                { label: 'Call', onClick: () => placeNode('dispatcher.call', cfg) },
                ...(inEventGraph ? [{ label: 'Bind', onClick: () => placeNode('dispatcher.bind', cfg) }] : []),
              ]}
            />
          );
        })}
      </Section>

      <Section
        title="Interfaces"
        onAdd={() => {
          store.setFocus({ kind: 'class' });
          onOpenDetails();
        }}
      >
        {implemented.length === 0 && <p class="hint">Aucune interface implémentée. Touche + (Class Settings) pour en ajouter une.</p>}
        {implemented.flatMap((i) =>
          i.functions.map((f) => {
            const impl = f.outputs?.length ? implGraph(i.id, f.id) : undefined;
            if (impl) {
              return (
                <Row
                  key={`${i.id}:${f.id}`}
                  label={f.name}
                  sub={`${i.name} · fonction`}
                  selected={store.graphId === impl.id}
                  onClick={() => {
                    if (!cls.graphs.some((g) => g.id === impl.id)) return fromParent();
                    store.openGraph(impl.id);
                    store.setFocus({ kind: 'function', id: impl.id });
                    onOpenDetails();
                  }}
                />
              );
            }
            return (
              <Row
                key={`${i.id}:${f.id}`}
                label={f.name}
                sub={i.name}
                onClick={() => {
                  store.setFocus({ kind: 'interface', id: i.id });
                  onOpenDetails();
                }}
                actions={inEventGraph ? [{ label: 'Event', onClick: () => placeNode('event.interface', { interface: i.id, fn: f.id }) }] : []}
              />
            );
          }),
        )}
      </Section>
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
