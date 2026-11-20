/**
 * Draws laid-out widgets (core/umg/layout) with HTML, at a scale: the
 * Designer's preview now, the game screen in Play later. Each widget is a
 * box placed where the layout put it; the Designer adds the dashed outlines
 * UE draws around panels and the selection.
 */
import type { JSX } from 'preact';
import { fontPx, type LaidOutWidget } from '@core/umg/layout';

interface Props {
  laid: LaidOutWidget[];
  scale: number;
  /** Play: the Button held by a finger, drawn pressed. */
  pressed?: string;
  /** The Designer: outlines of panels, selection, touch to pick a widget. */
  designer?: {
    selected?: string;
    onPointerDown: (path: string, e: PointerEvent) => void;
  };
}

const px = (n: number, s: number) => `${n * s}px`;

function body(l: LaidOutWidget, scale: number): JSX.Element | null {
  const p = l.props;
  switch (l.widget.kind) {
    case 'TextBlock':
      return (
        <span class="umg-text" style={{ color: p.color, fontSize: px(fontPx(p.fontSize), scale), textAlign: p.justification.toLowerCase() as 'left' }}>
          {p.text}
        </span>
      );
    case 'ProgressBar':
      return (
        <span class="umg-bar">
          <span class="umg-bar-fill" style={{ width: `${Math.max(0, Math.min(1, p.percent)) * 100}%`, background: p.fillColor }} />
        </span>
      );
    default:
      return null;
  }
}

function boxStyle(l: LaidOutWidget, scale: number): Record<string, string> {
  const r = l.rect;
  const style: Record<string, string> = { left: px(r.x, scale), top: px(r.y, scale), width: px(r.w, scale), height: px(r.h, scale) };
  if (l.widget.kind === 'Button') style.background = l.props.background;
  if (l.widget.kind === 'Image') style.background = l.props.color;
  return style;
}

export function WidgetSurface({ laid, scale, designer, pressed }: Props) {
  return (
    <>
      {laid.map((l) => {
        // Hidden and Collapsed widgets are not drawn; the Designer still lets one be picked from the Hierarchy.
        if (!l.drawn) return null;
        const selected = designer?.selected === l.path;
        const kind = l.widget.kind;
        // In Play, a Button that takes touches gets them from the page (the rest lets them through to the level).
        const play = !designer && kind === 'Button' ? `${l.hit ? ' hit' : ''}${pressed === l.path ? ' pressed' : ''}` : '';
        const cls = `umg umg-${kind}${designer ? ' design' : ''}${selected ? ' selected' : ''}${l.enabled ? '' : ' disabled'}${play}`;
        return (
          <div
            key={l.path}
            class={cls}
            data-path={l.path}
            style={boxStyle(l, scale)}
            onPointerDown={designer ? (e) => designer.onPointerDown(l.path, e as unknown as PointerEvent) : undefined}
          >
            {body(l, scale)}
            {selected && <span class="umg-tag">{l.widget.name}</span>}
          </div>
        );
      })}
    </>
  );
}
