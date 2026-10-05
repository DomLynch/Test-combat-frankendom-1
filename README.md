# test-combat-frankendom-1

Testing sandbox for **Frankendom** combat and balance. Nothing here ships. The game lives in [DomLynch/RPG-game](https://github.com/DomLynch/RPG-game);
this repo holds experiments, measurements and learnings so the game repo stays clean for the developers. Extract what is useful when ready.

Everything was measured on game trunk **`4056467`** (the revision frankendom.com was serving on 2026-10-04/05).

## What is here

| Path | What |
|---|---|
| `docs/ladder-reaction-cliff.md` | The main finding and a verified-but-unapplied fix. Start here. |
| `docs/incorporate-into-main.md` | **Checklist for taking this into the game repo**: what to decide, which tests the fix trips, in what order. |
| `docs/learnings.md` | How the combat rules and the ladder work (read from the code), what the live game looked like, how to run things in the cloud container, open questions. |
| `scripts/ladder-sweep.mjs` | Scripted players vs the live opponents at any of the 46 ladder levels, headless, minutes per sweep. |
| `lib/` | `game.mjs` loads the sim from a game checkout (`GAME_DIR`); `bots.mjs` has the scripted players and the fight runner. |
| `experiments/` | `reaction-cause.mjs` isolates why the cliff happens; `lapse-ramp-candidate.mjs` is the fix that works; `guard-ramp-candidate.mjs` is a fix that does not (kept so nobody re-tries it). |
| `for-game-repo/` | The sweep script in its drop-in form for the game repo's `scripts/` folder (static imports, no `GAME_DIR`). |
| `patches/lapse-ramp.diff` | The in-game version of the fix (`src/moves.ts`, +20 lines). Applies cleanly on `4056467`. Trips two repo checks, see the doc. |
| `results/` | Raw tables behind the doc (shipped curve, curve with the fix, matrix at L6/L18/L46, per-opponent curves). |
| `live-play/` | Playwright scripts that opened frankendom.com at 375 px in the cloud container. WIP, software-rendered (about 1.7 fps). |
| `screenshots/` | Four live frames (loading card, fight start, mid-fight, Crixus at about 45 %). |

## Run it

Needs Node >= 22.18 and a checkout of the game (no `npm install` needed: the simulation is pure TypeScript).

```
git clone https://github.com/DomLynch/RPG-game ../RPG-game && git -C ../RPG-game checkout 4056467
GAME_DIR=../RPG-game node scripts/ladder-sweep.mjs curve --n=60 --opponents=veteran,pitborn,executioner --levels=10,11,12,13,14,15,16,17,18
GAME_DIR=../RPG-game node scripts/ladder-sweep.mjs matrix --n=40 --levels=1,18
GAME_DIR=../RPG-game node experiments/reaction-cause.mjs
```

Fights are built the way the game builds them (`opponentAt` + `profileAt`) with fixed seeds, so the same tree prints the same table. Each command takes
about a minute or two on 4 CPUs.

## The headline

On 6 of the 10 live opponents, difficulty falls off a cliff in one level instead of rising smoothly: the Veteran, Executioner, Dwarf and Knight at
**L11 -> L12**, the Pitborn and Shieldmaiden at **L13 -> L14**. A bot that wins 60-95 % one level wins 5-15 % the next, even a bot that parries on
the right side and times the window. Cause: the warden's `reaction` (ticks to notice a swing) drops under the player's 20-tick cut, so he goes from
never answering a cut to answering nearly all of them. The Goblin and the Witch never get hard.

## Honest limits

The bots read simulation state directly, so a win rate says what a strategy *can* do, not how a level *feels*. Whether L12 feels like a wall to a
person is a playtest question. 60 fights per cell is about +-6 points per cell against 40-90 point cliffs. Visual impressions in `docs/learnings.md`
come from a software-rendered browser at 1.7 fps and say nothing about animation or feel.

Provenance: produced in a Claude Code cloud session (`claude/happy-pascal-v8s7mp`); the original proposal PR on the game repo was closed in favour of this repo.
