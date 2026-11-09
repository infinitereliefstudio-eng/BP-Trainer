/**
 * Structures, Sets, Maps, Text and Name. A Set is an array of distinct items
 * and a Map an array of [key, value] pairs; the functions that change them
 * work in place on the variable's own container (diamond pins), like arrays.
 * String and Name keys ignore case, as UE hashes them.
 */
import { formatArgs } from '../../nodes/library/text';
import { shownMembers, structOf } from '../../nodes/library/structs';
import { resolvePins } from '../../nodes/registry';
import { fullStruct, memberValue } from '../../types/structs';
import { defaultValueFor } from '../../types/values';
import type { PinType } from '../../types/pins';
import { copyValue, toInt } from '../values';
import { keyEq } from './equality';
import type { RValue } from '../world';
import type { Behavior, ExecCx, ValueCx } from './types';

const items = (cx: ValueCx, pin: string): RValue[] | null => {
  const a = cx.in(pin);
  return Array.isArray(a) ? a : null;
};

const pinType = (cx: ValueCx, pin: string): PinType | undefined => resolvePins(cx.node, cx.ctx).find((p) => p.id === pin)?.type;

function change(pin: string, fn: (list: RValue[], cx: ExecCx) => void): Behavior {
  return {
    exec: (cx) => {
      const list = items(cx, pin);
      if (list) fn(list, cx);
      return ['then'];
    },
  };
}

const pairs = (list: RValue[]) => list.filter((p): p is RValue[] => Array.isArray(p) && p.length === 2);

export const dataBehaviors: Record<string, Behavior> = {
  // ------------------------------------------------------------ structures
  'struct.make': {
    pure: (cx) => {
      const out: Record<string, RValue> = {};
      for (const m of structOf(cx.ctx, cx.node)?.members ?? []) out[m.id] = copyValue(cx.in(m.id));
      return { struct: out as RValue };
    },
  },
  'struct.break': {
    pure: (cx) => {
      const v = cx.in('struct');
      const out: Record<string, RValue> = {};
      for (const m of structOf(cx.ctx, cx.node)?.members ?? []) out[m.id] = copyValue(memberValue(v, m) as RValue);
      return out;
    },
  },
  'struct.setMembers': {
    // Works on a copy, then writes it back where the pin came from: a
    // variable or "Get (a ref)". Wired to a copy, nothing else changes, as in UE.
    exec: (cx) => {
      const s = structOf(cx.ctx, cx.node);
      const v = (s ? fullStruct(copyValue(cx.in('struct')), s) : {}) as Record<string, RValue>;
      for (const m of shownMembers(cx.ctx, cx.node)) v[m.id] = copyValue(cx.in(m.id));
      cx.writeRef('struct', v as RValue);
      cx.out('out', v as RValue);
      return ['then'];
    },
  },

  // ------------------------------------------------------------------- Set
  'set.add': change('set', (list, cx) => {
    const item = cx.in('item');
    const eq = keyEq(cx, 'item');
    if (!list.some((x) => eq(x, item))) list.push(copyValue(item));
  }),
  'set.remove': change('set', (list, cx) => {
    const item = cx.in('item');
    const eq = keyEq(cx, 'item');
    const i = list.findIndex((x) => eq(x, item));
    if (i >= 0) list.splice(i, 1);
    cx.out('result', i >= 0);
  }),
  'set.clear': change('set', (list) => {
    list.length = 0;
  }),
  'set.contains': {
    pure: (cx) => {
      const item = cx.in('item');
      const eq = keyEq(cx, 'item');
      return { result: (items(cx, 'set') ?? []).some((x) => eq(x, item)) };
    },
  },
  'set.length': { pure: (cx) => ({ result: (items(cx, 'set') ?? []).length }) },
  'set.toArray': { pure: (cx) => ({ result: copyValue(items(cx, 'set') ?? []) }) },

  // ------------------------------------------------------------------- Map
  'map.add': change('map', (list, cx) => {
    const key = cx.in('key');
    const eq = keyEq(cx, 'key');
    const pair = pairs(list).find((p) => eq(p[0], key));
    if (pair) pair[1] = copyValue(cx.in('value'));
    else list.push([copyValue(key), copyValue(cx.in('value'))]);
  }),
  'map.remove': change('map', (list, cx) => {
    const key = cx.in('key');
    const eq = keyEq(cx, 'key');
    const i = list.findIndex((p) => Array.isArray(p) && eq(p[0], key));
    if (i >= 0) list.splice(i, 1);
    cx.out('result', i >= 0);
  }),
  'map.clear': change('map', (list) => {
    list.length = 0;
  }),
  'map.find': {
    pure: (cx) => {
      const key = cx.in('key');
      const eq = keyEq(cx, 'key');
      const pair = pairs(items(cx, 'map') ?? []).find((p) => eq(p[0], key));
      if (pair) return { value: copyValue(pair[1]), result: true };
      const t = pinType(cx, 'value');
      return { value: (t ? defaultValueFor(t) : null) as RValue, result: false };
    },
  },
  'map.contains': {
    pure: (cx) => {
      const key = cx.in('key');
      const eq = keyEq(cx, 'key');
      return { result: pairs(items(cx, 'map') ?? []).some((p) => eq(p[0], key)) };
    },
  },
  'map.length': { pure: (cx) => ({ result: pairs(items(cx, 'map') ?? []).length }) },
  'map.keys': { pure: (cx) => ({ keys: pairs(items(cx, 'map') ?? []).map((p) => copyValue(p[0])) }) },
  'map.values': { pure: (cx) => ({ values: pairs(items(cx, 'map') ?? []).map((p) => copyValue(p[1])) }) },

  // ---------------------------------------------------------- Text and Name
  'conv.stringToText': { pure: (cx) => ({ result: cx.str('in') }) },
  'conv.textToString': { pure: (cx) => ({ result: cx.str('in') }) },
  'conv.intToText': { pure: (cx) => ({ result: String(toInt(cx.num('in'))) }) },
  // UE's To Text (Float) keeps at most three decimals.
  'conv.floatToText': { pure: (cx) => ({ result: String(+cx.num('in').toFixed(3)) }) },
  'conv.boolToText': { pure: (cx) => ({ result: cx.bool('in') ? 'true' : 'false' }) },
  'conv.stringToName': { pure: (cx) => ({ result: cx.str('in') }) },
  'conv.nameToString': { pure: (cx) => ({ result: cx.str('in') }) },
  'conv.nameToText': { pure: (cx) => ({ result: cx.str('in') }) },
  'text.format': {
    pure: (cx) => {
      const format = cx.str('format');
      const args = new Set(formatArgs(cx.node.defaults.format));
      return { result: format.replace(/\{([A-Za-z0-9_]+)\}/g, (all, name: string) => (args.has(name) ? cx.str(`arg:${name}`) : all)) };
    },
  },
  'text.equal': { pure: (cx) => ({ result: cx.str('a') === cx.str('b') }) },
  'name.equal': { pure: (cx) => ({ result: cx.str('a').toLowerCase() === cx.str('b').toLowerCase() }) },
  'name.isNone': { pure: (cx) => ({ result: cx.str('in') === '' || cx.str('in').toLowerCase() === 'none' }) },
};
