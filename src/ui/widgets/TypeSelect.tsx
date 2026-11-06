/** Pin type picker used by variables and by function / dispatcher parameters. */
import { CATEGORY_LABEL, VARIABLE_CATEGORIES, type PinCategory, type PinType } from '@core/types/pins';
import { useStore } from '../hooks';

function typeKey(t: PinType): string {
  return t.category === 'object' ? `object:${t.subtype ?? 'Actor'}` : t.category;
}

export function TypeSelect({ type, onChange, allowArray = true }: { type: PinType; onChange: (t: PinType) => void; allowArray?: boolean }) {
  const store = useStore();
  const objectChoices = ['Actor', ...store.project.classes.map((c) => c.name)];
  const isArray = type.container === 'array';
  const build = (key: string, array: boolean): PinType => {
    const [cat, sub] = key.split(':') as [PinCategory, string?];
    return { category: cat, ...(sub ? { subtype: sub } : {}), ...(array ? { container: 'array' as const } : {}) };
  };
  return (
    <span class="type-select">
      <select class="field" value={typeKey(type)} onChange={(e) => onChange(build((e.target as HTMLSelectElement).value, isArray))}>
        {VARIABLE_CATEGORIES.filter((c) => c !== 'object').map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABEL[c]}
          </option>
        ))}
        {objectChoices.map((name) => (
          <option key={name} value={`object:${name}`}>
            {name} (Object Reference)
          </option>
        ))}
      </select>
      {allowArray && (
        <label class="check small" title="Tableau (Array)">
          <input type="checkbox" checked={isArray} onChange={(e) => onChange(build(typeKey(type), (e.target as HTMLInputElement).checked))} />
          Array
        </label>
      )}
    </span>
  );
}
