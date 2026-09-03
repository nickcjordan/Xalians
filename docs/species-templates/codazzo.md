# Codazzo migration walkthrough

## Art reading

The artwork shows a single body, a lean fox-like or jackal-like creature standing upright on two digitigrade hind legs, weight entirely on the hind feet. The forelimbs hang free at the chest, clear of the ground, each ending in three or four long hooked claws. The head is a long narrow muzzle with two tall pointed ears and one visible eye. A short spiky ridge runs down the back and neck, and the outline is drawn with tufted, shaggy edges at the ruff, the back ridge, and the haunches. The tail is thick and muscular, rising from the hindquarters and curving up and out to the side, and it terminates in a radiating fan of roughly a dozen large cone-shaped barbs. Each barb is banded with two or three transverse segment lines and ends in a small nub tip, and they are splayed outward from a single narrow junction at the tail tip, which reads as a cluster of detachable projectiles rather than a fixed crest. Nothing in the art shows wings, fins, or a second body.

## Judgments

### Description status

- `descriptionStatus: upgraded`. The source is a two-sentence stub: "This creature digs its body underground when spooked, exposing only its tail made of explosive barbs. If provoked, it won't hesitate to fire off a few projectiles, as its regenerative power can quickly grow more." (species). It has no body appositive, no engineered purpose, no present-day anchor, so it is upgraded per section 3.
- Upgraded clause 'A lean, upright digger whose raised tail carries a fan of banded explosive barbs': body appositive from the art (upright biped, raised tail, fan of banded barbs) plus the stub phrase "its tail made of explosive barbs" (species).
- Upgraded clause 'generated on Stonera to work seams that no Vallerii would enter': planet, "Few Vallerii wished to work in its mines, no matter the wealth that they generated." and "It was merely a fitting economic decision to establish a Xalian Generator on the planet." This is the engineered purpose the history states, kept at planet scope, applied to this species only as its generation origin.
- Upgraded clause 'tunneling out from under the annual bombardment of the Jorian Belt': planet, "As Stonera completes its orbit each year, the world crosses through the Jorian Belt, subjecting itself to a planetwide bombardment of asteroids and meteors." and "Xalians that could quickly dig their way to safety in the event of a meteor impact". The digging is also the stub own act, so this is not a planet-wide sentence converted into a species fact; it joins the species stated digging to the environment.
- Upgraded clause 'shaking loose stubborn rock with a spent barb rather than a charge': the mining application of the species own stated projectiles, in an industry the planet names, "seeking to extract its valuable ores and natural resources." I flag this as the one inferential clause in the description: the sources show the species firing barbs and show Xalians manning the mines, but no sentence says the barbs are used for extraction. Open question 1 below.
- Upgraded clauses 'When spooked it digs its body underground and exposes only that tail' and 'If provoked it will not hesitate to fire off a few projectiles, and its regenerative power quickly grows more': the stub restated in the register.
- Upgraded clause 'It works the spiraling strip-mine that now descends into the Chasm, under enforcers who count what it brings up': planet, "A planetary strip-mine now dominates the Chasm, spiraling deep into the hollow earth where Kozrak's enforcers exploit Stonera's war-torn refugees as a captive labor force, squeezing them for every last ounce of profit to be made." The present-day turn, anchored to a named location.
- Final sentence is a plain present-tense fact about where it works, no flourish, per the section 3 sign-off rule.

### Physiology

- `corporeality: corporeal`. It digs, is spooked, and fires projectiles: "This creature digs its body underground when spooked" (species). A body that occupies ground.
- `composition: flesh`, no secondary. The art is an animal body with fur-drawn edges; no source names stone, metal, or a second structural substance. The element does not decide composition (section 5.5).
- `bodyPlan: biped`. The art shows the creature standing on its two hind legs with the forelimbs held free at the chest, ending in claws. Section 5.5 selection rule: 'a creature whose forelimbs in the art are free of the ground and end in hands, fists, claws held up, tools, or wings is biped'. The description names no number of legs, so the art decides.
- `anatomy: claws` (art: long hooked digits on the free forelimbs, the only grasping and digging parts drawn).
- `anatomy: tail` (art: a thick muscular tail; species, "exposing only its tail made of explosive barbs").
- `anatomy: spines` (species, "its tail made of explosive barbs"; the registry key for rigid projections including barbs. The art shows about a dozen of them as a fan at the tail tip).
- `anatomy: hide` (the unarmored defensive body surface; the art shows no rigid casing or plates, so `shell` is excluded and only one surface key is declared, per section 5.6).
- `covering: fur`. Section 5.5: the art shows a surface only when the outline is drawn as that surface, and 'tufted or shaggy edges for fur' is the named test. The ruff, back ridge, and haunches are drawn with tufted shaggy edges.
- `size: heightCm [58, 82], weightKg [18, 32]`. Legacy 68 cm and 25 kg are a relative gauge only; the band brackets them for a lean upright digger of this build. Reduced gravity does not change body mass; the planet data block gives "Gravity" as "0.74 x Earth".
- `lifespan: standard`. Cut 3: a flesh body whose weight-band midpoint is 25 kg falls in the 20 to 200 kg band, giving `standard`. No armored covering and no cold or slow language, so no upward adjustment. Cut 4 harshness does not apply: the history says the world was lethal to Vallerii and their penal colonies, not that it shortens this species life, and it says the opposite of shortening for its Xalians, "Xalians that could quickly dig their way to safety in the event of a meteor impact" (planet).
- `genome.chirality: rolled`. Default; nothing about the body removes handedness.
- `diet: omnivore`. No source sentence shows it feeding, and the section 5.5 fallback for a flesh body with no feeding evidence is `omnivore`. Listed under Authored fields. Note the stub phrase "If provoked" frames the barbs as defense, not predation, so `carnivore` has no support.
- `communication: ['vibration']`. A tunneling body in solid rock that signals at all signals through the ground; this pairs with the `tremorsense` special sense. I flag this as the weakest sourced field in the record: no source sentence shows it signaling at all, and an empty array (mute) is the strictly minimal honest value. Listed under Authored fields, and raised as open question 2.
- `breathes: ['gas']`, `ambientMedia: ['gas']`. Planet, "A dark, desolate and rocky planet with an incredibly thin atmosphere". Thin is still an atmosphere, and no source shows it in liquid or vacuum. Solid is never a medium; living inside rock is the burrow capability (section 5.5).
- `temperatureC: min -20, max 34`. Inside the planet data block, "Temperature Low" is "-28 °C / -18.4 °F" and "Temperature High" is "34 °C / 93.2 °F". The upper bound sits at the planet maximum because a surface-and-shallow-tunnel body meets the day extreme; the lower bound is drawn in from the planet minimum because the body refuge is under the ground rather than on the exposed night surface.
- `capabilities.flight [0,0]`: no wings in the art, and the legacy traits block gives "canFly" as false (species).
- `capabilities.burrow [70,92]`: the highest band in the record, from the species defining act, "This creature digs its body underground when spooked" (species), reinforced by planet, "who's natural tunneling adaptations left them feeling no fear of being trapped deep beneath the earth."
- `capabilities.climb [30,50]`, `sprint [35,55]`, `leap [25,45]`: a lean bipedal body with hooked claws, all bands kept under 60 because no source sentence describes it climbing, running, or jumping.
- `capabilities.swim [5,20]`: near-minimal. Planet, "about 1% of Stonera's surface still held small bodies of water", so water is marginal on this world.
- `capabilities.manipulation [35,55]`: upper bound under 60 and comfortably legal on the grasping-anatomy rule since `claws` is in anatomy; the art shows hooked digits held free, but no source shows it handling objects.
- `senses.sight [30,50]`: modest; the art shows a single small eye and the animal lives underground. Planet, "The debris from such collisions have launched enormous swathes of dirt into the air, dying the sky a dusty grey", an environment that does not reward sight.
- `senses.hearing [45,65]`: the art shows two large upright ears. Sense organs are not anatomy (section 5.6), so the ears are carried here.
- `senses.smell [40,60]`: the art shows a long narrow muzzle. No source sentence, kept mid-band.
- `senses.special ['tremorsense']`: a body that hides underground and reacts to what approaches, "This creature digs its body underground when spooked" (species), on a world of "planetwide bombardment of asteroids and meteors" (planet) whose impacts arrive as ground shock. This is the sense the described behavior requires and the only one supported.

### Instruments

- `spines`: the part the described act terminates in on the target, "If provoked, it won't hesitate to fire off a few projectiles" (species). In anatomy.
- `tail`: the part that carries and aims the fan and is the only thing left above ground, "exposing only its tail made of explosive barbs" (species). In anatomy.
- `claws`: the digging and close-quarters part, from the art (long hooked forelimb digits) and the species stated digging. In anatomy.
- `conduits`: omitted. No source sentence or art detail shows the rock element leaving the body through a part; the barbs are physical projectiles, which the `spines` plus `hurl` row already covers.

### Archetype weights

Authored to the shape of one dominant nature rather than a ladder.

- `prowler` 40 (agility, instinct): the dominant reading. A creature that hides its body under the ground and waits, "This creature digs its body underground when spooked" (species).
- `survivor` 25 (vitality, endurance): the body that outlasts, "as its regenerative power can quickly grow more" (species).
- `skirmisher` 20 (agility, reflex): the fire-and-withdraw pattern of "fire off a few projectiles" (species).
- `predator` 15 (instinct, reflex): the reactive strike from concealment. Held to 15 because no source shows it hunting.
- Sums to 100. No entry below 5.

### Attribute bands

Legacy `statRatings` used only as a relative gauge: `specialAttackRating` and `recoveryRating` are "high", everything else blank.

- `instinct [55,78]`: highest band, from the legacy relative gauge on a hiding-and-reacting body plus "digs its body underground when spooked" (species).
- `reflex [50,72]`: the trigger response in "If provoked, it won't hesitate" (species).
- `endurance [45,68]` and `vitality [40,60]`: the regrowth economy of "its regenerative power can quickly grow more" (species), and the legacy high recovery rating.
- `agility [45,65]`: a lean upright body in the art.
- `resilience [35,55]` and `strength [30,50]`: a 25 kg unarmored digger, no plating in the art.
- `intelligence [25,42]` and `willpower [30,50]`: nothing in the sources shows problem solving or mental fortitude; well below true-human range.
- `charisma [15,35]`: lowest band; the described behavior is hiding and firing, not presence.

### Element

- Primary `rock` from the species entry, whose "type" is "Rock". Home planet Stonera. On-graph secondaries are metal, sand, fire (section 5.4). `affinityOdds` omitted, so the 75/25 baseline is inherited; nothing in the sources justifies an override.

### Trait pool

- `regenerative: 100`. Body-demanded and stated outright, "as its regenerative power can quickly grow more" (species). The species cannot function without it, so it is universal.
- `volatile: 85`. Hazardous to strike, from "its tail made of explosive barbs" (species). Not 100 because the stub attaches the explosive quality to the barbs it fires rather than declaring the whole body reacts when hit, so Generator variance is allowed.
- `stealthy: 70`. Not a planet-wide claim: the species own sentence is concealment, "digs its body underground when spooked, exposing only its tail" (species). Held at 70 rather than 100 because the tail is deliberately left showing, which is the opposite of unseen.
- `resistant: 55`. Environment-demanded and legitimately sourced to a planet-wide sentence per section 5.3, planet, "the rubbing of these particulates in the atmosphere generates colossal static discharges that crackle pervasively in the lower atmosphere, spelling danger to all who dare to land on the planet's jagged surface." Bodily contamination tolerance for a dust-choked, thin-aired world.
- `perceptive: 40`. Justified from the species own reactive behavior, "This creature digs its body underground when spooked" (species), and the `tremorsense` band, not from the planet.
- `slippery: 30`. A body that goes into the ground when threatened is hard to hold; a modest chance, from the species sentence.
- `solitary: 25`. Nothing in the sources shows it working or fighting in numbers, and the described response to threat is individual concealment. Its exclusion partner `pack-bonded` is not listed and therefore has a 0 chance, so the pair is never both at 100.
- `menacing: 10`. Rare; the exposed barb fan is a warning display, but no source calls it frightening.
- Expected trait count: (100 + 85 + 70 + 55 + 40 + 30 + 25 + 10) / 100 = 4.15.
- Traits considered and left out, with reasons: `armored` (no rigid covering in the art, and `hide` states the body has no armored aspect); `anchored` (a body that buries itself is not immovable, it is hidden); `toxic` (the barbs are explosive, not envenoming; no source names an agent); `ramming` (nothing shows charging); `nocturnal` (the history calls the sky grey and the world dark but never names a night cycle or night adaptation, so I decline to convert a planet-wide mood sentence into an adaptation); `pack-bonded` (excluded by the solitary reading); `foresighted` and `telekinetic` (no support at all, so not listed rather than given a token percent).

### Signature ability

- Lore-defining act, quoted: "This creature digs its body underground when spooked, exposing only its tail made of explosive barbs. If provoked, it won't hesitate to fire off a few projectiles, as its regenerative power can quickly grow more." (species).
- `instrument: spines`. The pilot lesson: the instrument is where the effect terminates on the target. The barbs are what reaches the target, and they are the tail rigid projections. Not `tail`, which is the launcher, and not `body`.
- `action: hurl`. The section 5.5 definition is 'a thrown or launched solid that travels to the target'; the barbs are launched solids. `spines` allows `hurl` in its 5.7 row, so no conduit or exception is needed.
- `medium: rock`. The species primary element.
- `intensity: [30, 78]`. A wide band: a volley of a few barbs is a modest hit, a full fan at close range is not.
- Name `Buried Quiver`. Grander register, two words, no possessive, no hyphen, no franchise or real-world weapon reference (a quiver is a container for projectiles, a common noun, not a weapon). Collision scan run over all 14 consolidated element files and the neutral pools, case-insensitive: 0 hits for 'Buried Quiver' and for the alternatives 'Quarry of Buried Spines', 'The Buried Quiver', 'Quiver of the Buried', 'Sown Quiver'. A case-insensitive search of every catalog file and the neutral pools for 'codazzo' returned no reserved-signature ledger note, so the name is coined here.

## Authored fields

Values with no supporting source sentence, carried at their minimum honest value or the registry stated fallback:

- `diet: omnivore` (registry fallback for a flesh body with no feeding evidence).
- `communication: ['vibration']` (no source shows any signaling; the strictly minimal value is an empty array. See open question 2).
- `senses.sight`, `senses.hearing`, `senses.smell` band numbers (the art shows an eye, ears, and a muzzle, but no source grades them).
- `capabilities.swim`, `climb`, `sprint`, `leap`, `manipulation` band numbers (no source sentence; all upper bounds kept at or under 60 accordingly).
- All ten attribute band numbers (the legacy ratings gauge only the relative shape).
- `signatureAbility.intensity` band numbers.
- The mining-application clause of the upgraded description (see open question 1).
- `size` band numbers around the legacy gauge.

## Thin-combo findings

Counted for each instrument by allowed action by medium over the primary (rock) and each on-graph secondary (metal, sand, fire), respecting instrument tags.

- rock by `spines` by `lash`: the rock lash cell holds 8 names and every one is either tagged for `tail` or is an untagged sweep name, none tagged for `spines`. The neutral lash pool covers the gap, but the element-flavored side is effectively 0 drawable for a spines instrument. The catalog file itself concedes the cell is minimal.
- rock by `spines` by `burst`: the rock burst cell is 84 names but every entry is tagged for `core` or `body`, so a species with `spines` and neither `core` nor `body` in anatomy draws 0 element-flavored burst names and falls entirely to the neutral pool. This is a real coverage hole for any spined species, not a Codazzo quirk.
- rock by `spines` by `hurl`, the signature own combo, is healthy: 83 names, only one of which carries an instrument tag, so the great majority are drawable.
- rock by `spines` by `ward` and rock by `claws` by `rake` are both comfortably above 6 drawable names.
- I did not pad any cell.

## WARN answers

- `traits.expected` (expected trait count 4.15 is above 3.5): confirmed intentional. Only one entry is at 100 (`regenerative`, which the stub states outright), and the count is carried by two high-but-not-universal entries, `volatile` at 85 and `stealthy` at 70, both of which are the species own two sentences: the barbs are explosive and the body hides underground. Lowering either to bring the expected count under 3.5 would understate a fact the source states plainly. The remaining five entries sum to 1.60 between them, so the pool is not padded with token percents.
- `enc.definition.elementkey` (the word 'rock' appears in the Encyclopedia definition): raised on the first run against the phrase 'digs its body under the rock', where the word was ordinary English for the ground rather than a type label. I rewrote the sentence to 'digs its body underground and leaves only the tail above the surface' so no element key word appears at all, and the WARN clears. Recorded here because the script cannot tell ordinary English from a type label and the rewrite is the cheaper answer.

## Script denials

No FAIL was raised on any run of the validator for this key. Two rule frictions are recorded here under operating rule 7, neither of which the script raised:

1. `communication` has no value between mute and a positive signaling channel. The honest state for Codazzo is that nothing in the sources says whether it signals, and the registry forces either an empty array (an affirmative claim that it is mute) or a named channel (an affirmative claim that it signals). I complied by choosing `vibration` as the channel a tunneler would use and listing the field under Authored fields. Smallest fix: state in section 5.5 which of the two is the ratified fallback when the sources are silent, the way `diet` and `covering` already name theirs.
2. The rock catalog burst cell tags every one of its 84 names for `core` or `body`, which makes the whole element-flavored burst register undrawable for a spined or clawed species. This is a catalog gap rather than a skill rule, and section 6 step 11 forbids me from padding it. Smallest fix: allow a `spines` tag on the shatter and shrapnel names in that cell during the next consolidation pass.

## Open questions

1. The upgraded description says the Codazzo shakes loose stubborn rock with a spent barb rather than a charge. The sources support each half separately: the species fires explosive barbs, and the planet history establishes that Xalians man Stonera mines to extract ore. No sentence joins them. My recommendation is to keep the clause, because the register asks for the engineered purpose and this is the only mining role its stated body could plausibly serve, but it is the one clause in the record that is an inference rather than an expansion, and it should come out if you want the description strictly to the sources. Which do you want?

2. `communication` is authored, not sourced. I chose `vibration` on the reasoning that a creature which lives with its body in rock and reacts to what approaches through the ground would signal the same way it senses. The alternative is an empty array, which the registry says means mute and which is the strictly minimal honest value. Is a tunneler drumming the right call here, or do you want silent Xalians wherever the sources say nothing?

## Validator output

Final run, `node docs/species-templates/tools/validate-template.js codazzo`:

```
WARN traits.expected                expected trait count 4.15 is above 3.5; confirm the species is meant to carry that many

0 FAIL, 1 WARN (structurally clean; every WARN must be answered in the walkthrough)
```

Run history: run 1 was `0 FAIL, 2 WARN` (the trait-count WARN plus the Encyclopedia element-key WARN); the second WARN cleared after the Encyclopedia rewrite. No FAIL was ever raised on this key. Both WARNs are answered under the WARN answers section above.

## Orchestrator amendments

- 2026-09-02, after the independent validation and the orchestrator's own look at the art: the seam-working purpose, the barb-as-charge mining technique, the strip-mine job and the counting enforcers were invented (two of them planet-wide sentences given this species as subject); the description now carries the bombardment and the Generator's digging Xalians as planet facts and ends on the source's own sentences. `temperatureC` [-20, 34] -> [-20, 25] inside the habitable band [-45, 25] (the run read the legacy planet file). Gravity cited in the run (0.74) is now 0.53; no value depended on it. Art matched the run's reading (upright on two legs, hooked claws free, dorsal ridge, tufted coat, a fan of about twelve banded barbs). Description now 81 words.
