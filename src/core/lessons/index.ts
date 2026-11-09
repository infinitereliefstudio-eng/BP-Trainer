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
import { lesson1, lesson2, lesson3, lesson4 } from './library/module1';
import { lesson5, lesson6, lesson7, lesson8 } from './library/module2';
import { lesson10, lesson11, lesson9 } from './library/module3';
import { lessonInheritance } from './library/inheritance';
import { lesson12 } from './library/module4';
import { lessonLift, lessonWaves } from './library/timing';
import { debug1, debug2, predict1, predict2, predict3 } from './library/exercises';
import type { Lesson } from './types';

export const LESSONS: Lesson[] = [
  // Débutant
  lesson1,
  lesson2,
  lesson3,
  lesson4,
  lessonCounter,
  lessonBarrier,
  complete1,
  // Intermédiaire
  predict1,
  lesson5,
  lesson6,
  lesson7,
  lesson8,
  predict2,
  lessonKeypad,
  lessonDoorStates,
  refactor2,
  lessonInventory,
  predict3,
  // Confirmé
  lesson9,
  debug1,
  lesson10,
  lesson11,
  debug2,
  lessonWhoChanges,
  lessonBeginPlayOrder,
  debug4,
  lessonWaves,
  debug3,
  lessonLift,
  // Avancé
  lessonPureFunctions,
  complete2,
  lessonCleanDestroy,
  refactor1,
  lesson12,
  lessonInheritance,
  lessonControlRoom,
];

let n = 0;
for (const l of LESSONS) if (!l.kind || l.kind === 'build') l.number = ++n;

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
