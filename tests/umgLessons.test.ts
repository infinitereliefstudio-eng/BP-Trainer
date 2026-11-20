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

// ------------------------------------------------------------------ V7.37

/** Remove the nodes of `def` that a `pred` accepts from a class, with their wires. */
function drop(p: Project, cls: string, pred: (n: { def: string; x: number; y: number; defaults: Record<string, unknown> }) => boolean) {
  const c = p.classes.find((x) => x.name === cls)!;
  for (const g of c.graphs) removeNodes(g, Object.values(g.nodes).filter(pred).map((n) => n.id));
}

describe('V7.37: the widget follows the game', () => {
  it('sit in the Confirmé after D25, A3 and C7 before S3, T4 in the Avancé after M2', () => {
    const ids = LESSONS.map((l) => l.id);
    const at = ids.indexOf('d25-bouton-muet');
    expect(ids.slice(at + 1, at + 4)).toEqual(['l-barre-vie', 'r6-oxygene', 'l-appuie-sur-e']);
    const s3 = ids.indexOf('s3-poste-garde');
    expect(ids.slice(s3 - 2, s3)).toEqual(['a3-terminal', 'c7-playlist']);
    expect(ids[ids.indexOf('m2-distributeur') + 1]).toBe('t4-energie');
    expect(LESSONS.filter((l) => l.chain?.notion === 'umg').map((l) => l.chain!.step)).toEqual(['discover', 'guided', 'modify', 'transfer']);
    expect(LESSONS.filter((l) => l.chain?.notion === 'ui-input').map((l) => l.chain!.step)).toEqual(['guided', 'autonomy']);
    for (const id of ['l-barre-vie', 'r6-oxygene', 'l-appuie-sur-e', 'c7-playlist', 'a3-terminal', 't4-energie'])
      for (const n of lesson(id).notions) expect(notionHelp(n), `${id}: ${n}`).toBeDefined();
  });

  it('La barre de vie without the first update: full at the start, and said why', () => {
    const r = solved(lesson('l-barre-vie'), (p) => drop(p, 'WBP_Sante', (n) => n.def === 'widget.setPercent' && n.y < 300));
    expect(reason(r, 'start').reason).toContain('Event Construct');
    expect(reason(r, 'first').ok).toBe(true);
  });

  it('La barre de vie with the health as Percent (0 to 100): said that Percent goes from 0 to 1', () => {
    const r = solved(lesson('l-barre-vie'), (p) => drop(p, 'WBP_Sante', (n) => n.def === 'math.divideFloat'));
    expect(r.passed).toBe(false);
  });

  it('R6 as given: it works, but its Binding is called every frame, and the count is said', () => {
    const l = lesson('r6-oxygene');
    const r = runLesson(l, l.setup());
    expect(reason(r, 'two').ok).toBe(true);
    expect(reason(r, 'no-binding').reason).toMatch(/appelée \d+ fois/);
  });

  it('Appuie sur E hidden with Hidden: it passes, the Collapsed notion says why not', () => {
    const r = solved(lesson('l-appuie-sur-e'), (p) => {
      for (const n of nodes(p, 'WBP_Invite', 'widget.setVisibility')) if (n.defaults.visibility === 1) n.defaults.visibility = 2;
    });
    expect(r.passed).toBe(true);
    expect(reason(r, 'collapsed').ok).toBe(false);
  });

  it('La playlist without Remove Item: Retirer rebuilds the same rows', () => {
    const r = solved(lesson('c7-playlist'), (p) => drop(p, 'WBP_Playlist', (n) => n.def === 'array.removeItem'));
    expect(reason(r, 'removed').reason).toContain('Morceaux');
  });

  it('La playlist: the nth click reaches the right row (rows are read top to bottom)', () => {
    const l = lesson('c7-playlist');
    const p = l.setup();
    l.solve(p);
    const r = runLesson({ ...l, scenario: [{ wait: 0.3 }, { click: 'WBP_Ligne/Btn_Lire', nth: 4 }, { wait: 0.1 }] }, p);
    expect(r.prints).toContain('Lecture : Écho');
  });

  it('A3 in Game and UI: the character walks with the terminal open', () => {
    const r = solved(lesson('a3-terminal'), (p) => {
      for (const n of nodes(p, 'BP_Joueur', 'input.setModeUIOnly')) n.def = 'input.setModeGameAndUI';
    });
    expect(reason(r, 'still').reason).toContain('Game and UI');
    expect(reason(r, 'north').ok).toBe(true);
  });

  it('T4 without the first update: empty at the start, and said why', () => {
    const r = solved(lesson('t4-energie'), (p) => drop(p, 'WBP_Energie', (n) => n.def === 'widget.setPercent' && n.y < 300));
    expect(reason(r, 'start').reason).toContain('70');
    expect(reason(r, 'one').ok).toBe(true);
  });
});
