#!/usr/bin/env node
// Ladder sweep: scripted players against the live opponents at any ladder level, on the headless Frankendom simulation (no browser, no GPU,
// ~250k ticks/s). Answers "how does difficulty move up the 46-level ladder, and is any opponent a wall or a pushover?" in minutes.
//
//   GAME_DIR=../RPG-game node scripts/ladder-sweep.mjs matrix [--n=40] [--levels=1,18] [--bots=masher,blocker,skilled]
//   GAME_DIR=../RPG-game node scripts/ladder-sweep.mjs curve  [--n=60] [--opponents=veteran,pitborn] [--bots=...] [--levels=...] [--weapon=longsword]
//   GAME_DIR=../RPG-game node scripts/ladder-sweep.mjs weapons [--n=40] [--opponents=veteran] [--bots=masher,blocker] [--levels=6,10,...]   every player weapon, with its light-cut windup
//
// Recipes marked `hold: true` in the game's roster.ts are not in the game and are skipped unless --include-held is passed.
// Same fights the game builds (opponentAt + profileAt), fixed seeds: diff two trees' output to see what a tuning change did to the curve.
import { OPPONENTS, PLAYER_WEAPONS, weaponOf, profileAt, isHeld } from '../lib/game.mjs';
import { BOTS, fight, winRate } from '../lib/bots.mjs';

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
const list = (name, fallback) => arg(name, fallback).split(',').filter(Boolean);
const mode = process.argv[2];
const n = Number(arg('n', mode === 'curve' ? 60 : 40));
const bots = list('bots', mode === 'curve' ? 'masher,blocker,skilled' : Object.keys(BOTS).join(','));
const roster = Object.keys(OPPONENTS).filter((id) => process.argv.includes('--include-held') || !isHeld(id));
for (const b of bots) if (!BOTS[b]) { console.error(`unknown bot "${b}" (have ${Object.keys(BOTS).join(', ')})`); process.exit(2); }

if (mode === 'matrix') {
  for (const level of list('levels', '1,18').map(Number)) {
    console.log(`\n=== ladder level ${level} (1 Recruit, 6 easy, 18 normal, 46 Origin) · ${n} fights per cell · win% / mean seconds ===`);
    console.log('opponent'.padEnd(14) + bots.map((b) => b.padStart(14)).join(''));
    for (const id of roster) {
      let row = id.padEnd(14);
      for (const b of bots) { let w = 0, ticks = 0; for (let k = 1; k <= n; k++) { const r = fight(BOTS[b], id, level, k * 7919); if (r.won) w++; ticks += r.ticks; } row += `${Math.round((100 * w) / n)}% ${(ticks / n / 60).toFixed(0)}s`.padStart(14); }
      console.log(row);
    }
  }
} else if (mode === 'curve') {
  const weapon = arg('weapon', 'longsword');
  const levels = list('levels', '1,6,10,11,12,13,14,16,18,24,32,46').map(Number);
  for (const id of list('opponents', 'veteran,pitborn,executioner,goblin')) {
    if (!OPPONENTS[id]) { console.error(`unknown opponent "${id}" (have ${Object.keys(OPPONENTS).join(', ')})`); process.exit(2); }
    console.log(`\n${id}: win% by ladder level (${n} fights per cell)`);
    console.log('level'.padEnd(8) + bots.map((b) => b.padStart(10)).join(''));
    for (const level of levels) console.log(String(level).padEnd(8) + bots.map((b) => `${Math.round(100 * winRate(BOTS[b], id, level, n, { weapon }))}%`.padStart(10)).join(''));
  }
} else if (mode === 'weapons') {
  const levels = list('levels', '6,8,10,11,12,13,14,16,18').map(Number);
  for (const id of list('opponents', 'veteran')) for (const b of bots) {
    console.log(`\n${id} / ${b}: win% by ladder level for each player weapon (${n} fights per cell); reaction column = the warden's reaction at that level`);
    console.log('weapon (light windup)'.padEnd(24) + levels.map((l) => `L${l}`.padStart(6)).join(''));
    console.log('warden reaction'.padEnd(24) + levels.map((l) => String(profileAt(OPPONENTS[id], l).reaction).padStart(6)).join(''));
    for (const weapon of PLAYER_WEAPONS) console.log(`${weapon} (${weaponOf(weapon).paths.light_right.windup})`.padEnd(24) + levels.map((l) => `${Math.round(100 * winRate(BOTS[b], id, l, n, { weapon }))}%`.padStart(6)).join(''));
  }
} else {
  console.error('usage: node scripts/ladder-sweep.mjs matrix|curve|weapons [--n=N] [--levels=1,18,46] [--opponents=veteran,...] [--bots=masher,blocker,skilled] [--include-held]');
  process.exit(2);
}
