/**
 * V3 step B: Structure assets (Make, Break, Set Members in), Sets, Maps,
 * Text and Name.
 */
import { describe, expect, it } from 'vitest';
import { compileClass } from '../src/core/compiler/validate';
import { ProjectBuilder, type ClassBuilder } from '../src/core/lessons/builder';
import { findPin } from '../src/core/nodes/registry';
import { contextFor } from '../src/core/nodes/registry';
import { addStruct, addStructMember, removeStruct, renameStruct, updateStructMember } from '../src/core/operations/structOps';
import { Simulation } from '../src/core/runtime/simulation';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';
import { T, typeLabel } from '../src/core/types/pins';

const prints = (s: Simulation) => s.log.filter((l) => l.message !== undefined).map((l) => l.message);
const errors = (s: Simulation) => s.log.filter((l) => l.level === 'error').map((l) => l.text);
const compileErrors = (pb: ProjectBuilder, b: ClassBuilder) =>
  compileClass(b.cls, pb.project)
    .messages.filter((m) => m.severity === 'error')
    .map((m) => m.text);

/** S_Objet { Nom: String = "?", Poids: Integer = 1 }. */
function itemStruct(pb: ProjectBuilder) {
  const r = addStruct(pb.project, 'S_Objet');
  if (!r.ok) throw new Error(r.reason);
  const s = r.value;
  const nom = s.members[0];
  updateStructMember(pb.project, s.id, nom.id, { name: 'Nom', type: T.string });
  updateStructMember(pb.project, s.id, nom.id, { defaultValue: '?' });
  const poids = addStructMember(pb.project, s.id, T.int)!;
  updateStructMember(pb.project, s.id, poids.id, { name: 'Poids', defaultValue: 1 });
  return { s, nom, poids };
}

function run(pb: ProjectBuilder) {
  const s = new Simulation(pb.project);
  s.step();
  return s;
}

describe('Structures', () => {
  it('Make, then Break, gives back each member; missing members take their default', () => {
    const pb = new ProjectBuilder('t');
    const { nom, poids } = itemStruct(pb);
    const b = pb.blueprint('BP');
    pb.place(b, 0, 0);
    const make = b.node('struct.make', { struct: 'S_Objet' }, { [nom.id]: 'Clé' });
    const brk = b.node('struct.break', { struct: 'S_Objet' });
    const p1 = b.node('debug.printString');
    const p2 = b.node('debug.printString');
    b.link(make, 'struct', brk, 'struct');
    b.link(b.node('event.beginPlay'), 'then', p1, 'exec').link(brk, nom.id, p1, 'text').link(p1, 'then', p2, 'exec').link(brk, poids.id, p2, 'text');
    expect(compileErrors(pb, b)).toEqual([]);
    expect(prints(run(pb))).toEqual(['Clé', '1']);
  });

  it('Set Members changes only the members shown, in the variable', () => {
    const pb = new ProjectBuilder('t');
    const { nom, poids } = itemStruct(pb);
    const b = pb.blueprint('BP');
    pb.place(b, 0, 0);
    const v = b.variable('Objet', T.struct('S_Objet'), { [nom.id]: 'Lampe', [poids.id]: 3 });
    const set = b.node('struct.setMembers', { struct: 'S_Objet', fields: poids.id }, { [poids.id]: 9 });
    const brk = b.node('struct.break', { struct: 'S_Objet' });
    const pr = b.node('string.append', { inputs: 2 });
    const say = b.node('debug.printString');
    b.link(b.node('event.beginPlay'), 'then', set, 'exec').link(b.node('var.get', { variable: v }), 'value', set, 'struct');
    b.link(set, 'then', say, 'exec').link(b.node('var.get', { variable: v }), 'value', brk, 'struct');
    b.link(brk, nom.id, pr, 'in0').link(brk, poids.id, pr, 'in1').link(pr, 'result', say, 'text');
    expect(compileErrors(pb, b)).toEqual([]);
    expect(prints(run(pb))).toEqual(['Lampe9']);
  });

  it('Set Members on Get (a copy) changes nothing in the array; on Get (a ref) it does', () => {
    for (const [getter, expected] of [
      ['array.get', '1'],
      ['array.getRef', '5'],
    ] as const) {
      const pb = new ProjectBuilder('t');
      const { poids } = itemStruct(pb);
      const b = pb.blueprint('BP');
      pb.place(b, 0, 0);
      const list = b.variable('Sac', T.array(T.struct('S_Objet')), [{}, {}]);
      const get = b.node(getter, {}, { index: 0 });
      const set = b.node('struct.setMembers', { struct: 'S_Objet', fields: poids.id }, { [poids.id]: 5 });
      const get2 = b.node('array.get', {}, { index: 0 });
      const brk = b.node('struct.break', { struct: 'S_Objet' });
      const say = b.node('debug.printString');
      b.link(b.node('var.get', { variable: list }), 'value', get, 'array').link(get, 'item', set, 'struct');
      b.link(b.node('event.beginPlay'), 'then', set, 'exec').link(set, 'then', say, 'exec');
      b.link(b.node('var.get', { variable: list }), 'value', get2, 'array').link(get2, 'item', brk, 'struct').link(brk, poids.id, say, 'text');
      expect(compileErrors(pb, b)).toEqual([]);
      expect(prints(run(pb)), getter).toEqual([expected]);
    }
  });

  it('renames follow everywhere, a structure cannot contain itself, and a used one cannot be deleted', () => {
    const pb = new ProjectBuilder('t');
    const { s } = itemStruct(pb);
    const b = pb.blueprint('BP');
    const v = b.variable('Objets', T.map(T.name, T.struct('S_Objet')));
    const make = b.node('struct.make', { struct: 'S_Objet' });
    expect(renameStruct(pb.project, s.id, 'S_Item').ok).toBe(true);
    expect(b.cls.variables.find((x) => x.id === v)!.type.value!.subtype).toBe('S_Item');
    expect(b.graph.nodes[make].config.struct).toBe('S_Item');
    expect(updateStructMember(pb.project, s.id, s.members[0].id, { type: T.array(T.struct('S_Item')) }).ok).toBe(false);
    expect(removeStruct(pb.project, s.id).ok).toBe(false);
  });

  it('old files open with no structures', () => {
    const pb = new ProjectBuilder('t');
    const file = JSON.parse(serializeProject(pb.project));
    file.format = 5;
    delete file.project.structs;
    const p = parseProject(JSON.stringify(file));
    expect(p.structs).toEqual([]);
  });
});

describe('Sets', () => {
  it('keep each Name once, ignoring case', () => {
    const pb = new ProjectBuilder('t');
    const b = pb.blueprint('BP');
    pb.place(b, 0, 0);
    const v = b.variable('Badges', T.set(T.name));
    const adds = ['Rouge', 'Bleu', 'rouge'].map((n) => b.node('set.add', {}, { item: n }));
    const len = b.node('set.length');
    const has = b.node('set.contains', {}, { item: 'BLEU' });
    const p1 = b.node('debug.printString');
    const p2 = b.node('debug.printString');
    let prev = b.node('event.beginPlay');
    for (const a of adds) {
      b.link(prev, 'then', a, 'exec').link(b.node('var.get', { variable: v }), 'value', a, 'set');
      prev = a;
    }
    b.link(prev, 'then', p1, 'exec').link(b.node('var.get', { variable: v }), 'value', len, 'set').link(len, 'result', p1, 'text');
    b.link(p1, 'then', p2, 'exec').link(b.node('var.get', { variable: v }), 'value', has, 'set').link(has, 'result', p2, 'text');
    expect(compileErrors(pb, b)).toEqual([]);
    expect(prints(run(pb))).toEqual(['2', 'true']);
  });
});

describe('Maps', () => {
  it('a Map wired to a generic node types its key and value pins', () => {
    const pb = new ProjectBuilder('t');
    const b = pb.blueprint('BP');
    const v = b.variable('Codes', T.map(T.string, T.int));
    const find = b.node('map.find');
    b.link(b.node('var.get', { variable: v }), 'value', find, 'map');
    const ctx = contextFor(b.cls, pb.project);
    const node = b.graph.nodes[find];
    expect(findPin(node, 'key', ctx)!.type.category).toBe('string');
    expect(findPin(node, 'value', ctx)!.type.category).toBe('int');
    expect(typeLabel(findPin(node, 'map', ctx)!.type)).toBe('Map of String to Integer');
  });

  it('Add replaces, Find returns false and the default when the key is missing, keys ignore case', () => {
    const pb = new ProjectBuilder('t');
    const b = pb.blueprint('BP');
    pb.place(b, 0, 0);
    const v = b.variable('Codes', T.map(T.string, T.int), [['Porte', 1]]);
    const add = b.node('map.add', {}, { key: 'porte', value: 42 });
    const f1 = b.node('map.find', {}, { key: 'PORTE' });
    const f2 = b.node('map.find', {}, { key: 'Coffre' });
    const len = b.node('map.length');
    const say = (text: string) => b.node('debug.printString', {}, { text });
    const p = [say(''), say(''), say(''), say('')];
    b.link(b.node('event.beginPlay'), 'then', add, 'exec').link(b.node('var.get', { variable: v }), 'value', add, 'map');
    b.link(add, 'then', p[0], 'exec').link(b.node('var.get', { variable: v }), 'value', f1, 'map').link(f1, 'value', p[0], 'text');
    b.link(p[0], 'then', p[1], 'exec').link(b.node('var.get', { variable: v }), 'value', f2, 'map').link(f2, 'value', p[1], 'text');
    b.link(p[1], 'then', p[2], 'exec').link(f2, 'result', p[2], 'text');
    b.link(p[2], 'then', p[3], 'exec').link(b.node('var.get', { variable: v }), 'value', len, 'map').link(len, 'result', p[3], 'text');
    expect(compileErrors(pb, b)).toEqual([]);
    const s = run(pb);
    expect(prints(s)).toEqual(['42', '0', 'false', '1']);
    expect(errors(s)).toEqual([]);
  });
});

describe('Text and Name', () => {
  it('Format Text fills each {argument}; Equal (Name) ignores case, Equal (Text) does not', () => {
    const pb = new ProjectBuilder('t');
    const b = pb.blueprint('BP');
    pb.place(b, 0, 0);
    const fmt = b.node('text.format', {}, { format: '{Objet} x{Nombre}', 'arg:Objet': 'Clé', 'arg:Nombre': '2' });
    const eqName = b.node('name.equal', {}, { a: 'Rouge', b: 'rouge' });
    const eqText = b.node('text.equal', {}, { a: 'Rouge', b: 'rouge' });
    const p = [0, 1, 2].map(() => b.node('debug.printString'));
    b.link(b.node('event.beginPlay'), 'then', p[0], 'exec').link(fmt, 'result', p[0], 'text');
    b.link(p[0], 'then', p[1], 'exec').link(eqName, 'result', p[1], 'text');
    b.link(p[1], 'then', p[2], 'exec').link(eqText, 'result', p[2], 'text');
    expect(compileErrors(pb, b)).toEqual([]);
    expect(prints(run(pb))).toEqual(['Clé x2', 'true', 'false']);
  });
});
