# Terragoyle migration walkthrough

Species key `terragoyle`, element `rock`, home planet `stonera`. Sources read in full: the Terragoyle entry in `species.json`, the Stonera `history` array and `data` block in `planets.json`, and the artwork at `docs/species-templates/art/terragoyle.png`.

## Art reading (what I actually see)

A single body, drawn front on, hunched low. Two ridged horns curl up and back from the top of the skull, ribbed along their length like a ram's. The face carries two eyes, a small nose, and a closed level mouth; no visible fangs, beak, or tusks. The trunk is heavily muscled and bare, with pectorals and a segmented abdomen drawn as line work on smooth skin, not as plates, scales, or fur; the silhouette edge is smooth everywhere, so the art shows no covering of its own. Two arms hang from broad shoulders and descend between the splayed knees so that both hands reach the ground, fingers spread and clearly touching the surface, taking weight. Two thick legs are folded in a deep crouch with the feet flat and splayed, toes visible and gripping. A pair of large membranous wings, ribbed with finger struts in the bat pattern, spread wide from the shoulders. One long tail rises from behind the body, sweeps up and over the head, and ends in a flared cradle of five backswept points; above that cradle, separated from it by a clear gap, floats a rough irregular ball of stone, unattached and held in the air. That gap is the whole point of the drawing: the stone is not gripped, it hangs.

Four limbs bear weight in this pose. The forelimbs are not held clear, they are planted.

## Lore

The lore split (Nick, 2026-09-09). `lore.description` was already the species.json teaser verbatim and is unchanged; body and habits below are new, and both were written to add to the teaser rather than restate it.

### appearance (6 entries)

- Horned, vaguely humanoid bat, hunched on all fours
- Very heavy for its height
- Ribbed ram-like horns curling back from the skull
- Large membranous wings
- Bare muscled hide
- Long tail ending in a cradle, with a ball of stone levitating above it

Appearance list (Nick, 2026-09-09, second pass after his corrections): one presentation quality per entry; relative size words only; physical presentation only (no sense capability, no behavior); no absent-anatomy entries unless the absence is the form itself; no defaults such as "unarmored"; no definitive claims that would fence future lore; the art is a source for major visible features but never for how a feature is shaped, angled or counted. Every list re-checked against the artwork by the orchestrator on this pass.

### habits (113 words)

It holds the rim above a planetary strip-mine that spirals down into the Chasm, where Kozrak's enforcers work Stonera's war refugees for whatever the liquid metal below is worth, and it holds that rim in a line rather than alone. Most of the time it holds it as a statue, vitals arrested, spending no more than the rubble around it. The ground carries a footfall to it long before anything shows against the gray sky, and then it is up in the static-crackling air with the stone riding over the cradle of its tail, flinging boulders and gravel down onto whatever is climbing. Going up into that air costs it something every time.

| Claim | Source |
|---|---|
| Holds the rim above a planetary strip-mine that spirals down into the Chasm | species.json: "Terragoyles can be found lining the edges of the Chasm"; planet: "A planetary strip-mine now dominates the Chasm, spiraling deep into the hollow earth"; record `lore.biomeNiche` and `traits.pool.territorial` at 100 |
| Kozrak's enforcers work Stonera's war refugees for whatever the liquid metal below is worth | planet: "where Kozrak’s enforcers exploit Stonera’s war-torn refugees as a captive labor force, squeezing them for every last ounce of profit to be made" and "a gaping hole now descends into a deep ocean of liquified metal and rich minerals of unimaginable value" |
| Holds that rim in a line rather than alone | species.json: "Terragoyles can be found lining the edges of the Chasm" (the one sentence in either source that puts more than one of them on the ground at once) |
| Most of the time it holds it as a statue, vitals arrested, spending no more than the rubble around it | species.json: "now stand guard over the perimeter in a statue-like state, hibernating to conserve their energy until a threat is detected"; record `traits.pool.dormant` |
| The ground carries a footfall to it before anything shows against the gray sky | record `senses.special`, `tremorsense`; record `physiology.senses.hearing` [60, 85] against `sight` [55, 80]; planet: "The debris from such collisions have launched enormous swathes of dirt into the air, dying the sky a dusty grey" |
| Then it is up in the static-crackling air | species.json: "When awoken, Terragoyles rise high into the sky"; planet: "the rubbing of these particulates in the atmosphere generates colossal static discharges that crackle pervasively in the lower atmosphere"; report `terrain.features`, atmospheric dust saturation with static discharge; record `traits.pool.insulated` |
| With the stone riding over the cradle of its tail | art (a five-pointed cradle at the tail tip with the stone held clear above it); species.json: "elongated tails tipped with a levitating ball of stone" |
| Flinging boulders and gravel down onto whatever is climbing | species.json: "using their tails to levitate boulders and fling them like great flying catapults across the Chasm beneath them or to carpet bomb intruders with strafing runs of gravel and rock as they soar overhead" |
| Going up into that air costs it something every time | Stonera Generator report `mobility.flight`, inefficient, debris and static exposure |

No feeding claim was authored: neither source shows this species feeding, and `physiology.diet` reads `omnivore` as the no-evidence fallback, so habits says nothing about what it eats. The Jorian Belt bombardment clause of the first pass was cut for room; the dusty sky and the static in the air still carry it, and the field now spends its length on what the creature does from the rim rather than on what falls on it.

## Description status

`source`. The `species.json` description is 105 words, one paragraph, present tense, and already runs the full register: it opens with a body appositive, `Resembling horned and vaguely humanoid bats with elongated tails tipped with a levitating ball of stone`, gives the engineered purpose, "They were originally used to airlift debris out of Stonera's strip mines with their levitational tails", and turns to the present day anchored to a named place, "but now stand guard over the perimeter in a statue-like state, hibernating to conserve their energy until a threat is detected." Carried verbatim, including the source's own spelling of `levitating`, because a source-status description is copied character for character and is not silently corrected. Flagged as an open question below.

## Judgments, one line each with evidence

### Lore

- `element: rock`, `homePlanet: stonera`, `generatorPlanets: ["stonera"]`: species `type` is Rock and `planet` is Stonera; legacy species are home-only.
- `biomeNiche`, the rim of the Chasm strip-mine over a hollow of liquid metal: species, "Terragoyles can be found lining the edges of the Chasm"; planet, "A planetary strip-mine now dominates the Chasm, spiraling deep into the hollow earth where Kozrak's enforcers exploit Stonera's war-torn refugees as a captive labor force, squeezing them for every last ounce of profit to be made."

### Physiology

- `corporeality: corporeal`: species, "Terragoyles can be found lining the edges of the Chasm", a body that stands in a place and is struck at a perimeter; art shows a solid muscled figure.
- `composition.primary: flesh`: species describes it as a bat-like animal, "Resembling horned and vaguely humanoid bats"; the art draws muscle, skin, and a membrane wing. It is a rock-element creature, and per the registry the element never decides composition.
- `composition.secondary: mineral`: species, "elongated tails tipped with a levitating ball of stone". The stone is a fixed structural part of the resting body, present in the appositive that describes what the creature is, and drawn in the art at rest, so it qualifies as a structural second substance rather than a coating or an emission. This is the judgment I am least certain of and it is raised as an open question below.
- `bodyPlan: quadruped`: the description names no forelimb work at all, so the art decides, and in the art both hands reach the ground with fingers spread and take weight alongside the feet. The registry rule is explicit: `a creature whose forelimbs reach the ground as legs is quadruped, whatever pose it is drawn in`, and `a hand-user drawn resting on all fours is quadruped`. The word `humanoid` in the description describes resemblance, not stance, and the description's only stance sentence, "but now stand guard over the perimeter in a statue-like state", does not name a number of legs. Wings do not change the plan: a winged creature that stands is not `avian`, and this one is described standing guard and hibernating on the rim, not living on the wing.
- `anatomy: ["horns","wings","tail","hide","claws"]`. `horns`: species, "Resembling horned and vaguely humanoid bats", plus two ribbed curling horns in the art. `wings`: art, two ribbed membranous bat wings, and species, "Terragoyles rise high into the sky". `tail`: species, "elongated tails tipped with a levitating ball of stone". `hide`: the unarmored body surface used defensively; the art draws bare muscled skin with a smooth silhouette and neither source names plating, shell, carapace, or scale. `claws`: art, spread hooking digits on the hands that take the creature's weight on the rim and on the feet gripping the ground. One surface key only, `hide`, and `shell` is absent.
- No `core` and no `light-organs`: the stone at the tail tip is not shown emitting anything; it is lifted, and lifting is the `telekinetic` trait plus the tail conduit, not an emitter.
- `covering: hide`: the registry directs that a flesh animal body carrying the `hide` anatomy key takes the `hide` covering, and the art's smooth silhouette shows no fur, feather, scale, or plate edge. Listed under Authored fields because no source sentence names the surface.
- `size.heightCm: [150,185]`, `weightKg: [300,430]`: the legacy gauge is 163 cm and 380 kg, which reads as a short, extremely dense body, and that is exactly what the art draws, a compact crouched figure with a stone ball riding its tail. The band is authored around that gauge; the low height with high mass is kept because the description makes the creature a lifter of debris, "originally used to airlift debris out of Stonera's strip mines".
- `lifespan: long`: cut 3 by mass, a flesh body above 200 kg is `long`. No adjustment is available past `long`, and cut 4 does not apply because no source sentence says the environment shortens this creature's life.
- `genome.chirality: rolled`: a flesh body has chiral chemistry; the default applies.
- `diet: omnivore`: neither source shows it feeding, dissolving, draining, or preying on anything; the registry default for a flesh body with no feeding sentence is `omnivore`. Listed under Authored fields.
- `communication: ["vocal","display"]`: authored, and listed under Authored fields; the sources show no signaling at all. Kept minimal at two on the reading that a perimeter guard that wakes on a threat has to raise an alarm, but I flag that neither key has a sentence behind it and `[]` was the strictly honest alternative. Raised as an open question.
- `breathes: ["gas"]`, `ambientMedia: ["gas"]`: planet, "A dark, desolate and rocky planet with an incredibly thin atmosphere"; the creature is shown living and flying in that atmosphere, "Terragoyles rise high into the sky". Thin is still gas. `breathes` is a subset of `ambientMedia`.
- `temperatureC: {min:-45, max:25}`: the full Stonera habitable band the validator enforces. My first value was the `data` block band from `planets.json`, `Temperature Low` -28 C and `Temperature High` 34 C, taken whole rather than narrowed because the creature is described as stationary on an open rim through the whole year, "now stand guard over the perimeter in a statue-like state". The script denied that as reaching outside the habitable band it reads from a different file; see the denials section. The reasoning is unchanged: this species takes the entire band available to it rather than a sheltered sub-band, and the widest band the script permits is what the record now carries.
- `capabilities.flight [60,85]`: species, "Terragoyles rise high into the sky", and again "as they soar overhead"; `wings` in anatomy satisfies the predicate. High band justified by a sourced sentence.
- `swim [0,10]`: planet, "about 1% of Stonera's surface still held small bodies of water, mostly in the form of toxic, murky lakes"; nothing shows it swimming, and a 380 kg body is not built for it.
- `burrow [5,20]`: the planet's Xalian workforce sentence is planet-wide, "Xalians that could quickly dig their way to safety in the event of a meteor impact", and I do not carry a planet-wide sentence into this species as a capability; the band is authored low because this creature was engineered for the opposite job, airlifting from above.
- `climb [45,70]`: art, hooking claws on hands and gripping splayed feet, and species, "Terragoyles can be found lining the edges of the Chasm", a life spent on the lip of a vertical hole.
- `sprint [20,40]`: a heavy crouched quadruped whose whole described movement is aerial, "rise high into the sky"; kept below 60 with no source.
- `leap [35,60]`: winged and crouched, and the described takeoff is a rise from the rim; kept below 60 with no explicit source.
- `manipulation [45,70]`: the upper bound exceeds 40, which the registry permits with grasping anatomy; `claws` is in anatomy and the art shows spread gripping digits. The tail-borne lifting is separately covered by `telekinetic` at 100.
- `senses.sight [55,80]`: species, "hibernating to conserve their energy until a threat is detected", and the strafing runs require picking targets from height, "carpet bomb intruders with strafing runs of gravel and rock as they soar overhead".
- `hearing [60,85]`: same detection sentence; the art draws no external ear structure, and sense organs are never anatomy in any case.
- `smell [20,40]`: authored low, no source.
- `senses.special: ["tremorsense"]`: a body that spends its life pressed motionless against rock and must detect an approach across a canyon rim, "hibernating to conserve their energy until a threat is detected". This is the single special sense I claim and I note it rests on an inference from the detection sentence plus the posture, not a naming of the sense. Listed under Authored fields.

### Archetype weights

Authored as a judgment about this species, not a ladder. It is a stationary armored-in-posture sentry that absorbs and holds a line, so one nature dominates.

- `bulwark: 45` (vitality, resilience): species, "now stand guard over the perimeter in a statue-like state", the defining act is holding a place.
- `stalwart: 25` (resilience, willpower): the hibernating vigil is endurance of will as much as body, "hibernating to conserve their energy until a threat is detected".
- `juggernaut: 20` (strength, resilience): a 380 kg lifter of mine debris, "originally used to airlift debris out of Stonera's strip mines with their levitational tails".
- `predator: 10` (instinct, reflex): the wake-and-strike turn, "When awoken, Terragoyles rise high into the sky". Kept smallest because hunting is not what it does; reacting is.
- Sums to 100. No entry below 5.

### Attribute bands

Legacy `statRatings` used only as a relative gauge: `standardDefenseRating: "high"` and `evasionRating: "low"` are the only two rated, and both point the same way.

- `resilience [70,90]`: legacy high standard defense plus the statue posture on a bombarded world.
- `vitality [62,82]` and `strength [60,80]`: a 380 kg body that airlifted mine debris.
- `endurance [55,78]`: an unbroken watch, "hibernating to conserve their energy".
- `willpower [55,78]`: the same vigil.
- `instinct [45,68]`: threat detection from a dormant state.
- `agility [20,40]`, `reflex [25,45]`: legacy `evasionRating: "low"`.
- `intelligence [25,45]`: comprehends a guarding order, nothing more; never in true-human range.
- `charisma [20,40]`: a mute fixture on a rim.

### Element

`rock` primary at 100 by species `type`. Secondaries inherit the baseline 75/25 odds and come from the Stonera graph row, `metal`, `sand`, `fire`; no `affinityOdds` override is declared because no source sentence justifies one.

### Trait pool (expected count 3.00)

Reshaped on 2026-09-08 under Nick's pool-shape ruling. Two required traits, four rolled entries whose shares sum to 100, six entries in all, which is the cap. The chance an individual lands none of the four rolled traits is 31.2 percent.

**Required**

| Trait | Evidence |
|---|---|
| `telekinetic` | The body fact, named in the description as a permanent feature of the anatomy and again as the working act: "elongated tails tipped with a levitating ball of stone", and "using their tails to levitate boulders and fling them like great flying catapults across the Chasm beneath them". The levitation is continuous rather than triggered, so every individual carries it. |
| `territorial` | The behavior the description and the signature ability are built around: "now stand guard over the perimeter in a statue-like state", and the signature answers whatever crosses the rim from above it. The registry's `territorial` is being stronger holding ground it has been set to hold and denying passage rather than pursuing, which is this species' whole present function. |

**Rolled (shares sum to 100)**

| Trait | Share | Evidence |
|---|---|---|
| `dormant` | 35 | A species sentence about its own behavior: "hibernating to conserve their energy until a threat is detected", which is the registry definition almost word for word. Strongest of the rolled entries. It is the posture rather than the duty, and the duty is what `territorial` already carries, so it rolls rather than becoming a third required trait. |
| `anchored` | 25 | The statue-like guard state read as a body fact, with the legacy gauge of 380 kg on a 163 cm frame and `evasionRating` low behind it. Second because it restates the sentence `territorial` and `dormant` already draw on rather than adding a new one. |
| `perceptive` | 20 | Record fields: `physiology.senses.special` carries tremorsense and `senses.hearing` tops out at 85, over the bar of 80. The species sentence about a threat being detected agrees. The senses list is rolled-set evidence and never makes the trait required. |
| `insulated` | 20 | Stonera's hazard list carries static discharge, and the planet history says the same in prose: "the rubbing of these particulates in the atmosphere generates colossal static discharges that crackle pervasively in the lower atmosphere". A sentry perched on an open rim is covered by it. A planet-wide adaptation the description never makes the point of the creature, so it is rolled. |

#### Cut by the evidence bar (2026-09-07)

| Trait | Former percent | Evidence class that failed |
|---|---|---|
| `menacing` | 60 | the quoted sentence describes an attack (the strafing run, which is the signature ability), not a presence that erodes courage; restatement of a kept element |
| `solitary` | 35 | argued from absence, and the record concedes the same sentence could be read as a line of sentries working together |
| `resistant` | 50 | cut 2026-09-08 under the narrowed definition: its support was thin atmosphere and static discharge, which are not contamination; the support moved to `hardened` and `insulated` |
| `hardened` | 50 | pool full, weaker evidence (2026-09-08): thin atmosphere is not on Stonera hazard list and the species own text never claims it, so it loses the sixth slot to `insulated` |

Under the widened iteration-two bar neither cut entry is restored: `menacing` would need class 4 size plus a threat sentence, and this species is heavy but the sources give it a statue posture and an aerial bombardment rather than any presence that erodes courage, while the art draws a closed level mouth and no threat display; `solitary` still rests on absence, and the species sentence about Terragoyles lining the edges of the Chasm reads against it. `resistant` at 50 was kept under ruling B but is cut on 2026-09-08 under the narrowed definition, which reserves the key for contamination: toxins, disease, radiation, corrosion and chemically hostile air. Its support was Stonera's incredibly thin atmosphere and pervasive static discharge, and neither is contamination. Dust is particulate, not chemical, so the thin-atmosphere half moved to `hardened` and the discharge half to `insulated`. On 2026-09-08 the pool-shape ruling capped the pool at six entries, and `hardened` lost the last slot to `insulated`, whose support sits on Stonera hazard list where thin atmosphere does not; it is recorded in the table above.

Traits I considered and left out, with reasons: `armored`, because the covering is `hide` and the `hide` anatomy key states the body has no armored aspect, and neither source names plating or a carapace, only a posture that looks like statuary; `ramming`, because the described attack is release from height, not a body blow with movement behind it; `nocturnal`, because the planet history gives grey skies rather than perpetual night, "The debris from such collisions have launched enormous swathes of dirt into the air, dying the sky a dusty grey", which is dimness, not a night world; `stealthy`, because a statue on a rim is conspicuous by design; `protective`, because guarding a corporate perimeter is an order it was engineered under, not an instinct to shield others.

### Instruments and conduits

- `tail`: the description's working part in both eras, "originally used to airlift debris out of Stonera's strip mines with their levitational tails" and "using their tails to levitate boulders and fling them like great flying catapults across the Chasm beneath them". In anatomy.
- `wings`: species, "as they soar overhead", the part that puts it over the target for the strafing run. In anatomy.
- `horns`: species, "Resembling horned", and the art's two ribbed curling horns; the only head weapon the body has. In anatomy.
- `conduits: { "tail": "rock" }`: the description shows rock power leaving the body through the tail, not merely that the creature is a rock creature: "using their tails to levitate boulders and fling them like great flying catapults across the Chasm beneath them". The tail's physical 5.7 row already carries `hurl`, so the conduit is not needed to license the signature; it is declared because the predicate is plainly met and it opens the rock medium row (`ward`, `crush`, `hurl`, `burst`, `shove`, `strike`) through the tail for rolled abilities.

### Signature ability

- Lore-defining act, quoted: "When awoken, Terragoyles rise high into the sky, using their tails to levitate boulders and fling them like great flying catapults across the Chasm beneath them or to carpet bomb intruders with strafing runs of gravel and rock as they soar overhead."
- `instrument: tail`. Per the pilot ruling the instrument is where the effect terminates on the target, and here the tail is both the origin and the releasing part; the boulder is launched from the tail's hold, so the tail is the instrument and `mind` is not, even though the lift is telekinetic in physics.
- `action: hurl`, a thrown or launched solid that travels to the target; the description's own words are "fling them like great flying catapults".
- `medium: rock`, the primary, and the thing flung is stone, "levitate boulders".
- `intensity: [45,85]`: a band wide enough to separate a gravel strafing run from a dropped boulder, both of which the same sentence describes.
- `name: Perimeter of Standing Stones`. Grander register, exempt from the two-word limit. Collision scan run case-insensitively across all fourteen `consolidated-*.md` files and `neutral-pools.md`: no hit, and no hit for the shorter forms either. A prior scan of the same files for the species name found no reserved-signature ledger entry for Terragoyle, so the name is coined here. The name joins two sourced facts, the perimeter it guards and the stones it holds up, without staging a scene.
- `description`: 'It wakes from its statue posture, climbs above the Chasm, and drops the boulders its tail holds aloft onto whatever crossed the rim.' One line, canon voice, ends on a plain present-tense fact, no mechanics named.

## Authored fields (no supporting source sentence)

- `covering: hide` (registry default for a flesh animal body with the `hide` anatomy key; the art's smooth silhouette shows no surface).
- `diet: omnivore` (registry default for a flesh body with no feeding sentence).
- `communication: ["vocal","display"]` (both keys authored; `[]` was the strictly honest alternative and is raised below).
- `senses.special: ["tremorsense"]` (inferred from the detection sentence plus a body pressed to rock, not named in either source).
- `senses.smell [20,40]`, `capabilities.sprint [20,40]`, `capabilities.leap [35,60]`, `capabilities.burrow [5,20]`, `capabilities.swim [0,10]` (no source; kept at or below the no-source ceiling).
- `size` bands and every `attributes` band (proposed absolutes anchored to the legacy gauge, which is a relative gauge only).
- `archetypeWeights` percentages, `traits.pool` percentages, `signatureAbility.intensity` band (all authored judgments, each argued above).
- `anatomy: claws` (from the art alone, not from any sentence).
- `composition.secondary: mineral` (a reading of the tail-tip stone as structural rather than carried; see open question 2).

## Thin-combo findings

Every instrument x allowed-action x medium combination was counted against the element cell plus the neutral pool for that action, with instrument tags filtered against this species' keys (`horns`, `wings`, `tail`, `hide`, `claws`, plus the untagged pool). Media counted: `rock` primary and the three on-graph secondaries `metal`, `sand`, `fire`. Sixty-six combinations; the smallest total was 44 drawable names (`tail x snare x fire`, where the fire cell contributes only 3 after tag filtering but the neutral snare pool carries 41). Nothing falls below the threshold of 6, so there are no thin-combo findings to report. The nearest thing to a pressure point is `rock x lash`, which owns only 8 names in total, but the neutral lash pool carries 54 more and the combination still reaches 62.

## Answers to the WARN lines

- `traits.expected`, expected count 4.00 is above 3.5, confirm the species is meant to carry that many. Confirmed, and the shape is structural rather than generous. Two of the six entries are body-demanded and therefore fixed at 100: `anchored`, from a 380 kg body that holds a perimeter as a statue, and `telekinetic`, from a tail that constantly holds a stone in the air, which the registry reads as constant levitation. Those two alone put the floor at 2.0 before any rolled trait exists. The four rolled entries sum to 2.0 more, which is an ordinary spread, and I deliberately kept the weakest of them, `resistant`, at 50 rather than near 100 despite an environmental justification, precisely to hold the total down. Cutting further would mean deleting a sourced trait to hit a guide number, which I judged the wrong trade.
- `conduits.source`, the validator agent must confirm the sentence. The sentence is in the species description and is quoted in full in the instruments section above: "using their tails to levitate boulders and fling them like great flying catapults across the Chasm beneath them". Rock leaves the body through the tail; the tail is not merely a rock-element part, it is shown moving stone.

## Script denials

One FAIL, on the first run.

- Code `temperature.habitable`. Original value `temperatureC: {min:-28, max:34}`. Script message: 'temperatureC [-28, 34] extends outside the Stonera habitable band [-45, 25] C (planetRecords.json environment.habitableBandC; the extremes {'min':-110,'max':60} are not survivable); narrow it'. Changed to `{min:-45, max:25}`, and the record carries the rule's value.
- Do I think the original was better? No, not on the merits, but I want to record that the skill and the script disagree about which file is the temperature authority. Section 5.5 of the skill says the band `must lie inside the home planet's data-block range (Temperature Low to Temperature High)` and names `planets.json` as `the only quantitative climate source`. The Stonera data block gives -28 C to 34 C. I authored the band from that instruction and it was denied against a different range, [-45, 25], read from `planetRecords.json`, a file the skill's Inputs section does not list and which I am not permitted to read. So a value derived exactly as the skill directs failed the script, and the denial is correct against the platform but the skill's own text pointed me at the wrong source. Note also that the two ranges are not nested: the habitable band reaches 17 degrees colder and stops 9 degrees warmer than the data block, so a species written to the data block's warm end can never pass, and one written to the habitable band's cold end would look unjustified to a reader checking against `planets.json`.
- Smallest fix: amend section 5.5 to name `planetRecords.json` `environment.habitableBandC` as the authority for `temperatureC` and add that file to the Inputs list so a migration agent can read the band it will be checked against; keep the `planets.json` data block as the narrative climate source only. Passed on the second run as a `--note`.

One further friction point to record under operating rule 7, levers not stone, even though no rule forced a wrong value. The body-plan rule produced `quadruped` for a creature the source calls `vaguely humanoid bats`, and I believe `quadruped` is the correct call under the rule as written and probably correct in fact, because the art plainly plants both hands. But the rule's weight-bearing test reads a resting crouch as a stance, and a gargoyle-shaped creature is drawn crouching precisely because it is at rest on a ledge; the same body would be drawn upright the moment it is doing anything. The smallest fix, if this recurs, would be a clause in the `bodyPlan` selection rule saying that when the description gives the creature a humanoid comparison and the art shows a resting perch rather than a gait, the forelimb test does not settle the plan and the field goes under Authored fields. I have not applied that clause; the record carries `quadruped`, the rule's value.

## Open questions

The source description spells the levitating stone as `levitating` and spells the species name as `Terragoyles` in two places where it should read Terragoyles. Because `descriptionStatus: "source"` means the text is carried character for character, both errors are now in the template. Do you want the source description carried exactly as written, or should a source-status description be allowed a silent spelling correction where the misspelling is unambiguous, with the correction recorded in the walkthrough?

## Validator output

Final run of `node docs/species-templates/tools/validate-template.js terragoyle`:

```
$ node docs/species-templates/tools/validate-template.js terragoyle

WARN conduits.source                conduit tail for rock: the validator agent must confirm the sentence or art showing the element leaving through this part

0 FAIL, 1 WARN (structurally clean; every WARN must be answered in the walkthrough)
```

The one WARN line, the conduit source check, is answered above under Answers to the WARN lines; the trait-count WARN it used to carry no longer fires under the 2026-09-08 pool shape.

## Orchestrator amendments

- 2026-09-02, after the independent validation and the orchestrator's own look at the art: `composition` secondary `mineral` removed: the art draws the stone floating apart from the tail with a clear gap, an object the tail holds aloft, not a body part. `claws` removed from anatomy: the hands are drawn with rounded digits and the feet with blunt toes; manipulation stays licensed by `tail`. Two unambiguous misspellings in the carried source description corrected ('levitating', 'Terragoyles'), recorded here; the species.json source should be corrected upstream. `bodyPlan` stays `quadruped` under the rule (both hands planted at rest); the run's resting-perch note is carried to the rulings file. `temperatureC` [-45, 25] -> [-45, 25] inside the habitable band [-45, 25].
- 2026-09-02, correction: the carried description is restored verbatim (a source-status description must match species.json character for character, and the script enforces it); the two misspellings (levitating, Terragoyles) are to be fixed upstream in species.json, after which the record is re-carried.
- 2026-09-02, spelling (Nick): misspellings in the source description were corrected upstream in species.json (temperment, closed pedals of a flower, flittering Avilies, levatating, Terragoygles as applicable) and the carried text and quotations updated to match; misspellings are never carried into a record.
- 2026-09-07, trait evidence bar (Nick): cut `menacing`, `solitary`; pool expected count 4.00 to 3.05.
- 2026-09-07, trait evidence bar iteration two (Nick): restored none; cut none; expected count 3.05 to 3.05.
- 2026-09-08, trait evidence bar iteration three (Nick): added `insulated` at 100, `territorial` at 90, `dormant` at 85, `hardened` at 50; raised `perceptive` 55 to 100; cut `resistant`; expected count 3.05 to 6.25.
- 2026-09-08, pool shape (Nick): required `telekinetic`, `territorial`; rolled `dormant` 35, `anchored` 25, `perceptive` 20, `insulated` 20; expected count 6.25 to 3.00.
- 2026-09-09, lore split (Nick): description reverted to species.json; body and habits authored; descriptionStatus removed.
- 2026-09-09, lore overlap lever: habits (and body where changed) rewritten so the defining act is present from its own angle.
