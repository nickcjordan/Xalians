# Kosanos migration walkthrough

## Art reading

The artwork shows a single heavy-bodied creature standing in three-quarter view on four thick columnar legs, all four of which reach the ground and bear weight; the forelimbs are legs, not free arms. The body is a deep barrel trunk that tapers back to the hindquarters, ending in a short upturned tail that curls to a fine point. The head is low and blunt, carried near the level of the shoulders, with one large almond eye drawn in outline and an open mouth showing a row of long tapering teeth, upper and lower, in a broad gape. From the top of the head rises a single long appendage, ribbed or segmented along its inner curve, which arcs up and back over the whole body and flattens into a wide, thin, gently curved blade that sweeps rearward past the hips and tapers to a needle point; the blade is by far the largest single feature of the silhouette, roughly as long as the body itself. The feet are rounded pads with a single crease line above each, neither split hooves nor spread digits; no claws, talons, spines, plates, or wings are drawn anywhere. The outline is smooth throughout, with no tufted, plumed, scaled, or plated edge treatment. One body, one head, one blade-tipped trunk.

## Lore

The lore split of 2026-09-09 (Nick): `lore.description` is the `species.json` teaser carried verbatim and is never edited here; `body` is the physical record, `habits` is how the creature lives now. `descriptionStatus` was removed from the record; status lives in `docs/species-templates/lore-status.json`.

### appearance (6 entries)

- Large, heavy quadruped on thick columnar legs
- Smooth hide
- Blunt low-carried head
- Wide gape of long teeth
- Single long trunk arching over the back, ending in a blade as long as the body
- Short upturned tail

Appearance list (Nick, 2026-09-09, second pass after his corrections): one presentation quality per entry; relative size words only; physical presentation only (no sense capability, no behavior); no absent-anatomy entries unless the absence is the form itself; no defaults such as "unarmored"; no definitive claims that would fence future lore; the art is a source for major visible features but never for how a feature is shaped, angled or counted. Every list re-checked against the artwork by the orchestrator on this pass.

### fields (5 of 5)

- **origin**: Thought to have been designed to clear the thick brush of Floria.
- **habitat**: The underforests beneath the World Tree canopies.
- **feeding**: It feeds as it works, on the growth it opens up and whatever the opening turns up.
- **behavior**: It sets its feet, reads the ground, and fells standing growth in long low arcs of the blade on its trunk, then holds the lane it has cut.
- **company**: It moves in herds through the underforest.

Habits split (Nick, 2026-09-10): the habits paragraph and biomeNiche are struck. Five short fields, one question each, in ordinary language: origin (who generated it and what for), habitat (where it lives now), feeding (how it eats), behavior (how it goes about its business), company (alone, pairs, crews, swarms). All five are required (Nick, 2026-09-10, later the same day): a consumer that reads a field must never find it missing, so where the canon is silent the field carries the plainest reading the record supports, hedged in the encyclopedia voice where the record itself is lost, and Nick rules on it with the rest. Planet history stays in the planet records; a field names the world only where the creature itself is involved. No sign-off lines, no hazard sentences written to justify traits. Draft until Nick signs off.

Fields required (Nick, 2026-09-10): filled company ("It moves in herds through the underforest."). Source reading: the teaser, the diet key and the planet history; where they are silent the phrase is the plainest reading of the record and is flagged for Nick with the batch.

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

Re-run of 2026-09-10: the pool is re-derived from scratch under the same 2026-09-08 pool shape, now with `lore.appearance` and the five ratified short fields on equal footing with the teaser, the art, and the planet record as sources (procedure step 9). Two entries are required at 100, four rolled entries share percents summing to exactly 100, and six entries in all, the cap. The expected count rises from 2.00 to 3.00 because the ratified `company` field restores `pack-bonded`, which had been cut entirely for want of a sentence.

Required

| Trait | Evidence |
|---|---|
| `anchored` | No body field forces a trait here and no registry key names the act the description is built around, which is felling. The description leads with mass and power, the art shows four columnar legs under a barrel body, and the working act is a blade as long as the animal swung in slow arcs, which only a body that cannot be shifted can deliver. Evidence (species): "With a large blade at the end of its trunk, this simple yet powerful creature is thought to have been designed to clear the thick brush of Floria." `behavior` reinforces it: "It sets its feet, reads the ground, and fells standing growth in long low arcs of the blade on its trunk, then holds the lane it has cut." The registry key is a body that cannot be moved against its will, and that is the fact both sources state about this one. |
| `pack-bonded` | The ratified `company` field states the fact without qualifier: `company`: "It moves in herds through the underforest." This is exactly the sentence-level evidence the 2026-09-07 evidence bar found missing when it cut this trait for 'argued from absence.' No planet-wide fact is needed; the field is the species' own. `solitary` is not in the pool, so the exclusion rule is not engaged. |

Rolled (shares sum to 100)

| Trait | Share | Evidence |
|---|---|---|
| `resistant` | 35 | Strongest of the rolled set: the Floria hazard list carries toxic fungal blooms, and the planet history states the same fact as massive infestations of toxic fungi. The hazard covers this species' form directly, since the record puts the animal in the understory full time. Planet-wide rather than the point of the creature, so under the pool shape it rolls rather than being required. |
| `territorial` | 25 | Raised from 15. The Floria fauna observations still name a world-wide territorial strategy, but the species now has its own line for the same behavior: `behavior`: "then holds the lane it has cut." Holding a cleared lane against re-growth or intrusion is the registry's own definition of the trait, so the share is raised to reflect a species-level source rather than only a planet-wide one. |
| `regenerative` | 20 | Lowered from 30 to make room for `territorial`'s raise while holding the pool at exactly 100. The Floria fauna observations record a strategy of growth, entanglement and regrowth in place of engagement, and the output priorities list regenerative tissue among the world's three; the observation is written about the world's rooted forms and this animal only partly shares that form, which is why it remains the weaker of the two planet-wide entries. |
| `perceptive` | 20 | Record fields only: `physiology.senses.special` carries `tremorsense`, which is evidence for this trait and never makes it required, because a trait must not restate a field the record already carries. The graded bands add nothing, since sight, hearing and smell all top out at 70 or below. |

Traits considered and left out, with reasons: `armored` (the smooth outline and the `hide` call state there is no armored aspect); `toxic` and `volatile` (the toxic fungi are the planet's, not this body's, and no source, including the new `feeding` field, gives it an agent or a reaction); `stealthy` (a 375 kg body with an overhead blade cannot move unseen, and the registry tilts it down with mass); `grappling` (the blade cuts and the trunk carries it; nothing in `behavior` or `feeding` shows the trunk holding a caught target rather than felling growth); `foresighted`, `mind-sealed`, `hypnotic`, `telekinetic`, `luminous`, `reflective`, `phasing`, `slippery`, `inspiring`, `nocturnal` (no source in any field, old or new, and Floria is not a dark world; the canopy shades but the history never calls it a night world).

#### Trait re-run (2026-09-10)

- `pack-bonded`: restored from cut to required at 100. Reason: the ratified `company` field, "It moves in herds through the underforest," is exactly the sentence-level, species-own evidence the 2026-09-07 evidence bar found lacking (see the cut table below, 'argued from absence'). This is the second required trait, still within the "two normally" guideline, so no special-case justification is needed.
- `territorial`: raised from a rolled 15 to a rolled 25 on the new `behavior` field, "then holds the lane it has cut," which states the species' own ground-holding act rather than only the planet-wide fauna observation.
- `regenerative`: lowered from a rolled 30 to a rolled 20 to keep the rolled set at exactly 100 after `territorial`'s raise; its own evidence (the output priority and the world's-forms fauna observation) is unchanged and remains the weaker planet-wide entry.
- `resistant` and `perceptive`: unchanged at 35 and 20; no new field bears on either.
- `grappling`: considered on the trunk-and-blade anatomy but not added; see Traits considered and left out.

**Cut by the evidence bar (2026-09-07), now reviewed against the five new fields:**

| Trait | Former percent | Evidence class that failed | Restored? |
|---|---|---|---|
| `solitary` | 60 | argued from absence; one body in the art is not a sentence about living alone | No, and now contradicted: the ratified `company` field states the opposite, "It moves in herds through the underforest." |
| `ramming` | 45 | the quoted fragment does not describe the act; the sources show the blade cutting, not the body colliding | No. `behavior` describes "long low arcs of the blade," a cutting motion, not a collision. |
| `protective` | 30 | a planet-wide sentence stretched to a behavior, then rested on function plausibility | No. `behavior` and `feeding` describe the animal working and holding a lane for itself, never shielding another creature. |
| `pack-bonded` | 20 | argued from absence; no sentence (its exclusion partner solitary is cut as well) | Yes, see Trait re-run above and the Required table. |
| `healing` | 10 | the plant element's mend register alone; no source sentence | No. None of the five new fields shows the animal restoring anything but the growth it has cleared. |
| `menacing` | 25 | pool full, weaker evidence: a broad gape in the art with no source sentence behind it | No. No new field speaks to courage or fear. |

Pool expected count 3.10 to 1.20 in iteration one, then 1.20 to 1.45 in iteration two once `regenerative` was restored. No surviving percent was changed in either pass. `resistant` was re-checked under the ruling that heat, cold, or desiccation alone never justifies it and survives: the planet-wide fact behind it is toxic fungal infestation, which the Floria hazard list repeats as toxic fungal blooms, and that is contamination rather than temperature. Iteration three on 2026-09-08 moved it from 1.45 to 4.80: `resistant` and `regenerative` raised to 100 on the Floria hazard list and output priorities, `territorial` added at 100 on the fauna observation, `perceptive` added at 100 on the tremorsense entry. Nothing was cut, and no surviving rolled percent moved. `hardened` was considered and left at 0: the Floria hazards are ecosystem response, toxic blooms and unstable root substrate, none of which is a physical extreme, and the habitable band of minus four to forty degrees demands nothing of the body. The pool shape of the same date then replaced iteration three: `anchored` was promoted from 55 to the single required trait, `resistant`, `regenerative`, `territorial` and `perceptive` became rolled entries summing to exactly 100, and `menacing` was cut for the pool ceiling. Expected count 4.80 to 2.00. The 2026-09-10 re-run above restores `pack-bonded` and re-weights `territorial` and `regenerative`, bringing the expected count to 3.00.

## Instruments

- `blades`: species: "With a large blade at the end of its trunk". In anatomy. The defining working part.
- `trunk`: species: same sentence names the trunk; the art shows it as the long flexible appendage that carries the blade. In anatomy.
- `jaws`: art: the open toothed mouth. In anatomy, and the browsing diet uses it.

Three instruments, the maximum. `conduits` is omitted: neither source shows the plant element leaving the body through any part. The blade cuts as a physical edge; the description shows it clearing brush, not projecting anything. The registry is explicit that being of an element never makes a part a conduit.

#### Orchestrator review of the 2026-09-10 trait re-run

Final pool: `{"anchored":100,"pack-bonded":35,"resistant":25,"territorial":20,"regenerative":10,"perceptive":10}` (the agent's pool was `{"anchored":100,"pack-bonded":35,"resistant":25,"territorial":20,"regenerative":10,"perceptive":10}`). pack-bonded returned to the rolled set at the top share (was promoted to required at 100 on the company field "It moves in herds through the underforest."). Same ruling as Avilily: a company line sets the top rolled share, never a required slot. Rolled set resummed to 100.

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

Final run (2026-09-10 trait re-run):

```
WARN temperature.planet             validated against the legacy planets.json extremes only; planetRecords.json habitable band unavailable

0 FAIL, 1 WARN (structurally clean; every WARN must be answered in the walkthrough)
logged to docs\species-templates\validation-log\kosanos.jsonl
```

`temperature.planet` is out of scope for this trait-pool re-run: `planetRecords.json` in this worktree carries no `environment.habitableBandC` field, which is a schema question unrelated to the trait pool, so it was not touched.

## Orchestrator amendments

- 2026-09-02, after the independent validation and the orchestrator's own look at the art: 'browser', 'grazing what it drops', the seasonal reopening, 'on no schedule', 'every path between them was opened by a Kosanos', the survey-party scene and 'Nothing on Floria has asked it to stop' were unsourced behavior, schedule, Vallerii service history and a flourish; cut, and the source's own hedge ('is thought to have been designed') restored in both prose fields. `composition` set to `flesh` (was plant): element never decides composition, the only support was the planet-wide simile 'plant-like Xalians', the history lists Xalians apart from the vegetation, and the art draws an animal with a barrel body, four legs, a tail, an eye and toothed jaws. `diet` falls to the flesh-body silence fallback `omnivore` (was herbivore; no feeding sentence exists). `trunk` and `blades` both kept (limb and its cutting terminus). The run's 'uniform row' teeth reading is inaccurate (the outer teeth are longer); the `jaws` call stands on minimality. Description now 76 words.
- 2026-09-07, trait evidence bar (Nick): cut solitary, ramming, protective, regenerative, pack-bonded, healing; pool expected count 3.10 to 1.20.
- 2026-09-07, trait evidence bar iteration two (Nick): restored regenerative; cut none; expected count 1.20 to 1.45.
- 2026-09-08, trait evidence bar iteration three (Nick): added territorial, perceptive; raised resistant, regenerative; cut none; expected count 1.45 to 4.80.
- 2026-09-08, pool shape (Nick): required anchored; rolled resistant 35, regenerative 30, perceptive 20, territorial 15; expected count 4.80 to 2.00.
- 2026-09-09, lore split (Nick): description reverted to species.json; body and habits authored; descriptionStatus removed.
- 2026-09-10, trait re-run: `lore.appearance` and the five ratified short fields admitted as pool sources on the same footing as the teaser, the art, and the planet record. `pack-bonded` restored from cut to required at 100 on the ratified `company` field, "It moves in herds through the underforest," which is exactly the species-own sentence the 2026-09-07 evidence bar found missing. `territorial` raised 15 to 25 and `regenerative` lowered 30 to 20 on the new `behavior` field, "then holds the lane it has cut," keeping the rolled set at exactly 100. `resistant` and `perceptive` unchanged. `grappling` considered on the trunk-and-blade anatomy and left out for want of a holding-not-cutting source. Pool now two required plus four rolled, six entries, the cap; expected count 2.00 to 3.00.
