/**
 * Array functions. Arrays passed by reference are the variable's own array
 * (a Get node hands it over as is), so changing it in place changes the
 * variable, like UE's by-ref array pins.
 */
import type { RValue } from '../world';
import { copyValue, sameValue } from '../values';
import type { Behavior, ExecCx, ValueCx } from './types';

const list = (cx: ValueCx): RValue[] | null => {
  const a = cx.in('array');
  return Array.isArray(a) ? a : null;
};

/** UE logs this exact warning for an index out of bounds. */
function outOfBounds(cx: ValueCx, index: number, length: number): void {
  cx.world.runtimeError(`Attempted to access index ${index} from array of length ${length}!`);
}

function change(fn: (arr: RValue[], cx: ExecCx) => void): Behavior {
  return {
    exec: (cx) => {
      const arr = list(cx);
      if (arr) fn(arr, cx);
      return ['then'];
    },
  };
}

export const arrayBehaviors: Record<string, Behavior> = {
  'array.add': change((arr, cx) => {
    arr.push(copyValue(cx.in('item')));
    cx.out('index', arr.length - 1);
  }),
  'array.addUnique': change((arr, cx) => {
    const item = cx.in('item');
    if (arr.some((x) => sameValue(x, item))) cx.out('index', -1);
    else {
      arr.push(copyValue(item));
      cx.out('index', arr.length - 1);
    }
  }),
  'array.insert': change((arr, cx) => {
    const i = Math.trunc(cx.num('index'));
    if (i < 0 || i > arr.length) return outOfBounds(cx, i, arr.length);
    arr.splice(i, 0, copyValue(cx.in('item')));
  }),
  'array.removeIndex': change((arr, cx) => {
    const i = Math.trunc(cx.num('index'));
    if (i < 0 || i >= arr.length) return outOfBounds(cx, i, arr.length);
    arr.splice(i, 1);
  }),
  'array.removeItem': change((arr, cx) => {
    const item = cx.in('item');
    const before = arr.length;
    for (let i = arr.length - 1; i >= 0; i--) if (sameValue(arr[i], item)) arr.splice(i, 1);
    cx.out('result', arr.length !== before);
  }),
  'array.set': change((arr, cx) => {
    const i = Math.trunc(cx.num('index'));
    if (i >= arr.length && cx.bool('sizeToFit')) {
      while (arr.length <= i) arr.push(null);
    }
    if (i < 0 || i >= arr.length) return outOfBounds(cx, i, arr.length);
    arr[i] = copyValue(cx.in('item'));
  }),
  'array.clear': change((arr) => {
    arr.length = 0;
  }),

  'array.get': {
    pure: (cx) => {
      const arr = list(cx) ?? [];
      const i = Math.trunc(cx.num('index'));
      if (i < 0 || i >= arr.length) {
        outOfBounds(cx, i, arr.length);
        return { item: null };
      }
      return { item: copyValue(arr[i]) };
    },
  },
  'array.contains': {
    pure: (cx) => {
      const item = cx.in('item');
      return { result: (list(cx) ?? []).some((x) => sameValue(x, item)) };
    },
  },
  'array.find': {
    pure: (cx) => {
      const item = cx.in('item');
      return { index: (list(cx) ?? []).findIndex((x) => sameValue(x, item)) };
    },
  },
  'array.lastIndex': { pure: (cx) => ({ result: (list(cx) ?? []).length - 1 }) },
  'array.isEmpty': { pure: (cx) => ({ result: (list(cx) ?? []).length === 0 }) },
  'array.random': {
    pure: (cx) => {
      const arr = list(cx) ?? [];
      if (!arr.length) return { item: null, index: -1 };
      const i = Math.floor(cx.world.random() * arr.length);
      return { item: copyValue(arr[i]), index: i };
    },
  },
};
