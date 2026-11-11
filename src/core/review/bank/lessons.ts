/**
 * Review questions on the lessons of the path: one idea each, the one the
 * lesson's "À retenir" keeps. The first option is the right answer.
 */
import type { QuizQuestion } from '../types';

const q = (lesson: string, question: string, options: string[], why: string, n = 1): QuizQuestion => ({
  id: n === 1 ? lesson : `${lesson}#${n}`,
  lesson,
  question,
  options,
  why,
});

export const LESSON_QUIZ: QuizQuestion[] = [
  // ------------------------------------------------------------- Débutant
  q(
    'l01-bonjour',
    'Tu poses un Print String dans l’Event Graph, sans aucun fil blanc. Que se passe-t-il au Play ?',
    ['Rien : aucun événement ne l’exécute', 'Il s’exécute une fois au lancement', 'Il s’exécute à chaque image', 'Le Blueprint ne compile pas'],
    'Rien ne s’exécute sans événement : le fil blanc part d’un événement (BeginPlay, une touche, un overlap…) et passe de nœud en nœud.',
  ),
  q(
    'l02-lampe',
    'À quoi sert la pin Target d’un nœud comme Set Visibility ?',
    ['À désigner le composant sur lequel le nœud agit', 'À choisir la valeur à appliquer', 'À dire quel événement le déclenche', 'À rien quand le nœud est dans le bon Blueprint'],
    'Un nœud agit sur ce qui est branché sur Target : on place la référence du composant dans le graphe et on la relie à Target.',
  ),
  q(
    'l03-interrupteur',
    'Une Box Collision a Collision Enabled sur No Collision. Le joueur la traverse. Que reçoit le Blueprint ?',
    ['Aucun événement d’overlap', 'Begin Overlap seulement', 'Begin puis End Overlap', 'Event Hit'],
    'Un overlap ne se déclenche qu’avec une collision qui fait des requêtes (Query Only ou Query and Physics).',
  ),
  q(
    'l04-touche',
    'Ton acteur a un événement de touche E, mais rien ne se passe quand tu appuies. Que vérifier en premier ?',
    ['Auto Receive Input dans Class Settings', 'Que la variable est Instance Editable', 'Que le Blueprint a une Box Collision', 'Que l’événement est relié à un Delay'],
    'Sans Auto Receive Input (Player 0), un acteur qui n’est pas le pion du joueur n’entend pas les touches.',
  ),
  q(
    'l-compteur',
    'Un nœud Set (Score = Score + 1) est posé dans le graphe, mais aucun fil blanc n’y arrive. Que vaut Score après dix secondes de jeu ?',
    ['Sa valeur de départ : le Set ne s’exécute jamais', 'Sa valeur de départ + 1', 'Il augmente à chaque image', 'Zéro'],
    'Un Set ne change la variable que quand le fil blanc passe par lui.',
  ),
  q(
    'l-barriere',
    'Tu appelles Set Actor Hidden In Game (coché) sur une barrière qui bloque le joueur. Résultat ?',
    ['Elle est invisible mais bloque toujours', 'Elle est invisible et on la traverse', 'Elle reste visible mais on la traverse', 'Elle est détruite'],
    'Cacher ne change que l’affichage. Pour laisser passer, c’est Set Collision Enabled (No Collision).',
  ),
  q(
    'c1-torche',
    'Une pin rouge, c’est une pin de quel type ?',
    ['Boolean', 'Integer', 'String', 'Object Reference'],
    'La couleur d’une pin dit son type : rouge pour Boolean, vert pour les nombres, rose pour String, bleu pour une référence d’objet.',
  ),
  q(
    'p6-division',
    'Que donne 7 divisé par 2 avec le nœud de division des Integer ?',
    ['3', '3.5', '4', 'Une erreur'],
    'Entre deux Integer, la division est entière : le reste est jeté, sans arrondi. Pour 3,5, il faut diviser des Float.',
  ),

  // -------------------------------------------------------- Intermédiaire
  q(
    'p1-sequence-delay',
    'Un Sequence a un Delay de 2 s sur Then 0. Quand Then 1 s’exécute-t-il ?',
    ['Tout de suite, dans la même image', 'Après 2 secondes', 'Jamais tant que le Delay n’est pas fini', 'Avant Then 0'],
    'Un Delay ne bloque que la chaîne où il se trouve : Sequence passe aussitôt à la sortie suivante.',
  ),
  q(
    'l05-porte',
    'Un Do Once a déjà laissé passer une exécution. Comment le rouvrir ?',
    ['En entrant par sa pin Reset', 'En attendant une seconde', 'Il se rouvre à chaque image', 'On ne peut pas : il faut relancer la partie'],
    'Do Once reste fermé jusqu’à ce que le fil blanc entre par Reset.',
  ),
  q(
    'l06-cle',
    'Cast To BP_Joueur reçoit un acteur qui n’est pas le joueur. Que se passe-t-il ?',
    ['Il sort par Cast Failed, sans erreur', 'Une erreur Accessed None s’affiche', 'Il sort par la pin du haut avec une référence vide', 'Le jeu s’arrête'],
    'Un Cast raté n’est pas une erreur : c’est une réponse (« ce n’est pas un BP_Joueur »).',
  ),
  q(
    'l07-verrou',
    'Que faut-il pour lire, depuis la porte, la variable ALaCle du joueur ?',
    ['Une référence vers le joueur', 'Une variable du même nom dans la porte', 'Que la variable soit Private', 'Un Event Tick dans le joueur'],
    'Lire la variable d’un autre Blueprint demande une référence vers lui (par exemple le résultat d’un Cast To sur Other Actor).',
  ),
  q(
    'l08-refermer',
    'Un Delay de 2 s est en cours depuis 1 s quand le fil blanc y entre à nouveau. Quand sort-il par Completed ?',
    ['1 s plus tard : le second appel est ignoré', '2 s plus tard : l’attente repart de zéro', 'Deux fois : à 1 s puis à 2 s', 'Jamais'],
    'Un Delay en cours ignore les nouveaux appels. Pour repartir de zéro à chaque appel, c’est Retriggerable Delay.',
  ),
  q(
    'p2-forloop-delay',
    'Un For Loop de 0 à 2 a un Delay de 1 s dans son Loop Body. Combien de fois la suite du Delay s’exécute-t-elle ?',
    ['Une seule fois', 'Trois fois, à une seconde d’intervalle', 'Trois fois en même temps', 'Aucune'],
    'La boucle tourne d’un coup dans la même image : le premier tour lance le Delay, les deux autres sont ignorés.',
  ),
  q(
    'l-digicode',
    'Un Switch on Int a les sorties 0, 1 et 2. Il reçoit 7. Par où sort-il ?',
    ['Par Default', 'Par 2, la plus proche', 'Par aucune sortie', 'Par 0'],
    'Default prend toutes les valeurs qui n’ont pas leur pin : c’est là qu’on gère les cas imprévus.',
  ),
  q(
    'p7-gate',
    'Un Gate est fermé. Le fil blanc entre par sa pin Open. Que se passe-t-il ?',
    ['Il s’ouvre, mais rien ne sort par Exit', 'Il s’ouvre et le fil blanc sort par Exit', 'Rien : Open ne marche que s’il est déjà ouvert', 'Il se ferme'],
    'Open, Close et Toggle changent l’état du Gate. Seul ce qui entre par Enter, porte ouverte, ressort par Exit.',
  ),
  q(
    'l-etats-porte',
    'Dans une machine à états, la sortie « Fermée » du Switch on Enum ouvre la porte mais ne fait pas de Set de l’état. Au prochain passage ?',
    ['Le Switch reprend la sortie « Fermée »', 'Il passe tout seul à « Ouverte »', 'Il sort par Default', 'Une erreur s’affiche'],
    'Chaque sortie doit mettre à jour l’état (Set) : le Switch ne fait que lire la variable.',
  ),
  q(
    'r2-feux',
    'Une chaîne de Branch compare la même Enum à chacune de ses valeurs. Par quoi la remplacer ?',
    ['Un Switch on Enum', 'Un For Each Loop', 'Un Sequence', 'Un Gate'],
    'Refactorer, c’est réécrire sans changer ce que ça fait : un Switch a une sortie par valeur.',
  ),
  q(
    'l-inventaire',
    'Un For Each Loop parcourt un tableau de 5 éléments. Que se passe-t-il ?',
    ['Loop Body s’exécute 5 fois dans la même image, puis Completed', 'Loop Body s’exécute une fois par image pendant 5 images', 'Completed s’exécute d’abord', 'Seul le premier élément est traité'],
    'Une boucle tourne d’un coup : toute la liste est parcourue avant que quoi que ce soit d’autre se passe.',
  ),
  q(
    'l-codes',
    'Find cherche dans une Map (Name → Integer) une clé qui n’y est pas. Résultat ?',
    ['Return Value faux, Value à 0, aucune erreur', 'Une erreur Accessed None', 'Return Value vrai, Value à -1', 'Le fil blanc s’arrête'],
    'Find sur une clé absente renvoie la valeur par défaut du type, sans erreur : teste toujours Return Value.',
  ),
  q(
    'p3-random-pur',
    'Un seul Random Integer in Range est relié à deux Print String. Qu’affichent-ils ?',
    ['Deux tirages, qui peuvent être différents', 'Toujours le même nombre', 'Le second affiche 0', 'Une erreur de compilation'],
    'Un nœud pur est recalculé à chaque lecture. Pour réutiliser la même valeur, stocke-la dans une variable.',
  ),
  q(
    'l-porte-glisse',
    'Un Timeline est arrivé à la fin. Le fil blanc entre par Play. Que se passe-t-il ?',
    ['Il ne rejoue pas : il est déjà à la fin', 'Il repart du début', 'Il revient en arrière', 'Il tourne en boucle'],
    'Play reprend là où le Timeline en est. Pour recommencer : Play from Start ; pour revenir : Reverse.',
  ),
  q(
    'c3-projecteur',
    'Un Timeline joue, mais sa sortie Update n’est reliée à rien. Que voit-on ?',
    ['Rien ne change : le Timeline ne fait que donner une valeur', 'L’acteur se déplace tout seul', 'La lumière clignote', 'Une erreur de compilation'],
    'Un Timeline ne modifie rien lui-même : c’est le nœud branché sur Update qui agit, avec la valeur de la piste.',
  ),

  // -------------------------------------------------------------- Confirmé
  q(
    'l09-generateur',
    'Une variable de type BP_Lampe (Object Reference) n’a jamais été réglée. Que contient-elle ?',
    ['None : elle ne désigne aucun acteur', 'La première lampe du niveau', 'Une lampe créée automatiquement', 'Le Blueprint lui-même'],
    'Une référence est vide tant qu’on ne lui donne pas d’acteur. Is Valid évite Accessed None.',
  ),
  q(
    'd1-accessed-none',
    'L’Output Log affiche « Accessed None trying to read property MaLampe ». Que chercher ?',
    ['Pourquoi la référence MaLampe est vide', 'Une erreur de type sur une pin', 'Une boucle infinie', 'Un nœud non relié au fil blanc'],
    'Le message nomme la référence vide : vérifie l’instance dans le niveau (Instance Editable) ou le Set qui devait la remplir.',
  ),
  q(
    'l10-dispatcher',
    'Une lampe fait son Bind sur l’Event Dispatcher du générateur après que celui-ci a fait Call. Que reçoit-elle ?',
    ['Rien pour cet appel : seulement les suivants', 'L’appel, avec un peu de retard', 'Tous les appels passés d’un coup', 'Une erreur'],
    'Seuls les Call faits après le Bind sont reçus : on s’abonne tôt, au BeginPlay.',
  ),
  q(
    'l11-interface',
    'Tu envoies un message d’interface à un acteur qui n’implémente pas l’interface. Que se passe-t-il ?',
    ['Rien, et aucune erreur', 'Une erreur Accessed None', 'Le message part vers l’acteur le plus proche', 'Cast Failed'],
    'Seuls les acteurs qui implémentent l’interface réagissent ; les autres ignorent le message.',
  ),
  q(
    'd2-interface-oubliee',
    'Où déclare-t-on qu’un Blueprint implémente une interface ?',
    ['Class Settings › Implemented Interfaces', 'Dans My Blueprint › Variables', 'Dans le Level Blueprint', 'Dans Details de chaque instance'],
    'Sans l’interface dans Class Settings, le message est ignoré sans erreur : c’est la première chose à vérifier.',
  ),
  q(
    'l-qui-modifie',
    'Une variable est marquée Private. Qui peut la lire ou la modifier ?',
    ['Seulement son propre Blueprint', 'Tous les Blueprints du projet', 'Seulement ses enfants', 'Personne pendant le jeu'],
    'Chaque Blueprint garde la main sur ses variables : les autres passent par une fonction ou un Event Dispatcher.',
  ),
  q(
    'l-locales',
    'Une variable locale vaut 12 à la fin d’un appel de fonction. Que vaut-elle au début de l’appel suivant ?',
    ['Sa valeur par défaut', '12', '24', 'None'],
    'Une variable locale vit le temps d’un appel et repart de sa valeur par défaut au suivant.',
  ),
  q(
    'p4-locale',
    'Où garder un total qui doit durer d’un appel de fonction à l’autre ?',
    ['Dans une variable du Blueprint', 'Dans une variable locale', 'Dans une pin d’entrée', 'Dans un nœud pur'],
    'Ce qui doit durer va dans une variable du Blueprint ; la locale sert aux calculs intermédiaires.',
  ),
  q(
    'l-fiche',
    'Tu construis une structure avec Make en ne reliant que le membre Charge. Que valent les autres membres ?',
    ['Leur valeur par défaut', 'Leur ancienne valeur dans la variable', 'None : une erreur s’affiche', 'La même valeur que Charge'],
    'Make construit une structure entière. Pour changer un seul membre en gardant les autres : Set Members in.',
  ),
  q(
    'd5-copie',
    'Dans un For Each Loop, tu modifies Array Element avec Set Members in. Le tableau change-t-il ?',
    ['Non : Array Element est une copie', 'Oui, l’élément en cours est modifié', 'Oui, tous les éléments sont modifiés', 'Une erreur s’affiche'],
    'Array Element et Get (a copy) donnent une copie. Pour changer un élément : Get (a ref) ou Set Array Elem.',
  ),
  q(
    'p8-copie-tableau',
    'Après « Set B = A » sur deux variables de tableau, tu ajoutes un élément à A. Que devient B ?',
    ['B ne change pas : le Set avait copié le contenu', 'B reçoit aussi l’élément', 'B est vidé', 'Une erreur s’affiche'],
    'Un Set copie toute la valeur d’un tableau ou d’une structure : les deux variables ne partagent rien.',
  ),
  q(
    'l-badges',
    'Dans un Set de Name, tu ajoutes « Rouge » puis « rouge ». Combien d’éléments contient-il ?',
    ['Un', 'Deux', 'Aucun', 'Ça dépend de l’ordre'],
    'Un Set garde chaque valeur une seule fois, et un Name ignore les majuscules.',
  ),
  q(
    'l-rangee-lampes',
    'Quand le Construction Script d’un acteur placé dans le niveau s’exécute-t-il ?',
    ['Dans l’éditeur à chaque réglage, puis à l’apparition, avant BeginPlay', 'À chaque image pendant la partie', 'Seulement après BeginPlay', 'Quand une variable change en jeu'],
    'Il prépare l’acteur à partir de ses variables et ne tourne plus pendant la partie.',
  ),
  q(
    'p5-ordre',
    'Dans quel ordre un acteur passe-t-il par ces étapes ?',
    ['Construction Script, BeginPlay, Tick', 'BeginPlay, Construction Script, Tick', 'Tick, BeginPlay, Construction Script', 'BeginPlay, Tick, Construction Script'],
    'Un acteur se construit, puis commence à jouer, puis vit image après image.',
  ),
  q(
    'l-ordre-beginplay',
    'Au BeginPlay, A lit une variable que B règle dans son propre BeginPlay. Est-ce fiable ?',
    ['Non : l’ordre des BeginPlay entre acteurs n’est pas garanti', 'Oui, les BeginPlay suivent l’ordre du niveau', 'Oui, si A est placé après B', 'Oui, si B est plus petit'],
    'Un Blueprint ne doit jamais compter sur le fait qu’un autre a déjà fait son BeginPlay.',
  ),
  q(
    'd4-une-sur-deux',
    'Où mettre une valeur qui doit être vraie dès le départ, avant tout BeginPlay ?',
    ['Dans la valeur par défaut de la variable', 'Dans un Set au BeginPlay', 'Dans un Set sur Tick', 'Dans un Delay de 0,1 s'],
    'Un bug « une fois sur deux » vient souvent d’un ordre supposé entre acteurs : la valeur par défaut, elle, est toujours là.',
  ),
  q(
    'l-vagues',
    'Juste après Spawn Actor, tu fais un Set d’une variable du nouvel acteur. Son BeginPlay a-t-il vu cette valeur ?',
    ['Non : il a déjà tourné, avec la valeur par défaut', 'Oui, le Set passe avant', 'Oui, si le Set est dans la même image', 'Ça dépend du nombre d’acteurs'],
    'Ce qu’un acteur doit savoir dès son BeginPlay se donne par Expose on Spawn, pas par un Set après.',
  ),
  q(
    'd3-tourelle',
    'Un acteur est détruit. Que devient la variable d’un autre Blueprint qui le désignait ?',
    ['Elle pointe vers un acteur qui n’existe plus : Is Valid répond faux', 'Elle désigne automatiquement un autre acteur', 'Elle fait planter le jeu tout de suite', 'Elle est supprimée du Blueprint'],
    'Détruire un acteur ne prévient personne : vérifie les références avec Is Valid avant de t’en servir.',
  ),
  q(
    'l-ascenseur',
    'Sur Tick, tu déplaces un acteur de 5 unités à chaque image. Quel est le problème ?',
    ['Sa vitesse dépend du nombre d’images par seconde', 'Il ne bouge pas', 'Tick ne s’exécute qu’une fois', 'Il se téléporte au hasard'],
    'Une vitesse se multiplie par Delta Seconds : le mouvement dépend alors du temps écoulé.',
  ),

  // ---------------------------------------------------------------- Avancé
  q(
    'l-fonctions',
    'La sortie d’une fonction pure est reliée à trois nœuds qui s’exécutent. Combien de fois la fonction est-elle calculée ?',
    ['Trois fois : à chaque lecture', 'Une fois, le résultat est gardé', 'Aucune tant qu’on ne l’appelle pas', 'Une fois par image'],
    'Une fonction pure s’exécute à chaque lecture de sa sortie ; une fonction impure une fois, quand le fil blanc passe.',
  ),
  q(
    'c2-factorielle',
    'Une fonction s’appelle elle-même sans condition d’arrêt. Que se passe-t-il ?',
    ['« Infinite loop detected » : l’exécution est interrompue', 'Elle tourne en silence pour toujours', 'Elle s’arrête après 10 appels', 'Elle renvoie 0'],
    'Une récursion a besoin d’un cas où elle ne s’appelle plus.',
  ),
  q(
    'l-terminal',
    'Une fonction d’interface a une sortie. Comment un Blueprint l’implémente-t-il ?',
    ['Comme une fonction, avec son propre graphe', 'Comme un Event dans l’Event Graph', 'Comme un Custom Event', 'Avec un Event Dispatcher'],
    'Avec une sortie, c’est une fonction ; sans sortie, c’est un Event. Et un acteur qui ne l’implémente pas renvoie la valeur par défaut.',
  ),
  q(
    'l-detruire',
    'Quel est le bon moment pour retirer un acteur des listes qui le désignent ?',
    ['Son Event Destroyed', 'Son BeginPlay', 'Le Tick des autres acteurs', 'Jamais : UE le fait seul'],
    'Un acteur détruit reste dans les tableaux et variables qui le désignent : Event Destroyed sert à prévenir les autres.',
  ),
  q(
    'r1-afficheur',
    'Pourquoi éviter Get All Actors Of Class sur Event Tick ?',
    ['Il parcourt tout le niveau à chaque image : c’est coûteux', 'Il ne marche qu’au BeginPlay', 'Il renvoie un tableau vide sur Tick', 'Il détruit les acteurs trouvés'],
    'On cherche une fois, au BeginPlay, et on garde le résultat dans une variable.',
  ),
  q(
    'l12-station',
    'Tu veux faire baisser le carburant d’un point chaque seconde. Quel outil, plutôt qu’un Tick ?',
    ['Set Timer by Event, avec Looping', 'Un Delay sur Event Tick', 'Un For Loop de 0 à 60', 'Un Do Once'],
    'Un timer répété exécute un événement à intervalle fixe, sans rien faire entre deux.',
  ),
  q(
    'l-heritage',
    'Un Blueprint enfant redéfinit BeginPlay sans appeler « Parent: BeginPlay ». Que devient le BeginPlay du parent ?',
    ['Il ne s’exécute plus pour cet enfant', 'Il s’exécute avant celui de l’enfant', 'Il s’exécute après celui de l’enfant', 'Les deux s’exécutent en même temps'],
    'Redéfinir remplace la version du parent ; « Parent: … » la rappelle, à l’endroit voulu.',
  ),
  q(
    'l-salle-controle',
    'Un Blueprint doit prévenir « mon état a changé » sans connaître ceux que ça intéresse. Quel outil ?',
    ['Un Event Dispatcher', 'Un Cast To vers chacun', 'Une variable Private', 'Un Line Trace'],
    'L’Event Dispatcher annonce ; ceux qui écoutent s’abonnent. L’interface, elle, sert à agir sur un objet sans connaître sa classe.',
  ),
  q(
    'l-regarder',
    'Pour un Line Trace de 300 cm devant l’acteur, que donner à End ?',
    ['Start + Forward Vector × 300', 'Forward Vector × 300', 'Forward Vector', '300'],
    'Start et End sont deux positions dans le monde : avec la direction seule, le rayon partirait vers l’origine du niveau.',
  ),
  q(
    'd6-tourelle-aveugle',
    'Un Line Trace part du centre de l’acteur avec Ignore Self décoché. Que touche-t-il ?',
    ['L’acteur lui-même, à la distance 0', 'Le premier mur', 'Rien du tout', 'Le joueur, toujours'],
    'Un rayon s’arrête au premier objet qui le bloque, y compris celui qui le lance.',
  ),
  q(
    'r3-bouton',
    'Quelle question un Line Trace permet-il de poser, qu’une zone d’overlap ne pose pas ?',
    ['« Que regarde-t-on ? »', '« Qui est près ? »', '« Combien d’acteurs existent ? »', '« Quelle touche est pressée ? »'],
    'Une zone répond à « qui est près ? », un rayon à « que regarde-t-on ? ».',
  ),
  q(
    'l-caisse',
    'Le joueur reste appuyé contre une caisse. Combien de fois Event Hit se déclenche-t-il ?',
    ['À chaque image, tant que le contact dure', 'Une fois au début du contact', 'Une fois au début, une fois à la fin', 'Une fois par seconde'],
    'Il n’existe pas d’événement de fin de contact : un Do Once rouvert par un Retriggerable Delay donne « une fois par contact ».',
  ),
];
