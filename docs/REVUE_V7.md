# Revue des V7.2 à V7.22 (19 novembre 2026)

Copie du Claude Doc « BP Trainer — Revue des V7.2 à V7.22 » : https://claude.ai/artifact/4168bocdMoe9oJvuaNt7eJ. Demandée par Tristan pour tout ce qui a été livré les 18 et 19 novembre ; il a lancé les corrections « dans l'ordre le plus logique », un lot par version.

État de départ : lint, types et build sans erreur, 1 116 tests, smoke test sans erreur. Rien ne casse une sauvegarde ni une progression.

## Constats

| Code | Constat | Lot |
| --- | --- | --- |
| F1 | Add / Remove Mapping Context ignoraient l'option d'UE Ignore All Pressed Keys Until Release (cochée par défaut) : à X1, un appui de 0,1 s sur E affichait R1 puis R2 aussitôt | 1 |
| F2 | Une case Consume Input sur l'événement d'une Input Action : n'existe pas dans UE (K2Node_EnhancedInputAction), où tous les acteurs qui écoutent l'action la reçoivent ; la priorité se joue entre Mapping Contexts. R4 et le défi de « Les contrôles au Player Controller » enseignaient le contraire. Les 40 étapes concernées passent sans | 2 |
| V1 | Les scénarios appuient et relâchent dans la même image : aucun appui tenu comme au doigt | 1 |
| V2 | Les contrôles de X1 ne voyaient pas une réplique sautée | 1 |
| P1 | En Avancé, la marche guidée d'une notion neuve (R5, composants) cachait sa méthode jusqu'à la réussite, sans solution après des échecs | 3 |
| P2 | M1, M2, X1, X2 n'existaient que dans la doc : l'appli affichait Leçon 56, 60, 65, 66 | 3 |
| P3 | Durées sous-estimées quand on crée des assets (R5 : 5 min) ; codes dans l'ordre de création (renumérotage laissé de côté) | 3 |
| I1 | Barre d'outils tronquée en paysage (« Class Settinc ») | 4 |
| C1 | `simulation.ts` et `interpreter.ts` grossissent | 2 |
| C2 | `writeMany` (restauration) hors de la file d'écriture | 4 |
| C3 | HANDOFF.md : sections anciennes contradictoires | 4 |

À vérifier dans Unreal, pas des erreurs prouvées : ordre du Tick entre un acteur et ses composants ; Get Owner du pion (son Player Controller dans UE, None ici).

## Lots

| Lot | Contenu | Version | État |
| --- | --- | --- | --- |
| 1 | F1, V1, V2 : changer de contexte comme dans UE | V7.23 | fait |
| 2 | F2, C1 : actions reçues par tous | V7.24 | fait |
| 3 | P1, P2, P3 (durées) : aide et repères | V7.25 | à faire |
| 4 | I1, C2, C3, actions GitHub : retouches | V7.26 | à faire |

Sources : [ModifyContextOptions (Epic)](https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/ModifyContextOptions), [UK2Node_InputAction (Epic)](https://dev.epicgames.com/documentation/unreal-engine/API/Editor/BlueprintGraph/UK2Node_InputAction?lang=en-US), [forum Epic sur Consume Input et Enhanced Input](https://forums.unrealengine.com/t/consume-input-doesnt-work-the-input-still-propagates-everywhere/1213316).
