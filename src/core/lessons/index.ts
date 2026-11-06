/** The learning path, in order. Add a lesson by listing it here. */
import { lesson1, lesson2, lesson3, lesson4 } from './library/module1';
import { lesson5 } from './library/module2';
import type { Lesson } from './types';

export const LESSONS: Lesson[] = [lesson1, lesson2, lesson3, lesson4, lesson5];

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
