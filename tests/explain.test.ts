/** Every error the learner can meet gets its "Pourquoi ?", and the notes point at real nodes. */
import { describe, expect, it } from 'vitest';
import { compileClass } from '../src/core/compiler/validate';
import { explainCompile } from '../src/core/explain/compile';
import { NOTED_NODES } from '../src/core/explain/notes';
import { explainRuntime } from '../src/core/explain/runtime';
import { LESSONS } from '../src/core/lessons';
import { ProjectBuilder } from '../src/core/lessons/builder';
import { getDefinition } from '../src/core/nodes/registry';
import { removeVariable } from '../src/core/operations/classOps';
import { Simulation } from '../src/core/runtime/simulation';
import { T } from '../src/core/types/pins';

describe('Pourquoi ? on runtime errors', () => {
  const messages = [
    'Accessed None trying to read property Target',
    "Accessed None trying to read property Target (l'acteur a été détruit)",
    "Accessed None trying to read property Target (le composant n'existe plus)",
    'Attempted to access index 3 from array of length 2!',
    'Infinite loop detected. Blueprint: BP_A — plus de 100 000 nœuds exécutés pour un seul événement.',
    'Infinite loop detected dans la fonction pure Calcul.',
    'SpawnActor failed because no class was specified',
    "Bind Event : la pin Event n'est reliée à aucun Custom Event.",
    "Set Timer by Event : la pin Event n'est reliée à aucun Custom Event.",
    'Divide by zero',
    'Modulo by zero',
    'Increment Int : Value doit être relié à une variable.',
    'Boucle de nœuds purs : un nœud pur dépend de lui-même.',
    "BP_A n'a pas cette fonction.",
  ];
  for (const m of messages) it(m, () => expect(explainRuntime(m)?.why.length).toBeGreaterThan(20));

  it('Accessed None names the empty variable and how to fill it', () => {
    const pb = new ProjectBuilder('t');
    const a = pb.blueprint('BP_A');
    const b = pb.blueprint('BP_B');
    pb.place(a, 0, 0);
    const v = a.variable('Cible', T.object('BP_B'));
    a.cls.variables[0].instanceEditable = true;
    const destroy = a.node('actor.destroy');
    a.link(a.node('event.beginPlay'), 'then', destroy, 'exec').link(a.node('var.get', { variable: v }), 'value', destroy, 'target');
    expect(b.cls.name).toBe('BP_B');
    const s = new Simulation(pb.project);
    s.step();
    const err = s.log.find((l) => l.level === 'error');
    expect(err?.explain?.why).toContain('variable Cible, Instance Editable');
  });
});

describe('Pourquoi ? on compile errors', () => {
  it('each error the compiler finds has a code and an explanation', () => {
    const pb = new ProjectBuilder('t');
    const a = pb.blueprint('BP_A');
    const b = pb.blueprint('BP_B');
    const vb = b.variable('Valeur', T.int);
    const va = a.variable('X', T.int);
    a.node('var.get', { variable: va });
    removeVariable(a.cls, va); // removes its nodes; add one back by hand
    a.graph.nodes.ghost = { id: 'ghost', def: 'var.get', config: { variable: 'gone' }, defaults: {}, x: 0, y: 0 } as never;
    a.node('var.setExternal', { owner: b.cls.id, variable: vb }); // Target not wired
    a.node('event.beginPlay');
    const dup = structuredClone(Object.values(a.graph.nodes).find((n) => n.def === 'event.beginPlay')!);
    a.graph.nodes.dup = { ...dup, id: 'dup' };
    a.node('debug.printString'); // not reachable: warning
    a.node('actor.spawn');
    const msgs = compileClass(a.cls, pb.project).messages.filter((m) => m.severity !== 'info');
    expect(msgs.length).toBeGreaterThan(3);
    for (const m of msgs) {
      expect(m.code, m.text).toBeDefined();
      expect(explainCompile(m.code)?.fixes.length, m.text).toBeGreaterThan(0);
    }
  });
});

describe('notes and lessons', () => {
  it('Piège and Dans UE notes are about real nodes', () => {
    for (const id of NOTED_NODES) expect(getDefinition(id), id).toBeDefined();
  });

  it('every lesson and exercise has its « À retenir » line', () => {
    for (const l of LESSONS) expect(l.remember.length, l.id).toBeGreaterThan(30);
  });
});

describe('lesson texts', () => {
  it('no escaped line break shows up as "\\n" in a card', () => {
    for (const l of LESSONS) for (const c of l.cards) expect(c.body.includes('\\n'), `${l.id} › ${c.title}`).toBe(false);
  });
});
