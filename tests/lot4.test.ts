/**
 * Lot 4a of the path plan (V7.17): the Avancé as a brief. Step-by-step
 * cards wait for success, first hints are questions, and four new steps:
 * the universal lever, two mixed-practice steps, the synthesis S4.
 */
import { describe, expect, it } from 'vitest';
import { getLesson, LESSONS } from '../src/core/lessons';
import { edit } from '../src/core/lessons/builder';
import { cardsFor, helpOffers, PLAN_CARD_TITLES, REDO_UE5_TITLE } from '../src/core/lessons/helpPolicy';
import { runLesson } from '../src/core/lessons/runner';
import type { Lesson } from '../src/core/lessons/types';
import type { Project } from '../src/core/model/project';
import { removeNodes } from '../src/core/operations/graphOps';
import { levelOf } from '../src/core/model/project';

const lesson = (id: string) => getLesson(id)!;
const solved = (l: Lesson, tweak?: (p: Project) => void) => {
  const p = l.setup();
  l.solve(p);
  tweak?.(p);
  return p;
};
const failed = (l: Lesson, p: Project) =>
  runLesson(l, p)
    .results.filter((r) => !r.ok && !r.check.notion)
    .map((r) => r.check.id);

describe('the Avancé as a brief', () => {
  it('step-by-step cards wait for success in Avancé, not before', () => {
    const crate = lesson('l-caisse');
    expect(crate.cards.some((c) => c.title === 'Le plan')).toBe(true);
    expect(cardsFor(crate, false).shown.some((c) => PLAN_CARD_TITLES.has(c.title))).toBe(false);
    expect(cardsFor(crate, false).held).toBe(1);
    expect(cardsFor(crate, true).shown).toEqual(crate.cards);
    const confirmed = LESSONS.find((l) => l.level === 'confirme' && l.cards.some((c) => c.title === 'Le plan'))!;
    expect(cardsFor(confirmed, false).held).toBe(0);
  });

  it('every Avancé step keeps at least one card before success', () => {
    for (const l of LESSONS.filter((x) => x.level === 'avance')) expect(cardsFor(l, false).shown.length, l.id).toBeGreaterThan(0);
  });

  it('the first hint of every Avancé build or repair step asks where to look', () => {
    const plain = LESSONS.filter((l) => l.level === 'avance' && l.kind !== 'predict' && !l.hints[0].includes('?')).map((l) => l.id);
    expect(plain).toEqual([]);
  });

  it('the new steps sit in the Avancé, S4 last', () => {
    const avance = LESSONS.filter((l) => l.level === 'avance').map((l) => l.id);
    for (const id of ['l-levier-universel', 'm1-sas', 'm2-distributeur']) expect(avance, id).toContain(id);
    expect(avance[avance.length - 1]).toBe('s4-fusibles');
  });
});

describe('Le levier universel', () => {
  const l = lesson('l-levier-universel');

  it('a lever that holds a BP_Porte reference is not universal', () => {
    const p = solved(l, (p) => {
      edit(p, 'BP_Levier').variable('Porte', { category: 'object', subtype: 'BP_Porte' });
    });
    expect(failed(l, p)).toEqual(['universal']);
  });

  it('a single lever is not enough', () => {
    const p = solved(l, (p) => {
      const lever = p.classes.find((c) => c.name === 'BP_Levier')!;
      levelOf(p).actors = levelOf(p).actors.filter((a, i, all) => a.classId !== lever.id || all.findIndex((x) => x.classId === lever.id) === i);
    });
    expect(failed(l, p)).toContain('placed');
  });
});

describe('Le sas', () => {
  it('without « une seule fois », coming back restarts the airlock', () => {
    const l = lesson('m1-sas');
    const p = solved(l, (p) => {
      const b = edit(p, 'BP_Sas');
      const once = Object.values(b.graph.nodes).find((n) => n.def === 'flow.doOnce')!.id;
      const enter = Object.values(b.graph.nodes).find((n) => n.def === 'event.actorBeginOverlap')!.id;
      const tl = Object.values(b.graph.nodes).find((n) => n.def === 'timeline.node')!.id;
      removeNodes(b.graph, [once]);
      b.link(enter, 'then', tl, 'playFromStart');
    });
    expect(failed(l, p).length).toBeGreaterThan(0);
  });
});

describe('Les fusibles (S4, made again in V7.60)', () => {
  const l = () => lesson('s4-fusibles');

  it('without the Game Instance Class, the fuses of the corridor are lost behind the door', () => {
    const p = solved(l(), (p) => {
      delete p.mapsModes!.gameInstanceClass;
    });
    expect(failed(l(), p)).toContain('missing');
  });

  it('a panel that does not read the save at its BeginPlay starts the next game unpowered', () => {
    const p = solved(l(), (p) => {
      const b = edit(p, 'BP_Tableau');
      removeNodes(b.graph, Object.values(b.graph.nodes).filter((n) => n.def === 'event.beginPlay').map((n) => n.id));
    });
    expect(failed(l(), p)).toEqual(['resume']);
  });

  it('E sent to everything within reach, not to what the player looks at, answers with his back turned', () => {
    const p = solved(l(), (p) => {
      const b = edit(p, 'BP_Joueur');
      const trace = Object.values(b.graph.nodes).find((n) => n.def === 'trace.lineByChannel')!;
      const msg = Object.values(b.graph.nodes).find((n) => n.def === 'iface.message')!;
      const ev = Object.values(b.graph.nodes).find((n) => n.def === 'input.action')!;
      removeNodes(b.graph, [trace.id]);
      const over = b.node('actor.getOverlappingActors', {}, {}, [300, 600]);
      const loop = b.node('flow.forEachLoop', {}, {}, [600, 600]);
      b.link(ev.id, 'started', over, 'exec').link(over, 'then', loop, 'exec').link(over, 'actors', loop, 'array').link(loop, 'body', msg.id, 'exec').link(loop, 'element', msg.id, 'target');
      // Within reach: the panel gets a zone around the player's spot.
      edit(p, 'BP_Tableau').component('BoxCollision', 'Zone', { sizeX: 600, sizeY: 600 });
    });
    expect(failed(l(), p)).toContain('aim');
  });
});

describe('lot 4b: the Expert projects', () => {
  it('the Expert level gives no hint and no node list, the solution after success', () => {
    for (const id of ['x2-atelier', 'x6-reveil']) {
      const offers = helpOffers(lesson(id), { tried: true, fails: 5, done: false });
      expect(offers.map((o) => o.kind), id).toEqual(['solution']);
      expect(offers[0].available, id).toBe(false);
    }
  });

  it('V7.72: X1 is out of the path; every Expert project has « Le refaire dans UE5 », opened once it is passed', () => {
    const experts = LESSONS.filter((l) => l.level === 'expert');
    expect(experts.map((l) => l.code)).toEqual(['X1', 'X2', 'X3', 'X4', 'X5']);
    for (const l of experts) {
      expect(l.cards.filter((c) => c.title === REDO_UE5_TITLE), l.id).toHaveLength(1);
      expect(cardsFor(l, false).shown.some((c) => c.title === REDO_UE5_TITLE), l.id).toBe(false);
      expect(cardsFor(l, true).shown.some((c) => c.title === REDO_UE5_TITLE), l.id).toBe(true);
    }
  });

  it('X1 (x2-atelier): a fan whose Tick forgets Parent: Tick never runs dry', () => {
    const l = lesson('x2-atelier');
    const p = solved(l, (p) => {
      const fan = edit(p, 'BP_Ventilo');
      const up = Object.values(fan.graph.nodes).find((n) => n.def === 'call.parentEvent')!;
      const tick = Object.values(fan.graph.nodes).find((n) => n.def === 'event.tick')!;
      const br = Object.values(fan.graph.nodes).find((n) => n.def === 'flow.branch')!;
      removeNodes(fan.graph, [up.id]);
      fan.link(tick.id, 'then', br.id, 'exec');
    });
    expect(failed(l, p)).toContain('dry');
  });

  // V7.66: X2 enriched, the fuel in an Actor Component and the control panel.
  const nodesOf = (p: Project, cls: string, def: string) => Object.values(edit(p, cls).graph.nodes).filter((n) => n.def === def);

  it('X1 (x2-atelier): a panel left in Game Only ignores the touch on its button, and says why', () => {
    const l = lesson('x2-atelier');
    const p = solved(l, (p) => {
      for (const n of nodesOf(p, 'BP_PlayerController', 'input.setModeGameAndUI')) n.def = 'input.setModeGameOnly';
    });
    const run = runLesson(l, p);
    expect(failed(l, p)).toEqual(expect.arrayContaining(['panel', 'button']));
    expect(run.results.find((r) => r.check.id === 'button')?.reason).toContain('Game Only');
  });

  it('X1 (x2-atelier): a row that never subscribes to its machine stays on Arrêt', () => {
    const l = lesson('x2-atelier');
    const p = solved(l, (p) => {
      const row = edit(p, 'WBP_LigneMachine');
      removeNodes(row.graph, nodesOf(p, 'WBP_LigneMachine', 'dispatcher.bind').map((n) => n.id));
    });
    expect(failed(l, p)).toEqual(expect.arrayContaining(['row-on', 'row-fan']));
  });

  it('X1 (x2-atelier): a row button that starts its machine without asking it skips the empty tank', () => {
    const l = lesson('x2-atelier');
    const p = solved(l, (p) => {
      const row = edit(p, 'WBP_LigneMachine');
      const ask = nodesOf(p, 'WBP_LigneMachine', 'iface.message')[0];
      const base = p.classes.find((c) => c.name === 'BP_Machine')!;
      ask.def = 'call.custom';
      ask.config = { owner: base.id, event: 'Demarrer' };
      void row;
    });
    expect(failed(l, p)).toContain('empty-both');
  });

  it('X1 (x2-atelier): the fuel kept in a variable of BP_Machine is refused, with the reason', () => {
    const l = lesson('x2-atelier');
    const p = solved(l, (p) => {
      const base = edit(p, 'BP_Machine');
      base.variable('Carburant', { category: 'float' }, 3);
    });
    const run = runLesson(l, p);
    expect(failed(l, p)).toContain('component');
    expect(run.results.find((r) => r.check.id === 'component')?.reason).toContain('le carburant est quelque chose que la machine a');
  });

  it('X1 (x2-atelier): the panel finds the machines in either order of the level (the scenario taps the row by its name)', () => {
    const l = lesson('x2-atelier');
    const p = solved(l, (p) => levelOf(p).actors.reverse());
    expect(failed(l, p)).toEqual([]);
  });
});
