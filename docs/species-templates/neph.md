# Neph: migration walkthrough

## Art reading

The artwork shows a single body, drawn as a jellyfish seen from slightly below. A large smooth rounded bell dominates the upper two thirds of the frame, its outline unbroken and untextured, with the lower rim flaring outward like a skirt on both sides. Under the crown of the bell hangs a dark ridged inner mass, segmented into about seven lobes, and from the underside of that mass drops a curtain of fine short filaments. Below the bell sits a rounded central body carrying two small round eyes set close together. Radiating from that central body are roughly eight long, thick, tubular tentacles that curve outward and downward across the frame; each is drawn as a hollow tube, and several of them end in a clearly open circular mouth so that the inside of the tube is visible. There are no wings, no fins, no legs, no jaws and no visible mouth on the central body. Posture is drifting: nothing touches a ground plane and the tentacles trail loose.

## Description status

`source`. The species.json description is already in the full register: it opens with a body appositive ("Colossal hydrogen jellyfish that travel in free-floating herds across Saiphus's lower atmosphere"), names the engineered purpose ("the Neph are instrumental to the Benthane industry"), and runs to 128 words in one paragraph, present tense. Carried verbatim, no clauses added.

## Judgments

Every line names its source as `species` (the species.json description), `planet` (the Saiphus history or data block), or `art`.

### Physiology

- corporeality `corporeal`: species, "These domesticated creatures roam the clouds in flocks": a body that is herded, milked and grazes is a physical one.
- composition primary `flesh`: species, "Colossal hydrogen jellyfish". Registry rule, quoted from this skill: "A gas a body is filled with or buoyed by is not its composition: a hydrogen-filled jellyfish is `flesh`." No secondary: no second structural substance is named or drawn.
- bodyPlan `floating`: art shows no wings and no fins, and planet, "living gasbags that floated effortlessly through its atmosphere". Registry: a body held up by gas with no wings and no fins is `floating`.
- covering `bare`: neither source names or shows a surface. Art outline is smooth and untextured, which per the covering rule shows nothing. Default for an unnamed surface. Authored.
- anatomy `tendrils`: species, "long, trailing tentacles that vacuum up valuable Benthane along with their food"; art shows eight tubular tentacles.
- anatomy `vents`: species, "Neph can also forcibly expel jets of Benthane gas ... from their tentacles"; art shows the tentacle ends drawn as open circular tubes. The registry defines `vents` as pressurized discharge openings anywhere on the body, which is exactly what the tentacle ends are here.
- anatomy, nothing else: the art shows no jaws, beak, claws, spines or wings, and the description names no other part. Eyes are sense organs and never anatomy per the registry.
- size `heightCm [380, 620]`, `weightKg [30, 90]`: legacy gauge is 457 cm and 54 kg, used as a relative gauge only. The height is kept in the same region because the description calls it "Colossal" and the art is bell plus long trailing tentacles, so the figure reads as total drop rather than a shoulder height. The weight band sits low against that length on the sourced fact that the body is a hydrogen gasbag: species, "being composed almost entirely hydrogen", and planet, "colossal hydrogen jellyfish who's lighter-than-air bodies skimmed the clouds in vast flocks". A lighter-than-air body cannot mass what a solid animal of that size would.
- lifespan `standard`: composition is flesh, so cut 3 applies; band midpoint is 60 kg, which falls in the 20 to 200 kg `standard` band. No adjustment: no armored covering, and no source sentence calls it cold, slow, or long-lived. No harshness cut: no sentence says the environment shortens Neph life. Note that the flock-ignition history is deliberate destruction by workers, not an environmental shortening, so cut 4 does not fire.
- genome.chirality `rolled`: default; the body is flesh with ordinary chiral chemistry.
- diet `herbivore`: species, "grazing off of the biochemicals and atmospheric plankton contained in the gas-liquid slush of Saiphus's deeper atmosphere". The registry settles `herbivore` on grazing or filtering plant matter or plankton. It takes up Benthane at the same time, but Benthane is the industrial product, not the food, and the registry says a creature that stores or channels an energy but is not shown feeding on it is not an energy-feeder.
- communication `["chemical"]`: the only signaling the sources support. Species, "travel in free-floating herds", and planet, "flocks of peaceful, roaming Nephs" - a herding body with no vocal organ named or drawn and no display feature drawn. Chemical signaling through the atmosphere is the minimum honest value for a flocking animal with no named organ. Authored; `vocal` and `display` were rejected because no source shows a call or a light pattern, and an empty array was rejected because the flocking is sourced twice.
- breathes `["gas"]`, ambientMedia `["gas"]`: planet, "Saiphus has a thin life band in its upper atmosphere, where the temperature and pressure are tolerable for the Vallerii", and the creature lives in the atmosphere throughout. `breathes` is a subset of ambientMedia.
- temperatureC `[-60, 45]`: planet data block gives Temperature Low -66 C and Temperature High 58 C, so the band lies inside the planet range. Narrowed at both ends because the Neph works a middle altitude band rather than the extremes: planet, "Deep in its lower atmosphere, Saiphus contained vast quantities of a rarified gas known as Benthane".
- capability `flight [55, 75]`: planet, "living gasbags that floated effortlessly through its atmosphere". Sustained and effortless, so the band tops above 60, but it is buoyancy rather than power, and planet, "Their amorphous forms allowed them to be swept up and deposited harmlessly by the hurricane-force winds", shows the wind wins over its own direction.
- capability `swim [10, 25]`: planet describes the medium beneath as a supercritical fluid, "the gas beneath is dense enough that it forms a supercritical fluid", and the Neph reaches down into "the gas-liquid slush" (species). It is not a swimmer, but a low band is honest for a body that works a gas-liquid boundary. Authored band width.
- capabilities `burrow [0,0]`, `climb [0,0]`, `leap [0,0]`: no legs, no gripping limb that meets ground, nothing in either source.
- capability `sprint [5, 15]`: legacy speed rating is low and the art shows no propulsive organ; a drifting gasbag has almost no ground burst.
- capability `manipulation [40, 65]`: upper bound above 40 is licensed by grasping anatomy, `tendrils`. Species, "these same tentacles can be used to pull in opponents with considerable suction".
- senses `sight [25, 45]`: art shows two small eyes on the central body, small relative to the bell. No source sentence supports a keen-sight band, so it stays under 60.
- senses `hearing [20, 40]`: no organ drawn or named. Authored, minimum honest for an animal that holds a flock together.
- senses `smell [55, 80]`: species, "grazing off of the biochemicals and atmospheric plankton" - it locates dispersed chemical food in open air, which is a chemical sense doing real work. Kept under 80 because no sentence calls it exceptional.
- senses `special` omitted: no source supports any of the six special senses.

### Instruments and conduits

- `tendrils`: species, "long, trailing tentacles that vacuum up valuable Benthane along with their food" and "can be used to pull in opponents with considerable suction". This is the part the description actually works and fights with.
- `vents`: species, "Neph can also forcibly expel jets of Benthane gas ... from their tentacles in order to blast their enemies with freezing air", and "the Neph can also spray their enemies with bouts of flammable gas".
- Only two instruments; a third would have to be authored, and the description gives no other working part.
- conduit `vents: air`: species, "these same tentacles can be used ... to jettison air at high pressure". Air power leaving the body through the discharge openings, shown rather than implied. This grants `vents` the air medium row (shove, burst, cloud, hurl, lash, ward) on top of its physical row.
- No conduit declared for `tendrils`: the suction and the pulling are mechanical, not an element leaving the body.

### Archetype weights

Shape: one dominant nature with a short tail, because the description reads overwhelmingly one way. Sum is 100.

- `survivor` 45: species, "These domesticated creatures roam the clouds in flocks", and planet, "Their amorphous forms allowed them to be swept up and deposited harmlessly by the hurricane-force winds that plagued the lower skies". Vitality and endurance is the whole reading of a peaceful grazer that survives storms by not resisting them.
- `bulwark` 25: a large low body that absorbs rather than dodges; species shows its defenses as pulling in and blasting back rather than evading, "When threatened, these same tentacles can be used to pull in opponents".
- `sage` 20: the willpower half of a creature that endures. Species shows it grazing a diffuse field, "grazing off of the biochemicals and atmospheric plankton", which is patient work rather than pursuit.
- `seeker` 10: it finds dispersed food across a sky, same sentence.
- Rejected: every strength, agility and reflex archetype. Legacy speed rating is low and nothing in either source shows it closing on anything.

### Attribute bands

Legacy `statRatings` used as a relative gauge only: specialAttackRating high, speedRating low, everything else blank.

- `strength [30, 55]`: species, "pull in opponents with considerable suction" - real pulling force, but from suction rather than muscle.
- `vitality [55, 80]`: species, "Colossal", a very large body.
- `endurance [55, 80]`: planet, "roam the clouds in flocks" and continuous grazing across an atmosphere.
- `agility [10, 30]`, `reflex [10, 30]`: legacy speed low; planet, "swept up and deposited harmlessly by the hurricane-force winds" - it does not steer against weather.
- `intelligence [10, 25]`: planet, "the pastoral activity of shepherding and “milking” Benthane gas from flocks of peaceful, roaming Nephs" - a herded grazer. Well below true-human range as canon requires.
- `willpower [25, 45]`: nothing in either source shows mental fortitude or its absence. Authored, held near the middle-low.
- `instinct [35, 60]`: species, it finds dispersed plankton and biochemicals across open sky.
- `charisma [20, 40]`: no presence claim in either source; it is livestock in the present day. Authored.
- `resilience [15, 35]`: low deliberately. Planet, "entire flocks of Neph, being 95% hydrogen, were being ignited in protest" and "the high flammability of the Neph also made them a cheap form of explosive ordinance" - a body that a spark destroys is not a tough one. This is the vitality versus resilience pair working as designed: big and hard to exhaust, easy to pop.

### Trait pool

Expected count is 3.40 traits per individual (`volatile` 1.00 + `pack-bonded` 0.90 + `slippery` 0.70 + `resistant` 0.45 + `protective` 0.30 + `menacing` 0.05). There is no exclusion pair in this pool because `solitary` is not listed, so no exclusion adjustment applies.

- `volatile` 100: body-demanded. Species, "being composed almost entirely hydrogen means that the Neph can also spray their enemies with bouts of flammable gas", and planet, "entire flocks of Neph, being 95% hydrogen, were being ignited". Every Neph is hazardous to strike. This is a fact of the body, so it is universal.
- `pack-bonded` 90: species, "travel in free-floating herds" and "roam the clouds in flocks", both about this species by name, not a planet-wide sentence. Not 100 so that Generator variance can produce a solitary drifter. `solitary` is not listed at all, so it has a 0 chance; the two exclusion partners therefore cannot both land.
- `slippery` 70: planet, "Their amorphous forms allowed them to be swept up and deposited harmlessly by the hurricane-force winds". A body that a hurricane cannot damage by seizing is a body that is hard to hold. This is a sentence about the Neph specifically, not a planet-wide one.
- `resistant` 45: planet, "Sulfuric acid clouds sweep haphazardly across the sky, choking the life out of anything they happen to touch". An environmental adaptation, which the rules permit a planet-wide sentence to justify. Held well below 100 because the same sentence says the clouds kill anything they touch, so the adaptation is clearly partial.
- `protective` 30: species, "When threatened, these same tentacles can be used to pull in opponents with considerable suction". A herd animal whose response to threat is to seize the threat rather than flee. Modest percent because the sentence describes self-defense, and shielding others is an inference from the flocking.
- `menacing` 5: rare. Planet shows Neph used as ordinance, "a cheap form of explosive ordinance to be hurled at the corporate muscle", so a minority of individuals reading as frightening is defensible, but this is a use others put it to rather than a presence it projects, so it stays at the floor.
- Left out and why: `armored` (no armored covering and no `shell`); `anchored` (a body that the wind carries is the opposite); `regenerative` (no source); `toxic` (its discharges are cold and flammable, not debilitating agents); `reflective`, `hypnotic`, `foresighted`, `telekinetic`, `mind-sealed`, `stealthy`, `healing` (nothing in either source); `nocturnal` (Saiphus is not a night world; the history describes sunrises across the whole sky); `luminous` (the planet history's bioluminescent zooplankton are a different organism, and reading that onto the Neph would be exactly the planet-wide-to-species error the rules forbid); `inspiring`, `ramming`, `phasing`, `perceptive`, `solitary`.

### Element

Primary `air` from species.json `type`, stored at affinity 100. On-graph secondaries for air are electric, water and ice; the template does not pick one. `affinityOdds` omitted, inheriting the 75/25 baseline: nothing in the sources argues the Neph is unusually likely or unlikely to carry a secondary.

### Signature ability

Lore-defining act, quoted: "Neph can also forcibly expel jets of Benthane gas, which is typically used a coolant for starship engines, from their tentacles in order to blast their enemies with freezing air." This is the act the whole planet economy is built on, turned outward.

- instrument `vents`: the effect terminates at the open tentacle ends, which the art draws as hollow tubes. The tentacle is the pressure line; the discharge opening is where it leaves the body, and the registry names that `vents`.
- action `spray`: the registry defines spray as a projected stream or shower of matter over an area or line, which is a jet of gas. `vents` allows spray on its physical row, so no conduit exception is needed.
- medium `ice`: "freezing air" is the stated effect, and ice is an on-graph secondary of air. Cross-checked against the ice medium row, which includes spray.
- intensity `[35, 80]`: a wide band because the Neph's stored Benthane volume is what powers it and the description gives no ceiling.
- name `Benthane Coldwind`: grander register, two words, no possessive, no hyphen. Collision scan run case-insensitively across all fourteen `consolidated-*.md` files and `neutral-pools.md` for `Benthane Coldwind`, `Coldwind`, `Benthane`, `Benthane Squall`, `Deepsky`, `Squall Shepherd`, `Cloudgrazer`, `Coldjet` and `Frostjet`: zero hits for any of them. No catalog ledger note reserves a signature for the Neph; a case-insensitive search for `neph` across all fifteen catalog files returned nothing.
- description: one line, canon voice, no mechanics.

### Encyclopedia entry

Opens on the species name and the category noun. Both sentences are built only from the species description and the Saiphus history: the jellyfish body, the flocks, the tentacles that draw up Benthane and plankton, the Benthane industry it was generated for, and the coolant role that the planet history states, "could be refined and processed into several derivative gases that served as effective Tachyon Drive Core coolants, even at the immense heats generated from FTL travel". Ends on a plain present-tense fact, no flourish.

## Authored fields

Values with no supporting source sentence, recorded here because the JSON carries no provenance:

- `covering: bare` - neither source names or shows a surface; registry default.
- `communication: ["chemical"]` - flocking is sourced, the modality is not; minimum honest value for a herding body with no named or drawn signaling organ.
- `senses.hearing [20, 40]` - no organ named or drawn.
- `attributes.willpower [25, 45]` - no source either way.
- `attributes.charisma [20, 40]` - no source either way.
- `capabilities.swim [10, 25]` - the gas-liquid slush is sourced; the band width is authored.
- `size` band widths - the legacy figures are a relative gauge only, and the low weight band is reasoned from the sourced hydrogen buoyancy rather than measured.
- `lore.biomeNiche` phrasing - assembled from sourced planet facts, but the wording is mine.

## Thin-combo findings

Instruments are `tendrils` and `vents`; media are air (primary) plus each on-graph secondary (electric, water, ice). Counting names in the element cell plus the neutral pool for each action:

- `tendrils` physical row is lash, snare, crush, drain, shove, strike. Smallest cell across the four media is electric crush at 10 names, plus the neutral crush pool. Every other combination is 23 or more before the neutral pool is added.
- `vents` physical row is spray, cloud, burst, ward, and the declared air conduit adds shove, burst, cloud, hurl, lash, ward for the air medium only. Smallest cell is ice cloud at 32 names.
- No combination falls below 6 names on its element cell alone, so there are no thin-combo findings for this species. The electric crush cell at 10 is the thinnest in reach and is worth noting for whichever species eventually leans on it, but it is above the threshold.

## Script denials

The script raised two FAIL lines on the first run, both legitimate, both mechanical rather than substantive. Neither changed a judgment about the species.

- `md.emdash`: 'walkthrough contains an em-dash'. One em-dash had slipped into the corporeality line. Original: `species, "These domesticated creatures roam the clouds in flocks"` followed by an em-dash and the reasoning. Changed to a colon before the reasoning, which is the form section 3 prescribes. Legitimate denial, the rule is right, nothing lost.
- `md.quote`: the quoted planet sentence about shepherding and milking Benthane was not found verbatim. Cause: I had transcribed the source's curly quotation marks around the word for milking as straight single quotes. Fixed by restoring the source's own characters. Legitimate denial, and a useful one, since it is exactly the character-for-character check the skill promises.

Two further values were corrected by me before the first validator run rather than by the script, recorded here for completeness:

- `senses.special: ["chemical"]` was my first draft. `chemical` is not in the six-key special-sense enum, and on rereading the registry the Neph's chemical acuity belongs in the `smell` band rather than as a special sense. Changed to omitting `special` entirely. The registry is right here; a chemical sense that finds dispersed plankton is what `smell` is for.
- `hide` was in my first anatomy draft alongside `tendrils` and `vents`. The registry defines `hide` as an unarmored body surface used defensively, and neither source shows the Neph defending with its surface; its defenses are all tentacle work. Removed. Note that this interacts with the covering rule that a flesh animal carrying the `hide` anatomy key takes the `hide` covering: had I kept `hide`, the covering would have flipped from `bare` to `hide`, which would have been wrong for a membrane balloon. Removing the key was the correct resolution rather than fighting the covering rule.

One rule strained, recorded under operating rule 7 rather than worked around:

- The `lifespan` rubric cut 3 runs on the mass midpoint of the authored weight band, and the authored weight band for a lighter-than-air body is unusually low for its size. The Neph is 380 to 620 cm of body at 30 to 90 kg, so it lands at `standard` on a 60 kg midpoint, while a solid animal of the same dimensions would land at `long`. I complied and wrote `standard`. The smallest fix, if Nick wants one: cut 3 could gauge a `floating` body by its linear size rather than its mass, since buoyant bodies systematically under-mass their volume and the rubric's intent is clearly a size-and-metabolism proxy. I do not think the outcome is wrong for the Neph specifically - a gasbag that a spark destroys reads as decades, not a century - so this is a note for the rubric, not a request to change this template.

One WARN answered by a change rather than by argument:

- `traits.expected`: 'expected trait count 3.52 is above 3.5; confirm the species is meant to carry that many'. On rereading my own pool, the entry pushing it over was `healing` at 12, which was the only percent in the pool with no source sentence behind it at all. I had put it there so the pool would not read mechanical. That is not a reason the source supports, so I removed it rather than defending it, and the expected count fell to 3.40. The WARN did its job.

Two WARN lines answered without a change:

- `conduits.source`: the validator agent is asked to confirm the sentence. It is species.json, and it is quoted in the Instruments and conduits section above: air power leaving the body through the discharge openings is stated outright, not inferred.
- `signature.description.elementkey`: the first draft of the signature description ended on the words freezing air, and the script correctly flagged that the element key `air` was sitting in prose where it could read as a type label. Rewritten to end on a freezing white plume, which says the same thing without the registry word. Legitimate warning, and the replacement line is better prose.

## Open questions for Nick

The weight band is the one number I would most like you to look at. I put the Neph at 30 to 90 kg against a body 380 to 620 cm long, which is far lighter than a solid animal of that size, because the description says it is "composed almost entirely hydrogen" and the planet history calls the flocks "lighter-than-air bodies". The legacy figure was 54 kg, so my band brackets it rather than departing from it. But that low mass is what drops the lifespan rubric from `long` to `standard`, so the two judgments are coupled: if you would rather the Neph read as a centuries-drifting fixture of the Saiphus sky, the way to get there is to raise the weight band, not to overrule the rubric. Do you want it heavier?

## Validator output

Final run, pasted verbatim:

```
WARN conduits.source                conduit vents for air: the validator agent must confirm the sentence or art showing the element leaving through this part

0 FAIL, 1 WARN (structurally clean; every WARN must be answered in the walkthrough)
logged to docs\species-templatesalidation-log
eph.jsonl
```

The single remaining WARN is answered in the Script denials section above and in the Instruments and conduits section: the conduit sentence is species.json, 'these same tentacles can be used ... to jettison air at high pressure'.



## Orchestrator amendments

- 2026-09-02, after the independent validation (PASS) and the orchestrator's own look at the art (single floating bell, eight tubular tentacles with open ends, two eyes): no value changed. Weight band kept at 30 to 90 kg on the sourced buoyancy; lifespan `standard` follows the rubric, and the rubric note about floating bodies is carried to the rulings file.
- 2026-09-02, planet rebuild: `temperatureC` re-banded from [-60, 45] to [-30, 45] (intersection) against the rebuilt planet record's habitable band [-30, 45] C; the old band was validated against the legacy planetary extremes, which are not survivable. Any gravity figure cited in this walkthrough predates the rebuild; the current value is `physical.derived.gravityEarth` = 1.79.
