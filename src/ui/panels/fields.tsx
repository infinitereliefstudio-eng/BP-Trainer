/**
 * Shared building blocks of the Details panel, laid out as UE's: sections
 * that fold under their title bar, then property rows (label on the left,
 * value on the right). What belongs to BP Trainer (explanations, usage
 * counts, buttons UE puts elsewhere) is amber: an `app` section, or the
 * help block at the end.
 */
import { createContext, type ComponentChildren } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import { normalize } from '@core/nodes/palette';

/** The text typed in « Search Details »: rows whose label lacks it are hidden. */
export const DetailsFilter = createContext('');

/** Sections folded by the user, by title, kept while the app is open (UE keeps them per panel). */
const folded = new Set<string>();

export function Group({ title, children, app }: { title: string; children: ComponentChildren; app?: boolean }) {
  const [open, setOpen] = useState(!folded.has(title));
  // While searching, every section shows its matching rows, as in UE.
  const shown = open || !!useContext(DetailsFilter);
  const toggle = () => {
    if (open) folded.add(title);
    else folded.delete(title);
    setOpen(!open);
  };
  return (
    <section class={`d-group${app ? ' app-group' : ''}${shown ? '' : ' folded'}`}>
      <h3>
        <button class="d-head" aria-expanded={shown} onClick={toggle}>
          <span class="d-caret">{shown ? '▾' : '▸'}</span>
          {title}
          {app && <span class="app-tag">BP Trainer</span>}
        </button>
      </h3>
      {shown && children}
    </section>
  );
}

export function Field({ label, children }: { label: string; children: ComponentChildren }) {
  const filter = useContext(DetailsFilter);
  if (filter && !normalize(label).includes(filter)) return null;
  return (
    <div class="d-field">
      <span class="d-label">{label}</span>
      <div class="d-value">{children}</div>
    </div>
  );
}

const HELP_KEY = 'bpt.detailsHelp';

function helpOpen(): boolean {
  try {
    return localStorage.getItem(HELP_KEY) !== '0';
  } catch {
    return true;
  }
}

/**
 * BP Trainer's help for what is shown, after UE's sections: one amber block
 * that folds, open or closed everywhere at once (remembered on the device).
 */
export function AppHelp({ children }: { children: ComponentChildren }) {
  const [open, setOpen] = useState(helpOpen);
  const filter = useContext(DetailsFilter);
  if (filter) return null;
  const toggle = () => {
    try {
      localStorage.setItem(HELP_KEY, open ? '0' : '1');
    } catch {
      // Storage refused: the choice lasts until the panel closes.
    }
    setOpen(!open);
  };
  return (
    <section class={`d-group app-help${open ? '' : ' folded'}`}>
      <h3>
        <button class="d-head" aria-expanded={open} onClick={toggle}>
          <span class="d-caret">{open ? '▾' : '▸'}</span>
          Aide
          <span class="app-tag">BP Trainer</span>
        </button>
      </h3>
      {open && <div class="app-help-body">{children}</div>}
    </section>
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
