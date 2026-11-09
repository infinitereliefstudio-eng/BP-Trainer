/**
 * Pin type picker used by variables, function / dispatcher / interface
 * parameters and structure members: the type, then its container (single,
 * Array, Set, Map) and, for a Map, the type of its values. Like UE, a Set or
 * a Map key only takes a type that can be hashed.
 */
import { CATEGORY_LABEL, KEY_CATEGORIES, STRUCT_LABEL, type Container, type PinCategory, type PinType, type StructName } from '@core/types/pins';
import { decodeType, encodeType } from '@core/types/wildcard';
import { useStore } from '../hooks';

const BASIC: PinCategory[] = ['bool', 'int', 'float', 'string', 'text', 'name', 'vector', 'rotator'];

const CONTAINER_LABEL: Record<Container | 'single', string> = { single: 'Single', array: 'Array', set: 'Set', map: 'Map' };

interface Props {
  type: PinType;
  onChange: (t: PinType) => void;
  /** Offer containers (Array, Set, Map). */
  allowArray?: boolean;
}

export function TypeSelect({ type, onChange, allowArray = true }: Props) {
  const key = encodeType({ category: type.category, subtype: type.subtype });
  const container = type.container ?? 'single';
  const hashable = KEY_CATEGORIES.includes(type.category);
  const build = (k: string, c: Container | 'single', value?: PinType): PinType => {
    const t = decodeType(k);
    if (c === 'single') return t;
    if ((c === 'set' || c === 'map') && !KEY_CATEGORIES.includes(t.category)) return { ...t, container: 'array' };
    if (c === 'map') return { ...t, container: 'map', value: value ?? type.value ?? { category: 'int' } };
    return { ...t, container: c };
  };
  return (
    <span class="type-select">
      <TypeOptions value={key} onChange={(k) => onChange(build(k, container))} />
      {allowArray && (
        <select
          class="field container-field"
          aria-label="Conteneur"
          value={container}
          onChange={(e) => onChange(build(key, (e.target as HTMLSelectElement).value as Container | 'single'))}
        >
          {(['single', 'array', 'set', 'map'] as const).map((c) => (
            <option key={c} value={c} disabled={(c === 'set' || c === 'map') && !hashable}>
              {CONTAINER_LABEL[c]}
            </option>
          ))}
        </select>
      )}
      {type.container === 'map' && (
        <span class="map-value">
          <span class="muted small">Valeur</span>
          <TypeOptions value={encodeType(type.value ?? { category: 'int' })} onChange={(k) => onChange(build(key, 'map', decodeType(k)))} />
        </span>
      )}
    </span>
  );
}

/** The type list: basic types, structures, Enums, references. */
function TypeOptions({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  const store = useStore();
  const classes = ['Actor', ...store.project.classes.map((c) => c.name)];
  return (
    <select class="field" value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value)}>
      {BASIC.map((c) => (
        <option key={c} value={c}>
          {CATEGORY_LABEL[c]}
        </option>
      ))}
      <optgroup label="Structures">
        {(store.project.structs ?? []).map((s) => (
          <option key={s.id} value={`struct:${s.name}`}>
            {s.name}
          </option>
        ))}
        {(Object.keys(STRUCT_LABEL) as StructName[]).map((s) => (
          <option key={s} value={`struct:${s}`}>
            {STRUCT_LABEL[s]}
          </option>
        ))}
      </optgroup>
      {store.project.enums.length > 0 && (
        <optgroup label="Enums">
          {store.project.enums.map((e) => (
            <option key={e.id} value={`enum:${e.name}`}>
              {e.name}
            </option>
          ))}
        </optgroup>
      )}
      <optgroup label="Object Reference">
        {classes.map((name) => (
          <option key={name} value={`object:${name}`}>
            {name} (Object Reference)
          </option>
        ))}
      </optgroup>
      <optgroup label="Class Reference">
        {classes.map((name) => (
          <option key={name} value={`class:${name}`}>
            {name} (Class Reference)
          </option>
        ))}
      </optgroup>
    </select>
  );
}
