/**
 * The Class Defaults of a GameMode that the app simulates — Default Pawn
 * Class and Player Controller Class — as UE shows them in the GameMode's
 * Class Defaults and in Maps & Modes › Selected GameMode.
 */
import { gameModeDefault } from '@core/model/gameMode';
import { parentOf, rootParent } from '@core/model/inheritance';
import { findClass, type GameModeDefaults } from '@core/model/project';
import { setGameModeDefault } from '@core/operations/gameModeOps';
import { useStore } from '../hooks';
import { Field } from './fields';

const INHERIT = '__inherit';

const FIELDS: { key: keyof GameModeDefaults; label: string; root: string; native: string }[] = [
  { key: 'defaultPawnClass', label: 'Default Pawn Class', root: 'Pawn', native: 'DefaultPawn' },
  { key: 'playerControllerClass', label: 'Player Controller Class', root: 'PlayerController', native: 'PlayerController' },
];

/** The two Class Defaults of the GameMode `gameModeId` (a Blueprint); for UE's GameModeBase, its fixed values. */
export function GameModeFields({ gameModeId }: { gameModeId: string | undefined }) {
  const store = useStore();
  const p = store.project;
  const gm = gameModeId ? findClass(p, gameModeId) : undefined;
  if (!gm) {
    return (
      <>
        {FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            <span class="dbg-val">{f.native}</span>
          </Field>
        ))}
      </>
    );
  }
  const parent = parentOf(p, gm);
  const name = (id: string | undefined, native: string) => (id ? (findClass(p, id)?.name ?? native) : native);
  return (
    <>
      {FIELDS.map((f) => {
        const own = gm.gameMode && f.key in gm.gameMode;
        const value = own ? (gm.gameMode![f.key] ?? '') : parent ? INHERIT : '';
        const set = (v: string) => {
          const res = store.applyProject(`Régler ${f.label}`, (q) => setGameModeDefault(q, gm.id, f.key, v === INHERIT ? undefined : v));
          if (!res.ok) store.warn(res.reason);
        };
        return (
          <Field key={f.key} label={f.label}>
            <select class="field" aria-label={f.label} value={value} onChange={(e) => set((e.target as HTMLSelectElement).value)}>
              {parent && <option value={INHERIT}>Hérité de {parent.name} : {name(gameModeDefault(p, parent, f.key), f.native)}</option>}
              <option value="">{f.native}</option>
              {p.classes
                .filter((c) => rootParent(p, c) === f.root)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
        );
      })}
    </>
  );
}
