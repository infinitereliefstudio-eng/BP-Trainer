/**
 * The track editor of a Timeline node, UE's double-click on a Timeline:
 * length, Loop, Auto Play, and for each track a curve whose keys are added
 * with a tap and moved with a finger.
 */
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { readTimeline, TIMELINE_NODE, type TimelineData, type TimelineKey } from '@core/nodes/library/timeline';
import { addTimelineTrack, normalizeTimeline, setTimeline } from '@core/operations/timelineOps';
import { useStore } from '../hooks';
import { Check, NumberField, TextCommit } from '../panels/fields';
import { useOwnTap } from '../widgets/useOwnTap';

const PAD = { l: 44, r: 14, t: 14, b: 24 };
/** Finger-sized: a key is grabbed within this many pixels. */
const GRAB = 24;

interface DragState {
  keys: TimelineKey[];
  index: number;
  range: [number, number];
}

function valueRange(keys: TimelineKey[]): [number, number] {
  const vs = keys.map((k) => k.v);
  const lo = Math.min(0, ...vs),
    hi = Math.max(1, ...vs);
  return [lo, hi];
}

const fmt = (n: number) => String(+n.toFixed(3)).replace('.', ',');

export function TimelineEditor({ nodeId, onClose }: { nodeId: string; onClose: () => void }) {
  const store = useStore();
  const tap = useOwnTap();
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 480, h: 170 });
  const [trackId, setTrackId] = useState<string | undefined>(undefined);
  const [sel, setSel] = useState<number | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ w: Math.max(200, el.clientWidth), h: Math.max(110, el.clientHeight) });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const node = store.graph.nodes[nodeId];
  if (!node || node.def !== TIMELINE_NODE) return null;
  const data = readTimeline(node);
  const track = data.tracks.find((t) => t.id === trackId) ?? data.tracks[0];
  const keys = drag?.keys ?? track?.keys ?? [];
  const [lo, hi] = drag?.range ?? valueRange(keys);
  const span = hi - lo || 1;
  const plotW = size.w - PAD.l - PAD.r,
    plotH = size.h - PAD.t - PAD.b;
  const px = (t: number) => PAD.l + (data.length ? t / data.length : 0) * plotW;
  const py = (v: number) => PAD.t + ((hi - v) / span) * plotH;

  const commit = (next: TimelineData, label = 'Modifier le Timeline') => store.apply(label, (_c, g) => setTimeline(g, nodeId, next, store.ctx));
  const withKeys = (next: TimelineKey[]): TimelineData => ({ ...data, tracks: data.tracks.map((t) => (t.id === track?.id ? { ...t, keys: next } : t)) });
  /** Commit keys and keep `key` selected wherever sorting put it. */
  const commitKeys = (next: TimelineKey[], key?: TimelineKey, label?: string) => {
    const norm = normalizeTimeline(withKeys(next));
    commit(norm, label);
    const sorted = norm.tracks.find((t) => t.id === track?.id)?.keys ?? [];
    const i = key ? sorted.findIndex((k) => Math.abs(k.t - key.t) < 0.006 && Math.abs(k.v - key.v) < 0.0006) : -1;
    setSel(i >= 0 ? i : null);
  };

  const at = (e: PointerEvent, range: [number, number]): TimelineKey => {
    const r = box.current!.getBoundingClientRect();
    const t = ((e.clientX - r.left - PAD.l) / plotW) * data.length;
    const v = range[1] - ((e.clientY - r.top - PAD.t) / plotH) * (range[1] - range[0]);
    // Snap to a readable grid: hundredths of a second, hundredths of the range.
    const stepV = (range[1] - range[0]) / 100;
    return { t: Math.round(Math.max(0, Math.min(data.length, t)) * 100) / 100, v: Math.round(v / stepV) * stepV };
  };

  const down = (e: PointerEvent) => {
    if (!track) return;
    e.preventDefault();
    const r = box.current!.getBoundingClientRect();
    const x = e.clientX - r.left,
      y = e.clientY - r.top;
    let best = -1,
      bestD = GRAB;
    track.keys.forEach((k, i) => {
      const d = Math.hypot(px(k.t) - x, py(k.v) - y);
      if (d < bestD) {
        best = i;
        bestD = d;
      }
    });
    const range = valueRange(track.keys);
    if (best < 0) {
      if (x < PAD.l - 8 || y > size.h - PAD.b + 10) return;
      const key = at(e, range);
      key.v = Math.max(range[0], Math.min(range[1], key.v));
      commitKeys([...track.keys, key], key, 'Ajouter un point clé');
      return;
    }
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    // While dragging, the scale stays put, with room to go past the current extremes.
    const room = (range[1] - range[0]) * 0.5;
    setSel(best);
    setDrag({ keys: track.keys.map((k) => ({ ...k })), index: best, range: [range[0] - room, range[1] + room] });
  };

  const move = (e: PointerEvent) => {
    if (!drag) return;
    const next = drag.keys.map((k) => ({ ...k }));
    next[drag.index] = at(e, drag.range);
    setDrag({ ...drag, keys: next });
  };

  const up = () => {
    if (!drag) return;
    const moved = drag.keys[drag.index];
    setDrag(null);
    commitKeys(drag.keys, moved, 'Déplacer un point clé');
  };

  const selected = sel !== null ? keys[drag ? drag.index : sel] : undefined;
  const setSelected = (patch: Partial<TimelineKey>) => {
    if (sel === null || !track) return;
    const next = track.keys.map((k, i) => (i === sel ? { ...k, ...patch } : k));
    commitKeys(next, next[sel]);
  };
  const path = keys.length
    ? [...keys]
        .sort((a, b) => a.t - b.t)
        .map((k, i) => `${i ? 'L' : 'M'}${px(k.t).toFixed(1)},${py(k.v).toFixed(1)}`)
        .join(' ')
    : '';
  const sorted = [...keys].sort((a, b) => a.t - b.t);
  const lead = sorted.length ? `M${px(0)},${py(sorted[0].v)} L${px(sorted[0].t)},${py(sorted[0].v)}` : '';
  const tail = sorted.length ? `M${px(sorted[sorted.length - 1].t)},${py(sorted[sorted.length - 1].v)} L${px(data.length)},${py(sorted[sorted.length - 1].v)}` : '';

  return (
    <div class="sheet-backdrop" {...tap.root} onClick={tap.guard(onClose)}>
      <div class="sheet timeline-editor" onClick={(e) => e.stopPropagation()}>
        <div class="palette-head">
          <span class="eyebrow">Timeline</span>
          <span class="tl-name">
            <TextCommit value={data.name} onCommit={(v) => commit({ ...data, name: v }, 'Renommer le Timeline')} />
          </span>
          <span class="tl-opt">
            Length
            <NumberField value={data.length} unit="s" onCommit={(n) => commit({ ...data, length: n }, 'Durée du Timeline')} />
          </span>
          <span class="tl-opt">
            <Check checked={data.loop} onChange={(v) => commit({ ...data, loop: v }, 'Loop')} /> Loop
          </span>
          <span class="tl-opt">
            <Check checked={data.autoPlay} onChange={(v) => commit({ ...data, autoPlay: v }, 'Auto Play')} /> Auto Play
          </span>
          <span class="tb-spacer" />
          <button class="btn" onClick={tap.guard(onClose)}>
            Fermer
          </button>
        </div>
        <div class="tl-tracks">
          {data.tracks.map((t) => (
            <button
              key={t.id}
              class={`chip${t.id === track?.id ? ' on' : ''}`}
              onClick={() => {
                setTrackId(t.id);
                setSel(null);
              }}
            >
              {t.name}
            </button>
          ))}
          <button
            class="chip"
            onClick={() => {
              const id = store.apply('Ajouter une piste', (_c, g) => addTimelineTrack(g, nodeId, store.ctx));
              if (id) setTrackId(id);
              setSel(null);
            }}
          >
            + Piste Float
          </button>
          {track && (
            <>
              <span class="tl-rename">
                <TextCommit
                  value={track.name}
                  onCommit={(v) => commit({ ...data, tracks: data.tracks.map((t) => (t.id === track.id ? { ...t, name: v } : t)) }, 'Renommer la piste')}
                />
              </span>
              {data.tracks.length > 1 && (
                <button
                  class="chip danger"
                  onClick={() => {
                    commit({ ...data, tracks: data.tracks.filter((t) => t.id !== track.id) }, 'Supprimer la piste');
                    setTrackId(undefined);
                    setSel(null);
                  }}
                >
                  Supprimer la piste
                </button>
              )}
            </>
          )}
        </div>
        <div class="tl-plot" ref={box}>
          <svg width={size.w} height={size.h} role="img" aria-label={`Courbe de la piste ${track?.name ?? ''}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
            <title>Courbe de la piste</title>
            <rect x={PAD.l} y={PAD.t} width={plotW} height={plotH} class="tl-bg" />
            {[0, 0.25, 0.5, 0.75, 1].map((f) => (
              <g key={f}>
                <line x1={PAD.l + f * plotW} y1={PAD.t} x2={PAD.l + f * plotW} y2={PAD.t + plotH} class="tl-grid" />
                <text x={PAD.l + f * plotW} y={size.h - 7} class="tl-label" text-anchor="middle">
                  {fmt(f * data.length)} s
                </text>
              </g>
            ))}
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line x1={PAD.l} y1={PAD.t + f * plotH} x2={PAD.l + plotW} y2={PAD.t + f * plotH} class="tl-grid" />
                <text x={PAD.l - 6} y={PAD.t + f * plotH + 4} class="tl-label" text-anchor="end">
                  {fmt(hi - f * span)}
                </text>
              </g>
            ))}
            <path d={`${lead} ${tail}`} class="tl-hold" />
            <path d={path} class="tl-curve" />
            {keys.map((k, i) => (
              <circle key={i} cx={px(k.t)} cy={py(k.v)} r={(drag ? drag.index : sel) === i ? 10 : 7} class={`tl-key${(drag ? drag.index : sel) === i ? ' on' : ''}`} />
            ))}
          </svg>
        </div>
        <div class="tl-foot">
          {selected ? (
            <>
              <span class="tl-opt">
                Time
                <NumberField value={+selected.t.toFixed(2)} unit="s" onCommit={(n) => setSelected({ t: n })} />
              </span>
              <span class="tl-opt">
                Value
                <NumberField value={+selected.v.toFixed(3)} onCommit={(n) => setSelected({ v: n })} />
              </span>
              <button
                class="btn danger"
                disabled={!!drag}
                onClick={() => {
                  if (sel !== null && track) commitKeys(track.keys.filter((_k, i) => i !== sel), undefined, 'Supprimer un point clé');
                }}
              >
                Supprimer le point
              </button>
            </>
          ) : (
            <span class="muted small">Touche la courbe pour ajouter un point clé ; glisse un point pour le déplacer. Entre deux points, la valeur varie en ligne droite.</span>
          )}
        </div>
      </div>
    </div>
  );
}
