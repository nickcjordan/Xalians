# Crystorn: v5 ability audit

Review date: 2026-09-21. Status: frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../crystorn.json`, `../crystorn.md`, `../art/crystorn.png`, the canonical species description, and Luminax's planetary record. `lore.description` remains verbatim.

## Identity and bounded mechanism review

The paired head gems are the fixed signature instrument. **Gem Radiance** transmits focused light onto one target. The `light` element is explicit on this action and its optical ordinary domain; it is not inferred from every fist strike. The calm, slow behavior is reflected in temperament, not a retired archetype modifier.

| Candidate family | Decision |
|---|---|
| Focused light | Included as a medium-range stream with bounded range, preparation and output variation. The head gems supply the actual channel. |
| Fists and massive body | Included as distinct close physical impact domains. A heavy biped can strike or collide without making its body into an elemental emitter. |
| Dazzle/blind, reflected beam | Excluded at this stage. Powerful transmitted light supports harm, but the source does not say visual impairment persists; reflection was explicitly retired in the roster audit. |
| Psychic control, healing, electrical or fire conversion | Excluded. Neither source nor anatomy provides these channels. |

The existing ability and sense bands are retained with no retired trait/archetype boost. The old weak swim range crosses zero; no guaranteed act depends on swimming. Five temperament bands reflect the stated calm, solitary behavior. Numeric output was reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md). The domains are bounded by mechanism, not a list of finished moves.

`npm run check:creature-model -- docs/species-templates/v5/crystorn.json` and seeded canonical cohort testing verify constructibility and identity, while this audit records the source permission decisions.
