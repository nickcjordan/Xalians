# Frackworm: migration walkthrough

## Art reading

There is no artwork for the Frackworm. `docs/species-templates/art/frackworm.png` does not exist; the species was authored today and has not been illustrated. Every body-plan, anatomy, covering and posture call below therefore rests on the description alone, and each is flagged in Authored fields where the description does not settle it. The orchestrator's art check for this species is pending an illustration: when one is drawn, the body plan (`serpentine`), the anatomy set (`jaws`, `vents`, `body`), and the covering default (`bare`) are the three calls most likely to be overturned by it, and the covering is the one I expect to change first.

## Source quotes used

From `species.json`, the Frackworm description, in order:

1. "A colossal segmented worm with a ringed, drill-like head and a body that holds a slurry of sand under pressure, the Frackworm was generated on Endessa by the Syndicate's stolen prototype Generator to work the Nightcap wells."
2. "It bores down through the glass particulate of the dunes to the old ocean-floor substrate and forces its slurry into the seams at pressure until the rock fractures and the Nightcap pools drain toward the well."
3. "Wildcatters who could afford one opened a well in days that a crew of Drilltails took a season to reach, and the Nightcap Barons fielded them by the dozen."
4. "Today the Frackworms still work the cavern networks beneath the dunes, fracturing the substrate for the Xalians who kept drilling after the Barons died."

From `planetRecords.json`, Endessa: the terrain feature "dune systems of vitreous particulate over ocean-floor substrate"; the terrain feature "subsurface excavation tunnel networks"; the terrain note "Surface insolation lethal without adaptation; dual-star."; `physical.derived.gravityEarth` of 0.96; `environment.habitableBandC` of -10 to 55; `environment.meanC` of 60; the hazards "thermal load", "desiccation", "tunnel collapse", "vibration-triggered predation"; the output priorities "water retention", "particulate locomotion", "thermal shielding"; the fauna observation "subsurface ambush forms; vibration-hunting forms"; the mobility rating for burrow, "including sustained particulate-swimming"; and from the history, "Over the course of thousands of years, the glass surface of Endessa broke down into particulates, turning the planet into an unforgiving desert expanse comprised of vast seas of endless rolling dunes and arid, sweltering heat."

`planetStatus.json` was read for political context only (control 'crime-syndicates', labor model 'coerced', Nightcap a 'galactic-monopoly' export). It settles no physiology field here.

## Description status

`descriptionStatus: source`. The description is already in the full register: it opens with a body appositive ("A colossal segmented worm with a ringed, drill-like head"), states the engineered purpose under the Syndicate ("to work the Nightcap wells"), turns to the present day anchored to a named institution and place ("Today the Frackworms still work the cavern networks beneath the dunes"), and runs 122 words in one present-tense paragraph. It is carried verbatim, with no clause added and none cut. No misspelling was found in it; nothing needs correcting upstream.

## Judgment lines

Every line names its source as `species` (the Frackworm description) or `planet` (Endessa's record).

### Physiology

- `corporeality: corporeal` (species): "A colossal segmented worm" is a body that bores through particulate and presses against rock; nothing in the description is immaterial.
- `composition.primary: flesh` (species): a worm is living animal tissue. No composition secondary: the slurry it carries is what it expels, and the registry rule reserves a secondary for a substance that forms a structural part of the resting body, never for an emission or a weapon it makes. The slurry is named as held, then forced out: "forces its slurry into the seams at pressure".
- `bodyPlan: serpentine` (species): "A colossal segmented worm" is a long limbless body moved by undulation, and no limb of any kind is named. The selection order would reach `multiped` before `serpentine` only if the body had more than four bearing parts; it has none.
- `covering: bare` (authored, defaulted): neither source names or shows a surface for the trunk, and there is no art. The registry default for an unnamed surface is `bare`, with the exception that a flesh animal carrying the `hide` anatomy key takes `hide`. I did not take `hide`, because the rule requires a source sentence or art showing a thick, leathery, wrinkled, or rugged surface, and none exists. Listed under Authored fields; the most likely value to change when the species is drawn.
- `anatomy: jaws, vents, body` (species): `jaws` for the boring mechanism of the head, "a ringed, drill-like head", which is the full mechanism the front of the body works with, and the registry defines `jaws` as the full biting mechanism rather than a set of teeth; `vents` for the pressurized discharge, "forces its slurry into the seams at pressure", which is exactly the registry's pressurized discharge opening; `body` for the whole-body mass of a colossal worm, which is what bores, "It bores down through the glass particulate of the dunes". No surface key is declared, since the description names neither an armored casing nor a leathery hide, and only one of `shell` and `hide` may be declared in any case.
- `size: heightCm [900, 1500], weightKg [2200, 4200]` (species, gauged): the legacy figures are 1200 cm and 3000 kg, which are a relative gauge only. I banded around them rather than copying: a colossal boring worm is credible from nine to fifteen meters of length, and mass in the low thousands of kilograms for a body of that length that is not solid rock. Endessa's gravity of 0.96 is close enough to one that it argues for no adjustment either way.
- `lifespan: long` (species and planet): cut 1 and cut 2 do not apply to a flesh body. Cut 3 by mass puts the midpoint of 3200 kg above 200 kg, which is `long` directly; the adjustment for a cold, slow, or armored body would not push past `long` in any case. Cut 4, harshness, moves a body down only when the description says the environment shortens its life, and it does not: the description instead shows the species still working generations after the Barons died, "Today the Frackworms still work the cavern networks beneath the dunes".
- `genome.chirality: rolled` (default): a flesh body has chiral chemistry, so it rolls; nothing declares it achiral.
- `diet: omnivore` (authored, defaulted): the description shows no feeding of any kind, only boring and fracturing. The registry default for a flesh body with no feeding sentence is `omnivore`. Listed under Authored fields. I specifically did not read the Nightcap pools it drains as food: the sentence shows the Nightcap draining toward the well, not into the worm, "the Nightcap pools drain toward the well".
- `communication: [vibration]` (species and planet): a body that bores through solid ground signals through the ground it is in, and the planet's fauna observations name "subsurface ambush forms; vibration-hunting forms" as the register the biosphere runs on. This is an environmental fact of the medium the species lives in, not a behavior imported from a planet-wide sentence about Xalians; the species sentence that carries it is that it works underground at all, "It bores down through the glass particulate of the dunes". No vocal call and no display is named, and a body underground has nothing to display to.
- `breathes: [gas]`, `ambientMedia: [gas]` (planet): Endessa has an atmosphere of 1.6 bar and no standing water, the mobility block rating swim as unsupported with the note "no standing water". Solid is never a medium in this registry, so living inside the dunes is carried by `burrow`, not by an ambient medium. `breathes` is a subset of `ambientMedia` as required.
- `temperatureC: 5 to 55` (planet): the habitable band is -10 to 55, and the species band sits inside it. The top is the band's top because the description puts the species in the sweltering desert subsurface and the planet's mean is 60 with the terrain note "Surface insolation lethal without adaptation; dual-star.". The bottom is well above the band's floor because nothing in the description places this species anywhere cold, and a subsurface body in a desert does not need the band's cold edge. The planetary extremes of -60 to 195 were not used.

### Capabilities

- `burrow [80, 95]` (species and planet): the defining act, "It bores down through the glass particulate of the dunes to the old ocean-floor substrate", and the planet rates burrow as optimal "including sustained particulate-swimming". The high upper bound has its source sentence, as the registry requires above 60.
- `flight [0, 0]` (species): no wings, no drift, a body in the ground.
- `swim [0, 5]` (planet): "no standing water" on Endessa; a token upper bound only for a body that moves through slurry.
- `climb [0, 10]` (species): no limbs, no grasping part.
- `sprint [10, 25]` (species): a colossal worm is not built for burst ground speed; the legacy gauge rates its speed low, and the description shows patient work rather than pursuit.
- `leap [0, 10]` (species): no limbs to launch with.
- `manipulation [5, 15]` (species): no grasping anatomy and no `telekinetic` at 100, so the upper bound stays well under 40 as the rule requires. The worm handles nothing; it bores and expels.

### Senses

- `sight [0, 15]` (species): an animal that lives boring through solid particulate has nothing to see; the description never once uses sight.
- `hearing [20, 40]` (species and planet): sound underground is real but secondary to the tremor channel.
- `smell [25, 45]` (species): a body that must find a substrate seam has some chemical reading of the ground, but nothing in the description names scent.
- `senses.special: [tremorsense]` (species and planet): the body works entirely inside solid ground, "It bores down through the glass particulate of the dunes to the old ocean-floor substrate", and the planet's own fauna observation names "subsurface ambush forms; vibration-hunting forms" as the sensory register of Endessa's subsurface. Tremor is the only sense that functions in that medium.

### Instruments and conduits

- `jaws` (species): "a ringed, drill-like head" is the boring mechanism; it is in anatomy as required.
- `vents` (species): "forces its slurry into the seams at pressure" is a pressurized discharge; it is in anatomy as required.
- `body` (species): "It bores down" is the whole mass driving forward; it is in anatomy as required.
- `conduits: { vents: sand }` (species): the predicate requires the sources to show the element leaving the body through the part, and they do exactly that, "a body that holds a slurry of sand under pressure" and "forces its slurry into the seams at pressure". Sand is the primary element, so the medium is covered. No other instrument is declared a conduit: the head bores mechanically and nothing shows sand power leaving through it.

### Archetype weights

The row is deliberately top-heavy rather than a ladder, because this species reads overwhelmingly as one thing: a slow, immensely strong industrial body that grinds through rock.

- `juggernaut: 45` (strength, resilience) (species): "A colossal segmented worm" that drives through glass particulate and fractures rock is strength married to toughness, "until the rock fractures".
- `survivor: 25` (vitality, endurance) (species and planet): the work is long and the planet's hazards are "thermal load", "desiccation", "tunnel collapse"; the description shows the species still working long after its owners died, "the Xalians who kept drilling after the Barons died".
- `berserker: 18` (strength, endurance) (species): sustained force applied over time is the whole act, "forces its slurry into the seams at pressure".
- `bulwark: 12` (vitality, resilience) (species): a body that braces against rock to deliver pressure reads as an immovable one.

Nothing below 5, four entries, sums to exactly 100. I considered and rejected `vanguard` and `stalwart`: neither adds anything the four above do not already carry, and folding them in kept the row honest.

### Attribute bands

The legacy `statRatings` are used only as a relative gauge: health high, standard attack high, standard defense medium, speed low, evasion low, stamina high.

- `strength [70, 92]` (species): it fractures rock, "until the rock fractures".
- `vitality [68, 88]` (species): the legacy health gauge is high and the body is colossal.
- `endurance [72, 94]` (species): the legacy stamina gauge is high and the act is sustained pressure over time; a well opened "in days" is days of continuous work.
- `agility [8, 24]` and `reflex [10, 28]` (species): the legacy speed and evasion gauges are both low, and a limbless colossal body in solid ground maneuvers poorly.
- `intelligence [12, 28]` (species): a purpose-built industrial borer, well below any true-human range; it comprehends the work and nothing suggests more.
- `willpower [35, 58]` (species): it keeps at a task, "Today the Frackworms still work the cavern networks beneath the dunes", but nothing shows a mind that resists pressure.
- `instinct [45, 68]` (species): it finds the seam in the substrate, which is a body reading ground it cannot see, "forces its slurry into the seams".
- `charisma [8, 22]` (species): nothing in the description is about presence; the species is equipment that its owners fielded, "the Nightcap Barons fielded them by the dozen".
- `resilience [55, 78]` (species): high, but deliberately below strength and endurance because no armored covering is named and the legacy defense gauge is only medium.

### Element

- Primary `sand`, fixed by the species entry type. On-graph secondaries for sand are water, rock and ghost; the template does not pick one and inherits the baseline 75/25 odds, with no `affinityOdds` override. I saw no lore reason to skew them, though I note that Endessa's Generator "glitching" toward marine forms would be the one argument for a water tilt, and the description of this species does not carry it.

### Trait pool

Expected trait count: the percents sum to 357, and the exclusion pair is counted as the higher partner plus the lower times one minus the higher, so 85 + 75 + 60 + 50 + 30 + 25 + (20 x 0.50) + 12 = 347, which is an expected 3.47 traits per individual. The first version of this pool came out at 3.93 and the script warned it; I answered the warning by cutting `protective` outright and easing five percents, rather than by leaving a row I could not defend. See Script denials.

- `anchored: 85` (species): to force a slurry into rock at pressure the body must brace and hold against the reaction, "forces its slurry into the seams at pressure". I stopped short of 100 because the body is not shown as immovable, only as bracing; the registry reserves 100 for a trait the body demands outright, and a worm that can be dragged out of a tunnel is a plausible individual.
- `resistant: 75` (planet): Endessa's hazards are "thermal load", "desiccation", "tunnel collapse", and the Generator's own output priorities for the world are "water retention", "particulate locomotion", "thermal shielding". This is an environmental adaptation, which the rules permit a planet-wide sentence to justify. It is not at 100 because the species description does not itself name any tolerance.
- `ramming: 60` (species): a colossal body that drives head first through glass particulate is a living ram, "It bores down through the glass particulate of the dunes". Well short of 100, because the registry ties ramming to blows landing with movement behind them and this body is slow, with a sprint band topping at 25.
- `solitary: 50` (species): a Frackworm opens a well by itself, and the contrast the description draws is against a crew, "a crew of Drilltails took a season to reach". One worm replaces a crew.
- `pack-bonded: 20` (species): the exclusion partner, kept in the pool because the Barons "fielded them by the dozen", so worms did work alongside worms. Solitary is the higher percent and is rolled first, so the two are never both taken, and neither is at 100.
- `perceptive: 30` (species): it locates a seam in substrate it cannot see, "forces its slurry into the seams". This rests on the species sentence, not on Endessa's fauna observations; a planet-wide statement would not be allowed to carry a behavior trait.
- `menacing: 25` (species): a colossal worm surfacing in a tunnel erodes courage by scale alone, "A colossal segmented worm". Kept modest because the description frames the species as industrial equipment rather than as a terror.
- `toxic: 12` (species): the slurry it drives at pressure is abrasive glass particulate, "the glass particulate of the dunes", which debilitates what it is driven into. Low because nothing in the description shows it used against a creature.

Traits the body could plausibly carry that I left out, with reasons: `protective`, which I had at 12 on the thin basis that worms work beside other diggers, "the Xalians who kept drilling after the Barons died", and cut when the expected count ran high, because it was the least defensible entry in the row; `armored`, because no armored covering and no `shell` key are declared, and the legacy defense gauge is only medium, so plating would be an invention; `stealthy`, because although a subsurface ambush register exists on Endessa, that is a planet-wide fauna observation and may not carry a behavior trait for this species, whose own description shows it working openly for owners; `nocturnal`, because the species lives underground where the dual-star day does not reach, so night adaptation is not what its body is for; `regenerative`, `healing`, `slippery`, `luminous`, `volatile`, `reflective`, `hypnotic`, `foresighted`, `mind-sealed`, `inspiring`, `telekinetic`, `phasing`, because nothing in either source touches them.

### Signature ability

- Lore-defining act (species): "It bores down through the glass particulate of the dunes to the old ocean-floor substrate and forces its slurry into the seams at pressure until the rock fractures and the Nightcap pools drain toward the well."
- `instrument: vents` (species): the pilot rule is that the instrument is where the effect terminates on the target. The effect here terminates as pressurized slurry entering the seam; the pressurized discharge opening is `vents`, not `jaws`, because the boring is how it reaches the seam and the fracturing is what the slurry does once there.
- `action: spray` (registry): a projected stream of matter over a line is the registry definition of `spray`, and driving a slurry into a seam is exactly that. `spray` is in the `vents` row of section 5.7, so the signature stays inside the physical matrix and needs no conduit exception; it is also in the sand medium row, and `vents` is declared a sand conduit, so it holds twice over.
- `medium: sand` (species): the slurry is sand, "a body that holds a slurry of sand under pressure", and sand is the primary element.
- `intensity: [45, 85]`: a wide, high band. The act is the species' whole purpose and every individual does it, but the description itself grades the outcome by the individual, since a Wildcatter's single worm is set against a season of crew work.
- `name: Fracture the Seam`: no ledger note reserves a signature for the Frackworm. I searched every `consolidated-*.md` and `neutral-pools.md` case-insensitively for the species name and found nothing, so no prior ruling applies. I then ran the collision scan for the exact coined name across all fourteen consolidated files and the neutral pools and found no match. The register is grander than a catalog name, three words, American English, no possessive, no hyphen, no franchise or real-world weapon reference.
- Signature description: the one line names the ringed head, the seam, and the slurry, and ends on the plain fact of the substrate fracturing and the Nightcap running. No mechanics, no sign-off flourish. Its first version used the word 'rock' twice and the script warned that an element key was appearing as a plain word; I rewrote it around 'substrate', which is the description's own noun for the same thing.

## Authored fields

Values with no supporting source sentence, taking the minimum honest value:

- `covering: bare`. Neither source names a trunk surface and there is no art. Registry default.
- `diet: omnivore`. No feeding of any kind appears in the description. Registry default for a flesh body.
- `genome.chirality: rolled`. The registry default; nothing declares the species achiral.
- The exact numeric edges of every capability, sense and attribute band. The direction of each is sourced above; the specific numbers are my calibration.
- `senses.sight`, `hearing` and `smell` bands. The description never names a sense organ. Only `tremorsense` has real support, from the species' own subsurface habit backed by the planet's fauna register.
- `size` band edges, gauged from the legacy height and weight rather than copied.
- `biomeNiche` phrasing, assembled from the species sentence about the cavern networks and the planet's terrain feature "subsurface excavation tunnel networks".

## Thin-combo findings

For each declared instrument, each allowed action, and each medium (sand primary plus water, rock and ghost as on-graph secondaries), the drawable pool is the element cell plus the neutral pool for that action, respecting instrument tags. The smallest element cell touched by any of this species' combinations is sand mend at 26, and the smallest neutral pool for any action is snare at 43. Every combination therefore has well over 6 drawable names, and there are no thin-combo findings for the Frackworm. The `vents` row (spray, cloud, burst, ward) and the `jaws` row (strike, crush, rake, drain, snare) and the `body` row (strike, crush, shove, ward, burst, terrorize) are all comfortable across all four media; the thinnest single cell any of them reaches is ghost crush at 25, which is still far above the threshold.

## Open questions for Nick

The Frackworm has no artwork, so the covering is a registry default rather than a reading. My instinct is that a worm that spends its life abrading through vitrified glass particulate would be drawn with a thick, rugged, plated or leathery surface rather than the bare skin the default gives it, which would change the covering and would probably add `armored` to the trait pool at a high percent. Would you rather I hold the default until the species is illustrated, or author `hide` now on the strength of what the boring habit implies about the surface?

## Script denials

The script raised no FAIL on any run for this key. Both runs came back structurally clean, so there is nothing the script denied and nothing I was forced to replace against my judgment. What follows answers the four WARN lines from run 1, since a WARN is a judgment the script cannot make rather than a pass.

1. `traits.expected`: the script said 'expected trait count 3.93 is above 3.5; confirm the species is meant to carry that many'. I did not confirm it, I fixed it. The first pool carried nine entries and I could not defend nine on a description this short. I cut `protective` entirely and eased `resistant`, `ramming`, `solitary`, `perceptive`, `menacing`, `pack-bonded` and `toxic` down a step each, landing at 3.47. The revised row is the better one and the warning was a fair catch, not a false positive. No rule was strained.
2. `conduits.source`: the script said 'conduit vents for sand: the validator agent must confirm the sentence or art showing the element leaving through this part'. Answered above under Instruments and conduits. The two sentences are "a body that holds a slurry of sand under pressure" and "forces its slurry into the seams at pressure", which show the element leaving the body through the pressurized opening about as directly as a source can. This warning is by design and needs a human confirmation, not a change.
3. `signature.description.elementkey`: the script said 'signature description uses element key word(s) as plain words: rock'. Fair. The draft read 'into the rock until the rock gives way', which is both a repetition and an element key standing where a type label could be misread. Rewritten around 'substrate', the description's own word.
4. `enc.definition.elementkey`: the script said 'encyclopedia definition uses element key word(s) as plain words: rock, sand'. Same fix for 'rock'. I also dropped 'slurry of sand' to 'pressurized slurry', which loses nothing the surrounding sentence does not carry.

Friction to report to Nick, under operating rule 7. One rule strained on this species and I complied with it. The covering registry gives exactly two paths: a source sentence or art showing a thick, rugged surface, or the `bare` default. For a species with no artwork whose entire working life is abrading through vitrified glass particulate, `bare` is very probably wrong, and the record now carries the rule's value. The smallest fix would be a third path in the covering selection rule: when neither source names a surface and no art exists, a body whose sourced habit is continuous abrasion against hard particulate or rock may take `hide`, flagged in Authored fields as habit-derived rather than defaulted. That change would touch one paragraph of section 5.5 and no other rule. Until it exists this template says `bare`, and the open question puts the choice to Nick.

## Validator output

Final run, from the worktree root:

```
$ node docs/species-templates/tools/validate-template.js frackworm --note "..."
WARN conduits.source                conduit vents for sand: the validator agent must confirm the sentence or art showing the element leaving through this part

0 FAIL, 1 WARN (structurally clean; every WARN must be answered in the walkthrough)
logged to docs/species-templates/validation-log/frackworm.jsonl
```

The single remaining WARN is the by-design conduit confirmation, answered under Instruments and conduits and again in Script denials. Run 1 raised four WARNs and no FAIL; three of the four were fixed, and the fourth is this one.

## Orchestrator amendments

- 2026-09-02: `hide` added to anatomy and `covering` set to `hide` (was bare) under the ruling that a flesh animal body with no named surface takes the hide covering; bare is for membranes, slime, plant and mineral surfaces. Authored pending art; if the illustration shows plating, the covering and the armored trait are revisited.
