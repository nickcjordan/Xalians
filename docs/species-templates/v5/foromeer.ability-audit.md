# Foromeer: v5 ability audit

Review date: 2026-09-21. Status: frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../foromeer.json`, `../foromeer.md`, `../art/foromeer.png`, canonical teaser, Veridium record. The teaser remains verbatim.

The fixed Forelimb Bore keeps the long drill-shaped forelimb spurs as its defining tool. Burrowing remains in physiology. The ordinary source-backed domains are piercing and crushing with those spurs, blunt force from a plated limb, and a closing body shove. Metal is not assigned to every attack merely because the limbs are plated. The plated limbs alone do not establish global body immunity, so no whole-creature protection was inferred.

Candidate exclusions: no free metal projectile, electrical discharge, general regeneration, ranged drilling beam or healing. The `tremorsense` from subterranean work remains. Low optional swimming is not part of the identity. Temperament reflects solitary excavation and moderate activity, without retired archetype modifiers. Numeric outputs were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md); permissions remain factored mechanisms rather than a complete-move whitelist.

The compiler and seeded cohort test verify four distinct actions, signature retention and deterministic generation; this audit records the source permissions they cannot infer.

## Derived acts, 2026-09-22

Channels declared: none. Foromeer communicates by vibration, has dim sight and uses no channel. Conduits: none. The audit above is explicit that metal is not assigned to every attack merely because the limbs are plated, and there is no emitter in the description or art.

Mechanisms removed as redundant: `spur-bore` (spurs strike, piercing), `plated-limb-strike` (shell strike, impact) and `body-shove`, whose single effect is blunt impact harm from the body and is therefore the derived `body/strike` rather than a displacement. Kept: `spur-pressure`, because the spurs row's harm mechanisms are piercing and cutting only, so crushing pressure from the drill spurs is not derivable. The authored spur band, well above the derived default and the source of the guaranteed Forelimb Bore, is preserved as `acts.output`.

Exclusions: none. Nothing the anatomy grants contradicts the source; no mend or drain appears on these rows, so the audit's exclusions of regeneration and healing need no entry.

```
foromeer: valid permissions, four distinct actions constructible
  acts: 13 distinct on offer (spurs 3, antennae 2, shell 4, body 4); exclusions: none
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```

## Signature guardrail, 2026-09-23

An ordinary act never outclasses the signature at what the signature does (contract: `docs/design/creature-derived-acts.md`, "Signature guardrail, 2026-09-23"). `acts.output` `spurs/strike` lowered from [50, 75] to [50, 70], the cap set by the signature `foromeer-defining` (piercing harm 70). The override also bands the cutting spur strike, which moves with it.
