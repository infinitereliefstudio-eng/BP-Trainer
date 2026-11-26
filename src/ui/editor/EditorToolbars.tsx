/**
 * The second row: the toolbar of the editor shown, as in UE. The Blueprint
 * editor has Compile, Save, Find, Class Settings, Class Defaults and Play, then
 * the Viewport tab (a Widget Blueprint: its Designer) and its graph tabs (Construction Script, Event Graph, the function opened).
 * The level editor has UE 5.8's main toolbar (UI-6, V7.80): Save, Selection Mode, Quick Add, Blueprints, Cinematics,
 * Play and its options, Platforms, Settings.
 */
import type { ComponentChildren } from 'preact';
import type { CompileStatus } from '@core/compiler/validate';
import { familyOf } from '@core/model/project';
import { ensureConstructionScript } from '@core/operations/constructionOps';
import { saveProject } from '@storage/persistence';
import { useStore } from '../hooks';
import { Icon } from '../widgets/icons';
import { origin, type UeHint } from '../origins';
import type { MenuItem } from '../overlayTypes';

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
      <Icon name="stop" /> Stop
    </button>
  ) : (
    <button class="tb play" onClick={onPlay}>
      <Icon name="play" /> Play
    </button>
  );
}

export function BlueprintToolbar(
  p: Common & { onClassSettings: () => void; onClassDefaults: () => void; onFind: () => void; viewport: boolean; onViewport: () => void; onGraph: () => void },
) {
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
        <Icon name="search" /> Find
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
        {familyOf(cls.parent) === 'widget' && (
          <button role="tab" class={`tab${p.viewport ? ' active' : ''}`} disabled={p.playing} onClick={p.onViewport}>
            Designer
          </button>
        )}
        {familyOf(cls.parent) === 'actor' && (
          <button role="tab" class={`tab${p.viewport ? ' active' : ''}`} disabled={p.playing} onClick={p.onViewport}>
            Viewport
          </button>
        )}
        {familyOf(cls.parent) === 'actor' && (
          <button
            role="tab"
            class={`tab${current.kind === 'construction' && !p.viewport ? ' active' : ''}`}
            onClick={() => {
              p.onGraph();
              // Every Blueprint has one in UE; here it is created the first time it is opened.
              const g = construction ?? store.apply('Ouvrir le Construction Script', (c) => ensureConstructionScript(c));
              store.openGraph(g.id);
            }}
          >
            Construction Script
          </button>
        )}
        {events.map((g) => (
          <button
            key={g.id}
            role="tab"
            class={`tab${current.id === g.id && !p.viewport ? ' active' : ''}`}
            onClick={() => {
              p.onGraph();
              if (current.id !== g.id) store.openGraph(g.id);
            }}
          >
            {g.name === 'EventGraph' ? 'Event Graph' : g.name}
          </button>
        ))}
        {current.kind === 'function' && (
          <button role="tab" class={`tab${p.viewport ? '' : ' active'}`} onClick={p.onGraph}>
            {current.name}
          </button>
        )}
      </div>
    </header>
  );
}

export interface LevelToolbarMenus {
  /** Open a dropdown under a button of the bar. */
  menu: (sx: number, sy: number, title: string, items: MenuItem[]) => void;
  onPlaceActors: (sx: number, sy: number) => void;
  onNewBlueprint: () => void;
  onProjectSettings: () => void;
  onWorldSettings: () => void;
  /** Play's options: « Vue 3D (essai) » on or off (the app's addition). */
  view3d: boolean;
  onView3d: (on: boolean) => void;
}

const NOT_HERE = 'pas simulé dans l’appli';
const under = (e: Event) => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return [r.left, r.bottom] as const;
};

/**
 * The level editor's main toolbar as in UE 5.8 (UI-6, V7.80): Save, Selection Mode, + (Quick Add: Place Actors),
 * Blueprints, Cinematics, Play with its options (⋮), Platforms, Settings. What the app does not simulate is there,
 * greyed, so the bar looks like UE's. During Play only Save, Stop and Play's controls stay, as UE swaps its bar.
 */
export function LevelToolbar(p: Common & LevelToolbarMenus & { children?: ComponentChildren }) {
  const disabled = (label: string): MenuItem => ({ label, hint: NOT_HERE, disabled: true });
  return (
    <header class="toolbar level-toolbar">
      <SaveButton saveKey={p.saveKey} />
      {!p.playing && (
        <>
          <button
            class="tb icon-tb"
            aria-label="Selection Mode"
            title="Selection Mode"
            onClick={(e) =>
              p.menu(...under(e), 'Selection Mode', [
                { label: 'Selection', hint: 'en cours : choisir, déplacer, tourner les acteurs' },
                ...['Landscape', 'Foliage', 'Mesh Paint', 'Modeling', 'Fracture', 'Brush Editing', 'Animation'].map(disabled),
              ])
            }
          >
            <Icon name="mode" />
            <Icon name="chevron-down" size="0.8em" />
          </button>
          <button class="tb icon-tb" aria-label="Quick Add" title="Quick Add to the project : Place Actors" onClick={(e) => p.onPlaceActors(...under(e))}>
            <Icon name="plus" />
            <Icon name="chevron-down" size="0.8em" />
          </button>
          <button
            class="tb icon-tb"
            aria-label="Blueprints"
            title="Blueprints"
            onClick={(e) =>
              p.menu(...under(e), 'Blueprints', [
                { label: 'New Empty Blueprint Class…', hint: 'Content Drawer › + Add', action: p.onNewBlueprint },
                { label: 'Project Settings › Maps & Modes', hint: 'Default GameMode, Game Instance Class', action: p.onProjectSettings },
                { label: 'World Override › GameMode', hint: 'World Settings de ce niveau', action: p.onWorldSettings },
                { label: 'Open Level Blueprint', hint: 'pas de Level Blueprint dans l’appli : la logique va dans les Blueprints', disabled: true },
              ])
            }
          >
            <Icon name="blueprint" />
            <Icon name="chevron-down" size="0.8em" />
          </button>
          <button class="tb icon-tb" aria-label="Cinematics" title={`Cinematics : ${NOT_HERE}`} disabled>
            <Icon name="film" />
          </button>
        </>
      )}
      <PlayButton {...p} />
      {!p.playing && (
        <>
          <button
            class="tb icon-tb narrow"
            aria-label="Play Options"
            title="Change Play Mode and Play Settings"
            onClick={(e) =>
              p.menu(...under(e), 'Play Options', [
                { label: 'Selected Viewport', hint: 'en cours : la partie se joue dans le viewport du niveau' },
                disabled('Simulate'),
                disabled('New Editor Window (PIE)'),
                disabled('Number of Players : 2'),
                {
                  label: p.view3d ? 'Vue 3D (essai) : activée' : 'Vue 3D (essai) : désactivée',
                  hint: p.view3d ? 'toucher pour jouer en vue de dessus' : 'toucher pour jouer en 3D',
                  app: true,
                  action: () => p.onView3d(!p.view3d),
                },
              ])
            }
          >
            <Icon name="more" />
          </button>
          <button class="tb icon-tb" aria-label="Platforms" title={`Platforms : ${NOT_HERE}`} disabled>
            <Icon name="platforms" />
          </button>
          <button
            class="tb icon-tb"
            aria-label="Settings"
            title="Settings"
            onClick={(e) =>
              p.menu(...under(e), 'Settings', [
                { label: 'World Settings', hint: 'GameMode Override de ce niveau', action: p.onWorldSettings },
                { label: 'Project Settings…', hint: 'Maps & Modes', action: p.onProjectSettings },
                disabled('Engine Scalability Settings'),
                disabled('Material Quality Level'),
              ])
            }
          >
            <Icon name="settings" />
            <Icon name="chevron-down" size="0.8em" />
          </button>
        </>
      )}
      {p.children}
    </header>
  );
}

/** A labelled strip on the edge of the canvas that opens a panel: the panel's name, where UE has it. */
export function EdgeHandle({
  side,
  label,
  aria,
  onClick,
  hidden,
  hint,
}: { side: 'left' | 'right'; label: string; aria: string; onClick: () => void; hidden?: boolean; hint: UeHint }) {
  if (hidden) return null;
  return (
    <button class={`edge-handle ${side}`} {...origin('touch', hint)} aria-label={aria} onClick={onClick}>
      <span class={`edge-label${side === 'left' ? ' flip' : ''}`}>{label}</span>
    </button>
  );
}
