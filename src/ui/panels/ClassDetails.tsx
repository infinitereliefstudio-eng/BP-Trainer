/** Class Settings: name, parent, input, implemented interfaces, player pawn and controller. */
import { implementInterface, removeImplementedInterface } from '@core/operations/classOps';
import { isA, rootParent } from '@core/model/inheritance';
import { removeClass, renameClass, setParentClass, setPlayerClass, setPlayerControllerClass } from '@core/operations/projectOps';
import { familyOf } from '@core/model/project';
import { widgetUsers } from '@core/operations/widgetOps';
import { useStore } from '../hooks';
import type { OpenOverlay } from '../overlayTypes';
import { NameField } from '../widgets/NameField';
import { AppHelp, Field, Group } from './fields';

export function ClassDetails({ openOverlay }: { openOverlay: OpenOverlay }) {
  const store = useStore();
  const cls = store.cls;
  const project = store.project;
  const isPlayer = project.playerClassId === cls.id;
  const root = rootParent(project, cls);
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
        : [{ label: 'Aucune interface : crée-en une dans le Content Drawer (+ Add › Blueprint › Blueprint Interface).', disabled: true }],
    });
  };

  const nodes = cls.graphs.reduce((n, g) => n + Object.keys(g.nodes).length, 0);
  const remove = () =>
    openOverlay({
      kind: 'confirm',
      title: `Supprimer ${cls.name} ?`,
      text: 'Le Blueprint et tous ses graphes seront supprimés. Tu peux annuler avec le bouton ↶.',
      confirmLabel: 'Supprimer',
      onConfirm: () => {
        const res = store.applyProject('Supprimer le Blueprint', (p) => removeClass(p, cls.id));
        if (!res.ok) store.warn(res.reason);
      },
    });
  const setParent = (parent: string) => {
    const res = store.applyProject('Changer la classe parente', (p) => setParentClass(p, cls.id, parent));
    if (!res.ok) store.warn(res.reason);
  };
  /** Renaming and deleting are done in UE's Content Browser: here, in an amber section. */
  const blueprint = (
    <Group title="Blueprint" app>
      <Field label="Nom du Blueprint">
        <NameField value={cls.name} onCommit={(name) => store.applyProject('Renommer le Blueprint', (p) => renameClass(p, cls.id, name))} />
      </Field>
      <p class="muted small">
        {cls.components.length} composant(s), {cls.variables.length} variable(s), {nodes} nœud(s).
      </p>
      <button class="btn danger" onClick={remove}>
        Supprimer ce Blueprint
      </button>
    </Group>
  );

  if (root === 'ActorComponent') {
    const users = project.classes.filter((c) => c.components.some((k) => k.kind === 'ActorComponent' && k.classId === cls.id));
    return (
      <>
        <Group title="Class Options">
          <Field label="Parent Class">
            <select class="field" value={cls.parentClassId ?? cls.parent} onChange={(e) => setParent((e.target as HTMLSelectElement).value)}>
              <option value="ActorComponent">ActorComponent</option>
              {project.classes
                .filter((c) => c.id !== cls.id && c.parent === 'ActorComponent' && !isA(project, c.id, cls.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
        </Group>
        <Group title="Interfaces">
          <Field label="Implemented Interfaces">
            <span class="muted small">{implemented.length ? implemented.map((i) => i.name).join(', ') : 'aucune'}</span>
          </Field>
          <button class="btn" onClick={addInterface}>
            + Add
          </button>
        </Group>
        <Group title="Utilisé par" app>
          {users.length ? (
            users.map((u) => <p key={u.id}>{u.name}</p>)
          ) : (
            <p class="muted small">Aucun acteur ne le porte encore : ouvre un Blueprint d’acteur, Components › + Add › {cls.name}.</p>
          )}
        </Group>
        {blueprint}
        <AppHelp>
          <p>
            Un <b>Actor Component</b> est de la logique qu’on ajoute à des acteurs, comme un Static Mesh, mais sans place dans le monde : pas de position, pas de
            forme, pas de Viewport ni de Construction Script. Chaque acteur qui le porte a sa propre copie et ses propres variables.
          </p>
          <p>
            Dans ses graphes, <b>Self</b> est le composant. Pour agir sur l’acteur qui le porte (le bouger, le cacher, le détruire), passe par{' '}
            <b>Get Owner</b>. Il a BeginPlay, Tick et End Play, mais ni overlap, ni entrées, ni Timeline : son acteur s’en charge, ou il s’abonne à On Actor
            Begin Overlap de son Owner.
          </p>
          <p>
            <b>Parent ou composant ?</b> Un parent dit « est un » (une pompe est une machine) ; un composant dit « a un » (une caisse, une tourelle et le joueur
            ont une santé).
          </p>
        </AppHelp>
      </>
    );
  }

  if (root === 'UserWidget') {
    const users = widgetUsers(project, cls.id);
    return (
      <>
        <Group title="Class Options">
          <Field label="Parent Class">
            <span>UserWidget</span>
          </Field>
        </Group>
        <Group title="Interfaces">
          <Field label="Implemented Interfaces">
            <span class="muted small">{implemented.length ? implemented.map((i) => i.name).join(', ') : 'aucune'}</span>
          </Field>
          <button class="btn" onClick={addInterface}>
            + Add
          </button>
        </Group>
        {users.length > 0 && (
          <Group title="Placé dans" app>
            {users.map((u) => (
              <p key={u.id}>{u.name}</p>
            ))}
          </Group>
        )}
        {blueprint}
        <AppHelp>
          <p>
            Un <b>Widget Blueprint</b> est une interface dessinée par-dessus le jeu : un HUD, un menu, une barre de vie. Il n’est pas dans le niveau et n’a pas de
            composants : on le compose dans le <b>Designer</b> (Palette, Hierarchy, Details), on écrit sa logique dans le <b>Graph</b>.
          </p>
          <p>
            Pendant le jeu, un autre Blueprint (souvent le Player Controller) le crée avec <b>Create Widget</b>, garde la référence dans une variable, puis l’affiche
            avec <b>Add to Viewport</b>. Dans le Graph, <b>Event Construct</b> joue le rôle de BeginPlay.
          </p>
          <p class="app-only-text">Simplification de l’appli : un Widget Blueprint garde UserWidget pour parent (pas d’héritage entre Widget Blueprints).</p>
        </AppHelp>
      </>
    );
  }

  if (root === 'GameInstance') {
    const chosen = project.mapsModes?.gameInstanceClass === cls.id;
    return (
      <>
        <Group title="Class Options">
          <Field label="Parent Class">
            <select class="field" value={cls.parentClassId ?? cls.parent} onChange={(e) => setParent((e.target as HTMLSelectElement).value)}>
              <option value="GameInstance">GameInstance</option>
              {project.classes
                .filter((c) => c.id !== cls.id && c.parent === 'GameInstance' && !isA(project, c.id, cls.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Game Instance Class">
            <span class="dbg-val">{chosen ? 'oui (Maps & Modes)' : 'non : choisis-le dans Project Settings › Maps & Modes'}</span>
          </Field>
        </Group>
        {blueprint}
        <AppHelp>
          <p>
            Un GameInstance n’est pas un acteur : pas de composants, pas de place dans le niveau, ni BeginPlay ni Tick. Le jeu en crée <strong>un seul</strong>, au
            lancement, et le garde jusqu’à la fermeture : ses variables traversent les Open Level. <b>Event Init</b> au lancement, <b>Event Shutdown</b> à la fermeture.
          </p>
          <p>
            Pour l’utiliser : Get Game Instance, puis Cast To {cls.name}. Sans Game Instance Class réglée sur {cls.name} (menu ⋮ › Project Settings), le jeu crée un
            GameInstance ordinaire et ce Cast échoue.
          </p>
        </AppHelp>
      </>
    );
  }

  if (root === 'SaveGame') {
    return (
      <>
        <Group title="Class Options">
          <Field label="Parent Class">
            <select class="field" value={cls.parentClassId ?? cls.parent} onChange={(e) => setParent((e.target as HTMLSelectElement).value)}>
              <option value="SaveGame">SaveGame</option>
              {project.classes
                .filter((c) => c.id !== cls.id && c.parent === 'SaveGame' && !isA(project, c.id, cls.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </Field>
        </Group>
        {blueprint}
        <AppHelp>
          <p>
            Un SaveGame n’est pas un acteur : pas de composants, pas de place dans le niveau. Il ne contient que des <strong>variables</strong>, celles qu’on veut
            retrouver à la partie suivante. Create Save Game Object en fabrique un, Save Game to Slot l’écrit, Load Game from Slot le relit (puis Cast To {cls.name}).
          </p>
        </AppHelp>
      </>
    );
  }

  return (
    <>
      <Group title="Class Options">
        <Field label="Parent Class">
          <select class="field" value={cls.parentClassId ?? cls.parent} onChange={(e) => setParent((e.target as HTMLSelectElement).value)}>
            <option value="Actor">Actor</option>
            <option value="Pawn">Pawn</option>
            <option value="PlayerController">PlayerController</option>
            {store.project.classes
              .filter((c) => c.id !== cls.id && familyOf(c.parent) === 'actor' && !isA(store.project, c.id, cls.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </Field>
      </Group>

      <Group title="Input">
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
      </Group>

      <Group title="Interfaces">
        <Field label="Implemented Interfaces">
          <span class="muted small">{implemented.length ? `${implemented.length}` : 'aucune'}</span>
        </Field>
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
          + Add
        </button>
      </Group>

      <Group title="Game Mode" app>
        {root === 'PlayerController' ? (
          <Field label="Player Controller Class">
            <input
              type="checkbox"
              checked={project.playerControllerClassId === cls.id}
              onChange={(e) => {
                const on = (e.target as HTMLInputElement).checked;
                const res = store.applyProject('Player Controller du joueur', (p) => setPlayerControllerClass(p, on ? cls.id : undefined));
                if (!res.ok) store.warn(res.reason);
              }}
            />
          </Field>
        ) : (
          <Field label="Default Pawn">
            <input
              type="checkbox"
              checked={isPlayer}
              disabled={root !== 'Pawn'}
              onChange={(e) => {
                const on = (e.target as HTMLInputElement).checked;
                const res = store.applyProject('Pion du joueur', (p) => setPlayerClass(p, on ? cls.id : undefined));
                if (!res.ok) store.warn(res.reason);
              }}
            />
          </Field>
        )}
      </Group>

      {blueprint}

      <AppHelp>
        {cls.parentClassId && (
          <p>
            <b>Parent Class</b> : ce Blueprint hérite des composants, variables (sauf Private), fonctions et événements de son parent. Un événement ou une
            fonction du même nom ici remplace celui du parent ; le nœud « Parent: … » appelle quand même sa version.
          </p>
        )}
        <p>
          <b>Auto Receive Input</b> :{' '}
          {root === 'PlayerController'
            ? 'un Player Controller reçoit toujours les entrées : il est sur la pile d’entrée, sous les acteurs en Player 0 et au-dessus du pion.'
            : 'sans Player 0, les événements de touche (E, F, Espace) de ce Blueprint ne se déclenchent pas. Le joueur, lui, les reçoit toujours.'}
        </p>
        <p>
          <b>Implemented Interfaces</b> : un Blueprint qui implémente une interface peut répondre à ses messages, sans que l’appelant connaisse son type.
        </p>
        <p>
          <b>Game Mode</b> :{' '}
          {root === 'PlayerController'
            ? 'coché, le jeu crée ce Blueprint comme Player Controller du joueur quand tu lances Play. Sinon, c’est le PlayerController natif, sans graphe.'
            : root === 'Pawn'
              ? 'coché, ce Blueprint devient le joueur quand tu lances Play.'
              : 'seul un Blueprint de classe parente Pawn peut être le joueur.'}{' '}
          Dans UE, ce réglage n’est pas dans Class Settings : il est dans le Game Mode (Default Pawn Class, Player Controller Class), choisi dans World Settings
          ou Project Settings › Maps & Modes. BP Trainer n’a pas de Game Mode : il le règle ici.
        </p>
      </AppHelp>
    </>
  );
}
