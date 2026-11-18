/** The project's assets: Blueprints, Blueprint Interfaces, Enums, Structures, Data Tables, Enhanced Input assets, and the save slots. */
import { addEnum } from '@core/operations/enumOps';
import { addStruct } from '@core/operations/structOps';
import { addDataTable } from '@core/operations/dataTableOps';
import { addInputAction, addMappingContext } from '@core/operations/inputOps';
import { KEY_NAMES, type Project } from '@core/model/project';
import { typeLabel } from '@core/types/pins';
import { addClass, addInterface, addInterfaceFunction } from '@core/operations/projectOps';
import { useStore } from '../hooks';
import type { OpenOverlay } from '../overlayTypes';
import { useOwnTap } from '../widgets/useOwnTap';

interface Props {
  onClose: () => void;
  openOverlay: OpenOverlay;
  onOpenDetails: () => void;
  /** Open a Blueprint in its editor tab. */
  onOpenBlueprint?: (classId: string) => void;
}

export function ContentBrowser({ onClose, openOverlay, onOpenDetails, onOpenBlueprint }: Props) {
  const store = useStore();
  const tap = useOwnTap();
  const create = () =>
    openOverlay({
      kind: 'prompt',
      title: 'Nouveau Blueprint (Actor)',
      initial: 'BP_NewBlueprint',
      confirmLabel: 'Créer',
      onSubmit: (name) => {
        if (/\s/.test(name.trim())) return "Un nom de Blueprint ne peut pas contenir d'espace.";
        const res = store.applyProject('Créer un Blueprint', (p) => addClass(p, name, 'Actor'));
        if (!res.ok) return res.reason;
        store.openClass(res.value.id);
        return null;
      },
    });
  const createInterface = () =>
    openOverlay({
      kind: 'prompt',
      title: 'Nouvelle Blueprint Interface',
      initial: 'BPI_Interactif',
      confirmLabel: 'Créer',
      onSubmit: (name) => {
        if (/\s/.test(name.trim())) return "Un nom d'interface ne peut pas contenir d'espace.";
        const res = store.applyProject('Créer une interface', (p) => {
          const r = addInterface(p, name);
          if (r.ok) addInterfaceFunction(p, r.value.id, 'Interagir');
          return r;
        });
        if (!res.ok) return res.reason;
        store.setFocus({ kind: 'interface', id: res.value.id });
        onOpenDetails();
        return null;
      },
    });
  const createSaveGame = () =>
    openOverlay({
      kind: 'prompt',
      title: 'Nouveau Blueprint SaveGame',
      initial: 'BP_Sauvegarde',
      confirmLabel: 'Créer',
      onSubmit: (name) => {
        if (/\s/.test(name.trim())) return "Un nom de Blueprint ne peut pas contenir d'espace.";
        const res = store.applyProject('Créer un SaveGame', (p) => addClass(p, name, 'SaveGame'));
        if (!res.ok) return res.reason;
        store.openClass(res.value.id);
        return null;
      },
    });
  const createTable = () => {
    const first = store.project.structs[0];
    if (!first) {
      store.warn('Une Data Table range des lignes d’une structure : crée d’abord une Structure (+ Structure).');
      return;
    }
    openOverlay({
      kind: 'prompt',
      title: `Nouvelle Data Table (lignes : ${first.name}, modifiable ensuite)`,
      initial: 'DT_Objets',
      confirmLabel: 'Créer',
      onSubmit: (name) => {
        if (/\s/.test(name.trim())) return "Un nom de Data Table ne peut pas contenir d'espace.";
        const res = store.applyProject('Créer une Data Table', (p) => addDataTable(p, first.name, name));
        if (!res.ok) return res.reason;
        store.setFocus({ kind: 'dataTable', id: res.value.id });
        onOpenDetails();
        return null;
      },
    });
  };
  const createAsset = (
    title: string,
    initial: string,
    label: string,
    add: (p: Project, name: string) => { ok: true; value: { id: string } } | { ok: false; reason: string },
    focus: 'inputAction' | 'mappingContext',
  ) =>
    openOverlay({
      kind: 'prompt',
      title,
      initial,
      confirmLabel: 'Créer',
      onSubmit: (name) => {
        const res = store.applyProject(label, (p) => add(p, name));
        if (!res.ok) return res.reason;
        store.setFocus({ kind: focus, id: res.value.id });
        onOpenDetails();
        return null;
      },
    });
  const createAction = () => createAsset('Nouvelle Input Action', 'IA_Interagir', 'Créer une Input Action', (p, n) => addInputAction(p, n), 'inputAction');
  const createContext = () =>
    createAsset('Nouvel Input Mapping Context', 'IMC_Joueur', 'Créer un Mapping Context', (p, n) => addMappingContext(p, n), 'mappingContext');
  const actionName = (id: string) => store.project.inputActions.find((a) => a.id === id)?.name ?? '?';
  const slots = Object.entries(store.project.saveSlots ?? {});
  const clearSlot = (key?: string) => {
    const p = store.project;
    if (!p.saveSlots) return;
    if (key) delete p.saveSlots[key];
    else p.saveSlots = {};
    store.saveSlotsChanged();
  };
  const createEnum = () =>
    openOverlay({
      kind: 'prompt',
      title: 'Nouvel Enum',
      initial: 'E_Etat',
      confirmLabel: 'Créer',
      onSubmit: (name) => {
        if (/\s/.test(name.trim())) return "Un nom d'Enum ne peut pas contenir d'espace.";
        const res = store.applyProject('Créer un Enum', (p) => addEnum(p, name));
        if (!res.ok) return res.reason;
        store.setFocus({ kind: 'enum', id: res.value.id });
        onOpenDetails();
        return null;
      },
    });
  const createStruct = () =>
    openOverlay({
      kind: 'prompt',
      title: 'Nouvelle Structure',
      initial: 'S_Objet',
      confirmLabel: 'Créer',
      onSubmit: (name) => {
        if (/\s/.test(name.trim())) return "Un nom de structure ne peut pas contenir d'espace.";
        const res = store.applyProject('Créer une structure', (p) => addStruct(p, name));
        if (!res.ok) return res.reason;
        store.setFocus({ kind: 'struct', id: res.value.id });
        onOpenDetails();
        return null;
      },
    });
  return (
    <div class="sheet-backdrop" {...tap.root} onClick={tap.guard(onClose)}>
      <div class="sheet content" onClick={(e) => e.stopPropagation()}>
        <div class="palette-head">
          <strong>Content Browser</strong>
          <span class="tb-spacer" />
          <button class="btn primary" onClick={create}>
            + Blueprint
          </button>
          <button class="btn" onClick={createInterface}>
            + Interface
          </button>
          <button class="btn" onClick={createEnum}>
            + Enum
          </button>
          <button class="btn" onClick={createStruct}>
            + Structure
          </button>
          <button class="btn" onClick={createTable}>
            + Data Table
          </button>
          <button class="btn" onClick={createSaveGame}>
            + SaveGame
          </button>
          <button class="btn" onClick={createAction}>
            + Input Action
          </button>
          <button class="btn" onClick={createContext}>
            + Mapping Context
          </button>
          <button class="btn" onClick={onClose}>
            Fermer
          </button>
        </div>
        <div class="palette-list">
          {store.project.classes.map((c) => (
            <button
              key={c.id}
              class={`palette-item${c.id === store.classId ? ' current' : ''}`}
              onClick={() => {
                if (onOpenBlueprint) onOpenBlueprint(c.id);
                else store.openClass(c.id);
                onClose();
              }}
            >
              <span class="pi-title">{c.name}</span>
              <span class="pi-desc">
                Parent : {(c.parentClassId && store.project.classes.find((x) => x.id === c.parentClassId)?.name) || c.parent} · {c.variables.length} variable(s) · {c.components.length} composant(s)
              </span>
            </button>
          ))}
          {store.project.interfaces.length > 0 && <div class="palette-cat">Blueprint Interfaces</div>}
          {store.project.interfaces.map((i) => (
            <button
              key={i.id}
              class="palette-item"
              onClick={() => {
                store.setFocus({ kind: 'interface', id: i.id });
                onClose();
                onOpenDetails();
              }}
            >
              <span class="pi-title">{i.name}</span>
              <span class="pi-desc">
                {i.functions.map((f) => f.name).join(', ') || 'aucune fonction'} · implémentée par{' '}
                {store.project.classes.filter((c) => c.interfaces.includes(i.id)).length} Blueprint(s)
              </span>
            </button>
          ))}
          {store.project.enums.length > 0 && <div class="palette-cat">Enums</div>}
          {store.project.enums.map((e) => (
            <button
              key={e.id}
              class="palette-item"
              onClick={() => {
                store.setFocus({ kind: 'enum', id: e.id });
                onClose();
                onOpenDetails();
              }}
            >
              <span class="pi-title">{e.name}</span>
              <span class="pi-desc">{e.entries.join(', ')}</span>
            </button>
          ))}
          {store.project.structs.length > 0 && <div class="palette-cat">Structures</div>}
          {store.project.structs.map((s) => (
            <button
              key={s.id}
              class="palette-item"
              onClick={() => {
                store.setFocus({ kind: 'struct', id: s.id });
                onClose();
                onOpenDetails();
              }}
            >
              <span class="pi-title">{s.name}</span>
              <span class="pi-desc">{s.members.map((m) => `${m.name} (${typeLabel(m.type)})`).join(', ')}</span>
            </button>
          ))}
          {(store.project.dataTables ?? []).length > 0 && <div class="palette-cat">Data Tables</div>}
          {(store.project.dataTables ?? []).map((t) => (
            <button
              key={t.id}
              class="palette-item"
              onClick={() => {
                store.setFocus({ kind: 'dataTable', id: t.id });
                onClose();
                onOpenDetails();
              }}
            >
              <span class="pi-title">{t.name}</span>
              <span class="pi-desc">
                Lignes : {t.struct} · {t.rows.map((r) => r.name).join(', ') || 'aucune ligne'}
              </span>
            </button>
          ))}
          {(store.project.inputActions ?? []).length + (store.project.mappingContexts ?? []).length > 0 && <div class="palette-cat">Enhanced Input</div>}
          {(store.project.inputActions ?? []).map((a) => (
            <button
              key={a.id}
              class="palette-item"
              onClick={() => {
                store.setFocus({ kind: 'inputAction', id: a.id });
                onClose();
                onOpenDetails();
              }}
            >
              <span class="pi-title">{a.name}</span>
              <span class="pi-desc">Input Action · Digital (bool)</span>
            </button>
          ))}
          {(store.project.mappingContexts ?? []).map((c) => (
            <button
              key={c.id}
              class="palette-item"
              onClick={() => {
                store.setFocus({ kind: 'mappingContext', id: c.id });
                onClose();
                onOpenDetails();
              }}
            >
              <span class="pi-title">{c.name}</span>
              <span class="pi-desc">
                Input Mapping Context ·{' '}
                {c.mappings.map((m) => `${KEY_NAMES.includes(m.key) ? (m.key === 'SpaceBar' ? 'Space Bar' : m.key) : '?'} → ${actionName(m.action)}${m.triggers[0] ? ` (${m.triggers[0].kind})` : ''}`).join(', ') || 'aucune ligne'}
              </span>
            </button>
          ))}
          <div class="palette-cat">Slots de sauvegarde (hors UE : ce qui est écrit « sur le disque »)</div>
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
    </div>
  );
}
