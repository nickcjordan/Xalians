# Sonalloy: species walkthrough

## Ratification boundary

Sonalloy is the approved realization of the Veridium metallurgical-restorer brief. Its canonical template is [sonalloy.json](./sonalloy.json), while review state remains outside creature data in `lore-status.json`. Nick approved the identity, record, name, signature, and final concept-art direction through the completed design review on 2026-09-11; bundling and manifest ratification follow only after the structural, population, art, and consumer gates pass.

The approved portrait source is [art/sonalloy.png](./art/sonalloy.png). The site portrait and compact token are separate SVG assets under `apps/web/src/svg/species`, following the current species-art contract.

## Identity

The Sonalloy is a low, six-legged organism made of living metal. Two small recessed eyes are grouped on its lower forward slope directly above a single broad, downward-facing extrusion vent centered between the bases of its two fine tendrils. It moves through Veridium's factory trenches and gantries, finds structural damage by drumming across it, braces the damaged body or structure with broad pincers, extrudes warm mobile alloy between the tendrils, and uses them to draw that material directly into the break and work the repair.

This is restoration as a bodily sequence:

1. locate the fracture through contact and vibration;
2. brace the damaged object with visible anatomy;
3. extrude a finite material from the visible underside vent directly between the working tendrils;
4. shape and compress that material until it carries weight.

It is not a machine carrying a repair tool. Feeding keeps its alloy mobile, its body continuously replaces lost material, it responds behaviorally to damage, and groups form and disperse around ecological need.

## Dependency decisions

| Layer | Proposed choice | Reason |
| --- | --- | --- |
| World function | Maintains metal-shaped fauna and factory structures | Directly develops Veridium's metallurgical-manipulation and self-repair fauna lanes without repeating excavation |
| Element and composition | Metal; primary `metal` | The material is the body, not armor over flesh and not a secondary alloy component |
| Corporeality | Corporeal | Its defining act depends on weight, contact, bracing, and transferred material |
| Body plan | `multiped` | Six load-bearing legs provide a stable gantry silhouette and avoid Foromeer's biped profile |
| Covering | `bare` | A continuous metal surface is not automatically protective plating; this deliberately rejects automatic `armored` |
| Anatomy | Pincers, tendrils, vents, body | Pincers brace, tendrils pull material from the centered underside vent and perform fine work, the vent establishes the source of secretion, and the body supplies the six-legged mass |
| Diet | `energy-feeder` | It explicitly takes in forge and channel heat to keep internal alloy mobile |
| Respiration | None | The fully metal organism has no stated gas exchange; gas remains its normal ambient medium |
| Lifespan | `enduring` | Continuous replacement of a metal body supports a life measured in centuries, while still allowing wear and death rather than claiming agelessness |
| Mobility | High climb and manipulation; low sprint; negligible burrow, swim, and leap; no flight | Matches gantries and trenches, the report's optimal climb lane, and its explicit objections to burrow and flight |
| Senses | Strong contact-oriented hearing, ordinary sight, negligible smell, no special sense | Drumming and returned vibration support fracture work without duplicating Foromeer's explicit tremorsense |
| Archetypes | Sage 40, Stalwart 30, Bulwark 20, Survivor 10 | Expresses intelligent repair, patient resolve, structural resilience, and individual endurance without a strength-first identity |
| Required traits | `regenerative`, `healing` | Every individual repairs itself and its defining signature restores another target |
| Rolled traits | Hardened 55, Protective 30, Anchored 15 | Forge specialization is common, intervention on behalf of others varies, and a minority can lock all six feet against displacement |
| Instruments | Pincers, tendrils, secretion | Every instrument has a visible or explicitly described physical source |
| Conduit | Secretion carries Metal | The emitted substance is living alloy. This declaration records the medium's path rather than inventing a generic elemental aura |

## Signature

**Ruin Made Whole** uses `secretion / mend / metal` at intensity 40 to 80.

Plain behavior: the Sonalloy fills damage with living alloy, forms it into a support lattice, and holds the target steady until the repair bears weight.

The signature uses `mend` because it restores the user or another creature. The Healing trait's contract does not allow metal flavor to restrict legal targets. On a metal body, the alloy becomes replacement structure; on flesh, plant, mineral, slime, or another body, it acts as a fitted graft, brace, and temporary support through which recovery occurs. That keeps the fiction specific while preserving the universal target rule.

`secretion` is already allowed to perform `mend` in the instrument/action registry. The conduit is still useful because it identifies the emitted material and adds the Metal conduit action row to this instrument for generated non-signature abilities. The signature does not depend on an exception.

## Quantitative shape

The base bands are intentionally uneven rather than broadly excellent:

- Its defining strengths are manipulation, climb, intelligence, willpower, and resilience.
- Vitality and endurance support repair work and a persistent metal body.
- Strength is moderate because the pincers brace and align rather than crush as the primary act.
- Agility, reflex, sprint, and leap remain limited by a dense, stable frame.
- Charisma is modest; cooperative repair is a behavior, not social command.
- Two traits are universal and the rolled pool contributes one expected additional trait, for an expected trait count of 3.0 before exclusions.

At 72 to 98 centimeters tall and 220 to 360 kilograms, the Sonalloy is low enough to work beneath machinery but heavy enough to read as a dense metal organism under Veridium's 1.83 Earth gravity. Six load-bearing legs distribute that mass and make climbing credible without making it fast.

The repair material is finite. Heat is the creature's energy source, while pieces of scrap are folded into its internal alloy reserve as replacement mass. A Sonalloy that has spent that reserve can still brace damage but cannot continue filling fractures until it has replenished itself. This prevents the restorative act from reading as costless matter creation.

## Coverage delta after ratification

| Coverage concern | Current roster | Effect of Sonalloy |
| --- | --- | --- |
| Metal species | Foromeer only | Metal gains a second species with an opposite ecological and mechanical identity |
| Veridium species | Foromeer only | Veridium gains a non-excavation fauna lane |
| Primary metal composition | Absent | Becomes represented once |
| Enduring lifespan | Absent | Becomes represented once |
| Signature `mend` | Absent | Becomes represented once |
| High manipulation on Veridium | Absent | Establishes the report's metallurgical-manipulation priority |

These gains come from one concept. No unused sense, anatomy part, archetype, or unrelated trait was added merely to improve a count.

## Deterministic population check

The repository's standard 200-record batch (`batch-2026-09-07-sonalloy`) produced the intended population rather than exposing a correction need:

- archetype shares were Sage 39.5%, Stalwart 33.5%, Bulwark 19.0%, and Survivor 8.0%, close to the authored 40/30/20/10 weighting;
- Hardened appeared in 57.0%, Protective in 26.0%, and Anchored in 14.0%, with no pool entry more than ten points from its authored rate;
- the population averaged 2.97 traits against an authored expectation of 3.00, while the two defining traits remained universal;
- favored attributes gained an 18.5-point mean band-position lift over unfavored attributes, preserving build differentiation;
- generated ability-name diversity was 0.56 across 689 abilities, above the roster's lowest values; and
- mean size was 85.3 centimeters and 289.2 kilograms, centered in both authored bands.

The simulation therefore supports the authored bands and weights without a post hoc adjustment.

## Contrast audit

### Against Foromeer

Foromeer is tall, bipedal, flesh beneath metallic plating, strength-led, and built to drill through material. Sonalloy is low, multiped, metal throughout, mind-and-resilience-led, and built to rejoin material. Foromeer's best movement is burrowing; Sonalloy cannot meaningfully burrow and instead climbs industrial structures. Removing both names and element labels still leaves breaker versus restorer.

### Against Voltish

Voltish is a flesh-and-metal biped that stores environmental charge and releases it through alloy claws. Sonalloy does not store or project electricity, has no claws, and uses metal as transferred repair material. Discharge arcs remain a hazard rather than becoming its identity.

### Against Crystorn

Crystorn is a plated mineral quadruped whose crystal horns focus stored light into a beam. Sonalloy is mobile on gantries, lacks a radiant core or horn emitter, and performs a contact repair through substance, bracing, and fine manipulation.

## Risks considered and rejected

- **Automatic armor:** rejected. A metal body establishes composition; only plating, a shell, or a reliable armor-forming behavior would establish `armored`.
- **Robot aesthetic:** rejected. There are no manufactured tools, screens, wheels, code behaviors, interchangeable components, or implied operator commands.
- **Vague healing field:** rejected. Material, source, delivery, manipulation, and completion are all visible.
- **Foromeer repetition:** rejected. Burrow, ramming, drill anatomy, biped posture, and strength-first archetypes are absent.
- **Electrical gap capture:** rejected. Veridium's arcs are acknowledged as danger, but insulation and discharge abilities belong to a creature whose body actually supports them.
- **Tremorsense capture:** rejected. Contact drumming is task behavior represented by hearing; Foromeer retains the explicit special sense.
- **Ageless metal:** rejected. Self-repair explains centuries, not immortality.

## Naming pass

The repository previously had a broad naming convention, not a complete selection system: creature names should sound like their function and tend toward readable portmanteaus or mashups. It did not require the name to come after the design, document its roots, explore different construction modes, or compare sound and spelling against the roster. The [creature naming system](../creature-naming-system.md) now supplies those missing gates.

### Name brief

| Input | Sonalloy answer |
| --- | --- |
| Defining act | Rejoins a damaged body or structure with worked living alloy |
| Material or anatomy | Bare metal body, six gripping legs, pincers, tendrils, centered underside extrusion vent |
| Ecological role | Patient maintainer of Veridium's metal fauna and factoryscape |
| Temperament | Attentive, persistent, deliberate, helpful without being socially commanding |
| Sound intent | Softer and more flowing than Foromeer, but still carrying a metallic center |

Root palette: `sonic`, `resonance`, `alloy`, `anneal`, `seam`, `suture`, `join`, `lattice`, `tendril`, `whole`, and Italian `saldare` (to join, weld, or heal).

### Candidate set

| Mode | Candidate | Decision |
| --- | --- | --- |
| Transparent compound | Seamwright | Clear, but reads as an occupation or tool-user rather than an organism |
| Transparent compound | Alloywright | Precisely describes the work, but sounds like a profession rather than a species |
| Fused roots | Tendraloy | Readable fusion of `tendril` and `alloy`, but emphasizes anatomy more than the full behavior |
| Fused roots | Resoneal | Joins `resonance` and `anneal`, but its intended pronunciation is not reliably recoverable from its spelling |
| Transformed foreign root | Saldrel | Draws on Italian `saldare` and `tendril`, but can be heard as “saw drill,” pointing toward the wrong function |
| Tonal coinage | Velori | Patient and flowing, but insufficiently connected to the creature |
| Hybrid | Sonalloy | Selected: a fusion of `sonic` and `alloy`, joining the two defining halves of its repair sequence |

`Sonalloy` is pronounced **son-AL-loy**, three syllables. `Sonic` supplies the vibration and returned sound through which the creature maps a fracture. `Alloy` supplies the living metal it transfers into the break and shapes into a repair. The name therefore follows the creature from diagnosis into restoration without reading as a tool, occupation, or ability title.

In roster sound, it has a distinct three-syllable cadence and an `-alloy` ending unused by any current species. Its recognizable roots are intended to make the written form recoverable after hearing it, while their fusion remains abstract enough to function as a creature name. It does not rely on decorative X or Z spelling, and its central stress gives it a different rhythm from Smokat and Scalatto despite the shared initial S.

### Signature-title candidates

The completed act is not merely an unbroken object being made. It takes existing ruin and returns it to function. Candidates considered were `The Metal Remembers`, `The Shape Endures`, `Ruin Cannot Hold`, `The Unbroken Making`, and `Ruin Made Whole`.

`Ruin Made Whole` is the recommendation. Its three beats state a transformation from damage to restoration, fit the signature's broad legal target set, and remain grander than a generated name such as `Metal Weld` or `Repair`. It does not invent mythology or imply that only metal targets can be restored.

## Review judgments

The proposal recommends these decisions as a package:

1. **Name:** `Sonalloy`, from `sonic` plus `alloy`, with a sound deliberately softer than Veridium's breaker. It is the post-design recommendation and has no current repository collision.
2. **Silhouette:** low hexapod with separate front pincers and two fine tendrils. This is the minimum anatomy that makes stable bracing and precise seam work simultaneously visible.
3. **Healing scope:** retain universal mechanical targeting and let living alloy act as replacement, graft, brace, or recovery scaffold according to the target.
4. **Enduring lifespan:** accept centuries as a direct consequence of ongoing material replacement, without escalating to `ageless`.
5. **No armor trait:** preserve the distinction between what a creature is made of and whether its surface functions as armor.

These judgments held through the art-to-record consistency pass. The final art keeps exactly six load-bearing legs, two attached broad pincers, two working tendrils, two simple recessed eyes, and one centered underside extrusion vent. The vent placement makes the repair sequence physically reachable: alloy emerges between the tendrils while the pincers remain outside the work area to brace the target.

## Checks completed on this draft

- Current `SpeciesTemplateSchema`: pass.
- Home-world temperature containment: pass at -10 to 80 C inside Veridium's committed -10 to 80 C habitable band.
- Physical instrument source: pass; pincers and tendrils are both present in anatomy.
- Channel source: pass; the secretion is established in the description, appearance, feeding, behavior, and signature.
- Signature instrument/action relationship: pass; `secretion` directly permits `mend` without an exception.
- Ability-catalog reachability: 81 reachable instrument/action/medium cells, zero thin cells, and 3,962 distinct valid generated names against the 30-name floor.
- Repository collisions: none for `Sonalloy` or `Ruin Made Whole` in current species and ability data.
- Spoken round trip: pass; the naming review replaced the difficult working name with `Sonalloy`, and Nick accepted the new name and pronunciation.

## Authored fields

The exact numeric edges of the size, capability, sense, attribute, and signature-intensity bands are authored calibration. Their directions and relationships are supported by the approved identity, Veridium's world record, and the dependency decisions above. `genome.chirality: rolled` is the registry default for a corporeal generated organism. No other field lacks an identified design or world source.

## Thin-combo findings

There are no thin-combo findings. The final record reaches 81 valid instrument/action/medium cells and 3,962 distinct catalog names, with every reachable cell remaining above the required name floor. `secretion / mend / metal` is legal without a signature exception, and the secretion conduit is visibly sourced by the centered extrusion vent.

## Art consistency

The approved concept and record describe the same creature. The low broad metal body, six splayed gripping legs, attached pincers, paired tendrils, forward eyes, and centered underside vent are all visible. The monochrome portrait uses a broad white sweep as the established art style's abstraction for reflected or forge-lit metal; it does not add armor plating or a separate machine shell. The simple eye shapes express ordinary sight and do not imply nocturnal vision, heat-sense, or another special sense.

## Script denials

The first canonical validator run raised three lexical FAIL lines because it reserves the word `damage` for possible game-mechanics prose even when used in its ordinary physical sense. The origin now says fractures accumulate, the company field says several converge on breakage and separate after the repair is stable, and the encyclopedia says the creature locates fractures and braces a broken target. These are wording changes only; the underlying act is unchanged.

The validator's secretion-source and conduit-source warnings are confirmed by the approved record and art. The description names warm alloy drawn from the broad extrusion vent, the appearance places that vent directly between the tendril bases, and the behavior states that alloy is extruded there before the tendrils draw it into the fracture. The encyclopedia's use of `metal` is ordinary material language for the creature's living-metal body, not a game type label, so it remains.
