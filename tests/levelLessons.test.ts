/**
 * V7.50: the first four steps on levels and the GameInstance. Their place in
 * the path, and each trap failing with its explanation: no Open Level, a typo
 * in Level Name, Open Level at BeginPlay, the prefix of Get Current Level
 * Name, the count kept in the pawn, a GameInstance not chosen in Maps & Modes.
 */
import { describe, expect, it } from 'vitest';
import { diagnose } from '../src/core/explain/hypothesis';
import { LESSONS } from '../src/core/lessons';
import { edit } from '../src/core/lessons/builder';
import { runLesson } from '../src/core/lessons/runner';
import type { Lesson } from '../src/core/lessons/types';
import type { Project } from '../src/core/model/project';
import { LESSON_NOTIONS } from '../src/core/notions/lessonNotions';
import { addClass } from '../src/core/operations/projectOps';
import { notionHelp } from '../src/core/reference/glossary';

const lesson = (id: string) => LESSONS.find((l) => l.id === id)!;
const IDS = ['l-couloir', 'p17-score-porte', 'l-sac-qui-suit', 'd27-sac-vide'];

function run(l: Lesson, change: (p: Project) => void = () => {}, solve = true) {
  const p = l.setup();
  if (solve) l.solve(p);
  change(p);
  return runLesson(l, p);
}
const reason = (r: ReturnType<typeof runLesson>, id: string) => String(r.results.find((x) => x.check.id === id && !x.ok)?.reason ?? '');
const nodeOf = (p: Project, cls: string, def: string) => Object.values(edit(p, cls).graph.nodes).find((n) => n.def === def)!;

describe('the level steps (V7.50)', () => {
  it('sit in the Avancé right after « Le checkpoint », with their notions and help cards', () => {
    const ids = LESSONS.map((l) => l.id);
    const at = ids.indexOf('l-checkpoint');
    expect(ids.slice(at + 1, at + 9)).toEqual([...IDS, 'l-bonne-porte', 'd28-objet-revient', 't6-pion-atelier', 'a4-reprendre']);
    expect(LESSONS.length).toBe(148);
    for (const id of [...IDS, 'l-bonne-porte', 'd28-objet-revient', 't6-pion-atelier', 'a4-reprendre']) {
      expect(lesson(id).level, id).toBe('avance');
      for (const n of lesson(id).notions) expect(notionHelp(n), `${id}: ${n}`).toBeDefined();
    }
    expect(LESSON_NOTIONS['l-couloir'].teaches).toEqual(['levels']);
    expect(LESSON_NOTIONS['l-sac-qui-suit'].teaches).toEqual(['game-instance']);
    expect(lesson('l-couloir').chain).toEqual({ notion: 'levels', step: 'discover' });
    expect(lesson('l-sac-qui-suit').chain).toEqual({ notion: 'game-instance', step: 'guided' });
  });
});

describe('Le couloir', () => {
  const l = lesson('l-couloir');

  it('starts with two levels and nothing wired: the game stays in the corridor', () => {
    const p = l.setup();
    expect(p.levels.map((x) => x.name)).toEqual(['Lvl_Principal', 'Lvl_Atelier']);
    const r = run(l, () => {}, false);
    expect(r.passed).toBe(false);
    expect(reason(r, 'travel')).toContain('restée dans Lvl_Principal');
  });

  it('a typo in Level Name: Open Level finds nothing, and the check says which name', () => {
    const r = run(l, (p) => {
      nodeOf(p, 'BP_Porte', 'level.open').defaults.level = 'Lvl_atelier ';
    });
    expect(r.passed).toBe(true);
    const typo = run(l, (p) => {
      nodeOf(p, 'BP_Porte', 'level.open').defaults.level = 'Lvl_Ateleir';
    });
    expect(reason(typo, 'travel')).toContain('aucun niveau nommé « Lvl_Ateleir »');
  });

  it('Open Level at BeginPlay leaves before the door', () => {
    const r = run(l, (p) => {
      const door = edit(p, 'BP_Porte');
      const open = nodeOf(p, 'BP_Porte', 'level.open').id;
      door.link(door.node('event.beginPlay'), 'then', open, 'exec');
    });
    expect(reason(r, 'start')).toContain('avant que le joueur touche la porte');
  });

  it('Remove Prefix String unticked: the check says so', () => {
    const r = run(l, (p) => {
      nodeOf(p, 'BP_Panneau', 'level.currentName').defaults.removePrefix = false;
    });
    expect(reason(r, 'name')).toContain('Remove Prefix String');
  });
});

describe('P17 Le score après la porte', () => {
  it('what the scenario prints confirms the answer', () => {
    const l = lesson('p17-score-porte');
    const r = runLesson(l, l.setup());
    expect(l.predict!.verify(r.prints)).toBe(true);
    expect(l.predict!.options[l.predict!.answer]).toBe('Score : 0, Porte franchie, Score : 0');
  });
});

describe('Le sac qui suit and D27', () => {
  const bag = lesson('l-sac-qui-suit');

  it('the starting project counts in the pawn: 0 in the workshop, and the check says why', () => {
    const r = run(bag, () => {}, false);
    expect(reason(r, 'count')).toContain('Le comptoir affiche 0');
    expect(reason(r, 'instance-class')).toContain('Crée un Blueprint de classe parente GameInstance');
  });

  it('a GameInstance made but not chosen in Maps & Modes is pointed out', () => {
    const r = run(bag, (p) => {
      delete p.mapsModes!.gameInstanceClass;
    });
    expect(reason(r, 'instance-class')).toContain('Maps & Modes › Game Instance Class');
    expect(r.passed).toBe(false);
  });

  it('another name for the GameInstance and its variable still passes', () => {
    const r = run(bag, (p) => {
      const gi = p.classes.find((c) => c.name === 'BP_Jeu')!;
      gi.name = 'BP_MaPartie';
      gi.variables[0].name = 'Sac';
      expect(addClass(p, 'BP_Autre', 'GameInstance').ok).toBe(true);
    });
    expect(r.passed).toBe(true);
  });

  it('D27: the Cast To fails without an error; the run points to the reference', () => {
    const d = lesson('d27-sac-vide');
    const start = run(d, () => {}, false);
    expect(start.passed).toBe(false);
    expect(reason(start, 'count')).toContain('sac est vide');
    expect(start.runtimeErrors).toEqual([]);
    expect(diagnose(start)?.hypothesis).toBe('reference');
    expect(run(d).passed).toBe(true);
  });
});

describe('the last four level steps (V7.51)', () => {
  it('Arriver par la bonne porte: unsolved, the player stays on the Player Start; one fixed Sortie puts him on the wrong side', () => {
    const l = lesson('l-bonne-porte');
    const start = run(l, () => {}, false);
    expect(reason(start, 'sud')).toContain('resté sur le Player Start');
    const fixed = run(l, (p) => {
      const door = edit(p, 'BP_Porte');
      const set = nodeOf(p, 'BP_Porte', 'var.setExternal');
      for (const [id, k] of Object.entries(door.graph.links)) if (k.to.node === set.id && k.to.pin === 'value') delete door.graph.links[id];
      set.defaults.value = 'Nord';
    });
    expect(reason(fixed, 'sud')).toContain('arrive au nord');
  });

  it('D28: the reference is None after the round trip, the key is back; the Set of Name keeps it gone', () => {
    const d = lesson('d28-objet-revient');
    const start = run(d, () => {}, false);
    expect(reason(start, 'gone')).toContain('vaut None');
    expect(start.results.find((r) => r.check.id === 'picked')!.ok).toBe(true);
    expect(start.runtimeErrors).toEqual([]);
    expect(run(d).passed).toBe(true);
  });

  it('T6: without an override the workshop keeps BP_Joueur; changing the Default GameMode breaks the corridor', () => {
    const t = lesson('t6-pion-atelier');
    expect(reason(run(t, () => {}, false), 'drone')).toContain('GameMode Override');
    const everywhere = run(
      t,
      (p) => {
        const gm = p.classes.find((c) => c.name === 'BP_GameMode')!;
        gm.gameMode = { defaultPawnClass: p.classes.find((c) => c.name === 'BP_Drone')!.id };
      },
      false,
    );
    expect(reason(everywhere, 'corridor')).toContain('le Default GameMode (BP_GameMode) doit garder BP_Joueur');
  });

  it('A4: unsolved, Stop then Play starts again in the corridor with an empty bag; the reference resumes in the workshop', () => {
    const a = lesson('a4-reprendre');
    expect(a.chain).toEqual({ notion: 'game-instance', step: 'autonomy', after: { lesson: 'l-sac-qui-suit', days: 2 } });
    const start = run(a, () => {}, false);
    expect(start.results.find((r) => r.check.id === 'first')!.ok).toBe(true);
    expect(reason(start, 'level')).toContain('la partie est dans Lvl_Principal');
    expect(reason(start, 'bag')).toContain('le sac vaut 0');
    const done = run(a);
    expect(done.passed).toBe(true);
    expect(done.prints.filter((m) => m === '1')).toHaveLength(2);
  });
});
