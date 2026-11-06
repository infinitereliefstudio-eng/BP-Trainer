/**
 * A play session ("Play In Editor"): spawns the level, moves the player,
 * detects overlaps, fires events and advances time in fixed 1/60 s steps.
 * It has no rendering: the UI draws its state, the lesson runner checks it.
 */
import { findClass, type Project } from '../model/project';
import { defaultValueFor } from '../types/values';
import type { PrintOptions } from './behaviors/types';
import { Interpreter, type InterpreterHost, type NodeSite } from './interpreter';
import { componentShape, overlapShapes, overlaps, pushOut } from './physics';
import { isRef, PLAYER_RADIUS, PLAYER_SPEED, type ActorRT, type ComponentRT, type RValue } from './world';

export const STEP = 1 / 60;

export type InputKey = 'E' | 'F' | 'SpaceBar';

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
}

let seq = 0;

export class Simulation implements InterpreterHost {
  time = 0;
  frame = 0;
  actors: ActorRT[] = [];
  readonly player: ActorRT;
  log: SimLogEntry[] = [];
  screen: ScreenMessage[] = [];
  runtimeErrors = 0;
  /** Joystick direction, each axis in [-1, 1]. */
  move = { x: 0, y: 0 };

  private interp: Interpreter;
  private site: NodeSite | undefined;
  private rng: number;
  private accumulator = 0;
  private started = false;
  private errorCounts = new Map<string, number>();

  constructor(
    readonly project: Project,
    opts: { seed?: number } = {},
  ) {
    this.rng = opts.seed ?? 12345;
    this.interp = new Interpreter(project, this);
    const ps = project.level.playerStart;
    this.player = {
      id: 'player',
      label: 'Joueur',
      objectName: 'BP_Joueur_C_0',
      className: 'Pawn',
      isPlayer: true,
      x: ps.x,
      y: ps.y,
      yaw: ps.yaw,
      components: [],
      vars: {},
      outputs: {},
      nodeState: {},
      latent: {},
      overlaps: new Set(),
      compOverlaps: new Set(),
      receivesInput: false,
      destroyed: false,
    };
    this.spawnLevel();
  }

  private spawnLevel(): void {
    const counters = new Map<string, number>();
    for (const la of this.project.level.actors) {
      const cls = findClass(this.project, la.classId);
      if (!cls) continue;
      const n = counters.get(cls.id) ?? 0;
      counters.set(cls.id, n + 1);
      const vars: Record<string, RValue> = {};
      for (const v of cls.variables) {
        const value = v.instanceEditable && v.id in la.overrides ? la.overrides[v.id] : v.defaultValue;
        vars[v.id] = structuredClone(value ?? defaultValueFor(v.type));
      }
      this.actors.push({
        id: la.id,
        label: la.name,
        objectName: `${cls.name}_C_${n}`,
        classId: cls.id,
        className: cls.name,
        isPlayer: false,
        x: la.x,
        y: la.y,
        yaw: la.yaw,
        components: cls.components.map((c) => ({ id: c.id, name: c.name, kind: c.kind, parent: c.parent, props: structuredClone(c.props) })),
        vars,
        outputs: {},
        nodeState: {},
        latent: {},
        overlaps: new Set(),
        compOverlaps: new Set(),
        receivesInput: cls.autoReceiveInput,
        destroyed: false,
      });
    }
  }

  /** Fire BeginPlay on every actor, in level order. */
  start(): void {
    if (this.started) return;
    this.started = true;
    for (const a of [...this.actors]) this.interp.fire(a, (n) => n.def === 'event.beginPlay', 'then');
  }

  /** Advance by real elapsed time, in fixed steps (at most 0.25 s at once). */
  advance(seconds: number): void {
    this.accumulator += Math.min(seconds, 0.25);
    while (this.accumulator >= STEP) {
      this.accumulator -= STEP;
      this.step();
    }
  }

  step(dt = STEP): void {
    if (!this.started) this.start();
    this.movePlayer(dt);
    this.updateOverlaps();
    for (const a of [...this.actors]) {
      if (!a.destroyed) this.interp.fire(a, (n) => n.def === 'event.tick', 'then', { delta: dt });
    }
    for (const a of [...this.actors]) if (!a.destroyed) this.interp.tickLatents(a, dt);
    this.time += dt;
    this.frame++;
    this.screen = this.screen.filter((m) => m.until > this.time);
    this.removeDestroyed();
  }

  // ---------------------------------------------------------------- input

  pressKey(key: InputKey): void {
    this.dispatchKey(key, 'pressed');
  }

  releaseKey(key: InputKey): void {
    this.dispatchKey(key, 'released');
  }

  private dispatchKey(key: InputKey, pin: 'pressed' | 'released'): void {
    if (!this.started) this.start();
    for (const a of [...this.actors]) {
      if (a.destroyed || !a.receivesInput) continue;
      this.interp.fire(a, (n) => n.def === 'event.inputKey' && n.config.key === key, pin);
    }
  }

  /** Actors with an input event that will not fire because input is off. */
  deafActors(key?: InputKey): ActorRT[] {
    return this.actors.filter(
      (a) => !a.receivesInput && this.interp.hasEvent(a, (n) => n.def === 'event.inputKey' && (!key || n.config.key === key)),
    );
  }

  click(actorId: string): void {
    const a = this.actors.find((x) => x.id === actorId);
    if (a) this.interp.fire(a, (n) => n.def === 'event.actorOnClicked', 'then');
  }

  teleportPlayer(x: number, y: number): void {
    this.player.x = x;
    this.player.y = y;
  }

  // -------------------------------------------------------------- physics

  private movePlayer(dt: number): void {
    let { x: mx, y: my } = this.move;
    const len = Math.hypot(mx, my);
    if (len < 0.05) return;
    if (len > 1) {
      mx /= len;
      my /= len;
    }
    const p = this.player;
    let nx = p.x + mx * PLAYER_SPEED * dt;
    let ny = p.y + my * PLAYER_SPEED * dt;
    p.yaw = (Math.atan2(my, mx) * 180) / Math.PI;
    for (let iter = 0; iter < 3; iter++) {
      for (const a of this.actors) {
        if (a.destroyed) continue;
        for (const c of a.components) {
          if (c.kind !== 'StaticMesh' || !c.props.blocks) continue;
          const s = componentShape(a, c);
          if (s) [nx, ny] = pushOut(nx, ny, PLAYER_RADIUS, s);
        }
      }
    }
    p.x = nx;
    p.y = ny;
  }

  private updateOverlaps(): void {
    const live = [this.player, ...this.actors.filter((a) => !a.destroyed)];
    const shapes = new Map(live.map((a) => [a.id, overlapShapes(a)]));
    const nextActor = new Map<string, Set<string>>(live.map((a) => [a.id, new Set()]));
    const nextComp = new Map<string, Set<string>>(live.map((a) => [a.id, new Set()]));

    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const A = live[i],
          B = live[j];
        const sa = shapes.get(A.id)!,
          sb = shapes.get(B.id)!;
        let any = false;
        for (const x of sa) {
          for (const y of sb) {
            if (!overlaps(x.shape, y.shape)) continue;
            any = true;
            if (x.comp) nextComp.get(A.id)!.add(`${x.comp.id}|${B.id}`);
            if (y.comp) nextComp.get(B.id)!.add(`${y.comp.id}|${A.id}`);
          }
        }
        if (any) {
          nextActor.get(A.id)!.add(B.id);
          nextActor.get(B.id)!.add(A.id);
        }
      }
    }

    // End events first, then begin events, like a frame of UE overlaps.
    for (const a of live) {
      const nextC = nextComp.get(a.id)!;
      for (const key of a.compOverlaps) {
        if (nextC.has(key)) continue;
        const [comp, other] = key.split('|');
        this.interp.fire(a, (n) => n.def === 'event.componentEndOverlap' && n.config.component === comp, 'then', { other: { ref: 'actor', id: other } });
      }
      const nextA = nextActor.get(a.id)!;
      for (const other of a.overlaps) {
        if (!nextA.has(other)) this.interp.fire(a, (n) => n.def === 'event.actorEndOverlap', 'then', { other: { ref: 'actor', id: other } });
      }
    }
    for (const a of live) {
      const nextC = nextComp.get(a.id)!;
      const prevC = a.compOverlaps;
      const nextA = nextActor.get(a.id)!;
      const prevA = a.overlaps;
      a.compOverlaps = nextC;
      a.overlaps = nextA;
      for (const key of nextC) {
        if (prevC.has(key)) continue;
        const [comp, other] = key.split('|');
        this.interp.fire(a, (n) => n.def === 'event.componentBeginOverlap' && n.config.component === comp, 'then', { other: { ref: 'actor', id: other } });
      }
      for (const other of nextA) {
        if (!prevA.has(other)) this.interp.fire(a, (n) => n.def === 'event.actorBeginOverlap', 'then', { other: { ref: 'actor', id: other } });
      }
    }
  }

  private removeDestroyed(): void {
    const gone = this.actors.filter((a) => a.destroyed);
    if (!gone.length) return;
    this.actors = this.actors.filter((a) => !a.destroyed);
    for (const g of gone) {
      for (const a of [this.player, ...this.actors]) {
        if (!a.overlaps.has(g.id)) continue;
        a.overlaps.delete(g.id);
        for (const k of [...a.compOverlaps]) if (k.endsWith(`|${g.id}`)) a.compOverlaps.delete(k);
        this.interp.fire(a, (n) => n.def === 'event.actorEndOverlap', 'then', { other: { ref: 'actor', id: g.id } });
      }
    }
  }

  // ------------------------------------------------------------ WorldApi

  random(): number {
    // Mulberry32: deterministic, so lesson checks are reproducible.
    let t = (this.rng += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  print(actor: ActorRT, text: string, opts: PrintOptions): void {
    if (opts.toScreen) this.screen.unshift({ id: ++seq, text, until: this.time + Math.max(0, opts.duration) });
    if (this.screen.length > 12) this.screen.length = 12;
    if (opts.toLog) {
      this.log.push({
        id: ++seq,
        time: this.time,
        level: 'log',
        text: `LogBlueprintUserMessages: [${actor.objectName}] ${text}`,
        actor: actor.id,
        message: text,
      });
    }
  }

  private findActor(id: string): ActorRT | undefined {
    if (id === this.player.id) return this.player;
    return this.actors.find((a) => a.id === id);
  }

  component(ref: RValue, pinName: string): ComponentRT | null {
    if (!isRef(ref) || ref.ref !== 'component') {
      this.runtimeError(`Accessed None trying to read property ${pinName}`);
      return null;
    }
    const a = this.findActor(ref.actor);
    const c = a && !a.destroyed ? a.components.find((k) => k.id === ref.id) : undefined;
    if (!c) {
      this.runtimeError(`Accessed None trying to read property ${pinName} (le composant n'existe plus)`);
      return null;
    }
    return c;
  }

  actor(ref: RValue, pinName: string): ActorRT | null {
    if (!isRef(ref) || ref.ref !== 'actor') {
      this.runtimeError(`Accessed None trying to read property ${pinName}`);
      return null;
    }
    const a = this.findActor(ref.id);
    if (!a || a.destroyed) {
      this.runtimeError(`Accessed None trying to read property ${pinName} (l'acteur a été détruit)`);
      return null;
    }
    return a;
  }

  ownerOf(c: ComponentRT): ActorRT | undefined {
    return this.actors.find((a) => a.components.includes(c));
  }

  destroy(actor: ActorRT): void {
    if (actor.isPlayer) {
      this.runtimeError('Destroy Actor : le joueur ne peut pas être détruit dans cette version.');
      return;
    }
    actor.destroyed = true;
    actor.latent = {};
  }

  displayName(ref: RValue): string {
    if (!isRef(ref)) return ref === null ? 'None' : String(ref);
    if (ref.ref === 'actor') return this.findActor(ref.id)?.label ?? 'None';
    const a = this.findActor(ref.actor);
    return a?.components.find((c) => c.id === ref.id)?.name ?? 'None';
  }

  enterNode(site: NodeSite): void {
    this.site = site;
  }

  runtimeError(message: string): void {
    const s = this.site;
    const where = s ? ` Node: ${s.nodeTitle} Graph: ${s.graphName} Blueprint: ${s.className}` : '';
    const text = `Blueprint Runtime Error: "${message}".${where}`;
    const count = (this.errorCounts.get(text) ?? 0) + 1;
    this.errorCounts.set(text, count);
    this.runtimeErrors++;
    if (count <= 3) this.log.push({ id: ++seq, time: this.time, level: 'error', text });
    else if (count === 4) this.log.push({ id: ++seq, time: this.time, level: 'warning', text: `(erreur répétée, masquée) ${text}` });
  }
}
