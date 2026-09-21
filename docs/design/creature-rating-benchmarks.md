# Rating benchmarks

The shared ladder is agreed. Field-specific authoring descriptions are implemented in
[`benchmarks.ts`](../../packages/content/src/creature/benchmarks.ts), the single source for the 20 performance fields and four direct effect outputs. These descriptions are qualitative calibration anchors, not physical measurement standards or game formulas. Review their application during the eventual species audit; do not silently redefine the anchors to fit a new creature.

| Reference | Meaning |
|---|---|
| 0 | The measured capacity is absent |
| 25 | Limited |
| 50 | Standard reference performance |
| 75 | Strong |
| 100 | Exceptional |
| Above 100 | Beyond the exceptional reference |

Values between references retain their ordering. These are not buckets, percentages, ratios or percentiles. No automatic rounding to the nearest reference. There is no roster normalization: adding a faster creature never changes an existing sprint rating. Technical numeric storage limits are separate from the absence of a semantic ceiling at 100.

## What authors compare

Each performance entry defines its measured capacity, what zero means, standard and exceptional descriptions, and boundaries with neighboring concepts. The intermediate references describe limited performance below the standard and strong performance between standard and exceptional; they do not prescribe a linear physical interpolation.

Examples:

- **Strength:** standard force handles substantial everyday loads; exceptional force is associated with heavy industrial lifting or crushing work. Rate absolute force, not force divided by body weight.
- **Reflex:** standard responsiveness handles ordinary sudden detected changes; exceptional responsiveness exploits brief detected openings before an ordinary responder can act. Detection and prediction are separate.
- **Manipulation:** standard performance handles ordinary objects reliably; exceptional performance handles delicate, intricate objects. This measures control, not lifting force or permission to use telekinesis.

Compare under comparable supported conditions. A high swim rating does not authorize survival in every liquid; a high hearing rating does not authorize every frequency band. When two species differ in a specialized function, use the appropriate explicit physiology or capability description rather than trying to encode the entire distinction in a single score.

Zero is literal absence of the measured capacity. Low performance is positive, not zero. Zero vitality does not mean an automatically dead generated creature: ratings are baseline facts, not encounter health bars. Assess coherent physiology at species authoring, not during individual generation.

## Effect output

Direct harm, restore, protect and displace use the positive portion of the ladder. Their present effects cannot have zero intensity. Their catalog entries describe the output being rated and what the rating does not imply.

- Compare within the same output and a comparable application context. For harm, compare the declared mechanism and elemental classification where applicable.
- Equal harm and restore ratings do not prescribe equal damage/healing numbers.
- Output includes the performer's baseline contribution. Do not infer a universal second multiplication by strength or another attribute.
- Compare ongoing work as ongoing work and discrete applications as discrete applications. The model supplies no universal time unit or conversion between them. Games map those contexts into their own execution rules.
- Area size, target count, range, preparation, recovery, duration and likelihood remain separate. Intensity is not an aggregate score rewarding all of them.
- Do not infer intensity from display names or lore during generation. Authors translate sourced differences into bands in the species definition.

## Status intensity

Every status defaults to 50, now backed by one shared constant. That means the standard application of that particular named condition. Explicit overrides are optional, and a justified override should normally be a range.

Intensity compares the strength or severity of the **same** condition only where a consumer has a meaningful graded interpretation. It does not create partial phasing, stronger immunity, new traversal permissions, automatic escape contests or new effects. A binary implementation can ignore intensity. A stronger poisoned application does not turn poisoning into a universally mandatory damage effect.

No new per-status graded/ungraded switch is introduced. In particular, this reference catalog does not alter removal eligibility, lifetime, probability or the resistant/immune degree. Those distinctions retain their own fields.

## Authoring procedure

1. Establish what the source says the creature can do and which field measures that fact.
2. Compare that capacity with the field's fixed reference descriptions. Do not use body size, element, temperament or rarity as automatic numerical multipliers.
3. Author a coherent range that permits individual variation; use a fixed value only when the source warrants it. Unknown performance is not automatically 50. Only omitted **status intensity** has that specified default.
4. Explain exceptional bands and values above 100 with source evidence. Explicitly record uncertain calibration rather than pretending prose supports an exact point.
5. Verify the whole band against mechanism prerequisites. The lowest generated sight must still support a guaranteed gaze capability.

Temperament retains bounded 0–100 spectra. Physical measurements retain their units. Special senses, elements, categorical ability properties and protection degrees do not acquire this scale.

## Migration boundary

Species migration remains deferred while naming, remaining relationship checks and release integration are completed. These references do not rescale existing species, reinterpret deployed records, or claim that the 32-species calibration pass has happened. That pass will apply the completed shared rules before the canonical release is frozen.
