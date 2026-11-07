/** Flow control and latent nodes, following UE's documented behaviour. */
import { selectOptions, stringCases } from '../../nodes/library/switch';
import { RESUME, type Behavior } from './types';

export const flowBehaviors: Record<string, Behavior> = {
  'flow.branch': {
    exec: (cx) => (cx.bool('condition') ? ['true'] : ['false']),
  },

  'flow.sequence': {
    exec: (cx) => {
      const n = Math.max(1, Number(cx.node.config.outputs ?? 2));
      return Array.from({ length: n }, (_, i) => `then${i}`);
    },
  },

  'flow.doOnce': {
    exec: (cx) => {
      const st = cx.state(() => ({ ready: false, closed: false }));
      if (!st.ready) {
        st.ready = true;
        st.closed = cx.bool('startClosed');
      }
      if (cx.entry === 'reset') {
        st.closed = false;
        return [];
      }
      if (st.closed) return [];
      st.closed = true;
      return ['completed'];
    },
  },

  'flow.flipFlop': {
    exec: (cx) => {
      const st = cx.state(() => ({ nextIsA: true }));
      const isA = st.nextIsA;
      st.nextIsA = !isA;
      cx.out('isA', isA);
      return [isA ? 'a' : 'b'];
    },
  },

  'flow.gate': {
    exec: (cx) => {
      const st = cx.state(() => ({ ready: false, open: true }));
      if (!st.ready) {
        st.ready = true;
        st.open = !cx.bool('startClosed');
      }
      switch (cx.entry) {
        case 'open':
          st.open = true;
          return [];
        case 'close':
          st.open = false;
          return [];
        case 'toggle':
          st.open = !st.open;
          return [];
        default:
          return st.open ? ['exit'] : [];
      }
    },
  },

  'flow.forLoop': {
    // Like UE's macro: Last Index is re-read at every iteration, and the
    // whole loop runs before anything else (a Delay inside fires once).
    exec: (cx) => {
      const st = cx.state(() => ({ i: 0 }));
      if (cx.entry === RESUME) st.i += 1;
      else st.i = Math.trunc(cx.num('first'));
      if (st.i <= Math.trunc(cx.num('last'))) {
        cx.out('index', st.i);
        cx.resume();
        return ['body'];
      }
      return ['completed'];
    },
  },

  'flow.forLoopWithBreak': {
    exec: (cx) => {
      const st = cx.state(() => ({ i: 0, broken: false }));
      if (cx.entry === 'break') {
        // The loop is checked again when its body ends: it will stop there.
        st.broken = true;
        return [];
      }
      if (cx.entry === RESUME) st.i += 1;
      else {
        st.i = Math.trunc(cx.num('first'));
        st.broken = false;
      }
      if (!st.broken && st.i <= Math.trunc(cx.num('last'))) {
        cx.out('index', st.i);
        cx.resume();
        return ['body'];
      }
      return ['completed'];
    },
  },

  'flow.whileLoop': {
    // Condition is pulled again before every pass, like UE's macro.
    exec: (cx) => {
      if (cx.bool('condition')) {
        cx.resume();
        return ['body'];
      }
      return ['completed'];
    },
  },

  'flow.doN': {
    exec: (cx) => {
      const st = cx.state(() => ({ count: 0 }));
      if (cx.entry === 'reset') {
        st.count = 0;
        return [];
      }
      if (st.count >= Math.trunc(cx.num('n'))) return [];
      st.count += 1;
      cx.out('counter', st.count);
      return ['exit'];
    },
  },

  'flow.multiGate': {
    exec: (cx) => {
      const count = Math.max(1, Number(cx.node.config.outputs ?? 2));
      const st = cx.state(() => ({ used: [] as number[], next: -1 }));
      if (cx.entry === 'reset') {
        st.used = [];
        st.next = -1;
        return [];
      }
      if (st.used.length >= count) {
        if (!cx.bool('loop')) return [];
        st.used = [];
      }
      let pick: number;
      if (cx.bool('isRandom')) {
        const free = Array.from({ length: count }, (_, i) => i).filter((i) => !st.used.includes(i));
        pick = free[Math.floor(cx.world.random() * free.length)];
      } else {
        const start = Math.trunc(cx.num('startIndex'));
        pick = st.used.length === 0 && start >= 0 && start < count ? start : (st.next + 1) % count;
        while (st.used.includes(pick)) pick = (pick + 1) % count;
      }
      st.used.push(pick);
      st.next = pick;
      return [`out${pick}`];
    },
  },

  'flow.switchInt': {
    exec: (cx) => {
      const sel = Math.trunc(cx.num('selection'));
      const start = Math.trunc(Number(cx.node.config.start ?? 0));
      const count = Number(cx.node.config.cases ?? 2);
      return sel >= start && sel < start + count ? [`case${sel}`] : ['default'];
    },
  },

  'flow.switchString': {
    exec: (cx) => {
      const sel = cx.str('selection');
      const strict = cx.node.config.caseSensitive === 'true';
      const i = stringCases(cx.node.config.names).findIndex((c) => (strict ? c === sel : c.toLowerCase() === sel.toLowerCase()));
      return i >= 0 ? [`case${i}`] : ['default'];
    },
  },

  'flow.switchEnum': {
    exec: (cx) => [`case${Math.trunc(cx.num('selection'))}`],
  },

  'util.select': {
    pure: (cx) => {
      const raw = cx.in('index');
      const i = typeof raw === 'boolean' ? Number(raw) : Math.trunc(Number(raw) || 0);
      const count = selectOptions(cx.node, cx.ctx.project).length;
      // Out of range: UE returns the type's default value.
      return { result: i >= 0 && i < count ? cx.in(`option${i}`) : null };
    },
  },

  'util.reroute': {
    // A white-wire Reroute just passes execution on.
    exec: () => ['out'],
  },

  'time.delay': {
    // A Delay already counting ignores new calls.
    exec: (cx) => {
      if (!cx.latentActive()) cx.startLatent(Math.max(0, cx.num('duration')), 'completed');
      return [];
    },
  },

  'time.retriggerableDelay': {
    // Each new call restarts the countdown.
    exec: (cx) => {
      cx.startLatent(Math.max(0, cx.num('duration')), 'completed');
      return [];
    },
  },
};
