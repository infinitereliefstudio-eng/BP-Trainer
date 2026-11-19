# BP-Trainer — Analyse de couverture pédagogique d'Unreal Engine 5

> Revue indépendante du projet, arrêtée au **19 novembre 2026 (V7.17)**.
> Document de réflexion : ce n'est ni le backlog officiel, ni un plan validé, ni une demande de développement immédiate.
> Sources internes : [README](../README.md), [plan du parcours](PLAN_PARCOURS.md), [backlog](BACKLOG.md), [architecture](ARCHITECTURE.md), sources des leçons, des nœuds et du mémo.
> Les constats concernent ce qui est visible dans le code et la documentation ; **les 109 étapes n'ont pas été testées manuellement dans l'APK**.

## 1. Conclusion

**BP-Trainer est déjà une très bonne porte d'entrée vers la programmation Blueprint et la logique de gameplay. Il ne forme pas encore, à lui seul, à Unreal Engine 5 dans son ensemble.**

Son intérêt principal est d'apprendre à raisonner : événements, flux d'exécution, variables, références, communication entre objets, données, temporalité et débogage. La simulation manipulable et les exercices validés par leur comportement dépassent nettement une encyclopédie de nœuds ou une succession de quiz.

Le prochain cap n'est pas de reproduire tout Unreal dans une application mobile. Il est d'amener un apprenant à **construire un petit système sans guide, le refaire dans le véritable éditeur UE5, puis comprendre ce qu'il lui manque**.

### Ce qui a beaucoup progressé

- Parcours structuré en **109 étapes** sur quatre niveaux actuellement alimentés ; niveau Expert prévu.
- Révision espacée, fiches « Comprendre », prérequis, exercices « Prédis », « Débogue », « Complète », « Refactor » et synthèses.
- Aides progressivement retirées, exercices de transfert, autonomie différée, suivi de l'aide effectivement utilisée.
- Interfaces qui se rapprochent d'UE : Content Drawer, Class Defaults, Viewport Blueprint, Outliner, Details, palette d'actions, recherche.
- Enhanced Input (Input Actions booléennes, Mapping Context, PlayerController, Add Mapping Context), intégré dans les étapes ultérieures.
- Communication entre Blueprints : références, Cast, Event Dispatchers, Interfaces, fonctions, héritage et choix contextualisé entre ces outils.
- Données et systèmes de gameplay : Array, Map, Set, Struct, Data Tables, SaveGame, Timer, Timeline, Construction Script, Line Trace, Spawn, destruction.
- Débogage : breakpoints, pas à pas, affichage des pins, trace d'exécution, explication des erreurs et des événements non déclenchés.
- **V7.17 :** les étapes Avancé ont commencé à passer en cahiers des charges plutôt qu'en listes de nœuds. Le chantier Expert (lot 4b) reste à réaliser.

### Évaluation qualitative, non mesurée auprès d'apprenants

| Domaine | État |
| --- | --- |
| Fondamentaux de logique et de Blueprints | Très bien couvert |
| Communication inter-Blueprints | Bien couvert |
| Variables, collections et données | Bien couvert |
| Débogage des graphes | Bien couvert dans le périmètre simulé |
| Architecture et découplage | En progrès, manque encore la composition par Actor Components |
| Gameplay Framework complet | Principalement expliqué ; peu simulé |
| Gameplay 3D et Character Movement | Très partiel |
| Production d'un jeu UE5 complet | Hors du périmètre actuel |

Ces appréciations portent sur la **couverture de contenu**, et non sur une preuve d'efficacité pédagogique ou sur l'identité exacte du comportement avec Unreal.

## 2. Les principales lacunes

Il faut distinguer trois cas :
1. **Pratiqué** : l'apprenant le manipule et reçoit une validation.
2. **Expliqué seulement** : la notion figure dans les fiches du mémo, mais n'est pas véritablement simulée.
3. **Absent ou très simplifié** : ni le système complet ni ses contraintes ne sont reproduits.

| Notion | État dans BP-Trainer V7.17 | Pourquoi c'est important | Proposition |
| --- | --- | --- | --- |
| **Actor Components personnalisés** | Non simulés ; mémo conceptuel | Composition, réutilisation, Get Owner, communication avec un composant, alternative à la duplication et à l'héritage | **Priorité 1** de couverture technique |
| **Gameplay Framework** (GameMode, GameInstance, GameState, PlayerState) | Mémo ; PlayerController partiellement simulé | Responsabilités, état global, vie des objets, données persistantes | **Priorité 2** |
| **UMG / Widget Blueprints** | Mémo uniquement ; pas de vraie interface de jeu interactive | HUD, menus, inventaire, focus, données poussées par événement | **Priorité 3** |
| **Plusieurs niveaux et Open Level** | Non simulés ; SaveGame présent | Passage de niveaux, remise à zéro des acteurs, GameInstance vs SaveGame | **Priorité 2**, à rapprocher du framework |
| **Character Movement et caméra** | Pawn/contrôles et déplacement 2D simplifiés ; ni Character Movement ni vraie caméra | Contrôle d'un personnage 3D, possession, capsule, Spring Arm, rotation, mouvement | **Priorité 4** |
| **Enhanced Input avancé** | Actions booléennes et plusieurs triggers ; pas d'Axis2D ni de modificateurs complets | Déplacement analogique, manette, combinaison de touches | **Priorité 4**, à associer au mouvement |
| **Physique et collision 3D complètes** | Overlap, Hit, Line Trace, Collision Enabled, repères et rotations simplifiés en 2D | Sweep, canaux, Block/Overlap/Ignore, corps rigides, impulsions, contraintes | Important, mais coûteux à simuler fidèlement |
| **Animation Blueprint** | Présent dans le mémo « Autres éditeurs à nœuds » | AnimGraph, State Machines, Blend Spaces, Montages, Notifies | Parcours de découverte + exercices dans UE, sans recréer AnimGraph |
| **IA / navigation** | Pas d'AIController, NavMesh, Behavior Tree, Blackboard ou StateTree en pratique | Comportements autonomes, perception, déplacement et prise de décision | Découverte + TP dans UE |
| **Matériaux / Niagara / rendu** | Mentionnés dans le mémo, non simulés | Des graphes visuels avec un modèle d'évaluation différent des Blueprints de gameplay | Découverte conceptuelle, pratique dans UE |
| **Réseau / réplication** | Non simulé | Autorité, RPC, état serveur, ownership, synchronisation | Hors priorité d'une formation initiale solo |
| **Systèmes avancés et production** | Généralement absents ou théoriques | Gameplay Tags, GAS, Subsystems, Data Assets, soft references, async loading, optimisation, packaging, tests sur build | Modules transversaux ultérieurs |

**Attention aux faux « manques » :** les structures, Data Tables, SaveGame, Timeline, Construction Script, héritage et Enhanced Input de base existent bien. Ne pas les remettre dans la catégorie « totalement absents » au motif qu'ils restent partiels.

## 3. Le problème central : le transfert vers Unreal

L'application peut apprendre **quoi faire avec un Blueprint** tout en laissant ouverte la question **comment construire réellement ce système dans UE5**.

Exemples de difficultés que la simulation masque encore :

- Créer les bons types d'assets depuis le Content Browser et les ranger.
- Choisir la bonne classe parente ; attribuer le GameMode et le PlayerController.
- Configurer des composants et leurs détails dans un vrai niveau.
- Relier un Input Mapping Context au bon contrôleur.
- Construire des relations entre plusieurs classes en évitant les dépendances inutiles.
- Tester dans PIE, lire les logs, retrouver un acteur et interpréter un comportement inattendu.
- Refaire l'exercice dans un projet vide, et non à partir de graphes déjà préparés.

### Recommandation : une passerelle « Dans Unreal »

Sur certaines leçons existantes, ajouter **un court exercice compagnon dans UE5**, sans essayer d'exécuter UE sur le téléphone :

1. **Repérer** : assets à créer, classe parente, emplacement de chaque configuration, composants nécessaires.
2. **Reproduire** : objectif exprimé en résultat, sans liste des nœuds ; captures facultatives des réglages importants.
3. **Comparer** : ce qui est identique à BP-Trainer, ce qui est simplifié, ce qui change dans le véritable éditeur.
4. **Diagnostiquer** : un échec typique lié à l'éditeur et non au graphe (mauvais GameMode, contexte d'entrée non chargé, référence d'instance non renseignée).
5. **Valider** : checklist d'observations à réaliser dans UE ; ne jamais prétendre vérifier automatiquement un projet UE si l'application ne peut pas le lire.

Commencer avec trois leçons : **construction d'un acteur**, **Enhanced Input + PlayerController**, puis **une interaction entre deux Blueprints**. Étendre uniquement après test auprès d'utilisateurs.

## 4. L'autonomie doit devenir une compétence testée

Le plan pédagogique a déjà identifié l'excès de préparation initiale et la progression insuffisante de l'autonomie. Les synthèses et la V7.17 apportent une réponse réelle, mais les **projets Expert complets** restent à mettre en place.

### Jalons recommandés

| Étape | Activité | Critère de réussite |
| --- | --- | --- |
| Découvrir | Un nouveau concept avec démonstration | Expliquer ce qui déclenche et ce qui change |
| Construire guidé | Écrire soi-même les nœuds essentiels | Le scénario fonctionne |
| Transférer | Même notion dans un autre problème | Réussir sans simplement recopier |
| Déboguer | Une solution existante échoue | Identifier la cause, pas seulement le symptôme |
| Concevoir | Cahier des charges, assets et graphes à créer | Résultat robuste sans liste de nœuds |
| **Reproduire dans UE5** | Refabriquer un mécanisme dans le vrai moteur | Fonctionnement démontré dans PIE |

Un bon test final serait un **mini-jeu solo** : interaction avec plusieurs objets, porte verrouillée, inventaire simple, sauvegarde, interface, passage entre niveaux. Il peut être assemblé progressivement. Il n'est pas nécessaire de l'héberger intégralement dans BP-Trainer.

### Mesures pédagogiques utiles

- Taux de réussite **sans solution** et **sans indice**.
- Réussite différée sur un autre contexte (7–14 jours après, à tester plutôt qu'imposer).
- Part réellement construite par l'apprenant : nouveaux Blueprints, composants, variables, fonctions et liens, et pas seulement nombre de nœuds posés.
- Réussite dans UE sur un exercice compagnon.
- Capacité à **expliquer un choix d'architecture** : pourquoi une interface plutôt qu'un Cast ? Pourquoi un composant plutôt qu'un parent ? Où persister la donnée ?
- Erreurs de transfert récurrentes à réinjecter dans le parcours.

Éviter de confondre « toutes les cases sont cochées » avec « la compétence est acquise ». De même, ne pas survaloriser le nombre minimal de nœuds : lisibilité, robustesse, responsabilité et performance comptent davantage.

## 5. Exercices qui combleraient les écarts, sans réinventer Unreal

### A. « La santé est partout » — Actor Components

Trois acteurs ont copié la même logique de santé. Créer un composant de santé, l'utiliser sur les trois, modifier un seul endroit pour tous les comportements. Ajouter une lecture via Get Component by Class.

**Vérifier :** une seule implémentation de la règle ; états indépendants par instance ; aucun Cast vers chaque type concret d'ennemi.

### B. « Le joueur traverse une porte et revient » — Niveaux, GameInstance, SaveGame

Le joueur récupère un badge, change de niveau, revient et relance une partie. Distinguer trois durées de vie : dans le niveau, pendant la session, après fermeture.

**Vérifier :** objet recréé à chaque chargement, badge conservé en session, progression retrouvée après redémarrage si sauvegardée. Les références d'acteurs ne doivent pas être sérialisées comme telles.

### C. « La barre de vie se met à jour » — UMG

Créer une jauge liée à un composant Santé ; la mettre à jour par événement et construire un menu pause fonctionnel.

**Vérifier :** aucune lecture répétée inutile à chaque Tick ; reprise possible depuis le menu ; modes d'entrée cohérents.

### D. « Marcher, regarder, interagir » — Character / caméra / Enhanced Input

Configurer un Character, le mouvement Axis2D, la caméra, la rotation et une interaction par Line Trace.

**Vérifier :** une action d'entrée ne provoque pas plusieurs interactions, la caméra est indépendante lorsque demandé, l'objet visé est le bon.

### E. « Quel Blueprint doit savoir quoi ? » — Architecture

Même problème en trois versions : référence directe, Event Dispatcher et Blueprint Interface. L'apprenant prédit quels acteurs doivent connaître les autres et l'effet de l'ajout d'un nouvel acteur.

**Vérifier :** nouvelles classes ajoutées sans modification du code existant lorsque la solution est censée être découplée.

### F. « UE ne fait pas comme le simulateur » — Fidélité

Conserver 10 à 15 graphes de référence exécutés dans **une version précise d'UE5** : ordre d'exécution, références, fonctions pures, copies de tableaux, Dispatchers, BeginPlay/Spawn, timers, collisions et Consume Input.

**Vérifier :** résultat observé dans Unreal, résultat dans BP-Trainer, divergence documentée, simplification signalée à l'élève. Ne pas utiliser uniquement les tests internes du simulateur comme preuve de fidélité externe.

## 6. Ordre de travail recommandé

**Ne pas considérer cette liste comme un lancement automatique de lots.** Elle complète les chantiers déjà validés dans PLAN_PARCOURS.md et BACKLOG.md ; éviter de dédoubler les tâches.

| Ordre pédagogique | Chantier | Motif |
| --- | --- | --- |
| 1 | **Terminer le lot 4b / Expert** | Voir si un élève peut construire à partir d'un cahier des charges |
| 2 | **Piloter la passerelle réelle vers UE5** | Tester le transfert de compétence avant d'élargir le simulateur |
| 3 | **Actor Components personnalisés** | Le plus gros manque d'architecture réutilisable |
| 4 | **Gameplay Framework + plusieurs niveaux** | Comprendre la structure et le cycle de vie d'un jeu |
| 5 | **UMG minimal piloté par événement** | Permettre menus, jauges et inventaires visibles |
| 6 | **Enhanced Input Axis2D + Character/caméra** | Compléter le contrôle du joueur, sans forcément simuler un moteur 3D |
| Selon besoins | Animation, IA, rendu, audio, packaging | Mini-modules « comprendre », puis pratique dans UE |

Une autre piste peu coûteuse : des exercices de **choix d'architecture** ou d'**analyse d'erreurs** avec schémas et captures d'Unreal, qui ne demandent pas de coder un nouveau moteur de simulation.

## 7. Ce qu'il ne faudrait pas faire

- **Ne pas chercher à reproduire tout UE5.** Un éditeur Animation Blueprint, Niagara, un moteur physique, un système de réplication ou un véritable moteur 3D coûteraient disproportionnellement cher.
- **Ne pas assimiler réalisme graphique et efficacité pédagogique.** Les mêmes concepts peuvent être maîtrisés en 2D si les limites sont explicites.
- **Ne pas gonfler les leçons pour multiplier les fonctionnalités.** Garder une notion nouvelle à la fois, avec pratique espacée et transferts.
- **Ne pas oublier la fidélité.** Une simulation plausible mais divergente peut enseigner une mauvaise règle ; confronter régulièrement ses comportements au moteur réel.
- **Ne pas remplacer le mémo par de longues explications non pratiquées.** Les mémos aident à se repérer, mais ne constituent pas une compétence opérationnelle.
- **Ne pas mesurer l'apprentissage uniquement avec une réussite locale.** La vraie mesure est l'autonomie, dans BP-Trainer puis dans UE.

## 8. Positionnement proposé

**Promesse réaliste aujourd'hui :**

> « Apprendre à raisonner et à programmer en Blueprints UE5, sur téléphone, par la pratique, les erreurs et le débogage. »

**Ambition de moyen terme :**

> « Acquérir les bases de la logique et de l'architecture gameplay, puis être capable de reproduire ses premiers systèmes dans Unreal Engine 5 sans tutoriel pas à pas. »

Ce positionnement est plus crédible que « apprendre tout Unreal sur téléphone » et donne un critère concret pour décider des prochains développements.

---

### Statut de ce document

Revue de recommandations **indépendante et non validée**. Ne modifie ni les décisions prises dans les plans existants, ni les priorités opérationnelles sans arbitrage explicite. À réexaminer après la livraison du parcours Expert et les premiers essais de transfert dans UE5.
