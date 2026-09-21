# Akinza: v5 ability audit

Review date: 2026-09-21. Status: staged, not released. Sources: `../akinza.json`, `../akinza.md`, `../art/akinza.png`, the canonical species description, and Krystos's planetary record. `lore.description` remains verbatim.

## Identity and bounded mechanism review

The defining source fact is stealth at night. `senses.special: ["lowlight"]` makes night adaptation explicit, while the guaranteed **Night Stalk** action applies `concealed` to self. Concealment reduces detectability; it does not promise invisibility in every setting. This is an intentional action, rather than a passive attack slot. The hide is its bodily instrument. Its old `stealthy` trait and archetype weights are retired.

| Candidate family | Decision |
|---|---|
| Claw cutting and jaw piercing | Included as separate contact mechanisms supported by hooked digits and a feline muzzle. Stationary or closing contact and modest output ranges allow variation without prewritten complete moves. |
| Tail contact | Included only as modest impact from the large plumed tail; it is not a blade or independent ice emitter. |
| Ice projection, freeze, cold aura | Excluded. Its ice element and arctic planet establish neither an emission organ nor an attack in the species description or artwork. |
| Healing, mental disruption, ranged spray or beam | Excluded; no source mechanism supports these. |

The 0–100 attribute and capability bands are the old source-reviewed values carried forward where no retired trait/archetype boost is required. The lowlight sense and five temperament bands were authored from the nocturnal, solitary hunting description. The old swim and burrow ranges cross zero; they are not required for the signature and remain weak optional locomotion, not a claim that all individuals swim or burrow. The generated four-action constraint is met by the three physical domains plus fixed stealth. Output bands were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md).

`npm run check:creature-model -- docs/species-templates/v5/akinza.json` and seeded canonical cohort testing cover schema/constructibility and deterministic identity. This audit records source judgment, which the compiler alone cannot prove.
