/**
 * Enhanced Input nodes. The action event fires with the five trigger events
 * of UE (Triggered, Started, Ongoing, Canceled, Completed) once a Mapping
 * Context that maps a key to the action has been added (Add Mapping
 * Context). Assets are chosen in Details, by id, as UE's asset dropdowns.
 */
import type { NodeInstance } from '../../model/project';
import { findInputAction, findMappingContext } from '../../operations/inputOps';
import { T } from '../../types/pins';
import { dataIn, dataOut, execIn, execOut, type NodeContext, type NodeDefinition } from '../definition';

const actionName = (ctx: NodeContext, n: NodeInstance) => (ctx.project && findInputAction(ctx.project, n.config.action)?.name) || 'None';
const contextName = (ctx: NodeContext, n: NodeInstance) => (ctx.project && findMappingContext(ctx.project, n.config.context)?.name) || 'None';

const CONTEXT = [{ key: 'context', label: 'Mapping Context', kind: 'choice' as const, choicesFrom: 'mappingContexts' as const }];

export const enhancedInputNodes: NodeDefinition[] = [
  {
    id: 'input.action',
    title: (n, ctx) => actionName(ctx, n),
    category: 'Input|Enhanced Action Events',
    kind: 'event',
    allowedIn: ['event'],
    hiddenFromPalette: true,
    description:
      'Se déclenche pour une Input Action, quand une touche qui lui est associée dans un Mapping Context ajouté (Add Mapping Context) passe par les étapes de ses déclencheurs. Started : l’évaluation commence (appui). Ongoing : en cours, pas encore validée (un Hold avant son seuil). Triggered : l’action a lieu (à chaque image tant qu’elle dure). Canceled : abandonnée avant d’avoir eu lieu (relâchée trop tôt). Completed : elle avait eu lieu et s’arrête.',
    keywords: ['enhanced', 'input', 'action', 'ia', 'touche'],
    config: [
      { key: 'action', label: 'Input Action', kind: 'choice', choicesFrom: 'inputActions' },
      {
        key: 'consumeInput',
        label: 'Consume Input',
        kind: 'bool',
        help: 'Cochée (par défaut, comme dans UE) : le premier acteur de la pile des entrées qui écoute cette action la garde, les autres ne la reçoivent pas.',
      },
    ],
    defaultConfig: { action: '', consumeInput: true },
    pins: [
      execOut('triggered', 'Triggered'),
      execOut('started', 'Started'),
      execOut('ongoing', 'Ongoing'),
      execOut('canceled', 'Canceled'),
      execOut('completed', 'Completed'),
      dataOut('value', 'Action Value', T.bool),
      dataOut('elapsed', 'Elapsed Seconds', T.float),
      dataOut('triggeredSeconds', 'Triggered Seconds', T.float),
    ],
  },
  {
    id: 'input.addMappingContext',
    title: (n, ctx) => `Add Mapping Context (${contextName(ctx, n)})`,
    category: 'Input|Enhanced Input',
    kind: 'function',
    hiddenFromPalette: true,
    description:
      'Active un Input Mapping Context pour le joueur : ses touches déclenchent maintenant leurs Input Actions. Sans lui, les événements d’action ne se déclenchent jamais, sans aucune erreur. Priority départage deux contextes qui utilisent la même touche (le plus haut gagne). Dans UE, ce nœud est appelé sur le Enhanced Input Local Player Subsystem, obtenu depuis Get Player Controller ; l’appli fait ce chemin pour toi.',
    keywords: ['add mapping context', 'imc', 'enhanced', 'input', 'contexte'],
    config: CONTEXT,
    pins: [execIn(), dataIn('priority', 'Priority', T.int, { default: 0 }), execOut()],
  },
  {
    id: 'input.removeMappingContext',
    title: (n, ctx) => `Remove Mapping Context (${contextName(ctx, n)})`,
    category: 'Input|Enhanced Input',
    kind: 'function',
    hiddenFromPalette: true,
    description: 'Désactive un Input Mapping Context : ses touches ne déclenchent plus ses actions (par exemple en ouvrant un menu ou en montant dans un véhicule).',
    keywords: ['remove mapping context', 'imc', 'enhanced', 'input', 'contexte'],
    config: CONTEXT,
    pins: [execIn(), execOut()],
  },
];
