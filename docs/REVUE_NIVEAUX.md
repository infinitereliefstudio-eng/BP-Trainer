# Revue du chantier n° 4, niveaux et GameInstance, V7.46 à V7.51 (21 novembre 2026)

Copie du Claude Doc « BP Trainer — Revue du chantier n° 4 (V7.46 à V7.51) » : https://claude.ai/artifact/7kzFMMAK2ZHTviw3rudRSW. Demandée par Tristan le 21 novembre (« fait une review du dernier chantier »). Tristan a répondu le 21 novembre à 17 h 28 (« Ok pour 1 et 2, pour trois on simule maintenant, on peut passer à la correction ») : L2 devient une version à part, V7.53 (plusieurs Player Start simulés), et le lot 2 passe en V7.54. **Les trois versions sont faites** (V7.52 à V7.54).

État de départ : lint, types et build sans erreur, 1 830 tests, smoke test sans erreur (captures 110 à 121 relues), CI verte sur les cinq derniers pushs. Rien ne casse une sauvegarde ni une progression. Chaque constat a été reproduit par un test jetable (non versionné) ou se lit dans le code.

Juste et à garder : la partie `Game` au-dessus de `Simulation` (un monde neuf par Open Level, Output Log, slots, joystick et GameInstance gardés) ; le voyage pas immédiat (la chaîne finit, puis Destruct, End Play en Level Transition, monde neuf) ; le Travel Failure qui laisse la partie continuer ; les références du GameInstance vers l'ancien monde mises à None, joueur, Player Controller et GameMode compris ; Event Init une seule fois, Event Shutdown au Stop et à Quit Game ; le vrai GameMode (Default GameMode, GameMode Override, héritage des Class Defaults) ; la migration 13 → 17 (Lvl_Principal, BP_GameMode qui reprend l'ancien pion) ; Play du niveau ouvert, correcteur au Game Default Map ; aucun cas de leçon dans le moteur ; les huit étapes (un message par piège, D27 et D28 bien construits, P17 juste).

## Constats

| Code | Constat | Gravité | Lot |
| --- | --- | --- | --- |
| R1 | « Pourquoi ? » ne voit que le dernier niveau : chaque monde a son propre `RunRecord`, et l'appli garde celui du monde en cours. Reproduit sur D27 après Vérifier : sur le Destroy Actor ou le Cast To de BP_Piece, « Pourquoi ? » répond « Aucun acteur BP_Piece n'a existé pendant la partie… place-le dans le niveau ». « Montre-moi », l'Execution Trace et les valeurs des pins ne voient pas non plus le couloir. Touche toute partie qui a changé de niveau, dont D27 et D28 | Haute | 1 |
| G1 | Event Init arrive trop tard : il part au `start()` du premier monde, après la création du GameMode, du Player Controller et du pion. Reproduit : dans Event Init, Get Player Pawn et Get Game Mode sont valides. Dans UE, Init a lieu avant que le GameMode et le joueur existent (en Play dans l'éditeur comme en jeu empaqueté) : un élève peut écrire dans l'appli un Init qui échoue dans UE | Moyenne | 1 |
| G2 | Un timer lancé par le GameInstance s'arrête à Open Level (reproduit : un timer en boucle posé à Event Init ne tique plus dans l'atelier). Dans UE, le Timer Manager appartient au GameInstance : un timer dont l'objet est le GameInstance continue après le voyage (forum Epic ; même chose annoncée pour un Delay). C'était noté « à vérifier » au BACKLOG | Moyenne | 1 |
| P1 | A4, son « À retenir » et le mémo « Niveaux et sauvegarde » présentent Event Shutdown comme le bon moment pour écrire le slot. Sur Android, Event Shutdown n'a pas lieu quand on ferme l'appli depuis les applis récentes (Epic, UE-22652 et UE-17241 : sauver plutôt en passant en arrière-plan). Pour un élève qui vise le téléphone, la solution de référence apprend un réflexe fragile | Moyenne | 2 |
| P2 | Les rappels prévus par le plan ne sont pas là : cast, overlap, sets, save-game et player-controller (ce dernier à l'étape 5). Seule « Arriver par la bonne porte » déclare un rappel (other-bp). `KNOWN_GAPS` a été relevé : player-controller 46 → 54, tick 47 → 55, hit 20 → 28, inheritance 29 → 37, timers 28 → 34, visibility 26 → 30, et actor-components, enhanced-input, input, widget-component dépassent 15 | Moyenne | 2 |
| L1 | T6 vérifie le pion du couloir, pas le Default GameMode. Reproduit : Default GameMode réglé sur le drone, un override BP_Joueur sur le couloir et un override drone sur l'atelier, l'étape passe ; un troisième niveau aurait le drone, contre le cahier des charges | Faible | 2 |
| L2 | « Arriver par la bonne porte » place le pion à la main (Set Actor Location). Dans UE, le geste natif est plusieurs Player Start avec un Player Start Tag, et le GameMode qui choisit (Choose Player Start). L'appli n'a qu'un Player Start par niveau : le dire dans une note « Dans UE », et noter la piste au backlog | Faible | 2 |
| E1 | Stop pendant un breakpoint dans un End Play de voyage : les acteurs déjà passés reçoivent un second End Play (End Play In Editor). Reproduit | Faible | 1 |
| E2 | Chaque Open Level recopie tous les objets SaveGame jamais créés, même oubliés (20 voyages : 20 objets). Sans effet visible, mais la liste ne fait que grandir | Faible | 1 |
| D1 | HANDOFF : « Ce qui reste à faire » dit encore « V7.47 à V7.51 à faire » ; « Le parcours aujourd'hui » dit 140 étapes et 170 questions ; la liste à cocher dit « 140 depuis la V7.43 » (148). BACKLOG : « Essais de Tristan en retard » s'arrête à la V7.47. E40 du recueil n'a toujours pas été relu pour les étapes 3 à 6 | Faible | 2 |

À vérifier, pas des erreurs prouvées : Open Level appelé dans Event Init (l'appli l'accepte et A4 passe ainsi ; dans UE, probable en Play dans l'éditeur, incertain en jeu empaqueté) ; un widget créé par le GameInstance après Open Level (ici la référence devient None) ; l'ordre d'Event Shutdown et du dernier End Play au Stop ; un Delay dans le graphe du GameInstance.

Note pédagogique, sans lot : T6 est la première étape où l'élève crée un GameMode et ouvre les World Settings, sans découverte ni guidée avant (la notion `game-mode` commence au transfert). La carte donne le lieu (WorldSettings) ; Pick Parent Class montre Game Mode Base. À garder tel quel, sauf si Tristan bute dessus en l'essayant.

## Lots proposés

| Lot | Contenu | Version | État |
| --- | --- | --- | --- |
| 1 | R1, G1, G2, E1, E2 : ce que la partie a fait suivi sur toute la partie (« Pourquoi ? », « Montre-moi », Execution Trace) ; Event Init avant le GameMode, le Player Controller et le pion (Get Player Pawn, Get Player Controller et Get Game Mode rendent None pendant Init) ; timers du GameInstance qui survivent à Open Level ; un seul End Play par acteur ; SaveGame gardés seulement s'ils sont référencés. Un test chacun | V7.52 | fait |
| 2 | P1, P2, L1, D1 : A4 sauve à la porte (et à Event Shutdown en complément), « À retenir », mémo et note « Dans UE » sur le téléphone ; un rappel court de Player Controller dans une des huit étapes, `KNOWN_GAPS` redescendus ; T6 vérifie le Default GameMode ; docs à jour | V7.54 | fait |
| L2 | Plusieurs Player Start par niveau, Player Start Tag, Choose Player Start du GameMode (défaut d'UE et surcharge en Blueprint) ; « Arriver par la bonne porte » refaite avec | V7.53 | fait |

## Questions à trancher

1. G2, timers du GameInstance : les faire survivre à Open Level, comme le Timer Manager d'UE (recommandé ; je l'écris d'après les sources, et toi tu peux le confirmer dans UE) ; ou les garder liés au niveau et l'expliquer. **Réponse : survivre.**
2. P1, la solution de référence d'A4 : sauver à la porte, avant Open Level, et à Event Shutdown en complément (recommandé, ça marche aussi sur Android) ; ou garder Event Shutdown seul, avec un avertissement. **Réponse : à la porte et à Shutdown.**
3. L2, plusieurs Player Start avec Player Start Tag : une note « Dans UE » et le backlog (recommandé) ; ou les simuler maintenant (un chantier en soi). **Réponse : les simuler maintenant.**

## Sources

- [Timers going off after level change](https://forums.unrealengine.com/t/timers-going-off-after-level-change/72674) — forum Epic : le Timer Manager du GameInstance survit au chargement d'un niveau
- [UE-22652](https://issues.unrealengine.com/issue/UE-22652) et [Save game not working on android](https://forums.unrealengine.com/t/save-game-not-working-on-android/300362/20) — Event Shutdown n'est pas appelé quand on tue l'appli sur Android
- [UE-17241](https://issues.unrealengine.com/issue/UE-17241) — Epic : utiliser Application Will Enter Background plutôt qu'End Play
- [PlatformGameInstance](https://docs.unrealengine.com/5.1/en-US/PythonAPI/class/PlatformGameInstance.html) — aucune garantie de fermeture sur mobile, sauver en passant en arrière-plan
- Dépôt : `src/core/runtime/game.ts`, `src/core/runtime/simulation.ts` (`start`, `endForTravel`, `endGame`), `src/core/explain/diagnose.ts`, `src/core/explain/stops.ts`, `src/ui/panels/NodeDiagnosis.tsx`, `src/core/lessons/library/travel.ts`, `src/core/reference/memo.ts`, `tests/spacing.test.ts`
