# Chantier annexe : retouches de l'interface (proposé le 2026-11-19)

Copie du Claude Doc « BP Trainer — Chantier annexe : retouches de l'interface », https://claude.ai/artifact/WRanWML2cVLLUVDQUMChJx. **Proposé, pas lancé** : attend le feu vert de Tristan. Demande : un petit chantier d'amélioration de l'interface et de l'aspect général, pas une refonte, avant l'UMG minimal.

## Constat (97 captures du smoke test, 800 × 370, et taille d'un Pixel 9 Pro, environ 952 × 412)

1. Le graphe n'a que 60 % de la hauteur : onglets, barre d'outils, objectif et barre du bas prennent environ 148 px sur 370.
2. Les boutons flottants (↶ ↷ Sélection ⌖ +) forment une rangée de 44 px qui recouvre les nœuds, et le cadrage réserve 80 px pour elle (`FAB_BAND` dans `editor/GraphCanvas.tsx`) : la vue de départ est calculée sur environ 140 px de haut.
3. D'où le zoom plancher presque toujours atteint (`READABLE_ZOOM` = 0,6) : les noms de pins (12 px) s'affichent à environ 7 px.
4. Les toasts de compilation apparaissent en haut au centre, sur les événements.
5. Accueil en paysage : l'en-tête prend un tiers de l'écran.
6. Barre du bas : un seul bouton « Compiler Results · Output Log · Debug · Find ».
7. Retouches du BACKLOG : menu ⋮ trop étroit, « 0 » de l'axe du Timeline ; en Play, les vitesses recouvrent le texte du niveau.
8. Une trentaine de couleurs en dur à côté des variables CSS.

Prototype jetable (bandes compactes, `FAB_BAND` 0, `READABLE_ZOOM` 0,75) : graphe de 220 à 245 px, cadrage sur toute la hauteur, pins à environ 9 px. Les cinq boutons flottants en colonne ne tiennent pas à 370 px : il faut les regrouper (A2).

## Lot A — Plus de place, texte lisible (V7.31)

- A1. Bandes compactes en paysage bas (`max-height: 480px`) : onglets 32, barre d'outils 34, objectif 30, barre du bas 28. Rien ne change sur un grand écran.
- A2. ↶ ↷ ⌖ et Sélection (en icône, avec aria-label et title) en colonne de boutons de 36 px au bord droit ; le + seul en bas à droite ; le cadrage réserve la colonne à droite au lieu d'une bande en bas.
- A3. Zoom plancher du cadrage 0,6 → 0,75 (sans toucher aux polices des nœuds : les graphes de départ se chevaucheraient).
- A4. Toasts en bas à droite, plus petits, effacés après quelques secondes.

## Lot B — Cohérence et retouches (V7.32)

- B1. Barre du bas en onglets séparés (badge « erreurs » sur Compiler Results).
- B2. Accueil et Révision en paysage : en-tête sur une ligne, bandeau de révision plus fin ; deux rangées de cartes visibles.
- B3. Menu ⋮ plus large, « 0 » de l'axe du Timeline, contrôles de Play qui ne recouvrent plus le niveau.
- B4. Couleurs en dur passées en variables CSS (aucun changement visible voulu).

## Hors chantier

Taille du texte réglable (à revoir après A3), police ou texte des nœuds plus gros, portrait, nouveau thème, icônes des nœuds, rangement automatique.

## Questions posées à Tristan

1. Les deux lots à la suite, ou le lot A seul d'abord ?
2. Zoom plancher 0,75 (proposé) ou 0,7 ?
