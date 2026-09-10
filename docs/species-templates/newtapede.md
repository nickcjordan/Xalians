# Newtapede (water, Poseidas): migration walkthrough

## Art reading

The render shows the same creature twice. On the left is a lateral view: a long, arched, visibly segmented body, thickest at the front and tapering to a narrow rear, borne on many pairs of thin limbs spaced down its whole length. Each limb is slender, elbowed, and ends in a splayed foot with long spreading toes tipped with small bulbs; the toes are drawn wide apart rather than as a closed paw. On the right is a frontal view: a broad, rounded, downward-tapering head carrying two very large forward-facing eyes with vertical slit pupils, two long thin antennae rising and sweeping back from the crown, and two small nostril dots low on the face. Below the head the trunk is ribbed with paired segment marks, and four limb pairs are visible from the front, held out to the sides with the same splayed, long-toed feet, the forward pair raised clear of the ground. The rearmost segment sits low and wide, with the hindmost feet planted flat. There are no wings, no tail spike, no rattle, no horns, no visible teeth, and no plates, scutes, or shell edges anywhere in the outline; the silhouette edge is smooth throughout.

## Lore

The lore split (Nick, 2026-09-09) puts Nick's teaser back into `lore.description` verbatim and moves everything else into two authored fields. The body and habits below are the record's text.

### appearance (7 entries)

- Long, arched, segmented body on sixteen legs
- Slender frame
- Webbed splayed feet
- Broad rounded head
- Very large forward-facing eyes
- Two thin antennae
- Bare hide

Appearance list (Nick, 2026-09-09, second pass after his corrections): one presentation quality per entry; relative size words only; physical presentation only (no sense capability, no behavior); no absent-anatomy entries unless the absence is the form itself; no defaults such as "unarmored"; no definitive claims that would fence future lore; the art is a source for major visible features but never for how a feature is shaped, angled or counted. Every list re-checked against the artwork by the orchestrator on this pass.

### fields (5 of 5)

- **origin**: One of the water-breathing Xalians the Poseidas Generator produced once the seas rose and turned acidic.
- **habitat**: The water around and beneath Poseidas's rigs and underwater cities.
- **feeding**: It eats what it catches in the water and what it finds on land.
- **behavior**: It is at home on land but far more dangerous in water, where its slender frame and webbed feet carry it. What it catches it wraps its whole length around and holds under.
- **company**: It works among the other water-breathing Xalians of the rigs.

Habits split (Nick, 2026-09-10): the habits paragraph and biomeNiche are struck. Five short fields, one question each, in ordinary language: origin (who generated it and what for), habitat (where it lives now), feeding (how it eats), behavior (how it goes about its business), company (alone, pairs, crews, swarms). All five are required (Nick, 2026-09-10, later the same day): a consumer that reads a field must never find it missing, so where the canon is silent the field carries the plainest reading the record supports, hedged in the encyclopedia voice where the record itself is lost, and Nick rules on it with the rest. Planet history stays in the planet records; a field names the world only where the creature itself is involved. No sign-off lines, no hazard sentences written to justify traits. Draft until Nick signs off.

Fields required (Nick, 2026-09-10): filled feeding ("It eats what it catches in the water and what it finds on land."); company ("It works among the other water-breathing Xalians of the rigs."). Source reading: the teaser, the diet key and the planet history; where they are silent the phrase is the plainest reading of the record and is flagged for Nick with the batch.

## Sources

Species (`species.json`, Newtapede, id 00006, type Water, planet Poseidas): "A 16 legged amphibious creature with a long, segmented body. While adapted to land, its slender frame and webbed feet make it a formidable opponent in water."

Legacy gauge (not inputs): height 200 cm, weight 92 kg, specialDefenseRating low, recoveryRating high, canFly false, attackRange low.

Planet data block (Poseidas): Terrain "Mostly Ocean, Scarce Sandy Islands", Gravity "1.7 x Earth", Temperature Low "5 °C / 41 °F", Temperature High "67 °C / 152.6 °F".

## Description status

The source description is a two-sentence stub, so `descriptionStatus` is `upgraded`. Every clause of the upgraded text and its source:

- 'A sixteen legged amphibious creature with a long, segmented body': species: "A 16 legged amphibious creature with a long, segmented body."
- 'was generated on Poseidas to work the hydro-processing rigs': planet: "Instead, they opted to continue their extraction of the planet’s resources using a Xalian Generator to ensure a constant supply of labor regardless of the inevitable climate crisis."; planet: "Soon, aquatic, water-breathing Xalians capable of surviving in its rising and acidifying oceans began to populate the sea, manning ECHELON’s rigs and replacing the dwindling Vallerii population."
- 'as the rising, acidifying ocean closed over the last of the planet's land': planet: "As the temperatures rose, Poseidas’s polar ice caps began to melt, drowning the planet in a global ocean that slowly covered nearly all of its landmass."
- 'Its slender frame and webbed feet let it trawl for algae in open water and haul itself across a rig deck without pause': species: "While adapted to land, its slender frame and webbed feet make it a formidable opponent in water."; planet: "they soon found themselves instead operating an endless sea of hydro-processing plants, rig upon rig that formed interlocking nets of giant floating industrial zones, each of them trawling the ocean for as much algae as possible."
- 'it was built to breathe the seas the Vallerii had spoiled': planet: "Soon, aquatic, water-breathing Xalians capable of surviving in its rising and acidifying oceans began to populate the sea"
- 'It survived the global death tide that killed its masters': planet: "Only the subsurface Xalians survived, and they would go on to man Poseidas’s rigs in the absence of their masters"
- 'Today it works the deep-cities the Xalians of Poseidas built beneath the storms': planet: "building them deeper and deeper beneath the ocean in order to avoid the tumultuous storms and toxic microbes that racked its surface."; planet: "As such, its underwater cities now serve as centers of commerce and science in an otherwise dying galaxy."
- 'where the only Algael in the galaxy is gathered and processed': planet: "As the only known source of the medicinal substance now known as Algael in the galaxy,  Poseidas had a natural monopoly that allowed it to grow into one of the most powerful planets in Vallerii space."
- 'and it fights in the water rather than on the deck': species: "While adapted to land, its slender frame and webbed feet make it a formidable opponent in water."

No clause states a schedule, a scene, a named individual, a causal claim about the Vallerii beyond what the history states, or a closing flourish. The last sentence is a plain present-tense fact restating the source's own comparison.

## Buried-auto-trait pass

Body-demanded (100): none. The body has no armored covering, is corporeal, and is not rooted, so `armored`, `phasing`, and `anchored` are all absent from the pool. This species genuinely has no BODY-demanded trait at 100, which is legal; the rule requires at least one trait strictly between 0 and 100, not one at 100. Superseded in part on 2026-09-08: the environment and the legacy ratings demand four entries at 100, so the pool now has them, but none of them is demanded by the body plan.

Environment-demanded (near 100): `resistant` at 90, from the planet history. Amended 2026-09-08: `resistant` at 100 and `hardened` at 100, from the Generator Environmental Report's hazard list and output priorities for Poseidas.

Suggested by body or description: `slippery`, `regenerative`, `pack-bonded`, `perceptive`, `stealthy`, `protective`, each below.

## Judgments, one line each with evidence

### Element and planet

- `element: water`, `homePlanet: poseidas`, `generatorPlanets: ["poseidas"]`: species: entry fields `type` Water and `planet` Poseidas; legacy species are home-only by the migration contract.
- No `affinityOdds` override: nothing in either source argues this species leans toward ice, plant, or chemical more than the 75/25 baseline.

### Physiology

- `corporeality: corporeal`: species: "A 16 legged amphibious creature with a long, segmented body." A legged, footed body occupies space.
- `composition.primary: flesh`, no secondary: species: an amphibious animal body; art: no casing, core, or mineral structure shown. Per the registry, `flesh` is "living animal tissue, muscle and organ, whatever covers it."
- `bodyPlan: multiped`: species: "A 16 legged amphibious creature"; registry: `multiped` is "stands and moves on more than four limbs". Sixteen bearing legs is decisive; the selection order puts `multiped` ahead of `quadruped` and `biped`, and the body is not `piscine` because the species is called amphibious and adapted to land, nor `serpentine` because its limbs bear it.
- `covering: bare`: art: the silhouette edge is smooth throughout, with no plate, scale, plume, or tufted edge anywhere; species: names no surface. Registry default: "When neither source names or shows a surface, the covering is `bare`". Listed under Authored fields.
- `anatomy: claws`: art: every foot is drawn as a splayed set of long, separated toes with distinct tips, which is a hooking or gripping digit set rather than a hoof or a flat pad. Authored as the honest reading of the art; the description names no combat part.
- `anatomy: jaws`: art: the head is broad with a defined tapering lower face and paired nostrils, so the creature has a mouth; `jaws` is the registry's full biting mechanism. Authored; flagged.
- `anatomy: hide`: species: "its slender frame"; art: no armored aspect anywhere in the outline. Declaring `hide` states the body has no armored aspect, which is exactly what both sources show, and it satisfies the one-surface-key rule against `shell`.
- `anatomy: antennae`: art: two long thin antennae rise from the crown and sweep back. Sourced from the art per the skill's `art:` provenance rule.
- `anatomy: body`: species: "a long, segmented body." The whole segmented length is the creature's own named feature and is its fallback instrument.
- Not in anatomy: `tail` (art: the rear tapers but bears legs to its end and shows no free tail), `spines`, `fangs`, `stinger`, `wings`, `tendrils`, `pincers`, `crest`, `light-organs`: none is shown or named. The large eyes and the nostrils are sense organs, which the registry rules are never anatomy.
- `size.heightCm: [170, 230]`: legacy gauge 200 cm as a relative anchor, banded around it; species: "a long, segmented body" supports reading the figure as body length for a horizontal multiped. Authored band.
- `size.weightKg: [70, 115]`: legacy gauge 92 kg, banded; species: "its slender frame" keeps the band light for that length. Authored band.
- `lifespan: standard`: rubric cut 3: a flesh body whose weight-band midpoint is about 92 kg falls in "20 kg up to and including 200 kg are `standard`". No adjustment applies: the description does not call it cold, slow, or long-lived, and it carries no armored covering. Cut 4 does not apply because no source sentence says the environment shortens this species' life.
- `genome.chirality: rolled`: the default; a flesh body has chiral chemistry, so nothing justifies `achiral`.
- `diet: omnivore`: the sources say nothing about feeding, and the registry rule is explicit: "When the sources say nothing about feeding, take `omnivore` for a flesh, slime, or gas body". Listed under Authored fields.
- `communication: ["vibration", "display"]`: `vibration` from planet: the species lives and works in water and the deep-cities, and the registry defines `vibration` as signaling "by tremor, drumming, or percussion through ground, water, or air"; art: the segmented body has many contact points with a rig surface. `display` from art: the very large forward eyes and long antennae are the kind of prominent external feature the registry routes into `display` when it signals. Both are authored inferences and are flagged.
- `breathes: ["gas", "liquid"]`: species: "A 16 legged amphibious creature"; planet: "Soon, aquatic, water-breathing Xalians capable of surviving in its rising and acidifying oceans began to populate the sea". Amphibious plus water-breathing gives both phases, and `breathes` is a subset of `ambientMedia`.
- `ambientMedia: ["gas", "liquid"]`: species: "While adapted to land, its slender frame and webbed feet make it a formidable opponent in water." Adapted to land and formidable in water is both phases exactly.
- `temperatureC: {min: 5, max: 40}`: planet data block: Temperature Low "5 °C / 41 °F" and Temperature High "67 °C / 152.6 °F"; the band sits inside that range. The lower bound is the planet floor because planet: "including temperate continents and bitterly cold polar regions" and the ocean spans pole to pole. The upper bound is set well below the planet ceiling because planet: "As the temperatures rose, Poseidas’s polar ice caps began to melt, drowning the planet in a global ocean that slowly covered nearly all of its landmass" describes a warming ocean world, and a flesh, water-breathing body sustaining normal activity does not work at the planet's peak surface figure; the deep-cities the species works are cooler than the surface because planet: "building them deeper and deeper beneath the ocean in order to avoid the tumultuous storms and toxic microbes that racked its surface." The upper number is an authored judgment inside the planet range.
- `capabilities.flight: 0`: species: legacy `canFly` false; art: no wings. Zero means it cannot.
- `capabilities.swim: [70, 92]`: species: "its slender frame and webbed feet make it a formidable opponent in water." The above-60 upper bound has its source sentence.
- `capabilities.burrow: [5, 20]`: planet: "Mostly Ocean, Scarce Sandy Islands" gives soft substrate, but no source shows it moving through ground. Low authored band.
- `capabilities.climb: [45, 70]`: art: sixteen legs ending in long splayed gripping toes distributed along the body length. Authored reading of the art.
- `capabilities.sprint: [30, 50]`: species: "While adapted to land" concedes competence on land while the same sentence puts its advantage in water. Authored band.
- `capabilities.leap: [10, 25]`: art: a long low body carried on many short legs, which is not a launching frame. Authored band.
- `capabilities.manipulation: [30, 55]`: art: splayed long-toed feet are grasping anatomy, which is what lets the upper bound pass 40 legally under the `claws` key, but the limbs are locomotion limbs first, so the band stops in the middle.
- `senses.sight: [55, 80]`: art: two very large forward-facing eyes with vertical slit pupils, the most prominent feature of the front view.
- `senses.hearing: [25, 45]`: art: no external ear structure of any kind is drawn. Authored low band.
- `senses.smell: [30, 55]`: art: two small nostril dots are drawn on the face, so the sense exists and is unremarkable. Authored band.
- `senses.special: ["tremorsense"]`: art: two long antennae plus a segmented body in continuous contact with substrate; registry: `tremorsense` "reads vibration through ground or water to locate what moves", which is what an antennaed body in water reads. Authored from the art and flagged.

### Instruments and conduits

- `instruments: ["claws", "jaws", "body"]`: all three are in `anatomy`. The description names no combat part at all, so these are the honest minimum a legged, jawed, segmented animal fights with; `body` is the universal fallback and is directly named as "a long, segmented body."
- No `conduits` declared: neither source shows water leaving the body through any part. The registry is explicit that "Being of an element never makes a part a conduit; the part must be shown doing it." The omission costs the species its water-medium spread through parts, which I note under strain below.

### Archetype weights (sum 100)

- `runner: 40`: species: "its slender frame and webbed feet make it a formidable opponent in water" plus "While adapted to land" reads as a long-legged mover with reach in two media; `runner` favors agility and endurance, which is the shape of a sixteen-legged trawler that works rigs without pause.
- `skirmisher: 30`: species: "formidable opponent" is the only combat word in the source, and a light, many-legged, slender frame that fights in water reads as agility and reflex rather than force.
- `survivor: 20`: planet: "Only the subsurface Xalians survived, and they would go on to man Poseidas’s rigs in the absence of their masters." Vitality and endurance is the planet-level shape of every Poseidas Xalian and belongs in the row, but as a minority reading.
- `prowler: 10`: art: large forward slit-pupil eyes and antennae give it a sensing, low-slung profile; a minority reading, kept above the 5 floor.
- The row is deliberately front-loaded rather than a stepped ladder: one dominant nature (a mover), one strong second (a light fighter), and two minority readings with a real gap between them.

### Attribute bands

Legacy `statRatings` used only as a relative gauge: specialDefenseRating low and recoveryRating high are the only two filled fields, and everything else is blank, so the species reads as a low-defense, fast-recovering creature of middling everything else.

- `strength [25, 45]`: species: "its slender frame."
- `vitality [35, 55]`: legacy gauge: recovery high, health unrated; a mid band.
- `endurance [55, 80]`: planet: "each of them trawling the ocean for as much algae as possible" is sustained work, and the legacy recovery-high gauge points the same way.
- `agility [55, 80]`: species: "its slender frame and webbed feet make it a formidable opponent in water."
- `reflex [45, 70]`: art: large forward eyes on a light frame; a moderate band.
- `intelligence [25, 45]`: no source shows problem solving; well below true-human range per canon.
- `willpower [30, 50]`: nothing in either source addresses its mind; a middling authored band.
- `instinct [45, 65]`: art: large eyes and long antennae, a sensing head.
- `charisma [15, 35]`: nothing in either source gives it presence.
- `resilience [15, 35]`: legacy gauge: specialDefenseRating low, the one explicitly low rating, and the art shows no armored aspect.

### Trait pool (expected count 2.00)

Re-derived from scratch on 2026-09-10 (Nick's trait re-run) now that `lore.appearance` and the five short fields are ratified source on the same footing as the teaser, the art, and the planet record (`docs/species-templates/lore-status.json` marks both `appearance` and `fields` `ratified` for this key). Pool shape unchanged from the 2026-09-08 reshape: one required trait, five rolled entries whose shares sum to 100, six entries in all, which is the cap. An individual expects one rolled trait on top of the required one, and the chance of landing none of the five is 30.8 percent.

**Required**

| Trait | Evidence |
|---|---|
| `grappling` | The act the description and the signature are both built around. The signature ability, Sixteenfold Undertow, is stated in the record as wrapping its whole segmented length around a swimmer and holding it under, and the description gives the body that does it: species: "A 16 legged amphibious creature with a long, segmented body." and "its slender frame and webbed feet make it a formidable opponent in water". The ratified `behavior` field restates the same act from its own angle: "What it catches it wraps its whole length around and holds under." Sixteen legs closing on a swimmer and keeping it down is the registry key word for word, a body that is stronger holding what it has caught, and it is the one thing every source agrees this creature is for. Nothing is demanded by the body itself: the covering is `bare` so no `armored`, the body is corporeal so no `phasing`, and it is a free swimmer so no `anchored`. |

**Rolled (shares sum to 100)**

| Trait | Share | Evidence |
|---|---|---|
| `regenerative` | 30 | Legacy `statRatings`: `recoveryRating` is high, and a high recovery rating maps to `regenerative`. This is the strongest single signal the legacy data gives about this species; ranked first per the orchestrator's 2026-09-08 correction of the pool-shape rule (a legacy high rating ranks a rolled trait among otherwise-tied entries and never sets it at 100). None of the ratified lore fields adds or changes this evidence. |
| `slippery` | 25 | The only rolled entry carried by a species sentence and the art together. species: "its slender frame and webbed feet make it a formidable opponent in water"; art: a long segmented body with a smooth silhouette edge throughout and no protruding grip point anywhere. The ratified `behavior` field restates the same fact: "It is at home on land but far more dangerous in water, where its slender frame and webbed feet carry it." It sits in the rolled set rather than at 100 because `grappling` is the required body fact, and the two are not in conflict: one is what the creature does to a swimmer it has caught, the other is what a hand closing on the creature finds. |
| `hardened` | 18 | The Generator Environmental Report for Poseidas carries crush depth in its hazard list and depth tolerance in its output priorities, and the species is a swimmer of the deep-city waters, so the hazard covers its form. Pressure is a physical extreme of the body, which the narrowed registry gives to `hardened`. The ratified `habitat` field ties this species specifically to that depth: "The water around and beneath Poseidas's rigs and underwater cities." A planet-wide adaptation confirmed by a species-level field, and the description never makes depth the point of the creature, so it stays rolled rather than required. |
| `resistant` | 14 | The same report carries semiannual toxic bloom events and filtration metabolism, and planet: "Soon, aquatic, water-breathing Xalians capable of surviving in its rising and acidifying oceans began to populate the sea" covers this species' form directly. The ratified `origin` field restates the same fact at the species level: "One of the water-breathing Xalians the Poseidas Generator produced once the seas rose and turned acidic." Acid and microbial load are contamination, which is the narrowed reading of the key. Planet-wide, confirmed by a species field, so rolled. |
| `pack-bonded` | 13 | Restored by the 2026-09-10 re-run. Previously cut (see the table below) for resting only on a planet-wide fact about collective labor stretched into a behavioral trait. The ratified `company` field is now direct species-level source for this trait, per the pool-shape rule that a ratified `company` field is source for `pack-bonded` or `solitary`: "It works among the other water-breathing Xalians of the rigs." Ranked last among the rolled entries because the field describes working alongside other Xalians in general, not a coordination behavior specific to a hunt or a fight, which is why it sits below `resistant` rather than displacing it. |

Friction reported, 2026-09-08 (unchanged by this re-run): the instruction that reshaped this pool ranked `slippery` first on a high legacy `evasionRating`, but this species has no `evasionRating` at all. Its legacy `statRatings` block carries exactly two filled fields, `specialDefenseRating` low and `recoveryRating` high; the high `evasionRating` belongs to Tetrahive. The orchestrator's 2026-09-08 correction ranks `regenerative` first on the legacy recovery rating and `slippery` second on its species sentence and the art, which this re-run carries forward. The smallest fix, still standing: read the pool-shape rule as ranking within an evidence class, so a legacy high rating orders traits that are otherwise tied and never lifts a gauge above a sourced sentence.

#### Cut by the evidence bar (2026-09-07) and by the new keys (2026-09-08)

| Trait | Former percent | Evidence class that failed |
|---|---|---|
| `pack-bonded` | 30 | planet fact stretched to a behavioral trait (collective labor on the rigs) |
| `stealthy` | 15 | body-type plausibility from the silhouette, no sentence and no stealth feature in the art |
| `protective` | 10 | planet fact stretched to a behavioral trait, flagged in the record as weakly evidenced |

**Restored by the 2026-09-10 re-run: `pack-bonded`, now at 13 in the rolled set above.** The cut reason was that its only support was a planet-wide fact (collective labor on the rigs) stretched into a species behavior. The ratified `company` field closes that gap with a direct species-level sentence, "It works among the other water-breathing Xalians of the rigs," which the pool-shape rule names as source for `pack-bonded` or `solitary`. `stealthy` and `protective` are not restored: neither the ratified `appearance` list nor any of the five fields adds a sentence about moving unseen (`behavior` describes grappling prey in the open, not concealment) or about shielding others (`company` describes working among other Xalians, not protecting them), so both cut reasons still hold.

- Deliberately left out: `solitary` (contradicted by the ratified `company` field, "It works among the other water-breathing Xalians of the rigs," and nothing in any source shows it operating alone), `armored` and `anchored` and `phasing` (the body forbids all three), `luminous` (art: no light organ, no core), `toxic` and `volatile` (no source shows the body carrying or releasing an agent, and the toxic microbes of the death tide are the planet's, not the creature's), `healing` (Algael is the substance that heals on Poseidas, not this creature, and attaching it to the species would be an invented claim), `perceptive` (removed from the pool this re-run to make room for `pack-bonded` under the six-entry cap; its evidence, `physiology.senses.special` carrying tremorsense and `senses.sight` topping out at exactly 80, is a record field restating itself rather than a fact from the teaser, the art, or a ratified lore field, and none of the five fields adds a sentence about perception), `telekinetic` and `foresighted` and `mind-sealed` and `hypnotic` and `menacing` and `inspiring` and `nocturnal` and `ramming` and `reflective` (no source sentence, art feature, or ratified field supports any of them; the deep ocean is dark, but no source calls this species night-adapted and the deep-cities are lit centers of commerce).

#### Trait re-run (2026-09-10)

Changes from the previous pool: `pack-bonded` added at 13, restored on the strength of the newly ratified `company` field ("It works among the other water-breathing Xalians of the rigs."), which the pool-shape rule names directly as source for `pack-bonded` or `solitary`. `perceptive` (previously 13) removed to hold the pool at the six-entry cap: it was the weakest-evidenced rolled trait (a restatement of the `physiology.senses` record fields rather than an independent source sentence) and no ratified field strengthens it, while `pack-bonded` now has a direct quote from a required lore field. `regenerative` (30), `slippery` (25), `hardened` (18), and `resistant` (14) are unchanged in share; each gained a supporting quote from a ratified field (`slippery` and `hardened` and `resistant` from `behavior`, `habitat`, and `origin` respectively) that restates, at the species level, a fact previously supported only by the teaser or a planet-wide sentence, but none of those quotes changes the fact pattern, so none moved. `grappling` (required, 100) is unchanged; its evidence line now also cites the `behavior` field's restatement of the same act. `stealthy` and `protective`, cut in 2026-09-07, remain cut: neither is supported by any ratified field. Expected count remains 2.00.

### Signature ability

- The lore-defining act is the one thing the description asserts about it in a fight: species: "While adapted to land, its slender frame and webbed feet make it a formidable opponent in water."
- `instrument: claws`: the effect terminates on the target at the gripping feet, which is where the sixteen legs meet the swimmer. Per the ratified pilot lesson, the instrument is the part where the effect lands, not the physics that produces it.
- `action: snare`: registry: `snare` "holds, binds, pulls, or pins the target in place." Holding a swimmer under is a hold, not a wound. `snare` is in the `claws` row? It is not: the `claws` row is strike, rake, crush, shove, ambush. Signature rule 4 permits an instrument outside the allowed-actions matrix, and section 5.7a says a signature a conduit would explain must declare the conduit instead. Here water is the medium and `snare` is in the water conduit row, so the honest reading is that this is a conduit case; I did not declare `claws` as a water conduit because the conduit predicate requires a source showing the element leaving the body through the part, and no such sentence exists. I took the signature-rule-4 exception instead and record the strain below.
- `medium: water`: the primary element; the act happens in water and the description places its advantage there.
- `intensity: [30, 70]`: a mid band for a creature whose one explicit rating is a low defense; nothing in either source argues for the top of the scale.
- `name: Sixteenfold Undertow`: grander register, two words, no possessive, no hyphen, no borrowed or real-world reference. Collision scan run case-insensitively across all fourteen `consolidated-*.md` files and `neutral-pools.md` for the exact string: zero matches. The word Undertow alone appears in several cells, but the exact name does not. No catalog ledger note reserves a signature name for Newtapede; a grep for the species name across the whole `docs/ability-catalog/` folder returns only anatomy-sweep notes about it needing authored anatomy, which is a planning note and not a reserved name.
- `description`: canon voice, present tense, one line, no mechanics, no flourish, states only the act.

## Authored fields (no supporting source sentence)

- `covering: bare`: registry default when neither source names a surface.
- `anatomy: claws`: read from the art's splayed long-toed feet; the description names no digit.
- `anatomy: jaws`: inferred from the art's head shape; neither source names a mouth or a bite.
- `anatomy: antennae`: shown in the art but never named in text.
- `diet: omnivore`: registry default for a flesh body when the sources are silent on feeding.
- `communication: ["vibration", "display"]`: both inferred from the body and the medium; neither source shows it signaling.
- `senses.special: ["tremorsense"]`: inferred from the antennae and the aquatic segmented body.
- `senses.hearing`, `senses.smell` bands: inferred from the absence and presence of the corresponding art features.
- All `size` bands: the legacy figures are a relative gauge, and the bands around them are authored.
- All ten attribute bands except the two anchored to the legacy ratings; every one is an authored judgment.
- `capabilities.burrow`, `climb`, `sprint`, `leap`, `manipulation` bands: authored from the art's limb count and body shape.
- `temperatureC.max` of 40: the planet range permits up to 67, and 40 is an authored working ceiling.
- `traits: pack-bonded 30` and `protective 10`: the weakest evidence lines in the pool, resting on the planet's collective-labor register rather than any sentence about this species.
- `archetypeWeights` shape: the four keys and their percents are a judgment about how the body reads, not a source claim.
- `intensity: [30, 70]`: authored band.

## Thin-combo findings

Instruments are `claws`, `jaws`, and `body`. Mediums are water (primary) plus the on-graph secondaries ice, plant, and chemical. Cell counts, taken from each consolidated file's own per-action headers:

- water: strike 78, lash 79, crush 39, rake 116, shove 153, drain 52, ambush 48, beam 33, hurl 23, spray 54, burst 72, cloud 50, snare 94, ward 46, mend 91, terrorize 40.
- ice: every action 32 or above (lowest is cloud at 32).
- plant: every action 25 or above (lowest is beam at 25).
- chemical: every action 55 or above (lowest is mend at 55).

The relevant combos are `claws` x {strike, rake, crush, shove, ambush}, `jaws` x {strike, crush, rake, drain, snare}, and `body` x {strike, crush, shove, ward, burst, terrorize}, each crossed with the four mediums. The smallest cell any of those touches is water hurl at 23, which `body` and `claws` and `jaws` do not use anyway; the smallest actually reachable cell is water crush at 39. Every reachable cell is far above the threshold of 6, and the neutral pools add to each. **No thin combos found.** Instrument tags were not a limiting factor: none of the three instruments is a rare tag, and `body` is the universal fallback.

## Rule strain (operating rule 7)

Two cases, both complied with as written:

1. **The `claws` row does not allow `snare`, and the conduit predicate cannot be satisfied for a species whose description names no part.** The natural signature for a sixteen-legged aquatic grappler is holding a target under with its legs, and the water conduit row allows `snare` exactly. But the conduit predicate requires a source showing the element leaving the body through the part, and this species' description names no part at all, so no conduit can ever be declared for it under the rule as written. I complied by taking the signature-rule-4 matrix exception. Smallest fix: allow a conduit to be declared from the medium plus a body-plan reading when the species is on the section 8 authored-anatomy list, or add `snare` to the `claws` physical row, since a raptorial grip that pins is what `talons` already gets (`talons` has snare; `claws` does not, and the difference is not obviously principled for a sixteen-legged gripper).

2. **No trait sits at 100, which is unusual for the corpus but forced and correct here.** Resolved 2026-09-08 by the iteration-three ruling; four entries now sit at 100 and the case below is kept only as the record of how the pool read before it.

    The body demands nothing: it is corporeal, unarmored, unrooted, and not luminous, so no trait is universal. The rule as written permits this (it requires at least one trait strictly between 0 and 100, not one at 100), so there is nothing to fix; I record it only because every prior species in this batch had a body-demanded 100 and a reviewer may expect one.

## Script denials

Three FAILs were raised, all on run 1, all on the same run; run 2 came back clean. Each is recorded with the value I had proposed, the script's message, and what I did.

1. `capabilities.flight` proposed as the scalar `0`. Script: 'capabilities.flight must be a [lo, hi] band of integers 0 to 100'. Changed to `[0, 0]`. The denial is legitimate in shape but I think the original was the better idea and the rule is slightly wrong: the section 4 contract and the section 5.5 definition both say 0 means it cannot, and a species that cannot fly has no band to roll, so `[0, 0]` is a two-element encoding of a fact that has one value. Every consumer now has to handle a degenerate band. Smallest fix: let the script accept either a band or the scalar 0 for a capability, and normalize the scalar to `[0, 0]` on read. I complied and passed the point with `--note` on run 2.

2. Walkthrough em-dashes. Script: 'walkthrough contains an em-dash'. I had used em-dashes as the separator between a judgment label and its evidence throughout, including in the title line. Replaced every one with a colon, which is what section 3 prescribes. Legitimate denial, no complaint; the rule is stated in the skill and I broke it out of habit in the evidence-line format.

3. A quotation trimmed at its head. Script: 'double-quoted text not found verbatim in species.json, the planet history, or the registry: "including bitterly cold polar regions"'. I had quoted a fragment of the planet sentence starting mid-clause; the verbatim text is 'including temperate continents and bitterly cold polar regions'. Restored the full clause. Legitimate denial and a good catch: the trimmed fragment read as if the history said the poles alone, which is exactly the kind of drift the check exists to stop.

The one standing WARN, `signature.action.matrix`, is answered in the signature section and in rule strain case 1 above: `snare` sits outside the `claws` physical row and inside the water conduit row, and the conduit predicate cannot be satisfied because this species' description names no part at all, so the signature takes the signature-rule-4 matrix exception instead.

## Open questions for Nick

Should the Newtapede's high legacy recovery rating be read as the `regenerative` trait at a much higher percent than the 35 I gave it? The legacy `statRatings` block for this species has exactly two filled fields, specialDefenseRating low and recoveryRating high, which makes recovery the single strongest relative signal the legacy data gives about it, and on a planet whose entire economy is the galaxy's only healing substance a fast-repairing body is thematically the most Poseidas thing a creature could carry. I held it to 35 because the skill is explicit that legacy numbers are a relative gauge and never a source sentence, and no prose in either file says this creature repairs itself. My recommendation was to leave it at 35 for this run and revisit it as a batch decision across all Poseidas species once Hippochamp is migrated, so the two species of the planet get a consistent reading of what a high legacy recovery rating means. Answered 2026-09-08: Nick ruled that a high `recoveryRating` names `regenerative` as a species-wide fact, so the entry is at 100 and this question is closed.

## Validator output

Re-run 2026-09-10 after the trait re-derivation, `node docs/species-templates/tools/validate-template.js newtapede`:

```
WARN temperature.planet             validated against the legacy planets.json extremes only; planetRecords.json habitable band unavailable
WARN enc.definition.elementkey      encyclopedia definition uses element key word(s) as plain words: water (allowed only as ordinary English, never as a type label)

0 FAIL, 2 WARN (structurally clean; every WARN must be answered in the walkthrough)
```

`enc.definition.elementkey` is unchanged from the prior run and already answered in the surrounding prose (the encyclopedia entry uses "water" as ordinary English, never as a type label). `temperature.planet` is new this run and does not concern the trait pool: the worktree's `planetRecords.json` no longer carries an `environment.habitableBandC` block for Poseidas (it was rebuilt to a `physical`/`report`/`history` shape without that field), so the script falls back to the legacy extremes file rather than failing. This is a data-schema gap, not a trait-pool finding; the temperature band itself was not touched by this re-run.

## Orchestrator amendments

- 2026-09-02, after the independent validation and the orchestrator's own look at the art: the rig job, algae trawling (the source's subject is the rigs), deck hauling, death-tide survival and the deep-cities workplace were all invented for this species; rewritten to the two source sentences and the planet-level facts. `claws` and `jaws` removed from anatomy and instruments: the art draws pad-tipped splayed toes and no mouth at all (the text's 'webbed feet' wins over the art for the feet, and no registry key names a webbed foot). `coils` added (a long segmented body that wraps, the registry's wrap-and-crush body) and the signature moved to coils / snare, inside the physical row, so the rule 4 exception is gone. Encyclopedia's 'faster in the sea than on land' replaced with the source's own combat claim. `regenerative` stays at 35 (legacy ratings are a gauge, not a sentence). Art matched the run's reading.
- 2026-09-07, trait evidence bar (Nick): cut `regenerative`, `pack-bonded`, `stealthy`, `protective`; pool expected count 2.70 to 1.80.
- 2026-09-07, trait evidence bar iteration two (Nick): restored `regenerative`; cut none; expected count 1.80 to 2.15.
- 2026-09-08, trait evidence bar iteration three (Nick): added `hardened` at 100; raised `resistant` 90 to 100, `regenerative` 35 to 100, `perceptive` 25 to 100; cut none; expected count 2.15 to 4.65.
- 2026-09-08, pool shape (Nick): required `slippery`; rolled `regenerative` 35, `hardened` 25, `resistant` 20, `perceptive` 20; expected count 4.65 to 2.00.
- 2026-09-08, new keys (Nick): `grappling` added to the registry as a body stronger holding what it has caught, and it takes the required slot on the signature that holds a swimmer under; `slippery` moves into the rolled set ranked first on its species sentence and the art (the instruction cited a legacy high `evasionRating` this species does not have; friction recorded); the rolled set re-shared as `slippery` 30, `regenerative` 25, `hardened` 18, `resistant` 14, `perceptive` 13; no entry cut and the pool sits at six, the cap; expected count 2.00 unchanged.
- 2026-09-08, orchestrator: rolled ranking corrected to the rule as written; Newtapede carries no evasionRating, its one high legacy rating is recovery, so regenerative ranks first (30) and slippery second (25); the fold note above that ranked slippery first on a misattributed rating is superseded.
- 2026-09-09, lore split (Nick): description reverted to species.json; body and habits authored; descriptionStatus removed.
