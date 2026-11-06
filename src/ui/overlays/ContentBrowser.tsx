/** List of the project's Blueprints, to switch or create one. */
import { addClass } from '@core/operations/projectOps';
import { useStore } from '../hooks';
import type { OpenOverlay } from '../overlayTypes';
import { useOwnTap } from '../widgets/useOwnTap';

export function ContentBrowser({ onClose, openOverlay }: { onClose: () => void; openOverlay: OpenOverlay }) {
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
  return (
    <div class="sheet-backdrop" {...tap.root} onClick={tap.guard(onClose)}>
      <div class="sheet content" onClick={(e) => e.stopPropagation()}>
        <div class="palette-head">
          <strong>Content Browser</strong>
          <span class="tb-spacer" />
          <button class="btn primary" onClick={create}>
            + Blueprint
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
                Parent : {c.parent} · {c.variables.length} variable(s) · {c.components.length} composant(s)
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
