/*
  Pillar levers (docs/design/powerworks-pillars.md). Every number the pillar rules use lives
  here: move it, rerun devtools/pillarsSim.ts, record the numbers in the doc.
*/

/**
  Where an attack's element comes from (research report, Path 1). "creature": every damaging
  move takes its creature's element, so a creature's moves rise and fall together against an
  enemy. "move": the move's own element, physical moves neutral (the pre-pillar reading, kept
  so the sim can compare).
*/
export type ElementSource = "creature" | "move";
export const ELEMENT_SOURCE: ElementSource = "creature";
/**
  Path 2: every attack in a creature's kit deals the creature's one power number (the mean of
  its attacks' raw power), and moves differ only in shape, rider and timing. Off by default;
  the sim measures both.
*/
export const UNIFORM_POWER = false;
/** An attack's power is floor(intensity / POWER_DIVISOR), summed over its damaging effects. */
export const POWER_DIVISOR = 10;
/** A pull or push deals its impact at this share of its intensity. */
export const DISPLACE_POWER_FACTOR = 0.6;
/** An area attack hits every standing enemy with its power times this. */
export const AREA_FACTOR = 0.6;
/** A support's number is floor(intensity / SUPPORT_DIVISOR); a status with no intensity reads DEFAULT_INTENSITY. */
export const SUPPORT_DIVISOR = 10;
export const DEFAULT_INTENSITY = 50;
/** Binding is Hinder's strong form: its number is multiplied by this. */
export const BINDING_HINDER_FACTOR = 1.4;
/** A support aimed at everyone gives this share of its number to each. */
export const ALL_SUPPORT_FACTOR = 0.6;
/** Rest rounds after use, by the record's recovery. A prolonged preparation acts at once and rests at least PROLONGED_REST. */
export const REST_ROUNDS = { repeatable: 0, brief: 1, prolonged: 2 } as const;
export const PROLONGED_REST = 2;
/** The signature is usable once per encounter. */
export const SIGNATURE_ONCE = true;
/** Every enemy's HP is its row HP times this, rounded (the facility's one difficulty lever). */
export const ENEMY_HP_FACTOR = 0.62;
/** An enemy picks whom to hit weighted by max HP raised to this power (0: uniform). */
export const TARGET_SIZE_WEIGHT = 1;
/** An enemy values a shield in full on an ally below this share of its max HP, and at 0.4 otherwise. */
export const ENEMY_SHIELD_BELOW = 0.6;
/** An enemy's move values are scaled by a random factor in [1 - NOISE/2, 1 + NOISE/2] from the run rng. */
export const ENEMY_NOISE = 0.3;
/** Run structure, unchanged from the prototype. */
export const ENCOUNTER_XP = 10;
export const FINAL_ENCOUNTER_XP = 30;
export const RECOVERY_STATION_HP = 10;
export const STALL_ROUNDS = 6;
export const PILLAR_SAVE_VERSION = 1;
