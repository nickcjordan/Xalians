# Scalatto: v5 ability audit

Review date: 2026-09-21. Status: frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../scalatto.json`, `../scalatto.md`, `../art/scalatto.png`, canonical teaser, Endessa record. The teaser remains verbatim.

The scaly exoskeleton is baseline physiology with specific cutting resistance. The deliberate **Shell Curl** is separately fixed as a self action applying `shielded`: it adds protection only while the curled defense is available. This distinguishes its ordinary shell from actively hiding vulnerable surfaces, avoiding two copies of the same protection. The compiler does not equate the status to unconditional elemental immunity.

Ordinary domains are a closing shell collision, close claw cutting and hooked-tail impact. The art and source provide those parts; no sand projectile, toxin or ghost effect is supplied by element or old pool. Temperament reflects a cautious solitary animal. Numeric output and resistance choice were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md). Ordinary timing/approach domains are bounded mechanisms, not a list of complete moves.

The compiler and seeded cohort test verify four distinct actions, signature retention and deterministic generation; this audit records the source permissions they cannot infer.

## Derived acts, 2026-09-22

**Channels:** none. Communication is vibration only, and no channel appears in any guaranteed or authored ability.

**Conduits:** none. This audit is explicit that no sand projectile, toxin or ghost effect is supplied by element or old pool, and the v4 record declared no conduit.

**Mechanisms removed as redundant:** `rolling-collision` (derived `shell/strike` impact), `foreclaw-rake` (derived `claws/strike` cutting and `claws/rake`), `hooked-tail` (derived `tail/strike` impact). The authored bands are preserved in `acts.output` at 38 to 62, 30 to 52 and 25 to 48.

**Mechanisms kept:** none.

**Exclusions:** none. The shell's derived ward overlaps the guaranteed Shell Curl, but that overlap is handled by the existing alias exclusion rather than by taking the act away from the body.

**Check tool:**

```
  acts: 17 distinct on offer (shell 4, claws 4, tail 5, body 4); exclusions: none
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```
