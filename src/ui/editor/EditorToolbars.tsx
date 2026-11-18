/**
 * The second row: the toolbar of the editor shown, as in UE. The Blueprint
 * editor has Compile, Save, Find, Class Settings, Class Defaults and Play, then
 * its graph tabs (Construction Script, Event Graph, the function opened).
 * The level editor has Save, Place Actors and Play.
 */
import type { CompileStatus } from '@core/compiler/validate';
import { ensureConstructionScript } from '@core/operations/constructionOps';
import { saveProject } from '@storage/persistence';
import { useStore } from '../hooks';

const COMPILE_ICON: Record<CompileStatus, { icon: string; cls: string; title: string }> = {
  dirty: { icon: '?', cls: 'st-dirty', title: 'À compiler' },
  ok: { icon: '✓', cls: 'st-ok', title: 'Compilé, aucune erreur' },
  warning: { icon: '!', cls: 'st-warn', title: 'Compilé avec des avertissements' },
  error: { icon: '✕', cls: 'st-error', title: 'Erreurs de compilation' },
};

interface Common {
  playing: boolean;
  saveKey: string;
  onPlay: () => void;
  onStop: () => void;
}

function SaveButton({ saveKey }: { saveKey: string }) {
  const store = useStore();
  return (
    <button
      class="tb"
      onClick={() =>
        saveProject(store.project, saveKey)
          .then(() => store.info('Projet enregistré sur cet appareil.'))
          .catch(() => store.error('Enregistrement impossible.'))
      }
    >
      Save
    </button>
  );
}

function PlayButton({ playing, onPlay, onStop }: Common) {
  return playing ? (
    <button class="tb stop" onClick={onStop}>
      ■ Stop
    </button>
  ) : (
    <button class="tb play" onClick={onPlay}>
      ▶ Play
    </button>
  );
}

export function BlueprintToolbar(p: Common & { onClassSettings: () => void; onClassDefaults: () => void; onFind: () => void }) {
  const store = useStore();
  const cls = store.cls;
  const st = COMPILE_ICON[store.compileStatus];
  const construction = cls.graphs.find((g) => g.kind === 'construction');
  const events = cls.graphs.filter((g) => g.kind === 'event');
  const current = store.graph;
  return (
    <header class="toolbar bp-toolbar">
      <button class={`tb ${st.cls}`} disabled={p.playing} onClick={() => store.compile()} title={st.title}>
        <span class="badge">{st.icon}</span> Compile
      </button>
      <SaveButton saveKey={p.saveKey} />
      <button class="tb" onClick={p.onFind} title="Find in Blueprint (Find Results)">
        ⌕ Find
      </button>
      <button class="tb" disabled={p.playing} onClick={p.onClassSettings}>
        Class Settings
      </button>
      <button class="tb" disabled={p.playing} onClick={p.onClassDefaults}>
        Class Defaults
      </button>
      <PlayButton {...p} />
      <span class="tb-sep" />
      <div class="tabs graph-tabs" role="tablist">
        {cls.parent !== 'SaveGame' && (
          <button
            role="tab"
            class={`tab${current.kind === 'construction' ? ' active' : ''}`}
            onClick={() => {
              // Every Blueprint has one in UE; here it is created the first time it is opened.
              const g = construction ?? store.apply('Ouvrir le Construction Script', (c) => ensureConstructionScript(c));
              store.openGraph(g.id);
            }}
          >
            Construction Script
          </button>
        )}
        {events.map((g) => (
          <button key={g.id} role="tab" class={`tab${current.id === g.id ? ' active' : ''}`} onClick={() => current.id !== g.id && store.openGraph(g.id)}>
            {g.name === 'EventGraph' ? 'Event Graph' : g.name}
          </button>
        ))}
        {current.kind === 'function' && (
          <button role="tab" class="tab active">
            {current.name}
          </button>
        )}
      </div>
    </header>
  );
}

export function LevelToolbar(p: Common & { onPlaceActors: (sx: number, sy: number) => void }) {
  return (
    <header class="toolbar level-toolbar">
      <SaveButton saveKey={p.saveKey} />
      <button
        class="tb"
        disabled={p.playing}
        onClick={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          p.onPlaceActors(r.left, r.bottom);
        }}
      >
        + Place Actors
      </button>
      <PlayButton {...p} />
    </header>
  );
}

/** A labelled strip on the edge of the canvas that opens a panel: the panel's name, where UE has it. */
export function EdgeHandle({ side, label, aria, onClick, hidden }: { side: 'left' | 'right'; label: string; aria: string; onClick: () => void; hidden?: boolean }) {
  if (hidden) return null;
  return (
    <button class={`edge-handle ${side}`} aria-label={aria} onClick={onClick}>
      <span class={`edge-label${side === 'left' ? ' flip' : ''}`}>{label}</span>
    </button>
  );
}
