# Voltish (Zolton, electric) — migration walkthrough

## Art reading

The artwork shows a single body, drawn as a solid black silhouette against a background of branching lightning. It is a long-limbed quadruped standing on all four limbs: both forelimbs and both hindlimbs reach the ground and end in broad paws with visible separated digits, and the forelimbs are not held clear of the ground or doing any work. The head is narrow and canine or cervine in shape, with a long tapering muzzle, a single visible pale eye, and two upright pointed ears each pierced by a small zigzag notch in the shape of a lightning fork. Rising from the neck and shoulders is a tall erect crest of long spiked filaments, drawn as a distinct raised structure separate from the body outline. A large bushy tail sweeps up and back, roughly as long as the torso. The entire outline of the body, legs, crest, and tail is drawn with ragged, tufted, spiked edges rather than a smooth line, and a fringe of the same tufting runs along the belly and down the backs of the legs. No wings, no fins, no horns, no visible teeth, no armor plates or scale edges are shown. The pose is standing, weight on all four feet, head turned toward the viewer.

## Source text

The species description, in full: "With bones and claws made from a tough, conductive metal alloy, this daunting creature can store electrical energy from its surroundings and release the shock into enemies."

## Description status: upgraded

The source description is a single sentence, well short of the 60-to-140-word register, so `descriptionStatus` is `upgraded`. Every added clause and its source:

- 'A long-limbed, shaggy quadruped' — `art:` the standing four-limbed body with tufted outline described above.
- 'whose bones and claws are drawn in a tough conductive alloy' — species: "With bones and claws made from a tough, conductive metal alloy".
- 'was generated on Zolton to work a world where organic labor was expendable and inorganic matter was not' — planet: "Since black lightning did no damage to inorganic matter, the Generator and the infrastructure it was meant to service would remain safe and it could simply continue replenishing any loss of labor from such natural disasters." This is the stated engineered purpose of the Zolton Generator, not an invented job.
- 'It stores electrical energy from its surroundings and releases the shock into enemies' — species, verbatim in substance: "can store electrical energy from its surroundings and release the shock into enemies".
- 'a body built to stand in the path of a current rather than flee it' — a connective joining the two sourced facts above (an alloy skeleton, and storing ambient charge); it stages no event.
- "Zolton's canyons carry visible rivers of electricity over the crust" — planet: "the energy would dissipate within seconds into the planet's network of canyons, forming visible rivers of electricity that surged like wire currents over the crust before bolting back into the atmosphere as ground-borne lightning".
- 'the Voltish crosses that ground on foot, drawing off what the crust carries' — joins the art's four-legged stance to the species clause 'store electrical energy from its surroundings' and the planet's ground-borne current. No schedule, no scene.
- 'APEX geared the Zolton Generator into a war machine and turned such bodies on its enemies' — planet: "it had geared the Zolton Generator into a devastating war machine – churning out Xalians that could harness the power of lightning itself to electrocute APEX's enemies". Stated of the Generator's output as a class, not of the Voltish specifically, and written as such.
- "Kozrak's crackdown has since put the same creature between his patrols and the Zolto rebuilding the network" — planet: "Kozrak has labeled those Zolto seeking to form such networks as galactic enemies, and has initiated a brutal crackdown on the planet in order to tightly control the manufacture of and access to QEDs." The present-day turn, ending on a plain present fact.

## Judgment lines

**element: electric** — species: `type` is `Electric`. Primary, affinity 100.

**homePlanet / generatorPlanets: zolton** — species: `planet` is `Zolton`. Legacy species are home-only.

**biomeNiche** — planet: "Zolton is a mountainous world comprised of deep canyons saturated with dense, freezing gases and craggy spires whose metallic peaks act as natural lightning rods" and "forming visible rivers of electricity that surged like wire currents over the crust".

**corporeality: corporeal** — the art shows a solid body with weight on four feet; the description gives it bones and claws.

**composition.primary: flesh** — species: the creature has bones and claws, and the alloy is named as what the bones and claws are made from, not the whole body; the covering in the art is a shaggy pelt. Registry: "`flesh`: living animal tissue, muscle and organ, whatever covers it."

**composition.secondary: metal** — species: "With bones and claws made from a tough, conductive metal alloy". The registry's secondary rule admits an internal structural substance the description names, "such as metal bones", explicitly.

**bodyPlan: quadruped** — `art:` all four limbs bear weight on the ground and the forelimbs end in paws set flat, not held clear. Registry selection rule: "one whose forelimbs reach the ground as legs is `quadruped`, whatever pose it is drawn in." The description names no stance and does not name the forelimbs doing work with the arms, so the art decides.

**anatomy: claws** — species: "bones and claws made from a tough, conductive metal alloy". Named directly.

**anatomy: jaws** — `art:` the long tapering muzzle with a defined jawline. The minimum honest reading of a head drawn with a full snout; no teeth or beak are shown, so `jaws` and not `fangs`.

**anatomy: crest** — `art:` the tall erect fan of spiked filaments rising from the neck and shoulders, drawn as a raised structure distinct from the body outline. Registry: `crest` is an "emissive or display head-growth"; this is the only registry key for a raised display growth on the head and neck.

**anatomy: tail** — `art:` the large bushy tail sweeping up and back, about torso length.

**anatomy: hide** — the surface key. Registry: `hide` is "an UNARMORED body surface used defensively"; nothing in either source shows plating, a shell, or a carapace, so the unarmored partner is correct and `shell` is excluded. One surface key only, per the standing rule.

Anatomy keys considered and rejected: `spines` (the tufted outline and crest filaments read as hair, not rigid projections, and the crest already carries the structure); `horns` and `antlers` (nothing branched or spiked on the skull; the ear notches are lightning glyphs, not growths); `fists` (the forelimbs are paws on the ground); `core` and `light-organs` (no emitter is drawn or named). Sense organs are never anatomy, so the ears and eye stay in the senses bands.

**covering: fur** — `art:` the outline of the trunk, legs, crest, and tail is drawn with ragged tufted edges rather than a smooth line, and the registry's own test is "the art shows a surface only when the outline itself is drawn as that surface (tufted or shaggy edges for `fur`...)". Neither source names any other surface.

**size: heightCm [190, 235], weightKg [105, 145]** — the legacy 216 cm / 123 kg is a relative gauge, not a value to copy; both bands are authored around it as realistic absolutes for a long-limbed quadruped of that build. The upper height reading is standing height at the crest, which the art draws as the tallest point. Weight is held a little below what a 2-meter mammal would carry because Zolton's gravity is 1.59 x Earth, which favors a leaner frame, and above what a purely soft-tissue body would weigh because of the alloy skeleton (species: "bones and claws made from a tough, conductive metal alloy").

**lifespan: long** — the wear rubric, in order. Cut 1 does not apply (not spectral or energy). Cut 2 does not apply: the body is `flesh` primary, and the rubric states "a mineral or metal secondary on a flesh body does not change the band". Cut 3: flesh body, weight band midpoint 125 kg, which is 20 kg up to and including 200 kg, so `standard`; then the one adjustment, which does not apply, since no source calls it cold, slow, or long-lived and its covering is `fur`, not an armored covering. Cut 4: harshness would move it down only if the description said the environment shortens its life, and it does not. **This lands on `standard`, not `long`, and the template must carry `standard`.** See Script denials.

**genome.chirality: rolled** — the default; nothing in either source declares the body has no chiral chemistry, and a flesh body has it.

**diet: energy-feeder** — species: "can store electrical energy from its surroundings". Registry: "any other body shown drawing in an energy, including light taken through an organ or a core, is `energy-feeder`". No source sentence shows it eating prey or plants, and 'store' is the description's own word for taking energy in. Authored to the extent that 'store' is read as taking in; flagged below.

**communication: vocal, display** — `display` is `art:` the tall erect crest, which the registry names as a display growth, and posture. `vocal` is authored: no source names a call. Flagged under Authored fields.

**breathes: gas; ambientMedia: gas** — planet: "deep canyons saturated with dense, freezing gases"; the creature stands on the surface of an atmosphere-bearing world. `breathes` is a subset of `ambientMedia`. No source shows it in liquid or vacuum.

**temperatureC: -60 to 45** — planet `data` block: `Temperature Low` -71 C, `Temperature High` 57 C. The band is a sub-band inside that range, held off both ends because a furred flesh body sustains normal activity short of the planetary extremes, and pushed low because the planet history names "deep canyons saturated with dense, freezing gases" as the terrain it works in.

**capabilities.flight: 0** — no wings in the art, body plan is `quadruped`, and the legacy trait block reads `canFly: false`.

**capabilities.swim [10, 25], burrow [5, 15]** — nothing in either source shows either; minimum honest bands for a limbed land animal. Authored.

**capabilities.climb [40, 60]** — planet: "a mountainous world comprised of deep canyons... and craggy spires"; a clawed quadruped on that terrain climbs, but no source sentence shows it climbing, so the band stays under 60 as the rule requires.

**capabilities.sprint [50, 70], leap [40, 60]** — `art:` long limbs and a large counterbalancing tail on a four-legged frame. Both bands are held at or under 70 with no source sentence naming speed.

**capabilities.manipulation [30, 50]** — the species has `claws`, which is grasping anatomy, so an upper bound above 40 is permitted; it is kept at 50 because no source shows it handling anything.

**senses.sight / hearing / smell** — `art:` a single small eye, large upright ears, and a long muzzle. Hearing is banded highest of the three on the ears, smell on the muzzle, sight lowest on the small eye. All under 70, none carrying a source sentence.

**senses.special: electroreception** — species: "can store electrical energy from its surroundings". A body that draws ambient charge off its surroundings must find it, and the planet describes that charge as "visible rivers of electricity that surged like wire currents over the crust". Registry: "`electroreception`: senses electric fields and living charge."

**instruments: claws, jaws, crest** — `claws` is the only body part the description names, and it names it as alloy, which is what conducts. `jaws` and `crest` are both in anatomy. All three are physical, so no channel predicate is engaged.

**conduits: claws -> electric** — species: "With bones and claws made from a tough, conductive metal alloy, this daunting creature can store electrical energy from its surroundings and release the shock into enemies." The sentence names the claws as conductive and the release of shock in the same breath, which is the element's power leaving the body through the part. `crest` was considered as a second conduit and rejected: nothing in either source shows the crest emitting.

**archetypeWeights: juggernaut 40, stalwart 25, predator 20, prowler 15** — sums to 100. The row is shaped by one dominant reading: a heavy-framed body with a metal skeleton that stands in a current and discharges it reads first as `juggernaut` (strength, resilience). `stalwart` (resilience, willpower) at 25 carries the same toughness with the standing-firm reading. `predator` (instinct, reflex) at 20 and `prowler` (agility, instinct) at 15 carry the long-limbed canine build in the art. `vanguard`, `berserker`, `sage`, and `sovereign` were dropped: nothing in either source shows charging, rage, cleverness, or command, and folding them in would have flattened the row.

**attributes** — the legacy `statRatings` gauge is `specialAttackRating: high` and `staminaRating: high`, everything else unrated. Read as relative: `endurance` [70, 90] is the highest band, from the stamina rating and from a body that stores charge over time; `strength` [55, 75] and `resilience` [55, 75] come from the alloy skeleton and the heavy frame; `intelligence` [25, 45] is well inside animal range and nowhere near true-human, which the registry forbids; `charisma` [30, 50] is the lowest, since no source shows presence or command. The 'high' special attack rating is expressed by the signature's intensity band and the electric medium rather than by an attribute, since the attribute registry has no special-attack axis.

**Trait pool** (expected count = 3.15 before the exclusion adjustment; counting `pack-bonded` at 25 percent times one minus 30 percent gives 2.98):

- `resistant: 90` — planet: "black lightning was so intense that it generated low-yield nuclear fusion, generating a fatal neutron burst that released lethal neutron radiation into the atmosphere, effectively randomly killing off all organic life within several kilometers of the strike zone". This is a planet-wide environmental sentence, which the rules permit for an environmental adaptation such as `resistant`. Not 100, because the same sentence says the radiation kills organic life, so resistance is a Generator's answer to the world, not a guarantee.
- `volatile: 75` — species: "can store electrical energy from its surroundings and release the shock into enemies". A body holding stored charge is hazardous to strike. Not 100, because the description shows deliberate release rather than a reaction to being hit.
- `menacing: 45` — species: "this daunting creature". The word is in the description, applied to this species, so this is a species sentence and not a planet-wide one. Under half because 'daunting' is an adjective on appearance, not a shown effect on courage.
- `perceptive: 35` — the `electroreception` special sense, which the registry tilts perceptive up with. Kept at a third because no source sentence shows it finding anything hidden.
- `solitary: 30` and `pack-bonded: 25` — the exclusion pair, neither at 100 and both under half. Neither source shows the Voltish alone or in numbers, so both stay in the pool at low percents and generation resolves it. This is the honest reading of silence rather than a call I can source.
- `luminous: 20` — a body storing charge sheds some light. Low, because no source says the body glows.
- `reflective: 15` — the conductive alloy skeleton and claws. Low, because conducting is not returning.
- `armored: 10` — the alloy skeleton gives some of the effect without an armored covering; the covering is `fur` and the surface key is `hide`, so this can never be high. At 10 it is Generator variance.

Traits plausible but left out, with reasons: `regenerative` (nothing shows self-repair); `ramming` (the art shows no ramming structure and the sprint band is moderate); `toxic` (no agent named); `anchored` (nothing shows it holding ground against force); `stealthy` (a 200 cm shaggy quadruped that stores charge is the opposite reading, and no source supports it); `nocturnal` (Zolton's history names storms, not darkness, and there is no perpetual-night sentence to lean on); `healing`, `protective`, `inspiring`, `hypnotic`, `mind-sealed`, `foresighted`, `telekinetic`, `phasing`, `slippery` (no source support of any kind).

**Signature: Stormbank Discharge** — the lore-defining act is quoted directly: species, "can store electrical energy from its surroundings and release the shock into enemies". Instrument `claws`: the release terminates in the target through the alloy claws, which the same sentence names as conductive; the pilot ruling puts the instrument where the effect terminates, not where the physics originate. Action `beam`: a focused projected line of energy, which is what a released stored shock is; `beam` is not in the `claws` physical row in 5.7, which is why `claws` is declared a conduit for electric, and `beam` is in the electric conduit row. Medium `electric`: the species primary. Intensity [30, 85]: a wide band because the description makes the output a function of what has been stored. Name collision scan: `Stormbank Discharge` returns zero case-insensitive matches across all fourteen `consolidated-*.md` files and `neutral-pools.md`. A ledger search for 'voltish' across the same files returns nothing, so no reserved signature name exists for this species.

## Authored fields

Values with no supporting source sentence:

- `communication: vocal` — no source names a call or cry. `display` is sourced to the art's crest; `vocal` is authored.
- `capabilities.swim [10, 25]` and `capabilities.burrow [5, 15]` — no source; minimum honest bands for a limbed land animal.
- `capabilities.leap [40, 60]` — inferred from the art's limbs and tail, not from a sentence.
- `senses.sight`, `senses.hearing`, `senses.smell` bands — the organs are visible in the art; the numeric bands are authored.
- `genome.chirality: rolled` — the default; nothing declares it.
- `size` bands — authored absolutes; the legacy height and weight are a gauge only.
- `attributes` bands — all ten authored, anchored only by the two legacy 'high' ratings as a relative gauge.
- `archetypeWeights` percents — the roster is reasoned from body and description; the numbers are authored.
- `diet: energy-feeder` — reads the description's 'store electrical energy from its surroundings' as taking energy in. The description does not say it feeds; the registry's rule for a body shown drawing in an energy settles the key, but this is an inference and belongs here.
- `anatomy: jaws` — the art shows a muzzle and jawline; neither source names jaws.
- `temperatureC` bounds — the sub-band inside the planet range is authored; only the planet range is sourced.
- `traits.pool` percents — every trait's presence is argued above, but each number is an authored setting.

## Thin-combo findings

For each declared instrument x allowed action x medium (primary `electric` plus on-graph secondaries `light`, `air`, `metal`), counting drawable catalog names plus the neutral pool for that action and respecting instrument tags against this species' anatomy (`claws`, `jaws`, `crest`, `tail`, `hide`, plus `body` as the universal fallback):

**No combo falls below 6 drawable names.** The two combos that came closest were `claws` x `crush` x electric and `jaws` x `crush` x electric, where the electric CRUSH cell yields only 4 drawable names for this anatomy out of its 10 owned, but the neutral CRUSH pool adds 53 pooled names, so both clear the bar comfortably. Every other electric cell used by this species' rows carries between 23 and 191 names. Nothing was padded.

## Script denials

**1. `lifespan`.** Proposed value: `long`. Script message: `FAIL lifespan: rubric gives 'standard' for flesh body at weight-band midpoint 125 kg (cut 3: 20 to 200 kg); no adjustment applies (covering 'fur' is not armored; no source calls the body cold, slow, or long-lived)`. Changed to: `standard`. I do not believe the original was better on the rubric's own terms, and this is a legitimate denial: I had reached for `long` on the reasoning that a metal skeleton is a slow-wearing chassis, but section 5.5's cut 2 states plainly that "a mineral or metal secondary on a flesh body does not change the band", which forecloses exactly that argument. The rubric is right and my first pass was wrong. Recording it because the walkthrough judgment line above was written to `long` before the run and has been corrected in place with the rubric worked through step by step.

**2. `capabilities.flight`.** Proposed value: `[0, 0]`. Script message: `FAIL capabilities.flight: expected a number or a two-element band; band [0,0] is not a legal way to express 'cannot'`. Changed to: `0`. Legitimate denial and a shape error on my part; section 4 writes the capability fields as bands but section 5.5 states "0 means it cannot", so a scalar 0 is the intended form.

**3. `archetypeWeights`.** Proposed value: `juggernaut 40, stalwart 25, predator 20, prowler 10, survivor 5`. Script message: `FAIL archetypeWeights: percents sum to 100 required, got 100` did not fire; the denial was `WARN archetypeWeights: 'survivor' at 5 is at the floor; section 6 says do not list an archetype below 5 and fold it into a neighbor`. This was a WARN and not a FAIL, and I acted on it rather than answering it in place: `survivor` at 5 was folded into `prowler`, which went from 10 to 15, on the grounds that both readings rest on the same long-limbed endurance build and a 5 percent entry will almost never land. I record it here because the fold changed a shipped value.

No script denial in this run was a false positive, and I am passing no override request. Every FAIL raised on any run for `voltish` is listed above.

## Notes on rules under strain (operating rule 7)

**The `crest` key is carrying a display structure it was not written for.** Section 5.6 defines `crest` as an "emissive or display head-growth". The art's structure is a tall erect fan of filaments rising from the neck and shoulders, not from the head, and it emits nothing that either source shows. I complied and took `crest`, because it is the only registry key for a raised display growth and the alternative (`spines`) states rigid projections, which the tufted filament drawing does not support. Smallest fix: widen the `crest` definition to "emissive or display growth of the head, neck, or shoulders", or add a `mane` key. This will recur, because a neck crest or ruff is a common silhouette device in this art set.

**The attribute registry has no axis for the legacy 'special attack' rating.** Voltish's only two legacy ratings are `specialAttackRating: high` and `staminaRating: high`. Stamina maps cleanly onto `endurance`, but the special-attack rating has nowhere to land among the ten attributes, so a species whose one distinguishing legacy number says 'this creature's projected power is its strength' expresses that only through the signature's intensity band. I complied and put the weight into intensity [30, 85]. Smallest fix: rule explicitly that a legacy special-attack rating is expressed through the signature intensity band and, where a secondary is likely, through `affinityOdds`, so agents stop reaching for `intelligence` or `willpower` to carry it. No registry change needed, just a line in section 6 step 7.

**The exclusion pair has no way to express 'the sources are silent'.** Neither source shows the Voltish alone or in a group. I listed `solitary` at 30 and `pack-bonded` at 25, which encodes a mild preference I cannot source, because leaving both out would state that the species is never either, which the pool's absence-means-zero rule makes a positive claim. Smallest fix: state in section 5.3 that when sources are silent on sociality, both partners may be listed at low equal percents, and that equal percents are resolved by coin flip rather than by the higher-first rule.

## Open questions for Nick

Is the tall filament crest on the Voltish's neck and shoulders meant to be an electrical structure, something it raises to discharge or to shed charge into the air, or is it purely a display ruff? The description never mentions it and the art gives no emission, so I declared `crest` in anatomy but did not make it a conduit and did not build the signature around it. If it is electrical, the signature would be better sited there than in the claws, and `luminous` would move well above 20.

## Validator output

(pasted below after the final run)
