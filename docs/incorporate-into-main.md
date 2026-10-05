# Taking this into the main game repo (checklist)

Measured on game trunk `4056467`. Re-run `scripts/ladder-sweep.mjs` against whatever trunk is by then before trusting any number here.
Nothing below has been applied to the game. Order matters: decide first, then touch code.

## 1. Decide: fix the reaction cliff?  (Combat lane's call)
Read `docs/weapon-aware-fix-and-late-ladder.md` first (and `docs/ladder-reaction-cliff.md` for the finding). If yes:
1. **Apply the complete patch** on trunk `4056467`: `git apply patches/weapon-aware-lapse-ramp.diff patches/weapon-aware-lapse-ramp-fixture.diff`.
   It is 7 files (+48/-31): `src/ai.ts`, `src/moves.ts`, `src/record.ts`, three tests, and the regenerated replay fixture. It already bumps RECORD_VERSION to 23, declares REACH[23], re-pins the kill-link guard, and updates the two tests that pin the literal version.
2. It has been verified on top of trunk: `eslint src`, `tsc -p tsconfig.tests.json`, `npm test` (1785 pass), `npm run test:slow` (237 pass, including the strategy battery). No existing balance test moves, because the tuned anchors are untouched.
3. **The one real cost to weigh:** `REACH[23]` makes an older saved fight (record versions 18-22) unreadable for the nine wardens whose easy reaction is >= 20 (Veteran, Pitborn, Executioner, Dwarf, Knight, Shieldmaiden, plus the held Minotaur, Werewolf, Skeleton) on levels 7-17.
   Every other saved fight keeps working. That is Dom's and Combat's decision.
4. If trunk has moved: re-apply, then re-run `node scripts/browser-replay-check.mjs --write` and paste the digest the guard test prints into `SIM_DIGEST`.
5. Re-run the sweep (`curve --opponents=veteran,pitborn,executioner,dwarf,knight,shieldmaiden --levels=10,...,18`) and compare with `results/curve-with-fix-L10-18.txt`.
6. Human playtest of L11 to L14 before shipping (`docs/playtest-level-12.md`): the bots say what a strategy can do, not how it feels.
If no: the finding stands as documentation; nothing to apply.

**Not covered by the patch (each a design decision):** the knife's cliff at L22 (below the normal anchor; smoothing it would move the hard anchor), the L5 -> L6 cliff for the Nightborn and Plague Doctor (needs the novice reaction offset changed, which retunes L1-5),
and residual steps for the estoc, trident and warhammer. See the doc for why.

## 2. Optional: bring the sweep tool into the game repo
`for-game-repo/scripts/ladder-sweep.mjs` is the in-repo version (static imports from `../src`, no `GAME_DIR`). Drop it in `scripts/`; it complements
`tests/battery.test.ts` (which gates only the Veteran). Skips `hold: true` recipes unless `--include-held`. A natural follow-up is a slow test that fails when a
strategy's win rate drops (or jumps) by more than a set margin between adjacent ladder levels, which would have caught this cliff.

## 3. Decide: the Goblin and the Witch
A guard-only bot wins 98-100 % against the Goblin at every level sampled (L1 to Origin) and 67 % against the Witch at Origin, while the Nightborn and Plague Doctor
decline smoothly. Is that intended? Nothing gates it today. (Tables: `results/goblin-nightborn-curve.txt`, `results/matrix-L6-L18-L46.txt`.)

## 4. Parked: only matters if the Minotaur and Werewolf are ever released
Both are `hold: true` (not in the game) and were left out of the proposal. Noted so it is not rediscovered: they carry the Pitborn's 190-health body and full
poise 16 from L6, but `POISE_FULL_AT` in `src/moves.ts` lists only the Pitborn and Shieldmaiden, so a light cut (14) never staggers them. With the Pitborn's poise ramp the
scripted players went from near-zero wins (Minotaur L6: 0 / 0 / 2 % masher / blocker / skilled; Werewolf 2 / 3 / 8 %) to 67-90 % at L6 and 48-78 % at L10.
Measured with an earlier version of the blocker bot, 60 fights per cell; re-measure with `--include-held` before acting. The fix would be adding them to `POISE_FULL_AT`
(and to the pinned test in `tests/ladder-levels.test.ts`), which is also a sim change needing the RECORD_VERSION decision.

## 5. Where the original PR is
Closed PR [#1373](https://github.com/DomLynch/RPG-game/pull/1373) on the game repo (branch deleted). GitHub keeps its commits readable through the PR page; this repo is the maintained copy.
