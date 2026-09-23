# Figzy: v5 ability audit

Review date: 2026-09-21. Status: frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../figzy.json`, `../figzy.md`, `../art/figzy.png`, canonical teaser and Telypso record. The teaser remains verbatim.

The old teaser says “magical abilities,” while the authored behavior describes a concrete intervention: Figzy steadies someone under threat and bursts mental force from its hands to drive the threat away. Both are guaranteed. A mental protective signal and a hand-sourced psychic pulse are separate delivered mechanisms; an ordinary antler tap supplies modest physical variation. The model uses the existing `protect` and away `displace` effects, without creating a generic spell catalog. Patient steadiness does not imply bodily restoration.

Candidate exclusions: precognition, possession, arbitrary spell repertoire, healing wounds and an invisible force emitter from every body part. Temperament reflects deceptive intelligence, patience and trust-based social behavior. The positive intelligence/willpower bands stay source-backed without retired trait/archetype boosts. Numeric outputs were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md); no complete move whitelist is authored.

Compilation and seeded cohort generation verify four distinct actions and both guaranteed functions; this audit records biological permissions separately.

## Derived acts, 2026-09-22

Channels declared: `mind`. The predicate holds three ways (telepathic communication, a psychic special sense, the psychic element), and the guaranteed Mental Intervention uses it. Conduits `fists: psychic` and `mind: psychic`, both carried from the v4 pairs and confirmed by the guaranteed hand-sourced psychic burst. The audit above warns against an invisible force emitter from every body part, and these two are the only outlets declared: the antlers, hide and body stay plainly physical.

Mechanisms removed as redundant: `antler-contact` (antlers strike, impact). Kept: `mental-intervention`, because the tables produce no `protect` effect at all; and `hand-force`, because the psychic medium's shove is a contact or signal displacement while the authored act is a pulse with an area, which the tables cannot say.

Exclusions:

- `*/mend` - the audit above excludes healing wounds by name; patient steadiness is a protective signal, not bodily restoration.
- `*/drain` - the mind row and the psychic medium both offer a drain; nothing in the source has Figzy taking vitality from anyone, and its behavior is protective.

```
figzy: valid permissions, four distinct actions constructible
  acts: 32 distinct on offer (antlers 4, fists 9, hide 3, body 5, mind 11); exclusions: */drain, */mend
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```
