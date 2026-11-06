/** Top bar, laid out like UE's Blueprint editor toolbar. */
import type { CompileStatus } from '@core/compiler/validate';
import { useStore } from './hooks';
import type { OpenOverlay } from './overlayTypes';
import { saveProject } from '@storage/persistence';

export type MainView = 'graph' | 'level';

interface Props {
  view: MainView;
  playing: boolean;
  saveKey: string;
  lessonLabel?: string;
  onView: (v: MainView) => void;
  onHome: () => void;
  onToggleLeft: () => void;
  onToggleDetails: () => void;
  onPlay: () => void;
  onStop: () => void;
  onLesson?: () => void;
  openOverlay: OpenOverlay;
  onMoreMenu: (sx: number, sy: number) => void;
}

const COMPILE_ICON: Record<CompileStatus, { icon: string; cls: string; title: string }> = {
  dirty: { icon: '?', cls: 'st-dirty', title: 'À compiler' },
  ok: { icon: '✓', cls: 'st-ok', title: 'Compilé, aucune erreur' },
  warning: { icon: '!', cls: 'st-warn', title: 'Compilé avec des avertissements' },
  error: { icon: '✕', cls: 'st-error', title: 'Erreurs de compilation' },
};

export function Toolbar(p: Props) {
  const store = useStore();
  const st = COMPILE_ICON[store.compileStatus];
  return (
    <header class="toolbar">
      <button class="tb icon" onClick={p.onHome} aria-label="Accueil">
        ⌂
      </button>
      <button class="tb icon" onClick={p.onToggleLeft} disabled={p.playing} aria-label="Ouvrir My Blueprint">
        ☰
      </button>
      <button class="tb class-name" disabled={p.playing} onClick={() => p.openOverlay({ kind: 'content' })} title="Changer de Blueprint">
        {store.cls.name} ▾
      </button>
      <span class="tb-sep" />
      <button class={`tb ${st.cls}`} disabled={p.playing} onClick={() => store.compile()} title={st.title}>
        <span class="badge">{st.icon}</span> Compile
      </button>
      <button
        class="tb hide-narrow"
        onClick={() =>
          saveProject(store.project, p.saveKey)
            .then(() => store.info('Projet enregistré sur cet appareil.'))
            .catch(() => store.error('Enregistrement impossible.'))
        }
      >
        Save
      </button>
      {p.playing ? (
        <button class="tb stop" onClick={p.onStop}>
          ■ Stop
        </button>
      ) : (
        <button class="tb play" onClick={p.onPlay}>
          ▶ Play
        </button>
      )}
      {p.onLesson && (
        <button class="tb lesson" onClick={p.onLesson}>
          {p.lessonLabel ?? 'Leçon'}
        </button>
      )}
      <span class="tb-spacer" />
      <div class="tabs" role="tablist">
        <button role="tab" class={`tab${p.view === 'level' || p.playing ? ' active' : ''}`} onClick={() => p.onView('level')}>
          Niveau
        </button>
        <button role="tab" class={`tab${p.view === 'graph' && !p.playing ? ' active' : ''}`} disabled={p.playing} onClick={() => p.onView('graph')}>
          Event Graph
        </button>
      </div>
      <button class="tb icon" onClick={p.onToggleDetails} disabled={p.playing} aria-label="Ouvrir Details">
        ☷
      </button>
      <button
        class="tb icon"
        aria-label="Plus d'options"
        onClick={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          p.onMoreMenu(r.right, r.bottom);
        }}
      >
        ⋮
      </button>
    </header>
  );
}
