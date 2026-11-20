/**
 * The drill families (chantier n° 2, étape C) and how to get a drill from
 * its id. Drills are not steps of the path: they are offered by the
 * « À retravailler en Blueprint » queue, for the notions of their family.
 */
import type { Lesson } from '../lessons/types';
import { CAST } from './families/cast';
import { OVERLAP_EVENTS } from './families/overlap';
import { VARIABLES_BRANCH } from './families/varBranch';
import { WIDGET } from './families/widget';
import { DRILL_PREFIX, drillId, makeDrill, parseDrillId, seedOf } from './make';
import { DRILL_FORMATS, type DrillFormat, type Family } from './types';

export const FAMILIES: readonly Family[] = [VARIABLES_BRANCH, OVERLAP_EVENTS, CAST, WIDGET];

export const getFamily = (id: string) => FAMILIES.find((f) => f.id === id);

export const isDrillId = (id: string) => id.startsWith(DRILL_PREFIX);

const cache = new Map<string, Lesson>();

/** The drill of an id (`drill:<family>:<seed>`), built once. */
export function getDrill(id: string): Lesson | undefined {
  const known = cache.get(id);
  if (known) return known;
  const parsed = parseDrillId(id);
  const family = parsed && getFamily(parsed.family);
  if (!family || !parsed) return undefined;
  const drill = makeDrill(family, parsed.seed);
  cache.set(id, drill);
  return drill;
}

/** The notions a drill practises: those of its family. */
export function drillNotions(id: string): string[] {
  const parsed = parseDrillId(id);
  return (parsed && getFamily(parsed.family)?.notions) ?? [];
}

/** The families that practise a notion. */
export const familiesFor = (notion: string) => FAMILIES.filter((f) => f.notions.includes(notion));

/**
 * The format a practice takes, by how far the notion is in its schedule
 * (the analysis' calendar): the day after, complete a graph; then rebuild
 * it in another situation; then repair one; then rebuild or repair.
 */
export function formatForBox(box: number, round: number): DrillFormat {
  if (box <= 0) return 'complete';
  if (box === 1) return 'rebuild';
  if (box === 2) return 'repair';
  return round % 2 ? 'repair' : 'rebuild';
}

/**
 * The next drill of a family: `done` drills of the family were already
 * tried, so the situation changes each time, and the numbers and mistake
 * with each round through the situations.
 */
export function nextDrillId(family: Family, box: number, done: number): string {
  const s = family.situations.length;
  const situation = done % s;
  const round = Math.floor(done / s);
  return drillId(family.id, seedOf(family, situation, formatForBox(box, round), round));
}

export { DRILL_FORMATS, drillId, parseDrillId };
