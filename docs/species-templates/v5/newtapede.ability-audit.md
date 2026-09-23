# Newtapede: v5 ability audit

Review date: 2026-09-21. Status: frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../newtapede.json`, `../newtapede.md`, `../art/newtapede.png`, canonical teaser and Poseidas record. The teaser remains verbatim.

The guaranteed Whole-Body Wrap is an ongoing contacted hold that applies source-bound `restrained`. If the hold stops, the sustained condition ends; it is not a free lingering stun. Strong swimming and both gas/liquid respiration remain physiological, so a game can place the hold underwater. The ordinary domains are maintained wrapping, coil compression and body impact. Different timing, approach and output within those domains can vary; no finished-move list is needed.

Candidate exclusions: no automatic suffocation against every recipient, no water cannon without an emitter, no venom or amphibian regeneration. The appearance-only antennae are not an electrical channel. Temperament reflects active hunting with work among other rig creatures. Numeric outputs were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md).

Compilation and seeded cohort generation verify four distinct actions and the fixed hold; this audit records biological permissions separately.

## Derived acts, 2026-09-22

**Channels:** none. Communication is vibration and display, and this audit states the antennae are not an electrical channel.

**Conduits:** none. The v4 record declared none, no authored ability carries water, and this audit excludes a water cannon without an emitter.

**Mechanisms removed as redundant:** `coil-pressure` (derived `coils/crush`, compression at contact) and `body-strike` (derived `body/strike` impact). Both authored bands are preserved in `acts.output` at 35 to 58 and 28 to 50.

**Mechanisms kept:** `body-wrap`. Its `restrained` is sustained and bound to the source, which is the maintained hold the lore describes; the derived `coils/snare` is a lingering brief status that ends on its own.

**Exclusions:** none. Every derived act is coil, hide, body or antenna contact work that the anatomy supports.

**Check tool:**

```
  acts: 14 distinct on offer (antennae 2, coils 4, hide 3, body 5); exclusions: none
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```
