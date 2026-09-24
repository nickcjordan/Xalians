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
/** Lever: statuses read as guarding (contract decision 14). protected carries its own declared descriptor. focused joins in pass 4 (contract decision 32): it guards attention and does nothing else. */
export const GUARDING_STATUSES = ["shielded", "protected", "reinforced", "focused"] as const;
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
/*
  Pass 4 levers: the derived roster's effects (contract decisions 27 to 35).
*/
/** Lever: statuses read as shock (contract decision 27): the victim loses its next opportunity and a charge in progress breaks. Focus does not block it. */
export const SHOCK_STATUSES = ["stunned"] as const;
/** Lever: shock durations, like entranced (contract decision 27). Every derived stun is brief, so in practice one opportunity. */
export const SHOCK_OPPORTUNITIES = ATTENTION_OPPORTUNITIES;
/** Lever: statuses read as tempo (contract decisions 28 and 29). */
export const TEMPO_STATUSES = ["slowed", "sedated"] as const;
/** Lever: a slowed unit's speed is multiplied by this for initiative through its duration (contract decision 28). */
export const SLOWED_SPEED_FACTOR = 0.5;
/** Lever: statuses read as senses (contract decisions 30 and 31). */
export const SENSES_STATUSES = ["blinded", "disoriented"] as const;
/** Lever: a blinded unit's non-contact harm is multiplied by this (contract decision 30). Contact harm is unaffected. */
export const BLINDED_RANGED_FACTOR = 0.5;
/** Lever: every recipient of an area effect takes its harm at this share, the selected target included (contract decision 33). */
export const AREA_HARM_FACTOR = 0.6;
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
/**
  Lever: the stalemate rule (contract decision 52). When this many consecutive rounds of one
  encounter resolve in which no unit on either side loses HP and none falls, the squad is
  forced out: the run ends as a retreat, earned practice XP kept. A long fight that keeps
  making progress is never cut off. It replaced a 20-round cap, which the pass 6 sim showed
  turned 26 random-draft and 9 greedy-draft wins into losses while no run looped.
*/
export const ENCOUNTER_STALL_ROUNDS = 6;
/** Lever: practice XP per cleared encounter and for the final chamber; the pre-boss recovery station heal. */
export const ENCOUNTER_XP = 10;
export const FINAL_ENCOUNTER_XP = 30;
export const RECOVERY_STATION_HP = 10;
/**
  Lever: the starter squad (contract decision 47) is generated once from these fixed seeds of the frozen release so a run is
  replayable. Re-picked 2026-09-23 on generation-0.7.0-3 under contract decision 37: every companion
  with a harm act keeps an every-round harm after its signature, and the ordinary charged act
  (decision 36) is not a burst that reaches squadmates. Graviclaw 4 and Avilily 6 had no every-round
  harm, Hippochamp 1 neither; Graviclaw can never carry both (three of its four actions are
  guaranteed), so the charge moved to Hippochamp 25 (Crushing Kick). Crystorn 1 still passes.
*/
export const COMPANION_SEEDS = {
  graviclaw: "powerworks-graviclaw-17",
  avilily: "powerworks-avilily-1",
  crystorn: "powerworks-crystorn-1",
  hippochamp: "powerworks-hippochamp-25",
} as const;
export const COMPANION_GENERATED_AT = "2026-09-21T00:00:00.000Z";
/** Save format. Version 1 saves (frozen cards, use counters) cannot be replayed under these rules and are rejected.
 * Version 3 (2026-09-22): companions come from generation-0.7.0-1 and a new Graviclaw seed, so a version 2
 * command history names moves the squad no longer has and is rejected rather than replayed wrong.
 * Version 4 (2026-09-23): companions come from generation-0.7.0-2 (same seeds, new derived kits) and pass 4
 * resolves area, shock, tempo and senses effects, so a version 3 history no longer replays the same run.
 * The decision 37 seeds landed before any version 4 save shipped, so the version did not move again.
 * Version 5 (2026-09-23, pass 5): orders may name a squadmate (contract decisions 39 to 41), so a history
 * can carry side-crossing targets that a version 4 replay would reject or resolve as a foe order.
 * Version 6 (2026-09-23, pass 6): a run starts from the draft (contract decision 48), so the first command
 * of every history is `{kind: "draft", squad}`; a version 5 history has none and is rejected.
 * Version 7 (2026-09-24, contract decision 53): the offer retries each species over its own seeds, so the
 * same run seed deals a different offer and a version 6 history's offer indexes name other creatures; it is rejected. */
export const SAVE_VERSION = 7;
/*
  Pass 6 levers: the squad draft (contract decisions 45 to 48).
*/
/** Lever: how many generated creatures the draft offers (contract decision 45). */
export const DRAFT_OFFER_SIZE = 8;
/** Lever: how many of the offer the player picks, and so the squad size (contract decision 45). */
export const SQUAD_SIZE = 4;
/** Lever: the seed prefix of a drafted creature; species `s` of run seed `n` is tried from `${DRAFT_SEED_PREFIX}-${n}-${s}-${j}` (contract decisions 45 and 53). */
export const DRAFT_SEED_PREFIX = "powerworks-draft";
/**
  Lever: how many seeds the offer tries for one species on one pass over the roster before it
  skips that species (contract decision 53). The first creature that passes decision 37 is the
  species' candidate. Pass `p` over the roster tries `j` from `p * DRAFT_SEEDS_PER_SPECIES` up.
*/
export const DRAFT_SEEDS_PER_SPECIES = 8;
/** Lever: how many passes over the roster the constructive offer may draw before it gives up (contract decision 46). One pass is 32 candidates. */
export const DRAFT_MAX_ROSTER_PASSES = 4;
export const SAVE_HISTORY_LIMIT = 2000;
