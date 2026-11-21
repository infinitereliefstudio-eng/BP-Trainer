# Revue du chantier « progression des exercices » (V7.57 à V7.61)

Copie du Claude Doc « BP Trainer — Revue du chantier « progression des exercices » (V7.57 à V7.61) » : https://claude.ai/artifact/GsxbLwNZekagbKpLrtFyQj (le doc fait foi s'il a été modifié depuis).

Demandée par Tristan le 21 novembre à 21 h 03 (« fait une review du dernier chantier »). **Rien n'est lancé** : les trois versions proposées attendent son feu vert.

## En bref

Le chantier tient : lint, tsc, 1 891 tests, build et CI (smoke compris) sont verts, et les cinq versions font ce que la revue promettait. Mais quatre points touchent l'apprenant :

1. **D3 La tourelle** : la ligne du Player Controller fournie produit un Accessed None au deuxième appui sur E, dans l'étape qui apprend Is Valid.
2. La vérification « BP_PlayerController reçoit IA_… » passe même si la ligne ne prévient pas l'objet : l'apprenant reçoit alors des messages qui l'envoient chercher dans le mauvais Blueprint.
3. Les notions déclarées de S2, S3 et S4 n'ont pas suivi leur réécriture : l'accueil ne prévient plus qu'il manque le GameInstance ou le Line Trace avant S4.
4. Les exercices ont beaucoup grossi : S3 (58 nœuds) et M4 (57) dépassent les deux projets Expert (48 et 55).

## Méthode

Relecture des diffs (33 fichiers, +2 046 lignes), puis des scripts jetables (non gardés) : le conseil « Un objet du décor écoute les touches » sur chaque solution et chaque autre façon de faire des 152 étapes ; les 16 étapes converties rejouées avec les appuis répétés ; une ligne du Player Controller branchée sur un Print String au lieu de l'objet ; notions écrites par les solutions comparées aux notions déclarées ; taille des solutions avant et après (V7.56 et V7.61).

## Ce qui va bien

- **Conversion des commandes** (`playerCommands.ts`) : propre et rejouable. Solution, autres façons de faire et robustesse tournent sur l'ancienne forme puis sont reconverties ; aucune des 16 étapes ne casse.
- **Le conseil `decor-input`** ne se déclenche sur aucune solution de référence ni aucune autre façon de faire, avant comme après « Interagir comme dans UE5 ».
- **L67** est une vraie boîte de dialogue, bien vérifiée (créée une fois, retirée à la fin). La fiche des commandes dit honnêtement que Get Actor Of Class au moment de l'appui est un raccourci.
- **M5** est fidèle à UE : composant abonné à l'overlap de son propriétaire, crédits dans le GameInstance, total dans un Widget Component.
- **Écarts d'espacement** : Player Controller 45 → 19, UMG 40 → 31 ; entrées, Actor Components et Widget Component sous 15.

## Lot 1 : ce que voit l'apprenant (V7.62)

**A1. D3 La tourelle, Accessed None dans le code fourni.** La ligne ajoutée au Player Controller (IA_Interagir → Get Actor Of Class (BP_Cible) → Abattre) n'a pas d'Is Valid. Après la destruction de la cible, un deuxième E donne « Accessed None trying to read property Target » dans BP_PlayerController. C'est ce que ferait UE, mais dans l'étape qui apprend justement ce piège. C'est la seule des 16 étapes concernées (vérifié en rejouant les appuis deux fois). Proposé : un Is Valid dans la ligne fournie de D3, avec une phrase dans la fiche (« même réflexe ici »).

**A2. La vérification `pc-<action>` est trop large.** Elle passe dès que l'action est reliée à quelque chose dans un Player Controller. Testé : ligne branchée sur un Print String dans L36, L61 et C6. L'apprenant lit alors « Aucune carte affichée : sur E, affiche la carte tirée avec Print String » ou « Le meuble est à X = 200 », et va chercher dans BP_Paquet ou BP_Outil, qui sont justes. Proposé : vérifier que l'action atteint l'appel du Custom Event sur la bonne classe. Sinon, message dédié : « IA_Tirer arrive dans BP_PlayerController, mais n'appelle pas Tirer sur BP_Paquet ».

**A3. Notions déclarées pas à jour (`lessonNotions.ts`).** L'accueil s'en sert pour prévenir qu'une étape suppose une notion pas encore vue.

| Étape | Déclaré mais plus écrit | Écrit mais pas déclaré |
| --- | --- | --- |
| S4 Les fusibles | sets, begin-order, rotation | GameInstance, Line Trace, interfaces, Actor Components, Player Controller, entrées |
| S2 La réserve | — | Timeline, UMG, Player Controller, Sequence |
| S3 Le poste de garde | choose-tool | UMG, ui-input, Player Controller |
| L67 Le dialogue en Data Table | — | UMG, Player Controller |
| M4, M5, L53, L66, C6, L72 | quelques-unes | Player Controller, fonctions, autre Blueprint |

Proposé : remettre ces lignes à jour, plus un test : pour les synthèses et les entraînements mélangés, chaque notion écrite par la solution doit être déclarée.

**A4. S2 fait écrire un Sequence jamais écrit avant.** Sequence n'apparaît que dans deux Prédis (étapes 16 et 32) ; S2 (étape 49) est la première à le faire écrire, et ses indices et sa solution le nomment. Or une synthèse ne devrait demander que du connu. Proposé : solution par Timeline Finished → Delay → Reverse (déjà vu), Sequence restant possible.

## Lot 2 : la taille et la progression (V7.63)

**B1. Le Confirmé est devenu plus gros que l'Expert.** Nœuds à écrire, avant → après :

| Étape | Niveau | V7.56 | V7.61 |
| --- | --- | --- | --- |
| S2 La réserve | Intermédiaire | 15 | 29 |
| S3 Le poste de garde | Confirmé | 35 | 58 |
| M4 Le stand de tir | Confirmé | — | 57 (dont 40 dans le Player Controller) |
| S4 Les fusibles | Avancé | 37 | 51 |
| X2 L'atelier des machines | Expert | 48 | 48 |
| X1 La radio de la station | Expert | 55 | 55 |

Sur téléphone, 57 nœuds en Confirmé, c'est beaucoup. M4 a reçu en plus « E cache et remontre le tableau » (Flip Flop), seulement pour que l'écart des entrées reste sous 15 : une fonctionnalité ajoutée pour un indicateur. Proposé : retirer ce masquage de M4 (l'écart des entrées remontera un peu, à accepter dans `KNOWN_GAPS`) ; garder S3 telle quelle ; noter pour l'analyse du chantier n° 5 que X1 et X2 doivent redevenir les plus gros.

**B2. Menus et modes d'entrée : toujours rien dans l'Avancé.** Après S3 (étape 98), plus aucune étape ne fait écrire Set Input Mode, le curseur ou un bouton (écart de 55, tout l'Avancé). Le constat 2 de la revue n'est traité qu'à moitié. Proposé : le laisser au projet Expert final (un menu, une pause), à inscrire dans son analyse plutôt que de grossir encore S4 ou M5.

## Lot 3 : code (V7.64, rien ne change pour l'apprenant)

- **C1. `Umg.textLog` grossit sans limite.** Chaque Set Text est gardé, aussi en simulation libre, et la liste traverse Open Level. Un Event Tick → Set Text, fréquent chez un débutant, ajoute environ 60 entrées par seconde. Proposé : ne remplir le journal que pendant Vérifier (le runner l'active), ou le plafonner.
- **C2. `shown()` ne regarde pas si le texte est visible.** Un Set Text sur un widget créé mais jamais ajouté à l'écran compte comme « à l'écran ». Le risque est faible aujourd'hui (WBP_Messages est fourni avec Add to Viewport, L67 vérifie la boîte), mais M5 accepte « 17 » écrit dans n'importe quel widget. Proposé : noter aussi le widget, et que `onScreen` ne compte que ceux affichés (viewport ou Widget Component visible).
- **C3. Retouches.** La tournure « que BP_PlayerController appelle sur IA_Interagir » (L49, D17, L67) devient « appelle quand on appuie sur IA_Interagir ». Get Show Mouse Cursor est sorti d'`enhanced-input` mais rangé nulle part : le mettre dans `ui-input`.

## Questions à trancher

1. Les trois lots, dans l'ordre ? Recommandé : oui, une version chacun.
2. M4 : retirer le masquage du tableau (recommandé) ou le garder ?
3. Menus dans l'Avancé : dans le projet Expert final (recommandé), ou maintenant dans S4 ou M5 ?
4. Journal des textes : rempli seulement pendant Vérifier (recommandé), ou plafonné ?

## Suite donnée (21 novembre 2026)

Tristan a lancé les corrections à 21 h 14 (« Ok passe aux corrections ») : les recommandations sont prises. **V7.62 faite** (lot 1). Écart : A4, S2 garde Sequence (Finished → Delay → Reverse relancerait l'attente quand la porte a fini de se refermer) ; l'indice renvoie au Prédis P1 « Sequence et Delay ».
