/** Conversions and string functions: pure nodes, recomputed for every read. */
import { enumLabel } from '../../types/enums';
import { adoptedBy, decodeType } from '../../types/wildcard';
import { toInt, toVec } from '../values';
import type { Behavior } from './types';

/** UE prints floats with six decimals (1.500000). */
const formatFloat = (n: number) => n.toFixed(6);

export const pureBehaviors: Record<string, Behavior> = {
  'conv.intToString': { pure: (cx) => ({ result: String(toInt(cx.num('in'))) }) },
  'conv.floatToString': { pure: (cx) => ({ result: formatFloat(cx.num('in')) }) },
  'conv.boolToString': { pure: (cx) => ({ result: cx.bool('in') ? 'true' : 'false' }) },
  'conv.intToFloat': { pure: (cx) => ({ result: cx.num('in') }) },
  'conv.floatToInt': { pure: (cx) => ({ result: toInt(cx.num('in')) }) },
  'conv.boolToInt': { pure: (cx) => ({ result: cx.bool('in') ? 1 : 0 }) },
  'conv.objectToString': { pure: (cx) => ({ result: cx.world.displayName(cx.in('in')) }) },
  'conv.vectorToString': {
    pure: (cx) => {
      const v = toVec(cx.in('in'));
      return { result: `X=${formatFloat(v.x).slice(0, -3)} Y=${formatFloat(v.y).slice(0, -3)} Z=${formatFloat(v.z).slice(0, -3)}` };
    },
  },
  'conv.rotatorToString': {
    pure: (cx) => {
      const r = toVec(cx.in('in'));
      return { result: `P=${formatFloat(r.y)} Y=${formatFloat(r.z)} R=${formatFloat(r.x)}` };
    },
  },
  'conv.stringToInt': {
    pure: (cx) => {
      const n = parseInt(cx.str('in').trim(), 10);
      return { result: Number.isFinite(n) ? n : 0 };
    },
  },
  'conv.stringToFloat': {
    pure: (cx) => {
      const n = parseFloat(cx.str('in').trim().replace(',', '.'));
      return { result: Number.isFinite(n) ? n : 0 };
    },
  },
  'conv.enumToString': {
    pure: (cx) => {
      const wild = adoptedBy(cx.node);
      const name = wild ? decodeType(wild).subtype : undefined;
      return { result: enumLabel(name, toInt(cx.num('in')), cx.ctx.project) };
    },
  },

  'string.append': {
    pure: (cx) => {
      const count = Math.max(2, Number(cx.node.config.inputs ?? 2));
      let out = '';
      for (let i = 0; i < count; i++) out += cx.str(`in${i}`);
      return { result: out };
    },
  },
  'string.contains': {
    pure: (cx) => {
      const useCase = cx.bool('useCase');
      const hay = useCase ? cx.str('in') : cx.str('in').toLowerCase();
      const needle = useCase ? cx.str('sub') : cx.str('sub').toLowerCase();
      return { result: hay.includes(needle) };
    },
  },
  'string.len': { pure: (cx) => ({ result: cx.str('in').length }) },
  'string.equal': { pure: (cx) => ({ result: cx.str('a').toLowerCase() === cx.str('b').toLowerCase() }) },
  'string.equalExactly': { pure: (cx) => ({ result: cx.str('a') === cx.str('b') }) },
  'string.notEqual': { pure: (cx) => ({ result: cx.str('a').toLowerCase() !== cx.str('b').toLowerCase() }) },
  'string.toUpper': { pure: (cx) => ({ result: cx.str('in').toUpperCase() }) },
};
