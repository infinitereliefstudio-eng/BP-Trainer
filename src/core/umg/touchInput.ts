/**
 * A finger on the widgets during Play, as Slate routes it: what it touches
 * (Umg.hit), whether the input mode lets the widgets have it, and the
 * Button's events in SButton's order (On Pressed; On Released, then On
 * Clicked if the finger is still on it). A lesson's scenario taps a button
 * by name (`tap`). No DOM: WidgetLayer gives the touch on a screen `width`
 * wide and 720 high.
 */
import type { ActorRT } from '../runtime/world';
import { DESIGN_W, type LaidOutWidget } from './layout';
import type { Umg } from './runtime';

/** The Player Controller's input mode (Set Input Mode …): who gets the player's input, the game, the widgets, or both. */
export type InputMode = 'GameOnly' | 'UIOnly' | 'GameAndUI';

export type ButtonEvent = 'pressed' | 'released' | 'clicked';

/** What a touch on the widgets did: a Button answered, or it was ignored, and why. */
export type TouchOutcome =
  | { kind: 'none' }
  | { kind: 'button'; button: string }
  | { kind: 'ignored'; reason: 'gameOnly' | 'disabled' | 'blocked'; button: string; by?: string };

/** What the touches need from the simulation. */
export interface TouchHost {
  readonly umg: Umg;
  inputMode(): InputMode;
  /** The debugger stopped the game: touches do nothing. */
  stopped(): boolean;
  /** A touch before Play's first frame starts the game. */
  ensureStarted(): void;
  readonly record: { buttons: string[]; ignoredTouches: { button: string; reason: string }[] };
  findActor(id: string): ActorRT | undefined;
  /** Queue a Button's event on its widget object. */
  fireButton(obj: ActorRT, id: string, event: ButtonEvent): void;
  /** Run the queued Blueprint work. */
  run(): void;
  /** One frame of the game (a tap lasts one frame). */
  step(): void;
}

export class TouchInput {
  constructor(private readonly host: TouchHost) {}

  /** A finger goes down at (x, y): On Pressed on a Button, when the input mode lets widgets have it. As in UE, Game Only keeps the touch from them. */
  down(x: number, y: number, width: number): TouchOutcome {
    const h = this.host;
    h.ensureStarted();
    if (h.stopped()) return { kind: 'none' };
    const hit = h.umg.hit(x, y, width);
    if (hit.kind === 'none') return hit;
    if (hit.kind === 'blocked') return this.ignored({ kind: 'ignored', reason: 'blocked', button: hit.under, by: hit.by });
    const label = `${hit.obj.className}/${hit.name}`;
    if (h.inputMode() === 'GameOnly') return this.ignored({ kind: 'ignored', reason: 'gameOnly', button: label });
    if (!hit.enabled) return this.ignored({ kind: 'ignored', reason: 'disabled', button: label });
    h.umg.setPressed({ obj: hit.obj.id, id: hit.id, path: hit.path });
    h.fireButton(hit.obj, hit.id, 'pressed');
    h.run();
    return { kind: 'button', button: label };
  }

  /** The finger goes up: On Released, then On Clicked if it is still on the same Button. */
  up(x: number, y: number, width: number): void {
    const h = this.host;
    const p = h.umg.pressed;
    h.umg.setPressed(undefined);
    if (!p || h.stopped()) return;
    const obj = h.findActor(p.obj);
    if (!obj) return;
    h.fireButton(obj, p.id, 'released');
    const hit = h.umg.hit(x, y, width);
    if (hit.kind === 'button' && hit.path === p.path && hit.enabled && h.inputMode() !== 'GameOnly') {
      h.record.buttons.push(`${obj.className}/${hit.name}`);
      h.fireButton(obj, p.id, 'clicked');
    }
    h.run();
  }

  /**
   * A tap on a Button found by name ("WBP_Pause", "Btn_Reprendre"), at its
   * centre, on the reference screen: what a lesson's scenario does. Whatever
   * covers it there takes the touch, as for a finger. `nth`: the nth of these
   * buttons, top to bottom (« Lire » of the 2nd row); otherwise the front one.
   */
  tap(widgetClass: string, button: string, nth?: number): TouchOutcome {
    const width = DESIGN_W;
    const named = (l: LaidOutWidget) => l.widget.kind === 'Button' && l.widget.name === button && l.drawn && this.host.umg.objectOf(l.path)?.className === widgetClass;
    const layers = this.host.umg.layer(width);
    const target =
      nth !== undefined
        ? layers
            .flatMap((s) => s.laid)
            .filter(named)
            .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x)[nth]
        : [...layers]
            .reverse()
            .map((s) => s.laid.find(named))
            .find((l) => !!l);
    if (!target) return { kind: 'none' };
    const cx = target.rect.x + target.rect.w / 2;
    const cy = target.rect.y + target.rect.h / 2;
    const out = this.down(cx, cy, width);
    this.host.step();
    this.up(cx, cy, width);
    return out;
  }

  private ignored(o: Extract<TouchOutcome, { kind: 'ignored' }>): TouchOutcome {
    this.host.record.ignoredTouches.push({ button: o.button, reason: o.reason });
    return o;
  }
}
