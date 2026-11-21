/**
 * The level editor's Outliner, as UE's: every item of the level, with its
 * Item Label and its Type, sorted by label, filtered by the search field.
 */
import { normalize } from '../nodes/palette';
import { findClass, levelOf, playerStartsOf, type Project } from './project';

export interface OutlinerRow {
  /** A level actor's id, a Player Start's (« playerStart », « ps_… ») or « worldSettings ». */
  id: string;
  label: string;
  /** UE's Type column: the Blueprint class, or PlayerStart. */
  type: string;
}

export function outlinerRows(p: Project, search: string): OutlinerRow[] {
  const rows: OutlinerRow[] = [
    // As UE: PlayerStart, PlayerStart2… The first one keeps the app's old label when it is alone.
    ...playerStartsOf(levelOf(p)).map((s, _i, all) => ({ id: s.id, label: all.length > 1 ? s.name : 'Player Start', type: 'PlayerStart' })),
    // As UE's Outliner: the level's World Settings, where its GameMode Override is.
    { id: 'worldSettings', label: 'WorldSettings', type: 'WorldSettings' },
    ...levelOf(p).actors.map((a) => ({ id: a.id, label: a.name, type: findClass(p, a.classId)?.name ?? '?' })),
  ];
  const words = normalize(search).split(/\s+/).filter(Boolean);
  return rows
    .filter((r) => words.every((w) => normalize(`${r.label} ${r.type}`).includes(w)))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr', { numeric: true }));
}
