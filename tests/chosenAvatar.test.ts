/** V7.56: Complète C8 « Le personnage choisi » (E40 of the collection), and Get Class typed by its input. */
import { describe, expect, it } from 'vitest';
import { edit, ProjectBuilder } from '../src/core/lessons/builder';
import { LESSONS } from '../src/core/lessons/index';
import { runLesson } from '../src/core/lessons/runner';
import type { Project } from '../src/core/model/project';
import { connect, removeNodes } from '../src/core/operations/graphOps';
import { contextFor, resolvePins } from '../src/core/nodes/registry';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';

const c8 = LESSONS.find((l) => l.id === 'c8-personnage')!;
const reason = (r: ReturnType<typeof runLesson>, id: string) => String(r.results.find((x) => x.check.id === id && !x.ok)?.reason ?? '');
const fnGraph = (p: Project, cls: string, name: string) => p.classes.find((c) => c.name === cls)!.graphs.find((g) => g.name === name)!;

describe('C8 « Le personnage choisi »', () => {
  it('sits right after T6, in the Avancé, as a Complète with two gaps', () => {
    const ids = LESSONS.map((l) => l.id);
    expect(ids.indexOf('c8-personnage')).toBe(ids.indexOf('t6-pion-atelier') + 1);
    expect(c8.kind).toBe('complete');
    const p = c8.setup();
    const gaps = p.classes.flatMap((c) => c.graphs.flatMap((g) => Object.values(g.nodes))).filter((n) => n.def === 'util.comment' && String(n.config.text).startsWith('Trou'));
    expect(gaps).toHaveLength(2);
  });

  it('as given: the showcase reference is None behind the door, and the Agent is played whatever the choice', () => {
    const r = runLesson(c8, c8.setup());
    expect(r.passed).toBe(false);
    expect(reason(r, 'drone')).toContain('vitrine');
    expect(reason(r, 'drone')).toContain('None');
  });

  it('the class kept, but the GameMode left empty: the message points at Trou 1', () => {
    const p = c8.setup();
    c8.solve(p);
    const o = fnGraph(p, 'BP_GameMode', 'GetDefaultPawnClassForController');
    const keep = new Set(Object.values(o.nodes).filter((n) => n.def === 'fn.entry' || n.def === 'fn.return' || n.def === 'util.comment').map((n) => n.id));
    removeNodes(o, Object.keys(o.nodes).filter((id) => !keep.has(id)));
    const r = runLesson(c8, p);
    expect(reason(r, 'drone')).toContain('Trou 1');
  });

  it('a Spawn Actor of the chosen pawn next to the GameMode’s is the duplicate', () => {
    const p = c8.setup();
    c8.solve(p);
    const gm = edit(p, 'BP_GameMode');
    const spawn = gm.node('actor.spawn', {}, { class: p.classes.find((c) => c.name === 'BP_Drone')!.id });
    gm.link(gm.node('event.beginPlay'), 'then', spawn, 'exec');
    const r = runLesson(c8, p);
    expect(reason(r, 'one')).toContain('second pion');
  });

  it('the reference solution passes; Get Class of the Pawn showcase gives a Pawn class', () => {
    const p = c8.setup();
    c8.solve(p);
    expect(runLesson(c8, p).passed).toBe(true);
    const w = p.classes.find((c) => c.name === 'WBP_Choix')!;
    const g = fnGraph(p, 'WBP_Choix', 'Choisir');
    const get = Object.values(g.nodes).find((n) => n.def === 'actor.getClassName')!;
    const out = resolvePins(get, contextFor(w, p)).find((x) => x.id === 'result')!;
    expect(out.type).toEqual({ category: 'class', subtype: 'Pawn' });
  });
});

describe('Get Class takes the type of its object (UE’s DeterminesOutputType)', () => {
  it('unwired: an Object class; wired to a BP_Lampe: a BP_Lampe class; and a saved project keeps it', () => {
    const pb = new ProjectBuilder('get-class');
    const lamp = pb.blueprint('BP_Lampe');
    const b = pb.blueprint('BP_Test');
    const get = b.node('actor.getClassName');
    const ctx = contextFor(b.cls, pb.project);
    const outType = () => resolvePins(b.graph.nodes[get], ctx).find((x) => x.id === 'result')!.type;
    expect(outType()).toEqual({ category: 'class', subtype: 'Object' });
    const v = b.variable('Lampe', { category: 'object', subtype: lamp.cls.name });
    const read = b.node('var.get', { variable: v });
    const r = connect(b.graph, { node: read, pin: 'value' }, { node: get, pin: 'object' }, ctx);
    expect(r.ok).toBe(true);
    expect(outType()).toEqual({ category: 'class', subtype: 'BP_Lampe' });
    const back = parseProject(serializeProject(pb.project));
    const cls = back.classes.find((c) => c.name === 'BP_Test')!;
    const node = Object.values(cls.graphs[0].nodes).find((n) => n.def === 'actor.getClassName')!;
    expect(resolvePins(node, contextFor(cls, back)).find((x) => x.id === 'result')!.type.subtype).toBe('BP_Lampe');
  });
});
