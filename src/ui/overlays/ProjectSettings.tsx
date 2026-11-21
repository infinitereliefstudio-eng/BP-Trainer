/**
 * Project Settings › Project › Maps & Modes (menu ⋮), as UE's: the Default
 * GameMode and its Selected GameMode classes, the Game Default Map and the
 * Game Instance Class.
 */
import { rootParent } from '@core/model/inheritance';
import { defaultLevel, levelOf } from '@core/model/project';
import { ensureDefaultGameMode, setDefaultGameMode } from '@core/operations/gameModeOps';
import { setGameDefaultMap, setGameInstanceClass } from '@core/operations/levelAssetOps';
import { GameModeFields } from '../panels/GameModeFields';
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
  const modes = p.classes.filter((c) => rootParent(p, c) === 'GameModeBase');
  const setMode = (id: string) => {
    const res = store.applyProject('Régler Default GameMode', (q) => setDefaultGameMode(q, id));
    if (!res.ok) store.warn(res.reason);
  };
  const makeMode = () => {
    const res = store.applyProject('Créer BP_GameMode', (q) => {
      const r = ensureDefaultGameMode(q);
      return r.ok ? { ok: true as const, value: undefined } : r;
    });
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
          <Group title="Default Modes">
            <Field label="Default GameMode">
              <select class="field" aria-label="Default GameMode" value={p.mapsModes?.defaultGameMode ?? ''} onChange={(e) => setMode((e.target as HTMLSelectElement).value)}>
                <option value="">GameModeBase</option>
                {modes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </Group>
          <Group title="Selected GameMode">
            <GameModeFields gameModeId={p.mapsModes?.defaultGameMode} />
            {!p.mapsModes?.defaultGameMode && (
              <button class="btn" onClick={makeMode}>
                + Créer BP_GameMode
              </button>
            )}
          </Group>
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
              <b>Default GameMode</b> : le GameMode de chaque niveau qui n’a pas de GameMode Override (World Settings). Il fait apparaître le joueur :
              <b> Selected GameMode</b> montre ses classes, comme dans UE, et on peut les régler ici. Le GameModeBase d’UE donne un DefaultPawn et un
              PlayerController sans graphe : pour les changer, il faut un Blueprint GameMode.
            </p>
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
