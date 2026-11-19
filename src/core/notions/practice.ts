/**
 * Which notions a step makes the learner practise: the nodes its reference
 * solution adds to the starting project, read as notions. Used to check that
 * every notion comes back often enough along the path (spaced practice,
 * tests/spacing.test.ts) and that a step's declared recalls are real.
 */
import type { Project } from '../model/project';
import type { Lesson } from '../lessons/types';

/** Node definition → notion (ids of catalogue.ts). Order matters only for readability. */
const NODE_NOTIONS: [RegExp, string][] = [
  [/^event\.beginPlay$/, 'events'],
  [/^debug\.printString$/, 'print'],
  [/^(component\.(setVisibility|toggleVisibility|setHiddenInGame)|actor\.setHidden)/, 'visibility'],
  [/^component\./, 'components'],
  [/Overlap$/, 'overlap'],
  // Receiving input on an actor (Auto Receive Input, Consume Input): with a key event, or an action event since UE5.
  [/^(event\.inputKey|input\.action)$/, 'input'],
  [/^input\./, 'enhanced-input'],
  [/^(player|pawn)\.getController$/, 'player-controller'],
  [/^var\.(get|set)$/, 'variables'],
  [/^flow\.branch$/, 'branch'],
  [/^(math|logic)\./, 'math'],
  [/^flow\.(doOnce|flipFlop|gate|doN|multiGate)$/, 'flow-memory'],
  [/^flow\.sequence$/, 'sequence'],
  [/^time\.(delay|retriggerableDelay)$/, 'latent'],
  [/^flow\.(forLoop|forEachLoop|whileLoop)/, 'loops'],
  [/^flow\.switch|switch/i, 'switch'],
  [/Enum/, 'enum'],
  [/Rotation/, 'rotation'],
  [/^cast\.to$/, 'cast'],
  [/^var\.(getExternal|setExternal)$/, 'other-bp'],
  [/^actor\.destroy$/, 'destroy'],
  [/^array\./, 'arrays'],
  [/^map\./, 'maps'],
  [/^set\./, 'sets'],
  [/^struct\./, 'structs'],
  [/^dataTable\./, 'data-tables'],
  [/^random\.|^math\.random/, 'random'],
  [/^timeline\./, 'timeline'],
  [/^dispatcher\./, 'dispatchers'],
  [/^(iface\.|event\.interface$)/, 'interfaces'],
  [/^call\.(function|pureFunction)$/, 'functions'],
  [/^var\.(getLocal|setLocal)$/, 'locals'],
  [/^time\.(setTimerByEvent|clearTimer|pauseTimer|unpauseTimer|isTimerActive|timerRemaining)$/, 'timers'],
  [/^actor\.spawn$/, 'spawn'],
  [/^event\.tick$/, 'tick'],
  [/^save\./, 'save-game'],
  [/^call\.parentEvent$|^call\.function$/, 'inheritance'],
  [/^trace\./, 'trace'],
  [/^event\.hit$/, 'hit'],
  [/^(component\.getOwner|actor\.getComponentsByClass|actor\.getComponentByClass|event\.componentDispatcher|dispatcher\.bindNative)$/, 'actor-components'],
];

/** The notions whose practice can be seen in a graph, so whose spacing is checked (not « exec » or « pure »: ideas, not nodes). */
export const SPACED_NOTIONS: ReadonlySet<string> = new Set([...NODE_NOTIONS.map(([, n]) => n), 'construction']);

export function notionsOfNode(def: string): string[] {
  return NODE_NOTIONS.filter(([r]) => r.test(def)).map(([, n]) => n);
}

/**
 * How many nodes of each definition in each Blueprint (« class|def »), and how
 * many nodes in Construction Scripts. Counted per Blueprint: moving a chain
 * to another Blueprint (a refactor) is writing it there.
 */
function census(p: Project): { defs: Map<string, number>; construction: number; parentCalls: number } {
  const defs = new Map<string, number>();
  let construction = 0,
    parentCalls = 0;
  for (const c of p.classes) {
    for (const g of c.graphs) {
      for (const n of Object.values(g.nodes)) {
        const key = `${c.name}|${n.def}`;
        defs.set(key, (defs.get(key) ?? 0) + 1);
        if (g.kind === 'construction' && n.def !== 'cs.entry') construction++;
        if (n.def === 'call.parentEvent' || (n.def === 'call.function' && n.config.parent === true)) parentCalls++;
      }
    }
  }
  return { defs, construction, parentCalls };
}

/** The notions whose nodes the solution adds to the starting project. */
export function writtenNotions(start: Project, solved: Project): Set<string> {
  const a = census(start),
    b = census(solved);
  const out = new Set<string>();
  for (const [key, n] of b.defs) {
    if (n <= (a.defs.get(key) ?? 0)) continue;
    const def = key.slice(key.indexOf('|') + 1);
    // A plain function call is « functions »; a call to the parent's version is « inheritance ».
    for (const notion of notionsOfNode(def)) if (notion !== 'inheritance') out.add(notion);
  }
  if (b.construction > a.construction) out.add('construction');
  if (b.parentCalls > a.parentCalls) out.add('inheritance');
  return out;
}

/** What a step makes the learner write, from its starting project and its reference solution. */
export function practisedBy(lesson: Lesson): Set<string> {
  const start = lesson.setup();
  const solved = lesson.setup();
  lesson.solve(solved);
  return writtenNotions(start, solved);
}

export interface Spacing {
  /** Positions in the path (0-based) where the notion is written. */
  steps: number[];
  /** The longest run of steps without writing it, from the step that teaches it to the end of the path. */
  maxGap: number;
}

/**
 * For each notion, where along the path it is practised, and its longest
 * gap. `taught[i]` and `practised[i]` belong to the i-th step of the path.
 */
export function spacing(taught: string[][], practised: Set<string>[]): Map<string, Spacing> {
  const out = new Map<string, Spacing>();
  const total = practised.length;
  const notions = new Set([...taught.flat(), ...practised.flatMap((s) => [...s])]);
  for (const notion of notions) {
    const first = taught.findIndex((t) => t.includes(notion));
    const steps = practised.map((s, i) => (s.has(notion) ? i : -1)).filter((i) => i >= 0 && (first < 0 || i >= first));
    const start = first >= 0 ? first : (steps[0] ?? total);
    const marks = [start, ...steps.filter((i) => i > start), total];
    let maxGap = 0;
    for (let k = 1; k < marks.length; k++) maxGap = Math.max(maxGap, marks[k] - marks[k - 1]);
    out.set(notion, { steps, maxGap });
  }
  return out;
}
