/**
 * Enhanced Input assets in Details: an Input Action (its name and value
 * type), and an Input Mapping Context (its lines: action, key, trigger).
 */
import type { InputTrigger, InputTriggerKind, KeyName } from '@core/model/project';
import { KEY_NAMES } from '@core/model/project';
import {
  addMapping,
  findInputAction,
  findMappingContext,
  inputActionUsage,
  mappingContextUsage,
  removeInputAction,
  removeMapping,
  removeMappingContext,
  renameInputAction,
  renameMappingContext,
  setMapping,
} from '@core/operations/inputOps';
import { useStore } from '../hooks';
import { NameField } from '../widgets/NameField';
import { AppHelp, Check, Field, Group, NumberField } from './fields';

const KEY_LABEL: Record<KeyName, string> = { E: 'E', F: 'F', SpaceBar: 'Space Bar' };
const TRIGGERS: { value: InputTriggerKind | ''; label: string }[] = [
  { value: '', label: 'Aucun (Down implicite)' },
  { value: 'Down', label: 'Down' },
  { value: 'Pressed', label: 'Pressed' },
  { value: 'Released', label: 'Released' },
  { value: 'Hold', label: 'Hold' },
];

function useWarn() {
  const store = useStore();
  return (r: { ok: boolean; reason?: string }) => {
    if (!r.ok && r.reason) store.warn(r.reason);
  };
}

export function InputActionDetails({ id }: { id: string }) {
  const store = useStore();
  const warn = useWarn();
  const a = findInputAction(store.project, id);
  if (!a) return null;
  const used = inputActionUsage(store.project, id);
  return (
    <>
      <Group title="Input Action">
        <Field label="Nom">
          <NameField value={a.name} onCommit={(name) => store.applyProject('Renommer l’Input Action', (p) => renameInputAction(p, id, name))} />
        </Field>
        <Field label="Value Type">
          <span class="muted">Digital (bool)</span>
        </Field>
      </Group>
      <Group title="Utilisation" app>
        <p class="muted small">
          {used.nodes} événement(s) dans les Blueprints · {used.mappings} ligne(s) de Mapping Context.
        </p>
        <button
          class="btn danger"
          onClick={() => {
            const res = store.applyProject('Supprimer l’Input Action', (p) => removeInputAction(p, id));
            warn(res);
            if (res.ok) store.setFocus({ kind: 'none' });
          }}
        >
          Supprimer l’Input Action
        </button>
      </Group>
      <AppHelp>
        <p>
          Une Input Action dit ce que le joueur peut faire (interagir, sauter), sans dire avec quelle touche : c’est le rôle d’un Input Mapping Context.
          Dans un Blueprint, l’événement {a.name} (palette › Input › Enhanced Action Events) se déclenche quand une touche associée est utilisée.
        </p>
      </AppHelp>
    </>
  );
}

function triggerOf(t: InputTrigger | undefined): InputTriggerKind | '' {
  return t?.kind ?? '';
}

export function MappingContextDetails({ id }: { id: string }) {
  const store = useStore();
  const warn = useWarn();
  const c = findMappingContext(store.project, id);
  if (!c) return null;
  const actions = store.project.inputActions ?? [];
  const change = (index: number, label: string, apply: Parameters<typeof setMapping>[3]) => warn(store.applyProject(label, (p) => setMapping(p, id, index, apply)));
  return (
    <>
      <Group title="Input Mapping Context">
        <Field label="Nom">
          <NameField value={c.name} onCommit={(name) => store.applyProject('Renommer le Mapping Context', (p) => renameMappingContext(p, id, name))} />
        </Field>
      </Group>
      <Group title="Mappings">
        {c.mappings.length === 0 && <p class="muted small">Aucune ligne.</p>}
        {c.mappings.map((m, i) => {
          const t = m.triggers[0];
          return (
            <div class="mapping-row" key={i}>
              <select class="field" value={m.action} onChange={(e) => change(i, 'Changer l’action', { action: (e.target as HTMLSelectElement).value })}>
                {actions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <select class="field" value={m.key} onChange={(e) => change(i, 'Changer la touche', { key: (e.target as HTMLSelectElement).value as KeyName })}>
                {KEY_NAMES.map((k) => (
                  <option key={k} value={k}>
                    {KEY_LABEL[k]}
                  </option>
                ))}
              </select>
              <select
                class="field"
                aria-label="Déclencheur"
                value={triggerOf(t)}
                onChange={(e) => {
                  const kind = (e.target as HTMLSelectElement).value as InputTriggerKind | '';
                  change(i, 'Changer le déclencheur', { triggers: kind ? [kind === 'Hold' ? { kind, holdTime: 1, oneShot: true } : { kind }] : [] });
                }}
              >
                {TRIGGERS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {t?.kind === 'Hold' && (
                <>
                  <Field label="Hold Time Threshold">
                    <NumberField value={t.holdTime ?? 1} unit="s" onCommit={(n) => change(i, 'Durée du Hold', { triggers: [{ ...t, holdTime: Math.max(0.05, n) }] })} />
                  </Field>
                  <Field label="Is One Shot">
                    <Check checked={!!t.oneShot} onChange={(v) => change(i, 'Hold une seule fois', { triggers: [{ ...t, oneShot: v }] })} />
                  </Field>
                </>
              )}
              <button class="chip danger" aria-label="Supprimer la ligne" onClick={() => warn(store.applyProject('Supprimer une ligne', (p) => removeMapping(p, id, i)))}>
                ✕
              </button>
            </div>
          );
        })}
        <button class="btn" onClick={() => warn(store.applyProject('Ajouter une ligne', (p) => addMapping(p, id)))}>
          + Mapping
        </button>
      </Group>
      <Group title="Utilisation" app>
        <p class="muted small">{mappingContextUsage(store.project, id)} nœud(s) Add / Remove Mapping Context.</p>
        <button
          class="btn danger"
          onClick={() => {
            const res = store.applyProject('Supprimer le Mapping Context', (p) => removeMappingContext(p, id));
            warn(res);
            if (res.ok) store.setFocus({ kind: 'none' });
          }}
        >
          Supprimer le Mapping Context
        </button>
      </Group>
      <AppHelp>
        <p>
          Chaque ligne relie une touche à une Input Action, avec un déclencheur. Le contexte n’agit qu’une fois ajouté pendant le jeu par{' '}
          <strong>Add Mapping Context</strong>, en général au BeginPlay du joueur.
        </p>
        <p>
          Déclencheurs : aucun = Down, l’action a lieu à chaque image tant que la touche est enfoncée. Pressed : une fois à l’appui. Released : au relâchement.
          Hold : après avoir tenu la touche le temps indiqué (Ongoing avant, Canceled si relâchée trop tôt).
        </p>
      </AppHelp>
    </>
  );
}
