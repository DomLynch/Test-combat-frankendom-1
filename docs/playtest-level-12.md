# Human playtest: does level 12 feel like a wall?

The bots say the Veteran goes from beatable to very hard between level 11 and level 12 (docs/ladder-reaction-cliff.md). Bots read the sim directly, so only a
person can say whether that *feels* like a wall. This is a 15-minute protocol for that. It needs a phone or a desktop browser; nothing to install.

## 1. Jump straight to a level (verified live on frankendom.com, 2026-10-05)

The game reads `sessionStorage['frankendom.dev-kit']` at boot (`src/sparring.ts devKit`, `src/main.ts kit.level`). Set a level, reload, and the next fight starts there.

**Desktop** (browser console on frankendom.com):
```js
sessionStorage.setItem('frankendom.dev-kit', JSON.stringify({ level: 12 })); location.reload();
```
To go back to your real rank: `sessionStorage.removeItem('frankendom.dev-kit'); location.reload();` (it is per-tab, so closing the tab also clears it).

**Phone** (no console): make a bookmark whose address is the line below, open frankendom.com, then tap the bookmark. (Typing `javascript:` into the address bar is stripped by
most mobile browsers; a saved bookmark is not.) Make one per level you want, changing the number.
```
javascript:(()=>{sessionStorage.setItem('frankendom.dev-kit',JSON.stringify({level:12}));location.reload()})()
```

You can also set the weapon: `{ level: 12, weapon: "longsword" }` (the cliff position depends on the weapon, see `results/weapons-veteran.txt`).

What you should see: the opponent card changes with the level. Checked live: level 1 is "Crixus, the Centurion, Recruit"; **level 12 is "Beowulf, the Centurion, Gladiator"**; level 24 is "Miyamoto Musashi".
The game flags a fight at a level other than your real rank as *tested*, and its code comment says such a fight "never counts" toward progress, so this is safe to do on your real account.

Which opponent you meet is the current ladder rung (the Veteran/Centurion first), not a choice; this protocol is therefore about the **Veteran at L10 to L13**.

## 2. What to play

Fight the Veteran **5 times each at L10, L11, L12, L13** with your normal weapon, in that order, and fill in the table. Do not look at the bot numbers first.

| Level | Fights | You won | Notes (what killed you / what worked) |
|---|---|---|---|
| 10 | 5 | | |
| 11 | 5 | | |
| 12 | 5 | | |
| 13 | 5 | | |

## 3. Questions to answer after L12

1. Did the fight suddenly change character between L11 and L12 (he blocks or parries almost everything), or did it just feel a bit harder?
2. Could you *read* his attacks in time? Did the wind-ups give you a fair window?
3. Did your light cuts get answered (blocked, parried, rolled) far more often than at L11?
4. What worked at L11 that stopped working at L12? (Cut spam? A parry timing? Rolling?)
5. Rate L12 against L11: easier / same / harder / a different game. Is that a wall, a ramp, or about right?

## 4. What the bots predicted (60 fights per cell, trunk 4056467), for comparing afterwards

| Veteran, longsword | L10 | L11 | L12 | L13 |
|---|---|---|---|---|
| masher (cut spam, no defence) | 63 % | 62 % | 5 % | 0 % |
| blocker (right guard side) | 100 % | 97 % | 35 % | 28 % |
| skilled (parry/roll/guard, punish) | 95 % | 92 % | 8 % | 12 % |

If a human wins far more often than the skilled bot at L12, the cliff is a bot artefact and the fix is not urgent. If a human also falls off a cliff, the fix in
`patches/lapse-ramp.diff` is worth the RECORD_VERSION cost; see `docs/incorporate-into-main.md`. Write the result in `results/playtest-level-12.md`.
