/** Editors for literal values, used in Details and in the value dialog. */
import { useEffect, useState } from 'preact/hooks';
import type { PinType } from '@core/types/pins';
import { enumEntries } from '@core/types/enums';
import { defaultValueFor, formatValue, parseValue, type StructValue, type Value, type Vec3 } from '@core/types/values';
import { findStruct, memberValue } from '@core/types/structs';
import { useStore } from '../hooks';

interface Props {
  type: PinType;
  value: Value;
  onChange: (v: Value) => void;
  autoFocus?: boolean;
}

export function ValueInput({ type, value, onChange, autoFocus }: Props) {
  if (type.container) return <ContainerValue type={type} value={value} onChange={onChange} />;
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
    case 'text':
    case 'name':
      return <TextValue type={type} value={value} onChange={onChange} autoFocus={autoFocus} />;
    case 'vector':
    case 'rotator':
      return <VectorValue value={(value ?? { x: 0, y: 0, z: 0 }) as Vec3} onChange={onChange} labels={type.category === 'rotator' ? ['Roll', 'Pitch', 'Yaw'] : ['X', 'Y', 'Z']} />;
    case 'enum':
      return <EnumValue type={type} value={value} onChange={onChange} />;
    case 'class':
      return <ClassValue value={value} onChange={onChange} />;
    case 'struct':
      if (type.subtype === 'LinearColor') {
        return <input class="field color" type="color" value={String(value ?? '#ffffff')} onChange={(e) => onChange((e.target as HTMLInputElement).value)} />;
      }
      if (type.subtype === 'TimerHandle') return <span class="muted">Invalide (à relier dans le graphe)</span>;
      return <StructValueInput type={type} value={value} onChange={onChange} />;
    case 'object':
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
    if (formatValue(v, type) !== formatValue(value, type) || type.category === 'string' || type.category === 'text' || type.category === 'name') onChange(v);
  };
  return (
    <input
      class="field"
      type="text"
      inputMode={type.category === 'int' ? 'numeric' : type.category === 'float' ? 'decimal' : 'text'}
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
        // biome-ignore lint/a11y/noLabelWithoutControl: TextValue renders the <input> this label wraps.
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

/** An Enum literal: one of its entries, stored as the entry's index. */
function EnumValue({ type, value, onChange }: { type: PinType; value: Value; onChange: (v: Value) => void }) {
  const store = useStore();
  const entries = enumEntries(type.subtype, store.project) ?? [];
  if (!entries.length) return <span class="muted">Enum vide ou introuvable</span>;
  return (
    <select class="field" value={String(Number(value) || 0)} onChange={(e) => onChange(Number((e.target as HTMLSelectElement).value))}>
      {entries.map((name, i) => (
        <option key={i} value={String(i)}>
          {name}
        </option>
      ))}
    </select>
  );
}

/** A Class Reference literal: a Blueprint of the project, stored by id. */
function ClassValue({ value, onChange }: { value: Value; onChange: (v: Value) => void }) {
  const store = useStore();
  return (
    <select class="field" value={typeof value === 'string' ? value : ''} onChange={(e) => onChange((e.target as HTMLSelectElement).value || null)}>
      <option value="">None</option>
      {store.project.classes.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

/** A project structure: one editor per member (a member left unset keeps its default). */
function StructValueInput({ type, value, onChange }: { type: PinType; value: Value; onChange: (v: Value) => void }) {
  const store = useStore();
  const s = findStruct(store.project, type.subtype);
  if (!s) return <span class="muted">Structure introuvable</span>;
  const own = value && typeof value === 'object' && !Array.isArray(value) ? (value as StructValue) : {};
  return (
    <div class="struct-value">
      {s.members.map((m) => (
        <fieldset key={m.id} class="struct-member">
          <legend class="muted small">{m.name}</legend>
          <ValueInput type={m.type} value={memberValue(own, m)} onChange={(v) => onChange({ ...own, [m.id]: v })} />
        </fieldset>
      ))}
    </div>
  );
}

/** Array, Set or Map default: its items (a Map's pairs), each editable, with + and ✕. */
function ContainerValue({ type, value, onChange }: { type: PinType; value: Value; onChange: (v: Value) => void }) {
  const items = Array.isArray(value) ? value : [];
  const item: PinType = { category: type.category, subtype: type.subtype };
  const val: PinType = type.value ?? { category: 'int' };
  const isMap = type.container === 'map';
  const set = (i: number, v: Value) => onChange(items.map((x, j) => (j === i ? v : x)));
  const add = () => onChange([...items, isMap ? [defaultValueFor(item), defaultValueFor(val)] : defaultValueFor(item)]);
  const label = type.container === 'array' ? 'élément' : isMap ? 'paire' : 'élément';
  return (
    <div class="container-value">
      {items.length === 0 && <span class="muted small">Vide</span>}
      {items.map((x, i) => {
        const pair = isMap && Array.isArray(x) ? x : [x, null];
        return (
          <div class="container-row" key={i}>
            <span class="muted small">{type.container === 'array' ? i : '•'}</span>
            {isMap ? (
              <>
                <ValueInput type={item} value={pair[0] ?? null} onChange={(k) => set(i, [k, pair[1] ?? null])} />
                <span class="muted small">→</span>
                <ValueInput type={val} value={pair[1] ?? null} onChange={(v) => set(i, [pair[0] ?? null, v])} />
              </>
            ) : (
              <ValueInput type={item} value={x} onChange={(v) => set(i, v)} />
            )}
            <button class="chip danger" aria-label={`Retirer l'${label} ${i}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
              ✕
            </button>
          </div>
        );
      })}
      <button class="chip" onClick={add}>
        + {label}
      </button>
    </div>
  );
}
