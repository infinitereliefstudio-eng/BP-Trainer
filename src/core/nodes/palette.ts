/**
 * Palette entries: what the "right-click" search lists. Static definitions
 * plus entries generated from the class (Get/Set per variable, one getter per
 * component), like UE's context menu.
 */
import { eventKey, lineage, parentOf } from '../model/inheritance';
import type { BlueprintClass, Graph, GraphKind, NodeInstance } from '../model/project';
import { isAssignable, type PinType } from '../types/pins';
import type { Value } from '../types/values';
import type { NodeContext, PinSpec } from './definition';
import { classById, NATIVE_CASTS } from './library/communication';
import { NOT_IN_COMPONENT, selfIs } from './library/actorComponents';
import { BUTTON_EVENTS, NOT_IN_WIDGET, WIDGET_ONLY, widgetVariable } from './library/widgets';
import { NATIVE_DISPATCHERS, NATIVE_SIGNATURE_OWNER } from './library/nativeDispatchers';
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
  const inComponent = selfIs(ctx, 'ActorComponent');
  const inWidget = selfIs(ctx, 'UserWidget');
  // Each Get Owner shows where it means something; the other one when searching or dragging a wire.
  const elsewhere = (id: string) => (id === 'component.getOwner' && !inComponent) || (id === 'actor.getOwner' && inComponent);
  for (const d of allDefinitions()) {
    if (d.hiddenFromPalette) continue;
    if (d.allowedIn && !d.allowedIn.includes(graphKind)) continue;
    // An Actor Component has no shape, no input, no Timeline (UE leaves them out of its palette).
    if (inComponent && NOT_IN_COMPONENT[d.id]) continue;
    // A widget is not an actor (no BeginPlay, overlap, Timeline…); its own events exist only there.
    if (inWidget ? NOT_IN_WIDGET[d.id] : WIDGET_ONLY.has(d.id)) continue;
    const config = { ...(d.defaultConfig ?? {}) };
    if (d.id === 'fn.return') config.graph = graph.id;
    const title =
      typeof d.title === 'function' ? d.title(probe(d.id, config), ctx) : d.title;
    out.push({
      key: d.id,
      title: d.id === 'event.inputKey' ? 'Input Key (E, F, Space Bar)' : d.id === 'timeline.node' ? 'Add Timeline…' : title,
      category: d.category,
      description: d.description,
      def: d.id,
      config,
      keywords: d.keywords ?? [],
      ...(elsewhere(d.id) ? { contextOnly: true } : {}),
    });
  }
  // The widgets of the Designer ticked Is Variable read like variables (Get only, as in UE).
  for (const w of ctx.cls.widgets ?? []) {
    const v = w.isVariable ? widgetVariable(ctx, w.id) : undefined;
    if (!v) continue;
    out.push({
      key: `widget:${w.id}`,
      title: `Get ${w.name}`,
      category: 'Variables|Widgets',
      description: `Le widget ${w.name} (${v.type}) du Designer, pour l’utiliser comme Target.`,
      def: 'var.widget',
      config: { widget: w.id },
      keywords: ['get', 'variable', 'widget', w.name.toLowerCase()],
    });
    // A Button's events, as UE's context menu offers them under its variable ("Add On Clicked").
    if (w.kind === 'Button' && graphKind === 'event') {
      for (const e of BUTTON_EVENTS) {
        out.push({
          key: `button:${w.id}:${e.id}`,
          title: `${e.label} (${w.name})`,
          category: `Add Event|${w.name}`,
          description: `${e.help} Événement du bouton ${w.name}.`,
          def: 'event.widgetButton',
          config: { widget: w.id, event: e.id },
          keywords: ['on clicked', 'bouton', 'button', 'clic', e.label.toLowerCase(), w.name.toLowerCase()],
        });
      }
    }
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
  const fnGraph = graphKind === 'function' ? ctx.cls.graphs.find((g) => g.id === graph.id) : undefined;
  for (const l of fnGraph?.fn?.locals ?? []) {
    const kw = ['local', 'variable', 'locale', l.name.toLowerCase()];
    out.push({
      key: `lget:${l.id}`,
      title: `Get ${l.name}`,
      category: 'Variables|Local',
      description: 'Lit la variable locale (valeur de cet appel de la fonction).',
      def: 'var.getLocal',
      config: { variable: l.id },
      keywords: ['get', ...kw],
    });
    out.push({
      key: `lset:${l.id}`,
      title: `Set ${l.name}`,
      category: 'Variables|Local',
      description: 'Change la variable locale, pour la suite de cet appel seulement.',
      def: 'var.setLocal',
      config: { variable: l.id },
      keywords: ['set', ...kw],
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
    // An Actor Component's dispatchers: UE's green + in its Details, an event already bound.
    const comp = c.kind === 'ActorComponent' && graphKind === 'event' ? classById(ctx, c.classId) : undefined;
    for (const d of comp?.dispatchers ?? []) {
      out.push(
        entry(ctx, `cdisp:${c.id}:${d.id}`, 'event.componentDispatcher', { component: c.id, dispatcher: d.id }, {
          category: `Add Event|${c.name}`,
          keywords: ['on', 'event', 'dispatcher', 'component', 'composant', d.name.toLowerCase(), c.name.toLowerCase()],
        }),
      );
    }
  }
  if (graphKind === 'event') {
    // An actor's own dispatchers: an Actor Component binds to its owner's overlaps this way.
    for (const nd of Object.values(NATIVE_DISPATCHERS)) {
      const cfg = { dispatcher: nd.name };
      const kw = ['bind', 'overlap', 'dispatcher', nd.name.toLowerCase(), nd.title.toLowerCase()];
      out.push(entry(ctx, `nbind:${nd.name}`, 'dispatcher.bindNative', cfg, { category: 'Collision', keywords: [...kw, 'abonner'] }));
      out.push(entry(ctx, `nunbind:${nd.name}`, 'dispatcher.unbindNative', cfg, { category: 'Collision', keywords: [...kw, 'unbind'], contextOnly: true }));
      out.push(
        entry(ctx, `ndev:${nd.name}`, 'event.custom', { name: `${nd.name}_Event`, signature: nd.name, signatureOwner: NATIVE_SIGNATURE_OWNER }, {
          title: `Add Custom Event for ${nd.title}`,
          category: 'Add Event',
          description: `Crée un Custom Event avec les paramètres de ${nd.title} (Overlapped Actor, Other Actor), prêt à être relié à Bind Event.`,
          keywords: ['custom', 'event', 'bind', 'overlap', nd.name.toLowerCase()],
          contextOnly: true,
        }),
      );
    }
  }
  for (const st of ctx.project?.structs ?? []) {
    const kw = ['struct', 'structure', st.name.toLowerCase()];
    out.push(entry(ctx, `smake:${st.id}`, 'struct.make', { struct: st.name }, { category: `Structures|${st.name}`, keywords: ['make', 'construire', ...kw] }));
    out.push(entry(ctx, `sbreak:${st.id}`, 'struct.break', { struct: st.name }, { category: `Structures|${st.name}`, keywords: ['break', 'separer', ...kw] }));
    out.push(entry(ctx, `sset:${st.id}`, 'struct.setMembers', { struct: st.name }, { category: `Structures|${st.name}`, keywords: ['set members', 'modifier', 'membre', ...kw] }));
  }
  for (const t of ctx.project?.dataTables ?? []) {
    const kw = ['data table', 'table', 'donnees', 'ligne', 'row', t.name.toLowerCase()];
    const cat = `Utilities|Data Table|${t.name}`;
    out.push(entry(ctx, `dtrow:${t.id}`, 'dataTable.getRow', { table: t.id }, { category: cat, keywords: ['get', 'row', 'lire', ...kw] }));
    out.push(entry(ctx, `dtnames:${t.id}`, 'dataTable.getRowNames', { table: t.id }, { category: cat, keywords: ['names', 'noms', ...kw] }));
    out.push(entry(ctx, `dtexists:${t.id}`, 'dataTable.rowExists', { table: t.id }, { category: cat, keywords: ['exist', 'existe', ...kw] }));
  }
  if (graphKind === 'event' && !inComponent) {
    for (const a of ctx.project?.inputActions ?? []) {
      const kw = ['enhanced', 'input', 'action', 'touche', a.name.toLowerCase()];
      out.push(entry(ctx, `ia:${a.id}`, 'input.action', { action: a.id }, { category: 'Input|Enhanced Action Events', keywords: kw }));
    }
  }
  for (const c of ctx.project?.mappingContexts ?? []) {
    const kw = ['mapping context', 'imc', 'enhanced', 'input', 'contexte', c.name.toLowerCase()];
    out.push(entry(ctx, `imcadd:${c.id}`, 'input.addMappingContext', { context: c.id }, { category: 'Input|Enhanced Input', keywords: ['add', 'ajouter', ...kw] }));
    out.push(entry(ctx, `imcrem:${c.id}`, 'input.removeMappingContext', { context: c.id }, { category: 'Input|Enhanced Input', keywords: ['remove', 'retirer', ...kw] }));
  }
  if (ctx.project) out.push(...communicationEntries(ctx, graphKind), ...parentEntries(ctx, graphKind));
  return out;
}

function entry(ctx: NodeContext, key: string, def: string, config: Record<string, Value>, extra: Partial<PaletteEntry> = {}): PaletteEntry {
  const d = getDefinition(def)!;
  const title = typeof d.title === 'function' ? d.title(probe(def, config), ctx) : d.title;
  return { key, title, category: d.category, description: d.description, def, config, keywords: [], ...extra };
}

/**
 * A child Blueprint: "Parent: Event" for each event its parents define (event
 * graph), and "Parent: Function" for each parent function it overrides.
 */
function parentEntries(ctx: NodeContext, graphKind: GraphKind): PaletteEntry[] {
  const project = ctx.project!;
  const own = project.classes.find((c) => c.id === ctx.cls.id);
  const parent = own && parentOf(project, own);
  if (!own || !parent) return [];
  const out: PaletteEntry[] = [];
  const ancestors = lineage(project, parent);
  if (graphKind === 'event') {
    const keys = new Set<string>();
    for (const c of ancestors) {
      for (const g of c.graphs) {
        if (g.kind !== 'event') continue;
        for (const n of Object.values(g.nodes)) if (getDefinition(n.def)?.kind === 'event') keys.add(eventKey(n));
      }
    }
    for (const key of keys) {
      out.push(entry(ctx, `parent:${key}`, 'call.parentEvent', { event: key }, { category: 'Call Function|Parent', keywords: ['parent', 'super', 'appeler'] }));
    }
  }
  const mine = new Set(own.graphs.filter((g) => g.kind === 'function').map((g) => g.name));
  const seen = new Set<string>();
  for (const c of ancestors) {
    for (const g of c.graphs) {
      if (g.kind !== 'function' || !mine.has(g.name) || seen.has(g.name)) continue;
      seen.add(g.name);
      out.push(entry(ctx, `pfn:${g.id}`, 'call.function', { graph: g.id, parent: true }, { category: 'Call Function|Parent', keywords: ['parent', 'super', g.name.toLowerCase()] }));
    }
  }
  return out;
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
  for (const name of Object.keys(NATIVE_CASTS)) {
    out.push(entry(ctx, `cast:${name}`, 'cast.to', { class: name }, { keywords: ['cast', 'convertir', name.toLowerCase(), 'player controller', 'contrôleur'] }));
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
      // Interface implementations are reached by sending the message, not called by name.
      if (g.kind !== 'function' || !g.fn || g.iface) continue;
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
      if (eventGraph && self.interfaces.includes(iface.id) && !fn.outputs?.length) {
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

/** A category of « All Actions for this Blueprint », with its sub-categories and actions. */
export interface CategoryNode {
  name: string;
  /** Full path, "Variables|Components": the key of its open state. */
  path: string;
  children: CategoryNode[];
  entries: PaletteEntry[];
}

/**
 * The category tree of the entries, each category placed where its first
 * entry comes: browsing, in UE's order; searching, the best match first.
 */
export function buildTree(entries: PaletteEntry[]): CategoryNode[] {
  const roots: CategoryNode[] = [];
  const byPath = new Map<string, CategoryNode>();
  for (const e of entries) {
    let siblings = roots;
    let path = '';
    let node: CategoryNode | undefined;
    for (const name of e.category.split('|')) {
      path = path ? `${path}|${name}` : name;
      node = byPath.get(path);
      if (!node) {
        node = { name, path, children: [], entries: [] };
        byPath.set(path, node);
        siblings.push(node);
      }
      siblings = node.children;
    }
    node?.entries.push(e);
  }
  return roots;
}
