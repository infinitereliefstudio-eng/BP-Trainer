/** Editors for literal values, used in Details and in the value dialog. */
import { useEffect, useState } from 'preact/hooks';
import type { PinType } from '@core/types/pins';
import { formatValue, parseValue, type Value, type Vec3 } from '@core/types/values';

interface Props {
  type: PinType;
  value: Value;
  onChange: (v: Value) => void;
  autoFocus?: boolean;
}

export function ValueInput({ type, value, onChange, autoFocus }: Props) {
  if (type.container === 'array') return <span class="muted">Tableau ({Array.isArray(value) ? value.length : 0} éléments)</span>;
  switch (type.category) {
    case 'bool':
      return (
        <label class="check">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange((e.target as HTMLInputElement).checked)} />
          <span>{value ? 'true' : 'false'}</span>
        </label>
      );
    case 'int':
    case 'float':
    case 'string':
      return <TextValue type={type} value={value} onChange={onChange} autoFocus={autoFocus} />;
    case 'vector':
    case 'rotator':
      return <VectorValue value={(value ?? { x: 0, y: 0, z: 0 }) as Vec3} onChange={onChange} labels={type.category === 'rotator' ? ['Roll', 'Pitch', 'Yaw'] : ['X', 'Y', 'Z']} />;
    case 'object':
    case 'class':
      return <span class="muted">None (à relier dans le graphe)</span>;
    default:
      return <span class="muted">{formatValue(value, type)}</span>;
  }
}

/** Text field that commits on blur or Enter, so typing does not spam the history. */
function TextValue({ type, value, onChange, autoFocus }: Props) {
  const [draft, setDraft] = useState(formatValue(value, type));
  useEffect(() => setDraft(formatValue(value, type)), [value, type.category]);
  const commit = () => {
    const v = parseValue(draft, type);
    if (formatValue(v, type) !== formatValue(value, type) || type.category === 'string') onChange(v);
  };
  return (
    <input
      class="field"
      type="text"
      inputMode={type.category === 'string' ? 'text' : type.category === 'int' ? 'numeric' : 'decimal'}
      value={draft}
      autoFocus={autoFocus}
      onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

function VectorValue({ value, onChange, labels }: { value: Vec3; onChange: (v: Value) => void; labels: string[] }) {
  const keys: (keyof Vec3)[] = ['x', 'y', 'z'];
  return (
    <div class="vector">
      {keys.map((k, i) => (
        <label key={k}>
          <span>{labels[i]}</span>
          <TextValue
            type={{ category: 'float' }}
            value={value[k]}
            onChange={(n) => onChange({ ...value, [k]: Number(n) })}
          />
        </label>
      ))}
    </div>
  );
}
