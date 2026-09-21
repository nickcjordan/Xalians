---
name: migrate-species
description: Author or re-author a Xalian species from its lore, anatomy, physiology and art, including mechanism permissions and a systematic ability coverage audit. Use for new species and migrations of existing creature templates.
---

# Author or migrate a species

Translate source-supported species identity into the current creature contract. Review the species once; never require review of each generated individual.

## Authoritative references

Read these repository files from the working tree being changed:

- `docs/design/creature-model-current.md`: consolidated agreed contract, implementation status, and explicit deferrals. This supersedes conflicting chronological proposals and old inline schema examples.
- `packages/content/src/creature/`: executable redesigned schemas, catalog and compiler. Use the catalog's registered values; add a shared entry when an evidenced concept requires a new value. Do not invent a private enum inside a species.
- `docs/species-templates/ABILITY-AUDIT.md`: required bounded creative-coverage checklist.
- [Canon and prose guidance](references/canon-and-prose.md): read when authoring descriptions, physiology, or encyclopedia prose.
- [Physiology and presentation guidance](references/physiology-guidance.md): retained source-reading distinctions, separate from retired automatic trait/permission rules.

The complete 32-species v5 roster and its frozen `generation-0.6.0-1` release are available. Existing `docs/species-templates/<key>.json` and deployed game consumers remain v4. Author future v5 species under `docs/species-templates/v5/`; a substantive change after the frozen release requires a new release ID. Do not feed v5 definitions into the v4 bundler or claim games consume them yet. If explicitly working on the deployed game format, inspect its actual schema and validator instead of copying fields from the redesign. Do not interrupt another agent's species work.

## Sources

Read the canonical species entry in `packages/content/json/species.json`, the existing species template/walkthrough, the species art in `docs/species-templates/art/` and `apps/web/src/svg/species/`, and its home planet in `packages/content/json/planetRecords.json`. Use `planetStatus.json` for political context, not physical canon. Inspect the artwork rather than guessing what it shows.

Preserve the user's teaser verbatim as `lore.description`. Distinguish explicit evidence, justified creative inference, and a proposed new species power. Use the approved lore and art to establish mechanisms before consulting old move pools. Source silence about a liquid's chemistry does not authorize every imaginable substance.

## Authoring workflow

1. Inventory anatomy, channels, materials, senses and evidenced processes. Complete the mechanism/delivery/outcome coverage audit, including healing, protection, removal and other support where supported. Consider all relevant registered possibilities; do not stop after the first examples.
2. Put essential identity into the fixed signature and other guaranteed properties/capabilities. Automatic processes belong in passives or physiology. Pure support is valid.
3. Author ordinary mechanism permissions over catalog values with the supported nested relationships. No complete-move whitelist, extra whole-ability template catalog, arbitrary predicates, or independent trait rolls. All inherent effects remain present; status application likelihood can vary.
4. Keep signature structure fixed. Prefer justified numeric bands to fixed output values; omit status intensity overrides unless source evidence warrants deviation from the catalog default of 50.
5. Derive source permissions from each mechanism or guaranteed capability. Do not restore template `instruments`, `conduits`, element adjacency grants or a second permission matrix. Validate physical instruments against anatomy and requirements over the entire physiological band.
6. Run `npm run check:creature-model -- docs/species-templates/v5/<key>.json`. This invokes the shared compiler and proves four distinct actions can be selected. Resolve failures in authoring permissions, not by truncating, padding or adding generation retries.
7. Write `<key>.ability-audit.md` beside the staged template. Record included/excluded mechanism families, source evidence, retired powers and genuine remaining questions. A schema pass alone does not demonstrate creative completeness.
8. Update the species walkthrough and encyclopedia when the authorized task includes those changes. Report the actual migration/release status. Do not add a new approval checkpoint where the user has already authorized the change.

## Invariants to preserve

- Four actions total, guaranteed first; passive signatures do not consume action slots. No passive quota.
- One species element; optional ability element. No implicit immunity or adjacent-element powers.
- Ordinary variants may share mechanisms; names or intensity alone do not distinguish slots.
- Preserve separate harm/status immunity and independent application lifetimes. No overwrite of resistance by temporary immunity.
- One target establishes directed geometry; area effects expose all reached recipients. No selective-area filter.
- Retire traits, archetypes, corporeality, primary/secondary effects and generic resource transfers. Preserve evidenced behavior through the approved replacement, not a renamed catch-all field.
- Do not reintroduce deferred dormancy, reflection, foresight or territorial bonuses. Species-specific ratified decisions are listed in the current contract.
- Games own outcome amounts, probabilities, turns, reaction scheduling and encounter state. They may include a creature with unsupported capabilities explicitly unavailable. Game adaptation is a separate task from species authoring.
