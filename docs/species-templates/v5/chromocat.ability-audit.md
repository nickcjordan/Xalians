# Chromocat: v5 ability audit

Review date: 2026-09-21. Status: frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../chromocat.json`, `../chromocat.md`, `../art/chromocat.png`, canonical teaser, Luminax record. The teaser remains verbatim.

The guaranteed Photonic Sickle Rush joins the creature's exceptional closing movement to its ionized front-paw blades. Light is declared on those blades only. The ordinary domains include stationary or closing ion-blade cuts, natural claw cuts, fang piercing and a closing pounce. This covers the anatomy-supported contact families without listing finished moves. The old photonic wording explains extraordinary speed and apparent teleportation; no phase traversal, wall transit or literal teleport effect is granted.

Candidate exclusions: no beam or electrical attack merely because the blades glow; no healing, protective aura or mind influence. Wing/flight domains are absent. The old pool's unrelated elemental combinations are retired. The positive sprint/agility source bands and aggressive, solitary temperament carry the movement identity outside move slots. Weak swim and burrow bands, if present, are not required by any guaranteed ability. Output ratings were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md).

The compiler and seeded cohort test verify four distinct actions, signature retention and deterministic generation; this audit records the source permissions they cannot infer.

## Derived acts, 2026-09-22

Channels declared: none. Chromocat has vocal communication, but nothing in the description or art uses its voice against another creature, so voice is not declared as a weapon channel. Conduit `blades: light`, carried from the v4 pair and confirmed by the guaranteed Photonic Sickle Rush: the ionized blades are where light leaves the body, and only there.

Mechanisms removed as redundant: `feline-claw` (claws strike, cutting), `fang-bite` (fangs strike, piercing) and `body-pounce` (hide strike, impact). Kept: `ion-sickle`, because the light medium row has no strike, so a contact cut carrying the light element is not derivable. The authored fang and claw bands, which sat well above the derived default, are preserved as `acts.output` so the species' signature speed and bite keep their calibration.

Exclusions:

- `*/drain` removed on 2026-09-22. Physical `drain` is now medium-only; the jaws and fangs rows no longer derive one, and the light conduit on `blades` carries no drain in its medium row. The reading stands: nothing in the source has Chromocat taking vitality from a bite. It is a harvester and a harasser.
- `blades/mend` - the audit above excludes healing outright.

The light medium's spray carries `blinded`, and the audit above declined a dazzle effect for Crystorn on the grounds that the source does not say visual impairment persists. Chromocat's case is different: the blades are cutting instruments and the light spray reads as scattered ionized light, so it is kept here.

```
chromocat: valid permissions, four distinct actions constructible
  acts: 25 distinct on offer (blades 8, claws 4, jaws 4, fangs 1, tail 5, hide 3); exclusions: blades/mend
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```

## Signature guardrail, 2026-09-23

An ordinary act never outclasses the signature at what the signature does (contract: `docs/design/creature-derived-acts.md`, "Signature guardrail, 2026-09-23"). Authored mechanism `ion-sickle` cutting harm lowered from [52, 78] to [52, 75], the cap set by the signature `chromocat-defining` (cutting harm 75).
