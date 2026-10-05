// Isolates the L5 -> L6 cut-spam cliff on the Plague Doctor (and Nightborn): at L6, put each AI setting back to its L5 value, one at a time, and see which one restores the
// `masher` win rate. A setting that restores it is the cause. (Plague Doctor / Nightborn poise is 0 at every level, so it is not poise.)
// Usage: GAME_DIR=<game checkout> node experiments/novice-cliff-cause.mjs [opponent]
import { OPPONENTS, profileAt } from '../lib/game.mjs';
import { BOTS, winRate } from '../lib/bots.mjs';
const id = process.argv[2] ?? 'plaguedoctor', N = 80;
const p5 = profileAt(OPPONENTS[id], 5), p6 = profileAt(OPPONENTS[id], 6);
const pct = (x) => `${Math.round(100 * x)}%`.padStart(5);
console.log(`${id}: masher win % — L5 as shipped ${pct(winRate(BOTS.masher, id, 5, N))}, L6 as shipped ${pct(winRate(BOTS.masher, id, 6, N))}`);
console.log('L6 with ONE setting taken from L5 (changed settings only):');
const rows = [];
for (const k of new Set([...Object.keys(p5), ...Object.keys(p6)])) {
  if (p5[k] === p6[k]) continue;
  rows.push([k, p5[k], p6[k], winRate(BOTS.masher, id, 6, N, { tweak: { profile: { [k]: p5[k] } } })]);
}
rows.sort((a, b) => b[3] - a[3]);
for (const [k, a, b, w] of rows) console.log(`  ${k.padEnd(12)} L5 ${String(a).padStart(6)} -> L6 ${String(b).padStart(6)}   masher with L5's ${k}: ${pct(w)}`);
