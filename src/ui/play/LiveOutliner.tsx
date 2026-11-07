/**
 * The World Outliner during Play: the live actors (spawned ones appear,
 * destroyed ones go), and for the picked one its live Details — location,
 * Hidden In Game, components, timers and variables, all editable.
 * Changes apply to the running game only, never to the project.
 */
import { useEffect, useReducer } from 'preact/hooks';
import { findClass, type Variable } from '@core/model/project';
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

export function LiveOutliner({ session }: Props) {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => session.onUi(() => force(0)), [session]);
  const sim = session.sim;
  const actors = [...sim.actors.filter((a) => !a.destroyed), sim.player];
  const picked = actors.find((a) => a.id === session.selected);

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
      </div>
    );
  }
  return <LiveDetails session={session} actor={picked} />;
}

function LiveDetails({ session, actor }: { session: PlaySession; actor: ActorRT }) {
  const sim = session.sim;
  const cls = actor.classId ? findClass(sim.project, actor.classId) : undefined;
  const timers = [...sim.timers.values()].filter((t) => t.actor === actor.id);
  const show = (v: RValue, t: PinType): string => {
    if (Array.isArray(v)) return `[${v.length}] ${v.map((x) => show(x, { ...t, container: undefined })).join(', ')}`;
    if (isRef(v)) return sim.displayName(v);
    if (t.category === 'class') return (typeof v === 'string' && findClass(sim.project, v)?.name) || 'None';
    return formatValue(v as Value, t, sim.project);
  };
  const setVar = (v: Variable, value: Value) => {
    actor.vars[v.id] = value as RValue;
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
          <NumberField value={Math.round(actor.x)} unit="cm" onCommit={(x) => ((actor.x = x), session.notifyUi())} />
        </Field>
        <Field label="Location Y">
          <NumberField value={Math.round(actor.y)} unit="cm" onCommit={(y) => ((actor.y = y), session.notifyUi())} />
        </Field>
        <Field label="Rotation Yaw">
          <NumberField value={Math.round(actor.yaw)} unit="°" onCommit={(yaw) => ((actor.yaw = yaw), session.notifyUi())} />
        </Field>
        <Field label="Hidden In Game">
          <Check checked={actor.hidden} onChange={(h) => ((actor.hidden = h), session.notifyUi())} />
        </Field>
      </Group>
      {cls && cls.variables.length > 0 && (
        <Group title="Variables (en direct)">
          {cls.variables.map((v) =>
            editable(v.type) ? (
              <Field key={v.id} label={v.name}>
                <ValueInput type={v.type} value={actor.vars[v.id] as Value} onChange={(val) => setVar(v, val)} />
              </Field>
            ) : (
              <Field key={v.id} label={v.name}>
                <span class="dbg-val" title={typeLabel(v.type)}>
                  {show(actor.vars[v.id] ?? null, v.type)}
                </span>
              </Field>
            ),
          )}
        </Group>
      )}
      {actor.components.length > 1 && (
        <Group title="Composants">
          {actor.components
            .filter((c) => c.kind !== 'Scene')
            .map((c) => (
              <Field key={c.id} label={`${c.name} · Visible`}>
                <Check checked={c.props.visible} onChange={(on) => ((c.props.visible = on), session.notifyUi())} />
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
