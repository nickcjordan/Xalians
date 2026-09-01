---
name: migrate-species
description: Migrate one legacy species to the ratified creature-record template (Graviclaw pattern), covering every ratified layer without omission. Use for each of the 29 legacy species and for authoring new species.
---

# Migrate Species (Stage 3)

One species' lore in, one ratified template out. The Graviclaw pilot is the pattern; this checklist encodes every ruling since. The design doc (`~/.claude/plans/xalian-creature-system-redesign.md`) is authoritative; this skill is the execution order.

## Inputs

- The species' entry in `lambda/src/json/species.json` (description is a fixed input; stats/sizes are NOT — they are a relative gauge only, per the size authoring rule).
- The ratified record schema (design doc §2) and registries: 34 anatomy keys + 7 channels + allowed-actions matrix (`xalian-catalog/anatomy-consolidated.md`), 24-key trait vocabulary with renames (healing, protective, pack-bonded, solitary, ramming), 16-archetype roster, temperament axes, lifespan enum, finish odds.
- The consolidated name catalog for the species' element(s) + `neutral-pools.md`.
- The lore-voice skill for any prose written.

## Procedure (in generation-layer order)

1. **Full-description read.** Classify every ability/trait/anatomy decision against the FULL description, not the power in isolation (the Gravity Well lesson: lore said prey is pulled to the claw, so instrument = pincers, not mind).
2. **Buried-auto-trait pass.** Surface every trait the body demands into `guaranteed` (chitin → armored; ice tusks; levitation; non-corporeal → phasing auto-grant). Rolled pool is strictly additive: a rare roll always has MORE, the standard is never better than the rare.
3. **Physiology.** All universal dimensions present (explicit-none principle: `communication: []` legal, `breathes: []` legal, `diet: "none"` legal). Fields: corporeality, composition, bodyPlan, **anatomy** (species-fixed; external functional parts only, from the 34-key registry; 5 flagged species — Smokat, Newtapede, Luceras, Figzy, Akinza — need authored anatomy), covering, height/weight bands (realistic absolutes; Nick's originals are relative gauges; mass serves the fantasy), **lifespan** (enum fleeting|short|standard|long|enduring|ageless from the wear rubric: mass + metabolic intensity, composition, home-world harshness; ageless = non-wearing, still killable), **genome** (chirality: levo/dextro rolled 50/50; achiral only species-declared), diet, communication (vocal|vibration|display|chemical|telepathic), **breathes** (phase list: gas|liquid|vacuum) + **environmentalTolerance** (ambientMedia ⊇ breathes; temperatureC min/max = sustained normal activity), capability bands 0-100, senses + special list.
4. **Instrument declaration.** 1-3 instruments. Every physical instrument MUST appear in anatomy; innate channels need their predicates satisfiable (mind: psychic support; breath: breathes non-empty; voice: vocal in communication; swarm: bodyPlan; gaze: sight + declaration; secretion/aura: lore justification). Manipulation band may reach high values only when the means is guaranteed.
5. **Archetype weights.** Weighted roster subset (Graviclaw: stalwart 5, vanguard 3, predator 1). Balanced stores `favors: []`.
6. **Attribute bands** 0-100 per attribute; intelligence never bands into true human range (speech canon).
7. **Element.** Primary fixed by species; affinity odds inherit 75/25 unless overridden; secondaries from the planet adjacency graph; NO anomalous anything (scrapped).
8. **Trait pools.** `guaranteed` + `rolledCount` range + weighted pool; every weight justified against physiology (mandatory rule); registry tilts apply at generation (do not re-declare per species); exclusion pairs respected (pack-bonded × solitary).
9. **Signature ability.** Exactly one. The species' lore-defining act. Grander-register name (exempt from 2-word limit), collision-checked against the full catalog; baseline grammar fields mandatory (instrument/action/medium + intensity band 1-100); one-line description in canon voice (lore-voice skill); medium needs element/affinity cover; may exceed the instrument list but only with registry vocabulary. No reality-breaking powers (no teleport/time-reversal/creating life/puppeting/permanent transformation; bounded look-alikes only).
10. **Catalog check through the species lens.** Verify the species' reachable (instrument × action × medium) combos draw well from its element cells + neutral pools; report thin combos to the checker backlog — never pad cells ad hoc.
11. **Present to Nick inline** as part of a per-planet review batch: full template JSON + a prose walkthrough of every judgment call (size changes, authored anatomy, signature reasoning), pending questions in prose one at a time. State/Next block. Explicit sign-off ratifies; discussion does not.

## Standing rulings

- Sexless, no reproduction, pronoun "it"; no species speaks language.
- generatorPlanets home-only for legacy species; cross-planet is a new-species design concern.
- Appearance: no per-species finish authoring unless deliberately overriding global odds; variant/pattern/palette stay reserved.
- Legacy two-sentence stub species get their descriptions upgraded to full register (lore-voice) as part of migration, Nick reviews.
