/**
 * The bar along the bottom of the editors (V7.32), like UE's status bar: Content Drawer, then one tab per bottom panel
 * (Compiler Results, Output Log, Debug, Find Results). Touching a tab opens its panel, touching it again closes it.
 */
import type { BottomTab } from '../panels/BottomPanel';
import { Icon } from '../widgets/icons';
import { origin } from '../origins';

const TABS: { id: BottomTab; label: string }[] = [
  { id: 'compiler', label: 'Compiler Results' },
  { id: 'log', label: 'Output Log' },
  { id: 'debug', label: 'Debug' },
  { id: 'find', label: 'Find Results' },
];

interface Props {
  open: false | BottomTab;
  onOpen: (tab: false | BottomTab) => void;
  onContentDrawer: () => void;
  contentDisabled: boolean;
  compileErrors: boolean;
}

export function BottomBar({ open, onOpen, onContentDrawer, contentDisabled, compileErrors }: Props) {
  return (
    <div class="bottom-bar" role="tablist" aria-label="Panneaux du bas">
      <button class="content-drawer-btn" disabled={contentDisabled} onClick={onContentDrawer}>
        <Icon name="drawer" /> Content Drawer
      </button>
      <div class="bottom-bar-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={open === t.id}
            class={`bottom-bar-tab${open === t.id ? ' active' : ''}`}
            onClick={() => onOpen(open === t.id ? false : t.id)}
          >
            {t.label}
            {t.id === 'compiler' && compileErrors && <span class="pill error">erreurs</span>}
          </button>
        ))}
      </div>
      <button
        class="bottom-handle"
        {...origin('touch', 'bottomPanel')}
        aria-label={open ? 'Fermer le panneau du bas' : 'Ouvrir le panneau du bas'}
        onClick={() => onOpen(open ? false : 'compiler')}
      >
        <Icon name={open ? 'chevron-down' : 'chevron-up'} />
      </button>
    </div>
  );
}
