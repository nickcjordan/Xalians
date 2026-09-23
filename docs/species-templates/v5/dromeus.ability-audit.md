# Dromeus: v5 ability audit

Review date: 2026-09-21. Status: frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../dromeus.json`, `../dromeus.md`, `../art/dromeus.png`, the canonical species description, and Magmuth's planetary record. `lore.description` remains verbatim.

## Identity and bounded mechanism review

The guaranteed **Running Fang Launch** requires closing delivery and a brief preparation: the source says it reaches speed, spreads its wings for a short launch, then bites. Positive flight and leap capability bands preserve the brief airborne act, while the high sprint band preserves ground speed. They do not claim sustained flight. The signature remains fixed across individuals; ordinary fang, claw, talon and wing/body contact varies.

| Candidate family | Decision |
|---|---|
| Fang piercing, foreclaw cutting, toe talon piercing | Included from explicit teeth and visible hooked limbs. The parts and mechanisms distinguish the domains, rather than naming arbitrary moves. |
| Wing/body contact | Included only as close impact during a closing motion; wings do not become a ranged blast. |
| Fire breath, heat sense, elemental projection | Excluded. Magmuth and its fire element do not grant an emitter or special perception; the older walkthrough's heat-sense inference from planet hazard exceeds the creature-specific evidence. |
| Healing, chemical spray, metal/rock attacks | Excluded; these were unsourced old pool combinations. |

Old swim `[0, 10]` remains weak and optional, while burrow is absent. The five temperament bands are grounded in energetic pursuit and pack company rather than retired runner/predator weights. Attribute bands retain the source-reviewed relative ratings but receive no old archetype or trait modifiers. Output bands were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md). The four-action construction uses mechanism domains, not a finite finished-move list.

`npm run check:creature-model -- docs/species-templates/v5/dromeus.json` and seeded canonical cohort testing cover schema/constructibility and deterministic identity; the audit addresses source permission separately.

## Derived acts, 2026-09-22

Channels declared: none. Dromeus has vocal and display communication and good sight, but the audit above excludes fire breath, an emitter and special perception, and nothing in the source uses voice or stare against another creature. Conduits: none, for the same reason: Magmuth and the fire element do not by themselves establish an outlet.

Mechanisms removed as redundant: `fang-bite` (fangs strike, piercing), `foreclaw-rake` (claws strike, cutting), `toe-claw-strike` (talons strike, piercing) and `wing-body-check` (wings strike, impact). All four are exactly their derived acts. Nothing was kept; Dromeus had no mechanism the tables cannot express. The authored fang band, well above the derived default and the source of the guaranteed Running Fang Launch, is preserved as `acts.output`.

Exclusions:

- `*/drain` removed on 2026-09-22. Physical `drain` is now medium-only and Dromeus declares no conduit, so neither the jaws nor the fangs row derives one. The reading stands: Dromeus is a runner and a biter, and no source has it taking vitality from the bite.

No exclusions remain, so the `acts.exclude` key was removed; `acts.output` stays.

```
dromeus: valid permissions, four distinct actions constructible
  acts: 25 distinct on offer (jaws 4, fangs 1, claws 4, talons 4, wings 4, tail 5, hide 3); exclusions: none
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```

## Signature guardrail, 2026-09-23

An ordinary act never outclasses the signature at what the signature does (contract: `docs/design/creature-derived-acts.md`, "Signature guardrail, 2026-09-23"). `acts.output` `fangs/strike` lowered from [40, 65] to [40, 62], the cap set by the signature `dromeus-defining` (piercing harm 62).
