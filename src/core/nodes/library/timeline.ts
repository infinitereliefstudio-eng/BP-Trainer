/**
 * Timeline: a value that changes over time along a track, like UE's
 * Timeline node. The whole timeline lives in its node's settings (name,
 * length, loop, tracks with their keys), so duplicating or deleting the node
 * copies or removes the timeline, as in UE.
 */
import { newId } from '../../model/ids';
import { uniqueName, type Graph, type NodeInstance } from '../../model/project';
import { T } from '../../types/pins';
import type { StructValue, Value } from '../../types/values';
import { dataIn, dataOut, execIn, execOut, type NodeDefinition } from '../definition';

export const TIMELINE_NODE = 'timeline.node';

export interface TimelineKey {
  /** Time in seconds. */
  t: number;
  v: number;
}

export interface TimelineTrack {
  id: string;
  name: string;
  /** Sorted by time. Between two keys the value is interpolated linearly. */
  keys: TimelineKey[];
}

export interface TimelineData {
  name: string;
  length: number;
  loop: boolean;
  autoPlay: boolean;
  tracks: TimelineTrack[];
}

const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** The timeline stored in a node's settings, in typed form. */
export function readTimeline(node: NodeInstance): TimelineData {
  const c = node.config;
  const tracks = Array.isArray(c.tracks) ? c.tracks : [];
  return {
    name: String(c.name ?? 'Timeline'),
    length: Math.max(0, num(c.length, 1)),
    loop: !!c.loop,
    autoPlay: !!c.autoPlay,
    tracks: tracks.map((raw) => {
      const t = (raw ?? {}) as StructValue;
      const keys = Array.isArray(t.keys) ? t.keys : [];
      return {
        id: String(t.id ?? ''),
        name: String(t.name ?? 'Track'),
        keys: keys
          .map((k) => ({ t: num((k as StructValue)?.t), v: num((k as StructValue)?.v) }))
          .sort((a, b) => a.t - b.t),
      };
    }),
  };
}

/** Settings holding `data`, to write back with setNodeConfig. */
export function timelineConfig(data: TimelineData): Record<string, Value> {
  return {
    name: data.name,
    length: data.length,
    loop: data.loop,
    autoPlay: data.autoPlay,
    tracks: data.tracks.map((t) => ({ id: t.id, name: t.name, keys: [...t.keys].sort((a, b) => a.t - b.t).map((k) => ({ t: k.t, v: k.v })) })),
  };
}

/** Value of a track at `time`: linear between keys, flat before the first and after the last. */
export function trackValue(track: TimelineTrack, time: number): number {
  const keys = track.keys;
  if (!keys.length) return 0;
  if (time <= keys[0].t) return keys[0].v;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1],
      b = keys[i];
    if (time <= b.t) return b.t === a.t ? b.v : a.v + ((b.v - a.v) * (time - a.t)) / (b.t - a.t);
  }
  return keys[keys.length - 1].v;
}

export const trackPin = (trackId: string) => `track:${trackId}`;

export function newTrack(name: string, length: number): TimelineTrack {
  return { id: newId('trk'), name, keys: [{ t: 0, v: 0 }, { t: length, v: 1 }] };
}

/**
 * A new or copied Timeline node gets a free name (Timeline_0, Timeline_1…).
 * Track ids stay: they only name the node's own pins, so the wires of a copy still fit.
 */
export function nameTimeline(node: NodeInstance, graph: Graph): void {
  const taken = Object.values(graph.nodes)
    .filter((n) => n.def === TIMELINE_NODE && n.id !== node.id)
    .map((n) => String(n.config.name));
  const name = String(node.config.name ?? 'Timeline_0');
  // Timeline_0, Timeline_1… as UE counts them; another name gets UE's usual suffix.
  const m = /^(.*)_(\d+)$/.exec(name);
  if (!m || !taken.includes(name)) {
    node.config.name = uniqueName(name, taken);
    return;
  }
  let n = Number(m[2]);
  while (taken.includes(`${m[1]}_${n}`)) n++;
  node.config.name = `${m[1]}_${n}`;
}

export const timelineNodes: NodeDefinition[] = [
  {
    id: TIMELINE_NODE,
    title: (n) => String(n.config.name ?? 'Timeline'),
    category: 'Add Timeline',
    kind: 'latent',
    allowedIn: ['event'],
    description:
      'Fait évoluer une valeur dans le temps, le long d’une piste. Pendant qu’il joue, Update sort à chaque image avec la valeur de chaque piste ; Finished sort quand il atteint la fin (ou le début, en Reverse). Touche « Éditer la piste » pour régler la durée et les points clés.',
    keywords: ['timeline', 'animation', 'courbe', 'piste', 'lerp', 'fluide', 'porte', 'ouvrir', 'progressif'],
    defaultConfig: {
      name: 'Timeline_0',
      length: 1,
      loop: false,
      autoPlay: false,
      tracks: [{ id: 'trk', name: 'Alpha', keys: [{ t: 0, v: 0 }, { t: 1, v: 1 }] }],
    },
    pins: (n) => [
      execIn('play', 'Play'),
      execIn('playFromStart', 'Play from Start'),
      execIn('stop', 'Stop'),
      execIn('reverse', 'Reverse'),
      execIn('reverseFromEnd', 'Reverse from End'),
      execIn('setNewTime', 'Set New Time'),
      dataIn('newTime', 'New Time', T.float, { default: 0 }),
      execOut('update', 'Update'),
      execOut('finished', 'Finished'),
      dataOut('direction', 'Direction', T.enum('ETimelineDirection')),
      ...readTimeline(n).tracks.map((t) => dataOut(trackPin(t.id), t.name, T.float)),
    ],
  },
];
