/**
 * The Designer's preview runs Event Pre Construct, as UE's Designer does
 * (Is Design Time true): what it sets (Set Text on a widget…) is drawn. A
 * throwaway simulation runs it, never started: no BeginPlay, no Tick.
 */
import { findClass, type BlueprintClass, type Project } from '../model/project';
import { Simulation } from '../runtime/simulation';
import type { ExtraChildren, PropsOverride } from './layout';

/** Does the Widget Blueprint, or one placed in its Designer, have a wired Event Pre Construct? */
function hasPreConstruct(project: Project, cls: BlueprintClass, depth = 0): boolean {
  if (depth > 8) return false;
  for (const g of cls.graphs) {
    for (const n of Object.values(g.nodes)) {
      if (n.def === 'event.preConstruct' && Object.values(g.links).some((l) => l.from.node === n.id)) return true;
    }
  }
  return (cls.widgets ?? []).some((w) => {
    const inner = w.kind === 'UserWidget' && w.classId ? findClass(project, w.classId) : undefined;
    return !!inner && inner.id !== cls.id && hasPreConstruct(project, inner, depth + 1);
  });
}

export interface DesignPreview {
  override: PropsOverride;
  extra: ExtraChildren;
  /** Blueprint Runtime Errors of the run, as the Output Log would show them. */
  errors: string[];
}

/** The preview of a Widget Blueprint after its Pre Construct, or undefined when it has none. */
export function previewOverride(project: Project, classId: string): DesignPreview | undefined {
  const cls = findClass(project, classId);
  if (cls?.parent !== 'UserWidget' || !hasPreConstruct(project, cls)) return undefined;
  const sim = new Simulation(project);
  const before = sim.log.length;
  const obj = sim.designTime(classId);
  if (!obj) return undefined;
  const at = `@${obj.id}/`;
  return {
    override: (path) => sim.umg.override(at + path),
    extra: (path, w) => sim.umg.extra(at + path, w),
    errors: sim.log.slice(before).filter((l) => l.level === 'error').map((l) => l.text),
  };
}
