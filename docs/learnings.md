# Learnings (session of 2026-10-04/05, game trunk 4056467)

Everything below was read from the game source or measured in this session unless it says otherwise.

## 1. How the combat rules work (from `src/duel.ts`, `src/moves.ts`, `src/ai.ts`)

- **Fixed ticks, 60 per second.** The sim is pure TypeScript with no browser APIs and deterministic math (`detmath.ts`), so it runs headless at about
  250,000 ticks/s. (A journal toggle plays it at 50 Hz, a fifth slower; online duels use their own step.)
- **Controls:** a move input plus light/heavy/thrust/kick/skill/roll/guard. A light cut: 20-tick windup, 8 active, 22 recovery, 14 damage, reach 1.65.
- **Directional guard.** A guard or parry covers ONE of five sides: the mirror of the blow's (an attacker's `right` cut arrives on the defender's `left`).
  No side chosen = the straight guard, which covers only thrusts. A bot that just holds Guard loses to cuts.
- **Parry:** pressing parry opens a window of `RULES.parry` = 10 ticks; a blow landing inside it is parried (the attacker staggers 90 ticks). Cooldown 30.
- **Roll:** costs 30 stamina; the roll is invulnerable on ticks 4..20 (`safeStart`/`safeEnd`). A low sweep trips a roller in the first half.
- **Some moves are not parryable** (the code says a kick cannot be parried and punishes a raised guard); the `skilled` bot rolls whatever the move data marks `parryable: false`. Which heavies fall in that set was not tabulated here.
- **Posture, stamina, poise:** a light (14) never staggers poise >= 16. Poise ramps 0 -> 16 over L1-18 for the Pitborn and Shieldmaiden for exactly that reason.
- **The AI notices a swing `reaction` ticks after it starts**, plans one response per swing (block, parry, roll/step, or ignore), and `lapse` is the
  chance a noticed swing gets no answer at all. A warden with `reaction` at or above the swing's windup can never answer it.

## 2. The ladder (`moves.ts` `opponentAt` / `profileAt`, `ladder.ts`)

- **46 levels.** Anchors: L1 novice, **L6 easy**, **L18 normal**, **L46 hard (Origin)**. Between anchors every AI knob is a linear blend of the two profiles;
  `reaction`, `anticipate`, `discipline`, `tellReaction` are rounded to whole ticks (that rounding is what makes a threshold bite).
- **Novice body (L1-5):** poise 0 and 70 % health, blending back to the opponent's own body at L6. L1 is designed to be beaten by tap-attacking.
- **Live rungs (10):** Veteran, Pitborn, Goblin, Nightborn, Executioner, Dwarf, Plague Doctor, Knight, Witch, Shieldmaiden. The Minotaur, Werewolf, Skeleton
  and Wraith are `hold: true` recipes (not in the game) and are skipped by the sweep unless `--include-held`.
- **Specials** appear from L36; the Centurion (Veteran) carries gladius + scutum from L6.
- **Gates that exist:** `tests/battery.test.ts` (no simple strategy may win > 50 % at normal or > 35 % at hard against the Veteran);
  `tests/ladder-levels.test.ts` (skill knobs move monotonically between anchors, poise ramp pins);
  a RECORD_VERSION guard (any sim change needs a version bump or old kill links break).

## 3. What the sweeps found (see `docs/ladder-reaction-cliff.md` for the tables)

1. **Reaction cliff** on 6 of 10 rungs (L12 / L14), cause isolated to one integer (`reaction` 20 -> 19 against the 20-tick cut).
2. **Goblin and Witch do not scale.** A guard-only bot wins 98-100 % against the Goblin at every level sampled up to Origin; 67 % against the Witch at L46.
   The Nightborn and Plague Doctor, whose reaction is already under 20 at L6, do decline smoothly (the controls).
3. **Level 1 is a pushover by design:** every bot wins about 100 % in about 15 s.
4. **A guard-share ramp does not fix the cliff** (`experiments/guard-ramp-candidate.mjs`). A lapse ramp does (`experiments/lapse-ramp-candidate.mjs`).
5. **The proposed fix breaks two repo checks:** the monotonic-blend test (lapse rises on purpose) and the RECORD_VERSION guard (levels 12-17 replay differently).
6. **Caveat on method:** the cliff position depends on the player's weapon (it is the longsword's 20-tick cut). Other weapons have other windups.

## 4. The live game, first impressions (software-rendered, 1.7 fps: looks only, not feel)

Viewed at 375 px wide in headless Chromium on 2026-10-04. These are one reviewer's impressions, not measurements.

- **Good:** the painted open-air backdrop (clouds, waterfalls, ruins, a giant statue) is excellent and sets the tone; fighter models and faces read well;
  warm consistent grade; blood spatter and sand decals are a nice touch.
- **Weaker:** the camera lets the hero's back cover most of the opponent mid-fight, which hurts a game about reading the opponent's attack; the sand floor is flat,
  soft and repetitive; sword blades read as thin low-contrast lines; the HUD is cryptic (thin bars, "Recruit I / Legionary", small hit text); seven buttons crowd the
  bottom-right and Kick is tiny; the loading card shows a stone-stands arena with a flat boxy crowd while the fight is in the open-air arena.
- **Ideas:** offset or raise the camera so the opponent is never occluded; floor detail and contact shadows; blade contrast or swing trails; a clear wind-up cue on the
  opponent; bigger hit numbers and a health-bar flash; make the loading card match the arena.

## 5. Running things in the cloud container

- **Headless sim:** `node` runs the game's `.ts` straight from a checkout; no install. ~70 minutes of game time per second.
- **Live site in a browser:** Chromium is at `/opt/pw-browsers/chromium`; the container proxy re-signs TLS, so add its CA to the NSS store first (command in the header of
  `live-play/*.mjs`). With no GPU it renders at ~1.7 fps (`?dpr=1` and `?gfx=phone` exist to lower the load; their effect on fps here was not measured). A frame-stepped run with Playwright's fake clock
  (`live-play/frame-stepped-fight-WIP.mjs`) keeps the fight timing exact but hit screenshot/tap timeouts: unfinished.
- **Test suite:** `npm ci` then `npm test` in the game repo: 1785 pass, 0 fail, 2 skipped on 4056467, about 2.5 minutes on 4 CPUs.
- **Debug hook:** load the game with `?debug` and `globalThis.__view` exposes the live view; `?tier=<Rank>` pins a look; `?gfx=phone|full` forces the graphics tier.

## 6. Open questions / next experiments

- Does L12 (and L14 for the Pitborn/Shieldmaiden) feel like a wall to a person? A short human playtest would settle it.
- Is the Goblin's and the Witch's flat difficulty intended? Nothing gates it today.
- Re-run the sweep with other player weapons (different cut windups move the cliff).
- Per-level sweeps for the Plague Doctor and Witch (only the L6/L18/L46 matrix covers them).
- Finish the frame-stepped live-play script, or run the Playwright scripts on a machine with a GPU for real frame rates.
