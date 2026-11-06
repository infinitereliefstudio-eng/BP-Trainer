/** Right drawer: properties of whatever is selected. */
import type { ComponentChildren } from 'preact';
import { COMPONENT_LABEL, findComponent, findVariable, type Variable } from '@core/model/project';
import { getDefinition, nodeTitle, pinValue, resolvePins } from '@core/nodes/registry';
import {
  removeComponent,
  removeVariable,
  renameComponent,
  renameVariable,
  setVariableType,
  updateVariable,
  variableUsage,
} from '@core/operations/classOps';
import { removeNodes, setNodeConfig, setPinDefault } from '@core/operations/graphOps';
import { renameClass, removeClass } from '@core/operations/projectOps';
import { CATEGORY_LABEL, VARIABLE_CATEGORIES, type PinCategory, type PinType } from '@core/types/pins';
import { hasInlineValue } from '@editor/layout';
import { useStore } from '../hooks';
import type { OpenOverlay } from '../overlayTypes';
import { ValueInput } from '../widgets/ValueInput';
import { NameField } from '../widgets/NameField';

export function Details({ openOverlay }: { openOverlay: OpenOverlay }) {
  const store = useStore();
  const f = store.focus;
  let body: ComponentChildren;
  if (f.kind === 'nodes') body = <NodeDetails />;
  else if (f.kind === 'variable') body = <VariableDetails id={f.id} openOverlay={openOverlay} />;
  else if (f.kind === 'component') body = <ComponentDetails id={f.id} />;
  else if (f.kind === 'class') body = <ClassDetails openOverlay={openOverlay} />;
  else
    body = (
      <p class="hint">
        Sélectionne un nœud, une variable ou un composant pour voir ses propriétés. « Class Settings » affiche celles
        du Blueprint.
      </p>
    );
  return <div class="panel-scroll details">{body}</div>;
}

function Group({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <section class="d-group">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ComponentChildren }) {
  return (
    <div class="d-field">
      <span class="d-label">{label}</span>
      <div class="d-value">{children}</div>
    </div>
  );
}

// -------------------------------------------------------------------- nodes

function NodeDetails() {
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
  const linked = new Set(Object.values(store.graph.links).map((l) => `${l.to.node}:${l.to.pin}`));
  const inputs = resolvePins(node, ctx).filter((p) => hasInlineValue(p) || p.type.category === 'vector');

  return (
    <>
      <Group title={nodeTitle(node, ctx)}>
        <p class="desc">{def?.description}</p>
        <p class="muted small">Catégorie : {def?.category.replace(/\|/g, ' › ')}</p>
        {(node.def === 'var.get' || node.def === 'var.set') && (
          <button class="btn" onClick={() => store.setFocus({ kind: 'variable', id: String(node.config.variable) })}>
            Voir la variable
          </button>
        )}
      </Group>
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
                  {c.choices?.map((o) => (
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
                    store.apply('Modifier un réglage', (_c, g) => setNodeConfig(g, node.id, c.key, value, ctx));
                  }}
                />
              )}
            </Field>
          ))}
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

function typeKey(t: PinType): string {
  return t.category === 'object' ? `object:${t.subtype ?? 'Actor'}` : t.category;
}

function VariableDetails({ id, openOverlay }: { id: string; openOverlay: OpenOverlay }) {
  const store = useStore();
  const v = findVariable(store.cls, id);
  if (!v) return null;
  const objectChoices = ['Actor', ...store.project.classes.map((c) => c.name)];
  const usage = variableUsage(store.cls, v.id);

  const changeType = (key: string, array: boolean) => {
    const [cat, sub] = key.split(':') as [PinCategory, string?];
    const t: PinType = { category: cat, ...(sub ? { subtype: sub } : {}), ...(array ? { container: 'array' as const } : {}) };
    store.apply('Changer le type', (c) => setVariableType(c, v.id, t));
  };

  return (
    <>
      <Group title="Variable">
        <Field label="Variable Name">
          <NameField value={v.name} onCommit={(name) => store.apply('Renommer la variable', (c) => renameVariable(c, v.id, name))} />
        </Field>
        <Field label="Variable Type">
          <select class="field" value={typeKey(v.type)} onChange={(e) => changeType((e.target as HTMLSelectElement).value, v.type.container === 'array')}>
            {VARIABLE_CATEGORIES.filter((c) => c !== 'object').map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
            {objectChoices.map((name) => (
              <option key={name} value={`object:${name}`}>
                {name} (Object Reference)
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tableau (Array)">
          <input type="checkbox" checked={v.type.container === 'array'} onChange={(e) => changeType(typeKey(v.type), (e.target as HTMLInputElement).checked)} />
        </Field>
        <Field label="Instance Editable">
          <input
            type="checkbox"
            checked={v.instanceEditable}
            onChange={(e) => store.apply('Modifier la variable', (c) => updateVariable(c, v.id, { instanceEditable: (e.target as HTMLInputElement).checked }))}
          />
        </Field>
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

// --------------------------------------------------------------- components

function ComponentDetails({ id }: { id: string }) {
  const store = useStore();
  const c = findComponent(store.cls, id);
  if (!c) return null;
  const parent = c.parent ? findComponent(store.cls, c.parent) : undefined;
  return (
    <Group title="Composant">
      <Field label="Nom">
        <NameField value={c.name} onCommit={(name) => store.apply('Renommer le composant', (cl) => renameComponent(cl, c.id, name))} />
      </Field>
      <Field label="Type">
        <span>{COMPONENT_LABEL[c.kind]}</span>
      </Field>
      <Field label="Parent">
        <span>{parent ? parent.name : '— (racine)'}</span>
      </Field>
      {c.parent && (
        <button
          class="btn danger"
          onClick={() => {
            const res = store.apply('Supprimer le composant', (cl) => removeComponent(cl, c.id));
            if (!res.ok) store.warn(res.reason);
          }}
        >
          Supprimer le composant
        </button>
      )}
    </Group>
  );
}

// ------------------------------------------------------------------- class

function ClassDetails({ openOverlay }: { openOverlay: OpenOverlay }) {
  const store = useStore();
  const cls = store.cls;
  return (
    <>
      <Group title="Class Settings">
        <Field label="Nom du Blueprint">
          <NameField value={cls.name} onCommit={(name) => store.applyProject('Renommer le Blueprint', (p) => renameClass(p, cls.id, name))} />
        </Field>
        <Field label="Parent Class">
          <select
            class="field"
            value={cls.parent}
            onChange={(e) => store.apply('Changer la classe parente', (c) => void (c.parent = (e.target as HTMLSelectElement).value as 'Actor' | 'Pawn'))}
          >
            <option value="Actor">Actor</option>
            <option value="Pawn">Pawn</option>
          </select>
        </Field>
        <p class="muted small">
          {cls.components.length} composant(s), {cls.variables.length} variable(s),{' '}
          {cls.graphs.reduce((n, g) => n + Object.keys(g.nodes).length, 0)} nœud(s).
        </p>
      </Group>
      <Group title="Interfaces">
        <p class="muted small">Les Blueprint Interfaces arrivent à l’étape 3.</p>
      </Group>
      <button
        class="btn danger"
        onClick={() =>
          openOverlay({
            kind: 'confirm',
            title: `Supprimer ${cls.name} ?`,
            text: 'Le Blueprint et tous ses graphes seront supprimés. Tu peux annuler avec le bouton ↶.',
            confirmLabel: 'Supprimer',
            onConfirm: () => {
              const res = store.applyProject('Supprimer le Blueprint', (p) => removeClass(p, cls.id));
              if (!res.ok) store.warn(res.reason);
            },
          })
        }
      >
        Supprimer ce Blueprint
      </button>
    </>
  );
}

function TextCommit({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  return (
    <input
      class="field"
      type="text"
      value={value}
      onBlur={(e) => {
        const v = (e.target as HTMLInputElement).value;
        if (v !== value) onCommit(v);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
