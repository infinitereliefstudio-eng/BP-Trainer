/** Right drawer: properties of whatever is selected. */
import type { ComponentChildren } from 'preact';
import { findVariable, type Project, type Variable } from '@core/model/project';
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
import { useStore } from '../hooks';
import type { OpenOverlay } from '../overlayTypes';
import { TypeSelect } from '../widgets/TypeSelect';
import { ValueInput } from '../widgets/ValueInput';
import { NameField } from '../widgets/NameField';
import { ComponentDetails } from './ComponentDetails';
import { EnumDetails } from './EnumDetails';
import { StructDetails } from './StructDetails';
import { Field, Group, TextCommit } from './fields';
import { ClassDetails } from './ClassDetails';
import { ActorDetails, PlayerStartDetails } from './LevelDetails';
import { NodeDiagnosis } from './NodeDiagnosis';
import { DispatcherDetails, FunctionDetails } from './SignatureDetails';
import { InterfaceDetails } from './InterfaceDetails';
import { LocalDetails } from './LocalDetails';

interface DetailsProps {
  openOverlay: OpenOverlay;
  onOpenClass: (classId: string) => void;
  /** The running play session, or the last one: for "why did this node not run?". */
  run?: Simulation;
  onFocusNode: (graphId: string, nodeId: string, classId?: string) => void;
}

export function Details({ openOverlay, onOpenClass, run, onFocusNode }: DetailsProps) {
  const store = useStore();
  const f = store.focus;
  let body: ComponentChildren;
  if (f.kind === 'nodes') body = <NodeDetails run={run} onFocusNode={onFocusNode} openOverlay={openOverlay} />;
  else if (f.kind === 'variable') body = <VariableDetails id={f.id} openOverlay={openOverlay} />;
  else if (f.kind === 'local') body = <LocalDetails graphId={f.graph} id={f.id} openOverlay={openOverlay} />;
  else if (f.kind === 'component') body = <ComponentDetails id={f.id} />;
  else if (f.kind === 'class') body = <ClassDetails openOverlay={openOverlay} />;
  else if (f.kind === 'actor') body = <ActorDetails id={f.id} onOpenClass={onOpenClass} />;
  else if (f.kind === 'playerStart') body = <PlayerStartDetails />;
  else if (f.kind === 'function') body = <FunctionDetails id={f.id} openOverlay={openOverlay} />;
  else if (f.kind === 'dispatcher') body = <DispatcherDetails id={f.id} openOverlay={openOverlay} />;
  else if (f.kind === 'interface') body = <InterfaceDetails id={f.id} openOverlay={openOverlay} />;
  else if (f.kind === 'enum') body = <EnumDetails id={f.id} />;
  else if (f.kind === 'struct') body = <StructDetails id={f.id} />;
  else
    body = (
      <p class="hint">
        Sélectionne un nœud, une variable ou un composant pour voir ses propriétés. « Class Settings » affiche celles
        du Blueprint.
      </p>
    );
  return <div class="panel-scroll details">{body}</div>;
}


// -------------------------------------------------------------------- nodes

function NodeDetails({ run, onFocusNode, openOverlay }: Pick<DetailsProps, 'run' | 'onFocusNode' | 'openOverlay'>) {
  const store = useStore();
  const ids = [...store.selection];
  if (ids.length > 1) {
    return (
      <Group title={`${ids.length} nœuds sélectionnés`}>
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

  return (
    <>
      <Group title={nodeTitle(node, ctx)}>
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
        <p class="muted small">Catégorie : {def?.category.replace(/\|/g, ' › ')}</p>
        {(node.def === 'var.get' || node.def === 'var.set') && (
          <button class="btn" onClick={() => store.setFocus({ kind: 'variable', id: String(node.config.variable) })}>
            Voir la variable
          </button>
        )}
        {(node.def === 'var.getLocal' || node.def === 'var.setLocal') && (
          <button class="btn" onClick={() => store.setFocus({ kind: 'local', graph: store.graph.id, id: String(node.config.variable) })}>
            Voir la variable locale
          </button>
        )}
      </Group>
      {node.def === TIMELINE_NODE && <TimelineSummary nodeId={node.id} openOverlay={openOverlay} />}
      {node.def !== 'util.comment' && node.def !== 'util.reroute' && (
        <NodeDiagnosis run={run} graphId={store.graph.id} nodeId={node.id} onFocusNode={onFocusNode} />
      )}
      {def?.config && (
        <Group title="Réglages">
          {def.config.map((c) => (
            <Field key={c.key} label={c.label}>
              {c.kind === 'choice' ? (
                <select
                  class="field"
                  value={String(node.config[c.key] ?? '')}
                  onChange={(e) =>
                    store.apply('Modifier un réglage', (_c, g) =>
                      setNodeConfig(g, node.id, c.key, (e.target as HTMLSelectElement).value, ctx),
                    )
                  }
                >
                  {(c.choicesFrom ? projectChoices(c.choicesFrom, store.project) : (c.choices ?? [])).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
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
              )}
            </Field>
          ))}
        </Group>
      )}
      {node.def === 'struct.setMembers' && <SetMembersFields nodeId={node.id} />}
      {node.def === 'util.comment' && (
        <Group title="Apparence">
          <Field label="Comment Color">
            <input
              class="field color"
              type="color"
              value={String(node.config.color ?? '#ffffff')}
              onChange={(e) => store.apply('Couleur du commentaire', (_c, g) => setNodeConfig(g, node.id, 'color', (e.target as HTMLInputElement).value, ctx))}
            />
          </Field>
        </Group>
      )}
      {inputs.length > 0 && (
        <Group title="Valeurs par défaut des entrées">
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
    </>
  );
}

// ---------------------------------------------------------------- variables

function VariableDetails({ id, openOverlay }: { id: string; openOverlay: OpenOverlay }) {
  const store = useStore();
  const v = findVariable(store.cls, id);
  if (!v) return null;
  const usage = variableUsage(store.cls, v.id);

  return (
    <>
      <Group title="Variable">
        <Field label="Variable Name">
          <NameField value={v.name} onCommit={(name) => store.apply('Renommer la variable', (c) => renameVariable(c, v.id, name))} />
        </Field>
        <Field label="Variable Type">
          <TypeSelect type={v.type} onChange={(t) => store.apply('Changer le type', (c) => setVariableType(c, v.id, t))} />
        </Field>
        <Field label="Instance Editable">
          <input
            type="checkbox"
            checked={v.instanceEditable}
            onChange={(e) => store.apply('Modifier la variable', (c) => updateVariable(c, v.id, { instanceEditable: (e.target as HTMLInputElement).checked }))}
          />
        </Field>
        <Field label="Expose on Spawn">
          <input
            type="checkbox"
            checked={!!v.exposeOnSpawn}
            onChange={(e) => store.apply('Modifier la variable', (c) => updateVariable(c, v.id, { exposeOnSpawn: (e.target as HTMLInputElement).checked }))}
          />
        </Field>
        <Field label="Private">
          <input
            type="checkbox"
            checked={!!v.private}
            onChange={(e) => store.apply('Modifier la variable', (c) => updateVariable(c, v.id, { private: (e.target as HTMLInputElement).checked }))}
          />
        </Field>
        <p class="muted small">
          Instance Editable règle la valeur acteur par acteur dans le niveau ; Private empêche les autres Blueprints de la lire ou de la modifier. Les deux sont
          indépendants : sans Private, tout Blueprint qui a une référence vers celui-ci peut faire un Set dessus. Expose on Spawn en fait une pin de Spawn Actor,
          donnée avant le BeginPlay.
        </p>
        <Field label="Tooltip">
          <TextCommit value={v.tooltip} onCommit={(t) => store.apply('Modifier la variable', (c) => updateVariable(c, v.id, { tooltip: t }))} />
        </Field>
        <Field label="Category">
          <TextCommit value={v.category} onCommit={(t) => store.apply('Modifier la variable', (c) => updateVariable(c, v.id, { category: t || 'Default' }))} />
        </Field>
      </Group>
      <Group title="Default Value">
        <Field label={v.name}>
          <ValueInput type={v.type} value={v.defaultValue} onChange={(val) => store.apply('Valeur par défaut', (c) => updateVariable(c, v.id, { defaultValue: val }))} />
        </Field>
        <p class="muted small">Valeur au lancement du jeu, avant que ta logique ne la change.</p>
      </Group>
      <Group title="Utilisation">
        <p class="muted small">{usage === 0 ? 'Aucun nœud ne l’utilise.' : `${usage} nœud(s) Get/Set l’utilisent.`}</p>
        <button class="btn danger" onClick={() => confirmDeleteVariable(v, usage, openOverlay, () => store.apply('Supprimer la variable', (c) => removeVariable(c, v.id)))}>
          Supprimer la variable
        </button>
      </Group>
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
function projectChoices(from: 'enums' | 'classes', p: Project): { value: string; label: string }[] {
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
    <Group title="Membres à changer">
      {s.members.map((m) => (
        <Field key={m.id} label={m.name}>
          <input type="checkbox" checked={shown.includes(m.id)} onChange={(e) => toggle(m.id, (e.target as HTMLInputElement).checked)} />
        </Field>
      ))}
      <p class="muted small">Seuls les membres cochés ont une pin et changent ; les autres gardent leur valeur.</p>
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
      <p class="hint">Double toucher le nœud ouvre aussi l’éditeur, comme le double-clic dans UE.</p>
    </Group>
  );
}
