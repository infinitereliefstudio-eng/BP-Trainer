/**
 * Data Table assets (Content Browser › Data Table): rows of one structure,
 * each named by a unique Row Name, read in a game with Get Data Table Row.
 * Nodes name their table by id in `config.table`, so renaming a table keeps
 * them; the structure is named like a pin type and follows its renames.
 */
import { newId } from '../model/ids';
import { type DataTable, type DataTableRow, type Project, uniqueName } from '../model/project';
import type { Value } from '../types/values';
import { validateName } from './classOps';
import { takenNames } from './enumOps';
import type { OpResult } from './graphOps';

export const DATA_TABLE_NODES = ['dataTable.getRow', 'dataTable.getRowNames', 'dataTable.rowExists'];

export function findDataTable(p: Project, id: unknown): DataTable | undefined {
  return (p.dataTables ?? []).find((t) => t.id === id);
}

/** Nodes that read the table, in every Blueprint. */
export function dataTableUsage(p: Project, id: string): number {
  let n = 0;
  for (const c of p.classes) for (const g of c.graphs) for (const node of Object.values(g.nodes)) if (DATA_TABLE_NODES.includes(node.def) && node.config.table === id) n++;
  return n;
}

/** A new table needs a structure for its rows, as in UE (Pick Row Structure). */
export function addDataTable(p: Project, struct: string, name = 'DT_NewTable'): OpResult<DataTable> {
  if (!p.structs.some((s) => s.name === struct)) return { ok: false, reason: 'Choisis d’abord la structure des lignes : crée une Structure si le projet n’en a pas.' };
  p.dataTables ??= [];
  const t: DataTable = { id: newId('dt'), name: uniqueName(name.trim() || 'DT_NewTable', takenNames(p)), struct, rows: [] };
  const err = validateName(t.name, takenNames(p));
  if (err) return { ok: false, reason: err };
  p.dataTables.push(t);
  return { ok: true, value: t };
}

export function renameDataTable(p: Project, id: string, name: string): OpResult {
  const t = findDataTable(p, id);
  if (!t) return { ok: false, reason: 'Data Table introuvable.' };
  if (/\s/.test(name.trim())) return { ok: false, reason: "Un nom de Data Table ne peut pas contenir d'espace." };
  const err = validateName(name, takenNames(p, id));
  if (err) return { ok: false, reason: err };
  t.name = name.trim();
  return { ok: true, value: undefined };
}

/** UE refuses to delete an asset still referenced; so do we. */
export function removeDataTable(p: Project, id: string): OpResult {
  const t = findDataTable(p, id);
  if (!t) return { ok: false, reason: 'Data Table introuvable.' };
  const used = dataTableUsage(p, id);
  if (used) return { ok: false, reason: `${t.name} est encore lue par ${used} nœud(s) : supprime-les d'abord.` };
  p.dataTables = p.dataTables.filter((x) => x.id !== id);
  return { ok: true, value: undefined };
}

/** Row Names are Names: unique in the table, case ignored, no spaces needed but allowed as in UE. */
function rowNameError(t: DataTable, name: string, except?: number): string | undefined {
  const n = name.trim();
  if (!n) return 'Un Row Name ne peut pas être vide.';
  if (t.rows.some((r, i) => i !== except && r.name.toLowerCase() === n.toLowerCase())) return `La ligne ${n} existe déjà dans ${t.name}.`;
  return undefined;
}

export function addDataTableRow(p: Project, id: string, name?: string, value: Record<string, Value> = {}): OpResult<DataTableRow> {
  const t = findDataTable(p, id);
  if (!t) return { ok: false, reason: 'Data Table introuvable.' };
  const rowName = name ?? uniqueName('NewRow', t.rows.map((r) => r.name));
  const err = rowNameError(t, rowName);
  if (err) return { ok: false, reason: err };
  const row = { name: rowName.trim(), value: structuredClone(value) };
  t.rows.push(row);
  return { ok: true, value: row };
}

export function renameDataTableRow(p: Project, id: string, index: number, name: string): OpResult {
  const t = findDataTable(p, id);
  const row = t?.rows[index];
  if (!t || !row) return { ok: false, reason: 'Ligne introuvable.' };
  const err = rowNameError(t, name, index);
  if (err) return { ok: false, reason: err };
  row.name = name.trim();
  return { ok: true, value: undefined };
}

export function setDataTableRowValue(p: Project, id: string, index: number, value: Record<string, Value>): OpResult {
  const row = findDataTable(p, id)?.rows[index];
  if (!row) return { ok: false, reason: 'Ligne introuvable.' };
  row.value = structuredClone(value);
  return { ok: true, value: undefined };
}

export function removeDataTableRow(p: Project, id: string, index: number): OpResult {
  const t = findDataTable(p, id);
  if (!t?.rows[index]) return { ok: false, reason: 'Ligne introuvable.' };
  t.rows.splice(index, 1);
  return { ok: true, value: undefined };
}

export function moveDataTableRow(p: Project, id: string, index: number, delta: -1 | 1): OpResult {
  const t = findDataTable(p, id);
  const to = index + delta;
  if (!t?.rows[index] || to < 0 || to >= t.rows.length) return { ok: false, reason: 'Déplacement impossible.' };
  const [row] = t.rows.splice(index, 1);
  t.rows.splice(to, 0, row);
  return { ok: true, value: undefined };
}

/** Changing the row structure, as UE does, keeps only the Row Names: values start again from the defaults. */
export function setDataTableStruct(p: Project, id: string, struct: string): OpResult {
  const t = findDataTable(p, id);
  if (!t) return { ok: false, reason: 'Data Table introuvable.' };
  if (!p.structs.some((s) => s.name === struct)) return { ok: false, reason: 'Structure introuvable.' };
  if (t.struct === struct) return { ok: true, value: undefined };
  t.struct = struct;
  for (const r of t.rows) r.value = {};
  return { ok: true, value: undefined };
}
