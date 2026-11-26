/**
 * Messages that must stay on screen until dealt with, on the home screen as
 * in the editor: the progress could not be saved or read, a new version of
 * the app is out.
 */
import { useState } from 'preact/hooks';
import { Icon } from '../widgets/icons';

export interface StatusMessage {
  id: string;
  level: 'warning' | 'error' | 'info';
  text: string;
  /** The main action, if any (Réessayer, Recharger…). */
  action?: { label: string; run: () => void };
  /** Can be closed by the learner. */
  dismissable?: boolean;
}

export function StatusBar({ messages }: { messages: StatusMessage[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const shown = messages.filter((m) => !hidden.has(m.id));
  if (!shown.length) return null;
  return (
    <div class="status-bar" aria-live="polite">
      {shown.map((m) => (
        <div key={m.id} class={`status-msg ${m.level}`}>
          <span class="status-text">{m.text}</span>
          {m.action && (
            <button class="btn small-btn" onClick={m.action.run}>
              {m.action.label}
            </button>
          )}
          {m.dismissable && (
            <button class="btn small-btn" aria-label="Fermer" onClick={() => setHidden(new Set([...hidden, m.id]))}>
              <Icon name="close" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
