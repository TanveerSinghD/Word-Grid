import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateGuess, WORD_LENGTH, MAX_GUESSES } from "../logic.js";

test("constants are correct", () => {
  assert.equal(WORD_LENGTH, 5);
  assert.equal(MAX_GUESSES, 6);
});

test("marks correct letters and positions", () => {
  const result = evaluateGuess("CRANE", "CRATE");
  assert.deepEqual(result, ["correct", "correct", "correct", "absent", "correct"]);
});

test("handles duplicate letters per Wordle rules", () => {
  const result = evaluateGuess("ALLEY", "SMELL");
  assert.deepEqual(result, ["absent", "present", "present", "present", "absent"]);
});

test("rejects non-5-letter inputs", () => {
  assert.throws(() => evaluateGuess("TOO", "SHORT"), /5 letters/);
});
