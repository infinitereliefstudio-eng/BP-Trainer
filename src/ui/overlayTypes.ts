/** The modal layers App can show above the editor, as plain data. */
import type { PinSpec } from '@core/nodes/definition';
import type { PaletteRequest } from '@editor/GraphCanvas';

export interface MenuItem {
  label: string;
  hint?: string;
  danger?: boolean;
  disabled?: boolean;
  action?: () => void;
}

export type Overlay =
  | { kind: 'palette'; req: PaletteRequest }
  | { kind: 'menu'; sx: number; sy: number; title?: string; items: MenuItem[] }
  | { kind: 'value'; nodeId: string; spec: PinSpec }
  | {
      kind: 'prompt';
      title: string;
      initial: string;
      confirmLabel?: string;
      /** Return an error message to keep the dialog open, or null to close. */
      onSubmit: (value: string) => string | null;
    }
  | { kind: 'confirm'; title: string; text: string; confirmLabel: string; onConfirm: () => void }
  | { kind: 'content' }
  | { kind: 'about' }
  | { kind: 'lesson' }
  /** Construction advice on the whole project. */
  | { kind: 'advice' }
  /** The track editor of a Timeline node of the open graph. */
  | { kind: 'timeline'; nodeId: string };

export type OpenOverlay = (o: Overlay | null) => void;
