/**
 * Review questions on the memo cards (reference/memo.ts): what surrounds
 * Blueprints in UE. Unlocked once the card has been read. The first option
 * is the right answer.
 */
import type { QuizQuestion } from '../types';

const q = (memo: string, question: string, options: string[], why: string, n = 1): QuizQuestion => ({
  id: n === 1 ? memo : `${memo}#${n}`,
  memo,
  question,
  options,
  why,
});

export const MEMO_QUIZ: QuizQuestion[] = [
  q(
    'm-types-blueprints',
    'Où placer la logique d’une porte qu’on réutilisera dans plusieurs niveaux ?',
    ['Dans une Blueprint Class BP_Porte', 'Dans le Level Blueprint', 'Dans le GameMode', 'Dans une Macro Library'],
    'Le Level Blueprint est lié à un seul niveau : rien n’y est réutilisable. La logique d’un objet vit dans sa classe.',
  ),
  q(
    'm-cycle-vie',
    'Quel événement couvre tous les cas où un acteur cesse de jouer (détruit, niveau quitté, fin de partie) ?',
    ['Event End Play', 'Event Destroyed', 'Event Tick', 'Event BeginPlay'],
    'End Play se déclenche quelle que soit la raison (End Play Reason la donne) ; Destroyed seulement pour une destruction explicite.',
  ),
  q(
    'm-fonction-macro-event',
    'Tu as besoin d’un Delay dans un morceau de graphe à réutiliser. Où le mettre ?',
    ['Dans un Custom Event (ou une macro)', 'Dans une fonction', 'Dans une fonction pure', 'Dans une Blueprint Interface'],
    'Une fonction s’exécute d’un trait : elle n’accepte ni Delay ni Timeline. Les nœuds latents vont dans l’Event Graph ou une macro.',
  ),
  q(
    'm-composants',
    'Une porte tourne autour de sa charnière avec Set Relative Rotation. « Relative » par rapport à quoi ?',
    ['Au composant parent auquel elle est attachée', 'À l’origine du niveau', 'À la caméra du joueur', 'À sa rotation précédente'],
    'La position d’un composant est relative à son parent : la porte tourne correctement où que l’acteur soit posé.',
  ),
  q(
    'm-framework',
    'Quelle classe garde ses variables quand on change de niveau avec Open Level ?',
    ['GameInstance', 'GameMode', 'PlayerController', 'Le Pawn du joueur'],
    'Le GameInstance vit du lancement à la fermeture du jeu. Tout le reste est recréé à chaque chargement de niveau.',
  ),
  q(
    'm-framework',
    'Quelle classe désigne le Pawn par défaut et les règles de la partie ?',
    ['GameMode', 'GameInstance', 'PlayerState', 'Level Blueprint'],
    'Le GameMode fixe les règles et les classes par défaut (Default Pawn Class, Player Controller Class, HUD Class).',
    2,
  ),
  q(
    'm-enhanced-input',
    'Tes Input Actions sont créées et reliées dans le graphe, mais aucune ne se déclenche. Qu’as-tu sans doute oublié ?',
    ['Add Mapping Context au BeginPlay', 'De cocher Instance Editable', 'Un Event Tick', 'De compiler le GameMode'],
    'Sans Input Mapping Context ajouté au Enhanced Input Local Player Subsystem, aucune touche n’est reliée aux actions.',
  ),
  q(
    'm-enhanced-input',
    'Quelle sortie d’un événement d’Input Action utiliser pour agir une seule fois, à l’appui ?',
    ['Started', 'Triggered', 'Ongoing', 'Completed'],
    'Started se déclenche quand l’appui commence ; Triggered à chaque image tant que l’action est active ; Completed au relâchement.',
    2,
  ),
  q(
    'm-umg',
    'Pourquoi préférer une mise à jour par événement à un Binding dans un widget ?',
    ['Un Binding est recalculé à chaque image', 'Un Binding ne marche qu’en C++', 'Un Binding ne peut pas lire une variable', 'Un Binding empêche Add to Viewport'],
    'Piloté par événement (Event Dispatcher puis Set Text), le widget ne fait rien tant que rien ne change.',
  ),
  q(
    'm-umg',
    'Quels nœuds affichent un Widget Blueprint à l’écran ?',
    ['Create Widget, puis Add to Viewport', 'Spawn Actor, puis Set Visibility', 'Open Level', 'Add Mapping Context'],
    'Create Widget crée l’instance (à garder dans une variable) ; Add to Viewport l’affiche ; Remove from Parent l’enlève.',
    2,
  ),
  q(
    'm-niveaux-sauvegarde',
    'Que met-on dans un objet SaveGame ?',
    ['Des données simples : positions, identifiants, états', 'Des références vers les acteurs du niveau', 'Les graphes des Blueprints', 'Les widgets affichés'],
    'Les acteurs n’existeront plus au chargement : on sauve ce qui permet de les retrouver ou de les recréer.',
  ),
  q(
    'm-communication',
    'Un Blueprint doit agir sur « n’importe quel objet qui sait Interagir », sans connaître sa classe. Quel outil ?',
    ['Une Blueprint Interface', 'Un Cast To vers chaque classe', 'Get All Actors Of Class', 'Le Level Blueprint'],
    'Un message d’interface part vers n’importe quel acteur : ceux qui l’implémentent réagissent, les autres l’ignorent.',
  ),
  q(
    'm-trouver-acteur',
    'Quelle source de référence est à réserver au BeginPlay, jamais au Tick ?',
    ['Get All Actors Of Class', 'Other Actor d’un overlap', 'Le Return Value de Spawn Actor', 'Une variable Instance Editable'],
    'Une recherche parcourt tout le niveau : on la fait une fois et on garde le résultat.',
  ),
  q(
    'm-references-memoire',
    'Pourquoi un Cast To vers BP_Boss peut-il alourdir le chargement du personnage ?',
    ['Il crée une référence dure : BP_Boss et ses assets sont chargés avec lui', 'Un Cast s’exécute à chaque image', 'Un Cast copie l’acteur', 'Un Cast désactive le ramasse-miettes'],
    'Mentionner une classe la charge, avec tout ce qu’elle référence. Une interface ou une Soft Reference l’évite.',
  ),
  q(
    'm-references-memoire',
    'Quel outil d’UE montre tout ce qu’un asset entraîne en mémoire ?',
    ['Size Map', 'Output Log', 'World Settings', 'Class Settings'],
    'Clic droit sur l’asset › Size Map ; Reference Viewer montre qui référence qui.',
    2,
  ),
  q(
    'm-data-tables',
    'Peut-on modifier une ligne d’une Data Table pendant la partie, depuis un Blueprint ?',
    ['Non : elle se lit seulement, l’état qui change va dans des variables', 'Oui, avec Set Data Table Row', 'Oui, mais seulement au BeginPlay', 'Oui, si la structure est Instance Editable'],
    'Une Data Table est une source de données fixes. Les quantités, les quêtes finies vivent dans des variables (et la sauvegarde).',
  ),
  q(
    'm-conteneurs',
    'Tu veux savoir très vite si un identifiant a déjà été vu, sans doublons. Quel conteneur ?',
    ['Un Set', 'Un Array', 'Une Map de Boolean', 'Une String'],
    'Un Set garde chaque valeur une fois et son Contains est rapide. Une Map sert quand une valeur est associée à la clé.',
  ),
  q(
    'm-conteneurs',
    'Pourquoi ne pas retirer d’éléments d’un tableau pendant qu’un For Each Loop le parcourt ?',
    ['Les éléments se décalent et certains sont sautés', 'Le tableau est en lecture seule', 'Le jeu plante à coup sûr', 'For Each recommence du début'],
    'Parcours le tableau à l’envers, ou note d’abord ce qu’il faut retirer et retire-le après la boucle.',
    2,
  ),
  q(
    'm-string-name-text',
    'Quel type utiliser pour un texte affiché au joueur ?',
    ['Text', 'Name', 'String', 'Enum'],
    'Text est le seul type qui se traduit. Name sert d’identifiant, String à manipuler ou déboguer.',
  ),
  q(
    'm-collisions',
    'Un composant répond Block à un autre, qui lui répond Overlap. Quel est le résultat ?',
    ['Overlap : la réponse la moins forte gagne', 'Block : la plus forte gagne', 'Ignore', 'Les deux à la fois'],
    'Entre deux composants, c’est la réponse la moins bloquante qui s’applique. Si l’un dit Ignore, rien ne se passe.',
  ),
  q(
    'm-collisions',
    'Un Begin Overlap ne se déclenche pas. Quelle case vérifier sur les deux composants ?',
    ['Generate Overlap Events', 'Simulate Physics', 'Instance Editable', 'Auto Receive Input'],
    'Il faut Generate Overlap Events des deux côtés, une collision avec Query, et la réponse Overlap dans les deux sens.',
    2,
  ),
  q(
    'm-temps',
    'Quel outil pour exécuter un événement toutes les 2 secondes ?',
    ['Set Timer by Event, avec Looping', 'Un Timeline de 2 s', 'Un Delay sur Event Tick', 'Un For Loop'],
    'Le timer est fait pour le périodique ; le Timeline pour une valeur qui suit une courbe ; Tick pour le continu.',
  ),
  q(
    'm-jeu-narratif',
    'Dans un jeu narratif, où garder les faits acquis (« GenerateurRepare ») pour qu’ils survivent aux changements de niveau ?',
    ['Dans le GameInstance, par exemple un Set de Name', 'Dans le Level Blueprint', 'Dans chaque porte concernée', 'Dans le widget de dialogue'],
    'Le GameInstance traverse les niveaux ; un Set de Name répond vite à « ce fait est-il connu ? ».',
  ),
  q(
    'm-performance',
    'Une fonction pure coûteuse est lue dans le Loop Body d’un For Each de 100 éléments. Combien de fois est-elle calculée ?',
    ['Au moins 100 fois', 'Une fois, avant la boucle', 'Une fois par image', 'Jamais'],
    'Un nœud pur est recalculé à chaque lecture : stocke son résultat dans une variable locale avant la boucle.',
  ),
  q(
    'm-nommage',
    'Quel préfixe porte un Widget Blueprint ?',
    ['WBP_', 'BPI_', 'DT_', 'SM_'],
    'WBP_ pour un widget, BPI_ pour une interface, DT_ pour une Data Table, SM_ pour un Static Mesh.',
  ),
  q(
    'm-debogage-ue',
    'Dans l’éditeur d’UE, tes fils ne s’animent pas pendant Play. Que régler ?',
    ['Le Debug Object, en haut de l’éditeur de Blueprint', 'Le GameMode Override', 'Le Collision Preset', 'Le Tick Interval'],
    'Tant qu’aucune instance n’est choisie comme Debug Object, l’éditeur ne montre l’exécution d’aucune.',
  ),
  q(
    'm-raccourcis',
    'Dans l’éditeur de Blueprints d’UE, que pose « B + clic » dans le graphe ?',
    ['Un Branch', 'Un Event BeginPlay', 'Un breakpoint', 'Un Comment'],
    'B Branch, S Sequence, D Delay, F For Each Loop, P BeginPlay ; C entoure la sélection d’un Comment.',
  ),
  q(
    'm-autres-graphes',
    'Qu’est-ce qui distingue l’Anim Graph ou un Material d’un Event Graph ?',
    ['Pas de fil blanc : ils sont évalués en continu', 'Ils n’ont pas de pins typées', 'Ils ne peuvent pas avoir de variables', 'Ils ne s’exécutent qu’au BeginPlay'],
    'Les gestes sont les mêmes, mais ces graphes décrivent un calcul permanent, pas une suite d’actions déclenchée par un événement.',
  ),
];
