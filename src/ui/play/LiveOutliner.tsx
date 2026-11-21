/**
 * The World Outliner during Play: the live actors (spawned ones appear,
 * destroyed ones go), and for the picked one its live Details — location,
 * Hidden In Game, components, timers and variables, all editable.
 * Changes apply to the running game only, never to the project.
 */
import { useEffect, useReducer } from 'preact/hooks';
import { findClass, type Variable } from '@core/model/project';
import { bindableProps } from '@core/model/widgets';
import type { ActorRT, RValue } from '@core/runtime/world';
import { isRef } from '@core/runtime/world';
import { typeLabel, type PinType } from '@core/types/pins';
import { formatValue, type Value } from '@core/types/values';
import type { PlaySession } from '@editor/world/playSession';
import { Check, Field, Group, NumberField } from '../panels/fields';
import { ValueInput } from '../widgets/ValueInput';

interface Props {
  session: PlaySession;
}

/** Types whose value can be typed in while playing. */
function editable(t: PinType): boolean {
  if (t.container) return false;
  if (t.category === 'struct') return t.subtype === 'LinearColor';
  return ['bool', 'int', 'float', 'string', 'enum', 'vector', 'rotator'].includes(t.category);
}

/** The variables of a running actor (or of one of its Actor Components), editable when they can be typed in. */
function LiveVariables({ session, obj, title }: { session: PlaySession; obj: ActorRT; title: string }) {
  const sim = session.sim;
  const cls = sim.classOf(obj);
  const show = (v: RValue, t: PinType): string => {
    if (Array.isArray(v)) return `[${v.length}] ${v.map((x) => show(x, { ...t, container: undefined })).join(', ')}`;
    if (isRef(v)) return sim.displayName(v);
    if (t.category === 'class') return (typeof v === 'string' && findClass(sim.project, v)?.name) || 'None';
    return formatValue(v as Value, t, sim.project);
  };
  const setVar = (v: Variable, value: Value) => {
    obj.vars[v.id] = value as RValue;
    session.notifyUi();
  };
  if (!cls?.variables.length) return null;
  return (
    <Group title={title}>
      {cls.variables.map((v) =>
        editable(v.type) ? (
          <Field key={v.id} label={v.name}>
            <ValueInput type={v.type} value={obj.vars[v.id] as Value} onChange={(val) => setVar(v, val)} />
          </Field>
        ) : (
          <Field key={v.id} label={v.name}>
            <span class="dbg-val" title={typeLabel(v.type)}>
              {show(obj.vars[v.id] ?? null, v.type)}
            </span>
          </Field>
        ),
      )}
    </Group>
  );
}

export function LiveOutliner({ session }: Props) {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => session.onUi(() => force(0)), [session]);
  const sim = session.sim;
  // The GameMode is an actor the level spawns: listed when it is a Blueprint (its variables can then be read).
  const actors = [...sim.actors.filter((a) => !a.destroyed), ...(sim.gameMode.classId ? [sim.gameMode] : []), sim.player];
  // Widget objects are not actors: UE lists them in its Widget Reflector, here under the actors.
  const widgets = sim.umg.widgetObjects().filter((o) => !o.widget!.placedIn);
  // The GameInstance is no actor either: one object for the whole game, kept through Open Level.
  const gi = session.game.gameInstance;
  const picked = [...actors, ...widgets, gi].find((a) => a.id === session.selected);

  if (!picked) {
    return (
      <div class="outliner">
        <p class="hint">Les acteurs de la partie en cours. Touche-en un (ici ou dans le niveau) pour voir et modifier ses valeurs en direct.</p>
        {actors.map((a) => (
          <button key={a.id} class="mb-main outliner-row" onClick={() => session.select(a.id)}>
            <span class="mb-label">{a.label}</span>
            <span class="mb-sub">{a.className}</span>
          </button>
        ))}
        <div class="dbg-sub">Toute la partie</div>
        <button class="mb-main outliner-row" onClick={() => session.select(gi.id)}>
          <span class="mb-label">{gi.objectName}</span>
          <span class="mb-sub">{gi.classId ? gi.className : 'GameInstance (aucune Game Instance Class)'}</span>
        </button>
        {widgets.length > 0 && <div class="dbg-sub">Widgets (UMG)</div>}
        {widgets.map((o) => (
          <button key={o.id} class="mb-main outliner-row" onClick={() => session.select(o.id)}>
            <span class="mb-label">{o.objectName}</span>
            <span class="mb-sub">{widgetWhere(sim, o)}</span>
          </button>
        ))}
      </div>
    );
  }
  if (picked.widget) return <LiveWidget session={session} obj={picked} />;
  if (picked.id === gi.id) return <LiveGameInstance session={session} obj={gi} />;
  return <LiveDetails session={session} actor={picked} />;
}

/** The GameInstance during Play: its variables, the same in every level of the game. */
function LiveGameInstance({ session, obj }: { session: PlaySession; obj: ActorRT }) {
  return (
    <div class="outliner">
      <div class="row-buttons flush outliner-back">
        <button class="btn" onClick={() => session.select(undefined)}>
          ‹ Outliner
        </button>
        <strong>{obj.objectName}</strong>
        <span class="muted small">{obj.className}</span>
      </div>
      <Group title="GameInstance">
        <Field label="Niveaux joués">
          <span class="dbg-val">{session.game.visited.join(' → ')}</span>
        </Field>
      </Group>
      {obj.classId ? (
        <LiveVariables session={session} obj={obj} title="Variables (en direct)" />
      ) : (
        <p class="hint">Aucune Game Instance Class dans Project Settings › Maps & Modes : le jeu a créé un GameInstance ordinaire, sans variables.</p>
      )}
      <p class="hint">Le même objet de Play à Stop : Open Level change de niveau, pas de GameInstance. Ces modifications ne valent que pour cette partie.</p>
    </div>
  );
}

/** Where a widget object is: on the screen (viewport, or in a panel) or only created. */
export function widgetWhere(sim: PlaySession['sim'], o: ActorRT): string {
  const w = o.widget;
  if (!w) return '';
  if (w.inViewport) return `à l’écran · Z-Order ${w.zOrder}`;
  if (w.parent) return `dans ${sim.objectById(w.parent.obj)?.objectName ?? '?'}${w.onScreen ? ' · à l’écran' : ''}`;
  if (w.placedIn) return `placé dans ${sim.objectById(w.placedIn.obj)?.objectName ?? '?'}`;
  return 'créé, pas à l’écran';
}

/** A widget object during Play: where it is, its variables and its Bindings. */
function LiveWidget({ session, obj }: { session: PlaySession; obj: ActorRT }) {
  const sim = session.sim;
  return (
    <div class="outliner">
      <div class="row-buttons flush outliner-back">
        <button class="btn" onClick={() => session.select(undefined)}>
          ‹ Outliner
        </button>
        <strong>{obj.objectName}</strong>
        <span class="muted small">{obj.className}</span>
      </div>
      <Group title="Widget">
        <Field label="Où">
          <span class="dbg-val">{widgetWhere(sim, obj)}</span>
        </Field>
        <Field label="Owning Player">
          <span class="dbg-val">{obj.widget!.owner ? 'PlayerController' : 'None'}</span>
        </Field>
      </Group>
      <BindingsGroup sim={sim} obj={obj} />
      <LiveVariables session={session} obj={obj} title="Variables (en direct)" />
      <p class="hint">Ces modifications ne valent que pour cette partie : Stop rend au projet ses valeurs.</p>
    </div>
  );
}

/** Each Binding of a widget object: its function, how many times Slate called it, or the Set that stopped it. */
export function BindingsGroup({ sim, obj }: { sim: PlaySession['sim']; obj: ActorRT }) {
  const cls = sim.classOf(obj);
  const rows = (cls?.widgets ?? []).flatMap((w) =>
    bindableProps(w.kind)
      .filter((b) => w.bindings?.[b.prop])
      .map((b) => {
        const fn = cls!.graphs.find((g) => g.id === w.bindings![b.prop]);
        const calls = sim.umg.bindingCalls[`${obj.id}:${w.id}:${b.prop}`] ?? 0;
        const broken = obj.widget!.broken[`${w.id}:${b.prop}`];
        return { key: `${w.id}:${b.prop}`, label: `${w.name} · ${b.label}`, text: `${fn?.name ?? '?'} · ${broken ? 'arrêtée par un Set' : `${calls} appel${calls > 1 ? 's' : ''}`}` };
      }),
  );
  if (!rows.length) return null;
  return (
    <Group title="Bindings">
      {rows.map((r) => (
        <Field key={r.key} label={r.label}>
          <span class="dbg-val">{r.text}</span>
        </Field>
      ))}
    </Group>
  );
}

function LiveDetails({ session, actor }: { session: PlaySession; actor: ActorRT }) {
  const sim = session.sim;
  const cls = actor.classId ? sim.classOf(actor) : undefined;
  const timers = [...sim.timers.values()].filter((t) => t.actor === actor.id);
  /** Change the running actor, then refresh the panels. */
  const live = (change: () => void) => {
    change();
    session.notifyUi();
  };

  return (
    <div class="outliner">
      <div class="row-buttons flush outliner-back">
        <button class="btn" onClick={() => session.select(undefined)}>
          ‹ Outliner
        </button>
        <strong>{actor.label}</strong>
        <span class="muted small">{actor.className}</span>
      </div>
      <Group title="Transform">
        <Field label="Location X">
          <NumberField value={Math.round(actor.x)} unit="cm" onCommit={(x) => live(() => { actor.x = x; })} />
        </Field>
        <Field label="Location Y">
          <NumberField value={Math.round(actor.y)} unit="cm" onCommit={(y) => live(() => { actor.y = y; })} />
        </Field>
        <Field label="Rotation Yaw">
          <NumberField value={Math.round(actor.yaw)} unit="°" onCommit={(yaw) => live(() => { actor.yaw = yaw; })} />
        </Field>
        <Field label="Hidden In Game">
          <Check checked={actor.hidden} onChange={(h) => live(() => { actor.hidden = h; })} />
        </Field>
      </Group>
      {cls && cls.variables.length > 0 && <LiveVariables session={session} obj={actor} title="Variables (en direct)" />}
      {/* Its Actor Components: each copy with its own variables. */}
      {sim.componentsOf(actor).map((o) => (
        <LiveVariables key={o.id} session={session} obj={o} title={`${o.objectName.split('.').pop()} (${o.className})`} />
      ))}
      {actor.components.length > 1 && (
        <Group title="Composants">
          {actor.components
            .filter((c) => c.kind !== 'Scene')
            .map((c) => (
              <Field key={c.id} label={`${c.name} · Visible`}>
                <Check checked={c.props.visible} onChange={(on) => live(() => { c.props.visible = on; })} />
              </Field>
            ))}
        </Group>
      )}
      {timers.length > 0 && (
        <Group title="Timers">
          {timers.map((t) => (
            <Field key={t.id} label={`Timer ${t.id}${t.looping ? ' (Looping)' : ''}`}>
              <span class="dbg-val">{t.paused ? 'en pause' : `${Math.max(0, t.remaining).toFixed(2)} s avant le prochain appel`}</span>
            </Field>
          ))}
        </Group>
      )}
      <p class="hint">Ces modifications ne valent que pour cette partie : Stop rend au projet ses valeurs.</p>
    </div>
  );
}
