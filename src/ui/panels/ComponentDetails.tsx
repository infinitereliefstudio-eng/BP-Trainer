/** Details of a component: name and the properties its kind uses. */
import { COMPONENT_LABEL, findComponent, type ComponentProps, type MeshShape } from '@core/model/project';
import { removeComponent, renameComponent, setWidgetClass, updateComponentProps } from '@core/operations/classOps';
import { BUILTIN_ENUMS } from '@core/types/enums';
import type { Value } from '@core/types/values';
import { useStore } from '../hooks';
import { LogicComponentDetails } from './LogicComponentDetails';
import { NameField } from '../widgets/NameField';
import { AppHelp, Check, Field, Group, NumberField, TextCommit } from './fields';

const SHAPES: { value: MeshShape; label: string }[] = [
  { value: 'cube', label: 'Cube' },
  { value: 'cylinder', label: 'Cylindre' },
  { value: 'door', label: 'Porte (pivot au gond)' },
];

export function ComponentDetails({ id, placeNode, onOpenClass }: { id: string; placeNode?: (def: string, config: Record<string, Value>) => void; onOpenClass?: (classId: string) => void }) {
  const store = useStore();
  const c = findComponent(store.cls, id);
  if (!c) return null;
  if (c.kind === 'ActorComponent') return <LogicComponentDetails c={c} placeNode={placeNode} onOpenClass={onOpenClass} />;
  const parent = c.parent ? findComponent(store.cls, c.parent) : undefined;
  const set = (patch: Partial<ComponentProps>) => store.apply(`Modifier ${c.name}`, (cl) => updateComponentProps(cl, c.id, patch));
  const p = c.props;
  const isRoot = !c.parent;

  return (
    <>
      <Group title="Variable">
        <Field label="Variable Name">
          <NameField value={c.name} onCommit={(name) => store.apply('Renommer le composant', (cl) => renameComponent(cl, c.id, name))} />
        </Field>
        <Field label="Component Class">
          <span>{COMPONENT_LABEL[c.kind]}</span>
        </Field>
        <Field label="Attach Parent">
          <span>{parent ? parent.name : '— (racine)'}</span>
        </Field>
      </Group>

      {!isRoot && (
        <Group title="Transform">
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

      {c.kind === 'Widget' && (
        <Group title="User Interface">
          <Field label="Space">
            <select class="field" value="Screen" disabled title="Seul Screen est simulé : la vue de dessus ne peut pas montrer une surface posée dans la scène (World)">
              <option value="Screen">Screen</option>
            </select>
          </Field>
          <Field label="Widget Class">
            <select
              class="field"
              value={c.classId ?? ''}
              onChange={(e) => {
                const v = (e.target as HTMLSelectElement).value;
                const res = store.apply(`Modifier ${c.name}`, (cl) => setWidgetClass(store.project, cl, c.id, v || undefined));
                if (!res.ok) store.warn(res.reason);
              }}
            >
              <option value="">None</option>
              {store.project.classes
                .filter((k) => k.parent === 'UserWidget')
                .map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Draw Size X">
            <NumberField value={p.sizeX} unit="px" onCommit={(sizeX) => set({ sizeX: Math.max(1, Math.round(sizeX)) })} />
          </Field>
          <Field label="Draw Size Y">
            <NumberField value={p.sizeY} unit="px" onCommit={(sizeY) => set({ sizeY: Math.max(1, Math.round(sizeY)) })} />
          </Field>
        </Group>
      )}

      {c.kind === 'Widget' && (
        <Group title="Rendering">
          <Field label="Visible">
            <Check checked={p.visible} onChange={(visible) => set({ visible })} />
          </Field>
        </Group>
      )}

      {c.parent && (
        <Group title="Composant" app>
          <button
            class="btn danger"
            onClick={() => {
              const res = store.apply('Supprimer le composant', (cl) => removeComponent(cl, c.id));
              if (!res.ok) store.warn(res.reason);
            }}
          >
            Supprimer le composant
          </button>
        </Group>
      )}
      <AppHelp>
        {!isRoot && <p><b>Transform</b> : relatif au composant parent (Attach Parent), comme la Relative Location d’UE.</p>}
        {c.kind === 'StaticMesh' && <p><b>Static Mesh</b> : dans UE, la forme est un asset (Cube, Cylinder…) ; ici, une forme simple. « Bloque le joueur » résume la collision Block All.</p>}
        {(c.kind === 'PointLight' || c.kind === 'StaticMesh' || c.kind === 'TextRender' || c.kind === 'Widget') && (
          <p><b>Visible</b> est l’état au lancement du jeu. Ta logique peut le changer avec Set Visibility.</p>
        )}
        {c.kind === 'BoxCollision' && <p><b>Box Collision</b> : une zone qui ne bloque rien ; elle déclenche les événements Begin / End Overlap.</p>}
        {c.kind === 'Widget' && (
          <>
            <p>
              <b>Widget Component</b> : un Widget Blueprint porté par l’acteur. Chaque acteur posé a <b>son propre exemplaire</b> du widget : trois ennemis,
              trois barres. En Play, il est dessiné par-dessus la vue (Space Screen) et suit l’acteur ; il disparaît avec lui.
            </p>
            <p>
              <b>Get User Widget Object</b> (cible : ce composant) donne ce widget. Il est typé User Widget : un <b>Cast To</b> vers ton Widget Blueprint
              donne accès à ses variables et à ses widgets (Set Percent…). Widget Class à None : il n’y a pas de widget, et Get User Widget Object donne
              None.
            </p>
            <p>
              <b>Draw Size</b> : la taille du widget à l’écran, en pixels de l’écran de référence (720 de haut). UE part de 500 × 500, souvent trop grand :
              une barre de vie fait plutôt 150 × 20.
            </p>
            <p>
              <b>Space</b> : en World, UE pose le widget comme un panneau dans la scène 3D (un écran de terminal), caché par les murs et vu de biais. La vue
              de dessus ne peut pas le montrer : l’appli simule Screen seulement. Dans UE, on le place au-dessus de l’acteur avec Location Z ; ici, Location
              Y négatif le remonte à l’écran. Cette Location ne tourne pas avec l’acteur : le widget reste au-dessus de lui, comme Location Z dans UE.
            </p>
          </>
        )}
        {(c.kind === 'StaticMesh' || c.kind === 'BoxCollision') && (
          <p>
            <b>Collision Enabled</b> : Query sert aux overlaps, aux Line Trace et au déplacement du joueur (un mesh qui bloque l’arrête). Physics concerne les
            objets qui simulent la physique, absents ici. Set Collision Enabled le change en jeu.
          </p>
        )}
      </AppHelp>
    </>
  );
}
