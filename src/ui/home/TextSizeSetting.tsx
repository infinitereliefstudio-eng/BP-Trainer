/** Réglages › Taille du texte (UI-1, V7.75): four sizes for the app's text; the graph and the level zoom with two fingers. */
import { useState } from 'preact/hooks';
import { haptic } from '@editor/haptics';
import { setTextScale, TEXT_SCALES, textScale } from '../uiSettings';

export function TextSizeSetting() {
  const [current, setCurrent] = useState(textScale());
  return (
    <section class="settings-section">
      <h3>Taille du texte</h3>
      <div class="segmented">
        {TEXT_SCALES.map((s) => (
          <button
            key={s.value}
            aria-pressed={current === s.value}
            class={current === s.value ? 'active' : ''}
            onClick={() => {
              haptic('tap');
              setTextScale(s.value);
              setCurrent(s.value);
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p class="muted small">Pour l’appli : panneaux, fiches, menus. Le graphe et le niveau gardent leur taille : zoome avec deux doigts.</p>
    </section>
  );
}
