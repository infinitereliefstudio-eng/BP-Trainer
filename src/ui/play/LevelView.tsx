/**
 * The level in the editor's main area. While editing: the viewport type chosen in the viewport bar (3D-1, V7.78):
 * Top is the top view (WorldCanvas), the other types are drawn in 3D (Level3DEditor). During Play: the 3D view when
 * Play starts in 3D (« Vue 3D (essai) », or a level edited in 3D) and the learner has not switched to « Dessus ».
 */
import { useEffect, useReducer } from 'preact/hooks';
import type { EditorStore } from '@core/store/editorStore';
import type { PlaySession } from '@editor/world/playSession';
import { WorldCanvas, type WorldRequests } from '@editor/world/WorldCanvas';
import { Level3DEditor } from '@editor/world3d/Level3DEditor';
import { World3DCanvas } from '@editor/world3d/World3DCanvas';
import { onViewportSettings, setViewType, snapping, viewMode, viewType } from '../viewportSettings';

interface Props {
  store: EditorStore;
  session?: PlaySession;
  requests: WorldRequests;
  center?: { id: string; n: number };
  /** WebGL is missing: the app says so once. */
  onNo3d: () => void;
}

export function LevelView({ store, session, requests, center, onNo3d }: Props) {
  const [, force] = useReducer((n: number) => n + 1, 0);
  const view3d = !!session?.view3d;
  // Re-render only when the toolbar switches the view (setView3d notifies the UI listeners, ten times a second).
  useEffect(() => session?.onUi(() => session.view3d !== view3d && force(0)), [session, view3d]);
  useEffect(() => onViewportSettings(() => force(0)), []);
  if (session && view3d) {
    return (
      <World3DCanvas
        session={session}
        onFps={(n) => {
          session.fps = n;
        }}
        onUnavailable={() => {
          session.setView3d(false);
          onNo3d();
        }}
      />
    );
  }
  const kind = viewType();
  if (!session && kind !== 'Top') {
    return (
      <Level3DEditor
        store={store}
        requests={requests}
        kind={kind}
        mode={viewMode()}
        gizmo={snapping()}
        center={center}
        onUnavailable={() => {
          setViewType('Top');
          onNo3d();
        }}
      />
    );
  }
  return <WorldCanvas store={store} session={session} requests={requests} center={center} />;
}
