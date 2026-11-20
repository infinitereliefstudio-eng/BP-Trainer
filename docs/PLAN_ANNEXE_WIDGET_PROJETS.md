# Chantier annexe : Widget Component et projets de la simulation libre

Demandé par Tristan le 20 novembre au soir, avant le chantier n° 4 (niveaux et GameInstance) : le Widget Component (noté au BACKLOG, « Fonctions et fidélité à UE », jugé **moyen** à la fin de la V7.35), et, dans le même chantier, **plusieurs projets en simulation libre** (enregistrer, nommer, supprimer…). Proposé le 20 novembre ; **Tristan a pris les recommandations et lancé le chantier** (« Ok pour tes recos, tu peux lancer »). **V7.41 faite le même soir**, puis **V7.42** (« Passe a la suite ») et **V7.43** (« Tu peux passer a la suite ») : **chantier terminé**.

## En bref

Trois versions, une à la fois :

| Version | Contenu | Taille |
|---|---|---|
| V7.41 | **Mes projets** : la simulation libre gère plusieurs projets | S à M |
| V7.42 | **Widget Component, le moteur** : composant, un widget par acteur, dessin au-dessus de l'acteur, Get User Widget Object | M |
| V7.43 | **Widget Component, les étapes** : trois ou quatre étapes à l'Avancé, et la reprise (glossaire, mémo, révision) | M |

Les projets passent en premier : ils ne dépendent de rien, et Tristan pourra s'en servir pour essayer le Widget Component librement.

## V7.41 : Mes projets

Aujourd'hui, la simulation libre n'a qu'un projet (clé `project:sandbox`) ; « Nouveau projet » le **remplace** (seul l'export le garde), « Importer » aussi.

- **« Simulation libre » ouvre « Mes projets »** : la liste (nom, date de dernière modification, nombre de Blueprints), le plus récent en haut, et **Nouveau projet**.
- Par projet : **Ouvrir**, **Renommer**, **Dupliquer**, **Exporter** (.json), **Supprimer** (confirmation qui nomme le projet).
- **Importer** crée un nouveau projet dans la liste au lieu de remplacer celui qui est ouvert.
- Dans l'éditeur, le menu « … » : « Nouveau projet » crée un projet à côté au lieu de remplacer, « Renommer le projet », « Mes projets » pour revenir à la liste.
- **Rien ne se perd** : le projet actuel devient le premier de la liste (nommé d'après son nom, sinon « Mon projet »). « Reprendre » sur l'accueil rouvre le dernier projet ouvert. La sauvegarde complète (export de la progression) emporte tous les projets.
- Stockage : un projet par clé (`project:sandbox:<id>`), plus un index (noms, dates) ; toujours par `storage/storage.ts`. Le projet garde son autosauvegarde et son filet de secours (`rescue:*`) comme aujourd'hui.

## V7.42 : Widget Component, le moteur

Dans UE, le Widget Component porte un User Widget sur un acteur : chaque acteur a son exemplaire. Deux espaces : **Screen** (dessiné par-dessus la vue, toujours lisible, il suit l'acteur) et **World** (une surface plate dans la scène, cachée par les murs).

- Nouveau composant **Widget** dans « Add » des Components, avec ses Details : **Widget Class** (un Widget Blueprint du projet), **Draw Size**, **Space**, la position relative (au-dessus de l'acteur).
- En Play : chaque acteur qui a le composant a **son propre widget** (Pre Construct, Construct, Bindings, Tick comme les autres), dessiné au-dessus de l'acteur dans la vue de dessus, à taille fixe à l'écran (mode Screen). Il suit l'acteur, disparaît avec lui (Destroy Actor) et quand le composant est caché (Set Visibility, Set Hidden in Game).
- Nœud **Get User Widget Object** (cible : le Widget Component) : rend un User Widget, d'où le **Cast To** vers le bon Widget Blueprint avant Set Percent / Set Text. Widget Class vide : None, puis Accessed None, comme dans UE.
- Ordre : le widget existe quand l'Event BeginPlay de l'acteur tourne (dans UE, le composant le crée avant ; à vérifier dans l'éditeur).
- Aperçu dans le viewport du Blueprint et dans le niveau : le cadre du widget au-dessus de l'acteur.
- Glossaire, fiche, conseil de construction si le Widget Class est vide.

## V7.43 : les étapes

Les Actor Components (dont la santé) arrivent à l'Avancé, après « L'héritage » : les étapes du Widget Component vont donc **à l'Avancé**, après les étapes composants et T4. Proposition (à affiner en écrivant) :

1. **Découverte** — « L'étiquette au-dessus du coffre » : ajouter un Widget Component, choisir le Widget Class, voir le widget suivre l'acteur en Play.
2. **Guidée** — « Une barre par ennemi » : trois ennemis avec le composant de santé, chacun sa barre ; à chaque dégât, Get User Widget Object → Cast To WBP_BarreVie → Set Percent. Les trois barres sont indépendantes.
3. **Débogue** — la barre ne bouge pas : Widget Class vide (Accessed None) ou Cast vers le mauvais Widget Blueprint (Cast Failed).
4. **Transfert** (si le parcours le supporte) — l'invite « Appuie sur E » de la V7.37, déplacée au-dessus de l'objet : montrer ou cacher le composant à l'overlap.

Plus : notions, question de révision, mémo UMG complété, mini-exercice « Interfaces (UMG) » s'il s'y prête.

## Questions à trancher

1. **Supprimer un projet** : définitif après confirmation (recommandé : simple, et l'export reste possible avant) ; ou une corbeille d'où on peut le récupérer.
2. **Space World** : expliqué dans la fiche seulement, le mode Screen étant le seul simulé (recommandé : la vue de dessus ne peut pas montrer une surface en 3D) ; ou simulé comme un panneau posé à plat dans le niveau.
3. **Boutons dans un Widget Component** en Screen : cliquables comme ceux d'un widget d'écran, selon le mode d'entrée (recommandé, à vérifier dans UE) ; ou affichage seulement.

## Décisions du 20 novembre

Les trois recommandations : suppression définitive après confirmation (pas de corbeille) ; mode World expliqué seulement, Screen seul simulé ; boutons d'un Widget Component en Screen cliquables selon le mode d'entrée (à vérifier dans UE).

## Ce que la V7.41 a fait autrement que prévu

- La liste n'a pas d'index : elle est lue dans les clés stockées, pour ne jamais se désaccorder des projets. Le projet ouvert en dernier est en tête (marqué « ouvert en dernier ») ; il n'y a pas de bouton « Reprendre » sur l'accueil pour la simulation libre.
- Un projet illisible reste dans la liste (marqué « Illisible ») : il s'ouvre sur le dialogue de récupération habituel, s'exporte tel quel ou se supprime ; il ne se renomme ni ne se duplique.
- Deux projets ne peuvent pas porter le même nom (majuscules comprises) ; à la création, à l'import et à la copie, un nom libre est proposé (« Projet 3 », « Mon projet 2 », « … (copie) »).
- Le premier usage, sans aucun projet, montre une liste vide et « Nouveau projet ».

## Ce que la V7.42 a fait autrement que prévu

- Le widget est fait au BeginPlay du composant (avant l'Event BeginPlay de l'acteur : Get User Widget Object y marche déjà), mais il n'arrive à l'écran, avec Pre Construct et Construct, qu'à l'image suivante, comme le widget Screen d'UE ajouté à son calque au premier Tick. À vérifier dans l'éditeur d'UE.
- Draw Size en pixels de l'écran de référence (720 de haut), mis à l'échelle comme les widgets du viewport ; par défaut 500 × 500, comme UE. Location Y négatif le remonte à l'écran (Location Z dans UE).
- Les widgets des Widget Components sont sous ceux du viewport. Hors Play, l'éditeur (niveau et Viewport du Blueprint) dessine le cadre de la Draw Size avec le nom du Widget Blueprint.
- Pas de Set Widget ni de Set Draw Size en jeu : ils ne sont pas demandés par les étapes prévues (noté au BACKLOG si besoin).
- Le correcteur ne sait pas encore toucher le bouton d'un Widget Component par son nom (les scénarios touchent ceux du viewport) : à ajouter en V7.43 si une étape le demande.

## Ce que la V7.43 a fait

Quatre étapes, notion `widget-component` (échelle découverte → guidée → transfert, plus un Débogue) :

- **« La barre au-dessus de l'ennemi »** (découverte, juste après T4) : trois ennemis avec BP_Sante ; poser le Widget Component (WBP_BarreVie), régler Draw Size et Location Y. Aucun nœud. Les pièges vérifiés : 500 × 500, widget sur l'acteur, Widget Class à None.
- **« Une barre par ennemi »** (guidée) : après InfligerDegats, Get User Widget Object → Cast To WBP_BarreVie → AfficherVie (Vie de BP_Sante). Chaque barre suit son ennemi ; l'ennemi à 0 part avec la sienne (OnMort → Delay 0,3 → Destroy Actor, pour qu'on voie la barre à 0).
- **D26 « La barre figée »** (après « Le checkpoint ») : le Widget Class a été changé pour WBP_BarreBoss, une copie : le Cast échoue sans erreur. Deux corrections acceptées (remettre WBP_BarreVie, ou caster vers la copie). L'hypothèse avant l'indice désigne la référence.
- **Transfert T5 « Les noms au-dessus des têtes »** (avant S4) : trois membres d'équipage, un Nom Instance Editable chacun ; à l'Event BeginPlay, Get User Widget Object → Cast To WBP_Etiquette → AfficherNom (Nom).

Pas d'étape « Appuie sur E au-dessus de l'objet » : le Transfert T5 fait le même travail dans une autre situation, et l'invite d'écran existe déjà (V7.37).
