/** V7.20: the Actor Components steps refuse the usual wrong solutions, with a reason that says where to look. */
import { describe, expect, it } from 'vitest';
import { getLesson, LESSONS } from '../src/core/lessons';
import { edit } from '../src/core/lessons/builder';
import { runLesson, runRobustness } from '../src/core/lessons/runner';
import type { Lesson } from '../src/core/lessons/types';
import type { Project } from '../src/core/model/project';
import { removeComponent } from '../src/core/operations/classOps';
import { removeNodes } from '../src/core/operations/graphOps';
import { setParentClass } from '../src/core/operations/projectOps';

const lesson = (id: string) => getLesson(id)!;
const solved = (l: Lesson, tweak?: (p: Project) => void) => {
  const p = l.setup();
  l.solve(p);
  tweak?.(p);
  return p;
};
const failures = (l: Lesson, p: Project) => {
  const run = runLesson(l, p);
  expect(run.compileErrors.map((m) => m.text)).toEqual([]);
  return run.results.filter((r) => !r.ok && !r.check.notion).map((r) => `${r.check.id}: ${r.reason}`);
};

describe('the Actor Components steps in the path', () => {
  it('sit right after « L’héritage », in ladder order: discover, guided, repair, transfer, then parent or component', () => {
    const ids = LESSONS.map((l) => l.id);
    const at = ids.indexOf('l-heritage');
    expect(ids.slice(at + 1, at + 6)).toEqual(['p15-qui-commence', 'r5-sante-partout', 'd22-scanner', 't3-piege', 'l-verrou-badge']);
    expect(LESSONS.filter((l) => l.chain?.notion === 'actor-components').map((l) => l.chain!.step)).toEqual(['discover', 'guided', 'transfer']);
  });
});

describe('R5 La santé est partout', () => {
  const l = lesson('r5-sante-partout');

  it('a health kept in each actor is refused, even if everything works', () => {
    expect(failures(l, l.setup()).join(' ')).toMatch(/Crée BP_Sante/);
  });

  it('a component carried by two actors out of three is refused', () => {
    const p = solved(l, (p) => {
      const crate = edit(p, 'BP_Caisse');
      removeComponent(crate.cls, crate.cls.components.find((c) => c.kind === 'ActorComponent')!.id);
      removeNodes(crate.graph, Object.values(crate.graph.nodes).filter((n) => n.def === 'call.function').map((n) => n.id));
    });
    expect(failures(l, p).join(' ')).toMatch(/BP_Caisse ne porte pas de BP_Sante/);
  });

  it('the same life for all is caught: the crate must die first, the turret last', () => {
    const p = solved(l, (p) => {
      for (const c of p.classes) for (const k of c.components) if (k.kind === 'ActorComponent') k.values = {};
    });
    expect(failures(l, p).some((f) => f.startsWith('first') || f.startsWith('second'))).toBe(true);
  });
});

describe('D22 Le scanner et le chariot', () => {
  const l = lesson('d22-scanner');

  it('the starting scanner makes up a « Vie : 0 » and logs Accessed None', () => {
    const f = failures(l, l.setup()).join(' ');
    expect(f).toMatch(/Vie : 0/);
    expect(f).toMatch(/Accessed None/);
  });

  it('an Is Valid with nothing on Is Not Valid still misses « Rien à mesurer »', () => {
    const p = solved(l, (p) => {
      const g = edit(p, 'BP_Scanner').graph;
      removeNodes(
        g,
        Object.values(g.nodes)
          .filter((n) => n.def === 'debug.printString' && n.defaults.text === 'Rien à mesurer')
          .map((n) => n.id),
      );
    });
    expect(failures(l, p).map((f) => f.split(':')[0])).toEqual(['cart']);
  });
});

describe('T3 Le piège qui blesse tout', () => {
  const l = lesson('t3-piege');

  it('a trap without Is Valid hurts the right ones but logs Accessed None on the wall', () => {
    const p = solved(l, (p) => {
      const g = edit(p, 'BP_Piege').graph;
      const valid = Object.values(g.nodes).find((n) => n.def === 'flow.isValid')!;
      const ev = Object.values(g.nodes).find((n) => n.def === 'event.actorBeginOverlap')!;
      const call = Object.values(g.nodes).find((n) => n.def === 'call.function')!;
      removeNodes(g, [valid.id]);
      g.links.direct = { id: 'direct', from: { node: ev.id, pin: 'then' }, to: { node: call.id, pin: 'exec' } };
    });
    expect(failures(l, p).join(' ')).toMatch(/Accessed None/);
  });

  it('a trap that casts to each kind is refused', () => {
    const p = solved(l, (p) => {
      const b = edit(p, 'BP_Piege');
      const cast = b.node('cast.to', { class: p.classes.find((c) => c.name === 'BP_Drone')!.id }, {}, [64, 700]);
      b.link(Object.values(b.graph.nodes).find((n) => n.def === 'event.actorBeginOverlap')!.id, 'other', cast, 'object');
    });
    expect(failures(l, p).join(' ')).toMatch(/fait un Cast/);
  });
});

describe('Le verrou à badge', () => {
  const l = lesson('l-verrou-badge');

  it('a terminal made a child of BP_PorteBase to share the lock is refused: it is no door', () => {
    const p = solved(l, (p) => {
      const terminal = p.classes.find((c) => c.name === 'BP_Terminal')!;
      const base = p.classes.find((c) => c.name === 'BP_PorteBase')!;
      expect(setParentClass(p, terminal.id, base.id).ok).toBe(true);
    });
    expect(failures(l, p).join(' ')).toMatch(/un terminal n’est pas une porte/);
  });

  it('a lock that checks the badge in the door itself (a Cast there) is refused', () => {
    const p = solved(l, (p) => {
      const door = edit(p, 'BP_PorteBlindee');
      const cast = door.node('cast.to', { class: p.classes.find((c) => c.name === 'BP_Joueur')!.id }, {}, [400, 800]);
      door.link(door.node('event.actorBeginOverlap', {}, {}, [64, 800]), 'other', cast, 'object');
    });
    expect(failures(l, p).join(' ')).toMatch(/BP_PorteBlindee fait un Cast/);
  });

  it('a terminal set to level 2 opens for the player: refused', () => {
    const p = solved(l, (p) => {
      const terminal = p.classes.find((c) => c.name === 'BP_Terminal')!;
      const comp = terminal.components.find((c) => c.kind === 'ActorComponent')!;
      const level = p.classes.find((c) => c.name === 'BP_Verrou')!.variables.find((v) => v.name === 'NiveauRequis')!.id;
      comp.values = { [level]: 2 };
    });
    expect(failures(l, p).join(' ')).toMatch(/Il faut le niveau 3/);
  });

  it('with a badge 3, the reference terminal says « Accès autorisé »; one that never reacts does not', () => {
    expect(runRobustness(l, solved(l)).map((r) => r.ok)).toEqual([true]);
    const mute = solved(l, (p) => {
      const g = edit(p, 'BP_Terminal').graph;
      removeNodes(g, Object.values(g.nodes).filter((n) => n.def === 'debug.printString').map((n) => n.id));
    });
    expect(runRobustness(l, mute).map((r) => r.ok)).toEqual([false]);
  });
});
