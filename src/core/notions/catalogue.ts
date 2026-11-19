/**
 * The notions of the learning path: one reference list, so that lessons can
 * say what they teach and what they need, and the path can show what is
 * acquired. The labels lessons show (`Lesson.notions`) stay free text, more
 * precise; these are the larger units a learner revises and is tested on.
 */
export interface Notion {
  id: string;
  title: string;
  /** One line: what it covers. */
  covers: string;
}

export const NOTIONS: readonly Notion[] = [
  { id: 'events', title: 'Événements', covers: 'BeginPlay, touches, overlaps : ce qui déclenche un graphe' },
  { id: 'exec', title: 'Fil d’exécution', covers: 'le fil blanc, l’ordre des nœuds, ce qui ne s’exécute pas' },
  { id: 'print', title: 'Print String et Output Log', covers: 'afficher pour voir ce qui se passe' },
  { id: 'build-actor', title: 'Construire un acteur', covers: 'Blueprint Class, composants, Viewport, poser dans le niveau' },
  { id: 'components', title: 'Composants et Target', covers: 'agir sur un composant de l’acteur' },
  { id: 'visibility', title: 'Visibilité et collision', covers: 'Set Visibility, Hidden In Game, Collision Enabled' },
  { id: 'overlap', title: 'Overlaps', covers: 'Begin / End Overlap, Other Actor' },
  { id: 'input', title: 'Touches', covers: 'événements de touche, Auto Receive Input, Consume Input' },
  { id: 'enhanced-input', title: 'Enhanced Input', covers: 'Input Action, Mapping Context, déclencheurs (Pressed, Hold…)' },
  { id: 'player-controller', title: 'Player Controller', covers: 'le joueur au-delà de son pion : Player Controller Class, Get Controller, Subsystem d’Enhanced Input' },
  { id: 'variables', title: 'Variables', covers: 'Get / Set, Boolean, Integer, valeur par défaut' },
  { id: 'branch', title: 'Branch et comparaisons', covers: 'choisir un chemin selon une condition' },
  { id: 'math', title: 'Calcul', covers: 'Integer et Float, Clamp, modulo, division' },
  { id: 'pure', title: 'Nœuds purs', covers: 'calculés à chaque lecture, sans fil blanc' },
  { id: 'flow-memory', title: 'Nœuds à mémoire', covers: 'DoOnce, FlipFlop, Gate' },
  { id: 'sequence', title: 'Sequence', covers: 'plusieurs suites dans l’ordre' },
  { id: 'latent', title: 'Delay et attentes', covers: 'actions latentes, Retriggerable Delay' },
  { id: 'loops', title: 'Boucles', covers: 'For Loop, For Each Loop, Break, While Loop' },
  { id: 'switch', title: 'Switch et Select', covers: 'un chemin ou une valeur par cas' },
  { id: 'enum', title: 'Enums et états', covers: 'Enum, Switch on Enum, machine à états' },
  { id: 'rotation', title: 'Position et rotation', covers: 'Rotator, Vector, Set Relative Rotation, déplacer un acteur' },
  { id: 'cast', title: 'Cast To', covers: 'vérifier le type d’un objet et accéder à ce qu’il a' },
  { id: 'other-bp', title: 'Parler à un autre Blueprint', covers: 'lire et écrire ses variables, appeler ses fonctions' },
  { id: 'destroy', title: 'Détruire un acteur', covers: 'Destroy Actor, Event Destroyed, références mortes' },
  { id: 'references', title: 'Références d’objet', covers: 'variable référence, Is Valid, Accessed None' },
  { id: 'instance-editable', title: 'Instance Editable', covers: 'une valeur différente par acteur posé' },
  { id: 'arrays', title: 'Tableaux', covers: 'Array : Add, Get, Remove, Length' },
  { id: 'maps', title: 'Map', covers: 'une valeur par clé : Add, Find, Contains' },
  { id: 'sets', title: 'Set', covers: 'un ensemble sans doublons' },
  { id: 'copies', title: 'Copie ou référence', covers: 'Get (a copy) et Get (a ref), ce que Set copie' },
  { id: 'structs', title: 'Structures', covers: 'Make, Break, Set Members in' },
  { id: 'data-tables', title: 'Data Tables', covers: 'des lignes de données lues par leur Row Name' },
  { id: 'random', title: 'Hasard', covers: 'Random Integer, Random Stream et graine' },
  { id: 'timeline', title: 'Timeline et Lerp', covers: 'animer une valeur dans le temps' },
  { id: 'dispatchers', title: 'Event Dispatchers', covers: 'prévenir ceux qui écoutent : Call, Bind' },
  { id: 'interfaces', title: 'Blueprint Interfaces', covers: 'un message que chacun implémente à sa façon' },
  { id: 'functions', title: 'Fonctions', covers: 'entrées, sorties, pure ou non, d’un autre Blueprint' },
  { id: 'locals', title: 'Variables locales', covers: 'une variable qui ne vit que pendant l’appel' },
  { id: 'construction', title: 'Construction Script', covers: 'ce qui s’exécute dans l’éditeur, avant le jeu' },
  { id: 'begin-order', title: 'Ordre des BeginPlay', covers: 'ce qu’on ne peut pas supposer entre acteurs' },
  { id: 'timers', title: 'Timers', covers: 'Set Timer by Event, Handle, annuler' },
  { id: 'spawn', title: 'Spawn Actor', covers: 'créer des acteurs pendant le jeu, Expose on Spawn' },
  { id: 'tick', title: 'Event Tick', covers: 'chaque image, Delta Seconds, son coût' },
  { id: 'save-game', title: 'Save Game', covers: 'sauver et charger entre deux parties' },
  { id: 'inheritance', title: 'Héritage', covers: 'Blueprint parent et enfant, redéfinir' },
  { id: 'actor-components', title: 'Actor Components', covers: 'une logique qu’on ajoute à des acteurs : une copie chacun, Get Owner, Get Component by Class' },
  { id: 'trace', title: 'Line Trace', covers: 'viser : ce que touche un rayon' },
  { id: 'hit', title: 'Event Hit', covers: 'un contact bloquant' },
  { id: 'transform', title: 'Repères et Transform', covers: 'repère local et repère monde' },
  { id: 'refactor', title: 'Faire évoluer un graphe', covers: 'réécrire sans rien casser' },
  { id: 'choose-tool', title: 'Choisir Cast, Dispatcher ou Interface', covers: 'qui connaît qui : l’outil de communication qui convient' },
  { id: 'find', title: 'Chercher dans le projet', covers: 'Find References, Find in all Blueprints : qui utilise quoi' },
  { id: 'pause', title: 'Pause du jeu', covers: 'Set Game Paused, Is Game Paused, Trigger when Paused' },
  { id: 'reusable', title: 'Blueprint réutilisable', covers: 'un même Blueprint posé plusieurs fois, réglé acteur par acteur, sans connaître ses cibles' },
  { id: 'input-mode', title: 'Modes de contrôle', covers: 'un Mapping Context par mode de jeu (dialogue, menu), ajouté et retiré par le Player Controller' },
  { id: 'mixed', title: 'Entraînement mélangé', covers: 'choisir soi-même l’outil, sans que la consigne le dise' },
];

const BY_ID = new Map(NOTIONS.map((n) => [n.id, n]));

export function getNotion(id: string): Notion | undefined {
  return BY_ID.get(id);
}
