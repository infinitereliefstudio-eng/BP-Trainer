/**
 * The learning path, in order, level by level. Add a lesson by listing it
 * here. Lessons are numbered by their place in the path (exercises have a code).
 */
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
import { debug19 } from './library/inputs';
import { autonomyTrap, transferBadge } from './library/chainCast';
import { debugMappingContext, lessonInputController, lessonInputHold, lessonInputLamp } from './library/enhancedInput';
import { AVOID } from './library/avoid';
import { QUALITY } from './library/quality';
import { isChainExercise, type Lesson } from './types';

export const LESSONS: Lesson[] = [
  // Débutant
  lesson1,
  lesson2,
  lesson3,
  lesson4,
  lessonCounter,
  lessonBarrier,
  lessonGauge,
  complete1,
  predict9,
  debug7,
  debug10,
  predict6,
  // Intermédiaire
  predict1,
  lesson5,
  lesson6,
  lesson7,
  transferBadge,
  lesson8,
  predict2,
  debug8,
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
  refactor2,
  lessonInventory,
  lessonCodes,
  predict3,
  lessonSlidingDoor,
  complete3,
  autonomyTrap,
  // Confirmé
  lesson9,
  debug1,
  lesson10,
  lesson11,
  debug2,
  lessonWhoChanges,
  debug12,
  lessonObjective,
  lessonLocals,
  predict4,
  lessonRecord,
  debug5,
  predict8,
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
  lessonFence,
  debug3,
  lessonLift,
  lessonPiggyBank,
  debug17,
  predict11,
  debug18,
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
  lessonControlRoom,
  lessonLook,
  debug6,
  refactor3,
  complete4,
  lessonMirrors,
  lessonCrate,
  debug15,
  debug14,
  complete5,
  lessonTalk,
  lessonDialogueTable,
  lessonCheckpoint,
  complete6,
  lessonGrid,
];

let n = 0;
for (const l of LESSONS) {
  if ((!l.kind || l.kind === 'build') && !isChainExercise(l)) l.number = ++n;
  // What to try once the lesson works, and other ways to solve it (library/quality.ts).
  const q = QUALITY[l.id];
  if (q?.robustness) l.robustness = [...(l.robustness ?? []), ...q.robustness];
  if (q?.alternatives) l.alternatives = [...(l.alternatives ?? []), ...q.alternatives];
  if (AVOID[l.id]) l.avoid = [...(l.avoid ?? []), ...AVOID[l.id]];
}

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
