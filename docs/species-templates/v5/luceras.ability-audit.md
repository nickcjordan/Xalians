# Luceras: v5 ability audit

Review date: 2026-09-21. Status: frozen in `generation-0.6.0-1`; game consumers still use v4. Sources: `../luceras.json`, `../luceras.md`, `../art/luceras.png`, the canonical species description, and Saiphus's planetary record. `lore.description` remains verbatim.

## Identity and bounded mechanism review

**Horns-First Descent** is fixed. Its closing contact, brief preparation and horn impact preserve the described sequence of a very high jump followed by a ram. The high leap band provides the underlying locomotion; `flight: [0, 0]` remains absent because seeming to fly is explicitly a comparison, not actual flight.

| Candidate family | Decision |
|---|---|
| Horn ram and bounding body impact | Included as separate close physical domains. The closing approach is required for both. |
| Spiked tail plume | Included as modest contact piercing, using the visible spiked end rather than granting a ranged projectile. |
| Air/wind attack, flight, electrical or ice projection | Excluded. Its air element and floating-island habitat do not supply an emitter or sustained flight. |
| Healing, mind influence, broad protection | Excluded; no source process supports them. |

The existing leap/sprint and ordinary sense bands remain source-reviewed, without retired archetype/trait boosts. Weak swim and burrow ranges cross zero and are optional locomotion; neither is required by the signature. Temperament reflects active bounding and group grazing. Output ranges were reviewed in the [cross-roster calibration](../../design/creature-v5-calibration.md). Ordinary actions come from mechanism domains rather than a finite move whitelist.

`npm run check:creature-model -- docs/species-templates/v5/luceras.json` and seeded canonical cohort testing verify schema/constructibility and guaranteed identity; the biological permission rationale remains here.
