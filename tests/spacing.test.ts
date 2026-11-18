/**
 * Spaced practice (lot 0 of the path plan, 18 November 2026): every notion
 * whose practice shows in a graph comes back, written by the learner, at
 * most SPACING_TARGET steps after the last time, from the step that teaches
 * it to the end of the path. The path is not there yet: KNOWN_GAPS holds
 * today's gaps and works as a ratchet — a gap may only shrink, and the test
 * says when a value can be lowered or removed. Recalls (Lesson.recalls)
 * count as practice once the reference solution really writes them.
 */
import { describe, expect, it } from 'vitest';
import { LESSONS } from '../src/core/lessons';
import { LADDER } from '../src/core/lessons/types';
import { LESSON_NOTIONS } from '../src/core/notions/lessonNotions';
import { NOTIONS } from '../src/core/notions/catalogue';
import { practisedBy, SPACED_NOTIONS, spacing } from '../src/core/notions/practice';

const SPACING_TARGET = 15;

/** Today's longest gaps above the target (steps), to bring down lot by lot. */
const KNOWN_GAPS: Record<string, number> = {
  arrays: 20,
  branch: 16,
  cast: 29,
  components: 21,
  construction: 38,
  'data-tables': 39,
  destroy: 45,
  dispatchers: 33,
  'enhanced-input': 53,
  enum: 48,
  events: 25,
  'flow-memory': 49,
  functions: 27,
  inheritance: 16,
  input: 48,
  interfaces: 35,
  latent: 40,
  locals: 24,
  loops: 22,
  maps: 41,
  'other-bp': 21,
  overlap: 26,
  'player-controller': 64,
  random: 40,
  rotation: 36,
  'save-game': 24,
  sequence: 40,
  sets: 20,
  spawn: 31,
  structs: 37,
  switch: 48,
  tick: 29,
  timeline: 59,
  timers: 16,
  visibility: 21,
};

const practised = LESSONS.map(practisedBy);
const gaps = spacing(
  LESSONS.map((l) => LESSON_NOTIONS[l.id]?.teaches ?? []),
  practised.map((written, i) => new Set([...written, ...(LESSONS[i].recalls ?? [])])),
);

describe('spaced practice', () => {
  it('a recall is real: the reference solution writes the recalled notion', () => {
    const fake = LESSONS.flatMap((l, i) => (l.recalls ?? []).filter((n) => !practised[i].has(n)).map((n) => `${l.id} → ${n}`));
    expect(fake).toEqual([]);
  });

  it('a recall names a notion of the catalogue, already taught before the step', () => {
    const ids = new Set(NOTIONS.map((n) => n.id));
    const bad = LESSONS.flatMap((l, i) =>
      (l.recalls ?? [])
        .filter((n) => !ids.has(n) || !LESSONS.slice(0, i).some((p) => LESSON_NOTIONS[p.id]?.teaches.includes(n)))
        .map((n) => `${l.id} → ${n}`),
    );
    expect(bad).toEqual([]);
  });

  for (const notion of [...SPACED_NOTIONS].sort()) {
    it(`${notion} comes back at least every ${SPACING_TARGET} steps (or no worse than today)`, () => {
      const g = gaps.get(notion)?.maxGap ?? 0;
      const known = KNOWN_GAPS[notion];
      if (known === undefined) {
        expect(g, `${notion} : ${g} étapes sans être réécrite (cible ${SPACING_TARGET})`).toBeLessThanOrEqual(SPACING_TARGET);
        return;
      }
      expect(g, `${notion} : l'écart est passé de ${known} à ${g} étapes`).toBeLessThanOrEqual(known);
      // The ratchet: an improvement is recorded at once, so it cannot be lost later.
      expect(g, g <= SPACING_TARGET ? `${notion} est à ${g} : retire-la de KNOWN_GAPS` : `${notion} est descendue à ${g} : mets KNOWN_GAPS à ${g}`).toBe(known);
    });
  }
});

describe('ladders', () => {
  it('the rungs of a notion come in ladder order along the path, and autonomy is delayed', () => {
    const byNotion = new Map<string, { step: string; i: number; after?: unknown }[]>();
    LESSONS.forEach((l, i) => {
      if (!l.chain) return;
      const list = byNotion.get(l.chain.notion) ?? [];
      list.push({ step: l.chain.step, i, after: l.chain.after });
      byNotion.set(l.chain.notion, list);
    });
    for (const [notion, list] of byNotion) {
      const ranks = list.map((r) => LADDER.indexOf(r.step as (typeof LADDER)[number]));
      expect(ranks, notion).toEqual([...ranks].sort((a, b) => a - b));
      for (const r of list) if (r.step === 'autonomy') expect(r.after, `${notion} : l'autonomie doit être différée`).toBeDefined();
    }
  });
});
