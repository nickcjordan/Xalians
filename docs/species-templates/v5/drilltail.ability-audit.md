# Drilltail: v5 ability audit

Review date: 2026-09-21. Status: frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../drilltail.json`, `../drilltail.md`, `../art/drilltail.png`, the canonical species description, and Endessa's planetary record. `lore.description` remains verbatim.

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

## Derived acts, 2026-09-22

Channels declared: none. Drilltail communicates by vibration, has dim sight and no evidenced channel use. Conduits: none. The audit above excludes sand projection; there is no emitter in the description or art, so the sand element gets no outlet.

Mechanisms removed as redundant: `pincer-shear` (pincers strike, cutting), `pincer-crush` (pincers crush, compression) and `jaw-bite` (jaws strike, piercing). Kept: `tail-auger`, because the tail row's only harm mechanism is impact and the source tail is a boring drill, so contact piercing from the tail is not derivable.

Exclusions:

- `*/drain` removed on 2026-09-22. Physical `drain` is now medium-only and Drilltail declares no conduit, so the jaws row no longer derives one. The reading stands: the audit above excludes venom and regenerative process, and nothing has Drilltail taking vitality through its bite.

No exclusions remain, so the `acts` key was removed from the record.

```
drilltail: valid permissions, four distinct actions constructible
  acts: 23 distinct on offer (pincers 5, tail 6, jaws 4, shell 4, claws 4); exclusions: none
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```
