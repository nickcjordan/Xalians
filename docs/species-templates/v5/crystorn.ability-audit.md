# Crystorn: v5 ability audit

Review date: 2026-09-21. Status: frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../crystorn.json`, `../crystorn.md`, `../art/crystorn.png`, the canonical species description, and Luminax's planetary record. `lore.description` remains verbatim.

## Identity and bounded mechanism review

The paired head gems are the fixed signature instrument. **Gem Radiance** transmits focused light onto one target. The `light` element is explicit on this action and its optical ordinary domain; it is not inferred from every fist strike. The calm, slow behavior is reflected in temperament, not a retired archetype modifier.

| Candidate family | Decision |
|---|---|
| Focused light | Included as a medium-range stream with bounded range, preparation and output variation. The head gems supply the actual channel. |
| Fists and massive body | Included as distinct close physical impact domains. A heavy biped can strike or collide without making its body into an elemental emitter. |
| Dazzle/blind, reflected beam | Blinding included by Nick's ruling of 2026-09-23 (light is capable of blinding); reflection stays retired per the roster audit. |
| Psychic control, healing, electrical or fire conversion | Excluded. Neither source nor anatomy provides these channels. |

The existing ability and sense bands are retained with no retired trait/archetype boost. The old weak swim range crosses zero; no guaranteed act depends on swimming. Five temperament bands reflect the stated calm, solitary behavior. Numeric output was reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md). The domains are bounded by mechanism, not a list of finished moves.

`npm run check:creature-model -- docs/species-templates/v5/crystorn.json` and seeded canonical cohort testing verify constructibility and identity, while this audit records the source permission decisions.

## Derived acts, 2026-09-22

Channels declared: none. Crystorn has vocal and display communication, but neither the description nor the art shows it using voice or stare against another creature. Conduit `horns: light`, carried from the v4 pair and confirmed by the guaranteed Gem Radiance: the head gems are the channel, and the audit above is explicit that light is not inferred from the fists.

Mechanisms removed as redundant: `heavy-fists` (fists strike, impact), `heavy-body` (hide strike, impact) and `focused-gem-light`, whose stream of light harm is exactly the derived `horns/beam` through the light medium at a band within one point of the authored one. Nothing was kept; Crystorn had no mechanism the tables cannot express.

Exclusions:

- `horns/mend` - the audit above excludes healing outright; neither source nor anatomy provides a restorative channel.
- `horns/spray` was excluded here until 2026-09-23; Nick ruled that light is capable of blinding, so the light spray and its `blinded` rider are back.

```
crystorn: valid permissions, four distinct actions constructible
  acts: 17 distinct on offer (horns 11, fists 3, hide 3); exclusions: horns/mend
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```
