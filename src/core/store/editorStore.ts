/**
 * EditorStore: the single source of truth for the editor session.
 *
 * It owns the project, the history, what is open and selected, the compile
 * results and the messages. The UI (Preact panels and the canvas) reads from
 * it and calls its methods; it never touches the DOM itself.
 *
 * Every model change goes through `apply`/`applyProject` (or a manual
 * begin/commit pair for long gestures like dragging nodes), which records an
 * undo entry and notifies listeners with the kind "model".
 */
import { compileClass, type CompileMessage, type CompileStatus } from '../compiler/validate';
import { History, snapshot, type Scope } from '../history/history';
import { findGraph, type BlueprintClass, type Graph, type Project } from '../model/project';
import type { NodeContext } from '../nodes/definition';
import { contextFor } from '../nodes/registry';
import { releaseClassWildcards } from '../operations/wildcardOps';
import { syncInterfaceGraphs } from '../operations/interfaceOps';

export type ChangeKind = 'model' | 'view';
export type Listener = (kind: ChangeKind) => void;

export type Focus =
  | { kind: 'none' }
  | { kind: 'nodes' }
  | { kind: 'variable'; id: string }
  /** A Local Variable of the function graph `graph`. */
  | { kind: 'local'; graph: string; id: string }
  | { kind: 'component'; id: string }
  | { kind: 'class' }
  | { kind: 'function'; id: string }
  | { kind: 'dispatcher'; id: string }
  | { kind: 'interface'; id: string }
  | { kind: 'enum'; id: string }
  | { kind: 'struct'; id: string }
  | { kind: 'actor'; id: string }
  | { kind: 'playerStart' };

export type LogLevel = 'info' | 'warning' | 'error';

export interface LogEntry {
  id: number;
  time: number;
  level: LogLevel;
  text: string;
}

export interface Toast {
  id: number;
  level: LogLevel;
  text: string;
}

interface OpenTransaction {
  label: string;
  scope: Scope;
  before: string;
}

let seq = 0;

export class EditorStore {
  project: Project;
  readonly history = new History();
  classId: string;
  graphId: string;
  selection = new Set<string>();
  focus: Focus = { kind: 'none' };
  /** Breakpoints (node ids). Shared with the running Play session, never saved. */
  readonly breakpoints = new Set<string>();
  compileStatus: CompileStatus = 'dirty';
  compileMessages: CompileMessage[] = [];
  log: LogEntry[] = [];
  toasts: Toast[] = [];

  private listeners = new Set<Listener>();
  private tx: OpenTransaction | null = null;

  constructor(project: Project) {
    this.project = project;
    const first = project.classes[0];
    if (!first) throw new Error('A project needs at least one class.');
    this.classId = first.id;
    this.graphId = first.graphs[0].id;
  }

  // ------------------------------------------------------------ observers

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  notify(kind: ChangeKind = 'view'): void {
    for (const fn of this.listeners) fn(kind);
  }

  // ------------------------------------------------------------- accessors

  get cls(): BlueprintClass {
    const c = this.project.classes.find((x) => x.id === this.classId) ?? this.project.classes[0];
    return c;
  }

  get graph(): Graph {
    return findGraph(this.cls, this.graphId) ?? this.cls.graphs[0];
  }

  get ctx(): NodeContext {
    return contextFor(this.cls, this.project);
  }

  // ---------------------------------------------------------- transactions

  begin(label: string, scope: Scope = { kind: 'class', id: this.classId }): void {
    if (this.tx) this.commit();
    this.tx = { label, scope, before: snapshot(this.project, scope) };
  }

  /** Notify a live change inside an open transaction (e.g. a node drag). */
  touch(): void {
    this.notify('view');
  }

  commit(): void {
    const tx = this.tx;
    if (!tx) return;
    this.tx = null;
    for (const c of this.project.classes) {
      if (tx.scope.kind !== 'project' && c.id !== tx.scope.id) continue;
      // Interface functions with outputs keep their implementation graph in step.
      syncInterfaceGraphs(this.project, c);
      // Generic nodes whose last wire went become generic again.
      releaseClassWildcards(c, this.project);
    }
    const after = snapshot(this.project, tx.scope);
    if (after === tx.before) return;
    this.history.push({ label: tx.label, scope: tx.scope, before: tx.before, after });
    this.afterModelChange();
  }

  /** Run a class-level change as one undoable step. */
  apply<T>(label: string, fn: (cls: BlueprintClass, graph: Graph) => T): T {
    this.begin(label);
    try {
      return fn(this.cls, this.graph);
    } finally {
      this.commit();
    }
  }

  /** Run a project-level change (classes) as one undoable step. */
  applyProject<T>(label: string, fn: (p: Project) => T): T {
    this.begin(label, { kind: 'project' });
    try {
      return fn(this.project);
    } finally {
      this.commit();
    }
  }

  undo(): void {
    this.commit();
    const e = this.history.undo(this.project);
    if (e) {
      this.repairView();
      this.afterModelChange();
      this.info(`Annulé : ${e.label}`, false);
    }
  }

  redo(): void {
    this.commit();
    const e = this.history.redo(this.project);
    if (e) {
      this.repairView();
      this.afterModelChange();
      this.info(`Rétabli : ${e.label}`, false);
    }
  }

  /** Swap in another project (import, reset); history starts over. */
  replaceProject(p: Project): void {
    this.tx = null;
    this.project = p;
    this.history.clear();
    this.classId = p.classes[0].id;
    this.graphId = p.classes[0].graphs[0].id;
    this.selection.clear();
    this.focus = { kind: 'none' };
    this.afterModelChange();
  }

  private afterModelChange(): void {
    this.project.updatedAt = Date.now();
    this.compileStatus = 'dirty';
    this.repairView();
    this.notify('model');
  }

  /** Keep open class/graph/selection valid after undo or deletions. */
  private repairView(): void {
    if (!this.project.classes.some((c) => c.id === this.classId)) this.classId = this.project.classes[0].id;
    if (!findGraph(this.cls, this.graphId)) this.graphId = this.cls.graphs[0].id;
    const nodes = this.graph.nodes;
    for (const id of [...this.selection]) if (!nodes[id]) this.selection.delete(id);
    const f = this.focus;
    if (f.kind === 'variable' && !this.cls.variables.some((v) => v.id === f.id)) this.focus = { kind: 'none' };
    if (f.kind === 'local' && !findGraph(this.cls, f.graph)?.fn?.locals?.some((l) => l.id === f.id)) this.focus = { kind: 'none' };
    if (f.kind === 'component' && !this.cls.components.some((c) => c.id === f.id)) this.focus = { kind: 'none' };
    if (f.kind === 'nodes' && this.selection.size === 0) this.focus = { kind: 'none' };
    if (f.kind === 'actor' && !this.project.level.actors.some((a) => a.id === f.id)) this.focus = { kind: 'none' };
    if (f.kind === 'function' && !this.cls.graphs.some((g) => g.id === f.id)) this.focus = { kind: 'none' };
    if (f.kind === 'dispatcher' && !this.cls.dispatchers.some((d) => d.id === f.id)) this.focus = { kind: 'none' };
    if (f.kind === 'struct' && !this.project.structs.some((x) => x.id === f.id)) this.focus = { kind: 'none' };
    if (f.kind === 'interface' && !this.project.interfaces.some((i) => i.id === f.id)) this.focus = { kind: 'none' };
  }

  // ------------------------------------------------------------ navigation

  openClass(id: string): void {
    if (!this.project.classes.some((c) => c.id === id)) return;
    this.commit();
    this.classId = id;
    this.graphId = this.cls.graphs[0].id;
    this.selection.clear();
    this.focus = { kind: 'class' };
    this.compileStatus = 'dirty';
    this.compileMessages = [];
    this.notify('view');
  }

  openGraph(id: string): void {
    if (!findGraph(this.cls, id)) return;
    this.graphId = id;
    this.selection.clear();
    this.notify('view');
  }

  // ------------------------------------------------------------- selection

  selectNodes(ids: Iterable<string>, additive = false): void {
    if (!additive) this.selection.clear();
    for (const id of ids) this.selection.add(id);
    this.focus = this.selection.size ? { kind: 'nodes' } : { kind: 'none' };
    this.notify('view');
  }

  toggleNode(id: string): void {
    if (this.selection.has(id)) this.selection.delete(id);
    else this.selection.add(id);
    this.focus = this.selection.size ? { kind: 'nodes' } : { kind: 'none' };
    this.notify('view');
  }

  clearSelection(): void {
    if (!this.selection.size && this.focus.kind === 'none') return;
    this.selection.clear();
    this.focus = { kind: 'none' };
    this.notify('view');
  }

  toggleBreakpoint(nodeId: string): void {
    if (this.breakpoints.has(nodeId)) this.breakpoints.delete(nodeId);
    else this.breakpoints.add(nodeId);
    this.notify('view');
  }

  setFocus(f: Focus): void {
    this.focus = f;
    if (f.kind !== 'nodes') this.selection.clear();
    this.notify('view');
  }

  // --------------------------------------------------------------- compile

  /** Compile the open class; `quiet` skips the summary toast (Play does its own). */
  compile(quiet = false): void {
    this.commit();
    const res = compileClass(this.cls, this.project);
    this.compileStatus = res.status;
    this.compileMessages = res.messages;
    const summary = res.messages[res.messages.length - 1]?.text ?? '';
    if (quiet && res.status !== 'error') {
      this.notify('view');
      return;
    }
    if (res.status === 'error') this.error(summary);
    else if (res.status === 'warning') this.warn(summary);
    else this.info(summary);
  }

  // -------------------------------------------------------------- messages

  info(text: string, toast = true): void {
    this.push('info', text, toast);
  }

  warn(text: string, toast = true): void {
    this.push('warning', text, toast);
  }

  error(text: string, toast = true): void {
    this.push('error', text, toast);
  }

  private push(level: LogLevel, text: string, toast: boolean): void {
    this.log.push({ id: ++seq, time: Date.now(), level, text });
    if (this.log.length > 500) this.log.splice(0, this.log.length - 500);
    if (toast) {
      const t: Toast = { id: seq, level, text };
      this.toasts = [...this.toasts.slice(-2), t];
      setTimeout(() => {
        this.toasts = this.toasts.filter((x) => x.id !== t.id);
        this.notify('view');
      }, level === 'error' ? 4000 : 2500);
    }
    this.notify('view');
  }
}
