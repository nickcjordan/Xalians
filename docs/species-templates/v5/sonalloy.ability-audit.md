# Sonalloy: v5 ability audit

Review date: 2026-09-21. Status: frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../sonalloy.json`, `../sonalloy.md`, `../art/sonalloy.png`, canonical teaser and Veridium record. The teaser remains verbatim.

The fixed **Living-Alloy Seam** restores another creature through vented alloy shaped by tendrils. The separate guaranteed ongoing self passive replaces damage within its own living-metal body. This honors the earlier ruling that its fitted repairs can help other body materials; no target-material whitelist was added. Ordinary domains allow direct seam repair, structural reinforcement applied to another creature, and pincer compression. A brace and a repair are separate physical outcomes, not duplicate effects on one action.

Candidate exclusions: generic resource/mana drain from forge heat, automatic metal immunity, electrical emission, remote laser, and unsourced healing without worked alloy. `senses.special` remains based on the existing source review, not the word sonic in its name alone. Weak zero-crossing swim/burrow bands are optional and unrelated to the guaranteed work. Temperament reflects solitary repair work with occasional cooperation. Output was reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md). No complete move whitelist is authored.

Compilation and seeded cohort generation verify four distinct actions and external plus self repair identity; this audit records biological permission separately.

## Derived acts, 2026-09-22

**Channels:** `secretion`, declared with justification: the lore describes a broad downward-facing extrusion vent that draws warm alloy out of a mobile internal reserve, which the tendrils then work into a fracture. That is a literal secretion used as the working medium, and it is the v4 record's own `secretion` instrument.

**Conduits:** `secretion: metal`, matching the v4 `secretion: metal` pair. Metal is the species element and it demonstrably leaves the body through that route in the guaranteed Living-Alloy Seam. The `vents` anatomy is left without a conduit: the vent is where the alloy emerges, but no source shows metal projected from it as a weapon.

**Mechanisms removed as redundant:** none. Re-checked on 2026-09-22 when the metal medium row gained `hurl`: the new `secretion/hurl` is a projectile elemental harm, and all three authored mechanisms deliver by contact, so none of them is the derived throw. Nothing to remove.

**Mechanisms kept:** `alloy-seam` (a restore on another creature through the tendrils, where the derived mend sits on `secretion`, a different instrument), `alloy-reinforcement` (a `reinforced` status applied to another creature, where the derived metal ward applies `reinforced` only to the performer), and `pincer-compression`, whose band is also preserved as `acts.output` `pincers/strike` at 30 to 52.

**Exclusions:** `secretion/beam`, because this audit rules out a remote laser and the metal medium row would otherwise grant a sustained long-range stream no source supports. `tendrils/drain` was removed on 2026-09-22, when physical `drain` became medium-only: the tendrils carry no conduit and the metal medium row has no drain, so nothing derived one. The ruling it recorded stands, that this audit rules out a generic resource drain from forge heat.

**Check tool:**

```
  acts: 25 distinct on offer (pincers 5, tendrils 7, vents 1, body 5, secretion 7); exclusions: secretion/beam
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```
