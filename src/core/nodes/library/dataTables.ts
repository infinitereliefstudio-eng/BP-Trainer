/**
 * Data Table nodes. The table is chosen in Details (`config.table`, a table
 * id), as UE's Data Table pin offers a dropdown of assets; the palette lists
 * the nodes once per table. Out Row has the type of the table's structure.
 */
import type { NodeInstance } from '../../model/project';
import { findDataTable } from '../../operations/dataTableOps';
import { T } from '../../types/pins';
import { dataIn, dataOut, execIn, execOut, type NodeContext, type NodeDefinition } from '../definition';

export const tableOf = (ctx: NodeContext, n: NodeInstance) => (ctx.project ? findDataTable(ctx.project, n.config.table) : undefined);
const tableName = (ctx: NodeContext, n: NodeInstance) => tableOf(ctx, n)?.name ?? 'None';
const TABLE = [{ key: 'table', label: 'Data Table', kind: 'choice' as const, choicesFrom: 'dataTables' as const }];

export const dataTableNodes: NodeDefinition[] = [
  {
    id: 'dataTable.getRow',
    title: (n, ctx) => `Get Data Table Row (${tableName(ctx, n)})`,
    category: 'Utilities|Data Table',
    kind: 'function',
    hiddenFromPalette: true,
    description:
      'Cherche la ligne Row Name dans la Data Table choisie (Details). Trouvée : sortie Row Found, et Out Row la donne. Absente : sortie Row Not Found, sans erreur, et Out Row ne vaut rien d’utile.',
    config: TABLE,
    pins: (n, ctx) => {
      const t = tableOf(ctx, n);
      return [
        execIn(),
        dataIn('rowName', 'Row Name', T.name, { default: '' }),
        execOut('found', 'Row Found'),
        execOut('notFound', 'Row Not Found'),
        dataOut('row', 'Out Row', T.struct(t?.struct ?? 'None')),
      ];
    },
  },
  {
    id: 'dataTable.getRowNames',
    title: (n, ctx) => `Get Data Table Row Names (${tableName(ctx, n)})`,
    category: 'Utilities|Data Table',
    kind: 'pure',
    hiddenFromPalette: true,
    description: 'Tous les Row Names de la Data Table, dans l’ordre de ses lignes.',
    config: TABLE,
    pins: [dataOut('names', 'Out Row Names', T.array(T.name))],
  },
  {
    id: 'dataTable.rowExists',
    title: (n, ctx) => `Does Data Table Row Exist (${tableName(ctx, n)})`,
    category: 'Utilities|Data Table',
    kind: 'pure',
    hiddenFromPalette: true,
    description: 'Vrai si la Data Table a une ligne de ce nom (la casse est ignorée, comme pour tout Name).',
    config: TABLE,
    pins: [dataIn('rowName', 'Row Name', T.name, { default: '' }), dataOut('result', 'Return Value', T.bool)],
  },
];
