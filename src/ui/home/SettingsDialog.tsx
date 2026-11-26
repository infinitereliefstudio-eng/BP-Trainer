/**
 * Home › Réglages (« Sauvegarde » until V7.74): the text size (UI-1, V7.75); the editor's families and « Vue UE
 * pure » (UI-4, V7.76); Play in 3D, a trial (3D-0, V7.77); export everything (progress, review,
 * every project) to one file, and bring it back. Also shows which version is running.
 */
import { useState } from 'preact/hooks';
import { makeBackup, parseBackup, pickTextFile, restoreBackup, saveFile } from '@storage/backup';
import { APP_VERSION, BUILD_DATE } from '../../version';
import { useOwnTap } from '../widgets/useOwnTap';
import { FamiliesSetting } from './FamiliesSetting';
import { TextSizeSetting } from './TextSizeSetting';
import { View3dSetting } from './View3dSetting';

interface Props {
  onClose: () => void;
  /** Called after a restore, so the home screen reloads the progress. */
  onRestored: () => void;
}

export function SettingsDialog({ onClose, onRestored }: Props) {
  const tap = useOwnTap();
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const exportAll = async () => {
    setBusy(true);
    try {
      const backup = await makeBackup();
      const projects = Object.keys(backup.entries).filter((k) => k.startsWith('project:')).length;
      const name = `bp-trainer-sauvegarde-${backup.savedAt.slice(0, 10)}.json`;
      const how = await saveFile(name, JSON.stringify(backup));
      setMessage({
        text:
          how === 'shared'
            ? `Sauvegarde prête (${projects} projet${projects > 1 ? 's' : ''} et ta progression) : choisis où l’enregistrer.`
            : `Sauvegarde téléchargée : ${name} (${projects} projet${projects > 1 ? 's' : ''} et ta progression).`,
      });
    } catch (e) {
      setMessage({ text: `Export impossible : ${(e as Error).message}`, error: true });
    }
    setBusy(false);
  };

  const importAll = async () => {
    setBusy(true);
    try {
      const text = await pickTextFile();
      if (text) {
        const n = await restoreBackup(parseBackup(text));
        setMessage({ text: `Sauvegarde restaurée : ${n} élément${n > 1 ? 's' : ''} remis en place.` });
        onRestored();
      }
    } catch (e) {
      setMessage({ text: (e as Error).message, error: true });
    }
    setBusy(false);
  };

  return (
    <div class="sheet-backdrop" {...tap.root} onClick={tap.guard(onClose)}>
      <div class="dialog" role="dialog" aria-label="Réglages" onClick={(e) => e.stopPropagation()}>
        <h2>Réglages</h2>
        <TextSizeSetting />
        <FamiliesSetting />
        <View3dSetting />
        <h3>Sauvegarde</h3>
        <p>
          Ta progression et tes projets sont gardés sur cet appareil, dans le stockage de l’appli. L’effacer ou changer de téléphone les perd : garde un
          fichier de temps en temps.
        </p>
        <div class="backup-actions">
          <button class="btn primary" disabled={busy} onClick={exportAll}>
            Tout exporter dans un fichier
          </button>
          <button class="btn" disabled={busy} onClick={importAll}>
            Restaurer depuis un fichier
          </button>
        </div>
        <p class="muted small">Restaurer remplace la progression et les projets présents dans le fichier ; le reste n’est pas touché.</p>
        {message && <p class={message.error ? 'error-text' : 'note'}>{message.text}</p>}
        <p class="muted small version-line">
          BP Trainer {APP_VERSION} · construit le {BUILD_DATE}
        </p>
        <div class="dialog-actions">
          <button class="btn" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
