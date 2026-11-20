/** Right drawer: properties of whatever is selected. */
import type { ConfigField, NodeDefinition } from '@core/nodes/definition';
import { useEffect, useState } from 'preact/hooks';
import { normalize } from '@core/nodes/palette';
import type { ComponentChildren } from 'preact';
import { findVariable, type NodeInstance, type Project, type Variable } from '@core/model/project';
import { BUILTIN_ENUMS } from '@core/types/enums';
import { findStruct } from '@core/types/structs';
import { getDefinition, nodeTitle, pinValue, resolvePins } from '@core/nodes/registry';
import {
  removeVariable,
  renameVariable,
  setVariableType,
  updateVariable,
  variableUsage,
} from '@core/operations/classOps';
import { removeNodes, setNodeConfig, setPinDefault } from '@core/operations/graphOps';
import { renameCustomEvent } from '@core/operations/projectOps';
import { inUeFor, trapFor } from '@core/explain/notes';
import { readTimeline, TIMELINE_NODE } from '@core/nodes/library/timeline';
import type { Simulation } from '@core/runtime/simulation';
import { hasInlineValue } from '@editor/layout';
import type { Value } from '@core/types/values';
import { useStore } from '../hooks';
import type { OpenOverlay } from '../overlayTypes';
import { TypeSelect } from '../widgets/TypeSelect';
import { ValueInput } from '../widgets/ValueInput';
import { NameField } from '../widgets/NameField';
import { ComponentDetails } from './ComponentDetails';
import { WidgetDetails } from './WidgetDetails';
import { EnumDetails } from './EnumDetails';
import { DataTableDetails } from './DataTableDetails';
import { InputActionDetails, MappingContextDetails } from './InputDetails';
import { ClassDefaults } from './ClassDefaults';
import { StructDetails } from './StructDetails';
import { AppHelp, Check, DetailsFilter, Field, Group, TextCommit } from './fields';
import { ClassDetails } from './ClassDetails';
import { ActorDetails, PlayerStartDetails } from './LevelDetails';
import { NodeDiagnosis } from './NodeDiagnosis';
import { DispatcherDetails, FunctionDetails } from './SignatureDetails';
import { InterfaceDetails } from './InterfaceDetails';
import { LocalDetails } from './LocalDetails';

interface DetailsProps {
  openOverlay: OpenOverlay;
  onOpenClass: (classId: string) => void;
  /** Open a graph of the Blueprint being edited (a widget's Binding), leaving the Designer. */
  onOpenGraph?: (graphId: string) => void;
  /** The running play session, or the last one: for "why did this node not run?". */
  run?: Simulation;
  onFocusNode: (graphId: string, nodeId: string, classId?: string) => void;
  /** Find References: open Find Results on this search. */
  onFind?: (query: string) => void;
  /** Place a node in the open graph (an Actor Component's « On … » event). */
  placeNode?: (def: string, config: Record<string, Value>) => void;
}

export function Details({ openOverlay, onOpenClass, onOpenGraph, run, onFocusNode, onFind, placeNode }: DetailsProps) {
  const store = useStore();
  const f = store.focus;
  const [search, setSearch] = useState('');
  // A new selection starts with every property shown, as UE clears the search.
  const focusKey = JSON.stringify(f);
  useEffect(() => setSearch(''), [focusKey]);
  let body: ComponentChildren;
  if (f.kind === 'nodes') body = <NodeDetails run={run} onFocusNode={onFocusNode} openOverlay={openOverlay} onFind={onFind} />;
  else if (f.kind === 'variable') body = <VariableDetails id={f.id} openOverlay={openOverlay} onFind={onFind} />;
  else if (f.kind === 'local') body = <LocalDetails graphId={f.graph} id={f.id} openOverlay={openOverlay} />;
  else if (f.kind === 'component') body = <ComponentDetails id={f.id} placeNode={placeNode} onOpenClass={onOpenClass} />;
  else if (f.kind === 'widget') body = <WidgetDetails id={f.id} onOpenClass={onOpenClass} onOpenGraph={onOpenGraph} onFocusNode={onFocusNode} />;
  else if (f.kind === 'class') body = <ClassDetails openOverlay={openOverlay} />;
  else if (f.kind === 'classDefaults') body = <ClassDefaults />;
  else if (f.kind === 'actor') body = <ActorDetails id={f.id} onOpenClass={onOpenClass} />;
  else if (f.kind === 'playerStart') body = <PlayerStartDetails />;
  else if (f.kind === 'function') body = <FunctionDetails id={f.id} openOverlay={openOverlay} />;
  else if (f.kind === 'dispatcher') body = <DispatcherDetails id={f.id} openOverlay={openOverlay} />;
  else if (f.kind === 'interface') body = <InterfaceDetails id={f.id} openOverlay={openOverlay} />;
  else if (f.kind === 'enum') body = <EnumDetails id={f.id} />;
  else if (f.kind === 'struct') body = <StructDetails id={f.id} />;
  else if (f.kind === 'dataTable') body = <DataTableDetails id={f.id} />;
  else if (f.kind === 'inputAction') body = <InputActionDetails id={f.id} />;
  else if (f.kind === 'mappingContext') body = <MappingContextDetails id={f.id} />;
  else
    return (
      <div class="panel-scroll details">
        <p class="hint">Select an object to view details.</p>
        <p class="hint app-only-text">Sélectionne un nœud, une variable ou un composant pour voir ses propriétés. « Class Settings » affiche celles du Blueprint.</p>
      </div>
    );
  const q = normalize(search.trim());
  return (
    <div class={`panel-scroll details${q ? ' filtering' : ''}`}>
      <div class="details-search">
        <input class="field search" type="search" placeholder="Search Details" value={search} onInput={(e) => setSearch((e.target as HTMLInputElement).value)} />
      </div>
      <DetailsFilter.Provider value={q}>{body}</DetailsFilter.Provider>
    </div>
  );
}

// -------------------------------------------------------------------- nodes

/** UE's section for a node's own properties. */
function configSection(def: NodeDefinition): string {
  if (def.id === 'util.comment') return 'Comment';
  if (def.id === 'event.inputKey' || def.id.startsWith('input.')) return 'Input';
  if (def.kind === 'event') return 'Graph';
  if (def.config?.some((c) => /index|pin|nombre|case/i.test(`${c.key} ${c.label}`))) return 'Pin Options';
  return 'Default';
}

type NodeProps = Pick<DetailsProps, 'run' | 'onFocusNode' | 'openOverlay' | 'onFind'>;

function NodeDetails({ run, onFocusNode, openOverlay, onFind }: NodeProps) {
  const store = useStore();
  const ids = [...store.selection];
  if (ids.length > 1) {
    return (
      <Group title={`${ids.length} nœuds sélectionnés`} app>
        <button class="btn danger" onClick={() => store.apply('Supprimer des nœuds', (_c, g) => removeNodes(g, ids))}>
          Supprimer la sélection
        </button>
      </Group>
    );
  }
  const node = store.graph.nodes[ids[0]];
  if (!node) return null;
  const def = getDefinition(node.def);
  const ctx = store.ctx;
  const trap = trapFor(node, ctx);
  const inUe = inUeFor(node);
  const linked = new Set(Object.values(store.graph.links).map((l) => `${l.to.node}:${l.to.pin}`));
  const inputs = resolvePins(node, ctx).filter(
    (p) => p.dir === 'in' && (hasInlineValue(p) || ((p.type.category === 'vector' || p.type.category === 'rotator') && !p.type.container)),
  );
  // Selecting a Get or Set shows its variable, as UE does.
  const ownVariable = (node.def === 'var.get' || node.def === 'var.set') && findVariable(store.cls, String(node.config.variable));
  const isLocal = node.def === 'var.getLocal' || node.def === 'var.setLocal';
  const fields = def?.config?.filter((c) => !(node.def === 'util.comment' && c.key === 'color'));

  return (
    <>
      {ownVariable && <VariableSections v={ownVariable} />}
      {isLocal && <LocalDetails graphId={store.graph.id} id={String(node.config.variable)} openOverlay={openOverlay} />}
      {def && fields && fields.length > 0 && (
        <Group title={configSection(def)}>
          {fields.map((c) => (
            <Field key={c.key} label={c.key === 'text' && node.def === 'util.comment' ? 'Comment' : c.label}>
              <ConfigInput node={node} field={c} />
            </Field>
          ))}
          {node.def === 'util.comment' && <CommentColor nodeId={node.id} />}
        </Group>
      )}
      {node.def === TIMELINE_NODE && <TimelineSummary nodeId={node.id} openOverlay={openOverlay} />}
      {node.def === 'struct.setMembers' && <SetMembersFields nodeId={node.id} />}

      {inputs.length > 0 && (
        <Group title="Pin Values" app>
          {inputs.map((p) =>
            linked.has(`${node.id}:${p.id}`) ? (
              <Field key={p.id} label={p.name}>
                <span class="muted">reliée</span>
              </Field>
            ) : (
              <Field key={p.id} label={p.name || 'Valeur'}>
                <ValueInput
                  type={p.type}
                  value={pinValue(node, p)}
                  onChange={(v) => store.apply('Modifier une valeur', (_c, g) => setPinDefault(g, node.id, p.id, v))}
                />
              </Field>
            ),
          )}
        </Group>
      )}
      {node.def !== 'util.comment' && node.def !== 'util.reroute' && (
        <NodeDiagnosis run={run} graphId={store.graph.id} nodeId={node.id} onFocusNode={onFocusNode} />
      )}
      {ownVariable && <VariableUsage v={ownVariable} openOverlay={openOverlay} onFind={onFind} />}

      <AppHelp>
        <p class="help-title">{nodeTitle(node, ctx)}</p>
        <p class="desc">{def?.description}</p>
        {trap && (
          <p class="dnote trap-note">
            <span class="note-tag trap">Piège</span> {trap}
          </p>
        )}
        {inUe && (
          <p class="dnote in-ue-note">
            <span class="note-tag in-ue">Dans UE</span> {inUe}
          </p>
        )}
        {fields
          ?.filter((c) => c.help)
          .map((c) => (
            <p key={c.key}>
              <b>{c.label}</b> : {c.help}
            </p>
          ))}
        {inputs.length > 0 && <p>Pin Values : dans UE, ces valeurs se tapent directement sur les pins du nœud. Ici, c’est plus confortable au doigt.</p>}
        {ownVariable && <VariableHelp />}
        <p class="muted small">Catégorie : {def?.category.replace(/\|/g, ' › ')}</p>
        {isLocal && (
          <button class="btn" onClick={() => store.setFocus({ kind: 'local', graph: store.graph.id, id: String(node.config.variable) })}>
            Voir la variable locale
          </button>
        )}
      </AppHelp>
    </>
  );
}

/** One setting of a node, edited with the widget its kind needs. */
function ConfigInput({ node, field: c }: { node: NodeInstance; field: ConfigField }) {
  const store = useStore();
  const ctx = store.ctx;
  if (c.kind === 'bool') {
    return (
      <Check
        checked={node.config[c.key] !== false}
        onChange={(v) => store.apply('Modifier un réglage', (_c, g) => setNodeConfig(g, node.id, c.key, v, ctx))}
      />
    );
  }
  if (c.kind === 'choice') {
    return (
      <select
        class="field"
        value={String(node.config[c.key] ?? '')}
        onChange={(e) => store.apply('Modifier un réglage', (_c, g) => setNodeConfig(g, node.id, c.key, (e.target as HTMLSelectElement).value, ctx))}
      >
        {(c.choicesFrom ? projectChoices(c.choicesFrom, store.project) : (c.choices ?? [])).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  return (
    <ValueInput
      type={{ category: c.kind === 'int' ? 'int' : 'string' }}
      value={node.config[c.key] ?? ''}
      onChange={(v) => {
        let value = v;
        if (c.kind === 'int') value = Math.max(c.min ?? -1e9, Math.min(c.max ?? 1e9, Number(v)));
        if (c.kind === 'string' && !String(v).trim()) return;
        if (node.def === 'event.custom' && c.key === 'name') {
          const res = store.applyProject('Renommer l’événement', (p) => renameCustomEvent(p, store.cls.id, node.id, String(value)));
          if (!res.ok) store.warn(res.reason);
          return;
        }
        store.apply('Modifier un réglage', (_c, g) => setNodeConfig(g, node.id, c.key, value, ctx));
      }}
    />
  );
}

function CommentColor({ nodeId }: { nodeId: string }) {
  const store = useStore();
  const node = store.graph.nodes[nodeId];
  if (!node) return null;
  return (
    <Field label="Comment Color">
      <input
        class="field color"
        type="color"
        value={String(node.config.color ?? '#ffffff')}
        onChange={(e) => store.apply('Couleur du commentaire', (_c, g) => setNodeConfig(g, node.id, 'color', (e.target as HTMLInputElement).value, store.ctx))}
      />
    </Field>
  );
}

// ---------------------------------------------------------------- variables

function VariableDetails({ id, openOverlay, onFind }: { id: string; openOverlay: OpenOverlay; onFind?: (query: string) => void }) {
  const store = useStore();
  const v = findVariable(store.cls, id);
  if (!v) return null;
  return (
    <>
      <VariableSections v={v} />
      <VariableUsage v={v} openOverlay={openOverlay} onFind={onFind} />
      <AppHelp>
        <VariableHelp />
      </AppHelp>
    </>
  );
}

/** UE's sections of a variable: Variable, then Default Value. */
function VariableSections({ v }: { v: Variable }) {
  const store = useStore();
  const set = (patch: Partial<Variable>) => store.apply('Modifier la variable', (c) => updateVariable(c, v.id, patch));
  return (
    <>
      <Group title="Variable">
        <Field label="Variable Name">
          <NameField value={v.name} onCommit={(name) => store.apply('Renommer la variable', (c) => renameVariable(c, v.id, name))} />
        </Field>
        <Field label="Variable Type">
          <TypeSelect type={v.type} onChange={(t) => store.apply('Changer le type', (c) => setVariableType(c, v.id, t))} />
        </Field>
        <Field label="Description">
          <TextCommit value={v.tooltip} onCommit={(t) => set({ tooltip: t })} />
        </Field>
        <Field label="Instance Editable">
          <Check checked={v.instanceEditable} onChange={(on) => set({ instanceEditable: on })} />
        </Field>
        <Field label="Expose on Spawn">
          <Check checked={!!v.exposeOnSpawn} onChange={(on) => set({ exposeOnSpawn: on })} />
        </Field>
        <Field label="Private">
          <Check checked={!!v.private} onChange={(on) => set({ private: on })} />
        </Field>
        <Field label="Category">
          <TextCommit value={v.category} onCommit={(t) => set({ category: t || 'Default' })} />
        </Field>
      </Group>
      <Group title="Default Value">
        <Field label={v.name}>
          <ValueInput type={v.type} value={v.defaultValue} onChange={(val) => set({ defaultValue: val })} />
        </Field>
      </Group>
    </>
  );
}

/** Where the variable is used, Find References and deleting it: from UE's right-click menu, gathered here. */
function VariableUsage({ v, openOverlay, onFind }: { v: Variable; openOverlay: OpenOverlay; onFind?: (query: string) => void }) {
  const store = useStore();
  const usage = variableUsage(store.cls, v.id);
  return (
    <Group title="Utilisation" app>
      <p class="muted small">{usage === 0 ? 'Aucun nœud ne l’utilise.' : `${usage} nœud(s) Get/Set l’utilisent.`}</p>
      <div class="row-buttons">
        {onFind && (
          <button class="btn" onClick={() => onFind(v.name)}>
            Find References
          </button>
        )}
        <button class="btn danger" onClick={() => confirmDeleteVariable(v, usage, openOverlay, () => store.apply('Supprimer la variable', (c) => removeVariable(c, v.id)))}>
          Supprimer la variable
        </button>
      </div>
    </Group>
  );
}

function VariableHelp() {
  return (
    <>
      <p>
        <b>Instance Editable</b> règle la valeur acteur par acteur dans le niveau ; <b>Private</b> empêche les autres Blueprints de la lire ou de la modifier. Les
        deux sont indépendants : sans Private, tout Blueprint qui a une référence vers celui-ci peut faire un Set dessus. <b>Expose on Spawn</b> en fait une pin
        de Spawn Actor, donnée avant le BeginPlay.
      </p>
      <p>
        <b>Default Value</b> : la valeur au lancement du jeu, avant que ta logique ne la change. <b>Description</b> s’affiche en info-bulle dans UE.
      </p>
    </>
  );
}

function confirmDeleteVariable(v: Variable, usage: number, openOverlay: OpenOverlay, run: () => void) {
  if (usage === 0) return run();
  openOverlay({
    kind: 'confirm',
    title: `Supprimer ${v.name} ?`,
    text: `${usage} nœud(s) utilisent cette variable et seront supprimés avec elle.`,
    confirmLabel: 'Supprimer',
    onConfirm: run,
  });
}

/** Choices of a node setting that come from the project (Enums, Blueprints). */
function projectChoices(from: NonNullable<ConfigField['choicesFrom']>, p: Project): { value: string; label: string }[] {
  if (from === 'inputActions') return [{ value: '', label: 'None' }, ...(p.inputActions ?? []).map((a) => ({ value: a.id, label: a.name }))];
  if (from === 'mappingContexts') return [{ value: '', label: 'None' }, ...(p.mappingContexts ?? []).map((c) => ({ value: c.id, label: c.name }))];
  if (from === 'dataTables') return [{ value: '', label: 'None' }, ...(p.dataTables ?? []).map((t) => ({ value: t.id, label: t.name }))];
  if (from === 'saveGames') return [{ value: '', label: 'None' }, ...p.classes.filter((c) => c.parent === 'SaveGame').map((c) => ({ value: c.id, label: c.name }))];
  if (from === 'classes') return [{ value: '', label: '—' }, ...p.classes.map((c) => ({ value: c.id, label: c.name }))];
  return [{ value: '', label: '—' }, ...Object.keys(BUILTIN_ENUMS).map((n) => ({ value: n, label: n })), ...p.enums.map((e) => ({ value: e.name, label: e.name }))];
}

/** Set Members in: the members it changes, ticked one by one as in UE's Details. */
function SetMembersFields({ nodeId }: { nodeId: string }) {
  const store = useStore();
  const node = store.graph.nodes[nodeId];
  const s = node && findStruct(store.project, String(node.config.struct ?? ''));
  if (!node || !s) return null;
  const shown = String(node.config.fields ?? '')
    .split(',')
    .filter(Boolean);
  const toggle = (id: string, on: boolean) => {
    const next = s.members.map((m) => m.id).filter((m) => (m === id ? on : shown.includes(m)));
    store.apply('Membres à changer', (_c, g) => setNodeConfig(g, nodeId, 'fields', next.join(','), store.ctx));
  };
  return (
    <Group title="Pin Options">
      {s.members.map((m) => (
        <Field key={m.id} label={m.name}>
          <input type="checkbox" checked={shown.includes(m.id)} onChange={(e) => toggle(m.id, (e.target as HTMLInputElement).checked)} />
        </Field>
      ))}
      <p class="muted small app-only-text">Seuls les membres cochés ont une pin et changent ; les autres gardent leur valeur.</p>
    </Group>
  );
}

/** A Timeline node: what it holds, and the way into its track editor. */
function TimelineSummary({ nodeId, openOverlay }: { nodeId: string; openOverlay: OpenOverlay }) {
  const store = useStore();
  const node = store.graph.nodes[nodeId];
  if (!node) return null;
  const data = readTimeline(node);
  return (
    <Group title="Timeline">
      <Field label="Length">
        <span>{String(data.length).replace('.', ',')} s</span>
      </Field>
      <Field label="Pistes">
        <span>{data.tracks.map((t) => `${t.name} (${t.keys.length} points)`).join(', ') || 'aucune'}</span>
      </Field>
      <Field label="Options">
        <span>{[data.loop && 'Loop', data.autoPlay && 'Auto Play'].filter(Boolean).join(', ') || 'aucune'}</span>
      </Field>
      <button class="btn primary" onClick={() => openOverlay({ kind: 'timeline', nodeId })}>
        Éditer la piste
      </button>
      <p class="hint app-only-text">Double toucher le nœud ouvre aussi l’éditeur, comme le double-clic dans UE.</p>
    </Group>
  );
}
