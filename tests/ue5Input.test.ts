/** Lot 1 of the path plan: steps after « Les contrôles au Player Controller » are UE5 projects. */
import { playerClassesFor } from '../src/core/model/gameMode';
import { describe, expect, it } from 'vitest';
import { LESSONS } from '../src/core/lessons';
import { PLAYER_CONTEXT, PLAYER_CONTROLLER } from '../src/core/lessons/ue5Input';
import { defaultLevel, type Project } from '../src/core/model/project';

const after = LESSONS.slice(LESSONS.findIndex((l) => l.id === 'l-ei-controleur') + 1);
/** Every step after it, whatever its level (Expert projects included, when they come). */
const converted = after;
const keyEvents = (p: Project) => p.classes.flatMap((c) => c.graphs.flatMap((g) => Object.values(g.nodes).filter((n) => n.def === 'event.inputKey')));
const solved = (l: (typeof LESSONS)[number]) => {
  const p = l.setup();
  l.solve(p);
  return p;
};

describe('UE5 input after the Player Controller lesson', () => {
  it('no key event left, in the starting projects or the solutions', () => {
    const left = converted.filter((l) => keyEvents(l.setup()).length || keyEvents(solved(l)).length).map((l) => l.id);
    expect(left).toEqual([]);
  });

  it('a step that uses input has the template set-up: IMC_Joueur added by BP_PlayerController, set as Player Controller Class', () => {
    for (const l of converted) {
      const p = solved(l);
      const actions = p.classes.flatMap((c) => c.graphs.flatMap((g) => Object.values(g.nodes).filter((n) => n.def === 'input.action')));
      if (!actions.length) continue;
      const imc = p.mappingContexts.find((c) => c.name === PLAYER_CONTEXT);
      const pc = p.classes.find((c) => c.name === PLAYER_CONTROLLER);
      expect(imc, l.id).toBeDefined();
      expect(playerClassesFor(p, defaultLevel(p)).controller?.id, l.id).toBe(pc?.id);
      const defs = pc!.graphs[0] ? Object.values(pc!.graphs[0].nodes).map((n) => n.def) : [];
      expect(defs, l.id).toEqual(expect.arrayContaining(['event.beginPlay', 'actor.self', 'input.subsystem', 'input.addMappingContext']));
      // Every action event listens to an action mapped in IMC_Joueur, with no trigger: Started is the old Pressed.
      // A step about Enhanced Input itself (T2) sets its own trigger.
      const ownTriggers = l.chain?.notion === 'enhanced-input';
      // A step may add its own mode contexts (a dialogue Mapping Context, Expert X1): its actions are mapped there.
      for (const n of actions)
        expect(
          p.mappingContexts.some((c) => c.mappings.some((m) => m.action === n.config.action && (ownTriggers || m.triggers.length === 0))),
          `${l.id}: ${n.config.action}`,
        ).toBe(true);
    }
  });

  it('the converted steps are flagged as changed (revision raised)', () => {
    for (const id of ['l09-generateur', 'l-tirelire', 'd12-regie']) expect(LESSONS.find((l) => l.id === id)!.revision ?? 1, id).toBeGreaterThan(1);
  });

  it('a lesson naming its actions keeps them: Le four has IA_Lancer and IA_Annuler', () => {
    const p = LESSONS.find((l) => l.id === 'd11-four')!.setup();
    expect(p.inputActions.map((a) => a.name).sort()).toEqual(['IA_Annuler', 'IA_Lancer']);
  });
});
