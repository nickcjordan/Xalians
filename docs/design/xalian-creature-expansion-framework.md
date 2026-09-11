# Xalian Creature Expansion Framework

## Purpose

New creatures are selected from demonstrated universe needs, not from an isolated concept backlog. The system separates four questions that are easy to blur together:

1. **Coverage:** Which established options are absent, fragile, or over-concentrated in the roster?
2. **Coherence:** Which combinations make sense together on a particular world and produce one readable creature identity?
3. **Population balance:** What distributions emerge after archetype, attribute, affinity, trait, appearance, and ability rolls?
4. **Game balance:** What happens when a generated creature is interpreted by an actual game?

The generated [coverage ledger](./CREATURE-EXPANSION-COVERAGE.md) answers the first question. It deliberately does not pretend that equal representation means equal strength.

The first application of this process is recorded in [Creature Expansion Target Briefs 01](./creature-expansion-target-briefs-01.md).

## Sources of truth

Every expansion pass starts from the committed versions of:

- `packages/content/json/speciesRecords.json`: ratified species templates.
- `packages/content/json/registries.json`: allowed vocabularies and instrument/action relationships.
- `packages/content/json/planetRecords.json`: world history, environmental reports, and habitable temperature bands.
- `packages/content/json/abilityCatalog.json`: realizable ability names.
- `packages/rules/src/generator`: the actual population-generation behavior.
- `docs/species-templates/RULINGS.md` and `REGISTRY-DEFINITIONS.md`: authoring judgments that schemas cannot express alone.

`node scripts/creatureCoverage.js` rebuilds the roster inventory. CI rejects a stale inventory after the species bundle changes.

## Coverage model

Coverage is read in layers. Each layer answers a different design question.

### 1. Universe representation

Count species by element and home world. This establishes where an entire part of Xalia has too little biological range. A world with one species is a stronger expansion prompt than a world with three, but the count alone does not determine the next choice.

### 2. Biological representation

Count corporeality, composition, body plan, covering, diet, communication, breathing media, ambient media, lifespan, anatomy, and special senses. Use three statuses:

- **Absent:** a ratified vocabulary option has no current example.
- **Singleton:** one species is the only example, making the idea fragile and easy to confuse with that species's personal identity.
- **Established:** at least two examples demonstrate that the option is a reusable part of the universe.

This is a diversity test, not a quota. A rare category may be rare for a good worldbuilding reason.

Not every registry zero is a valid target. Some values exist to express an edge case when demanded, and some combinations are prohibited by the model. In particular, `vacuum` may be tolerated as an ambient medium but is not a breathing target; a non-breathing creature uses `breathes: []`. Anatomy and instruments are also demand-led: an unused part is an opportunity only after a coherent body calls for it.

### 3. Generated-population representation

For archetypes and traits, raw species counts are insufficient. The ledger therefore records authored probability exposure across an equal-species roster. Before using that exposure as a balance finding, run deterministic generated batches and measure observed results after tilts, exclusions, and archetype effects.

For attributes, capabilities, and graded senses, compare band midpoints, widths, and extremes. Do not target identical averages. Look instead for accidental dead zones, repeated profiles, or a supposed archetype with no creature capable of expressing it strongly.

### 4. Ability identity and reachability

Count signature actions, signature media, signature instruments, available instruments, and conduits. Then run the existing catalog coverage checker. A new creature must have:

- a signature that is distinct in the combination of instrument, action, medium, and narrative act;
- enough reachable standard ability names for its instruments and possible affinity media;
- no dependence on a signature exception to make its baseline ability function.

### 5. Consumer balance

No template property is declared overpowered or underpowered in the abstract. Each game must derive its own mechanics, then test the roster in that ruleset. A finding belongs to one of three places:

- the game derivation, when the game prices a valid creature fact badly;
- a tunable generator lever, when generated populations are distorted across all consumers;
- the species template, only when the template itself is internally incoherent or fails to describe the intended species.

Existing ratified records are not rewritten merely to make category counts symmetrical.

## Selecting the next design target

Before any name, silhouette, or lore paragraph is proposed, write a one-page target brief containing:

1. **Primary deficit:** the most important absence, singleton, or world-level shortage being addressed.
2. **Supporting deficits:** one to three additional gaps that naturally reinforce the same creature.
3. **World function:** what its Generator made it to do, or the ecological role it now occupies.
4. **Mechanical identity:** the observable act that distinguishes it from existing species, stated without game-specific numbers.
5. **Contrast set:** the two or three current species it could be confused with and the exact distinction from each.
6. **Constraints:** home-world habitable band, terrain mobility, breathes/ambient-media relationship, element graph, and established lore.
7. **Do-not-force list:** attractive coverage gaps that do not belong on this creature.

A target is strong when two to four deficits collapse into one coherent identity. A design that exists only to tick unrelated boxes is rejected before prose or art work begins.

## Designing the template

Build in dependency order so later choices cannot quietly contradict earlier ones:

1. Home world, primary element, origin, and ecological function.
2. Corporeality, composition, body plan, covering, size, lifespan, diet, and environmental contract.
3. Anatomy and instruments visible in the creature's silhouette.
4. Capabilities and senses required by the body and ecological function.
5. Attribute bands describing the species before archetype modification.
6. Archetype percentages expressing plausible individual variation.
7. Required traits, followed by a rolled trait pool with its fixed probability budget.
8. Signature instrument/action/medium and its plain baseline behavior.
9. Conduits only where a source shows the element leaving through a particular part.
10. Appearance qualities and the five presentation fields.
11. Species name, using the [creature naming system](./creature-naming-system.md) only after the defining pieces above are stable.
12. Signature title, after its physical act and mechanical fields are fixed.

At every step, compare the draft to its contrast set and record the coverage delta. If the defining difference disappears when the proper nouns are removed, the concept is not distinct enough.

## Verification gates

### Gate A: Structural

- Schema validation passes.
- The species validator reports zero failures and every judgment warning is answered.
- Review status remains outside the creature record.
- The content bundle and coverage ledger regenerate without drift.

### Gate B: Coherence

- Physiology supports the stated capabilities, senses, instruments, and signature.
- Temperature and media fit the home world.
- Traits follow from ratified facts and do not duplicate raw fields.
- Lore, data, and art describe the same silhouette and central act.

### Gate C: Population

- Generate a fixed-size deterministic sample for the draft and a control sample for the current roster.
- Compare archetype, affinity, trait-count, trait-pair, attribute, capability, sense, finish, ability-action, and ability-medium distributions.
- Investigate material shifts; do not reject harmless novelty merely because it moves an average.

### Gate D: Universe delta

- State which absent or singleton categories became established.
- State which element/world shortage changed.
- State what new ability identity became possible.
- Identify any new concentration or catalog reachability problem introduced by the draft.

### Gate E: Consumer

- Run every implemented game or derived-stat consumer that reads the affected fields.
- Attribute a balance problem to the correct layer before proposing a correction.
- Keep the creature locked until the design works as a creature; tune game interpretation separately when that is the actual fault.

### Gate F: Ratification

Present the target brief, record, coverage delta, simulation summary, and unresolved judgments together. Only explicit approval adds the key to `RATIFIED.json` and changes its sidecar review fields to `ratified`.

## Working cadence

Expansion proceeds one target brief at a time until the method has survived several real designs. After each ratified creature:

1. Regenerate the coverage ledger.
2. Re-rank the remaining structural prompts.
3. Record any friction that reveals a missing vocabulary option or bad constraint.
4. Change a registry or generator lever only with a concrete case and an impact analysis across all existing species.

This makes every new creature both an addition to the universe and a controlled test of the system used to create it.
