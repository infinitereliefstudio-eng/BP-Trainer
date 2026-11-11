/**
 * The memo: what surrounds Blueprints in Unreal Engine 5 and that this
 * simulator does not run (framework classes, Enhanced Input, UMG, saving,
 * references and memory, editor shortcuts…). Short cards to read, each
 * followed by review questions (review/bank/memo.ts).
 *
 * Text format: paragraphs separated by blank lines, **bold**, `code`, and
 * blocks of lines starting with "- " for lists.
 */
export interface MemoCard {
  id: string;
  /** Group shown on the memo page. */
  theme: MemoTheme;
  title: string;
  /** One line under the title. */
  summary: string;
  body: string;
  /** Words the search also matches. */
  keywords: string[];
  /** Lessons of the path that practise it. */
  lessons?: string[];
}

export type MemoTheme = 'bases' | 'framework' | 'communication' | 'donnees' | 'jeu' | 'qualite' | 'editeur';

export const MEMO_THEMES: { id: MemoTheme; title: string }[] = [
  { id: 'bases', title: 'Les bases d’un Blueprint' },
  { id: 'framework', title: 'Le cadre d’un jeu UE' },
  { id: 'communication', title: 'Faire communiquer' },
  { id: 'donnees', title: 'Données et mémoire' },
  { id: 'jeu', title: 'Construire un jeu' },
  { id: 'qualite', title: 'Performance et qualité' },
  { id: 'editeur', title: 'Dans l’éditeur d’UE' },
];

export const MEMO: MemoCard[] = [
  // ------------------------------------------------------------------ bases
  {
    id: 'm-types-blueprints',
    theme: 'bases',
    title: 'Les sortes de Blueprints',
    summary: 'Blueprint Class, Level Blueprint, Interface, bibliothèques : à quoi sert chacun.',
    keywords: ['level blueprint', 'function library', 'macro library', 'actor component', 'widget'],
    body:
      'Le mot « Blueprint » désigne plusieurs assets différents.\n\n' +
      '- **Blueprint Class** : une classe (un acteur, un pion, un composant…) avec ses composants, ses variables et ses graphes. C’est ce que tu construis dans BP Trainer.\n' +
      '- **Level Blueprint** : un graphe unique attaché à un niveau. Pratique pour un essai, mais rien n’y est réutilisable : on y met le moins possible.\n' +
      '- **Blueprint Interface** : une liste de fonctions sans contenu, que des classes s’engagent à implémenter.\n' +
      '- **Blueprint Function Library** : des fonctions utilitaires appelables de partout, sans état.\n' +
      '- **Blueprint Macro Library** : des macros partagées entre Blueprints d’un même parent.\n' +
      '- **Actor Component** : un morceau de logique réutilisable qu’on ajoute à n’importe quel acteur (santé, inventaire…).\n' +
      '- **Widget Blueprint** : une interface à l’écran (UMG).\n\n' +
      'Règle simple : la logique d’un objet vit dans **sa** classe, pas dans le Level Blueprint.',
  },
  {
    id: 'm-cycle-vie',
    theme: 'bases',
    title: 'Le cycle de vie d’un acteur',
    summary: 'Construction Script, BeginPlay, Tick, End Play, Destroyed.',
    keywords: ['construction script', 'beginplay', 'tick', 'end play', 'destroyed', 'spawn'],
    lessons: ['l-rangee-lampes', 'p5-ordre', 'l-ordre-beginplay', 'l-detruire'],
    body:
      'Un acteur passe toujours par les mêmes étapes.\n\n' +
      '- **Construction Script** : à chaque placement ou réglage dans l’éditeur, puis à l’apparition en jeu. Il prépare l’acteur à partir de ses variables.\n' +
      '- **BeginPlay** : une fois, quand l’acteur commence à jouer. L’ordre entre acteurs n’est pas garanti.\n' +
      '- **Tick** : à chaque image, avec Delta Seconds.\n' +
      '- **End Play** : quand l’acteur cesse de jouer, quelle qu’en soit la raison (détruit, niveau quitté, fin de partie). Sa pin End Play Reason dit laquelle.\n' +
      '- **Destroyed** : quand il est détruit explicitement.\n\n' +
      'Un acteur créé par **Spawn Actor** fait son Construction Script et son BeginPlay avant que le nœud Spawn rende la main : d’où **Expose on Spawn** pour lui donner des valeurs à temps.\n\n' +
      'Pour nettoyer (timers, abonnements, listes), préfère **End Play** : il couvre tous les cas, Destroyed un seul.',
  },
  {
    id: 'm-fonction-macro-event',
    theme: 'bases',
    title: 'Fonction, macro ou événement ?',
    summary: 'Trois façons de ranger un morceau de graphe, pas interchangeables.',
    keywords: ['function', 'macro', 'custom event', 'latent', 'delay', 'collapse'],
    lessons: ['l-fonctions', 'l-locales'],
    body:
      '- **Fonction** : s’exécute d’un trait et rend un résultat. Elle a des variables locales, peut être pure, peut être redéfinie par un enfant et appelée depuis un autre Blueprint. **Pas de Delay ni de Timeline** dedans.\n' +
      '- **Custom Event** : vit dans l’Event Graph, donc il accepte les nœuds latents (Delay, Timeline). Pas de valeur de retour. On peut le brancher sur un Timer ou un Event Dispatcher.\n' +
      '- **Macro** : un morceau de graphe recopié à chaque endroit où on la pose. Elle peut avoir plusieurs entrées et sorties d’exécution (comme For Loop ou Do Once, qui sont des macros) et contenir un Delay. Elle n’est pas appelable depuis un autre Blueprint, sauf depuis une Macro Library.\n\n' +
      'En pratique : **fonction** par défaut ; **événement** dès qu’il faut attendre ; **macro** seulement pour du contrôle de flux à plusieurs sorties.\n\n' +
      'Dans UE, sélectionner des nœuds puis clic droit › **Collapse to Function** ou **Collapse to Macro** les range d’un coup.',
  },
  {
    id: 'm-composants',
    theme: 'bases',
    title: 'Composants et attachement',
    summary: 'Scene Component, Actor Component, racine et positions relatives.',
    keywords: ['scene component', 'actor component', 'root', 'relative', 'world', 'attach'],
    lessons: ['l02-lampe', 'l05-porte'],
    body:
      'Un acteur n’est qu’un conteneur : ce qu’on voit et ce qui collisionne, ce sont ses **composants**.\n\n' +
      '- Un **Scene Component** a une position (Static Mesh, Point Light, Box Collision…). Ils forment un arbre : chacun est attaché à un parent, jusqu’à la **racine** (Default Scene Root).\n' +
      '- Un **Actor Component** n’a pas de position : c’est de la logique pure (santé, inventaire, déplacement).\n\n' +
      'La position d’un composant est **relative** à son parent : Set Relative Rotation fait tourner une porte autour de son point d’attache, sans se soucier de l’endroit où l’acteur est posé. Les nœuds **World** travaillent dans le repère du niveau.\n\n' +
      'La position de l’acteur est celle de son composant racine. Dans UE, le **Sweep** d’un déplacement ne teste que la collision de la racine : un acteur qui doit buter contre les murs a sa forme de collision en racine.\n\n' +
      'Quand la même logique revient dans trois Blueprints, c’est souvent un **Actor Component** à créer.',
  },

  // -------------------------------------------------------------- framework
  {
    id: 'm-framework',
    theme: 'framework',
    title: 'Les classes du Gameplay Framework',
    summary: 'GameMode, Pawn, PlayerController, GameState, GameInstance : qui fait quoi.',
    keywords: ['gamemode', 'gamestate', 'playerstate', 'playercontroller', 'pawn', 'character', 'gameinstance', 'hud'],
    body:
      'UE fournit des classes qui ont chacune un rôle. Les connaître évite de tout mettre dans le personnage.\n\n' +
      '- **GameMode** : les règles de la partie (qui apparaît, où, quand on gagne). Il désigne les classes par défaut : Default Pawn Class, Player Controller Class, HUD Class.\n' +
      '- **GameState** : l’état de la partie que tout le monde peut lire (score, temps restant).\n' +
      '- **Pawn** : un acteur qu’on peut posséder et piloter. **Character** est un Pawn avec une capsule, un mesh et un Character Movement qui sait marcher, sauter, tomber.\n' +
      '- **PlayerController** : la volonté du joueur. Il possède (Possess) un Pawn et survit quand le Pawn meurt : les entrées et l’interface qui ne dépendent pas du corps vont ici.\n' +
      '- **PlayerState** : les données d’un joueur (nom, score).\n' +
      '- **GameInstance** : un seul objet qui vit du lancement à la fermeture du jeu. C’est lui qui garde des données **entre deux niveaux**.\n\n' +
      'Tout le reste est recréé à chaque chargement de niveau : une variable du GameMode ou du personnage repart de zéro après **Open Level**.\n\n' +
      'On règle le GameMode d’un niveau dans **World Settings › GameMode Override**, ou pour tout le projet dans Project Settings › Maps & Modes.',
  },
  {
    id: 'm-enhanced-input',
    theme: 'framework',
    title: 'Enhanced Input',
    summary: 'Input Actions et Mapping Contexts : la façon UE5 de lire les touches.',
    keywords: ['input action', 'mapping context', 'triggered', 'started', 'completed', 'touche', 'manette'],
    lessons: ['l04-touche'],
    body:
      'Dans BP Trainer, un événement de touche (E, F, Espace) suffit. Dans un projet UE5, on passe par **Enhanced Input**, en trois pièces.\n\n' +
      '- **Input Action** (IA_Interagir, IA_Deplacer) : une intention, sans touche. Elle a un type de valeur : Bool pour un bouton, Axis2D pour un stick.\n' +
      '- **Input Mapping Context** (IMC_Defaut) : la table qui relie des touches et boutons à des actions. On peut en avoir plusieurs (à pied, en menu, en véhicule).\n' +
      '- **Add Mapping Context** : au BeginPlay, sur l’Enhanced Input Local Player Subsystem du PlayerController. Sans lui, aucune action ne se déclenche : c’est l’oubli le plus courant.\n\n' +
      'Dans le graphe, l’événement de l’action a plusieurs sorties : **Started** (l’appui commence), **Triggered** (à chaque image tant que l’action est active), **Completed** (relâché), plus Ongoing et Canceled.\n\n' +
      'Pour « une fois à l’appui », utilise **Started**. Pour un déplacement continu, **Triggered** et sa pin Action Value.\n\n' +
      'L’intérêt : changer une touche ou ajouter la manette se fait dans le Mapping Context, sans toucher aux graphes.',
  },
  {
    id: 'm-umg',
    theme: 'framework',
    title: 'Interfaces à l’écran (UMG)',
    summary: 'Widget Blueprint, Create Widget, Add to Viewport, et comment le mettre à jour.',
    keywords: ['widget', 'umg', 'hud', 'add to viewport', 'binding', 'bouton', 'texte', 'menu', 'input mode'],
    body:
      'Une interface (barre de vie, menu, dialogue) est un **Widget Blueprint** : un onglet Designer pour placer textes, images et boutons, un onglet Graph pour la logique.\n\n' +
      'Pour l’afficher : **Create Widget** (choisir la classe, Owning Player), garder le résultat dans une variable, puis **Add to Viewport**. Pour l’enlever : **Remove from Parent**.\n\n' +
      'Pour le mettre à jour, deux écoles.\n\n' +
      '- **Binding** d’une propriété : simple, mais la fonction est rappelée à chaque image, pour chaque widget. À éviter dès que l’interface grossit.\n' +
      '- **Piloté par événement** : le jeu annonce un changement (Event Dispatcher « OnSanteChange »), le widget s’y abonne et appelle Set Text ou Set Percent. Rien ne tourne quand rien ne change.\n\n' +
      'Un bouton expose ses événements (On Clicked) dans le graphe du widget.\n\n' +
      'Pour un menu : **Set Input Mode UI Only** (ou Game and UI) et **Show Mouse Cursor** sur le PlayerController ; **Set Input Mode Game Only** en revenant au jeu.\n\n' +
      'Le widget lit le jeu, il ne le contient pas : la santé vit dans le personnage, pas dans la barre de vie.',
  },
  {
    id: 'm-niveaux-sauvegarde',
    theme: 'framework',
    title: 'Niveaux et sauvegarde',
    summary: 'Open Level, GameInstance, Save Game to Slot.',
    keywords: ['open level', 'save game', 'load game', 'slot', 'gameinstance', 'checkpoint'],
    body:
      '**Open Level** détruit tous les acteurs du niveau courant et charge le suivant. Ce qui doit traverser va dans le **GameInstance** (Get Game Instance, puis Cast To vers ta classe).\n\n' +
      'Pour garder des données après la fermeture du jeu, on crée une classe **SaveGame** : un Blueprint qui ne contient que des variables (position, inventaire, quêtes).\n\n' +
      '- Sauver : **Create Save Game Object**, remplir ses variables, puis **Save Game to Slot** (un nom de slot, un index utilisateur).\n' +
      '- Charger : **Does Save Game Exist**, puis **Load Game from Slot**, **Cast To** ta classe SaveGame, et lire ses variables.\n\n' +
      'On ne sauve pas des références d’acteurs (ils n’existeront plus) mais ce qui permet de les retrouver : un identifiant, un nom, un état.\n\n' +
      'Les versions **Async** de ces nœuds évitent un à-coup pendant l’écriture.',
  },

  // ---------------------------------------------------------- communication
  {
    id: 'm-communication',
    theme: 'communication',
    title: 'Choisir comment communiquer',
    summary: 'Référence directe, Cast, interface ou Event Dispatcher.',
    keywords: ['cast', 'interface', 'dispatcher', 'reference', 'couplage'],
    lessons: ['l06-cle', 'l09-generateur', 'l10-dispatcher', 'l11-interface', 'l-salle-controle'],
    body:
      'Quatre outils, quatre questions.\n\n' +
      '- **Référence directe** (variable Instance Editable, réglée dans le niveau) : « je connais précisément cet acteur ». Le levier connaît sa porte.\n' +
      '- **Cast To** : « j’ai un acteur quelconque, est-ce un BP_Joueur ? ». Il donne accès à tout ce que la classe expose, mais lie les deux Blueprints.\n' +
      '- **Interface** : « je ne sais pas ce que c’est, mais s’il sait Interagir, qu’il le fasse ». Aucun lien entre les classes ; un acteur qui ne l’implémente pas ignore le message.\n' +
      '- **Event Dispatcher** : « je préviens, qui veut écoute ». Celui qui annonce ne connaît pas ses abonnés.\n\n' +
      'Le sens compte : celui qui **agit** a besoin d’une référence, d’un Cast ou d’une interface ; celui qui **informe** utilise un Dispatcher.\n\n' +
      'Un bon signe : si supprimer un Blueprint en casse cinq autres, il y a trop de Cast et pas assez d’interfaces.',
  },
  {
    id: 'm-trouver-acteur',
    theme: 'communication',
    title: 'Obtenir une référence',
    summary: 'D’où vient l’acteur à qui on parle : six sources, de la meilleure à la pire.',
    keywords: ['get player pawn', 'get all actors of class', 'instance editable', 'overlap', 'hit', 'spawn', 'owner'],
    lessons: ['l09-generateur', 'r1-afficheur', 'l-regarder'],
    body:
      'Avant de communiquer, il faut une référence. Elle peut venir :\n\n' +
      '- d’un **événement** : Other Actor d’un overlap, Hit Actor d’un Line Trace. C’est le monde qui te la donne ;\n' +
      '- du **niveau** : une variable Instance Editable réglée sur l’instance, avec la pipette ;\n' +
      '- de la **création** : le Return Value de Spawn Actor, à garder dans une variable ;\n' +
      '- du **framework** : Get Player Pawn, Get Player Controller, Get Game Mode, Get Game Instance, Get Owner ;\n' +
      '- d’un **enregistrement** : l’acteur s’inscrit lui-même auprès d’un gestionnaire au BeginPlay ;\n' +
      '- d’une **recherche** : Get Actor Of Class, Get All Actors Of Class. Simple mais coûteuse : une fois, au BeginPlay, jamais sur Tick.\n\n' +
      'Une référence peut être vide (jamais réglée) ou morte (acteur détruit) : **Is Valid** avant de s’en servir, dès qu’il y a un doute.',
  },

  // ---------------------------------------------------------------- donnees
  {
    id: 'm-references-memoire',
    theme: 'donnees',
    title: 'Références dures et souples',
    summary: 'Pourquoi un Cast peut alourdir tout le jeu, et comment l’éviter.',
    keywords: ['hard reference', 'soft reference', 'size map', 'reference viewer', 'async load', 'cast', 'memoire'],
    body:
      'Quand un Blueprint mentionne une autre classe (variable de ce type, Cast To, Spawn Actor avec cette classe), il crée une **référence dure** : charger l’un charge l’autre, avec ses meshes, ses textures, ses sons, et tout ce qu’eux-mêmes référencent.\n\n' +
      'Un personnage qui fait un Cast vers chaque ennemi, chaque arme et chaque menu finit par tout charger dès le premier niveau.\n\n' +
      'Pour le voir : clic droit sur un asset › **Size Map** (ce qu’il entraîne en mémoire) et **Reference Viewer** (qui référence qui).\n\n' +
      'Pour l’éviter :\n\n' +
      '- une **interface** au lieu d’un Cast : elle ne référence que l’interface ;\n' +
      '- un Cast vers une **classe parente légère** (sans assets) plutôt que vers l’enfant chargé ;\n' +
      '- une **Soft Object / Soft Class Reference** : un chemin vers l’asset, chargé seulement à la demande (Async Load Asset).\n\n' +
      'Un Cast vers une classe de toute façon toujours chargée (le personnage du joueur) ne coûte rien de plus.',
  },
  {
    id: 'm-data-tables',
    theme: 'donnees',
    title: 'Data Tables et Data Assets',
    summary: 'Sortir les données des graphes : objets, dialogues, quêtes.',
    keywords: ['data table', 'data asset', 'structure', 'row', 'csv', 'dialogue', 'quete'],
    lessons: ['l-fiche', 'l-codes'],
    body:
      'Les données d’un jeu (cent objets, deux cents lignes de dialogue) n’ont rien à faire dans des nœuds.\n\n' +
      'Une **Data Table** est un tableau dont chaque ligne suit une **structure** et porte un **Row Name** unique. On la remplit dans l’éditeur, ou on l’importe d’un fichier CSV ou JSON.\n\n' +
      '- **Get Data Table Row** : donne la ligne d’un Row Name, avec deux sorties, Row Found et Row Not Found.\n' +
      '- **Get Data Table Row Names** : la liste des lignes, pour les parcourir.\n\n' +
      'Une Data Table se lit, elle ne se modifie pas pendant le jeu : l’état qui change (quantité, quête finie) reste dans des variables.\n\n' +
      'Un **Data Asset** est un asset qui ne contient que des valeurs, un par objet (DA_Epee, DA_Potion). Plus pratique quand chaque entrée référence des meshes ou des sons, et qu’on veut les charger séparément.\n\n' +
      'Pour un jeu narratif : une table de dialogues (ligne = personnage, texte, ligne suivante), une table d’objets à examiner, une table de quêtes. Le Blueprint ne garde qu’un Row Name.',
  },
  {
    id: 'm-conteneurs',
    theme: 'donnees',
    title: 'Array, Set ou Map ?',
    summary: 'Trois conteneurs, trois usages, et la question de la copie.',
    keywords: ['array', 'set', 'map', 'tableau', 'copie', 'reference', 'find'],
    lessons: ['l-inventaire', 'l-codes', 'l-badges', 'd5-copie'],
    body:
      '- **Array** : une liste ordonnée, avec doublons possibles. On y accède par index, on la parcourt avec For Each Loop.\n' +
      '- **Set** : des valeurs uniques, sans ordre garanti. Parfait pour « l’ai-je déjà ? » (Contains est rapide).\n' +
      '- **Map** : des paires clé → valeur, chaque clé une seule fois. Parfait pour « quelle est la valeur de X ? » (Find).\n\n' +
      'Clés de Map et éléments de Set : seulement des types simples (Integer, Name, String, Enum, références). Ni Boolean, ni Rotator, ni Text.\n\n' +
      'Attention aux **copies** : Get (a copy), Array Element d’un For Each et la valeur d’un Find sont des copies. Les modifier ne change pas le conteneur. Pour changer un élément : Get (a ref), Set Array Elem, ou Add sur la Map avec la même clé (qui remplace).\n\n' +
      'Ne retire pas d’éléments d’un tableau pendant qu’un For Each le parcourt : des éléments seraient sautés. Parcours-le à l’envers, ou note d’abord quoi retirer.',
  },
  {
    id: 'm-string-name-text',
    theme: 'donnees',
    title: 'String, Name ou Text ?',
    summary: 'Trois types de texte qui ne servent pas à la même chose.',
    keywords: ['string', 'name', 'text', 'localisation', 'format text', 'majuscules'],
    lessons: ['l-badges'],
    body:
      '- **String** : du texte à manipuler (Append, découper, chercher). Coûteux à comparer, jamais traduit.\n' +
      '- **Name** : un identifiant. Très rapide à comparer, ignore les majuscules, ne se modifie pas. Pour un Row Name, un nom de socket, une étiquette.\n' +
      '- **Text** : ce que le joueur lit. C’est le seul type qui se **traduit** (localisation) et qui formate nombres et dates selon la langue.\n\n' +
      'Donc : tout ce qui s’affiche à l’écran est un **Text**, tout ce qui sert de clé est un **Name**, et String sert entre les deux, ou pour déboguer (Print String).\n\n' +
      '**Format Text** assemble un Text à partir d’un modèle avec des `{Emplacements}` : préférable à des Append, parce que l’ordre des mots change d’une langue à l’autre.',
  },

  // -------------------------------------------------------------------- jeu
  {
    id: 'm-collisions',
    theme: 'jeu',
    title: 'Collisions : Block, Overlap, Ignore',
    summary: 'Canaux, presets, et pourquoi un overlap ne se déclenche pas.',
    keywords: ['collision preset', 'object type', 'channel', 'block', 'overlap', 'ignore', 'generate overlap events', 'hit'],
    lessons: ['l03-interrupteur', 'l-barriere', 'l-regarder', 'l-caisse'],
    body:
      'Chaque composant qui collisionne a un **Object Type** (WorldStatic, WorldDynamic, Pawn…) et, pour chaque type et chaque canal de trace (Visibility, Camera), une réponse : **Block**, **Overlap** ou **Ignore**.\n\n' +
      'Entre deux composants, c’est la réponse la **moins forte** qui gagne : si l’un dit Block et l’autre Overlap, c’est Overlap ; si l’un dit Ignore, il ne se passe rien.\n\n' +
      'Les **Collision Presets** (BlockAll, OverlapAllDynamic, Pawn, Trigger, NoCollision…) sont des réglages tout faits.\n\n' +
      'Un overlap ne se déclenche pas ? Vérifie :\n\n' +
      '- **Generate Overlap Events** coché sur les **deux** composants ;\n' +
      '- Collision Enabled avec **Query** des deux côtés ;\n' +
      '- la réponse Overlap dans les **deux** sens.\n\n' +
      'Pour un **Event Hit** : réponse Block des deux côtés, et « Simulation Generates Hit Events » si c’est la physique qui déplace l’objet.\n\n' +
      'Un Line Trace sur le canal Visibility ne touche que ce qui **bloque** Visibility : une zone de déclenchement ne l’arrête pas.',
  },
  {
    id: 'm-temps',
    theme: 'jeu',
    title: 'Tick, Timer, Timeline ou Delay ?',
    summary: 'Quatre façons de faire quelque chose « dans le temps ».',
    keywords: ['tick', 'timer', 'timeline', 'delay', 'delta seconds', 'looping', 'finterp'],
    lessons: ['l08-refermer', 'l-porte-glisse', 'l-vagues', 'l-ascenseur', 'l12-station'],
    body:
      '- **Delay** : « attends, puis continue », une fois. Un appel pendant l’attente est ignoré.\n' +
      '- **Set Timer by Event** : « appelle cet événement dans X secondes », ou toutes les X secondes avec Looping. Il s’arrête avec son Timer Handle. C’est l’outil de tout ce qui est périodique.\n' +
      '- **Timeline** : une valeur qui suit une courbe pendant une durée connue. Pour une porte, un fondu, un ascenseur, avec Play et Reverse.\n' +
      '- **Event Tick** : à chaque image. Pour ce qui change vraiment en continu et sans fin connue (suivre une cible), toujours avec **Delta Seconds**.\n\n' +
      'Avant d’écrire sur Tick, demande-toi : « est-ce que j’attends qu’il se passe quelque chose ? » Si oui, c’est un événement, un Dispatcher ou un timer qu’il faut.\n\n' +
      'Dans UE, un acteur dont le Tick ne sert pas peut le couper : décoche **Start with Tick Enabled** dans Class Defaults, ou règle **Tick Interval** pour ne tourner que quelques fois par seconde. Set Actor Tick Enabled l’allume et l’éteint en jeu.',
  },
  {
    id: 'm-jeu-narratif',
    theme: 'jeu',
    title: 'Les briques d’un jeu narratif',
    summary: 'Interaction, dialogue, inventaire, quêtes : comment les découper.',
    keywords: ['dialogue', 'quete', 'inventaire', 'interaction', 'examiner', 'narratif', 'journal'],
    lessons: ['l-regarder', 'r3-bouton', 'l-inventaire', 'l-fiche', 'l-salle-controle'],
    body:
      'Un jeu d’exploration et de récit repose sur quelques systèmes, chacun avec un outil déjà vu.\n\n' +
      '- **Interaction** : un Line Trace depuis la caméra, puis un message d’interface (BPI_Interactif : Interagir, et une fonction qui renvoie le texte à afficher, « Examiner », « Ouvrir »). Le joueur ne connaît aucun objet.\n' +
      '- **Dialogue** : une Data Table (ligne = qui parle, texte, ligne suivante ou choix). Un composant garde la ligne en cours et annonce par Event Dispatcher ; le widget écoute et affiche.\n' +
      '- **Inventaire** : un Actor Component sur le joueur, avec une Map (identifiant d’objet → quantité). Les fiches des objets sont dans une Data Table.\n' +
      '- **Quêtes et état du monde** : un Set de Name (les faits acquis : « GenerateurRepare ») dans le GameInstance. Une porte demande « ce fait est-il connu ? » au lieu de connaître le générateur.\n' +
      '- **Sauvegarde** : ce Set, l’inventaire et la position suffisent souvent à tout restaurer.\n\n' +
      'Le fil conducteur : les objets du monde **annoncent** des faits, les systèmes **écoutent**. Personne ne se connaît directement.',
  },

  // ---------------------------------------------------------------- qualite
  {
    id: 'm-performance',
    theme: 'qualite',
    title: 'Ce qui coûte cher en Blueprint',
    summary: 'Les cinq habitudes qui ralentissent un jeu, et leur remède.',
    keywords: ['performance', 'tick', 'pure', 'get all actors', 'c++', 'boucle', 'optimisation'],
    lessons: ['r1-afficheur', 'l-fonctions', 'p3-random-pur'],
    body:
      'Un nœud Blueprint coûte plus qu’une ligne de C++, mais ce sont surtout les habitudes qui pèsent.\n\n' +
      '- **Tout sur Tick** : cent acteurs qui vérifient une condition à chaque image. Remède : événements, timers, Tick coupé par défaut.\n' +
      '- **Chercher au lieu de garder** : Get All Actors Of Class répété. Remède : une fois, puis une variable.\n' +
      '- **Nœuds purs lus plusieurs fois** : une fonction pure reliée à quatre pins est calculée quatre fois ; dans un For Each, à chaque tour. Remède : stocker le résultat dans une variable locale avant la boucle.\n' +
      '- **Grosses boucles** : des milliers de tours par image en Blueprint. Remède : répartir sur plusieurs images, ou passer cette partie en C++.\n' +
      '- **Bindings de widgets** : rappelés à chaque image. Remède : mise à jour par événement.\n\n' +
      'Mesure avant de corriger : dans UE, la console `stat fps` et `stat unit` montrent où part le temps, et **Unreal Insights** détaille par fonction.\n\n' +
      'Blueprint et C++ se complètent : la logique lourde et les systèmes de base en C++, l’assemblage et les réglages en Blueprint. Beaucoup de jeux sortent entièrement en Blueprint.',
  },
  {
    id: 'm-nommage',
    theme: 'qualite',
    title: 'Nommer et ranger',
    summary: 'Les préfixes d’assets et quelques règles pour des graphes lisibles.',
    keywords: ['prefixe', 'bp_', 'wbp_', 'bpi_', 'convention', 'dossier', 'categorie', 'comment'],
    body:
      'Les préfixes disent ce qu’est un asset sans l’ouvrir :\n\n' +
      '- **BP_** Blueprint Class · **BPI_** Interface · **BPC_** ou **AC_** Actor Component · **BFL_** Function Library\n' +
      '- **WBP_** Widget · **E_** Enum · **S_** ou **F_** Structure · **DT_** Data Table · **DA_** Data Asset\n' +
      '- **SM_** Static Mesh · **SK_** Skeletal Mesh · **M_** Material · **MI_** Material Instance · **T_** Texture\n' +
      '- **IA_** Input Action · **IMC_** Input Mapping Context\n\n' +
      'Dans un Blueprint :\n\n' +
      '- un Boolean se lit comme une question : `bEstOuverte`, `bALaCle` (UE masque le « b » à l’affichage) ;\n' +
      '- une fonction commence par un verbe : Ouvrir, CalculerDegats ;\n' +
      '- un Event Dispatcher dit ce qui vient d’arriver : OnPorteOuverte ;\n' +
      '- range les variables par **Category**, et donne-leur une **Tooltip**.\n\n' +
      'Pour les graphes : le fil blanc va de gauche à droite, un **Comment** par intention, des **Reroute** plutôt que des fils qui passent sous les nœuds, et une fonction dès qu’un morceau se répète.',
  },
  {
    id: 'm-debogage-ue',
    theme: 'qualite',
    title: 'Déboguer dans UE',
    summary: 'Les outils de l’éditeur qui correspondent à ceux de BP Trainer.',
    keywords: ['breakpoint', 'watch', 'debug object', 'output log', 'print string', 'step', 'blueprint debugger'],
    lessons: ['d1-accessed-none'],
    body:
      'Ce que tu fais ici existe tel quel dans l’éditeur d’UE.\n\n' +
      '- **Print String** : le réflexe. Sa pin Key évite d’empiler cent fois le même message.\n' +
      '- **Breakpoint** : F9 sur un nœud. Le jeu s’arrête avant lui ; F10 avance d’un nœud, F11 entre dans la fonction.\n' +
      '- **Watch** : clic droit sur une pin › Watch this value, pour voir sa valeur en continu.\n' +
      '- **Debug Object** : le menu déroulant en haut de l’éditeur de Blueprint. Tant qu’aucune instance n’y est choisie, les fils ne s’animent pas, et avec plusieurs instances tu regardes peut-être la mauvaise.\n' +
      '- **Output Log** et **Message Log** : les erreurs Accessed None y sont listées à la fin de la partie, avec un lien vers le nœud.\n' +
      '- **Blueprint Debugger** (menu Tools › Debug) : pile d’appels, breakpoints et valeurs surveillées au même endroit.\n' +
      '- **Draw Debug** (Line, Sphere, String) : dessiner dans le monde ce que le graphe calcule.\n\n' +
      'Pendant Play, **F8** détache la caméra du joueur (Eject) pour sélectionner un acteur et lire ses variables dans Details.',
  },

  // ---------------------------------------------------------------- editeur
  {
    id: 'm-raccourcis',
    theme: 'editeur',
    title: 'Raccourcis de l’éditeur de Blueprints',
    summary: 'Poser les nœuds courants d’une touche, ranger les fils.',
    keywords: ['raccourci', 'clavier', 'branch', 'sequence', 'delay', 'reroute', 'aligner', 'compile'],
    body:
      'Le jour où tu as un clavier, ceux-ci font gagner des heures. Maintiens la touche et clique dans le graphe :\n\n' +
      '- **B** Branch · **S** Sequence · **D** Delay · **F** For Each Loop\n' +
      '- **G** Gate · **O** Do Once · **N** Do N · **M** MultiGate · **P** Event BeginPlay\n' +
      '- **C** (avec une sélection) : Comment autour\n\n' +
      'Variables : glisser depuis My Blueprint avec **Ctrl** pose un Get, avec **Alt** un Set.\n\n' +
      'Fils :\n\n' +
      '- **Alt + clic** sur une pin : rompre ses liens ;\n' +
      '- **Ctrl + glisser** depuis une pin : déplacer ses fils vers une autre ;\n' +
      '- **double-clic** sur un fil : Reroute ;\n' +
      '- **Q** : redresser les connexions de la sélection.\n\n' +
      'Et aussi : **F7** Compile · **F9** breakpoint · **Ctrl + F** chercher dans le Blueprint · **Ctrl + Shift + F** chercher dans tous les Blueprints · **Ctrl + D** dupliquer · double-clic sur un nœud de fonction pour l’ouvrir.',
  },
  {
    id: 'm-autres-graphes',
    theme: 'editeur',
    title: 'Les autres éditeurs à nœuds',
    summary: 'Animation, matériaux, Niagara, IA : mêmes gestes, autres règles.',
    keywords: ['animation blueprint', 'material', 'niagara', 'behavior tree', 'state machine', 'control rig'],
    body:
      'UE a d’autres graphes qui ressemblent aux Blueprints sans en être.\n\n' +
      '- **Animation Blueprint** : choisit la pose du personnage. Son Event Graph est un vrai Blueprint (il lit la vitesse, l’état) ; son Anim Graph, avec ses State Machines, est évalué en continu et n’a pas de fil blanc.\n' +
      '- **Material Editor** : décrit la couleur de chaque pixel. Pas de fil blanc non plus : tout est calculé par la carte graphique. Une Material Instance en change les paramètres sans recompiler.\n' +
      '- **Niagara** : les effets de particules, par modules empilés.\n' +
      '- **Behavior Tree** et **Blackboard** : les décisions d’une IA. L’arbre choisit quoi faire, le Blackboard est sa mémoire ; les tâches, elles, s’écrivent en Blueprint.\n' +
      '- **Sequencer** : une table de montage pour les cinématiques, qui peut déclencher des événements Blueprint.\n\n' +
      'Ce que tu sais déjà sert partout : pins typées, variables, fonctions, références. Ce qui change, c’est **quand** le graphe est évalué.',
  },
];

export function getMemo(id: string): MemoCard | undefined {
  return MEMO.find((m) => m.id === id);
}
