# Terragoyle: v5 ability audit

Review date: 2026-09-21. Frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../terragoyle.json`, its walkthrough/art, canonical teaser and Stonera record. Teaser preserved verbatim.

The tail's levitation/launch channel is fixed in two guaranteed forms: a single boulder projectile and target-anchored radial gravel strafing. Flight remains physiology, not a second attack effect. Ordinary domains vary supported rock projectile range, gravel extent and horn contact. The rock element is explicit only on tail-launched material. Dormancy/hibernation remains deferred mechanically; no dormant status, trigger list or self-anchoring immunity was fabricated. The lore's stone-guard posture also does not grant petrification. Temperament/output were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md). Compilation/seeded generation cover four distinct actions and both guaranteed tail modes.

## Derived acts, 2026-09-22

**Channels:** none. The species speaks vocally and by display, but the voice is not used against another creature in any source.

**Conduits:** `tail: rock`, matching the v4 `tail: rock` pair and both guaranteed tail actions, which carry the rock element explicitly. This audit states the rock element is explicit only on tail-launched material, so the horns, wings and hide get no conduit.

**Mechanisms removed as redundant:** `horn-contact` (derived `horns/strike` piercing). The authored band is preserved in `acts.output` at 30 to 55, below the strength-derived 51 to 68, because the horns are a guard posture rather than the animal's weapon.

**Mechanisms kept:** `tail-gravel`. Its projectile carries a radial area anchored on the target, and no derived act does: the rock medium's `hurl` has no area, and the rock `burst` anchors its area on the performer. A dispersed volley landing around what it hits is exactly the act the tables cannot say.

**Mechanisms removed as redundant (2026-09-22 revision):** `tail-boulder`. The rock medium row gained `hurl` on 2026-09-22, so the tail's rock conduit now derives `tail/hurl`: same instrument, same element, projectile delivery, targeting other, no area, one harm effect on the target. The only difference is the harm mechanism word, authored `impact` against derived `elemental`, and the contract's own rule is that a medium variant's harm becomes elemental, so the authored mechanism was the derived act written under a different name. Range and timing do not count toward redundancy. The authored band was deliberate, well above the willpower-derived 47 to 66, so it is carried into `acts.output` as `tail/hurl` at 65 to 90.

**Exclusions:** `tail/strike`, `tail/crush`, `tail/lash`, `tail/snare` and `tail/shove`. The tail ends in a cradle holding a levitating ball of stone: it is a launch channel, not a striking or grasping limb, and a contact blow or a hold from it contradicts the described anatomy. The rock ward, rock burst and, since 2026-09-22, the rock hurl on the tail survive, because levitated stone can be held close, released outward, or thrown. The hurl is the one the friction report asked for: it makes the tail's whole purpose derivable instead of authored.

**Check tool:**

```
  acts: 17 distinct on offer (horns 6, wings 4, tail 4, hide 3); exclusions: tail/strike, tail/crush, tail/lash, tail/snare, tail/shove
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```
