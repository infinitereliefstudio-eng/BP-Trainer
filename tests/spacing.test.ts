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
  // V7.20 and V7.21 inserted the nine Actor Components steps in the Avancé: the gaps that cross them grew. V7.22
  // brought input, enhanced-input and loops back (« La salle de contrôle ») and trace (M2), all at 15 or less.
  // V7.36 inserted six UMG steps (one at the end of Intermédiaire, five in the Confirmé after « Le menu pause »):
  // the gaps that cross them grew by up to six; loops entered the list. V7.37 inserted six more (five in the Confirmé,
  // T4 in the Avancé): most gaps grew by up to six again; cast, dispatchers, interfaces, other-bp, overlap and
  // player-controller came down (the menus and HUDs write them). V7.43 inserted four Widget Component steps in the
  // Avancé (two after T4, D26 after « Le checkpoint », T5 before S4): the gaps that cross them grew by up to four.
  // V7.50 inserted four level steps after « Le checkpoint » (Le couloir, P17, Le sac qui suit, D27): hit, inheritance,
  // player-controller, tick and timers grew by up to four, trace entered the list (19).
  arrays: 28, // lot 3 added Confirmé steps inside this gap: lot 4
  cast: 29, // lot 3 added Confirmé steps inside this gap: lot 4
  components: 26,
  construction: 45, // lot 3 added Confirmé steps inside this gap: lot 4
  'data-tables': 66, // runs to the end of the path
  destroy: 48,
  dispatchers: 27,
  enum: 41,
  'flow-memory': 29,
  functions: 42, // lot 3 added Confirmé steps inside this gap: lot 4
  hit: 24, // V7.37: T4 sits after l-caisse (16 then), V7.43 put the Widget Component steps after it;, the only step that writes Event Hit; anywhere earlier it stretched input or events past 15
  inheritance: 33, // runs to the end of the path
  interfaces: 21,
  latent: 49, // runs to the end of the path
  locals: 38, // lot 3 added Confirmé steps inside this gap: lot 4
  loops: 22,
  maps: 59, // lot 3 added Confirmé steps inside this gap: lot 4
  'other-bp': 25, // lot 3 added Confirmé steps inside this gap: lot 4
  overlap: 20,
  'player-controller': 50, // V7.36: Get Owning Player in the Confirmé menus; from there to Expert X1, a recall in the Avancé is still to find
  random: 58, // lot 3 added Confirmé steps inside this gap: lot 4
  rotation: 27,
  'save-game': 41, // runs to the end of the path
  sequence: 63, // runs to the end of the path
  sets: 33, // lot 3 added Confirmé steps inside this gap: lot 4
  spawn: 40, // lot 3 added Confirmé steps inside this gap: lot 4
  structs: 59, // runs to the end of the path
  switch: 37,
  tick: 51, // runs to the end of the path
  timeline: 51,
  timers: 30,
  trace: 19, // V7.50: the level steps sit between M2 and the end of the Avancé
  visibility: 26, // runs to the end of the path
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
