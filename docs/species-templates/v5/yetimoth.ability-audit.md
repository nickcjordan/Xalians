# Yetimoth: v5 ability audit

Review date: 2026-09-21. Status: frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../yetimoth.json`, `../yetimoth.md`, `../art/yetimoth.png`, the canonical species description and Krystos's planetary record. The species teaser is preserved verbatim.

## Identity and scope

The species explicitly has three uses for self-produced ice: armor, opponent encasement and route-blocking walls. The first two have exact current representations. The wall occupies space independently of a recipient; the user chose to keep it in lore without claiming a v5 terrain obstacle mechanic. This frozen definition does not use `shielded`, `frozen` or `restrained` as a substitute for a freestanding wall.

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

## Derived acts, 2026-09-22

**Channels:** none. The species speaks vocally and by display, but no source shows the voice used against another creature, and the ice is formed from the air by the body rather than exhaled.

**Conduits:** `hide: ice`, `body: ice`, `tusks: ice` and `fists: ice`. The v4 record paired `hide` and `fists` with ice; the guaranteed `yetimoth-defining` layers ice over the pelt, the guaranteed `yetimoth-encasement` and the authored `ice-encasement` form ice around an opponent from the body, the authored `ice-tusks` carries ice on the tusks, and the lore names ice-gauntleted fists and enormous tusks of pure ice. Ice is the species element, so none of the four needs foreign-element evidence.

**Mechanisms removed as redundant:** `heavy-fists` (derived `fists/strike` impact, band preserved in `acts.output` at 55 to 85) and `ice-tusks` (derived `tusks/strike` through the ice conduit, band preserved at 45 to 75).

**Mechanisms kept:** `ice-encasement`. It reaches by `field` at short to medium range, where the ice medium row's `frozen` bind comes from a contact snare, so forming ice around an opponent at a distance is not derivable.

**Exclusions:** none. Anatomy grants four ice outlets and this audit subtracts nothing from them: the deferred item is the freestanding ice wall, which is not an act on a recipient and so was never in the derived space.

**Projectile re-check, 2026-09-22.** The ice medium row gained `hurl`, so each of the four conduits now derives a projectile elemental harm. `ice-encasement` was re-checked against it and is kept: it delivers by `field` and its single effect is a `frozen` status on the target, where a derived hurl delivers by `projectile` and its single effect is harm. Different delivery mode and different effect type, so it is not redundant. Yetimoth authored no other projectile.

**Check tool:**

```
  acts: 54 distinct on offer (tusks 14, trunk 4, fists 11, hide 11, body 14); exclusions: none
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```
