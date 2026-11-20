# Chantier UMG — analyse (20 novembre 2026)

Copie du Claude Doc https://claude.ai/artifact/FuxBJZTiJ2ifCMDb1TpzPn (« BP Trainer — Chantier UMG : analyse »). **Proposé le 20 novembre, en attente des réponses de Tristan** aux six questions de la fin. Rien n'est lancé.

## En bref

Recommandation : un vrai **Widget Blueprint** avec un **Designer réduit** (onglets Designer et Graph, Palette, Hierarchy, Details comme dans UE), affiché en Play par Create Widget et Add to Viewport, mis à jour par événement. C'est plus que les « widgets prêts » notés au backlog, mais c'est la seule façon de prendre les réflexes de l'éditeur d'UE : créer l'asset, poser ses widgets, cocher Is Variable, écrire le Graph.

Taille **L**, comme le chantier Actor Components : cinq versions, une à la fois, avec feu vert entre chaque.

| Version | Contenu | Taille |
| --- | --- | --- |
| V7.33 Le Widget Blueprint | Nouvelle sorte de Blueprint, Designer réduit (Palette, Hierarchy, Details, aperçu), onglet Graph, Is Variable, Event Pre Construct dans l'aperçu, format 12 | L |
| V7.34 À l'écran | Create Widget, Add to Viewport, Remove from Parent, Is In Viewport, Event Construct / Destruct, Set Text, Set Percent, Set Visibility, Get Owning Player, calque des widgets en Play | M |
| V7.35 Boutons et modes d'entrée | On Clicked / On Pressed / On Released, Set Input Mode (Game Only, UI Only, Game and UI), Show Mouse Cursor, widgets pendant la pause | M |
| V7.36 Découverte | Quatre ou cinq étapes au Confirmé : compteur à l'écran, Construct, menu qui ne part pas, vrai menu pause, bouton qui ne répond pas | M |
| V7.37 Usages et reprise | Barre de vie liée au composant Santé, invite « Appuie sur E », Binding contre événement, autonomie différée ; fiches, mémo, glossaire, révision | M |

Le parcours passerait d'environ 124 à 134 étapes. Les Bindings (V7.37) et le Widget Component restent optionnels : ils dépendent des réponses aux questions.

## Comment l'UMG fonctionne vraiment dans UE5

Une interface UE5 est un objet à part, le **User Widget** : ce n'est pas un acteur, il n'est pas dans le niveau, il est créé par un Blueprint du jeu et dessiné par-dessus la vue. La logique de jeu reste dans les acteurs ; le widget lit et affiche.

### Un Widget Blueprint, deux onglets

- On le crée dans le Content Browser : **Add › User Interface › Widget Blueprint**, parent **User Widget**.
- Onglet **Designer** : Palette (les widgets à glisser), Hierarchy (l'arbre parent-enfant), Visual Designer (l'aperçu), Details (les propriétés du widget choisi), Animations.
- Onglet **Graph** : un Event Graph comme dans tout Blueprint, avec ses fonctions, variables et dispatchers.
- Depuis UE5, un Widget Blueprint neuf n'a **plus de Canvas Panel racine** : il faut en poser un pour placer librement les éléments avec des ancres. Piège classique des tutoriels UE4.
- Panneaux courants : Canvas Panel (ancres, position, taille, alignement, Z-Order), Vertical Box, Horizontal Box, Overlay. Widgets courants : Text, Progress Bar (Percent de 0 à 1), Button (un seul enfant, souvent un Text), Image, Border.
- **Is Variable** : coché, le widget devient une variable du Graph. C'est ce qui permet d'appeler Set Text dessus et d'ajouter ses événements (le + à côté d'On Clicked dans les Details).
- Un Widget Blueprint peut en contenir d'autres (User Created) : une barre de vie réutilisable dans un HUD, par exemple.

### Afficher, retirer, recréer

- **Create Widget** (Class, Owning Player) crée l'objet sans l'afficher. On « promote » sa Return Value en variable pour le retrouver.
- **Add to Viewport** (Z-Order) le dessine ; **Remove from Parent** le retire. L'objet existe encore : Is Valid reste vrai, **Is In Viewport** devient faux.
- Il n'y a pas d'Event BeginPlay dans un widget. **Event Construct** joue ce rôle, mais il revient à chaque ajout à l'écran ; pour une seule fois à la création, c'est **On Initialized**. **Event Pre Construct** passe avant Construct et tourne aussi dans l'éditeur, comme un Construction Script. **Event Destruct** suit le retrait.
- Ajouter deux fois le même widget laisse dans l'Output Log l'avertissement « The widget '…' was already added to the screen ».

Schéma (dans le Claude Doc) : Create Widget → On Initialized (une seule fois) → Add to Viewport → Construct (après Pre Construct) → à l'écran → Remove from Parent → Destruct → hors de l'écran, l'objet existe encore → Add to Viewport à nouveau : Construct repasse. Un widget retiré n'est pas détruit : le réafficher relance Pre Construct et Construct, jamais On Initialized.

### Mettre à jour : Binding ou événement

- **Binding** : dans les Details, le menu Bind d'une propriété (Text, Percent) crée une fonction ou suit une variable. UE l'interroge **à chaque image**, même quand rien ne change. La liaison à une variable coûte un peu moins que la fonction.
- **Piloté par événement** : l'acteur appelle un Event Dispatcher quand la valeur change ; dans Event Construct, le widget récupère la référence, s'abonne avec Bind Event, puis appelle une fois sa mise à jour pour partir de la bonne valeur. Epic le recommande dès que l'interface grossit.
- Un Set Text sur une propriété liée casse son Binding.
- Plus récent : le plugin **UMG Viewmodel** (MVVM), qui pousse les changements aux widgets liés. Il reste en bêta.

### Boutons, entrées et curseur

- Trois modes, appelés sur le Player Controller : **Set Input Mode Game Only**, **UI Only**, **Game and UI** (avec un widget à qui donner le focus), plus la propriété **Show Mouse Cursor**.
- En **UI Only**, le Player Controller ne traite plus aucune entrée : l'Input Action qui a ouvert le menu n'arrive plus pour le fermer. Solutions d'UE : un bouton dans le menu, le mode Game and UI, ou la fonction **On Key Down** redéfinie dans un widget focusable.
- En **Game and UI**, l'interface répond d'abord ; ce qu'elle ne traite pas passe au Player Controller.
- Fermer un menu dans l'ordre : Remove from Parent, Set Input Mode Game Only, Show Mouse Cursor à faux. Game Only ne cache pas le curseur.
- **Visibility** : Visible, Collapsed (ne prend plus de place), Hidden (garde sa place), Not Hit-Testable Self Only ou Self & All Children (visible mais ne reçoit pas les clics). Pour cacher, Collapsed est l'usage courant.

### Pendant la pause

- Set Game Paused fige le monde, pas l'interface : le Tick des widgets continue et les boutons répondent. C'est ce qui rend un menu pause possible.
- Un Delay dans un widget pendant la pause a changé de comportement selon les versions (régression signalée en 4.26) : à vérifier dans la version d'UE de Tristan avant d'en faire une leçon.

### À côté

- **Widget Component** : un widget porté par un acteur, en espace World (une surface dans la scène, qui peut être cachée) ou Screen (toujours au-dessus, il suit l'acteur). C'est l'outil des invites « Appuie sur E » et des barres de vie au-dessus des ennemis.
- **Common UI** (piles de menus, manette) et le plugin Viewmodel servent aux gros projets ; on les cite au mémo, sans les simuler.

## Les pièges réels d'UE à reproduire

Les pièges ci-dessous reviennent sans cesse sur les forums d'Epic : ce sont eux qui font une bonne leçon. Les cinq premiers viennent tout seuls si le simulateur traite le widget comme un objet ordinaire ; les autres demandent une règle explicite.

| Piège | Ce qui se passe dans UE | Dans l'appli |
| --- | --- | --- |
| Remove from Parent sur un nouveau Create Widget | Le menu affiché reste : on a retiré un second widget, jamais affiché | Naturel (deux objets distincts) |
| Create Widget à chaque appui ou sur Tick | Les widgets s'empilent, l'interface s'assombrit | Naturel, plus un conseil de construction |
| Add to Viewport deux fois sur le même widget | Avertissement « already added to the screen » | Message dans l'Output Log |
| Set Percent avec 0 à 100 | La barre reste pleine : Percent va de 0 à 1 | Naturel (valeur bornée à 1) |
| Event Construct pris pour BeginPlay | Il repasse à chaque ajout : compteur remis à zéro, Print en double | Naturel ; un Prédis |
| Menu ouvert en UI Only | La touche qui l'a ouvert ne le ferme plus | Règle : en UI Only, aucune Input Action n'arrive |
| Bouton en Game Only | Le clic part au jeu, le bouton ne réagit pas | Règle : un toucher sur un bouton est ignoré en Game Only, avec un « Pourquoi ? » |
| Curseur oublié à la fermeture | Game Only ne cache pas le curseur | État « curseur visible » affiché en Play, vérifiable |
| Text non coché Is Variable | Pas de variable dans le Graph, pas de Set Text possible | Naturel (palette et My Blueprint) |
| Hidden au lieu de Collapsed | Le trou reste dans une Vertical Box | Naturel si la mise en page suit UE |
| Binding laissé en place | Fonction appelée à chaque image ; un Set Text la casse | Compteur d'appels par seconde (si les Bindings sont faits) |
| Pas de Canvas Panel racine | Le premier widget posé prend tout l'écran | Naturel dans le Designer |

À vérifier dans UE avant d'écrire une leçon dessus : le comportement exact d'un clic en Game Only avec le curseur visible, et celui d'un Delay dans un widget pendant la pause.

## Ce que l'appli fait aujourd'hui

L'appli n'a aucun widget : l'UMG n'existe que dans une fiche du mémo, et les leçons qui en auraient besoin passent par des substituts. En revanche, presque tout ce dont un widget dépend est déjà là.

Ce qui manque ou est remplacé :
- Fiche du mémo « Interfaces à l'écran (UMG) » (`m-umg`) : Create Widget, Add to Viewport, Binding contre événement, modes d'entrée. À lire seulement.
- « Le menu pause » (Confirmé) : Set Game Paused et Trigger when Paused sur Espace ; le « menu » est un message. Tristan a confirmé ce choix le 20 novembre ; il reste valable pour cette étape.
- Leçons du recueil (V6) : les widgets y sont remplacés par des Text Render ou des Print String. Les exercices E10, E27 et E38 attendent ce chantier ; leur énoncé n'est pas dans le dépôt.

Ce qui est déjà en place et servira tel quel :
- **Objets qui ne sont pas des acteurs** : les SaveGame et les Actor Components vivent dans `Simulation.objects`. Cast To, Get / Set d'un autre Blueprint, appels de fonctions et dispatchers marchent déjà dessus. Un widget sera un objet de plus.
- **Player Controller en Blueprint**, Enhanced Input, pile des entrées, Set Game Paused, Trigger when Paused.
- **Event Dispatchers, Bind Event, Is Valid, Get Component by Class** ; le composant BP_Sante et son dispatcher OnMort.
- **Type Text**, Format Text, conversions To Text.
- **Calque DOM de Play** (`ui/play/PlayOverlay.tsx`) : PAUSED, messages, joystick, touches E, F et Espace. Les widgets s'y dessineront.
- **Construction Script exécuté dans l'aperçu** : le même mécanisme servira à Event Pre Construct dans le Designer.
- **Outliner en direct et objet débogué** : il faudra y ajouter les widgets créés.

## Trois niveaux de fidélité pour le Designer

Le choix du chantier, c'est ce que l'apprenant fait dans le Designer ; le Graph, lui, sera fidèle dans tous les cas. Recommandé : B.

| | A. Widgets prêts | B. Designer réduit (recommandé) | C. UMG complet |
| --- | --- | --- | --- |
| Ce que fait l'apprenant | Utilise un WBP_HUD fourni (un texte, une barre, un bouton) et écrit seulement les nœuds | Crée l'asset, pose ses widgets, les nomme, coche Is Variable, règle les Details, puis écrit le Graph | Tout ce que propose UE |
| Widgets | 3, figés | Canvas Panel, Vertical Box, Horizontal Box, Overlay, Text, Progress Bar, Button, Image (couleur), Spacer | Plus de 40, styles, polices, animations |
| Mise en page | Aucune | Ancres en préréglages, Position, Size, Alignment, Z-Order, Size To Content ; boîtes avec Padding, Fill ou Auto | Complète |
| Proche d'UE | Le Graph seulement | Les réflexes du Designer et du Graph | Oui |
| Sur téléphone | Simple | Faisable : mêmes tiroirs que l'onglet Viewport (V7.9) et la Hierarchy en arbre | Ingérable |
| Taille | M | L | XL et plus |

Pourquoi B : l'écart entre A et UE est justement ce qui perd un débutant dans l'éditeur (pas de Canvas Panel, Is Variable non coché, Text qui ne bouge pas). C coûterait plusieurs versions pour des widgets que le parcours n'utiliserait pas. Avec B, tout ce que le parcours fait écrire existe pour de vrai, et la liste peut grandir plus tard (Scroll Box, Widget Switcher, animations).

Adaptations au téléphone, marquées en ambre comme le reste de ce qui n'existe pas dans UE :
- L'aperçu a une seule taille d'écran de référence, mise à l'échelle du téléphone par son plus petit côté, comme la règle de DPI d'UE.
- Un toucher vaut un clic. Il n'y a pas de survol, donc pas d'On Hovered.
- Le curseur n'existe pas à l'écran : Show Mouse Cursor allume un témoin « curseur visible » pendant Play.

## Mise en place, version par version

Le principe déjà suivi pour les SaveGame et les Actor Components tient ici : un widget est un objet du runtime, sans cas particulier de leçon. La mise en page est un calcul pur dans `src/core` (testé sans DOM), le dessin se fait dans `ui/`.

### V7.33 — Le Widget Blueprint et son Designer (L)

- Modèle : `ParentClass` `UserWidget`, famille `widget` (pas de composants, jamais posée). Un arbre de widgets dans la classe : type, nom, Is Variable, propriétés, slot (réglages donnés par le parent : ancres et position dans un Canvas Panel, Padding et Fill dans une boîte). `PROJECT_FORMAT` 12.
- Types : Widget, UserWidget, TextBlock, ProgressBar, Button, Image, PanelWidget dans `BUILTIN_HIERARCHY` ; un widget Is Variable apparaît comme variable du Graph, en lecture seule comme dans UE.
- Content Drawer : + Add › User Interface › Widget Blueprint. Ouverture sur l'onglet Designer.
- Designer : Palette, Hierarchy (toucher pour choisir, appui long pour Wrap With, Delete, Rename), Details aux sections d'UE (Slot, Appearance, Content, Behavior, Events), aperçu où l'on déplace un élément au doigt dans un Canvas Panel. Pas de racine par défaut, comme UE5.
- Graph : Event Pre Construct (rejoué dans l'aperçu, comme le Construction Script), Event Construct, Event Destruct, Event Tick du widget ; Get Owning Player, Get Owning Player Pawn.
- Compilation : Graph d'un widget sans BeginPlay, ni overlap, ni Timeline ; widget supprimé encore utilisé.

### V7.34 — À l'écran (M)

- Nœuds : Create Widget (Class, Owning Player, pins Expose on Spawn), Add to Viewport (Z-Order), Remove from Parent, Is In Viewport, Set Text, Set Percent, Set Visibility (ESlateVisibility), Set Color and Opacity.
- Runtime : l'objet widget rangé dans `Simulation.objects` ; un écran (`viewport`) trié par Z-Order ; On Initialized à la création, Pre Construct et Construct à chaque ajout, Destruct au retrait ; avertissement d'UE dans l'Output Log en cas de double ajout. Tous les widgets disparaissent à Stop.
- Play : un calque des widgets sous les touches et le joystick (`ui/play/`), aux positions calculées par `core`.
- Débogage : les widgets créés dans l'Outliner en direct (section ambre), choisis comme objet débogué.

### V7.35 — Boutons et modes d'entrée (M)

- Événements de bouton On Clicked, On Pressed, On Released, ajoutés par le + des Details d'un Button Is Variable.
- Set Input Mode Game Only, UI Only, Game and UI (Widget to Focus), Set Show Mouse Cursor sur le Player Controller. Règles dans la pile des entrées (`runtime/inputStack.ts`, `runtime/enhancedInput.ts`) : en UI Only rien ne passe au jeu ; en Game Only les touchers sur les boutons sont ignorés.
- Pause : les widgets continuent (Tick, boutons) quand le jeu est en pause.
- Scénarios de leçon : une étape `{ click: '<widget>/<bouton>' }` pour le correcteur ; le test de fidélité dédié (cycle de vie, modes, pause).

### V7.36 et V7.37 — Leçons (M chacune)

Détail dans la section suivante. Si Tristan les valide, les **Bindings** entrent en V7.37 : menu Bind dans les Details, fonction appelée à chaque image, compteur d'appels dans l'onglet Debug, et un conseil de construction « Binding qui lit un autre Blueprint ».

Durée indicative : comparable au chantier Actor Components, qui a pris quatre versions.

## Effets sur le parcours

Dix étapes nouvelles, en deux blocs : la découverte au Confirmé, juste après « Le menu pause » (le Player Controller, la pause et les dispatchers y sont déjà acquis), puis les usages à l'Avancé, après le chantier Actor Components (la barre de vie s'appuie sur BP_Sante). Aucune étape existante ne change de règle ni de solution.

| Étape | Format | Place | Ce qu'elle fait pratiquer |
| --- | --- | --- | --- |
| Le compteur à l'écran | Découverte guidée | Confirmé | Créer le WBP, Canvas Panel, Text Is Variable, Create Widget, variable, Add to Viewport, Set Text |
| P16 — Combien de Construct ? | Prédis | Confirmé | Construct repasse à chaque ajout, On Initialized une fois |
| D24 — Le menu qui ne part pas | Débogue | Confirmé | Remove from Parent sur un nouveau Create Widget |
| Le vrai menu pause | Leçon guidée | Confirmé | WBP_Pause et ses boutons, Set Game Paused, Game and UI, curseur, fermeture dans l'ordre |
| D25 — Le bouton qui ne répond pas | Débogue | Confirmé | Modes d'entrée : Game Only, puis le piège d'UI Only |
| La barre de vie | Leçon guidée | Avancé | Event Construct, Get Owning Player Pawn, Get Component by Class, Bind Event, Set Percent, appel initial |
| T4 — La jauge d'énergie | Transfert | Avancé | La même méthode sur la batterie de la station |
| R6 — La barre qui lit tout le temps | Refactor | Avancé | Remplacer un Binding (ou un Tick) par un dispatcher |
| Appuie sur E | Leçon | Avancé | Une invite montrée et cachée (Collapsed) par le composant d'interaction |
| A3 — Le terminal de la station | Autonomie différée | Avancé | Un panneau de boutons qui commande des portes, retour en Game Only |

Ce qui suit en reprise, sans changer les règles :
- « Le menu pause » garde son message ; sa fiche « Dans UE » renvoie au « Vrai menu pause ».
- La fiche du mémo UMG est réécrite pour renvoyer aux étapes ; glossaire, deux notions (`umg`, et `ui-input` pour Set Input Mode, distincte d'`input-mode` qui désigne déjà les Mapping Contexts), questions de révision et une famille de mini-exercices « widget » pour la file « À retravailler en Blueprint ».
- Les synthèses S3 et S4 et les projets X1 et X2 restent tels quels ; c'est le projet Expert final (chantier n° 5) qui demandera un HUD.
- Si Tristan redonne les énoncés d'E10, E27 et E38, ils remplacent ou complètent les étapes ci-dessus.

## Hors chantier

Ces points restent au backlog ; ils ne servent à aucune des dix étapes proposées.

- Animations UMG (Play Animation), styles de bouton, polices, images importées.
- Scroll Box, Widget Switcher, List View, Named Slots, glisser-déposer.
- Focus et navigation à la manette, On Key Down redéfini (à réétudier pour fermer un menu UI Only au clavier).
- Widget Component et Widget Interaction : à décider (question 4) ; l'invite « Appuie sur E » marche sans eux, en widget d'écran.
- Common UI, plugin Viewmodel (MVVM), classe HUD (ancienne façon de dessiner à l'écran) : cités au mémo seulement.
- Add to Player Screen et l'écran partagé : un seul joueur dans l'appli.

## Questions à trancher

Six choix avant de lancer la V7.33, chacun avec une recommandation. Tristan peut répondre « les recommandations » pour tout prendre.

1. **Niveau de fidélité du Designer** : B, le Designer réduit (recommandé) ; A, des widgets prêts ; ou C, l'UMG complet.
2. **Place dans le parcours** : découverte au Confirmé après « Le menu pause », usages à l'Avancé après les Actor Components (recommandé) ; ou tout à l'Avancé.
3. **Bindings** : les simuler en V7.37 avec leur coût visible (recommandé : on les croise dans presque tous les tutoriels) ; ou seulement une fiche du mémo.
4. **Widget Component** (invite ou barre de vie au-dessus d'un acteur) : plus tard, après le chantier (recommandé) ; ou dès la V7.37.
5. **Toucher sur un bouton en Game Only** : ignoré, avec un « Pourquoi ? », comme le clic qui part au jeu dans UE (recommandé, à vérifier dans UE) ; ou accepté pour simplifier.
6. **Taille de référence de l'aperçu** : 1280 × 720, lisible sur le Pixel (recommandé) ; ou 1920 × 1080 comme beaucoup de projets UE, au prix de textes une fois et demie plus petits à l'écran.

Demande en plus : les énoncés d'E10, E27 et E38 du recueil, pour les intégrer aux étapes.

## Sources

Documentation d'Epic :
- [Widget Blueprints in UMG](https://dev.epicgames.com/documentation/en-us/unreal-engine/widget-blueprints-in-umg-for-unreal-engine)
- [Creating Widgets](https://dev.epicgames.com/documentation/unreal-engine/creating-widgets-in-unreal-engine)
- [Driving UI Updates with Events](https://dev.epicgames.com/documentation/en-us/unreal-engine/driving-ui-updates-with-events-in-unreal-engine)
- [Optimization Guidelines for UMG](https://dev.epicgames.com/documentation/unreal-engine/optimization-guidelines-for-umg-in-unreal-engine)
- [Property Binding for UMG](https://dev.epicgames.com/documentation/en-us/unreal-engine/property-binding-for-umg-in-unreal-engine)
- [UMG Events](https://dev.epicgames.com/documentation/unreal-engine/umg-events-in-unreal-engine)
- [UUserWidget::Construct](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/UMG/UUserWidget/Construct)
- [Is In Viewport](https://dev.epicgames.com/documentation/unreal-engine/BlueprintAPI/Appearance/IsinViewport)
- [ESlateVisibility](https://dev.epicgames.com/documentation/en-us/unreal-engine/API/Runtime/UMG/ESlateVisibility)
- [Set Input Mode Game and UI](https://dev.epicgames.com/documentation/unreal-engine/BlueprintAPI/Input/SetInputModeGameAndUI)
- [Widget Components](https://dev.epicgames.com/documentation/unreal-engine/widget-components-in-unreal-engine)
- [UMG Viewmodel](https://dev.epicgames.com/documentation/en-us/unreal-engine/umg-viewmodel-for-unreal-engine)

Forums d'Epic (pièges et comportements observés) :
- [Pas de Canvas Panel par défaut en UE5](https://forums.unrealengine.com/t/ue5-user-widget-blueprint-what-happened/535237)
- [Construct, Pre Construct et On Initialized](https://forums.unrealengine.com/t/updating-variable-in-umg-from-gi-gm-why-and-how/830878/4)
- [« The widget was already added to the screen »](https://forums.unrealengine.com/t/the-widget-was-already-added-to-the-screen-error/117157)
- [Fermer un menu en UI Only](https://forums.unrealengine.com/t/switchable-pause-issue/255068)
- [Ordre de fermeture d'un menu](https://forums.unrealengine.com/t/set-input-mode-to-game-only-not-working/2839895)
- [Delay dans un widget pendant la pause depuis 4.26](https://forums.unrealengine.com/t/delay-inside-widget-not-running-when-game-paused-since-ue4-26/476068)
- [Progress Bar entre 0 et 1](https://forums.unrealengine.com/t/health-bar-not-working/469607/2)
