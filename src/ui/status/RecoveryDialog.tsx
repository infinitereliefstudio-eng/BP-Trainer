/**
 * Shown when a saved project cannot be opened. Nothing has been written
 * over it: the learner can export the original, start again with the
 * original set aside (it stays in the full backup), reload the app (a newer
 * version saved it) or try again (the storage did not answer).
 */
import { useState } from 'preact/hooks';
import { saveFile } from '@storage/backup';
import { useOwnTap } from '../widgets/useOwnTap';
import type { BlockedWorkspace } from '../workspace';

interface Props {
  blocked: BlockedWorkspace;
  onStartOver: () => Promise<void>;
  onRetry: () => void;
  onReload: () => void;
  onClose: () => void;
}

const TEXT: Record<BlockedWorkspace['status'], string> = {
  newer: 'Il a été enregistré par une version plus récente de BP Trainer. Il est gardé tel quel : recharge l’appli pour passer à la dernière version.',
  damaged: 'Le projet enregistré est abîmé. Il est gardé tel quel : rien n’a été effacé.',
  unavailable: 'Le stockage de l’appli ne répond pas. Rien n’a été modifié : réessaie, ou ferme et rouvre l’appli.',
};

export function RecoveryDialog({ blocked, onStartOver, onRetry, onReload, onClose }: Props) {
  const tap = useOwnTap();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const text = blocked.text;

  const exportOriginal = async () => {
    if (text === undefined) return;
    try {
      await saveFile(`bp-trainer-original-${blocked.key.replace(/[^\w-]+/g, '_')}.json`, text);
    } catch (e) {
      setError(`Export impossible : ${(e as Error).message}`);
    }
  };

  const startOver = async () => {
    setBusy(true);
    try {
      await onStartOver();
    } catch (e) {
      setError(`Impossible de repartir de zéro : ${(e as Error).message} Rien n’a été modifié.`);
      setBusy(false);
    }
  };

  return (
    <div class="sheet-backdrop" {...tap.root} onClick={tap.guard(onClose)}>
      <div class="dialog" role="dialog" aria-label="Projet impossible à ouvrir" onClick={(e) => e.stopPropagation()}>
        <h2>Ce projet ne peut pas être ouvert</h2>
        <p>{TEXT[blocked.status]}</p>
        {blocked.status !== 'newer' && <p class="muted small">Détail : {blocked.reason}</p>}
        {confirm && (
          <p class="note">
            Repartir de zéro ouvre un projet neuf. L’original est mis de côté : il reste dans « Tout exporter » (Sauvegarde, sur l’accueil).
          </p>
        )}
        {error && <p class="error-text">{error}</p>}
        <div class="dialog-actions wrap">
          {text !== undefined && (
            <button class="btn" disabled={busy} onClick={exportOriginal}>
              Exporter l’original
            </button>
          )}
          {blocked.status === 'newer' && (
            <button class="btn primary" disabled={busy} onClick={onReload}>
              Recharger l’appli
            </button>
          )}
          {blocked.status === 'unavailable' && (
            <button class="btn primary" disabled={busy} onClick={onRetry}>
              Réessayer
            </button>
          )}
          {text !== undefined &&
            (confirm ? (
              <button class="btn danger" disabled={busy} onClick={startOver}>
                Confirmer : repartir de zéro
              </button>
            ) : (
              <button class="btn" disabled={busy} onClick={() => setConfirm(true)}>
                Repartir de zéro…
              </button>
            ))}
          <button class="btn" disabled={busy} onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
