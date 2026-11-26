/**
 * The three families of the editor's interface (UI-4, V7.76), so the learner sees what comes from UE and what the
 * app adds. In the editor (not on the home screen, which is the app itself):
 * - **UE**: as in UE5's editor; no mark (no attribute).
 * - **app** (`data-origin="app"`): what BP Trainer adds to learn (lesson, objectives, Vérifier, help, speeds…); in
 *   amber, which is kept for that, with the cap icon on its main buttons; hidden by « Vue UE pure ».
 * - **touch** (`data-origin="touch"`): what replaces the mouse, the keyboard or a fixed panel of UE on a phone; a
 *   dashed outline; a long press says what to do in UE (`data-ue`, one of the texts below).
 * Warnings use UE's yellow (--warn), never the amber.
 *
 * `data-pure="keep"` keeps an app element in « Vue UE pure » (the way home, and the way out of the view).
 * tests/uiOrigins.test.ts checks that each text below is used, and docs/INTERFACE_FAMILLES.md lists the elements.
 */

export type Origin = 'app' | 'touch';

/** What a touch control stands for in UE, said on a long press. */
export const UE_HINT = {
  undo: 'Dans UE : Ctrl+Z, ou Edit › Undo.',
  redo: 'Dans UE : Ctrl+Y, ou Edit › Redo.',
  select: 'Dans UE : glisser sur le vide du graphe avec le bouton gauche encadre des nœuds.',
  fit: 'Dans UE : la touche Home (Zoom to Fit) ; F cadre la sélection.',
  addNode: 'Dans UE : clic droit sur le vide du graphe ouvre la même liste (All Actions for this Blueprint).',
  more: 'Dans UE : la barre de menus en haut de la fenêtre (File, Edit, Window, Tools…), et Edit › Project Settings.',
  leftPanel: 'Dans UE : Components et My Blueprint restent ouverts à gauche de l’éditeur.',
  rightPanel: 'Dans UE : Details reste ouvert à droite de l’éditeur.',
  levelPanel: 'Dans UE : l’Outliner et Details restent ouverts à droite de l’éditeur de niveau.',
  closePanel: 'Dans UE : ce panneau reste ouvert, accroché à l’éditeur.',
  bottomPanel: 'Dans UE : ces onglets sont des panneaux accrochés en bas (Compiler Results, Find Results…) ; le Content Drawer s’ouvre par Ctrl+Espace.',
  dragToGraph: 'Dans UE : glisser l’élément de My Blueprint dans le graphe (Ctrl en lâchant : Get ; Alt : Set ; une fonction : son appel).',
  liveOutliner: 'Dans UE : l’Outliner reste ouvert pendant Play et montre les acteurs en direct.',
  joystick: 'Dans UE : les touches Z, Q, S, D (W, A, S, D sur un clavier anglais) ou le stick gauche d’une manette.',
  keys: 'Dans UE : les touches du clavier (E, F, la barre Espace).',
} as const;

export type UeHint = keyof typeof UE_HINT;

/** The attributes of an element of a family: `<button {...origin('touch', 'undo')}>`. */
export function origin(family: Origin, hint?: UeHint): Record<string, string> {
  const attrs: Record<string, string> = { 'data-origin': family };
  if (hint) attrs['data-ue'] = UE_HINT[hint];
  return attrs;
}

/** An app element that stays in « Vue UE pure ». */
export function appKept(): Record<string, string> {
  return { 'data-origin': 'app', 'data-pure': 'keep' };
}
