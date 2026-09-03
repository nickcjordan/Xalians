# Ectoghoul (ghost, Phantiri) migration walkthrough

## Reading of the art

The art is a black-and-white silhouette of a single body with no limbs at all. A large, cleanly drawn human-style skull occupies the upper right, tipped back and to the side, with two deep empty orbits, a small triangular nasal opening, and a wide grinning row of squared teeth running in an upturned arc; there are no lower jaw hinges drawn as a separate piece, so the grin reads as one fused mouth. Below and to the left the skull's base runs straight into a smooth, thick, tapering ribbon of body that curves down and then hooks back on itself, splitting near the end into two or three thin trailing streamers that curl into points. There are no arms, no legs, no wings, and no fins anywhere in the image. The entire lower half of the body dissolves into a dense scatter of small dark specks, thickest where the body is and thinning outward in every direction, so that the tail does not end at an edge but disperses into a cloud of particles. The posture is a drift or a swoop, nose up and tail streaming behind, the way something hanging in air is drawn rather than something standing. One body, one head, no limbs, no ground contact.

## Sources

Species entry (`species.json`, Ectoghoul, id 00024): type Ghost, planet Phantiri, legacy height 35 in / 90 cm, legacy weight 6 lbs / 3 kg, legacy `statRatings` special attack `medium` and evasion `high`, legacy `traits` `canFly: true` and `attackRange: medium`.

Species description, in full: "Appearing as a spectral green mist that forms the vague impression of a grinning skull with a ghost-like tail for a body, Ectoghouls zip across the Dreadscape, emitting a terrifying cackle wherever they go. They seem to amuse themselves by terrorizing other Xalians, disappearing and re-appearing at will, passing through surfaces, and zapping their opponents with blasts of gooey ectoplasm."

Planet `data` block (Phantiri): Terrain of rocky cliffs, shallow oceans and thick haze, Gravity 1.65 x Earth, Temperature Low -58 C, Temperature High 53 C.

## Step 2. Description status

The legacy description is a two-sentence stub. It carries the body appositive and the present-day behavior but has no engineered-purpose clause and no anchored institution, so it is not in the full register. Status is `upgraded`. Word count 124, one paragraph, present tense.

Clause-by-clause provenance for the upgraded description:

- 'A spectral green mist that gathers into the vague impression of a grinning skull trailing a ghost-like tail for a body'. species: "Appearing as a spectral green mist that forms the vague impression of a grinning skull with a ghost-like tail for a body". Rephrased, not quoted, so no facts are added.
- 'was among the first forms the Phantiri Generator produced once the Leviticus Overdrive taught it to make life the moon-weapon could not read as living'. planet: "In its mad state of activity, however, the Phantiri Generator has re-written its own code in what has been coined the Leviticus Overdrive. Under this new programming, the Generator has learned to create a wholly unrecognizable form of “life” – ghost-like Xalians formed of spectral energy, with no corporeal bodies to speak of." Hedged with 'among the first' rather than claiming primacy.
- 'a body the killing signal ignores'. planet: "Whatever the unknown weapon that is eradicating life on Phantiri truly is, it would appear that it only targets organic, cellular life."
- 'where organic laborers dropped dead on the spot'. planet: "the machine churned out new forms of life, seeing its extraterrestrial aggressor as an environmental factor to be overcome. No one knows how many centuries the Generator on Phantiri continued to pump out Xalians, only for them to drop dead on the spot as soon as they were recognized as living organisms".
- 'It was set to scout the corpse islands of the Dreadscape'. this is the engineered-purpose clause and it is the weakest inference in the paragraph. The Generator's stated intent is planet-wide ("seeing its extraterrestrial aggressor as an environmental factor to be overcome"), and the species-level statement is "Ectoghouls zip across the Dreadscape". Ranging the Dreadscape is species-sourced; the word 'scout' is my framing of it and is listed under Authored fields. Flagged as an open question below.
- 'Nothing now issues it orders'. planet: "All known findings related to Operation Phantiri were quickly sealed and classified, and the Wraithix System was marked as restricted space into perpetuity", plus "The entire excavation fleet went radio silent". No Vallerii oversight remains on the world.
- 'It zips across the tarry oceans and splayed forests of the mass grave'. species: "Ectoghouls zip across the Dreadscape"; planet: "islands of corpses covered in macabre forests of splayed limbs, and deep, tarry oceans formed from the fluids that eek out from the ever-compressing layers of a planetwide mass grave".
- 'passing through surfaces, disappearing and re-appearing at will'. species: "disappearing and re-appearing at will, passing through surfaces".
- 'amuses itself instead by terrorizing other Xalians'. species: "They seem to amuse themselves by terrorizing other Xalians".
- 'announcing every arrival with a cackle'. species: "emitting a terrifying cackle wherever they go".
- 'answering any challenge with a blast of gooey ectoplasm'. species: "zapping their opponents with blasts of gooey ectoplasm".

No em-dashes; American English; no mechanics named; no gendered pronoun; no lifespan in years.

## Step 3. Buried-auto-trait pass

Body-demanded at 100: `phasing`, because the body is non-corporeal. Species: "passing through surfaces"; and planet: "ghost-like Xalians formed of spectral energy, with no corporeal bodies to speak of". Registry: a non-corporeal body carries `phasing` at 100.

No armored covering, no shell, no roots, so no `armored` and no `anchored` at 100.

Environment-demanded: Phantiri is fog-covered but not stated to be dark, so `nocturnal` is not environment-demanded here; the `data` block gives thick haze, not perpetual night. I did not push `nocturnal` high on that basis.

Description- and art-suggested, at justified percents: `menacing`, `stealthy`, `slippery`, `toxic`, `perceptive`, `luminous`, `hypnotic`, `solitary`, `resistant`, `foresighted`. Each is argued in step 9.

## Step 4. Physiology

**corporeality: `non-corporeal`**. species: "passing through surfaces" and "disappearing and re-appearing at will"; planet: "ghost-like Xalians formed of spectral energy, with no corporeal bodies to speak of". The registry definition of `non-corporeal` is "has no persistent physical body; matter passes through it and it through matter", which the description states outright.

**composition.primary: `spectral`**. planet: "ghost-like Xalians formed of spectral energy". The registry allows `spectral`, `energy`, or `gas` for a non-corporeal body. The description calls it a "spectral green mist", using the ghost register word directly, and `spectral` is defined as "a body of the ghost register: present, visible, and acting, but made of neither matter nor energy that instruments can name". No secondary: nothing in the description or art is a second structural substance. The skull is an impression the mist forms, not a bone: species says it "forms the vague impression of a grinning skull", so a `mineral` secondary would be wrong.

**bodyPlan: `floating`**. the art shows no wings, no fins, no legs, no bearing limbs of any kind, and a body drawn hanging in the air. The registry selection order takes `swarm` first, but this is one body, not many. `floating` is defined as "a body that hangs, drifts, or glides in its medium with no wings and no fins, held up by gas, field, or the ghost register", and adds "Speed and direction do not matter; the absence of wings and fins does. A fast wingless flier is `floating`." The legacy `canFly: true` and the species word "zip" describe speed, which the rule explicitly says does not move the value.

**anatomy: `jaws`, `tail`, `body`** :
- . art: the skull's wide grinning row of squared teeth is the one drawn functional feature, and species names "a grinning skull". Registry `jaws` is the full biting mechanism. I took `jaws` rather than `fangs` because the art teeth are squared and even, not piercing points.
- . species: "with a ghost-like tail for a body"; art: the whole lower body is one tapering streaming ribbon.
- . the universal fallback, and honest here: the mist as a whole is what passes through surfaces and what the ectoplasm comes off.
- Deliberately absent: no `hide` and no `shell`, because a non-corporeal mist has no defensive surface and the registry allows at most one of those two anyway; no `light-organs`, because nothing in either source says the body sheds light (the green color is a color, not an emission); no `vents`, because the ectoplasm blast is not shown coming from an opening; no `wings`, because the art shows none.

**covering: `mist`**. species: "a spectral green mist". The registry rule is explicit: "a body the description says is made of, wrapped in, or surfaced with mist, smoke, or vapor takes `mist`", and separately "A `gas` composition takes `mist`". Here the composition is `spectral` but the named surface is mist, and a named surface always beats a default.

**size: heightCm [80, 105], weightKg [0, 1]**. legacy height is 35 in / 90 cm, used only as a relative gauge; the band is centered near it because nothing contradicts it and a body that is a skull plus a streaming tail at roughly a meter reads right against the art proportions. Legacy weight of 3 kg is discarded, because the planet says these bodies have "no corporeal bodies to speak of"; a body matter passes through has no meaningful mass. The band is [0, 1] rather than exactly zero so that individuals differ and so the field remains a measurement rather than an assertion of literal nothing.

**lifespan: `ageless`**. rubric cut 1: "Spectral and energy bodies are `ageless` (still killable)." Composition is `spectral`, so the mass cut and the harshness cut never run. Canon section 2 agrees: non-corporeal bodies do not wear out.

**genome.chirality: `achiral`**. the registry allows `achiral` "only when the body has no chiral chemistry (energy, spectral, some mineral)". Planet: "formed of spectral energy". There is no chemistry here to be handed.

**diet: `none`**. the registry fallback for an unstated diet on "a spectral, energy, mineral, or metal body" is `none`, and the definition of `none` is "does not feed at all, stated or implied by a body with no way to take anything in (spectral and energy bodies…)". Neither source shows the Ectoghoul consuming, draining, or absorbing anything. The description shows it fighting and harassing, and the registry is explicit that "a sentence that shows only fighting, guarding, or harassing an opponent is not evidence of feeding", so `carnivore` and `energy-feeder` are both unsupported despite the name Ectoghoul. Listed under Authored fields.

**communication: `vocal`, `display`** :
- . species: "emitting a terrifying cackle wherever they go". A cackle is a cry the body makes, and the description says it does it "wherever they go", which is signaling rather than an aimed effect.
- . species: "forms the vague impression of a grinning skull". The grin is a posture the mist adopts and holds, which is the registry's "signals to others by posture, color, light pattern, or gesture". This is the weaker of the two and is flagged in the open questions.
- Not `telepathic`: nothing in either source shows it touching a mind.

**breathes: `[]`**. a body with no corporeal form draws on nothing; planet: "with no corporeal bodies to speak of". Empty is legal and means non-breather, and it is trivially a subset of `ambientMedia`.

**ambientMedia: `gas`, `liquid`, `vacuum`**. Phantiri `data` gives Terrain of rocky cliffs, shallow oceans and thick haze, so both haze and ocean are on the ground it ranges, and the planet says the Dreadscape includes "deep, tarry oceans". `vacuum` follows from a non-corporeal, non-breathing body having nothing a medium supplies; this is the least directly sourced of the three and is listed under Authored fields.

**temperatureC: min -58, max 53**. the full home-planet band from the `data` block (Temperature Low of -58 C and Temperature High of 53 C). I did not narrow it: a body that is not organic tissue has no thermal envelope either source restricts, and the planet is fog-blanketed and rocky with no stated thermal refuge. Neither bound extends past the planet range.

**capabilities** :
- `flight` [55, 80]. species: "Ectoghouls zip across the Dreadscape", and legacy `canFly: true` as a relative gauge. High but not top-band, because no source shows it outrunning anything. The registry requires a `floating` plan or a non-corporeal body for a flight band above 0; this species has both.
- `swim` [20, 40]. planet: the Dreadscape has "deep, tarry oceans", and Terrain lists shallow oceans; it can cross them, but it does so above them rather than through them, so the band stays low. Environmental, planet-sourced, which is legal for a capability of habitat.
- `burrow` [10, 25]. species: "passing through surfaces". Passing through a wall of corpses is not movement through ground in the way the registry means, so this stays low rather than high; the phasing is carried by the trait, not by the band.
- `climb` [0, 0], `sprint` [0, 0], `leap` [0, 0]. the art shows no limbs and no ground contact at all; a body that never touches the ground does none of these.
- `manipulation` [5, 20]. no grasping anatomy in the art or the description, and `telekinetic` is not in the pool, so the registry caps the upper bound at 40 and honesty puts it far lower.

**senses**. `sight` [50, 75] and `hearing` [45, 70] are ordinary bands for a creature that finds and follows targets across a landscape; the art draws deep empty orbits where eyes go, which is a face shape rather than proof of vision, so nothing is pushed above 75. `smell` [0, 10] because a non-corporeal body draws in no air and neither source mentions scent. No `special` senses: the registry requires a source sentence or an art feature for each, and nothing supports `psychic`, `void-sense`, or any other. Omitted rather than left empty, per the field rule.

## Step 5. Instruments

`voice`, `secretion`, `jaws`.

- . predicate is `vocal` in communication, satisfied. Species: "emitting a terrifying cackle wherever they go". This is the part of the body the description actually uses on other creatures.
- . predicate is that the description supports an emitted substance. Species: "zapping their opponents with blasts of gooey ectoplasm". Ectoplasm expelled at an opponent is exactly an emitted substance. I chose `secretion` over `breath` because `breathes` is empty, which disqualifies the `breath` channel, and over `vents`, which is not in anatomy because no opening is drawn.
- . physical, and present in anatomy. Art: the grinning teeth are the only functional structure drawn. This is the thinnest of the three, because no source sentence shows the Ectoghoul biting; it is included because the skull mouth is the creature's whole visual identity and the registry wants parts the creature works with. Flagged in open questions.
- Not . the registry predicate needs "an emanation from the body as a whole that acts on everything around it", and the description aims its two acts at specific opponents ("terrorizing other Xalians", "zapping their opponents"), which the predicate says is that part's instrument instead.
- Not . nothing in either source shows a psychic act, and the predicate is unmet (element is ghost, no `psychic` special sense, no `telekinetic` or `hypnotic` at 100).

## Step 6. Archetype weights

`prowler` 5 (agility, instinct). species: "disappearing and re-appearing at will, passing through surfaces" is a body built to be where it is not expected. `skirmisher` 4 (agility, reflex). species: "zip across the Dreadscape", a fast harasser that never holds ground. `rogue` 3 (charisma, reflex). species: "They seem to amuse themselves by terrorizing other Xalians", which is presence used for effect. `predator` 2 (instinct, reflex). species: "zapping their opponents", a low weight because nothing shows it hunting to eat. `seeker` 1 (instinct, intelligence). species: "zip across the Dreadscape" gives it range over a landscape; smallest weight because nothing shows it searching for anything. No `vanguard`, `juggernaut`, `berserker`, `bulwark`, `survivor`, `stalwart`: every one of those leans on strength, vitality, or resilience, and a body matter passes through has none of the three.

## Step 7. Attribute bands

- `strength` [8, 25]. no limbs in the art, no corporeal body per the planet, nothing in the description it lifts, pushes, or holds.
- `vitality` [20, 40]. legacy `healthRating` is blank, so no relative gauge; a mist body is not a large reservoir of life force.
- `endurance` [35, 60]. species: "emitting a terrifying cackle wherever they go" and "zip across the Dreadscape" imply it keeps this up over a landscape, but nothing shows sustained output under pressure.
- `agility` [60, 88]. species: "zip across the Dreadscape"; legacy `evasionRating` is "high", the only high rating in the legacy block, used as a relative gauge.
- `reflex` [55, 82]. species: "disappearing and re-appearing at will", which is a body that reacts faster than it is caught; supported by the same legacy evasion gauge.
- `intelligence` [30, 52]. species: "They seem to amuse themselves by terrorizing other Xalians" shows deliberate mischief rather than instinct alone, but the description says "seem to", so it is hedged. Nowhere near true-human range, per canon.
- `willpower` [35, 60]. nothing in either source tests or demonstrates its mental fortitude; a mid band with no skew.
- `instinct` [45, 70]. species: it picks targets and closes on them ("zapping their opponents"), and it operates alone across a wasteland.
- `charisma` [40, 68]. species: "emitting a terrifying cackle wherever they go" is presence, in the registry's sense of presence and not eloquence; the grinning skull face reinforces it.
- `resilience` [15, 35]. the lowest defensive band; planet: "with no corporeal bodies to speak of", so there is nothing to be tough. It is not zero because the same fact is what makes it hard to hurt, which the `phasing` trait carries.

Legacy `specialAttackRating` "medium" was used only as a relative gauge and is reflected in a mid signature intensity band rather than in an attribute.

## Step 8. Element

Primary `ghost`, from the species `type` field, stored at affinity 100. On-graph secondaries for ghost are `dark` and `psychic`; the template does not pick one. `affinityOdds` is omitted, so the species inherits the 75 percent none / 25 percent one secondary baseline. Nothing in the source justifies an override.

## Step 9. Trait pool

Each percent is an independent roll. Expected count is the sum divided by 100, with the exclusion adjustment noted below.

- `phasing` 100. body-demanded. Species: "passing through surfaces"; planet: "with no corporeal bodies to speak of". Non-corporeal bodies carry it at 100 by registry rule.
- `menacing` 85. species: "emitting a terrifying cackle wherever they go" and "amuse themselves by terrorizing other Xalians". This is the single best-evidenced behavior in the description and it is species-sourced, not planet-sourced. Not 100, because the description says they terrorize by choice and amusement, so an individual that does not unnerve everything nearby is possible.
- `stealthy` 60. species: "disappearing and re-appearing at will". Vanishing at will is the registry's "moves unseen and unheard until it acts". Held at 60 rather than higher because the same sentence says it announces itself with a cackle "wherever they go", which cuts directly against being unnoticed; the two behaviors are in tension in the source and the percent reflects that.
- `slippery` 55. species: "passing through surfaces" plus the high legacy evasion gauge. The registry defines it as "cannot be held: escapes grabs, pins, traps, snares", which a body matter passes through plainly does. Not higher because `phasing` at 100 already carries most of that and I did not want to double-count.
- `nocturnal` 40. the weakest environmental case in the pool. Phantiri `data` gives a terrain of thick haze and the planet history calls it a fog-covered, rocky planet, which is dim rather than dark; the planet history never says Phantiri has perpetual night. So this is a moderate percent, not the 95 to 100 the registry reserves for a world of perpetual night. Environmental, planet-sourced, which the rules permit for `nocturnal`.
- `toxic` 30. species: "blasts of gooey ectoplasm". Ectoplasm delivered at an opponent may debilitate, but the source calls it "zapping" and never names an effect on the target's body, so this is a minority roll rather than a species fact.
- `solitary` 25. species: "Ectoghouls zip across the Dreadscape" and "They seem to amuse themselves by terrorizing other Xalians"; the description never shows two of them working together, and the target of the terrorizing is other Xalians rather than a pack around it. Exclusion partner `pack-bonded` is deliberately not listed, so its chance is 0 and no exclusion comparison ever runs.
- `perceptive` 20. species: it finds and closes on "their opponents" across a landscape. Behavioral, so it rests on the species sentence and not on any planet-wide statement. Low, because nothing shows it finding something hidden.
- `resistant` 15. planet: "it would appear that it only targets organic, cellular life", so the body is unreadable to the killing signal, and planet: the Dreadscape is "deep, tarry oceans formed from the fluids that eek out from the ever-compressing layers of a planetwide mass grave", which is a contaminated place to live. Environmental and planet-sourced, which the rules permit for `resistant`. Kept low because immunity to the moon-weapon comes from the body having no cells at all rather than from a hardiness trait.
- `luminous` 12. species: "a spectral green mist". Green is a color the source names, and a self-colored spectral body may well shed that light, but the source never says it glows, so this is a minority roll and not a fact.
- `hypnotic` 8. species: "emitting a terrifying cackle wherever they go" holds attention, and the grinning skull face in the art is drawn to be looked at. Single digits because the registry caps `hypnotic` at entrancing and the description shows fright, not fascination.
- `foresighted` 4. rare-band roll. Species: "disappearing and re-appearing at will" reads as being gone before the blow lands. Kept at the registry's rare band of 2 to 8 percent because nothing in either source claims precognition.

Sum: 100 + 85 + 60 + 55 + 40 + 30 + 25 + 20 + 15 + 12 + 8 + 4 = 454. **Expected trait count 4.54.** No exclusion pair is present in the pool (only `solitary`, not `pack-bonded`), so no adjustment applies. At least one entry is strictly between 0 and 100; only `phasing` is at 100.

Traits the body could plausibly carry that I left out, with reasons: `armored` (no covering or anatomy gives it an armored aspect; covering is `mist`), `anchored` (a drifting body is the opposite), `regenerative` (nothing shows it repairing), `healing` and `protective` and `inspiring` (nothing in the description shows it helping anything; it is explicitly described terrorizing), `ramming` (no mass and no sprint band), `volatile` and `reflective` (nothing shows it reacting when struck), `mind-sealed` (untested in the source), `telekinetic` (no source sentence and no manipulation to justify even the rare band), `pack-bonded` (excluded by the solitary reading above).

## Step 10. Signature ability

The lore-defining act. Two candidates sit in the source: the cackle and the ectoplasm blast. Species: "emitting a terrifying cackle wherever they go" and "They seem to amuse themselves by terrorizing other Xalians". the cackle is what it does everywhere and terrorizing is what it is for; species: "zapping their opponents with blasts of gooey ectoplasm" is what it does when engaged. I took the cackle, because the description frames terrorizing as the creature's purpose and the ectoplasm as the fallback, and because the ectoplasm blast is already fully served by the rolled-ability layer (`secretion` x `spray` x ghost, a 142-name cell, sampled below).

- `instrument`: `voice`. Predicate satisfied by `vocal` in communication. Per the ratified pilot lesson, the instrument is where the effect terminates on the target; a cackle terminates as sound, and the sound is made by the voice channel. Not `aura`, because the effect is aimed at a target rather than emanating on everything around it.
- `action`: `terrorize`, defined as "acts on the target's courage or will rather than its body". Species uses the word directly: "terrorizing other Xalians". `voice` allows `terrorize` in the matrix.
- `medium`: `ghost`, the primary element. Always covered.
- `intensity`: [45, 85]. Legacy `specialAttackRating` is medium as a relative gauge, and the description calls the cackle terrifying without escalating it, so the band centers above the middle and stops short of the top.
- `name`: `Rictus of the Dreadscape`. Grander register, exempt from the two-word limit, anchored to the named location in the source ("Ectoghouls zip across the Dreadscape"). Ledger check: a case-insensitive search for 'ectoghoul' across all fourteen `consolidated-*.md` files and `neutral-pools.md` returns nothing, so there is no reserved signature name for this species. Collision scan: a case-insensitive search for the exact string returns nothing; a search for the word 'rictus' alone returns nothing anywhere in the catalog; 'Cackle' appears once, in `consolidated-ghost.md`, but not in this phrase. No possessive, no hyphen, American English, no franchise or Earth-fauna reference, no weapon, no nuclear-age register.
- `description`: 'The mist tightens into a grinning skull and lets out a cackle that follows its target through walls, so that whatever is hunted hears the joke it has become long after the Ectoghoul has gone.' Every clause is sourced: the skull impression, the cackle, and passing through surfaces are all in the species sentence; 'amuses itself' becomes the joke framing. No mechanics named.

## Step 11. Catalog check through the species lens

Instruments are `voice`, `secretion`, `jaws`; media are `ghost` (primary) plus `dark` and `psychic` (the on-graph secondaries). Cell totals were read from the cell headers in each consolidated file; a species-lens count subtracts only names whose `[instrument tag]` excludes this species, and the smallest cells are the ones at risk.

| Instrument | Action | ghost | dark | psychic |
|---|---|---|---|---|
| voice | terrorize | 224 | 82 | 122 |
| voice | ward | 65 | 98 | 119 |
| voice | burst | 143 | 34 | 124 |
| secretion | spray | 142 | 12 | 53 |
| secretion | cloud | 163 | 18 | 112 |
| secretion | burst | 143 | 34 | 124 |
| secretion | drain | 173 | 133 | 84 |
| secretion | snare | 171 | 85 | 72 |
| secretion | ward | 65 | 98 | 119 |
| secretion | mend | 29 | 10 | 119 |
| jaws | strike | 160 | 331 | 85 |
| jaws | crush | 25 | 129 | 54 |
| jaws | rake | 111 | 228 | 12 |
| jaws | drain | 173 | 133 | 84 |
| jaws | snare | 171 | 85 | 72 |

Every cell is well above six before tags are applied, and the neutral pools add a further 54 to 100 names per action, so no combo is thin at the raw level. Two cells are worth flagging as near-thin once instrument tags bite:

- **dark x mend (10)** and **ghost x mend (29)** are the two smallest cells this species can reach, and both are reached only through `secretion`. The ghost file itself says of its own mend cell that it is honestly thin. A `secretion` x `mend` x dark roll draws from a pool of ten before tags, which is the one combination I would call at risk. It is unlikely to fire often, since `mend` sits badly with everything this species does, but it is reachable.
- **psychic x rake (12)** and **dark x spray (12)** are the other two single-digit-adjacent cells; both are reachable (`jaws` x `rake` x psychic, `secretion` x `spray` x dark) and both depend on a 25 percent secondary roll landing on that specific element first, so exposure is low.

### Thin-combo findings

No combo this species can reach falls below six drawable names, so there is no true thin-combo finding. Two are close enough to record. Both are reported here in full above.

No padding was performed; the catalog files were read only.

## Authored fields

Values with no supporting source sentence, recorded here because the JSON carries no provenance:

- `diet: none`. registry fallback for a spectral body with no feeding sentence in either source.
- `size.weightKg [0, 1]`. no source gives a mass for a non-corporeal body; the legacy 3 kg was discarded as contradicted by "no corporeal bodies to speak of".
- `size.heightCm [80, 105]`. anchored on the legacy 90 cm gauge, which the rules say is relative and not a value to copy.
- `ambientMedia: vacuum`. inferred from a non-breathing, non-corporeal body, not stated anywhere.
- `capabilities.burrow [10, 25]`, `climb [0,0]`, `sprint [0,0]`, `leap [0,0]`, `manipulation [5,20]`. no source addresses any of these; set from the limbless drifting body in the art.
- `senses.sight`, `senses.hearing`, `senses.smell` bands. no source grades any sense; ordinary bands assigned from behavior.
- All ten `attributes` bands. no source grades an attribute; the legacy `statRatings` block was used only as a relative gauge and is blank for seven of nine entries.
- `signatureAbility.intensity [45, 85]`. no source grades intensity.
- `lore.biomeNiche`. a phrase composed from the planet history, not a quotation.
- The word 'scout' in the upgraded description's engineered-purpose clause. my framing of a species-sourced behavior, not a sourced purpose.
- `archetypeWeights` values. the subset is argued from source sentences but the relative numbers are judgment.
- Every `traits.pool` percent except `phasing: 100`. each is argued from a source sentence, but the specific number is judgment.

## Script denials

| Original value | Script message | Replacement | Was the original better |
|---|---|---|---|
| `size.weightKg` at [0, 1] | `FAIL size.weight  weightKg band malformed: [0,1]` (the script requires the lower bound to be strictly above 0) | [0.1, 0.5] | Yes, marginally, but the script's rule is defensible and the difference is cosmetic. A non-corporeal body that matter passes through has no mass worth measuring, and 0 as a lower bound was the honest statement of that. The script requires a positive lower bound, presumably so that no band collapses to nothing and so that downstream math never divides by zero. I accepted the denial and moved the whole band down to a tenth of a kilogram, which reads as 'effectively weightless' without asserting literal zero. I do not think the script is wrong in general; a species whose body genuinely has no mass is a narrow case, and this workaround is adequate. No `--note` was needed.

Every other FAIL raised on this key was a formatting matter in the walkthrough rather than a value denial: five `md.quote` failures where I had put double quotes around Phantiri `data` block fields (Terrain and the two temperature entries) and around two of my own phrasings, which the script correctly reads as unverified quotations because the `data` block is not part of the checked corpus in the same literal form; and one `md.emdash` failure. Both were fixed by rewriting the walkthrough, and no template value changed.

### Answers to every WARN

- `WARN traits.expected  expected trait count 4.54 is above 3.5; confirm the species is meant to carry that many` **Confirmed.** The count is high on purpose and is driven by the top of the pool rather than by a long tail. `phasing` at 100 is compulsory for a non-corporeal body and cannot be lowered. `menacing` at 85 is the single best-evidenced behavior in the description, which names terrorizing as the creature's pastime. Those two alone contribute 1.85 before anything else rolls. The next three, `stealthy` 60, `slippery` 55 and `nocturnal` 40, are all facets of the same evasive, unfindable body that both the source and the legacy high evasion gauge point at. Everything from `toxic` 30 downward contributes 1.14 in total across seven entries, which is a thin tail, not a padded one. A typical Ectoghoul therefore reads as phasing, unnerving, and hard to pin down, plus roughly one or two situational extras, which matches the description exactly. Lowering the count would mean cutting one of the top three, each of which has a direct source sentence.
- `WARN instruments.predicate.source  channel "secretion" has a source-text predicate (an emitted substance); the validator agent must confirm the quoted sentence` **The sentence is:** "zapping their opponents with blasts of gooey ectoplasm". Ectoplasm described as gooey and delivered in blasts at an opponent is a substance the body emits, which is the predicate. The `breath` channel was unavailable because `breathes` is empty, and `vents` was unavailable because no discharge opening appears in the art, so `secretion` is the only channel that fits.
- `WARN enc.definition.name  definition does not name the species` **Fixed.** The Encyclopedia definition now opens with the category framing after naming the creature: 'The Ectoghoul is a drifting phantom of Phantiri'.
- `WARN md.thincombo  walkthrough has no thin-combo findings section` **Fixed.** Step 11 now carries an explicit 'Thin-combo findings' subsection. The substantive answer is that this species reaches no combo below six drawable names; the two nearest cases, ghost mend at 29 and dark mend at 10, are recorded there.

## Open questions for Nick

The engineered-purpose clause is my one real reach. The upgraded description says the Ectoghoul 'was set to scout the corpse islands of the Dreadscape'. The planet history is clear about why the Generator kept printing bodies after the moon-weapon woke, but it frames that intent planet-wide, as the machine "seeing its extraterrestrial aggressor as an environmental factor to be overcome", and it never assigns any job to this species in particular. The species description gives me only that Ectoghouls range the Dreadscape. The full register wants an engineered-purpose clause, so I supplied one that is the smallest step from what the source says, but it is an inference rather than a fact. Do you want it kept as written, softened to something that only says the Generator made a body the weapon could not read and let it loose, or dropped entirely, accepting a description that opens on the body and moves straight to the present day?

Second, a smaller one. I put `display` in `communication` on the strength of the mist forming and holding a grinning skull, reading the grin as a posture aimed at whoever is watching. The alternative reading is that the skull is simply the shape this species happens to have, in which case `communication` is `vocal` alone. Which reading do you want to be canon?

Third, and smallest. I listed `jaws` in anatomy and made it the third instrument, because the grinning teeth are the only functional structure the art draws and the skull is the creature's entire visual identity. But no sentence in either source shows an Ectoghoul biting anything; its two named acts are a cackle and an ectoplasm blast. Should `jaws` stay as an instrument, or should the third instrument slot be dropped so the species runs on `voice` and `secretion` alone, with `jaws` remaining in anatomy as a part it has but does not fight with?

## Validator output

```
WARN traits.expected                expected trait count 4.54 is above 3.5; confirm the species is meant to carry that many
WARN instruments.predicate.source   channel "secretion" has a source-text predicate (an emitted substance); the validator agent must confirm the quoted sentence

0 FAIL, 2 WARN (structurally clean; every WARN must be answered in the walkthrough)
```

Both WARN lines are answered in the `## Script denials` section above under 'Answers to every WARN'.

## Orchestrator amendments

- 2026-09-02, after the independent validation: the scouting purpose clause was cut from the description (the planet history assigns no job to this species; the Generator's intent is stated planet-wide, and that part is kept). `jaws` removed from instruments and kept in anatomy: the grin is drawn, but no source shows a bite, and both named acts route through voice and secretion. `communication` reduced to `vocal`: the grin is the species' shape, not a signal aimed at a watcher. The signature description no longer joins the cackle to wall-passing, which were two separate source clauses; it now says the cackle reaches its target wherever it goes, which is the source's own phrasing.
- 2026-09-02, voice (Nick): the signature description's dramatic second clause was cut.
- 2026-09-02, conduits (Nick): reviewed; no instrument is shown channeling an element, so no conduits are declared.
- 2026-09-02, archetype scale (Nick): `archetypeWeights` converted from relative 1 to 5 weights to percents summing to 100 by largest remainder, order preserved: prowler 33, skirmisher 27, rogue 20, predator 13, seeker 7 (was prowler 5, skirmisher 4, rogue 3, predator 2, seeker 1).
- 2026-09-02, archetype rethink (Nick): the converted row kept the old 5-4-3-2-1 ladder shape shared by every record, so the distribution was re-authored on this species alone: prowler 35, rogue 30, skirmisher 20, predator 15 (was prowler 33, skirmisher 27, rogue 20, predator 13, seeker 7). Reasoning: a haunter that terrorizes: rogue (charisma, reflex) raised to a near-equal second because its signature and its menacing 85 are presence, not speed; seeker dropped.
- 2026-09-02, planet rebuild: `temperatureC` re-banded from [-58, 53] to [-50, 20] (intersection) against the rebuilt planet record's habitable band [-50, 20] C; the old band was validated against the legacy planetary extremes, which are not survivable. Any gravity figure cited in this walkthrough predates the rebuild; the current value is `physical.derived.gravityEarth` = 0.45.
