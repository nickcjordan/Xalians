# Avilily: v5 ability audit

Review date: 2026-09-21. Status: staged, compiled, not in the canonical v5 release. Sources: `../avilily.json`, `../avilily.md`, `../art/avilily.png`, the canonical species description and Floria's planetary record. The species teaser is preserved verbatim.

## Identity and source mechanisms

The source gives a small floral bird, wings, flower-like beak, talons, bright camouflage and sweet smelling saliva that sedates **and paralyzes on contact**. The one guaranteed signature is the saliva's motor impairment; it applies registered `paralyzed` with a detoxifying removal path. A failed status application in a game does not produce an individual whose saliva lacks this capability.

The ordinary source families are contact saliva, physical beak contact and talon contact. Preparation and recovery vary within the bounded families. Paralysis likelihood varies for ordinary saliva, but the effect itself never disappears. The beak and talons have independent physical outcomes; their names or numeric strength alone do not distinguish slots. The authoring domain can construct four distinct actions without a list of finished moves.

## Candidate ledger

| Family considered | Decision and source reason |
|---|---|
| Contact saliva: `paralyzed`, sedated, poisoned, restrained | **Include `paralyzed` only** for the explicit motor impairment. Although the prose calls the substance sedative, that wording explains the biochemical route; this version does not double-count one immobilizing event as both sedated and paralyzed. Neither physical binding (`restrained`) nor general toxic dysfunction (`poisoned`) is needed to represent the specified outcome. |
| Saliva delivery: contact, spray, stream, projectile, aura | **Contact** follows beak-to-target application. There is no art or prose evidence for propulsion or a remote organ. The sweet smell draws insects but does not prove a long-range condition application. |
| Beak/talons: impact, piercing, holding, defense | **Include** blunt beak contact and talon piercing within the small bird's output scale. The art visibly supplies both sources. A generic sustained hold or defensive barrier is not warranted merely by having talons. |
| Flower display/camouflage: visual signal, concealed, entranced, marked | **Retain** floral appearance and meadow camouflage in lore. Its hunting lure is scent/appearance, not documented mind entrancement; the current action domains do not claim setting-independent concealment or target marking. |
| Healing/removal/displacement/area | No source provides restorative chemistry, cleansing, strong pushing force or an area emission. A plant element does not grant growth or ally healing. |

The existing flight and senses bands come from anatomy and the original source review; no new sensory channel follows from floral camouflage. The v5 temperament bands are authored from active canopy hunting and living in swarms, separately from retired trait/archetype weights. No capability band relied on by the guaranteed saliva is conditional. Output ratings remain provisional until the full-roster calibration pass.

`npm run check:creature-model -- docs/species-templates/v5/avilily.json` passes. The schema check proves source and capacity constraints, not the full biological audit or game encounter effects. No private catalog key, whole-move whitelist or species-specific compatibility engine was introduced.
