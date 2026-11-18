/**
 * The first row, like UE's tab bar: the level, then one tab per open
 * Blueprint (a Blueprint editor, as when it is opened from the Content
 * Browser). Home, the lesson and the app menu are BP Trainer's own (amber).
 */
import { useStore } from '../hooks';

interface Props {
  view: 'level' | 'graph';
  tabs: string[];
  onLevel: () => void;
  onOpenTab: (classId: string) => void;
  onCloseTab: (classId: string) => void;
  onHome: () => void;
  lessonLabel?: string;
  onLesson?: () => void;
  onMoreMenu: (sx: number, sy: number) => void;
}

export function DocumentTabs(p: Props) {
  const store = useStore();
  const classes = store.project.classes;
  return (
    <nav class="doc-bar" aria-label="Éditeurs ouverts">
      <button class="doc-home app-only" onClick={p.onHome} aria-label="Accueil">
        ⌂
      </button>
      <div class="doc-tabs" role="tablist">
        <button role="tab" class={`tab doc-tab level${p.view === 'level' ? ' active' : ''}`} onClick={p.onLevel}>
          <span class="doc-icon" aria-hidden="true">
            ▦
          </span>
          Niveau
        </button>
        {p.tabs.map((id) => {
          const cls = classes.find((c) => c.id === id);
          if (!cls) return null;
          const active = p.view === 'graph' && store.classId === id;
          return (
            <div key={id} class={`doc-tab bp${active ? ' active' : ''}${store.classId === id ? ' current' : ''}`}>
              <button class="doc-open" role="tab" aria-selected={active} onClick={() => p.onOpenTab(id)}>
                <span class="doc-icon" aria-hidden="true">
                  ◆
                </span>
                {cls.name}
              </button>
              <button class="doc-close" aria-label={`Fermer ${cls.name}`} onClick={() => p.onCloseTab(id)}>
                ×
              </button>
            </div>
          );
        })}
      </div>
      {p.onLesson && (
        <button class="tb lesson app-only" onClick={p.onLesson}>
          {p.lessonLabel ?? 'Leçon'}
        </button>
      )}
      <button
        class="tb icon app-only"
        aria-label="Plus d'options"
        onClick={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          p.onMoreMenu(r.right, r.bottom);
        }}
      >
        ⋮
      </button>
    </nav>
  );
}
