/** Details of a component: name and the properties its kind uses. */
import { COMPONENT_LABEL, findComponent, type ComponentProps, type MeshShape } from '@core/model/project';
import { removeComponent, renameComponent, updateComponentProps } from '@core/operations/classOps';
import { BUILTIN_ENUMS } from '@core/types/enums';
import { useStore } from '../hooks';
import { NameField } from '../widgets/NameField';
import { Check, Field, Group, NumberField, TextCommit } from './fields';

const SHAPES: { value: MeshShape; label: string }[] = [
  { value: 'cube', label: 'Cube' },
  { value: 'cylinder', label: 'Cylindre' },
  { value: 'door', label: 'Porte (pivot au gond)' },
];

export function ComponentDetails({ id }: { id: string }) {
  const store = useStore();
  const c = findComponent(store.cls, id);
  if (!c) return null;
  const parent = c.parent ? findComponent(store.cls, c.parent) : undefined;
  const set = (patch: Partial<ComponentProps>) => store.apply(`Modifier ${c.name}`, (cl) => updateComponentProps(cl, c.id, patch));
  const p = c.props;
  const isRoot = !c.parent;

  return (
    <>
      <Group title="Composant">
        <Field label="Nom">
          <NameField value={c.name} onCommit={(name) => store.apply('Renommer le composant', (cl) => renameComponent(cl, c.id, name))} />
        </Field>
        <Field label="Type">
          <span>{COMPONENT_LABEL[c.kind]}</span>
        </Field>
        <Field label="Parent">
          <span>{parent ? parent.name : '— (racine)'}</span>
        </Field>
      </Group>

      {!isRoot && (
        <Group title="Transform (relatif au parent)">
          <Field label="Location X">
            <NumberField value={p.x} unit="cm" onCommit={(x) => set({ x })} />
          </Field>
          <Field label="Location Y">
            <NumberField value={p.y} unit="cm" onCommit={(y) => set({ y })} />
          </Field>
          <Field label="Rotation Yaw">
            <NumberField value={p.yaw} unit="°" onCommit={(yaw) => set({ yaw })} />
          </Field>
        </Group>
      )}

      {c.kind === 'StaticMesh' && (
        <Group title="Static Mesh">
          <Field label="Forme">
            <select class="field" value={p.shape} onChange={(e) => set({ shape: (e.target as HTMLSelectElement).value as MeshShape })}>
              {SHAPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={p.shape === 'cylinder' ? 'Diamètre' : 'Taille X'}>
            <NumberField value={p.sizeX} unit="cm" onCommit={(sizeX) => set({ sizeX: Math.max(1, sizeX) })} />
          </Field>
          {p.shape !== 'cylinder' && (
            <Field label="Taille Y">
              <NumberField value={p.sizeY} unit="cm" onCommit={(sizeY) => set({ sizeY: Math.max(1, sizeY) })} />
            </Field>
          )}
          <Field label="Couleur">
            <input class="field color" type="color" value={p.color} onChange={(e) => set({ color: (e.target as HTMLInputElement).value })} />
          </Field>
          <Field label="Bloque le joueur">
            <Check checked={p.blocks} onChange={(blocks) => set({ blocks })} />
          </Field>
          <Field label="Visible">
            <Check checked={p.visible} onChange={(visible) => set({ visible })} />
          </Field>
        </Group>
      )}

      {c.kind === 'PointLight' && (
        <Group title="Light">
          <Field label="Visible">
            <Check checked={p.visible} onChange={(visible) => set({ visible })} />
          </Field>
          <Field label="Intensity">
            <NumberField value={p.intensity} onCommit={(intensity) => set({ intensity: Math.max(0, intensity) })} />
          </Field>
          <Field label="Attenuation Radius">
            <NumberField value={p.radius} unit="cm" onCommit={(radius) => set({ radius: Math.max(0, radius) })} />
          </Field>
          <Field label="Light Color">
            <input class="field color" type="color" value={p.color} onChange={(e) => set({ color: (e.target as HTMLInputElement).value })} />
          </Field>
          <p class="muted small">« Visible » est l’état au lancement du jeu. Ta logique peut le changer avec Set Visibility.</p>
        </Group>
      )}

      {c.kind === 'BoxCollision' && (
        <Group title="Shape">
          <Field label="Box Extent X">
            <NumberField value={p.sizeX} unit="cm" onCommit={(sizeX) => set({ sizeX: Math.max(1, sizeX) })} />
          </Field>
          <Field label="Box Extent Y">
            <NumberField value={p.sizeY} unit="cm" onCommit={(sizeY) => set({ sizeY: Math.max(1, sizeY) })} />
          </Field>
          <p class="muted small">Une zone qui ne bloque rien : elle déclenche les événements Begin / End Overlap.</p>
        </Group>
      )}

      {(c.kind === 'StaticMesh' || c.kind === 'BoxCollision') && (
        <Group title="Collision">
          <Field label="Collision Enabled">
            <select class="field" value={String(p.collision ?? 3)} onChange={(e) => set({ collision: Number((e.target as HTMLSelectElement).value) })}>
              {BUILTIN_ENUMS.ECollisionEnabled.map((label, i) => (
                <option key={i} value={String(i)}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <p class="muted small">Query : déclenche les overlaps. Physics : bloque le joueur. Set Collision Enabled le change en jeu.</p>
        </Group>
      )}

      {c.kind === 'TextRender' && (
        <Group title="Text">
          <Field label="Text">
            <TextCommit value={p.text} onCommit={(text) => set({ text })} />
          </Field>
          <Field label="Couleur">
            <input class="field color" type="color" value={p.color} onChange={(e) => set({ color: (e.target as HTMLInputElement).value })} />
          </Field>
          <Field label="Visible">
            <Check checked={p.visible} onChange={(visible) => set({ visible })} />
          </Field>
        </Group>
      )}

      {c.parent && (
        <div class="d-group">
          <button
            class="btn danger"
            onClick={() => {
              const res = store.apply('Supprimer le composant', (cl) => removeComponent(cl, c.id));
              if (!res.ok) store.warn(res.reason);
            }}
          >
            Supprimer le composant
          </button>
        </div>
      )}
    </>
  );
}
