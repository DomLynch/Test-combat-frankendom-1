# Overview of the other systems (read from trunk 4056467; no tests run)

Produced by a read-only survey of the code and docs, then spot-checked. **Confirmed** = I checked it against the code myself; **survey only** = the surveyor's reading, not re-checked. Nothing here was executed against a database or a browser.

## One correction up front
This overview is of **trunk**. The Pit "skull wall of 30 kills / record board / wall of champions", `fight_results`, `report_duel` and computer-fight posting do **not** exist in trunk. They exist only in the developers' open PRs (#1363 to #1372 at the time of writing, e.g. "backend: fight_results + duel pairing (HOLD: not applied)"). Anything below about the Pit is the trunk version, which is local-only data.

## 1. Gear, loot and armour stats
- **Gear stats do nothing yet (confirmed).** `src/gear-stats.ts` is data only; its header says nothing changes a fight until "deliverable 5", and no file outside it imports `loadoutFor` or `kitFrom`. The sim (`duel.ts`, `sim.ts`, `record.ts`) never reads a Loadout. So on trunk the whole ladder is "naked".
- The design (survey only): two multipliers, `attack` (cap 1.15) and `res` (cap 0.80). Points per slot: Helmet 20, Body 30, Arms 12, Gloves 8, Greaves 18, Boots 12 (sum 100), the weapon 100, crest and shield 0; a full Origin set is 900 points. RES scales damage taken including block chip; neither touches posture or timing.
- Loot is take-one-per-kill; the server awards from a verified record at `tierAt(server marks)` (survey only: `awards.ts`).
- **Ladder impact:** none today. When gear is wired in, the ladder (tuned naked) shifts: attack up to +15 %, damage taken down to 80 % (about a 25 % effective health gain), so every pinned balance row and the player-weapon battery would need re-snapshotting.
- Possible problems (survey only): the loot tier is `rungOf(level fought)` while the server award tier is `tierAt(server marks)`, and the dial lets the level trail the rank by up to 5, so they can differ; `levelOf` is defined twice with different meanings (1-10 titles in `grades.ts`, 1-46 levels in `career.ts`); the verifier (`scripts/verify-loot.mjs`) does not check the record's weapon, skill or seed against what the account owns.

## 2. Finishers and gore
- A finisher is **presentation only** (survey only): `selectFinisher` is a pure function of the kill event and the two weapons; it returns nothing for a double fall, the player's own death, a kick kill or a skill kill. Five outcomes rotate (split crown, decapitation, run-through, plain death, opened), excluding the previous fight's pick; each opponent has a whitelist (`roster.ts`): the Witch none, the Knight and Plague Doctor plain death only, the Dwarf all five.
- It changes no tick, so **no ladder impact**; it only delays the kill screen by 2.4 to 4.1 s.
- Worth knowing: `finishers.ts` and `roster.ts` are in the kill-link guard's hashed file list, so even a pure-presentation change to selection needs a RECORD_VERSION bump.
- Possible problems (survey only): "never twice in a row" is an in-memory variable, so it resets when the page reloads (the Next button does); two viewers of one shared replay can see different finishers; for restricted opponents most picks resolve to nothing, so the effective distribution differs from the even-share test.

## 3. The Pit (trunk version)
- A walk-in room after a win (and a Recover side door after a defeat) with a gear rack, trophy plinths and a **skull wall of 100 niches (10 opponents x 10 ranks)**, drawn with two instanced meshes (survey only). It never ticks the sim.
- The skull data is `loot.defeats` on the local profile, set on every career win and merged across devices (survey only: `loot.ts`, `cloud-profile.ts`). It needs no backend fight data.
- **Possible problem (survey only, matches the repo's own security notes):** `loot.defeats` is written by the client, so a public wall built from it would be forgeable. Only `loot_claims` (the server mark ledger) is verified.
- **Ladder impact:** none (read-only room).

## 4. Online duels and the backend
- Live PvP is lockstep with rollback (survey only): both peers run the full sim on 6-byte inputs, hash the state every 30 ticks, and a mismatch ends in "No contest". `PVP_REWARDS = false` (**confirmed**), so PvP touches no marks, rank or loot. The relay only forwards bytes.
- Ladder wins are claimed by the client and verified on the server by **replaying the record** (`verify-loot`, `replay.ts`): duplicates refused, level floor applied, awards only from verified claims (survey only).
- **Confirmed trust gaps:**
  1. The daily-warden verifier compares only `opponent`, `weapon`, `outcome` and `ticks` (`scripts/verify-daily.mjs:45`) and never `taken` or `location`, yet the daily board ranks "cleanest kill" by `taken`. The client no longer fights dailies, so the exposure is small today.
  2. `net_desyncs` and server verification of PvP records are promised in `docs/duel-architecture.md` but exist nowhere else in the repo.
- **Survey only:** a record is only a replay of client inputs against a deterministic AI, so a seed-shopping or input-search tool passes verification (documented in `docs/briefs/backend/record-account-binding.md`, not built); public shared-fight ids are enumerable; `duel_metrics` has a global cap an anonymous script can fill; `docs/duel-architecture.md` still pins RECORD_VERSION 20 while trunk was 22.
- **Ladder impact:** none while PvP rewards are off.

## Top 10 things worth testing next (survey's ranking, lightly edited)
1. Prove equipped gear and `loadoutFor` cannot change a replay (same record with and without equipment, identical hash), protecting the "naked ladder" while gear is parked.
2. A verify-daily regression: a record with a forged `taken` or `location` must be refused, or the board must stop ranking on them.
3. `verify-loot` with a forged weapon, skill or seed: assert and document what it does today.
4. Replay a ladder record under an altered level, opponent or seed and with a one-tick nudge; confirm the hash changes and whether the verifier accepts the nudge.
5. Cross-engine determinism of the 1000-fight hash chains (Node, Chromium, WebKit) on the current record version.
6. Rollback stress: two in-process peers at 250 ms RTT, 10 % loss and jitter; assert zero desyncs.
7. The effective finisher distribution per opponent (Knight, Plague Doctor, Witch) and determinism for a given previous pick.
8. Tier-source mismatch: loot tier vs award tier at a trailing dial level.
9. `mergeLoot` / `cleanLoot` round-trip of `defeats` (union across devices, unknown keys dropped, size cap).
10. Claim outbox edge cases (cap 50, account switch mid-flush, the on-hide byte limit).

## What this survey could not determine
Whether the sim will ever read a Loadout (deliverable 5 is parked); what the hosted database contains (migrations only were read); whether the relay is installed or PvP is open to players; whether the database checks pass in CI; and any design for `fight_results` or computer-fight posting in trunk (it exists only in the open PRs).
