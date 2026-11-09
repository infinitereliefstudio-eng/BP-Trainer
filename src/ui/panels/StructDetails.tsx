/** A Structure asset: its name and its members (name, type, default value). */
import { addStructMember, removeStruct, removeStructMember, renameStruct, structUsage, updateStructMember } from '@core/operations/structOps';
import { useStore } from '../hooks';
import { NameField } from '../widgets/NameField';
import { TypeSelect } from '../widgets/TypeSelect';
import { ValueInput } from '../widgets/ValueInput';
import { Field, Group } from './fields';

export function StructDetails({ id }: { id: string }) {
  const store = useStore();
  const s = store.project.structs.find((x) => x.id === id);
  if (!s) return null;
  const used = structUsage(store.project, s.name);
  const warn = (r: { ok: boolean; reason?: string }) => {
    if (!r.ok && r.reason) store.warn(r.reason);
  };
  return (
    <>
      <Group title="Structure">
        <Field label="Nom">
          <NameField value={s.name} onCommit={(name) => store.applyProject('Renommer la structure', (p) => renameStruct(p, id, name))} />
        </Field>
        <p class="muted small">
          Une structure regroupe plusieurs valeurs sous un seul type, comme la fiche d'un objet. Une variable {s.name} contient tous ses membres ;
          Make, Break et Set Members in {s.name} la construisent, la lisent et la modifient.
        </p>
      </Group>
      {s.members.map((m) => (
        <Group key={m.id} title={m.name}>
          <div class="param-row">
            <NameField value={m.name} onCommit={(name) => store.applyProject('Renommer le membre', (p) => updateStructMember(p, id, m.id, { name }))} />
            <button
              class="chip danger"
              aria-label={`Supprimer ${m.name}`}
              onClick={() => warn(store.applyProject('Supprimer le membre', (p) => removeStructMember(p, id, m.id)))}
            >
              ✕
            </button>
          </div>
          <TypeSelect type={m.type} onChange={(type) => warn(store.applyProject('Changer le type', (p) => updateStructMember(p, id, m.id, { type })))} />
          <Field label="Default Value">
            <ValueInput type={m.type} value={m.defaultValue} onChange={(defaultValue) => store.applyProject('Valeur par défaut', (p) => updateStructMember(p, id, m.id, { defaultValue }))} />
          </Field>
        </Group>
      ))}
      <div class="row-buttons">
        <button class="btn" onClick={() => store.applyProject('Ajouter un membre', (p) => void addStructMember(p, id))}>
          + Membre
        </button>
      </div>
      <Group title="Utilisation">
        <p class="muted small">{used ? `Utilisée à ${used} endroit(s).` : 'Utilisée nulle part.'}</p>
        <button
          class="btn danger"
          onClick={() => {
            const res = store.applyProject('Supprimer la structure', (p) => removeStruct(p, id));
            if (!res.ok) store.warn(res.reason);
            else store.setFocus({ kind: 'none' });
          }}
        >
          Supprimer la structure
        </button>
      </Group>
    </>
  );
}
