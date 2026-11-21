/** V7.49: the real GameMode (GameModeBase, Default GameMode, GameMode Override, Get Game Mode) and the format 17 migration. */
import { describe, expect, it } from 'vitest';
import { compileClass } from '../src/core/compiler/validate';
import { ProjectBuilder, type ClassBuilder } from '../src/core/lessons/builder';
import { gameModeOf, playerClassesFor } from '../src/core/model/gameMode';
import { defaultLevel, PROJECT_FORMAT, type Project } from '../src/core/model/project';
import { setDefaultGameMode, setGameModeDefault, setGameModeOverride } from '../src/core/operations/gameModeOps';
import { addLevel, setGameInstanceClass } from '../src/core/operations/levelAssetOps';
import { placeActor } from '../src/core/operations/levelOps';
import { removeClass, setParentClass, setPlayerClass, setPlayerControllerClass } from '../src/core/operations/projectOps';
import { Game } from '../src/core/runtime/game';
import { Simulation } from '../src/core/runtime/simulation';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';
import { T } from '../src/core/types/pins';

const say = (b: ClassBuilder, after: string, pin: string, text: string): string => {
  const p = b.node('debug.printString', {}, { text });
  b.link(after, pin, p, 'exec');
  return p;
};
const prints = (log: { message?: string }[]) => log.filter((l) => l.message !== undefined).map((l) => l.message);

/** A pawn, a Player Controller, and a GameMode that names both, as the Default GameMode. */
function base() {
  const pb = new ProjectBuilder('gm');
  const joueur = pb.blueprint('BP_Joueur', 'Pawn');
  const pc = pb.blueprint('BP_PC', 'PlayerController');
  const gm = pb.blueprint('BP_Regles', 'GameModeBase');
  setDefaultGameMode(pb.project, gm.cls.id);
  setGameModeDefault(pb.project, gm.cls.id, 'defaultPawnClass', joueur.cls.id);
  setGameModeDefault(pb.project, gm.cls.id, 'playerControllerClass', pc.cls.id);
  return { pb, p: pb.project, joueur, pc, gm };
}

describe('the GameMode makes the player', () => {
  it('the Default GameMode’s Class Defaults give the pawn and the Player Controller', () => {
    const { p, joueur, pc, gm } = base();
    const sim = new Simulation(p);
    expect(sim.player.classId).toBe(joueur.cls.id);
    expect(sim.controller.classId).toBe(pc.cls.id);
    expect(sim.gameMode.classId).toBe(gm.cls.id);
    expect(sim.gameMode.objectName).toBe('BP_Regles_C_0');
  });

  it('without GameMode: UE’s GameModeBase, DefaultPawn and PlayerController', () => {
    const pb = new ProjectBuilder('rien');
    const sim = new Simulation(pb.project);
    expect([sim.gameMode.objectName, sim.player.classId, sim.controller.classId]).toEqual(['GameModeBase_0', undefined, undefined]);
  });

  it('a child GameMode inherits its parent’s classes; its own value (DefaultPawn included) wins', () => {
    const { p, pb, joueur, gm } = base();
    const enfant = pb.blueprint('BP_ReglesEnfant', 'GameModeBase');
    expect(setParentClass(p, enfant.cls.id, gm.cls.id).ok).toBe(true);
    setDefaultGameMode(p, enfant.cls.id);
    expect(playerClassesFor(p, defaultLevel(p)).pawn?.id).toBe(joueur.cls.id);
    setGameModeDefault(p, enfant.cls.id, 'defaultPawnClass', '');
    expect(playerClassesFor(p, defaultLevel(p)).pawn).toBeUndefined();
    setGameModeDefault(p, enfant.cls.id, 'defaultPawnClass', undefined);
    expect(playerClassesFor(p, defaultLevel(p)).pawn?.id).toBe(joueur.cls.id);
  });

  it('World Settings › GameMode Override: another pawn in that level only, after Open Level too', () => {
    const { p, pb, joueur } = base();
    const robot = pb.blueprint('BP_Robot', 'Pawn');
    const atelier = pb.blueprint('BP_ReglesAtelier', 'GameModeBase');
    setGameModeDefault(p, atelier.cls.id, 'defaultPawnClass', robot.cls.id);
    const lvl = addLevel(p, 'Lvl_Atelier');
    if (!lvl.ok) throw new Error(lvl.reason);
    expect(setGameModeOverride(p, lvl.value.id, atelier.cls.id).ok).toBe(true);
    expect(gameModeOf(p, lvl.value)?.id).toBe(atelier.cls.id);
    const porte = pb.blueprint('BP_Porte');
    porte.component('BoxCollision', 'Zone', { sizeX: 120, sizeY: 120 });
    porte.link(porte.node('event.actorBeginOverlap'), 'then', porte.node('level.open', {}, { level: 'Lvl_Atelier' }), 'exec');
    pb.place(porte, 300, 0);
    const g = new Game(p);
    g.start();
    expect(g.world.player.classId).toBe(joueur.cls.id);
    g.world.teleportPlayer(300, 0);
    g.step();
    g.step();
    expect(g.level.name).toBe('Lvl_Atelier');
    expect(g.world.player.classId).toBe(robot.cls.id);
    expect(g.world.gameMode.classId).toBe(atelier.cls.id);
    // The Player Controller Class is the override's own: UE's PlayerController there.
    expect(g.world.controller.classId).toBeUndefined();
  });

  it('Get Game Mode → Cast To: the GameMode is an actor with BeginPlay, after the placed actors and before the player', () => {
    const { p, pb, gm, joueur } = base();
    const score = gm.variable('Score', T.int, 7);
    say(gm, gm.node('event.beginPlay'), 'then', 'gamemode');
    say(joueur, joueur.node('event.beginPlay'), 'then', 'joueur');
    const lampe = pb.blueprint('BP_Lampe');
    const begin = lampe.node('event.beginPlay');
    const cast = lampe.node('cast.to', { class: gm.cls.id });
    lampe.link(begin, 'then', cast, 'exec').link(lampe.node('game.getGameMode'), 'result', cast, 'object');
    const get = lampe.node('var.getExternal', { owner: gm.cls.id, variable: score });
    const conv = lampe.node('conv.intToString');
    const print = lampe.node('debug.printString');
    lampe.link(cast, 'as', get, 'target').link(get, 'value', conv, 'in').link(conv, 'result', print, 'text').link(cast, 'then', print, 'exec');
    pb.place(lampe, 0, 0);
    const sim = new Simulation(p);
    sim.start();
    expect(prints(sim.log)).toEqual(['7', 'gamemode', 'joueur']);
  });

  it('a GameInstance that kept the GameMode finds None after Open Level: the GameMode goes with its level', () => {
    const { p, pb, gm } = base();
    const jeu = pb.blueprint('BP_Jeu', 'GameInstance');
    const ref = jeu.variable('Mode', T.object('GameModeBase'));
    setGameInstanceClass(p, jeu.cls.id);
    const keep = jeu.node('var.set', { variable: ref });
    jeu.link(jeu.node('event.gameInit'), 'then', keep, 'exec').link(jeu.node('game.getGameMode'), 'result', keep, 'value');
    pb.blueprint('BP_Rien');
    const lvl = addLevel(p, 'Lvl_2');
    if (!lvl.ok) throw new Error(lvl.reason);
    const g = new Game(p);
    g.start();
    expect(g.gameInstance.vars[ref]).toEqual({ ref: 'actor', id: g.world.gameMode.id });
    g.world.openLevel('Lvl_2', true, '');
    g.step();
    expect(g.level.name).toBe('Lvl_2');
    expect(g.gameInstance.vars[ref]).toBeNull();
    expect(g.world.gameMode.classId).toBe(gm.cls.id);
  });
});

describe('the GameMode class in the editor', () => {
  it('is never placed nor spawned; no overlap or input in its graph', () => {
    const { p, pb, gm } = base();
    expect(placeActor(p, gm.cls.id, 0, 0).ok).toBe(false);
    const spawner = pb.blueprint('BP_Spawner');
    spawner.link(spawner.node('event.beginPlay'), 'then', spawner.node('actor.spawn', {}, { class: gm.cls.id }), 'exec');
    pb.place(spawner, 0, 0);
    const sim = new Simulation(p);
    sim.start();
    expect(sim.log.some((l) => l.level === 'error' && l.text.includes('est un GameMode'))).toBe(true);
    gm.node('event.actorBeginOverlap');
    gm.node('event.tick');
    const codes = compileClass(gm.cls, p).messages.filter((m) => m.severity === 'error').map((m) => m.code);
    expect(codes).toEqual(['notInGameMode']);
  });

  it('a pawn that stops being a Pawn, or a removed GameMode, leaves the settings', () => {
    const { p, joueur, gm } = base();
    expect(setParentClass(p, joueur.cls.id, 'Actor').ok).toBe(true);
    expect(gm.cls.gameMode?.defaultPawnClass).toBeUndefined();
    const lvl = defaultLevel(p);
    setGameModeOverride(p, lvl.id, gm.cls.id);
    expect(removeClass(p, gm.cls.id).ok).toBe(true);
    expect(p.mapsModes?.defaultGameMode).toBeUndefined();
    expect(lvl.gameModeOverride).toBeUndefined();
  });

  it('each setting takes only the right kind of Blueprint', () => {
    const { p, joueur, pc, gm } = base();
    expect(setGameModeDefault(p, gm.cls.id, 'defaultPawnClass', pc.cls.id).ok).toBe(false);
    expect(setGameModeDefault(p, gm.cls.id, 'playerControllerClass', joueur.cls.id).ok).toBe(false);
    expect(setGameModeDefault(p, joueur.cls.id, 'defaultPawnClass', joueur.cls.id).ok).toBe(false);
    expect(setDefaultGameMode(p, joueur.cls.id).ok).toBe(false);
    expect(setGameModeOverride(p, defaultLevel(p).id, pc.cls.id).ok).toBe(false);
    expect(setDefaultGameMode(p, '').ok).toBe(true);
    expect(p.mapsModes?.defaultGameMode).toBeUndefined();
  });

  it('setPlayerClass, as the lessons use it, writes into the Default GameMode, made if needed (BP_GameMode)', () => {
    const pb = new ProjectBuilder('lecon');
    const pawn = pb.blueprint('BP_Joueur', 'Pawn');
    const pc = pb.blueprint('BP_PlayerController', 'PlayerController');
    expect(setPlayerClass(pb.project, pawn.cls.id).ok).toBe(true);
    expect(setPlayerControllerClass(pb.project, pc.cls.id).ok).toBe(true);
    const made = pb.project.classes.filter((c) => c.parent === 'GameModeBase');
    expect(made.map((c) => c.name)).toEqual(['BP_GameMode']);
    expect(made[0].gameMode).toEqual({ defaultPawnClass: pawn.cls.id, playerControllerClass: pc.cls.id });
    expect(setPlayerControllerClass(pb.project, undefined).ok).toBe(true);
    expect(playerClassesFor(pb.project, defaultLevel(pb.project)).controller).toBeUndefined();
  });
});

describe('format 17', () => {
  /** A project as a format 16 file had it: the player's classes on the project itself. */
  function legacy(pawn = true, controller = true, taken = false) {
    const pb = new ProjectBuilder('ancien');
    const j = pb.blueprint('BP_Joueur', 'Pawn');
    const c = pb.blueprint('BP_PC', 'PlayerController');
    if (taken) pb.blueprint('BP_GameMode');
    const file = JSON.parse(serializeProject(pb.project));
    file.format = 16;
    file.project.format = 16;
    if (pawn) file.project.playerClassId = j.cls.id;
    if (controller) file.project.playerControllerClassId = c.cls.id;
    return { text: JSON.stringify(file), j, c };
  }

  it('moves Default Pawn and Player Controller into a BP_GameMode, the Default GameMode', () => {
    const { text, j, c } = legacy();
    const p = parseProject(text);
    expect(PROJECT_FORMAT).toBe(17);
    expect(p.format).toBe(17);
    const gm = p.classes.find((x) => x.id === p.mapsModes?.defaultGameMode)!;
    expect([gm.name, gm.parent]).toEqual(['BP_GameMode', 'GameModeBase']);
    expect(gm.gameMode).toEqual({ defaultPawnClass: j.cls.id, playerControllerClass: c.cls.id });
    expect('playerClassId' in p || 'playerControllerClassId' in p).toBe(false);
    const sim = new Simulation(p);
    expect([sim.player.classId, sim.controller.classId]).toEqual([j.cls.id, c.cls.id]);
  });

  it('only what was set; nothing made when nothing was set; a free name if BP_GameMode is taken', () => {
    const p1 = parseProject(legacy(true, false).text);
    expect(p1.classes.find((x) => x.parent === 'GameModeBase')!.gameMode).toEqual({ defaultPawnClass: expect.any(String) });
    const p2 = parseProject(legacy(false, false).text);
    expect(p2.classes.some((x) => x.parent === 'GameModeBase')).toBe(false);
    expect(p2.mapsModes?.defaultGameMode).toBeUndefined();
    const p3 = parseProject(legacy(true, true, true).text);
    expect(p3.classes.find((x) => x.parent === 'GameModeBase')!.name).not.toBe('BP_GameMode');
  });

  it('a lost GameMode reference is dropped on load', () => {
    const { p, gm } = base();
    const file = JSON.parse(serializeProject(p as Project));
    file.project.levels[0].gameModeOverride = 'c_nulle';
    file.project.classes.find((c: { id: string }) => c.id === gm.cls.id).gameMode.defaultPawnClass = 'c_nulle';
    const back = parseProject(JSON.stringify(file));
    expect(back.levels[0].gameModeOverride).toBeUndefined();
    expect(back.classes.find((c) => c.id === gm.cls.id)!.gameMode?.defaultPawnClass).toBeUndefined();
  });
});
