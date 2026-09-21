# Yetimoth: v5 ability audit

Review date: 2026-09-21. Status: staged, compiled, not in the canonical v5 release. Sources: `../yetimoth.json`, `../yetimoth.md`, `../art/yetimoth.png`, the canonical species description and Krystos's planetary record. The species teaser is preserved verbatim.

## Identity and scope

The species explicitly has three uses for self-produced ice: armor, opponent encasement and route-blocking walls. The first two have exact current representations. The wall occupies space independently of a recipient; the user chose to keep it in lore without claiming a v5 terrain obstacle mechanic. This staged definition does not use `shielded`, `frozen` or `restrained` as a substitute for a freestanding wall.

The fixed signature applies `shielded` to self with a prolonged, independently lingering lifetime. The effect describes built ice sheets over the pelt, so it need not imply that the performer continually maintains them. No separate innate impact protection is inferred from the heavy body; armor is the applied condition. `Ice Encasement` is a second guaranteed action because every Yetimoth can freeze an opponent, regardless of its ordinary roll. Its fixed form uses short range; the ordinary cold mechanism also permits short/medium variants. The organism's whole body is the listed source for externally forming cold; the source does not specify breath, a horn emitter or a thrown ice projectile.

## Candidate ledger

| Family considered | Decision and source reason |
|---|---|
| Ice armor: status shielded, direct protect, innate immunity | **Include** self `shielded` as the guaranteed act. It lasts as an applied layer. Avoid adding direct `protect` on top of the same sheets or inferring permanent innate immunity from fur/size. |
| Opponent encasement: frozen, restrained, pinned, chilled | **Include `frozen`** because frost/ice and movement restriction are both explicit. `restrained` would discard the material distinction; `chilled` alone would be too weak. Authoring keeps likelihood variation without making the capability disappear. |
| Ice wall: physical obstacle, shielded, frozen | **Lore-only for this version.** Neither a status on a participant nor area geometry creates a freestanding object. No empty-point placement or terrain edit was added. |
| Fists/tusks: impact, piercing, cutting, displacement | **Include** heavy fist impact and ice-tusk piercing as independently sourced physical families. A reliable shove or universal cutting blade is not in the cited anatomy. Their element classification does not automatically turn physical harm into cold damage. |
| Healing, removal, signal, automatic response | No source evidence for bodily repair, status cleansing, a received signal or a reflexive trigger. Guard behavior alone does not create a counterattack passive. |

The size and physiological bands were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md). The temperament bands follow a slow, imposing guard that holds a line with others; they are not generated from retired territorial/pack trait percentages. The target recipient of each frost effect is fixed by the same authored mechanism domains that the compiler checks. There is no selective area filter.

`npm run check:creature-model -- docs/species-templates/v5/yetimoth.json` passes. The future game may decide how `frozen` limits an affected participant; that does not stand in for the deferred wall capability. No species-specific catalog key or move whitelist was introduced.
