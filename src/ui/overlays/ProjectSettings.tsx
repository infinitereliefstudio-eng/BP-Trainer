/**
 * Project Settings › Project › Maps & Modes (menu ⋮), as UE's: the Game
 * Default Map. Later versions add the Default GameMode and the Game
 * Instance Class here, where UE keeps them.
 */
import { defaultLevel, levelOf } from '@core/model/project';
import { setGameDefaultMap } from '@core/operations/levelAssetOps';
import { useStore } from '../hooks';
import { AppHelp, Field, Group } from '../panels/fields';
import { useOwnTap } from '../widgets/useOwnTap';

export function ProjectSettings({ onClose }: { onClose: () => void }) {
  const store = useStore();
  const tap = useOwnTap();
  const p = store.project;
  const setDefault = (id: string) => {
    const res = store.applyProject('Régler Game Default Map', (q) => setGameDefaultMap(q, id));
    if (!res.ok) store.warn(res.reason);
  };
  return (
    <div class="sheet-backdrop" {...tap.root} onClick={tap.guard(onClose)}>
      <div class="sheet lesson project-settings" role="dialog" aria-label="Project Settings" onClick={(e) => e.stopPropagation()}>
        <div class="palette-head">
          <div class="lesson-title">
            <span class="eyebrow">Project Settings › Project</span>
            <strong>Maps & Modes</strong>
          </div>
          <span class="tb-spacer" />
          <button class="btn" onClick={tap.guard(onClose)}>
            Fermer
          </button>
        </div>
        <div class="lesson-body details">
          <Group title="Default Maps">
            <Field label="Game Default Map">
              <select class="field" aria-label="Game Default Map" value={defaultLevel(p).id} onChange={(e) => setDefault((e.target as HTMLSelectElement).value)}>
                {p.levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
          </Group>
          <AppHelp>
            <p>
              <b>Game Default Map</b> : le niveau où le jeu commence une fois installé. Les vérifications des leçons partent de lui aussi.
            </p>
            <p>
              <b>Play</b>, lui, lance le niveau ouvert dans l’éditeur (ici : {levelOf(p).name}), comme le Play in Editor d’UE. Pour changer de niveau dans l’éditeur :
              Content Drawer, puis touche deux fois un Level.
            </p>
            <p>Dans UE, cette page a aussi Editor Startup Map (le niveau ouvert au lancement de l’éditeur) ; BP Trainer rouvre simplement le dernier niveau ouvert.</p>
          </AppHelp>
        </div>
      </div>
    </div>
  );
}
