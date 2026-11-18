/** Details of what is selected in the level: an actor instance or the Player Start. */
import { inheritedView, isA, rootParent } from '@core/model/inheritance';
import { findClass } from '@core/model/project';
import { actorRefValue, removeActor, setActorOverride, updateActor } from '@core/operations/levelOps';
import type { Value } from '@core/types/values';
import { useStore } from '../hooks';
import { ValueInput } from '../widgets/ValueInput';
import { AppHelp, Field, Group, NumberField, TextCommit } from './fields';

export function ActorDetails({ id, onOpenClass }: { id: string; onOpenClass: (classId: string) => void }) {
  const store = useStore();
  const a = store.project.level.actors.find((x) => x.id === id);
  if (!a) return null;
  const own = findClass(store.project, a.classId);
  const cls = own && inheritedView(own, store.project);
  const editable = cls?.variables.filter((v) => v.instanceEditable) ?? [];
  const patch = (label: string, fn: () => void) => store.applyProject(label, fn);
  const categories = [...new Set(editable.map((v) => v.category || 'Default'))];

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
      </Group>
      {categories.map((cat) => (
      <Group key={cat} title={cat}>
        {editable.filter((v) => (v.category || 'Default') === cat).map((v) => {
            const value = v.id in a.overrides ? a.overrides[v.id] : v.defaultValue;
            const set = (val: Value) => patch('Régler une variable', () => setActorOverride(store.project, a.id, v.id, val));
            if (v.type.category === 'object' && v.type.container !== 'array') {
              // UE's actor picker: any placed actor of the right class, or None.
              const wanted = v.type.subtype ?? 'Actor';
              const choices = store.project.level.actors.filter((o) => {
                const oc = findClass(store.project, o.classId);
                const wantedId = store.project.classes.find((c) => c.name === wanted)?.id;
                // A child Blueprint fits where its parent is expected.
                const fits = wanted === 'Actor' || (wanted === 'Pawn' && !!oc && rootParent(store.project, oc) === 'Pawn') || (!!wantedId && isA(store.project, o.classId, wantedId));
                return o.id !== a.id && fits;
              });
              return (
                <Field key={v.id} label={v.name}>
                  <select class="field" value={String(value ?? '')} onChange={(e) => set((e.target as HTMLSelectElement).value || null)}>
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
              <Field key={v.id} label={v.name}>
                <ValueInput type={v.type} value={value} onChange={set} />
              </Field>
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
      </AppHelp>
    </>
  );
}

export function PlayerStartDetails() {
  const store = useStore();
  const ps = store.project.level.playerStart;
  const set = (patch: Partial<typeof ps>) => store.applyProject('Régler le Player Start', () => Object.assign(store.project.level.playerStart, patch));
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
    <AppHelp>
      <p>Player Start : l’endroit où le joueur apparaît quand tu lances Play.</p>
    </AppHelp>
    </>
  );
}
