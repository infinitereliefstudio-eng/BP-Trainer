/** V7.47: Open Level (by Name), Get Current Level Name, the Game that makes a new world at each travel. */
import { describe, expect, it } from 'vitest';
import { type ClassBuilder, ProjectBuilder } from '../src/core/lessons/builder';
import { runLesson } from '../src/core/lessons/runner';
import type { CheckContext, Lesson } from '../src/core/lessons/types';
import { PROJECT_FORMAT, type Project } from '../src/core/model/project';
import { addLevel } from '../src/core/operations/levelAssetOps';
import { Game } from '../src/core/runtime/game';
import { parseProject } from '../src/core/serialization/serialize';
import { addWidget } from '../src/core/operations/widgetOps';

const say = (b: ClassBuilder, after: string, pin: string, text: string): string => {
  const p = b.node('debug.printString', {}, { text });
  b.link(after, pin, p, 'exec');
  return p;
};

/**
 * Lvl_Principal: BP_Porte at (300, 0). Walking into it: Print « avant », Open
 * Level, Print « après », Spawn BP_Temoin. Its BeginPlay shows WBP_HUD and
 * starts a Delay of 5 s; its End Play prints the reason. Lvl_Atelier: BP_Atelier,
 * whose BeginPlay prints the level's name, with and without prefix.
 */
function setup(target = 'Lvl_Atelier') {
  const pb = new ProjectBuilder('open-level');
  const hud = pb.blueprint('WBP_HUD', 'UserWidget');
  const canvas = addWidget(pb.project, hud.cls, 'CanvasPanel');
  if (!canvas.ok) throw new Error(canvas.reason);
  say(hud, hud.node('event.destruct'), 'then', 'destruct HUD');

  const temoin = pb.blueprint('BP_Temoin');
  say(temoin, temoin.node('event.beginPlay'), 'then', 'témoin');

  const porte = pb.blueprint('BP_Porte');
  porte.component('BoxCollision', 'Zone', { sizeX: 120, sizeY: 120 });
  const overlap = porte.node('event.actorBeginOverlap');
  const before = say(porte, overlap, 'then', 'avant');
  const open = porte.node('level.open', {}, { level: target });
  porte.link(before, 'then', open, 'exec');
  const after = say(porte, open, 'then', 'après');
  const spawn = porte.node('actor.spawn', {}, { class: temoin.cls.id });
  porte.link(after, 'then', spawn, 'exec');
  const begin = porte.node('event.beginPlay');
  const create = porte.node('widget.create', {}, { class: hud.cls.id });
  const add = porte.node('widget.addToViewport');
  const delay = porte.node('time.delay', {}, { duration: 5 });
  porte.link(begin, 'then', create, 'exec').link(create, 'then', add, 'exec').link(create, 'result', add, 'target').link(add, 'then', delay, 'exec');
  say(porte, delay, 'completed', 'delay fini');
  const end = porte.node('event.endPlay');
  const sw = porte.node('flow.switchEnum', { enum: 'EEndPlayReason' });
  porte.link(end, 'then', sw, 'exec').link(end, 'reason', sw, 'selection');
  const endPrint = say(porte, sw, 'case1', 'end play Level Transition');
  pb.place(porte, 300, 0);
  pb.playerStart(0, 0);

  const b = addLevel(pb.project, 'Lvl_Atelier');
  if (!b.ok) throw new Error(b.reason);
  const atelier = pb.blueprint('BP_Atelier');
  const ab = atelier.node('event.beginPlay');
  const name = atelier.node('level.currentName');
  const p1 = atelier.node('debug.printString');
  atelier.link(ab, 'then', p1, 'exec').link(name, 'result', p1, 'text');
  const raw = atelier.node('level.currentName', {}, { removePrefix: false });
  const p2 = atelier.node('debug.printString');
  atelier.link(p1, 'then', p2, 'exec').link(raw, 'result', p2, 'text');
  pb.project.editorLevelId = b.value.id;
  pb.place(atelier, 0, 0);
  b.value.playerStart = { x: -200, y: 50, yaw: 90 };
  pb.project.editorLevelId = pb.project.levels[0].id;
  return { p: pb.project, endPrint };
}

const prints = (g: Game) => g.journal.log.filter((l) => l.message !== undefined).map((l) => l.message);
const labels = (g: Game) => g.world.actors.map((a) => a.label);

/** Into the door: the frame in which Open Level runs. */
function enterDoor(p: Project): Game {
  const g = new Game(p);
  g.start();
  g.world.teleportPlayer(300, 0);
  g.step();
  return g;
}

describe('Open Level (by Name)', () => {
  it('is not immediate: the chain goes on, and the level is still the old one until the next frame', () => {
    const g = enterDoor(setup().p);
    expect(prints(g)).toEqual(['avant', 'après', 'témoin']);
    expect(g.level.name).toBe('Lvl_Principal');
    expect(g.world.travel?.level).toBe('Lvl_Atelier');
    expect(labels(g)).toContain('BP_Temoin1');
  });

  it('at the next frame: Destruct, End Play (Level Transition), then a new world that begins play', () => {
    const g = enterDoor(setup().p);
    const old = g.world;
    g.step();
    expect(g.world).not.toBe(old);
    expect(g.level.name).toBe('Lvl_Atelier');
    expect(g.visited).toEqual(['Lvl_Principal', 'Lvl_Atelier']);
    expect(prints(g)).toEqual(['avant', 'après', 'témoin', 'destruct HUD', 'end play Level Transition', 'Lvl_Atelier', 'UEDPIE_0_Lvl_Atelier']);
    expect(g.journal.log.some((l) => l.text.startsWith('LogLoad: LoadMap: /Game/Lvl_Atelier'))).toBe(true);
  });

  it('leaves the old world behind: its actors (spawned after Open Level too), widgets and Delays', () => {
    const g = enterDoor(setup().p);
    g.step();
    expect(labels(g)).toEqual(['BP_Atelier']);
    expect(g.world.umg.viewport()).toEqual([]);
    expect([g.world.player.x, g.world.player.y, g.world.player.yaw]).toEqual([-200, 50, 90]);
    expect(g.world.time).toBeCloseTo(1 / 60);
    for (let i = 0; i < 6 * 60; i++) g.step();
    expect(prints(g)).not.toContain('delay fini');
  });

  it('keeps the Output Log, the on-screen messages and the joystick from one world to the next', () => {
    const g = enterDoor(setup().p);
    g.move = { x: 1, y: 0 };
    const shown = g.world.screen.map((m) => m.text);
    g.step();
    expect(g.world.screen.map((m) => m.text)).toEqual(expect.arrayContaining(shown));
    expect(g.move).toEqual({ x: 1, y: 0 });
    // Print String's 2 s: the messages of the old world go at their time, not later.
    for (let i = 0; i < 2 * 60; i++) g.step();
    expect(g.world.screen.map((m) => m.text)).not.toContain('avant');
  });

  it('an unknown name: Travel Failure in the Output Log, the game goes on in the same level', () => {
    const g = enterDoor(setup('Lvl_Nulle').p);
    const old = g.world;
    g.step();
    g.step();
    expect(g.world).toBe(old);
    expect(g.level.name).toBe('Lvl_Principal');
    expect(g.world.travel).toBeUndefined();
    expect(g.journal.log.filter((l) => l.level === 'error').map((l) => l.text)).toEqual([expect.stringContaining("Travel Failure: PackageMissing, Failed to load package '/Game/Lvl_Nulle'")]);
    expect(prints(g)).not.toContain('end play Level Transition');
    expect(g.world.time).toBeCloseTo(3 / 60);
  });

  it('finds the level whatever the case, as UE’s names', () => {
    const g = enterDoor(setup('lvl_atelier').p);
    g.step();
    expect(g.level.name).toBe('Lvl_Atelier');
  });

  it('waits for a breakpoint in End Play, then travels once it is over', () => {
    const t = setup();
    const g = new Game(t.p, { breakpoints: new Set([t.endPrint]) });
    g.start();
    g.world.teleportPlayer(300, 0);
    g.step();
    const old = g.world;
    g.step();
    expect(old.paused).toBeTruthy();
    expect(g.world).toBe(old);
    g.step();
    expect(g.world).toBe(old);
    g.resume();
    g.step();
    expect(g.level.name).toBe('Lvl_Atelier');
    expect(prints(g)).toContain('end play Level Transition');
  });
});

describe('the checker follows the travel', () => {
  it('cx.sim is the new world, cx.level() and cx.levels() say where the game is', () => {
    const { p } = setup();
    const seen: Record<string, unknown> = {};
    const lesson = {
      kind: 'build',
      scenario: [{ teleport: [300, 0] }, { checkpoint: 'porte' }, { wait: 0.5 }],
      checks: [
        {
          id: 'porte',
          label: 'porte',
          at: 'porte',
          test: (cx: CheckContext) => {
            seen.atDoor = cx.level();
            return true;
          },
        },
        {
          id: 'fin',
          label: 'fin',
          test: (cx: CheckContext) => {
            seen.level = cx.level();
            seen.levels = cx.levels();
            seen.actors = cx.sim.actors.map((a) => a.label);
            seen.prints = cx.prints();
            return true;
          },
        },
      ],
    } as unknown as Lesson;
    expect(runLesson(lesson, p).passed).toBe(true);
    // The checkpoint comes after the frame of Open Level: the travel is done first, as at the start of the next frame.
    expect(seen.atDoor).toBe('Lvl_Atelier');
    expect(seen.level).toBe('Lvl_Atelier');
    expect(seen.levels).toEqual(['Lvl_Principal', 'Lvl_Atelier']);
    expect(seen.actors).toEqual(['BP_Atelier']);
    expect(seen.prints).toEqual(['avant', 'après', 'témoin', 'destruct HUD', 'end play Level Transition', 'Lvl_Atelier', 'UEDPIE_0_Lvl_Atelier']);
  });
});

describe('format 15', () => {
  it('opens a format-14 project unchanged, refuses a newer one', () => {
    const { p } = setup();
    const file = (format: number) => JSON.stringify({ kind: 'bp-trainer-project', format, project: { ...p, format } });
    expect(PROJECT_FORMAT).toBe(15);
    const back = parseProject(file(14));
    expect(back.format).toBe(15);
    expect(back.levels.map((l) => l.name)).toEqual(['Lvl_Principal', 'Lvl_Atelier']);
    expect(() => parseProject(file(16))).toThrow(/plus récente/);
  });
});
