# Handoff for the dev, 2026-10-05 (read this first)

All numbers were measured on game trunk `4056467` with scripted bots on the headless simulation. Nothing here is applied to the game.

## What was done
- Played the live game at phone size (software-rendered, about 2 fps, so looks only, not feel) and reviewed the visuals.
- Built a headless fight tester (`scripts/ladder-sweep.mjs`, about 70 minutes of game time per second) with scripted players, and swept 10 live opponents x 46 levels x 9 player weapons.
- Found, isolated and fixed a difficulty cliff. The fix passes the repo's own tests.
- Explained the scythe, tested Special Moves, and surveyed gear, finishers, the Pit and online duels.
- Everything lives in this repo. The main game repo is untouched: the proposal PR was closed and its branch deleted.

## Learnings
1. **Difficulty cliff.** On 6 of 10 live opponents a strategy that wins 60-95 % at one level wins 5-15 % at the next: Veteran, Executioner, Dwarf, Knight at L11 -> L12; Pitborn, Shieldmaiden at L13 -> L14.
2. **Cause (isolated).** The AI notices a swing `reaction` ticks after it starts. At reaction 20 it can never answer the 20-tick longsword cut; at 19 it answers nearly all. The blend moves reaction a tick a level, so one level flips it.
3. **It moves with the weapon.** 22-tick weapons (cleaver, maul, trident, warhammer) have it at L10; 20-tick (longsword, gladius, estoc) at L12; the knife at L22. Predicted before measuring, and it matched.
4. **A second cliff at L5 -> L6** for the Nightborn and Plague Doctor (reaction drops 6 ticks a level there). The Plague Doctor is also hard early: the best bot wins 42 % at L6, against about 100 % for the Veteran.
5. **The Goblin and the Witch never get hard.** A guard-only bot wins 98-100 % against the Goblin at every level (77-100 % with specials) and 67 % against the Witch at Origin.
6. **Level 1 is a pushover by design.** The existing balance test only gates the Veteran, so none of this was flagged.
7. **Special Moves are live from L16** and, once started, always land (the 3 m reach is checked only at cast start): 20 % of max health, 25 % from L36, every 20 s. Effect is modest: a player who ignores them does somewhat worse, one who casts their own wins it back.
8. **The scythe** was partly my bots swinging inside its dead band (a blow under 1.4 m meets nothing) and partly design: scythe and trident have a "shaft guard" that costs 15 % more per block, so guard-only play loses with them.
9. **Gear stats do nothing yet.** Only `gear-stats.ts` uses them, so the whole ladder is "naked"; wiring gear in later shifts every pinned balance row.
10. **Trust gaps (confirmed in code).** The daily-warden verifier never checks `taken` or `location`, yet the board ranks on `taken`. `net_desyncs` and server checks for PvP exist only in a design doc. `loot.defeats` (the Pit's skull data) is client-written. (`fight_results` and `report_duel` are only in the open PRs, not trunk.)
11. **Visuals (one reviewer, 375 px).** Strong: painted sky and ruins, readable fighters, consistent grade. Weak: the camera lets the hero hide the opponent mid-fight, flat sand floor, thin low-contrast swords, cryptic HUD, crowded buttons, loading card shows a different arena from the fight.
12. **Limits.** The bots read exact game state and move along a fixed world axis, so absolute numbers are floors and the shapes are the point. 30-60 fights per cell is about +-7-9 points. Whether anything *feels* right needs a person.

## The fix (ready, not applied)
`patches/weapon-aware-lapse-ramp.diff` + `...-fixture.diff`, 7 files (+48/-31), applies cleanly on trunk. A thin margin (the swing's own windup less the reaction the warden noticed it on, under 6 ticks) makes him lapse more, so the cliff becomes a slope for any weapon. The tuned easy/normal/hard levels are untouched. Verified on top of trunk: `eslint src`, `typecheck:tests`, `npm test` 1785 pass, `npm run test:slow` 237 pass (including the strategy battery).
**The one cost:** it bumps RECORD_VERSION to 23, so older saved fights for nine wardens on levels 7-17 stop being readable (every other saved fight still works).
Effect, Veteran vs the `skilled` bot, L11 -> L18: 92 -> 68 -> 50 -> 25 -> 27 -> 22 -> 10 -> 2 %, instead of 92 -> 8 -> 12 -> 13 -> 12 -> 15 -> 7 -> 2 %.
**Not covered (design decisions):** the knife's cliff (L22), the L5 -> L6 cliff, residual steps for estoc, trident and warhammer.

## Next actions for the dev
1. **Decide on the cliff fix** (Combat lane + Dom). If yes: `git apply patches/weapon-aware-lapse-ramp.diff patches/weapon-aware-lapse-ramp-fixture.diff`; if trunk moved, re-run `node scripts/browser-replay-check.mjs --write` and re-pin `SIM_DIGEST`; run `npm run quality:stop` and `npm run test:slow`. Weigh the old-link cost first.
2. **Human playtest, 15 min** (`docs/playtest-level-12.md`): Veteran, 5 fights each at L10 to L13. Jump to a level from the browser console: `sessionStorage.setItem('frankendom.dev-kit', JSON.stringify({level:12})); location.reload()`. If humans don't fall off a cliff, the fix is not urgent.
3. **Real frame rate on the Mac:** `node live-play/measure-fps.mjs --gpu --headed --level=12 --seconds=30` (needs `npm i playwright`); paste the JSON line into `results/`.
4. **Decide:** are the Goblin and Witch meant to stay easy? Is the Plague Doctor meant to be this hard at L6? Leave the knife cliff and the L5 -> L6 cliff, or retune?
5. **Add a guard so it cannot come back:** a slow test that fails when a bot's win rate moves more than a set margin between adjacent levels (the sweep tool can drive it).
6. **Small security fixes:** make the daily verifier compare `taken` and `location` (or stop ranking on them); have `verify-loot` check weapon, skill and seed; decide how a public Pit wall would avoid forgeable `defeats`.
7. **Before gear stats are wired in:** add a test that equipped gear changes no replay hash.
8. **Re-run the sweeps on whatever trunk is by then** before trusting any number here, and look at the open backend PRs (#1366-#1369), which this work did not cover.

Map: `README.md` (index), `docs/ladder-reaction-cliff.md` (the finding), `docs/weapon-aware-fix-and-late-ladder.md` (fix, scythe, specials), `docs/incorporate-into-main.md` (checklist), `docs/systems-overview.md`, `docs/learnings.md`, `results/` (raw tables).
