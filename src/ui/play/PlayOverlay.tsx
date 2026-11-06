/**
 * Controls over the level during Play: time bar, joystick, action keys,
 * on-screen Print String messages and the runtime error counter.
 */
import { useEffect, useReducer, useRef } from 'preact/hooks';
import type { InputKey } from '@core/runtime/simulation';
import type { PlaySession, Speed } from '@editor/world/playSession';

interface Props {
  session: PlaySession;
  onStop: () => void;
  onShowLog: () => void;
}

const SPEEDS: Speed[] = [0.25, 1, 4];

export function PlayOverlay({ session, onStop, onShowLog }: Props) {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => session.onUi(() => force(0)), [session]);
  const sim = session.sim;

  return (
    <div class="play-overlay">
      <div class="play-bar">
        <button class="pb-btn" onClick={() => session.togglePause()} aria-label={session.running ? 'Pause' : 'Reprendre'}>
          {session.running ? '❚❚' : '▶'}
        </button>
        <button class="pb-btn" onClick={() => session.stepFrame()} aria-label="Avancer d’une frame">
          ▸|
        </button>
        {SPEEDS.map((s) => (
          <button key={s} class={`pb-btn small${session.speed === s ? ' on' : ''}`} onClick={() => session.setSpeed(s)}>
            ×{s === 0.25 ? '¼' : s}
          </button>
        ))}
        <span class="pb-time">{sim.time.toFixed(2)} s</span>
        {sim.runtimeErrors > 0 && (
          <button class="pb-err" onClick={onShowLog}>
            {sim.runtimeErrors} erreur{sim.runtimeErrors > 1 ? 's' : ''}
          </button>
        )}
        <button class="pb-btn stop" onClick={onStop} aria-label="Arrêter">
          ■ Stop
        </button>
      </div>

      <div class="screen-msgs" aria-live="polite">
        {sim.screen.map((m) => (
          <div key={m.id} class="screen-msg">
            {m.text}
          </div>
        ))}
      </div>

      <Joystick onMove={(x, y) => (sim.move = { x, y })} />

      <div class="keys">
        <Key label="E" k="E" session={session} />
        <Key label="F" k="F" session={session} />
        <Key label="Espace" k="SpaceBar" session={session} wide />
      </div>
    </div>
  );
}

function Key({ label, k, session, wide }: { label: string; k: InputKey; session: PlaySession; wide?: boolean }) {
  return (
    <button
      class={`key${wide ? ' wide' : ''}`}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        (e.currentTarget as HTMLElement).classList.add('down');
        session.sim.pressKey(k);
      }}
      onPointerUp={(e) => {
        (e.currentTarget as HTMLElement).classList.remove('down');
        session.sim.releaseKey(k);
      }}
      onPointerCancel={(e) => {
        (e.currentTarget as HTMLElement).classList.remove('down');
        session.sim.releaseKey(k);
      }}
    >
      {label}
    </button>
  );
}

const PAD_R = 56;

/** A virtual stick: drag from the centre, direction and strength in [-1, 1]. */
function Joystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const knob = useRef<HTMLDivElement>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const set = (dx: number, dy: number) => {
    const d = Math.hypot(dx, dy);
    const k = d > PAD_R ? PAD_R / d : 1;
    const x = dx * k,
      y = dy * k;
    if (knob.current) knob.current.style.transform = `translate(${x}px, ${y}px)`;
    onMove(x / PAD_R, y / PAD_R);
  };
  return (
    <div
      class="joystick"
      onPointerDown={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.setPointerCapture(e.pointerId);
        const r = el.getBoundingClientRect();
        origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        set(e.clientX - origin.current.x, e.clientY - origin.current.y);
      }}
      onPointerMove={(e) => {
        if (origin.current) set(e.clientX - origin.current.x, e.clientY - origin.current.y);
      }}
      onPointerUp={() => {
        origin.current = null;
        set(0, 0);
      }}
      onPointerCancel={() => {
        origin.current = null;
        set(0, 0);
      }}
    >
      <div class="knob" ref={knob} />
    </div>
  );
}
