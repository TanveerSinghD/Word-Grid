# Word Grid

A Wordle-style five-letter guessing game built with plain HTML/CSS/JS—no build step or framework required.

## Features
- 6 attempts to guess a 5-letter word; keyboard or on-screen keys work.
- Tile and key coloring: green = correct spot, yellow = wrong spot but in word, grey = not in word.
- On-grid prompts fade after 1.5s; end-of-game overlay shows the answer with a replay button.
- Dynamic, animated background that shifts from white → yellow → green as you uncover new letters (only reacts to letters you haven’t tried before).
- Validates guesses against a sizable open word list (`words.txt`) loaded at startup.
- Local stats (played, wins, streaks) and one-click shareable results (copied as a colored grid to the clipboard).
- Difficulty toggle (Easy/Medium/Hard): targets are drawn from different word buckets scored by letter frequency; guesses are still validated against the full list.

## Running locally
Use a simple static server so `words.txt` can be fetched:
- `python3 -m http.server 8000` and open `http://localhost:8000`
- or any other static server (e.g., `npx serve`, `ruby -run -ehttpd . -p 8000`, etc.)
Opening `index.html` directly from the file system won’t work because `fetch("words.txt")` is blocked on `file://`.

## Deployment
Deploy as a static site (GitHub Pages, Netlify, Vercel, etc.). No build step is required—just serve the files in this folder.

## Project structure
- `index.html` — markup and layout containers.
- `styles.css` — styling, responsive layout, animated background.
- `script.js` — game logic, input handling, validation, UI feedback, stats/share.
- `words.txt` — uppercase 5-letter word list (sourced from dwyl/english-words, MIT), loaded via `fetch`.
- `logic.js` — shared pure functions (e.g., guess evaluation) used by the app and tests.
- `test/logic.test.js` — core logic tests using Node’s built-in test runner.
- `package.json` — minimal config with `"type": "module"` and `npm test` script.

## Customizing the word list
Replace `words.txt` with your own file (one 5-letter word per line, ASCII letters only). The game will load it on startup. Keep the file name the same or adjust the fetch path in `script.js`.

## Testing
`npm test` (or `pnpm test`/`yarn test`) runs the Node built-in test suite for the pure logic. Requires Node 18+ (for `node --test`).
