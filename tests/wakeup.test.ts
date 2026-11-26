/**
 * V7.70, Projet X6 « Le réveil », milestones 1 to 3: each milestone fails from
 * where the previous one ends and passes with its own part (milestones.test),
 * and the classic mistakes are caught with a reason that points at them.
 */
import { describe, expect, it } from 'vitest';
import { LESSONS } from '../src/core/lessons';
import { edit } from '../src/core/lessons/builder';
import { milestoneView } from '../src/core/lessons/milestones';
import { runLesson } from '../src/core/lessons/runner';
import { levelOf, type Graph, type NodeInstance, type Project } from '../src/core/model/project';
import { removeNodes } from '../src/core/operations/graphOps';
import { setParentClass } from '../src/core/operations/projectOps';
import { T } from '../src/core/types/pins';

const wakeup = LESSONS.find((l) => l.id === 'x6-reveil')!;

/** The project solved up to milestone `i`, then changed. */
function solved(i: number, change: (p: Project) => void = () => {}): Project {
  const p = wakeup.setup();
  for (const m of wakeup.milestones!.slice(0, i + 1)) m.solve(p);
  change(p);
  return p;
}
const run = (i: number, p: Project) => runLesson(milestoneView(wakeup, i), p);
const failed = (i: number, p: Project) => run(i, p).results.filter((r) => !r.ok).map((r) => r.check.id);
const reason = (i: number, p: Project, id: string) => run(i, p).results.find((r) => r.check.id === id)?.reason ?? '';
const graphOf = (p: Project, cls: string, name?: string): Graph => {
  const c = p.classes.find((x) => x.name === cls)!;
  return name ? c.graphs.find((g) => g.name === name)! : c.graphs[0];
};
const nodes = (g: Graph, def: string): NodeInstance[] => Object.values(g.nodes).filter((n) => n.def === def);
/** Drop the links into `pin` of `node`. */
const unlinkIn = (g: Graph, node: string, pin: string) => {
  for (const l of Object.values(g.links)) if (l.to.node === node && l.to.pin === pin) delete g.links[l.id];
};
const linkTo = (g: Graph, node: string, pin: string) => Object.values(g.links).find((l) => l.from.node === node && l.from.pin === pin)!.to;

describe('X6 Le réveil', () => {
  it('six milestones, after Le réseau; the whole project passes', { timeout: 60000 }, () => {
    expect(wakeup.milestones?.map((m) => m.id)).toEqual(['regarder', 'terminal', 'menu', 'generateur', 'courant', 'controle']);
    const ids = LESSONS.map((l) => l.id);
    expect(ids.indexOf('x6-reveil')).toBe(ids.indexOf('x5-reseau') + 1);
    const r = runLesson(wakeup, solved(5));
    expect(r.passed, JSON.stringify(r.results.filter((x) => !x.ok))).toBe(true);
  });

  it('milestone 1: an invite shown for anything the ray touches is told about Does Implement Interface', () => {
    const p = solved(0, (p) => {
      const g = graphOf(p, 'BP_Joueur');
      const br = nodes(g, 'flow.branch')[0];
      unlinkIn(g, br.id, 'condition');
      removeNodes(g, nodes(g, 'iface.doesImplement').map((n) => n.id));
      const trace = edit(p, 'BP_Joueur');
      const valid = trace.node('util.isValid', {}, {}, [560, 1400]);
      const call = nodes(g, 'call.function').find((n) => n.y === 1100)!;
      const out = p.classes.find((c) => c.name === 'BP_Joueur')!.graphs.find((x) => x.name === 'Viser')!.fn!.outputs[0].id;
      trace.link(call.id, out, valid, 'object').link(valid, 'result', br.id, 'condition');
    });
    expect(failed(0, p)).toContain('invite-pod');
    expect(reason(0, p, 'invite-pod')).toContain('Does Implement Interface');
  });

  it('milestone 1: a ray without its reach is told about End = Start + Forward Vector × reach', () => {
    const p = solved(0, (p) => {
      const g = graphOf(p, 'BP_Joueur', 'Viser');
      nodes(g, 'math.multiplyVectorFloat')[0].defaults.b = 600;
    });
    expect(failed(0, p)).toContain('invite-far');
    expect(reason(0, p, 'invite-far')).toContain('250');
  });

  it('milestone 1: a locker that does not ask the inventory gives the badge twice', () => {
    const p = solved(0, (p) => {
      const g = graphOf(p, 'BP_Casier');
      const br = nodes(g, 'flow.branch')[0];
      unlinkIn(g, br.id, 'condition');
      br.defaults.condition = false;
    });
    expect(failed(0, p)).toContain('once');
  });

  it('milestone 1: a badge kept in the player is told the inventory is an Actor Component', () => {
    const p = solved(0, (p) => {
      // The locker writes Badge into a Set of BP_Joueur instead.
      const pl = edit(p, 'BP_Joueur');
      const sac = pl.variable('Sac', T.set(T.name), []);
      const g = graphOf(p, 'BP_Casier');
      const give = nodes(g, 'call.function')[0];
      const box = edit(p, 'BP_Casier');
      const into = Object.values(g.links).find((l) => l.from.node === give.id && l.from.pin === 'then')!.to;
      const ev = Object.values(g.links).find((l) => l.to.node === give.id && l.to.pin === 'exec')!.from;
      removeNodes(g, [give.id]);
      const cast = box.node('cast.to', { class: pl.cls.id }, {}, [940, 400]);
      const get = box.node('var.getExternal', { owner: pl.cls.id, variable: sac }, {}, [1100, 500]);
      const add = box.node('set.add', {}, { item: 'Badge' }, [1200, 400]);
      box.link(ev.node, ev.pin, cast, 'exec').link(box.node('actor.getPlayerPawn', {}, {}, [800, 500]), 'result', cast, 'object');
      box.link(cast, 'then', add, 'exec').link(cast, 'as', get, 'target').link(get, 'value', add, 'set').link(add, 'then', into.node, into.pin);
    });
    expect(failed(0, p)).toContain('take');
    expect(reason(0, p, 'take')).toContain('Actor Component');
  });

  it('milestone 2: a dialogue context never removed keeps E on the pages', () => {
    const p = solved(1, (p) => {
      const g = graphOf(p, 'BP_Terminal');
      removeNodes(g, nodes(g, 'input.removeMappingContext').map((n) => n.id));
    });
    const ids = failed(1, p);
    expect(ids).toEqual(expect.arrayContaining(['again', 'context']));
  });

  it('milestone 2: a fact noted at each reading is caught', () => {
    const p = solved(1, (p) => {
      const g = graphOf(p, 'BP_Inventaire', 'Noter');
      const br = nodes(g, 'flow.branch')[0];
      unlinkIn(g, br.id, 'condition');
      br.defaults.condition = false;
    });
    expect(failed(1, p)).toContain('last');
    expect(reason(1, p, 'last')).toContain('Noté');
  });

  it('milestone 2: E that opens the journal without the dialogue context reopens it instead of turning the page', () => {
    const p = solved(1, (p) => {
      const g = graphOf(p, 'BP_Terminal');
      const add = nodes(g, 'input.addMappingContext')[0];
      const before = Object.values(g.links).find((l) => l.to.node === add.id && l.to.pin === 'exec')!.from;
      const after = linkTo(g, add.id, 'then');
      removeNodes(g, [add.id]);
      edit(p, 'BP_Terminal').link(before.node, before.pin, after.node, after.pin);
    });
    expect(failed(1, p)).toEqual(expect.arrayContaining(['next', 'context']));
  });

  it('milestone 2: a dialogue context with the same priority as IMC_Joueur lets E reopen the journal', () => {
    const p = solved(1, (p) => {
      for (const n of nodes(graphOf(p, 'BP_Terminal'), 'input.addMappingContext')) n.defaults.priority = 0;
    });
    expect(failed(1, p)).toContain('next');
  });

  it('milestone 3: Continuer always enabled is caught at once', () => {
    const p = solved(2, (p) => {
      const g = graphOf(p, 'WBP_Menu');
      removeNodes(g, nodes(g, 'widget.setIsEnabled').map((n) => n.id));
    });
    expect(failed(2, p)).toContain('menu');
    expect(reason(2, p, 'menu')).toContain('aucune sauvegarde');
  });

  it('milestone 3: an inventory that does not read the GameInstance comes back empty after Continuer', () => {
    const p = solved(2, (p) => {
      const g = graphOf(p, 'BP_Inventaire');
      removeNodes(g, nodes(g, 'event.beginPlay').map((n) => n.id));
    });
    expect(failed(2, p)).toContain('resume');
    expect(reason(2, p, 'resume')).toContain('GameInstance');
  });

  it('milestone 3: a locker with its own memory gives the badge again after Continuer', () => {
    const p = solved(2, (p) => {
      // BP_Casier remembers it gave the badge, instead of asking the inventory.
      const box = edit(p, 'BP_Casier');
      const g = box.graph;
      const given = box.variable('Donne', T.bool, false);
      const br = nodes(g, 'flow.branch')[0];
      unlinkIn(g, br.id, 'condition');
      box.link(box.node('var.get', { variable: given }, {}, [500, 500]), 'value', br.id, 'condition');
      const say = nodes(g, 'debug.printString').find((n) => n.defaults.text === 'Badge récupéré')!;
      box.link(say.id, 'then', box.node('var.set', { variable: given }, { value: true }, [1500, 200]), 'exec');
    });
    expect(failed(0, p)).toEqual([]);
    expect(failed(2, p)).toContain('locker');
    expect(reason(2, p, 'locker')).toContain('inventaire');
  });

  it('milestones 1 and 2 are played in Lvl_Dortoir, whatever the Game Default Map', () => {
    const p = solved(2);
    expect(p.levels.map((l) => l.name)).toEqual(expect.arrayContaining(['Lvl_Dortoir', 'Lvl_Menu']));
    expect(levelOf(p).name).toBe('Lvl_Dortoir');
    for (const i of [0, 1]) expect(run(i, p).passed).toBe(true);
  });

  it('milestone 4: three fuses with the same name make one in the inventory, and the reason says Instance Editable', () => {
    const p = solved(3, (p) => {
      for (const a of levelOf(p).actors) if (p.classes.find((c) => c.id === a.classId)?.name === 'BP_Fusible') a.overrides = {};
    });
    expect(failed(3, p)).toContain('fuses');
    expect(reason(3, p, 'fuses')).toContain('Instance Editable');
  });

  it('milestone 4: a generator that leaves the fuses in the inventory is caught', () => {
    const p = solved(3, (p) => {
      const g = p.classes.find((c) => c.name === 'BP_Generateur')!.graphs.find((x) => x.name === 'PrendreFusibles')!;
      const take = nodes(g, 'call.function').find((n) => p.classes.find((c) => c.name === 'BP_Inventaire')!.graphs.find((x) => x.id === n.config.graph)?.name === 'Retirer')!;
      const from = Object.values(g.links).find((l) => l.to.node === take.id && l.to.pin === 'exec')!.from;
      const to = linkTo(g, take.id, 'then');
      removeNodes(g, [take.id]);
      edit(p, 'BP_Generateur').inGraph(g.id).link(from.node, from.pin, to.node, to.pin);
    });
    expect(failed(3, p)).toContain('partial');
  });

  it('milestone 5: a door that opens at once is told about the Timeline', () => {
    const p = solved(4, (p) => {
      // The leaf set at its open place in one go, right after Ouverte: no Timeline in between.
      const g = graphOf(p, 'BP_Porte_Base');
      const tl = nodes(g, 'timeline.node')[0];
      const slide = nodes(g, 'component.setRelativeLocation')[0];
      const far = nodes(g, 'math.multiplyFloat')[0];
      const set = Object.values(g.links).find((l) => l.to.node === tl.id && l.to.pin === 'play')!.from;
      unlinkIn(g, slide.id, 'exec');
      unlinkIn(g, far.id, 'a');
      far.defaults.a = 1;
      edit(p, 'BP_Porte_Base').link(set.node, set.pin, slide.id, 'exec');
    });
    expect(failed(4, p)).toContain('smooth');
    expect(reason(4, p, 'smooth')).toContain('Timeline');
  });

  it('milestone 5: a generator that lights the lamps itself is told it should not know them', () => {
    const p = solved(4, (p) => {
      const lamp = p.classes.find((c) => c.name === 'BP_Lampe')!;
      edit(p, 'BP_Generateur').node('actor.getAllOfClass', {}, { class: lamp.id }, [2600, 900]);
    });
    expect(failed(4, p)).toContain('dispatch');
    expect(reason(4, p, 'dispatch')).toContain('BP_Lampe');
  });

  it('milestone 5: a door that is not a child of BP_Porte_Base is caught', () => {
    const p = solved(4, (p) => {
      const badge = p.classes.find((c) => c.name === 'BP_Porte_Badge')!;
      setParentClass(p, badge.id, 'Actor');
    });
    expect(failed(4, p)).toContain('family');
  });

  it('milestone 6: lamps that do not read the GameInstance stay dark in the control room', () => {
    const p = solved(5, (p) => {
      const g = graphOf(p, 'BP_Alimente');
      removeNodes(g, nodes(g, 'call.custom').map((n) => n.id));
    });
    expect(failed(5, p)).toContain('arrive');
    expect(reason(5, p, 'arrive')).toContain('GameInstance');
  });

  it('milestone 6: a passage that forgets the facts loses the code on the way', () => {
    const p = solved(5, (p) => {
      const g = graphOf(p, 'BP_Passage');
      const level = nodes(g, 'level.open')[0];
      const sets = nodes(g, 'var.setExternal');
      const last = sets.find((n) => Object.values(g.links).some((l) => l.from.node === n.id && l.to.node === level.id))!;
      const first = sets.find((n) => n.id !== last.id)!;
      removeNodes(g, [last.id]);
      edit(p, 'BP_Passage').link(first.id, 'then', level.id, 'exec');
    });
    expect(failed(5, p)).toContain('arrive-fact');
  });

  it('milestone 6: a save without the power resumes in the dark', () => {
    const p = solved(5, (p) => {
      const g = graphOf(p, 'BP_Terminal');
      const keep = nodes(g, 'var.setExternal').find((n) => p.classes.find((c) => c.name === 'BP_Sauvegarde')!.variables.find((x) => x.id === n.config.variable)?.name === 'Energie')!;
      const from = Object.values(g.links).find((l) => l.to.node === keep.id && l.to.pin === 'exec')!.from;
      const to = linkTo(g, keep.id, 'then');
      removeNodes(g, [keep.id]);
      edit(p, 'BP_Terminal').link(from.node, from.pin, to.node, to.pin);
    });
    expect(failed(5, p)).toContain('resume-power');
  });

  it('milestone 6: an end that keeps the save leaves Continuer enabled', () => {
    const p = solved(5, (p) => {
      const g = graphOf(p, 'BP_Console');
      const del = nodes(g, 'save.delete')[0];
      const from = Object.values(g.links).find((l) => l.to.node === del.id && l.to.pin === 'exec')!.from;
      const to = linkTo(g, del.id, 'then');
      removeNodes(g, [del.id]);
      edit(p, 'BP_Console').link(from.node, from.pin, to.node, to.pin);
    });
    expect(failed(5, p)).toContain('back');
    expect(reason(5, p, 'back')).toContain('Delete Game in Slot');
  });
});
