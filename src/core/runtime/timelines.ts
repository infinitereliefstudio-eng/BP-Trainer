/**
 * Timelines at runtime: one playback state per Timeline node and actor,
 * advanced once per frame like UE's FTimeline::TickTimeline.
 */
import { trackPin, trackValue, type TimelineData } from '../nodes/library/timeline';
import type { RValue, TimelineRT } from './world';

export function newTimelineState(graphId: string): TimelineRT {
  return { graphId, pos: 0, playing: false, reverse: false };
}

/** Advance a playing timeline by `dt`; true when it reached its end (or its start, in reverse) and stopped. */
export function advanceTimeline(tl: TimelineRT, data: TimelineData, dt: number): boolean {
  const len = data.length;
  let pos = tl.pos + (tl.reverse ? -dt : dt);
  let finished = false;
  if (!tl.reverse && pos > len) {
    if (data.loop && len > 0) pos %= len;
    else {
      pos = len;
      tl.playing = false;
      finished = true;
    }
  } else if (tl.reverse && pos < 0) {
    if (data.loop && len > 0) pos = len + (pos % len);
    else {
      pos = 0;
      tl.playing = false;
      finished = true;
    }
  }
  tl.pos = pos;
  return finished;
}

/** What the node's data pins hold at the timeline's current position. */
export function timelineOutputs(tl: TimelineRT, data: TimelineData): Record<string, RValue> {
  const out: Record<string, RValue> = { direction: tl.reverse ? 1 : 0 };
  for (const t of data.tracks) out[trackPin(t.id)] = trackValue(t, tl.pos);
  return out;
}
