# Hippochamp: migration walkthrough

## Art reading

The render shows a single body, rearing, drawn as a black silhouette with white interior line work. It is horse-shaped from the shoulder back and seahorse-shaped from the shoulder forward: a long tapering snout with a small round opening at the tip, from which a wide fan of water is jetting forward and downward in ribboned streaks. The head carries a spiked, sail-like crest running from the brow back down the neck, and a second row of stepped, fin-like spines continues down the spine to the hindquarters, with a further row of short spines along the underside of the neck and belly. A small webbed fin sits behind the jaw. The eye is a single narrow slit. Both forelimbs are lifted clear of the ground in the rear, ending in blunt, unsplit hoof-like feet with no digits, hooks, or grasping fingers drawn; both hind legs bear the whole body and end in the same blunt feet. The tail is thick at the base and coils into a tight inward spiral, ridged along its outer edge, held clear of the ground. No wings, no visible ears, no teeth, and no exposed plates or scale edges: the outline is smooth apart from the crest and spine rows.

## Lore

The lore split of 2026-09-09 (Nick): `lore.description` is the `species.json` teaser carried verbatim and is never edited here; `body` is the physical record, `habits` is how the creature lives now. `descriptionStatus` was removed from the record; status lives in `docs/species-templates/lore-status.json`.

### body

Horse-bodied from the shoulder back and seahorse-headed in front, it carries a long tapering snout that narrows to a small round opening at the tip. A spiked, sail-like crest runs from the brow down the neck, and stepped rows of fin-like spines continue along the spine to the hindquarters and along the underside of the neck and belly. A small webbed fin sits behind the jaw, and the eye is a narrow slit. All four legs end in blunt, unsplit feet with no digits or hooks, and the thick, ridged tail coils into a tight inward spiral held clear of the ground. The surface is smooth, with no plate or scale edge anywhere on it.

| Claim | Source |
|---|---|
| Horse-bodied from the shoulder back and seahorse-headed in front | art (horse barrel, shoulders and hindquarters; seahorse head and snout); species.json, "Four-legged creatures resembling a seahorse" |
| Long tapering snout narrowing to a small round opening at the tip | art (the fan of water leaves through that opening); record `physiology.anatomy: trunk` |
| Spiked, sail-like crest from the brow down the neck | art; record `physiology.anatomy: crest` |
| Stepped rows of fin-like spines along the spine to the hindquarters and along the underside of neck and belly | art; record `physiology.anatomy: spines` |
| Small webbed fin behind the jaw | art |
| The eye is a narrow slit | art; record `physiology.senses.sight` 45 to 65 |
| Four legs ending in blunt, unsplit feet with no digits or hooks | art; record `physiology.bodyPlan: quadruped` and `anatomy: hooves` |
| Thick, ridged tail coiled into a tight inward spiral held clear of the ground | art; record `physiology.anatomy: tail` |
| Smooth surface, no plate or scale edge | art (unbroken outline apart from crest and spine rows); record `physiology.covering: hide` and the absence of `shell` |

### habits

Its ground is a fleet: rig upon rig in interlocking nets of floating industrial zones, each trawling a global ocean for algae. It works in crews rather than alone. It breathes as readily in water as in air, so it can drop below the surface when the storm systems come over the rigs and when the semiannual bloom lays toxic microbes across the waves, which is the same reason the rigs themselves were built deeper and deeper beneath the ocean. It feeds on what the rigs and the water under them yield. Inside the settlement perimeters its aggression stays suppressed, and it saves what force it has for what comes at the rigs from outside them.

| Claim | Source |
|---|---|
| Its ground is a fleet, rig upon rig in interlocking nets of floating industrial zones trawling a global ocean for algae | planets.json Poseidas paragraph 7, "rig upon rig that formed interlocking nets of giant floating industrial zones, each of them trawling the ocean for as much algae as possible"; planetRecords.json poseidas report terrain feature, global ocean; record `lore.biomeNiche` |
| It works in crews rather than alone | species.json, "emergency response crews"; record `traits.pool.pack-bonded` |
| Breathes as readily in water as in air | record `physiology.breathes: [gas, liquid]` and `environmentalTolerance.ambientMedia` |
| Drops below the surface when storm systems come over the rigs and when the semiannual bloom lays toxic microbes across the waves | planetRecords.json poseidas report hazards, surface storm systems and semiannual toxic bloom events with airborne microbial dispersal at surface |
| That is the same reason the rigs themselves were built deeper and deeper beneath the ocean | planets.json Poseidas paragraph 10, "building them deeper and deeper beneath the ocean in order to avoid the tumultuous storms and toxic microbes that racked its surface" |
| Feeds on what the rigs and the water under them yield | record `physiology.diet: omnivore` (no source sentence shows it feeding; the record field is the anchor) |
| Aggression stays suppressed inside the settlement perimeters | planetRecords.json poseidas report fauna observation, aggression suppressed within settlement perimeters; output priority, low-aggression settlement compatibility |
| Saves its force for what comes at the rigs from outside them | species.json, defense against pirates seeking to steal Algael; record `traits.pool.protective` 100 |


## Description status

The source description is a two-sentence stub in the legacy register, so `descriptionStatus` is `upgraded`. Every clause of the upgrade and its source:

- Body appositive, four-legged seahorse shape: species, "Four-legged creatures resembling a seahorse".
- Crested and spined along neck and back, curled prehensile tail: art (crest row, spine rows, tightly coiled tail held clear of the ground). Flagged as art-sourced.
- Long trunk-like snout: species, "Their long, trunk-like snouts serve as high-pressure water cannons".
- Engineered purpose, emergency response: species, "Hippochamps were designed as emergency response crews for the various electrical and chemical fires that occur on rigs, as well as a means of defense against pirates seeking to steal valuable Algael."
- Steady stream, hosing fires and threats: species, "can maintain a steady stream that allows them to hose down fires and threats alike".
- Patrols the hydro-processing fleets: species, "patrol the various hydro-processing fleets on Poseidas".
- Global ocean and deep-cities after the last death tide: planet, "Only the subsurface Xalians survived, and they would go on to man Poseidas’s rigs in the absence of their masters, building them deeper and deeper beneath the ocean in order to avoid the tumultuous storms and toxic microbes that racked its surface."
- Fleets that trawl: planet, "rig upon rig that formed interlocking nets of giant floating industrial zones, each of them trawling the ocean for as much algae as possible".

No clause was added beyond these. No schedule, no invented incident, no causal claim about the Vallerii, and the last sentence states a present-tense fact about where it patrols.

## Judgments, one line each

**Element `water`, home planet `poseidas`, generator planet Poseidas only.** The species `type` is Water and `planet` is Poseidas; legacy species are home-only.

**`corporeality: corporeal`.** A body that patrols rigs and hoses down threats occupies space; nothing in either source suggests otherwise.

**`composition.primary: flesh`, no secondary.** Living animal tissue; no second structural substance is named or drawn. The crest and spine rows are surface growths carried in anatomy, not a composition secondary.

**`bodyPlan: quadruped`.** species, "Four-legged creatures resembling a seahorse". The description names four legs, so that number decides and the rearing pose in the art does not override it.

**`covering: hide`.** Neither source names a surface, and the art outline is smooth with no plate, scale, or plume edges, so the fallback would be `bare`; I take `hide` instead because the art draws no armored aspect and the species declares the `hide` anatomy key, which the registry pairs with the `hide` covering. Flagged under Authored fields.

**Anatomy `trunk`.** species, "Their long, trunk-like snouts serve as high-pressure water cannons". The registry key for a muscular flexible snout is `trunk`.

**Anatomy `hooves`.** art: blunt, unsplit hoof-like feet with no digits or hooks on all four limbs.

**Anatomy `tail`.** art: a thick, ridged tail coiled into a tight inward spiral. Not `coils`, which is a serpentine wrap-and-crush body rather than a tail.

**Anatomy `crest`.** art: a spiked, sail-like growth from the brow down the neck. The registry key for a display head-growth is `crest`.

**Anatomy `spines`.** art: stepped rows of rigid fin-like projections down the spine and along the underside.

**Anatomy `hide`.** The body surface is used defensively and has no armored aspect drawn; only one of `hide` and `shell` is legal and nothing shows a rigid casing.

**No sense organs in anatomy.** The narrow eye and the webbed fin behind the jaw are not registry parts; the eye lives in the `senses` bands.

**`size` 115 to 145 cm, 120 to 165 kg.** The legacy gauge is 129 cm and 141 kg; the art shows a horse-bodied creature of pony proportions, so the band brackets the gauge with realistic spread. Legacy numbers are a relative gauge, not values copied.

**`lifespan: standard`.** Cut 3: a flesh body whose weight-band midpoint is about 142 kg falls in the 20 to 200 kg band, so `standard`. No adjustment: nothing calls it cold, slow, or long-lived, and its covering is not armored. Cut 4 does not apply, because no source sentence says the environment shortens its life.

**`genome.chirality: rolled`.** Default; nothing declares the body achiral.

**`diet: omnivore`.** Neither source shows it consuming, draining, or grazing anything: it fights fires and pirates, and a sentence showing only fighting or guarding is not evidence of feeding. The registry fallback for a flesh body is `omnivore`. Flagged under Authored fields.

**`communication: [vocal, display]`.** Authored. An emergency-response body working across a fleet needs outward signaling, and the art gives it a large sail-like crest, which is the registry's display organ. `vocal` has no source sentence and is flagged under Authored fields with `display`.

**`breathes: [gas, liquid]`, `ambientMedia: [gas, liquid]`.** planet, "aquatic, water-breathing Xalians capable of surviving in its rising and acidifying oceans began to populate the sea, manning ECHELON’s rigs and replacing the dwindling Vallerii population." The species itself works on rigs, which are floating industrial zones above the water, and the deep-cities are below it, so both phases are sustained. `breathes` is a subset of `ambientMedia`.

**`temperatureC` 5 to 52.** The planet data block gives a range of 5 to 67 degrees Celsius, and this band sits inside it. The lower bound is the planet floor, because planet, "Poseidas’s polar ice caps began to melt" places cold water in the working ocean; the upper bound stops short of the planet ceiling because the body is a water-breathing ocean animal rather than a creature of the hottest surface air.

**`swim` 55 to 75.** planet, "aquatic, water-breathing Xalians capable of surviving in its rising and acidifying oceans"; the body is a legged quadruped rather than a finned one, so it is a strong swimmer and not an exceptional one.

**`flight` 0, `burrow` 0.** No wings and no ground-moving body in either source; the legacy trait block also records that it does not fly.

**`climb` 10 to 25.** Hoofed feet and no grasping digits in the art; rigs are climbed by stairs, not by the body.

**`sprint` 40 to 60, `leap` 25 to 45.** A four-legged body of pony mass on deck plating. No source sentence puts either band above 60.

**`manipulation` 30 to 50.** Capped at 50 by the grasping anatomy it does have: the art shows a tightly coiled, prehensile-looking tail, and `tail` is a registry grasping part, as is `trunk`.

**`senses` sight 45 to 65, hearing 40 to 60, smell 35 to 55, no special sense.** All middling: no source sentence and no drawn feature supports a band above 60, and no special sense is supported by either source, so none is authored.

**`archetypeWeights` survivor 40, bulwark 25, vanguard 20, runner 15.** The row is shaped by one dominant reading: the species is an endurance worker whose defining act is holding a steady stream, so `survivor` (vitality, endurance) takes the largest share; species, "can maintain a steady stream". `bulwark` (vitality, resilience) carries the defense-of-the-rig reading from species, "a means of defense against pirates seeking to steal valuable Algael". `vanguard` (strength, vitality) carries the ones that go in first at a fire. `runner` (agility, endurance) carries the patrol reading from species, "patrol the various hydro-processing fleets on Poseidas". Sums to 100.

**Attribute bands.** `endurance` highest at 65 to 88: the legacy gauge rates stamina high and species, "can maintain a steady stream" is a sustained-output act. `strength` 45 to 65 and the rest mid-band: the legacy gauge rates standard attack medium and leaves every other rating blank, which is a relative signal of an unremarkable spread. `intelligence` 35 to 55, well below true-human range, for a creature engineered to work a fleet under instruction. `charisma` 30 to 50: nothing in either source gives it presence.

**Trait pool.** Reshaped on 2026-09-08 under Nick's pool shape: one required trait at 100, four rolled entries whose percents sum to exactly 100, and five entries in all. The expected count falls from 4.45 to 2.00, and an individual lands no rolled trait at all 31.2 percent of the time. The exclusion pair is not active, because `solitary` is not listed alongside `pack-bonded`.

Required

| Trait | Evidence |
|---|---|
| `protective` | The behavior the description is built around, and the reason the species exists. It was made to answer emergencies on the rigs and to stand between raiders and the Algael, which is the registry instinct to shield and protect others. Evidence (species): "Hippochamps were designed as emergency response crews for the various electrical and chemical fires that occur on rigs, as well as a means of defense against pirates seeking to steal valuable Algael." No body fact claims the first required slot, since the covering is `hide`, the body is corporeal, and nothing in the record states plating, chitin or light organs. |

Rolled (shares sum to 100)

| Trait | Share | Evidence |
|---|---|---|
| `territorial` | 35 | Strongest of the set: a species sentence about its own behavior, holding assigned ground, which is the registry definition of denial of passage. Evidence (species): "patrol the various hydro-processing fleets on Poseidas". Demoted from 100 because patrolling is how the species does the job rather than the point of the creature, and the point is already carried by the required trait. |
| `pack-bonded` | 25 | A species sentence about its own behavior again, the crews being plural and coordinated by the word itself. Evidence (species): "emergency response crews". Ranked below `territorial` because it rests on one noun rather than on a clause about what the animal does. |
| `hardened` | 22 | The species sentence puts this body inside electrical and chemical rig fires as its working day, which is thermal load, and the Poseidas hazard list carries crush depth for a form that works the rigs and the water beneath them. Planet-wide support behind a species reading, so it rolls rather than being required. |
| `resistant` | 18 | Weakest of the set: the Poseidas hazard list carries semiannual toxic bloom events with airborne microbial dispersal at the surface, and the output priorities carry filtration metabolism. Both are planet-wide, and the species' own description never makes contamination the point of the creature, so under the pool shape it rolls. |


Traits considered and left out, therefore at 0: `armored` (no armored covering and no `shell`), `regenerative`, `ramming`, `toxic`, `volatile`, `reflective`, `hypnotic`, `mind-sealed`, `foresighted`, `telekinetic`, `stealthy` (a patrol animal that hoses fires is not concealed), `nocturnal` (no source sentence about night on Poseidas), `slippery`, `luminous`, `phasing`, `solitary` (contradicted by the crew reading).

#### Cut by the evidence bar (2026-09-07)

| Trait | Former percent | Evidence class that failed |
|---|---|---|
| `healing` | 35 | no source sentence; the cited "emergency response crews" describes firefighting, not healing |
| `anchored` | 20 | body-type plausibility from the recoil of a jet; no source sentence |
| `inspiring` | 15 | no source sentence; the walkthrough concedes presence is not described |
| `menacing` | 12 | no source sentence; the sources show it hosing threats, not frightening them |
| `perceptive` | 30 | rule one of iteration three: the only support was a graded sight band with an upper bound of 65, under the 80 the tightened bar now requires, and `physiology.senses` carries no `special` entry |

Pool expected count 3.27 to 2.15 in iteration one, then 2.15 to 2.45 in iteration two once `perceptive` was restored. No surviving percent was changed in either pass. Iteration three on 2026-09-08 moved it from 2.45 to 4.45: `resistant` raised to 100, `hardened` and `territorial` added at 100, `perceptive` cut under the tightened sense rule. No surviving rolled percent moved. The pool shape of the same date then replaced iteration three: `protective` is the single required trait, `resistant`, `hardened` and `territorial` fell out of the demanded set into the rolled one, and the four rolled shares were authored to sum to exactly 100. Nothing new was cut, so this table is unchanged. Expected count 4.45 to 2.00.

**Instruments `trunk`, `hooves`, `tail`.** `trunk` is the fighting and working part by species, "Their long, trunk-like snouts serve as high-pressure water cannons". `hooves` are the four bearing feet in the art and the only striking parts the body has. `tail` is the coiled grasping part in the art. All three are in anatomy.

**Conduit `trunk: water`.** species, "Their long, trunk-like snouts serve as high-pressure water cannons, and can maintain a steady stream that allows them to hose down fires and threats alike": the element's power leaves the body through that part, which is exactly the conduit predicate. This grants the trunk the water medium row, which is what makes the `spray` signature legal alongside the trunk's own physical row.

**Signature `Hydrostatic Lance`, instrument `trunk`, action `spray`, medium `water`, intensity 35 to 80.** The lore-defining act is species, "Their long, trunk-like snouts serve as high-pressure water cannons, and can maintain a steady stream that allows them to hose down fires and threats alike". The effect terminates on the target as a projected stream, which is the registry definition of `spray`; the instrument is the snout, which is `trunk`; the medium is the primary element. The band is wide and starts mid because pressure is the whole act. No catalog ledger note reserves a signature for this species: a case-insensitive search for the species name across all fourteen `consolidated-*.md` files and `neutral-pools.md` returns no hits. The coined name was collision-scanned the same way and returns no hits; `Hydrostatic Crush` and `Hydrostatic Press` exist in the water crush cell, but neither is the same name. The name avoids the word cannon deliberately, because a coined name may not take real-world weapon register even when the source description uses the word.

## Authored fields

- `covering: hide`. No source names a surface; the art outline is smooth. Chosen over the `bare` default because the body carries the `hide` anatomy key and shows no armored aspect.
- `diet: omnivore`. Registry fallback for a flesh body; neither source shows it feeding.
- `communication: [vocal, display]`. `display` is inferred from the art's large crest; `vocal` has no source at all.
- `senses` bands and the absence of a special sense.
- `climb`, `sprint`, `leap`, `manipulation` bands: reasoned from the drawn body, not from a source sentence.
- `size` bands: absolutes proposed around the legacy gauge.
- `genome.chirality: rolled` (default).
- Trait percents: every number is a judgment; the reason lines above give the sourced fact each rests on, but the magnitudes are authored.
- Attribute band widths and midpoints.
- `intensity` band on the signature.

## Thin-combo findings

Instruments are `trunk` (lash, snare, shove, spray, strike, plus the water conduit row: spray, burst, cloud, snare, shove, mend, lash), `hooves` (strike, crush, shove) and `tail` (strike, lash, crush, shove, snare, hurl). Media are `water` primary plus on-graph secondaries `ice`, `plant`, `chemical`. Smallest relevant cells across those actions: water `hurl` 23, water `crush` 39, water `cloud` 50, ice `cloud` 32, ice `burst` 43, plant `drain` 48. Every instrument by action by medium combination in scope draws from a cell of at least 23 owned names before the neutral pool for that action is added. No combination falls below 6; there are no thin-combo findings.

## Script denials

Every FAIL the script raised on this key, in order:

1. `archetypeWeights` carried the key `protector` at 0, which is not one of the sixteen archetypes. This was my drafting error, not a rule I dispute: I reached for a role noun the roster deliberately does not carry, and `bulwark` plus `survivor` already cover it. Removed the key; the remaining four percents already summed to 100. Nothing was lost.

No rule of the skill forced an outcome I believe is wrong for this species. Two points of friction worth recording under operating rule 7, neither of which changed a value:

- The `covering` registry has no value for a smooth, undifferentiated animal surface that is neither leathery nor bare-by-ignorance. The rule pushed me between `bare` (the stated fallback when nothing is named or shown) and `hide` (which asks for a source showing a thick, leathery, wrinkled, or rugged surface, and the art shows none). I took `hide` because the anatomy key of the same name is what the body demands and the registry pairs the two, and I flagged it under Authored fields. The smallest fix is one sentence in the covering section saying that a species declaring the `hide` anatomy key takes the `hide` covering, so the two can never disagree.
- The `diet` fallback assigns `omnivore` to any flesh body the sources never show feeding. For a purpose-built industrial responder that is a shrug rather than a judgment, and the record now asserts a feeding habit no source supports. The smallest fix is either a seventh diet value for unknown, or an explicit rule that a fallback diet is always recorded as authored, which this walkthrough already does by convention.

## Answers to the script's WARN lines

- `conduits.source`: the sentence the validator agent should check is species, "Their long, trunk-like snouts serve as high-pressure water cannons, and can maintain a steady stream that allows them to hose down fires and threats alike". The art independently shows a wide fan of water leaving the tip of the snout. The element's power leaves the body through that part, so the conduit predicate holds.
- `signature.description.elementkey`: the word flagged is 'fire', used in the signature description as an ordinary English noun meaning a blaze on a rig deck, never as a type label. It is the same word the source uses in species, "the various electrical and chemical fires that occur on rigs". No element key is named as a type anywhere in the prose.
- `enc.definition.elementkey`: the words flagged are 'water' and 'chemical' in the Encyclopedia definition. Both are ordinary English there: 'water cannon' is the source's own phrase for what the snout does, and 'chemical fires' is the source's own phrase for what it is sent to. Neither names an element type.

## Validator output

```
WARN conduits.source                conduit trunk for water: the validator agent must confirm the sentence or art showing the element leaving through this part
WARN signature.description.elementkey signature description uses element key word(s) as plain words: fire (allowed only as ordinary English, never as a type label)
WARN enc.definition.elementkey      encyclopedia definition uses element key word(s) as plain words: water, chemical (allowed only as ordinary English, never as a type label)

0 FAIL, 3 WARN (structurally clean; every WARN must be answered in the walkthrough)
```

## Orchestrator amendments

- 2026-09-02, after the independent validation and the orchestrator's own look at the art: the signature description was a staged scene (set hooves, lowered snout, a boarder, 'until the deck is clear'); rewritten to the sourced act. 'prehensile' dropped (the art shows a coiled tail gripping nothing); the closing clause inverted the planet's geometry (floating fleets are above the deep-cities) and added 'last' to the death tide; replaced with the history's own description of the fleets. `breathes` and `ambientMedia` keep `liquid`: environment is what a planet-wide sentence may carry ('aquatic, water-breathing Xalians' manning the rigs) and the art is seahorse-derived with a webbed cheek fin; recorded as authored. Covering `hide` kept for a flesh animal body with no surface named (the run's pairing question is answered by the general ruling below). Art matched the run's reading.
- 2026-09-02, planet rebuild: `temperatureC` re-banded from [5, 52] to [5, 40] (intersection) against the rebuilt planet record's habitable band [-2, 40] C; the old band was validated against the legacy planetary extremes, which are not survivable. Any gravity figure cited in this walkthrough predates the rebuild; the current value is `physical.derived.gravityEarth` = 0.73.
- 2026-09-07, trait evidence bar (Nick): cut healing, perceptive, anchored, inspiring, menacing; pool expected count 3.27 to 2.15.
- 2026-09-07, trait evidence bar iteration two (Nick): restored perceptive; cut none; expected count 2.15 to 2.45.
- 2026-09-08, trait evidence bar iteration three (Nick): added hardened, territorial; raised resistant; cut perceptive; expected count 2.45 to 4.45.
- 2026-09-08, pool shape (Nick): required protective; rolled territorial 35, pack-bonded 25, hardened 22, resistant 18; expected count 4.45 to 2.00.
- 2026-09-09, lore split (Nick): description reverted to species.json; body and habits authored; descriptionStatus removed.
