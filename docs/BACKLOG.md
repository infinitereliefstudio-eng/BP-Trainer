# Améliorations possibles

Tout ce qui pourrait améliorer BP Trainer, au même endroit : pédagogie, fonctions, fidélité à UE, ergonomie sur téléphone, technique. Mis à jour le 2026-11-11, après la V4 (voir « Déjà fait » en bas : plusieurs lignes des tableaux sont faites). Rien ici n'est décidé : une idée ne se réalise que si Tristan la demande.

**Pertinence** : ★★★ change vraiment l'apprentissage ou l'usage quotidien ; ★★ utile ; ★ confort ou cas rare.
**Difficulté** : S, une passe courte ; M, une étape comme celles de la V3 ; L, plusieurs étapes ; XL, un chantier (une nouvelle version).

## Par où commencer

Le meilleur rapport entre ce que ça apporte et ce que ça coûte, dans l'ordre.

| # | Amélioration | Pertinence | Difficulté |
|---|---|---|---|
| 1 | Objectifs visibles pendant qu'on construit, et Vérifier sans ouvrir la fiche | ★★★ | S à M |
| 2 | Sauvegarde complète dans un fichier (progression et tous les projets) | ★★★ | S |
| 3 | Ouvrir la solution de référence comme un graphe, pas seulement en texte | ★★★ | S |
| 4 | Écran qui reste allumé pendant Play | ★★ | S |
| 5 | Regard du joueur indépendant du déplacement | ★★★ | S à M |
| 6 | Révision : reproposer d'anciens exercices quelques jours après | ★★★ | M |
| 7 | Leçon de synthèse de la V3 | ★★★ | M |
| 8 | Plusieurs projets en Simulation libre | ★★ | M |
| 9 | Sons (Play Sound 2D) | ★★ | S à M |
| 10 | Data Tables, puis une suite « jeu narratif » pour Station enterrée | ★★★ | L |

## Pédagogie

| Amélioration | Pourquoi | Pertinence | Difficulté |
|---|---|---|---|
| Objectifs visibles pendant qu'on construit | La fiche de leçon couvre tout l'écran : on la ferme pour travailler et on oublie l'étape en cours. Une bande repliable « objectif en cours », et un bouton Vérifier dans la barre | ★★★ | S à M |
| Solution de référence ouvrable | « Voir la solution » est une phrase. Le mécanisme des « autres façons de faire » permet déjà d'ouvrir un graphe dans un projet d'essai : l'appliquer à la solution, après le troisième indice | ★★★ | S |
| Révision espacée | Une leçon réussie n'est jamais revue. Proposer sur l'accueil « à revoir aujourd'hui » : un Prédis ou un Débogue tiré des notions réussies il y a quelques jours | ★★★ | M |
| Leçon de synthèse de la V3 | Les nouveautés sont vues une par une. Un projet final : porte à Timeline, visée par Line Trace, fiche d'objet en structure, Construction Script | ★★★ | M |
| Suite « jeu narratif » | Des leçons calquées sur les besoins de Station enterrée : dialogue ligne à ligne, objet à examiner, porte à code, journal de quêtes | ★★★ | L |
| Montrer le nœud en cause après un échec | Un échec dit quoi, pas où. Bouton « Montre-moi » qui ouvre le graphe sur le nœud concerné (le diagnostic sait déjà le trouver) | ★★ | M |
| Défis vérifiés | Chaque leçon a un défi en fin de fiche, que rien ne vérifie. En faire un second scénario, facultatif | ★★ | M |
| Plus d'exercices Prédis et Débogue | Sur les notions récentes : Map sans test, copie de structure, Event Hit répété, Lerp sur Tick | ★★ | S chacun |
| Robustesse et autres façons de faire | Dix leçons ont un « Et si… », cinq une alternative. Étendre aux leçons qui s'y prêtent | ★★ | M (contenu) |
| Autres règles de conseil | Cast sur Tick, référence lue sans Is Valid, variable jamais lue, Custom Event jamais appelé | ★★ | S chacune |
| Fiches de nœuds consultables | Un index des nœuds hors de la palette : description, piège, « dans UE », leçon où il est vu | ★★ | S à M |
| Prise en main guidée des gestes | Un premier écran qui fait faire chaque geste (appui long, tirer un fil, deux doigts) avant la leçon 1 | ★★ | M |
| Suivi des essais | Nombre d'essais et d'indices par leçon, mention « sans indice » sur l'accueil | ★ | S |
| Durée et prérequis par leçon | « 10 min · après Cast To » sur chaque carte du parcours | ★ | S |
| Pas à pas vers le vrai UE | Pour chaque leçon, où cliquer dans l'éditeur d'UE pour la refaire. Utile le jour où un ordinateur est disponible | ★ | M (contenu) |

## Fonctions et fidélité à UE

| Amélioration | Pourquoi | Pertinence | Difficulté |
|---|---|---|---|
| Regard indépendant du déplacement | Le joueur regarde là où il marche : viser avec un Line Trace oblige à bouger. Un second manche, ou tourner sur place | ★★★ | S à M |
| Data Tables | Dialogues, fiches d'objets, quêtes : la base d'un jeu narratif. Asset avec lignes d'une structure, Get Data Table Row | ★★★ | M à L |
| Sons | Play Sound 2D avec quelques sons intégrés. Rend les retours perceptibles et sert dans presque tous les vrais Blueprints | ★★ | S à M |
| Enhanced Input | UE5 passe par des Input Actions, pas par des événements de touche. Au moins les montrer à côté des touches actuelles | ★★ | M |
| Tick maîtrisé | Set Actor Tick Enabled, Tick Interval, Event End Play, Set Timer by Function Name : ce qui évite un Tick permanent | ★★ | S |
| Macros et Collapse | Macros de l'utilisateur, « Collapse to Function », « Collapse to Macro » : ranger un graphe qui grossit | ★★ | M à L |
| Copier-coller entre graphes | Aujourd'hui on duplique dans un même graphe seulement | ★★ | M |
| Find References | Où cette variable, cette fonction est-elle utilisée ? La recherche existe déjà pour les explications | ★★ | S à M |
| Timeline complet | Points clés arrondis (Auto), pistes Vector, Color et Event, Play Rate, Set Timeline Length | ★★ | M |
| Sweep et racine au choix | Sweep sur Set Actor Location et Add Actor World Offset. Dans UE il ne balaie que le composant racine : il faut pouvoir choisir un Static Mesh comme racine | ★★ | M |
| Collision Presets | Réglage par composant et par canal (Block, Overlap, Ignore), au lieu de la seule case « bloque » | ★★ | M |
| Autres traces | Sphere Trace, Box Trace, Multi Line Trace, Line Trace For Objects | ★ | S à M |
| Autres composants | Sphere Collision, Arrow, Spot Light, Audio | ★ | S chacun |
| Construction Script complet | Créer des composants (Add Static Mesh Component), variables locales du script | ★ | L |
| Débogage avancé | Valeurs surveillées en permanence (Watch), breakpoint sous condition | ★ | M |
| Widgets (UMG) | Créer un widget, un texte, un bouton : l'interface d'un jeu narratif. Un éditeur à part entière | ★★★ | XL |
| Plusieurs niveaux | GameMode, GameInstance, Save Game, Open Level | ★★ | XL |
| Déplacement d'IA | AI MoveTo simple, sans navigation réelle | ★ | L |
| Physique simulée | Simulate Physics, impulsions | ★ | XL |
| Export collable dans UE | UE accepte des nœuds collés sous forme de texte. À étudier : la fidélité du format n'est pas acquise | ★★ | XL |

## Ergonomie et design sur téléphone

| Amélioration | Pourquoi | Pertinence | Difficulté |
|---|---|---|---|
| Écran allumé pendant Play | Le téléphone peut se mettre en veille pendant qu'une partie tourne | ★★ | S |
| Plusieurs projets en Simulation libre | Un seul projet libre aujourd'hui : en créer, nommer, dupliquer, supprimer | ★★ | M |
| Reprendre où on en était | L'accueil propose la première leçon non réussie, pas le dernier projet ouvert (déjà mémorisé) | ★★ | S |
| Modèles pour la Simulation libre | Partir d'une porte, d'un inventaire, d'un système d'interaction plutôt que d'un projet vide | ★★ | S à M |
| Palette : récents et favoris | Les mêmes dix nœuds reviennent sans cesse | ★★ | S |
| Rangement automatique | « Straighten Connections », alignement d'une sélection : les fils se croisent vite au doigt | ★★ | M |
| Lecture en portrait | L'accueil et le carnet se lisent en portrait ; la fiche de leçon pourrait aussi | ★ | M |
| Niveau : dupliquer et tourner un acteur | Aujourd'hui on place et on déplace ; la rotation passe par Details | ★ | S à M |
| Icônes des nœuds | Le « f » des fonctions, l'horloge existe déjà : rapprocher encore le dessin de celui d'UE | ★ | S à M |
| Taille du texte réglable | Les valeurs sur les pins sont petites sur un écran de téléphone | ★ | S à M |
| Retouches | Menu ⋮ trop étroit (« Ordre des BeginPlay » sur trois lignes) ; le « 0 » de l'axe sous le premier point clé du Timeline ; le bouton Save d'une « autre façon de faire » enregistre pour rien ; force des vibrations à régler sur l'appareil | ★ | S |

## Données, publication et technique

| Amélioration | Pourquoi | Pertinence | Difficulté |
|---|---|---|---|
| Sauvegarde complète dans un fichier | Tout vit dans le stockage du navigateur de l'APK : l'effacer, ou changer de téléphone, perd la progression et les projets. Un export et un import de l'ensemble | ★★★ | S |
| Vérifier export et import dans l'APK | Le bouton Exporter ne téléchargeait rien dans la page de test claude.ai ; jamais confirmé dans l'APK. Passer par le partage Android si besoin | ★★ | S |
| Numéro de version visible | Savoir quelle version tourne (Aide et gestes), et un message « nouvelle version » quand le site a changé | ★★ | S |
| Intégration continue | Les actions GitHub utilisées ciblent Node 20, déprécié ; `ubuntu-latest` change d'image. Monter les versions avant que ça casse le déploiement | ★★ | S |
| Découper `interpreter.ts` | Plus de 700 lignes : séparer fonctions, données et débogueur, comme `simulation.ts` l'a été | ★ | M |
| Test du joystick | Le test sur téléphone simulé ne déplace pas le joueur au doigt | ★ | S à M |
| Performance des grands graphes | Jamais mesurée au-delà des leçons ; à vérifier avec une centaine de nœuds | ★ | M |
| Page de test claude.ai | L'APK suit le site : décider de la garder ou de retirer l'outil et sa mention | ★ | S |
| Publication sur le Play Store | L'APK s'installe à la main. Une fiche, une politique de confidentialité, une période de test fermée | ★ | L (peu de code) |
| Synchronisation entre appareils | Retrouver sa progression ailleurs. Demande un compte ou un stockage externe | ★ | L |
| Version anglaise | Textes de l'appli et des leçons | ★ | L (contenu) |

## Déjà fait, noté ici auparavant

- V4 (11 novembre 2026) : objectifs visibles et Vérifier sans ouvrir la fiche, sauvegarde complète dans un fichier, solution de référence ouvrable, écran allumé pendant Play, révision espacée, fiches de nœuds consultables, numéro de version visible, reprendre où on en était, palette avec les récents, trois Prédis de plus. Les lignes correspondantes des tableaux ci-dessus sont donc faites (les favoris de la palette et le message « nouvelle version » ne le sont pas).
- Retours sur la qualité des solutions (noté le 6 novembre 2026) : notion visée non bloquante, scénarios de robustesse, conseils de construction, autres façons de faire. Étape E de la V3.
- Variables locales, paramètres et sorties des fonctions d'interface, conversion d'un Custom Event en événement d'interface. Étape A de la V3.
- Structures, Map, Set, Text, Name. Étape B de la V3.
- Timeline, Lerp, Construction Script, flèches de références dans le niveau. Étape C de la V3.
- Line Trace By Channel, Event Hit. Étape D de la V3.
- Variable d'instance modifiable pendant Play, objet débogué choisi dans le niveau : Outliner en direct, étape 4 de la V1.
- Retours haptiques (10 novembre 2026).
