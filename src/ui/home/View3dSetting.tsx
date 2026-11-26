/**
 * Réglages › Play (3D-0, V7.77): « Vue 3D (essai) », the prototype of Play drawn in 3D. Off by default: it is a
 * trial, to judge comfort, readability and heat on the phone before the 3D roadmap builds on it.
 */
import { useState } from 'preact/hooks';
import { haptic } from '@editor/haptics';
import { setView3d, view3d } from '../playSettings';

export function View3dSetting() {
  const [on, setOn] = useState(view3d());
  const toggle = (v: boolean) => {
    haptic('tap');
    setView3d(v);
    setOn(v);
  };
  return (
    <section class="settings-section">
      <h3>Play</h3>
      <div class="segmented">
        <button aria-pressed={!on} class={on ? '' : 'active'} onClick={() => toggle(false)}>
          Vue de dessus
        </button>
        <button aria-pressed={on} class={on ? 'active' : ''} onClick={() => toggle(true)}>
          Vue 3D (essai)
        </button>
      </div>
      <p class="muted small">
        Essai : Play dessine le niveau en volume, avec une caméra qui suit le joueur. La logique ne change pas (tout reste au sol). Pendant Play, « Dessus »
        dans la barre revient à la vue de dessus ; deux doigts rapprochent ou éloignent la caméra.
      </p>
    </section>
  );
}
