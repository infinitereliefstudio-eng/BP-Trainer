/** A name input that validates on commit and reverts if the name is refused. */
import { useEffect, useState } from 'preact/hooks';
import type { OpResult } from '@core/operations/graphOps';
import { useStore } from '../hooks';

interface Props {
  value: string;
  onCommit: (name: string) => OpResult;
}

export function NameField({ value, onCommit }: Props) {
  const store = useStore();
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft.trim() === value) return setDraft(value);
    const res = onCommit(draft);
    if (!res.ok) {
      store.warn(res.reason);
      setDraft(value);
    }
  };
  return (
    <input
      class="field"
      type="text"
      value={draft}
      onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setDraft(value);
      }}
    />
  );
}
