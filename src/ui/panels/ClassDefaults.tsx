/**
 * Class Defaults, as UE's toolbar button: the default value of every
 * variable of the Blueprint, grouped by Category. Inherited variables are
 * listed too: a child Blueprint sets its own default for them, as in UE
 * (V7.67), or keeps its parent's.
 */
import { rootParent } from '@core/model/inheritance';
import { setInheritedDefault, updateVariable } from '@core/operations/classOps';
import { sameType } from '@core/types/pins';
import { useStore } from '../hooks';
import { ValueInput } from '../widgets/ValueInput';
import { AppHelp, Field, Group } from './fields';
import { GameModeFields } from './GameModeFields';
import { Icon } from '../widgets/icons';

export function ClassDefaults() {
  const store = useStore();
  const cls = store.cls;
  const view = store.ctx.cls;
  const inherited = view.variables.filter((v) => !cls.variables.some((o) => o.id === v.id));
  const categories = [...new Set(cls.variables.map((v) => v.category || 'Default'))];
  const isGameMode = rootParent(store.project, cls) === 'GameModeBase';
  /** Does this class set its own default for the inherited variable `id` (for its current type)? */
  const ownFor = (id: string) => {
    const own = cls.inheritedDefaults?.[id];
    const v = inherited.find((x) => x.id === id);
    return !!own && !!v && sameType(own.type, v.type);
  };
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
        <Group title="Hérité">
          {inherited.map((v) => (
            <Field key={v.id} label={v.name}>
              <div class="inherited-default">
                <ValueInput type={v.type} value={v.defaultValue} onChange={(val) => store.apply('Valeur par défaut', (c) => setInheritedDefault(c, v, val))} />
                {ownFor(v.id) ? (
                  <button aria-label="Reprendre la valeur du parent" type="button" class="chip" title="Reprendre la valeur du parent" onClick={() => store.apply('Valeur du parent', (c) => setInheritedDefault(c, v, undefined))}>
                    <Icon name="reset" />
                  </button>
                ) : (
                  <span class="muted small">du parent</span>
                )}
              </div>
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
        {inherited.length > 0 && (
          <p>
            <b>Hérité</b> : les variables du parent. Un enfant leur donne sa propre valeur de départ (un drone rapide, un drone lent), sans toucher au parent ni
            aux autres enfants ; ↺ reprend la valeur du parent. Dans UE, elles sont mêlées aux autres sous leur Category ; ici, elles sont à part.
          </p>
        )}
      </AppHelp>
    </>
  );
}
