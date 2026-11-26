/**
 * The game launched by Play (or by the lesson checker): what UE's engine
 * keeps while worlds come and go. It holds the world being played (a
 * Simulation, one per level) and what outlives a level: the save slots, the
 * Output Log and the on-screen messages, the joystick.
 *
 * Open Level only asks: the chain that called it finishes, the frame
 * finishes, and at the start of the next frame the old world ends (the
 * widgets' Event Destruct, then Event End Play with Level Transition on every
 * actor, its components, the Player Controller and the player) and a new one
 * begins (Construction Scripts, then BeginPlay), as UE's TickWorldTravel.
 * Actors, timers, Delays and widgets of the old world are gone; a reference
 * kept to one of them is None (Accessed None, Is Valid false).
 *
 * The GameInstance (V7.48) is made here, before the first world: Event Init
 * runs before the GameMode, the Player Controller and the pawn exist (V7.52),
 * the same object is handed to every world (with its Delays and timers),
 * and Event Shutdown runs when the game closes (Stop, or Quit Game at the
 * start of the next frame), after the last world's End Play.
 */
import { findClass, findLevelByName, type Level, type Project } from '../model/project';
import { inheritedView } from '../model/inheritance';
import { createGameInstance } from './actorFactory';
import { Journal } from './journal';
import { RunRecord } from './runRecord';
import { Simulation, type SimulationOptions, STEP, type TraceEntry } from './simulation';
import { TimerSet } from './timers';
import { type ActorRT, isRef, type RValue } from './world';

/** Each world gets its own seed, derived from the game's: the order of a shuffled BeginPlay changes from one level to the next. */
const SEED_STRIDE = 7919;

export class Game {
  /** The world being played. Replaced at each Open Level. */
  world: Simulation;
  /** Output Log and on-screen messages, for every world of the game. */
  readonly journal = new Journal();
  /** What every world of the game did: « Pourquoi ? » and « Montre-moi » see the levels left behind too. */
  readonly record = new RunRecord();
  /** The Execution Trace, over every level. */
  readonly trace: TraceEntry[] = [];
  /** The timers: UE's Timer Manager belongs to the GameInstance, so its own timers outlive Open Level. */
  readonly timers = new TimerSet();
  /** The levels played, in order, by name: the first one, then one per Open Level. */
  readonly visited: string[] = [];
  /** Told after each travel, once the new world has begun play. */
  onTravel?: (world: Simulation) => void;
  /** The GameInstance: an instance of the Game Instance Class (Maps & Modes), or UE's plain GameInstance. */
  readonly gameInstance: ActorRT;
  /** The game is closed (Stop, Quit Game): no more frame, no more travel. */
  over = false;
  /** It was closed by Quit Game (not by Stop). */
  quitted = false;
  private worlds = 0;
  /** A world before this one wrote or deleted a slot. */
  private slotsChangedBefore = false;
  /** The level Open Level travels to, once its name is found. */
  private target: string | undefined;

  /**
   * What the GameInstance keeps of the old world: a reference to one of its
   * actors, components or widgets (or an event bound on them) becomes None,
   * as their objects are gone. Itself and SaveGame objects stay valid.
   */
  private forgetOldWorld(old: Simulation): ActorRT[] {
    const saves = this.savesKept(old);
    const keep = new Set([this.gameInstance.id, ...saves.map((o) => o.id)]);
    const clean = (v: RValue): RValue => {
      if (isRef(v)) {
        if (v.ref === 'actor') return keep.has(v.id) ? v : null;
        if (v.ref === 'component' || v.ref === 'delegate') return keep.has(v.actor) ? v : null;
        return v;
      }
      if (Array.isArray(v)) return v.map(clean);
      if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x as RValue)])) as RValue;
      return v;
    };
    const vars = this.gameInstance.vars;
    for (const k of Object.keys(vars)) vars[k] = clean(vars[k]);
    // Events of old actors bound to its Event Dispatchers: gone with them.
    const b = this.gameInstance.bindings;
    for (const k of Object.keys(b)) b[k] = (b[k] ?? []).filter((x) => keep.has(x.actor));
    // Timers of the old actors go with them; the GameInstance's own go on (UE: its Timer Manager).
    this.timers.keepOwners(new Set([this.gameInstance.id]));
    return saves;
  }

  /**
   * The SaveGame objects that outlive the old world: those the GameInstance
   * still reaches through its variables (or through another one kept). The
   * others were only referenced by actors of the old level, gone with it.
   */
  private savesKept(old: Simulation): ActorRT[] {
    const saves = new Map(old.objects.filter((o) => o.native === 'SaveGame').map((o) => [o.id, o]));
    const kept = new Map<string, ActorRT>();
    const visit = (v: RValue): void => {
      if (isRef(v)) {
        const o = v.ref === 'actor' ? saves.get(v.id) : undefined;
        if (o && !kept.has(o.id)) {
          kept.set(o.id, o);
          for (const x of Object.values(o.vars)) visit(x);
        }
        return;
      }
      if (Array.isArray(v)) for (const x of v) visit(x);
      else if (v && typeof v === 'object') for (const x of Object.values(v)) visit(x as RValue);
    };
    for (const x of Object.values(this.gameInstance.vars)) visit(x);
    return [...kept.values()];
  }

  constructor(
    readonly project: Project,
    private readonly opts: Omit<SimulationOptions, 'journal' | 'gameInstance' | 'initGameInstance' | 'record' | 'trace' | 'timers'> = {},
  ) {
    const id = project.mapsModes?.gameInstanceClass;
    const cls = id ? findClass(project, id) : undefined;
    this.gameInstance = createGameInstance(cls?.parent === 'GameInstance' ? inheritedView(cls, project, true) : undefined);
    this.world = this.make(opts.levelId);
  }

  private make(levelId: string | undefined): Simulation {
    const seed = (this.opts.seed ?? 12345) + this.worlds * SEED_STRIDE;
    const first = this.worlds === 0;
    this.worlds++;
    const w = new Simulation(this.project, {
      ...this.opts,
      seed,
      levelId,
      journal: this.journal,
      record: this.record,
      trace: this.trace,
      timers: this.timers,
      gameInstance: this.gameInstance,
      initGameInstance: first,
    });
    this.visited.push(w.level.name);
    return w;
  }

  /** The level being played. */
  get level(): Level {
    return this.world.level;
  }

  /** Did a node write or delete a slot during this game, in any of its levels? */
  get slotsChanged(): boolean {
    return this.slotsChangedBefore || this.world.slotsChanged;
  }

  /** The joystick belongs to the device, not to the world: it carries over a travel. */
  get move(): { x: number; y: number } {
    return this.world.move;
  }

  set move(m: { x: number; y: number }) {
    this.world.move = m;
  }

  /** BeginPlay of the first world. */
  start(): void {
    this.world.start();
  }

  /** One frame: a travel asked by Open Level (or Quit Game) first, then the world's frame. */
  step(dt = STEP): void {
    this.settle();
    if (!this.over) this.world.step(dt);
  }

  /** Real time, in fixed steps (see Simulation.advance). A travel happens before the frames of this call. */
  advance(seconds: number): void {
    this.settle();
    if (!this.over) this.world.advance(seconds);
  }

  /**
   * The game closes (Stop, or Quit Game): the world's widgets and actors end
   * (End Play In Editor), then Event Shutdown of the GameInstance. Breakpoints
   * are ignored, as UE's Stop aborts the paused script. Nothing after it.
   */
  shutdown(): void {
    if (this.over) return;
    this.over = true;
    this.world.endGame();
  }

  /** After a breakpoint: carry on, then travel if End Play has finished meanwhile. */
  resume(): void {
    this.world.resume();
  }

  stepNode(): void {
    this.world.stepNode();
  }

  /**
   * Open Level was called in the last frame: travel now, as the next frame
   * begins. The world ends (End Play may stop at a breakpoint: the travel
   * then waits until it is over), then the next one begins. An unknown name
   * logs a Travel Failure and the game goes on. Nothing if no travel was asked.
   */
  settle(): void {
    const old = this.world;
    if (this.over || old.paused) return;
    if (old.quit && !old.ended) {
      // Quit Game in the last frame: in Play in the editor, the same as Stop.
      this.quitted = true;
      old.engineLog('LogBlueprintUserMessages: Quit Game : le jeu se ferme (en Play dans l’éditeur, comme Stop).');
      this.shutdown();
      return;
    }
    if (!old.ended) {
      const asked = old.travel;
      if (!asked) return;
      const level = findLevelByName(this.project, asked.level);
      if (!level) {
        old.travelFailed(asked.level.trim());
        return;
      }
      this.target = level.id;
      old.endForTravel();
      if (!old.ended) return;
    }
    const move = old.move;
    // Set Input Mode sets the game viewport, which outlives the world (V7.73): the mode follows the travel. Show Mouse
    // Cursor belongs to the Player Controller, which is made anew: the cursor is hidden again.
    const mode = old.inputMode;
    this.slotsChangedBefore ||= old.slotsChanged;
    this.journal.rebase(old.time);
    const saves = this.forgetOldWorld(old);
    this.world = this.make(this.target);
    this.world.move = move;
    this.world.inputMode = mode;
    // What the screen said: the texts that reached it (a widget of the old world is gone, it will not be painted now).
    old.umg.markSeen();
    this.world.umg.textLog.push(...old.umg.textLog.filter((e) => e.seen));
    // A SaveGame object is not in the level: kept by the GameInstance, it survives the travel.
    this.world.objects.push(...saves);
    this.world.engineLog(
      `LogLoad: LoadMap: /Game/${this.world.level.name} (Open Level depuis ${old.level.name} : un monde neuf, ses acteurs, le joueur et le Player Controller recréés)`,
    );
    if (mode !== 'GameOnly') {
      if (mode === 'UIOnly') this.record.uiOnlyCarried.push(this.world.level.name);
      this.world.engineLog(
        `LogPlayerController: le mode d’entrée ${mode === 'UIOnly' ? 'UI Only' : 'Game and UI'}, réglé avant Open Level, est gardé dans ${this.world.level.name} (il appartient au viewport, pas au niveau). ${mode === 'UIOnly' ? 'Le jeu n’y reçoit aucune touche tant que rien ne remet Set Input Mode Game Only.' : ''}`.trim(),
      );
    }
    this.world.start();
    this.onTravel?.(this.world);
  }
}
