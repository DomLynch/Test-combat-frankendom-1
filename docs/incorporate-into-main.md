# Taking this into the main game repo (checklist)

Measured on game trunk `4056467`. Re-run `scripts/ladder-sweep.mjs` against whatever trunk is by then before trusting any number here.
Nothing below has been applied to the game. Order matters: decide first, then touch code.

## 1. Decide: fix the L12 / L14 reaction cliff?  (Combat lane's call)
Read `docs/ladder-reaction-cliff.md` first. If yes:
1. Apply `patches/lapse-ramp.diff` to `src/moves.ts` (`git apply`; +20 lines; clean on `4056467`).
2. It will fail two existing tests, by design: `tests/ladder-levels.test.ts` "between anchors every level is a blend: skill knobs move monotonically"
   (needs an exemption for the lapse ramp) and the RECORD_VERSION guard (bump `RECORD_VERSION` in `src/record.ts` and update the decoder accept-list per the comments there).
   Old kill links at levels 12-17 will replay differently: weigh that cost before bumping.
3. Run `npm run test:all` (profile/record/snapshot changes are gated by it) and the strategy battery (`tests/battery.test.ts`).
4. Re-run the sweep (`curve --opponents=veteran,pitborn,executioner --levels=10,...,18`) and compare with `results/curve-with-lapse-ramp-L10-18.txt`.
5. Human playtest of L11 -> L14 before shipping (`docs/playtest-level-12.md`): the bots say what a strategy can do, not how it feels.
6. **The patch is longsword-shaped.** It uses the 20-tick cut, so it smooths the cliff for the longsword, gladius and estoc only. The cleaver, maul, trident and warhammer have theirs at L10 and the knife at L22
   (`docs/followups-2026-10-05.md` §2). A complete fix has to know the player's weapon (a fight record carries it). Also unaddressed: a second cliff at **L5 -> L6** for the Nightborn and Plague Doctor (§3).
If no: the finding stands as documentation; nothing to apply.

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
