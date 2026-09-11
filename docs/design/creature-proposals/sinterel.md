# Sinterel: first full creature proposal

## Proposal boundary

Sinterel is the recommended realization of the approved Veridium metallurgical-restorer brief. It is a design proposal, not a ratified species. Its complete candidate record is kept in [sinterel.json](./sinterel.json), outside the bundled species directory, so review state never becomes a field in creature data and the creature cannot enter generation accidentally.

The proposal should advance to art and population testing only after its identity and record are approved. It should enter `docs/species-templates`, the content bundle, and `RATIFIED.json` only at the later ratification gate.

## Identity

The Sinterel is a low, six-legged organism made of living metal. It moves through Veridium's factory trenches and gantries, finds structural damage by drumming across it, secretes warm mobile alloy into the break, and works the repair with fine tendrils while broad pincers hold the damaged body or structure still.

This is restoration as a bodily sequence:

1. locate the fracture through contact and vibration;
2. brace the damaged object with visible anatomy;
3. extrude a finite material from visible vents;
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
| Anatomy | Pincers, tendrils, vents, body | Pincers brace, tendrils perform fine work, vents establish the source of secretion, and the body supplies the six-legged mass |
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

Plain behavior: the Sinterel fills damage with living alloy, forms it into a support lattice, and holds the target steady until the repair bears weight.

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

At 72 to 98 centimeters tall and 220 to 360 kilograms, the Sinterel is low enough to work beneath machinery but heavy enough to read as a dense metal organism under Veridium's 1.83 Earth gravity. Six load-bearing legs distribute that mass and make climbing credible without making it fast.

The repair material is finite. Heat is the creature's energy source, while pieces of scrap are folded into its internal alloy reserve as replacement mass. A Sinterel that has spent that reserve can still brace damage but cannot continue filling fractures until it has replenished itself. This prevents the restorative act from reading as costless matter creation.

## Coverage delta if ratified

| Coverage concern | Current roster | Effect of Sinterel |
| --- | --- | --- |
| Metal species | Foromeer only | Metal gains a second species with an opposite ecological and mechanical identity |
| Veridium species | Foromeer only | Veridium gains a non-excavation fauna lane |
| Primary metal composition | Absent | Becomes represented once |
| Enduring lifespan | Absent | Becomes represented once |
| Signature `mend` | Absent | Becomes represented once |
| High manipulation on Veridium | Absent | Establishes the report's metallurgical-manipulation priority |

These gains come from one concept. No unused sense, anatomy part, archetype, or unrelated trait was added merely to improve a count.

## Contrast audit

### Against Foromeer

Foromeer is tall, bipedal, flesh beneath metallic plating, strength-led, and built to drill through material. Sinterel is low, multiped, metal throughout, mind-and-resilience-led, and built to rejoin material. Foromeer's best movement is burrowing; Sinterel cannot meaningfully burrow and instead climbs industrial structures. Removing both names and element labels still leaves breaker versus restorer.

### Against Voltish

Voltish is a flesh-and-metal biped that stores environmental charge and releases it through alloy claws. Sinterel does not store or project electricity, has no claws, and uses metal as transferred repair material. Discharge arcs remain a hazard rather than becoming its identity.

### Against Crystorn

Crystorn is a plated mineral quadruped whose crystal horns focus stored light into a beam. Sinterel is mobile on gantries, lacks a radiant core or horn emitter, and performs a contact repair through substance, bracing, and fine manipulation.

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

| Input | Sinterel answer |
| --- | --- |
| Defining act | Rejoins a damaged body or structure with worked living alloy |
| Material or anatomy | Bare metal body, six gripping legs, pincers, tendrils, seam vents |
| Ecological role | Patient maintainer of Veridium's metal fauna and factoryscape |
| Temperament | Attentive, persistent, deliberate, helpful without being socially commanding |
| Sound intent | Softer and more flowing than Foromeer, but still carrying a metallic center |

Root palette: `sinter`, `sentinel`, `seam`, `suture`, `alloy`, `forge`, `join`, `lattice`, `tendril`, and `whole`.

### Candidate set

| Mode | Candidate | Decision |
| --- | --- | --- |
| Transparent compound | Seamwright | Clear, but reads as an occupation or tool-user rather than an organism |
| Transparent compound | Forgeweaver | Evocative, but overstates weaving and sounds more magical than bodily |
| Fused roots | Sintervine | Keeps the joining process but overpromises plant-like anatomy |
| Fused roots | Allotril | Alloy plus tendril, but difficult to parse aloud and visually close to a chemical trade name |
| Transformed root | Sintera | Readable, but its open ending leans toward the existing planet-name register |
| Transformed root | Sutrel | Compact, but too close to suture alone and loses the metal process |
| Tonal coinage | Velori | Patient and flowing, but insufficiently connected to the creature |
| Hybrid | Sinterel | Selected: a compression of `sinter` and `sentinel`, with both roots serving defining facts |

`Sinterel` is pronounced **SIN-ter-el**, three syllables. `Sinter` names the heat-assisted joining process at the center of its body and signature. `Sentinel` contributes the watchful maintainer that detects damage and responds to it. The overlap keeps the derivation abstract: the result is neither a tool name nor a literal registry summary.

The first draft was driven primarily by `sinter` and softened with a creature-like ending. The systematic re-audit strengthens that derivation through the independently relevant `sentinel` root rather than pretending the complete two-root explanation existed before the naming framework did.

In roster sound, it has a softer three-syllable cadence than the hard compounds used by several function-forward species. Its `Sint-` opening and `-erel` ending do not duplicate a current species, and it does not rely on X or Z for alienness. It shares an initial S with Smokat and Scalatto, but neither the full opening sound nor the ending is close in speech.

### Signature-title candidates

The completed act is not merely an unbroken object being made. It takes existing ruin and returns it to function. Candidates considered were `The Metal Remembers`, `The Shape Endures`, `Ruin Cannot Hold`, `The Unbroken Making`, and `Ruin Made Whole`.

`Ruin Made Whole` is the recommendation. Its three beats state a transformation from damage to restoration, fit the signature's broad legal target set, and remain grander than a generated name such as `Metal Weld` or `Repair`. It does not invent mythology or imply that only metal targets can be restored.

## Review judgments before art

The proposal recommends these decisions as a package:

1. **Name:** `Sinterel`, from `sinter` plus `sentinel`, with a sound deliberately softer than Veridium's breaker. It is the post-design recommendation and has no current repository collision.
2. **Silhouette:** low hexapod with separate front pincers and two fine tendrils. This is the minimum anatomy that makes stable bracing and precise seam work simultaneously visible.
3. **Healing scope:** retain universal mechanical targeting and let living alloy act as replacement, graft, brace, or recovery scaffold according to the target.
4. **Enduring lifespan:** accept centuries as a direct consequence of ongoing material replacement, without escalating to `ageless`.
5. **No armor trait:** preserve the distinction between what a creature is made of and whether its surface functions as armor.

If these judgments hold, the next gate is concept art followed by an art-to-record consistency pass. Population simulation and consumer balance testing should use the post-art record, because the art may legitimately force small anatomy, size, covering, or instrument corrections.

## Checks completed on this draft

- Current `SpeciesTemplateSchema`: pass.
- Home-world temperature containment: pass at -10 to 80 C inside Veridium's committed -10 to 80 C habitable band.
- Physical instrument source: pass; pincers and tendrils are both present in anatomy.
- Channel source: pass; the secretion is established in the description, appearance, feeding, behavior, and signature.
- Signature instrument/action relationship: pass; `secretion` directly permits `mend` without an exception.
- Ability-catalog reachability: 81 reachable instrument/action/medium cells, zero thin cells, and 3,962 distinct valid generated names against the 30-name floor.
- Repository collisions: none for `Sinterel` or `Ruin Made Whole` in current species and ability data.
