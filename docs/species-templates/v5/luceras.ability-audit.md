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

## Derived acts, 2026-09-22

**Channels:** none. Vocal communication satisfies the voice predicate, but neither the lore nor this audit shows the voice used against another creature, so it is not declared.

**Conduits:** none. This audit excludes air projection outright: its air element and floating-island habitat do not supply an emitter. No guaranteed or authored ability carries the air element.

**Mechanisms removed as redundant:** `horn-ram` (derived `horns/strike` impact), `tail-spike` (derived `tail/strike`), `body-check` (derived `body/strike` impact). The authored bands are preserved in `acts.output` so the ram stays the strongest of the three at 32 to 58, the spiked plume at 20 to 42 and the bounding body check at 22 to 45.

**Mechanisms kept:** none. Every authored act is now derived from the same instrument, pattern and harm mechanism.

**Exclusions:** none. The derived space is horn, tail and body contact work plus the visual threat displays the horns and body can make, all of which the source supports.

**Check tool:**

```
  acts: 14 distinct on offer (horns 5, tail 5, body 4); exclusions: none
  naming over 24 seeds: 0.0% of ordinary actions carry a structural parenthetical, 0.0% of creatures have two ordinary actions sharing a base name
```
