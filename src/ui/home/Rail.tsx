/**
 * The rail of the home screen (UI-2, V7.84): one button per space, Réglages at the bottom. On the left in
 * landscape, where it takes less height than a row of tabs; along the bottom in portrait.
 */
import { APP_VERSION } from '../../version';
import { Icon } from '../widgets/icons';
import { type Page, SPACES, spaceOf, type SpaceId } from './pages';

interface Props {
  page: Page;
  onSpace: (space: SpaceId) => void;
  onSettings: () => void;
  /** Questions and graphs due in Révision: a badge on « Apprendre ». */
  due: number;
}

export function Rail({ page, onSpace, onSettings, due }: Props) {
  const current = spaceOf(page).id;
  return (
    <nav class="rail" aria-label="Espaces de l’appli">
      {SPACES.map((s) => (
        <button key={s.id} class={`rail-btn${s.id === current ? ' active' : ''}`} data-space={s.id} aria-current={s.id === current ? 'page' : undefined} onClick={() => onSpace(s.id)}>
          <Icon name={s.icon} />
          <span class="rail-label">{s.label}</span>
          {s.id === 'learn' && due > 0 && <span class="rail-badge">{due}</span>}
        </button>
      ))}
      <span class="rail-gap" />
      <button class="rail-btn" data-space="settings" onClick={onSettings}>
        <Icon name="settings" />
        <span class="rail-label">Réglages</span>
        <span class="rail-version">v{APP_VERSION}</span>
      </button>
    </nav>
  );
}
