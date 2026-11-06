import { useStore } from '../hooks';

/** Short messages at the top of the graph (refused links, saves…). */
export function Toasts() {
  const store = useStore();
  return (
    <div class="toasts" aria-live="polite">
      {store.toasts.map((t) => (
        <div key={t.id} class={`toast ${t.level}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
