# Smokat: migration walkthrough

## Art reading (step 1)

The render shows a single lean feline standing upright on its two hind legs, chest raised and back arched, with both forelimbs lifted clear of the ground and the paws held open, toes spread, in front of the chest. The head is in profile: pointed tufted ears, a long muzzle drawn open in a snarl over a full row of small sharp teeth, and one narrow slit eye. A long tapering tail sweeps down and away to the left and its tip dissolves into a large roiling curl of vapor drawn as a separate billowing mass. Curling tongues of smoke rise along the entire right side of the animal, off the shoulder, off the raised forepaw, off the flank, off the hind thigh, and off the standing foot; the same curls trail from the tail tip. The hind feet end in three splayed clawed toes. The outline of the trunk is smooth and unbroken, with no tufting, plume edges, plate seams, or scale seams anywhere on it. It is one body, not many.

## Lore

The lore split (Nick, 2026-09-09) puts Nick's teaser back into `lore.description` verbatim and moves everything else into two authored fields.

### appearance (7 entries)

- Lean feline shape held in a body of smoke, standing on two legs
- Surface of smoke with no firm edge
- Long muzzle
- Pointed tufted ears
- Clawed paws
- Long tail whose tip trails off into loose smoke
- Nearly weightless

Rewritten 2026-09-09 for the ghost register (see the amendment of that date); draft until Nick signs it off.

### fields (5 of 5)

- **origin**: One of the non-corporeal Xalians the abandoned Phantiri Generator produced after it rewrote itself under Leviticus Overdrive.
- **habitat**: The Dreadscape of Phantiri, inside its windless fog.
- **feeding**: It takes nothing in and feeds on nothing.
- **behavior**: It holds a feline shape, climbs and springs where the footing is bad, and instantly atomizes into a cloud of smoke for a sneak attack or a quick escape.
- **company**: It hunts alone.

Habits split (Nick, 2026-09-10): the habits paragraph and biomeNiche are struck. Five short fields, one question each, in ordinary language: origin (who generated it and what for), habitat (where it lives now), feeding (how it eats), behavior (how it goes about its business), company (alone, pairs, crews, swarms). All five are required (Nick, 2026-09-10, later the same day): a consumer that reads a field must never find it missing, so where the canon is silent the field carries the plainest reading the record supports, hedged in the encyclopedia voice where the record itself is lost, and Nick rules on it with the rest. Planet history stays in the planet records; a field names the world only where the creature itself is involved. No sign-off lines, no hazard sentences written to justify traits. Draft until Nick signs off.

Fields required (Nick, 2026-09-10): filled company ("It hunts alone."). Source reading: the teaser, the diet key and the planet history; where they are silent the phrase is the plainest reading of the record and is flagged for Nick with the batch.

## Source text

Species description (verbatim, and the whole of it): "Feline shaped in normal form, this clever creature can instantly atomize into a cloud of smoke for a sneak attack or quick evasion."

That is a two-sentence-class stub, well under the 60-word register floor, so `descriptionStatus` is `upgraded`.

## Step 2: upgraded description, clause by clause

Final text:

A lean feline that walks upright on its hind legs, with a long tail and a body that trails vapor at every joint, the Smokat was printed by the secret Generator installed in the bowels of Phantiri to work the dig sites the Imperial Houses opened across the world. It is clever, and in normal form it is flesh and claw, but it can instantly atomize into a cloud of smoke, so a collapsing gallery took nothing from it and no overseer could hold it long. The Generator has since gone on churning under the Leviticus Overdrive, and the Smokat now hunts the haze above the Dreadscape, where a body that scatters at will is the difference between competing for a Scrambler Token and joining the mass grave underfoot.

(133 words, one paragraph, present-and-past register, no em-dashes.)

| Clause | Source |
|---|---|
| `a lean feline` | species: "Feline shaped in normal form" |
| `walks upright on its hind legs` | art: forelimbs lifted clear of the ground, paws open, weight on the two hind feet |
| `with a long tail` | art: long tapering tail sweeping down and left |
| `a body that trails vapor at every joint` | art: smoke curls off shoulder, forepaw, flank, thigh, foot, tail tip |
| `was printed by the secret Generator installed in the bowels of Phantiri` | planet: "But the Vallerii had left behind a secret Xalian Generator in the bowels of Phantiri" |
| `to work the dig sites the Imperial Houses opened across the world` | planet: "They would need Xalian laborers after all, to do the heavy lifting necessary to uncover the answers to the one question that now plagued them." and "Ever more dig sites continued to uncover stranger and stranger artifacts" |
| `It is clever` | species: "this clever creature" |
| `in normal form it is flesh and claw` | species: "Feline shaped in normal form"; art: claws on the hind feet, open forepaws |
| `it can instantly atomize into a cloud of smoke` | species: "can instantly atomize into a cloud of smoke" |
| `so a collapsing gallery took nothing from it` | connective consequence of the atomizing sentence applied to the dig-site setting; planet: "The Xalians would be the ones getting their hands dirty anyway." |
| `no overseer could hold it long` | species: "quick evasion" read against the laborer role; adds no new power |
| `The Generator has since gone on churning under the Leviticus Overdrive` | planet: "the Phantiri Generator has re-written its own code in what has been coined the Leviticus Overdrive" |
| `now hunts the haze` | planet data block terrain field: rocky cliffs, shallow oceans, thick haze; species: "sneak attack" |
| `above the Dreadscape` | planet: "blanketed in a vast wasteland known as the Dreadscape" |
| `competing for a Scrambler Token` | planet: "its grotesque denizens must now compete for the Scrambler Tokens necessary to resurrect themselves" |
| `joining the mass grave underfoot` | planet: "the fluids that eek out from the ever-compressing layers of a planetwide mass grave" |

Nothing here names who bred it (the Generator printed it), no tactic beyond the two the stub names (sneak attack, evasion), and no behavior the sources do not carry.

## Step 3: buried-auto-trait pass

Body-demanded at 100: `stealthy`. The stub names the sneak attack outright, and the body that carries it out is the atomizing one, so every individual has it.

No other trait is demanded. The body is `bare`-surfaced flesh, so no `armored`. It is corporeal and free-moving, so no `anchored` and no automatic `phasing`.

## Step 4: physiology, field by field

| Field | Value | Evidence |
|---|---|---|
| corporeality | `corporeal` | species: "Feline shaped in normal form" gives a resting physical body; the smoke is a state it enters, and section 5.5 rules that a transient state produced by an ability never changes composition, covering, or body plan |
| composition.primary | `flesh` | species: a feline in its normal form is living animal tissue; the registry's own worked case is that a body that can become smoke is `flesh` alone |
| composition.secondary | omitted | no second substance forms a structural part of the resting body in either source |
| bodyPlan | `biped` | art: the forelimbs are free of the ground and the paws are held open in front of the chest, the ratified test for `biped`; the description names no number of legs so the art decides |
| anatomy: `claws` | art: three splayed clawed toes on each hind foot, open spread-toed forepaws | the hooking and raking digits key |
| anatomy: `jaws` | art: muzzle drawn open in a snarl over a full row of small sharp teeth | the full biting mechanism |
| anatomy: `tail` | art: long tapering tail sweeping down and left | |
| anatomy: `hide` | authored surface key; the body has no armored aspect anywhere in either source, and only one of `hide` and `shell` may be declared | |
| covering | `bare` | neither source names a surface; the art outline is smooth with no tufting, plume, plate, or scale edges, and per the ratified rule a smooth outline shows nothing, so the default applies. Listed under Authored fields. |
| size | 150 to 185 cm, 58 to 84 kg | legacy gauge is 170 cm / 77 kg, used as a relative reading only; an upright feline of that build lands in this band |
| lifespan | `standard` | cut 1 and 2 do not apply (flesh); cut 3 by mass midpoint 71 kg falls in 20 to 200 kg, giving `standard`; no adjustment, since nothing calls it cold, slow, or long-lived and the covering is not armored; cut 4 does not apply, since no description sentence says the environment shortens its life |
| genome.chirality | `rolled` | default; a flesh body has chiral chemistry |
| diet | `carnivore` | species: "sneak attack" alone is not a feeding sentence, so this is settled by the body: an upright feline with claws and a full row of small sharp teeth in the art. Listed under Authored fields as an art-and-default call, not a source sentence. |
| communication | `["vocal"]` | art: the muzzle is drawn open in a snarl, a sound the body makes; `vocal` covers cries and hisses |
| breathes | `["gas"]` | the planet data block terrain field names thick haze, an atmosphere; a flesh feline on a fogged surface world is an air-breather |
| ambientMedia | `["gas"]` | same; nothing shows it sustaining activity submerged, and the shallow oceans in the data block are terrain, not its habitat |
| temperatureC | -30 to 45 | planet data block: a low of -58 C and a high of 53 C; the authored band is a narrower sub-band inside that range, pulled in at both ends because a bare-skinned flesh body has no insulating covering |
| flight | [0, 0] | no wings in the art, `biped` plan, corporeal body |
| swim | [10, 30] | nothing shows it swimming; a token mammalian band |
| burrow | [5, 20] | nothing shows it burrowing |
| climb | [55, 80] | art: claws on all four extremities and a long tail; a climbing feline build |
| sprint | [60, 85] | species: "quick evasion" and "sneak attack"; legacy gauge rates evasion high |
| leap | [55, 80] | art: the upright, coiled, springing posture; feline build |
| manipulation | [30, 55] | art: forelimbs free of the ground with open spread-toed paws held in front of the chest; kept under 60 because `claws` are hooking digits, not a grasping hand, and the upper bound stays under the 40 rule only where that rule bites, which is above 40 with no grasping anatomy. `claws` is grasping-capable anatomy under the registry's hooking-digit definition; if the orchestrator reads `claws` as non-grasping, drop the upper bound to 40. |
| senses.sight | [55, 80] | art: a drawn eye; a predator head in profile |
| senses.hearing | [55, 80] | art: large pointed tufted ears |
| senses.smell | [45, 70] | art: a long muzzle |
| senses.special | omitted | no source sentence supports any of the six |

## Step 5: instruments

`claws` and `jaws`. Both are physical and both are in anatomy. Chosen over `tail` and `hide` because the stub's one act is a "sneak attack", and the parts the art arms it with for that are the raised open claws and the snarling jaws. No channel is taken: there is no `vocal`-driven attack sentence to justify `voice`, no emanation sentence for `aura`, and the smoke is a state the body enters rather than a substance it emits at a target, so `secretion` and `breath` are not earned.

## Step 6: archetype weights

`prowler` 5 (agility and instinct; species: "sneak attack" and "quick evasion"), `predator` 4 (instinct and reflex; art: the snarling predator head and the claws), `skirmisher` 3 (agility and reflex; the same two words), `seeker` 2 (instinct and intelligence; species: "this clever creature"), `rogue` 1 (charisma and reflex; the lightest weight, carried only by the cleverness clause).

## Step 7: attribute bands

Legacy `statRatings` rate only two things, standardAttackRating `high` and evasionRating `high`, used as a relative gauge. Agility, reflex and instinct top out at 82 and 76 to carry the evasion and the ambush. Strength peaks at 70 for the attack rating. Intelligence peaks at 70, well below true-human range, for "this clever creature". Vitality, endurance, willpower sit mid. Charisma and resilience are the lowest, since nothing in either source gives it presence or toughness and its whole answer to being hit is to not be there.

## Step 8: element

Primary `ghost`, from `type` in the species entry. Home planet Phantiri. On-graph secondaries for `ghost` are `dark` and `psychic`; the template does not pick one and does not override the 75/25 baseline, so `affinityOdds` is omitted.

## Step 9: trait pool

Reshaped on 2026-09-08 under Nick's pool-shape ruling. Two required traits, four rolled entries whose shares sum to 100, six entries in all, which is the cap. Expected count 3.00. The chance an individual lands none of the four rolled traits is 30.9 percent.

**Required**

| Trait | Evidence |
|---|---|
| `stealthy` | The behavior the description and the signature ability are built around. species: "can instantly atomize into a cloud of smoke for a sneak attack or quick evasion", and the signature is an ambush that crosses the ground as haze and closes with the claws already out. Every individual carries it. |
| `slippery` | The other half of the same sentence, which names quick evasion as the second use of the trick, and the body fact behind it: a creature that comes apart into smoke cannot be held. Two required traits is the normal ceiling, and this species genuinely has two defining acts, one for reaching a target unseen and one for not being caught. Legacy `statRatings` agree, `evasionRating` high, but the sentence is what makes it required. |

**Rolled (shares sum to 100)**

| Trait | Share | Evidence |
|---|---|---|
| `phasing` | 35 | A species sentence about the species' own body: it atomizes into a cloud of smoke and gathers itself again. That is the corporeal-body case the registry calls a rare roll, and it is the strongest species-level evidence in the rolled set, so it leads. Well short of the required tier because the resting body is solid flesh and claw. |
| `nocturnal` | 30 | The Phantiri data block's terrain field names thick haze, and the species hunts that haze over the Dreadscape. A planet-wide dimming rather than a true night world, and the description never makes darkness the point of the creature, so it sits in the rolled set. |
| `perceptive` | 20 | Record fields: `senses.sight` and `senses.hearing` are both banded to an upper bound of exactly 80, which is at the bar, and the art gives large tufted ears. There is no `senses.special` entry. Rolled-set evidence only. |
| `resistant` | 15 | planet: "deep, tarry oceans formed from the fluids that eek out from the ever-compressing layers of a planetwide mass grave" is a contamination a body generated there may partly shrug off. Weakest entry: environmental, and no sentence attaches it to this creature. |

#### Cut by the evidence bar (2026-09-07)

| Trait | Former percent | Evidence class that failed |
|---|---|---|
| `solitary` | 45 | argued from absence; the record itself calls it an absence of evidence rather than evidence of solitude |
| `foresighted` | 4 | no source sentence; a rare-band minimum carried only by the stub word clever |

Under the widened iteration-two bar neither cut entry is restored: `solitary` has no sentence and no ratified field, Phantiri's report records proximity-aversion territoriality only for other populations and only as a behavior, which class 3 may never carry; `foresighted` has no sentence, no `senses.special` entry, and no ratified field of any kind behind it. `resistant` at 15 is re-checked under ruling B and kept: its support is the planet's tarry runoff basins over a planetwide mass grave, which is contamination and not a thermal or desiccation hazard. The 2026-09-08 narrowing does not touch it either, since the support is neither thin air, dust, static discharge nor temperature. Phantiri's report adds nothing at 100: its one hazard is the lunar weapon, which no body adapts to, and its single output priority is non-corporeal architectures, which this corporeal body does not satisfy.

Traits considered and left out: `menacing` (nothing in either source shows it eroding courage; the snarl in the art is an attack posture, not a presence effect), `luminous` (nothing sheds light), `regenerative` (no source), `armored` (a `bare` covering forbids it), `toxic`, `volatile`, `reflective`, `healing`, `protective`, `inspiring`, `hypnotic`, `mind-sealed`, `telekinetic`, `ramming`, `anchored`, `pack-bonded` (all unsupported).

## Step 10: signature ability

The lore-defining act is the whole of the stub: "can instantly atomize into a cloud of smoke for a sneak attack or quick evasion".

Catalog ledger scan: `grep -i smokat` across every `consolidated-*.md` and `neutral-pools.md` returns nothing, so no name, instrument, action, or medium is reserved for this species and I coin one.

- name `The Scattering Pounce`. Collision scan run case-insensitively across all fourteen `consolidated-*.md` files and `neutral-pools.md`: 0 hits, and 0 hits for the bare `Scattering Pounce` too. Grander register, no possessive, no hyphen, no borrowed or real-world reference.
- instrument `claws`. Per the ratified pilot lesson the instrument is the part where the effect terminates on the target, not the physics that produces it: the smoke is how it crosses the ground, the claws are what lands.
- action `ambush`. The registry defines it as a burst of closing speed that ends in a hit, which is exactly the "sneak attack" the stub names. `ambush` is in the allowed set for `claws`.
- medium `ghost`. The primary element, so it has element cover with no rolled affinity needed.
- intensity [35, 85]. A wide band: the legacy gauge rates its standard attack `high`, so the top is high, and the floor is left low so individuals differ.
- description: `It comes apart into smoke mid-stride, crosses the ground as haze, and is whole again with its claws already closing.` One line, canon voice, no mechanics, no em-dash, and it reverts, so no permanent transformation.

## Step 11: catalog check through the species lens

Combos are instrument x allowed action x medium, over the primary `ghost` and the two on-graph secondaries `dark` and `psychic`. Counts are the element cell plus the neutral pool for that action, with `[claws]`- and `[jaws]`-tagged names drawable and other-instrument-tagged names excluded.

`claws` actions are strike, rake, crush, shove, ambush. `jaws` actions are strike, crush, rake, drain, snare. Union: strike, rake, crush, shove, ambush, drain, snare.

Every one of those cells in `consolidated-ghost.md` is large (strike 160, rake 111, drain 173, ambush 96, snare 171, shove 69, crush 25), and every neutral pool for those actions is 43 to 100 names. The smallest ghost cell in the union is `crush` at 25 names, and even after excluding names tagged for instruments this species lacks it clears 6 comfortably once the neutral crush pool of 53 is added. The `dark` and `psychic` files are of the same order.

**No thin-combo findings.** No combo falls below 6 drawable names.

## Step 12: encyclopedia entry

Written to `smokat.encyclopedia.json`. It names the species, leads with the category noun, cross-references Phantiri, the Imperial Houses, and the Dreadscape by name, uses no registry word in prose, and carries no flourish.

## Authored fields

Values with no supporting source sentence, recorded here because the JSON carries no provenance:

- `covering: bare` : neither source names a surface and the art outline shows none; the ratified default.
- `anatomy: hide` : the minimum honest surface key for a body with no armored aspect. Smokat is on the section 8 list of species whose description names no clean part; `claws`, `jaws`, and `tail` are all sourced from the art, and `hide` is the one authored key.
- `diet: carnivore` : settled from the art's claws and teeth, not from a feeding sentence.
- `size` bands : proposed absolutes around the legacy relative gauge.
- `capabilities` swim, burrow, climb, leap, manipulation bands : reasoned from the feline body in the art, not from a source sentence. `sprint` alone rests on "quick evasion".
- `senses` sight, hearing, smell bands : reasoned from the head drawn in the art.
- `attributes` all ten bands : shaped by the two legacy ratings and the art, not by source sentences.
- `archetypeWeights` : a judgment about how the body reads.
- `lifespan: standard` : derived by the rubric from an authored mass band.
- `temperatureC` sub-band : narrowed inside the planet range by judgment about a bare-skinned body.
- `intensity: [35, 85]` : a judgment band.
- `communication: ["vocal"]` : rests on the art's open snarling muzzle, not on a description sentence.

## Script denials

None. The validator raised no FAIL on any authored value. The only two FAILs in the log for this key are `file.missing` on `smokat.md` and `smokat.encyclopedia.json` from the first run, made before those two files existed; both were resolved by writing the files, and neither was a denial of an idea.

One WARN was answered by revision rather than argument: `traits.expected` fired at 3.99 on the first pool. I regarded that as a fair call, dropped `menacing` (which had no source sentence behind it), and trimmed `phasing`, `perceptive`, and `resistant`, bringing the expected count to 3.44. The original pool was not better; the `menacing` entry in it was the weakest-sourced value in the whole template.

## Open questions for Nick

The registry rules that a transient state produced by an ability never changes composition, covering, or body plan, which is what makes Smokat a corporeal flesh biped whose smoke form lives entirely in its signature. That reading is clean, but it leaves the ghost element carried almost nowhere in the physiology block: this creature is a cat, and everything spectral about it is one ability. Would you rather it stayed a plainly physical animal with a single uncanny trick, which is how the stub reads, or should the smoke form get more purchase on the body, for instance by pushing `phasing` well above the 20 percent I set so that a meaningful share of individuals are partly untouchable at rest?

## Validator output

```
$ node docs/species-templates/tools/validate-template.js smokat

0 FAIL, 0 WARN (structurally clean; every WARN must be answered in the walkthrough)
```

Two WARNs were raised across the run and both were answered by revision rather than argument. `traits.expected` fired at 3.99 on the first pool; I dropped `menacing` and trimmed three percents, bringing the expected count to 3.44. `enc.definition.name` fired because the encyclopedia definition did not name the species; I rewrote it to open with `The Smokat is`. Both were fair calls.

## Orchestrator amendments

- 2026-09-09, Nick ruled that Phantiri Xalians are non-corporeal across the board, since the Leviticus Overdrive rewrite is the point of that world's story. The record moves to the ghost register: corporeality non-corporeal; composition gas (a body of smoke that holds a feline shape at rest); covering mist; anatomy hide replaced by body; weight 0.5 to 3 kg against the legacy 77 kg, which was a flesh reading; lifespan ageless (cut 1 of the lifespan rubric widened the same day to every non-corporeal body, reported as a lever); diet none; breathes nothing; flight 20 to 45 as drifting smoke; manipulation 20 to 40; vitality and resilience lowered for a body with nothing to bruise. Trait pool reshaped: phasing 100 and stealthy 100 required, slippery 40, nocturnal 25, perceptive 20, resistant 15 rolled. Instruments, signature (an ambush through the claws in the ghost medium) and archetype weights stand. Habits rewritten to the Overdrive origin; the earlier habits paragraph, which had it coming off the secret Generator as a supplier to organic laborers, contradicted the planet and is withdrawn. Appearance list rewritten and returned to draft.

- 2026-09-02, after the independent validation: `diet` changed from `carnivore` to `omnivore` under the ratified selection rule (a sneak-attack sentence is fighting, not feeding, and a flesh body with no feeding sentence defaults to `omnivore`); the Leviticus Overdrive clause was cut from the description because that regime produces non-corporeal Xalians and the Smokat is flesh; the Encyclopedia definition dropped the unsourced lethal-stakes clause and no longer says the smoke reassembles elsewhere, which read as teleportation. `manipulation` [30, 55] stands: `claws` is grasping anatomy in the validator's list, and the skill now states that list explicitly.
- 2026-09-02, voice (Nick): the invented collapsing-gallery and overseer clause and the dramatic closing line were cut; the description now ends on the stub's own facts (quick evasion and sneak attacks). Word count 95.
- 2026-09-02, conduits (Nick): reviewed; no instrument is shown channeling an element, so no conduits are declared.
- 2026-09-02, archetype scale (Nick): `archetypeWeights` converted from relative 1 to 5 weights to percents summing to 100 by largest remainder, order preserved: prowler 33, predator 27, skirmisher 20, seeker 13, rogue 7 (was prowler 5, predator 4, skirmisher 3, seeker 2, rogue 1).
- 2026-09-02, archetype rethink (Nick): the converted row kept the old 5-4-3-2-1 ladder shape shared by every record, so the distribution was re-authored on this species alone: prowler 40, skirmisher 30, predator 22, rogue 8 (was prowler 33, predator 27, skirmisher 20, seeker 13, rogue 7). Reasoning: the stealth cat (stealthy 100, slippery 85, an ambush signature) is agility and instinct before anything else; seeker dropped, it has no investigative reading.
- 2026-09-02, planet rebuild: `temperatureC` re-banded from [-30, 45] to [-30, 20] (intersection) against the rebuilt planet record's habitable band [-50, 20] C; the old band was validated against the legacy planetary extremes, which are not survivable. Any gravity figure cited in this walkthrough predates the rebuild; the current value is `physical.derived.gravityEarth` = 0.45.
- 2026-09-02, consistency sweep: covering set to hide (was bare) under the ruling that a flesh animal body carrying the hide anatomy key takes the hide covering; bare is for membranes, slime, plant and mineral surfaces.
- 2026-09-07, trait evidence bar (Nick): cut `solitary`, `foresighted`; pool expected count 3.44 to 2.95.
- 2026-09-07, trait evidence bar iteration two (Nick): restored none; cut none; expected count 2.95 to 2.95.
- 2026-09-08, trait evidence bar iteration three (Nick): added none; raised `slippery` 85 to 100; cut none; expected count 2.95 to 3.10.
- 2026-09-08, pool shape (Nick): required `stealthy`, `slippery`; rolled `phasing` 35, `nocturnal` 30, `perceptive` 20, `resistant` 15; expected count 3.10 to 3.00.
- 2026-09-09, lore split (Nick): description reverted to species.json; body and habits authored; descriptionStatus removed.
