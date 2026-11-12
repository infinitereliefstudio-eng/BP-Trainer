/**
 * The glossary: what each notion named by a lesson is, when to reach for it
 * and what goes wrong with it. Notions that are simply a node take their text
 * from the node itself (core/reference/glossary.ts); this file covers the
 * ideas, and the nodes that deserve more than their description.
 */
export interface GlossaryEntry {
  /** Shown as the card's title. */
  title: string;
  /** Lesson notions this entry explains (case and accents ignored). */
  names: string[];
  /** What it is, in two or three sentences. */
  what: string;
  /** When to use it, and when not to. */
  when?: string;
  trap?: string;
  /** A typical wiring, nodes separated by « → ». */
  pattern?: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  // --------------------------------------------------------------- l’éditeur
  {
    title: 'Compile et Play',
    names: ['Compile', 'Play'],
    what: 'Compile vérifie le Blueprint et signale les erreurs (pin obligatoire vide, types incompatibles). Play lance le jeu : les événements se déclenchent et le fil blanc s’exécute.',
    when: 'Compile après chaque changement ; Play pour voir. Vérifier joue la leçon à ta place et dit ce qui manque.',
    trap: 'Un Blueprint qui compile n’est pas un Blueprint qui marche : la compilation ne sait pas ce que tu voulais faire.',
  },
  {
    title: 'Output Log',
    names: ['Output Log'],
    what: 'Le journal du jeu : chaque Print String s’y écrit, avec les erreurs d’exécution (Accessed None, boucle infinie) et le nœud en cause.',
    when: 'Premier endroit où regarder quand « rien ne se passe » : soit une erreur y est écrite, soit ton Print String n’y est pas, et c’est que le fil blanc n’est pas passé par là.',
  },
  {
    title: 'Événement',
    names: ['Event BeginPlay', 'BeginPlay'],
    what: 'Un événement (en-tête rouge) est le point de départ d’un fil blanc. Event BeginPlay se déclenche une fois, quand l’acteur entre en jeu.',
    when: 'BeginPlay pour préparer : régler un état de départ, s’abonner à un Dispatcher, lancer un timer.',
    trap: 'Chaque acteur a son BeginPlay et leur ordre n’est pas garanti : au BeginPlay, ne compte pas sur ce qu’un autre acteur règle dans le sien.',
    pattern: 'Event BeginPlay → Print String',
  },
  {
    title: 'Composants',
    names: ['Composants', 'Point Light', 'Box Collision'],
    what: 'Un Blueprint est un assemblage de composants : un Static Mesh (ce qu’on voit), une Point Light (une lumière), une Box Collision (une zone qui détecte). Chacun a ses propriétés dans Details.',
    when: 'Pour agir sur un composant pendant le jeu, place sa référence dans le graphe (Get, dans My Blueprint) et relie-la à la pin Target du nœud.',
    trap: 'Les propriétés réglées dans Details sont l’état au lancement. Ce qui change pendant le jeu passe par des nœuds.',
  },
  {
    title: 'Target',
    names: ['Target'],
    what: 'La pin Target dit sur quoi le nœud agit. Laissée vide, elle vaut « self » : l’acteur lui-même, ce qui ne convient que si le nœud agit sur un acteur.',
    when: 'Dès qu’un nœud vise un composant (Set Visibility, Set Intensity…) ou un autre acteur : relie la bonne référence à Target.',
    trap: 'Target relié à une référence vide donne Accessed None à l’exécution, pas à la compilation.',
    pattern: 'Get Lumiere → Target de Set Visibility',
  },
  {
    title: 'Overlap',
    names: ['Begin / End Overlap', 'Other Actor', 'Event ActorBeginOverlap', 'Event ActorEndOverlap', 'Overlap ou visée'],
    what: 'Quand un acteur entre dans une zone de collision, le moteur déclenche Begin Overlap ; quand il en sort, End Overlap. La pin Other Actor dit qui est entré ou sorti.',
    when: 'Pour réagir à une présence : ouvrir à l’approche, ramasser au contact. Pour agir sur ce que le joueur regarde, c’est un Line Trace.',
    trap: 'N’importe quel acteur déclenche l’overlap, pas seulement le joueur : vérifie Other Actor (Cast To BP_Joueur) quand seul le joueur doit compter.',
    pattern: 'Event ActorBeginOverlap → Cast To BP_Joueur → …',
  },
  {
    title: 'Touches',
    names: ['Input E'],
    what: 'Un événement de touche a deux sorties : Pressed à l’appui, Released au relâchement.',
    when: 'Pour une action du joueur. Dans un vrai projet UE5, on passe par Enhanced Input ; le principe reste le même.',
    trap: 'Un acteur qui n’est pas le pion du joueur n’entend les touches que si Auto Receive Input est activé dans Class Settings.',
  },
  // -------------------------------------------------------------- variables
  {
    title: 'Variable',
    names: ['Variable Boolean', 'Variable Integer', 'Get / Set', 'Variable du Blueprint', 'Valeur par défaut'],
    what: 'Une variable garde une valeur d’un événement à l’autre : un Boolean (vrai ou faux), un Integer (nombre entier), un Float (à virgule)… Get lit sa valeur du moment, Set la change. Sa valeur par défaut est celle qu’elle a au lancement.',
    when: 'Dès que le Blueprint doit se souvenir : un état (ouvert, allumé), un compteur, une référence.',
    trap: 'Un Set a des pins blanches : il ne change rien tant que le fil d’exécution ne passe pas par lui. Un Get lit la valeur au moment où un nœud exécuté la demande.',
    pattern: 'Get Score → + 1 → Set Score',
  },
  {
    title: 'Types des pins',
    names: ['Types des pins', 'Integer et Float', 'Division entière', 'Comparer deux Integer', '>= (Integer)', 'Rotator'],
    what: 'La couleur d’une pin dit son type : rouge Boolean, vert clair Integer, vert Float, rose String, jaune Vector, violet Rotator, bleu référence. Un fil ne relie que des types compatibles ; certains se convertissent tout seuls (Integer vers String).',
    when: 'Choisis le nœud du bon type : + (Integer) ou + (Float), >= (Integer)… Un Rotator est une rotation en degrés (Roll, Pitch, Yaw) ; vu de dessus, c’est Yaw (Z) qui tourne.',
    trap: 'Entre deux Integer, la division est entière : 7 / 2 donne 3. Pour garder la virgule, divise des Float.',
  },
  {
    title: 'Instance Editable',
    names: ['Instance Editable', 'Details d’une instance', 'Variable Object Reference', 'Garder une référence'],
    what: 'Une variable Instance Editable (l’œil ouvert) se règle acteur par acteur dans le niveau. De type Object Reference, elle désigne un autre acteur : cette lampe écoute ce générateur.',
    when: 'Quand le lien entre deux acteurs dépend du niveau, pas du Blueprint. C’est la façon la plus simple et la moins coûteuse d’obtenir une référence.',
    trap: 'Une référence qu’on a oublié de régler sur une instance vaut None : Accessed None dès qu’on s’en sert. Protège-la par Is Valid.',
  },
  {
    title: 'Accessed None',
    names: ['Accessed None', 'Référence vers un acteur détruit', 'Référence morte'],
    what: 'L’erreur d’exécution la plus courante : un nœud a voulu agir sur une référence vide (None), ou sur un acteur détruit. L’Output Log nomme le nœud et la pin.',
    when: 'Remonte le fil bleu jusqu’à la variable : qui devait la remplir, et quand ? Un Is Valid avant de s’en servir évite l’erreur.',
    trap: 'Détruire un acteur ne vide pas les variables qui le désignent : la référence reste, mais n’est plus valide.',
    pattern: 'Get Cible → Is Valid → (Is Valid) …',
  },
  {
    title: 'Variable d’un autre Blueprint',
    names: ['Variable d’un autre Blueprint', 'Lire la variable d’un autre Blueprint', 'Cast To'],
    what: 'Pour lire ou changer la variable d’un autre acteur, il faut une référence du bon type vers lui. Cast To BP_Joueur prend une référence générale (Other Actor) et répond : « est-ce un BP_Joueur ? » ; si oui, sa sortie donne accès à ses variables et fonctions.',
    when: 'Cast To quand tu as un acteur sans savoir ce qu’il est (overlap, Line Trace). Si plusieurs sortes d’acteurs doivent répondre, une interface évite un Cast par sorte.',
    trap: 'Un Cast raté n’est pas une erreur : il sort par Cast Failed, en silence. Si rien ne se passe, regarde de ce côté.',
    pattern: 'Other Actor → Cast To BP_Joueur → Get bHasKey',
  },
  {
    title: 'Private et fonctions publiques',
    names: ['Private', 'Fonction d’un autre Blueprint'],
    what: 'Une variable Private n’est lisible et modifiable que par son Blueprint. Les autres passent par une fonction qu’il expose, et qui garde le contrôle (plafond, vérification).',
    when: 'Dès qu’une valeur a des règles (une vie entre 0 et 100) : un Set venu de l’extérieur les contourne, une fonction les applique.',
  },
  {
    title: 'Variable locale et portée',
    names: ['Variable locale', 'Portée'],
    what: 'Une variable locale n’existe que dans une fonction, le temps d’un appel : elle repart de sa valeur par défaut à chaque appel.',
    when: 'Pour un calcul intermédiaire (un sous-total). Ce qui doit durer d’un appel à l’autre va dans une variable du Blueprint.',
    trap: 'Compter les appels dans une locale donne toujours 1.',
  },
  // --------------------------------------------------------------- le flux
  {
    title: 'Choisir un chemin',
    names: ['Branch', 'Default', 'Switch on Enum', 'Enum et Switch on Enum', 'Machine à états', 'Enum'],
    what: 'Branch choisit entre deux chemins selon un Boolean. Switch on Int ou on Enum choisit entre plusieurs selon une valeur ; Default reçoit tout ce qu’aucune sortie ne prévoit. Une Enum est une liste d’états nommés (Fermée, Ouverte, Verrouillée).',
    when: 'Deux cas : Branch. Trois états ou plus qui s’excluent : une Enum et un Switch, plutôt qu’une cascade de Branch et de Boolean.',
    trap: 'Deux Boolean pour décrire un état permettent des combinaisons impossibles (ouverte et verrouillée) ; une Enum n’a qu’une valeur à la fois.',
    pattern: 'Get État → Switch on Enum → une suite par état',
  },
  {
    title: 'Laisser passer une fois, ou alterner',
    names: ['DoOnce', 'Do Once et Retriggerable Delay', 'Start Closed', 'FlipFlop', 'Gate'],
    what: 'DoOnce laisse passer le fil blanc une fois, puis se ferme jusqu’à Reset. FlipFlop alterne entre A et B. Gate laisse passer ce qui entre par Enter tant qu’il est ouvert. Start Closed les fait démarrer fermés.',
    when: 'Quand un événement se répète (overlap, Event Hit) mais que l’effet ne doit arriver qu’une fois, ou une fois sur deux.',
    trap: 'Un DoOnce dont personne ne relie Reset ne se rouvre jamais : la deuxième fois, rien ne se passe, sans erreur.',
  },
  {
    title: 'Boucles',
    names: ['For Loop', 'Sortie Index', 'For Each Loop', 'Array Element'],
    what: 'For Loop exécute Loop Body pour chaque Index de First à Last, puis sort par Completed. For Each Loop fait de même pour chaque élément d’un tableau (Array Element).',
    when: 'Dès qu’on répète la même suite avec un nombre qui change : cinq acteurs à créer, une liste à parcourir. Cinq copies de la même chaîne se remplacent par une boucle.',
    trap: 'Une boucle tourne d’un seul coup, dans la même image : un Delay dans Loop Body ne l’étale pas dans le temps. Et Array Element est une copie.',
    pattern: 'For Loop (0 à 4) → Loop Body → Spawn Actor (X = Index × 150)',
  },
  {
    title: 'Nœud pur',
    names: ['Nœud pur', 'Pure'],
    what: 'Un nœud pur n’a pas de pins blanches : il ne s’exécute pas dans le fil, il est recalculé chaque fois qu’un nœud exécuté lit sa sortie.',
    when: 'Pour un calcul sans effet (addition, comparaison, lecture). Tout ce qui change quelque chose doit être impur.',
    trap: 'Relié à deux nœuds, un pur est calculé deux fois : un Random donne deux nombres différents. Stocke le résultat dans une variable pour le réutiliser.',
  },
  {
    title: 'Fonction',
    names: ['Fonction', 'Entrées et sorties', 'Return Node', 'Récursion', 'Condition d’arrêt', 'Infinite loop detected'],
    what: 'Une fonction range une suite de nœuds sous un nom, avec des entrées et des sorties (Return Node). On l’appelle d’un seul nœud, autant de fois qu’on veut. Une fonction qui s’appelle elle-même est récursive.',
    when: 'Dès qu’une même suite existe deux fois, ou qu’un morceau du graphe mérite un nom. Pas de Delay ni de Timeline dans une fonction : pour cela, un Custom Event.',
    trap: 'Sans condition d’arrêt, une fonction récursive ne finit jamais : UE l’arrête avec « Infinite loop detected ».',
  },
  // --------------------------------------------------------------- le temps
  {
    title: 'Attendre',
    names: ['Delay', 'Delay (latent)', 'Delay 0', 'Retriggerable Delay'],
    what: 'Delay suspend ce fil blanc pendant une durée, sans bloquer le reste du jeu (nœud latent, à l’horloge). Retriggerable Delay repart de zéro à chaque nouvel appel.',
    when: 'Pour un effet différé, une fois. Pour répéter, c’est un timer ; pour une valeur qui évolue, un Timeline.',
    trap: 'Un Delay déjà en attente ignore les nouveaux appels. Derrière une boucle ou un Tick, il ne fait donc pas ce qu’on croit.',
    pattern: 'Event ActorEndOverlap → Delay 2 s → refermer',
  },
  {
    title: 'Timer',
    names: ['Set Timer by Event', 'Clear and Invalidate Timer by Handle'],
    what: 'Set Timer by Event appelle un Custom Event dans Time secondes, en boucle si Looping est coché. Son Return Value (un Timer Handle) sert à l’arrêter avec Clear and Invalidate Timer by Handle.',
    when: 'Pour tout ce qui se répète à intervalle fixe : un spawn par seconde, un compte à rebours, une consommation.',
    trap: 'Un timer en Looping ne s’arrête jamais seul : garde le Handle dans une variable et arrête-le quand le travail est fini.',
    pattern: 'BeginPlay → Set Timer by Event (Looping) → Set Minuteur',
  },
  {
    title: 'Tick et Delta Seconds',
    names: ['Event Tick', 'Delta Seconds', 'Vitesse en cm/s', 'Get World Delta Seconds'],
    what: 'Event Tick s’exécute à chaque image. Delta Seconds est la durée de l’image : vitesse × Delta Seconds donne la distance à parcourir pendant cette image, quelle que soit la cadence.',
    when: 'Pour un mouvement continu seulement. Surveiller une valeur sur Tick coûte 60 vérifications par seconde, là où un événement prévient une fois.',
    trap: 'Une distance fixe par Tick donne une vitesse qui dépend de l’appareil : deux fois plus lente à 30 images par seconde.',
    pattern: 'Event Tick → Add Actor World Offset (Vitesse × Delta Seconds)',
  },
  {
    title: 'Timeline',
    names: ['Timeline', 'Play et Reverse', 'Update et Finished', 'Timeline › Finished', 'Lerp'],
    what: 'Un Timeline fait évoluer une valeur dans le temps selon une courbe (souvent de 0 à 1). Update sort à chaque image avec la valeur, Finished à la fin. Lerp transforme ce 0 à 1 en une position, une intensité, un angle.',
    when: 'Pour une animation de durée connue : une porte qui glisse, une lumière qui monte. Play l’avance, Reverse la ramène de là où elle est.',
    trap: 'Arrivé au bout, Play ne rejoue rien : pour recommencer, Play from Start.',
    pattern: 'Timeline (Update) → Lerp (A, B, Alpha) → Set Relative Location',
  },
  // ------------------------------------------------------------- communiquer
  {
    title: 'Event Dispatcher',
    names: ['Event Dispatcher', 'Call', 'Bind Event', 'Paramètre', 'Event Dispatcher avec paramètre'],
    what: 'Un Dispatcher est une annonce : celui qui le possède fait Call quand quelque chose arrive, sans savoir qui écoute ; ceux qui veulent être prévenus font Bind Event avec un Custom Event. Il peut porter des paramètres.',
    when: 'Quand un acteur doit en prévenir plusieurs, ou des acteurs qu’il ne connaît pas. Il remplace un Tick qui surveille.',
    trap: 'Seuls les Call faits après le Bind sont reçus : fais le Bind au BeginPlay.',
    pattern: 'BeginPlay → Bind Event to OnDemarre → Custom Event → allumer',
  },
  {
    title: 'Blueprint Interface',
    names: ['Blueprint Interface', 'Interface', 'Interface Message', 'Implemented Interfaces', 'Event d’interface ≠ Custom Event', 'Découplage'],
    what: 'Une interface est un contrat : une liste de fonctions (Interagir) que des Blueprints très différents acceptent de fournir, chacun à sa façon. Le message s’envoie à n’importe quel acteur, sans Cast.',
    when: 'Quand la même demande s’adresse à des acteurs de sortes différentes : une porte, un levier, un coffre. Celui qui envoie n’a pas à connaître leurs Blueprints : c’est le découplage.',
    trap: 'Un message vers un acteur qui n’a pas l’interface dans Class Settings › Implemented Interfaces est ignoré sans erreur. Et un Custom Event du même nom n’est pas l’événement de l’interface.',
    pattern: 'Hit Actor → Interagir (Message)',
  },
  {
    title: 'Interface avec entrée et sortie',
    names: ['Interface avec entrée et sortie', 'Implémentation en fonction', 'Valeur par défaut d’un message'],
    what: 'Une fonction d’interface peut recevoir des valeurs et en rendre. Dès qu’elle a une sortie, chaque Blueprint l’implémente comme une fonction (avec un Return Node), plus comme un événement.',
    when: 'Quand celui qui envoie le message attend une réponse : « autorisé » ou « refusé ».',
    trap: 'Si la cible n’implémente pas l’interface, les sorties gardent leur valeur par défaut (0, vide), sans erreur.',
  },
  {
    title: 'Ordre entre acteurs',
    names: ['Ordre entre acteurs', 'Ordre des BeginPlay', 'Bug intermittent'],
    what: 'UE ne garantit pas l’ordre dans lequel les acteurs font leur BeginPlay ou leur Tick. Un Blueprint qui lit au BeginPlay ce qu’un autre règle dans le sien marche une partie sur deux.',
    when: 'Mets la valeur de départ dans la valeur par défaut de la variable, ou fais prévenir par un Dispatcher, plutôt que de compter sur l’ordre.',
    trap: 'Un bug qui n’arrive « que parfois » est presque toujours une question d’ordre.',
  },
  // ---------------------------------------------------------------- données
  {
    title: 'Tableau (Array)',
    names: ['Tableau (Array)', 'Doublons'],
    what: 'Un tableau est une liste ordonnée de valeurs du même type, numérotées à partir de 0. Add ajoute à la fin, Length donne le nombre d’éléments, For Each Loop les parcourt.',
    when: 'Pour une liste dont l’ordre compte ou qui accepte les doublons. Pour « l’ai-je déjà ? », un Set ; pour « quelle valeur pour cette clé ? », une Map.',
    trap: 'Get (a copy) rend une copie : la modifier ne change pas le tableau.',
  },
  {
    title: 'Set et Map',
    names: ['Map', 'Changer le conteneur d’une variable', 'Name'],
    what: 'Un Set est un sac sans doublon ni ordre. Une Map associe une valeur à chaque clé (le code de chaque porte). Les clés sont souvent des Name : un identifiant court, insensible à la casse.',
    when: 'Set pour savoir si un élément est présent ; Map pour retrouver une valeur par son nom. Le conteneur d’une variable se choisit à côté de son type.',
    trap: 'Find sur une clé absente ne fait pas d’erreur : il rend la valeur par défaut. Teste sa sortie Boolean.',
  },
  {
    title: 'Structure',
    names: ['Structure', 'Membre', 'Break', 'Make', 'Set Members in'],
    what: 'Une structure regroupe plusieurs valeurs sous un nom (une fiche : Nom, Poids, Charge). Break en lit les membres, Make en fabrique une entière, Set Members in en change quelques-uns.',
    when: 'Dès que plusieurs variables décrivent la même chose et voyagent ensemble.',
    trap: 'Make remplit tous les membres : ceux qu’on ne relie pas reprennent leur valeur par défaut. Pour n’en changer qu’un, Set Members in.',
  },
  {
    title: 'Copie ou référence',
    names: ['Copie', 'Copie ou référence', 'Set copie la valeur'],
    what: 'Un Set copie la valeur : deux variables qui ont reçu le même tableau ou la même structure ne partagent rien. Seules les références d’acteurs désignent le même objet.',
    when: 'Pour modifier un élément dans un tableau : Get (a ref), ou Set Array Elem avec la valeur modifiée.',
    trap: 'Modifier une copie ne produit aucune erreur : le tableau reste simplement intact.',
  },
  // ------------------------------------------------------------- les acteurs
  {
    title: 'Créer et détruire',
    names: ['Spawn Actor', 'Expose on Spawn', 'Destroy Actor'],
    what: 'Spawn Actor crée un acteur d’une classe à une position ; son BeginPlay tourne avant que le nœud ne rende la main. Une variable Expose on Spawn devient une pin du nœud, réglée avant ce BeginPlay. Destroy Actor retire l’acteur du jeu.',
    when: 'Pour tout ce qui apparaît en cours de partie : ennemis, projectiles, objets ramassables.',
    trap: 'Un Set fait après le Spawn arrive trop tard pour le BeginPlay du nouvel acteur.',
    pattern: 'Spawn Actor BP_Ennemi (Vie = 30) → Return Value',
  },
  {
    title: 'Construction Script',
    names: ['Construction Script', 'Éditeur ou jeu'],
    what: 'Le Construction Script s’exécute dans l’éditeur, à chaque fois qu’on pose ou modifie l’acteur, avant tout BeginPlay. Il règle l’apparence d’après les variables Instance Editable.',
    when: 'Pour ce qui doit se voir dans le niveau sans lancer le jeu : une couleur, un nombre de lampes.',
    trap: 'Il ne tourne plus pendant la partie : la logique de jeu reste dans l’Event Graph.',
  },
  {
    title: 'Héritage',
    names: ['Classe parente', 'Hériter', 'Redéfinir un événement', 'Parent: BeginPlay', 'Un enfant est un parent'],
    what: 'Un Blueprint enfant reprend les composants, variables et graphes de son parent, et peut en redéfinir des événements ou des fonctions. Un enfant passe partout où le parent est attendu (Cast, références).',
    when: 'Quand plusieurs Blueprints sont des variantes d’une même chose : une lampe, une lampe clignotante.',
    trap: 'Redéfinir un événement remplace celui du parent : sans le nœud Parent: BeginPlay, ce que faisait le parent n’a plus lieu.',
  },
  {
    title: 'Line Trace',
    names: ['Line Trace By Channel', 'Out Hit', 'Out Hit Distance', 'Ignore Self', 'Draw Debug Type', 'Hit Normal', 'Event Hit'],
    what: 'Un Line Trace lance un rayon de Start à End et dit ce qu’il touche en premier : Out Hit donne l’acteur, le point, la normale, la distance. Event Hit, lui, se déclenche quand deux acteurs qui se bloquent se touchent.',
    when: 'Line Trace pour viser : interagir avec ce qu’on regarde, voir si la voie est libre. Draw Debug Type le dessine pendant la mise au point.',
    trap: 'End est une position, pas une direction : Start + Forward Vector × distance. Sans Ignore Self, le rayon touche d’abord l’acteur qui le lance.',
    pattern: 'Start = Get Actor Location ; End = Start + Forward × 300',
  },
  {
    title: 'Visible ou solide',
    names: ['ECollisionEnabled', 'Set Collision Enabled', 'Set Actor Hidden In Game'],
    what: 'Voir et bloquer sont deux réglages séparés. Set Visibility ou Set Actor Hidden In Game cachent ; Set Collision Enabled (No Collision, Query Only…) décide si l’on traverse et si les overlaps se déclenchent.',
    when: 'Une barrière qui s’ouvre : la cacher et couper sa collision. Les deux, sinon on bute dans un mur invisible.',
  },
  {
    title: 'Refactor',
    names: ['Refactor'],
    what: 'Réécrire un graphe qui marche pour qu’il soit plus simple à lire et à modifier, sans changer ce qu’il fait.',
    when: 'Quand la même suite est copiée, qu’une cascade de Branch grossit, qu’un Tick surveille. La vérification rejoue le même scénario : le comportement doit rester identique.',
  },
  {
    title: 'Borner une valeur',
    names: ['Clamp', 'Clamp (Integer)', 'Min et Max'],
    what: 'Clamp ramène une valeur entre un minimum et un maximum : en dessous il rend Min, au-dessus Max, sinon la valeur. Min et Max rendent le plus petit ou le plus grand de deux nombres.',
    when: 'Pour toute jauge (vie, énergie, carburant) : calcule, borne, puis range dans la variable. Un seul nœud remplace deux Branch.',
    trap: 'Clamp ne change pas la variable : il rend un résultat, qu’il faut encore ranger avec Set.',
    pattern: 'Get Énergie → + 30 → Clamp (0, 100) → Set Énergie',
  },
  {
    title: 'Modulo',
    names: ['% (Integer)', 'Modulo', 'Cycle'],
    what: 'Le modulo (%) rend le reste d’une division entière : 5 % 4 = 1, 4 % 4 = 0. Ajouter 1 puis prendre le modulo fait tourner une valeur en rond : 0, 1, 2, 3, 0, 1…',
    when: 'Pour tout ce qui boucle : vitesses d’un ventilateur, élément suivant d’une liste, une action sur N.',
    trap: 'Le modulo par 0 n’a pas de sens : la taille du cycle doit être au moins 1.',
    pattern: 'Get Vitesse → + 1 → % 4 → Set Vitesse',
  },
];
