/**
 * V7.43: the Widget Component steps at Avancé. Each trap fails with its
 * explanation: the default Draw Size, a widget on the actor rather than above
 * it, Widget Class at None, bars that never move, one shared name, a Widget
 * Class changed for a copy (Cast Failed). And their place in the path.
 */
import { describe, expect, it } from 'vitest';
import { LESSONS } from '../src/core/lessons';
import { runLesson } from '../src/core/lessons/runner';
import type { Lesson } from '../src/core/lessons/types';
import { diagnose } from '../src/core/explain/hypothesis';
import type { Project } from '../src/core/model/project';
import { setWidgetClass, updateComponentProps } from '../src/core/operations/classOps';
import { LESSON_NOTIONS } from '../src/core/notions/lessonNotions';
import { notionHelp } from '../src/core/reference/glossary';

const lesson = (id: string) => LESSONS.find((l) => l.id === id)!;
const cls = (p: Project, name: string) => p.classes.find((c) => c.name === name)!;
const widgetComp = (p: Project, name: string) => cls(p, name).components.find((c) => c.kind === 'Widget')!;

function solved(l: Lesson, change: (p: Project) => void = () => {}) {
  const p = l.setup();
  l.solve(p);
  change(p);
  return runLesson(l, p);
}
const failing = (r: ReturnType<typeof runLesson>) => r.results.filter((x) => !x.ok).map((x) => x.check.id);
const reason = (r: ReturnType<typeof runLesson>, id: string) => r.results.find((x) => x.check.id === id)?.reason ?? '';

describe('the Widget Component steps (V7.43)', () => {
  it('sit in the Avancé: discover and guided after T4, D26 after « Le checkpoint », T5 before S4', () => {
    const ids = LESSONS.map((l) => l.id);
    const t4 = ids.indexOf('t4-energie');
    expect(ids.slice(t4 + 1, t4 + 3)).toEqual(['l-barre-ennemi', 'l-barre-par-ennemi']);
    expect(ids[ids.indexOf('l-checkpoint') + 1]).toBe('d26-barre-figee');
    expect(ids[ids.indexOf('s4-fusibles') - 1]).toBe('t5-noms');
    for (const id of ['l-barre-ennemi', 'l-barre-par-ennemi', 'd26-barre-figee', 't5-noms']) {
      expect(lesson(id).level, id).toBe('avance');
      expect(LESSON_NOTIONS[id].teaches, id).toContain('widget-component');
      for (const n of lesson(id).notions) expect(notionHelp(n), `${id}: ${n}`).toBeDefined();
    }
  });

  it('« La barre au-dessus de l’ennemi »: the defaults of a new Widget Component do not pass', () => {
    const l = lesson('l-barre-ennemi');
    expect(runLesson(l, l.setup()).passed).toBe(false);
    expect(solved(l).passed).toBe(true);
    const big = solved(l, (p) => updateComponentProps(cls(p, 'BP_Ennemi'), widgetComp(p, 'BP_Ennemi').id, { sizeX: 500, sizeY: 500 }));
    expect(reason(big, 'component')).toMatch(/Draw Size 500 × 500/);
    const onTop = solved(l, (p) => updateComponentProps(cls(p, 'BP_Ennemi'), widgetComp(p, 'BP_Ennemi').id, { y: 0 }));
    expect(reason(onTop, 'component')).toMatch(/Location Y négative/);
    const none = solved(l, (p) => setWidgetClass(p, cls(p, 'BP_Ennemi'), widgetComp(p, 'BP_Ennemi').id, undefined));
    expect(failing(none)).toEqual(expect.arrayContaining(['component', 'three']));
    expect(reason(none, 'component')).toMatch(/None/);
  });

  it('« Une barre par ennemi »: bars that never move do not pass', () => {
    const l = lesson('l-barre-par-ennemi');
    const start = runLesson(l, l.setup());
    expect(start.passed).toBe(false);
    expect(reason(start, 'one')).toMatch(/Get User Widget Object/);
    expect(solved(l).passed).toBe(true);
  });

  it('D26: the Widget Class changed for a copy makes the Cast fail without a word; either fix passes', () => {
    const l = lesson('d26-barre-figee');
    const start = runLesson(l, l.setup());
    expect(start.passed).toBe(false);
    expect(start.runtimeErrors).toEqual([]);
    expect(reason(start, 'one')).toMatch(/encore pleines/);
    // The hypothesis before the first hint points at the reference: the Cast To that never succeeds.
    expect(diagnose(start)?.hypothesis).toBe('reference');
    expect(solved(l).passed).toBe(true);
    // Casting to the copy is the other way out.
    const other = l.setup();
    const cast = cls(other, 'BP_Ennemi')
      .graphs.flatMap((g) => Object.values(g.nodes))
      .find((n) => n.def === 'cast.to')!;
    cast.config.class = cls(other, 'WBP_BarreBoss').id;
    const call = cls(other, 'BP_Ennemi')
      .graphs.flatMap((g) => Object.values(g.nodes))
      .find((n) => n.def === 'call.function' && n.config.owner === cls(other, 'WBP_BarreVie').id)!;
    call.config.owner = cls(other, 'WBP_BarreBoss').id;
    call.config.graph = cls(other, 'WBP_BarreBoss').graphs.find((g) => g.name === 'AfficherVie')!.id;
    const param = cls(other, 'WBP_BarreBoss').graphs.find((g) => g.name === 'AfficherVie')!.fn!.inputs[0].id;
    const g = cls(other, 'BP_Ennemi').graphs.find((x) => x.nodes[call.id])!;
    for (const link of Object.values(g.links)) if (link.to.node === call.id && link.to.pin !== 'exec' && link.to.pin !== 'target') link.to.pin = param;
    expect(runLesson(l, other).passed).toBe(true);
  });

  it('T5: every label must show its own name', () => {
    const l = lesson('t5-noms');
    expect(runLesson(l, l.setup()).passed).toBe(false);
    expect(solved(l).passed).toBe(true);
    // One name for all: the call given a literal instead of each one's Nom.
    const same = solved(l, (p) => {
      const b = cls(p, 'BP_Pnj');
      const g = b.graphs[0];
      const call = Object.values(g.nodes).find((n) => n.def === 'call.function')!;
      const param = Object.keys(g.links).find((k) => g.links[k].to.node === call.id && g.links[k].to.pin !== 'exec' && g.links[k].to.pin !== 'target')!;
      const pin = g.links[param].to.pin;
      delete g.links[param];
      call.defaults[pin] = 'Mara';
    });
    expect(failing(same)).toContain('names');
    expect(reason(same, 'names')).toMatch(/SON Nom/);
  });
});
