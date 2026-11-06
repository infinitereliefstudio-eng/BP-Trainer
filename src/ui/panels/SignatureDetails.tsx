/**
 * Details of things that have a signature: functions, Event Dispatchers,
 * and Blueprint Interface assets.
 */
import { findDispatcher, findGraph, findInterface, type Param } from '@core/model/project';
import {
  addDispatcherParam,
  removeDispatcher,
  removeDispatcherParam,
  renameDispatcher,
  updateDispatcherParam,
  validateName,
} from '@core/operations/classOps';
import {
  addFunctionParam,
  removeFunction,
  removeFunctionParam,
  renameFunction,
  setFunctionDescription,
  setFunctionPure,
  updateFunctionParam,
  type ParamSide,
} from '@core/operations/functionOps';
import {
  addInterfaceFunction,
  removeInterface,
  removeInterfaceFunction,
  renameInterface,
  renameInterfaceFunction,
  pruneProject,
} from '@core/operations/projectOps';
import type { OpResult } from '@core/operations/graphOps';
import type { PinType } from '@core/types/pins';
import { useStore } from '../hooks';
import type { OpenOverlay } from '../overlayTypes';
import { NameField } from '../widgets/NameField';
import { TypeSelect } from '../widgets/TypeSelect';
import { Check, Field, Group, TextCommit } from './fields';

/** Editable list of parameters: name and type, with a delete button. */
function ParamList(props: {
  params: Param[];
  onAdd: () => void;
  onRename: (id: string, name: string) => OpResult;
  onType: (id: string, type: PinType) => void;
  onRemove: (id: string) => void;
  addLabel: string;
}) {
  return (
    <>
      {props.params.length === 0 && <p class="muted small">Aucun paramètre.</p>}
      {props.params.map((p) => (
        <div class="param-block" key={p.id}>
          <div class="param-row">
            <NameField value={p.name} onCommit={(name) => props.onRename(p.id, name)} />
            <button class="chip danger" aria-label={`Supprimer ${p.name}`} onClick={() => props.onRemove(p.id)}>
              ✕
            </button>
          </div>
          <TypeSelect type={p.type} onChange={(t) => props.onType(p.id, t)} />
        </div>
      ))}
      <button class="btn" onClick={props.onAdd}>
        {props.addLabel}
      </button>
    </>
  );
}

// ---------------------------------------------------------------- functions

export function FunctionDetails({ id, openOverlay }: { id: string; openOverlay: OpenOverlay }) {
  const store = useStore();
  const cls = store.cls;
  const g = findGraph(cls, id);
  if (!g?.fn) return null;
  const fn = g.fn;
  const param = (side: ParamSide) => (
    <ParamList
      params={fn[side]}
      addLabel={side === 'inputs' ? '+ Input' : '+ Output'}
      onAdd={() => store.applyProject('Ajouter un paramètre', (p) => void addFunctionParam(p, cls, id, side))}
      onRename={(pid, name) => store.applyProject('Renommer le paramètre', (p) => updateFunctionParam(p, cls, id, pid, { name }))}
      onType={(pid, type) => store.applyProject('Changer le type', (p) => updateFunctionParam(p, cls, id, pid, { type }))}
      onRemove={(pid) => store.applyProject('Supprimer le paramètre', (p) => removeFunctionParam(p, cls, id, pid))}
    />
  );
  return (
    <>
      <Group title="Fonction">
        <Field label="Nom">
          <NameField
            value={g.name}
            onCommit={(name) => store.apply('Renommer la fonction', (c) => renameFunction(c, id, name))}
          />
        </Field>
        <Field label="Pure">
          <Check checked={fn.pure} onChange={(v) => store.applyProject('Fonction pure', (p) => setFunctionPure(p, cls, id, v))} />
        </Field>
        <p class="muted small">
          Pure : pas de pin d'exécution, recalculée à chaque lecture. À réserver aux calculs qui ne changent rien dans le monde.
        </p>
        <Field label="Description">
          <TextCommit value={fn.description} onCommit={(t) => store.apply('Description', (c) => setFunctionDescription(c, id, t))} />
        </Field>
      </Group>
      <Group title="Inputs">{param('inputs')}</Group>
      <Group title="Outputs">{param('outputs')}</Group>
      <div class="row-buttons">
        <button class="btn" onClick={() => store.openGraph(id)}>
          Ouvrir le graphe
        </button>
        <button
          class="btn danger"
          onClick={() =>
            openOverlay({
              kind: 'confirm',
              title: `Supprimer ${g.name} ?`,
              text: 'La fonction et tous les nœuds qui l’appellent seront supprimés.',
              confirmLabel: 'Supprimer',
              onConfirm: () => {
                if (store.graphId === id) store.openGraph(cls.graphs[0].id);
                store.applyProject('Supprimer la fonction', (p) => removeFunction(p, cls, id));
              },
            })
          }
        >
          Supprimer
        </button>
      </div>
    </>
  );
}

// -------------------------------------------------------------- dispatchers

export function DispatcherDetails({ id, openOverlay }: { id: string; openOverlay: OpenOverlay }) {
  const store = useStore();
  const cls = store.cls;
  const d = findDispatcher(cls, id);
  if (!d) return null;
  return (
    <>
      <Group title="Event Dispatcher">
        <Field label="Nom">
          <NameField
            value={d.name}
            onCommit={(name) => store.apply('Renommer le dispatcher', (c) => renameDispatcher(c, id, name))}
          />
        </Field>
        <p class="muted small">
          Un dispatcher est une annonce : ce Blueprint l'appelle (Call), et tous les Blueprints qui s'y sont abonnés (Bind) réagissent aussitôt. Celui
          qui annonce n'a pas besoin de les connaître.
        </p>
      </Group>
      <Group title="Inputs">
        <ParamList
          params={d.params}
          addLabel="+ Input"
          onAdd={() => store.applyProject('Ajouter un paramètre', () => addDispatcherParam(cls, id))}
          onRename={(pid, name): OpResult => {
            const err = validateName(name, d.params.filter((x) => x.id !== pid).map((x) => x.name));
            if (err) return { ok: false, reason: err };
            store.applyProject('Renommer le paramètre', () => updateDispatcherParam(cls, id, pid, { name: name.trim() }));
            return { ok: true, value: undefined };
          }}
          onType={(pid, type) =>
            store.applyProject('Changer le type', (p) => {
              updateDispatcherParam(cls, id, pid, { type });
              pruneProject(p);
            })
          }
          onRemove={(pid) =>
            store.applyProject('Supprimer le paramètre', (p) => {
              removeDispatcherParam(cls, id, pid);
              pruneProject(p);
            })
          }
        />
        <p class="muted small">Les Custom Events reliés à ce dispatcher reçoivent ces paramètres.</p>
      </Group>
      <button
        class="btn danger"
        onClick={() =>
          openOverlay({
            kind: 'confirm',
            title: `Supprimer ${d.name} ?`,
            text: 'Les nœuds Call, Bind et Unbind qui l’utilisent seront supprimés, dans tous les Blueprints.',
            confirmLabel: 'Supprimer',
            onConfirm: () => store.applyProject('Supprimer le dispatcher', (p) => removeDispatcher(p, cls, id)),
          })
        }
      >
        Supprimer
      </button>
    </>
  );
}

// --------------------------------------------------------------- interfaces

export function InterfaceDetails({ id, openOverlay }: { id: string; openOverlay: OpenOverlay }) {
  const store = useStore();
  const iface = findInterface(store.project, id);
  if (!iface) return null;
  const users = store.project.classes.filter((c) => c.interfaces.includes(id)).map((c) => c.name);
  return (
    <>
      <Group title="Blueprint Interface">
        <Field label="Nom">
          <NameField
            value={iface.name}
            onCommit={(name) => store.applyProject('Renommer l’interface', (p) => renameInterface(p, id, name))}
          />
        </Field>
        <p class="muted small">
          Une interface est une liste de fonctions sans contenu. Chaque Blueprint qui l'implémente (Class Settings) décide de ce qu'elles font.
        </p>
        <p class="muted small">Implémentée par : {users.length ? users.join(', ') : 'aucun Blueprint'}.</p>
      </Group>
      <Group title="Fonctions">
        {iface.functions.map((f) => (
          <div class="param-row" key={f.id}>
            <NameField
              value={f.name}
              onCommit={(name) => store.applyProject('Renommer la fonction', (p) => renameInterfaceFunction(p, id, f.id, name))}
            />
            <button
              class="chip danger"
              aria-label={`Supprimer ${f.name}`}
              onClick={() => store.applyProject('Supprimer la fonction', (p) => removeInterfaceFunction(p, id, f.id))}
            >
              ✕
            </button>
          </div>
        ))}
        <button class="btn" onClick={() => store.applyProject('Ajouter une fonction', (p) => addInterfaceFunction(p, id))}>
          + Fonction
        </button>
      </Group>
      <button
        class="btn danger"
        onClick={() =>
          openOverlay({
            kind: 'confirm',
            title: `Supprimer ${iface.name} ?`,
            text: 'Les Blueprints qui l’implémentent perdront ses événements, et les messages qui l’utilisent seront supprimés.',
            confirmLabel: 'Supprimer',
            onConfirm: () => store.applyProject('Supprimer l’interface', (p) => removeInterface(p, id)),
          })
        }
      >
        Supprimer l’interface
      </button>
    </>
  );
}
