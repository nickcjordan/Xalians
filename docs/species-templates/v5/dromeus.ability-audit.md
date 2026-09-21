# Dromeus: v5 ability audit

Review date: 2026-09-21. Status: staged, not released. Sources: `../dromeus.json`, `../dromeus.md`, `../art/dromeus.png`, the canonical species description, and Magmuth's planetary record. `lore.description` remains verbatim.

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
