/** Details of a Local Variable: name, type and the value each call starts from. */
import { findGraph } from '@core/model/project';
import { localUsage, removeLocalVariable, renameLocalVariable, setLocalVariableDefault, setLocalVariableType } from '@core/operations/localOps';
import { useStore } from '../hooks';
import type { OpenOverlay } from '../overlayTypes';
import { NameField } from '../widgets/NameField';
import { TypeSelect } from '../widgets/TypeSelect';
import { ValueInput } from '../widgets/ValueInput';
import { Field, Group } from './fields';

export function LocalDetails({ graphId, id, openOverlay }: { graphId: string; id: string; openOverlay: OpenOverlay }) {
  const store = useStore();
  const g = findGraph(store.cls, graphId);
  const l = g?.fn?.locals?.find((x) => x.id === id);
  if (!g || !l) return null;
  const usage = localUsage(store.cls, graphId, id);
  const remove = () => store.apply('Supprimer la variable locale', (c) => removeLocalVariable(c, graphId, id));
  return (
    <>
      <Group title="Local Variable">
        <Field label="Variable Name">
          <NameField value={l.name} onCommit={(name) => store.apply('Renommer la variable locale', (c) => renameLocalVariable(store.project, c, graphId, id, name))} />
        </Field>
        <Field label="Variable Type">
          <TypeSelect type={l.type} onChange={(t) => store.apply('Changer le type', (c) => setLocalVariableType(store.project, c, graphId, id, t))} />
        </Field>
        <p class="muted small">
          Variable locale de {g.name} : elle n'existe que pendant un appel. Chaque appel repart de la valeur par défaut, et deux appels (même récursifs)
          ont chacun la leur. Pour garder une valeur d'un appel à l'autre, utilise une variable du Blueprint.
        </p>
      </Group>
      <Group title="Default Value">
        <Field label={l.name}>
          <ValueInput type={l.type} value={l.defaultValue} onChange={(v) => store.apply('Valeur par défaut', (c) => setLocalVariableDefault(c, graphId, id, v))} />
        </Field>
        <p class="muted small">Valeur au début de chaque appel de {g.name}.</p>
      </Group>
      <Group title="Utilisation">
        <p class="muted small">{usage === 0 ? 'Aucun nœud ne l’utilise.' : `${usage} nœud(s) Get/Set l’utilisent.`}</p>
        <button
          class="btn danger"
          onClick={() =>
            usage === 0
              ? remove()
              : openOverlay({
                  kind: 'confirm',
                  title: `Supprimer ${l.name} ?`,
                  text: `${usage} nœud(s) utilisent cette variable locale et seront supprimés avec elle.`,
                  confirmLabel: 'Supprimer',
                  onConfirm: remove,
                })
          }
        >
          Supprimer la variable locale
        </button>
      </Group>
    </>
  );
}
