/**
 * The Blueprint editor's Viewport tab: the view type of its viewport bar decides (3D-2, V7.79). Top is the top view
 * (ViewportCanvas); the other types are drawn in 3D with the gizmo (Viewport3DEditor). Perspective by default, as in UE.
 */
import { forwardRef } from 'preact/compat';
import { useEffect, useReducer } from 'preact/hooks';
import type { EditorStore } from '@core/store/editorStore';
import { ViewportCanvas, type ViewportHandle, type ViewportRequests } from '@editor/viewport/ViewportCanvas';
import { Viewport3DEditor } from '@editor/world3d/Viewport3DEditor';
import { bpViewType, onViewportSettings, setBpViewType, snapping, viewMode } from '../viewportSettings';

interface Props {
  store: EditorStore;
  requests: ViewportRequests;
  onNo3d: () => void;
}

export const BlueprintViewport = forwardRef<ViewportHandle, Props>(function BlueprintViewport({ store, requests, onNo3d }, ref) {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => onViewportSettings(() => force(0)), []);
  const kind = bpViewType();
  if (kind === 'Top') return <ViewportCanvas ref={ref} store={store} requests={requests} />;
  return (
    <Viewport3DEditor
      ref={ref}
      store={store}
      requests={requests}
      kind={kind}
      mode={viewMode()}
      gizmo={snapping()}
      onUnavailable={() => {
        setBpViewType('Top');
        onNo3d();
      }}
    />
  );
});
