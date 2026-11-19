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

/**
 * Today's longest gaps above the target (steps), to bring down lot by lot.
 * Lot 3b (V7.16) brought down what crosses the Confirmé with recalls; the
 * gaps marked « lot 4 » run into the Avancé, or are notions no Confirmé
 * step can write naturally (maps, player-controller…). Lots 4a and 4b
 * (V7.17, V7.18) added the Avancé steps and the Expert projects; the gaps
 * left are for the next plan.
 */
const KNOWN_GAPS: Record<string, number> = {
  // V7.20 inserted the five Actor Components steps after « L’héritage »: the gaps that cross them grew by five.
  // actor-components runs to the end of the path until V7.21 (its usage steps); input, enhanced-input and
  // loops went one step over the target: recalls to place in V7.22 (the « reprise » of the chantier).
  'actor-components': 22,
  'enhanced-input': 16,
  input: 16,
  loops: 16,
  arrays: 23, // lot 3 added Confirmé steps inside this gap: lot 4
  cast: 28, // lot 3 added Confirmé steps inside this gap: lot 4
  components: 16,
  construction: 34, // lot 3 added Confirmé steps inside this gap: lot 4
  'data-tables': 50, // runs to the end of the path
  destroy: 38,
  dispatchers: 25,
  enum: 31,
  'flow-memory': 28,
  functions: 32, // lot 3 added Confirmé steps inside this gap: lot 4
  inheritance: 20, // runs to the end of the path
  interfaces: 22,
  latent: 37, // runs to the end of the path
  locals: 28, // lot 3 added Confirmé steps inside this gap: lot 4
  maps: 49, // lot 3 added Confirmé steps inside this gap: lot 4
  'other-bp': 24, // lot 3 added Confirmé steps inside this gap: lot 4
  overlap: 21,
  'player-controller': 82, // written again only in Expert X1 (dialogue context): a natural recall in the Confirmé or Avancé is still to find
  random: 45, // lot 3 added Confirmé steps inside this gap: lot 4
  rotation: 17,
  'save-game': 33, // runs to the end of the path
  sequence: 51, // runs to the end of the path
  sets: 23, // lot 3 added Confirmé steps inside this gap: lot 4
  spawn: 35, // lot 3 added Confirmé steps inside this gap: lot 4
  structs: 47, // runs to the end of the path
  switch: 30,
  tick: 39, // runs to the end of the path
  timeline: 41,
  timers: 27,
  visibility: 18, // runs to the end of the path
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
