/*
  Powerworks levers. Every numeric constant the battle rules use lives here and
  nowhere else. Each one is a tuned setting pinned by
  docs/design/powerworks-v5-mechanics.md, not a ruling: move it, rerun the sim
  (devtools/powerworksSim.ts), record the numbers.
*/

/** Lever: HP = round(mean(vitality, endurance, resilience) * HP_SCALE). 1 keeps the four companions near their old card values (79, 29, 70, 59 against 64, 38, 56, 56). */
export const HP_SCALE = 1;
/** Lever: speed = round(mean(agility, reflex) * SPEED_SCALE). Enemies carry their old card speeds directly. */
export const SPEED_SCALE = 1;
/** Lever: harm = floor(intensity / HARM_DIVISOR * (HARM_BASE + attr / HARM_ATTR_DIVISOR) * matchup * ward). Attr 50 gives factor 1, which is how the enemy cards keep parity (intensity 70 is 7 damage). */
export const HARM_DIVISOR = 10;
export const HARM_BASE = 0.5;
export const HARM_ATTR_DIVISOR = 100;
/** Lever: restore heals floor(intensity / HARM_DIVISOR * (HARM_BASE + willpower / HARM_ATTR_DIVISOR)); the same curve as harm. */
export const RESTORE_DIVISOR = HARM_DIVISOR;
/** Lever: a displace effect that lands does impact harm at this share of its force intensity (contract decision 5). */
export const DISPLACE_HARM_FACTOR = 0.6;
/** Lever: ward halves incoming harm until the owner's next opportunity (unchanged from the frozen cards). */
export const WARD_FACTOR = 0.5;
/** Lever: cooldown rounds per recovery value (contract decision 1). */
export const COOLDOWN_ROUNDS = { repeatable: 0, brief: 1, prolonged: 2 } as const;
/** Lever: status application chance per likelihood (contract decision 6). Harm never rolls. */
export const LIKELIHOOD_PERCENT = { consistent: 100, likely: 75, occasional: 40 } as const;
/** Lever: immediate preparation adds this to speed for initiative only, so it beats a brief move at equal speed (contract decision 3). */
export const IMMEDIATE_INITIATIVE_BONUS = 1;
/** Lever: the signature is usable once per encounter on top of its cooldown (contract decision 2). Set false to let the cooldown alone govern it. */
export const SIGNATURE_ONCE_PER_ENCOUNTER = true;
/** Lever: a bound unit cannot use closing moves through its next opportunity (one opportunity, the accepted Snare rule). */
export const BIND_OPPORTUNITIES = 1;
/** Lever: after a prolonged release or a broken charge the unit passes this many opportunities before it may begin another charge. */
export const CHARGE_RECOVERY_OPPORTUNITIES = 1;
/** Lever: after a charge is broken by binding or displacement the unit passes this many opportunities before charging again. 0 means it may charge at its very next opportunity, so an interrupter on a one-round cooldown cannot lock a charger out alone (first sim: 1195 of 1200 blind pulls broke a charge and no release ever landed). */
export const INTERRUPTED_CHARGE_RECOVERY_OPPORTUNITIES = 0;
/** Lever: duration in victim opportunities for a lingering status by its declared duration (contract decision 12). Binding keeps BIND_OPPORTUNITIES; attention statuses use ATTENTION_OPPORTUNITIES. */
export const LINGERING_OPPORTUNITIES = { brief: 2, prolonged: 4 } as const;
/** Lever: binding duration in victim opportunities (the ruled Snare value, contract decision 12). */
export const BINDING_OPPORTUNITIES = {
  brief: BIND_OPPORTUNITIES,
  prolonged: BIND_OPPORTUNITIES * 2,
} as const;
/** Lever: attention statuses are short by construction: losing two opportunities in a row is not a game (contract decision 12). */
export const ATTENTION_OPPORTUNITIES = { brief: 1, prolonged: 2 } as const;
/** Lever: a sustained status lasts while its source unit stands; this is the fallback duration when its source is already gone. */
export const SUSTAINED_FALLBACK_OPPORTUNITIES = 1;
/** Lever: a degrading status ticks floor(intensity / HARM_DIVISOR * DEGRADE_FACTOR) times the element matchup at the start of the victim's opportunity, never reduced by ward (contract decision 13). */
export const DEGRADE_FACTOR = 0.5;
/** Lever: a mending status restores on the same curve at the start of the victim's opportunity (contract decision 17). */
export const MEND_FACTOR = 0.5;
/** Lever: statuses read as degrading, with the element their tick is classified as (contract decision 13). Poisoned harm is optional in the model; this game models it as chemical. */
export const DEGRADING_STATUS_ELEMENTS = {
  corroding: "chemical",
  poisoned: "chemical",
  burning: "fire",
  overheated: "fire",
  chilled: "ice",
} as const;
/** Lever: statuses read as guarding (contract decision 14). protected carries its own declared descriptor. */
export const GUARDING_STATUSES = ["shielded", "protected", "reinforced"] as const;
/** Lever: guarding factors. shielded halves incoming harm; reinforced takes a quarter off. Ward and shielded do not multiply: the better one wins (contract decision 14). */
export const SHIELDED_FACTOR = 0.5;
export const REINFORCED_FACTOR = 0.75;
/** Lever: statuses read as attention (contract decision 15). */
export const ATTENTION_STATUSES = ["entranced", "frightened"] as const;
/** Lever: frightened halves the victim's harm output through its next opportunity (contract decision 15). */
export const FRIGHTENED_OUTPUT_FACTOR = 0.5;
/** Lever: entranced cannot be reapplied to a unit that was entranced within its last this-many opportunities (contract decision 15). */
export const ENTRANCE_IMMUNITY_OPPORTUNITIES = 2;
/** Lever: the status that blocks attention statuses outright (contract decision 15). */
export const FOCUS_STATUS = "focused";
/** Lever: statuses read as concealment (contract decision 16). */
export const CONCEALMENT_STATUSES = ["concealed"] as const;
/** Lever: statuses read as mending (contract decision 17). */
export const MENDING_STATUSES = ["mending"] as const;
/** Lever: statuses read as binding (contract decision 4). */
export const BINDING_STATUSES = ["restrained", "paralyzed", "frozen", "pinned", "buried"] as const;
/** Lever: harm mechanisms scaled by strength; every other mechanism (elemental) scales by willpower. */
export const STRENGTH_MECHANISMS = ["impact", "cutting", "piercing", "compression"] as const;
/*
  Pass 3 levers: passives and triggers (contract decisions 21 to 26).
*/
/** Lever: the status an ongoing passive's effect becomes on its owner at encounter entry (contract decision 21). An ongoing effect type absent from this table is unsupported and named. */
export const ONGOING_PASSIVE_STATUS = {
  restore: "mending",
  protect: "shielded",
} as const;
/** Lever: the intensity a permanent condition carries when its ongoing passive effect declares none (a status effect may omit intensity in v5). */
export const ONGOING_PASSIVE_DEFAULT_INTENSITY = 50;
/** Lever: a reaction fires at most this many times per triggering move (contract decision 23). */
export const REACTIONS_PER_TRIGGERING_MOVE = 1;
/** Lever: how deep a reaction chain may go. 1 means a reaction's own harm or status never triggers another reaction (contract decision 23). */
export const REACTION_DEPTH = 1;
/** Lever: the ranges a `contact` trigger reads as a contact delivery: a move that reaches its target by touching it, whichever approach it took (contract decision 22). */
export const CONTACT_TRIGGER_RANGES = ["contact"] as const;

/** Lever: Desperate strike, the exhaustion-only fallback: flat damage, no matchup, recoil on the user. */
export const DESPERATE_STRIKE_DAMAGE = 3;
export const DESPERATE_STRIKE_RECOIL = 2;
/** Lever: practice XP per cleared encounter and for the final chamber; the pre-boss recovery station heal. */
export const ENCOUNTER_XP = 10;
export const FINAL_ENCOUNTER_XP = 30;
export const RECOVERY_STATION_HP = 10;
/** Lever: the companions are generated once from these fixed seeds of the frozen release so a run is replayable. */
export const COMPANION_SEEDS = {
  graviclaw: "powerworks-graviclaw-1",
  avilily: "powerworks-avilily-6",
  crystorn: "powerworks-crystorn-1",
  hippochamp: "powerworks-hippochamp-1",
} as const;
export const COMPANION_GENERATED_AT = "2026-09-21T00:00:00.000Z";
/** Save format. Version 1 saves (frozen cards, use counters) cannot be replayed under these rules and are rejected. */
export const SAVE_VERSION = 2;
export const SAVE_HISTORY_LIMIT = 2000;
