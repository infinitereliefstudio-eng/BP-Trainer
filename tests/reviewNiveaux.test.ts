/** V7.52: review of chantier n° 4, lot 1 (docs/REVUE_NIVEAUX.md): what the engine gets right after Open Level. */
import { describe, expect, it } from 'vitest';
import { diagnoseNode } from '../src/core/explain/diagnose';
import { whereItStopped } from '../src/core/explain/stops';
import { type ClassBuilder, ProjectBuilder } from '../src/core/lessons/builder';
import { LESSONS } from '../src/core/lessons/index';
import { runLesson } from '../src/core/lessons/runner';
import { addLevel, setGameInstanceClass } from '../src/core/operations/levelAssetOps';
import { Game } from '../src/core/runtime/game';
import { T } from '../src/core/types/pins';

const say = (b: ClassBuilder, after: string, pin: string, text: string): string => {
  const p = b.node('debug.printString', {}, { text });
  b.link(after, pin, p, 'exec');
  return p;
};
const prints = (g: Game) => g.journal.log.filter((l) => l.message !== undefined).map((l) => l.message);

/** BP_Jeu (the Game Instance Class), Lvl_Principal and Lvl_Atelier. */
function base() {
  const pb = new ProjectBuilder('revue-niveaux');
  const jeu = pb.blueprint('BP_Jeu', 'GameInstance');
  setGameInstanceClass(pb.project, jeu.cls.id);
  const atelier = addLevel(pb.project, 'Lvl_Atelier');
  if (!atelier.ok) throw new Error(atelier.reason);
  return { pb, jeu };
}

/** An actor in Lvl_Principal that opens Lvl_Atelier `after` seconds after BeginPlay. */
function travelAfter(pb: ProjectBuilder, after: number, name = 'BP_Depart'): ClassBuilder {
  const b = pb.blueprint(name);
  const d = b.node('time.delay', {}, { duration: after });
  b.link(b.node('event.beginPlay'), 'then', d, 'exec').link(d, 'completed', b.node('level.open', {}, { level: 'Lvl_Atelier' }), 'exec');
  pb.place(b, 100, 0);
  return b;
}

const run = (g: Game, frames: number) => {
  for (let i = 0; i < frames; i++) g.step();
};

describe('R1: « Pourquoi ? » and « Montre-moi » see every level of the game', () => {
  const d27 = LESSONS.find((l) => l.id === 'd27-sac-vide')!;

  it('after Vérifier in D27, the coin of the corridor did exist: « Pourquoi ? » walks back to its Cast', () => {
    const p = d27.setup();
    const r = runLesson(d27, p);
    expect(r.sim?.level.name).toBe('Lvl_Atelier');
    const piece = p.classes.find((c) => c.name === 'BP_Piece')!;
    const g = piece.graphs[0];
    const destroy = Object.values(g.nodes).find((n) => n.def === 'actor.destroy')!;
    const d = diagnoseNode({ project: p, record: r.sim!.record, label: (id) => id }, g.id, destroy.id);
    const text = d.steps.map((s) => s.text).join(' ');
    expect(text).not.toContain('Aucun acteur BP_Piece');
    expect(text).toContain('Cast');
  });

  it('« Montre-moi » finds the Cast of the corridor that always failed', () => {
    const p = d27.setup();
    const r = runLesson(d27, p);
    const piece = p.classes.find((c) => c.name === 'BP_Piece')!;
    expect(whereItStopped(p, r.sim!).some((s) => s.classId === piece.id)).toBe(true);
  });

  it('the Execution Trace keeps the nodes run before the travel', () => {
    const { pb } = base();
    const b = travelAfter(pb, 0.1);
    const g = new Game(pb.project);
    g.start();
    run(g, 20);
    expect(g.level.name).toBe('Lvl_Atelier');
    expect(g.world.trace.some((e) => e.classId === b.cls.id)).toBe(true);
  });
});

describe('G1: Event Init comes before the GameMode, the Player Controller and the pawn', () => {
  it('Get Player Pawn, Get Player Controller and Get Game Mode give None in Init, and are there at BeginPlay', () => {
    const { pb, jeu } = base();
    const init = jeu.node('event.gameInit');
    const v1 = jeu.node('flow.isValid');
    const v2 = jeu.node('flow.isValid');
    const v3 = jeu.node('flow.isValid');
    jeu.link(init, 'then', v1, 'exec').link(jeu.node('actor.getPlayerPawn'), 'result', v1, 'object');
    jeu.link(v1, 'notValid', v2, 'exec').link(jeu.node('player.getController'), 'result', v2, 'object');
    jeu.link(v2, 'notValid', v3, 'exec').link(jeu.node('game.getGameMode'), 'result', v3, 'object');
    say(jeu, v3, 'notValid', 'init sans joueur');
    say(jeu, v1, 'valid', 'pion dans Init');
    const cube = pb.blueprint('BP_Cube');
    const v = cube.node('flow.isValid');
    cube.link(cube.node('event.beginPlay'), 'then', v, 'exec').link(cube.node('actor.getPlayerPawn'), 'result', v, 'object');
    say(cube, v, 'valid', 'pion au BeginPlay');
    pb.place(cube, 100, 0);
    const g = new Game(pb.project);
    g.start();
    expect(prints(g)).toEqual(['init sans joueur', 'pion au BeginPlay']);
    expect(g.world.beforePlayers).toBe(false);
  });
});

describe('G2: the GameInstance’s timers and Delays', () => {
  it('a looping timer set at Event Init goes on after Open Level', () => {
    const { pb, jeu } = base();
    const tic = jeu.node('event.custom', { name: 'Tic' });
    say(jeu, tic, 'then', 'tic');
    const timer = jeu.node('time.setTimerByEvent', {}, { time: 0.2, looping: true });
    jeu.link(jeu.node('event.gameInit'), 'then', timer, 'exec').link(tic, 'delegate', timer, 'event');
    travelAfter(pb, 0.3);
    const g = new Game(pb.project);
    g.start();
    run(g, 90);
    expect(g.level.name).toBe('Lvl_Atelier');
    expect(prints(g).filter((m) => m === 'tic').length).toBeGreaterThanOrEqual(6);
  });

  it('a Delay of the GameInstance completes, even across Open Level', () => {
    const { pb, jeu } = base();
    const d = jeu.node('time.delay', {}, { duration: 0.5 });
    jeu.link(jeu.node('event.gameInit'), 'then', d, 'exec');
    say(jeu, d, 'completed', 'delay du jeu');
    travelAfter(pb, 0.2);
    const g = new Game(pb.project);
    g.start();
    run(g, 60);
    expect(g.level.name).toBe('Lvl_Atelier');
    expect(prints(g)).toContain('delay du jeu');
  });

  it('a timer of an actor of the old level does not fire on the new level’s actor with the same id', () => {
    const { pb } = base();
    const b = pb.blueprint('BP_Va');
    const tic = b.node('event.custom', { name: 'Tic' });
    say(b, tic, 'then', 'tic acteur');
    const timer = b.node('time.setTimerByEvent', {}, { time: 0.5, looping: true });
    const begin = b.node('event.beginPlay');
    const open = b.node('level.open');
    b.link(begin, 'then', timer, 'exec').link(tic, 'delegate', timer, 'event').link(timer, 'then', open, 'exec').link(b.node('level.currentName'), 'result', open, 'level');
    pb.place(b, 100, 0);
    const g = new Game(pb.project);
    g.start();
    run(g, 20);
    expect(prints(g)).not.toContain('tic acteur');
  });
});

describe('E1, E2: one End Play per actor; only the SaveGame objects the GameInstance keeps', () => {
  it('Stop while an End Play of Open Level is paused: the actors already ended do not end again', () => {
    const { pb } = base();
    const a = pb.blueprint('BP_A');
    say(a, a.node('event.endPlay'), 'then', 'end A');
    a.link(a.node('event.beginPlay'), 'then', a.node('level.open', {}, { level: 'Lvl_Atelier' }), 'exec');
    pb.place(a, 100, 0);
    const bb = pb.blueprint('BP_B');
    const bp = say(bb, bb.node('event.endPlay'), 'then', 'end B');
    pb.place(bb, 200, 0);
    const g = new Game(pb.project, { breakpoints: new Set([bp]), order: 'level' });
    g.start();
    run(g, 2);
    expect(g.world.paused).toBeTruthy();
    g.shutdown();
    expect(prints(g).filter((m) => m === 'end A')).toHaveLength(1);
  });

  it('a SaveGame object kept by the GameInstance survives; one only an actor knew does not', () => {
    const { pb, jeu } = base();
    const save = pb.blueprint('BP_Save', 'SaveGame');
    const keep = jeu.variable('Partie', T.object(save.cls.name));
    const init = jeu.node('event.gameInit');
    const create = jeu.node('save.create', {}, { saveClass: save.cls.id });
    const set = jeu.node('var.set', { variable: keep });
    jeu.link(init, 'then', create, 'exec').link(create, 'then', set, 'exec').link(create, 'result', set, 'value');
    const loose = pb.blueprint('BP_Perd');
    const begin = loose.node('event.beginPlay');
    const c2 = loose.node('save.create', {}, { saveClass: save.cls.id });
    const open = loose.node('level.open');
    loose.link(begin, 'then', c2, 'exec').link(c2, 'then', open, 'exec').link(loose.node('level.currentName'), 'result', open, 'level');
    pb.place(loose, 100, 0);
    const g = new Game(pb.project);
    g.start();
    run(g, 20);
    expect(g.visited.length).toBeGreaterThan(5);
    const saves = g.world.objects.filter((o) => o.native === 'SaveGame');
    expect(saves.map((o) => o.id)).toContain((g.gameInstance.vars[keep] as { id: string }).id);
    expect(saves.length).toBeLessThanOrEqual(2);
  });
});
