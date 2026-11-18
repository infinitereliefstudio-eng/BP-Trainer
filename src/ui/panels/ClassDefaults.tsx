/**
 * Class Defaults, as UE's toolbar button: the default value of every
 * variable of the Blueprint, grouped by Category. Inherited variables are
 * listed too, read-only here: their default is set in the parent.
 */
import { updateVariable } from '@core/operations/classOps';
import { useStore } from '../hooks';
import { ValueInput } from '../widgets/ValueInput';
import { Field, Group } from './fields';

export function ClassDefaults() {
  const store = useStore();
  const cls = store.cls;
  const view = store.ctx.cls;
  const inherited = view.variables.filter((v) => !cls.variables.some((o) => o.id === v.id));
  const categories = [...new Set(cls.variables.map((v) => v.category || 'Default'))];
  return (
    <>
      <Group title={`Class Defaults · ${cls.name}`}>
        <p class="muted small">
          La valeur de départ de chaque variable, pour toutes les instances de ce Blueprint. Une variable Instance Editable peut ensuite être changée acteur par
          acteur dans le niveau.
        </p>
      </Group>
      {cls.variables.length === 0 && inherited.length === 0 && <p class="hint">Ce Blueprint n’a pas de variable.</p>}
      {categories.map((cat) => (
        <Group key={cat} title={cat}>
          {cls.variables
            .filter((v) => (v.category || 'Default') === cat)
            .map((v) => (
              <Field key={v.id} label={v.name}>
                <ValueInput type={v.type} value={v.defaultValue} onChange={(val) => store.apply('Valeur par défaut', (c) => updateVariable(c, v.id, { defaultValue: val }))} />
              </Field>
            ))}
        </Group>
      ))}
      {inherited.length > 0 && (
        <Group title="Hérité">
          {inherited.map((v) => (
            <Field key={v.id} label={v.name}>
              <span class="muted small">{String(typeof v.defaultValue === 'object' ? JSON.stringify(v.defaultValue) : v.defaultValue)} · réglé dans le parent</span>
            </Field>
          ))}
        </Group>
      )}
    </>
  );
}
