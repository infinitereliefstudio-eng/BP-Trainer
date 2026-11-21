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
 * runs before the first BeginPlay, the same object is handed to every world,
 * and Event Shutdown runs when the game closes (Stop, or Quit Game at the
 * start of the next frame), after the last world's End Play.
 */
import { findClass, findLevelByName, type Level, type Project } from '../model/project';
import { inheritedView } from '../model/inheritance';
import { createGameInstance } from './actorFactory';
import { Journal } from './journal';
import { Simulation, type SimulationOptions, STEP } from './simulation';
import { type ActorRT, isRef, type RValue } from './world';

/** Each world gets its own seed, derived from the game's: the order of a shuffled BeginPlay changes from one level to the next. */
const SEED_STRIDE = 7919;

export class Game {
  /** The world being played. Replaced at each Open Level. */
  world: Simulation;
  /** Output Log and on-screen messages, for every world of the game. */
  readonly journal = new Journal();
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
  private forgetOldWorld(old: Simulation): void {
    const keep = new Set([this.gameInstance.id, ...old.objects.filter((o) => o.native === 'SaveGame').map((o) => o.id)]);
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
  }

  constructor(
    readonly project: Project,
    private readonly opts: Omit<SimulationOptions, 'journal' | 'gameInstance' | 'initGameInstance'> = {},
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
    this.slotsChangedBefore ||= old.slotsChanged;
    this.journal.rebase(old.time);
    this.forgetOldWorld(old);
    this.world = this.make(this.target);
    this.world.move = move;
    // A SaveGame object is not in the level: kept by the GameInstance, it survives the travel.
    this.world.objects.push(...old.objects.filter((o) => o.native === 'SaveGame'));
    this.world.engineLog(
      `LogLoad: LoadMap: /Game/${this.world.level.name} (Open Level depuis ${old.level.name} : un monde neuf, ses acteurs, le joueur et le Player Controller recréés)`,
    );
    this.world.start();
    this.onTravel?.(this.world);
  }
}
