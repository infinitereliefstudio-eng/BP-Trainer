/** Conversions and string functions: pure nodes, recomputed for every read. */
import { enumLabel } from '../../types/enums';
import { adoptedBy, decodeType } from '../../types/wildcard';
import { toInt, toVec } from '../values';
import type { Behavior } from './types';

/** UE's FString::SanitizeFloat (To String (Float), Print String): six decimals, trailing zeros dropped, at least one kept: 1.5, 3.0, 0.333333. */
export const sanitizeFloat = (n: number) => {
  if (!Number.isFinite(n)) return Number.isNaN(n) ? 'nan' : n > 0 ? 'inf' : '-inf';
  return n.toFixed(6).replace(/(\.\d*?[1-9])0+$|\.0+$/, (_m, kept) => kept ?? '.0');
};
/** printf("%f"), used by Rotator's ToString (P=0.000000 Y=90.000000 R=0.000000). */
const fixed6 = (n: number) => n.toFixed(6);

export const pureBehaviors: Record<string, Behavior> = {
  'conv.intToString': { pure: (cx) => ({ result: String(toInt(cx.num('in'))) }) },
  'conv.floatToString': { pure: (cx) => ({ result: sanitizeFloat(cx.num('in')) }) },
  'conv.boolToString': { pure: (cx) => ({ result: cx.bool('in') ? 'true' : 'false' }) },
  'conv.intToFloat': { pure: (cx) => ({ result: cx.num('in') }) },
  'conv.floatToInt': { pure: (cx) => ({ result: toInt(cx.num('in')) }) },
  'conv.boolToInt': { pure: (cx) => ({ result: cx.bool('in') ? 1 : 0 }) },
  'conv.objectToString': { pure: (cx) => ({ result: cx.world.displayName(cx.in('in')) }) },
  'conv.vectorToString': {
    pure: (cx) => {
      const v = toVec(cx.in('in'));
      return { result: `X=${v.x.toFixed(3)} Y=${v.y.toFixed(3)} Z=${v.z.toFixed(3)}` };
    },
  },
  'conv.rotatorToString': {
    pure: (cx) => {
      const r = toVec(cx.in('in'));
      return { result: `P=${fixed6(r.y)} Y=${fixed6(r.z)} R=${fixed6(r.x)}` };
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
      // FCString::Atof: reads up to the first character that is not part of a number, so "3,5" gives 3.
      const n = parseFloat(cx.str('in').trim());
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
