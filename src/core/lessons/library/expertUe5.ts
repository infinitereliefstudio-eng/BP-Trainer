/**
 * « Le refaire dans UE5 » (V7.72, the reprise of chantier n° 5): one card per
 * Expert project, opened with the reference solution once the whole project
 * is passed (helpPolicy, PLAN_CARD_TITLES). The project is rebuilt as it is
 * in UE5 — same Blueprints, same nodes —; the card says what the 3D world and
 * the real editor change, and what the simulator did for the learner.
 */
import { REDO_UE5_TITLE } from '../helpPolicy';
import type { LessonCard } from '../types';

const card = (body: string): LessonCard => ({ title: REDO_UE5_TITLE, body });

/** What every project shares, said once at the top of each card. */
const START =
  'Les mêmes Blueprints, les mêmes nœuds : le projet se refait tel quel dans UE5. Pars d’un modèle **Third Person** ou **First Person** (le personnage, la caméra et Enhanced Input y sont déjà) ; tes Input Actions vont dans un Mapping Context ajouté par le Player Controller, comme IMC_Joueur ici, et tes assets dans le **Content Browser**, rangés par dossier. Ce qui change :\n\n';

/** The end of each card: how to test, as the simulator did. */
const TEST =
  '\n\nPour tester, **Play** (Play In Editor) joue le niveau ouvert dans l’éditeur, comme le correcteur ici. Le **Blueprint Debugger**, les breakpoints (F9) et Print String marchent comme dans l’appli.';

export const REDO_WORKSHOP = card(
  START +
    '- **Les pales** : Add Local Rotation sur l’axe qui fait face au ventilateur (souvent Roll ou Pitch en 3D) ; ici, sans hauteur, seul le Yaw existait.\n' +
    '- **Le carburant** n’a pas besoin de 60 mesures par seconde : dans UE, un **Tick Interval** (Class Defaults › Actor Tick) ou un timer allège la machine, sans rien changer au reste.\n' +
    '- **Le panneau** : sa Vertical Box dans une **Scroll Box** si l’atelier grandit, et des **ancres** pour qu’il tienne sur tous les écrans. En Game and UI, le premier clic dans la vue peut capturer la souris : règle **Mouse Lock Mode** et **Hide Cursor During Capture** sur Set Input Mode Game and UI.\n' +
    '- **Le carburant de chaque machine posée** se règle comme ici : Details de l’acteur, son composant BP_Reservoir, Carburant.' +
    TEST,
);

export const REDO_ARENA = card(
  START +
    '- **Le tir** part de la **caméra** (Get Player Camera Manager › Get Camera Location, et le Forward Vector de sa rotation) plutôt que du centre du personnage : on touche ce que l’on vise, en haut comme en bas. Le canal **Visibility** : les drones doivent le bloquer (preset de collision).\n' +
    '- **Le déplacement des drones** : Set Actor Location avec **Sweep** coché, sinon ils traversent les murs ; ou un **Floating Pawn Movement** si le drone devient un Pawn.\n' +
    '- **La colonne Sorte** de DT_Vagues est une **Class Reference** de BP_Drone dans S_Vague ; dans un gros jeu, une **Soft Class Reference**, chargée au besoin.\n' +
    '- **Les overlaps** du cœur : **Generate Overlap Events** coché des deux côtés, sur la Box Collision du drone et sur celle du cœur.\n' +
    '- **Le record** : Save Game to Slot écrit un fichier `Arene.sav` dans `Saved/SaveGames` du projet. Le supprimer remet le record à zéro pendant les essais.' +
    TEST,
);

export const REDO_ROUND = card(
  START +
    '- **Les points de ronde** : coche **Show 3D Widget** sur la variable Points (Instance Editable) et place-les à la souris dans le niveau. Ces points sont **relatifs à l’acteur** : passe-les par **Transform Location** (Get Actor Transform) avant de t’y rendre.\n' +
    '- **Le garde qui se tourne** : Find Look at Rotation, puis **RInterp To** pour tourner en douceur au lieu d’un coup ; souvent seulement le Yaw.\n' +
    '- **Dans un vrai jeu**, le garde serait un **Character** mené par un **AI Controller** : AI Move To sur un **Nav Mesh** (Nav Mesh Bounds Volume) pour la ronde, et le sens **Sight** d’**AI Perception** pour la vision. Ce qu’il fait, c’est ce que tu as écrit : un angle de vue (Dot Product), une portée, un Line Trace.\n' +
    '- **La jauge** : le Widget Component en **Screen** reste face à la caméra et à taille fixe ; en World, c’est un panneau posé dans la scène.' +
    TEST,
);

export const REDO_NETWORK = card(
  START +
    '- **La grille** se fabrique au BeginPlay, comme ici : Spawn Actor est refusé dans un Construction Script. Pour la voir dans l’éditeur, il faudrait des Child Actor Components ou des Instanced Static Meshes.\n' +
    '- **Tourner un relais** : Add Actor Local Rotation de 90° en Yaw. Pour un quart de tour animé, un Timeline.\n' +
    '- **DT_Grilles** : un membre tableau (Formes) se remplit élément par élément dans l’éditeur de la Data Table ; pour beaucoup de grilles, un import **JSON** ou **CSV**.\n' +
    '- **Jouer depuis le menu** : le menu est en UI Only, et ce mode suit Open Level (il appartient au viewport). Sans Set Input Mode Game Only avant d’ouvrir la grille, E n’y ferait rien : c’est le piège le plus courant du premier menu.\n' +
    '- **Les deux niveaux** : dans **Project Settings › Maps & Modes**, **Game Default Map** = Lvl_Menu (le jeu lancé commence au menu) et **Editor Startup Map**. Play dans l’éditeur joue le niveau **ouvert**, pas la Game Default Map : pour tester le menu, ouvre Lvl_Menu.\n' +
    '- **Une boucle sans fin** s’arrête sur « Infinite loop detected » au bout de **Maximum Loop Iteration Count** (Project Settings › General Settings, un million par défaut). Monter ce chiffre ne répare rien : c’est le Set des relais déjà vus qui fait finir le parcours.' +
    TEST,
);

export const REDO_WAKEUP = card(
  START +
    '- **Regarder** : le Line Trace de Viser part de la **caméra** (Get Player Camera Manager), pour viser là où le joueur regarde, y compris en haut ou en bas.\n' +
    '- **Les modes d’entrée** : après Open Level, le Player Controller est neuf (le curseur repart caché), mais le mode d’entrée appartient au **viewport**, qui reste : un UI Only réglé au menu suit dans le niveau suivant, qui ne reçoit alors aucune touche. Comme dans l’appli, remets **Game Only avant Open Level** ; au BeginPlay de ce qui arrive aussi, si le niveau peut être ouvert d’ailleurs.\n' +
    '- **La porte** : le Timeline a son propre éditeur (double-clic), avec une piste Float de 0 à 1 ; Lerp (Vector) puis Set Relative Location sur le Battant.\n' +
    '- **Redéfinir PeutOuvrir** : dans l’enfant, My Blueprint › Functions › **Override** › PeutOuvrir.\n' +
    '- **Le menu et les niveaux** : Game Default Map = Lvl_Menu (Project Settings › Maps & Modes) ; Play dans l’éditeur joue le niveau ouvert. Quit Game en Play dans l’éditeur arrête simplement le Play.\n' +
    '- **La sauvegarde** est un fichier `Reveil.sav` dans `Saved/SaveGames` : le supprimer, ou Delete Game in Slot, rend une partie neuve.\n' +
    '- **Les lampes** : en 3D, une Point Light éteinte par Set Visibility ne fait plus de lumière ; sa portée est **Attenuation Radius**.' +
    TEST,
);
