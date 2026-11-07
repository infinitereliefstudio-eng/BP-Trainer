/** The learning path, in order. Add a lesson by listing it here. */
import { lesson1, lesson2, lesson3, lesson4 } from './library/module1';
import { lesson5, lesson6, lesson7, lesson8 } from './library/module2';
import { lesson10, lesson11, lesson9 } from './library/module3';
import { lesson12 } from './library/module4';
import { debug1, debug2, predict1, predict2, predict3 } from './library/exercises';
import type { Lesson } from './types';

export const LESSONS: Lesson[] = [
  lesson1,
  lesson2,
  lesson3,
  lesson4,
  predict1,
  lesson5,
  lesson6,
  lesson7,
  lesson8,
  predict2,
  lesson9,
  debug1,
  lesson10,
  predict3,
  lesson11,
  debug2,
  lesson12,
];

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
