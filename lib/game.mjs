// Loads the Frankendom simulation straight from a checkout of DomLynch/RPG-game. No copy of the game lives in this repo.
//
//   GAME_DIR=/path/to/RPG-game node scripts/ladder-sweep.mjs curve ...      (default: ../RPG-game, next to this repo)
//
// Needs Node >= 22.18 (it imports the game's .ts files directly via type stripping) and a checkout at or near trunk 4056467, the revision
// every number in docs/ was measured on. The sim is pure TypeScript with no browser APIs, so no `npm install` is needed to run it.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

export const GAME_DIR = path.resolve(process.env.GAME_DIR ?? path.join(import.meta.dirname, '..', '..', 'RPG-game'));
if (!fs.existsSync(path.join(GAME_DIR, 'src', 'combat.ts'))) {
  console.error(`No Frankendom checkout at ${GAME_DIR}. Clone DomLynch/RPG-game and set GAME_DIR=<path>.`);
  process.exit(2);
}
const load = (file) => import(pathToFileURL(path.join(GAME_DIR, 'src', file)).href);
export const [combat, moves, duel, roster] = await Promise.all([load('combat.ts'), load('moves.ts'), load('duel.ts'), load('roster.ts')]);
export const { OPPONENTS, MOVES, canStrike, initialPractice, stepPractice } = combat;
export const { RULES, PATHS, opponentAt, profileAt, weaponOf } = moves;
export const { mirror, movesOf, timing } = duel;
export const { isHeld } = roster;
