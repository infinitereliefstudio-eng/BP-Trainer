/** A "Pourquoi ?" toggle under an error: the explanation and the usual fixes. */
import { useState } from 'preact/hooks';
import type { Explanation } from '@core/explain/types';

export function Why({ explain }: { explain: Explanation }) {
  const [open, setOpen] = useState(false);
  return (
    <div class="why">
      <button class="why-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? '▾' : '▸'} Pourquoi ?
      </button>
      {open && (
        <div class="why-body">
          <p>{explain.why}</p>
          {explain.fixes.length > 0 && (
            <ul>
              {explain.fixes.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
