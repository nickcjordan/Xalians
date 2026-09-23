# Akinza: v5 ability audit

Review date: 2026-09-21. Status: frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../akinza.json`, `../akinza.md`, `../art/akinza.png`, the canonical species description, and Krystos's planetary record. `lore.description` remains verbatim.

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

## Derived acts, 2026-09-22

Channels declared: none. Akinza breathes gas and sees well, so the breath and gaze predicates hold, but no guaranteed action, passive or authored mechanism uses a channel and neither the description nor the art shows it fighting by breath or stare. The ice element grants no outlet; the audit above already excluded ice projection, so no conduit is declared. A species with no evidenced outlet gets none.

Mechanisms removed as redundant: `foreclaw-cut` (claws strike, cutting), `jaw-bite` (jaws strike, piercing) and `tail-sweep` (tail strike, impact). Each is exactly the derived act for the same instrument, delivery and harm mechanism. Nothing was kept; Akinza had no mechanism the tables cannot express.

Exclusions:

- `*/drain` removed on 2026-09-22. Physical `drain` is now medium-only, and Akinza declares no conduit, so the jaws row no longer offers a drain at all. The reading stands: nothing in the description or art has Akinza taking vitality from what it bites, and the audit above excludes healing outright. There is nothing left to exclude.

No exclusions remain, so the `acts` key was removed from the record.

```
akinza: valid permissions, four distinct actions constructible
  acts: 16 distinct on offer (claws 4, jaws 4, tail 5, hide 3); exclusions: none
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```
