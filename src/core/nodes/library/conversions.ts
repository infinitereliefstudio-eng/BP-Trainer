/**
 * Conversion nodes. Like UE, the editor inserts them automatically when a
 * wire joins two different types that can be converted (Integer → String…).
 */
import { T, type PinType } from '../../types/pins';
import { dataIn, dataOut, type NodeDefinition } from '../definition';

function conv(id: string, title: string, from: PinType, to: PinType, description: string): NodeDefinition {
  return {
    id,
    title,
    symbol: '•',
    category: 'Utilities|Conversion',
    kind: 'pure',
    style: 'compact',
    description,
    keywords: ['convert', 'to string', 'conversion'],
    pins: [dataIn('in', 'In', from, { hideName: true }), dataOut('result', 'Return Value', to, { hideName: true })],
  };
}

export const conversionNodes: NodeDefinition[] = [
  conv('conv.intToString', 'To String (Integer)', T.int, T.string, 'Convertit un entier en texte.'),
  conv('conv.floatToString', 'To String (Float)', T.float, T.string, 'Convertit un nombre décimal en texte.'),
  conv('conv.boolToString', 'To String (Boolean)', T.bool, T.string, 'Convertit un booléen en texte : true ou false.'),
  conv('conv.intToFloat', 'To Float (Integer)', T.int, T.float, 'Convertit un entier en nombre décimal.'),
  conv('conv.floatToInt', 'Truncate', T.float, T.int, 'Garde la partie entière d’un nombre décimal (2,9 donne 2).'),
  conv('conv.objectToString', 'Get Display Name', T.object('Object'), T.string, "Donne le nom affiché d'un objet."),
  conv('conv.vectorToString', 'To String (Vector)', T.vector, T.string, 'Écrit un vecteur sous la forme X=… Y=… Z=…'),
  conv('conv.rotatorToString', 'To String (Rotator)', T.rotator, T.string, 'Écrit une rotation sous la forme P=… Y=… R=…'),
  conv('conv.stringToInt', 'String to Int', T.string, T.int, 'Lit un entier dans un texte ("12" donne 12, un texte non numérique donne 0).'),
  conv('conv.stringToFloat', 'String to Float', T.string, T.float, 'Lit un nombre décimal dans un texte ("1.5" donne 1,5).'),
  conv('conv.boolToInt', 'To Integer (Boolean)', T.bool, T.int, 'true donne 1, false donne 0.'),
  conv('conv.stringToText', 'To Text (String)', T.string, T.text, 'Convertit un String en Text, le type des textes affichés au joueur.'),
  conv('conv.textToString', 'To String (Text)', T.text, T.string, 'Convertit un Text en String.'),
  conv('conv.intToText', 'To Text (Integer)', T.int, T.text, 'Convertit un entier en Text.'),
  conv('conv.floatToText', 'To Text (Float)', T.float, T.text, 'Convertit un nombre décimal en Text.'),
  conv('conv.boolToText', 'To Text (Boolean)', T.bool, T.text, 'Convertit un booléen en Text : true ou false.'),
  conv('conv.stringToName', 'String to Name', T.string, T.name, 'Convertit un String en Name, un identifiant (majuscules ignorées).'),
  conv('conv.nameToString', 'To String (Name)', T.name, T.string, 'Convertit un Name en String.'),
  conv('conv.nameToText', 'To Text (Name)', T.name, T.text, 'Convertit un Name en Text.'),
  { ...conv('conv.enumToString', 'To String (Enum)', T.wildcard, T.string, "Le nom de la valeur d'Enum."), pins: [dataIn('in', 'In', T.wildcard, { hideName: true, accepts: ['enum'] }), dataOut('result', 'Return Value', T.string, { hideName: true })] },
];

/** Conversion node to insert between two types, if UE would insert one. */
export function conversionFor(from: PinType, to: PinType): string | undefined {
  if (from.container || to.container) return undefined;
  const key = `${from.category}>${to.category}`;
  return (
    {
      'int>string': 'conv.intToString',
      'float>string': 'conv.floatToString',
      'bool>string': 'conv.boolToString',
      'int>float': 'conv.intToFloat',
      'float>int': 'conv.floatToInt',
      'object>string': 'conv.objectToString',
      'vector>string': 'conv.vectorToString',
      'rotator>string': 'conv.rotatorToString',
      'bool>int': 'conv.boolToInt',
      'enum>string': 'conv.enumToString',
      'string>text': 'conv.stringToText',
      'text>string': 'conv.textToString',
      'int>text': 'conv.intToText',
      'float>text': 'conv.floatToText',
      'bool>text': 'conv.boolToText',
      'string>name': 'conv.stringToName',
      'name>string': 'conv.nameToString',
      'name>text': 'conv.nameToText',
    } as Record<string, string>
  )[key];
}
