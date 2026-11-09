/**
 * Set and Map functions. Like the array functions, their pins are wildcards
 * typed by the container wired to them, and the functions that change the
 * container take it by reference (diamond pin: wire a Get of the variable).
 * A Map pin has two groups: its keys ("key") and its values ("value").
 */
import { T, type PinType } from '../../types/pins';
import { dataIn, dataOut, execIn, execOut, type NodeDefinition, type PinSpec } from '../definition';

const KEY = { category: 'wildcard', wildGroup: 'key' } as const;
const SET: PinType = { category: 'wildcard', container: 'set' };
const MAP: PinType = { category: 'wildcard', container: 'map', value: { category: 'wildcard' } };
const key = (id: string, label: string, dir: 'in' | 'out' = 'in'): PinSpec =>
  (dir === 'in' ? dataIn : dataOut)(id, label, T.wildcard, { wildGroup: KEY.wildGroup });
const value = (id: string, label: string, dir: 'in' | 'out' = 'in'): PinSpec =>
  (dir === 'in' ? dataIn : dataOut)(id, label, T.wildcard, { wildGroup: 'value' });
const setPin = (byRef: boolean) => dataIn('set', 'Target Set', SET, byRef ? { byRef: true } : {});
const mapPin = (byRef: boolean) => dataIn('map', 'Target Map', MAP, { wildGroup: KEY.wildGroup, valueGroup: 'value', ...(byRef ? { byRef: true } : {}) });

const SET_CAT = 'Utilities|Set';
const MAP_CAT = 'Utilities|Map';

function node(id: string, title: string, category: string, impure: boolean, description: string, keywords: string[], ins: PinSpec[], outs: PinSpec[] = []): NodeDefinition {
  return {
    id,
    title,
    category,
    kind: impure ? 'function' : 'pure',
    description,
    keywords,
    pins: impure ? [execIn(), ...ins, execOut(), ...outs] : [...ins, ...outs],
  };
}

export const containerNodes: NodeDefinition[] = [
  // ------------------------------------------------------------------- Set
  node('set.add', 'Add', SET_CAT, true, 'Ajoute l’élément au Set, s’il n’y est pas déjà : un Set ne garde jamais deux fois le même.', ['add', 'ajouter', 'set', 'ensemble'], [setPin(true), dataIn('item', 'New Item', T.wildcard)]),
  node('set.remove', 'Remove', SET_CAT, true, 'Retire l’élément du Set. Renvoie vrai s’il y était.', ['remove', 'retirer', 'set'], [setPin(true), dataIn('item', 'Item', T.wildcard)], [dataOut('result', 'Return Value', T.bool)]),
  node('set.clear', 'Clear', SET_CAT, true, 'Vide le Set.', ['clear', 'vider', 'set'], [setPin(true)]),
  node('set.contains', 'Contains', SET_CAT, false, 'Vrai si le Set contient l’élément.', ['contains', 'contient', 'set'], [setPin(false), dataIn('item', 'Item to Find', T.wildcard)], [dataOut('result', 'Return Value', T.bool)]),
  node('set.length', 'Length', SET_CAT, false, 'Le nombre d’éléments du Set.', ['length', 'nombre', 'taille', 'set'], [setPin(false)], [dataOut('result', 'Return Value', T.int)]),
  node('set.toArray', 'To Array', SET_CAT, false, 'Les éléments du Set dans un tableau. Leur ordre n’est pas garanti : ne t’en sers pas.', ['to array', 'tableau', 'set'], [setPin(false)], [dataOut('result', 'Result', T.array(T.wildcard))]),
  // ------------------------------------------------------------------- Map
  node('map.add', 'Add', MAP_CAT, true, 'Associe Value à Key. Si Key existe déjà, sa valeur est remplacée.', ['add', 'ajouter', 'map', 'dictionnaire'], [mapPin(true), key('key', 'Key'), value('value', 'Value')]),
  node('map.remove', 'Remove', MAP_CAT, true, 'Retire Key et sa valeur. Renvoie vrai si Key y était.', ['remove', 'retirer', 'map'], [mapPin(true), key('key', 'Key')], [dataOut('result', 'Return Value', T.bool)]),
  node('map.clear', 'Clear', MAP_CAT, true, 'Vide la Map.', ['clear', 'vider', 'map'], [mapPin(true)]),
  node('map.find', 'Find', MAP_CAT, false, 'La valeur associée à Key. Si Key n’y est pas, Return Value est faux et Value vaut la valeur par défaut, sans erreur.', ['find', 'chercher', 'trouver', 'map', 'valeur'], [mapPin(false), key('key', 'Key')], [value('value', 'Value', 'out'), dataOut('result', 'Return Value', T.bool)]),
  node('map.contains', 'Contains', MAP_CAT, false, 'Vrai si la Map a une valeur pour Key.', ['contains', 'contient', 'map', 'cle'], [mapPin(false), key('key', 'Key')], [dataOut('result', 'Return Value', T.bool)]),
  node('map.length', 'Length', MAP_CAT, false, 'Le nombre de paires clé-valeur de la Map.', ['length', 'nombre', 'map'], [mapPin(false)], [dataOut('result', 'Return Value', T.int)]),
  node('map.keys', 'Keys', MAP_CAT, false, 'Toutes les clés de la Map, dans un tableau.', ['keys', 'cles', 'map'], [mapPin(false)], [dataOut('keys', 'Keys', { category: 'wildcard', container: 'array' }, { wildGroup: 'key' })]),
  node('map.values', 'Values', MAP_CAT, false, 'Toutes les valeurs de la Map, dans un tableau.', ['values', 'valeurs', 'map'], [mapPin(false)], [dataOut('values', 'Values', { category: 'wildcard', container: 'array' }, { wildGroup: 'value' })]),
];
