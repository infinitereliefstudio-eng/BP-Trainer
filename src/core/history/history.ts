/**
 * Undo/redo by snapshots.
 *
 * Each entry stores the JSON of what it touched before and after: one class
 * for most edits, the whole project for class creation/removal. Blueprints
 * are small, so this stays cheap and, above all, cannot get out of sync with
 * the operations: a new operation gets undo for free.
 */
import type { BlueprintClass, Project } from '../model/project';

export type Scope = { kind: 'project' } | { kind: 'class'; id: string };

export interface HistoryEntry {
  label: string;
  scope: Scope;
  before: string;
  after: string;
}

export function snapshot(p: Project, scope: Scope): string {
  // Save slots are the game's "disk", not an edit: undo never brings an old save back.
  if (scope.kind === 'project') return JSON.stringify({ ...p, saveSlots: undefined });
  const cls = p.classes.find((c) => c.id === scope.id);
  return JSON.stringify(cls ?? null);
}

export function restore(p: Project, scope: Scope, json: string): void {
  if (scope.kind === 'project') {
    const data = JSON.parse(json) as Project;
    const slots = p.saveSlots;
    Object.assign(p, data);
    p.saveSlots = slots;
    return;
  }
  const cls = JSON.parse(json) as BlueprintClass | null;
  const i = p.classes.findIndex((c) => c.id === scope.id);
  if (cls && i >= 0) p.classes[i] = cls;
  else if (cls) p.classes.push(cls);
  else if (i >= 0) p.classes.splice(i, 1);
}

export class History {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];

  constructor(private readonly limit = 200) {}

  push(entry: HistoryEntry): void {
    if (entry.before === entry.after) return;
    this.undoStack.push(entry);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get undoLabel(): string | undefined {
    return this.undoStack.at(-1)?.label;
  }

  get redoLabel(): string | undefined {
    return this.redoStack.at(-1)?.label;
  }

  undo(p: Project): HistoryEntry | undefined {
    const e = this.undoStack.pop();
    if (!e) return undefined;
    restore(p, e.scope, e.before);
    this.redoStack.push(e);
    return e;
  }

  redo(p: Project): HistoryEntry | undefined {
    const e = this.redoStack.pop();
    if (!e) return undefined;
    restore(p, e.scope, e.after);
    this.undoStack.push(e);
    return e;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
