/** Top bar, laid out like UE's Blueprint editor toolbar. */
import type { CompileStatus } from '@core/compiler/validate';
import { useStore } from './hooks';
import type { OpenOverlay } from './overlayTypes';
import { saveProject } from '@storage/persistence';

interface Props {
  onToggleLeft: () => void;
  onToggleDetails: () => void;
  openOverlay: OpenOverlay;
  onMoreMenu: (sx: number, sy: number) => void;
}

const COMPILE_ICON: Record<CompileStatus, { icon: string; cls: string; title: string }> = {
  dirty: { icon: '?', cls: 'st-dirty', title: 'À compiler' },
  ok: { icon: '✓', cls: 'st-ok', title: 'Compilé, aucune erreur' },
  warning: { icon: '!', cls: 'st-warn', title: 'Compilé avec des avertissements' },
  error: { icon: '✕', cls: 'st-error', title: 'Erreurs de compilation' },
};

export function Toolbar({ onToggleLeft, onToggleDetails, openOverlay, onMoreMenu }: Props) {
  const store = useStore();
  const st = COMPILE_ICON[store.compileStatus];
  return (
    <header class="toolbar">
      <button class="tb icon" onClick={onToggleLeft} title="My Blueprint" aria-label="Ouvrir My Blueprint">
        ☰
      </button>
      <button class="tb class-name" onClick={() => openOverlay({ kind: 'content' })} title="Changer de Blueprint">
        {store.cls.name} ▾
      </button>
      <span class="tb-sep" />
      <button class={`tb ${st.cls}`} onClick={() => store.compile()} title={st.title}>
        <span class="badge">{st.icon}</span> Compile
      </button>
      <button
        class="tb"
        onClick={() =>
          saveProject(store.project)
            .then(() => store.info('Projet enregistré sur cet appareil.'))
            .catch(() => store.error('Enregistrement impossible.'))
        }
      >
        Save
      </button>
      <button class="tb hide-narrow" onClick={() => { store.setFocus({ kind: 'class' }); onToggleDetails(); }}>
        Class Settings
      </button>
      <button class="tb play" onClick={() => store.info('La simulation (Play) arrive à l’étape 2.')}>
        ▶ Play
      </button>
      <span class="tb-spacer" />
      <span class="tab active">Event Graph</span>
      <button class="tb icon" onClick={onToggleDetails} title="Details" aria-label="Ouvrir Details">
        ☷
      </button>
      <button
        class="tb icon"
        aria-label="Plus d'options"
        onClick={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          onMoreMenu(r.right, r.bottom);
        }}
      >
        ⋮
      </button>
    </header>
  );
}
