/** What changed since a saved project was last opened (rules of the simulation, the lesson itself). */
import { useOwnTap } from '../widgets/useOwnTap';

export function NoticeDialog({ notices, onClose }: { notices: string[]; onClose: () => void }) {
  const tap = useOwnTap();
  return (
    <div class="sheet-backdrop" {...tap.root} onClick={tap.guard(onClose)}>
      <div class="dialog" role="dialog" aria-label="À savoir" onClick={(e) => e.stopPropagation()}>
        <h2>À savoir avant de continuer</h2>
        {notices.map((n) => (
          <p key={n} class="note">
            {n}
          </p>
        ))}
        <div class="dialog-actions">
          <button class="btn primary" onClick={onClose}>
            Compris
          </button>
        </div>
      </div>
    </div>
  );
}
