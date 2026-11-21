/**
 * Project Settings › Project › Maps & Modes (menu ⋮), as UE's: the Game
 * Default Map and the Game Instance Class. A later version adds the Default
 * GameMode here, where UE keeps it.
 */
import { defaultLevel, levelOf } from '@core/model/project';
import { setGameDefaultMap, setGameInstanceClass } from '@core/operations/levelAssetOps';
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
  const setInstance = (id: string) => {
    const res = store.applyProject('Régler Game Instance Class', (q) => setGameInstanceClass(q, id));
    if (!res.ok) store.warn(res.reason);
  };
  const instances = p.classes.filter((c) => c.parent === 'GameInstance');
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
          <Group title="Game Instance">
            <Field label="Game Instance Class">
              <select
                class="field"
                aria-label="Game Instance Class"
                value={p.mapsModes?.gameInstanceClass ?? ''}
                onChange={(e) => setInstance((e.target as HTMLSelectElement).value)}
              >
                <option value="">GameInstance</option>
                {instances.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
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
            <p>
              <b>Game Instance Class</b> : la classe du seul GameInstance de la partie, créé au lancement et gardé d’un niveau à l’autre jusqu’à la fermeture.
              Laissée sur GameInstance, le jeu en crée un ordinaire : Get Game Instance puis Cast To vers ton Blueprint échoue.
              {instances.length === 0 && ' Pour en créer un : Content Drawer, + Add › Blueprint Class › All Classes › GameInstance.'}
            </p>
            <p>Dans UE, cette page a aussi Editor Startup Map (le niveau ouvert au lancement de l’éditeur) ; BP Trainer rouvre simplement le dernier niveau ouvert.</p>
          </AppHelp>
        </div>
      </div>
    </div>
  );
}
