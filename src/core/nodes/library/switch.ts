/**
 * Switch nodes (one exec output per case, plus Default) and Select (pick a
 * value by index). Switch on Enum and Select take their cases from a type.
 */
import type { NodeInstance } from '../../model/project';
import { enumEntries } from '../../types/enums';
import { T } from '../../types/pins';
import { adoptedBy, decodeType } from '../../types/wildcard';
import { dataIn, dataOut, execIn, execOut, type NodeDefinition, type PinSpec } from '../definition';

const CAT = 'Utilities|Flow Control';
export const MAX_CASES = 16;

/** Case names of a Switch on String, from its comma-separated setting. */
export function stringCases(raw: unknown): string[] {
  return String(raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s, i, all) => s && all.indexOf(s) === i)
    .slice(0, MAX_CASES);
}

/** Labels of Select's options, from the type its Index pin adopted. */
export function selectOptions(n: Pick<NodeInstance, 'config' | 'wild'>, project?: Parameters<typeof enumEntries>[1]): string[] {
  const wild = adoptedBy(n, 'index');
  const t = wild ? decodeType(wild) : undefined;
  if (t?.category === 'bool') return ['False', 'True'];
  if (t?.category === 'enum') return enumEntries(t.subtype, project) ?? [];
  const count = Math.max(1, Math.min(MAX_CASES, Number(n.config.options ?? 2)));
  return Array.from({ length: count }, (_, i) => `Option ${i}`);
}

export const switchNodes: NodeDefinition[] = [
  {
    id: 'flow.switchInt',
    title: 'Switch on Int',
    category: CAT,
    kind: 'flow',
    description:
      "Choisit une sortie selon un entier : la sortie qui porte la valeur de Selection, ou Default si aucune ne correspond. Réglages : première valeur et nombre de cas.",
    keywords: ['switch', 'case', 'selon', 'entier', 'int'],
    config: [
      { key: 'start', label: 'Start Index', kind: 'int', min: -1000, max: 1000 },
      { key: 'cases', label: 'Nombre de cas', kind: 'int', min: 1, max: MAX_CASES },
    ],
    defaultConfig: { start: 0, cases: 2 },
    pins: (n) => {
      const start = Math.trunc(Number(n.config.start ?? 0));
      const count = Math.max(1, Math.min(MAX_CASES, Number(n.config.cases ?? 2)));
      const outs: PinSpec[] = [];
      for (let i = 0; i < count; i++) outs.push(execOut(`case${start + i}`, String(start + i)));
      return [execIn(), dataIn('selection', 'Selection', T.int, { default: 0 }), ...outs, execOut('default', 'Default')];
    },
  },
  {
    id: 'flow.switchString',
    title: 'Switch on String',
    category: CAT,
    kind: 'flow',
    description:
      "Choisit une sortie selon un texte. Les cas se règlent dans Details (séparés par des virgules). Has Case Sensitive Comparison : majuscules et minuscules comptent.",
    keywords: ['switch', 'case', 'selon', 'texte', 'string'],
    config: [
      { key: 'names', label: 'Pin Names (séparés par des virgules)', kind: 'string' },
      {
        key: 'caseSensitive',
        label: 'Has Case Sensitive Comparison',
        kind: 'choice',
        choices: [
          { value: 'false', label: 'Non' },
          { value: 'true', label: 'Oui' },
        ],
      },
    ],
    defaultConfig: { names: 'A, B', caseSensitive: 'false' },
    pins: (n) => [
      execIn(),
      dataIn('selection', 'Selection', T.string, { default: '' }),
      ...stringCases(n.config.names).map((name, i) => execOut(`case${i}`, name)),
      execOut('default', 'Default'),
    ],
  },
  {
    id: 'flow.switchEnum',
    title: (n) => `Switch on ${n.config.enum || 'Enum'}`,
    category: CAT,
    kind: 'flow',
    description: "Une sortie par valeur de l'Enum : l'exécution sort par celle qui correspond à Selection. Choisis l'Enum dans Details.",
    keywords: ['switch', 'case', 'selon', 'enum', 'etat'],
    config: [{ key: 'enum', label: 'Enum', kind: 'choice', choicesFrom: 'enums' }],
    defaultConfig: { enum: '' },
    pins: (n, ctx) => {
      const name = String(n.config.enum ?? '');
      const entries = enumEntries(name, ctx.project) ?? [];
      return [
        execIn(),
        dataIn('selection', 'Selection', name ? T.enum(name) : T.int, { default: 0 }),
        ...entries.map((e, i) => execOut(`case${i}`, e)),
      ];
    },
  },
  {
    id: 'util.select',
    title: 'Select',
    category: 'Utilities',
    kind: 'pure',
    description:
      "Renvoie l'option qui correspond à Index. Les options prennent le type du premier fil relié ; Index peut être un entier, un booléen ou un Enum (une option par valeur).",
    keywords: ['select', 'choisir', 'option', 'ternaire', 'si'],
    config: [{ key: 'options', label: "Nombre d'options (Index entier)", kind: 'int', min: 2, max: MAX_CASES }],
    defaultConfig: { options: 2 },
    pins: (n, ctx) => [
      ...selectOptions(n, ctx.project).map((label, i) => dataIn(`option${i}`, label, T.wildcard, { wildGroup: 'value' })),
      dataIn('index', 'Index', T.wildcard, { wildGroup: 'index', accepts: ['int', 'bool', 'enum'] }),
      dataOut('result', 'Return Value', T.wildcard, { wildGroup: 'value' }),
    ],
  },
];
