/** V7.55: the GameMode's Get Default Pawn Class For Controller (Functions › Override), and Stop then Play into a level. */
import { describe, expect, it } from 'vitest';
import { ClassBuilder, ProjectBuilder } from '../src/core/lessons/builder';
import { runLesson } from '../src/core/lessons/runner';
import type { CheckContext, Lesson } from '../src/core/lessons/types';
import { overrideFunction, renameFunction } from '../src/core/operations/functionOps';
import { ensureDefaultGameMode } from '../src/core/operations/gameModeOps';
import { addLevel, setGameInstanceClass } from '../src/core/operations/levelAssetOps';
import { setPlayerClass } from '../src/core/operations/projectOps';
import { Game } from '../src/core/runtime/game';
import { T } from '../src/core/types/pins';

const say = (b: ClassBuilder, after: string, pin: string, text: string): string => {
  const p = b.node('debug.printString', {}, { text });
  b.link(after, pin, p, 'exec');
  return p;
};
const prints = (g: Game) => g.journal.log.filter((l) => l.message !== undefined).map((l) => l.message);

/**
 * BP_Agent (the Default Pawn Class) and BP_Drone, each printing its name at
 * BeginPlay and in its Construction Script. BP_Jeu keeps Avatar (a Pawn
 * class), `chosen` by default. BP_GameMode overrides Get Default Pawn Class
 * For Controller: it returns Avatar (`wired` false: the Return Node is left empty).
 */
function setup(chosen: 'BP_Drone' | '' = 'BP_Drone', wired = true) {
  const pb = new ProjectBuilder('pawn-class');
  const agent = pb.blueprint('BP_Agent', 'Pawn');
  const drone = pb.blueprint('BP_Drone', 'Pawn');
  for (const b of [agent, drone]) {
    say(b, b.node('event.beginPlay'), 'then', `begin ${b.cls.name}`);
    b.cls.graphs.push({ id: `cs_${b.cls.name}`, name: 'ConstructionScript', kind: 'construction', nodes: {}, links: {} });
    const cs = b.inGraph(`cs_${b.cls.name}`);
    say(cs, cs.node('cs.entry'), 'then', `construct ${b.cls.name}`);
  }
  setPlayerClass(pb.project, agent.cls.id);
  const jeu = pb.blueprint('BP_Jeu', 'GameInstance');
  const avatar = jeu.variable('Avatar', T.class('Pawn'), chosen === 'BP_Drone' ? drone.cls.id : null);
  setGameInstanceClass(pb.project, jeu.cls.id);
  const gm = ensureDefaultGameMode(pb.project);
  if (!gm.ok) throw new Error(gm.reason);
  const o = overrideFunction(pb.project, gm.value, 'GetDefaultPawnClassForController');
  if (!o.ok) throw new Error(o.reason);
  if (wired) {
    const f = new ClassBuilder(gm.value, pb.project).inGraph(o.value.id);
    const ret = Object.values(o.value.nodes).find((n) => n.def === 'fn.return')!.id;
    const entry = Object.values(o.value.nodes).find((n) => n.def === 'fn.entry')!.id;
    for (const id of Object.keys(o.value.links)) delete o.value.links[id];
    const cast = f.node('cast.to', { class: jeu.cls.id });
    f.link(entry, 'then', cast, 'exec').link(f.node('game.getGameInstance'), 'result', cast, 'object').link(cast, 'then', ret, 'exec');
    const get = f.node('var.getExternal', { owner: jeu.cls.id, variable: avatar });
    f.link(cast, 'as', get, 'target').link(get, 'value', ret, o.value.fn!.outputs[0].id);
  }
  pb.playerStart(-100, 50, 90);
  return { pb, p: pb.project, gm: gm.value, graph: o.value, avatar, jeu, drone, agent };
}

describe('Get Default Pawn Class For Controller', () => {
  it('has UE’s name and signature, which cannot change', () => {
    const { gm, graph } = setup();
    expect(graph.name).toBe('GetDefaultPawnClassForController');
    expect(graph.fn!.inputs.map((x) => x.name)).toEqual(['In Controller']);
    expect(graph.fn!.outputs[0].type).toEqual({ category: 'class', subtype: 'Pawn' });
    expect(renameFunction(gm, graph.id, 'Autre').ok).toBe(false);
  });

  it('the GameMode makes one pawn, of the class returned: its Construction Script and BeginPlay only, at the Player Start', () => {
    const { p } = setup();
    const g = new Game(p);
    g.start();
    expect(g.world.player.className).toBe('BP_Drone');
    expect([g.world.player.x, g.world.player.y, g.world.player.yaw]).toEqual([-100, 50, 90]);
    expect(prints(g)).toEqual(['construct BP_Drone', 'begin BP_Drone']);
    expect(prints(g)).not.toContain('begin BP_Agent');
  });

  it('returning None: a warning, and the Default Pawn Class stays', () => {
    const { p } = setup('');
    const g = new Game(p);
    g.start();
    expect(g.world.player.className).toBe('BP_Agent');
    expect(g.journal.log.some((l) => l.text.includes('Get Default Pawn Class For Controller') && l.text.includes('None'))).toBe(true);
  });

  it('the class kept in the GameInstance before Open Level makes the pawn of the next level', () => {
    const { pb, p, jeu, avatar, drone } = setup('');
    const menu = pb.blueprint('BP_Menu');
    const cast = menu.node('cast.to', { class: jeu.cls.id });
    const set = menu.node('var.setExternal', { owner: jeu.cls.id, variable: avatar }, { value: drone.cls.id });
    menu.link(menu.node('event.beginPlay'), 'then', cast, 'exec').link(menu.node('game.getGameInstance'), 'result', cast, 'object');
    menu.link(cast, 'then', set, 'exec').link(cast, 'as', set, 'target').link(set, 'then', menu.node('level.open', {}, { level: 'Lvl_Jeu' }), 'exec');
    pb.place(menu, 300, 0);
    if (!addLevel(p, 'Lvl_Jeu').ok) throw new Error('level');
    const g = new Game(p);
    g.start();
    expect(g.world.player.className).toBe('BP_Agent');
    g.step();
    g.step();
    expect(g.level.name).toBe('Lvl_Jeu');
    expect(g.world.player.className).toBe('BP_Drone');
  });

  it('a Return Node left empty is None: the Default Pawn Class, with the warning', () => {
    const { p } = setup('BP_Drone', false);
    const g = new Game(p);
    g.start();
    expect(g.world.player.className).toBe('BP_Agent');
  });
});

describe('Stop, then Play into a level (scenario step restart with level)', () => {
  it('the checker plays the next game from that level', () => {
    const { p } = setup('');
    if (!addLevel(p, 'Lvl_Jeu').ok) throw new Error('level');
    const seen: string[] = [];
    const lesson = {
      kind: 'build',
      scenario: [{ wait: 0.1 }, { restart: true, level: 'Lvl_Jeu' }, { wait: 0.1 }],
      checks: [{ id: 'where', label: 'où', test: (cx: CheckContext) => {
            seen.push(cx.level());
            return true;
          },
        },
      ],
    } as unknown as Lesson;
    runLesson(lesson, p);
    expect(seen.at(-1)).toBe('Lvl_Jeu');
  });
});
