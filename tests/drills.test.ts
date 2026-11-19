/**
 * Drills with variants (chantier n° 2, étape C): for every seed tested, the
 * starting project fails, the reference solution passes, and every typical
 * mistake of the situation fails, with a reason.
 */
import { describe, expect, it } from 'vitest';
import { FAMILIES, getDrill, nextDrillId } from '../src/core/drills';
import { drillId, planOf, withChain } from '../src/core/drills/make';
import { DRILL_FORMATS } from '../src/core/drills/types';
import { getLesson } from '../src/core/lessons';
import { runLesson } from '../src/core/lessons/runner';
import { lessonLabel } from '../src/core/lessons/types';
import { notionHelp } from '../src/core/reference/glossary';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';
import { validateProject } from '../src/core/serialization/validate';

/** Enough seeds to go through every situation, format and several draws. */
const SEEDS = 36;

const why = (run: ReturnType<typeof runLesson>) => [...run.compileErrors.map((m) => m.text), ...run.results.filter((r) => !r.ok).map((r) => `${r.check.label}: ${r.reason}`)];

for (const family of FAMILIES) {
  describe(`drills · ${family.title}`, () => {
    for (let seed = 0; seed < SEEDS; seed++) {
      const id = drillId(family.id, seed);
      it(`${id}: the start fails, the solution passes`, () => {
        const drill = getDrill(id)!;
        const start = drill.setup();
        expect(() => validateProject(structuredClone(start))).not.toThrow();
        expect(runLesson(drill, start).passed).toBe(false);
        const solved = drill.setup();
        drill.solve(solved);
        const run = runLesson(drill, parseProject(serializeProject(solved)));
        expect(why(run)).toEqual([]);
        expect(run.passed).toBe(true);
      });
    }

    for (const situation of family.situations) {
      for (let seed = 0; seed < 6; seed++) {
        const plan = planOf({ ...family, situations: [situation] }, seed * 3);
        for (const m of situation.mistakes.filter((x) => x.applies?.(plan.params) ?? true)) {
          it(`${situation.id} (${JSON.stringify(plan.params)}): « ${m.what} » fails with a reason`, () => {
            const { project, roles } = withChain(plan);
            m.apply(project, roles, plan.params);
            const drill = getDrill(drillId(family.id, family.situations.indexOf(situation)))!;
            const run = runLesson({ ...drill, scenario: situation.scenario(plan.params), checks: situation.checks(plan.params) }, project);
            expect(run.passed).toBe(false);
            expect(run.results.some((r) => !r.ok && !!r.reason) || run.compileErrors.length > 0).toBe(true);
          });
        }
      }
    }

    it('every label of a drill is in the glossary, every text is filled', () => {
      for (let seed = 0; seed < SEEDS; seed++) {
        const d = getDrill(drillId(family.id, seed))!;
        for (const n of d.notions) expect(notionHelp(n), `${d.id}: ${n}`).toBeDefined();
        expect(d.remember.length).toBeGreaterThan(30);
        expect(d.hints.every((h) => h.length > 10)).toBe(true);
        expect(lessonLabel(d)).toBe('Mini-exercice');
        expect(getLesson(d.id)).toBe(d);
      }
    });

    it('every format comes up, and the next drill changes situation each time', () => {
      const formats = new Set(Array.from({ length: SEEDS }, (_, s) => planOf(family, s).format));
      expect([...formats].sort()).toEqual([...DRILL_FORMATS].sort());
      const ids = Array.from({ length: family.situations.length }, (_, i) => nextDrillId(family, 1, i));
      expect(new Set(ids.map((id) => getDrill(id)!.drill!.situation)).size).toBe(family.situations.length);
    });
  });
}
