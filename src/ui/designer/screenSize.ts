/**
 * The Designer's screen size, as UE's Screen Size menu: the 1280 × 720
 * reference, or the phone's own format (720 high, as wide as Play draws it),
 * to see where the anchors put each widget during Play. The choice is kept in
 * this browser only (localStorage may be missing or throw: the default then
 * applies).
 */
import { DESIGN_H, DESIGN_W } from '@core/umg/layout';

export type ScreenChoice = 'reference' | 'phone';

const KEY = 'bp-trainer.designerScreen';

/** Width ÷ height of the Play screen, measured the last time Play drew widgets. */
let playAspect: number | undefined;

export function screenChoice(): ScreenChoice {
  try {
    return localStorage.getItem(KEY) === 'phone' ? 'phone' : 'reference';
  } catch {
    return 'reference';
  }
}

export function setScreenChoice(c: ScreenChoice): void {
  try {
    localStorage.setItem(KEY, c);
  } catch {
    /* not kept: the default applies next time */
  }
}

/** Play measured its screen of widgets (WidgetLayer). */
export function rememberPlayAspect(w: number, h: number): void {
  if (w > 0 && h > 0) playAspect = w / h;
}

/**
 * The width of the Designer's screen, 720 high. For the phone: Play's
 * format when it was measured, else the Designer's own area (`fallback`,
 * width ÷ height), which is about the same place on the screen.
 */
export function screenWidth(choice: ScreenChoice, fallback?: number): number {
  if (choice === 'reference') return DESIGN_W;
  const aspect = playAspect ?? fallback;
  if (!aspect || !Number.isFinite(aspect)) return DESIGN_W;
  // Never narrower than a portrait screen, never absurdly wide.
  return Math.round(DESIGN_H * Math.min(3.5, Math.max(0.45, aspect)));
}

/** The width the Designer draws now (Details keep a widget in place on it when its anchors change). */
let designerWidth = DESIGN_W;

export function setDesignerWidth(w: number): void {
  designerWidth = w;
}

export function currentDesignerWidth(): number {
  return designerWidth;
}
