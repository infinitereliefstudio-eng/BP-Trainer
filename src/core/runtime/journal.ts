/**
 * What a play session reports: the Output Log (prints, Blueprint Runtime
 * Errors, each repeated error shown three times then folded) and the
 * messages Print String puts on screen.
 */
import type { Explanation } from '../explain/types';

export interface ScreenMessage {
  id: number;
  text: string;
  until: number;
}

export type SimLogLevel = 'log' | 'warning' | 'error';

export interface SimLogEntry {
  id: number;
  time: number;
  level: SimLogLevel;
  text: string;
  /** For prints: the actor and the raw text, used by lesson checks. */
  actor?: string;
  message?: string;
  /** For errors: the "Pourquoi ?" shown under the line. */
  explain?: Explanation;
}

let seq = 0;
/** A fresh id for log lines, screen messages and trace entries. */
export const nextId = () => ++seq;

const SCREEN_MAX = 12;

export class Journal {
  log: SimLogEntry[] = [];
  screen: ScreenMessage[] = [];
  runtimeErrors = 0;
  private errorCounts = new Map<string, number>();

  print(time: number, actorId: string, objectName: string, text: string, opts: { toScreen: boolean; toLog: boolean; duration: number }): void {
    if (opts.toScreen) this.screen.unshift({ id: nextId(), text, until: time + Math.max(0, opts.duration) });
    if (this.screen.length > SCREEN_MAX) this.screen.length = SCREEN_MAX;
    if (opts.toLog) {
      this.log.push({ id: nextId(), time, level: 'log', text: `LogBlueprintUserMessages: [${objectName}] ${text}`, actor: actorId, message: text });
    }
  }

  error(time: number, text: string, explain?: Explanation): void {
    const count = (this.errorCounts.get(text) ?? 0) + 1;
    this.errorCounts.set(text, count);
    this.runtimeErrors++;
    if (count <= 3) this.log.push({ id: nextId(), time, level: 'error', text, explain });
    else if (count === 4) this.log.push({ id: nextId(), time, level: 'warning', text: `(erreur répétée, masquée) ${text}` });
  }

  /** A line from the simulator itself (not a Print String). */
  info(time: number, text: string): void {
    this.log.push({ id: nextId(), time, level: 'log', text: `LogBlueprintTrainer: ${text}` });
  }

  /** Drop on-screen messages whose time is up. */
  expire(time: number): void {
    this.screen = this.screen.filter((m) => m.until > time);
  }
}
