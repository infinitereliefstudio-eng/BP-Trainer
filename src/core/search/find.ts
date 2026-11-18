/**
 * Find in Blueprint (UE's Find Results, Ctrl+F) and Find in all Blueprints
 * (Ctrl+Shift+F): every node whose title, pins, typed values or referenced
 * names contain all the words searched. Results are grouped like UE's tree:
 * Blueprint › graph › node, with the part that matched when it is not the
 * title.
 */
import { findVariable, type BlueprintClass, type Graph, type NodeInstance, type Project } from '../model/project';
import { contextFor, nodeTitle, pinValue, resolvePins } from '../nodes/registry';
import { normalize } from '../nodes/palette';
import type { NodeContext } from '../nodes/definition';

export interface FindHit {
  nodeId: string;
  /** The node's title as drawn (a variable node is named after its variable). */
  title: string;
  /** What matched when it is not the title: "Pin Duration", "Message = Bonjour"… */
  detail?: string;
}

export interface FindGraph {
  graphId: string;
  graphName: string;
  hits: FindHit[];
}

export interface FindClass {
  classId: string;
  className: string;
  graphs: FindGraph[];
}

/** Name of everything a node setting can point to, by id: classes, variables, graphs, assets… */
function nameIndex(project: Project): Map<string, string> {
  const names = new Map<string, string>();
  const add = (id: string | undefined, name: string) => id && names.set(id, name);
  for (const c of project.classes) {
    add(c.id, c.name);
    for (const v of c.variables) add(v.id, v.name);
    for (const k of c.components) add(k.id, k.name);
    for (const d of c.dispatchers) add(d.id, d.name);
    for (const g of c.graphs) {
      add(g.id, g.name);
      for (const l of g.fn?.locals ?? []) add(l.id, l.name);
    }
  }
  for (const i of project.interfaces) {
    add(i.id, i.name);
    for (const f of i.functions) add(f.id, f.name);
  }
  for (const s of project.structs ?? []) add(s.id, s.name);
  for (const t of project.dataTables ?? []) add(t.id, t.name);
  for (const a of project.inputActions ?? []) add(a.id, a.name);
  for (const m of project.mappingContexts ?? []) add(m.id, m.name);
  for (const e of project.enums ?? []) add(e.id, e.name);
  return names;
}

/** The node's name as the user reads it: "Set Vie", "Get bEstAllumee", "Delay". */
export function displayTitle(node: NodeInstance, cls: BlueprintClass, ctx: NodeContext): string {
  const t = nodeTitle(node, ctx);
  if (node.def === 'var.get' || node.def === 'var.set') {
    const v = findVariable(ctx.cls, String(node.config.variable)) ?? findVariable(cls, String(node.config.variable));
    if (v) return `${node.def === 'var.set' ? 'Set' : 'Get'} ${v.name}`;
  }
  return t;
}

function show(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v).replace('.', ',');
  if (typeof v === 'string') return v;
  return '';
}

/** Words that must all appear (accents and case ignored). */
function words(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}

/**
 * Does the node match? The title alone, or the title with one of its parts
 * (a pin name, a typed value, a referenced name). Returns the hit, or null.
 */
function matchNode(node: NodeInstance, cls: BlueprintClass, ctx: NodeContext, names: Map<string, string>, ws: string[]): FindHit | null {
  const title = displayTitle(node, cls, ctx);
  const nt = normalize(title);
  const parts: { label: string; text: string }[] = [];
  let pins: ReturnType<typeof resolvePins> = [];
  try {
    pins = resolvePins(node, ctx);
  } catch {
    pins = [];
  }
  for (const p of pins) {
    if (p.name) parts.push({ label: `Pin ${p.name}`, text: p.name });
    if (p.dir === 'in' && p.type.category !== 'exec') {
      const v = show(pinValue(node, p));
      if (v && (p.id in node.defaults || typeof pinValue(node, p) === 'string')) parts.push({ label: `${p.name || 'Valeur'} = ${v}`, text: v });
    }
  }
  for (const [key, raw] of Object.entries(node.config)) {
    if (typeof raw !== 'string' || !raw) continue;
    const named = names.get(raw);
    if (named) parts.push({ label: named, text: named });
    else if (key === 'text' || key === 'name' || key === 'event') parts.push({ label: raw, text: raw });
  }
  const all = `${nt} ${parts.map((p) => normalize(p.text)).join(' ')}`;
  if (!ws.every((w) => all.includes(w))) return null;
  if (ws.every((w) => nt.includes(w))) return { nodeId: node.id, title };
  // The part that holds the words the title lacks.
  const missing = ws.filter((w) => !nt.includes(w));
  const part = parts.find((p) => missing.every((w) => normalize(p.text).includes(w))) ?? parts.find((p) => missing.some((w) => normalize(p.text).includes(w)));
  return { nodeId: node.id, title, detail: part && part.label !== title ? part.label : undefined };
}

/** Graph order as UE lists them: Construction Script, Event Graphs, then functions. */
function graphRank(g: Graph): number {
  return g.kind === 'construction' ? 0 : g.kind === 'event' ? 1 : 2;
}

/**
 * Search one Blueprint (`classId`) or every Blueprint of the project (no
 * `classId`). An empty query finds nothing, as in UE.
 */
export function findInBlueprints(project: Project, query: string, classId?: string): FindClass[] {
  const ws = words(query);
  if (!ws.length) return [];
  const names = nameIndex(project);
  const out: FindClass[] = [];
  const classes = classId ? project.classes.filter((c) => c.id === classId) : project.classes;
  for (const cls of classes) {
    const ctx = contextFor(cls, project);
    const graphs: FindGraph[] = [];
    for (const g of [...cls.graphs].sort((a, b) => graphRank(a) - graphRank(b))) {
      const found: { hit: FindHit; node: NodeInstance }[] = [];
      for (const node of Object.values(g.nodes)) {
        const hit = matchNode(node, cls, ctx, names, ws);
        if (hit) found.push({ hit, node });
      }
      // Top to bottom, then left to right: the order the eye reads the graph.
      found.sort((a, b) => a.node.y - b.node.y || a.node.x - b.node.x);
      if (found.length) graphs.push({ graphId: g.id, graphName: g.name, hits: found.map((f) => f.hit) });
    }
    if (graphs.length) out.push({ classId: cls.id, className: cls.name, graphs });
  }
  return out;
}

/** Number of nodes found. */
export function hitCount(results: FindClass[]): number {
  return results.reduce((n, c) => n + c.graphs.reduce((m, g) => m + g.hits.length, 0), 0);
}

/**
 * What Find References searches for a node: the variable, function,
 * dispatcher or event it refers to (so Get and Set, Call and the event are
 * all found), otherwise its title.
 */
export function referenceQuery(project: Project, cls: BlueprintClass, node: NodeInstance): string {
  const names = nameIndex(project);
  for (const key of ['variable', 'graph', 'dispatcher', 'fn']) {
    const v = node.config[key];
    const name = typeof v === 'string' ? names.get(v) : undefined;
    if (name) return name;
  }
  for (const key of ['name', 'event']) {
    const v = node.config[key];
    if (typeof v === 'string' && v && !v.includes(':')) return v;
  }
  return displayTitle(node, cls, contextFor(cls, project));
}
