/**
 * V7.73, review of chantier n° 5, G1: Set Input Mode sets UE's game viewport,
 * which outlives the world: the mode follows Open Level. A menu left in UI
 * Only leaves the next level without keys; the cursor, the Player
 * Controller's, is hidden again. C8 and X5 put Game Only back before Open Level.
 */
import { describe, expect, it } from 'vitest';
import { diagnoseNode } from '../src/core/explain/diagnose';
import { getLesson } from '../src/core/lessons';
import { edit, ProjectBuilder } from '../src/core/lessons/builder';
import { milestoneView } from '../src/core/lessons/milestones';
import { runLesson } from '../src/core/lessons/runner';
import { ensurePlayerInput } from '../src/core/lessons/ue5Input';
import type { Project } from '../src/core/model/project';
import { removeNodes } from '../src/core/operations/graphOps';
import { addLevel } from '../src/core/operations/levelAssetOps';
import { Game } from '../src/core/runtime/game';

/** Lvl_Principal: a door at (300, 0) that sets `mode`, shows the cursor, then opens Lvl_Atelier. E (IA_Agir) prints « agi » in the Player Controller. */
function setup(mode: 'input.setModeUIOnly' | 'input.setModeGameAndUI' | 'input.setModeGameOnly') {
  const pb = new ProjectBuilder('mode-voyage');
  const p = pb.project;
  const ids = ensurePlayerInput(p, ['E'], { E: 'IA_Agir' });
  const pc = edit(p, 'BP_PlayerController');
  const act = pc.node('input.action', { action: ids.get('E')! }, {}, [64, 600]);
  const print = pc.node('debug.printString', {}, { text: 'agi' }, [400, 600]);
  pc.link(act, 'started', print, 'exec');
  const door = pb.blueprint('BP_Porte');
  door.component('BoxCollision', 'Zone', { sizeX: 120, sizeY: 120 });
  const ctrl = door.node('player.getController', {}, {}, [200, 300]);
  const set = door.node(mode, {}, {}, [400, 96]);
  const cursor = door.node('input.setShowMouseCursor', {}, { show: true }, [700, 96]);
  const open = door.node('level.open', {}, { level: 'Lvl_Atelier' }, [1000, 96]);
  door.link(door.node('event.actorBeginOverlap', {}, {}, [64, 96]), 'then', set, 'exec').link(ctrl, 'result', set, 'controller');
  door.link(set, 'then', cursor, 'exec').link(ctrl, 'result', cursor, 'target').link(cursor, 'then', open, 'exec');
  pb.place(door, 300, 0);
  pb.playerStart(0, 0);
  const b = addLevel(p, 'Lvl_Atelier');
  if (!b.ok) throw new Error(b.reason);
  b.value.playerStart = { x: -200, y: 0, yaw: 0 };
  return { p, pcGraph: pc.graph.id, act };
}

function through(p: Project): Game {
  const g = new Game(p);
  g.start();
  g.world.teleportPlayer(300, 0);
  for (let i = 0; i < 3; i++) g.step();
  expect(g.level.name).toBe('Lvl_Atelier');
  g.world.pressKey('E');
  g.step();
  g.world.releaseKey('E');
  g.step();
  return g;
}

const prints = (g: Game) => g.journal.log.filter((l) => l.message !== undefined).map((l) => l.message);

describe('the input mode follows Open Level (V7.73)', () => {
  it('UI Only set before Open Level: the next level gets no key, the cursor is hidden again, the log says why', () => {
    const { p, pcGraph, act } = setup('input.setModeUIOnly');
    const g = through(p);
    expect(g.world.inputMode).toBe('UIOnly');
    expect(g.world.showMouseCursor).toBe(false);
    expect(prints(g)).not.toContain('agi');
    expect(g.record.uiOnlyCarried).toEqual(['Lvl_Atelier']);
    expect(g.world.log.some((l) => l.text.includes('gardé dans Lvl_Atelier'))).toBe(true);
    // « Pourquoi ? » on the action event that never ran.
    const d = diagnoseNode({ project: p, record: g.record, label: (id) => id }, pcGraph, act);
    const why = d.steps.map((s) => s.text).join(' ');
    expect(why).toContain('UI Only');
    expect(why).toContain('avant Open Level');
  });

  it('Game and UI follows too; Game Only before Open Level gives the keys back', () => {
    expect(through(setup('input.setModeGameAndUI').p).world.inputMode).toBe('GameAndUI');
    const g = through(setup('input.setModeGameOnly').p);
    expect(g.world.inputMode).toBe('GameOnly');
    expect(prints(g)).toContain('agi');
    expect(g.record.uiOnlyCarried).toEqual([]);
  });
});

describe('the menus that open a level put Game Only back (V7.73)', () => {
  const failedIds = (id: string, at: number | undefined, tweak: (p: Project) => void) => {
    const l = getLesson(id)!;
    const view = at === undefined ? l : milestoneView(l, at);
    const p = l.setup();
    view.solve(p);
    tweak(p);
    return runLesson(view, p).results.filter((r) => !r.ok).map((r) => r.check.id);
  };
  const dropGameOnly = (cls: string) => (p: Project) => {
    const c = p.classes.find((x) => x.name === cls)!;
    for (const g of c.graphs) {
      const n = Object.values(g.nodes).find((x) => x.def === 'input.setModeGameOnly');
      if (!n) continue;
      const before = Object.values(g.links).find((l) => l.to.node === n.id && l.to.pin === 'exec');
      const after = Object.values(g.links).find((l) => l.from.node === n.id && l.from.pin === 'then');
      removeNodes(g, [n.id]);
      if (before && after) edit(p, cls).inGraph(g.id).link(before.from.node, before.from.pin, after.to.node, after.to.pin);
    }
  };

  it('C8 « Le personnage choisi »: its provided Choisir has it; without it, the game level is UI Only', () => {
    expect(failedIds('c8-personnage', undefined, () => undefined)).toEqual([]);
    expect(failedIds('c8-personnage', undefined, dropGameOnly('WBP_Choix'))).toContain('game-only');
  });

  it('X5 « Le réseau », milestone 4: Jouer without Game Only leaves the grid without E', () => {
    const at = getLesson('x5-reseau')!.milestones!.findIndex((m) => m.id === 'menu');
    expect(failedIds('x5-reseau', at, dropGameOnly('WBP_LigneSalle'))).toContain('choose');
  });
});
