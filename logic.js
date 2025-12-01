export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

/**
 * Evaluate a guess against the answer using Wordle rules.
 * Returns an array of statuses: "correct", "present", or "absent".
 */
export function evaluateGuess(guess, answer) {
  if (guess.length !== WORD_LENGTH || answer.length !== WORD_LENGTH) {
    throw new Error("Guess and answer must be 5 letters.");
  }

  const upperGuess = guess.toUpperCase();
  const upperAnswer = answer.toUpperCase();

  const result = Array(WORD_LENGTH).fill("absent");
  const remaining = {};

  for (let i = 0; i < WORD_LENGTH; i++) {
    const g = upperGuess[i];
    const a = upperAnswer[i];
    if (g === a) {
      result[i] = "correct";
    } else {
      remaining[a] = (remaining[a] || 0) + 1;
    }
  }

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === "correct") continue;
    const g = upperGuess[i];
    if (remaining[g] > 0) {
      result[i] = "present";
      remaining[g] -= 1;
    }
  }

  return result;
}
