# Imprit: v5 ability audit

Review date: 2026-09-21. Frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../imprit.json`, its walkthrough/art, canonical teaser and Magmuth record. Teaser preserved verbatim.

The fixed passive Living Flame responds to contact with possible `burning` on the contacting recipient; the flame is not listed as a player-selectable action. Fire-retardant fur is represented separately as innate **resistance** to fire elemental harm, without applying a self-harming burning status or claiming immunity to every fire. A guaranteed active contact attack uses **already ignited** secretion. Ordinary domains add ignited oil contact, scythe-tail cutting, horn piercing and fist impact. Unignited fuel/oil exposure remains lore-only under the user's explicit deferral; no `flammable` or `combustible` status was invented. No general engineering/repair power follows from equipment-tinkering lore alone. Temperament/output were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md). Compilation/seeded generation cover four distinct actions and the fixed passive.

## Derived acts, 2026-09-22

Channels declared: `secretion`. Justification: the guaranteed ignited-oil action and the Living Flame passive both use it, and the description gives flammable oils secreted over the body under fire-retardant fur. Conduit `secretion: fire`, carried from the v4 pair and confirmed by those two abilities: the burning oil on the skin is where fire leaves this body, not the horns or the tail.

Mechanisms removed as redundant: `horn-strike` (horns strike, piercing) and `hand-strike` (fists strike, impact). Kept: `scythe-tail`, because the tail row's only harm mechanism is impact and the source tail ends in a scythe-like tip, so a contact cut from the tail is not derivable; and `ignited-oil`, because the derived fire strike adds a `burning` status to the contact, while the authored act is the plain already-ignited contact the audit above distinguishes from the passive that applies burning.

Exclusions:

- `*/drain` removed on 2026-09-22. Physical `drain` is now medium-only; the fangs row no longer derives one, and the fire conduit on `secretion` carries no drain in its medium row. The reading stands: nothing in the source has Imprit taking vitality from a bite, and it eats what it finds.
- `secretion/mend` - no restorative process appears anywhere in the source; the oil burns, it does not repair.

```
imprit: valid permissions, four distinct actions constructible
  acts: 28 distinct on offer (horns 6, fangs 1, tail 6, fists 3, hide 3, secretion 9); exclusions: secretion/mend
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```
