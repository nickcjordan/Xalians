# Tizzie: v5 ability audit

Review date: 2026-09-21. Frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../tizzie.json`, its walkthrough/art, canonical teaser and Telypso record. Teaser preserved verbatim.

Fixed Tail-Lure Gaze applies `entranced` only through a visually received signal; a second guaranteed visually received psychic strike preserves the attack after eye contact. The tail is the attention lure in the signature description, while the gaze is the delivery instrument. Ordinary gaze, mind strike and modest tail contact domains vary without a completed-move whitelist. No universal mental reception, telekinetic throwing, foresight or physical wound healing was inferred. Temperament/output were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md). Compilation and seeded generation check four distinct actions and both fixed functions; this audit records source permission.

## Derived acts, 2026-09-22

**Channels:** `gaze` and `mind`, both required by guaranteed abilities. The gaze predicate holds on sight 70 to 92, and the mind predicate holds three times over: telepathic communication, the `psychic` special sense and the psychic element.

**Conduits:** `gaze: psychic` (the v4 `gaze: psychic` pair) and `mind: psychic` (the guaranteed `tizzie-mind-strike` and the authored `eye-contact-mind`, both psychic). Psychic is the species element, so neither needs foreign-element evidence.

**Mechanisms removed as redundant:** `tail-lure-gaze` (derived `gaze/snare` applies `entranced` through a visually received signal, the same act identity) and `tail-contact` (derived `tail/strike` impact, band preserved in `acts.output` at 18 to 38).

**Mechanisms kept:** `eye-contact-mind`. Its elemental harm arrives by signal at short to medium range with visual reception, where the psychic medium row's only harm patterns are a radial burst and a drain.

**Exclusions:** `*/mend`, because this audit records that no physical wound healing was inferred, and both the mind row and the psychic medium row would otherwise grant a repair. `gaze/shove` and `mind/shove`, because this audit excludes telekinetic throwing, which is exactly what a displacement delivered by signal would be.

**Check tool:**

```
  acts: 29 distinct on offer (tail 5, lure 1, fists 3, hide 3, gaze 7, mind 10); exclusions: */mend, gaze/shove, mind/shove
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```
