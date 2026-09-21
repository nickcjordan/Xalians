# Instrument/conduit retirement — relationship audit

> Historical design discussion / audit evidence. The [current contract](creature-model-current.md) is authoritative for the redesigned model and its implementation status. Conflicting proposals below are superseded; these notes are not production schemas.

2026-09-21. Scope: whether retiring template-level instruments and conduits preserves their responsibilities under the accepted mechanism-permission design. This is a source and data audit, not an executed test of the unimplemented redesigned compiler. Games were not changed.

## Conclusion

Retirement is logically sound if source support and permission relationships move into the shared authoring compiler. Merely deleting fields and their checks would not be sufficient. Keep registered instrument vocabulary, physiology.anatomy, and instrument/element on resolved capabilities. Keep relationships scoped to source mechanisms or guaranteed capability definitions; a derived union is an index, never a new permission source.

## Current data inventory

Read the RATIFIED.json roster and all 32 corresponding templates, not experimental run files:

- 32 guaranteed capabilities (31 action signatures, one passive signature).
- 457 legacy ordinary pool options inspected for instrument use.
- 15 species have conduits, totaling 17 instrument/element mappings.
- Every declared instrument is used by a guaranteed capability or ordinary option. No independent unused instrument declarations were found.
- Every conduit pair is represented in at least one existing guaranteed capability or ordinary option's media permissions. No conduit-only pair was found.
- Every currently used physical instrument appears in that species' anatomy; no missing body parts were found in this inventory.
- No current capability/option uses an instrument absent from the declared list.
- Nonphysical channels occur across species: secretion in six, voice in one, mind in three, swarm in one, gaze in one. These must remain valid channel declarations, not be forced into anatomy.
- No current instrument appears exclusively in guaranteed capabilities, but the new compiler must support that valid case rather than assume ordinary mechanisms cover every signature/passive.

This establishes that the two old fields do not currently contain unique instrument/element relationships absent from ability declarations. It does not establish that every legacy option is biologically justified; prior automatic adjacency expansion is explicitly being replaced.

## Responsibilities and their new owners

| Current responsibility | Replacement | Safeguard |
|---|---|---|
| Instrument vocabulary | Shared anatomy/channel registry union | Reject unknown keys everywhere |
| Physical instrument existence | Physiology anatomy plus shared compiler | Validate all permitted source variants, not just a favorable roll |
| Nonphysical channel support | Explicit authored mechanism/guaranteed capability and meaningful channel prerequisites | Do not require mind/swarm/etc. to be body parts; do not infer powers from element alone |
| Permitted instrument uses | Mechanism-scoped delivery/effect permissions | Do not regenerate the old instrumentActions cross-product |
| Element expressed through an instrument | Element and source relationships in the mechanism/guaranteed capability | Preserve pairs and their effect/delivery context; no automatic adjacency access |
| Signature and passive support | Same compiler path as ordinary mechanisms | No signature exemption from physical/source coherence |
| Species instrument display and coverage | Derived union from all supported declarations | Non-authoritative view; species potential differs from one individual's selected actions |
| Naming coverage | Actual permitted configurations projected into lexical requirements | A name family must not authorize an effect or elemental channel |
| Conditional source/passive correspondence | Shared species authoring constraints | Removing an old list cannot permit missing-source abilities |

For example, a creature may have a physical claw mechanism and a separate mind/psychic mechanism. The derived index can report claws and mind, but it must never imply psychic claws. If the same instrument has multiple elemental mechanisms, retain each relationship separately; do not merge their domains into a free cross-product. Absent ability element means unclassified as already agreed, not defaulting to creature identity.

## Code paths reviewed

- packages/content/src/schema/speciesTemplate.ts: top-level fields and anatomy representation.
- packages/content/src/schema/registries.ts: InstrumentKeySchema already unions anatomy and channels.
- packages/content/src/schema/ability.ts: validateAbilityPool checks instrument list membership and allowed media, not complete source coherence.
- packages/rules/src/generator/generate.ts: compilePool checks the old instrument allowlist for all guaranteed capabilities, restricts media by elemental adjacency, and uses authored options for runtime generation. Conduits is not read directly by this runtime path.
- scripts/bundleLore.js: build-time pool checks still use the old fields and adjacency policy.
- docs/species-templates/tools/validate-template.js: anatomy/channel/source validation, separate conduit rules, and historical signature exceptions.
- scripts/migrateAbilityModel.js: older conduit and instrumentActions expansion created authored options. Retire this as a source of new-model permissions.
- scripts/checkCatalogCoverage.js: current action-family discovery uses actionPool but still iterates instrument and adjacency lists; comments still describe older conduit expansion.
- scripts/creatureCoverage.js: reports old list/conduit values, requiring derived-view migration.
- packages/rules/src/generator/__tests__/generate.test.ts and catalogCoverage.test.ts: retain old instrumentActions/conduit/affinity assumptions and need semantic replacement.
- apps/web/src/lore and record vocabulary: anatomy/channel label lookup remains useful; species instrument display tests need the derived view.
- Migration authoring skill: still carries old 1-3 instrument limits, conduit declarations, and channel rules. Update together with the concrete compiler/schema, not by removing guardrails in isolation.

## Gaps found that must be corrected, not copied

1. Channel prerequisites live in the separate authoring validator, outside the production pool compiler. Consolidate applicable rules.
2. Gaze checks the upper sight bound, allowing a nominal [0,positive] range to pass. Where the authored channel requires performer sight, all supported variants must satisfy it; checking only the best case is insufficient.
3. Mind eligibility currently relies partly on psychic element or retired traits. Those are not sufficient evidence of every mental capability. Explicit source mechanisms replace that grant.
4. Breath/voice and other channel prerequisites need semantic review rather than mechanical copying. For example, an emitted fluid does not automatically require biological respiration, and a sound emission is not automatically a communication behavior.
5. Historical signature validation permits some missing anatomy/list entries as warnings, while generation demands declared instruments. Use one coherent rule for guaranteed and generated capabilities.
6. The 1-3 instrument authoring limit is not a source-coherence invariant. Do not accidentally preserve it as a cap on mechanism possibilities.

## Migration acceptance checks

Before shipping removal, the new compiler must reject missing required body parts, unsupported channel declarations, broken source/element relationships, and any allowed physiological branch lacking its required mechanism. It must accept supported nonphysical channels, signature-only instruments, passive-only instruments, and multiple distinct supported mechanisms using the same part. Verify that cleanup does not expand ordinary generation permissions and that naming/coverage views use those same permissions. Pin the new schema, catalogs and compiler/generator in the generation release.

Exact conditional-physiology representation and exhaustive constrained-generation implementation remain open elsewhere in the redesign. This audit approves the ownership cleanup, not the claim that those systems are already implemented or proved correct.
