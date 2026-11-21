/**
 * Details of things that have a signature: functions and Event Dispatchers
 * (Blueprint Interface assets: InterfaceDetails.tsx).
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
import { pruneProject } from '@core/operations/projectOps';
import type { OpResult } from '@core/operations/graphOps';
import type { PinType } from '@core/types/pins';
import { useStore } from '../hooks';
import type { OpenOverlay } from '../overlayTypes';
import { NameField } from '../widgets/NameField';
import { TypeSelect } from '../widgets/TypeSelect';
import { AppHelp, Check, Field, Group, TextCommit } from './fields';

/** Editable list of parameters: name and type, with a delete button. */
export function ParamList(props: {
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
  if (g.iface) return <InterfaceFunctionDetails graphId={id} />;
  if (g.override) return <OverrideFunctionDetails graphId={id} openOverlay={openOverlay} />;
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
      <Group title="Graph">
        <Field label="Function Name">
          <NameField
            value={g.name}
            onCommit={(name) => store.apply('Renommer la fonction', (c) => renameFunction(c, id, name))}
          />
        </Field>
        <Field label="Description">
          <TextCommit value={fn.description} onCommit={(t) => store.apply('Description', (c) => setFunctionDescription(c, id, t))} />
        </Field>
        <Field label="Pure">
          <Check checked={fn.pure} onChange={(v) => store.applyProject('Fonction pure', (p) => setFunctionPure(p, cls, id, v))} />
        </Field>
      </Group>
      <Group title="Inputs">{param('inputs')}</Group>
      <Group title="Outputs">{param('outputs')}</Group>
      <Group title="Fonction" app>
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
      </Group>
      <AppHelp>
        <p>
          <b>Pure</b> : pas de pin d'exécution, recalculée à chaque lecture. À réserver aux calculs qui ne changent rien dans le monde.
        </p>
        <p>
          <b>Inputs</b> deviennent des pins de sortie du nœud d’entrée et des pins d’entrée du nœud d’appel ; <b>Outputs</b> sont les pins du nœud Return Node.
        </p>
      </AppHelp>
    </>
  );
}

/** A function that overrides the parent's (a GameMode's Choose Player Start): UE gives its name and signature. */
function OverrideFunctionDetails({ graphId, openOverlay }: { graphId: string; openOverlay: OpenOverlay }) {
  const store = useStore();
  const cls = store.cls;
  const g = findGraph(cls, graphId);
  if (!g?.fn) return null;
  const sig = (side: 'inputs' | 'outputs') => g.fn![side].map((p) => `${p.name} (${p.type.subtype ?? p.type.category})`).join(', ') || 'aucun';
  return (
    <>
      <Group title="Graph">
        <Field label="Function Name">
          <span class="dbg-val">{g.name}</span>
        </Field>
        <Field label="Inputs">
          <span class="dbg-val">{sig('inputs')}</span>
        </Field>
        <Field label="Outputs">
          <span class="dbg-val">{sig('outputs')}</span>
        </Field>
      </Group>
      <Group title="Fonction" app>
        <div class="row-buttons">
          <button class="btn" onClick={() => store.openGraph(graphId)}>
            Ouvrir le graphe
          </button>
          <button
            class="btn danger"
            onClick={() =>
              openOverlay({
                kind: 'confirm',
                title: `Supprimer ${g.name} ?`,
                text:
                  g.override === 'ChoosePlayerStart'
                    ? 'Le GameMode reprendra le choix d’UE : un Player Start libre, au hasard s’il y en a plusieurs.'
                    : 'Le GameMode reprendra sa Default Pawn Class (Class Defaults).',
                confirmLabel: 'Supprimer',
                onConfirm: () => {
                  if (store.graphId === graphId) store.openGraph(cls.graphs[0].id);
                  store.applyProject('Supprimer la surcharge', (p) => removeFunction(p, cls, graphId));
                },
              })
            }
          >
            Supprimer
          </button>
        </div>
      </Group>
      <AppHelp>
        <p>
          Une fonction <b>surchargée</b> (Override) : c’est le moteur qui l’appelle, par son nom. Son nom et ses paramètres sont ceux de la classe parente.
        </p>
        {g.override === 'ChoosePlayerStart' ? (
          <p>
            <b>Choose Player Start</b> : le GameMode l’appelle à chaque niveau, avant les BeginPlay, pour savoir où faire apparaître le joueur. Rends un acteur
            (souvent un Player Start, trouvé par Get All Actors Of Class et son Player Start Tag). None : dans UE, le joueur n’apparaît pas.
          </p>
        ) : (
          <p>
            <b>Get Default Pawn Class For Controller</b> : le GameMode l’appelle à chaque niveau, avant les BeginPlay, pour savoir quel pion créer. Rends une
            classe de Pawn (par exemple celle choisie dans un menu et gardée dans le GameInstance), avec un repli si rien n’est choisi. Le GameMode crée un seul
            pion, de cette classe : pas besoin de Spawn Actor. None : dans UE, le joueur n’a pas de pion.
          </p>
        )}
      </AppHelp>
    </>
  );
}

/** A function graph implementing an interface function: its signature belongs to the interface. */
function InterfaceFunctionDetails({ graphId }: { graphId: string }) {
  const store = useStore();
  const g = findGraph(store.cls, graphId);
  const iface = g?.iface && findInterface(store.project, g.iface.interface);
  if (!g?.fn || !iface) return null;
  const list = (ps: Param[]) => (ps.length ? ps.map((p) => p.name).join(', ') : 'aucune');
  return (
    <>
      <Group title="Graph">
        <Field label="Function Name">
          <span>{g.name}</span>
        </Field>
        <Field label="Interface">
          <span>{iface.name}</span>
        </Field>
        <Field label="Inputs">
          <span class="muted">{list(g.fn.inputs)}</span>
        </Field>
        <Field label="Outputs">
          <span class="muted">{list(g.fn.outputs)}</span>
        </Field>
      </Group>
      <div class="row-buttons">
        <button class="btn" onClick={() => store.openGraph(graphId)}>
          Ouvrir le graphe
        </button>
        <button class="btn" onClick={() => store.setFocus({ kind: 'interface', id: iface.id })}>
          Voir {iface.name}
        </button>
      </div>
      <AppHelp>
        <p>
          Implémentation de {g.name}, fonction de {iface.name}. Elle s'exécute quand un autre Blueprint envoie le message {g.name} à celui-ci, et
          renvoie ses sorties au nœud Message. Son nom, ses entrées et ses sorties se règlent dans l'interface.
        </p>
      </AppHelp>
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
      <Group title="Variable">
        <Field label="Variable Name">
          <NameField
            value={d.name}
            onCommit={(name) => store.apply('Renommer le dispatcher', (c) => renameDispatcher(c, id, name))}
          />
        </Field>
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
      </Group>
      <Group title="Event Dispatcher" app>
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
      </Group>
      <AppHelp>
        <p>
          Un dispatcher est une annonce : ce Blueprint l'appelle (Call), et tous les Blueprints qui s'y sont abonnés (Bind) réagissent aussitôt. Celui
          qui annonce n'a pas besoin de les connaître.
        </p>
        <p>
          <b>Inputs</b> : les Custom Events reliés à ce dispatcher reçoivent ces paramètres.
        </p>
      </AppHelp>
    </>
  );
}
