/**
 * The level in the editor's main area: always the top view while editing; during Play, the 3D view when
 * « Vue 3D (essai) » is on (3D-0, V7.77) and the learner has not switched to « Dessus » in the toolbar.
 */
import { useEffect, useReducer } from 'preact/hooks';
import type { EditorStore } from '@core/store/editorStore';
import type { PlaySession } from '@editor/world/playSession';
import { WorldCanvas, type WorldRequests } from '@editor/world/WorldCanvas';
import { World3DCanvas } from '@editor/world3d/World3DCanvas';

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
  return <WorldCanvas store={store} session={session} requests={requests} center={center} />;
}
