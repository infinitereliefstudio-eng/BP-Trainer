/** V7.20 to V7.22: the Actor Components steps (and the V7.22 recalls) refuse the usual wrong solutions, with a reason that says where to look. */
import { describe, expect, it } from 'vitest';
import { getLesson, LESSONS } from '../src/core/lessons';
import { edit } from '../src/core/lessons/builder';
import { runLesson, runRobustness } from '../src/core/lessons/runner';
import type { Lesson } from '../src/core/lessons/types';
import type { Project } from '../src/core/model/project';
import { removeComponent } from '../src/core/operations/classOps';
import { removeNodes } from '../src/core/operations/graphOps';
import { setParentClass } from '../src/core/operations/projectOps';
import { playerTells } from '../src/core/lessons/library/universalLever';

const lesson = (id: string) => getLesson(id)!;
const nodes = (p: Project, cls: string, def: string) => Object.values(edit(p, cls).graph.nodes).filter((n) => n.def === def);
/** Wire `from` straight to `to` in a class's event graph (a step taken out of the chain). */
const wire = (p: Project, cls: string, from: [string, string], to: [string, string]) => {
  const g = edit(p, cls).graph;
  for (const [k, l] of Object.entries(g.links)) if (l.to.node === to[0] && l.to.pin === to[1]) delete g.links[k];
  g.links[`w${Object.keys(g.links).length}`] = { id: 'w', from: { node: from[0], pin: from[1] }, to: { node: to[0], pin: to[1] } };
};
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
    expect(LESSONS.filter((l) => l.chain?.notion === 'actor-components').map((l) => l.chain!.step)).toEqual(['discover', 'guided', 'transfer', 'autonomy']);
  });

  it('their usage steps (V7.21) follow the steps they build on', () => {
    const ids = LESSONS.map((l) => l.id);
    const next = (id: string) => ids[ids.indexOf(id) + 1];
    expect(next('l-regarder')).toBe('l-interaction-composant');
    expect(next('d6-tourelle-aveugle')).toBe('d23-batterie');
    expect(next('c5-sac')).toBe('l-sac-coffre');
    expect(next('l-reseau')).toBe('a2-energie');
    expect(lesson('a2-energie').chain?.after).toEqual({ lesson: 't3-piege', days: 2 });
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

describe('Interagir par composant', () => {
  const l = lesson('l-interaction-composant');

  it('a player that calls Interagir without Is Valid works on the lamp but logs Accessed None at the crate', () => {
    const p = solved(l, (p) => {
      const valid = nodes(p, 'BP_Joueur', 'flow.isValid')[0];
      const loop = nodes(p, 'BP_Joueur', 'flow.forEachLoop')[0];
      const call = nodes(p, 'BP_Joueur', 'call.function')[0];
      removeNodes(edit(p, 'BP_Joueur').graph, [valid.id]);
      wire(p, 'BP_Joueur', [loop.id, 'body'], [call.id, 'exec']);
    });
    expect(failures(l, p).join(' ')).toMatch(/Accessed None/);
  });

  it('a player that casts to the lamp is refused', () => {
    const p = solved(l, (p) => {
      const b = edit(p, 'BP_Joueur');
      const cast = b.node('cast.to', { class: p.classes.find((c) => c.name === 'BP_Lampe')!.id }, {}, [400, 800]);
      b.link(nodes(p, 'BP_Joueur', 'flow.forEachLoop')[0].id, 'element', cast, 'object');
    });
    expect(failures(l, p).join(' ')).toMatch(/BP_Joueur fait un Cast/);
  });

  it('the same Action for all (values left at the default) is caught', () => {
    const p = solved(l, (p) => {
      for (const c of p.classes) for (const k of c.components) if (k.kind === 'ActorComponent') k.values = {};
    });
    expect(failures(l, p).join(' ')).toMatch(/Basculer la lampe/);
  });

  it('a terminal given a BP_Interaction works with the reference, not with a fixed text in Interagir', () => {
    expect(runRobustness(l, solved(l)).map((r) => r.ok)).toEqual([true]);
    const fixed = solved(l, (p) => {
      const comp = p.classes.find((c) => c.name === 'BP_Interaction')!;
      const g = comp.graphs.find((x) => x.name === 'Interagir')!;
      const print = Object.values(g.nodes).find((n) => n.def === 'debug.printString')!;
      for (const [k, link] of Object.entries(g.links)) if (link.to.node === print.id && link.to.pin === 'text') delete g.links[k];
      print.defaults.text = 'Interagir';
    });
    expect(runRobustness(l, fixed).map((r) => r.ok)).toEqual([false]);
  });
});

describe('D23 La batterie qui ne sait pas où elle est', () => {
  const l = lesson('d23-batterie');

  it('the starting battery does not compile, and the message points to Get Owner', () => {
    const errors = runLesson(l, l.setup()).compileErrors.map((m) => m.text);
    expect(errors.join(' ')).toMatch(/Self n’est pas un Actor.*Get Owner/);
  });

  it('measuring from the charger itself compiles but nothing ever drains', () => {
    const p = solved(l, (p) => {
      const dist = nodes(p, 'BP_Batterie', 'actor.distanceTo')[0];
      const find = nodes(p, 'BP_Batterie', 'actor.getOfClass')[0];
      const owner = nodes(p, 'BP_Batterie', 'component.getOwner')[0];
      removeNodes(edit(p, 'BP_Batterie').graph, [owner.id]);
      wire(p, 'BP_Batterie', [find.id, 'result'], [dist.id, 'target']);
    });
    expect(failures(l, p).map((f) => f.split(':')[0])).toEqual(['robot']);
  });
});

describe('Le sac et le coffre', () => {
  const l = lesson('l-sac-coffre');

  it('a chest that gives without emptying itself gives twice', () => {
    const p = solved(l, (p) => {
      const clear = p.classes.find((c) => c.name === 'BP_Inventaire')!.graphs.find((g) => g.name === 'Vider')!.id;
      const call = nodes(p, 'BP_Coffre', 'call.function').find((n) => n.config.graph === clear)!;
      removeNodes(edit(p, 'BP_Coffre').graph, [call.id]);
    });
    expect(failures(l, p).map((f) => f.split(':')[0])).toContain('again');
  });

  it('Retirer left empty: the fuse is never taken', () => {
    const p = solved(l, (p) => {
      const g = p.classes.find((c) => c.name === 'BP_Inventaire')!.graphs.find((x) => x.name === 'Retirer')!;
      removeNodes(g, Object.values(g.nodes).filter((n) => n.def === 'array.removeItem').map((n) => n.id));
    });
    expect(failures(l, p).map((f) => f.split(':')[0])).toContain('fixed');
  });

  it('the robustness case gives all three objects and takes the fuse only', () => {
    expect(runRobustness(l, solved(l)).map((r) => r.ok)).toEqual([true]);
  });
});

describe('A2 L’énergie de la station', () => {
  const l = lesson('a2-energie');

  it('an energy that tells its actor every frame is caught: one message per device', () => {
    const p = solved(l, (p) => {
      const g = p.classes.find((c) => c.name === 'BP_Energie')!.graphs[0];
      const done = Object.values(g.nodes).filter((n) => n.def === 'flow.branch')[0];
      for (const [k, link] of Object.entries(g.links)) if (link.to.node === done.id && link.to.pin === 'condition') delete g.links[k];
      done.defaults.condition = false;
      const max = Object.values(g.nodes).find((n) => n.def === 'math.maxFloat')!;
      max.defaults.b = -1000;
    });
    const f = failures(l, p).map((x) => x.split(':')[0]);
    expect(f).toContain('once');
    expect(f).toContain('floor');
  });

  it('the same charge on both lamps (no per-lamp value) is caught', () => {
    const p = solved(l, (p) => {
      for (const a of p.level.actors) delete a.componentOverrides;
    });
    expect(failures(l, p).map((f) => f.split(':')[0])).toContain('lamp-b');
  });

  it('a lamp that drains its own reserve on Event Tick is refused', () => {
    const p = solved(l, (p) => {
      edit(p, 'BP_Lampe').node('event.tick', {}, {}, [64, 600]);
    });
    expect(failures(l, p).join(' ')).toMatch(/BP_Lampe a un Event Tick/);
  });
});

describe('V7.22 recalls', () => {
  it('« La salle de contrôle »: the player now writes the E → overlap → message chain; without it nothing changes', () => {
    const l = lesson('l-salle-controle');
    const p = solved(l, (p) => {
      const g = edit(p, 'BP_Joueur').graph;
      removeNodes(g, Object.keys(g.nodes));
    });
    expect(failures(l, p).map((f) => f.split(':')[0])).toContain('eco-mode');
  });

  it('M2: a player that tells everything in reach also reaches the bin behind him', () => {
    const l = lesson('m2-distributeur');
    const p = solved(l, (p) => {
      const player = edit(p, 'BP_Joueur');
      removeNodes(player.graph, Object.keys(player.graph.nodes));
      const iface = p.interfaces.find((i) => i.name === 'BPI_Interactif')!;
      playerTells(player, p.inputActions!.find((a) => a.name === 'IA_Interagir')!.id, iface.id, iface.functions[0].id);
    });
    expect(failures(l, p).join(' ')).toMatch(/La poubelle a dit/);
  });
});
