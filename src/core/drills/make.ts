/**
 * From a family and a seed to a drill, as an ordinary Lesson: the editor,
 * the checker, the help, the attempt log and the practice workspace all
 * work with it unchanged. The seed decides everything, so the same id
 * always gives the same drill:
 * - its situation: seed % S (S situations in the family);
 * - its format: ⌊seed / S⌋ % 3 (complete, repair, rebuild);
 * - its numbers, its variant, its gaps or its mistake: drawn from rng(seed).
 */
import { removeNodes } from '../operations/graphOps';
import { edit } from '../lessons/builder';
import { DEBUG_METHOD, gap, wipe } from '../lessons/library/kit';
import type { Lesson, LessonCard, LessonKind } from '../lessons/types';
import type { Project } from '../model/project';
import { rng } from './rng';
import { DRILL_FORMATS, type DrillFormat, type Family, type Gap, type Mistake, type Situation } from './types';

export const DRILL_PREFIX = 'drill:';

export const drillId = (family: string, seed: number) => `${DRILL_PREFIX}${family}:${seed}`;

/** The family and seed of a drill id, if it is one. */
export function parseDrillId(id: string): { family: string; seed: number } | undefined {
  const m = /^drill:([a-z0-9-]+):(\d+)$/.exec(id);
  return m ? { family: m[1], seed: Number(m[2]) } : undefined;
}

/** The seed of a given situation and format; `round` changes the numbers and the mistake. */
export function seedOf(family: Family, situation: number, format: DrillFormat, round: number): number {
  const s = family.situations.length;
  return situation + s * DRILL_FORMATS.indexOf(format) + s * DRILL_FORMATS.length * round;
}

/** What a seed decides, before anything is built. */
export interface DrillPlan<P = unknown> {
  family: Family;
  seed: number;
  situation: Situation<P>;
  format: DrillFormat;
  params: P;
  /** The nodes taken out ("complete"). */
  gaps?: Gap[];
  /** The mistake put in ("repair"). */
  mistake?: Mistake<P>;
}

export function planOf(family: Family, seed: number): DrillPlan {
  const s = family.situations.length;
  const situation = family.situations[seed % s];
  const format = DRILL_FORMATS[Math.floor(seed / s) % DRILL_FORMATS.length];
  const r = rng(seed);
  const params = situation.params(r);
  const plan: DrillPlan = { family, seed, situation, format, params };
  if (format === 'complete') plan.gaps = r.pick(situation.gaps);
  if (format === 'repair') plan.mistake = r.pick(situation.mistakes.filter((m) => m.applies?.(params) ?? true));
  return plan;
}

/** The project with the reference chain built in the learner's graph; its nodes by role. */
export function withChain(plan: DrillPlan): { project: Project; roles: Record<string, string> } {
  const project = plan.situation.base(plan.params);
  const roles = plan.situation.chain(edit(project, plan.situation.className), project, plan.params);
  return { project, roles };
}

function setupOf(plan: DrillPlan): Project {
  if (plan.format === 'rebuild') return plan.situation.base(plan.params);
  const { project, roles } = withChain(plan);
  if (plan.mistake) plan.mistake.apply(project, roles, plan.params);
  if (plan.gaps) {
    const b = edit(project, plan.situation.className);
    for (const g of plan.gaps) {
      const n = b.graph.nodes[roles[g.role]];
      removeNodes(b.graph, [n.id]);
      gap(b, g.label, [n.x - 20, n.y - 40], 260, 160);
    }
  }
  return project;
}

const FORMAT_KIND: Record<DrillFormat, LessonKind> = { complete: 'complete', repair: 'debug', rebuild: 'build' };

function introCard(plan: DrillPlan): LessonCard {
  const name = plan.situation.className;
  if (plan.format === 'complete') {
    const list = (plan.gaps ?? []).map((g) => `**${g.label}**`).join(', ');
    return {
      title: 'Ce qui est à faire',
      body: `Le graphe de **${name}** est presque fini. Les **cadres jaunes** marquent les nœuds manquants : ${list}. Pose-les et relie-les, puis touche **Vérifier**.`,
    };
  }
  if (plan.format === 'repair') {
    return {
      title: 'Ce qui est à faire',
      body: `Le graphe de **${name}** est complet, mais il ne fait pas ce qu’il faut : **une seule erreur** s’y cache. Lance ▶ Play, observe, trouve-la et corrige-la, sans tout refaire.`,
    };
  }
  return {
    title: 'Ce qui est à faire',
    body: `Le graphe de **${name}** est vide ; les composants et les variables sont en place. Construis la chaîne de mémoire, sans regarder ta solution de la leçon.`,
  };
}

/** The drill a family gives for a seed. */
export function makeDrill(family: Family, seed: number): Lesson {
  const plan = planOf(family, seed);
  const { situation: sit, params, format } = plan;
  const cards: LessonCard[] = [{ title: 'La situation', body: sit.situation(params) }, introCard(plan)];
  if (format === 'repair') cards.push(DEBUG_METHOD);
  const verb = format === 'repair' ? 'Corrige le graphe pour que' : format === 'complete' ? 'Complète le graphe pour que' : 'Construis le graphe pour que';
  const [first, ...rest] = sit.objectives(params);
  return {
    id: drillId(family.id, seed),
    kind: FORMAT_KIND[format],
    module: family.title,
    level: family.level,
    number: 0,
    title: sit.title,
    situation: sit.situation(params),
    notions: sit.notions,
    remember: sit.remember,
    cards,
    objectives: [`${verb} : ${first.charAt(0).toLowerCase()}${first.slice(1)}`, ...rest],
    hints: sit.hints(params),
    setup: () => setupOf(plan),
    scenario: sit.scenario(params),
    checks: sit.checks(params),
    solve(p) {
      const b = edit(p, sit.className);
      wipe(b.graph);
      sit.chain(b, p, params);
    },
    drill: { family: family.id, seed, format, situation: sit.id },
  };
}
