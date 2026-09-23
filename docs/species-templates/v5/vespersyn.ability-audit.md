# Vespersyn: v5 ability audit

Review date: 2026-09-21. Frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../vespersyn.json`, its walkthrough, `../art/tetrahive.png`, renamed Vespersyn SVG, canonical teaser and home-world record. Teaser preserved verbatim. The later ratified `swarm` body plan supersedes the old avian walkthrough entry.

The fixed Toothed Swarm uses one central mind to direct **nonliving projections** against a selected target. A second guaranteed action interposes those projections to protect the central body. An ongoing passive conceals the central body among the shapes. These are separate attack, defense and detectability functions. The ordinary domains vary swarm bites, interposition and physical central-claw contact without listing complete moves. Nothing here creates autonomous allied creatures, literal summoning of life, possession or mind control of an opponent. The central body remains part of the species. Temperament/output were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md). Compilation/seeded generation cover four distinct actions, fixed attack/defense and concealment.

## Derived acts, 2026-09-22

**Channels:** `swarm`, required by all three guaranteed abilities and satisfied by the ratified `swarm` body plan.

**Conduits:** none. This audit states that nothing here creates autonomous allied creatures or mind control, no guaranteed or authored ability carries the dark element, and the v4 record declared no conduit. Declaring `swarm: dark` would invent the outlet, so it is left off.

**Mechanisms removed as redundant:** `central-claws` (derived `claws/strike` cutting), with the band preserved in `acts.output` at 28 to 48.

**Mechanisms kept:** `swarm-bite`, because it reaches by `field` at short to medium range while the derived `swarm/strike` is contact-delivered, and the projections are the reach. `swarm-interpose`, because no derived pattern produces a `protect` effect at all.

**Exclusions:** none. Feeding through the swarm is in the lore, so the derived swarm drain is not contradicted.

**Check tool:**

```
  acts: 23 distinct on offer (wings 4, claws 4, tail 5, body 4, swarm 6); exclusions: none
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```

## Signature guardrail, 2026-09-23

An ordinary act never outclasses the signature at what the signature does (contract: `docs/design/creature-derived-acts.md`, "Signature guardrail, 2026-09-23"). `acts.output` `swarm/strike` and authored mechanism `swarm-bite` piercing harm both lowered from [42, 68] to [42, 62], the cap set by the signature `vespersyn-defining` (piercing harm 62).
