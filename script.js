import { WORD_LENGTH, MAX_GUESSES, evaluateGuess } from "./logic.js";

let targetWord = "";
let currentRow = 0;
let currentCol = 0;
let gameOver = false;
let boardTiles = [];
let allowedWords;
let messageTimeout;
let wordList = [];
let wordsLoaded = false;
let moodScore = 0;
const guessedLetters = new Set();
let guessHistory = [];
const STORAGE_KEY = "word-grid-stats";
let difficulty = "easy";
let wordBuckets = { easy: [], medium: [], hard: [] };
const isMobile = window.matchMedia("(max-width: 600px)");
const rootStyle = document.documentElement.style;
const MAX_MOOD_SCORE = WORD_LENGTH * 2 * MAX_GUESSES;
const endOverlay = document.getElementById("end-overlay");
const endText = document.getElementById("end-text");
const endStats = document.getElementById("end-stats");
const playAgainBtn = document.getElementById("play-again");
const shareBtn = document.getElementById("share-result");
const difficultyBtns = document.querySelectorAll(".pill-round");
const mobileInput = document.getElementById("mobile-input");

const boardEl = document.getElementById("board");
const keyboardEl = document.getElementById("keyboard");
const messageEl = document.getElementById("message");
const newGameBtn = document.getElementById("new-game");

async function init() {
  showMessage("Loading words...");
  try {
    await loadWords();
    wordsLoaded = true;
    allowedWords = new Set(wordList);
    buildKeyboard();
    startGame();
    document.addEventListener("keydown", handlePhysicalKey);
    newGameBtn.addEventListener("click", startGame);
    playAgainBtn.addEventListener("click", startGame);
    shareBtn.addEventListener("click", shareResult);
    difficultyBtns.forEach((btn) =>
      btn.addEventListener("click", () => {
        setDifficulty(btn.dataset.difficulty);
        startGame();
      })
    );
    if (mobileInput) {
      mobileInput.addEventListener("keydown", handlePhysicalKey);
      mobileInput.addEventListener("blur", () => {
        if (isMobile.matches) {
          setTimeout(() => focusMobileInput(), 0);
        }
      });
    }
    focusMobileInput();
  } catch (err) {
    console.error(err);
    showMessage("Word list failed to load. Try refreshing or using a local server.");
  }
}

function startGame() {
  if (!wordsLoaded || wordList.length === 0) {
    showMessage("Word list not loaded.");
    return;
  }
  const bucket = wordBuckets[difficulty] && wordBuckets[difficulty].length ? wordBuckets[difficulty] : wordList;
  targetWord = bucket[Math.floor(Math.random() * bucket.length)];
  currentRow = 0;
  currentCol = 0;
  gameOver = false;
  showMessage("New puzzle ready. Good luck!");
  buildBoard();
  resetKeyboardColors();
  hideEndOverlay();
  guessedLetters.clear();
  guessHistory = [];
  moodScore = 0;
  setBackgroundMood(0);
  focusMobileInput();
}

function buildBoard() {
  boardEl.innerHTML = "";
  boardTiles = Array.from({ length: MAX_GUESSES }, () => []);
  for (let row = 0; row < MAX_GUESSES; row++) {
    for (let col = 0; col < WORD_LENGTH; col++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.dataset.row = row;
      tile.dataset.col = col;
      boardTiles[row].push(tile);
      boardEl.appendChild(tile);
    }
  }
}

function buildKeyboard() {
  const layout = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
  keyboardEl.innerHTML = "";

  layout.forEach((rowLetters, rowIndex) => {
    const row = document.createElement("div");
    row.className = "key-row";

    if (rowIndex === 2) {
      row.appendChild(createKey("Enter", "wide"));
    }

    rowLetters.split("").forEach((letter) => {
      row.appendChild(createKey(letter));
    });

    if (rowIndex === 2) {
      row.appendChild(createKey("Del", "wide"));
    }

    keyboardEl.appendChild(row);
  });
}

function createKey(label, extraClass = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `key ${extraClass}`.trim();
  button.dataset.key = label;
  button.textContent = label;
  button.addEventListener("click", () => handleInput(label));
  return button;
}

function handlePhysicalKey(event) {
  if (gameOver) return;
  const key = event.key;
  if (key === "Enter") {
    handleInput("Enter");
  } else if (key === "Backspace" || key === "Delete") {
    handleInput("Del");
  } else if (/^[a-zA-Z]$/.test(key)) {
    handleInput(key.toUpperCase());
  }
}

function handleInput(key) {
  if (gameOver) return;
  focusMobileInput();
  if (key === "Enter") {
    submitGuess();
  } else if (key === "Del") {
    removeLetter();
  } else if (/^[A-Z]$/.test(key)) {
    addLetter(key);
  }
}

function focusMobileInput() {
  if (isMobile.matches && mobileInput) {
    mobileInput.focus({ preventScroll: true });
  }
}

function addLetter(letter) {
  if (currentCol >= WORD_LENGTH || currentRow >= MAX_GUESSES) return;
  const tile = boardTiles[currentRow][currentCol];
  tile.textContent = letter;
  tile.classList.add("filled");
  currentCol += 1;
}

function removeLetter() {
  if (currentCol === 0) return;
  currentCol -= 1;
  const tile = boardTiles[currentRow][currentCol];
  tile.textContent = "";
  tile.classList.remove("filled");
}

function submitGuess() {
  if (currentCol < WORD_LENGTH) {
    showMessage("Not enough letters.");
    return;
  }

  const guess = boardTiles[currentRow].map((tile) => tile.textContent).join("");
  if (!allowedWords.has(guess)) {
    showMessage("Not a known word. Try another.");
    return;
  }

  const statuses = evaluateGuess(guess, targetWord);
  revealGuess(statuses);
  updateKeyboard(statuses, guess);
  updateMood(statuses, guess);
  guessHistory.push({ guess, statuses });

  if (guess === targetWord) {
    gameOver = true;
    recordGame(true);
    showEndOverlay(`You got it! The word was ${targetWord}.`, true);
    return;
  }

  currentRow += 1;
  currentCol = 0;

  if (currentRow === MAX_GUESSES) {
    gameOver = true;
    recordGame(false);
    showEndOverlay(`Out of tries. The word was ${targetWord}.`, false);
  } else {
    showMessage("");
  }
}

function revealGuess(statuses) {
  statuses.forEach((status, idx) => {
    const tile = boardTiles[currentRow][idx];
    tile.classList.remove("correct", "present", "absent");
    tile.classList.add(status);
  });
}

function updateKeyboard(statuses, guess) {
  const priority = { correct: 2, present: 1, absent: 0 };
  statuses.forEach((status, idx) => {
    const letter = guess[idx];
    const keyBtn = keyboardEl.querySelector(`button[data-key="${letter}"]`);
    if (!keyBtn) return;
    const currentStatus = keyBtn.dataset.status || "none";
    if (priority[status] > (priority[currentStatus] ?? -1)) {
      keyBtn.classList.remove("correct", "present", "absent");
      keyBtn.classList.add(status);
      keyBtn.dataset.status = status;
    }
  });
}

function resetKeyboardColors() {
  keyboardEl.querySelectorAll(".key").forEach((key) => {
    key.classList.remove("correct", "present", "absent");
    key.dataset.status = "none";
  });
}

function showMessage(text) {
  if (messageTimeout) {
    clearTimeout(messageTimeout);
  }
  if (!text) {
    messageEl.classList.remove("show");
    messageEl.textContent = "";
    return;
  }
  messageEl.textContent = text;
  messageEl.classList.add("show");
  messageTimeout = setTimeout(() => {
    messageEl.classList.remove("show");
  }, 1500);
}

function updateMood(statuses, guess) {
  // Only adjust mood for letters not guessed before; take the best status per new letter.
  const scoreOf = { correct: 2, present: 1, absent: 0 };
  const bestStatusByLetter = new Map();
  statuses.forEach((status, idx) => {
    const letter = guess[idx];
    const currentScore = bestStatusByLetter.has(letter) ? scoreOf[bestStatusByLetter.get(letter)] : -1;
    if (scoreOf[status] > currentScore) {
      bestStatusByLetter.set(letter, status);
    }
  });

  let delta = 0;
  bestStatusByLetter.forEach((status, letter) => {
    if (!guessedLetters.has(letter)) {
      guessedLetters.add(letter);
      delta += scoreOf[status];
    }
  });

  if (delta === 0) return;

  moodScore += delta;
  const rawRatio = Math.max(0, Math.min(1, moodScore / MAX_MOOD_SCORE));
  const visualRatio = Math.min(1, Math.pow(rawRatio * 1.35, 0.8));
  setBackgroundMood(visualRatio);
}

function setBackgroundMood(ratio) {
  const paletteWhite = {
    baseStart: [255, 255, 255],
    baseEnd: [240, 244, 248],
    glowA: [255, 255, 255, 0.82],
    glowB: [240, 244, 248, 0.7],
    text: [15, 23, 42],
    muted: [71, 85, 105],
    panel: [15, 23, 42, 0.14],
    border: [15, 23, 42, 0.3],
  };
  const paletteYellow = {
    baseStart: [255, 250, 213],
    baseEnd: [255, 214, 86],
    glowA: [255, 214, 86, 0.7],
    glowB: [255, 239, 153, 0.68],
    text: [15, 23, 42],
    muted: [67, 56, 23],
    panel: [15, 23, 42, 0.16],
    border: [15, 23, 42, 0.22],
  };
  const paletteGreen = {
    baseStart: [222, 252, 241],
    baseEnd: [52, 211, 153],
    glowA: [16, 185, 129, 0.78],
    glowB: [34, 197, 94, 0.72],
    text: [4, 20, 12],
    muted: [30, 64, 45],
    panel: [4, 20, 12, 0.18],
    border: [4, 20, 12, 0.22],
  };

  const mix = (a, b, t) => a + (b - a) * t;
  const lerpColor = (c1, c2, t) => c1.map((v, idx) => mix(v, c2[idx], t));
  const paletteLerp = (p1, p2, t) => ({
    baseStart: lerpColor(p1.baseStart, p2.baseStart, t),
    baseEnd: lerpColor(p1.baseEnd, p2.baseEnd, t),
    glowA: lerpColor(p1.glowA, p2.glowA, t),
    glowB: lerpColor(p1.glowB, p2.glowB, t),
    text: lerpColor(p1.text, p2.text, t),
    muted: lerpColor(p1.muted, p2.muted, t),
    panel: lerpColor(p1.panel, p2.panel, t),
    border: lerpColor(p1.border, p2.border, t),
  });

  const section = ratio <= 0.5 ? [paletteWhite, paletteYellow, ratio / 0.5] : [paletteYellow, paletteGreen, (ratio - 0.5) / 0.5];
  const blended = paletteLerp(section[0], section[1], section[2]);

  rootStyle.setProperty("--bg-base-start", toHex(blended.baseStart));
  rootStyle.setProperty("--bg-base-end", toHex(blended.baseEnd));
  rootStyle.setProperty("--bg-glow-a", toRgba(blended.glowA));
  rootStyle.setProperty("--bg-glow-b", toRgba(blended.glowB));
  rootStyle.setProperty("--text", toHex(blended.text));
  rootStyle.setProperty("--muted", toHex(blended.muted));
  rootStyle.setProperty("--panel", toRgba(blended.panel));
  rootStyle.setProperty("--border", toRgba(blended.border));
  rootStyle.setProperty("--glow-opacity", (0.35 + ratio * 0.55).toFixed(2));
  rootStyle.setProperty("--glow-size", `${140 + ratio * 80}%`);
}

function toHex(rgbArr) {
  const [r, g, b] = rgbArr.map((v) => Math.round(v));
  return `#${[r, g, b]
    .map((val) => val.toString(16).padStart(2, "0"))
    .join("")}`;
}

function toRgba(rgbaArr) {
  const [r, g, b, a] = rgbaArr;
  const alpha = a === undefined ? 1 : a;
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha.toFixed(2)})`;
}

async function loadWords() {
  const response = await fetch("words.txt", { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Failed to fetch word list: ${response.status}`);
  }
  const text = await response.text();
  const words = text
    .split(/\r?\n/)
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => w.toUpperCase())
    .filter((w) => w.length === WORD_LENGTH && /^[A-Z]+$/.test(w));
  const unique = Array.from(new Set(words));
  if (unique.length === 0) {
    throw new Error("Word list is empty after filtering.");
  }
  wordList = unique;
  wordBuckets = buildBuckets(unique);
  return unique.length;
}

function showEndOverlay(text) {
  endText.textContent = text;
  renderStats(loadStats());
  endOverlay.classList.add("show");
}

function hideEndOverlay() {
  endOverlay.classList.remove("show");
  endText.textContent = "";
  endStats.textContent = "";
}

function shareResult() {
  if (!guessHistory.length) {
    showMessage("Play a game first.");
    return;
  }
  const won = guessHistory[guessHistory.length - 1].guess === targetWord;
  const board = formatShareBoard(guessHistory);
  const text = `Word Grid ${won ? "✓" : "✗"} ${guessHistory.length}/${MAX_GUESSES}\n${board}\n`;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showMessage("Result copied!");
    }).catch(() => {
      showMessage("Copy failed.");
    });
  } else {
    showMessage("Clipboard not available.");
  }
}

function formatShareBoard(history) {
  const mapStatus = { correct: "🟩", present: "🟨", absent: "⬛" };
  return history.map((entry) => entry.statuses.map((s) => mapStatus[s] || "⬛").join("")).join("\n");
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { played: 0, wins: 0, streak: 0, maxStreak: 0 };
    }
    const parsed = JSON.parse(raw);
    return {
      played: parsed.played || 0,
      wins: parsed.wins || 0,
      streak: parsed.streak || 0,
      maxStreak: parsed.maxStreak || 0,
    };
  } catch {
    return { played: 0, wins: 0, streak: 0, maxStreak: 0 };
  }
}

function saveStats(stats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function recordGame(won) {
  const stats = loadStats();
  stats.played += 1;
  if (won) {
    stats.wins += 1;
    stats.streak += 1;
    stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
  } else {
    stats.streak = 0;
  }
  saveStats(stats);
}

function renderStats(stats) {
  if (!stats) return;
  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;
  endStats.textContent = `Played: ${stats.played} • Wins: ${stats.wins} (${winPct}%) • Streak: ${stats.streak} • Max: ${stats.maxStreak}`;
}

function setDifficulty(next) {
  if (!["easy", "medium", "hard"].includes(next)) return;
  difficulty = next;
  difficultyBtns.forEach((btn) => {
    const isActive = btn.dataset.difficulty === next;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function buildBuckets(list) {
  // Score words by common letter frequency; higher score = "easier"
  const freq = {};
  for (const word of list) {
    for (const ch of new Set(word.split(""))) {
      freq[ch] = (freq[ch] || 0) + 1;
    }
  }
  const scored = list.map((word) => {
    const score = word.split("").reduce((sum, ch) => sum + (freq[ch] || 0), 0);
    return { word, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const third = Math.floor(scored.length / 3);
  const easy = scored.slice(0, third).map((w) => w.word);
  const medium = scored.slice(third, third * 2).map((w) => w.word);
  const hard = scored.slice(third * 2).map((w) => w.word);
  return { easy, medium, hard };
}

init();
