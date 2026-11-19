# BP-Trainer — Apprentissage efficace, entraînement adaptatif et exercices procéduraux

> **Document de synthèse et de cadrage, 19 novembre 2026 — dépôt examiné en V7.25.**
>
> **Statut : propositions à étudier ; aucun développement ni changement de priorité n'est autorisé par ce document.**
>
> Objet : confronter les principes établis de l'apprentissage et les recherches en pédagogie de la programmation au parcours de BP-Trainer, puis définir une stratégie pour **réviser les graphes**, **individualiser les entraînements** et **générer de nouveaux exercices fiables**.
>
> Documentation complémentaire : [analyse de couverture Unreal](ANALYSE_COUVERTURE_UNREAL.md), [plan du parcours](PLAN_PARCOURS.md), [backlog](BACKLOG.md), [architecture](ARCHITECTURE.md), [revue V7](REVUE_V7.md).
>
> **Limite de méthode :** revue du code et des documents, pas de campagne d'observation d'utilisateurs ni d'essai manuel de l'intégralité des exercices sur APK. Les effets attendus sont des hypothèses de conception à mesurer, et non des bénéfices démontrés dans BP-Trainer.

---

## 1. La conviction centrale

**Le cœur de l'apprentissage dans BP-Trainer est de savoir lire, construire, déboguer et concevoir des graphes Blueprint — pas simplement de répondre correctement à des QCM.**

Or, aujourd'hui, la répétition fonctionne de deux façons très différentes :

1. **Questions de révision :** chaque question possède une échéance temporelle et revient avec des intervalles croissants après réussite (1, 3, 7, 16, 35, 90 jours ; [schedule.ts](../src/core/review/schedule.ts)).
2. **Pratique des graphes :** le parcours fixe comporte des rappels, des exercices de transfert, de l'autonomie différée et un contrôle d'espacement par **nombre d'étapes** ([practice.ts](../src/core/notions/practice.ts), [spacing.test.ts](../tests/spacing.test.ts)). Il ne planifie pas systématiquement une **nouvelle pratique de graphes pour chaque utilisateur, à une date dépendant de sa maîtrise et de ses erreurs**.

**C'est le principal écart à combler.** Un élève peut reconnaître la définition de Get Owner une semaine plus tard sans être capable de reconstruire un composant qui utilise correctement Get Owner. Inversement, il peut échouer à un QCM mal formulé tout en sachant résoudre le problème en pratique. Les deux formes de révision sont complémentaires, mais non interchangeables.

**Vision proposée :** passer d'un catalogue d'étapes enrichi de QCM à un **système d'entraînement des compétences** : chaque session fournit des indices sur les connaissances et les gestes maîtrisés, les risques d'oubli et le besoin de transfert ; le système suggère alors un exercice pertinent, puis réévalue la compétence.

Le **tronc commun** reste accessible et cohérent. Le système adaptatif intervient principalement dans les **révisions, les exercices de consolidation, les aides et les entraînements additionnels**, sans enfermer l'apprenant dans un parcours opaque ou bloquer sa progression.

## 2. Recherches : ce qui est étayé, et les limites de leur transposition

| Principe | État des connaissances | Traduction dans BP-Trainer | Prudence |
| --- | --- | --- | --- |
| **Récupération active / practice testing** | Effets robustes sur la rétention, en général meilleurs qu'une simple relecture [R1] | Reconstruire une petite chaîne de nœuds **sans regarder la solution** ; prédire le résultat | Les études générales ne prouvent pas qu'un format précis de graphe est optimal |
| **Espacement temporel** | Bénéfice robuste de répartir les reprises dans le temps [R1, R2] | Revenir sur Cast, Interfaces, Timers, etc. plusieurs jours après l'exercice | Aucun calendrier universel n'est validé pour les Blueprints ; les intervalles doivent être testés |
| **Exemples guidés puis retrait de l'aide** | Intérêt des exemples pour novices et de leur effacement graduel [R3] | Découvrir → compléter → modifier → transférer → construire seul | L'aide devrait aussi tenir compte de la maîtrise de la notion, pas seulement du niveau global |
| **Performance immédiate ≠ apprentissage durable** | Une réussite aujourd'hui ne prédit pas parfaitement la rétention ou le transfert [R4] | Distinguer « réussi », « réussi sans aide », « réussi après délai », « réussi sur un problème nouveau » | Un score unique peut masquer des difficultés très différentes |
| **Entrelacement et variation** | Peuvent aider à choisir la bonne méthode, mais bénéfices dépendants du domaine et de la similarité [R5] | Mélanger des outils comparables : Cast vs Interface, Delay vs Timer, héritage vs composant | Ne pas alterner aléatoirement les concepts ni généraliser les effets |
| **Modèle mental de l'exécution** | Les « notional machines » et la lecture de programmes sont centrales pour les novices [R6] | Prédis, trace d'exécution, valeurs de pins, breakpoints, erreurs expliquées | Une simulation simplifiée doit signaler ses différences avec Unreal |
| **PRIMM et lecture avant production** | Travaux encourageants en enseignement scolaire de programmation [R7] | Predict → Run → Investigate → Modify → Make, sur une même situation | Contexte scolaire / programmation textuelle ; adaptation à tester pour les graphes mobiles |
| **Débogage enseigné explicitement** | Le débogage ne découle pas automatiquement de la production de code [R8] | Hypothèse avant changement, diagnostic, correction minimale, contre-exemple | Mesurer l'amélioration de la stratégie de débogage, pas seulement la disparition de l'erreur |
| **Aides intermédiaires de type Parsons** | Piste pertinente pour aider à passer d'un exemple à la production libre [R9] | Réordonner/brancher des nœuds fournis avant d'écrire le graphe entier | Gain de temps ≠ preuve de meilleure rétention à long terme |
| **Knowledge Tracing** | Modélisation de la maîtrise à partir de séquences de réponses, dès les tuteurs de programmation [R10] | Estimation évolutive des notions maîtrisées ou fragiles | Une probabilité calculée n'est pas un diagnostic infaillible de l'esprit de l'utilisateur |

**Interprétation :** la littérature soutient fortement les mécanismes fondamentaux (récupération, espacement) et fournit des pistes intéressantes pour l'enseignement de la programmation. En revanche, **une politique précise de recommandation, un score de maîtrise ou un générateur procédural doivent être validés empiriquement dans l'application**.

### Ce que les études ne permettent pas de conclure

- Qu'il existe un nombre idéal de jours pour répéter **chaque** nœud ou compétence Blueprint.
- Que davantage d'exercices, davantage de difficulté ou moins d'indices donnent systématiquement de meilleurs résultats.
- Que le temps passé à un exercice révèle directement la compréhension : lecture, interruption, ergonomie tactile et expérimentation le modifient.
- Qu'une IA générant davantage de problèmes apprendra mieux aux utilisateurs qu'un petit ensemble de bons exercices soigneusement vérifiés.
- Qu'une typologie fixe de « styles d'apprentissage » constitue une bonne base de personnalisation : privilégier des compétences observables et des besoins constatés.

## 3. Audit du parcours actuel (V7.25)

**Périmètre observé :** 124 étapes sur cinq niveaux : Débutant 15, Intermédiaire 32, Confirmé 38, Avancé 37, Expert 2 ; 154 questions liées aux leçons et 23 fiches de mémo annoncées dans [README](../README.md).

### Points forts à conserver

| Mécanisme existant | Pourquoi il est intéressant |
| --- | --- |
| **Prédis, Débogue, Complète, Refactor, Construis, Synthèse** | Sollicitent lecture, prédiction, correction, production et conception, pas seulement la mémorisation |
| **Simulation réelle des graphes, Play, trace, breakpoints, « Pourquoi ? », « Montre-moi »** | Rend visible le modèle d'exécution et donne des diagnostics contextualisés |
| **Tests comportementaux, contre-cas « Et si… ? » et erreurs d'exécution** | Distinguent comportement correct et solution fragile ; certains exercices contrôlent aussi un choix architectural |
| **Chaînes par notion : découvrir, guider, modifier, transférer, autonomie différée** | Structurent une transition vers la résolution indépendante |
| **Règles d'aide dégressives par niveau** | Réduisent progressivement la dépendance à la recette |
| **Questions à échéances temporelles** | Instaurent déjà une vraie révision espacée pour les connaissances déclaratives |
| **Rappels dans les exercices et contrôle des écarts** | Empêchent certaines notions de disparaître durablement du parcours |
| **Projets Expert et entraînements mélangés** | Demandent un choix des outils et une articulation de concepts |
| **Notions, prérequis, historique des réussites et des aides** | Offrent des fondations de données pour une future individualisation |
| **ProjectBuilder, scénarios, vérificateur et moteur commun avec Play** | Offrent une base technique intéressante pour créer des familles d'exercices vérifiables |

### Points faibles et risques

| Constat | Conséquence pédagogique | Piste |
| --- | --- | --- |
| **QCM espacés mais graphes non révisés individuellement dans le temps** | Reconnaissance conceptuelle sans garantie de savoir reconstruire | Priorité absolue : mini-exercices pratiques différés |
| **Espacement mesuré en nombre d'étapes** | Une même distance peut signifier un jour ou plusieurs semaines selon l'élève | Échéances en jours + observation de la dernière pratique |
| **Les notions pratiquées sont inférées de la solution de référence** | On ne sait pas toujours si **cet élève** a écrit/utilisé la notion | Analyser sa solution et ses tentatives, avec incertitude |
| **Aide surtout fixée par le niveau** | Un novice sur les Interfaces et un élève à l'aise peuvent recevoir le même guidage | Aide ciblée par compétence et par type de difficulté |
| **Succès et aide enregistrés, mais faible historique des tentatives** | Impossible de repérer les erreurs récurrentes, leurs corrections et l'effort réel | Journal d'entraînement compact et structuré |
| **QCM surtout à réponse reconnue** | Risque de connaître une réponse sans pouvoir produire une solution | Questions de graphes, mini-complétions et réparations |
| **Entraînements mélangés encore peu nombreux** | Choisir une méthode face à des méthodes proches reste insuffisamment testé | Petits choix entre outils introduits plus tôt |
| **Certaines étapes anciennes fortement préconstruites** | Rupture possible avant les projets autonomes | Vérifier l'effacement progressif du préconstruit |
| **Qualité de solution partiellement liée au nombre de nœuds** | Risque de pénaliser une solution claire mais plus explicite | Mettre robustesse, responsabilité et lisibilité au premier plan |
| **Pas de transfert observé dans Unreal réel** | Difficile de mesurer la promesse « préparer à Unreal » | Exercices compagnons facultatifs sur PC |
| **124 étapes à naviguer** | Effort de recherche et de reprise inutile | Recherche/filtres par notion, besoin et durée |

**Point de prudence :** les réussites des tests du moteur démontrent sa cohérence interne, pas les gains d'apprentissage chez un utilisateur réel. Les versions récemment livrées doivent aussi être essayées sur téléphone.

## 4. Premier pilier : répétition espacée des compétences Blueprint

### 4.1. Ne pas confondre trois formes de mémoire

- **Savoir reconnaître :** « Get Owner permet d'obtenir l'acteur qui porte le composant » (QCM).
- **Savoir faire :** retrouver le composant, câbler Get Owner, choisir la bonne Target, relier l'exécution.
- **Savoir choisir :** dans un nouveau problème, déterminer s'il faut un Actor Component, une Interface ou une référence directe.

La révision doit entretenir les trois, mais **une réussite de QCM ne doit pas suffire à valider la maîtrise pratique**.

### 4.2. Format des mini-révisions

Une pratique courte de 2 à 5 minutes, adaptée au téléphone, portant sur **un geste ou une décision réellement reconstruite** :

1. **Lire / prédire :** que fait ce petit graphe ?
2. **Compléter :** poser et connecter les deux ou trois nœuds manquants.
3. **Réparer :** détecter et corriger une mauvaise référence, une condition ou un ordre d'exécution.
4. **Construire :** créer une chaîne courte à partir d'un objectif uniquement.
5. **Choisir :** parmi plusieurs moyens possibles, retenir une méthode adaptée au nouveau contexte.

Ces exercices ne sont pas tous équivalents : **la construction et le débogage sont indispensables**, puisque c'est la pratique visée par le produit.

### 4.3. Calendrier de départ, à expérimenter

Exemple *illustratif* après une première leçon réussie sur Cast :

| Moment | Activité | Ce que l'on vérifie |
| --- | --- | --- |
| J0 | Leçon guidée + graphe testé | Première compréhension |
| J+1 | Mini-graphe à compléter sans recopier | Rappel actif |
| J+3 | Même mécanisme dans une autre situation | Application |
| J+7 | Débogage d'un Cast qui échoue | Diagnostic |
| J+14 ou J+21 | Problème mêlant Cast et autres outils | Transfert et rétention |

**Les intervalles sont une hypothèse de conception, pas un optimum scientifique pour UE5.** Une erreur ou un indice important peut conduire à une consolidation plus proche ; une réussite autonome répétée peut espacer les reprises.

Priorité pratique : une file « **À retravailler en Blueprint** » distincte mais coordonnée avec la file des QCM. Pas de séries punitives, pas de blocage du parcours, possibilité de reporter ou de choisir une séance plus courte.

### 4.4. Relations avec l'existant

- Réutiliser le catalogue des notions, les prérequis, les chaînes d'apprentissage et les exercices existants.
- Ne pas confondre une notion réutilisée **dans la solution de référence** avec la notion effectivement mobilisée **par l'apprenant**.
- Ajouter un planning par **compétence** et **mode de pratique** (question / construction / débogage / transfert), sans supprimer le système actuel de QCM.
- Conserver des échéances et des identifiants stables à travers les mises à jour de contenu, et prévoir la migration du progrès.

## 5. Deuxième pilier : individualisation à partir des données d'entraînement

### 5.1. Données déjà présentes

Dans [progress.ts](../src/core/progress/progress.ts) :

- leçons terminées et dates de réussite ;
- réponses aux QCM et échéances ;
- aide ou solution consultées ;
- meilleur niveau d'assistance pour réussir : seul, avec indices, avec solution ;
- journées d'activité et dernière activité.

Dans le moteur de leçons : erreurs de compilation, résultats de chaque vérification, messages du runtime, traces, scénario, solution de référence et notion visée sont **disponibles pendant la résolution**, mais ne constituent pas encore un historique pédagogique durable et exploitable par notion.

### 5.2. Données nouvelles recommandées

| Champ | Intérêt | Garde-fou |
| --- | --- | --- |
| Identifiant de séance, leçon et version du contenu | Rattacher une mesure à des règles identiques | Migrations ; ne pas mélanger des versions incompatibles |
| Compétences ciblées et **observées** | Savoir ce qui a été réellement mobilisé | Distinguer « visé », « rencontré », « démontré » |
| Nombre de vérifications et issue de chaque essai | Voir la progression | Ne pas assimiler essais nombreux à mauvaise compétence |
| Catégories d'erreur : compilation, référence None, événement non déclenché, mauvais résultat, ordre de BeginPlay… | Déterminer quel rappel proposer | N'enregistrer que des catégories utiles, pas chaque geste |
| Erreur corrigée sans aide / avec aide | Mesurer le débogage autonome | Ne pas pénaliser l'expérimentation volontaire |
| Indice ou solution utilisée et moment relatif | Suivre l'autonomie | Pas de sanction ; permettre le retour à la notion |
| Temps **actif** de travail | Repérer une friction possible | Pause, changement d'application, lecture, inactivité à exclure ; signal faible |
| Nœuds/familles de nœuds ajoutés et connexions construites | Estimer la pratique effective | Les nœuds posés ne prouvent pas à eux seuls la compréhension |
| Type de problème et **distance au précédent** | Identifier copie versus transfert | Éviter de surestimer une simple variation cosmétique |
| Réussite différée, sur une autre variante | Mesurer la rétention et le transfert | Garder plusieurs observations, jamais un verdict définitif |

**Ne pas enregistrer par défaut chaque déplacement de doigt, graphe complet ou frappe.** Préférer un résumé par tentative et une courte synthèse des catégories d'événements. Historique local, exportable et supprimable ; synchronisation éventuelle uniquement consentie.

### 5.3. Exemple de schéma — proposition, pas code actuel

~~~ts
interface PracticeAttempt {
  id: string;
  timestamp: number;
  templateId: string;        // famille de problèmes
  variantSeed?: number;      // permet de reproduire la variante
  contentVersion: number;
  targetedNotions: string[];
  demonstratedNotions: string[];
  mode: 'predict' | 'complete' | 'debug' | 'build' | 'transfer';
  passed: boolean;
  checkedCount: number;
  activeSeconds?: number;    // indicateur faible
  help: 'none' | 'hint' | 'solution';
  errorTags: string[];       // ex. 'accessed-none', 'wrong-target'
  correctedIndependently?: boolean;
}
~~~

Ne retenir que les événements nécessaires à une décision pédagogique, pour limiter stockage, bugs et complexité d'interprétation.

### 5.4. Profil par notion, explicable et prudent

États pédagogiques proposés (ce ne sont pas des diagnostics psychologiques) :

1. **Non évaluée** : aucune preuve récente.
2. **En découverte** : reconnaît le concept, exécution encore assistée.
3. **À consolider** : erreurs récurrentes ou réussite avec beaucoup d'aide.
4. **Autonome récemment** : tâche construite ou réparée sans aide.
5. **À confirmer dans le temps** : compétence réussie mais délai important depuis la dernière pratique.
6. **Consolidée** : plusieurs réussites autonomes, dont au moins une différée ou en contexte nouveau.

Une notion peut être solide en reconnaissance et fragile en construction : le profil doit donc distinguer les **types de tâches**, au moins pour les compétences importantes. Préférer des règles faciles à expliquer à un score 0–100 faussement précis.

### 5.5. Comment recommander le prochain exercice

Ordre logique envisagé, **à tester** :

1. Vérifier que les prérequis sont disponibles ; si la difficulté vient d'une référence mal comprise, ne pas prescrire automatiquement une leçon plus avancée sur les Interfaces.
2. Faire remonter les **retours pratiques dus dans le temps**, en privilégiant les compétences critiques ou fragiles.
3. Si l'apprenant échoue **avec aide** : proposer un exercice plus petit sur la même règle, puis une variation.
4. Si l'apprenant réussit **sans aide** : proposer un problème de transfert ou une combinaison de notions, plutôt qu'une simple répétition.
5. Après plusieurs réussites autonomes et espacées : diminuer les rappels, sans déclarer la compétence « acquise pour toujours ».
6. Respecter la durée disponible, l'intérêt et les choix de l'utilisateur : « recommandé » n'est pas « obligatoire ».

**Ne pas utiliser uniquement la règle « trois succès = difficulté +1, trois échecs = difficulté −1 ».** Une erreur de manipulation, une mauvaise référence et une incompréhension de l'architecture demandent des réponses différentes.

### 5.6. Exemple avec deux profils

Une même leçon « Actor Components » est réussie :

- **Profil A :** sans indice, Get Owner et Get Component by Class correctement utilisés, réussite d'une variante. **Proposition :** réserve d'énergie partagée entre plusieurs machines, spécification seule.
- **Profil B :** erreur Accessed None, mauvais usage de Self, solution consultée. **Proposition :** petit débogage ciblé sur Get Owner / Is Valid, puis nouvel exercice pratique une ou plusieurs journées après.

Les deux retrouvent le même tronc commun. La personnalisation sert à **combler une lacune précise**, non à créer des parcours arbitrairement divergents.

## 6. Troisième pilier : exercices générés procéduralement

**Objectif :** faire retravailler un même concept dans des situations suffisamment nouvelles pour éviter de mémoriser seulement la réponse d'une leçon.

### Trois degrés d'ambition

| Niveau | Fonctionnement | Avantage | Risque |
| --- | --- | --- | --- |
| **1 — Variantes paramétriques** | Un modèle validé ; varier seuils, noms, classes porteuses, nombre d'acteurs, types d'erreurs, données | Fiable, contrôlable, compatible avec le hors-ligne | Variation superficielle si seuls les chiffres changent |
| **2 — Composition contrôlée** | Assembler des mécanismes compatibles : interaction + inventaire ; santé + dispatcher ; composant + validité | Transfert plus riche ; choisir plusieurs outils | Scénarios incompatibles, tests combinatoires et difficulté mal calibrée |
| **3 — Génération libre par IA** | Générer consignes, assets, graphes et vérifications à partir d'un objectif pédagogique | Grande variété potentielle | Énoncés ambigus, solutions incorrectes, hallucinations, coût, contrôle et hors-ligne |

**Stratégie : commencer par 1, passer à 2 après preuve de fiabilité.** Le niveau 3 n'est ni nécessaire à court terme ni souhaitable sans vérification indépendante complète. Le cœur technique existant (ProjectBuilder + interpréteur + runner + checks) est particulièrement adapté aux modèles paramétriques.

### Exemple de famille « Références et conditions »

**Structure commune :** un objet doit accéder à une valeur d'un autre objet et agir si une condition est satisfaite.

Variantes utiles :
- Porte + badge : référence correcte, seuil variable.
- Distributeur + énergie : référence potentiellement absente, utiliser Is Valid.
- Scanner + santé : mauvaise Target à corriger.
- Plusieurs acteurs : comparer accès direct, Interface et Actor Component selon le cahier des charges.
- Variante de transfert : aucune indication sur le mécanisme à choisir, plusieurs contre-cas vérifiés.

**Critère de vraie variété :** ne pas seulement renommer les acteurs et changer 10 en 20. Faire varier aussi le **raisonnement nécessaire** : référence manquante, instance différente, événement silencieux, mauvais ordre, architecture inappropriée.

### Contrat d'un modèle d'exercice

Chaque modèle devrait déclarer :
- compétences cibles, prérequis, type d'activité, durée approximative et plage de difficulté ;
- générateur déterministe avec **seed** et identifiant de version ;
- projet initial, consigne et scénario(s) de test ;
- solution(s) de référence exécutables ;
- critères d'acceptation et catégories d'erreurs ;
- contre-cas et cas limites : None, deuxième instance, autre ordre de BeginPlay, touche maintenue, etc. ;
- règles de validation permettant d'accepter d'autres solutions correctes ;
- métadonnées permettant de mesurer si la variante apporte réellement un nouveau contexte.

**À la génération :** reconstruire et valider la variante, exécuter la solution de référence et des solutions volontairement incorrectes, vérifier la difficulté et rejeter les variantes incohérentes. Les validations ne doivent pas seulement comparer les noms de nœuds à un graphe attendu.

**Tests :** seeds fixes en CI (régression), seeds aléatoires répétées localement (exploration), repro d'un bug par seed et version, tests de propriétés et invariant « la solution de référence réussit / plusieurs erreurs typiques échouent ». Des tests internes ne remplacent pas une comparaison périodique aux comportements réels d'UE5.

**Ne pas confondre IA et pédagogie adaptative :** les premières versions peuvent fonctionner intégralement hors ligne, avec des règles transparentes et sans service distant.

## 7. Autres améliorations pédagogiques à intégrer

### 7.1. Expliquer avant de révéler

Occasionnellement, après une erreur ou avant un exercice de débogage :
- « À ton avis, le problème est-il l'événement, la référence ou la condition ? »
- « Quel nœud regarderais-tu d'abord pour tester ton hypothèse ? »
- « Pourquoi un composant plutôt que trois Cast ? »

Réponses courtes (choix motivé, puis observation du graphe), pas de rédaction systématique sur téléphone. L'objectif est **d'expliciter un raisonnement**, pas de produire une charge de travail administrative.

### 7.2. PRIMM sur les notions difficiles

Pour une notion comme les références :
1. **Predict** : anticiper le résultat d'un graphe.
2. **Run** : exécuter et observer.
3. **Investigate** : explorer pins, variables et trace.
4. **Modify** : modifier ou réparer.
5. **Make** : reconstruire dans un autre contexte.

BP-Trainer a déjà les formats nécessaires ; l'enjeu est de **les relier à une même progression conceptuelle**, sans imposer cette structure à tous les exercices.

### 7.3. Aides proportionnées au besoin réel

Le retrait d'aide par niveau reste un repère utile. Il pourrait être complété par :
- réapparition ponctuelle d'un guidage lorsqu'une notion nouvelle ou un prérequis pose problème ;
- aide ciblée sur l'erreur plutôt que livraison immédiate de la solution ;
- possibilité de demander librement une aide sans être puni ;
- comparaison a posteriori entre la solution de l'élève et une solution de référence.

### 7.4. Ergonomie et motivation

Le téléphone est un avantage d'accessibilité, mais aussi une source de charge cognitive : rechercher des panneaux, sélectionner une pin ou glisser un fil peut parasiter l'exercice.

Séparer **temps de construction actif** et difficultés de navigation ; proposer la recherche par notion, type de tâche et temps disponible. Éviter de transformer les séries ou les scores en pression pour produire de l'activité : valoriser la **maîtrise différée** et les progrès, pas seulement le volume d'exercices terminés.

### 7.5. Mesure du transfert vers le vrai Unreal

Prévoir quelques exercices compagnons facultatifs, réalisables sur PC :
- créer un Actor et ses composants ;
- configurer PlayerController + Enhanced Input ;
- faire communiquer plusieurs Blueprints.

Noter ce qui est réellement construit dans UE5 et les différences avec BP-Trainer. **Ne pas prétendre valider automatiquement un projet UE5** si l'application n'a pas accès à ce projet.

## 8. Mesurer l'efficacité, pas seulement l'activité

### Indicateurs de résultat

| Indicateur | Définition recommandée |
| --- | --- |
| **Réussite immédiate** | Exercice équivalent juste après le cours |
| **Rétention pratique différée** | Nouvel exercice de graphe après 7–14 jours, sans consulter la solution (délais à tester) |
| **Taux de transfert** | Exercice nouveau où les outils à mobiliser ne sont pas annoncés |
| **Autonomie** | Réussite sans aide, après correction éventuelle ; distinguer solution consultée |
| **Débogage** | Capacité à identifier une cause, tester une hypothèse et corriger l'erreur |
| **Efficacité** | Progrès par durée active, avec marge d'erreur et contrôle des interruptions |
| **Friction UX** | Temps perdu à chercher une commande, annulations, gestes ratés, abandons contextualisés |
| **Transfert UE5** | Reproduction sur PC d'un système déjà travaillé dans l'application |

La rétention et le transfert devraient être les **mesures principales**. Nombre de clics, taux d'ouverture et longueur des sessions sont des mesures d'usage, pas des preuves d'apprentissage.

### Plan d'évaluation

1. **Observation qualitative** de quelques débutants sur le parcours existant : où bloquent-ils ? pourquoi ? distinguer raisonnement et interface.
2. **Baseline** : performance immédiate et test différé sur 2 ou 3 notions (Cast, Dispatchers, Actor Components).
3. **Pilote révisions pratiques** : mêmes compétences évaluées, versions comparables avec et sans ces rappels ; si possible répartition aléatoire, sinon comparaison prudente.
4. **Pilote adaptatif** : comparer recommandation ciblée et recommandation non personnalisée à charge de travail proche.
5. **Pilote génération** : tester si une nouvelle variante augmente le transfert plutôt qu'uniquement la quantité d'exercices réussis.
6. **Revue des effets indésirables** : sur-révision, découragement, fatigue, fausses classifications, inégalités entre débutants.

Éviter de déclarer une amélioration efficace à partir du seul taux de complétion ou d'une poignée d'utilisateurs volontaires.

## 9. Plan d'implémentation recommandé

Ce découpage est **une proposition**, sans lancement automatique et sans remplacement du backlog validé.

| Phase | Livrable | Critère de sortie |
| --- | --- | --- |
| **0. Mesure minimale** | Historique synthétique de tentatives (compatible avec stockage, sauvegarde et export existants) ; cartographie des notions observées | Données stables, interprétables, pas de perte de progression |
| **1. Révisions de graphes** | 3 familles de mini-exercices sur Cast/références, Dispatchers et Actor Components, programmées dans le temps | L'apprenant reconstruit réellement, et non seulement reconnaît la réponse |
| **2. Recommandation explicable** | Profil par notion et type de tâche, proposition « pourquoi cet exercice maintenant ? » | Recommandation pertinente et contrôlable ; tronc commun inchangé |
| **3. Génération paramétrique** | Modèles validés + seed + scénarios + contre-cas | Variantes reproductibles ; solutions et erreurs typiques vérifiées automatiquement |
| **4. Composition contrôlée** | Mélange de 2 ou 3 concepts avec vérification de compatibilité | Exercices nouveaux qui testent véritablement le choix de méthode |
| **5. IA éventuelle** | Étude de faisabilité et de validation indépendante | À envisager uniquement si les modèles déterministes deviennent insuffisants |

### Arbitrage avec les projets techniques déjà prévus

Le backlog prévoit UMG minimal, niveaux/GameInstance puis projet Expert final. Ces chantiers restent pertinents et pourront enrichir les situations d'entraînement.

**Recommandation :** traiter les premières phases pédagogiques comme un chantier transversal prioritaire, sans nécessairement suspendre l'ensemble des fonctionnalités Unreal. Au minimum, **concevoir les nouvelles familles de leçons pour qu'elles puissent ultérieurement produire des variantes et des observations pédagogiques**.

### Architecture suggérée (à valider avant de coder)

- **Collecte** : résumés d'essais depuis le runner et la validation de leçon, sans coupler le cœur à l'interface.
- **Profil** : compétence × mode d'application × date de dernière preuve ; provenance et incertitude visibles.
- **Planification** : file des QCM existants + file indépendante des pratiques de graphes, avec priorités coordonnées.
- **Recommandation** : règles déterministes fondées sur prérequis, difficultés, autonomie, délai et durée disponible.
- **Génération** : templates versionnés + seed + vérification automatique, branchés sur le ProjectBuilder et le runtime existants.
- **Stockage** : local d'abord, versionné, exportable/supprimable, compatible hors ligne ; pas de collecte distante implicite.
- **Évolutivité** : conserver des identifiants stables de compétences et une migration explicite si les modèles de données changent.

## 10. Décisions de produit à prendre avant de développer

1. **Ce qu'on mesure** : le niveau « réussi » est-il seulement comportemental, ou faut-il distinguer réussite autonome et rétention différée dans le carnet ?
2. **Ce qu'on adapte** : uniquement les entraînements complémentaires au départ, ou aussi l'aide d'une leçon du parcours principal ?
3. **Ce qu'on génère** : quelles trois familles de graphes sont le meilleur pilote ? (recommandation : références, communication, composants.)
4. **La durée d'une séance** : viser des mini-exercices de 2–5 minutes, tout en autorisant des projets longs.
5. **La place de l'utilisateur** : garder la possibilité de sélectionner librement la notion, ignorer ou reporter une recommandation, consulter pourquoi elle apparaît.
6. **Le seuil de preuve** : quels résultats différés justifieront de généraliser le moteur adaptatif ?
7. **La confidentialité** : quelles informations réellement nécessaires seront conservées, exportées ou éventuellement synchronisées ?

---

## 11. Conclusion opérationnelle

**La priorité n'est pas d'ajouter davantage de questions ni d'augmenter indéfiniment le nombre de nœuds simulés.**

C'est de faire évoluer BP-Trainer pour que l'utilisateur puisse :
- **retrouver et écrire** une chaîne Blueprint plusieurs jours après l'avoir découverte ;
- **identifier et corriger** ses propres erreurs ;
- **choisir l'architecture adaptée** dans une situation nouvelle ;
- **recevoir un exercice pertinent** selon ses difficultés réelles plutôt que seulement sa position dans un parcours fixe ;
- et, à terme, **refaire dans Unreal** ce qu'il sait construire dans le simulateur.

L'ordre déterminant est : **instrumenter → entraîner dans le temps → recommander → varier les exercices → prouver le transfert**. La génération procédurale est un accélérateur potentiel de variété, **pas un substitut à une pédagogie validée**.

## 12. Références scientifiques vérifiées

Les références suivantes étayent les **principes généraux** de ce document ; elles ne sont pas des validations expérimentales de BP-Trainer.

- **[R1]** Dunlosky, J. et al. (2013). *Improving Students' Learning With Effective Learning Techniques: Promising Directions From Cognitive and Educational Psychology*. *Psychological Science in the Public Interest*, 14(1). [DOI 10.1177/1529100612453266](https://doi.org/10.1177/1529100612453266).
- **[R2]** Cepeda, N. J. et al. (2006). *Distributed Practice in Verbal Recall Tasks: A Review and Quantitative Synthesis*. *Psychological Bulletin*, 132(3). [DOI 10.1037/0033-2909.132.3.354](https://doi.org/10.1037/0033-2909.132.3.354).
- **[R3]** Renkl, A. & Atkinson, R. K. (2003). *Structuring the Transition From Example Study to Problem Solving in Cognitive Skill Acquisition*. *Educational Psychologist*, 38(1). [Article](https://www.tandfonline.com/doi/abs/10.1207/S15326985EP3801_3).
- **[R4]** Soderstrom, N. C. & Bjork, R. A. (2015). *Learning Versus Performance: An Integrative Review*. *Perspectives on Psychological Science*, 10(2). [DOI 10.1177/1745691615569000](https://doi.org/10.1177/1745691615569000).
- **[R5]** Brunmair, M. & Richter, T. (2019). *Similarity matters: A meta-analysis of interleaved learning and its moderators*. *Psychological Bulletin*, 145(11). [PubMed](https://pubmed.ncbi.nlm.nih.gov/31556629/).
- **[R6]** Sorva, J. (2013). *Notional Machines and Introductory Programming Education*. *ACM Transactions on Computing Education*, 13(2). [ERIC](https://eric.ed.gov/?id=EJ1042409). Voir aussi Sorva, Karavirta & Malmi (2013), [revue des systèmes de visualisation](https://eric.ed.gov/?id=EJ1042414).
- **[R7]** Sentance, S., Waite, J. & Kallia, M. (2019). *Teaching Computer Programming with PRIMM: A Sociocultural Perspective*. *Computer Science Education*. [ERIC](https://eric.ed.gov/?id=EJ1217966).
- **[R8]** *Decoding Debugging Instruction: A Systematic Literature Review of Debugging Interventions* (2024). [DOI 10.1145/3690652](https://doi.org/10.1145/3690652).
- **[R9]** *Using Adaptive Parsons Problems to Scaffold Write-Code Problems* (2022). *ACM ICER*. [DOI 10.1145/3501385.3543977](https://doi.org/10.1145/3501385.3543977).
- **[R10]** Corbett, A. T. & Anderson, J. R. (1994/1995). *Knowledge Tracing: Modeling the Acquisition of Procedural Knowledge*. *User Modeling and User-Adapted Interaction*, 4, 253–278. [DOI 10.1007/BF01099821](https://doi.org/10.1007/BF01099821). Voir aussi Piech et al. (2015), [Deep Knowledge Tracing](https://arxiv.org/abs/1506.05908).
- **[R11]** *Automated Grading and Feedback Tools for Programming Education: A Systematic Review* (2024). *ACM Transactions on Computing Education*, 24(1). [ERIC](https://eric.ed.gov/?id=EJ1419855).
- **[R12]** *Artificial intelligence in programming education: A systematic review of intelligent, adaptive, and generative systems, learner outcomes, and implementation challenges* (2026). [Article](https://www.sciencedirect.com/science/article/pii/S2405844026008765). Ces revues récentes soulignent l'importance de la fiabilité, de la confidentialité et des évaluations différées.

---

**Statut final :** document de synthèse / orientation pédagogique. **Aucun lot n'est commencé, aucun fichier applicatif ni backlog n'est modifié.** Les dates et nombres doivent être réactualisés lors d'une future décision de développement.
