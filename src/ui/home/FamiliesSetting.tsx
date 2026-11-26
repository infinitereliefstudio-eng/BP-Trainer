/**
 * Réglages › Dans l'éditeur (UI-4, V7.76): the three families of the editor's interface, a sample of each, and
 * « Vue UE pure », which hides what the app adds (see ui/origins.ts).
 */
import { useState } from 'preact/hooks';
import { haptic } from '@editor/haptics';
import { pureUe, setPureUe } from '../uiSettings';
import { Icon } from '../widgets/icons';

export function FamiliesSetting() {
  const [pure, setPure] = useState(pureUe());
  const toggle = (on: boolean) => {
    haptic('tap');
    setPureUe(on);
    setPure(on);
  };
  return (
    <section class="settings-section">
      <h3>Dans l’éditeur</h3>
      <ul class="family-list">
        <li>
          <span class="family-sample">Compile</span>
          <span>Comme dans UE : même nom, même place.</span>
        </li>
        <li>
          <span class="family-sample app">
            <Icon name="cap" /> Vérifier
          </span>
          <span>En ambre : ce que l’appli ajoute pour apprendre (leçon, objectifs, aides, vitesses de Play). Absent d’UE.</span>
        </li>
        <li>
          <span class="family-sample touch">+</span>
          <span>En pointillé : ce qui remplace la souris, le clavier ou un panneau fixe d’UE. Un appui long dit quoi faire dans UE.</span>
        </li>
      </ul>
      <div class="segmented" style={{ marginTop: '10px' }}>
        <button aria-pressed={!pure} class={pure ? '' : 'active'} onClick={() => toggle(false)}>
          Avec les ajouts
        </button>
        <button aria-pressed={pure} class={pure ? 'active' : ''} onClick={() => toggle(true)}>
          Vue UE pure
        </button>
      </div>
      <p class="muted small">La vue UE pure cache tout ce qui est en ambre, pour s’habituer à l’éditeur tel qu’il sera dans UE. Les commandes tactiles restent.</p>
    </section>
  );
}
