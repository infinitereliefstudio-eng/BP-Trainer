/** A review question: one idea, asked again days after it was learnt. */
export interface QuizQuestion {
  id: string;
  /** The lesson that teaches it: the question unlocks once the lesson is passed. */
  lesson?: string;
  /** Or the memo card that explains it: unlocks once the card has been read. */
  memo?: string;
  question: string;
  /** The first option is the right one; they are shuffled when shown. */
  options: string[];
  /** Shown after the answer, right or wrong. */
  why: string;
}
