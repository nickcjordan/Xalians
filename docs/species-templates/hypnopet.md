# Hypnopet migration walkthrough

## Reading of the art

The render shows a single small creature seated upright on its haunches, filling the frame: a shaggy, heavily tufted body with a rounded head, two very long lop ears that fall well past the body on either side, and a single ribbed spiral horn rising from the crown between them. The face carries two enormous round eyes with bright catchlights, a small muzzle, and an open mouth. The forelimbs are short and end in small paws held clear of the ground against the chest and belly; the hind limbs are large, splayed forward, and drawn with visible pads on the soles and heels. The silhouette edge is drawn as ragged tufts and spikes of fur all around the ruff, cheeks, and shoulders, so the surface itself is shown as fur rather than a smooth outline. No wings, no tail, no visible plating, shell, spines, or armored aspect. One body, one head, one horn.

## Description status

`source`. The species.json text is already in the full register: it opens with a body appositive, states the engineered purpose under the Vallerii, and turns to the present day anchored to a named institution and person. Word count is 110, inside the 60 to 140 band. Carried verbatim, with `descriptionStatus` set to `source`.

## Body facts and buried auto-traits

Traits the body demands, entered in the pool at 100:

- `healing` at 100, species: "their natural empathic healing abilities served to balance and treat patients". The healing is named as natural and as the reason the species exists, so every individual carries it.
- `hypnotic` at 100, species: "it hypnotizes others and locks them in a trance". This is the defining organ function of the horn, present in every individual, and the trait registry caps exactly there: entrances and holds attention, dulling the will to act.

No trait is demanded by the covering or the plan: fur is not an armored covering, so `armored` is absent; the body is corporeal, so `phasing` is absent.

## Physiology, judgment by judgment

- `corporeality` is `corporeal`, species: "Hypnopets resemble glowing, golden-furred bunny rabbits". A furred animal body occupies space and can be touched.
- `composition.primary` is `flesh`, with no secondary, species: "golden-furred bunny rabbits". Living animal tissue. The horn is a cranial growth on a flesh body and neither source names it as a different substance, so no mineral secondary is declared.
- `bodyPlan` is `biped`, the description names no stance and no number of legs, so under the ratified selection rule the art decides, and the test is whether the forelimbs bear weight. In the art the forelimbs are short, end in small paws held against the chest, and are entirely clear of the ground, while the hind limbs bear the body. That is the `biped` test as written. Flagged as an open question below, because a rabbit-form body seated on its haunches is a pose the rule may not have been drafted for.
- `covering` is `fur`, species: "golden-furred bunny rabbits", and `art: tufted, ragged fur edges drawn around the ruff, cheeks, and shoulders`. Both sources name the same surface, so this is not an authored default.
- `anatomy` is `crest`, `claws`, `hide`.
  - `crest`, species: "a single color-changing unicorn horn atop their heads" and species: "When their horn begins to pulse and swirl with psychedelic color, it hypnotizes others". The registry defines `crest` as an emissive or display head-growth, and the horn's stated function is emissive display that acts on others, so `crest` fits the function where `horns`, a permanent cranial spike used to gore, does not fit the act. Noted as a contested key, since the literal shape is a horn.
  - `claws`, `art: short forelimbs ending in small digited paws, and large hind feet drawn with distinct pads and toe divisions`. Hooking or digging digits are the honest key for a small ground animal's feet. Authored where the description is silent, listed in Authored fields.
  - `hide`, the registry unarmored body-surface key. The species has no armored aspect in either source, so `hide` is declared and `shell` is not; only one of the two is legal and this is the one the body supports.
- `size` is 30 to 42 cm and 9 to 16 kg, the legacy gauge is 35 cm and 13 kg. Those are a relative gauge only, but they describe a small animal roughly the mass of a large hare or a small dog, which is consistent with the art proportions: very long ears, heavy hind limbs, compact trunk. Bands are set as realistic absolutes around that scale, measured to the crown of the head rather than the horn tip.
- `lifespan` is `short`, cut 1 does not apply, since the body is flesh rather than spectral or energy. Cut 2 does not apply. Cut 3: a flesh body whose band midpoint is about 12.5 kg is below 20 kg and is not a swarm, a conjured-unit body, or a flier the source shows living in numbers, so it is `short`. The post-mass adjustment does not apply, because neither source calls it cold, slow, or long-lived, and fur is not an armored covering. Cut 4, harshness, does not apply: the planet history never says the environment shortens the life of Telypso's own creatures, and the harm it does name, planet: "The environment seemed to change in accordance with the emotions of those who passed through it", is said of the Vallerii who landed, not of the Generator's Xalians.
- `genome.chirality` is `rolled`, the default; the body has ordinary chiral biochemistry and nothing in either source declares otherwise.
- `diet` is `herbivore`, the sources say nothing about feeding, and the silence fallback for a flesh body is `omnivore`. I take `herbivore` instead on a body fact: species: "bunny rabbits" names the body as a rabbit form, and the planet history names a standing plant food source, planet: "Its bioluminescent jungles, filled with bulbous pitcher plants, glittered like multicolored glass under an ultraviolet sun." Nothing in either source shows this species consuming, dissolving, or draining a victim, which the rule requires before `carnivore`, and nothing shows it drawing in an energy, which the rule requires before `energy-feeder`. Listed in Authored fields because no sentence shows this species feeding at all.
- `communication` is `telepathic`, `display`, `vocal`.
  - `telepathic`, species: "their natural empathic healing abilities served to balance and treat patients". Empathic work on patients is direct impression between minds, not words, which is the registry definition of the value.
  - `display`, species: "When their horn begins to pulse and swirl with psychedelic color". A pulsing color pattern is the registry `display` value exactly. The hypnotic act aimed at a target is an ability rather than communication, so the value rests on the organ being a signaling surface, not on the trance.
  - `vocal`, authored. Neither source names a call or a cry. A furred animal body with an open mouth in the art is expected to make sound, but this is a guess and is listed in Authored fields.
- `breathes` is `gas` and `ambientMedia` is `gas`, planet: "Towering forests of mushrooms ascended from humid, smothering mists". A land animal on a world with a breathable jungle atmosphere. `breathes` is a subset of `ambientMedia` as required. No liquid or vacuum value, since nothing in either source shows it in water or in the void.
- `environmentalTolerance.temperatureC` is 12 to 40, the planet data block gives Temperature Low 7 °C and Temperature High 65 °C, so the band lies inside the planet range as required. The sub-band is set warm and narrow because the habitat named is humid jungle and mist, planet: "Towering forests of mushrooms ascended from humid, smothering mists", and a small furred body loses heat quickly at the planet low end and overheats under a heavy pelt at the high end.
- Capabilities.
  - `flight` 0 to 0, no wings in the art, no floating or swarm plan, corporeal body. It cannot fly.
  - `swim` 10 to 25, a token band. Planet: "Telypso's rivers shimmered with quicksilver qualities", so water is present in the habitat, but nothing shows this species entering it, and a heavy-pelted small animal is a poor swimmer. Authored.
  - `burrow` 25 to 45, modest. The digging hind feet in the art and the rabbit body form support some ground work, but no source sentence shows it burrowing, so the band stays under 60. Authored.
  - `climb` 10 to 25, low. No grasping forelimbs and no climbing anatomy. Authored.
  - `sprint` 45 to 65, a small prey-form body with heavy hind limbs, `art: large splayed hind limbs bearing the body`. Only modestly above 60 at the top, which the rule permits on that visible feature.
  - `leap` 55 to 75, the highest movement band, on the same visible feature: the hind limbs in the art are the largest part of the body and are built for a bound. This is the one movement band clearly above 60 and it rests on the art.
  - `manipulation` 20 to 38, upper bound below 40, so no grasping-anatomy justification is required. The forepaws in the art are small and short, and the creature works with its horn and its mind rather than its hands.
- Senses.
  - `sight` 55 to 75, `art: two very large round eyes dominating the face`.
  - `hearing` 70 to 90, the highest sense band, on `art: two very long lop ears, each nearly the length of the body`. The ears are the most prominent feature of the render.
  - `smell` 45 to 65, an ordinary mammal-form band; nothing in either source raises or lowers it. Authored.
  - `special` is `psychic`, species: "their natural empathic healing abilities served to balance and treat patients". Sensing feeling and intent directly is the registry `psychic` special sense, and it is what an empathic therapist must do before it can treat. This also satisfies the `mind` channel predicate.

## Archetype weights

- `sage` 5, favoring intelligence and willpower, species: "service animals and therapists for the insane Vallerii imprisoned on the world". The species is a clinician: its work is judgment and sustained mental effort against a broken mind.
- `sovereign` 4, favoring charisma and willpower, species: "it hypnotizes others and locks them in a trance". Holding another creature still by presence alone is the sovereign read.
- `seeker` 3, favoring instinct and intelligence, species: "their natural empathic healing abilities served to balance and treat patients". Treating requires first finding what is wrong, which is perception plus reasoning.
- `virtuoso` 2, favoring intelligence and charisma, species: "When their horn begins to pulse and swirl with psychedelic color". A performed display that works on an audience.
- `runner` 1, favoring agility and endurance, the light body and its hind limbs, `art: large splayed hind limbs bearing the body`. Weighted lowest because nothing in the description is about movement.

## Attribute bands

Legacy `statRatings` are used only as a relative gauge. It lists standard attack as low and recovery as high, and every other field is blank.

- `strength` 8 to 24, lowest band. Legacy gauge: standard attack low; `art: short forelimbs with small paws`.
- `vitality` 25 to 45, small body, low mass.
- `endurance` 30 to 50, moderate; the therapeutic work is sustained but the body is small.
- `agility` 45 to 68, a small hind-limb-driven body, `art: large splayed hind limbs bearing the body`.
- `reflex` 40 to 62, moderate; a prey-form body reacts, but nothing in the sources makes it fast on the draw.
- `intelligence` 55 to 78, high but nowhere near true human range, per the canon cap. Species: "therapists for the insane Vallerii imprisoned on the world".
- `willpower` 60 to 85, high. Species: "which was useful for sedating patients when they entered into dangerous bouts of mania". Holding a maniac in a trance is a contest of will the Hypnopet must win.
- `instinct` 50 to 72, raised by the empathic sense, species: "their natural empathic healing abilities".
- `charisma` 60 to 88, the top band. The registry defines charisma as presence rather than eloquence, which is exactly what a hypnotizing display organ projects. Species: "it hypnotizes others and locks them in a trance".
- `resilience` 15 to 32, lowest defensive band. A small furred body with no armored aspect.

The legacy high recovery rating is honored through the `healing` trait at 100 rather than through an attribute, since recovery is not one of the ten.

## Element

Primary is `psychic`, from the species type and the home planet Telypso. Secondaries are whatever the graph allows for psychic, namely ghost, light, and dark; no override of the 75/25 baseline odds is declared, because nothing in the description argues that this species is unusually likely or unlikely to carry a second affinity, so `affinityOdds` is omitted.

## Trait pool

Expected count: the percents sum to 530, so the expected number of traits per individual is 5.30. There is no exclusion pair active: `pack-bonded` is listed at 25 and `solitary` is not listed at all, so no exclusion adjustment applies. At least one entry sits strictly between 0 and 100, and the two entries at 100 are not exclusion partners.

- `healing` 100, species: "their natural empathic healing abilities served to balance and treat patients". Body-demanded, stated as natural.
- `hypnotic` 100, species: "it hypnotizes others and locks them in a trance". Organ-demanded, and the organ is on every individual per species: "a single color-changing unicorn horn atop their heads".
- `protective` 70, species: "created by the Telypso Generator as service animals and therapists". The instinct to shield and protect others is the purpose it was built for, but it is a disposition rather than an organ, so it is not universal.
- `luminous` 60, species: "Hypnopets resemble glowing, golden-furred bunny rabbits". The body is called glowing, which is the registry `luminous` definition. Not at 100 because the display is described as something that begins, species: "When their horn begins to pulse and swirl with psychedelic color", so an individual may be dim at rest.
- `inspiring` 55, species: "many Hypnopets have taken to the stars as healers". A creature whose presence steadies others is the read of a healer that travels with crews, but the sentence names the role rather than the effect on morale, so this is a moderate percent.
- `perceptive` 45, species: "their natural empathic healing abilities served to balance and treat patients". Justified from the species sentence, not from the planet: reading a patient's state is perceiving what is hidden. Below half because the sentence is about treating, not about detecting what conceals itself.
- `slippery` 35, `art: a small, heavily furred body on large hind limbs`. A small pelted animal that bounds is hard to hold. Authored inference from the art.
- `mind-sealed` 30, species: "where their natural empathic healing abilities served to balance and treat patients". A creature that works inside deranged minds needs some defense against them, but the sources never claim it is immune, so this is a minority roll rather than a guarantee.
- `pack-bonded` 25, species: "many Hypnopets have taken to the stars as healers". The plural taking to the stars supports some individuals working alongside others; the low percent reflects that the sentence is about dispersal rather than about coordination.
- `telekinetic` 5, rare. The registry band for rare traits is 2 to 8 percent. Plausible on a psychic species, and nothing in the species description shows it moving objects, so it stays rare.
- `foresighted` 5, rare, same band and same reasoning.

Traits considered and left out, with reasons: `armored`, because no armored covering or shell appears in either source; `phasing`, because the body is corporeal and nothing shows physical interactions passing through it; `menacing`, because nothing shows it eroding courage, its effect being a trance rather than fear; `stealthy`, because nothing shows it moving unseen and the body glows, which argues against it; `nocturnal`, because the planet history names an ultraviolet sun and lit jungles rather than perpetual night, so there is no environmental demand; `regenerative`, because its healing is stated as done to others and never to itself; and `toxic`, `volatile`, `reflective`, `ramming`, `anchored`, `resistant`, and `solitary`, because nothing in either source supports any of them and `solitary` would contradict the pack-bonded reading of healers traveling together.

## Instruments

- `crest`, physical, present in anatomy. Species: "When their horn begins to pulse and swirl with psychedelic color, it hypnotizes others and locks them in a trance." This is the part the defining act terminates through.
- `mind`, channel. The predicate is satisfied twice over: the species element is psychic, and `senses.special` includes `psychic`. Species: "their natural empathic healing abilities served to balance and treat patients".
- `claws`, physical, present in anatomy. The minimum honest physical instrument for a body with no other offensive part, `art: forepaws and hind feet with digits and pads`. Included so the species has one instrument that is not a mental one.

## Signature ability

The lore-defining act, quoted: "When their horn begins to pulse and swirl with psychedelic color, it hypnotizes others and locks them in a trance, which was useful for sedating patients when they entered into dangerous bouts of mania."

- Ledger check: a case-insensitive search of every consolidated element catalog and the neutral pools for the species name returned no hits, so there is no reserved signature name and no ratified instrument, action, or medium for this species. The anatomy sweep in the catalog folder does record `crest` as the assigned key for this horn, which the anatomy choice above follows.
- `instrument` is `crest`, the effect terminates on the target through the horn's color display, under the ratified rule that the instrument is the part where the effect terminates and not the physics that produces it. The psychic origin is the physics; the horn is what the target watches.
- `action` is `snare`, the registry defines snare as holding, binding, pulling, or pinning the target in place, which is what locking a target in a trance is. `terrorize` was rejected because the act works on attention and the will to act rather than on courage, and the effect described is sedation rather than fear. `snare` is not in the allowed-action set for `crest`, which is permitted for a signature under the ratified rule that a signature may use an instrument outside the species list and even outside the allowed-actions matrix, provided only registry vocabulary is used.
- `medium` is `psychic`, the species primary element, so the medium has element cover without needing a rolled affinity.
- `intensity` 35 to 70, a mid band. The act sedates rather than harms, and the source shows it working on maniacal patients, which is a real feat, but nothing in the source shows it defeating anyone outright.
- `name` is `Psychedelic Reverie`, coined in the grander register from the source's own word, species: "pulse and swirl with psychedelic color". Collision scan: a case-insensitive search for the exact string across all fourteen consolidated element catalogs and the neutral pools returned no match. American English, no possessive, no hyphen, no franchise or real-world reference.
- The one-line description states what happens, with no mechanics named and no closing flourish.

## Catalog check through the species lens

Combos checked: instruments `crest`, `mind`, and `claws` against their allowed actions, for medium psychic (primary) and each on-graph secondary (ghost, light, dark), plus the neutral pool for each action. No instrument tag in any of those cells restricts against `crest`, `mind`, or `claws` in a way that removes names; the only tagged spans encountered were mind-instrument spans, which this species can draw.

Smallest cells encountered, all well above the six-name threshold: psychic rake 12, ghost crush 25, ghost mend 29, light crush 18, dark mend 10, dark burst 34. Every neutral pool is above 50 names.

No thin-combo findings.

## Authored fields

Values with no supporting source sentence, recorded here because the JSON carries no provenance:

- `physiology.anatomy` entry `claws`, inferred from the paws and feet in the art and not named in either source.
- `physiology.anatomy` entry `hide`, the registry unarmored surface key, declared because the body has no armored aspect; neither source names a surface used defensively.
- `physiology.communication` entry `vocal`, since no call or cry is named in either source.
- `physiology.diet`, since no source sentence shows this species feeding; `herbivore` is inferred from the rabbit body form and the planet's plant-filled jungles.
- `physiology.capabilities.swim`, `burrow`, and `climb`, since no source shows the species doing any of the three; the bands are body-form inferences.
- `physiology.capabilities.manipulation`, inferred from the small forepaws in the art.
- `physiology.senses.smell`, with no source sentence; an ordinary mammal-form band.
- `physiology.size` bands, proposed absolutes around the legacy gauge, which is explicitly not a source value.
- `traits.pool` percent for `slippery`, inferred from the body form in the art.
- `traits.pool` percents for `telekinetic` and `foresighted`, taken from the registry rare band and not sourced to this species.
- `attributes` band edges throughout, since the legacy stat ratings are a relative gauge only and eight of the nine legacy fields are blank.
- `signatureAbility.intensity` band, a judgment about scale rather than a sourced value.
- `physiology.bodyPlan`, sourced to the art under the ratified selection rule, but the rule is being applied to a seated pose; see the open question.

## Script denials

One FAIL was raised across all runs on this key.

- `md.emdash`, message `walkthrough contains an em-dash`. Original: the walkthrough used an em-dash as the separator between each judgment label and its evidence, and in the title. Changed to: a comma separator throughout, and the title lost its dash. I do not believe the script is wrong. The no-em-dash rule is a stated voice rule in section 3 and applies to the whole deliverable, and I broke it by habit rather than by intent. No note passed.

No FAIL was raised on any registry value, enum choice, trait percent, temperature band, quotation, or the signature name.

## Open questions for Nick

The body plan is the one call I am not comfortable making alone. The description never says how many legs a Hypnopet stands on, so the ratified selection rule hands the decision to the art, and the art shows the creature seated upright on its haunches with its short forepaws held clear of the ground against its chest. Read literally, that is the rule's biped test, since the forelimbs bear no weight and end in free paws. Read by what the body obviously is, a golden-furred bunny rabbit walks on four limbs and this is simply a sitting pose, which would make it a quadruped. I have written `biped` because the rule as written says the art decides and the art shows no weight on the forelimbs, but I think the rule was drafted with standing postures in mind and did not anticipate a seated animal. My recommendation is that you rule `quadruped` for this species and that the selection rule gain a sentence saying a seated or crouching pose with the hind limbs folded under the body does not count as freeing the forelimbs. Which way do you want it?

## Validator warnings answered

- `traits.expected`: the script warns that an expected trait count of 5.30 is above 3.5. Confirmed and intended. Two entries sit at 100 because the body demands them, `healing` and `hypnotic`, and both are the species' whole reason for existing per species: "their natural empathic healing abilities served to balance and treat patients" and species: "it hypnotizes others and locks them in a trance". The remaining 3.30 expected traits come from nine entries, none above 70, so an individual varies widely below those two guarantees. This is a support species whose kit is entirely passive presence rather than a weapon, so a full trait sheet is the correct shape for it. I would rather flag it than trim a percent to hit a number.
- `signature.action.matrix`: the script warns that `snare` is outside the allowed set for `crest`. This is deliberate and is permitted by signature rule 4, which allows a signature to use an instrument outside the species list and even outside the allowed-actions matrix so long as only registry vocabulary is used. The source act is species: "it hypnotizes others and locks them in a trance", and locking a target in place is the registry definition of snare. The four actions the matrix allows for `crest` are beam, burst, terrorize, and ward, and none of them describes holding a target still: beam and burst are energy delivery, terrorize acts on courage rather than attention, and ward protects the user. If a rule change is wanted rather than a per-species exception, the honest fix is adding `snare` to the `crest` row of the allowed-actions matrix, since any emissive display organ that entrances is doing exactly this. That is the orchestrator's call, not mine.
- `enc.definition.name`: fixed. The Encyclopedia definition now names the species in its first clause.

## Validator output

```
WARN traits.expected                expected trait count 5.30 is above 3.5; confirm the species is meant to carry that many
WARN signature.action.matrix        signature action "snare" is outside the allowed set for crest [beam, burst, terrorize, ward] (allowed by rule 4; justify)

0 FAIL, 2 WARN (structurally clean; every WARN must be answered in the walkthrough)
```

## Orchestrator amendments

- 2026-09-02, after the independent validation and the orchestrator's own look at the art: the art shows a seated rabbit with both forepaws on the ground at the same baseline as the hind feet, so the ratified forelimb test gives `quadruped` directly; the run's art reading (forepaws held clear against the chest) was wrong. `diet` set to `omnivore` by the silence fallback (no feeding sentence in either source; body shape does not license `herbivore`). `claws` removed from anatomy and instruments (the art draws rounded pads, not hooking digits); instruments are `crest`, `mind`. `inspiring` lowered from 55 to 25: its cited sentence is about where the species is employed, not a morale effect on allies. Manipulation capped at 40 with no grasping anatomy. Before: {"bodyPlan":"biped","diet":"herbivore","anatomy":["crest","claws","hide"],"instruments":["crest","mind","claws"],"inspiring":55,"manipulation":[20,38]}.
