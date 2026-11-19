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

/** Wide enough for « Ordre des BeginPlay : mélangé » on one line (230 until V7.32: three lines). */
const WIDTH = 280;

export function ContextMenu({ sx, sy, title, items, onClose }: Props) {
  const tap = useOwnTap();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // A hint goes under its label (V7.32), so an item with a hint is taller.
  const estH = items.reduce((h, it) => h + (it.hint ? 54 : 42), 0) + (title ? 36 : 0) + 12;
  const left = Math.max(8, Math.min(sx, vw - WIDTH - 8));
  const top = Math.max(8, Math.min(sy, vh - estH - 8));
  // Taller than the screen (a phone in landscape): from the top, and the menu scrolls.
  const maxH = vh - top - 8;
  return (
    <div class="menu-backdrop" {...tap.root} onClick={tap.guard(onClose)} onContextMenu={(e) => e.preventDefault()}>
      <div class="menu" style={{ left: `${left}px`, top: `${top}px`, width: `${Math.min(WIDTH, vw - 16)}px`, maxHeight: `${maxH}px` }} onClick={(e) => e.stopPropagation()}>
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
            <span class="menu-label">{it.label}</span>
            {it.hint && <span class="menu-hint">{it.hint}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
