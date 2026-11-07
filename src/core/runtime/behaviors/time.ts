/** Timers (Set Timer by Event and the Handle functions) and game time. */
import { isRef } from '../world';
import type { Behavior } from './types';

export const timeBehaviors: Record<string, Behavior> = {
  'time.setTimerByEvent': {
    exec: (cx) => {
      const ev = cx.in('event');
      if (!isRef(ev) || ev.ref !== 'delegate') {
        cx.world.runtimeError("Set Timer by Event : la pin Event n'est reliée à aucun Custom Event.");
        cx.out('handle', null);
        return ['then'];
      }
      cx.out('handle', cx.world.setTimer(ev, cx.num('time'), cx.bool('looping')));
      return ['then'];
    },
  },
  'time.clearTimer': {
    exec: (cx) => {
      cx.world.clearTimer(cx.in('handle'));
      cx.writeRef('handle', null);
      return ['then'];
    },
  },
  'time.pauseTimer': {
    exec: (cx) => {
      const t = cx.world.timer(cx.in('handle'));
      if (t) t.paused = true;
      return ['then'];
    },
  },
  'time.unpauseTimer': {
    exec: (cx) => {
      const t = cx.world.timer(cx.in('handle'));
      if (t) t.paused = false;
      return ['then'];
    },
  },
  'time.isTimerActive': {
    pure: (cx) => {
      const t = cx.world.timer(cx.in('handle'));
      return { result: !!t && !t.paused };
    },
  },
  'time.timerRemaining': {
    pure: (cx) => {
      const t = cx.world.timer(cx.in('handle'));
      return { result: t ? Math.max(0, t.remaining) : -1 };
    },
  },
  'time.getGameTime': { pure: (cx) => ({ result: cx.world.time }) },
};
