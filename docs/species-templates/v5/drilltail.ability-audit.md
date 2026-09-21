# Drilltail: v5 ability audit

Review date: 2026-09-21. Status: staged, not released. Sources: `../drilltail.json`, `../drilltail.md`, `../art/drilltail.png`, the canonical species description, and Endessa's planetary record. `lore.description` remains verbatim.

## Identity and bounded mechanism review

The tail **drill** is fixed as the signature instrument, following the user's prior correction. A targeted Tail Drill is guaranteed; fast burrowing is independently present in physiology. Neither depends on a random ordinary selection. The old template's scorpion-like analogy does not establish a venom stinger.

| Candidate family | Decision |
|---|---|
| Tail auger piercing | Included as contact boring/piercing, with stationary or closing delivery. Terrain traversal remains the existing burrow capability, not a generic terrain editing effect. |
| Scissor-like pincers | Included as cutting and compression mechanisms. These share the same anatomy but are materially distinct outcomes, not separate names for one effect. |
| Jaws | Included as a modest close bite supported by the canine head and original anatomy. |
| Venom, sand projection, healing | Excluded. No secretion, emitter or regenerative process is in the description or art. |

`tremorsense` is retained from the source-backed tunneling/ambush reading. The old swim band crosses zero and is left weak and optional; no guaranteed move needs it. The five temperament bands reflect a fast solitary ambush hunter, not old archetype modifiers. Mechanism ranges and timing provide constructive variation without a finished-move whitelist. Output ratings were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md).

`npm run check:creature-model -- docs/species-templates/v5/drilltail.json` and seeded canonical cohort testing cover schema/constructibility and deterministic identity. The sidecar records biological permissions separately from those mechanical checks.
