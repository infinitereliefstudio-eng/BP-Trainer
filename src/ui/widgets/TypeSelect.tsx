/** Pin type picker used by variables and by function / dispatcher parameters. */
import { CATEGORY_LABEL, STRUCT_LABEL, type PinCategory, type PinType, type StructName } from '@core/types/pins';
import { decodeType, encodeType } from '@core/types/wildcard';
import { useStore } from '../hooks';

const BASIC: PinCategory[] = ['bool', 'int', 'float', 'string', 'vector', 'rotator'];

export function TypeSelect({ type, onChange, allowArray = true }: { type: PinType; onChange: (t: PinType) => void; allowArray?: boolean }) {
  const store = useStore();
  const classes = ['Actor', ...store.project.classes.map((c) => c.name)];
  const isArray = type.container === 'array';
  const build = (key: string, array: boolean): PinType => {
    const t = decodeType(key);
    return array ? { ...t, container: 'array' } : t;
  };
  const key = encodeType({ category: type.category, subtype: type.subtype });
  return (
    <span class="type-select">
      <select class="field" value={key} onChange={(e) => onChange(build((e.target as HTMLSelectElement).value, isArray))}>
        {BASIC.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABEL[c]}
          </option>
        ))}
        <optgroup label="Structures">
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
      {allowArray && (
        <label class="check small" title="Tableau (Array)">
          <input type="checkbox" checked={isArray} onChange={(e) => onChange(build(key, (e.target as HTMLInputElement).checked))} />
          Array
        </label>
      )}
    </span>
  );
}
