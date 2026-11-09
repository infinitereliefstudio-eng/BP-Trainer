/** Details of a Blueprint Interface asset: its functions, with their inputs and outputs. */
import { findInterface, type InterfaceFunction } from '@core/model/project';
import { addInterfaceParam, removeInterfaceParam, updateInterfaceParam, type InterfaceSide } from '@core/operations/interfaceOps';
import {
  addInterfaceFunction,
  removeInterface,
  removeInterfaceFunction,
  renameInterface,
  renameInterfaceFunction,
} from '@core/operations/projectOps';
import { useStore } from '../hooks';
import type { OpenOverlay } from '../overlayTypes';
import { NameField } from '../widgets/NameField';
import { Group, Field } from './fields';
import { ParamList } from './SignatureDetails';

export function InterfaceDetails({ id, openOverlay }: { id: string; openOverlay: OpenOverlay }) {
  const store = useStore();
  const iface = findInterface(store.project, id);
  if (!iface) return null;
  const users = store.project.classes.filter((c) => c.interfaces.includes(id)).map((c) => c.name);
  return (
    <>
      <Group title="Blueprint Interface">
        <Field label="Nom">
          <NameField value={iface.name} onCommit={(name) => store.applyProject('Renommer l’interface', (p) => renameInterface(p, id, name))} />
        </Field>
        <p class="muted small">
          Une interface est une liste de fonctions sans contenu. Chaque Blueprint qui l'implémente (Class Settings) décide de ce qu'elles font.
        </p>
        <p class="muted small">Implémentée par : {users.length ? users.join(', ') : 'aucun Blueprint'}.</p>
      </Group>
      {iface.functions.map((f) => (
        <FunctionBlock key={f.id} ifaceId={id} fn={f} />
      ))}
      <button class="btn" onClick={() => store.applyProject('Ajouter une fonction', (p) => addInterfaceFunction(p, id))}>
        + Fonction
      </button>
      <p class="muted small">
        Sans Output, une fonction d'interface s'implémente comme un événement (Event …). Avec au moins un Output, comme une fonction, que chaque Blueprint
        qui implémente l'interface retrouve dans My Blueprint › Interfaces.
      </p>
      <button
        class="btn danger"
        onClick={() =>
          openOverlay({
            kind: 'confirm',
            title: `Supprimer ${iface.name} ?`,
            text: 'Les Blueprints qui l’implémentent perdront ses événements et ses fonctions, et les messages qui l’utilisent seront supprimés.',
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

function FunctionBlock({ ifaceId, fn }: { ifaceId: string; fn: InterfaceFunction }) {
  const store = useStore();
  const params = (side: InterfaceSide) => (
    <ParamList
      params={fn[side] ?? []}
      addLabel={side === 'inputs' ? '+ Input' : '+ Output'}
      onAdd={() => store.applyProject('Ajouter un paramètre', (p) => void addInterfaceParam(p, ifaceId, fn.id, side))}
      onRename={(pid, name) => store.applyProject('Renommer le paramètre', (p) => updateInterfaceParam(p, ifaceId, fn.id, pid, { name }))}
      onType={(pid, type) => store.applyProject('Changer le type', (p) => updateInterfaceParam(p, ifaceId, fn.id, pid, { type }))}
      onRemove={(pid) => store.applyProject('Supprimer le paramètre', (p) => removeInterfaceParam(p, ifaceId, fn.id, pid))}
    />
  );
  return (
    <Group title={fn.name}>
      <div class="param-row">
        <NameField value={fn.name} onCommit={(name) => store.applyProject('Renommer la fonction', (p) => renameInterfaceFunction(p, ifaceId, fn.id, name))} />
        <button
          class="chip danger"
          aria-label={`Supprimer ${fn.name}`}
          onClick={() => store.applyProject('Supprimer la fonction', (p) => removeInterfaceFunction(p, ifaceId, fn.id))}
        >
          ✕
        </button>
      </div>
      <p class="muted small">Inputs</p>
      {params('inputs')}
      <p class="muted small">Outputs</p>
      {params('outputs')}
    </Group>
  );
}
