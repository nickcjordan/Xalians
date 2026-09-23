# Voltish: v5 ability audit

Review date: 2026-09-21. Frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../voltish.json`, its walkthrough/art, canonical teaser and Zolton record. Teaser preserved verbatim.

Fixed Charged Claws declares electric elemental harm through conductive claws using stored environmental charge. The same claws can cut physically in an ordinary domain; jaw contact remains separate. The source does not require every shock to stun, so no mandatory `stunned` rider was added. Stored charge is not a universal mana meter, and its metal alloy skeleton does not imply blanket electrical immunity. No beam, explosion, fire or air emission is inferred from old pools. Temperament and output were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md). Compilation and seeded generation check four distinct actions and fixed electric identity; this audit records permissions.

## Derived acts, 2026-09-22

**Channels:** none. Vocal communication satisfies the voice predicate, but no source shows the voice used against another creature.

**Conduits:** `claws: electric`, matching the v4 `claws: electric` pair and the guaranteed `voltish-defining`. The lore is explicit that the stored charge leaves through the claws and nowhere else.

**Mechanisms removed as redundant:** `claw-rake` (derived `claws/strike` cutting and `claws/rake`, band preserved at 35 to 58) and `jaw-bite` (derived `jaws/strike` piercing, band preserved at 28 to 50).

**Mechanisms kept:** `claw-discharge`. The electric medium row's `claws/strike` carries a `stunned` rider, and this audit is explicit that the source does not require every shock to stun; the authored act preserves a discharge with no status attached.

**Exclusions:** none. `jaws/drain` was removed on 2026-09-22, when physical `drain` became medium-only: the electric conduit sits on `claws`, not the jaws, and the electric medium row carries no drain in any case. The ruling it recorded stands, that the species is an energy-feeder that feeds on electrical charge from its surroundings and on nothing else. No exclusions remain, so the `acts.exclude` key was removed; `acts.output` stays.

**Check tool:**

```
  acts: 23 distinct on offer (claws 11, jaws 4, tail 5, hide 3); exclusions: none
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```
