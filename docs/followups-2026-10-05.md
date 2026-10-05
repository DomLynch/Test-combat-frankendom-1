# Follow-ups (2026-10-05): human playtest, other weapons, Plague Doctor / Witch, real GPU

Trunk `4056467`, headless sim unless stated. Tables: `results/weapons-veteran.txt`, `results/plaguedoctor-witch-curve.txt`, `results/novice-ramp-L1-L8.txt`.

## 1. Human playtest of level 12 — ready, needs a person
I cannot play it as a human. What is done: `docs/playtest-level-12.md` has the protocol (Veteran, 5 fights each at L10 to L13, a scorecard, five questions, and the bots' predictions to compare with) and a
way to jump to any level. The jump was **verified live**: setting `sessionStorage['frankendom.dev-kit'] = {"level":N}` and reloading changes the opponent card (L1 "Crixus, Recruit"; L12 "Beowulf, Gladiator";
L24 "Miyamoto Musashi"). The game flags such a fight as "tested" and its code comment says it never counts toward progress. Script: `live-play/verify-devkit-level.mjs`.

## 2. Other player weapons — the cliff moves with the weapon, exactly as predicted
The warden notices a swing `reaction` ticks after it starts, so the cliff sits where his reaction first drops below the player's light-cut windup. Each weapon has its own windup, so each has its own cliff.
Veteran, `blocker` bot, 40 fights per cell (win % one level before -> at the cliff level):

| Player weapon | Light-cut windup | Predicted cliff (first level with reaction < windup) | Observed |
|---|---|---|---|
| longsword | 20 | L12 (reaction 19) | 100 % -> 43 % |
| gladius | 20 | L12 | 100 % -> 28 % |
| estoc | 20 | L12 | 55 % -> 5 % (weak baseline, about 50 % at every earlier level) |
| cleaver | 22 | L10 (reaction 21) | 98 % -> 33 % |
| maul | 22 | L10 | 100 % -> 35 % |
| trident | 22 | L10 | 88 % -> 30 % |
| warhammer | 22 | L10 | 57 % -> 8 % |
| knife | 14 | L22 (reaction 13; it is still 14 at L21) | 93 % (L20) -> 50 % (L22) |
| scythe | 24 | L7 | **0 % at every level, including L6**: the bots cannot beat it at all, so this row says nothing about the cliff. Probably my bots do not handle the scythe's reach band (the game's own comment says it has a dead band inside 1.4 m); untested. |

**Consequence for the proposed fix:** `patches/lapse-ramp.diff` uses the longsword's 20-tick windup, so it smooths the cliff for the longsword, gladius and estoc only. It does nothing for the cleaver, maul,
trident and warhammer (cliff at L10) or the knife (L22). `profileAt` does not know the player's weapon today; a complete fix has to be weapon-aware (a fight record already carries the weapon).
The cut-spam `masher` falls at the same levels wherever it wins at all (it cannot win with the knife, gladius or scythe).

## 3. Plague Doctor and Witch (60 fights per cell)
- **Plague Doctor: no L12-style cliff, but hard from L6 and a cliff at L5 -> L6.** `blocker`: 100 % through L5, 73 % at L6, 52 % at L10, 15 % at L18, 7 % at L46. `skilled`: 42 % at L6, 20 % at L10, 3 % at L18, 2 % at L46.
  `masher`: 47 % at L5, **2 % at L6**, 0 % after. Against the Veteran the same bots win about 100 % at L6, so the Plague Doctor is much harder much earlier.
- **A second cliff, in the novice -> easy ramp (found because of the above).** The Plague Doctor's and Nightborn's reaction falls by 6 ticks a level through L1-L6 (46, 40, 34, 28, 22, 16), so it crosses 20 between **L5 and L6**.
  `masher` (Plague Doctor 47 % -> 2 %, Nightborn 52 % -> 2 %) and `blocker` (100 % -> 73 % / 72 %) both fall in that one step. Level 6 is also the first level of the second rank (five levels a rank), so a player meets this
  the moment they rank up. The proposed lapse ramp does not cover it (it only runs L7-L17); the Veteran has no such step (reaction 30 -> 24, always >= 20) and the Goblin, whose guard share is 0, declines gradually.
- **Witch: easy at every level.** `blocker`: 100 % to L6, 95 % at L8, 82 % at L18, 67 % at L46. `skilled`: 88 % at L6, 57 % at L18, 37 % at L46.

## 4. Real frame rates on a GPU — script ready, needs your machine
No GPU is available in the cloud container (Chromium falls back to SwiftShader, about 2 fps; measured again this session). `live-play/measure-fps.mjs` measures fps with `requestAnimationFrame`, prints the WebGL renderer
so a GPU run can be told from a software one, and reports average fps, p5/p1 fps and the share of frames over 33 ms for the load, idle and fighting phases. On a Mac:
```
npm i playwright && npx playwright install chromium
node live-play/measure-fps.mjs --gpu --headed --level=12 --seconds=30
```
Run it also at `--level=1` and with `--dpr=1` / `--dpr=2` to see what the pixel-ratio cap costs. Tested here only far enough to confirm it runs and reports "SwiftShader"; paste the JSON line it prints into `results/fps-<machine>.json`.
That run is the only way to learn the real frame rate; nothing in this repo measures it.

## Caveats
Same as the main doc: the bots read sim state directly (what a strategy can do, not how it feels), 40-60 fights per cell is about +-6-8 points, and the weapon table uses the Veteran only. The Plague Doctor, Nightborn and Witch were
swept with the longsword.
