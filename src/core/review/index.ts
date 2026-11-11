/** Every review question, lessons first then the memo. */
import { LESSON_QUIZ } from './bank/lessons';
import { MEMO_QUIZ } from './bank/memo';
import type { QuizQuestion } from './types';

export const QUIZ: QuizQuestion[] = [...LESSON_QUIZ, ...MEMO_QUIZ];

export type { QuizQuestion } from './types';
