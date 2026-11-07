import type { PinType } from './pins';
import type { Project } from '../model/project';
import { enumLabel } from './enums';

/** A literal value stored on an unconnected input pin or a variable default. */
export type Vec3 = { x: number; y: number; z: number };
export type Value = boolean | number | string | null | Vec3 | Value[];

export function defaultValueFor(t: PinType): Value {
  if (t.container === 'array') return [];
  switch (t.category) {
    case 'bool':
      return false;
    case 'int':
    case 'float':
      return 0;
    case 'string':
      return '';
    case 'vector':
    case 'rotator':
      return { x: 0, y: 0, z: 0 };
    case 'enum':
      return 0;
    case 'struct':
      return t.subtype === 'LinearColor' ? '#ffffff' : null; // an unset Timer Handle is invalid
    default:
      return null; // object / class references default to None
  }
}

/** Short text used to show a value inline on a pin or in a list. */
export function formatValue(v: Value, t: PinType, project?: Project): string {
  if (t.container === 'array') return `[${Array.isArray(v) ? v.length : 0}]`;
  switch (t.category) {
    case 'bool':
      return v ? 'true' : 'false';
    case 'int':
      return String(Math.trunc(Number(v) || 0));
    case 'float': {
      const n = Number(v ?? 0);
      return Number.isInteger(n) ? n.toFixed(1) : String(+n.toFixed(4));
    }
    case 'string':
      return String(v ?? '');
    case 'vector':
    case 'rotator': {
      const p = (v ?? { x: 0, y: 0, z: 0 }) as Vec3;
      return `${p.x}, ${p.y}, ${p.z}`;
    }
    case 'enum':
      return enumLabel(t.subtype, Number(v) || 0, project);
    case 'struct':
      if (t.subtype === 'TimerHandle') return v ? 'Timer Handle' : 'Invalid';
      return String(v ?? '');
    default:
      return v === null ? 'None' : String(v);
  }
}

/** Coerce raw user input (text from a field) into a value of the given type. */
export function parseValue(raw: string, t: PinType): Value {
  switch (t.category) {
    case 'bool':
      return raw === 'true' || raw === '1';
    case 'int': {
      const n = parseInt(raw, 10);
      return Number.isFinite(n) ? n : 0;
    }
    case 'float': {
      const n = parseFloat(raw.replace(',', '.'));
      return Number.isFinite(n) ? n : 0;
    }
    default:
      return raw;
  }
}
