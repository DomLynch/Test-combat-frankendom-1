// Scripted players for the headless Frankendom simulation. They read the sim state directly (exact ticks, exact sides), so they are tighter
// than a thumb: a win rate says what a strategy CAN do, never how a fight feels.
import { OPPONENTS, RULES, canStrike, initialPractice, stepPractice, opponentAt, profileAt, mirror, movesOf, timing, legal, recordSpecials } from './game.mjs';

export const mk = (z = 0, action = null, guard = false) => ({ move: { x: 0, z, yaw: 0, run: false }, action, guard, lock: true });
export const dist = (s) => Math.hypot(s.fighter.x - s.enemy.x, s.fighter.z - s.enemy.z);
const me = (s) => s.duel.fighters[0];
const reachOf = (s) => movesOf(me(s)).light_right.reach;   // the player's own weapon's light-cut reach (the longsword's is 1.65)
const foe = (s) => s.duel.fighters[1];
const foeMove = (s) => (foe(s).move ? movesOf(foe(s))[foe(s).move] : null);
const untilContact = (s) => timing(foe(s)).windup - foe(s).age;   // ticks until the opponent's blow lands (negative once it is active)
const incoming = (s) => s.threat && dist(s) < 3 && foeMove(s) !== null;

const start = (s) => (s.phase === 'sheathed' ? mk(0, 'light') : null);
const minReachOf = (s) => movesOf(me(s)).light_right.minReach ?? 0;   // a blow started inside this gap meets nothing (the scythe's dead band is 1.4 m); 0 for most weapons
// z = -1 walks toward the opponent, z = +1 away. Too far: close in. Inside the dead band: back off, so the swing starts where it can land.
const approach = (s) => (dist(s) > reachOf(s) - 0.15 ? mk(-1) : dist(s) < minReachOf(s) + 0.1 ? mk(1) : null);
const cut = (s, reserve) => approach(s) ?? (canStrike(s) && s.stamina >= reserve ? mk(0, 'light') : mk());
const free = (s) => { const f = foe(s); return dist(s) < reachOf(s) && (f.phase === 'hurt' || f.exhausted || (f.phase === 'attack' && f.landed) || (f.phase === 'attack' && f.age > timing(f).windup + timing(f).active + 4)); };
const punish = (s) => (me(s).punish > 0 || me(s).counterWindow > 0) && canStrike(s);
// A free hit is only worth swinging at when it can land: inside a weapon's dead band (the scythe's light cut meets nothing under 1.4 m) back off first.
const tooClose = (s) => dist(s) < minReachOf(s) + 0.1;
const offense = (s, reserve) => (punish(s) ? mk(0, s.stamina >= 35 ? 'heavy' : 'light') : free(s) && canStrike(s) ? (tooClose(s) ? mk(1) : mk(0, 'light')) : cut(s, reserve));
// The directional guard covers ONE side: the mirror of the blow's. A guard with no side chosen is the straight guard and covers only thrusts.
const covered = (s) => ({ ...mk(0, null, true), guardDirection: mirror(foeMove(s).direction) });
const parry = (s, lead) => {
  const m = foeMove(s);
  if (!m || !incoming(s) || !m.parryable || me(s).parryCooldown !== 0 || !['ready', 'guard'].includes(me(s).phase)) return null;
  const t = untilContact(s);
  return t <= lead && t >= 1 ? { ...mk(0, 'parry', true), guardDirection: mirror(m.direction) } : null;   // the parry window is RULES.parry = 10 ticks from the press
};
const roll = (s, lead) => (!foeMove(s) || !incoming(s) || s.stamina < RULES.rollCost ? null : untilContact(s) <= lead && untilContact(s) >= RULES.safeStart ? mk(0, 'dodge') : null);   // safe ticks are RULES.safeStart..safeEnd (4..20) of the roll

export const BOTS = {
  idle: (s) => start(s) ?? mk(),                                   // does nothing after the draw: what the opponent does to a bystander
  masher: (s) => start(s) ?? cut(s, 25),                           // walks in and cuts whenever it can afford to; never defends
  blocker: (s) => start(s) ?? (incoming(s) && foeMove(s).parryable !== false ? covered(s) : null) ?? offense(s, 50),   // covering guard side, punishes; never parries or rolls
  skilled: (s) => start(s) ?? parry(s, 5) ?? (foeMove(s) && !foeMove(s).parryable ? roll(s, 14) : null) ?? (incoming(s) ? covered(s) : null) ?? offense(s, 40),   // parry what is parryable, roll the rest, guard the side, punish
  rollonly: (s) => start(s) ?? roll(s, 14) ?? offense(s, 40),      // rolls every blow at the safe ticks, punishes the recovery
};

// Special Moves (live from ladder level 16, rank 4; src/duel.ts, RULES.special): both fighters carry one. A cast stands still for a 120-tick (2 s) windup and lands 20 % of the
// target's max health (25 % from L36). The reach (3 m) is checked only when the cast STARTS: once released it is unblockable and undodgeable, so a bot cannot run, roll or guard its way out of
// one (found the hard way: an early `aware` that ran away still got hit 11 of 12 times). First cast at 20 s, then every 20 s. The only answers are to win first or to cast your own.
// `aware` wraps a bot so it casts its own special whenever it is ready, in reach and not mid-swing; `naive` leaves the bot as it was (it takes the opponent's specials and never casts).
export const aware = (bot) => (s) => {
  if (s.phase === 'sheathed') return mk(0, 'light');
  if (!me(s).special && me(s).specialShare !== undefined && legal(me(s), 'skill') && dist(s) <= RULES.special.reach - 0.3 && !s.threat) return mk(0, 'skill');
  return bot(s);
};

// One fight, built the way the game builds it (opponentAt body + profileAt AI for the ladder level). `tweak` may patch the profile or body
// ({ profile: {...}, body: {...} }) for experiments; `specials` is 'off' (default: no Special Moves, as every earlier table), 'naive' or 'aware' (see `aware`; the live game has them from L16); `weapon` is the PLAYER's weapon (default longsword, the one the ladder is tuned on); seeds are fixed so a re-run on the same tree prints the same numbers.
export function fight(bot, id, level, seed, { cap = 7200, tweak = {}, weapon = 'longsword', specials = 'off' } = {}) {
  const profile = { ...profileAt(OPPONENTS[id], level), ...(tweak.profile ?? {}) };
  let s = initialPractice(seed, { ...opponentAt(OPPONENTS[id], level), ...(tweak.body ?? {}) }, weapon, null, specials === 'off' ? undefined : recordSpecials({ specials: true, level, opponent: id }));
  if (specials === 'aware') bot = aware(bot);   // 'naive' = the fight has specials and the bot ignores them (it still gets cast on)
  let t = 0;
  while (t < cap && s.playerHealth > 0 && s.health > 0) { s = stepPractice(s, bot(s), profile); t++; }
  return { won: s.health <= 0 && s.playerHealth > 0, lost: s.playerHealth <= 0 && s.health > 0, ticks: t, hp: s.playerHealth };
}
export const winRate = (bot, id, level, n, opts) => { let w = 0; for (let k = 1; k <= n; k++) if (fight(bot, id, level, k * 104729, opts).won) w++; return w / n; };
