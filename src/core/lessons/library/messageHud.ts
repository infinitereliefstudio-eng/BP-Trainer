/**
 * A message line on the screen (V7.59, review of the path's progression):
 * in UE, Print String is for debugging and does not show in a shipped game;
 * what the player reads goes through a widget. Steps of the Avancé that
 * answered the player with Print String get WBP_Messages, made by the actor
 * that talks: the learner calls Afficher instead of Print String.
 *
 * - WBP_Messages: a Canvas Panel and Txt_Message (Is Variable) low on the
 *   screen; its function Afficher (Texte) sets the text.
 * - The owner, at BeginPlay: Create Widget (Owning Player = Get Player
 *   Controller) → Set Messages → Add to Viewport.
 */
import type { Project } from '../../model/project';
import { T } from '../../types/pins';
import { ClassBuilder } from '../builder';
import { normText } from '../checks';
import type { CheckContext } from '../types';
import { fnDef, fnOf } from './kit';
import { addW, newClass } from './umgKit';
import { PLAYER_CONTROLLER } from '../ue5Input';

export const MESSAGES_WIDGET = 'WBP_Messages';
export const MESSAGES_VAR = 'Messages';

/** WBP_Messages and its function Afficher (Texte). */
export function messageWidget(p: Project): ClassBuilder {
  const w = newClass(p, MESSAGES_WIDGET, 'UserWidget');
  const canvas = addW(p, w.cls, 'CanvasPanel', undefined);
  addW(p, w.cls, 'TextBlock', canvas.id, {
    name: 'Txt_Message',
    isVariable: true,
    props: { text: '', fontSize: 28, justification: 'Center', color: '#f8fafc' },
    slot: { anchors: { minX: 0.5, minY: 1, maxX: 0.5, maxY: 1 }, offsets: [0, -90, 1000, 60], alignX: 0.5, alignY: 0.5 },
  });
  const fn = fnDef(p, w, 'Afficher', [['Texte', T.string]], [], false);
  const set = fn.f.node('widget.setText', {}, {}, [420, 96]);
  const txt = w.cls.widgets!.find((x) => x.name === 'Txt_Message')!;
  fn.f
    .link(fn.entry, 'then', set, 'exec')
    .link(fn.entry, fn.pin.Texte, set, 'text')
    .link(fn.f.node('var.widget', { widget: txt.id }, {}, [200, 300]), 'value', set, 'target')
    .link(set, 'then', fn.ret, 'exec');
  return w;
}

/**
 * The actor `b` makes WBP_Messages at BeginPlay and keeps it in Messages.
 * `after`: the node of its BeginPlay chain to go on from (the event itself if absent).
 */
export function ownMessages(b: ClassBuilder, w: ClassBuilder, at: [number, number] = [64, -420]): string {
  const v = b.variable(MESSAGES_VAR, T.object(MESSAGES_WIDGET));
  const begin = Object.values(b.graph.nodes).find((n) => n.def === 'event.beginPlay')?.id ?? b.node('event.beginPlay', {}, {}, at);
  let last = begin;
  for (;;) {
    const next = Object.values(b.graph.links).find((l) => l.from.node === last && l.from.pin === 'then');
    if (!next) break;
    last = next.to.node;
  }
  const [x, y] = [b.graph.nodes[last].x + 320, b.graph.nodes[begin].y];
  const create = b.node('widget.create', {}, { class: w.cls.id }, [x, y]);
  const set = b.node('var.set', { variable: v }, {}, [x + 340, y]);
  const show = b.node('widget.addToViewport', {}, {}, [x + 660, y]);
  // In the Player Controller, the owner is Self; elsewhere, Get Player Controller.
  const owner = b.cls.parent === 'PlayerController' ? { node: b.node('actor.self', {}, {}, [x - 60, y + 200]), pin: 'self' } : { node: b.node('player.getController', {}, {}, [x - 60, y + 200]), pin: 'result' };
  b.link(last, 'then', create, 'exec').link(owner.node, owner.pin, create, 'owner');
  b.link(create, 'then', set, 'exec').link(create, 'result', set, 'value');
  b.link(set, 'then', show, 'exec').link(b.node('var.get', { variable: v }, {}, [x + 500, y + 200]), 'value', show, 'target');
  return v;
}

/** In `b`, a call of Afficher on its Messages: returns the call node (its text pin is `pin`). */
export function afficher(p: Project, b: ClassBuilder, at: [number, number]): { call: string; pin: string } {
  const w = p.classes.find((c) => c.name === MESSAGES_WIDGET)!;
  const fn = fnOf(new ClassBuilder(w, p), 'Afficher');
  const v = b.cls.variables.find((x) => x.name === MESSAGES_VAR)!.id;
  const call = b.node('call.function', { owner: w.id, graph: fn.graph.id }, {}, at);
  b.link(b.node('var.get', { variable: v }, {}, [at[0] - 220, at[1] + 180]), 'value', call, 'target');
  return { call, pin: fn.pin.Texte };
}

/**
 * From any actor, the Messages of BP_PlayerController: Get Player Controller → Cast To BP_PlayerController →
 * Messages → Afficher. Returns the Cast (wire an exec into it) and the call (its exec out, its text pin).
 */
export function afficherViaController(p: Project, b: ClassBuilder, at: [number, number]): { first: string; call: string; pin: string } {
  const pc = p.classes.find((c) => c.name === PLAYER_CONTROLLER)!;
  const w = p.classes.find((c) => c.name === MESSAGES_WIDGET)!;
  const fn = fnOf(new ClassBuilder(w, p), 'Afficher');
  const v = pc.variables.find((x) => x.name === MESSAGES_VAR)!.id;
  const cast = b.node('cast.to', { class: pc.id }, {}, at);
  const call = b.node('call.function', { owner: w.id, graph: fn.graph.id }, {}, [at[0] + 640, at[1]]);
  b.link(b.node('player.getController', {}, {}, [at[0] - 200, at[1] + 200]), 'result', cast, 'object').link(cast, 'then', call, 'exec');
  b.link(cast, 'as', b.node('var.getExternal', { owner: pc.id, variable: v }, {}, [at[0] + 320, at[1] + 220]), 'target');
  const read = Object.values(b.graph.nodes).filter((n) => n.def === 'var.getExternal' && n.config.variable === v).at(-1)!.id;
  b.link(read, 'value', call, 'target');
  return { first: cast, call, pin: fn.pin.Texte };
}

/** What the game said, on the screen (Set Text) or in the Output Log (Print String). */
export const told = (cx: CheckContext): string[] => [...cx.prints(), ...cx.shown()];

/** How many things said contain `text` (case and accents ignored). */
export const countTold = (cx: CheckContext, text: string): number => told(cx).filter((t) => normText(t).includes(normText(text))).length;

/** Did a text reach the screen through WBP_Messages (a Set Text), not only the Output Log? */
export const onScreen = (cx: CheckContext, text: string): boolean => cx.shown().some((t) => normText(t).includes(normText(text)));
