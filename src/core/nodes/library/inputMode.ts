/**
 * Who gets the player's input, as UE's Widget Blueprint Library sets it on
 * the Player Controller: the game (Game Only, the start), the widgets (UI
 * Only), or both (Game and UI); and the controller's Show Mouse Cursor.
 */
import { T } from '../../types/pins';
import { dataIn, dataOut, execIn, execOut, type NodeContext, type NodeDefinition, type PinSpec } from '../definition';
import { selfIs } from './actorComponents';

const CAT = 'Input';

/** UE's EMouseLockMode, kept for the pin: a phone has no mouse to lock. */
const lockMode = (): PinSpec => dataIn('lockMode', 'In Mouse Lock Mode', T.enum('EMouseLockMode'), { default: 0 });
const controller = (): PinSpec => dataIn('controller', 'Player Controller', T.object('PlayerController'), { required: true });
const flush = (): PinSpec => dataIn('flush', 'Flush Input', T.bool, { default: false });
const focus = (): PinSpec => dataIn('focus', 'In Widget to Focus', T.object('Widget'));

/** Show Mouse Cursor is a property of the Player Controller: self in one, a wire elsewhere. */
function pcTarget(ctx: NodeContext): PinSpec {
  return dataIn('target', 'Target', T.object('PlayerController'), selfIs(ctx, 'PlayerController') ? { defaultsToSelf: true } : { required: true });
}

export const inputModeNodes: NodeDefinition[] = [
  {
    id: 'input.setModeGameOnly',
    title: 'Set Input Mode Game Only',
    category: CAT,
    kind: 'function',
    description:
      'Le jeu reprend toutes les entrées : touches, Input Actions, joystick. Les widgets ne reçoivent plus les touchers (un bouton à l’écran ne répond plus). C’est le mode du début de partie : on y revient en fermant un menu.',
    keywords: ['input mode', 'game only', 'mode', 'jeu', 'controle', 'fermer menu'],
    pins: [execIn(), controller(), flush(), execOut()],
  },
  {
    id: 'input.setModeUIOnly',
    title: 'Set Input Mode UI Only',
    category: CAT,
    kind: 'function',
    description:
      'Seuls les widgets reçoivent les entrées : les boutons répondent, mais le jeu n’a plus rien, ni touche, ni Input Action, ni joystick. Piège : la touche qui a ouvert le menu ne peut plus le fermer. Pour un menu qu’on ferme au clavier, préfère Game and UI.',
    keywords: ['input mode', 'ui only', 'menu', 'interface', 'mode', 'bouton'],
    pins: [execIn(), controller(), focus(), lockMode(), flush(), execOut()],
  },
  {
    id: 'input.setModeGameAndUI',
    title: 'Set Input Mode Game and UI',
    category: CAT,
    kind: 'function',
    description:
      'Les widgets et le jeu reçoivent les entrées : les boutons répondent, et les touches et Input Actions arrivent toujours au jeu. Le mode habituel d’un menu pause qu’on ferme avec la même touche.',
    keywords: ['input mode', 'game and ui', 'menu', 'pause', 'mode', 'bouton'],
    pins: [execIn(), controller(), focus(), lockMode(), dataIn('hideCursor', 'Hide Cursor During Capture', T.bool, { default: true }), flush(), execOut()],
  },
  {
    id: 'input.setShowMouseCursor',
    title: 'Set Show Mouse Cursor',
    category: CAT,
    kind: 'function',
    description:
      'Montre ou cache le curseur de la souris (propriété Show Mouse Cursor du Player Controller). Sur PC, sans curseur, le joueur ne voit pas où il clique dans un menu. Ici, au doigt, il est signalé par une pastille « Curseur ».',
    keywords: ['mouse cursor', 'curseur', 'souris', 'show', 'menu'],
    pins: (_n, ctx) => [execIn(), pcTarget(ctx), dataIn('show', 'Show Mouse Cursor', T.bool, { default: true }), execOut()],
  },
  {
    id: 'input.getShowMouseCursor',
    title: 'Get Show Mouse Cursor',
    category: CAT,
    kind: 'pure',
    description: 'Vrai si le Player Controller montre le curseur de la souris.',
    keywords: ['mouse cursor', 'curseur', 'souris'],
    pins: (_n, ctx) => [pcTarget(ctx), dataOut('result', 'Show Mouse Cursor', T.bool)],
  },
];
