# Revue du chantier annexe Widget Component et projets, V7.41 à V7.43 (20 novembre 2026)

Copie du Claude Doc « BP Trainer — Revue du chantier annexe (V7.41 à V7.43) » : https://claude.ai/artifact/138H1RP5QSDFRbmznHPFyu. Demandée par Tristan le 20 novembre au soir (« je veux faire une phase de review du dernier chantier »). **En attente de ses réponses aux deux questions et de son feu vert pour les corrections.**

État de départ : lint, types et build sans erreur, 1 735 tests, smoke test sans erreur (captures 100 à 109 relues), CI verte sur les quatre pushs. Rien ne casse une sauvegarde ni une progression. Chaque constat a été reproduit par un test jetable (non versionné) ou se lit dans le code.

Juste et à garder : Mes projets (un projet par clé, liste lue dans le stockage, ancien projet repris sous `main` avec `current-project`, projet illisible gardé et exportable, suppression par la file d'écriture, sauvegarde complète qui emporte tout) ; Widget Component (widget fait au BeginPlay du composant avant l'Event BeginPlay de l'acteur, comme `InitWidget`, Construct à l'image suivante, Destruct avec l'acteur, un exemplaire par acteur, Spawn Actor et Blueprints enfants compris — vérifié —, calque sous le viewport comme le Layer Z Order −100 d'UE, Get User Widget Object typé User Widget, None sans Widget Class) ; étapes (échelle propre, chaque piège a son message, D26 accepte les deux corrections, aucun cas de leçon dans le moteur).

## Constats

| Code | Constat | Gravité | Lot |
| --- | --- | --- | --- |
| W1 | La Location du Widget Component tourne avec l'acteur (`componentTransform` applique le yaw) : avec Location Y −80, un ennemi tourné de 180° a sa barre dessous, à 90° à côté ; le joueur s'oriente dans le sens de la marche, une étiquette sur BP_Joueur tourne autour de lui. Dans UE, Location Z reste vers le haut. Même défaut dans `drawWidgetFrame` (éditeur). Les quatre étapes passent (acteurs à yaw 0) | Haute | 1 |
| P1 | L'import (Mes projets et menu ⋮ de l'éditeur, `importOne` / `importAsNew`) met `p.rules = RULES_VERSION` avant d'enregistrer : `noticesFor` ne montre plus jamais l'avis de règles changées. Avant la V7.41, l'import de l'éditeur l'affichait | Moyenne | 1 |
| P2 | Deux exports : Mes projets par `saveFile` (partage Android), menu ⋮ par `exportProject` (téléchargement) ; les deux remplacent les accents du nom par `_` | Faible | 2 |
| P3 | Nom de plus de 60 caractères possible à l'import (`uniqueName` ne coupe pas) ; une sauvegarde complète d'un autre appareil peut amener deux projets du même nom | Faible | 2 |
| L1 | « Une barre par ennemi » refait Get User Widget Object + Cast To à chaque coup ; caster une fois au BeginPlay et garder la référence n'est montré nulle part (une `alternatives` s'y prête) | Faible | 2 |
| L2 | Taille conseillée : 150 × 20 dans l'aide des Details, 120 × 14 dans les étapes | Faible | 2 |
| D1 | HANDOFF (Reprise rapide, puce UMG) et BACKLOG (ligne du chantier n° 3) disent encore « Widget Component au backlog faute de décision » ; la ligne Widget Component du BACKLOG, marquée fait, finit par « Décision à prendre par Tristan » | Faible | 2 |
| N1 | Supprimer un projet laisse ses copies `rescue:project:sandbox:<id>:…` (gardées dans la sauvegarde complète) : choix de prudence, à garder | Note | — |
| N2 | `KNOWN_GAPS` remonté de 2 pour six notions (étapes insérées dans leur écart) : accepté | Note | — |

À vérifier, pas des erreurs prouvées : Get User Widget Object valide dans l'Event BeginPlay (T5 en dépend) ; Set Actor Hidden In Game cache-t-il le widget Screen dans UE (le calque regarde la visibilité du composant) ; Add to Viewport sur ce widget (ici l'avertissement « already has a parent widget », UE ne le donne que pour un parent UMG) ; Remove from Parent (ici silencieux, UE écrit un avertissement en PIE) ; sur téléphone, une image de retard des barres quand la caméra suit le joueur (`ComponentWidgets` lit `PlaySession.camera`, posée par le dessin du niveau).

## Lots proposés

| Lot | Contenu | Version | État |
| --- | --- | --- | --- |
| 1 | W1, P1 : widget au-dessus de son acteur quelle que soit sa rotation (Play et cadre de l'éditeur) ; avis de règles à l'ouverture d'un projet importé ; un test chacun | V7.44 | proposé |
| 2 | P2, P3, L1, L2, D1 : un seul export (partage), accents gardés dans le nom du fichier, noms coupés à 60 et uniques à l'import et à la restauration, autre façon de faire « caster une fois au BeginPlay », taille alignée, docs | V7.45 | proposé |

## Questions à trancher

1. W1 : la Location du Widget Component devient un décalage à l'écran qui ne tourne jamais avec l'acteur, Y négatif = au-dessus (recommandé, c'est ce que disent les fiches) ; ou garder la rotation et l'expliquer.
2. L1 : ajouter l'autre façon de faire « caster une fois au BeginPlay » à « Une barre par ennemi » (recommandé) ; ou la laisser au backlog.
