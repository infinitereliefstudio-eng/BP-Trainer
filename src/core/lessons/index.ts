/**
 * The learning path, in order, level by level. Add a lesson by listing it
 * here. Lessons are numbered by their place in the path (exercises have a code).
 */
import { getDrill, isDrillId } from '../drills';
import { complete2, lessonCleanDestroy, lessonPureFunctions } from './library/advanced';
import { complete1, lessonBarrier, lessonCounter } from './library/beginner';
import { lessonDoorStates, lessonKeypad, refactor2 } from './library/choices';
import { lessonControlRoom, refactor1 } from './library/controlRoom';
import { debug3, debug4, lessonBeginPlayOrder, lessonWhoChanges } from './library/confirmed';
import { lessonInventory } from './library/inventory';
import { lessonBadges, lessonCodes } from './library/collections';
import { debug5, lessonRecord } from './library/records';
import { lessonLocals, predict4 } from './library/locals';
import { complete3, lessonLampRow, lessonSlidingDoor } from './library/motion';
import { lessonCrate, lessonLook, refactor3 } from './library/interaction';
import { debug6, predict5 } from './library/extras';
import { lessonTerminal } from './library/terminal';
import { lesson1, lesson2, lesson3, lesson4 } from './library/module1';
import { lesson5, lesson6, lesson7, lesson8 } from './library/module2';
import { lesson10, lesson11, lesson9 } from './library/module3';
import { lessonInheritance } from './library/inheritance';
import { lesson12 } from './library/module4';
import { lessonLift, lessonWaves } from './library/timing';
import { debug1, debug2, predict1, predict2, predict3 } from './library/exercises';
import { predict6, predict7, predict8 } from './library/predicts';
import { predict10, predict9 } from './library/predicts2';
import { debug7, debug8, debug9 } from './library/debugs';
import { lessonFence } from './library/fence';
import { lessonBuildLamp, predictWhereLight } from './library/building';
import { synthesis1, synthesis2 } from './library/synthesis';
import { lessonCoins, predictWhoEntered } from './library/pickups';
import { lessonHinge } from './library/hinge';
import { lessonPerLamp } from './library/perInstance';
import { lessonBeacon } from './library/blinker';
import { transferChest } from './library/chest';
import { lessonFan, lessonGauge } from './library/gauges';
import { debug10 } from './library/counterLie';
import { debug11 } from './library/oven';
import { debug12 } from './library/stage';
import { lessonSwitchboard } from './library/switchboard';
import { debug13 } from './library/waveEnd';
import { lessonGrid } from './library/powerGrid';
import { lessonTalk } from './library/interrogation';
import { complete4 } from './library/crosshair';
import { complete5 } from './library/backpack';
import { lessonObjective } from './library/objective';
import { lessonCards, lessonSeed } from './library/cards';
import { debug14 } from './library/workshop';
import { complete6 } from './library/undo';
import { lessonMirrors } from './library/mirrors';
import { debug15 } from './library/gridFloor';
import { lessonCatalog, debug16, lessonDialogueTable } from './library/tables';
import { lessonPiggyBank, debug17, predict11, debug18, lessonCheckpoint } from './library/saves';
import { autonomyResume, debug27, debug28, lessonBag, lessonCorridor, lessonRightDoor, predictScoreDoor, transferDrone } from './library/travel';
import { complete8 } from './library/chosenAvatar';
import { debug19 } from './library/inputs';
import { autonomyTrap, transferBadge } from './library/chainCast';
import { debugMappingContext, lessonInputController, lessonInputHold, lessonInputLamp } from './library/enhancedInput';
import { lessonChooseTool } from './library/chooseTool';
import { debug21 } from './library/whoTurnedOff';
import { refactor4 } from './library/interactUe5';
import { lessonPauseMenu } from './library/pauseMenu';
import { lessonScreenCounter, predictConstruct } from './library/umgCounter';
import { debug24, lessonMenuControl } from './library/umgMenu';
import { debug25, lessonRealPauseMenu } from './library/umgPause';
import { lessonHealthBar, refactor6 } from './library/umgHealth';
import { lessonPressE } from './library/umgPrompt';
import { complete7 } from './library/umgPlaylist';
import { autonomyTerminal, transferEnergy } from './library/umgTerminal';
import { synthesis3 } from './library/synthesis3';
import { predictSpawnOrder } from './library/predicts3';
import { lessonUniversalLever } from './library/universalLever';
import { mixedDispenser, mixedSas } from './library/mixed';
import { mixedLift, mixedMarket, mixedStand } from './library/mixed2';
import { synthesis4 } from './library/synthesis4';
import { expertRadio } from './library/expertRadio';
import { expertWorkshop } from './library/expertWorkshop';
import { predictComponentOrder } from './library/componentOrder';
import { refactor5 } from './library/healthEverywhere';
import { debug22 } from './library/scanner';
import { transferTrap } from './library/trapAll';
import { lessonBadgeLock } from './library/badgeLock';
import { debug23 } from './library/battery';
import { lessonComponentInteraction } from './library/componentInteraction';
import { lessonComponentInventory } from './library/componentInventory';
import { autonomyEnergy } from './library/stationEnergy';
import { debug26, lessonBarPerEnemy, lessonEnemyBar } from './library/widgetBars';
import { transferNames } from './library/widgetNames';
import { AVOID } from './library/avoid';
import { QUALITY } from './library/quality';
import { isNumbered, type Lesson } from './types';
import { asEnhancedInput } from './ue5Input';
import { asPlayerCommands, type CommandSpec } from './playerCommands';
import type { KeyName } from '../model/project';

export const LESSONS: Lesson[] = [
  // Débutant
  lesson1,
  lesson2,
  lessonBuildLamp,
  predictWhereLight,
  lesson3,
  lessonCounter,
  lesson4,
  lessonBarrier,
  lessonGauge,
  complete1,
  predict9,
  debug7,
  debug10,
  predict6,
  synthesis1,
  // Intermédiaire
  predict1,
  lesson5,
  lessonHinge,
  lessonCoins,
  predictWhoEntered,
  lesson6,
  lesson7,
  transferBadge,
  lesson8,
  predict2,
  lessonBeacon,
  debug8,
  lessonPerLamp,
  lessonKeypad,
  lessonFan,
  predict10,
  predict7,
  lessonDoorStates,
  debug19,
  lessonInputLamp,
  debugMappingContext,
  lessonInputHold,
  lessonInputController,
  // UMG (V7.36): the first widget, made by the Player Controller just created.
  lessonScreenCounter,
  refactor2,
  lessonInventory,
  lessonCodes,
  predict3,
  transferChest,
  lessonSlidingDoor,
  complete3,
  // V7.61 (review of the path's progression): a mixed practice at the end of each level.
  mixedLift,
  autonomyTrap,
  synthesis2,
  // Confirmé
  lesson9,
  debug1,
  lesson10,
  lesson11,
  debug2,
  lessonChooseTool,
  lessonWhoChanges,
  debug12,
  debug21,
  lessonObjective,
  lessonLocals,
  predict4,
  lessonRecord,
  debug5,
  predict8,
  refactor4,
  lessonCatalog,
  debug16,
  lessonCards,
  lessonSeed,
  lessonBadges,
  lessonLampRow,
  predict5,
  lessonBeginPlayOrder,
  debug4,
  lessonWaves,
  debug9,
  debug11,
  lessonPauseMenu,
  // UMG (V7.36): life cycle, menus and input modes, after the pause.
  predictConstruct,
  lessonMenuControl,
  debug24,
  lessonRealPauseMenu,
  debug25,
  // UMG (V7.37): the widget follows the game (dispatchers), then the invite of « Interagir comme dans UE5 ».
  lessonHealthBar,
  refactor6,
  lessonPressE,
  lessonFence,
  predictSpawnOrder,
  debug3,
  lessonLift,
  lessonPiggyBank,
  debug17,
  predict11,
  debug18,
  mixedStand,
  // UMG (V7.37): the delayed autonomy on menus, then a list of child widgets.
  autonomyTerminal,
  complete7,
  synthesis3,
  // Avancé
  lessonPureFunctions,
  complete2,
  lessonTerminal,
  lessonCleanDestroy,
  lessonSwitchboard,
  debug13,
  refactor1,
  lesson12,
  lessonInheritance,
  // Actor Components (V7.20): discover, guided, repair, transfer, parent or component.
  predictComponentOrder,
  refactor5,
  debug22,
  transferTrap,
  lessonBadgeLock,
  lessonControlRoom,
  lessonUniversalLever,
  lessonLook,
  lessonComponentInteraction,
  mixedSas,
  debug6,
  debug23,
  refactor3,
  complete4,
  lessonMirrors,
  lessonCrate,
  debug15,
  debug14,
  complete5,
  lessonComponentInventory,
  mixedDispenser,
  // UMG (V7.37): the HUD method, on an Actor Component (after M2: placed earlier, it would stretch input or events past 15).
  transferEnergy,
  // Widget Component (V7.43): discover and guided right after the HUD on a component, the repair and the transfer spaced out.
  lessonEnemyBar,
  lessonBarPerEnemy,
  lessonTalk,
  lessonDialogueTable,
  lessonCheckpoint,
  // Levels and the GameInstance (V7.50): right after the Save Game, the three lifetimes of a value.
  lessonCorridor,
  predictScoreDoor,
  lessonBag,
  debug27,
  lessonRightDoor,
  debug28,
  transferDrone,
  complete8,
  autonomyResume,
  mixedMarket,
  debug26,
  complete6,
  lessonGrid,
  autonomyEnergy,
  transferNames,
  synthesis4,
  // Expert
  expertWorkshop,
  expertRadio,
];

let n = 0;
for (const l of LESSONS) {
  if (isNumbered(l)) l.number = ++n;
  // What to try once the lesson works, and other ways to solve it (library/quality.ts).
  const q = QUALITY[l.id];
  if (q?.robustness) l.robustness = [...(l.robustness ?? []), ...q.robustness];
  if (q?.alternatives) l.alternatives = [...(l.alternatives ?? []), ...q.alternatives];
  if (AVOID[l.id]) l.avoid = [...(l.avoid ?? []), ...AVOID[l.id]];
}

/**
 * Steps after « Les contrôles au Player Controller » set up as a UE5 project
 * (lot 1 of docs/PLAN_PARCOURS.md): Enhanced Input, IMC_Joueur added by
 * BP_PlayerController, an Input Action per key (ue5Input.ts). The value
 * names an action when the key has a meaning in the lesson. Every step
 * after that lesson is listed (tests/ue5Input.test.ts checks none is missed).
 */
const UE5_INPUT: Record<string, Partial<Record<KeyName, string>>> = {
  'l-inventaire': {},
  'c3-projecteur': {},
  'l09-generateur': {},
  'd1-accessed-none': {},
  'l10-dispatcher': {},
  'l11-interface': {},
  'd2-interface-oubliee': {},
  'l-qui-modifie': {},
  'd12-regie': { E: 'IA_Regie1', F: 'IA_Regie2', SpaceBar: 'IA_ChangerDeRegie' },
  'l-cartes': { E: 'IA_Tirer' },
  'l-meme-donne': { E: 'IA_Tirer', SpaceBar: 'IA_NouvellePartie' },
  'd11-four': { E: 'IA_Lancer', F: 'IA_Annuler' },
  'd3-tourelle': {},
  'l-tirelire': {},
  'd17-premiere-partie': {},
  'd18-record': { E: 'IA_Marquer', F: 'IA_Sauvegarder' },
  // Avancé
  'l-terminal': {},
  'l-standard': { E: 'IA_Appeler', F: 'IA_Demonter', SpaceBar: 'IA_Appeler103' },
  'l12-station': {},
  'l-salle-controle': {},
  'l-regarder': {},
  'l-interaction-composant': {},
  'r3-bouton': {},
  'c4-viseur': { F: 'IA_Detruire' },
  'l-miroirs': { F: 'IA_Pivoter' },
  'd15-grille': { E: 'IA_Poser' },
  'd14-atelier': { E: 'IA_Fabriquer', F: 'IA_AjouterBatterie' },
  'l-interrogatoire': { E: 'IA_Choix1', F: 'IA_Choix2', SpaceBar: 'IA_Parler' },
  'l-dialogue-table': {},
  'c6-annuler': { E: 'IA_Deplacer', F: 'IA_Annuler', SpaceBar: 'IA_Refaire' },
  'l-reseau': { E: 'IA_Recalculer', F: 'IA_Basculer' },
};

for (const [i, l] of LESSONS.entries()) {
  const names = UE5_INPUT[l.id];
  if (names) LESSONS[i] = asEnhancedInput(l, names);
}

/**
 * Steps after « Interagir comme dans UE5 » whose objects listened to the keys
 * themselves (UE4's reflex that step undoes): their commands go through the
 * Player Controller, which calls a Custom Event on the object (V7.58,
 * playerCommands.ts). `learnerWrites`: the learner writes that line.
 * tests/playerCommands.test.ts checks that no step after R4 is missed.
 */
const PLAYER_COMMANDS: Record<string, CommandSpec> = {
  'l-cartes': { learnerWrites: ['IA_Tirer'] },
  'l-meme-donne': {},
  'd11-four': {},
  'd3-tourelle': { events: { IA_Interagir: 'Abattre' } },
  'l-tirelire': { events: { IA_Interagir: 'AjouterPiece' } },
  'd17-premiere-partie': { events: { IA_Interagir: 'AjouterPiece' } },
  'd18-record': {},
  'l-standard': { learnerWrites: ['IA_Demonter'] },
  'c4-viseur': {},
  'l-miroirs': { learnerWrites: ['IA_Pivoter'] },
  'd15-grille': {},
  'd14-atelier': {},
  'l-interrogatoire': { learnerWrites: ['IA_Choix1', 'IA_Choix2'] },
  'l-dialogue-table': { events: { IA_Interagir: 'Parler' } },
  'c6-annuler': { learnerWrites: ['IA_Annuler'] },
  'l-reseau': { events: { IA_Recalculer: 'DemanderRecalcul' }, learnerWrites: ['IA_Recalculer'] },
};

for (const [i, l] of LESSONS.entries()) {
  const spec = PLAYER_COMMANDS[l.id];
  if (spec) LESSONS[i] = asPlayerCommands(l, spec);
}

/** A step of the path, or a drill of the « À retravailler en Blueprint » queue (core/drills). */
export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id) ?? (isDrillId(id) ? getDrill(id) : undefined);
}
