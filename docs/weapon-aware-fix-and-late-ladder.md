# The weapon-aware cliff fix, the scythe, and the late ladder (2026-10-05)

Game trunk `4056467`. Patch: `patches/weapon-aware-lapse-ramp.diff` + `patches/weapon-aware-lapse-ramp-fixture.diff`. Tables: `results/`.

## 1. The fix (supersedes `patches/lapse-ramp.diff`, which was longsword-only)

**What it does.** When a warden has only a thin margin to answer a swing (the swing's own windup less the reaction he noticed it on, under 6 ticks), he lapses more (starts near 90 %, easing to
his own value as the margin reaches 6). The cliff, where he goes from never answering a cut to answering nearly all of them in one level, becomes a slope.

**Why it is weapon-aware.** `ai.ts` reads the actual swing's windup, so it follows whatever weapon the player holds (20-tick longsword, 22-tick cleaver, ...). Nothing else needed changing per weapon.

**Why the tuned levels do not move.** `profileAt` sets a `lapseRamp` flag only on levels strictly between the easy (L6) and normal (L18) anchors, and only for wardens whose easy reaction is at least 20 (the ones that actually start unable to
answer a standard cut). Anchor levels return their original profile objects. The AI also applies the ramp only to cuts with a windup of 20 or more, so thrusts and other quick moves keep their tuned behaviour.
Result: at L18, the skilled bot's win rates are identical before and after for the Veteran, Executioner, Dwarf, Knight, Pitborn and Shieldmaiden (2 / 17 / 42 / 3 / 2 / 3 %).

**Size.** 7 files, +48 / -31: `src/ai.ts`, `src/moves.ts` (constants, a `lapseRamp` field, the flag), `src/record.ts` (RECORD_VERSION 22 -> 23, readable list widened, `REACH[23]`, and an optional `to` bound on REACH),
`tests/record-version-guard.test.ts` (re-pinned, new range cases), `tests/specials.test.ts` and `tests/player-weapons.test.ts` (literal version 22 -> 23), and the regenerated `tests/fixtures/browser-replay-records.json`.

**Verified.** On top of trunk: `eslint src`, `tsc -p tsconfig.tests.json`, `npm test` 1785 pass / 0 fail / 2 skipped, and `npm run test:slow` 237 / 237 (including the strategy battery and the player-weapon battery).
Both patches apply cleanly with `git apply`.

**Old links.** `REACH[23]` declares the nine wardens with easy reaction >= 20 on levels 7-17. A saved fight on an older record version is refused only there; every other saved fight is still read. (The first draft's lower-bound-only REACH wrongly refused
levels 18 and up, which the existing guard test caught; REACH now has an optional `to`.) That refusal on levels 7-17 is the one real cost; it is the decision to take before applying (see `docs/incorporate-into-main.md`).

### Measured effect (headless bots; 40 to 60 fights per cell, about +-7 points)
Biggest drop in win rate between two consecutive levels (L6-L14), `blocker` bot, Veteran, trunk -> fix: longsword 57 -> 22, cleaver 65 -> 17, maul 65 -> 15, gladius 72 -> 32, warhammer 49 -> 30, trident 58 -> 38, estoc 50 -> 45, knife 8 -> 8 (unchanged by design).
Longsword blocker by level, trunk vs fix: L11 100 / 100, L12 43 / 78, L13 28 / 75, L14 25 / 57, L16 28 / 50, L18 20 / 20 (anchor: identical).
`skilled` bot, L10-L18, trunk -> fix:

| Opponent | Trunk | With the fix |
|---|---|---|
| Veteran | 95 92 8 12 13 12 15 7 2 | 95 92 68 50 25 27 22 10 2 |
| Executioner | 88 80 25 18 23 22 12 13 17 | 88 80 65 47 45 40 23 23 17 |
| Dwarf | 78 73 33 32 40 30 38 45 42 | 78 73 68 60 57 43 42 42 42 |
| Knight | 40 60 8 8 5 3 5 7 3 | 40 60 33 28 18 12 13 3 3 |
| Pitborn | 73 67 63 48 8 3 13 2 2 | 73 67 63 48 33 18 12 0 2 |
| Shieldmaiden | 93 85 83 85 15 7 15 3 3 | 93 85 83 85 47 43 22 3 3 |

(Columns are levels 10 to 18.)

### What it does not fix
- **The knife** (14-tick cut): its cliff is at L22, below the normal anchor's reaction, so smoothing it would move the tuned hard anchor. Left alone on purpose; a design decision.
- **The L5 -> L6 cliff** for the Nightborn and Plague Doctor: their reaction drops 6 ticks a level through L1-L6, so the margin jumps by more than the ramp can smooth. `experiments/novice-cliff-cause.mjs` shows reaction is the largest single driver (the
  cut-spam bot recovers from 1 % to 26 % at L6 with L5's reaction). Needs a change to the novice reaction offset, which retunes L1-5 (the "tap-attack wins at L1" gate): a design decision.
- **The estoc, trident and warhammer** still step (estoc 55 -> 10 at L12): their light cut is not the move the bots chain on, and parts of their behaviour are not governed by the 20-tick light cut. Not investigated further.

### Two failed attempts, kept so nobody repeats them
1. A guard-share ramp did not touch the cliff (`experiments/guard-ramp-candidate.mjs`).
2. The first margin version (measure `timing(opponent).windup`, ramp on every level) failed 20 repo tests: chained follow-up cuts have a 16-tick windup, so it also moved the normal anchor's fights and the pinned balance bands (Dwarf, Witch) and replay references.
   A second try (the move's own windup) still failed the same 20 because thrusts and quick moves at the normal anchor, and the Goblin-type easy anchors, were inside the margin band. The profile flag + long-cut gate is what made it anchor-neutral.

## 2. The scythe: it was my bots, plus a deliberate design
- The scythe's light cut has a **dead band**: a blow started inside 1.4 m meets nothing (`minReach` 1.4). My bots swung inside it. With spacing fixed, `masher` wins about 33 % at L6 with the scythe (was 0 %).
- `blocker` and `skilled` still lose every scythe fight, and that one is by design: the scythe (and trident) have a **shaft guard** that pays 15 % more per block and is broken by a plain overhead heavy (`SCYTHE.guardProfile`, `moves.ts`).
  A guard-and-punish style is poor with a polearm; the opponent broke my guard 64 times in 10 fights. The scythe table rows for those two bots mean "guard-heavy play loses", not "the scythe is unbeatable".

## 3. The late ladder and Special Moves
- **Specials are live from level 16** (`LIVE_SPECIALS = true`, `CLASS_B_FROM` = rank 4): both fighters carry one. A cast stands still for a 2 s windup (120 ticks) and takes 20 % of the target's max health (25 % from L36), first at 20 s then every 20 s.
  **Once started it always lands**: the 3 m reach is checked only when the cast begins, and it is unblockable and undodgeable (`duel.ts`). My early idea of running out of reach was wrong and gets hit 11 times in 12.
- Every earlier table above L16 was run **without** specials. Re-run with them (30 fights per cell, about +-9 points, L16 / L26 / L36 / L46; `results/specials-{off,naive,aware}.txt`): a bot that ignores specials (`naive`) does somewhat worse than before
  (Dwarf skilled at L26 60 -> 23 %, Goblin skilled at L46 90 -> 60 %), and a bot that casts its own when ready (`aware`) wins most of it back, and in some cells more. So specials are roughly symmetric and do not change the shape of the ladder.
- **The Goblin and the Witch stay easy even with specials**: `aware` wins 77-100 % against the Goblin at every level tested and 70-83 % against the Witch up to L36. The finding that they do not scale stands.
- Most other late-ladder cells are already at or under 20 % for these bots, with or without specials.

## 4. Limits of all of this
- The bots move along a fixed world axis (`yaw` 0) rather than relative to the opponent, so their approach and spacing are cruder than a person's. A bot with true relative movement would probably do better everywhere; the absolute numbers are floors, the shapes are the point.
- 30-60 fights per cell: single cells move by about 7-9 points; the cliffs are 40-90 points.
- Everything is headless. Whether the smoothed curve *feels* right is the playtest question (`docs/playtest-level-12.md`), and the real frame rate needs `live-play/measure-fps.mjs` on a GPU machine.
