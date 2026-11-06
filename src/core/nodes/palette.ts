/**
 * Palette entries: what the "right-click" search lists. Static definitions
 * plus entries generated from the class (Get/Set per variable, one getter per
 * component), like UE's context menu.
 */
import type { GraphKind, NodeInstance } from '../model/project';
import { isAssignable, type PinType } from '../types/pins';
import type { Value } from '../types/values';
import type { NodeContext, PinSpec } from './definition';
import { allDefinitions, resolvePins } from './registry';

export interface PaletteEntry {
  key: string;
  title: string;
  category: string;
  description: string;
  def: string;
  config: Record<string, Value>;
  keywords: string[];
}

export function paletteEntries(ctx: NodeContext, graphKind: GraphKind): PaletteEntry[] {
  const out: PaletteEntry[] = [];
  for (const d of allDefinitions()) {
    if (d.hiddenFromPalette) continue;
    if (d.allowedIn && !d.allowedIn.includes(graphKind)) continue;
    const config = { ...(d.defaultConfig ?? {}) };
    const title =
      typeof d.title === 'function' ? d.title(probe(d.id, config), ctx) : d.title;
    out.push({
      key: d.id,
      title: d.id === 'event.inputKey' ? 'Input Key (E, F, Space Bar)' : title,
      category: d.category,
      description: d.description,
      def: d.id,
      config,
      keywords: d.keywords ?? [],
    });
  }
  for (const v of ctx.cls.variables) {
    const cat = `Variables${v.category && v.category !== 'Default' ? `|${v.category}` : ''}`;
    out.push({
      key: `get:${v.id}`,
      title: `Get ${v.name}`,
      category: cat,
      description: v.tooltip || 'Lit la valeur de la variable.',
      def: 'var.get',
      config: { variable: v.id },
      keywords: ['get', 'variable', v.name.toLowerCase()],
    });
    out.push({
      key: `set:${v.id}`,
      title: `Set ${v.name}`,
      category: cat,
      description: v.tooltip || 'Change la valeur de la variable.',
      def: 'var.set',
      config: { variable: v.id },
      keywords: ['set', 'variable', v.name.toLowerCase()],
    });
  }
  for (const c of ctx.cls.components) {
    if (c.kind === 'BoxCollision' && graphKind === 'event') {
      out.push({
        key: `cbo:${c.id}`,
        title: `On Component Begin Overlap (${c.name})`,
        category: 'Events|Collision',
        description: `Se déclenche quand un acteur entre dans ${c.name}.`,
        def: 'event.componentBeginOverlap',
        config: { component: c.id },
        keywords: ['overlap', 'collision', 'entrer', 'begin', c.name.toLowerCase()],
      });
      out.push({
        key: `ceo:${c.id}`,
        title: `On Component End Overlap (${c.name})`,
        category: 'Events|Collision',
        description: `Se déclenche quand un acteur sort de ${c.name}.`,
        def: 'event.componentEndOverlap',
        config: { component: c.id },
        keywords: ['overlap', 'collision', 'sortir', 'end', c.name.toLowerCase()],
      });
    }
    out.push({
      key: `cmp:${c.id}`,
      title: `Get ${c.name}`,
      category: 'Variables|Components',
      description: `Référence vers le composant ${c.name}.`,
      def: 'var.component',
      config: { component: c.id },
      keywords: ['component', 'composant', c.name.toLowerCase()],
    });
  }
  return out;
}

function probe(def: string, config: Record<string, Value>): NodeInstance {
  return { id: '__probe', def, x: 0, y: 0, config, defaults: {} };
}

/** Pins of the node an entry would create. */
export function entryPins(entry: PaletteEntry, ctx: NodeContext): PinSpec[] {
  return resolvePins(probe(entry.def, entry.config), ctx);
}

/**
 * The first pin of the entry's node that a wire dragged from `from` could
 * plug into (opposite direction, compatible type), or undefined.
 */
export function compatiblePin(
  entry: PaletteEntry,
  ctx: NodeContext,
  from: { dir: 'in' | 'out'; type: PinType },
): PinSpec | undefined {
  for (const p of entryPins(entry, ctx)) {
    if (p.dir === from.dir) continue;
    const ok =
      from.dir === 'out'
        ? isAssignable(from.type, p.type, ctx.hierarchy)
        : isAssignable(p.type, from.type, ctx.hierarchy);
    if (ok) return p;
  }
  return undefined;
}

export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** Every word of the query must appear; title matches rank first. */
export function searchEntries(entries: PaletteEntry[], query: string): PaletteEntry[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [...entries].sort(byCategoryThenTitle);
  const scored: { e: PaletteEntry; score: number }[] = [];
  for (const e of entries) {
    const title = normalize(e.title);
    const hay = `${title} ${normalize(e.category)} ${e.keywords.map(normalize).join(' ')}`;
    if (!words.every((w) => hay.includes(w))) continue;
    let score = 0;
    if (title.startsWith(words[0])) score += 10;
    for (const w of words) if (title.includes(w)) score += 3;
    score -= title.length / 100;
    scored.push({ e, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.e);
}

/** Browse order of the palette, most used first (unlisted categories go last). */
const CATEGORY_ORDER = ['Variables', 'Events', 'Add Event', 'Input', 'Utilities', 'Development', 'Rendering', 'Actor', 'Math'];

function categoryRank(cat: string): number {
  const i = CATEGORY_ORDER.findIndex((c) => cat === c || cat.startsWith(`${c}|`));
  return i < 0 ? CATEGORY_ORDER.length : i;
}

function byCategoryThenTitle(a: PaletteEntry, b: PaletteEntry): number {
  return (
    categoryRank(a.category) - categoryRank(b.category) ||
    a.category.localeCompare(b.category) ||
    a.title.localeCompare(b.title)
  );
}
