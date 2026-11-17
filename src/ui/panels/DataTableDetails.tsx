/**
 * A Data Table asset: its name, its row structure (UE's Pick Row Structure),
 * and its rows, each a Row Name and a value for every member.
 */
import {
  addDataTableRow,
  dataTableUsage,
  findDataTable,
  moveDataTableRow,
  removeDataTable,
  removeDataTableRow,
  renameDataTable,
  renameDataTableRow,
  setDataTableRowValue,
  setDataTableStruct,
} from '@core/operations/dataTableOps';
import { T } from '@core/types/pins';
import { useStore } from '../hooks';
import { NameField } from '../widgets/NameField';
import { ValueInput } from '../widgets/ValueInput';
import { Field, Group } from './fields';

export function DataTableDetails({ id }: { id: string }) {
  const store = useStore();
  const t = findDataTable(store.project, id);
  if (!t) return null;
  const used = dataTableUsage(store.project, id);
  const warn = (r: { ok: boolean; reason?: string }) => {
    if (!r.ok && r.reason) store.warn(r.reason);
  };
  return (
    <>
      <Group title="Data Table">
        <Field label="Nom">
          <NameField value={t.name} onCommit={(name) => store.applyProject('Renommer la Data Table', (p) => renameDataTable(p, id, name))} />
        </Field>
        <Field label="Row Structure">
          <select
            class="field"
            value={t.struct}
            onChange={(e) => {
              const struct = (e.target as HTMLSelectElement).value;
              if (t.rows.length && !confirm('Changer de structure remet toutes les valeurs des lignes à leur défaut (les Row Names restent). Continuer ?')) return;
              warn(store.applyProject('Changer la structure des lignes', (p) => setDataTableStruct(p, id, struct)));
            }}
          >
            {store.project.structs.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <p class="muted small">
          Chaque ligne a un <strong>Row Name</strong> (un Name, unique dans la table) et une valeur de {t.struct}. Get Data Table Row la retrouve par son Row Name, en
          ignorant la casse.
        </p>
      </Group>
      {t.rows.map((row, i) => (
        <Group key={`${i}:${row.name}`} title={row.name}>
          <div class="param-row">
            <NameField value={row.name} onCommit={(name) => store.applyProject('Renommer la ligne', (p) => renameDataTableRow(p, id, i, name))} />
            <button class="chip" aria-label={`Monter ${row.name}`} disabled={i === 0} onClick={() => warn(store.applyProject('Déplacer la ligne', (p) => moveDataTableRow(p, id, i, -1)))}>
              ↑
            </button>
            <button
              class="chip"
              aria-label={`Descendre ${row.name}`}
              disabled={i === t.rows.length - 1}
              onClick={() => warn(store.applyProject('Déplacer la ligne', (p) => moveDataTableRow(p, id, i, 1)))}
            >
              ↓
            </button>
            <button class="chip danger" aria-label={`Supprimer ${row.name}`} onClick={() => warn(store.applyProject('Supprimer la ligne', (p) => removeDataTableRow(p, id, i)))}>
              ✕
            </button>
          </div>
          <ValueInput
            type={T.struct(t.struct)}
            value={row.value}
            onChange={(value) => warn(store.applyProject('Modifier la ligne', (p) => setDataTableRowValue(p, id, i, (value ?? {}) as Record<string, never>)))}
          />
        </Group>
      ))}
      <div class="row-buttons">
        <button class="btn" onClick={() => warn(store.applyProject('Ajouter une ligne', (p) => addDataTableRow(p, id)))}>
          + Ligne
        </button>
      </div>
      <Group title="Utilisation">
        <p class="muted small">{used ? `Lue par ${used} nœud(s).` : 'Lue par aucun nœud.'}</p>
        <button
          class="btn danger"
          onClick={() => {
            const res = store.applyProject('Supprimer la Data Table', (p) => removeDataTable(p, id));
            if (!res.ok) store.warn(res.reason);
            else store.setFocus({ kind: 'none' });
          }}
        >
          Supprimer la Data Table
        </button>
      </Group>
    </>
  );
}
