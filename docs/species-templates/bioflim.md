# Bioflim (chemical, Drainov) migration walkthrough

## Art reading

The artwork is a flat black silhouette of a single hunched body with no legs, no feet, no hands, no wings and no tail. A rounded hood or dome forms the top of the body and carries one opening rendered in negative space, a rough oval with a vertical slit inside it, which reads as a single eye. Below the hood the mass swells outward and two thick arm-like protrusions spread wide to the left and right, broad where they meet the body and tapering toward blunt ends, with the undersides of both broken into long pointed runnels as though the material is sagging off them. The lower two-thirds of the body is a single widening skirt that meets the ground in a flat spreading base, its front face grooved by more vertical runnels, with several detached droplets falling away on both sides. Nothing in the outline is drawn as a discrete limb joint, and nothing bears weight the way a leg does: the body simply broadens until it reaches the ground. The outline is smooth apart from the drip edges, so it shows no fur, feather, scale or plate texture of its own.

## Description status

The species text is a two-sentence stub, so `descriptionStatus` is `upgraded`. Stub, verbatim: "An acid slime organism protected by a thick rocky exoskeleton. Its slime can continually regenerate an outer shell, allowing for great defense."

Clause-by-clause account of the upgraded description:

- `An acid slime organism protected by a thick rocky exoskeleton` (body appositive): species, taken verbatim from the stub.
- `bioengineered by Drainov's Xalian Generator to endure a world of bubbling acid swamps and steaming corrosive rain` (engineered purpose): planet. "Drainov's Xalian Generator was able to miraculously bioengineer new forms of life capable of surviving within the planet's hostile wastelands." and "its bubbling acid swamps, steaming corrosive rain, asphyxiating fumes, slow-drifting clouds of neurotoxic gases, and virulent pathogens."
- `Its slime continually regenerates the outer shell, so the casing that the swamps eat away is replaced as fast as it dissolves` (mechanism): species, "Its slime can continually regenerate an outer shell, allowing for great defense." The second half restates the stub against the acid environment named in the planet history, adding no new fact.
- `Under the crime syndicates that took the planet after the Vallerii were driven off, Bioflim was set to work in the reopened factories and refineries` (present-day turn, anchored to a named institution and place): planet. "Drainov came to be controlled by a loose conglomerate of Vallerii space pirates and interstellar crime syndicates." and "Soon, Xalians were manning the once-abandoned factories, refineries, and chemical plants that remained dormant across Drainov's surface".
- `where a body that survives contact with what it handles is worth more than a body that moves quickly` (economic reading): derived from the stub's defense emphasis and the legacy speed gauge, stated as a valuation rather than a claimed fact about the syndicates. Listed under Authored fields.
- `It stands in the acid and does not wear through` (plain present-tense closing fact): species plus planet, restating the stub's regenerating shell against the acid swamps. No scene, no metaphor.

The upgraded description is 108 words, inside the 60 to 140 band.

## Physiology judgments

- `corporeality: corporeal`: species, "An acid slime organism protected by a thick rocky exoskeleton." A slime organism inside an exoskeleton occupies space and can be struck.
- `composition.primary: slime`: species, "An acid slime organism". Registry: `slime` is a viscous or gelatinous mass with no fixed internal structure. No secondary is declared, because the registry rule states that an exoskeleton of any material is always a covering and never a composition secondary.
- `bodyPlan: amorphous`: species and art. The registry rule for amorphous carries the exact case: a slime or gas body held in a rigid casing with no bearing limbs is `amorphous`, since the casing is a covering and the body inside it has no plan of its own. The art confirms no bearing limbs: the body broadens to a flat base rather than standing on anything.
- `covering: plating`: species, "protected by a thick rocky exoskeleton". Registry: rigid plates that are not grown chitin, stone, metal, bone, or crystal armor integrated into the body. Rock is not grown chitin, so `plating` rather than `chitin`.
- `anatomy: shell`: species, "protected by a thick rocky exoskeleton". Registry: the armored aspect, a rigid enclosing casing, exoskeleton, carapace, or integrated plating. `hide` is excluded by the one-surface-key rule, since declaring hide would state the body has no armored aspect.
- `anatomy: pseudopods`: art, two thick arm-like protrusions spread from the upper body with no joints, dripping at the undersides. Registry: temporary limbs coalesced from a formless body, which is exactly what a slime body inside a casing can extend.
- `anatomy: body`: species, "Its slime can continually regenerate an outer shell, allowing for great defense." The whole mass is the thing that acts and the universal fallback is legal.
- Sense organs are not anatomy, so the single eye in the art is carried in the `sight` band and not as a key.
- `size: heightCm [180, 250], weightKg [320, 500]`: the legacy gauge is 218 cm and 417 kg, both sitting near the middle of the authored bands. A slime mass in a thick rock casing at roughly two meters is heavy for its height, which the band reflects.
- `lifespan: long`: applying the rubric in order. Cut 1 and 2 do not apply, since the body is `slime`. Cut 3, mass: the midpoint of the authored weight band is 410 kg, above 200 kg, so `long`. The armored-covering adjustment cannot move it past `long`. Cut 4, harshness: no source sentence says the environment shortens this species' life; the planet history says the opposite of the Xalians there, "The Xalians on Drainov quickly adapted to not only the smog and industrial waste common to the world but also to its bubbling acid swamps". So `long` stands.
- `genome.chirality: rolled`: the default. A slime body has chemistry to be handed, so `achiral` is not warranted.
- `diet: omnivore`: no source sentence shows this species feeding on anything. The registry fallback for a flesh, slime, or gas body with no feeding sentence is `omnivore`. Listed under Authored fields.
- `communication: []`: no source sentence shows this species signaling to others. The registry says the empty array is legal and means mute, and the minimum honest value applies. Listed under Authored fields.
- `breathes: []`: no source sentence shows this species breathing, and the planet history describes an atmosphere of "asphyxiating fumes, slow-drifting clouds of neurotoxic gases, and virulent pathogens", which is a reason not to author a breathing body without evidence. Listed under Authored fields.
- `ambientMedia: ["gas", "liquid"]`: planet. Terrain is "Acid Swamps, Gaseous Smog, Toxic Atmosphere", so the creature sustains activity both in the smog above and in the swamps themselves.
- `temperatureC { min: -10, max: 43 }`: planet data block, "Temperature Low" of -24 C and "Temperature High" of 43 C. The band sits inside the planet range. The top is taken to the planet maximum because the history names "steaming corrosive rain" and "bubbling acid swamps", which are hot conditions the body works in; the bottom is pulled in from the planet floor because a viscous slime body loses working fluidity at the coldest end and nothing in the sources shows this species at the planet minimum.
- `capabilities.flight [0, 0]`: art, no wings and no drifting body; legacy traits also gauge it as non-flying.
- `capabilities.swim [30, 50]`: planet, the terrain is "Acid Swamps" the creature lives in, so it moves through liquid, but nothing shows it as a strong swimmer, so the band stays under 60.
- `capabilities.burrow [10, 25]`: planet, swamp and sludge ground a soft body can push into; low because no source shows burrowing.
- `capabilities.climb [5, 20]`: art, no gripping limbs; a formless body can creep up a surface poorly.
- `capabilities.sprint [3, 15]`: species legacy gauge, speed is rated low, and the art shows a body with no legs; the band stays very low.
- `capabilities.leap [0, 5]`: art, a flat-based body with no bearing limbs has nothing to spring from.
- `capabilities.manipulation [20, 40]`: art, pseudopods can push and hold crudely. The band tops out at 40 so it stays inside the rule that above 40 needs grasping anatomy; `pseudopods` would in fact permit more, and 40 is deliberately the honest ceiling for blunt slime limbs.
- `senses.sight [20, 40]`: art, one eye opening in the hood; a single low-resolution eye reads as poor sight.
- `senses.hearing [10, 30]`: art, no ear structures visible; minimum honest value. Listed under Authored fields.
- `senses.smell [45, 70]`: species, "An acid slime organism" living in a chemical world; a chemically active surface reads chemical gradients well. Planet context: "Poisons choked the air, chemicals seeped into the waterways". Band kept under 71 so it needs no extraordinary claim.
- `senses.special: ["tremorsense"]`: a slime mass in continuous ground contact across a wide base, per the art's flat spreading base, reads vibration through the ground. This is the one special sense authored from the art rather than a sentence; listed under Authored fields.

## Instruments and conduits

- `shell`: species, "protected by a thick rocky exoskeleton". Physical instrument, present in anatomy, and the part the species is defined by defensively.
- `secretion`: species, "Its slime can continually regenerate an outer shell, allowing for great defense." The channel predicate is an emitted substance the description supports, and an acid slime that flows out to reform a casing is precisely that.
- `pseudopods`: art, the two dripping arm-like protrusions. Physical instrument, present in anatomy.
- `conduits: { "secretion": "chemical" }`: species, "An acid slime organism" whose slime is the emitted substance; the element's power leaves the body through the slime itself, which is what the conduit predicate asks. The conduit is what makes `ward` legal for `secretion` at the medium level as well as the physical level.

## Archetype weights

The row is deliberately top-heavy rather than a ladder, because the species reads overwhelmingly one way: a defensive mass.

- `bulwark: 50` (vitality, resilience): species, "allowing for great defense." This is the dominant reading and takes half the row.
- `juggernaut: 25` (strength, resilience): a 400 kg armored mass that moves slowly and cannot be stopped easily; species legacy gauge has standard defense high and speed low.
- `stalwart: 15` (resilience, willpower): the body that stands in acid and endures it, per the planet history of a world of "bubbling acid swamps".
- `survivor: 10` (vitality, endurance): planet, "The Xalians on Drainov quickly adapted" to the world's hazards.

Nothing agile, clever, social or predatory is listed, because no source shows any of it.

## Attribute bands

- `strength [45, 65]`: heavy mass, no source showing striking power; middling.
- `vitality [60, 80]`: species, "Its slime can continually regenerate an outer shell, allowing for great defense." A self-repairing body is durable in life force.
- `endurance [55, 75]`: planet, the Xalians there "quickly adapted" to sustained hazards; sustained output in a corrosive environment.
- `agility [5, 20]` and `reflex [10, 25]`: species legacy gauge rates speed low; the art shows a body with no bearing limbs.
- `intelligence [15, 35]`: nothing in the sources shows problem-solving. Well below true-human range as required.
- `willpower [40, 60]`: no source sentence; a middling default for a creature that holds ground. Listed under Authored fields.
- `instinct [30, 50]`: no source sentence beyond the environmental adaptation; middling. Listed under Authored fields.
- `charisma [5, 20]`: mute, faceless apart from one eye; no source shows presence.
- `resilience [75, 95]`: species, "protected by a thick rocky exoskeleton" and "allowing for great defense." The highest band in the set, which is the whole point of the species.

## Trait pool

Expected trait count: (100 + 100 + 90 + 70 + 45 + 25 + 12 + 10) / 100 = 4.52, and there is no exclusion pair present with both partners, so no adjustment applies. This is above the script's 3.5 comfort threshold and the WARN is answered below.

- `armored: 100`: body-demanded. Species, "protected by a thick rocky exoskeleton". The registry states a shelled or plated body means armored at 100.
- `resistant: 100`: environment-demanded and body-demanded together. Species, "An acid slime organism", a body whose own substance is acid; planet, "Drainov's Xalian Generator was able to miraculously bioengineer new forms of life capable of surviving within the planet's hostile wastelands." The registry allows an environmental adaptation to rest on a planet-wide sentence, and resistance to contamination is exactly that.
- `regenerative: 90`: species, "Its slime can continually regenerate an outer shell". This is as close to body-demanded as a trait gets, but it is written at 90 rather than 100 so at least one high trait varies between individuals and the species is not identical across every print.
- `toxic: 70`: species, "An acid slime organism". A body made of acid delivers a debilitating agent with contact. Not 100, because the stub frames the acid as what the creature is rather than as a weapon it applies.
- `anchored: 45`: art, a heavy flat-based mass with no bearing limbs, spread wide on the ground. Substantial but not universal, since a formless body can also be displaced by being pushed off its base.
- `protective: 25`: species, "allowing for great defense", read as an instinct that can extend to shielding others. A minority reading, hence a low percent.
- `slippery: 12`: species, "An acid slime organism". A slime body under a casing is hard to hold, but the casing is rigid and works against escape, so this is rare.
- `solitary: 10`: art shows a single body and no source shows grouping. Low rather than absent, and `pack-bonded` is not listed at all, so there is no exclusion conflict.

Traits considered and deliberately left out, with reasons: `healing` (no source shows it restoring others), `volatile` (nothing shows a reaction when struck, only a shell that reforms), `reflective`, `menacing`, `hypnotic`, `perceptive`, `foresighted`, `mind-sealed`, `stealthy` (a two-meter dripping mass is the opposite), `nocturnal` (nothing in the Drainov history makes it a night world), `inspiring`, `luminous`, `telekinetic`, `phasing`, `ramming`, `pack-bonded`.

## Signature ability

Lore-defining act, quoted: "Its slime can continually regenerate an outer shell, allowing for great defense."

- Instrument `secretion`: the effect terminates in the slime that floods out and hardens, not in the shell it becomes. The shell is the product; the slime is the part doing the work.
- Action `ward`: the registry defines ward as protecting the user or an ally by shielding, deflecting, or bracing. `ward` is in the physical row for `secretion` and also in the `chemical` medium row, so the declared conduit and the physical row agree.
- Medium `chemical`: the species primary element.
- Intensity `[40, 85]`: a wide band because the stub says the regeneration is continual but gives no ceiling; the low end still reforms the casing, the high end outpaces heavy damage.
- Name `Everforming Carapace`: coined in the grander register, two words, no hyphen, no possessive, American English, no borrowed name. Catalog search for the species name across every `consolidated-*.md` and `neutral-pools.md` found no ledger line reserving or ratifying a signature for this species (the only hits are anatomy-harvest and demand-sweep documents, which are not the catalog ledger). Collision scan of the exact name across all fourteen consolidated files and the neutral pools returned nothing.
- Description: `The slime beneath floods over the broken plates and hardens into new shell faster than the acid can take it away.` States the act, names no mechanic, and ends on the plain fact rather than a flourish.

## Encyclopedia entry

Opens on the species name followed by the category noun, cross-references Drainov by name and the syndicate-era factories and refineries the planet history describes, names no element key and no registry word, two sentences, no ellipsis, no flourish.

## Authored fields

Values with no supporting source sentence, recorded here because the JSON carries no provenance:

- `diet: omnivore` (registry fallback for a slime body with no feeding sentence).
- `communication: []` (minimum honest value; nothing shows signaling).
- `breathes: []` (minimum honest value; nothing shows breathing).
- `senses.hearing [10, 30]` (no ear structures in the art, no sentence).
- `senses.special: ["tremorsense"]` (inferred from the art's wide flat ground contact, not from a sentence).
- `attributes.willpower [40, 60]` and `attributes.instinct [30, 50]` (middling defaults).
- `capabilities.burrow`, `climb`, `leap` bands (inferred from body form, not from sentences).
- `lore.description` clause `where a body that survives contact with what it handles is worth more than a body that moves quickly` (a valuation derived from the stub's defense emphasis and the legacy speed gauge).
- `genome.chirality: rolled` (the registry default).
- `anatomy: body` (the universal fallback, retained because the whole mass is what acts).

## Thin-combo findings

Combos checked, instrument x allowed action x medium, over the primary `chemical` and the on-graph secondaries `fire`, `metal`, `water`.

- `shell` x {ward, shove, crush} and `pseudopods` x {strike, crush, shove, snare, lash, drain} and `secretion` x {spray, cloud, burst, drain, snare, ward, mend}, plus the `chemical` conduit row for `secretion` {spray, cloud, burst, drain, snare}: every one of these actions has a chemical cell of at least 55 names (the smallest relevant chemical cell is mend at 55; ward is 106, snare 96, crush 74, drain 137, cloud 130, spray 178, burst 103, shove 77, strike 110, lash 88), and every action also has a neutral pool of 43 names or more. No combo falls below 6 drawable names on the primary.
- The secondaries are equally deep in their own consolidated files, and no instrument tag in the chemical file excludes this species: the tags that appear on chemical names are `[fangs]`, `[claws]`, `[talons]`, `[tendrils/tail]`, `[stinger]`, `[breath/secretion]`, and `[secretion]`. This species matches `[secretion]` and `[breath/secretion]` and is excluded from the limb-tagged names only, which removes at most a handful of entries from cells holding dozens.
- No thin combos to report.

## Validator WARN answers

- `traits.expected` (expected trait count 4.52 above 3.5): intended. Four of the eight entries are at or near certainty because this species is defined by durability, and three of those four are demanded by the body or the environment rather than chosen. A pool that expressed the same creature with fewer expected traits would have to drop `resistant` or `toxic`, both of which the sources state directly. Flagged under operating rule 7 as a place where the comfort threshold and a maximally defensive species pull against each other; the smallest fix would be for the threshold to scale with how many pool entries are body-demanded or environment-demanded rather than being a flat 3.5.
- `instruments.predicate.source` for `secretion`: the sentence is species, "Its slime can continually regenerate an outer shell, allowing for great defense." The slime is an emitted substance the body puts out and reuses, which is the channel's predicate.
- `conduits.source` for `secretion` as a `chemical` conduit: the sentence is species, "An acid slime organism protected by a thick rocky exoskeleton." The emitted substance is itself the acid, so the element leaves the body through that part by definition rather than by inference.

## Script denials

Recorded honestly, every FAIL the script raised on any run of this key.

None. The first and only validation run returned 0 FAIL and 3 WARN. No value proposed in this migration was rejected by the script, so nothing was changed under denial and there is no case where a script rule forced a worse outcome. The one rule that did constrain a judgment against the sources is the covering-versus-composition rule, which is not a script denial and is raised as the open question below and under operating rule 7 in the WARN answers above.

## Open questions for Nick

The description stub calls the exoskeleton `rocky`, and the registry forbids carrying that material as a composition secondary because a casing of any material is always a covering. The result is that Bioflim's template says `slime` and `plating` and nowhere records that the plating is specifically stone, which is the one visual fact the stub bothers to give. Would you rather the covering enum grow a value that carries the material, or is losing that detail to `composition` and the description text the right trade, given that the description does still say it?

## Validator output

```
WARN traits.expected                expected trait count 4.52 is above 3.5; confirm the species is meant to carry that many
WARN instruments.predicate.source   channel "secretion" has a source-text predicate (an emitted substance); the validator agent must confirm the quoted sentence
WARN conduits.source                conduit secretion for chemical: the validator agent must confirm the sentence or art showing the element leaving through this part

0 FAIL, 3 WARN (structurally clean; every WARN must be answered in the walkthrough)
logged to docs\species-templatesalidation-logioflim.jsonl
```

## Orchestrator amendments

- 2026-09-02, after the independent validation and the orchestrator's own look at the art: 'after the Vallerii were driven off' contradicted canon (the syndicates are Vallerii pirates; the planet was evacuated, not cleared), the factory job was a planet-wide sentence applied to this species, and the valuation clause and the Encyclopedia's 'lesser body' close were flourishes; all rewritten to the planet-level facts. `conduits` removed: no sentence shows the acid leaving the body; the slime regenerating a shell is a surface process, and `ward` is already in the secretion row, so the signature stands. Art matched the run's reading (one eye, no limbs, dripping surface with no plating drawn; plating is text-sourced). The covering enum stays material-free, as the run recommended. Description now 85 words.
- 2026-09-02, planet rebuild: `temperatureC` re-banded from [-10, 43] to [0, 43] (intersection) against the rebuilt planet record's habitable band [0, 60] C; the old band was validated against the legacy planetary extremes, which are not survivable. Any gravity figure cited in this walkthrough predates the rebuild; the current value is `physical.derived.gravityEarth` = 0.82.
