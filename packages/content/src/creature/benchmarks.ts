import { ATTRIBUTE_KEYS, CAPABILITY_KEYS, GRADED_SENSE_KEYS } from '../registriesConst.ts';

/** Stable authoring references, never percentile buckets or game conversion formulas. */
export const RATING_REFERENCE = Object.freeze({
  0: 'Absent', 25: 'Limited', 50: 'Standard reference performance',
  75: 'Strong', 100: 'Exceptional',
} as const);
export const DEFAULT_STATUS_INTENSITY = 50;

type RatingKey = typeof ATTRIBUTE_KEYS[number] | typeof CAPABILITY_KEYS[number] | typeof GRADED_SENSE_KEYS[number];
interface Benchmark {
  measures: string;
  zero: string;
  standard: string;
  exceptional: string;
  boundary: string;
}
/** Descriptions are proposed calibration anchors for author review, not new lore facts. */
export const RATING_BENCHMARKS = {
  strength: {
    measures: 'Physical force the body can exert.', zero: 'Cannot exert meaningful physical force.',
    standard: 'Moves substantial everyday loads and overcomes ordinary physical resistance.',
    exceptional: 'Exerts the force associated with heavy industrial lifting or crushing work.',
    boundary: 'Absolute output, not strength relative to body weight; not stamina or an automatic move multiplier.',
  },
  vitality: {
    measures: 'Bodily reserve for remaining functional through accumulated injury.', zero: 'No reserve against bodily injury.',
    standard: 'Remains functional through a moderate accumulation of noncritical injury.',
    exceptional: 'Remains functional despite extensive bodily injury that would exhaust ordinary reserves.',
    boundary: 'Not resistance to the initial injury, regeneration, immortality or a prescribed health total.',
  },
  endurance: {
    measures: 'Ability to sustain exertion before fatigue limits performance.', zero: 'Cannot sustain exertion.',
    standard: 'Sustains ordinary working effort with periodic recovery.',
    exceptional: 'Sustains demanding effort through an extended working period with little decline.',
    boundary: 'Not peak force, brief speed, healing rate or ability duration.',
  },
  agility: {
    measures: 'Control of changes in body position and direction.', zero: 'Cannot actively maneuver its body.',
    standard: 'Turns, balances and changes course reliably through ordinary obstacles.',
    exceptional: 'Maintains precise body control through abrupt turns and demanding obstacle sequences.',
    boundary: 'Not straight-line sprint output, reaction latency or a granted movement mode.',
  },
  reflex: {
    measures: 'Promptness of a response once a stimulus is detected.', zero: 'No responsive reaction.',
    standard: 'Responds promptly to an ordinary sudden change it has detected.',
    exceptional: 'Responds to brief detected openings before an ordinary responder can act.',
    boundary: 'Not sensing an otherwise undetectable stimulus, predicting events or guaranteed turn priority.',
  },
  intelligence: {
    measures: 'Learning, reasoning and adapting solutions.', zero: 'No flexible learning or reasoning.',
    standard: 'Learns routines and adapts a familiar solution to a changed task.',
    exceptional: 'Solves unfamiliar multistep practical problems within the species canon.',
    boundary: 'Does not grant language, human-level cognition, future sight or knowledge absent from experience.',
  },
  willpower: {
    measures: 'Persistence of deliberate focus under distraction or pressure.', zero: 'No sustained deliberate focus.',
    standard: 'Maintains an intended task through ordinary distractions.',
    exceptional: 'Maintains deliberate focus under severe distraction and psychological pressure.',
    boundary: 'Not psychic output, bravery, status immunity or an automatic accuracy bonus.',
  },
  instinct: {
    measures: 'Immediate interpretation of perceived cues without deliberate reasoning.', zero: 'No instinctive interpretation of cues.',
    standard: 'Recognizes familiar threats, opportunities and behavioral cues.',
    exceptional: 'Rapidly interprets subtle combinations of perceived cues in unfamiliar situations.',
    boundary: 'Not a new sensory channel, factual knowledge or precognition.',
  },
  charisma: {
    measures: 'Nonverbal presence capable of drawing attention or influencing responses.', zero: 'No meaningful nonverbal influence.',
    standard: 'Has a noticeable presence to recipients capable of perceiving its signals.',
    exceptional: 'Commands attention through unusually compelling nonverbal presence.',
    boundary: 'Not eloquence, obedience, friendliness, mind control or an automatic status application.',
  },
  resilience: {
    measures: 'General structural toughness against bodily injury.', zero: 'No meaningful structural toughness.',
    standard: 'Withstands ordinary physical stresses without readily sustaining injury.',
    exceptional: 'Withstands severe physical stresses that readily damage ordinary structures.',
    boundary: 'Not injury reserve, repair, or an elemental/status immunity; scoped protections stay explicit.',
  },
  flight: {
    measures: 'Performance in sustained self-powered aerial travel.', zero: 'Cannot fly.',
    standard: 'Maintains controlled aerial travel through ordinary conditions.',
    exceptional: 'Maintains unusually capable aerial travel through demanding conditions.',
    boundary: 'No wings are implied; mechanism must be sourced. Not a physical speed or infinite endurance.',
  },
  swim: {
    measures: 'Performance moving through liquid.', zero: 'Cannot actively swim.',
    standard: 'Moves through ordinary liquid conditions with reliable directional control.',
    exceptional: 'Moves effectively through demanding currents and liquid resistance.',
    boundary: 'Not permission to breathe liquid or survive its chemistry, temperature or pressure.',
  },
  burrow: {
    measures: 'Performance moving through supported ground material.', zero: 'Cannot burrow.',
    standard: 'Makes reliable progress through ordinary loose ground supported by its mechanism.',
    exceptional: 'Makes effective progress through substantially more resistant supported ground.',
    boundary: 'Not universal passage through solid walls; material support and phase/seep permissions remain separate.',
  },
  climb: {
    measures: 'Performance ascending supported steep surfaces.', zero: 'Cannot climb.',
    standard: 'Ascends ordinary rough steep surfaces with reliable purchase.',
    exceptional: 'Ascends demanding supported surfaces with very limited purchase.',
    boundary: 'Not adhesion to any material, ceiling travel or permission to ignore surface compatibility.',
  },
  sprint: {
    measures: 'Straight-line ground speed over a short burst.', zero: 'Cannot perform a ground sprint.',
    standard: 'Produces a purposeful fast ground burst beyond ordinary travel.',
    exceptional: 'Produces a ground burst that decisively outpaces ordinary sprinters under comparable conditions.',
    boundary: 'Not agility, reaction speed, endurance or a defined distance per turn.',
  },
  leap: {
    measures: 'Output of a single self-powered jump.', zero: 'Cannot leap.',
    standard: 'Clears ordinary ground obstacles or gaps in one jump.',
    exceptional: 'Clears substantial gaps or rises inaccessible to ordinary jumpers.',
    boundary: 'Absolute output, not body-length-normalized; games interpret height/distance from the situation.',
  },
  manipulation: {
    measures: 'Precision and versatility in handling objects.', zero: 'Cannot deliberately handle objects.',
    standard: 'Grasps, positions and operates ordinary objects with useful control.',
    exceptional: 'Performs delicate coordinated handling of small or intricate objects.',
    boundary: 'Not lifting force or automatic telekinesis; the physical or remote mechanism must be evidenced.',
  },
  sight: {
    measures: 'Usable visual discrimination under supported viewing conditions.', zero: 'No sight.',
    standard: 'Distinguishes ordinary shapes, motion and task-relevant visual detail.',
    exceptional: 'Distinguishes unusually subtle visual detail and motion under comparable conditions.',
    boundary: 'Not lowlight, infrared, wall vision or guaranteed detection of concealment.',
  },
  hearing: {
    measures: 'Usable auditory discrimination under supported listening conditions.', zero: 'No hearing.',
    standard: 'Distinguishes ordinary signals and meaningful nearby sound changes.',
    exceptional: 'Separates faint or closely overlapping auditory cues under comparable conditions.',
    boundary: 'Not echolocation, arbitrary frequency coverage or hearing through every barrier.',
  },
  smell: {
    measures: 'Usable chemical scent discrimination.', zero: 'No smell.',
    standard: 'Distinguishes familiar scents and meaningful changes in nearby scent cues.',
    exceptional: 'Distinguishes faint or closely mixed scent cues under comparable conditions.',
    boundary: 'Not universal toxin identification, immunity or a guaranteed tracking result.',
  },
} as const satisfies Record<RatingKey, Benchmark>;

interface OutputBenchmark { measures: string; standard: string; exceptional: string; boundary: string }
export const OUTPUT_BENCHMARKS = {
  harm: {
    measures: 'Injury-producing output through the declared harm mechanism.',
    standard: 'A substantial ordinary injuring application of that mechanism.',
    exceptional: 'An exceptionally destructive application of that same mechanism.',
    boundary: 'Compare the same mechanism and, for elemental harm, the same element. Not guaranteed damage after protection.',
  },
  restore: {
    measures: 'Bodily repair output.', standard: 'A useful ordinary contribution to repairing existing bodily damage.',
    exceptional: 'An exceptionally substantial contribution to repairing existing bodily damage.',
    boundary: 'Not resurrection, removal of every condition, repair duration or a number equal to harm at the same rating.',
  },
  protect: {
    measures: 'Capacity of a direct intervention to prevent harm.', standard: 'A useful ordinary protective intervention.',
    exceptional: 'An intervention capable of opposing exceptionally substantial incoming harm.',
    boundary: 'Not a percentage, permanent immunity, reflection or automatic protection against every circumstance.',
  },
  displace: {
    measures: 'Pushing or pulling force.', standard: 'A substantial ordinary pushing or pulling application.',
    exceptional: 'An exceptionally forceful pushing or pulling application.',
    boundary: 'Not distance; recipient mass, footing, protections and game rules still matter.',
  },
} as const satisfies Record<'harm' | 'restore' | 'protect' | 'displace', OutputBenchmark>;
