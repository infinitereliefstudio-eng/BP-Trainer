/** Details of what is selected in the level: an actor instance or the Player Start. */
import { findClass } from '@core/model/project';
import { actorRefValue, removeActor, setActorOverride, updateActor } from '@core/operations/levelOps';
import type { Value } from '@core/types/values';
import { useStore } from '../hooks';
import { ValueInput } from '../widgets/ValueInput';
import { Field, Group, NumberField, TextCommit } from './fields';

export function ActorDetails({ id, onOpenClass }: { id: string; onOpenClass: (classId: string) => void }) {
  const store = useStore();
  const a = store.project.level.actors.find((x) => x.id === id);
  if (!a) return null;
  const cls = findClass(store.project, a.classId);
  const editable = cls?.variables.filter((v) => v.instanceEditable) ?? [];
  const patch = (label: string, fn: () => void) => store.applyProject(label, fn);

  return (
    <>
      <Group title={a.name}>
        <p class="muted small">Instance de {cls?.name ?? '?'} placée dans le niveau.</p>
        <Field label="Nom">
          <TextCommit value={a.name} onCommit={(name) => name.trim() && patch('Renommer l’acteur', () => updateActor(store.project, a.id, { name: name.trim() }))} />
        </Field>
        <Field label="Location X">
          <NumberField value={a.x} unit="cm" onCommit={(x) => patch('Déplacer l’acteur', () => updateActor(store.project, a.id, { x }))} />
        </Field>
        <Field label="Location Y">
          <NumberField value={a.y} unit="cm" onCommit={(y) => patch('Déplacer l’acteur', () => updateActor(store.project, a.id, { y }))} />
        </Field>
        <Field label="Rotation Yaw">
          <NumberField value={a.yaw} unit="°" onCommit={(yaw) => patch('Tourner l’acteur', () => updateActor(store.project, a.id, { yaw }))} />
        </Field>
        {cls && (
          <button class="btn" onClick={() => onOpenClass(cls.id)}>
            Ouvrir {cls.name}
          </button>
        )}
      </Group>
      <Group title="Variables Instance Editable">
        {editable.length === 0 ? (
          <p class="muted small">Aucune. Coche « Instance Editable » sur une variable du Blueprint pour la régler ici, acteur par acteur.</p>
        ) : (
          editable.map((v) => {
            const value = v.id in a.overrides ? a.overrides[v.id] : v.defaultValue;
            const set = (val: Value) => patch('Régler une variable', () => setActorOverride(store.project, a.id, v.id, val));
            if (v.type.category === 'object' && v.type.container !== 'array') {
              // UE's actor picker: any placed actor of the right class, or None.
              const wanted = v.type.subtype ?? 'Actor';
              const choices = store.project.level.actors.filter((o) => {
                const oc = findClass(store.project, o.classId);
                return o.id !== a.id && (wanted === 'Actor' || oc?.name === wanted || (wanted === 'Pawn' && oc?.parent === 'Pawn'));
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
          })
        )}
      </Group>
      <div class="d-group">
        <button class="btn danger" onClick={() => patch('Supprimer l’acteur', () => removeActor(store.project, a.id))}>
          Retirer du niveau
        </button>
      </div>
    </>
  );
}

export function PlayerStartDetails() {
  const store = useStore();
  const ps = store.project.level.playerStart;
  const set = (patch: Partial<typeof ps>) => store.applyProject('Régler le Player Start', () => Object.assign(store.project.level.playerStart, patch));
  return (
    <Group title="Player Start">
      <p class="muted small">L’endroit où le joueur apparaît quand tu lances Play.</p>
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
  );
}
