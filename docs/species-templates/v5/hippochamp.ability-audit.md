# Hippochamp: v5 ability audit

Review date: 2026-09-21. Status: frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../hippochamp.json`, `../hippochamp.md`, `../art/hippochamp.png`, canonical teaser and Poseidas record. The teaser remains verbatim.

The fixed **Emergency Water Cannon** uses its snout as a directed stream. Pressure impact and `cooling` removal are two effects of the same delivered water, preserving both defense and firefighting. Cooling may remove matching active statuses such as burning in a game; it is not a universal condition clear. Continuous water flow during this discrete action does not declare an always-on passive process. The ordinary water-cannon domain retains those two effects while varying supported range, timing and output. Hoof and tail contact supply physical alternatives.

Candidate exclusions: no automatic restoration from guarding Algael, no electrical attack from electrical fires, no projectile separation from the snout, and no selective area affect. Any environmental fire on a structure remains a game interpretation of the water stream; the creature data does not claim a general terrain or object simulator. Its crew behavior informs temperament. Output bands were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md). No complete ordinary move list is authored.

Compilation and seeded cohort generation verify four distinct actions and fixed dual-purpose identity; this audit records biological permission separately.

## Derived acts, 2026-09-22

Channels declared: none. Hippochamp has vocal and display communication, but nothing in the source uses voice or stare against another creature; the water cannon is anatomy, not a channel. Conduit `trunk: water`, carried from the v4 pair and confirmed by the guaranteed Emergency Water Cannon: the trunk-like snout is the single outlet, and the audit above already refused a projectile separated from the snout.

Mechanisms removed as redundant: `hoof-strike` (hooves strike, impact) and `coiled-tail` (tail strike, impact). Kept: `water-cannon`, because the water medium has no beam and the authored act pairs a sustained stream with a `cooling` removal, which the tables cannot say.

Exclusions:

- `trunk/mend` - the water medium offers a mend; the audit above excludes automatic restoration from guarding Algael, and the cannon's healing-adjacent function is removal of matching conditions, which the kept mechanism already carries.

```
hippochamp: valid permissions, four distinct actions constructible
  acts: 28 distinct on offer (trunk 11, hooves 3, tail 5, crest 2, spines 4, hide 3); exclusions: trunk/mend
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```

## Signature guardrail, 2026-09-23

An ordinary act never outclasses the signature at what the signature does (contract: `docs/design/creature-derived-acts.md`, "Signature guardrail, 2026-09-23"). Authored mechanism `water-cannon` impact harm lowered from [35, 62] to [35, 55], the cap set by the signature `hippochamp-defining` (impact harm 55). Because the signature carries the water element, it also caps elemental water harm: the compiler clamps the derived water spray and water lash through the trunk from [43, 60] to [43, 55].
