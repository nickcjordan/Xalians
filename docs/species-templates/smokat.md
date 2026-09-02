# Smokat: migration walkthrough

## Art reading (step 1)

The render shows a single lean feline standing upright on its two hind legs, chest raised and back arched, with both forelimbs lifted clear of the ground and the paws held open, toes spread, in front of the chest. The head is in profile: pointed tufted ears, a long muzzle drawn open in a snarl over a full row of small sharp teeth, and one narrow slit eye. A long tapering tail sweeps down and away to the left and its tip dissolves into a large roiling curl of vapor drawn as a separate billowing mass. Curling tongues of smoke rise along the entire right side of the animal, off the shoulder, off the raised forepaw, off the flank, off the hind thigh, and off the standing foot; the same curls trail from the tail tip. The hind feet end in three splayed clawed toes. The outline of the trunk is smooth and unbroken, with no tufting, plume edges, plate seams, or scale seams anywhere on it. It is one body, not many.

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

| Trait | Percent | Reason |
|---|---|---|
| `stealthy` | 100 | species: "sneak attack"; the defining act, body-demanded |
| `slippery` | 85 | species: "quick evasion", and a body that "can instantly atomize into a cloud of smoke" cannot be held; a few individuals fall short of it by Generator variance |
| `nocturnal` | 55 | the planet data block terrain field naming thick haze, plus the Dreadscape wasteland; an environmental adaptation a planet-wide fact may justify, but the haze is dimming rather than true perpetual night, so this is a coin-flip and not near 100 |
| `solitary` | 45 | species: the stub gives it one creature acting for itself with no group; kept under half because that is an absence of evidence rather than evidence of solitude. `pack-bonded` is not listed, so the exclusion pair never both sits at 100 |
| `perceptive` | 20 | art: large tufted ears and a drawn eye; a modest species-level chance, not derived from any planet-wide sentence |
| `resistant` | 15 | planet: "deep, tarry oceans formed from the fluids that eek out from the ever-compressing layers of a planetwide mass grave" is an environmental contamination a species generated there may partly shrug off; environmental only, kept low |
| `phasing` | 20 | species: "instantly atomize into a cloud of smoke" is the corporeal-body case the registry calls a rare roll; raised above single digits because the atomizing is this species' signature act, but held well below half because the resting body is solid |
| `foresighted` | 4 | registry rare band, 2 to 8; carried only by the cleverness clause |

Expected trait count: (100 + 85 + 55 + 45 + 20 + 15 + 20 + 4) / 100 = 3.44.

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
logged to docs\species-templates\validation-log\smokat.jsonl
```

Two WARNs were raised across the run and both were answered by revision rather than argument. `traits.expected` fired at 3.99 on the first pool; I dropped `menacing` and trimmed three percents, bringing the expected count to 3.44. `enc.definition.name` fired because the encyclopedia definition did not name the species; I rewrote it to open with `The Smokat is`. Both were fair calls.
