/**
 * The level editor's Outliner, as UE's: every item of the level, with its
 * Item Label and its Type, sorted by label, filtered by the search field.
 */
import { normalize } from '../nodes/palette';
import { findClass, type Project } from './project';

export interface OutlinerRow {
  /** A level actor's id, or « playerStart ». */
  id: string;
  label: string;
  /** UE's Type column: the Blueprint class, or PlayerStart. */
  type: string;
}

export function outlinerRows(p: Project, search: string): OutlinerRow[] {
  const rows: OutlinerRow[] = [
    { id: 'playerStart', label: 'Player Start', type: 'PlayerStart' },
    ...p.level.actors.map((a) => ({ id: a.id, label: a.name, type: findClass(p, a.classId)?.name ?? '?' })),
  ];
  const words = normalize(search).split(/\s+/).filter(Boolean);
  return rows
    .filter((r) => words.every((w) => normalize(`${r.label} ${r.type}`).includes(w)))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr', { numeric: true }));
}
