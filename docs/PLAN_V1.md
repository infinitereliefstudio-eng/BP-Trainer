<!-- Copie du document « BP Trainer — Plan V1 », validé par Tristan le 2026-11-06 (Claude Doc https://claude.ai/artifact/RKdx8XcoCQJ1Q1bizened6, révision 17). Les décisions prises depuis sont dans docs/HANDOFF.md. -->

# BP Trainer — Plan V1

2026-11-06 · Tristan

## Objectif et périmètre de la V1

La V1 est une appli Android hors ligne qui reproduit l'éditeur Blueprint d'UE5 et exécute réellement la logique construite dans un petit monde 2D vu de dessus. Elle contient un parcours de 12 leçons et un mode Simulation libre.

**Ce que fait la V1**

- Créer des classes Blueprint (parent Actor), avec des composants simplifiés (lumière, mesh, zone de collision, texte) et des variables.
- Construire l'Event Graph et des fonctions avec une centaine de nœuds fidèles à UE : events, flow control, latents, maths, tableaux, Cast, interfaces, dispatchers.
- Compiler avec des erreurs proches de celles d'UE, lancer Play et voir le résultat dans le niveau.
- Déboguer : fils animés, breakpoints, valeurs des pins, Output Log.
- Suivre des leçons validées automatiquement, et tester librement en mode Simulation.

**Ce que la V1 ne fait pas** : rendu 3D, physique, animation, widgets UMG, réseau, C++. Les Timelines, macros personnalisées, structs, maps, Construction Script et Data Tables sont prévus en V2.

## Comment fonctionnent les Blueprints : les règles à reproduire

Pour que l'appli enseigne juste, l'interpréteur doit reproduire ces 12 règles documentées du moteur, y compris les pièges. Ce sont elles qui rendent les exercices « Prédis le résultat » intéressants.

| # | Règle d'UE5 | Ce que l'interpréteur fait | Source |
|---|---|---|---|
| 1 | Un nœud impur (pin exec blanc) ne s'exécute que quand l'exec l'atteint. Une chaîne va jusqu'au bout avant de rendre la main. | Machine virtuelle mono-thread, une pile d'exécution par événement. | [zomgmoz](https://zomgmoz.tv/unreal/Blueprints/How-blueprint-evaluation-works) |
| 2 | Un nœud pur est recalculé pour chaque nœud impur qui le lit : un Random Integer branché sur deux nœuds donne deux valeurs. La sortie d'un nœud impur reste figée jusqu'à sa prochaine exécution. | Évaluation à la demande, cache limité à l'exécution du nœud consommateur. | [zomgmoz](https://zomgmoz.tv/unreal/Blueprints/How-blueprint-evaluation-works), [forum](https://forums.unrealengine.com/t/blueprint-execution-flow-not-working-as-expected/140941) |
| 3 | Sequence appelle ses sorties dans l'ordre, sans attendre : un Delay sur Then 0 ne retarde pas Then 1. | Chaque sortie s'exécute jusqu'à sa fin ou jusqu'à un nœud latent, puis la suivante démarre. | [Epic, Flow Control](https://dev.epicgames.com/documentation/unreal-engine/flow-control-in-unreal-engine) |
| 4 | Delay ignore une nouvelle entrée pendant son décompte ; Retriggerable Delay remet le compte à zéro. Un nœud latent n'a qu'une action en cours : un ForLoop qui passe par un Delay n'affiche qu'une valeur, la dernière. | Gestionnaire d'actions latentes indexé par instance et par nœud. | [forum](https://forums.unrealengine.com/t/using-the-delay-node-too-quick-causes-high-input-lag/1211841), [Epic API](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UKismetSystemLibrary/RetriggerableDelay), [zomgmoz](https://zomgmoz.tv/unreal/Blueprints/How-blueprint-evaluation-works) |
| 5 | Les nœuds latents sont interdits dans une fonction, qui s'exécute d'un bloc et peut renvoyer une valeur ; ils sont permis dans l'Event Graph. | Erreur de compilation avec le message d'UE (latent call outside of the event graph). | [forum](https://forums.unrealengine.com/t/delay-in-a-function/5956), [forum](https://forums.unrealengine.com/t/delay-in-a-function-why-not/38779) |
| 6 | Une boucle s'exécute entièrement avant la frame suivante ; un WhileLoop dont la condition ne change pas bloque le jeu. | Compteur d'itérations et erreur « boucle infinie » au lieu d'un gel de l'appli. | [Epic, Flow Control](https://dev.epicgames.com/documentation/unreal-engine/flow-control-in-unreal-engine) |
| 7 | DoOnce, DoN, FlipFlop, Gate et MultiGate gardent un état propre, remis à zéro par leur entrée Reset (ou Open/Close/Toggle pour Gate). | État stocké par instance et par nœud, visible dans le débogueur. | [Epic, Flow Control](https://dev.epicgames.com/documentation/unreal-engine/flow-control-in-unreal-engine) |
| 8 | Une interface s'ajoute dans Class Settings. Le nœud Message accepte n'importe quel objet et échoue en silence si l'objet n'implémente pas l'interface. | Message silencieux ; Does Implement Interface pour tester. | [Epic, Interfaces](https://dev.epicgames.com/documentation/unreal-engine/implementing-blueprint-interfaces-in-unreal-engine) |
| 9 | Bind abonne un event à un dispatcher, Call déclenche tous les events abonnés, Unbind en retire un ; un event jamais lié ne se déclenche jamais. | Registre d'abonnés par instance ; appel immédiat de chaque abonné (ordre d'abonnement, choix de l'appli). | [Epic, Dispatchers](https://dev.epicgames.com/documentation/unreal-engine/event-dispatchers-in-unreal-engine), [Epic, Calling](https://dev.epicgames.com/documentation/unreal-engine/calling-event-dispatchers-in-unreal-engine?lang=en-US) |
| 10 | Utiliser une référence vide produit l'erreur « Accessed None trying to read property… » ; le nœud Is Valid sert à s'en protéger. | Erreur d'exécution loggée avec le BP et le nœud fautifs ; le nœud est sauté, la suite continue. | [forum](https://forums.unrealengine.com/t/acsessed-none/424018) |
| 11 | Un breakpoint met en pause juste avant le nœud. Un pin surveillé garde la valeur de sa dernière exécution, et n'en a aucune s'il n'a jamais tourné. | Mêmes règles, plus une Execution Trace des derniers nœuds exécutés. | [Epic, Debugger](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-debugger-in-unreal-engine) |
| 12 | Couleurs des pins : Boolean bordeaux, Integer vert d'eau, Float vert-jaune, String magenta, Text rose, Name mauve, Vector or, Rotator bleu ciel, Object bleu, Class violet, exec blanc. | Palette identique, pour que tes réflexes visuels se transfèrent. | [UE5 Gamedev](https://ue5gamedev.blogspot.com/2022/06/blueprint-variables.html), [forum](https://forums.unrealengine.com/t/ue4-node-lines-colour-meanings/404255) |

Trois de ces règles (2, 3 et 4) sont des pièges classiques ; elles ont chacune un exercice dédié dans le parcours.

## Le modèle de simulation : comment on voit que ça marche

Le monde est un diorama d'états : chaque Blueprint pilote des composants simples dont l'état se dessine en 2D. Une logique correcte se voit donc à l'écran, et une logique fausse aussi.

**Les composants sont les « briques physiques ».** Comme dans UE, tu ajoutes des composants à ta classe BP et ta logique les pilote :

| Composant | Ce qu'on voit dans le niveau | Ce que tes nœuds peuvent faire |
|---|---|---|
| Static Mesh (cube, porte, cylindre) | Une forme vue de dessus, avec position et rotation | Set Relative Location / Rotation, Set Visibility |
| Point Light | Un halo coloré, plus ou moins intense | Set Visibility, Toggle Visibility, Set Intensity, Set Light Color |
| Box Collision | Une zone en pointillés, qui s'allume quand quelque chose la traverse | Événements On Component Begin / End Overlap, Get Overlapping Actors |
| Text Render | Un texte au-dessus de l'acteur | Set Text |

Le joueur (BP_Player) est fourni : un pion déplacé au joystick virtuel, avec trois touches d'action E, F et Espace, qui déclenchent les events d'input. Toucher un acteur déclenche son Event ActorOnClicked.

**Le temps est simulé.** Une horloge à 60 ticks par seconde fait tourner Tick, Delay et les timers. La barre de lecture propose pause, ×0,25, ×1, ×4 et « une frame », pour observer un Delay ou un timer pas à pas.

**Cinq retours visuels, comme dans UE :**

1. Print String à l'écran (2 s par défaut) et dans l'Output Log, avec l'heure simulée.
2. Fils animés : le fil exec parcouru s'illumine, comme en Play In Editor.
3. Breakpoints, pas à pas, valeurs des pins au toucher, Execution Trace.
4. Outliner et panneau Details en direct : variables de chaque instance, modifiables pendant la partie.
5. Compiler Results : erreurs et avertissements avant même de lancer.

**La validation des exercices fonctionne comme un test automatique.** Chaque exercice contient un scénario joué par l'appli (attendre 1 s, amener le joueur dans la zone, appuyer sur E…) puis des vérifications. Le résultat s'affiche en checklist verte ou rouge, avec la raison de chaque échec.

- État du monde : « la lampe 2 est allumée », « la porte est ouverte à 90° ».
- Variables : « bHasKey vaut true sur le joueur ».
- Log : « Porte verrouillée » est apparu, ou l'ordre exact des messages.
- Propreté : aucune erreur d'exécution, aucun Accessed None.
- Contraintes de construction : « utilise une interface », « aucun Cast », « au plus 8 nœuds ».

Le mode Simulation utilise exactement le même moteur, sans scénario ni vérifications : tu places tes acteurs et tu joues.

## Architecture technique

L'appli est un site statique en TypeScript, avec un éditeur de graphe dessiné sur Canvas et un interpréteur écrit pour l'occasion. Aucune bibliothèque de graphe existante ne réunit le look d'UE, le confort tactile et les règles d'exécution ci-dessus.

Schéma « L’interpréteur exécute les BP compilés et pilote le monde 2D » (8 modules) :

- **Éditeur tactile** (canvas du graphe, gestes ; My Blueprint, Details, palette) → **Modèle de projet** (classes, graphes, variables, interfaces, niveau) ↔ **Stockage** (IndexedDB hors ligne, export et import JSON).
- Modèle → **Compilateur** (vérifie types et règles UE, icône verte, jaune ou rouge) → **Interpréteur (VM)** (file d’événements, pile exec, latents, timers, dispatchers).
- Interpréteur ↔ **Monde 2D** (composants, joueur, overlaps, horloge simulée à 60 Hz).
- Interpréteur ↔ **Moteur de leçons** (joue le scénario, puis lit monde, variables et log).
- Interpréteur → **Débogueur** (breakpoints, watches, Execution Trace) → Éditeur (fils animés, pauses).

Le monde ne décide rien : il affiche les composants et signale entrées et overlaps à l'interpréteur, qui seul exécute ta logique.

| Brique | Choix | Pourquoi |
|---|---|---|
| Langage et build | TypeScript + Vite, sortie en fichiers statiques | Types stricts pour les pins et les nœuds ; je compile tout dans mon espace de travail |
| Éditeur de graphe | Canvas 2D maison, gestes via Pointer Events | Contrôle total du rendu UE et des gestes. LiteGraph, visuellement proche, n'est plus mis à jour depuis août 2024 ([comparatif](https://www.pistack.xyz/posts/2026-09-09-node-based-ui-editors-react-flow-rete-litegraph-comparison/)) ; Rete et React Flow sont génériques et seraient à redessiner |
| Panneaux (My Blueprint, Details, palette) | Preact, très léger | Interface réactive sans alourdir l'appli |
| Interpréteur | Machine virtuelle maison | Seule façon de respecter les 12 règles |
| Sauvegarde | IndexedDB + export / import d'un fichier JSON | Hors ligne ; l'export protège tes projets, car les données sont liées à Chrome ([web.dev](https://web.dev/webapks/?hl=fr)) |
| Hors ligne et installation | Manifest + service worker | Exigés par Chrome et par PWABuilder |

**Les nœuds sont des données.** Chaque nœud est une définition : titre, catégorie, type (event, impur, pur, latent), pins typés, comportement, texte d'aide. Ajouter un nœud revient à ajouter une définition, ce qui permet d'enrichir la bibliothèque par vagues.

**Ce que fait l'interpréteur, dans l'ordre :**

1. **Compile** chaque BP : types des fils, pins obligatoires, latents dans une fonction, Return manquant. L'icône Compile passe au vert, au jaune ou au rouge, comme dans UE.
2. **À chaque frame**, traite la file d'événements : entrées, overlaps, timers et Delay arrivés à échéance, Tick, puis dessine le monde.
3. **Pour chaque événement**, suit la pile d'exécution. Un nœud impur évalue ses entrées pures, applique son effet, puis choisit sa ou ses sorties exec.
4. **Pour les appels**, une fonction ouvre un cadre avec ses variables locales et rend la main tout de suite. Un custom event appelé depuis un autre BP s'exécute immédiatement ; un dispatcher appelle chacun de ses abonnés.
5. **Pour les objets**, chaque instance porte sa classe, ses variables, ses composants, l'état de ses nœuds (DoOnce, Gate…) et ses actions latentes.
6. **Par sécurité**, un budget d'itérations stoppe une boucle infinie avec une erreur lisible.

## Bibliothèque de nœuds V1

La V1 embarque une centaine de nœuds, avec leurs noms anglais d'UE pour que tes réflexes se transfèrent. Ils couvrent tout le parcours et l'essentiel d'une logique de gameplay simple.

| Catégorie | Nœuds | Nombre |
|---|---|---|
| Events | Event BeginPlay, Event Tick, Event ActorBeginOverlap / EndOverlap, On Component Begin / End Overlap, Event ActorOnClicked, Input (E, F, Espace : Pressed / Released), Custom Event, Event Destroyed | 10 |
| Flow control | Branch, Sequence, DoOnce, DoN, FlipFlop, Gate, MultiGate, ForLoop, ForLoopWithBreak, ForEachLoop, WhileLoop, Switch on Int / String / Enum, Select | 15 |
| Temps | Delay, Retriggerable Delay, Set Timer by Event, Clear and Invalidate Timer by Handle, Is Timer Active by Handle | 5 |
| Variables | Get, Set, Increment Int, Decrement Int (pour chaque type) | 4 |
| Maths et logique | + − × ÷ %, Clamp, Min, Max, Abs, Truncate, Round, Random Integer / Float in Range, Random Bool, == != < > <= >=, AND, OR, NOT | 23 |
| Texte | Append, Contains, Len, Equal (String), conversions automatiques To String | 5 |
| Tableaux | Add, Remove Index, Get, Set Array Elem, Length, Contains, Find, Clear | 8 |
| Acteurs et objets | Self, Spawn Actor from Class, Destroy Actor, Get All Actors of Class, Get Actor of Class, Get Player Pawn, Is Valid, Cast To, Get Display Name, Set Actor Hidden In Game, Get / Set Actor Location | 11 |
| Composants | Set Visibility, Toggle Visibility, Set Intensity, Set Light Color, Set Relative Location, Set Relative Rotation, Set Text, Get Overlapping Actors, Set Collision Enabled | 9 |
| Communication | Appel de fonction, appel de custom event, Interface Message, Does Implement Interface, Call (dispatcher), Bind Event to, Unbind Event from, Unbind All | 8 |
| Debug et organisation | Print String, Reroute, Comment | 3 |

**Types de variables V1** : Boolean, Integer, Float, String, Vector (Z ignoré), Rotator (seul le Yaw compte en 2D), Enum, Object Reference, Class Reference, Timer Handle, et un tableau de chacun. Text, Name, Struct, Map et Set arrivent en V2.

**Ce que tu peux créer** : des classes Blueprint (parent Actor), des Blueprint Interfaces et des Enums. BP_Player (parent Pawn) est fourni et modifiable. GameMode et GameInstance arrivent en V2.

## Interface mobile

L'écran reprend la disposition de l'éditeur Blueprint d'UE, en paysage obligatoire : barre d'outils en haut, My Blueprint à gauche, Details à droite, résultats en bas, graphe au centre. Les panneaux latéraux deviennent des tiroirs pour laisser toute la place au graphe.

Maquette « La disposition d’UE, en paysage : panneaux en tiroirs, graphe au centre » :

- Barre du haut : Compile ✓, Save, Class Settings, Class Defaults, **Play ▶**, onglets Viewport / **Event Graph**.
- Tiroir gauche : Components (DefaultSceneRoot, PointLight, Box Collision), puis My Blueprint (Graphs, Functions +, Variables +, Event Dispatchers +, Interfaces).
- Centre : le graphe (ex. Event BeginPlay → Set Visibility, Target : PointLight, New Visibility ☑) ; « Appui long sur le vide : palette des nœuds » ; boutons flottants ↶ ↷ Sélection.
- Tiroir droit : Details.
- Bas : Compiler Results · Output Log · Debug.

Ici le tiroir gauche est ouvert ; Details (à droite) et les résultats (en bas) sont repliés en poignées.

- **Barre du haut** : Compile (avec son icône d'état), Save, Class Settings, Class Defaults, Play, puis les onglets Viewport et Event Graph, et les fonctions ouvertes.
- **Tiroir gauche** : Components, puis My Blueprint (Graphs, Functions, Variables, Event Dispatchers, Interfaces), chacun avec son bouton +.
- **Tiroir droit** : Details de l'élément sélectionné (nœud, variable, composant, instance).
- **Panneau du bas** : Compiler Results, Output Log, Debug (breakpoints, watches, trace).
- **En Play** : le niveau en plein écran, ou un écran partagé niveau et graphe pour voir les fils s'animer pendant que tu joues.

**Les gestes remplacent la souris et le clavier :**

| Geste | Action | Équivalent dans UE |
|---|---|---|
| Appui long sur le vide | Palette de recherche des nœuds | Clic droit |
| Tirer un fil depuis un pin et relâcher dans le vide | Palette filtrée par type, nœud branché automatiquement | Tirer un fil (Context Sensitive) |
| Toucher un pin, puis un autre | Créer un fil en mode précis | — |
| Appui long sur un pin | Break Link, Promote to Variable, Watch this value | Clic droit sur le pin |
| Appui long sur un nœud | Delete, Duplicate, Add Breakpoint, Refresh Node | Clic droit sur le nœud |
| Double toucher sur un fil | Ajouter un Reroute | Double-clic sur le fil |
| Glisser une variable depuis My Blueprint | Choix Get ou Set | Glisser-déposer avec Ctrl ou Alt |
| Pincer, glisser à deux doigts | Zoom, déplacement | Molette, clic droit glissé |
| Bouton Sélection, puis glisser | Sélection multiple en rectangle | Glisser sur le vide |

Pour la précision au doigt, chaque pin a une zone tactile invisible bien plus grande que son dessin, et une loupe apparaît pendant qu'on tire un fil. Les boutons Annuler et Rétablir restent toujours visibles.

## Parcours d'apprentissage V1

Le parcours compte 12 leçons en 4 modules, de « afficher un message » à « remettre une station en route ». Chaque leçon introduit 1 à 3 notions et part d'un niveau préparé, pour que tu te concentres sur la logique.

| # | Leçon | Mise en situation | Notions | Validé si |
|---|---|---|---|---|
|  | **Module 1 — Premiers pas** |  |  |  |
| 1 | Prise en main | Afficher « Bonjour » au lancement | Event BeginPlay, Print String, Compile, Play | Le log contient « Bonjour » |
| 2 | Allumer une lampe | La lampe s'allume au démarrage | Composant Point Light, Set Visibility | Lampe allumée dès le début |
| 3 | L'interrupteur | La lampe s'allume quand le joueur entre dans la zone, s'éteint quand il sort | Box Collision, Begin / End Overlap | Allumée en entrant, éteinte en sortant |
| 4 | Interrupteur à touche | E allume et éteint la lampe | Input E, variable Boolean, Branch, puis FlipFlop | 3 appuis donnent allumé, éteint, allumé |
|  | **Module 2 — Portes et objets** |  |  |  |
| 5 | Ouvrir une porte | La porte pivote de 90° à l'approche du joueur, une seule fois | Set Relative Rotation, Rotator, DoOnce | Porte à 90°, ouverte une seule fois |
| 6 | Ramasser un objet | La clé disparaît au contact et le joueur la possède | Cast To BP_Player, variable bHasKey, Destroy Actor | Clé détruite, bHasKey vaut true |
| 7 | La porte verrouillée | La porte s'ouvre seulement avec la clé, sinon un message s'affiche | Lire la variable d'un autre BP, Branch | Deux scénarios réussis : avec et sans clé |
| 8 | La porte qui se referme | La porte se referme 3 s après le départ du joueur, sauf s'il revient | Delay, Retriggerable Delay | Scénario d'aller-retour : la porte ne claque pas au nez du joueur |
|  | **Module 3 — Faire communiquer les Blueprints** |  |  |  |
| 9 | Générateur et lampe | La lampe ne s'allume que si le générateur tourne | Variable Instance Editable, référence réglée dans Details, Is Valid | Lampe éteinte tant que le générateur est arrêté, aucune erreur |
| 10 | Le générateur prévient | Démarrer le générateur allume les 3 lampes d'un coup | Event Dispatcher : Bind, Call, paramètre | 3 lampes allumées à la même frame, sans Tick |
| 11 | Interagir avec tout | E agit sur l'objet à portée, quel qu'il soit | Blueprint Interface, Interface Message, Get Overlapping Actors | Porte, lampe et générateur réagissent chacun à leur façon, sans aucun Cast |
|  | **Module 4 — Synthèse** |  |  |  |
| 12 | Remettre la station en route | Ramasser 3 fusibles, réparer le générateur, qui alimente lampes et porte ; son carburant baisse avec le temps | Tableau ou compteur, Set Timer by Event, Clamp, tout le reste | Scénario complet réussi, avec interface et dispatcher utilisés |

**Chaque leçon a trois temps :**

1. **Comprendre** : 2 à 4 cartes d'explication courtes, avec le schéma du résultat attendu.
2. **Construire** : les objectifs en checklist, la validation automatique, et 3 niveaux d'aide (une piste, les nœuds à utiliser, la solution montrée).
3. **Défi** : une variante sans aide, par exemple la leçon 4 refaite sans variable.

**Deux types d'exercices courts s'intercalent :**

- *Prédis le résultat* : tu lis un BP et tu donnes l'ordre des messages avant de lancer. Après la leçon 4 (Sequence et Delay), la leçon 8 (ForLoop et Delay) et la leçon 10 (Random Integer pur lu deux fois).
- *Débogue* : un BP cassé à réparer. Après la leçon 9 (un Accessed None) et la leçon 11 (une interface oubliée dans Class Settings, donc un Message qui échoue en silence).

Les modules 3 et 4 reprennent les patterns que tu utilises dans Station enterrée : référence directe, puis dispatcher, puis interface.

## Packaging APK via PWABuilder et hébergement

L'appli est hébergée gratuitement sur GitHub Pages, puis PWABuilder en fait une APK. Tout se fait depuis ton téléphone, et une fois l'APK installée, mes mises à jour arrivent sans la réinstaller.

1. **Tu crées un compte GitHub** depuis ton téléphone et tu le relies à Claude, pour que je puisse y déposer le code.
2. **Je publie l'appli dans un dépôt nommé****`ton-pseudo.github.io`****.** Ce dépôt « site utilisateur » place l'appli à la racine du domaine. C'est indispensable : Android cherche le fichier de vérification à la racine du domaine, pas dans un sous-dossier ([exemple](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/68877474/twa-shows-address-bar-even-if-assetlink-is-correct)).
3. **Tu colles l'adresse dans****[PWABuilder](https://www.pwabuilder.com)****.** Il vérifie le manifest, le service worker et le HTTPS, puis génère pour Android un zip contenant une APK de test, un paquet pour le Play Store et la clé de signature ([PWABuilder cloudapk](https://awesome.ecosyste.ms/projects/github.com%2Fpwa-builder%2Fcloudapk)). Garde ce zip : la clé sert à toutes les versions suivantes.
4. **Tu m'envoies le fichier****`assetlinks.json`****du zip** et je le publie dans `/.well-known/`. Sans lui, l'appli affiche la barre d'adresse de Chrome ([PWABuilder](https://github.com/pwa-builder/pwabuilder-google-play/blob/main/Asset-links.md)).
5. **Tu installes l'APK** : extraction du zip avec l'appli Fichiers, puis autorisation d'installer depuis cette source.

**Mises à jour.** L'APK charge l'appli hébergée : mes corrections et nouvelles leçons arrivent seules. Il ne faut repasser par PWABuilder que si le nom, l'icône ou l'orientation changent.

**Pourquoi pas Netlify Drop.** Sur téléphone, on ne peut pas y glisser un dossier, et l'envoi d'un zip dépend du navigateur ([forum Netlify](https://answers.netlify.com/t/bug-stuck-on-step-2-3-of-site-deployment/73304)).

**Pendant le développement**, je publie aussi chaque étape sur une page claude.ai, pour que tu testes sans attendre le packaging.

## Découpage en étapes de livraison

La V1 se construit en 4 étapes, chacune livrée sur une page de test avant de passer à la suivante.

| Étape | Contenu | Porte de validation |
|---|---|---|
| 1 — Socle de l’éditeur | Canvas, nœuds, fils, gestes, palette de recherche ; My Blueprint, Details, variables, sauvegarde et export ; une vingtaine de nœuds, sans exécution | Porte 1 : confort — graphe de 15 nœuds construit au doigt sans peiner |
| 2 — Interpréteur et monde 2D | Machine virtuelle, compilation, Print String, Output Log ; monde vu de dessus : joueur, lampe, porte, collisions ; Delay, timers, contrôle du temps ; leçons 1 à 5 | Porte 2 : logique visible — leçons 1 à 5 jouables et validées automatiquement |
| 3 — Communication et débogage | Références, Cast, interfaces, dispatchers ; fils animés, breakpoints, watches, Execution Trace ; leçons 6 à 11, exercices Prédis et Débogue | Porte 3 : communication — leçons 6 à 11 validées, débogueur utilisable |
| 4 — Synthèse et APK | Leçon 12, mode Simulation, bibliothèque complète ; hors ligne, GitHub Pages, APK via PWABuilder | Livraison V1 — APK installée sur le téléphone, sans barre d’adresse |

Chaque porte est un point de contrôle avec toi : on ne commence l'étape suivante que quand la précédente te convient sur ton téléphone.

## Risques, limites et points à trancher

Le risque principal est le confort d'édition sur un écran de téléphone ; c'est pour ça que l'étape 1 sert à le valider avant tout le reste.

| Risque | Parade |
|---|---|
| Graphes peu lisibles sur un petit écran | Zoom, loupe, zones tactiles agrandies, nœuds repliables ; validé dès l'étape 1 |
| Comportements d'UE non documentés (ordre de deux overlaps simultanés, ordre des abonnés d'un dispatcher) | Un choix fixe et explicite, signalé dans l'aide du nœud |
| Projet volumineux (éditeur, interpréteur, monde, 12 leçons) | 4 étapes testables, bibliothèque de nœuds extensible par vagues |
| Projets perdus si les données de Chrome sont effacées | Export JSON en un geste, et rappel régulier de sauvegarder |
| Le lien GitHub avec Claude ne fonctionne pas | Repli : je t'envoie un zip à déposer via le site GitHub, plus fastidieux |

**À trancher avant de démarrer :**

- Nom de l'appli (provisoire : BP Trainer)
- Noms des nœuds en anglais comme dans UE, explications en français (recommandé)
- Création de ton compte GitHub et liaison avec Claude
- GameInstance et Data Tables, que tu utilises dans Station enterrée : en V1 ou en V2

## Sources

- [Flow Control in Unreal Engine — Epic (doc UE 5.8)](https://dev.epicgames.com/documentation/unreal-engine/flow-control-in-unreal-engine)
- [Implementing Blueprint Interfaces — Epic](https://dev.epicgames.com/documentation/unreal-engine/implementing-blueprint-interfaces-in-unreal-engine)
- [Event Dispatchers — Epic](https://dev.epicgames.com/documentation/unreal-engine/event-dispatchers-in-unreal-engine)
- [Calling Event Dispatchers — Epic](https://dev.epicgames.com/documentation/unreal-engine/calling-event-dispatchers-in-unreal-engine?lang=en-US)
- [Blueprint Debugger — Epic](https://dev.epicgames.com/documentation/en-us/unreal-engine/blueprint-debugger-in-unreal-engine)
- [RetriggerableDelay — Epic API](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/Engine/UKismetSystemLibrary/RetriggerableDelay)
- [How blueprint evaluation works — zomg's Unreal notes](https://zomgmoz.tv/unreal/Blueprints/How-blueprint-evaluation-works)
- [Comparatif React Flow, Rete.js, LiteGraph (sept. 2026)](https://www.pistack.xyz/posts/2026-09-09-node-based-ui-editors-react-flow-rete-litegraph-comparison/)
- [WebAPK sur Android — web.dev](https://web.dev/webapks/?hl=fr)
- [Asset links — PWABuilder](https://github.com/pwa-builder/pwabuilder-google-play/blob/main/Asset-links.md)
- Fils de forum Epic cités dans les tableaux (Delay, pure nodes, Accessed None, couleurs des pins)
