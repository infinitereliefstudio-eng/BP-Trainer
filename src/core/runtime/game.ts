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
 * V7.48 adds the GameInstance here: one object for the whole game.
 */
import { findLevelByName, type Level, type Project } from '../model/project';
import { Journal } from './journal';
import { Simulation, type SimulationOptions, STEP } from './simulation';

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
  private worlds = 0;
  /** A world before this one wrote or deleted a slot. */
  private slotsChangedBefore = false;
  /** The level Open Level travels to, once its name is found. */
  private target: string | undefined;

  constructor(
    readonly project: Project,
    private readonly opts: Omit<SimulationOptions, 'journal'> = {},
  ) {
    this.world = this.make(opts.levelId);
  }

  private make(levelId: string | undefined): Simulation {
    const seed = (this.opts.seed ?? 12345) + this.worlds * SEED_STRIDE;
    this.worlds++;
    const w = new Simulation(this.project, { ...this.opts, seed, levelId, journal: this.journal });
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

  /** One frame: a travel asked by Open Level first, then the world's frame. */
  step(dt = STEP): void {
    this.settle();
    this.world.step(dt);
  }

  /** Real time, in fixed steps (see Simulation.advance). A travel happens before the frames of this call. */
  advance(seconds: number): void {
    this.settle();
    this.world.advance(seconds);
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
    if (old.paused) return;
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
    this.world = this.make(this.target);
    this.world.move = move;
    this.world.engineLog(
      `LogLoad: LoadMap: /Game/${this.world.level.name} (Open Level depuis ${old.level.name} : un monde neuf, ses acteurs, le joueur et le Player Controller recréés)`,
    );
    this.world.start();
    this.onTravel?.(this.world);
  }
}
