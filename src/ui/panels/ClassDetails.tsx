/** Class Settings: name, parent, input, implemented interfaces, player pawn. */
import { implementInterface, removeImplementedInterface } from '@core/operations/classOps';
import { isA, rootParent } from '@core/model/inheritance';
import { removeClass, renameClass, setParentClass, setPlayerClass } from '@core/operations/projectOps';
import { useStore } from '../hooks';
import type { OpenOverlay } from '../overlayTypes';
import { NameField } from '../widgets/NameField';
import { Field, Group } from './fields';

export function ClassDetails({ openOverlay }: { openOverlay: OpenOverlay }) {
  const store = useStore();
  const cls = store.cls;
  const project = store.project;
  const isPlayer = project.playerClassId === cls.id;
  const implemented = project.interfaces.filter((i) => cls.interfaces.includes(i.id));
  const available = project.interfaces.filter((i) => !cls.interfaces.includes(i.id));

  const addInterface = (e: MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    openOverlay({
      kind: 'menu',
      sx: r.left,
      sy: r.bottom,
      title: 'Implemented Interfaces',
      items: available.length
        ? available.map((i) => ({ label: i.name, action: () => store.apply(`Implémenter ${i.name}`, (c) => implementInterface(c, i.id)) }))
        : [{ label: 'Aucune interface : crée-en une dans le Content Browser.', disabled: true }],
    });
  };

  return (
    <>
      <Group title="Class Settings">
        <Field label="Nom du Blueprint">
          <NameField value={cls.name} onCommit={(name) => store.applyProject('Renommer le Blueprint', (p) => renameClass(p, cls.id, name))} />
        </Field>
        <Field label="Parent Class">
          <select
            class="field"
            value={cls.parentClassId ?? cls.parent}
            onChange={(e) => {
              const parent = (e.target as HTMLSelectElement).value;
              const res = store.applyProject('Changer la classe parente', (p) => setParentClass(p, cls.id, parent));
              if (!res.ok) store.warn(res.reason);
            }}
          >
            <option value="Actor">Actor</option>
            <option value="Pawn">Pawn</option>
            {store.project.classes
              .filter((c) => c.id !== cls.id && !isA(store.project, c.id, cls.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </Field>
        {cls.parentClassId && (
          <p class="muted small">
            Ce Blueprint hérite des composants, variables (sauf Private), fonctions et événements de son parent. Un événement ou une fonction du même nom ici
            remplace celui du parent ; le nœud « Parent: … » appelle quand même sa version.
          </p>
        )}
        <Field label="Auto Receive Input">
          <select
            class="field"
            value={cls.autoReceiveInput ? 'p0' : 'off'}
            onChange={(e) =>
              store.apply('Auto Receive Input', (c) => {
                c.autoReceiveInput = (e.target as HTMLSelectElement).value === 'p0';
              })
            }
          >
            <option value="off">Disabled</option>
            <option value="p0">Player 0</option>
          </select>
        </Field>
        <p class="muted small">Sans Player 0, les événements de touche (E, F, Espace) de ce Blueprint ne se déclenchent pas. Le joueur, lui, les reçoit toujours.</p>
        <p class="muted small">
          {cls.components.length} composant(s), {cls.variables.length} variable(s),{' '}
          {cls.graphs.reduce((n, g) => n + Object.keys(g.nodes).length, 0)} nœud(s).
        </p>
      </Group>

      <Group title="Interfaces">
        {implemented.length === 0 && <p class="muted small">Aucune interface implémentée.</p>}
        {implemented.map((i) => (
          <div class="param-row" key={i.id}>
            <span class="mb-label">{i.name}</span>
            <button
              class="chip danger"
              onClick={() =>
                openOverlay({
                  kind: 'confirm',
                  title: `Retirer ${i.name} ?`,
                  text: 'Ses événements dans ce Blueprint seront supprimés.',
                  confirmLabel: 'Retirer',
                  onConfirm: () => store.apply(`Retirer ${i.name}`, (c) => removeImplementedInterface(c, i.id)),
                })
              }
            >
              Retirer
            </button>
          </div>
        ))}
        <button class="btn" onClick={addInterface}>
          + Implemented Interface
        </button>
        <p class="muted small">Un Blueprint qui implémente une interface peut répondre à ses messages, sans que l'appelant connaisse son type.</p>
      </Group>

      <Group title="Joueur">
        <Field label="Default Pawn">
          <input
            type="checkbox"
            checked={isPlayer}
            disabled={rootParent(store.project, cls) !== 'Pawn'}
            onChange={(e) => {
              const on = (e.target as HTMLInputElement).checked;
              const res = store.applyProject('Pion du joueur', (p) => setPlayerClass(p, on ? cls.id : undefined));
              if (!res.ok) store.warn(res.reason);
            }}
          />
        </Field>
        <p class="muted small">
          {rootParent(store.project, cls) === 'Pawn'
            ? 'Coché, ce Blueprint devient le joueur quand tu lances Play (Game Mode › Default Pawn Class dans UE).'
            : 'Seul un Blueprint de classe parente Pawn peut être le joueur.'}
        </p>
      </Group>

      <button
        class="btn danger"
        onClick={() =>
          openOverlay({
            kind: 'confirm',
            title: `Supprimer ${cls.name} ?`,
            text: 'Le Blueprint et tous ses graphes seront supprimés. Tu peux annuler avec le bouton ↶.',
            confirmLabel: 'Supprimer',
            onConfirm: () => {
              const res = store.applyProject('Supprimer le Blueprint', (p) => removeClass(p, cls.id));
              if (!res.ok) store.warn(res.reason);
            },
          })
        }
      >
        Supprimer ce Blueprint
      </button>
    </>
  );
}
