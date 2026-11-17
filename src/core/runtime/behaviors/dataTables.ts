/** Data Table nodes: rows found by Row Name (a Name: case ignored), Out Row a full copy. */
import { findDataTable } from '../../operations/dataTableOps';
import { findStruct, fullStruct } from '../../types/structs';
import type { RValue } from '../world';
import type { Behavior, ValueCx } from './types';

function table(cx: ValueCx) {
  return findDataTable(cx.world.project, cx.node.config.table);
}

function row(cx: ValueCx) {
  const name = cx.str('rowName').toLowerCase();
  return table(cx)?.rows.find((r) => r.name.toLowerCase() === name);
}

export const dataTableBehaviors: Record<string, Behavior> = {
  'dataTable.getRow': {
    exec: (cx) => {
      const t = table(cx);
      if (!t) {
        cx.world.runtimeError('Get Data Table Row : aucune Data Table choisie (Details).');
        cx.out('row', {});
        return ['notFound'];
      }
      const found = row(cx);
      const s = findStruct(cx.world.project, t.struct);
      // Not found: Out Row is left at the structure's default values here; in UE do not read it at all.
      cx.out('row', (found && s ? fullStruct(found.value, s) : s ? fullStruct({}, s) : {}) as RValue);
      return [found ? 'found' : 'notFound'];
    },
  },
  'dataTable.getRowNames': {
    pure: (cx) => ({ names: (table(cx)?.rows ?? []).map((r) => r.name) }),
  },
  'dataTable.rowExists': {
    pure: (cx) => ({ result: !!row(cx) }),
  },
};
