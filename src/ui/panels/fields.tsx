/** Shared building blocks of the Details panel. */
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';

export function Group({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <section class="d-group">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ComponentChildren }) {
  return (
    <div class="d-field">
      <span class="d-label">{label}</span>
      <div class="d-value">{children}</div>
    </div>
  );
}

/** Number field committing on blur / Enter, with an optional unit. */
export function NumberField({ value, onCommit, unit, step }: { value: number; onCommit: (n: number) => void; unit?: string; step?: number }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = parseFloat(draft.replace(',', '.'));
    if (Number.isFinite(n) && n !== value) onCommit(step ? Math.round(n / step) * step : n);
    else setDraft(String(value));
  };
  return (
    <span class="num-field">
      <input
        class="field"
        type="text"
        inputMode="decimal"
        value={draft}
        onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
      />
      {unit && <span class="unit">{unit}</span>}
    </span>
  );
}

export function Check({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return <input type="checkbox" checked={checked} onChange={(e) => onChange((e.target as HTMLInputElement).checked)} />;
}

export function TextCommit({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  return (
    <input
      class="field"
      type="text"
      value={value}
      onBlur={(e) => {
        const v = (e.target as HTMLInputElement).value;
        if (v !== value) onCommit(v);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
    />
  );
}
