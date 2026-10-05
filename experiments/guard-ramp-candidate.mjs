// NEGATIVE RESULT, kept so nobody re-tries it: ramping the AI's `guard` share across L6-L18 does NOT remove the L11->L12 cliff.
// (The cliff is the reaction integer crossing the player's 20-tick cut, not how often the warden guards; see reaction-cause.mjs.)
import { OPPONENTS, profileAt } from '../lib/game.mjs';
import { BOTS, winRate } from '../lib/bots.mjs';
const variants = {
  shipped: () => undefined,
  linear: (L) => (L > 6 && L < 18 ? 0.3 + 0.7 * ((L - 6) / 12) : undefined),
  ease: (L) => (L > 6 && L < 18 ? 0.2 + 0.8 * ((L - 6) / 12) ** 2 : undefined),
};
const N = 60, levels = [6, 8, 10, 11, 12, 13, 14, 16, 18];
for (const id of ['veteran', 'executioner']) for (const bot of ['masher', 'blocker']) {
  console.log(`\n${id} / ${bot}: win% by level`); console.log('level'.padEnd(8) + Object.keys(variants).map((v) => v.padStart(9)).join(''));
  for (const L of levels) console.log(String(L).padEnd(8) + Object.values(variants).map((v) => { const g = v(L); return `${Math.round(100 * winRate(BOTS[bot], id, L, N, { tweak: g === undefined ? {} : { profile: { guard: g } } }))}%`.padStart(9); }).join(''));
}
