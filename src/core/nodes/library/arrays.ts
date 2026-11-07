/**
 * Array functions. Their pins are wildcards: the node takes the type of the
 * array wired to it. Functions that change the array take it by reference
 * (the diamond pin of UE): wire a Get of the array variable.
 */
import { T } from '../../types/pins';
import { dataIn, dataOut, execIn, execOut, type NodeDefinition, type PinSpec } from '../definition';

const CAT = 'Utilities|Array';
const ARR = T.array(T.wildcard);
const ITEM = T.wildcard;
const target = (byRef: boolean): PinSpec => dataIn('array', 'Target Array', ARR, byRef ? { byRef: true } : {});

function impure(id: string, title: string, description: string, keywords: string[], ins: PinSpec[], outs: PinSpec[] = []): NodeDefinition {
  return { id, title, category: CAT, kind: 'function', description, keywords, pins: [execIn(), target(true), ...ins, execOut(), ...outs] };
}

function pure(id: string, title: string, description: string, keywords: string[], ins: PinSpec[], outs: PinSpec[]): NodeDefinition {
  return { id, title, category: CAT, kind: 'pure', description, keywords, pins: [target(false), ...ins, ...outs] };
}

export const arrayNodes: NodeDefinition[] = [
  impure('array.add', 'Add', "Ajoute un élément à la fin du tableau et renvoie son index.", ['add', 'ajouter', 'push', 'tableau', 'array'], [dataIn('item', 'New Item', ITEM)], [dataOut('index', 'Return Value', T.int)]),
  impure('array.addUnique', 'Add Unique', "Ajoute l'élément seulement s'il n'est pas déjà dans le tableau. Renvoie son index, ou -1 s'il y était déjà.", ['add unique', 'ajouter', 'sans doublon', 'tableau'], [dataIn('item', 'New Item', ITEM)], [dataOut('index', 'Return Value', T.int)]),
  impure('array.insert', 'Insert', "Insère l'élément à la position Index ; les suivants sont décalés.", ['insert', 'inserer', 'tableau'], [dataIn('item', 'New Item', ITEM), dataIn('index', 'Index', T.int, { default: 0 })]),
  impure('array.removeIndex', 'Remove Index', "Retire l'élément à la position Index ; les suivants reculent d'une place.", ['remove', 'retirer', 'supprimer', 'index', 'tableau'], [dataIn('index', 'Index to Remove', T.int, { default: 0 })]),
  impure('array.removeItem', 'Remove Item', "Retire toutes les copies de l'élément. Renvoie vrai si au moins une a été retirée.", ['remove', 'retirer', 'supprimer', 'item', 'tableau'], [dataIn('item', 'Item', ITEM)], [dataOut('result', 'Return Value', T.bool)]),
  impure('array.set', 'Set Array Elem', "Remplace l'élément à la position Index. Size to Fit agrandit le tableau si l'index dépasse.", ['set', 'remplacer', 'modifier', 'element', 'tableau'], [dataIn('index', 'Index', T.int, { default: 0 }), dataIn('item', 'Item', ITEM), dataIn('sizeToFit', 'Size to Fit', T.bool, { default: false })]),
  impure('array.clear', 'Clear', 'Vide le tableau : il ne contient plus aucun élément.', ['clear', 'vider', 'effacer', 'tableau'], []),
  pure('array.get', 'Get (a copy)', "L'élément à la position Index (0 pour le premier). Hors limites : une erreur dans le log et la valeur par défaut.", ['get', 'lire', 'element', 'index', 'tableau'], [dataIn('index', 'Index', T.int, { default: 0 })], [dataOut('item', 'Item', ITEM)]),
  pure('array.contains', 'Contains Item', "Vrai si le tableau contient l'élément.", ['contains', 'contient', 'tableau'], [dataIn('item', 'Item to Find', ITEM)], [dataOut('result', 'Return Value', T.bool)]),
  pure('array.find', 'Find Item', "La position du premier élément égal à Item, ou -1 s'il n'y est pas.", ['find', 'chercher', 'trouver', 'index', 'tableau'], [dataIn('item', 'Item to Find', ITEM)], [dataOut('index', 'Return Value', T.int)]),
  pure('array.lastIndex', 'Last Index', "L'index du dernier élément (Length − 1), ou -1 si le tableau est vide.", ['last', 'dernier', 'index', 'tableau'], [], [dataOut('result', 'Return Value', T.int)]),
  pure('array.isEmpty', 'Is Empty', 'Vrai si le tableau ne contient aucun élément.', ['empty', 'vide', 'tableau'], [], [dataOut('result', 'Return Value', T.bool)]),
  pure('array.random', 'Random Array Item', 'Un élément au hasard et son index, recalculés à chaque lecture.', ['random', 'hasard', 'tableau'], [], [dataOut('item', 'Out Item', ITEM), dataOut('index', 'Out Index', T.int)]),
];
