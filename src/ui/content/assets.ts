/**
 * The assets of the project as the Content Drawer shows them: one entry per
 * asset, with UE's type label and the colour of its thumbnail stripe, and
 * what opening or deleting it does.
 */
import { removeDataTable } from '@core/operations/dataTableOps';
import { removeEnum } from '@core/operations/enumOps';
import { removeInputAction, removeMappingContext } from '@core/operations/inputOps';
import { removeClass, removeInterface } from '@core/operations/projectOps';
import { removeStruct } from '@core/operations/structOps';
import type { OpResult } from '@core/operations/graphOps';
import type { Project } from '@core/model/project';
import type { Focus } from '@core/store/editorStore';

export type AssetKind = 'blueprint' | 'interface' | 'enum' | 'struct' | 'dataTable' | 'inputAction' | 'mappingContext';

export interface Asset {
  kind: AssetKind;
  id: string;
  name: string;
  /** UE's label under the thumbnail. */
  type: string;
  /** For a Blueprint: its parent, as UE shows it in the tooltip. */
  parent?: string;
  /** Can be placed in the level (an Actor or Pawn Blueprint). */
  placeable?: boolean;
}

/** Thumbnail glyph and stripe colour, by kind (close to UE's asset colours). */
export const ASSET_STYLE: Record<AssetKind, { glyph: string; color: string }> = {
  blueprint: { glyph: '◆', color: '#3c8ce7' },
  interface: { glyph: '◇', color: '#7f77dd' },
  enum: { glyph: '☰', color: '#ba7517' },
  struct: { glyph: '▦', color: '#1d9e75' },
  dataTable: { glyph: '▤', color: '#639922' },
  inputAction: { glyph: '⏻', color: '#d85a30' },
  mappingContext: { glyph: '⌨', color: '#d4537e' },
};

export function projectAssets(p: Project): Asset[] {
  const parentName = (id?: string) => p.classes.find((c) => c.id === id)?.name;
  const out: Asset[] = [
    ...p.classes.map((c) => ({
      kind: 'blueprint' as const,
      id: c.id,
      name: c.name,
      type: 'Blueprint Class',
      parent: parentName(c.parentClassId) ?? c.parent,
      placeable: c.parent !== 'SaveGame',
    })),
    ...p.interfaces.map((i) => ({ kind: 'interface' as const, id: i.id, name: i.name, type: 'Blueprint Interface' })),
    ...p.enums.map((e) => ({ kind: 'enum' as const, id: e.id, name: e.name, type: 'Enumeration' })),
    ...(p.structs ?? []).map((s) => ({ kind: 'struct' as const, id: s.id, name: s.name, type: 'Structure' })),
    ...(p.dataTables ?? []).map((t) => ({ kind: 'dataTable' as const, id: t.id, name: t.name, type: 'Data Table' })),
    ...(p.inputActions ?? []).map((a) => ({ kind: 'inputAction' as const, id: a.id, name: a.name, type: 'Input Action' })),
    ...(p.mappingContexts ?? []).map((c) => ({ kind: 'mappingContext' as const, id: c.id, name: c.name, type: 'Input Mapping Context' })),
  ];
  return out.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
}

/** The Details shown when a non-Blueprint asset is opened. */
export function assetFocus(a: Asset): Focus | undefined {
  if (a.kind === 'blueprint') return undefined;
  return { kind: a.kind, id: a.id } as Focus;
}

export function removeAsset(p: Project, a: Asset): OpResult {
  switch (a.kind) {
    case 'blueprint':
      return removeClass(p, a.id);
    case 'interface': {
      const used = p.classes.filter((c) => c.interfaces.includes(a.id)).length;
      if (used) return { ok: false, reason: `${a.name} est implémentée par ${used} Blueprint(s) : retire-la d’abord de leurs Class Settings.` };
      removeInterface(p, a.id);
      return { ok: true, value: undefined };
    }
    case 'enum':
      return removeEnum(p, a.id);
    case 'struct':
      return removeStruct(p, a.id);
    case 'dataTable':
      return removeDataTable(p, a.id);
    case 'inputAction':
      return removeInputAction(p, a.id);
    case 'mappingContext':
      return removeMappingContext(p, a.id);
  }
}
