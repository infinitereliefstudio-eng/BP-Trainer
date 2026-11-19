/** Small line icons drawn in SVG, for buttons where a text glyph is not reliable on every phone. */

/** Dashed frame with a pointer corner: the marquee selection mode of the graph. */
export function SelectionIcon() {
  return (
    <svg class="icon" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="2.5" y="3.5" width="12" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2.6 2" />
      <path d="M12 11 L18 13.4 L15.4 14.6 L14.2 17.4 Z" fill="currentColor" />
    </svg>
  );
}
