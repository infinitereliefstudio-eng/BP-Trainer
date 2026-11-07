/** An Enum asset: its name and its entries, in order (their index is the value). */
import { addEnumEntry, enumUsage, moveEnumEntry, removeEnum, removeEnumEntry, renameEnum, setEnumEntry } from '@core/operations/enumOps';
import { useStore } from '../hooks';
import { NameField } from '../widgets/NameField';
import { Field, Group } from './fields';

export function EnumDetails({ id }: { id: string }) {
  const store = useStore();
  const e = store.project.enums.find((x) => x.id === id);
  if (!e) return null;
  const used = enumUsage(store.project, e.name);
  return (
    <>
      <Group title="Enum">
        <Field label="Nom">
          <NameField value={e.name} onCommit={(name) => store.applyProject('Renommer l’Enum', (p) => renameEnum(p, id, name))} />
        </Field>
        <p class="muted small">
          Un Enum est une liste de valeurs nommées, par exemple les états d'une machine. Une variable de ce type vaut toujours l'une
          d'elles ; Switch on {e.name} choisit un chemin selon la valeur.
        </p>
      </Group>
      <Group title="Enumerators">
        {e.entries.map((name, i) => (
          <div class="param-row" key={`${i}:${name}`}>
            <span class="muted small">{i}</span>
            <NameField value={name} onCommit={(n) => store.applyProject('Renommer une entrée', (p) => setEnumEntry(p, id, i, n))} />
            <button class="chip" aria-label="Monter" disabled={i === 0} onClick={() => store.applyProject('Réordonner l’Enum', (p) => moveEnumEntry(p, id, i, -1))}>
              ↑
            </button>
            <button
              class="chip danger"
              aria-label={`Supprimer ${name}`}
              onClick={() => {
                const res = store.applyProject('Supprimer une entrée', (p) => removeEnumEntry(p, id, i));
                if (!res.ok) store.warn(res.reason);
              }}
            >
              ✕
            </button>
          </div>
        ))}
        <button class="btn" onClick={() => store.applyProject('Ajouter une entrée', (p) => addEnumEntry(p, id))}>
          + Enumerator
        </button>
        <p class="muted small">La valeur stockée est la position (0, 1, 2…) : réordonner change les valeurs déjà réglées.</p>
      </Group>
      <Group title="Utilisation">
        <p class="muted small">{used ? `Utilisé à ${used} endroit(s).` : 'Utilisé nulle part.'}</p>
        <button
          class="btn danger"
          onClick={() => {
            const res = store.applyProject('Supprimer l’Enum', (p) => removeEnum(p, id));
            if (!res.ok) store.warn(res.reason);
            else store.setFocus({ kind: 'none' });
          }}
        >
          Supprimer l’Enum
        </button>
      </Group>
    </>
  );
}
