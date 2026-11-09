/**
 * Palette entries: what the "right-click" search lists. Static definitions
 * plus entries generated from the class (Get/Set per variable, one getter per
 * component), like UE's context menu.
 */
import type { BlueprintClass, Graph, GraphKind, NodeInstance } from '../model/project';
import { isAssignable, type PinType } from '../types/pins';
import type { Value } from '../types/values';
import type { NodeContext, PinSpec } from './definition';
import { allDefinitions, getDefinition, resolvePins } from './registry';

export interface PaletteEntry {
  key: string;
  title: string;
  category: string;
  description: string;
  def: string;
  config: Record<string, Value>;
  keywords: string[];
  /**
   * Member of another Blueprint: listed when searching or when dragging a
   * wire, not when browsing (UE's "Context Sensitive" behaviour).
   */
  contextOnly?: boolean;
}

export function paletteEntries(ctx: NodeContext, graph: Pick<Graph, 'id' | 'kind'>): PaletteEntry[] {
  const graphKind = graph.kind;
  const out: PaletteEntry[] = [];
  for (const d of allDefinitions()) {
    if (d.hiddenFromPalette) continue;
    if (d.allowedIn && !d.allowedIn.includes(graphKind)) continue;
    const config = { ...(d.defaultConfig ?? {}) };
    if (d.id === 'fn.return') config.graph = graph.id;
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
  if (ctx.project) out.push(...communicationEntries(ctx, graphKind));
  return out;
}

function entry(ctx: NodeContext, key: string, def: string, config: Record<string, Value>, extra: Partial<PaletteEntry> = {}): PaletteEntry {
  const d = getDefinition(def)!;
  const title = typeof d.title === 'function' ? d.title(probe(def, config), ctx) : d.title;
  return { key, title, category: d.category, description: d.description, def, config, keywords: [], ...extra };
}

/** Casts, other Blueprints' members, dispatchers, custom events, interfaces. */
function communicationEntries(ctx: NodeContext, graphKind: GraphKind): PaletteEntry[] {
  const out: PaletteEntry[] = [];
  const project = ctx.project!;
  const self = ctx.cls;
  const eventGraph = graphKind === 'event';
  const others = project.classes.filter((c) => c.id !== self.id);

  for (const c of project.classes) {
    out.push(entry(ctx, `cast:${c.id}`, 'cast.to', { class: c.id }, { keywords: ['cast', 'convertir', c.name.toLowerCase()] }));
  }

  // Variables of other Blueprints, read or written through a reference.
  for (const c of others) {
    for (const v of c.variables) {
      if (v.private) continue; // Private: invisible from other Blueprints, as in UE.
      const kw = ['get', 'set', 'variable', v.name.toLowerCase(), c.name.toLowerCase()];
      const category = `Class|${c.name}`;
      out.push(entry(ctx, `xget:${c.id}:${v.id}`, 'var.getExternal', { owner: c.id, variable: v.id }, { category, keywords: kw, contextOnly: true }));
      out.push(entry(ctx, `xset:${c.id}:${v.id}`, 'var.setExternal', { owner: c.id, variable: v.id }, { category, keywords: kw, contextOnly: true }));
    }
  }

  // Event Dispatchers: this Blueprint's are always listed, others' on demand.
  const dispatcherOwners: BlueprintClass[] = [self, ...others];
  for (const c of dispatcherOwners) {
    const own = c.id === self.id;
    for (const d of c.dispatchers) {
      const cfg = { owner: c.id, dispatcher: d.id };
      const kw = ['dispatcher', 'event', d.name.toLowerCase(), c.name.toLowerCase()];
      const category = own ? `Event Dispatchers|${d.name}` : `Class|${c.name}`;
      const flags = { category, keywords: kw, contextOnly: !own };
      out.push(entry(ctx, `dcall:${c.id}:${d.id}`, 'dispatcher.call', cfg, { ...flags, keywords: [...kw, 'call', 'appeler'] }));
      if (eventGraph) {
        out.push(entry(ctx, `dbind:${c.id}:${d.id}`, 'dispatcher.bind', cfg, { ...flags, keywords: [...kw, 'bind', 'abonner'] }));
        out.push(entry(ctx, `dunbind:${c.id}:${d.id}`, 'dispatcher.unbind', cfg, { ...flags, keywords: [...kw, 'unbind'] }));
        out.push(entry(ctx, `dunbindall:${c.id}:${d.id}`, 'dispatcher.unbindAll', cfg, { ...flags, keywords: [...kw, 'unbind'] }));
        // Dragging from Bind Event's red pin offers a matching Custom Event.
        out.push(
          entry(
            ctx,
            `dev:${c.id}:${d.id}`,
            'event.custom',
            { name: `${d.name}_Event`, signature: d.id, signatureOwner: c.id },
            {
              title: `Add Custom Event for ${d.name}`,
              category: 'Add Event',
              description: `Crée un Custom Event avec les paramètres de ${d.name}, prêt à être relié à Bind Event.`,
              keywords: ['custom', 'event', 'bind', d.name.toLowerCase()],
              contextOnly: true,
            },
          ),
        );
      }
    }
  }

  // Functions, callable here or through a reference.
  for (const c of [self, ...others]) {
    const own = c.id === self.id;
    for (const g of c.graphs) {
      if (g.kind !== 'function' || !g.fn) continue;
      out.push(
        entry(ctx, `fn:${c.id}:${g.id}`, g.fn.pure ? 'call.pureFunction' : 'call.function', { owner: c.id, graph: g.id }, {
          category: own ? 'Functions' : `Class|${c.name}`,
          description: g.fn.description || `Appelle la fonction ${g.name}${own ? '' : ` de ${c.name}`}.`,
          keywords: ['function', 'fonction', 'call', g.name.toLowerCase(), c.name.toLowerCase()],
          contextOnly: !own,
        }),
      );
    }
  }

  // Custom Events, callable here or through a reference.
  for (const c of [self, ...others]) {
    const own = c.id === self.id;
    const names = new Set<string>();
    for (const g of c.graphs) {
      for (const n of Object.values(g.nodes)) if (n.def === 'event.custom') names.add(String(n.config.name));
    }
    for (const name of names) {
      out.push(
        entry(ctx, `call:${c.id}:${name}`, 'call.custom', { owner: c.id, event: name }, {
          category: own ? 'Call Function' : `Class|${c.name}`,
          description: `Appelle le Custom Event ${name}${own ? '' : ` de ${c.name}`}. Il s'exécute immédiatement.`,
          keywords: ['call', 'appeler', 'event', name.toLowerCase(), c.name.toLowerCase()],
          contextOnly: !own,
        }),
      );
    }
  }

  // Blueprint Interfaces: messages to anyone, events where implemented.
  for (const iface of project.interfaces) {
    out.push(
      entry(ctx, `idoes:${iface.id}`, 'iface.doesImplement', { interface: iface.id }, { keywords: ['interface', 'implement', iface.name.toLowerCase()] }),
    );
    for (const fn of iface.functions) {
      const cfg = { interface: iface.id, fn: fn.id };
      const kw = ['interface', 'message', fn.name.toLowerCase(), iface.name.toLowerCase()];
      out.push(entry(ctx, `imsg:${iface.id}:${fn.id}`, 'iface.message', cfg, { category: `Interface Messages|${iface.name}`, keywords: kw }));
      if (eventGraph && self.interfaces.includes(iface.id)) {
        out.push(entry(ctx, `iev:${iface.id}:${fn.id}`, 'event.interface', cfg, { category: `Add Event|${iface.name}`, keywords: kw }));
      }
    }
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
