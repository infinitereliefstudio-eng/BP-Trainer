/**
 * V7.36: the first UMG steps. Each trap the steps are about fails with its
 * explanation: Create Widget without Add to Viewport, Game and UI where the
 * character must not move, a menu closed without giving control back,
 * Reprendre that forgets Set Game Paused, the terminal « fixed » with UI
 * Only (F no longer closes it). And their place in the path.
 */
import { describe, expect, it } from 'vitest';
import { LESSONS } from '../src/core/lessons';
import { runLesson } from '../src/core/lessons/runner';
import type { Lesson } from '../src/core/lessons/types';
import { LESSON_NOTIONS } from '../src/core/notions/lessonNotions';
import type { Project } from '../src/core/model/project';
import { removeNodes } from '../src/core/operations/graphOps';
import { notionHelp } from '../src/core/reference/glossary';

const lesson = (id: string) => LESSONS.find((l) => l.id === id)!;

function solved(l: Lesson, change: (p: Project) => void) {
  const p = l.setup();
  l.solve(p);
  change(p);
  return runLesson(l, p);
}

const nodes = (p: Project, cls: string, def: string) => p.classes.find((c) => c.name === cls)!.graphs.flatMap((g) => Object.values(g.nodes)).filter((n) => n.def === def);
const reason = (r: ReturnType<typeof runLesson>, id: string) => r.results.find((x) => x.check.id === id)!;

describe('the UMG steps of V7.36', () => {
  it('sit where the plan put them: the counter after the Player Controller, the rest after « Le menu pause »', () => {
    const ids = LESSONS.map((l) => l.id);
    expect(ids[ids.indexOf('l-ei-controleur') + 1]).toBe('l-compteur-ecran');
    const at = ids.indexOf('l-menu-pause');
    expect(ids.slice(at + 1, at + 6)).toEqual(['p16-construct', 'l-menu-controle', 'd24-menu-reste', 'l-vrai-menu-pause', 'd25-bouton-muet']);
    expect(lesson('l-compteur-ecran').level).toBe('intermediaire');
    for (const id of ids.slice(at + 1, at + 6)) expect(lesson(id).level).toBe('confirme');
  });

  it('teach umg and ui-input, and every label has a help card', () => {
    expect(LESSON_NOTIONS['l-compteur-ecran'].teaches).toEqual(['umg']);
    expect(LESSON_NOTIONS['l-menu-controle'].teaches).toContain('ui-input');
    for (const id of ['l-compteur-ecran', 'p16-construct', 'l-menu-controle', 'd24-menu-reste', 'l-vrai-menu-pause', 'd25-bouton-muet'])
      for (const n of lesson(id).notions) expect(notionHelp(n), `${id}: ${n}`).toBeDefined();
  });
});

describe('Le compteur à l’écran', () => {
  it('Create Widget without Add to Viewport: the widget exists, the check says Add to Viewport', () => {
    const l = lesson('l-compteur-ecran');
    const r = solved(l, (p) => removeNodes(p.classes.find((c) => c.name === 'BP_PlayerController')!.graphs[0], nodes(p, 'BP_PlayerController', 'widget.addToViewport').map((n) => n.id)));
    expect(r.passed).toBe(false);
    expect(reason(r, 'shown').reason).toContain('Add to Viewport');
  });

  it('a widget that never updates its Text: 0 stays on the screen', () => {
    const l = lesson('l-compteur-ecran');
    const r = solved(l, (p) => removeNodes(p.classes.find((c) => c.name === 'WBP_Compteur')!.graphs[0], nodes(p, 'WBP_Compteur', 'widget.setText').map((n) => n.id)));
    expect(reason(r, 'zero').ok).toBe(true);
    expect(reason(r, 'one').reason).toContain('Appuis : 0');
  });
});

describe('Le menu qui rend le contrôle (E10)', () => {
  it('Game and UI instead of UI Only: the character walks while the menu is open', () => {
    const r = solved(lesson('l-menu-controle'), (p) => {
      for (const n of nodes(p, 'BP_PlayerController', 'input.setModeUIOnly')) n.def = 'input.setModeGameAndUI';
    });
    expect(r.passed).toBe(false);
    expect(reason(r, 'still').reason).toContain('Game and UI');
    expect(reason(r, 'closes').ok).toBe(true);
  });

  it('a menu closed without Set Input Mode Game Only: control is not given back', () => {
    const r = solved(lesson('l-menu-controle'), (p) => {
      const g = p.classes.find((c) => c.name === 'WBP_Menu')!.graphs[0];
      removeNodes(g, nodes(p, 'WBP_Menu', 'input.setModeGameOnly').map((n) => n.id));
    });
    expect(reason(r, 'closes').ok).toBe(true);
    expect(reason(r, 'control').reason).toContain('UI Only');
    expect(reason(r, 'walks').ok).toBe(false);
  });

  it('a Fermer button never wired: the touch did nothing, the check names On Clicked', () => {
    const l = lesson('l-menu-controle');
    const r = solved(l, (p) => {
      const g = p.classes.find((c) => c.name === 'WBP_Menu')!.graphs[0];
      removeNodes(g, nodes(p, 'WBP_Menu', 'event.widgetButton').map((n) => n.id));
    });
    expect(reason(r, 'closes').reason).toContain('On Clicked');
  });
});

describe('Le menu qui ne part pas (D24)', () => {
  it('as given: the panel stays, and the check counts the widgets created', () => {
    const l = lesson('d24-menu-reste');
    const r = runLesson(l, l.setup());
    expect(reason(r, 'one').ok).toBe(true);
    expect(reason(r, 'two').reason).toContain('2 widgets WBP_Objectifs créés');
  });
});

describe('Le vrai menu pause', () => {
  it('Reprendre without Set Game Paused unticked: the menu goes, the game stays paused', () => {
    const r = solved(lesson('l-vrai-menu-pause'), (p) => {
      for (const n of nodes(p, 'WBP_Pause', 'game.setGamePaused')) n.defaults.paused = true;
    });
    expect(r.passed).toBe(false);
    expect(reason(r, 'resumes').reason).toContain('Set Game Paused');
  });

  it('opened in Game Only: the touch on Reprendre is ignored, and said why', () => {
    const r = solved(lesson('l-vrai-menu-pause'), (p) => {
      const g = p.classes.find((c) => c.name === 'BP_PlayerController')!.graphs[0];
      for (const n of nodes(p, 'BP_PlayerController', 'input.setModeUIOnly')) {
        n.def = 'input.setModeGameOnly';
        // Game Only has no In Widget to Focus pin.
        for (const [id, l] of Object.entries(g.links)) if (l.to.node === n.id && l.to.pin === 'focus') delete g.links[id];
      }
    });
    expect(r.compileErrors).toEqual([]);
    expect(reason(r, 'reachable').reason).toContain('Game Only');
    expect(reason(r, 'resumes').reason).toContain('Game Only');
  });
});

describe('Le bouton qui ne répond pas (D25)', () => {
  it('as given: the button is ignored in Game Only', () => {
    const l = lesson('d25-bouton-muet');
    const r = runLesson(l, l.setup());
    expect(reason(r, 'opens').ok).toBe(true);
    expect(reason(r, 'door').reason).toContain('Game Only');
  });

  it('« fixed » with UI Only: the door opens, but F no longer closes the terminal', () => {
    const r = solved(lesson('d25-bouton-muet'), (p) => {
      for (const n of nodes(p, 'BP_PlayerController', 'input.setModeGameAndUI')) n.def = 'input.setModeUIOnly';
    });
    expect(reason(r, 'door').ok).toBe(true);
    expect(r.passed).toBe(false);
    expect(reason(r, 'closes').reason).toContain('UI Only');
  });
});
