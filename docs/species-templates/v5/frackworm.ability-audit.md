# Frackworm: v5 ability audit

Review date: 2026-09-21. Frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../frackworm.json`, its walkthrough/art, canonical teaser and Endessa record. Teaser preserved verbatim.

The ringed head drill is the fixed signature; pressure slurry from body vents is a second guaranteed action. Ordinary domains vary head piercing, abrasive pressure impact and colossal body compression. Its burrowing remains physiology. Source descriptions of fracturing a seam and extracting Nightcap establish industrial use; they do not make a portable terrain-destruction engine or a vitality-drain bar. A game may interpret impacts on its own terrain, but the creature record does not claim freestanding obstacles or arbitrary substrate mutation. Old ghost/dark powers are excluded. Limited vision and temperament remain source-grounded; output was reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md). Compilation/seeded generation cover four distinct actions and both guaranteed mechanisms.

## Derived acts, 2026-09-22

Channels declared: none. Frackworm communicates by vibration and is nearly blind, so the gaze predicate fails across part of its band and no channel is used. Conduit `vents: sand`, carried from the v4 pair and confirmed by the guaranteed slurry action: the body vents are where the pressurized sand leaves, and the appearance list names them.

Mechanisms removed as redundant: `ringed-drill` (jaws strike, piercing) and `armored-body-crush` (body crush, compression). Kept: `pressure-slurry`, because the vents row offers only a ward and the sand medium has no beam, so a sustained stream of abrasive impact is not derivable. The authored drill band, well above the derived default and the source of the fixed signature, is preserved as `acts.output`.

Exclusions:

- `*/drain` - the jaws row and the sand medium both offer a drain, and the audit above states the source does not make a vitality-drain bar.

```
frackworm: valid permissions, four distinct actions constructible
  acts: 19 distinct on offer (jaws 4, vents 7, shell 4, body 4); exclusions: */drain
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```

## Signature guardrail, 2026-09-23

An ordinary act never outclasses the signature at what the signature does (contract: `docs/design/creature-derived-acts.md`, "Signature guardrail, 2026-09-23"). `acts.output` `jaws/strike` lowered from [65, 95] to [65, 88], the cap set by the signature `frackworm-defining` (piercing harm 88). The override also bands the compression jaw strike, which moves with it.
