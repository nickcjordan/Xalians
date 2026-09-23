# Bioflim: v5 ability audit

Review date: 2026-09-21. Status: frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../bioflim.json`, `../bioflim.md`, `../art/bioflim.png`, `packages/content/json/species.json` (Bioflim), `packages/content/json/planetRecords.json` (Drainov), and the v5 catalog at this revision. The existing description is preserved verbatim.

## Mechanism inventory and essential identity

- **Explicit:** its acid-slime body lives in Drainov's acid swamps; a thick rocky exoskeleton protects it; its slime continually regrows shell; pseudopods reach outward; it flows slowly and settles over food.
- **Art:** a broad amorphous lower body, upper rocky casing, one eye and reaching pseudopods. No nozzle, wings, jaws, manipulators or ranged projectile organ is visible.
- **Guaranteed:** `Everforming Carapace` is an ongoing self restoration passive. `Acid Slime` is a fixed action because every Bioflim has an acid body; leaving acid exclusively in the ordinary roll would make some generated individuals lose their species identity. The rocky casing separately grants intrinsic impact resistance. This is a scoped judgment from “thick rocky exoskeleton” and “great defense,” not blanket chemical immunity or a second copy of repair. No action slot is spent on the passive signature.

## Candidate ledger

| Mechanism/family | Reviewed deliveries and outcomes | Decision and reason |
|---|---|---|
| Acid surface/slime | Contact, body discharge, spray, projectile; chemical harm, corrosion, poison, cleansing, healing | **Include** contact elemental chemical harm with a separately applied `corroding` condition. The source calls the slime acid and describes feeding by settling over prey. **Exclude** spray/projectile: no propulsive organ. Poisoned means toxic dysfunction, which acid dissolution does not establish. No cleansing or ally healing follows from a corrosive substance. Harm and corrosion stay independent after contact; a game can prevent either separately. |
| Pseudopods | Contact, thrown extension, ranged signal; compression, holding, displacement, support | **Include** source-maintained `restrained` and a separate blunt compression family. The appendages reach and can settle/press over prey. **Exclude** long reach, thrown limb, mind signal and ally restoration; none is established. No compulsory harm rides on the hold. |
| Shell | Self/resting protection, shell strike, projectile fragment, reflective defense | **Include** innate impact resistance only. Regrowth is handled by the signature. **Exclude** thrown fragments, reflective counterattacks and generic damage immunity. The shell is a surface casing, not an evidenced weapon or emitter. |
| Sensory/information | Sight, chemical gradients, `revealed`/`marked` conditions | Existing senses cover ordinary detection. No evidence for a target-marking action or special reveal pulse. |
| Automatic/triggered | Ongoing shell regrowth; retaliation on contact/harm | **Include** the guaranteed ongoing passive. **Exclude** the legacy `volatile` trait's automatic retaliation: no source defines its trigger, payload or recipient. |

The three included ordinary mechanisms are bounded source families. Preparation/recovery and corroding likelihood vary within each mechanism; effect presence and type never roll away. The guaranteed acid action occupies one of the four slots; the remaining three are filled from these domains. No complete-move pool is authored. Contact range comes from visible body contact; adding projectile/stream keys merely to widen output would be unsupported.

## Numeric and physiology review

Retain the measured size, temperature, respiration, special tremorsense and direct attribute/capability bands from the ratified Bioflim record for this stage. Its rocky casing supports structural toughness and impact resistance; the lower agility/reflex/sprint bands agree with its slow body. No capability band crosses zero. The v5 temperament bands are independently authored from solitary, slow swamp behavior: low energy and sociability, restrained aggression and curiosity, rather than an archetype/trait roll. The output bands for acid, compression and shell restoration are positive source-relative authoring judgments; the one absolute status-intensity baseline remains the catalog's 50.

The complete roster numeric pass is recorded in the [cross-roster calibration](../../design/creature-v5-calibration.md). Do not silently normalize these ratings to current species maxima. The passive's sustained direct restoration stops with its source operation; the result does not create a generic body-material resource or a need to evaluate each generated individual.

## Verification and remaining work

`npm run check:creature-model -- docs/species-templates/v5/bioflim.json` passes, including source/anatomy checks and a constructive proof of four structurally distinct actions. This does not assert game outcomes, exact probabilities, canon release activation or that the old pool is a source for unreviewed elemental capabilities.

No registry extension, unresolved species power or conditional-physiology subsystem is required for Bioflim. Revisit this audit if its lore/art, the shared status definitions, or the mechanism compiler changes. Finish release replay before activating v5 records.

## Derived acts, 2026-09-22

Channels declared: `secretion`. Justification: the guaranteed Acid Slime action and the Everforming Carapace passive both use it, and the body itself is acid slime. Conduit `secretion: chemical`: the authored and guaranteed acid abilities already carry the chemical element through the slime, which is the species element and the evidenced outlet.

Mechanisms removed as redundant: `pseudopod-hold` (pseudopods snare, restrained) and `pseudopod-pressure` (pseudopods compression). Kept: `acid-slime`, because the chemical medium row has no strike, so contact elemental harm with a separate corroding condition is not derivable.

Exclusions:

- `secretion/mend` - the audit above states no cleansing or ally healing follows from a corrosive substance. Shell regrowth is the passive, not a mend act.

```
bioflim: valid permissions, four distinct actions constructible
  acts: 21 distinct on offer (shell 4, pseudopods 5, body 4, secretion 8); exclusions: secretion/mend
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```
