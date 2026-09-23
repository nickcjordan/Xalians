# Venemist: v5 ability audit

Review date: 2026-09-21. Frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../venemist.json`, its walkthrough/art, canonical teaser and home planet. Teaser preserved verbatim.

Fixed Dissolving Mist has direct chemical harm and a possible continuing `corroding` status from one mouth-tube stream. The status is part of the ability's structure even when its encounter application is probabilistic. `poisoned` would lose the specifically dissolving process, so it is excluded. Ordinary solvent stream, two-fang bite and minor body contact domains are bounded by anatomy. No explosive breach, unrelated toxin synthesis, healing or adjacent-element emission is inferred. Temperament and output were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md). Compilation and seeded generation check four distinct actions and fixed corrosion capability; this audit records source permission.

## Derived acts, 2026-09-22

**Channels:** none. Vocal communication satisfies the voice predicate, but nothing shows the voice used against another creature. The mist is emitted through the `vents` anatomy rather than a secretion channel.

**Conduits:** `vents: chemical`, matching the v4 `vents: chemical` pair and the guaranteed `venemist-defining`, which carries the chemical element through the mouth tube.

**Mechanisms removed as redundant:** `two-fang-bite` (derived `fangs/strike` piercing, band preserved at 20 to 40) and `body-contact` (derived `hide/strike` impact, band preserved at 18 to 35).

**Mechanisms kept:** `solvent-mist`. It pairs elemental harm with the `corroding` status in one stream, where the chemical medium row's only harm-plus-status pattern is a projectile spray, so the sustained mouth-tube stream is not derivable.

**Exclusions:** `vents/drain`, because this audit records that no healing is inferred for the species, and every derived drain returns vitality to the performer. The chemical medium row lists `drain`, so the chemical conduit on `vents` would otherwise smuggle the same effect back in; this exclusion still bites and is kept. `jaws/drain` and `fangs/drain` were removed on 2026-09-22, when physical `drain` became medium-only: those two parts carry no conduit, so nothing derives a drain from them any more.

**Check tool:**

```
  acts: 19 distinct on offer (jaws 4, fangs 1, vents 6, tail 5, hide 3); exclusions: vents/drain
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```

## Signature guardrail, 2026-09-23

An ordinary act never outclasses the signature at what the signature does (contract: `docs/design/creature-derived-acts.md`, "Signature guardrail, 2026-09-23"). Authored mechanism `solvent-mist` elemental chemical harm lowered from [45, 72] to [45, 65], the cap set by the signature `venemist-defining` (elemental chemical harm 65). Its corroding status is not a capped kind and is unchanged.
