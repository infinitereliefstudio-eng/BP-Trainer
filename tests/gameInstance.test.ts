/** V7.48: the GameInstance (Event Init, Event Shutdown, Get Game Instance, Game Instance Class) and Quit Game. */
import { describe, expect, it } from 'vitest';
import { compileClass } from '../src/core/compiler/validate';
import { ProjectBuilder, type ClassBuilder } from '../src/core/lessons/builder';
import { runLesson } from '../src/core/lessons/runner';
import type { CheckContext, Lesson } from '../src/core/lessons/types';
import { PROJECT_FORMAT, type Project } from '../src/core/model/project';
import { addLevel, setGameInstanceClass } from '../src/core/operations/levelAssetOps';
import { placeActor } from '../src/core/operations/levelOps';
import { removeClass, setParentClass } from '../src/core/operations/projectOps';
import { Game } from '../src/core/runtime/game';
import { parseProject, serializeProject } from '../src/core/serialization/serialize';
import { T } from '../src/core/types/pins';

const say = (b: ClassBuilder, after: string, pin: string, text: string): string => {
  const p = b.node('debug.printString', {}, { text });
  b.link(after, pin, p, 'exec');
  return p;
};

/** Print an int: Print String of an Int To String. */
const sayInt = (b: ClassBuilder, after: string, pin: string, from: string, fromPin: string): string => {
  const conv = b.node('conv.intToString');
  const p = b.node('debug.printString');
  b.link(after, pin, p, 'exec').link(from, fromPin, conv, 'in').link(conv, 'result', p, 'text');
  return p;
};

/**
 * BP_Jeu (GameInstance): Compteur (int), Porte (Actor). Event Init sets
 * Compteur to 10 and prints « init »; Event Shutdown prints « shutdown ».
 * BP_Porte (Lvl_Principal): BeginPlay adds 1 to Compteur through Get Game
 * Instance and Cast To BP_Jeu, keeps itself in Porte, prints Compteur; its
 * overlap opens Lvl_Atelier. BP_Atelier (Lvl_Atelier): BeginPlay prints
 * Compteur, then « porte valide » if Porte is valid.
 */
function setup(choose = true) {
  const pb = new ProjectBuilder('game-instance');
  const jeu = pb.blueprint('BP_Jeu', 'GameInstance');
  const compteur = jeu.variable('Compteur', T.int, 0);
  const porteVar = jeu.variable('Porte', T.object('Actor'));
  const init = jeu.node('event.gameInit');
  const set10 = jeu.node('var.set', { variable: compteur }, { value: 10 });
  jeu.link(init, 'then', set10, 'exec');
  say(jeu, set10, 'then', 'init');
  say(jeu, jeu.node('event.gameShutdown'), 'then', 'shutdown');
  if (choose) setGameInstanceClass(pb.project, jeu.cls.id);

  const porte = pb.blueprint('BP_Porte');
  porte.component('BoxCollision', 'Zone', { sizeX: 120, sizeY: 120 });
  const begin = porte.node('event.beginPlay');
  const gi = porte.node('game.getGameInstance');
  const cast = porte.node('cast.to', { class: jeu.cls.id });
  porte.link(begin, 'then', cast, 'exec').link(gi, 'result', cast, 'object');
  say(porte, cast, 'failed', 'cast échoué');
  const get = porte.node('var.getExternal', { owner: jeu.cls.id, variable: compteur });
  const add = porte.node('math.addInt', {}, { b: 1 });
  const set = porte.node('var.setExternal', { owner: jeu.cls.id, variable: compteur });
  porte.link(cast, 'as', get, 'target').link(get, 'value', add, 'a').link(add, 'result', set, 'value').link(cast, 'as', set, 'target').link(cast, 'then', set, 'exec');
  const self = porte.node('actor.self');
  const keep = porte.node('var.setExternal', { owner: jeu.cls.id, variable: porteVar });
  porte.link(set, 'then', keep, 'exec').link(cast, 'as', keep, 'target').link(self, 'self', keep, 'value');
  sayInt(porte, keep, 'then', set, 'out');
  const overlap = porte.node('event.actorBeginOverlap');
  const open = porte.node('level.open', {}, { level: 'Lvl_Atelier' });
  porte.link(overlap, 'then', open, 'exec');
  pb.place(porte, 300, 0);
  pb.playerStart(0, 0);

  const b = addLevel(pb.project, 'Lvl_Atelier');
  if (!b.ok) throw new Error(b.reason);
  const atelier = pb.blueprint('BP_Atelier');
  const ab = atelier.node('event.beginPlay');
  const agi = atelier.node('game.getGameInstance');
  const acast = atelier.node('cast.to', { class: jeu.cls.id });
  atelier.link(ab, 'then', acast, 'exec').link(agi, 'result', acast, 'object');
  say(atelier, acast, 'failed', 'cast échoué');
  const aget = atelier.node('var.getExternal', { owner: jeu.cls.id, variable: compteur });
  atelier.link(acast, 'as', aget, 'target');
  const printed = sayInt(atelier, acast, 'then', aget, 'value');
  const pget = atelier.node('var.getExternal', { owner: jeu.cls.id, variable: porteVar });
  const valid = atelier.node('flow.isValid');
  atelier.link(acast, 'as', pget, 'target').link(printed, 'then', valid, 'exec').link(pget, 'value', valid, 'object');
  say(atelier, valid, 'valid', 'porte valide');
  say(atelier, valid, 'notValid', 'porte None');
  pb.project.editorLevelId = b.value.id;
  pb.place(atelier, 0, 0);
  pb.project.editorLevelId = pb.project.levels[0].id;
  return { p: pb.project, jeu, porte, atelier };
}

const prints = (g: Game) => g.journal.log.filter((l) => l.message !== undefined).map((l) => l.message);
const giVar = (g: Game, name: string) => {
  const v = g.world.classOf(g.gameInstance)?.variables.find((x) => x.name === name);
  return v ? g.gameInstance.vars[v.id] : undefined;
};

function travel(p: Project): Game {
  const g = new Game(p);
  g.start();
  g.world.teleportPlayer(300, 0);
  g.step();
  g.step();
  return g;
}

describe('the GameInstance', () => {
  it('Event Init runs once, before the first BeginPlay; Get Game Instance and Cast To give it', () => {
    const g = new Game(setup().p);
    g.start();
    expect(prints(g)).toEqual(['init', '11']);
    expect(g.gameInstance.objectName).toBe('BP_Jeu_C_0');
    expect(giVar(g, 'Compteur')).toBe(11);
  });

  it('is the same object after Open Level: its variables are kept, Event Init does not run again', () => {
    const g = travel(setup().p);
    expect(g.level.name).toBe('Lvl_Atelier');
    expect(prints(g).filter((m) => m === 'init')).toHaveLength(1);
    expect(prints(g)).toContain('11');
    expect(prints(g).slice(-2)).toEqual(['11', 'porte None']);
  });

  it('a reference it kept to an actor of the old level is None in the new one', () => {
    const g = new Game(setup().p);
    g.start();
    expect(giVar(g, 'Porte')).toEqual({ ref: 'actor', id: expect.any(String) });
    g.world.teleportPlayer(300, 0);
    g.step();
    g.step();
    expect(giVar(g, 'Porte')).toBeNull();
  });

  it('without Game Instance Class, the game makes a plain GameInstance: the Cast To fails', () => {
    const g = new Game(setup(false).p);
    g.start();
    expect(g.gameInstance.classId).toBeUndefined();
    expect(g.gameInstance.objectName).toBe('GameInstance_0');
    expect(prints(g)).toEqual(['cast échoué']);
  });

  it('Stop: End Play In Editor everywhere, then Event Shutdown; nothing runs after', () => {
    const { p, porte } = setup();
    const end = porte.node('event.endPlay');
    const sw = porte.node('flow.switchEnum', { enum: 'EEndPlayReason' });
    porte.link(end, 'then', sw, 'exec').link(end, 'reason', sw, 'selection');
    say(porte, sw, 'case2', 'end play in editor');
    const g = new Game(p);
    g.start();
    g.shutdown();
    expect(prints(g).slice(-2)).toEqual(['end play in editor', 'shutdown']);
    const before = g.journal.log.length;
    g.step();
    g.shutdown();
    expect(g.journal.log.length).toBe(before);
    expect(g.over).toBe(true);
  });

  it('Stop while paused at a breakpoint: the paused chain is dropped, Shutdown still runs', () => {
    const { p, jeu } = setup();
    const setNode = Object.values(jeu.graph.nodes).find((n) => n.def === 'var.set')!.id;
    const g = new Game(p, { breakpoints: new Set([setNode]) });
    g.start();
    expect(g.world.paused).toBeTruthy();
    g.shutdown();
    expect(prints(g)).toEqual(['shutdown']);
  });
});

describe('Quit Game', () => {
  function quitter(preference = 0) {
    const t = setup();
    const quit = t.porte.node('game.quitGame', {}, { preference });
    const overlap = Object.values(t.porte.graph.nodes).find((n) => n.def === 'event.actorBeginOverlap')!.id;
    const open = Object.values(t.porte.graph.nodes).find((n) => n.def === 'level.open')!.id;
    delete t.porte.graph.links[Object.values(t.porte.graph.links).find((l) => l.from.node === overlap && l.to.node === open)!.id];
    t.porte.link(overlap, 'then', quit, 'exec');
    say(t.porte, quit, 'then', 'après quit');
    const g = new Game(t.p);
    g.start();
    g.world.teleportPlayer(300, 0);
    g.step();
    return g;
  }

  it('is not immediate: the chain finishes, then at the next frame the game closes with Shutdown', () => {
    const g = quitter();
    expect(prints(g).at(-1)).toBe('après quit');
    expect(g.over).toBe(false);
    g.step();
    expect(g.over).toBe(true);
    expect(g.quitted).toBe(true);
    expect(prints(g).at(-1)).toBe('shutdown');
    expect(g.journal.log.some((l) => l.text.includes('Quit Game'))).toBe(true);
  });

  it('Quit Preference Background: the game goes on', () => {
    const g = quitter(1);
    g.step();
    g.step();
    expect(g.over).toBe(false);
  });

  it('the checker sees it: cx.quitted(), cx.gameInstance()', () => {
    const t = setup();
    const seen: Record<string, unknown> = {};
    const lesson = {
      kind: 'build',
      scenario: [{ teleport: [300, 0] }, { wait: 0.2 }],
      checks: [
        {
          id: 'fin',
          label: 'fin',
          test: (cx: CheckContext) => {
            seen.compteur = cx.gameInstance('Compteur');
            seen.inconnue = cx.gameInstance('Rien');
            seen.quitted = cx.quitted();
            seen.levels = cx.levels();
            return true;
          },
        },
      ],
    } as unknown as Lesson;
    expect(runLesson(lesson, t.p).passed).toBe(true);
    expect(seen).toEqual({ compteur: 11, inconnue: undefined, quitted: false, levels: ['Lvl_Principal', 'Lvl_Atelier'] });
  });
});

describe('the GameInstance class in the editor', () => {
  it('is an object: no components, never placed, Event Init and Shutdown only there', () => {
    const { p, jeu, porte } = setup();
    expect(placeActor(p, jeu.cls.id, 0, 0).ok).toBe(false);
    // Through the compiler (the palette leaves out the same nodes).
    jeu.node('event.beginPlay');
    porte.node('event.gameInit');
    const errs = (b: ClassBuilder) => compileClass(b.cls, p).messages.filter((d) => d.severity === 'error').map((d) => d.code);
    expect(errs(jeu)).toContain('notInGameInstance');
    expect(errs(porte)).toContain('gameInstanceOnly');
  });

  it('stays in its family; removing it clears Game Instance Class', () => {
    const { p, jeu } = setup();
    expect(setParentClass(p, jeu.cls.id, 'Actor').ok).toBe(false);
    expect(p.mapsModes?.gameInstanceClass).toBe(jeu.cls.id);
    expect(removeClass(p, jeu.cls.id).ok).toBe(true);
    expect(p.mapsModes?.gameInstanceClass).toBeUndefined();
  });

  it('Game Instance Class takes only a GameInstance Blueprint', () => {
    const { p, porte } = setup(false);
    expect(setGameInstanceClass(p, porte.cls.id).ok).toBe(false);
    expect(setGameInstanceClass(p, '').ok).toBe(true);
  });

  it('saved and read back with its Game Instance Class; a lost class is dropped', () => {
    const { p, jeu } = setup();
    expect(PROJECT_FORMAT).toBeGreaterThanOrEqual(16);
    const back = parseProject(serializeProject(p));
    expect(back.mapsModes?.gameInstanceClass).toBe(jeu.cls.id);
    const broken = JSON.parse(serializeProject(p));
    broken.project.mapsModes.gameInstanceClass = 'c_nulle';
    expect(parseProject(JSON.stringify(broken)).mapsModes?.gameInstanceClass).toBeUndefined();
  });
});
