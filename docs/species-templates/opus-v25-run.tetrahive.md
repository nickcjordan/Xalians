# Tetrahive migration walkthrough

Species key `tetrahive`, element `dark`, home planet `grimedes`. Sources read in full: the Tetrahive entry in `species.json` and the entire Grimedes `history` array plus its `data` block in `planets.json`. Nothing else was read for canon.

## Source text of record

Species description, verbatim, both sentences: "When in battle, this creature summons a swarm of small flying familiars with teeth like piranhas. It controls the swarm with its mind, attacking or defending as one unit."

That is the whole of the species source. Every body fact below traces to one of those two sentences; everything else is either planet-level context or an authored value listed in the Authored fields section.

## Description status and the upgraded text

The legacy description is a two-sentence stub, so `descriptionStatus` is `upgraded`. The upgraded text, clause by clause, with its source:

| Upgraded clause | Source | Evidence |
|---|---|---|
| a single creature distributed across a cloud of small flying bodies | species | "a swarm of small flying familiars" |
| each one little more than a set of teeth | species | "with teeth like piranhas" |
| all of them held together and directed by one mind | species | "It controls the swarm with its mind" |
| the Generator on Grimedes was funded to produce test subjects rather than a labor force | planet | "unlike most worlds, the Xalians on Grimedes were not intended to serve as a labor force, but as a population of test subjects for experimentation" |
| ECHELON funding behind the Generator (implied by `funded`) | planet | "the top secret Xalian Generator deployed on Grimedes was believed to have been funded by ECHELON in response to promising research from one such R&D network" |
| measuring what the black hole was doing to living matter | planet | "The Vallerii were quick to point the finger to Grimedes' black hole, and insisted on studying its effects on the Xalian population, leading to all manner of horrific experiments." |
| the observatories | planet | "the world would eventually grow to house an increasing number of observatories and astrophysics laboratories" |
| scatters over the stalky undergrowth of the flats | planet | "What was once nothing but cold, flat rock came to be covered in a layer of thick, stalky undergrowth." |
| thins to nothing when struck, and closes again as one unit | species | "attacking or defending as one unit" |
| the sort of watchman the rim keeps now | planet | "the Grimedites stand at the edge of the galaxy, trusted or perhaps condemned to watch the endless black and guard against APEX's inevitable return" |

Two authored connective judgments are flagged in Authored fields: that a divisible body was specifically convenient for experimentation, and that the swarm decides what is prey. Neither adds a new fact; both are inferences dressed as prose, and I call them out rather than pretend they are sourced.

The canon-summoning problem: the stub says "summons a swarm of small flying familiars", which as written would violate the no-summoning constraint. The skill resolves this at the body-plan level, since a swarm's units are extensions of one body. The upgraded description therefore says the creature IS the cloud, not that it calls one into being. This is a rewrite of framing, not of fact.

## Physiology, field by field

| Field | Value | Source | Evidence |
|---|---|---|---|
| `corporeality` | `corporeal` | species | Teeth that bite and bodies that fly are physical; nothing in "with teeth like piranhas" suggests a non-corporeal body. |
| `composition.primary` | `flesh` | species | Teeth and flying bodies, no stated mineral, metal, or spectral aspect. |
| `bodyPlan` | `swarm` | species | "a swarm of small flying familiars"; the plan is the whole point of the creature. |
| `anatomy: jaws` | biting mechanism | species | "with teeth like piranhas"; teeth are the only named part, and the registry files a full biting mechanism as `jaws`. |
| `anatomy: wings` | flight structures | species | "small flying familiars"; the units fly. Authored insofar as the means of flight is not named, see Authored fields. |
| `anatomy: body` | whole-body mass | species | The swarm strikes as a mass rather than only as teeth: "attacking or defending as one unit". |
| `covering` | `bare` | authored | No covering is described. `bare` is the minimum honest value; nothing supports fur, scales, chitin, or plating. |
| `size.heightCm` | `[55, 95]` | legacy gauge | The legacy height of 76 cm is the anchor. The band is read as the standing extent of the assembled cloud, not one unit. |
| `size.weightKg` | `[7, 16]` | derived | A cloud of small flying flesh bodies with no armor is light; the legacy 12 kg sits mid band and is consistent with a body that must stay airborne. |
| `lifespan` | `short` | derived from the wear rubric | Many small, high-metabolism flying bodies of unarmored flesh on a harsh world is the fast-wear end of the rubric: small mass, high metabolic intensity, flesh composition, hostile home world. |
| `genome.chirality` | `rolled` | default | Nothing species-declares achirality. |
| `diet` | `carnivore` | species | "with teeth like piranhas"; piranha dentition is the source's own comparison, and it is a shearing carnivore mouth. |
| `communication` | `[]` | species | Neither source sentence describes a call, cry, display, scent signal, or telepathic act directed at anything other than its own units. Per the v2.2 rule the value is empty rather than invented; the internal control of the swarm is a body function, not a communication channel. |
| `breathes` | `["gas"]` | planet | Grimedes has an atmosphere thick enough to hold the terraformed ground cover described in "came to be covered in a layer of thick, stalky undergrowth", and flight requires a medium. |
| `ambientMedia` | `["gas"]` | planet | Same. No liquid or vacuum habitat is described. |
| `temperatureC` | `-6` to `34` | planet `data` block | Grimedes `Temperature Low` is -6 C and `Temperature High` is 93 C. The band takes the planet floor, since the world is one of perpetual night, and stops well short of the high extreme; a small unarmored flesh body operating over ground cover that survives on scarce infrared is not a creature of the planet's hottest ground. |
| `capabilities.flight` `[55, 80]` | species | "small flying familiars"; flight is the creature's whole mode. Not banded higher because nothing describes speed or endurance in the air. |
| `capabilities.swim/burrow/climb/leap/sprint` | low bands | authored | No source describes any of these; minimum honest low bands, listed in Authored fields. |
| `capabilities.manipulation` `[10, 25]` | derived | Jaws are the only handling part; the band stays under 40, which is what the manipulation rule requires without grasping anatomy. |
| `senses.sight` `[30, 55]` | derived | The home world is described as "surrounded in a cloak of perpetual night" with a star that "emits almost no visible light", so visual sight is not the creature's strong channel. Planet-level, and used only for an environment-facing sense band, not a trait. |
| `senses.hearing`, `senses.smell` | mid bands | authored | No source sentence; mid to modest bands for a hunting body. Listed in Authored fields. |
| `senses.special` | omitted | species | No source sentence supports echolocation, tremorsense, electroreception, psychic sense, heat sense, or void sense. Omitted rather than guessed. |

## Instruments

`swarm` and `jaws`.

- `swarm` satisfies its predicate directly: `bodyPlan` is `swarm`. Evidence: "a swarm of small flying familiars".
- `jaws` is in anatomy and is the part the description actually fights with: "with teeth like piranhas".
- `mind` was considered and rejected. The stub says "It controls the swarm with its mind", but that is the creature governing its own body, not a mental effect terminating on a target. Under the ratified instrument rule the instrument is where the effect lands on the target, and here that is teeth. `mind` also fails the template predicate: the element is `dark`, there is no `psychic` special sense, and neither `telekinetic` nor `hypnotic` is guaranteed. Declaring it would have been the summoner reading of the stub, which canon forbids.

## Archetype weights

| Archetype | Weight | Source | Evidence |
|---|---|---|---|
| `skirmisher` (agility, reflex) | 5 | species | A cloud of small flying bodies that closes and disperses is the agility and reflex body: "a swarm of small flying familiars". |
| `prowler` (agility, instinct) | 3 | species | The same body hunting: it is fast and it reads its target rather than out-thinking it. |
| `predator` (instinct, reflex) | 3 | species | "with teeth like piranhas" is a hunting mouth, not a working one. |
| `runner` (agility, endurance) | 1 | derived | A minority reading of a body that has to stay in the air; low weight because nothing describes stamina. |

No `vanguard`, `juggernaut`, or `bulwark`: the strength and resilience archetypes contradict a light, unarmored, divisible body.

## Attribute bands

Legacy `statRatings` were used only as a relative gauge: `evasionRating` is `high` and `standardAttackRating` is `medium`, everything else blank.

- `agility` `[60, 85]` and `reflex` `[55, 80]`: top bands, from the legacy high evasion and from a body that disperses on contact.
- `strength` `[15, 35]` and `resilience` `[15, 35]`: small unarmored flying units, `bare` covering, no armor described.
- `vitality` `[25, 45]`: distributed mass with nothing described as durable.
- `endurance` `[35, 55]`: sustained flight argues for the middle, nothing argues higher.
- `intelligence` `[35, 55]`: below true-human range as required; the creature coordinates a body, which is not evidence of reasoning.
- `willpower` `[45, 70]`: the one attribute the description does argue for, since holding many bodies to one purpose is a mental hold: "It controls the swarm with its mind, attacking or defending as one unit."
- `instinct` `[50, 75]`: a hunting mouth on a predator body.
- `charisma` `[10, 30]`: mute, faceless, and dispersed; nothing describes presence directed at others.

## Element

Primary `dark`, fixed by the species `type` field. Secondaries are whatever the graph allows for `dark`, namely `ghost`, `psychic`, and `ice`; the template picks none. `affinityOdds` is omitted so the species inherits the 75/25 baseline. There is no lore reason in either source to move those odds.

## Traits

`guaranteed`: `slippery`. The body cannot be held because it is not one object. Evidence, species: "attacking or defending as one unit" applied to "a swarm of small flying familiars"; a grab, pin, or snare closes on a fraction of the creature. The legacy high evasion rating is the corroborating relative gauge.

`rolledCount` `[1, 2]`, so a Tetrahive carries two or three traits total, inside the 1 to 3 rule.

| Pool trait | Weight | Source | Evidence |
|---|---|---|---|
| `pack-bonded` | 5 | species | The strongest read in the stub: the body is a coordinated many. "attacking or defending as one unit". |
| `protective` | 3 | species | The stub names defending as an explicit mode alongside attacking: "attacking or defending as one unit". |
| `menacing` | 2 | species | A closing cloud of teeth erodes courage; supported by "with teeth like piranhas" plus the swarm plan, but it is an inference about effect on others, so the weight is low. |
| `stealthy` | 1 | species | A dispersed body of small flying units is hard to see coming; lowest weight because no source sentence says it hides. |

`solitary` is excluded automatically by `pack-bonded` being in the pool, which is correct for this body. `nocturnal` and `perceptive` were considered and dropped: the only support for either would be Grimedes being a world of perpetual night, and a planet-wide sentence may not justify a species trait weight.

`armored` is absent and correct: covering is `bare` and anatomy declares neither `shell` nor plating.

## Signature ability

The lore-defining act, quoted: "It controls the swarm with its mind, attacking or defending as one unit." Combined with "a swarm of small flying familiars with teeth like piranhas", the act is the whole scattered body converging at once and stripping a target.

- `instrument`: `swarm`. The effect terminates on the target as the units themselves. The mind is the physics that produces the convergence, not the part that lands, which is exactly the ratified pilot lesson.
- `action`: `rake`. Under the grain ruling, slash, cut, and tear are all `rake`, and piranha teeth stripping a target is tearing, not a single stabbing `strike`. `rake` is in the allowed set for `swarm`.
- `medium`: `dark`, the primary element, so cover is automatic.
- `intensity` `[40, 80]`: a wide band on a species whose whole output scales with how much of the cloud arrives.
- `name`: `Convocation of Teeth`. Grander register, no possessive, no hyphen, ASCII only, two content words plus a preposition, which the signature exemption allows. Catalog search for the species name across all fourteen `consolidated-*.md` files and `neutral-pools.md` found no ledger note reserving a signature for Tetrahive, so the name is coined rather than inherited. Collision scan for the exact name, case insensitive, across all fourteen consolidated files and the neutral pools: no hit.
- `description`: `The scattered bodies fall in from every side at once and strip the target as a single closing mouth.` Canon voice, no mechanics, no element key words.

## Thin-combo findings

Counting drawable names per instrument, allowed action, and medium (primary `dark` plus each on-graph secondary `ghost`, `psychic`, `ice`), respecting instrument tags for the tag set `jaws`, `body`, `swarm`, `mind`, and adding the untagged neutral pool for each action:

- Every combo for both declared instruments clears the six-name bar comfortably once the neutral pool is included; the smallest element-cell contributions are `swarm` with `rake` on `ghost` (0 element names drawable) and `swarm` with `rake` on `psychic` (12).
- One finding worth reporting: the `ghost` `rake` cell holds 111 names and **every one of them is tagged `[claws]` or `[aura]`**, so a swarm-and-jaws species can draw nothing at all from it. The action is only playable for this species through the 55 untagged neutral `rake` names. This is a catalog gap in `consolidated-ghost.md`, not a template problem, and I have not padded it.
- The `dark` `cloud` cell is small in absolute terms at 18 names, but `cloud` is not an allowed action for either declared instrument, so it does not affect this species.

## Authored fields

Values with no supporting source sentence, recorded here because the JSON carries no provenance:

- `covering: bare` : nothing describes a body surface; the minimum honest value.
- `anatomy: wings` : the description says the units fly but does not name the means. Wings are the smallest honest structure that produces flight for a flesh body; the alternative was to leave flight unexplained, which the validator flags.
- `anatomy: body` : authored as the mass instrument for a swarm that acts as one; defensible from the unit sentence but not named as a part.
- `capabilities.swim`, `burrow`, `climb`, `sprint`, `leap` : all authored low bands, no source.
- `senses.hearing`, `senses.smell` : authored mid bands, no source.
- `size.weightKg` : derived from body type plus the legacy relative gauge, not from any source sentence.
- `lifespan: short` : derived from the wear rubric, not from a source sentence.
- `genome.chirality: rolled` : default.
- `attributes` : all ten bands are authored judgments; only `agility`, `reflex`, and `willpower` have a source sentence behind their direction.
- `archetypeWeights` : the four archetypes are sourced in direction, the numeric weights are authored.
- `traits.pool` weights : the four traits are sourced in direction, the numeric weights are authored.
- `signatureAbility.intensity` : authored band.
- Two connective clauses in the upgraded description: that a divisible body was convenient for experimentation, and that the swarm decides what is prey.
- `lore.biomeNiche` : assembled from the planet terrain line, not from a species sentence.

## Open questions for Nick

Is `wings` the anatomy key you want for a swarm species, or would you rather a swarm's flight be carried entirely by the `swarm` body plan with no wing key declared? I authored `wings` because the source says the units fly and the validator warns when flight is above zero with no wings, no floating plan, and a corporeal body. My recommendation is to keep it: the units are described as flying bodies of flesh, and wings are the least invented structure that gets them airborne. But it is the one anatomy key here that the source does not actually name, and if you want swarms to be exempt from the flight-means rule I would drop it and leave anatomy as `jaws` and `body`.

## Script denials

Run 1 raised one FAIL and one WARN. Both are recorded here.

| # | Original value | Script message | Changed to | Was the original better? |
|---|---|---|---|---|
| 1 | The Authored fields bullet list used em-dash separators, for example `covering: bare` followed by an em-dash and the reason. | `FAIL md.emdash walkthrough contains an em-dash` | Every em-dash in the walkthrough replaced with a colon. | No. The denial is correct and the rule is a standing project rule; this was my own slip in list punctuation, not a judgment call. |

WARN answered, run 1: `WARN enc.definition.name definition does not name the species`. The original encyclopedia definition opened with the category noun `A Grimedes predator` and never used the word Tetrahive. The encyclopedia register calls for leading with the category noun, but the entry is also a lookup record, so it should say its own name. I rewrote the opening to `The Tetrahive is a predator of Grimedes`, which keeps the definitional lead and names the species. This is a real improvement, not a workaround.

No script rule looks wrong to me on this species. Nothing was denied that I would argue for restoring.

## Validator output

Final run, `node docs/species-templates/tools/validate-template.js tetrahive`:

```
0 FAIL, 0 WARN (structurally clean; every WARN must be answered in the walkthrough)
logged to docs\species-templates\validation-log\tetrahive.jsonl
```

## Orchestrator amendments

- 2026-09-02: the independent validator found three clauses of the upgraded description that the sources do not support: 'the observatories bred' (the Generator, not the observatories, produced the Xalians), 'thins to nothing when struck' (no sentence describes behavior under damage; this had also leaked into the Encyclopedia entry), and 'never presents a target' (a tactical claim stated as fact). The description and the Encyclopedia definition were rewritten by the orchestrator. The clause table above is superseded by this one.

Rewritten description (125 words), clause by clause:

| Clause | Status | Source |
|---|---|---|
| a cloud of small flying bodies, each little more than a mouth of teeth like a piranha's | SUPPORTED | species: "a swarm of small flying familiars with teeth like piranhas" |
| one creature distributed across many, every unit held to a single mind | SUPPORTED (reframed, see open question) | species: "It controls the swarm with its mind" |
| built as test subjects rather than a labor force | SUPPORTED | planet: "not intended to serve as a labor force, but as a population of test subjects for experimentation" |
| the Vallerii, convinced the black hole lay behind the planet's strange occurrences, insisted on studying its effects on the Xalian population | SUPPORTED | planet: "The Vallerii were quick to point the finger to Grimedes' black hole, and insisted on studying its effects on the Xalian population" |
| a body that could be divided and counted suited that work | INFERRED connective, no new fact | |
| the Generator, believed to have been funded by ECHELON, obliged | SUPPORTED, hedged as the source hedges | planet: "the top secret Xalian Generator deployed on Grimedes was believed to have been funded by ECHELON" |
| hunts over the thick, stalky undergrowth of the flats | SUPPORTED | planet: "What was once nothing but cold, flat rock came to be covered in a layer of thick, stalky undergrowth" |
| attacking and defending as one unit | SUPPORTED | species: "attacking or defending as one unit" |
| takes its place among the Grimedites who watch the endless black for the return of APEX | SUPPORTED | planet: "the Grimedites stand at the edge of the galaxy, trusted or perhaps condemned to watch the endless black and guard against APEX's inevitable return" |

Encyclopedia definition rewritten to the same facts with the damage clause removed.
