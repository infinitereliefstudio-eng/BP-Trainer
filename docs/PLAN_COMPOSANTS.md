# Chantier Actor Components — analyse (19 novembre 2026)

Copie du Claude Doc https://claude.ai/artifact/XDjSV8p3shFJUTwkwDfzmX (« BP Trainer — Chantier Actor Components »). Le 19 novembre, Tristan a validé les cinq recommandations (section « Décisions » en fin de document). **V7.19, V7.20 et V7.21 faites le 19 novembre** (détail dans HANDOFF.md) ; V7.22 attend son feu vert. En V7.20, D22 est « Le scanner et le chariot » (Get Component by Class sans Is Valid) et « Parent ou composant ? » est devenu « Le verrou à badge ». En V7.21, la batterie oublie la Target de Get Distance To (même erreur que Get Actor Location) et le sac et le coffre donnent l'inventaire déjà écrit, sauf Retirer.

## En bref

Taille **L**, quatre versions, une à la fois avec feu vert entre chaque :

| Version | Contenu | Taille |
|---|---|---|
| V7.19 Moteur | Classe native ActorComponent, une instance par acteur (Spawn et joueur compris), Get Owner, Get Component by Class, Get Components by Class, événement « On … (composant) », Bind Event to On Actor Begin Overlap, erreurs de compilation d'UE, interface (Pick Parent Class, + Add, Details), débogage par copie, format 11, fiche du mémo réécrite | M à L |
| V7.20 Découverte | La santé est partout (refactor), Qui commence ? (Prédis), Le piège qui blesse tout (transfert), Accessed None sur la caisse vide (débogue), Parent ou composant ? | M |
| V7.21 Usages | Le sac et le coffre (inventaire), Interagir par composant, La batterie qui ne sait pas où elle est (débogue : Get Actor Location sans Target), autonomie différée L'énergie de la station | M |
| V7.22 Reprise | Glossaire, mémo, révision, notions, rappels dans l'Avancé, conseil « chaîne copiée » (parent ou composant), fiches sur L'héritage et X2, étude de S4 | S à M |

Place recommandée : Avancé, juste après « L'héritage » (fonctions, dispatchers, interfaces, Cast déjà vus ; comparaison « est un » / « a un »). Environ neuf étapes de plus (115 → ~125).

## Règles d'UE à reproduire

- Self est le composant, pas un acteur : un nœud à Target « self » de type Actor non relié = erreur de compilation (`defaultsToSelf` existe déjà dans les définitions).
- Get Owner : l'acteur porteur. Dans un acteur, Get Owner renvoie en général None (piège à montrer).
- BeginPlay des composants **avant** l'Event BeginPlay de leur propriétaire (ordre du moteur, pas aléatoire).
- Event Tick et Start with Tick Enabled ; End Play et disparition avec l'acteur.
- Pas de Timeline, pas de Construction Script, pas de Viewport, pas d'overlap direct dans un composant.
- Un Interface Message envoyé à l'acteur ne va pas à ses composants.
- Get Component by Class : None sans composant de cette classe.
- Hors chantier : Scene Components en Blueprint, Add Component by Class / Destroy Component, Activate / Deactivate.
- À vérifier avant d'écrire une leçon dessus : ordre de Tick acteur / composants ; événements Enhanced Input dans un composant.

## Mise en place (repères dans le code)

- Modèle : nouvelle `ParentClass` `ActorComponent` (sur le modèle de `SaveGame` : pas de composants, jamais posé) ; entrée de composant qui pointe vers la classe, avec ses valeurs propres ; valeurs par acteur posé si Tristan le valide. `PROJECT_FORMAT` 11.
- Runtime : une instance d'objet par composant (comme `createSaveGame`, rangée avec un lien vers l'owner), incluse dans les événements BeginPlay (avant l'owner) et Tick ; détruite avec l'owner. Les nœuds génériques (appels, Get/Set d'un autre Blueprint, Bind Event, Cast) marchent déjà sur les objets.
- Compilation : Target self non-acteur, Timeline et événements d'entrée refusés, composant supprimé encore utilisé.
- UI : Pick Parent Class, éditeur sans Viewport / Components / Construction Script, + Add des composants du projet, Details (variables Instance Editable, bouton vert des dispatchers), choix de la copie déboguée, Outliner en direct.
- Tests : fichier de fidélité dédié (copies indépendantes, ordre des BeginPlay, Get Owner, None, destruction).

## Effets sur l'existant

Aucune étape ne change de règle ni de solution. Fiches ou « autres façons de faire » possibles : L'héritage, X2, L'inventaire et C5 (reprise en composant dans une nouvelle étape), Le levier universel / Regarder et interagir / R4 (alternative Interaction en composant), S4 (à étudier), rappels dans l'Avancé, conseil de qualité, mémo et glossaire. Vocabulaire : dire « Actor Component » ou « composant de logique », « composant » désignant déjà Static Mesh, Point Light, Box Collision.

## Décisions (19 novembre) : les recommandations, validées par Tristan

1. Place : Avancé, juste après L'héritage.
2. Valeurs du composant réglables par acteur posé dès la V7.19.
3. Bind Event to On Actor Begin Overlap dès la V7.19.
4. Add Component by Class, Destroy Component : plus tard, hors chantier.
5. Anciennes étapes gardées telles quelles, avec fiches et « autres façons de faire ».
