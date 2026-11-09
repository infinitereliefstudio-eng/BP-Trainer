/** Modal dialogs: value editor, text prompt, confirmation, about. */
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { PinSpec } from '@core/nodes/definition';
import { pinValue } from '@core/nodes/registry';
import { setPinDefault } from '@core/operations/graphOps';
import { typeLabel } from '@core/types/pins';
import type { Value } from '@core/types/values';
import { useStore } from '../hooks';
import { ValueInput } from '../widgets/ValueInput';
import { useOwnTap } from '../widgets/useOwnTap';

function Dialog({ title, children, onClose }: { title: string; children: ComponentChildren; onClose: () => void }) {
  const tap = useOwnTap();
  return (
    <div class="sheet-backdrop" {...tap.root} onClick={tap.guard(onClose)}>
      <div class="dialog" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function ValueDialog({ nodeId, spec, onClose }: { nodeId: string; spec: PinSpec; onClose: () => void }) {
  const store = useStore();
  const node = store.graph.nodes[nodeId];
  const [draft, setDraft] = useState<Value>(node ? pinValue(node, spec) : null);
  if (!node) return null;
  const save = () => {
    store.apply('Modifier une valeur', (_c, g) => setPinDefault(g, nodeId, spec.id, draft));
    onClose();
  };
  return (
    <Dialog title={`${spec.name || 'Valeur'} · ${typeLabel(spec.type)}`} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <ValueInput type={spec.type} value={draft} onChange={setDraft} autoFocus />
        <div class="dialog-actions">
          <button type="button" class="btn" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" class="btn primary">
            OK
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function PromptDialog(props: {
  title: string;
  initial: string;
  confirmLabel?: string;
  onSubmit: (v: string) => string | null;
  onClose: () => void;
}) {
  const [value, setValue] = useState(props.initial);
  const [error, setError] = useState<string | null>(null);
  return (
    <Dialog title={props.title} onClose={props.onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const err = props.onSubmit(value);
          if (err) setError(err);
          else props.onClose();
        }}
      >
        <input class="field" type="text" value={value} autoFocus onInput={(e) => setValue((e.target as HTMLInputElement).value)} />
        {error && <p class="error-text">{error}</p>}
        <div class="dialog-actions">
          <button type="button" class="btn" onClick={props.onClose}>
            Annuler
          </button>
          <button type="submit" class="btn primary">
            {props.confirmLabel ?? 'OK'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function ConfirmDialog(props: { title: string; text: string; confirmLabel: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Dialog title={props.title} onClose={props.onClose}>
      <p>{props.text}</p>
      <div class="dialog-actions">
        <button class="btn" onClick={props.onClose}>
          Annuler
        </button>
        <button
          class="btn danger"
          onClick={() => {
            props.onClose();
            props.onConfirm();
          }}
        >
          {props.confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}

export function AboutDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog title="BP Trainer — étape 3" onClose={onClose}>
      <p>Créer des Blueprints, les faire communiquer, les lancer avec Play et les déboguer, au doigt.</p>
      <ul class="about-list">
        <li>Appui long sur le vide : palette des nœuds.</li>
        <li>Tirer depuis une pin : un fil. Relâcher dans le vide : palette filtrée.</li>
        <li>Toucher une pin puis une autre : relier sans glisser.</li>
        <li>Appui long sur un nœud, une pin ou un fil : options.</li>
        <li>Deux doigts : zoom et déplacement.</li>
        <li>Appui long sur un nœud › Ajouter un breakpoint : Play s’arrête juste avant lui.</li>
      </ul>
      <div class="dialog-actions">
        <button class="btn primary" onClick={onClose}>
          Compris
        </button>
      </div>
    </Dialog>
  );
}
