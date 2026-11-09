/** The project's assets: Blueprints, Blueprint Interfaces and Enums. */
import { addEnum } from '@core/operations/enumOps';
import { addClass, addInterface, addInterfaceFunction } from '@core/operations/projectOps';
import { useStore } from '../hooks';
import type { OpenOverlay } from '../overlayTypes';
import { useOwnTap } from '../widgets/useOwnTap';

interface Props {
  onClose: () => void;
  openOverlay: OpenOverlay;
  onOpenDetails: () => void;
}

export function ContentBrowser({ onClose, openOverlay, onOpenDetails }: Props) {
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
                store.openClass(c.id);
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
        </div>
      </div>
    </div>
  );
}
