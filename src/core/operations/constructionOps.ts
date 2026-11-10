/** The Construction Script graph of a class: created the first time it is opened. */
import { CONSTRUCTION_SCRIPT, createGraph, type BlueprintClass, type Graph } from '../model/project';
import { addNode } from './graphOps';

export function constructionGraph(cls: BlueprintClass): Graph | undefined {
  return cls.graphs.find((g) => g.kind === 'construction');
}

/** The class's Construction Script, added with its entry node if the class had none. */
export function ensureConstructionScript(cls: BlueprintClass): Graph {
  const existing = constructionGraph(cls);
  if (existing) return existing;
  const g = createGraph(CONSTRUCTION_SCRIPT, 'construction');
  cls.graphs.push(g);
  addNode(g, 'cs.entry', 64, 96);
  return g;
}
