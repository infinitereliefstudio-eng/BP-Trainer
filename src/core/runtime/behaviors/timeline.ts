/** The Timeline node's exec inputs. Playing itself is done once per frame by the interpreter. */
import { readTimeline } from '../../nodes/library/timeline';
import { timelineOutputs } from '../timelines';
import type { Behavior } from './types';

export const timelineBehaviors: Record<string, Behavior> = {
  'timeline.node': {
    exec: (cx) => {
      const tl = cx.timeline();
      const data = readTimeline(cx.node);
      switch (cx.entry) {
        case 'play':
          // From the end, the position cannot go further: the value stays, Finished comes again.
          if (tl.pos >= data.length && !data.loop) cx.world.note('timeline.atEnd');
          tl.playing = true;
          tl.reverse = false;
          break;
        case 'playFromStart':
          tl.pos = 0;
          tl.playing = true;
          tl.reverse = false;
          break;
        case 'stop':
          tl.playing = false;
          break;
        case 'reverse':
          if (tl.pos <= 0 && !data.loop) cx.world.note('timeline.atStart');
          tl.playing = true;
          tl.reverse = true;
          break;
        case 'reverseFromEnd':
          tl.pos = data.length;
          tl.playing = true;
          tl.reverse = true;
          break;
        case 'setNewTime': {
          tl.pos = Math.min(Math.max(cx.num('newTime'), 0), data.length);
          for (const [pin, v] of Object.entries(timelineOutputs(tl, data))) cx.out(pin, v);
          return ['update'];
        }
      }
      return [];
    },
  },
};
