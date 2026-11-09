# Plan V2

Copie du Claude Doc « BP Trainer — Plan V2 » (https://claude.ai/artifact/NxXHsD4PnAuEQnyXvpEJcG), validé par Tristan le 2026-11-09.

La V2 rend la simulation plus fidèle là où UE surprend, place les explications aux moments où l'élève est bloqué ou surpris, et double le parcours : 24 leçons et 11 exercices, sur 4 niveaux. Cinq étapes, chacune validée par Tristan avant la suivante.

## Réalisme : modifier la variable d'un autre Blueprint

Le Set d'une variable d'un autre BP est fidèle à UE (référence typée sur Target, refus de compiler sans elle), et le BeginPlay d'un acteur créé par Spawn Actor s'exécute avant Return Value. Quatre écarts :

| Écart | Dans UE | Avant la V2 | Correction |
|---|---|---|---|
| Ordre des BeginPlay entre acteurs | Non garanti | Toujours l'ordre de placement : l'essai BP_A met BP_B.Valeur à 5, BP_B l'affiche → 5 ou 0 selon l'ordre, sans avertissement | Ordre mélangé à chaque Play (option Ordre fixe) ; leçons vérifiées dans l'ordre du niveau puis l'ordre inverse |
| Variable Private | Invisible depuis les autres BP | Absente | Case Private ; Get/Set externes masqués, erreur de compilation sinon |
| Instance Editable | Réglage par instance, sans rapport avec l'accès | Confusion avec Private non traitée | Une ligne dans Details |
| Expose on Spawn | Valeur donnée avant le BeginPlay, pin du Spawn | Absent | Case Expose on Spawn ; pin du Spawn Actor |

Hors V2 : ordre des Tick entre acteurs (même principe que BeginPlay, déjà couvert par l'ordre mélangé).

## Explications : seulement là où l'élève bloque

| Moment | Ajout |
|---|---|
| Erreur de compilation | « Pourquoi ? » : texte UE inchangé, phrase simple nommant le pin ou la variable, 1 à 3 corrections |
| Erreur d'exécution | Même « Pourquoi ? », avec le contexte de la partie (quelle référence valait None, d'où elle venait) |
| Rien ne se passe | « Pourquoi ce nœud ne s'est pas exécuté ? » à partir de la trace |
| Check de leçon raté | Raison qui dit observé / attendu ; toutes les leçons relues avec des solutions fausses typiques |
| Nœud piège | Note « Piège » de 1–2 lignes sur 16 nœuds |
| Écart avec UE | Note « Dans UE » seulement là où la 2D diffère |

Une ligne « À retenir » en fin de leçon. Rien sur les nœuds qui font ce que leur nom dit.

Diagnostic « pas exécuté » : événement jamais déclenché ; Cast Failed ou Branch False non branché ; Delay en cours, Do Once fermé, Gate fermé ; Dispatcher appelé avant son Bind ou jamais lié ; message d'Interface vers un acteur qui ne l'implémente pas ; variable d'un autre BP modifiée mais jamais relue.

Nœuds « Piège » : Delay, Retriggerable Delay, Do Once, Random (purs), For Each Loop, Get (a copy), Set d'un tableau ou d'une struct, == (Float), Cast To, Is Valid, Get All Actors Of Class, Event Tick, Destroy Actor, Spawn Actor, Set Timer by Event, Bind Event.

## Parcours

Les 12 leçons et 5 exercices actuels restent ; 12 leçons et 6 exercices s'ajoutent. Nouveaux types : **Complète** (graphe à trous) et **Refactor** (même comportement, une contrainte en plus). Tous les niveaux ouverts dès le départ.

| Niveau | Existant | Nouveau (piège expliqué) |
|---|---|---|
| Débutant | L1–L4 | Le compteur (Set sans fil d'exécution) ; Visible, caché, traversable (cacher ne coupe pas la collision) ; C1 Complète |
| Intermédiaire | L5–L8, P1–P3 | Le digicode (Default) ; Les états de la porte (Enum, Default) ; L'inventaire (Get a copy, retirer pendant For Each) ; R2 Refactor (Branch → Switch on Enum) |
| Confirmé | L9–L11, D1, D2 (D1 déplacé ici à l'étape C : il suppose les références) | Qui modifie quoi (Set direct / fonction / Dispatcher, Private) ; L'ordre des BeginPlay ; Les vagues (Expose on Spawn) ; L'ascenseur (Delta Seconds) ; D3 (Accessed None après Destroy) ; D4 (dépendance à l'ordre) |
| Avancé | L12 | Fonctions pures et impures ; Détruire proprement ; La salle de contrôle ; R1 Refactor (Get All Actors dans Tick) ; C2 Complète (récursion) |

## Étapes

| Étape | Contenu |
|---|---|
| A — Réalisme | Ordre mélangé + option ; leçons vérifiées dans les deux ordres ; Private ; Expose on Spawn ; ligne Instance Editable / Private |
| B — Explications | « Pourquoi ? », diagnostic « pas exécuté », notes Piège et Dans UE, À retenir, relecture des messages des 12 leçons |
| C — Débutant et Intermédiaire | Accueil par niveau, 5 leçons, C1 et R2 |
| D — Confirmé et Avancé | 7 leçons, D3, D4, R1, C2 |
| E — Héritage | Classe parente, fonctions et événements redéfinis, Parent: BeginPlay, Cast vers le parent, une leçon Avancé |

## Décisions (2026-11-09)

1. Ordre des BeginPlay mélangé par défaut, option Ordre fixe pour déboguer.
2. Héritage entre Blueprints : étape E, après D.
3. Niveaux tous ouverts.
4. Liste des leçons validée en l'état, ajustable.
