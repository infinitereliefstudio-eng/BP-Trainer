/**
 * Class Defaults, as UE's toolbar button: the default value of every
 * variable of the Blueprint, grouped by Category. Inherited variables are
 * listed too, read-only here: their default is set in the parent.
 */
import { rootParent } from '@core/model/inheritance';
import { updateVariable } from '@core/operations/classOps';
import { useStore } from '../hooks';
import { ValueInput } from '../widgets/ValueInput';
import { AppHelp, Field, Group } from './fields';
import { GameModeFields } from './GameModeFields';

export function ClassDefaults() {
  const store = useStore();
  const cls = store.cls;
  const view = store.ctx.cls;
  const inherited = view.variables.filter((v) => !cls.variables.some((o) => o.id === v.id));
  const categories = [...new Set(cls.variables.map((v) => v.category || 'Default'))];
  const isGameMode = rootParent(store.project, cls) === 'GameModeBase';
  return (
    <>
      {/* A GameMode's own Class Defaults, as UE's: the classes it makes for the player. */}
      {isGameMode && (
        <Group title="Classes">
          <GameModeFields gameModeId={cls.id} />
        </Group>
      )}
      {cls.variables.length === 0 && inherited.length === 0 && !isGameMode && <p class="hint">Ce Blueprint n’a pas de variable.</p>}
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
        <Group title="Hérité" app>
          {inherited.map((v) => (
            <Field key={v.id} label={v.name}>
              <span class="muted small">{String(typeof v.defaultValue === 'object' ? JSON.stringify(v.defaultValue) : v.defaultValue)} · réglé dans le parent</span>
            </Field>
          ))}
        </Group>
      )}
      <AppHelp>
        <p>
          <b>Class Defaults</b> de {cls.name} : la valeur de départ de chaque variable, pour toutes les instances de ce Blueprint, rangées par Category. Une
          variable Instance Editable peut ensuite être changée acteur par acteur dans le niveau.
        </p>
        {isGameMode && (
          <p>
            <b>Classes</b> : ce que ce GameMode fait apparaître pour le joueur au lancement d’un niveau : le pion (Default Pawn Class) et le Player Controller
            (Player Controller Class). Dans UE, cette rubrique a aussi HUD Class, Game State Class, Player State Class et Spectator Class, que l’appli ne simule pas.
          </p>
        )}
        {inherited.length > 0 && <p>Dans UE, les variables héritées sont mêlées aux autres sous leur Category ; ici, elles sont à part et se règlent dans le parent.</p>}
      </AppHelp>
    </>
  );
}
