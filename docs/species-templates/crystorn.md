# Crystorn migration walkthrough

## Art reading

The artwork is a flat black silhouette, front-facing, of a single body. Rising from the top of the head are two large faceted crystal formations, drawn with interior facet lines as gem or prism shapes, one on each side of the crown. Below and slightly outboard of each crystal is a drooping pointed ear. The head is long and heavily shaggy, the fur rendered as dozens of overlapping pointed tufts, and it ends in a broad blunt muzzle with two flat nostrils and a wide mouth line. The torso is thickly shaggy in the same tufted style, broad through the shoulders and heavy through the barrel. Two forelimbs extend outward and slightly down, one to each side; each ends in a hand with separated digits including an opposable-looking innermost digit, and neither hand rests on the ground: they are held out at knee height, palms open. The hindlimbs are folded in front of the body, crossed at the ankles in a seated cross-legged posture, with two padded foot masses visible where the legs cross. There is no tail visible, no wings, no visible spines or plating, and exactly one body. The outline of the trunk and head is drawn as shaggy tufted edges throughout.

## Description status

Legacy text is a single-sentence stub, `The gems growing out of this creature's head transmit powerful light energy, don't be deceived by its calm temperament.` That is far below the 60 to 140 word register, so `descriptionStatus` is `upgraded`.

Upgraded-description clauses and their sources:

- `A heavy, long-haired browser that sits upright on folded legs`: art: shaggy tufted covering over the whole trunk and head, hindlimbs folded and crossed, torso upright. Weight is the legacy gauge, 373 kg.
- `carries a pair of faceted gem growths on its head that transmit powerful light energy`: species: "The gems growing out of this creature's head transmit powerful light energy"; art: two faceted crystal forms on the crown.
- `It was generated for the fields of Luminax, where Xalians grown with prismatic crystal took the brilliance of the twin suns and worked the oases of translucent, alabaster flora that the planet's Generator raised.`: planet: "Similar Xalians soon began to populate the world, some taking on albino features or growing prismatic carapaces of crystal-like scales and shells in order to survive in the brilliant light of the planet as they worked the fields to finally turn the ancient dream of cultivating Luminax's potential as a garden world into a reality." and planet: "Oases of uniquely translucent and alabaster white flora covered the surface of the planet". Note the planet sentence is about Luminax Xalians as a class, and the upgraded text is phrased that way (`where Xalians grown with prismatic crystal`), not as a fact whose subject is the Crystorn.
- `Its crown does what the crystalline leaves around it do, refracting the harmful lengths of the spectrum away and holding only what it can use.`: planet: "Strange, crystalline leaves formed across the world's vegetation, their prism-like structure refracting the intense light of Luminax's suns to reflect back harmful wave lengths and capturing only the valuable pieces of the light spectrum needed for photosynthesis within their chloroplasts." The comparison is stated as a comparison to the flora, not asserted as a measured fact about the creature's biology; the shared subject is the faceted crystal the species canonically has.
- `Its temperament is calm, and the calm is deceiving.`: species: "don't be deceived by its calm temperament".
- `Where the misfiring panels of the Stellaris Superstructure burn new blast zones into the surface, the Crystorn sits in the residual radiation and gathers it.`: planet: "ION-9 has begun to haphazardly shift the panels of the Solar Cannon, resulting in misfirings toward Luminax's surface to devastating effect" and planet: "But a strange occurrence has been noted among some of those Xalians who have survived in the sun-scorched blast zones left behind by ION-9." The clause `and gathers it` is the species-level energy-feeder call (below), not a planet claim.

No jobs, schedules, scenes, feeding times, causal Vallerii claims, or present-day institutional roles beyond what the two sources above state. Word count is inside the 60 to 140 band.

## Physiology judgments

- `corporeality: corporeal`: art: a solid opaque body with limbs and a muzzle; nothing in either source suggests otherwise.
- `composition.primary: flesh`: art: a haired animal body with limbs, muzzle, and nostrils; the registry definition is "living animal tissue, muscle and organ, whatever covers it."
- `composition.secondary: mineral`: species: "The gems growing out of this creature's head" are a structural growth of the resting body, which the registry allows as a secondary ("crystal horns on a furred body are `flesh` primary, `mineral` secondary").
- `bodyPlan: biped`: art: the forelimbs are held clear of the ground at knee height and end in digited hands, and the hindlimbs are the folded bearing limbs. The registry test is that a creature "whose forelimbs in the art are free of the ground and end in hands, fists, claws held up, tools, or wings is `biped`". The seated pose is not a rest stance the registry recognizes as its own plan and no other key in the priority order fits.
- `covering: fur`: art: the outline of the head and trunk is drawn throughout as overlapping pointed tufts, which the registry names as the one case where a silhouette shows a surface ("tufted or shaggy edges for `fur`").
- `anatomy: core`: species: "The gems growing out of this creature's head transmit powerful light energy" is exactly the registry's `core`, an "exposed radiant or crystal focal mass"; the gems are shown external and are the thing that emits.
- `anatomy: fists`: art: two forelimbs ending in digited hands, held open and free of the ground; `fists` is the registry key for blunt striking hands and is the honest key for a hand with no claws, talons, or pincers drawn.
- `anatomy: hide`: art: no plating, shell, carapace, spines, or rigid casing is drawn anywhere on the trunk; a furred defensive body surface with no armored aspect is `hide`, and the species therefore declares `hide` and never `shell`.
- Anatomy keys deliberately not taken: `horns` (the crown is emissive and the description defines it by what it transmits, so `core` is the functional key and the registry forbids a second surface-style duplicate for the same part); the ears and nostrils in the art are sense organs, which the registry states are never anatomy.
- `size: heightCm [160, 195], weightKg [300, 420]`: legacy gauge is 178 cm and 373 kg, used as a relative reading, not copied; the band is authored around it and is consistent with the art's heavy shaggy barrel and thick limbs.
- `lifespan: long`: cut 3 of the rubric: a flesh body above 200 kg (band midpoint 360 kg) is `long`. No armored covering adjustment is available past `long`. Cut 4 does not apply: no source sentence says the environment shortens this creature's life; the planet history says the opposite of Luminax Xalians as a class, that they are "well adapted to the immense radiation present on their planet."
- `genome.chirality: rolled`: default; nothing declares an achiral body.
- `diet: energy-feeder`: the registry's fallback for a flesh body with no feeding sentence is `omnivore`, but the registry also states that "any other body shown drawing in an energy, including light taken through an organ or a core, is `energy-feeder`". Species: "The gems growing out of this creature's head transmit powerful light energy" shows the crown as an organ working light; planet: "the immense energy released by Luminax's twin suns naturally resulted in an incredible level of photosynthetic potential across the world". Judgment call recorded under Authored fields as partly authored, because the species sentence shows the crown transmitting energy rather than explicitly taking it in.
- `communication: ["display", "vocal"]`: `display` from art: the crown is a conspicuous emissive head-growth and the registry lists "light pattern" under `display`; species: the gems "transmit powerful light energy". `vocal` from art: a wide drawn mouth line and open nostrils on a broad muzzle. Both are marked as inferred under Authored fields.
- `breathes: ["gas"]`: planet: the surface is an atmosphere world with "torrential storms" and "intense winds", and the body is a haired flesh animal; `breathes` is a subset of `ambientMedia`.
- `ambientMedia: ["gas", "vacuum"]`: planet: the sentence describing Luminarii being brought into space, whose immunity to cosmic radiation was necessary for construction and maintenance of the Dyson Sphere That is a planet-wide statement about Luminax Xalians, and the registry allows a planet-wide sentence to justify an environmental field. Sustaining activity is what the sentence shows; `breathes` stays gas only.
- `temperatureC: {min 30, max 95}`: the planet `data` block gives `Temperature Low` 24.5 C and `Temperature High` 122 C, so the band sits strictly inside the planet range. The sub-band is authored to the sunward face the species is generated for, planet: "half of the world is rendered in eternal daylight", against a heavily furred body that is not built for the extreme upper tail.
- `capabilities.flight [0, 0]`: art: no wings; legacy gauge `canFly: false`.
- `capabilities.swim [5, 20]`: planet: the only water named is on the far side, "lifeless oceans"; a heavy furred land body with no source sentence gets a floor band.
- `capabilities.burrow [0, 0]`: nothing in either source shows it entering ground.
- `capabilities.climb [10, 25]`, `sprint [10, 30]`, `leap [10, 25]`: legacy gauge marks speed `low` and the art shows a heavy, thick-limbed, seated body; all well under the 60 threshold that would need a source sentence.
- `capabilities.manipulation [45, 70]`: the upper bound is above 40, which the registry permits when grasping anatomy is present; `fists` is on the grasping list, and the art shows separated digits with an innermost opposable-looking digit.
- `senses.sight [70, 92]`: planet: the sunward face is "eternal daylight" under twin suns and the body is generated for it; the upper bound above 60 rests on that environmental sentence plus a crown built around the light spectrum. Environmental, not behavioral, so a planet-wide sentence is legal here.
- `senses.hearing [45, 70]`, `smell [40, 65]`: art: prominent drooping ears and open nostrils on a broad muzzle; mid bands, upper bounds kept modest since nothing else supports them.
- `senses.special: ["heat-sense"]`: planet: "the scorching heat of its twin suns" and the freakish thermal circulation the history describes as "the laws of thermodynamics forces hot air to rapidly surge from one end of the world to the other"; a body generated for a world whose defining gradient is heat is given the heat register. Flagged under Authored fields as the weakest of the sensory calls.

## Instruments and conduits

- `instruments: ["core", "fists"]`: `core` is the crown, the one part the species sentence exists to describe. `fists` are the only other functional working parts the art shows. Two instruments rather than three because nothing else in either source is used to act.
- `conduits: { "core": "light" }`: species: "The gems growing out of this creature's head transmit powerful light energy" is exactly the predicate, the element's power leaving the body through that part. Light is the primary element. This gives `core` the light medium row (beam, burst, ward, mend, terrorize, spray) on top of its physical row (beam, burst, ward).

## Archetype weights

Not a stepped ladder; one dominant nature with a heavy defensive tail. `sage` 46 (intelligence and willpower: the calm temperament of the species sentence, and a body whose act is a still, gathered emission rather than a chase). `bulwark` 24 (vitality and resilience: 373 kg of heavy furred mass by the legacy gauge). `stalwart` 18 (resilience and willpower: the same mass read as the thing that stands and holds). `survivor` 12 (vitality and endurance: planet, Luminax Xalians as a class are the ones "who have survived in the sun-scorched blast zones left behind by ION-9"). Sums to 100. Nothing agile or predatory is listed: the legacy gauge marks speed `low` and no source shows it hunting.

## Attribute bands

Legacy `statRatings` used only as a relative gauge: `specialAttackRating: high` and `speedRating: low`, everything else blank.

- `strength [55, 78]`: heavy mass, thick limbs, but no source shows it striking as its defining act.
- `vitality [60, 85]`: the mass gauge, high.
- `endurance [58, 82]`: planet: survival in the blast-zone radiation is an endurance reading for Luminax Xalians as a class.
- `agility [12, 32]`, `reflex [20, 42]`: legacy gauge `speedRating: low`; art shows a heavy, settled body.
- `intelligence [45, 68]`: mid-high but nowhere near true-human, per the canon cap. Justified by the calm, composed presentation of the art and the species sentence; not pushed higher because no source shows problem-solving.
- `willpower [62, 88]`: the highest band, from species: "don't be deceived by its calm temperament", a composure the sentence treats as its defining characteristic.
- `instinct [40, 62]`: no source shows hunting or ambush.
- `charisma [35, 60]`: the crown is conspicuous but no source shows it commanding anything.
- `resilience [58, 80]`: mass plus planet: Luminax Xalians as a class are "well adapted to the immense radiation present on their planet."

## Element

Primary `light` from species `type: Light`. Secondaries are whatever the graph allows for light (fire, electric, psychic); the template does not pick one and does not override the 75/25 baseline odds, so `affinityOdds` is omitted.

## Trait pool

Expected trait count: (100 + 96 + 55 + 34 + 24 + 22 + 12 + 4) / 100 = 3.47. No exclusion pair is present, so no adjustment. The first authored pool came out at 3.90 and the script warned above its 3.5 bar; the reduction is recorded under Script denials.

- `luminous: 100`: body-demanded. Species: "The gems growing out of this creature's head transmit powerful light energy." A body that emits light shed from its own crown is luminous in every individual.
- `resistant: 96`: environment-demanded. Planet: "Being well adapted to the immense radiation present on their planet, Xalians from Luminax were a natural choice of labor for the design of the Stellaris Superstructure." Planet-wide sentences may justify an environmental adaptation; the 4 percent gap is Generator variance, and it keeps at least one entry below 100 alongside the rest of the pool.
- `reflective: 55`: species and planet together: the crown is faceted crystal (art) and planet: the crystalline leaves of Luminax work by "refracting the intense light of Luminax's suns to reflect back harmful wave lengths". This is the closest registry trait to a prism that turns energy back, and it is a body reading, not a behavior. Held at 55, well below 100, because the planet sentence is about the flora and not about this creature; a faceted crown makes reflection plausible in a majority of individuals, not universal.
- `mind-sealed: 34`: species: "don't be deceived by its calm temperament" is the one sentence about its inner state, and `mind-sealed` is the registry trait for a mind nothing sways. Kept under half because a calm temperament is weaker evidence than an unbreakable one.
- `protective: 24`: art: the seated, still, open-handed posture of a heavy body reads as a guard rather than a hunter, and no source shows it attacking. Held low as a body-and-art inference only.
- `anchored: 22`: art: a 300 to 420 kg body sitting with legs folded and a low center of mass. Low percent because no source states it cannot be moved.
- `menacing: 12`: species: the "don't be deceived" warning frames it as more dangerous than it appears. Low because the warning is about deception, not about presence eroding courage.
- `foresighted: 4`: rare-band roll, in the registry's stated 2 to 8 range, on a still, watchful body.

Traits considered and deliberately left out: `armored` (the art shows no plating, shell, or carapace, and the species declares `hide`, which the registry says states the body has no armored aspect); `nocturnal` (the species is generated for the sunward face of a tidally locked world in "eternal daylight", the opposite adaptation); `stealthy` and `perceptive` (both are behaviors, and only planet-wide sentences would support them, which the rules forbid); `telekinetic` (nothing in either source shows it moving anything untouched); `pack-bonded` and `solitary` (no source shows it either with others or alone); `healing` (the light element could color a restorative crown, but no sentence in either source shows this creature restoring anything, so it is left off rather than carried at a token percent); `ramming`, `toxic`, `volatile`, `slippery`, `regenerative`, `phasing`, `hypnotic`, `inspiring` (no supporting sentence in either source).

## Signature ability

Lore-defining act, quoted: "The gems growing out of this creature's head transmit powerful light energy, don't be deceived by its calm temperament."

- Instrument `core`: the effect terminates on the target as energy leaving the gems; the gems are the part, and `core` is their registry key.
- Action `beam`: the registry defines `beam` as "a focused projected line of energy or matter". A faceted crystal that transmits light energy focuses rather than sprays; `beam` is in the physical `core` row and in the light conduit row.
- Medium `light`: the species' primary element, and the sentence names light energy directly.
- Intensity `[55, 92]`: legacy gauge `specialAttackRating: high` is the only rating the legacy block sets, and it is set high.
- Name `Coronet of the Twin Suns`: grander register, coined. Collision scan run case-insensitively across all 14 `consolidated-*.md` files and `neutral-pools.md`; zero hits. A ledger search for `crystorn` across the same files returned nothing, so no reserved name exists for this species.
- Description: `The Crystorn holds still, its crown gathering the light of both suns until the gems release it in one narrow line.` The stillness is the art and the species sentence's calm; the twin suns are planet, "the scorching heat of its twin suns". No mechanics named.

## Catalog check through the species lens

Instruments are `core` and `fists`. Media checked: primary `light` plus on-graph secondaries `fire`, `electric`, `psychic`. `core` physical row is beam, burst, ward; the light conduit adds mend, spray, terrorize for the light medium only. `fists` row is strike, crush, shove.

Every combo checked against the element cell count plus the neutral pool for the action. Element cell counts: light beam 340, burst 93, ward 80, mend 80, spray 147, terrorize 57, strike 253, crush 18, shove 155; psychic crush 54, strike 85, shove 62, beam 52, burst 124, ward 119; fire crush 37, beam 50, burst 115, ward 99, strike 133, shove 44; electric crush 10, beam 129, burst 118, ward 163, strike 111, shove 53.

Thin-combo findings, taking fewer than 6 drawable names as the bar: none. The thinnest raw cell in scope is `fists` x `crush` x `electric` at 10 names before the neutral pool is added, which is comfortably above the bar; `core` x `beam` x `psychic` at 52 and `core` x `beam` x `fire` at 50 are likewise fine. Instrument tags were not a limiter for `core` or `fists` in any cell inspected.

## Authored fields

Values with no direct source sentence, listed as required:

- `communication: ["display", "vocal"]`: both inferred, `display` from the emissive crown, `vocal` from the drawn muzzle and mouth. Neither source states that the creature signals to others.
- `senses.special: ["heat-sense"]`: inferred from the planet's defining thermal gradient, not from a sentence about this species' senses. The weakest sensory call.
- `diet: energy-feeder`: inferred; the species sentence shows the crown transmitting light energy, not taking it in, and neither source shows the creature feeding on anything. The registry's blind fallback for a flesh body would be `omnivore`.
- `senses.hearing`, `senses.smell` bands: art-inferred from ears and nostrils; no source sentence.
- `capabilities.swim`, `climb`, `sprint`, `leap` bands: authored floor bands from the legacy speed gauge and the art's mass; no source sentence for any of them.
- `traits.protective: 24`, `traits.anchored: 22`: art-inferred from posture and mass; no source sentence.
- `size` bands: authored around the legacy gauge, which the skill states is a relative gauge and not a value to copy.
- `lore.biomeNiche`: composed from the planet history's oasis and flora sentences, not a quoted phrase.
- `anatomy: fists`: art-inferred key choice; the art shows hands and the registry has no unspecified-hand key, so `fists` is the minimum honest choice.

## Script denials

Four FAILs were raised across two runs. All four are recorded here with the original value, the message, the change, and my judgment.

1. `capabilities.flight` and `capabilities.burrow`. Original values were the scalar `0` for both. Script message: 'capabilities.flight must be a [lo, hi] band of integers 0 to 100' and the same for burrow. Changed to `[0, 0]` and `[0, 0]`. Legitimate denial, not a false positive: the template contract in section 4 does write every capability as a band, and a scalar breaks the shape a consuming game would read. My original was worse. Small friction worth noting for the orchestrator: section 5.5 says '0 means it cannot', which reads as though a bare 0 were an acceptable value, and that phrasing is what led me to write a scalar. The smallest fix is to change that sentence to say that a band of [0, 0] means it cannot.

2. `md.emdash`. I used the em-dash as the separator between a judgment label and its evidence throughout the walkthrough. Script message: 'walkthrough contains an em-dash'. Changed every separator to a colon, per section 5 of the skill. Legitimate denial and my original was wrong: the skill states plainly that the no-em-dash rule covers the walkthrough.

3. `md.quote`. Original: I quoted the planet sentence beginning 'Soon Luminarii' as the evidence for `ambientMedia` including `vacuum`. Script message: 'double-quoted text not found verbatim in species.json, the planet history, or the registry'. The sentence does exist in `planets.json`, but it contains the word astronauts wrapped in typographic curly quotation marks, and my transcription substituted straight single quotes for them, so the verbatim match failed. I removed the quotation marks and restated the sentence as an unquoted paraphrase, which is what the skill's quotation convention requires when you are not copy-pasting exactly. I believe the denial is correct in kind but the underlying cause is worth flagging: this is a source sentence whose only barrier to being quoted is a nested curly quotation mark, and a species whose strongest environmental evidence sits in such a sentence loses the ability to cite it. The smallest fix is for the validator to normalize typographic quotation marks to their straight equivalents on both sides of the comparison before matching, which would make the sentence quotable without changing any rule.

Non-FAIL adjustment recorded here for the same trail: the script warned that the expected trait count of 3.90 was above its 3.5 bar. Rather than argue the bar, I re-examined the pool and found entries I could not defend at their percents. I removed `healing` at 10 entirely, since nothing in either source shows this creature restoring anything and the entry rested only on the light element's registry fantasy, and I lowered `reflective` from 72 to 55, `mind-sealed` from 40 to 34, `protective` from 30 to 24, and `anchored` from 26 to 22. The pool is better for it: every remaining entry now traces to a source sentence, the art, or the planet's environment. Expected count is 3.47.

## Answers to the script warnings

- `traits.expected`: answered above. The pool was re-authored down to 3.47, inside the bar.
- `conduits.source`: the sentence the validator agent should confirm is the species description's own clause about the gems on the creature's head transmitting powerful light energy. That is the element's power leaving the body through the part, which is the conduit predicate exactly, and it is the only clause the legacy stub contains.
- `signature.description.elementkey` and `enc.definition.elementkey`: the word appears in both as ordinary English and never as a type label. In the signature description it is the physical light of the two suns being gathered and released. In the Encyclopedia definition it is the phrase carried over verbatim from the species source, which itself says the gems transmit powerful light energy. Neither instance names the element as a category, and no registry word appears in either.

## Open questions for Nick

The one question I want to raise concerns the crown. The registry's `core` key is an "exposed radiant or crystal focal mass" and it fits the gems perfectly as emitters, but the art shows them as two separate spikes rising from the head, which is also the shape the `horns` key describes, and `crest` exists specifically for an "emissive or display head-growth". I took `core` because the species sentence defines the gems entirely by what they transmit and because `core` is the only one of the three that reaches `beam`, which the signature needs. Would you rather this species declare `crest` for the crown, accepting that its physical row loses `beam` and the signature would have to lean entirely on the light conduit to keep it?

## Validator output

```
WARN conduits.source                conduit core for light: the validator agent must confirm the sentence or art showing the element leaving through this part
WARN signature.description.elementkey signature description uses element key word(s) as plain words: light (allowed only as ordinary English, never as a type label)
WARN enc.definition.elementkey      encyclopedia definition uses element key word(s) as plain words: light (allowed only as ordinary English, never as a type label)

0 FAIL, 3 WARN (structurally clean; every WARN must be answered in the walkthrough)
logged to docsspecies-templatesalidation-logcrystorn.jsonl
```

## Orchestrator amendments

- 2026-09-02, after the independent validation and the orchestrator's own look at the art: 'browser' (no feeding sentence, and it contradicted the energy-feeder diet), the crown refracting like the crystalline leaves (the flora's mechanism, not the creature's), 'sits in the residual radiation and gathers it' (invented behavior and a flourish) and the class-to-species 'generated for the fields' were rewritten; the description now keeps Luminax Xalians as the subject of the planet sentences. `senses.special` heat-sense removed (no source). `vacuum` removed from ambientMedia: the astronauts sentence establishes radiation immunity for Luminarii as a class, not vacuum for a furred body. `core` kept for the gem crown (the source defines the gems by transmission, and core is the emitter key). Art matched the run's reading (seated cross-legged, hands free with digits, faceted crystals, shaggy all over). Description now 112 words.
- 2026-09-02, planet rebuild: `temperatureC` re-banded from [30, 95] to [30, 70] (intersection) against the rebuilt planet record's habitable band [10, 70] C; the old band was validated against the legacy planetary extremes, which are not survivable. Any gravity figure cited in this walkthrough predates the rebuild; the current value is `physical.derived.gravityEarth` = 0.92.
- 2026-09-02, art correction from Nick (the artist): the head growths are two crystal horns. `core` replaced by `horns` in anatomy, instruments and the conduit; the signature (beam, light) stays legal through the horns light conduit (beam is in the light medium row). Prose now says crystal horns.
- 2026-09-02, spelling (Nick): misspellings in the source description were corrected upstream in species.json (temperment, closed pedals of a flower, flittering Avilies, levatating, Terragoygles as applicable) and the carried text and quotations updated to match; misspellings are never carried into a record.
