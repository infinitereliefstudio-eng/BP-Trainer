/** A small menu opened at a point (long press), kept inside the screen. */
import type { MenuItem } from '../overlayTypes';
import { useOwnTap } from '../widgets/useOwnTap';

interface Props {
  sx: number;
  sy: number;
  title?: string;
  items: MenuItem[];
  onClose: () => void;
}

const WIDTH = 230;

export function ContextMenu({ sx, sy, title, items, onClose }: Props) {
  const tap = useOwnTap();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const estH = 44 * items.length + (title ? 36 : 0) + 12;
  const left = Math.max(8, Math.min(sx, vw - WIDTH - 8));
  const top = Math.max(8, Math.min(sy, vh - estH - 8));
  return (
    <div class="menu-backdrop" {...tap.root} onClick={tap.guard(onClose)} onContextMenu={(e) => e.preventDefault()}>
      <div class="menu" style={{ left: `${left}px`, top: `${top}px`, width: `${WIDTH}px` }} onClick={(e) => e.stopPropagation()}>
        {title && <div class="menu-title">{title}</div>}
        {items.map((it) => (
          <button
            key={it.label}
            class={`menu-item${it.danger ? ' danger' : ''}`}
            disabled={it.disabled}
            onClick={tap.guard(() => {
              onClose();
              it.action?.();
            })}
          >
            <span>{it.label}</span>
            {it.hint && <span class="menu-hint">{it.hint}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
