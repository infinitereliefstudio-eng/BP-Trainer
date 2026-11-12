/**
 * The review of a solution that works: how it compares with the known
 * solutions (size, extra nodes), whether it uses nodes that are a poor fit
 * for this lesson, and one overall grade. Never blocking.
 */
import type { LessonRun, RobustnessResult } from '../lessons/runner';
import type { Avoid, Lesson } from '../lessons/types';
import type { Project } from '../model/project';
import { contextFor, nodeTitle } from '../nodes/registry';
import type { Advice } from './advice';

/** Nodes that carry no logic: they do not count in a solution's size. */
const FREE = new Set(['util.comment', 'util.reroute']);

/** Node titles of a project, with how many of each. */
export function nodeCensus(p: Project): Map<string, number> {
  const out = new Map<string, number>();
  for (const cls of p.classes) {
    const ctx = contextFor(cls, p);
    for (const g of cls.graphs) {
      for (const n of Object.values(g.nodes)) {
        if (FREE.has(n.def)) continue;
        const t = nodeTitle(n, ctx);
        out.set(t, (out.get(t) ?? 0) + 1);
      }
    }
  }
  return out;
}

const total = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);

/** What `a` has more of than `b`, biggest first. */
function surplus(a: Map<string, number>, b: Map<string, number>): { title: string; count: number }[] {
  const out: { title: string; count: number }[] = [];
  for (const [title, n] of a) {
    const d = n - (b.get(title) ?? 0);
    if (d > 0) out.push({ title, count: d });
  }
  return out.sort((x, y) => y.count - x.count || x.title.localeCompare(y.title));
}

const sum = (list: { count: number }[]) => list.reduce((a, b) => a + b.count, 0);

export interface SizeReport {
  /** Nodes of the learner's project, and of the known solution closest to it. */
  mine: number;
  reference: number;
  /** The smallest known solution. */
  smallest: number;
  /** Nodes the lesson's starting project already had: shown sizes leave them out when they can. */
  given: number;
  /** "la solution de référence", or the title of an alternative. */
  closest: string;
  /** compact: no bigger than the closest known solution; close: a little; heavy: clearly more. */
  verdict: 'compact' | 'close' | 'heavy';
  /** What the learner's graph has that the closest solution does not. */
  extra: { title: string; count: number }[];
}

/** The lesson's known solutions: the reference, then each alternative. */
export function knownSolutions(lesson: Lesson): { title: string; project: Project }[] {
  const ref = lesson.setup();
  lesson.solve(ref);
  return [
    { title: 'la solution de référence', project: ref },
    ...(lesson.alternatives ?? []).map((alt) => {
      const p = lesson.setup();
      alt.build(p);
      return { title: `« ${alt.title} »`, project: p };
    }),
  ];
}

export function sizeReport(lesson: Lesson, project: Project): SizeReport | null {
  if (lesson.kind === 'predict') return null;
  const mine = nodeCensus(project);
  const known = knownSolutions(lesson).map((k) => ({ title: k.title, census: nodeCensus(k.project) }));
  const distance = (c: Map<string, number>) => sum(surplus(mine, c)) + sum(surplus(c, mine));
  const closest = known.reduce((best, k) => (distance(k.census) < distance(best.census) ? k : best));
  const m = total(mine);
  const r = total(closest.census);
  const margin = Math.max(2, Math.ceil(r * 0.25));
  return {
    mine: m,
    reference: r,
    smallest: Math.min(...known.map((k) => total(k.census))),
    given: total(nodeCensus(lesson.setup())),
    closest: closest.title,
    verdict: m <= r ? 'compact' : m <= r + margin ? 'close' : 'heavy',
    extra: m > r ? surplus(mine, closest.census).slice(0, 4) : [],
  };
}

export interface AvoidHit {
  avoid: Avoid;
  classId: string;
  graphId: string;
  nodeId: string;
  /** Title of the node found. */
  title: string;
}

/** Nodes of the lesson's "avoid" list that the learner added (the starting project's own do not count). */
export function avoidHits(lesson: Lesson, project: Project): AvoidHit[] {
  if (!lesson.avoid?.length) return [];
  const setup = lesson.setup();
  const given = (className: string, defs: string[]) =>
    (setup.classes.find((c) => c.name === className)?.graphs ?? []).flatMap((g) => Object.values(g.nodes)).filter((n) => defs.includes(n.def)).length;
  const out: AvoidHit[] = [];
  for (const avoid of lesson.avoid) {
    for (const cls of project.classes) {
      if (avoid.in && avoid.in !== cls.name) continue;
      const found = cls.graphs.flatMap((g) =>
        Object.values(g.nodes)
          .filter((n) => avoid.defs.includes(n.def))
          .map((n) => ({ g, n })),
      );
      if (found.length <= given(cls.name, avoid.defs)) continue;
      const { g, n } = found[found.length - 1];
      out.push({ avoid, classId: cls.id, graphId: g.id, nodeId: n.id, title: nodeTitle(n, contextFor(cls, project)) });
      break;
    }
  }
  return out;
}

export interface Point {
  ok: boolean;
  text: string;
}

export interface Verdict {
  /** 3: nothing to change. 2: one or two things to look at. 1: works, but the build is to revisit. */
  stars: 1 | 2 | 3;
  title: string;
  points: Point[];
}

export interface QualityParts {
  robustness: RobustnessResult[];
  advice: Advice[];
  size: SizeReport | null;
  avoided: AvoidHit[];
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

export function verdict(run: LessonRun, q: QualityParts): Verdict {
  const points: Point[] = [];
  const notions = run.results.filter((r) => r.check.notion);
  if (notions.length) {
    const missed = notions.some((r) => !r.ok);
    points.push({ ok: !missed, text: missed ? 'Le comportement est bon, mais sans la notion que la leçon vise.' : 'La notion visée par la leçon est utilisée.' });
  }
  if (q.robustness.length) {
    const failed = q.robustness.filter((r) => !r.ok).length;
    points.push({ ok: !failed, text: failed ? `Ne tient pas dans ${plural(failed, 'situation')} hors énoncé.` : 'Tient aussi dans les situations hors énoncé.' });
  }
  if (q.size) {
    const s = q.size;
    if (s.verdict === 'heavy') points.push({ ok: false, text: `${plural(s.mine - s.reference, 'nœud')} de plus que ${s.closest}.` });
    else if (s.mine < s.smallest) points.push({ ok: true, text: 'Plus compacte que toutes les solutions connues.' });
    else points.push({ ok: true, text: s.verdict === 'compact' ? `Aussi compacte que ${s.closest}.` : `Proche de ${s.closest} en taille.` });
  }
  for (const h of q.avoided) points.push({ ok: false, text: `${h.avoid.label} : il y a mieux dans cette situation.` });
  points.push(q.advice.length ? { ok: false, text: `${plural(q.advice.length, 'conseil')} de construction.` } : { ok: true, text: 'Aucun défaut de construction repéré.' });

  const bad = points.filter((p) => !p.ok).length;
  const stars = bad === 0 ? 3 : bad <= 2 ? 2 : 1;
  return {
    stars,
    title: stars === 3 ? 'Solution solide' : stars === 2 ? 'Bonne solution, des points à revoir' : 'Ça marche, mais la construction est à revoir',
    points,
  };
}
