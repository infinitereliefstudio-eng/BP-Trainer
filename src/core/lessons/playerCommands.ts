/**
 * Commands through the Player Controller (V7.58, review of the path's
 * progression). « Interagir comme dans UE5 » teaches that an object of the
 * level listening to the keys itself (Auto Receive Input) is UE4's reflex:
 * in UE5 the Player Controller (or the pawn) receives the action and tells
 * the object. Steps written before that, and placed after it, are presented
 * that way:
 *
 * - each Input Action event of an object of the level becomes a Custom Event
 *   of the same meaning (IA_Tirer → Tirer), and the object loses Auto Receive
 *   Input;
 * - BP_PlayerController receives the action and calls that event: Get Actor
 *   Of Class → the event when the level has one such object, Get All Actors
 *   Of Class → For Each Loop → the event when it has several (each heard the
 *   key before: each still gets the call);
 * - `learnerWrites` leaves that Player Controller line out of the starting
 *   project: the learner writes it (a recall of the Player Controller).
 *
 * Like asEnhancedInput, the lesson keeps its own code: its solution,
 * alternatives and robustness cases run on the action form, then are
 * converted again. Applied after asEnhancedInput (index.ts).
 */
import { addNode, connect, removeNodes } from '../operations/graphOps';
import { contextFor } from '../nodes/registry';
import type { BlueprintClass, Graph, NodeInstance, Project } from '../model/project';
import type { Check, Lesson, LessonCard } from './types';
import { PLAYER_CONTEXT, PLAYER_CONTROLLER } from './ue5Input';

export interface CommandSpec {
  /** The Custom Event of an Input Action, by action name, when « the name without IA_ » would not say what it does. */
  events?: Record<string, string>;
  /** Actions whose Player Controller line the learner writes: it is not in the starting project. */
  learnerWrites?: string[];
}

/** One command: an Input Action, the object class that reacts to it, the Custom Event called on it. */
interface Command {
  actionName: string;
  className: string;
  event: string;
}

/** Ids change from one setup() to the next: a command is resolved in each project by its names. */
const ids = (p: Project, c: Command) => ({
  action: p.inputActions?.find((a) => a.name === c.actionName)?.id ?? '',
  cls: p.classes.find((x) => x.name === c.className),
});
const same = (a: Command, b: Command) => a.actionName === b.actionName && a.className === b.className;

const must = <T>(r: { ok: true; value: T } | { ok: false; reason: string }): T => {
  if (!r.ok) throw new Error(r.reason);
  return r.value;
};

const isObject = (c: BlueprintClass) => c.parent === 'Actor';
const eventName = (spec: CommandSpec, actionName: string) => spec.events?.[actionName] ?? actionName.replace(/^IA_/, '');

function instances(p: Project, classId: string): number {
  return p.levels.reduce((n, l) => n + l.actors.filter((a) => a.classId === classId).length, 0);
}

function lowestY(g: Graph): number {
  return Object.values(g.nodes).reduce((y, n) => Math.max(y, n.y), 0);
}

/** The commands a project's objects listen to (action form). */
function commandsOf(p: Project, spec: CommandSpec): Command[] {
  const out: Command[] = [];
  for (const c of p.classes.filter(isObject)) {
    for (const g of c.graphs) {
      for (const n of Object.values(g.nodes)) {
        if (n.def !== 'input.action') continue;
        const a = p.inputActions?.find((x) => x.id === n.config.action);
        const cmd = { actionName: a?.name ?? '', className: c.name, event: eventName(spec, a?.name ?? '') };
        if (!a || out.some((o) => same(o, cmd))) continue;
        out.push(cmd);
      }
    }
  }
  return out;
}

const customEvents = (c: BlueprintClass, name: string): { g: Graph; n: NodeInstance }[] =>
  c.graphs.flatMap((g) => Object.values(g.nodes).filter((n) => n.def === 'event.custom' && n.config.name === name).map((n) => ({ g, n })));

/** The Player Controller line of a command: does BP_PlayerController call this event already? */
function hasLine(p: Project, pc: BlueprintClass, cmd: Command): boolean {
  const owner = ids(p, cmd).cls?.id;
  return pc.graphs.some((g) => Object.values(g.nodes).some((n) => n.def === 'call.custom' && n.config.owner === owner && n.config.event === cmd.event));
}

function addLine(p: Project, pc: BlueprintClass, cmd: Command): void {
  const g = pc.graphs[0];
  const ctx = contextFor(pc, p);
  const { action, cls } = ids(p, cmd);
  const classId = cls!.id;
  const y = lowestY(g) + 260;
  const node = (def: string, x: number, dy: number, config: Record<string, string> = {}, defaults: Record<string, string> = {}) => {
    const n = must(addNode(g, def, x, y + dy, config));
    Object.assign(n.defaults, defaults);
    return n.id;
  };
  const link = (a: string, ap: string, b: string, bp: string) => must(connect(g, { node: a, pin: ap }, { node: b, pin: bp }, ctx));
  const ev = node('input.action', 64, 0, { action });
  const call = node('call.custom', 1040, 0, { owner: classId, event: cmd.event });
  if (instances(p, classId) > 1) {
    const all = node('actor.getAllOfClass', 380, 0, {}, { class: classId });
    const loop = node('flow.forEachLoop', 700, 0);
    link(ev, 'started', all, 'exec');
    link(all, 'then', loop, 'exec');
    link(all, 'actors', loop, 'array');
    link(loop, 'body', call, 'exec');
    link(loop, 'element', call, 'target');
  } else {
    const one = node('actor.getOfClass', 380, 0, {}, { class: classId });
    link(ev, 'started', one, 'exec');
    link(one, 'then', call, 'exec');
    link(one, 'result', call, 'target');
  }
}

/** Objects' action events → Custom Events; the Player Controller calls them (unless `omit`). Idempotent. */
function toCommands(p: Project, spec: CommandSpec, omit: Set<string>): void {
  const cmds = commandsOf(p, spec);
  for (const c of p.classes.filter(isObject)) {
    for (const g of c.graphs) {
      for (const n of Object.values(g.nodes)) {
        if (n.def !== 'input.action') continue;
        const name = p.inputActions?.find((a) => a.id === n.config.action)?.name;
        const cmd = cmds.find((x) => x.actionName === name && x.className === c.name)!;
        if (customEvents(c, cmd.event).length) throw new Error(`${c.name} a déjà un Custom Event ${cmd.event} : nomme celui de ${cmd.actionName} (spec.events)`);
        const ev = must(addNode(g, 'event.custom', n.x, n.y, { name: cmd.event }));
        for (const l of Object.values(g.links)) {
          if (l.from.node !== n.id) continue;
          if (l.from.pin !== 'started') throw new Error(`${c.name} : ${cmd.actionName} sort par ${l.from.pin}, pas Started`);
          l.from = { node: ev.id, pin: 'then' };
        }
        removeNodes(g, [n.id]);
      }
    }
    if (cmds.some((x) => x.className === c.name)) c.autoReceiveInput = false;
  }
  const pc = p.classes.find((c) => c.name === PLAYER_CONTROLLER);
  if (!pc) throw new Error(`${PLAYER_CONTROLLER} manque : asEnhancedInput d’abord`);
  for (const cmd of cmds) if (!omit.has(cmd.actionName) && !hasLine(p, pc, cmd)) addLine(p, pc, cmd);
}

/**
 * Back to the action form, to run lesson code written for it. `added` are
 * the empty Custom Events the starting project gained for commands only the
 * solution listens to: removed while still empty, so that the lesson code
 * adds its own.
 */
function fromCommands(p: Project, cmds: Command[], added: Command[]): void {
  for (const cmd of cmds) {
    const { action, cls: c } = ids(p, cmd);
    if (!c) continue;
    for (const { g, n } of customEvents(c, cmd.event)) {
      const empty = !Object.values(g.links).some((l) => l.from.node === n.id);
      if (empty && added.some((a) => same(a, cmd))) {
        removeNodes(g, [n.id]);
        continue;
      }
      const act = must(addNode(g, 'input.action', n.x, n.y, { action }));
      for (const l of Object.values(g.links)) if (l.from.node === n.id) l.from = { node: act.id, pin: 'started' };
      removeNodes(g, [n.id]);
    }
    c.autoReceiveInput = true;
  }
}

/** Words that named an object's action event now name its Custom Event. */
function retext(text: string, cmds: Command[]): string {
  // The action's own name, where it stays, is kept apart (\uE000n\uE001) until the bare names are replaced.
  const keep: string[] = [];
  const kept = (a: string) => `\uE000${keep.push(a) - 1}\uE001`;
  let t = text;
  for (const cmd of cmds) {
    const a = cmd.actionName;
    const e = cmd.event;
    const by = `que ${PLAYER_CONTROLLER} appelle sur ${kept(a)}`;
    t = t
      .replace(new RegExp(`entend (\\*\\*)?${a}(\\*\\*)?`, 'g'), `a un Custom Event **${e}**, ${by}`)
      .replace(new RegExp(`\\*\\*${a}\\*\\* \\(Started, `, 'g'), `**Event ${e}** (${kept(a)}, `)
      .replace(new RegExp(`\\*\\*${a}\\*\\* \\(Started\\)`, 'g'), `**Event ${e}**`)
      .replace(new RegExp(`\\*\\*${a}\\*\\*`, 'g'), `**Event ${e}**`)
      .replace(new RegExp(`(?<!action )(?<!\\w)${a}(?!\\w)( \\(Started\\))?`, 'g'), `Event ${e}`);
  }
  return t.replace(/\uE000(\d+)\uE001/g, (_, i) => keep[Number(i)]);
}

/** How the Player Controller reaches the objects of a command. */
const reach = (p: Project, c: Command) =>
  instances(p, ids(p, c).cls!.id) > 1 ? `Get All Actors Of Class (${c.className}) → For Each Loop → ${c.event}` : `Get Actor Of Class (${c.className}) → ${c.event}`;

const LIST = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} et ${xs.at(-1)}`);

function commandsCard(p: Project, cmds: Command[], writes: Command[]): LessonCard {
  const line = (c: Command) => `- **${c.actionName}** → ${reach(p, c)}${writes.includes(c) ? ' : **à écrire**' : ''}`;
  return {
    title: 'Les commandes, comme dans UE5',
    body:
      `Le projet est réglé comme le template Third Person d’UE5 : **${PLAYER_CONTROLLER}** (Player Controller Class) ajoute **${PLAYER_CONTEXT}** au BeginPlay. Dans l’événement d’une action, **Started** sort une fois quand on appuie.\n\n` +
      `Aucun objet du niveau n’écoute de touche (comme dans « Interagir comme dans UE5 ») : c’est ${PLAYER_CONTROLLER} qui reçoit les actions et prévient l’objet en appelant un de ses **Custom Events**.\n\n` +
      `${cmds.map(line).join('\n')}\n\n` +
      'Chercher l’objet au moment de l’appui suffit ici (Get Actor Of Class, ou Get All Actors Of Class quand le niveau en a plusieurs, qui entendaient tous la touche). Dans un vrai jeu, le Player Controller garderait plutôt une référence, ou passerait par l’objet que le joueur vise.',
  };
}

/** The learner writes the Player Controller line of these commands: a blocking check names the place. */
function lineCheck(w: Command, how: string): Check {
  return {
    id: `pc-${w.actionName}`,
    label: `${PLAYER_CONTROLLER} reçoit ${w.actionName}`,
    test: (cx) => {
      const pcs = cx.project.classes.filter((c) => c.parent === 'PlayerController');
      const heard = pcs.some((c) =>
        c.graphs.some((g) =>
          Object.values(g.nodes).some(
            (n) => n.def === 'input.action' && cx.project.inputActions?.find((a) => a.id === n.config.action)?.name === w.actionName && Object.values(g.links).some((l) => l.from.node === n.id),
          ),
        ),
      );
      return heard
        ? true
        : `Dans ${PLAYER_CONTROLLER}, ${w.actionName} (Started) doit prévenir ${w.className} : ${how}. Le joueur reçoit les commandes ; ${w.className} n’écoute aucune touche.`;
    },
  };
}

/**
 * The lesson with its objects' commands received by the Player Controller.
 * Raises the revision: the starting project changes.
 */
export function asPlayerCommands(lesson: Lesson, spec: CommandSpec = {}): Lesson {
  const start = lesson.setup();
  const solved = lesson.setup();
  lesson.solve(solved);
  const startCmds = commandsOf(start, spec);
  const cmds = [...startCmds];
  for (const c of commandsOf(solved, spec)) if (!cmds.some((x) => same(x, c))) cmds.push(c);
  const added = cmds.filter((c) => !startCmds.includes(c));
  const omit = new Set(spec.learnerWrites ?? []);
  const writes = cmds.filter((c) => omit.has(c.actionName));
  if (writes.length !== omit.size) throw new Error(`${lesson.id} : learnerWrites nomme une action qu’aucun objet n’écoute`);

  const convert = (p: Project) => toCommands(p, spec, omit);
  /** Run lesson code written for the action form on a converted project. */
  const onActions = (p: Project, run: (p: Project) => void) => {
    fromCommands(p, cmds, added);
    run(p);
    toCommands(p, spec, new Set());
  };
  const solution = writes.length
    ? ` ${PLAYER_CONTROLLER} : ${writes.map((w) => `${w.actionName} (Started) → ${reach(start, w)}`).join(' ; ')}.`
    : '';
  const cards = lesson.cards.filter((c) => c.title !== 'Les touches, comme dans UE5').map((c) => ({ ...c, body: retext(c.body, cmds) }));
  return {
    ...lesson,
    revision: (lesson.revision ?? 1) + 1,
    setup() {
      const p = lesson.setup();
      convert(p);
      // Events only the solution listened to: there, empty, for the learner to write after.
      for (const c of added) {
        const cls = ids(p, c).cls!;
        cls.autoReceiveInput = false;
        if (customEvents(cls, c.event).length) continue;
        const g = cls.graphs.find((x) => x.kind === 'event') ?? cls.graphs[0];
        must(addNode(g, 'event.custom', 64, lowestY(g) + 260, { name: c.event }));
      }
      const pc = p.classes.find((c) => c.name === PLAYER_CONTROLLER)!;
      for (const c of added) if (!omit.has(c.actionName) && !hasLine(p, pc, c)) addLine(p, pc, c);
      return p;
    },
    situation: retext(lesson.situation, cmds),
    objectives: [
      ...lesson.objectives.map((o) => retext(o, cmds)),
      ...writes.map((w) => `${PLAYER_CONTROLLER} reçoit ${w.actionName} et appelle ${w.event} sur ${w.className}.`),
    ],
    hints: [retext(lesson.hints[0], cmds), retext(lesson.hints[1], cmds) + (writes.length ? ` ${PLAYER_CONTROLLER} : ${LIST([...new Set(writes.flatMap((w) => [w.actionName, ...(reach(start, w).includes('For Each') ? ['Get All Actors Of Class', 'For Each Loop'] : ['Get Actor Of Class']), w.event]))])}.` : ''), retext(lesson.hints[2], cmds) + solution],
    remember: retext(lesson.remember, cmds),
    challenge: lesson.challenge,
    cards: [...cards, commandsCard(start, cmds, writes)],
    checks: [...writes.map((w) => lineCheck(w, reach(start, w))), ...lesson.checks],
    solve: (p) => onActions(p, (q) => lesson.solve(q)),
    alternatives: lesson.alternatives?.map((alt) => ({ ...alt, build: (p: Project) => onActions(p, (q) => alt.build(q)) })),
    robustness: lesson.robustness?.map((r) => (r.mutate ? { ...r, mutate: (p: Project) => onActions(p, (q) => r.mutate?.(q)) } : r)),
  };
}
