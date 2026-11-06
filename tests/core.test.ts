import { describe, expect, it } from 'vitest';
import { compileClass } from '../src/core/compiler/validate';
import { History, snapshot } from '../src/core/history/history';
import { createProject } from '../src/core/model/project';
import { paletteEntries, searchEntries, compatiblePin } from '../src/core/nodes/palette';
import { contextFor, resolvePins } from '../src/core/nodes/registry';
import { addComponent, addVariable, removeVariable, renameVariable, setVariableType } from '../src/core/operations/classOps';
import { addNode, connect, duplicateNodes, removeNodes, setNodeConfig } from '../src/core/operations/graphOps';
import { addClass } from '../src/core/operations/projectOps';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';
import { createStarterProject } from '../src/core/templates/starterProject';
import { T, isAssignable, makeHierarchy } from '../src/core/types/pins';
import { EditorStore } from '../src/core/store/editorStore';

function setup() {
  const p = createProject();
  const res = addClass(p, 'BP_Test');
  if (!res.ok) throw new Error();
  const cls = res.value;
  return { p, cls, g: cls.graphs[0], ctx: () => contextFor(cls) };
}

function must<T>(r: { ok: true; value: T } | { ok: false; reason: string }): T {
  if (!r.ok) throw new Error(r.reason);
  return r.value;
}

describe('types', () => {
  it('accepts subclasses for object references', () => {
    const h = makeHierarchy({ BP_Lamp: 'Actor' });
    expect(isAssignable(T.object('BP_Lamp'), T.object('Actor'), h)).toBe(true);
    expect(isAssignable(T.object('Actor'), T.object('BP_Lamp'), h)).toBe(false);
    expect(isAssignable(T.object('PointLightComponent'), T.object('SceneComponent'), h)).toBe(true);
  });
  it('never mixes exec and data', () => {
    const h = makeHierarchy();
    expect(isAssignable(T.exec, T.bool, h)).toBe(false);
    expect(isAssignable(T.int, T.float, h)).toBe(false);
  });
});

describe('connections', () => {
  it('connects exec pins and replaces an existing exec output link', () => {
    const { g, ctx } = setup();
    const a = must(addNode(g, 'event.beginPlay', 0, 0));
    const b = must(addNode(g, 'debug.printString', 200, 0));
    const c = must(addNode(g, 'debug.printString', 200, 200));
    must(connect(g, { node: a.id, pin: 'then' }, { node: b.id, pin: 'exec' }, ctx()));
    must(connect(g, { node: c.id, pin: 'exec' }, { node: a.id, pin: 'then' }, ctx())); // reversed order is normalised
    const links = Object.values(g.links);
    expect(links).toHaveLength(1);
    expect(links[0].to.node).toBe(c.id);
  });
  it('lets one data output feed several inputs, but an input has one source', () => {
    const { g, ctx } = setup();
    const r1 = must(addNode(g, 'math.randomIntInRange', 0, 0));
    const r2 = must(addNode(g, 'math.randomIntInRange', 0, 100));
    const add = must(addNode(g, 'math.addInt', 200, 0));
    must(connect(g, { node: r1.id, pin: 'result' }, { node: add.id, pin: 'a' }, ctx()));
    must(connect(g, { node: r1.id, pin: 'result' }, { node: add.id, pin: 'b' }, ctx()));
    expect(Object.values(g.links)).toHaveLength(2);
    must(connect(g, { node: r2.id, pin: 'result' }, { node: add.id, pin: 'a' }, ctx()));
    const intoA = Object.values(g.links).filter((l) => l.to.pin === 'a');
    expect(intoA).toHaveLength(1);
    expect(intoA[0].from.node).toBe(r2.id);
  });
  it('refuses incompatible types with a readable reason', () => {
    const { g, ctx } = setup();
    const r = must(addNode(g, 'math.randomIntInRange', 0, 0));
    const br = must(addNode(g, 'flow.branch', 200, 0));
    const res = connect(g, { node: r.id, pin: 'result' }, { node: br.id, pin: 'condition' }, ctx());
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain('Integer');
  });
  it('drops links to Sequence outputs that no longer exist', () => {
    const { g, ctx } = setup();
    const seq = must(addNode(g, 'flow.sequence', 0, 0));
    const p = must(addNode(g, 'debug.printString', 200, 0));
    setNodeConfig(g, seq.id, 'outputs', 3, ctx());
    must(connect(g, { node: seq.id, pin: 'then2' }, { node: p.id, pin: 'exec' }, ctx()));
    setNodeConfig(g, seq.id, 'outputs', 2, ctx());
    expect(Object.values(g.links)).toHaveLength(0);
  });
  it('allows only one BeginPlay and no Delay in functions', () => {
    const { g } = setup();
    must(addNode(g, 'event.beginPlay', 0, 0));
    expect(addNode(g, 'event.beginPlay', 0, 0).ok).toBe(false);
    const fn = { ...g, id: 'fn', kind: 'function' as const, nodes: {}, links: {} };
    expect(addNode(fn, 'time.delay', 0, 0).ok).toBe(false);
  });
});

describe('variables', () => {
  it('generates Get/Set nodes typed like the variable and prunes links on type change', () => {
    const { cls, g, ctx } = setup();
    const v = addVariable(cls, T.int, 'Score');
    const get = must(addNode(g, 'var.get', 0, 0, { variable: v.id }));
    const add = must(addNode(g, 'math.addInt', 200, 0));
    expect(resolvePins(get, ctx())[0].type.category).toBe('int');
    must(connect(g, { node: get.id, pin: 'value' }, { node: add.id, pin: 'a' }, ctx()));
    setVariableType(cls, v.id, T.bool);
    expect(Object.values(g.links)).toHaveLength(0);
  });
  it('rejects duplicate names and deletes nodes with the variable', () => {
    const { cls, g } = setup();
    const a = addVariable(cls, T.bool, 'Flag');
    const b = addVariable(cls, T.bool, 'Flag');
    expect(b.name).toBe('Flag_0');
    expect(renameVariable(cls, b.id, 'flag').ok).toBe(false);
    must(addNode(g, 'var.set', 0, 0, { variable: a.id }));
    expect(removeVariable(cls, a.id)).toBe(1);
    expect(Object.keys(g.nodes)).toHaveLength(0);
  });
});

describe('duplicate & remove', () => {
  it('duplicates nodes with their internal links', () => {
    const { g, ctx } = setup();
    const b = must(addNode(g, 'flow.branch', 0, 0));
    const p = must(addNode(g, 'debug.printString', 200, 0));
    must(connect(g, { node: b.id, pin: 'true' }, { node: p.id, pin: 'exec' }, ctx()));
    const copies = duplicateNodes(g, [b.id, p.id]);
    expect(copies).toHaveLength(2);
    expect(Object.values(g.links)).toHaveLength(2);
    removeNodes(g, copies);
    expect(Object.values(g.links)).toHaveLength(1);
  });
});

describe('history', () => {
  it('undoes and redoes a class change', () => {
    const { p, cls } = setup();
    const h = new History();
    const scope = { kind: 'class' as const, id: cls.id };
    const before = snapshot(p, scope);
    addVariable(cls, T.bool, 'X');
    h.push({ label: 'Add var', scope, before, after: snapshot(p, scope) });
    h.undo(p);
    expect(p.classes[0].variables).toHaveLength(0);
    h.redo(p);
    expect(p.classes[0].variables).toHaveLength(1);
  });
  it('store.apply records one entry per action', () => {
    const store = new EditorStore(createStarterProject());
    const count = Object.keys(store.graph.nodes).length;
    store.apply('Ajouter', (_c, g) => addNode(g, 'flow.branch', 0, 0));
    expect(Object.keys(store.graph.nodes)).toHaveLength(count + 1);
    store.undo();
    expect(Object.keys(store.graph.nodes)).toHaveLength(count);
    store.redo();
    expect(Object.keys(store.graph.nodes)).toHaveLength(count + 1);
  });
});

describe('serialization', () => {
  it('round-trips the starter project', () => {
    const p = createStarterProject();
    const back = parseProject(serializeProject(p));
    expect(back).toEqual(p);
  });
  it('rejects foreign files', () => {
    expect(() => parseProject('{"hello":1}')).toThrow();
    expect(() => parseProject('not json')).toThrow();
  });
});

describe('compiler', () => {
  it('starter project compiles without errors', () => {
    const p = createStarterProject();
    expect(compileClass(p.classes[0]).status).toBe('ok');
  });
  it('flags an unconnected component Target', () => {
    const { cls, g } = setup();
    const b = must(addNode(g, 'event.beginPlay', 0, 0));
    const s = must(addNode(g, 'component.setVisibility', 200, 0));
    connect(g, { node: b.id, pin: 'then' }, { node: s.id, pin: 'exec' }, contextFor(cls));
    const res = compileClass(cls);
    expect(res.status).toBe('error');
    expect(res.messages.some((m) => m.text.includes('Target'))).toBe(true);
  });
});

describe('palette', () => {
  it('finds nodes with French keywords and accents ignored', () => {
    const { cls } = setup();
    addComponent(cls, 'PointLight');
    const entries = paletteEntries(contextFor(cls), cls.graphs[0]);
    expect(searchEntries(entries, 'branch')[0].def).toBe('flow.branch');
    expect(searchEntries(entries, 'eteindre').some((e) => e.def === 'component.toggleVisibility')).toBe(true);
    expect(entries.some((e) => e.title === 'Get PointLight')).toBe(true);
  });
  it('finds a compatible pin for context-sensitive placement', () => {
    const { cls } = setup();
    const ctx = contextFor(cls);
    const entries = paletteEntries(ctx, { id: 'g', kind: 'event' });
    const branch = entries.find((e) => e.def === 'flow.branch')!;
    expect(compatiblePin(branch, ctx, { dir: 'out', type: T.bool })?.id).toBe('condition');
    expect(compatiblePin(branch, ctx, { dir: 'out', type: T.int })).toBeUndefined();
  });
});
