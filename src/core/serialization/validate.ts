/**
 * Checks a project read from a file or from storage before anything uses it.
 *
 * What would stop the editor or the simulation from opening it is refused,
 * with a reason for the learner (ProjectFileError). Loose ends that the app
 * can safely drop are repaired in place, as UE does when it loads an asset
 * whose references are gone: a wire to a node that no longer exists, an actor
 * of a deleted class, a pawn class that is not there any more.
 */
import { NATIVE_PARENTS, type Project } from '../model/project';
import { slotDefaults, widgetPropsDefaults, WIDGET_KINDS, type WidgetKind } from '../model/widgets';

export class ProjectFileError extends Error {
  /** 'newer': written by a newer version of the app; 'invalid': not a readable project. */
  constructor(
    message: string,
    readonly kind: 'invalid' | 'newer' = 'invalid',
  ) {
    super(message);
  }
}

const GRAPH_KINDS = ['event', 'function', 'construction'];
const COMPONENT_KINDS = ['Scene', 'StaticMesh', 'PointLight', 'BoxCollision', 'TextRender', 'Widget', 'ActorComponent'];
const KEYS = ['E', 'F', 'SpaceBar'];
const TRIGGERS = ['Down', 'Pressed', 'Released', 'Hold'];

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function fail(message: string): never {
  throw new ProjectFileError(message);
}

function need(ok: boolean, message: string): void {
  if (!ok) fail(message);
}

/** A number, or `fallback` when it is missing; anything else is refused. */
function numberOr(o: Obj, key: string, fallback: number, where: string): void {
  if (o[key] === undefined) o[key] = fallback;
  else need(isNum(o[key]), `${where} : « ${key} » n’est pas un nombre.`);
}

function named(v: unknown, what: string): Obj {
  need(isObj(v) && isStr(v.id) && isStr(v.name), `${what} sans identifiant ni nom.`);
  return v as Obj;
}

function list(o: Obj, key: string, where: string): unknown[] {
  const v = o[key];
  need(Array.isArray(v), `${where} : « ${key} » manque ou n’est pas une liste.`);
  return v as unknown[];
}

function record(o: Obj, key: string, where: string): Obj {
  const v = o[key];
  need(isObj(v), `${where} : « ${key} » manque ou est mal formé.`);
  return v as Obj;
}

function checkGraph(g: unknown, owner: string): void {
  const graph = named(g, `Un graphe de « ${owner} »`);
  const where = `Graphe « ${graph.name} » de « ${owner} »`;
  need(GRAPH_KINDS.includes(graph.kind as string), `${where} : type de graphe inconnu.`);
  const nodes = record(graph, 'nodes', where);
  const links = record(graph, 'links', where);
  for (const [id, n] of Object.entries(nodes)) {
    need(isObj(n) && isStr(n.id) && isStr(n.def), `${where} : un nœud est incomplet.`);
    const node = n as Obj;
    need(node.id === id, `${where} : le nœud ${id} est mal rangé.`);
    numberOr(node, 'x', 0, where);
    numberOr(node, 'y', 0, where);
    node.config ??= {};
    node.defaults ??= {};
    need(isObj(node.config) && isObj(node.defaults), `${where} : réglages d’un nœud mal formés.`);
  }
  // A wire whose end is gone cannot be drawn nor followed: dropped.
  const end = (r: unknown) => isObj(r) && isStr(r.node) && isStr(r.pin) && r.node in nodes;
  for (const [id, l] of Object.entries(links)) {
    if (!isObj(l) || !end(l.from) || !end(l.to)) delete links[id];
    else if (!isStr(l.id)) l.id = id;
  }
}

function checkClass(c: unknown): void {
  const cls = named(c, 'Un Blueprint');
  const where = `Blueprint « ${cls.name} »`;
  need(NATIVE_PARENTS.includes(cls.parent as never), `${where} : classe parente inconnue.`);
  cls.autoReceiveInput ??= false;
  for (const k of list(cls, 'components', where)) {
    const cmp = named(k, `Un composant de « ${cls.name} »`);
    need(COMPONENT_KINDS.includes(cmp.kind as string), `${where} : composant « ${cmp.name} » d’un type inconnu.`);
    need(isObj(cmp.props), `${where} : propriétés du composant « ${cmp.name} » manquantes.`);
    if (cmp.kind === 'ActorComponent') {
      cmp.values ??= {};
      need(isObj(cmp.values), `${where} : valeurs du composant « ${cmp.name} » mal formées.`);
    }
  }
  for (const v of list(cls, 'variables', where)) {
    need(isObj(named(v, `Une variable de « ${cls.name} »`).type), `${where} : une variable n’a pas de type.`);
  }
  const graphs = list(cls, 'graphs', where);
  need(graphs.length > 0, `${where} : aucun graphe (il faut au moins l’Event Graph).`);
  for (const g of graphs) checkGraph(g, String(cls.name));
  for (const d of list(cls, 'dispatchers', where)) named(d, `Un Event Dispatcher de « ${cls.name} »`);
  need(list(cls, 'interfaces', where).every(isStr), `${where} : liste d’interfaces mal formée.`);
  if (cls.parent === 'UserWidget') checkWidgets(cls, where);
  else delete cls.widgets;
}

/**
 * The widget tree of a Widget Blueprint. A widget of an unknown kind is
 * refused; one whose parent is gone, or a second root, is dropped with what
 * hangs under it; missing properties take their default.
 */
function checkWidgets(cls: Obj, where: string): void {
  cls.widgets ??= [];
  const widgets = list(cls, 'widgets', where) as Obj[];
  for (const w of widgets) {
    named(w, `Un widget de « ${cls.name} »`);
    need(WIDGET_KINDS.includes(w.kind as WidgetKind), `${where} : widget « ${w.name} » d’un type inconnu.`);
    w.isVariable = w.isVariable === true;
    w.props = { ...widgetPropsDefaults(w.kind as WidgetKind), ...(isObj(w.props) ? w.props : {}) };
    w.slot = { ...slotDefaults(), ...(isObj(w.slot) ? w.slot : {}) };
    // Bindings name a function graph of the class: one that is gone is forgotten.
    if (w.bindings !== undefined) {
      const graphs = new Set((Array.isArray(cls.graphs) ? (cls.graphs as Obj[]) : []).map((g) => g.id));
      const kept = Object.entries(isObj(w.bindings) ? w.bindings : {}).filter(([, g]) => isStr(g) && graphs.has(g));
      if (kept.length) w.bindings = Object.fromEntries(kept);
      else delete w.bindings;
    }
  }
  const ids = new Set<string>();
  let root = false;
  cls.widgets = widgets.filter((w) => {
    const keep = w.parent === undefined ? !root : ids.has(w.parent as string);
    if (keep) {
      if (w.parent === undefined) root = true;
      ids.add(w.id as string);
    }
    return keep;
  });
}

function checkAssets(p: Obj): void {
  for (const i of list(p, 'interfaces', 'Projet')) list(named(i, 'Une interface'), 'functions', 'Interface');
  for (const e of list(p, 'enums', 'Projet')) need(list(named(e, 'Une Enum'), 'entries', 'Enum').every(isStr), 'Enum mal formée.');
  for (const s of list(p, 'structs', 'Projet')) list(named(s, 'Une Structure'), 'members', 'Structure');
  for (const a of list(p, 'inputActions', 'Projet')) named(a, 'Une Input Action');
  for (const c of list(p, 'mappingContexts', 'Projet')) {
    const imc = named(c, 'Un Input Mapping Context');
    for (const m of list(imc, 'mappings', `Mapping Context « ${imc.name} »`)) {
      need(isObj(m) && isStr(m.action) && KEYS.includes(m.key as string), `Mapping Context « ${imc.name} » : une ligne est mal formée.`);
      const line = m as Obj;
      line.triggers ??= [];
      need(
        Array.isArray(line.triggers) && (line.triggers as unknown[]).every((t) => isObj(t) && TRIGGERS.includes(t.kind as string)),
        `Mapping Context « ${imc.name} » : un déclencheur est inconnu.`,
      );
    }
  }
  for (const t of list(p, 'dataTables', 'Projet')) {
    const table = named(t, 'Une Data Table');
    need(isStr(table.struct), `Data Table « ${table.name} » sans structure.`);
    for (const row of list(table, 'rows', `Data Table « ${table.name} »`)) {
      need(isObj(row) && isStr(row.name) && isObj(row.value), `Data Table « ${table.name} » : une ligne est mal formée.`);
    }
  }
}

function checkLevel(p: Obj, classIds: Set<string>): void {
  const level = record(p, 'level', 'Projet');
  const actors = list(level, 'actors', 'Niveau');
  // An actor of a class that no longer exists cannot be placed: dropped.
  level.actors = actors.filter((a) => isObj(a) && isStr(a.classId) && classIds.has(a.classId));
  for (const a of level.actors as Obj[]) {
    const actor = named(a, 'Un acteur du niveau');
    const where = `Acteur « ${actor.name} »`;
    numberOr(actor, 'x', 0, where);
    numberOr(actor, 'y', 0, where);
    numberOr(actor, 'yaw', 0, where);
    actor.overrides ??= {};
    need(isObj(actor.overrides), `${where} : valeurs modifiées mal formées.`);
    if (actor.componentOverrides !== undefined) {
      need(isObj(actor.componentOverrides) && Object.values(actor.componentOverrides).every(isObj), `${where} : valeurs de ses composants mal formées.`);
    }
  }
  level.playerStart ??= { x: 0, y: 0, yaw: 0 };
  const start = level.playerStart;
  need(isObj(start), 'Player Start mal formé.');
  for (const k of ['x', 'y', 'yaw']) numberOr(start as Obj, k, 0, 'Player Start');
}

/** Refuses what cannot be opened, repairs what can safely be dropped. */
export function validateProject(value: unknown): asserts value is Project {
  need(isObj(value), 'Projet vide ou mal formé.');
  const p = value as Obj;
  if (!isStr(p.id)) p.id = `p-${Date.now().toString(36)}`;
  if (!isStr(p.name)) p.name = 'Mon projet';
  const classes = list(p, 'classes', 'Projet');
  need(classes.length > 0, 'Projet incomplet : aucun Blueprint.');
  for (const c of classes) checkClass(c);
  const classIds = new Set((classes as Obj[]).map((c) => c.id as string));
  need(classIds.size === classes.length, 'Deux Blueprints ont le même identifiant.');
  for (const c of classes as Obj[]) {
    need(c.parentClassId === undefined || classIds.has(c.parentClassId as string), `Blueprint « ${c.name} » : son Blueprint parent est introuvable.`);
  }
  // An Actor Component whose Blueprint is gone (or is not an Actor Component) cannot run: dropped, as UE drops a missing component class.
  const componentClasses = new Set((classes as Obj[]).filter((c) => c.parent === 'ActorComponent').map((c) => c.id as string));
  for (const c of classes as Obj[]) {
    c.components = (c.components as Obj[]).filter((k) => k.kind !== 'ActorComponent' || componentClasses.has(k.classId as string));
  }
  // A User Widget whose Widget Blueprint is gone: dropped from the tree.
  const widgetClasses = new Set((classes as Obj[]).filter((c) => c.parent === 'UserWidget').map((c) => c.id as string));
  // A Widget Component whose Widget Class is gone keeps its place, with None, as in UE.
  for (const c of classes as Obj[]) {
    for (const k of c.components as Obj[]) if (k.kind === 'Widget' && k.classId !== undefined && !widgetClasses.has(k.classId as string)) delete k.classId;
  }
  for (const c of classes as Obj[]) {
    if (!Array.isArray(c.widgets)) continue;
    const gone = new Set((c.widgets as Obj[]).filter((w) => w.kind === 'UserWidget' && !widgetClasses.has(w.classId as string)).map((w) => w.id as string));
    c.widgets = (c.widgets as Obj[]).filter((w) => {
      if (gone.has(w.id as string)) return false;
      if (w.parent !== undefined && gone.has(w.parent as string)) {
        gone.add(w.id as string);
        return false;
      }
      return true;
    });
  }
  checkAssets(p);
  checkLevel(p, classIds);
  if (p.playerClassId !== undefined && !classIds.has(p.playerClassId as string)) delete p.playerClassId;
  if (p.playerControllerClassId !== undefined && !classIds.has(p.playerControllerClassId as string)) delete p.playerControllerClassId;
  if (p.saveSlots !== undefined) {
    need(isObj(p.saveSlots), 'Slots de sauvegarde mal formés.');
    const slots = p.saveSlots as Obj;
    for (const [k, s] of Object.entries(slots)) if (!isObj(s) || !isObj(s.values) || !isStr(s.classId)) delete slots[k];
  }
  numberOr(p, 'createdAt', Date.now(), 'Projet');
  numberOr(p, 'updatedAt', Date.now(), 'Projet');
}
