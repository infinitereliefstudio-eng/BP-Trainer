# Revue de la progression des exercices (21 novembre 2026, V7.56)

Copie du Claude Doc « BP Trainer — Revue de la progression des exercices » : https://claude.ai/artifact/U6hg99KCDJburANewm3nwZ (le doc fait foi s'il a été modifié depuis).

Demandée par Tristan le 21 novembre à 19 h 07 : « au vu des ajouts récents, regarder la progression des exercices, faire attention à ceux créés avant les ajouts, qu'ils soient à jour et utilisent les outils existants, qu'il y ait des exercices qui mélangent bien plusieurs notions et que le tout soit progressif ». **Rien n'est lancé** : les cinq versions proposées attendent son feu vert.

## En bref

La progression tient debout (taille des exercices et aide qui décroissent bien d'un niveau à l'autre), mais les étapes écrites avant les chantiers de novembre n'ont pas suivi, et les nouveautés (UMG, Actor Components, niveaux et GameInstance) ne se croisent presque jamais.

1. 16 étapes après « Interagir comme dans UE5 » (R4) font encore écouter les touches par le décor (Auto Receive Input).
2. Les messages au joueur restent des Print String dans l'Avancé et l'Expert ; l'UMG n'est presque plus écrit après la fin du Confirmé.
3. Les synthèses S2, S3, S4 et les projets X1, X2 ne couvrent pas leur niveau (S4 n'utilise ni composant, ni Line Trace, ni niveau, ni GameInstance).
4. Deux Entraînements mélangés seulement (M1, M2, Avancé) ; les nouveautés se croisent peu.
5. `tests/spacing.test.ts` ne compte pas les nœuds de widget : UMG et menus ne sont pas suivis.

## Méthode

Un script (non gardé) a rejoué chaque solution de référence sur son projet de départ : nœuds ajoutés par Blueprint lus comme notions (règle de `core/notions/practice.ts`), classes du projet, qui reçoit les touches, Print String ou écran.

## Ce qui va bien

| Niveau | Étapes | Nœuds à écrire par étape (moyenne, par Blueprint) | Aide |
| --- | --- | --- | --- |
| Débutant | 15 | 3,5 | ouverte |
| Intermédiaire | 33 | 4,3 | ouverte |
| Confirmé | 48 | 6,7 | indice après un essai |
| Avancé | 51 | 10,1 | indice après un essai, solution après réussite |
| Expert | 2 | 32 | aucune |

Échelles par notion respectées dans tous les blocs de novembre ; plus aucun événement de touche après « Les contrôles au Player Controller » ; rappels réels ; 23 étapes font écrire 8 notions ou plus.

## Constat 1 : le décor écoute encore les touches

Après R4, ces étapes ont un objet du décor avec Auto Receive Input qui écoute une Input Action (projet de départ et solution) :

| Étape | Niveau | Qui écoute | Famille proposée |
| --- | --- | --- | --- |
| L36 Les cartes tirées sans remise | Confirmé | BP_Paquet | commande |
| L37 La même donne | Confirmé | BP_Paquet | commande |
| D11 Le four qui oublie son annulation | Confirmé | BP_Four | commande |
| D3 La tourelle | Confirmé | BP_Cible | commande |
| L49 La tirelire | Confirmé | BP_Tirelire | objet, à confirmer |
| D17 La première partie plante | Confirmé | BP_Tirelire | comme L49 |
| D18 Le record à zéro | Confirmé | BP_Borne | commande |
| L53 Le standard téléphonique | Avancé | BP_Telephone, BP_Standard | commande |
| C4 La bonne cible dans le viseur | Avancé | BP_Coffre | commande |
| L61 Le rayon et les miroirs | Avancé | BP_Miroir | objet visé (Line Trace) |
| D15 Les meubles sur une grille tournée | Avancé | BP_Poseur | commande |
| D14 L'atelier de fabrication | Avancé | BP_Atelier | commande |
| L66 L'interrogatoire | Avancé | BP_Temoin | commande (mode dialogue) |
| L67 Le dialogue en Data Table | Avancé | BP_Radio | objet |
| C6 Annuler et refaire | Avancé | BP_Outil | commande |
| L72 Le réseau en boucle | Avancé | BP_Noeud, BP_Source | commande |

Les cinq étapes du Confirmé avant R4 (L27, D1, L28, L31, D12) sont normales : R4 s'appuie sur elles. Le Player Controller n'est pas écrit entre A3 et T6 (45 étapes) : le corriger ici le ramènerait.

## Constat 2 : Print String pour parler au joueur

Messages qui sont la réponse du jeu, donc à mettre à l'écran : L51 Le terminal, L67 Le dialogue en Data Table, M2 Le distributeur, S4 Les fusibles, X1 La radio. Les autres Print String de l'Avancé (standard, atelier, scanner…) sont des sorties de test et peuvent rester ; L66 utilise déjà un Text Render.

UMG écrit aux étapes 39, 79, 81, 83, 84, 85, 94, 127 : trous de 40 (L23 → « Le menu qui rend le contrôle ») et 33 (A3 → T4). Menus et modes d'entrée : dernière écriture à A3 (étape 94), plus jamais ensuite.

## Constat 3 : synthèses et projets Expert

| Synthèse ou projet | Ce qu'elle fait écrire | Ce que son niveau enseigne et qu'elle laisse de côté |
| --- | --- | --- |
| S1 Le passage | événements, composants, visibilité, overlap, touche, variables, Branch, calcul | rien d'important |
| S2 La réserve | overlap, Cast, autre Blueprint, Destroy, rotation, Delay, Do Once | Enhanced Input et Player Controller, compteur à l'écran, tableaux et Map, Enum et Switch, Timeline, timers |
| S3 Le poste de garde | Enhanced Input, boucle, interface, Cast, dispatcher, Timeline, Do Once | toute l'UMG, Save Game, fonctions et locales, structures et Data Tables, Spawn |
| S4 Les fusibles | Save Game, Set, Cast, Destroy, overlap | Actor Components, Widget Component, Line Trace, héritage, niveaux, GameInstance, GameMode |
| X2 L'atelier des machines | héritage, Tick, Sequence, interface, Delay | composants, écran |
| X1 La radio de la station | Data Table, structures, Set, modes de contrôle, interface | dialogue à l'écran et mode UI, GameInstance |

X1 et X2 recoupent le chantier n° 5 (projet Expert final) : à décider dans son analyse.

## Constat 4 : les nouveautés se croisent peu

| Croisement | Étapes qui le font écrire |
| --- | --- |
| Écran + dispatcher ou Cast | L45, R6, « Appuie sur E », C7 |
| Écran + Actor Component | T4 |
| Écran + Save Game | aucune |
| Écran + Data Table ou structure | aucune |
| Actor Component + niveau ou GameInstance | aucune |
| Niveaux + Save Game | A4 |
| Niveaux + écran | C8 (widget fourni) |

Entraînements mélangés : M1 (115) et M2 (126) seulement ; aucun en Intermédiaire ni en Confirmé, aucun dans les 23 dernières étapes. Le Confirmé a 14 Débogue sur 48 étapes.

## Constat 5 : garde-fous

- `NODE_NOTIONS` (`core/notions/practice.ts`) n'a aucune entrée pour `widget.*`, `event.construct`, `event.widgetButton`, `input.setMode*`, `input.setShowMouseCursor` : les notions `umg` et `ui-input` ne sont pas suivies par le test d'espacement.
- Pas de conseil de construction « un objet du décor écoute les touches ».
- Mini-exercices : familles cast, overlap, varBranch, widget seulement (rien pour composants, dispatchers et interfaces, niveaux et GameInstance).

## Proposition : cinq versions, dans cet ordre

1. **V7.57 — Outillage** : `umg` et `ui-input` comptés par le test d'espacement (trous d'aujourd'hui en cliquet) ; conseil « Un objet du décor écoute les touches » après R4.
2. **V7.58 — Les entrées des 16 étapes** : commandes par le Player Controller (conversion commune à la manière d'`asEnhancedInput` : l'action passe au Player Controller, qui appelle un Custom Event du même nom sur l'acteur) ; l'apprenant écrit la ligne du Player Controller dans L37, D18, C6, L72 ; objets par l'Event Interagir de R4 (L49, D17, L67) et le Line Trace (L61).
3. **V7.59 — Les messages à l'écran** : un widget de messages fourni dans L51, M2, S4 ; L67 en vraie boîte de dialogue créée par l'apprenant ; vérifications qui lisent l'écran à des checkpoints (`screenTexts`).
4. **V7.60 — Les synthèses** : S2 (porte en Timeline, compteur à l'écran), S3 (fin d'alerte par un bouton, mode UI), S4 refaite pour l'Avancé (deux niveaux et GameInstance, réserve en Actor Component, porte visée par Line Trace, sauvegarde à la porte).
5. **V7.61 — Trois Entraînements mélangés** : M3 fin d'Intermédiaire (Enhanced Input, Enum, Timeline, tableau), M4 Confirmé après « La tirelire » (écran, dispatcher, Save Game, structure), M5 Avancé après A4 (composant, GameInstance, Widget Component). 152 étapes.

Ensuite : X1 et X2 dans l'analyse du chantier n° 5 ; plus tard si demandé, des familles de mini-exercices. Chaque étape changée prend `revision` + 1.

## Questions à trancher

1. Les cinq versions, ou une partie d'abord ? Recommandé : les cinq, dans l'ordre.
2. V7.58 : conversion commune ou réécriture à la main ? Recommandé : la conversion, plus la ligne du Player Controller écrite par l'apprenant dans trois ou quatre étapes.
3. V7.59 : exiger l'écran ou l'accepter comme notion non bloquante ? Recommandé : exiger dans L67 et S4, notion non bloquante dans L51 et M2.
4. S4 : refaite entièrement (recommandé) ou seulement complétée d'un composant et d'un Line Trace ?
5. X1 et X2 traités dans l'analyse du chantier n° 5 ?
