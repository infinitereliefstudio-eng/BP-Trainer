/** Details of what is selected in the level: an actor instance or the Player Start. */
import { inheritedView, isA, rootParent } from '@core/model/inheritance';
import { findClass, MAIN_START_ID, type PlayerStartSpot, playerStartsOf, type Variable, levelOf } from '@core/model/project';
import { gameModeOf } from '@core/model/gameMode';
import { setGameModeOverride } from '@core/operations/gameModeOps';
import { actorRefValue, actorScale, findPlayerStart, setActorScale, removeActor, removePlayerStart, setActorOverride, setComponentOverride, setPlayerStart, updateActor } from '@core/operations/levelOps';
import type { Value } from '@core/types/values';
import { useStore } from '../hooks';
import { ValueInput } from '../widgets/ValueInput';
import { AppHelp, Field, Group, NumberField, TextCommit } from './fields';
import { GameModeFields } from './GameModeFields';

export function ActorDetails({ id, onOpenClass }: { id: string; onOpenClass: (classId: string) => void }) {
  const store = useStore();
  const a = levelOf(store.project).actors.find((x) => x.id === id);
  if (!a) return null;
  const own = findClass(store.project, a.classId);
  const cls = own && inheritedView(own, store.project);
  const editable = cls?.variables.filter((v) => v.instanceEditable) ?? [];
  const patch = (label: string, fn: () => void) => store.applyProject(label, fn);
  const categories = [...new Set(editable.map((v) => v.category || 'Default'))];
  const scale = actorScale(store.project, a);
  // Its Actor Components: their Instance Editable variables, set for this actor only (UE: Details › the component).
  const logic = (cls?.components ?? []).flatMap((comp) => {
    const own = comp.kind === 'ActorComponent' && comp.classId ? findClass(store.project, comp.classId) : undefined;
    const of = own && inheritedView(own, store.project);
    return of ? [{ comp, of, vars: of.variables.filter((v) => v.instanceEditable) }] : [];
  });

  return (
    <>
      <div class="details-actor">
        <TextCommit value={a.name} onCommit={(name) => name.trim() && patch('Renommer l’acteur', () => updateActor(store.project, a.id, { name: name.trim() }))} />
        {cls && (
          <button class="btn" onClick={() => onOpenClass(cls.id)}>
            Edit Blueprint
          </button>
        )}
      </div>
      <Group title="Transform">
        <Field label="Location X">
          <NumberField value={a.x} unit="cm" onCommit={(x) => patch('Déplacer l’acteur', () => updateActor(store.project, a.id, { x }))} />
        </Field>
        <Field label="Location Y">
          <NumberField value={a.y} unit="cm" onCommit={(y) => patch('Déplacer l’acteur', () => updateActor(store.project, a.id, { y }))} />
        </Field>
        <Field label="Rotation Yaw">
          <NumberField value={a.yaw} unit="°" onCommit={(yaw) => patch('Tourner l’acteur', () => updateActor(store.project, a.id, { yaw }))} />
        </Field>
        {/* UE's Scale of a placed actor: its root component's, for this actor only (V7.83). */}
        {(['x', 'y', 'z'] as const).map((k) => (
          <Field key={k} label={`Scale ${k.toUpperCase()}`}>
            <NumberField
              value={scale[k]}
              onCommit={(v) => patch('Changer l’échelle de l’acteur', () => setActorScale(store.project, a.id, { ...scale, [k]: v }))}
            />
          </Field>
        ))}
      </Group>
      {categories.map((cat) => (
        <Group key={cat} title={cat}>
          {editable
            .filter((v) => (v.category || 'Default') === cat)
            .map((v) => (
              <VariableField
                key={v.id}
                v={v}
                actorId={a.id}
                value={v.id in a.overrides ? a.overrides[v.id] : v.defaultValue}
                onChange={(val) => patch('Régler une variable', () => setActorOverride(store.project, a.id, v.id, val))}
              />
            ))}
        </Group>
      ))}
      {logic.map(({ comp, of, vars }) => (
        <Group key={comp.id} title={`${comp.name} (${of.name})`}>
          {vars.length === 0 && <p class="muted small">Aucune variable Instance Editable dans {of.name}.</p>}
          {vars.map((v) => {
            const own = a.componentOverrides?.[comp.id];
            const value = own && v.id in own ? own[v.id] : comp.values && v.id in comp.values ? comp.values[v.id] : v.defaultValue;
            return (
              <VariableField
                key={v.id}
                v={v}
                actorId={a.id}
                value={value}
                onChange={(val) => patch('Régler une variable du composant', () => setComponentOverride(store.project, a.id, comp.id, v.id, val))}
              />
            );
          })}
        </Group>
      ))}
      <Group title="Acteur" app>
        <button class="btn danger" onClick={() => patch('Supprimer l’acteur', () => removeActor(store.project, a.id))}>
          Retirer du niveau
        </button>
      </Group>
      <AppHelp>
        <p>Instance de {cls?.name ?? '?'} placée dans le niveau. <b>Edit Blueprint</b> ouvre sa classe : ce qui s’y change vaut pour toutes ses instances.</p>
        <p>
          Les variables cochées <b>Instance Editable</b> dans le Blueprint apparaissent ici, sous leur Category, pour être réglées acteur par acteur.
          {editable.length === 0 && ' Ce Blueprint n’en a aucune.'}
        </p>
        {logic.length > 0 && (
          <p>
            Ses <b>Actor Components</b> ont chacun leur section : leurs variables Instance Editable s’y règlent pour cet acteur seulement, par-dessus les
            valeurs choisies dans le Blueprint de l’acteur.
          </p>
        )}
      </AppHelp>
    </>
  );
}

/** An Instance Editable variable on a placed actor: a picker of placed actors for a reference (UE's actor picker), else its value editor. */
function VariableField({ v, actorId, value, onChange }: { v: Variable; actorId: string; value: Value; onChange: (v: Value) => void }) {
  const store = useStore();
  if (v.type.category === 'object' && v.type.container !== 'array') {
    // UE's actor picker: any placed actor of the right class, or None.
    const wanted = v.type.subtype ?? 'Actor';
    const choices = levelOf(store.project).actors.filter((o) => {
      const oc = findClass(store.project, o.classId);
      const wantedId = store.project.classes.find((c) => c.name === wanted)?.id;
      // A child Blueprint fits where its parent is expected.
      const fits = wanted === 'Actor' || (wanted === 'Pawn' && !!oc && rootParent(store.project, oc) === 'Pawn') || (!!wantedId && isA(store.project, o.classId, wantedId));
      return o.id !== actorId && fits;
    });
    return (
      <Field label={v.name}>
        <select class="field" value={String(value ?? '')} onChange={(e) => onChange((e.target as HTMLSelectElement).value || null)}>
          <option value="">None</option>
          {choices.map((o) => (
            <option key={o.id} value={actorRefValue(o.id)}>
              {o.name}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  return (
    <Field label={v.name}>
      <ValueInput type={v.type} value={value} onChange={onChange} />
    </Field>
  );
}

export function PlayerStartDetails({ id = MAIN_START_ID }: { id?: string }) {
  const store = useStore();
  const ps = findPlayerStart(store.project, id);
  if (!ps) return <p class="hint">Ce Player Start n’est plus dans le niveau.</p>;
  const set = (patch: Partial<PlayerStartSpot>) => {
    const res = store.applyProject('Régler le Player Start', (p) => setPlayerStart(p, id, patch));
    if (!res.ok) store.warn(res.reason);
  };
  const remove = () => {
    const res = store.applyProject('Supprimer le Player Start', (p) => removePlayerStart(p, id));
    if (!res.ok) store.warn(res.reason);
    else store.setFocus({ kind: 'none' });
  };
  const several = playerStartsOf(levelOf(store.project)).length > 1;
  return (
    <>
    <Group title="Transform">
      <Field label="Location X">
        <NumberField value={ps.x} unit="cm" onCommit={(x) => set({ x })} />
      </Field>
      <Field label="Location Y">
        <NumberField value={ps.y} unit="cm" onCommit={(y) => set({ y })} />
      </Field>
      <Field label="Rotation Yaw">
        <NumberField value={ps.yaw} unit="°" onCommit={(yaw) => set({ yaw })} />
      </Field>
    </Group>
    <Group title="Object">
      <Field label="Player Start Tag">
        <TextCommit value={ps.tag ?? ''} onCommit={(tag) => set({ tag })} />
      </Field>
    </Group>
    {id !== MAIN_START_ID && (
      <button class="btn danger" onClick={remove}>
        Supprimer ce Player Start
      </button>
    )}
    <AppHelp>
      <p>Player Start : un endroit où le joueur peut apparaître. Au lancement d’un niveau, c’est le GameMode qui choisit.</p>
      {several ? (
        <p>
          Ce niveau en a plusieurs : sans rien de plus, le GameMode en prend un au hasard, comme UE. Pour choisir, surcharge sa fonction <b>Choose Player Start</b>{' '}
          (My Blueprint › Functions › Override) et compare le <b>Player Start Tag</b> de chacun (Get All Actors Of Class › PlayerStart, Get Player Start Tag).
        </p>
      ) : (
        <p>Place Actors › Placer un Player Start en ajoute un autre : par exemple un par porte d’arrivée, chacun avec son Player Start Tag.</p>
      )}
    </AppHelp>
    </>
  );
}

/**
 * World Settings of the level open in the editor, as UE's: its GameMode
 * Override, and the classes its GameMode makes for the player (Selected GameMode).
 */
export function WorldSettingsDetails() {
  const store = useStore();
  const p = store.project;
  const level = levelOf(p);
  const modes = p.classes.filter((c) => rootParent(p, c) === 'GameModeBase');
  const used = gameModeOf(p, level);
  const set = (id: string) => {
    const res = store.applyProject('Régler GameMode Override', (q) => setGameModeOverride(q, level.id, id));
    if (!res.ok) store.warn(res.reason);
  };
  const defaultName = (p.mapsModes?.defaultGameMode && findClass(p, p.mapsModes.defaultGameMode)?.name) || 'GameModeBase';
  return (
    <>
      <Group title="Game Mode">
        <Field label="GameMode Override">
          <select class="field" aria-label="GameMode Override" value={level.gameModeOverride ?? ''} onChange={(e) => set((e.target as HTMLSelectElement).value)}>
            <option value="">None</option>
            {modes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      </Group>
      <Group title={`Selected GameMode · ${used?.name ?? 'GameModeBase'}`}>
        <GameModeFields gameModeId={used?.id} />
      </Group>
      <AppHelp>
        <p>
          <b>World Settings</b> de {level.name} : les réglages du niveau lui-même. <b>GameMode Override</b> remplace, pour ce niveau seulement, le Default
          GameMode du projet ({defaultName}, Project Settings › Maps & Modes). Sur None, le niveau prend le Default GameMode.
        </p>
        <p>Selected GameMode montre (et règle) les classes du GameMode qu’aura ce niveau : son pion et son Player Controller.</p>
      </AppHelp>
    </>
  );
}
