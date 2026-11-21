/**
 * The Content Drawer, as UE5's (Ctrl+Space): the project's assets as
 * thumbnails, a search field, and + Add with UE's menu (Blueprint Class,
 * Level, then Blueprint, Input, Miscellaneous). A Level opens in the level
 * editor; Play plays the open one. A Blueprint Class asks for its
 * parent (Pick Parent Class), a Data Table for its row structure.
 *
 * Touch: a tap selects (the bar at the bottom offers Open, Place in level,
 * Delete); two taps open, as UE's double-click. The save slots are
 * BP Trainer's own (amber).
 */
import { useRef, useState } from 'preact/hooks';
import { addDataTable } from '@core/operations/dataTableOps';
import { addEnum } from '@core/operations/enumOps';
import { addInputAction, addMappingContext } from '@core/operations/inputOps';
import { addLevel, renameLevel } from '@core/operations/levelAssetOps';
import { addClass, addInterface, addInterfaceFunction, setParentClass } from '@core/operations/projectOps';
import { addStruct } from '@core/operations/structOps';
import { rootParent } from '@core/model/inheritance';
import { NATIVE_PARENTS, type ParentClass, type Project } from '@core/model/project';
import type { Focus } from '@core/store/editorStore';
import { useStore } from '../hooks';
import type { OpenOverlay } from '../overlayTypes';
import { useOwnTap } from '../widgets/useOwnTap';
import { assetStyle, type Asset, assetFocus, projectAssets, removeAsset } from './assets';

interface Props {
  onClose: () => void;
  openOverlay: OpenOverlay;
  onOpenDetails: () => void;
  /** Open a Blueprint in its editor tab. */
  onOpenBlueprint?: (classId: string) => void;
  /** Place an actor of this Blueprint in the level, and show it. */
  onPlaceActor?: (classId: string) => void;
  /** Show the level editor (after a Level asset is opened). */
  onOpenLevel?: () => void;
}

type Mode = 'browse' | 'add' | 'parent' | 'rowStruct';

/** Native parents offered first, with UE's descriptions. */
const COMMON: { id: 'Actor' | 'Pawn' | 'PlayerController' | 'GameModeBase' | 'ActorComponent'; name: string; text: string }[] = [
  { id: 'Actor', name: 'Actor', text: 'Un objet qui peut être posé ou créé (Spawn) dans le monde.' },
  { id: 'Pawn', name: 'Pawn', text: 'Un acteur qui peut être « possédé » et recevoir les entrées d’un contrôleur : le joueur.' },
  { id: 'PlayerController', name: 'Player Controller', text: 'Un acteur qui représente le joueur et le contrôle : il reçoit les entrées et possède le Pawn.' },
  { id: 'GameModeBase', name: 'Game Mode Base', text: 'Les règles d’un niveau : il fait apparaître le joueur (son pion, son Player Controller). Choisi dans Maps & Modes ou les World Settings.' },
  { id: 'ActorComponent', name: 'Actor Component', text: 'De la logique réutilisable qu’on ajoute à n’importe quel acteur (santé, inventaire…). Il n’a pas de place dans le monde.' },
];

type Result = { ok: true; value: { id: string } } | { ok: false; reason: string };

export function ContentDrawer({ onClose, openOverlay, onOpenDetails, onOpenBlueprint, onPlaceActor, onOpenLevel }: Props) {
  const store = useStore();
  const tap = useOwnTap();
  const [mode, setMode] = useState<Mode>('browse');
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const lastTap = useRef<{ id: string; at: number } | null>(null);

  const assets = projectAssets(store.project);
  const q = query.trim().toLowerCase();
  const shown = q ? assets.filter((a) => a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q)) : assets;
  const current = assets.find((a) => `${a.kind}:${a.id}` === selected);

  const openLevel = (id: string) => {
    store.openLevel(id);
    onClose();
    onOpenLevel?.();
  };

  const openAsset = (a: Asset) => {
    if (a.kind === 'level') {
      openLevel(a.id);
      return;
    }
    if (a.kind === 'blueprint') {
      if (onOpenBlueprint) onOpenBlueprint(a.id);
      else store.openClass(a.id);
      onClose();
      return;
    }
    store.setFocus(assetFocus(a) as Focus);
    onClose();
    onOpenDetails();
  };

  const tapAsset = (a: Asset) => {
    const key = `${a.kind}:${a.id}`;
    const now = Date.now();
    if (lastTap.current?.id === key && now - lastTap.current.at < 450) {
      lastTap.current = null;
      openAsset(a);
      return;
    }
    lastTap.current = { id: key, at: now };
    setSelected(key);
  };

  /** Ask for a name, create, then open: the flow of every + Add entry. */
  const create = (title: string, initial: string, label: string, make: (p: Project, name: string) => Result, then: (id: string) => void) =>
    openOverlay({
      kind: 'prompt',
      title,
      initial,
      confirmLabel: 'Créer',
      onSubmit: (name) => {
        if (/\s/.test(name.trim())) return "Un nom d'asset ne peut pas contenir d'espace.";
        const res = store.applyProject(label, (p) => make(p, name));
        if (!res.ok) return res.reason;
        then(res.value.id);
        return null;
      },
    });

  const showDetails = (focus: Focus) => {
    store.setFocus(focus);
    onOpenDetails();
  };

  const createBlueprint = (parent: string, parentName: string) => {
    const isNative = (NATIVE_PARENTS as string[]).includes(parent);
    create(
      parent === 'UserWidget' ? 'Nouveau Widget Blueprint' : `Nouveau Blueprint (parent : ${parentName})`,
      parent === 'SaveGame'
        ? 'BP_Sauvegarde'
        : parent === 'GameInstance'
          ? 'BP_GameInstance'
          : parent === 'GameModeBase'
            ? 'BP_GameMode'
          : parent === 'PlayerController'
          ? 'BP_PlayerController'
          : parent === 'ActorComponent'
            ? 'BP_NewComponent'
            : parent === 'UserWidget'
              ? 'WBP_NewWidget'
              : 'BP_NewBlueprint',
      'Créer un Blueprint',
      (p, name) => {
        // A child starts from its parent's native class: the families (actor, SaveGame, Actor Component) never mix.
        const base = p.classes.find((c) => c.id === parent);
        const r = addClass(p, name, isNative ? (parent as ParentClass) : base ? rootParent(p, base) : 'Actor');
        if (!r.ok || isNative) return r;
        const s = setParentClass(p, r.value.id, parent);
        return s.ok ? r : s;
      },
      (id) => (onOpenBlueprint ? onOpenBlueprint(id) : store.openClass(id)),
    );
  };

  const createTable = (struct: string) =>
    create('Nouvelle Data Table', 'DT_Objets', 'Créer une Data Table', (p, name) => addDataTable(p, struct, name), (id) => showDetails({ kind: 'dataTable', id }));

  const ADVANCED: { group: string; items: { label: string; run: () => void }[] }[] = [
    {
      group: 'Blueprint',
      items: [
        {
          label: 'Blueprint Interface',
          run: () =>
            create(
              'Nouvelle Blueprint Interface',
              'BPI_Interactif',
              'Créer une interface',
              (p, name) => {
                const r = addInterface(p, name);
                if (r.ok) addInterfaceFunction(p, r.value.id, 'Interagir');
                return r;
              },
              (id) => showDetails({ kind: 'interface', id }),
            ),
        },
        {
          label: 'Enumeration',
          run: () => create('Nouvel Enum', 'E_Etat', 'Créer un Enum', (p, name) => addEnum(p, name), (id) => showDetails({ kind: 'enum', id })),
        },
        {
          label: 'Structure',
          run: () => create('Nouvelle Structure', 'S_Objet', 'Créer une structure', (p, name) => addStruct(p, name), (id) => showDetails({ kind: 'struct', id })),
        },
      ],
    },
    {
      group: 'User Interface',
      items: [
        {
          label: 'Widget Blueprint',
          run: () => createBlueprint('UserWidget', 'User Widget'),
        },
      ],
    },
    {
      group: 'Input',
      items: [
        {
          label: 'Input Action',
          run: () =>
            create('Nouvelle Input Action', 'IA_Interagir', 'Créer une Input Action', (p, name) => addInputAction(p, name), (id) => showDetails({ kind: 'inputAction', id })),
        },
        {
          label: 'Input Mapping Context',
          run: () =>
            create('Nouvel Input Mapping Context', 'IMC_Joueur', 'Créer un Mapping Context', (p, name) => addMappingContext(p, name), (id) =>
              showDetails({ kind: 'mappingContext', id }),
            ),
        },
      ],
    },
    {
      group: 'Miscellaneous',
      items: [
        {
          label: 'Data Table',
          run: () => {
            const structs = store.project.structs;
            if (!structs.length) store.warn('Une Data Table range des lignes d’une structure : crée d’abord une Structure (+ Add › Blueprint › Structure).');
            else if (structs.length === 1) createTable(structs[0].name);
            else setMode('rowStruct');
          },
        },
      ],
    },
  ];

  const slots = Object.entries(store.project.saveSlots ?? {});
  const clearSlot = (key?: string) => {
    const p = store.project;
    if (!p.saveSlots) return;
    if (key) delete p.saveSlots[key];
    else p.saveSlots = {};
    store.saveSlotsChanged();
  };

  const head = (title: string, back?: () => void) => (
    <div class="drawer-sheet-head">
      {back && (
        <button class="btn" onClick={back}>
          ‹ Retour
        </button>
      )}
      <strong>{title}</strong>
      <span class="tb-spacer" />
      <button class="btn" onClick={onClose}>
        Fermer
      </button>
    </div>
  );

  return (
    <div class="sheet-backdrop from-bottom" {...tap.root} onClick={tap.guard(onClose)}>
      <div class="sheet content-drawer" role="dialog" aria-label="Content Drawer" onClick={(e) => e.stopPropagation()}>
        {mode === 'browse' && (
          <>
            <div class="drawer-sheet-head">
              <button class="btn primary" onClick={() => setMode('add')}>
                + Add
              </button>
              <span class="cd-path">Content</span>
              <input class="field cd-search" type="search" placeholder="Search Content" value={query} onInput={(e) => setQuery((e.target as HTMLInputElement).value)} />
              <button class="btn" onClick={onClose}>
                Fermer
              </button>
            </div>
            <div class="cd-body">
              <div class="cd-grid">
                {shown.map((a) => {
                  const key = `${a.kind}:${a.id}`;
                  const st = assetStyle(a);
                  return (
                    <button key={key} class={`cd-tile${selected === key ? ' selected' : ''}`} onClick={() => tapAsset(a)} title={a.parent ? `Parent : ${a.parent}` : a.type}>
                      <span class="cd-thumb" style={{ color: st.color }} aria-hidden="true">
                        {st.glyph}
                      </span>
                      <span class="cd-name">{a.name}</span>
                      <span class="cd-type" style={{ borderTopColor: st.color }}>
                        {a.type}
                      </span>
                    </button>
                  );
                })}
                {shown.length === 0 && <p class="muted small pad">Aucun asset ne correspond.</p>}
              </div>
              <div class="cd-slots app-only-zone">
                <div class="palette-cat app-only">Slots de sauvegarde · BP Trainer (dans UE : des fichiers .sav)</div>
                {slots.length === 0 && <p class="muted small pad">Aucun slot. Save Game to Slot en écrit un pendant Play ; il reste après Stop.</p>}
                {slots.map(([key, s]) => (
                  <div key={key} class="palette-item slot-item">
                    <span class="pi-title">
                      {key.replace(/\|0$/, '').replace('|', ' · utilisateur ')} · {s.className}
                    </span>
                    <span class="pi-desc">
                      {Object.entries(s.values)
                        .map(([k, v]) => `${k} = ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
                        .join(', ') || 'aucune variable'}
                    </span>
                    <button class="chip danger" aria-label={`Effacer le slot ${key}`} onClick={() => clearSlot(key)}>
                      Effacer
                    </button>
                  </div>
                ))}
                {slots.length > 1 && (
                  <button class="btn danger" onClick={() => clearSlot()}>
                    Effacer tous les slots
                  </button>
                )}
              </div>
            </div>
            <div class="cd-selection">
              {current ? (
                <>
                  <span class="cd-sel-name">
                    <strong>{current.name}</strong>{' '}
                    <span class="muted small">
                      {current.parent
                        ? `${current.type} · parent : ${current.parent}`
                        : [current.type, current.open && 'ouvert', current.defaultMap && 'Game Default Map'].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <button class="btn primary" onClick={() => openAsset(current)}>
                    Ouvrir
                  </button>
                  {current.kind === 'level' && (
                    <button
                      class="btn"
                      onClick={() =>
                        openOverlay({
                          kind: 'prompt',
                          title: `Renommer ${current.name}`,
                          initial: current.name,
                          confirmLabel: 'Renommer',
                          onSubmit: (name) => {
                            const res = store.applyProject('Renommer le niveau', (p) => renameLevel(p, current.id, name));
                            return res.ok ? null : res.reason;
                          },
                        })
                      }
                    >
                      Renommer
                    </button>
                  )}
                  {current.placeable && onPlaceActor && (
                    <button
                      class="btn"
                      onClick={() => {
                        onPlaceActor(current.id);
                        onClose();
                      }}
                    >
                      Placer dans le niveau
                    </button>
                  )}
                  <button
                    class="btn danger"
                    onClick={() =>
                      openOverlay({
                        kind: 'confirm',
                        title: `Supprimer ${current.name} ?`,
                        text: 'UE refuse de supprimer un asset encore utilisé ; ici aussi.',
                        confirmLabel: 'Supprimer',
                        onConfirm: () => {
                          const res = store.applyProject(`Supprimer ${current.name}`, (p) => removeAsset(p, current));
                          if (!res.ok) store.warn(res.reason);
                        },
                      })
                    }
                  >
                    Supprimer
                  </button>
                </>
              ) : (
                <span class="muted small">Touche un asset pour le sélectionner, deux fois pour l’ouvrir (le double-clic d’UE).</span>
              )}
            </div>
          </>
        )}

        {mode === 'add' && (
          <>
            {head('+ Add', () => setMode('browse'))}
            <div class="cd-body add-menu">
              <div class="palette-cat">Create Basic Asset</div>
              <button class="palette-item" onClick={() => setMode('parent')}>
                <span class="pi-title">Blueprint Class</span>
                <span class="pi-desc">Un Blueprint : on choisit d’abord sa classe parente.</span>
              </button>
              <button
                class="palette-item"
                onClick={() => create('Nouveau niveau', 'Lvl_NewLevel', 'Créer un niveau', (p, name) => addLevel(p, name), (id) => openLevel(id))}
              >
                <span class="pi-title">Level</span>
                <span class="pi-desc">Un niveau vide, avec son Player Start : il s’ouvre dans l’éditeur de niveau, et Play lance le niveau ouvert.</span>
              </button>
              <div class="palette-cat">Create Advanced Asset</div>
              {ADVANCED.map((g) => (
                <div key={g.group}>
                  <button class="palette-item add-group" aria-expanded={open === g.group} onClick={() => setOpen(open === g.group ? null : g.group)}>
                    <span class="pi-title">
                      {g.group} {open === g.group ? '▾' : '›'}
                    </span>
                  </button>
                  {open === g.group &&
                    g.items.map((it) => (
                      <button key={it.label} class="palette-item add-item" onClick={it.run}>
                        <span class="pi-title">{it.label}</span>
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </>
        )}

        {mode === 'parent' && (
          <>
            {head('Pick Parent Class', () => setMode('add'))}
            <div class="cd-body">
              <div class="palette-cat">Common Classes</div>
              {COMMON.map((c) => (
                <button key={c.id} class="palette-item" onClick={() => createBlueprint(c.id, c.id)}>
                  <span class="pi-title">{c.name}</span>
                  <span class="pi-desc">{c.text}</span>
                </button>
              ))}
              <div class="palette-cat">All Classes</div>
              <button class="palette-item" onClick={() => createBlueprint('SaveGame', 'SaveGame')}>
                <span class="pi-title">SaveGame</span>
                <span class="pi-desc">Un objet qui ne contient que des variables, écrit dans un slot par Save Game to Slot.</span>
              </button>
              <button class="palette-item" onClick={() => createBlueprint('GameInstance', 'GameInstance')}>
                <span class="pi-title">GameInstance</span>
                <span class="pi-desc">Un seul objet pour toute la partie, gardé d’un niveau à l’autre. À choisir dans Project Settings › Maps & Modes › Game Instance Class.</span>
              </button>
              {/* A Widget Blueprint is made from + Add › User Interface; the app has no inheritance between them. */}
              {store.project.classes.filter((c) => c.parent !== 'UserWidget').map((c) => (
                <button key={c.id} class="palette-item" onClick={() => createBlueprint(c.id, c.name)}>
                  <span class="pi-title">{c.name}</span>
                  <span class="pi-desc">Blueprint enfant : il hérite de tout ce qu’a {c.name}.</span>
                </button>
              ))}
            </div>
          </>
        )}

        {mode === 'rowStruct' && (
          <>
            {head('Pick Row Structure', () => setMode('add'))}
            <div class="cd-body">
              {store.project.structs.map((s) => (
                <button key={s.id} class="palette-item" onClick={() => createTable(s.name)}>
                  <span class="pi-title">{s.name}</span>
                  <span class="pi-desc">{s.members.map((m) => m.name).join(', ')}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
