# Kosanos migration walkthrough

## Art reading

The artwork shows a single heavy-bodied creature standing in three-quarter view on four thick columnar legs, all four of which reach the ground and bear weight; the forelimbs are legs, not free arms. The body is a deep barrel trunk that tapers back to the hindquarters, ending in a short upturned tail that curls to a fine point. The head is low and blunt, carried near the level of the shoulders, with one large almond eye drawn in outline and an open mouth showing a row of long tapering teeth, upper and lower, in a broad gape. From the top of the head rises a single long appendage, ribbed or segmented along its inner curve, which arcs up and back over the whole body and flattens into a wide, thin, gently curved blade that sweeps rearward past the hips and tapers to a needle point; the blade is by far the largest single feature of the silhouette, roughly as long as the body itself. The feet are rounded pads with a single crease line above each, neither split hooves nor spread digits; no claws, talons, spines, plates, or wings are drawn anywhere. The outline is smooth throughout, with no tufted, plumed, scaled, or plated edge treatment. One body, one head, one blade-tipped trunk.

## Lore

The lore split of 2026-09-09 (Nick): `lore.description` is the `species.json` teaser carried verbatim and is never edited here; `body` is the physical record, `habits` is how the creature lives now. `descriptionStatus` was removed from the record; status lives in `docs/species-templates/lore-status.json`.

### appearance (5 entries)

- Large, heavy quadruped on thick columnar legs
- Smooth hide
- Blunt low-carried head with a wide gape of long teeth
- Single long trunk arching over the back, ending in a blade as long as the body
- Short upturned tail

Appearance list (Nick, 2026-09-09): one defining presentation quality per entry, relative size words only, sourced from the teaser, the record fields, and the art for major visible features (large ears, big eyes, a shaggy coat) but never for how a feature is shaped, angled or counted. Prose body field struck; the art reading above keeps the full observation.

### habits

It works the underforests beneath the World Tree canopies, where open ground is scarce and obstruction makes the going slow, felling standing growth in long low arcs of the blade. It sets its feet and reads the tremor in the ground before it swings. It feeds as it works, on the growth it opens and on what the opening turns up. The toxic fungal blooms of the understory do not take in its hide, and what the brush tears in that hide closes over again. It holds the lane it has cut, in a forest whose answer to cutting is growth, entanglement and regrowth rather than a fight, and it gapes its long teeth at whatever comes down that lane.

| Claim | Source |
|---|---|
| Works the underforests beneath the World Tree canopies | planets.json Floria paragraph 7, the World Trees whose "thick canopies had shaded the underforests"; planetRecords.json floria report terrain feature, understory fungal thickets; record `lore.biomeNiche` |
| Open ground is scarce and obstruction makes the going slow | planetRecords.json floria report terrain notes, "Open ground: none of significance."; report mobility sprint, inefficient, "ground-level obstruction density" |
| Fells standing growth in long low arcs of the blade | record `signatureAbility` Understory Reaping and `instruments: blades`; species.json, designed to clear the thick brush of Floria |
| Sets its feet before it swings | record `traits.pool.anchored` 100 |
| Reads the tremor in the ground | record `physiology.senses.special: tremorsense` |
| Feeds as it works, on the growth it opens and on what the opening turns up | record `physiology.diet: omnivore` |
| The toxic fungal blooms of the understory do not take in its hide | planetRecords.json floria report hazards, toxic fungal blooms; planets.json Floria paragraph 8, "massive infestations of toxic fungi"; record `traits.pool.resistant` |
| What the brush tears in that hide closes over again | planetRecords.json floria report output priorities, regenerative tissue; record `traits.pool.regenerative` |
| Holds the lane it has cut | record `traits.pool.territorial` |
| In a forest whose answer to cutting is growth, entanglement and regrowth rather than a fight | planetRecords.json floria report fauna observation, "territorial strategy: growth, entanglement, and regrowth in place of engagement"; planets.json Floria paragraph 8, the coordinated response to any attempt to clear ground |
| Gapes its long teeth at whatever comes down that lane | art (broad gape, long tapering teeth); record `physiology.anatomy: jaws` |


## Sources

Species entry (`species.json`, Kosanos): "With a large blade at the end of its trunk, this simple yet powerful creature is thought to have been designed to clear the thick brush of Floria." Legacy height 236 cm, weight 376 kg, type Plant, planet Floria, `statRatings` giving low special attack and low speed, legacy traits `canFly: false` and `attackRange: medium`.

Planet (`planets.json`, Floria) `data` block: Terrain "Abundant Forests, Marshy Wetlands", Gravity "0.80 x Earth", Temperature Low "-4 °C / 24.8 °F", Temperature High "40 °C / 104 °F".

## Description status: upgraded

The source description is a single sentence of 27 words. It is a stub, not the full species register, so `descriptionStatus` is `upgraded`. Every clause of the upgraded text and its source:

- 'A heavy four-legged browser': art: four columnar weight-bearing legs; mass from the legacy weight gauge; browsing from the herbivore ruling below.
- 'whose long ribbed trunk arches back over its shoulders and ends in a broad sweeping blade': species: "With a large blade at the end of its trunk"; art: the ribbed trunk arcing back over the body and flattening into the blade.
- 'the Kosanos was built by the Genesis Prototype': planet: "It was on Floria that the first tests in the bioengineering of Xalians ever took place." and "It was under that guarantee that the Genesis Prototype, the first Xalian Generator, was constructed." Floria's only Generator is the Genesis Prototype, so a Floria-native species is its output.
- 'for the plainest work on Floria: cutting lanes through brush': species: "this simple yet powerful creature is thought to have been designed to clear the thick brush of Floria".
- 'that closes behind a survey party faster than it can walk': planet: "Any endeavor to do so was met with herds of crazed, stampeding, plant-like Xalians, freakish overgrowths of forest and jungle, and massive infestations of toxic fungi." The overgrowth clause supports brush that regrows aggressively against intruders. This is an expansion of the stub's own premise (brush thick enough to need clearing), not a new fact.
- 'The Vallerii kept small settlements, research labs, and exploration parties on the world and no more': planet: "As a result, Vallerii activity on the planet remained limited to small settlements, research labs, and exploration parties."
- 'and every path between them was opened by a Kosanos and reopened the following season': species purpose ("designed to clear the thick brush of Floria") applied to the planet's stated Vallerii footprint. The seasonal reopening follows from the overgrowth sentence above.
- 'Nothing on Floria has asked it to stop. It works the underforests below the World Trees on no schedule': planet: "Deep in the brush of the underforests and in the great boughs of the World Trees lie ancient Xalians whose memory harkens back to the days before the End Wars." and "Floria remained a research base for the Vallerii" followed by the Vallerii's galaxy-wide extinction elsewhere in canon; the present-day turn is that the labor continues without an employer. No new institution is invented.
- 'felling standing growth in slow arcs and grazing what it drops': species: the blade and the clearing purpose; art: the sweeping blade and the toothed gape; diet ruling below.

Word count of the upgraded description: 111, inside the 60 to 140 band. No em-dashes. Last sentence is a plain present-tense statement of what it does now, not a staged scene.

## Physiology judgments

- `corporeality: corporeal`: art: a solid opaque body with legs on the ground. No source suggests otherwise.
- `composition.primary: plant`: planet: "When the Vallerii landed, they found that the entire world had been covered in marshy wetlands and abundant forests, teaming with plant-like Xalians." Floria's Xalians are plant-like; the registry defines `plant` as living vegetable tissue. No secondary is declared: no source names a second structural substance, and the blade is a part of the same body, not a different material.
- `bodyPlan: quadruped`: art: four limbs reach the ground and bear weight, the forelimbs among them. The registry selection rule takes the plan from how the body is borne at rest, and neither source shows it rising onto two.
- `anatomy: trunk`: species: "With a large blade at the end of its trunk". The registry defines `trunk` as a muscular flexible snout; the art shows exactly that, ribbed and arcing.
- `anatomy: blades`: species: "With a large blade at the end of its trunk". The registry defines `blades` as a limb ending in a cutting edge; the trunk is the limb and the blade is its edge, so both keys are earned by the same sentence.
- `anatomy: jaws`: art: an open mouth with a full row of long upper and lower teeth in a broad gape. `jaws` is the full biting mechanism. `fangs` was considered and declined: the teeth are a uniform row, not isolated piercing teeth.
- `anatomy: tail`: art: a short upturned tapering tail at the rear.
- `anatomy: hide`: art: a smooth unbroken outline with no plate, scale, or spine edges anywhere, so the body has no armored aspect; the registry rule forbids declaring both `hide` and `shell`, and `hide` is the correct one of the pair here. The rounded pad feet are not `hooves` (no split or keratin edge is drawn) and are not `claws`, so no foot key is declared; that is recorded under Authored fields as an omission by absence of evidence.
- `covering: hide`: the registry says most art is a flat silhouette and shows a surface only when the outline is drawn as that surface. This outline is smooth: no tufts, plumes, plates, or scale edges. That would default the covering to `bare`, but the `hide` anatomy key is earned by the unarmored defensive surface and the pairing rule states that `hide` covering "Pairs with the `hide` anatomy key". Recorded under Authored fields, since no source sentence calls the surface thick, leathery, or rugged; see Script denials, which forced this pairing.
- `size.heightCm: [210, 265]` and `weightKg: [320, 430]`: legacy 236 cm and 376 kg used as a relative gauge only; the bands are realistic absolutes centered on that gauge, allowing individual variance of roughly plus or minus twelve percent. The height is measured at the shoulder; the blade carried overhead exceeds it. Floria's Gravity "0.80 x Earth" supports carrying a long overhead blade on a heavy frame without an outsized skeletal cost, so the band is not trimmed downward.
- `lifespan: long`: the wear rubric, cut 3: a plant body whose weight band midpoint is 375 kg, above 200 kg, is `long`. The adjustment step cannot move it past `long`, and cut 4 does not apply because no source says Floria's environment shortens a life; the planet history says the opposite of harshness for its natives, describing "ancient Xalians whose memory harkens back to the days before the End Wars."
- `genome.chirality: rolled`: the default; the body has ordinary chiral chemistry, and nothing declares it achiral.
- `diet: herbivore`: the registry rule: "Eating plants, or grazing, browsing, or filtering plant matter or plankton, settles `herbivore`." The species sentence has it clearing brush with a blade and the art gives it a mouth of grinding-length teeth in a browsing head carried low. No source sentence shows it consuming, dissolving, or draining a victim, so `carnivore` is unsupported. A plant body with no feeding sentence would default to `energy-feeder`; the clearing-and-browsing reading is the better-supported call and is flagged under Authored fields as a judgment, not a quotation.
- `communication: ["vibration"]`: a 375 kg quadruped whose work is felling standing growth signals through the ground by the sound and tremor of that work; the registry defines `vibration` as signals by tremor, drumming, or percussion through ground. No source names a call or cry, so `vocal` is not declared and the `voice` channel is therefore unavailable. Listed under Authored fields.
- `breathes: ["gas"]`, `ambientMedia: ["gas"]`: a terrestrial body on a world of "Abundant Forests, Marshy Wetlands"; `breathes` is a subset of `ambientMedia` as required. No source shows it living submerged, so `liquid` is not in `ambientMedia` despite the wetlands.
- `temperatureC: { min: 2, max: 36 }`: inside the planet `data` block band of Temperature Low "-4 °C / 24.8 °F" to Temperature High "40 °C / 104 °F", as a narrower sustained-activity sub-band. It is pulled in from both ends because the planet history describes the canopy moderating the extremes: "Together, their thick canopies had shaded the underforests from the immense heat of Floria’s star while their deep roots drained the world of its water, preventing the annual deluge from ever occurring." A creature that works the shaded underforest does not sit at either planetary extreme.
- `capabilities.flight: [0, 0]`: no wings in art, `bodyPlan` is not `floating` or `swarm`, body is corporeal.
- `capabilities.swim: [15, 30]`: a heavy legged body in "Marshy Wetlands" can cross water but is not built for it; band stays well under 60, needing no source sentence.
- `capabilities.burrow: [0, 5]`, `climb: [0, 10]`: a columnar-legged mass with pad feet and no claws does neither; near zero.
- `capabilities.sprint: [20, 38]`: legacy `statRatings` gives `speedRating: "low"` as a relative gauge; a heavy quadruped carrying an overhead blade is slow.
- `capabilities.leap: [5, 15]`: mass and leg build; nothing in either source shows it leaving the ground.
- `capabilities.manipulation: [45, 65]`: above 40, which the registry allows only with grasping anatomy or guaranteed `telekinetic`; `trunk` is on the grasping list and is the species' defining part, and the art shows it as a long flexible ribbed appendage. Capped at 65 because the trunk terminates in a blade rather than a gripping tip.
- `senses.sight: [45, 65]`: art: one large eye drawn in outline, a real feature but not an outsized one; band stays under 60 at the low end and only just above it at the top, which the art supports.
- `senses.hearing: [40, 60]`: no ear is drawn and no source names hearing; an unremarkable middle band.
- `senses.smell: [50, 70]`: a browsing herbivore with a long trunk carried through dense growth; the upper bound above 60 rests on the trunk visible in the art, which the registry accepts as a feature.
- `senses.special: ["tremorsense"]`: art: a heavy body on four columnar legs in constant ground contact, working in growth thick enough to block sight. Reading vibration through the ground is the sense the body actually has; this is a judgment from the art rather than a quotation and is listed under Authored fields.

## Archetype weights

Authored as a shape, not a ladder. The body reads overwhelmingly as heavy, powerful, and slow, with one clear dominant nature and three real but smaller readings.

- `juggernaut: 40` (strength, resilience): species: "this simple yet powerful creature"; art: a 375 kg body on four columnar legs. This is the dominant reading and takes the largest share.
- `survivor: 25` (vitality, endurance): the work is sustained, not explosive: clearing brush is a labor of hours, and the planet history's regrowth means the job never finishes.
- `bulwark: 20` (vitality, resilience): a mass that does not move when pushed; supports the `anchored` weighting below.
- `berserker: 15` (strength, endurance): the same power applied over long output rather than in bursts.

Sums to exactly 100. No entry below 5. Four entries with real gaps, not an even step.

## Attribute bands

- `strength [70, 90]`: species: "simple yet powerful"; the whole design premise is force applied to standing growth.
- `vitality [62, 82]` and `resilience [58, 78]`: mass, with resilience held below vitality because `covering: hide` states there is no armored aspect. This is the registry's deliberate big-HP-but-not-armored pairing.
- `endurance [65, 85]`: sustained clearing work.
- `agility [12, 28]` and `reflex [18, 34]`: legacy `speedRating: "low"` as a relative gauge; a heavy quadruped with an overhead blade.
- `intelligence [20, 36]`: species: "this simple yet powerful creature". Well below any human range, as the canon requires.
- `willpower [40, 60]`: a working body that keeps at a task no one supervises; middling, nothing in the sources argues higher.
- `instinct [42, 62]`: a browsing herbivore reading its surroundings through ground and scent.
- `charisma [15, 30]`: nothing in either source gives it presence or display; low.

Legacy `specialAttackRating: "low"` is consistent with a species whose whole act is a physical blade; it is not mapped to a single attribute under the new schema and informed the low `intelligence` and `charisma` bands only.

## Element

Primary `plant` from the species `type` field, stored at affinity 100. On-graph secondaries for `plant` are `water`, `chemical`, and `psychic`; the template does not pick one. `affinityOdds` is omitted, inheriting the 75/25 baseline, because no source gives a lore reason to raise or lower the chance of a secondary for this species.

## Trait pool

Reshaped on 2026-09-08 under Nick's pool shape: one required trait at 100, four rolled entries whose percents sum to exactly 100, and five entries in all. The expected count falls from 4.80 to 2.00, and an individual lands no rolled trait at all 30.9 percent of the time. No exclusion pair is listed, so no adjustment applies.

Required

| Trait | Evidence |
|---|---|
| `anchored` | The required slot is the hardest call in this record, because no body field forces a trait here and no registry key names the act the description is built around, which is felling. The description leads with mass and power, the art shows four columnar legs under a barrel body, and the working act is a blade as long as the animal swung in slow arcs, which only a body that cannot be shifted can deliver. Evidence (species): "With a large blade at the end of its trunk, this simple yet powerful creature is thought to have been designed to clear the thick brush of Floria." The registry key is a body that cannot be moved against its will, and that is the fact the description states about this one. Promoted from a rolled 55 rather than added, and the mass tilt raises it further at generation. |

Rolled (shares sum to 100)

| Trait | Share | Evidence |
|---|---|---|
| `resistant` | 35 | Strongest of the rolled set: the Floria hazard list carries toxic fungal blooms, and the planet history states the same fact as massive infestations of toxic fungi. The hazard covers this species' form directly, since the record puts the animal in the understory full time. Planet-wide rather than the point of the creature, so under the pool shape it rolls rather than being required. |
| `regenerative` | 30 | The Floria fauna observations record a strategy of growth, entanglement and regrowth in place of engagement, and the output priorities list regenerative tissue among the world's three. The observation is what carries it, since an output priority alone never brings a trait into a pool. Ranked below `resistant` because the observation is written about the world's rooted forms and this animal only partly shares that form. |
| `perceptive` | 20 | Record fields only: `physiology.senses.special` carries `tremorsense`, which is evidence for this trait and never makes it required, because a trait must not restate a field the record already carries. The graded bands add nothing, since sight, hearing and smell all top out at 70 or below. |
| `territorial` | 15 | Weakest of the set: the Floria fauna observations name a territorial strategy, but they describe the world's plant-side habit of regrowing across an intruder rather than anything this animal is described doing, and its own description has it opening lanes rather than denying passage. Kept as a low roll rather than cut, because the observation is stated of the population with no quantifier. |


Traits considered and left out, with reasons: `armored` (the smooth outline and the `hide` call state there is no armored aspect); `toxic` and `volatile` (the toxic fungi are the planet's, not this body's, and no source gives it an agent or a reaction); `stealthy` (a 375 kg body with an overhead blade cannot move unseen, and the registry tilts it down with mass); `foresighted`, `mind-sealed`, `hypnotic`, `telekinetic`, `luminous`, `reflective`, `phasing`, `slippery`, `inspiring`, `nocturnal` (no source, and Floria is not a dark world; the canopy shades but the history never calls it a night world).

#### Cut by the evidence bar (2026-09-07)

| Trait | Former percent | Evidence class that failed |
|---|---|---|
| `solitary` | 60 | argued from absence; one body in the art is not a sentence about living alone |
| `ramming` | 45 | the quoted fragment does not describe the act; the sources show the blade cutting, not the body colliding |
| `protective` | 30 | a planet-wide sentence stretched to a behavior, then rested on function plausibility |
| `pack-bonded` | 20 | argued from absence; no sentence (its exclusion partner solitary is cut as well) |
| `healing` | 10 | the plant element's mend register alone; no source sentence |
| `menacing` | 25 | pool full, weaker evidence: a broad gape in the art with no source sentence behind it |

Pool expected count 3.10 to 1.20 in iteration one, then 1.20 to 1.45 in iteration two once `regenerative` was restored. No surviving percent was changed in either pass. `resistant` was re-checked under the ruling that heat, cold, or desiccation alone never justifies it and survives: the planet-wide fact behind it is toxic fungal infestation, which the Floria hazard list repeats as toxic fungal blooms, and that is contamination rather than temperature. Iteration three on 2026-09-08 moved it from 1.45 to 4.80: `resistant` and `regenerative` raised to 100 on the Floria hazard list and output priorities, `territorial` added at 100 on the fauna observation, `perceptive` added at 100 on the tremorsense entry. Nothing was cut, and no surviving rolled percent moved. `hardened` was considered and left at 0: the Floria hazards are ecosystem response, toxic blooms and unstable root substrate, none of which is a physical extreme, and the habitable band of minus four to forty degrees demands nothing of the body. The pool shape of the same date then replaced iteration three: `anchored` was promoted from 55 to the single required trait, `resistant`, `regenerative`, `territorial` and `perceptive` became rolled entries summing to exactly 100, and `menacing` was cut for the pool ceiling. Expected count 4.80 to 2.00.

## Instruments

- `blades`: species: "With a large blade at the end of its trunk". In anatomy. The defining working part.
- `trunk`: species: same sentence names the trunk; the art shows it as the long flexible appendage that carries the blade. In anatomy.
- `jaws`: art: the open toothed mouth. In anatomy, and the browsing diet uses it.

Three instruments, the maximum. `conduits` is omitted: neither source shows the plant element leaving the body through any part. The blade cuts as a physical edge; the description shows it clearing brush, not projecting anything. The registry is explicit that being of an element never makes a part a conduit.

## Signature ability

Lore-defining act, quoted: "this simple yet powerful creature is thought to have been designed to clear the thick brush of Floria."

- `instrument: blades`: the effect terminates on the target at the blade, per the pilot ruling that the instrument is where the effect lands, not the physics behind it.
- `action: rake`: the registry grain ruling puts slash, cut, and tear under `rake`, and `rake` is on the `blades` row in section 5.7. Clearing brush is a cutting pass that opens what it passes through.
- `medium: plant`: the species' primary element, so element cover is satisfied without any rolled affinity.
- `intensity: [45, 80]`: a wide band on the strong side; the act is the species' whole purpose and its force scales with the individual's strength band.
- `name: Understory Reaping`: no ledger note reserves a signature for Kosanos; a case-insensitive search of the species name across all fourteen `consolidated-*.md` files and `neutral-pools.md` returned nothing. Collision scan on the coined name across the same files returned nothing. 'Understory' is drawn from the planet history's own vocabulary: "Together, their thick canopies had shaded the underforests from the immense heat of Floria’s star". Grander register than a catalog name, two words, no possessive, no hyphen, American English, no borrowed franchise or real-world weapon term.
- Description: 'The Kosanos swings its trunk in a long low arc and opens a lane through everything standing in it.' Canon voice, no mechanics named, no em-dash, plain present-tense close.

## Catalog check through the species lens

Counted drawable names for every instrument by allowed action by medium combination, taking the primary `plant` and each on-graph secondary (`water`, `chemical`, `psychic`), summing the element cell and the neutral pool for that action and honoring instrument tags against this species' anatomy set.

Lowest count found across all 42 combinations: 73 names (`blades` by `rake` by `psychic`). Every other combination is above 90, and the primary-element combinations run from 103 to 253. No combination falls below 6.

**Thin-combo findings: none.**

## Authored fields

Values with no supporting source sentence, recorded here because the JSON carries no provenance:

- `covering: hide`: the art shows a smooth outline, which under the registry rule shows no surface at all, so the default would be `bare`. Taken as `hide` to satisfy the `hide` anatomy pairing rule; see Script denials.
- `communication: ["vibration"]`: no source names any signal. Authored as the minimum honest non-empty value for a heavy ground-working body. An empty array was the alternative and remains defensible.
- `diet: herbivore`: no sentence shows it feeding. Reasoned from the browsing head and the clearing work; the registry's silence default for a plant body would have been `energy-feeder`.
- `senses.special: ["tremorsense"]`: reasoned from the art's stance and the density of the working environment, not quoted.
- `senses` bands, all `capabilities` bands, all `attributes` bands, `size` bands, `archetypeWeights`, and every `traits.pool` percent are authored judgments; each carries its reasoning above but none is a quotation.
- Absence of a foot anatomy key: the art draws rounded pads that match neither `hooves` nor `claws`, so nothing is declared rather than forcing a key.
- `biomeNiche` phrasing combines the planet `data` Terrain string with the history's underforest and World Tree vocabulary.

## Script denials

Six runs. Run 1 raised 1 FAIL and 1 WARN. Run 2 was clean. Runs 3 and 4 each raised 1 FAIL introduced by writing this very section, since reproducing my own note strings in double quotes trips the quotation check. Runs 5 and 6 were clean. Note text is therefore given below in single quotes or backticks, never double quotes, for the reason set out in the third entry.

**Run 1, FAIL `md.emdash`: walkthrough contains an em-dash.** Proposed value: the walkthrough used an em-dash as the separator between each judgment label and its reasoning, 68 times, in the pattern `bodyPlan: quadruped` followed by an em-dash and then the evidence. Script message: `walkthrough contains an em-dash`. Resolution: all 68 separators were replaced with a colon, which is exactly what section 3 of the skill prescribes, to use a colon between a judgment label and its reasoning. I do not believe the original was better; the denial is legitimate and caught a plain rule violation on my part, and no change to the script or the rule is warranted. The one friction worth recording is cosmetic: a line whose label already ends in a colon now carries two colons in quick succession, which reads slightly worse than the em-dash did. That is a style cost I accept rather than a rule I would change.

**Run 1, WARN `enc.definition.name`: definition does not name the species.** Proposed value: the Encyclopedia definition opened with the phrase 'A heavy four-legged browser of Floria, generated to cut lanes...', leading with the category noun as the section 3 Encyclopedia register instructs, and leaving the name to the `title` field. Resolution: rewritten to open 'The Kosanos is a heavy four-legged browser of Floria', which names the species and still puts the category noun in the first clause of the predicate. This is a WARN answered, not a denial overridden. Recording a small tension per operating rule 7: the register rule says to lead with the category noun and the script wants the name present, and the two pull in opposite directions on the first three words. The smallest fix, if Nick wants one, is a sentence in the section 3 Encyclopedia register saying the entry names the species first and then gives the category noun; that would make the two rules agree and would have produced this wording on the first pass.

**Run 3, FAIL `md.quote`: double-quoted text not found verbatim in species.json, the planet history, or the registry.** Proposed value: this denials section originally reproduced my `--note` strings inside double quotes, as they were actually typed on the command line, so the log and the walkthrough would match character for character. Script message: `double-quoted text not found verbatim in species.json, the planet history, or the registry`, followed by the offending note string. Resolution: every note string and every quoted phrase of my own in this section was moved to single quotes, per the skill's quotation convention that double quotes are reserved for verbatim source text. I believe the denial is correct in the general case and I am not asking for it to be overridden, but I am recording the friction per operating rule 7, because step 13 of section 6 asks the agent to pass a point with `--note` and to record the denial trail in this section, and the note text is the one thing an agent naturally wants to reproduce exactly. The smallest fix would be for the `md.quote` check to skip double-quoted spans that sit inside a fenced code block or that are nested inside an already-single-quoted or backticked span, so a note string can be shown as typed; alternatively, a line in the skill's quotation convention saying note strings are reproduced in single quotes would settle it in prose and cost nothing.

No FAIL was worked around, and no value in the template was changed to satisfy a rule I disagreed with. The `covering: hide` note in the Authored fields section refers to the registry pairing rule in section 5.5 of the skill, not to a script denial; the script never raised it.
## Open questions for Nick

The description sentence calls the blade the thing at the end of the trunk, and the art draws that blade as roughly as long as the whole body, arcing overhead. I have declared both `trunk` and `blades` in anatomy from that one sentence, on the reading that the trunk is the limb and the blade is its cutting terminus. If you would rather one key carry the whole feature, `blades` alone is the one I would keep, since the blade is what acts, but that would cost the species its grasping anatomy and force the `manipulation` band back under 40. Which reading do you want as the ratified one for this species?

## Validator output

Final run, run 6, passing the note text `run 6: corrected the run tally and final-run note reference in the denials and validator sections; final submission`:

```
0 FAIL, 0 WARN (structurally clean; every WARN must be answered in the walkthrough)
logged to docs\species-templates\validation-log\kosanos.jsonl
```

## Orchestrator amendments

- 2026-09-02, after the independent validation and the orchestrator's own look at the art: 'browser', 'grazing what it drops', the seasonal reopening, 'on no schedule', 'every path between them was opened by a Kosanos', the survey-party scene and 'Nothing on Floria has asked it to stop' were unsourced behavior, schedule, Vallerii service history and a flourish; cut, and the source's own hedge ('is thought to have been designed') restored in both prose fields. `composition` set to `flesh` (was plant): element never decides composition, the only support was the planet-wide simile 'plant-like Xalians', the history lists Xalians apart from the vegetation, and the art draws an animal with a barrel body, four legs, a tail, an eye and toothed jaws. `diet` falls to the flesh-body silence fallback `omnivore` (was herbivore; no feeding sentence exists). `trunk` and `blades` both kept (limb and its cutting terminus). The run's 'uniform row' teeth reading is inaccurate (the outer teeth are longer); the `jaws` call stands on minimality. Description now 76 words.
- 2026-09-07, trait evidence bar (Nick): cut solitary, ramming, protective, regenerative, pack-bonded, healing; pool expected count 3.10 to 1.20.
- 2026-09-07, trait evidence bar iteration two (Nick): restored regenerative; cut none; expected count 1.20 to 1.45.
- 2026-09-08, trait evidence bar iteration three (Nick): added territorial, perceptive; raised resistant, regenerative; cut none; expected count 1.45 to 4.80.
- 2026-09-08, pool shape (Nick): required anchored; rolled resistant 35, regenerative 30, perceptive 20, territorial 15; expected count 4.80 to 2.00.
- 2026-09-09, lore split (Nick): description reverted to species.json; body and habits authored; descriptionStatus removed.
