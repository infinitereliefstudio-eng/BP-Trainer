/** Small controls of a widget's Details: a list, a colour, two numbers side by side, and UE's Bind menu. */
import type { ComponentChildren } from 'preact';
import type { BindableProp, WidgetNode } from '@core/model/widgets';
import { bindingCandidates, createWidgetBinding, setWidgetBinding } from '@core/operations/widgetOps';
import { useStore } from '../../hooks';


export function Select<T extends string>({ value, options, onChange, labels }: { value: T; options: readonly T[]; onChange: (v: T) => void; labels?: string[] }) {
  return (
    <select class="field" value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value as T)}>
      {options.map((o, i) => (
        <option key={o} value={o}>
          {labels?.[i] ?? o}
        </option>
      ))}
    </select>
  );
}

export function Color({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input class="field color" type="color" value={value} onChange={(e) => onChange((e.target as HTMLInputElement).value)} />;
}

export function Pair({ children }: { children: ComponentChildren }) {
  return <span class="d-pair">{children}</span>;
}

/**
 * A property with UE's Bind menu beside it: Create Binding (a new function
 * GetText_0, opened in the Graph), a compatible function of the Blueprint,
 * or Remove Binding. Bound, the property shows its function instead of its value.
 */
export function Bindable({ w, prop, onOpenGraph, children }: { w: WidgetNode; prop: BindableProp; onOpenGraph?: (graphId: string) => void; children: ComponentChildren }) {
  const store = useStore();
  const cls = store.cls;
  const bound = w.bindings?.[prop];
  const fn = bound ? cls.graphs.find((g) => g.id === bound) : undefined;
  const choices = bindingCandidates(cls, w.kind, prop);
  const pick = (v: string) => {
    if (v === '__create') {
      const r = store.applyProject('Create Binding', (p) => createWidgetBinding(p, store.cls, w.id, prop));
      if (r.ok) onOpenGraph?.(r.value.id);
      else store.warn(r.reason);
    } else if (v === '__remove') {
      store.apply('Remove Binding', (c) => setWidgetBinding(c, w.id, prop, undefined));
    } else if (v) {
      const r = store.apply('Lier la propriété', (c) => setWidgetBinding(c, w.id, prop, v));
      if (!r.ok) store.warn(r.reason);
    }
  };
  return (
    <span class="bind-row">
      {fn ? (
        <button class="btn bind-fn" onClick={() => onOpenGraph?.(fn.id)} title="Ouvrir la fonction liée">
          ƒ {fn.name}
        </button>
      ) : (
        children
      )}
      <select class={`field bind-btn${fn ? ' on' : ''}`} value="" aria-label={`Bind ${prop}`} onChange={(e) => pick((e.target as HTMLSelectElement).value)}>
        <option value="">Bind</option>
        {fn && <option value="__remove">Remove Binding</option>}
        <option value="__create">Create Binding</option>
        {choices
          .filter((g) => g.id !== bound)
          .map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
      </select>
    </span>
  );
}
