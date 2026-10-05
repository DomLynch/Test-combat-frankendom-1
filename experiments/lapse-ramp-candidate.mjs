// Candidate fix for the cliff: when the warden first becomes fast enough to answer a 20-tick cut (reaction < 20), start him mostly lapsing
// (ignoring the swing) and ease `lapse` down to his own value by L18. Compares the shipped curve with two ramp strengths, without touching the game.
// The in-game version of this idea is patches/lapse-ramp.diff (verified, but it trips two repo checks; see the doc).
import { OPPONENTS, profileAt } from '../lib/game.mjs';
import { BOTS, winRate } from '../lib/bots.mjs';
const variants = {
  shipped: (_L, base) => base,
  ramp95: (L, base) => (L >= 12 && L < 18 ? Math.max(base, 0.95 - (0.95 - base) * ((L - 11) / 7)) : base),
  ramp85: (L, base) => (L >= 12 && L < 18 ? Math.max(base, 0.85 - (0.85 - base) * ((L - 11) / 7)) : base),
};
const N = 80, levels = [8, 10, 11, 12, 13, 14, 15, 16, 17, 18];   // the cliff is at L12 for the Veteran and Executioner; the Pitborn's is at L14 (the ramp start is level-specific in the patch)
for (const id of ['veteran', 'executioner']) for (const bot of ['masher', 'blocker', 'skilled']) {
  console.log(`\n${id} / ${bot}: win% by level`); console.log('level'.padEnd(8) + Object.keys(variants).map((v) => v.padStart(9)).join(''));
  for (const L of levels) {
    const base = profileAt(OPPONENTS[id], L).lapse;
    console.log(String(L).padEnd(8) + Object.values(variants).map((v) => `${Math.round(100 * winRate(BOTS[bot], id, L, N, { tweak: { profile: { lapse: v(L, base) } } }))}%`.padStart(9)).join(''));
  }
}
