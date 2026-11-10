/** Mutators for the timeline held by a Timeline node. */
import type { Graph } from '../model/project';
import type { NodeContext } from '../nodes/definition';
import { newTrack, readTimeline, timelineConfig, type TimelineData } from '../nodes/library/timeline';
import { uniqueName } from '../model/project';
import { pruneInvalidLinks } from './graphOps';

const round = (n: number, step: number) => Math.round(n / step) * step;

/** Keeps a timeline sane: positive length, keys inside it, sorted, on a 0.01 grid. */
export function normalizeTimeline(data: TimelineData): TimelineData {
  const length = Math.max(0.05, Math.min(60, round(data.length, 0.01)));
  return {
    ...data,
    name: data.name.trim() || 'Timeline',
    length,
    tracks: data.tracks.map((t) => ({
      ...t,
      name: t.name.trim() || 'Track',
      keys: t.keys
        .map((k) => ({ t: Math.max(0, Math.min(length, round(k.t, 0.01))), v: round(k.v, 0.001) }))
        .sort((a, b) => a.t - b.t),
    })),
  };
}

/** Replace the node's timeline; wires on the pins of removed tracks go away. */
export function setTimeline(graph: Graph, nodeId: string, data: TimelineData, ctx: NodeContext): void {
  const node = graph.nodes[nodeId];
  if (!node) return;
  Object.assign(node.config, timelineConfig(normalizeTimeline(data)));
  pruneInvalidLinks(graph, ctx);
}

export function addTimelineTrack(graph: Graph, nodeId: string, ctx: NodeContext): string | undefined {
  const node = graph.nodes[nodeId];
  if (!node) return undefined;
  const data = readTimeline(node);
  const track = newTrack(uniqueName('NewTrack', data.tracks.map((t) => t.name)), data.length);
  setTimeline(graph, nodeId, { ...data, tracks: [...data.tracks, track] }, ctx);
  return track.id;
}
