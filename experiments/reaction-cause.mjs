// Isolates WHY the ladder falls off a cliff (docs/ladder-reaction-cliff.md §1): swap only the warden's `reaction` integer between L11 and L12.
// Expected with lib/bots.mjs (trunk 4056467, 150 fights, Veteran, masher/blocker): L11 as shipped 58/98 %; L12 as shipped 5/32; L12 with L11's reaction 55/100;
// L11 with L12's 37 (masher 7). NOTE: the receipts table in docs/ladder-reaction-cliff.md §1 was measured with an EARLIER `blocker` (before it punished whiffs
// and recoveries), so its blocker column reads 43 and 49 where this bot reads 32 and 37. The masher column and the conclusion are identical either way.
import { OPPONENTS, profileAt } from '../lib/game.mjs';
import { BOTS, winRate } from '../lib/bots.mjs';
const N = 150, pct = (x) => `${Math.round(100 * x)}%`.padStart(5);
for (const id of ['veteran', 'executioner']) {
  const r11 = profileAt(OPPONENTS[id], 11).reaction, r12 = profileAt(OPPONENTS[id], 12).reaction;
  console.log(`\n${id} (reaction L11=${r11}, L12=${r12}) — masher / blocker win %`);
  for (const [label, L, reaction] of [['L11 as shipped', 11, r11], ['L12 as shipped', 12, r12], ['L12 with L11 reaction', 12, r11], ['L11 with L12 reaction', 11, r12], ['L14 with reaction 20', 14, 20]])
    console.log(label.padEnd(26), ['masher', 'blocker'].map((b) => pct(winRate(BOTS[b], id, L, N, { tweak: { profile: { reaction } } }))).join(' '));
}
