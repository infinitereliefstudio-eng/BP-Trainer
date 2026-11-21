/** V7.53: several Player Starts per level, the Player Start Tag, the GameMode's Choose Player Start. */
import { describe, expect, it } from 'vitest';
import { ClassBuilder, ProjectBuilder } from '../src/core/lessons/builder';
import { levelOf, PROJECT_FORMAT, playerStartsOf, type Project } from '../src/core/model/project';
import { overrideFunction, renameFunction, addFunctionParam } from '../src/core/operations/functionOps';
import { ensureDefaultGameMode } from '../src/core/operations/gameModeOps';
import { addLevel, setGameInstanceClass } from '../src/core/operations/levelAssetOps';
import { addPlayerStart, removePlayerStart, setPlayerStart } from '../src/core/operations/levelOps';
import { Game } from '../src/core/runtime/game';
import { Simulation } from '../src/core/runtime/simulation';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';
import { T } from '../src/core/types/pins';

/** Three Player Starts: the first at (0, 0), Nord at (300, -200), Sud at (300, 200). */
function starts(pb: ProjectBuilder): Project {
  const p = pb.project;
  pb.playerStart(0, 0);
  const n = addPlayerStart(p, 300, -200);
  const s = addPlayerStart(p, 300, 200);
  if (!n.ok || !s.ok) throw new Error('starts');
  setPlayerStart(p, n.value.id, { tag: 'Nord', yaw: 90 });
  setPlayerStart(p, s.value.id, { tag: 'Sud' });
  return p;
}

/**
 * BP_GameMode overrides Choose Player Start: Get All Actors Of Class
 * (PlayerStart) → For Each → Branch (Get Player Start Tag == BP_Jeu.Arrivee)
 * → Return (the element); Completed → Return (the first one).
 */
function chooser(pb: ProjectBuilder, arrivee: string) {
  const p = pb.project;
  const jeu = pb.blueprint('BP_Jeu', 'GameInstance');
  const v = jeu.variable('Arrivee', T.name, arrivee);
  setGameInstanceClass(p, jeu.cls.id);
  const made = ensureDefaultGameMode(p);
  if (!made.ok) throw new Error(made.reason);
  const gmCls = made.value;
  const g = overrideFunction(p, gmCls, 'ChoosePlayerStart');
  if (!g.ok) throw new Error(g.reason);
  const b = new ClassBuilder(gmCls, p).inGraph(g.value.id);
  const entry = Object.values(g.value.nodes).find((n) => n.def === 'fn.entry')!.id;
  const ret = Object.values(g.value.nodes).find((n) => n.def === 'fn.return')!.id;
  const out = g.value.fn!.outputs[0].id;
  for (const id of Object.keys(g.value.links)) delete g.value.links[id];
  const all = b.node('actor.getAllOfClass', {}, { class: 'PlayerStart' });
  const each = b.node('flow.forEachLoop');
  const tag = b.node('playerStart.getTag');
  const cast = b.node('cast.to', { class: jeu.cls.id });
  const get = b.node('var.getExternal', { owner: jeu.cls.id, variable: v });
  const same = b.node('name.equal');
  const branch = b.node('flow.branch');
  const first = b.node('array.get', {}, { index: 0 });
  const ret2 = b.node('fn.return', { graph: g.value.id });
  b.link(entry, 'then', all, 'exec').link(all, 'then', cast, 'exec').link(b.node('game.getGameInstance'), 'result', cast, 'object');
  b.link(cast, 'then', each, 'exec').link(all, 'actors', each, 'array').link(each, 'body', branch, 'exec');
  b.link(each, 'element', tag, 'target').link(tag, 'result', same, 'a').link(cast, 'as', get, 'target').link(get, 'value', same, 'b').link(same, 'result', branch, 'condition');
  b.link(branch, 'true', ret, 'exec').link(each, 'element', ret, out);
  b.link(each, 'completed', ret2, 'exec').link(all, 'actors', first, 'array').link(first, 'item', ret2, out);
  return { gm: gmCls, graph: g.value };
}

describe('several Player Starts', () => {
  it('are kept in the project file (format 18), with their tags', () => {
    const pb = new ProjectBuilder('ps');
    pb.blueprint('BP_Rien');
    const p = starts(pb);
    const back = parseProject(serializeProject(p));
    expect(back.format).toBe(PROJECT_FORMAT);
    expect(PROJECT_FORMAT).toBe(18);
    expect(playerStartsOf(levelOf(back)).map((s) => [s.name, s.tag ?? ''])).toEqual([
      ['PlayerStart', ''],
      ['PlayerStart2', 'Nord'],
      ['PlayerStart3', 'Sud'],
    ]);
  });

  it('the first one stays; the others can be deleted', () => {
    const pb = new ProjectBuilder('ps');
    const p = starts(pb);
    expect(removePlayerStart(p, 'playerStart').ok).toBe(false);
    const id = levelOf(p).otherStarts![0].id;
    expect(removePlayerStart(p, id).ok).toBe(true);
    expect(playerStartsOf(levelOf(p))).toHaveLength(2);
  });

  it('with no override, the player appears on one of them, the same for the same seed', () => {
    const pb = new ProjectBuilder('ps');
    pb.blueprint('BP_Rien');
    const p = starts(pb);
    const spots = new Set<string>();
    for (let seed = 1; seed < 40; seed++) {
      const sim = new Simulation(p, { seed });
      sim.start();
      spots.add(`${sim.player.x},${sim.player.y}`);
      const again = new Simulation(p, { seed });
      again.start();
      expect([again.player.x, again.player.y]).toEqual([sim.player.x, sim.player.y]);
    }
    expect(spots).toEqual(new Set(['0,0', '300,-200', '300,200']));
  });

  it('one Player Start alone: always there, as before', () => {
    const pb = new ProjectBuilder('ps');
    pb.blueprint('BP_Rien');
    pb.playerStart(-120, 40, 45);
    const sim = new Simulation(pb.project, { seed: 7 });
    sim.start();
    expect([sim.player.x, sim.player.y, sim.player.yaw]).toEqual([-120, 40, 45]);
  });

  it('are actors of class PlayerStart: Get All Actors Of Class finds them, Get Player Start Tag reads their tag', () => {
    const pb = new ProjectBuilder('ps');
    const b = pb.blueprint('BP_Compte');
    const all = b.node('actor.getAllOfClass', {}, { class: 'PlayerStart' });
    const each = b.node('flow.forEachLoop');
    const print = b.node('debug.printString');
    const tag = b.node('playerStart.getTag');
    const conv = b.node('conv.nameToString');
    b.link(b.node('event.beginPlay'), 'then', all, 'exec').link(all, 'then', each, 'exec').link(all, 'actors', each, 'array');
    b.link(each, 'body', print, 'exec').link(each, 'element', tag, 'target').link(tag, 'result', conv, 'in').link(conv, 'result', print, 'text');
    pb.place(b, 500, 0);
    const p = starts(pb);
    const sim = new Simulation(p);
    sim.start();
    expect(sim.log.filter((l) => l.message !== undefined).map((l) => l.message)).toEqual(['', 'Nord', 'Sud']);
  });
});

describe('Choose Player Start (Functions › Override)', () => {
  it('is made with UE’s name and signature, which cannot change', () => {
    const pb = new ProjectBuilder('ps');
    pb.blueprint('BP_Rien');
    const { gm, graph } = chooser(pb, '');
    expect(graph.name).toBe('ChoosePlayerStart');
    expect(graph.fn!.inputs.map((x) => x.name)).toEqual(['Player']);
    expect(renameFunction(gm, graph.id, 'Autre').ok).toBe(false);
    expect(addFunctionParam(pb.project, gm, graph.id, 'inputs')).toBeUndefined();
    expect(overrideFunction(pb.project, gm, 'ChoosePlayerStart').ok).toBe(false);
    const actor = pb.blueprint('BP_Acteur');
    expect(overrideFunction(pb.project, actor.cls, 'ChoosePlayerStart').ok).toBe(false);
  });

  it('places the player on the Player Start it returns, before any BeginPlay', () => {
    const pb = new ProjectBuilder('ps');
    const b = pb.blueprint('BP_Voit');
    const loc = b.node('actor.getLocation');
    const print = b.node('debug.printString');
    const conv = b.node('conv.vectorToString');
    b.link(b.node('event.beginPlay'), 'then', print, 'exec').link(b.node('actor.getPlayerPawn'), 'result', loc, 'target').link(loc, 'result', conv, 'in').link(conv, 'result', print, 'text');
    pb.place(b, 600, 0);
    chooser(pb, 'Sud');
    const p = starts(pb);
    // A Game: the Game Instance Class is made by the game (a Simulation alone has UE's plain one).
    for (const seed of [1, 2, 3, 4]) {
      const g = new Game(p, { seed });
      g.start();
      expect([g.world.player.x, g.world.player.y]).toEqual([300, 200]);
    }
    const g = new Game(p);
    g.start();
    expect(g.world.log.find((l) => l.message !== undefined)?.message).toContain('Y=200');
  });

  it('the tag kept in the GameInstance before Open Level chooses the start of the next level', () => {
    const pb = new ProjectBuilder('ps');
    chooser(pb, '');
    const porte = pb.blueprint('BP_Porte');
    const jeu = pb.project.classes.find((c) => c.name === 'BP_Jeu')!;
    const arrivee = jeu.variables[0].id;
    const cast = porte.node('cast.to', { class: jeu.id });
    const set = porte.node('var.setExternal', { owner: jeu.id, variable: arrivee }, { value: 'Nord' });
    porte.link(porte.node('event.beginPlay'), 'then', cast, 'exec').link(porte.node('game.getGameInstance'), 'result', cast, 'object');
    porte.link(cast, 'then', set, 'exec').link(cast, 'as', set, 'target').link(set, 'then', porte.node('level.open', {}, { level: 'Lvl_Atelier' }), 'exec');
    pb.place(porte, 100, 0);
    pb.playerStart(-300, 0);
    const lvl = addLevel(pb.project, 'Lvl_Atelier');
    if (!lvl.ok) throw new Error(lvl.reason);
    pb.project.editorLevelId = lvl.value.id;
    starts(pb);
    pb.project.editorLevelId = pb.project.levels[0].id;
    const g = new Game(pb.project);
    g.start();
    expect([g.world.player.x, g.world.player.y]).toEqual([-300, 0]);
    g.step();
    g.step();
    expect(g.level.name).toBe('Lvl_Atelier');
    expect([g.world.player.x, g.world.player.y, g.world.player.yaw]).toEqual([300, -200, 90]);
  });

  it('returning None: a warning, as UE’s « Player start not found »', () => {
    const pb = new ProjectBuilder('ps');
    pb.blueprint('BP_Rien');
    const p = pb.project;
    const gm = ensureDefaultGameMode(p);
    if (!gm.ok) throw new Error(gm.reason);
    const g = overrideFunction(p, gm.value, 'ChoosePlayerStart');
    if (!g.ok) throw new Error(g.reason);
    const sim = new Simulation(p);
    sim.start();
    expect(sim.log.some((l) => l.text.includes('Player start not found'))).toBe(true);
  });
});
