---
name: migrate-species
description: Author a new Xalian species or edit, audit, or migrate an existing one's defining lore, anatomy, physiology, or abilities, including logically exhaustive derived-act coverage.
---

# Author or migrate a species

Translate source-supported species identity into the current creature contract. Review the species once; never require review of each generated individual.

## Authoritative references

Read these repository files from the working tree being changed:

- `docs/design/creature-model-current.md`: consolidated agreed contract, implementation status, and explicit deferrals. This supersedes conflicting chronological proposals and old inline schema examples.
- `packages/content/src/creature/`: executable redesigned schemas, derived-act tables, catalog and compiler. Use registered values; add a shared entry when an evidenced concept requires a new value. Do not invent a private enum inside a species.
- `docs/design/creature-derived-acts.md`: current body-derived act contract. It supersedes the older species-authored-permissions description where they conflict.
- `docs/species-templates/ABILITY-AUDIT.md`: required bounded creative-coverage checklist.
- [Canon and prose guidance](references/canon-and-prose.md): read when authoring descriptions, physiology, or encyclopedia prose.
- [Physiology and presentation guidance](references/physiology-guidance.md): retained source-reading distinctions, separate from retired automatic trait/permission rules.

The current v5 roster is available. Prototype generation uses current species content without release IDs or species revisions. Historical archives remain replayable for old records, but authoring a new or edited v5 species does not require a generator snapshot, version bump, or immutable content copy. Existing `docs/species-templates/<key>.json` and the legacy public generator remain v4, while Powerworks and Reclamation consume the v5 roster. Author future v5 species under `docs/species-templates/v5/`. After ratification, run `node scripts/bundleLore.js` to refresh the ordinary content bundle and validate it with `npm run check:species`. Game adoption remains separately scoped. Current templates require `massKg` plus at least one applicable overall `heightCm`, `lengthCm` or `widthCm`; they do not add structured appendage measurements. The old `schemaVersion` field is optional compatibility metadata in v5 source and should not be added to new species or bumped during prototype edits. Do not feed v5 definitions into the v4 species bundler. If explicitly working on the deployed game format, inspect its actual schema and validator instead of copying fields from the redesign. Do not interrupt another agent's species work.

## Sources

Read the canonical species entry in `packages/content/json/species.json`, the existing species template/walkthrough, the species art in `docs/species-templates/art/` and `apps/web/src/svg/species/`, and its home planet in `packages/content/json/planetRecords.json`. Use `planetStatus.json` for political context, not physical canon. Inspect the artwork rather than guessing what it shows.

Preserve the user's teaser verbatim as `lore.description`. Distinguish explicit evidence, justified creative inference, and a proposed new species power. Use the approved lore and art to establish mechanisms before consulting old move pools. Source silence about a liquid's chemistry does not authorize every imaginable substance.

## Authoring workflow

1. Inventory anatomy, channels, materials, senses and evidenced processes, including parts that first look locomotor or sensory. Derive the full table-granted act space, then review each source, delivery and outcome against the creature's evidence. Explore justified uses beyond the first examples, including healing, protection, removal and other support. Do not omit an independently capable source or a valid outcome to keep the pool compact.
2. Put essential identity into the fixed signature and other guaranteed properties/capabilities. Automatic processes belong in passives or physiology. Pure support is valid.
3. Author an ordinary `mechanisms` entry for every justified behavior the derivation tables cannot say: an effect type, status, direction, delivery mode or area the rows do not produce. Anything the tables already produce for the same instrument, element, delivery mode, targeting, area and effect types is redundant and is left to derivation. The four generated action slots are not a species-level quota. No complete-move whitelist, extra whole-ability template catalog, arbitrary predicates, or independent trait rolls. All inherent effects remain present; status application likelihood can vary.
4. Keep signature structure fixed. Prefer justified numeric bands to fixed output values; omit status intensity overrides unless source evidence warrants deviation from the catalog default of 50.
5. Declare `channels` and `conduits` from evidence, per `docs/design/creature-derived-acts.md`. Anatomy grants and lore subtracts: the tables in `packages/content/src/creature/acts.ts` derive the act space from anatomy, declared channels and declared conduits. Declare a channel only where the ratified predicate holds and the lore or art shows the species using it against others; declare a conduit only where the description, lore, art or an authored ability shows the element leaving through that part. A foreign element needs a guaranteed or authored ability already using it. A species with no evidenced outlet gets no conduit; that is a legitimate result. Validate physical instruments against anatomy and requirements over the entire physiological band.
6. Run `npm run check:creature-model -- docs/species-templates/v5/<key>.json`. This invokes the shared compiler, proves four distinct actions can be selected, and prints the distinct act count with a per-instrument breakdown and the exclusions in force. Read that breakdown and account for every derived family. Add `acts.exclude` only when the lore, anatomy or physiology contradicts the act, with a concrete reason in the audit. Do not exclude on taste, redundancy across different body parts, or to keep a species focused. Where a removed mechanism carried a deliberate band far from the derived default, put that band into `acts.output`. No `acts.output` or authored mechanism band may exceed the signature's band on the signature's kind (same harm mechanism, same element when elemental, same displace direction, or restore; a physical signature on an element-bearing action also caps elemental harm of that element); the compiler clamps derived bands and refuses authored ones above the cap, so lower the authored band, never raise the signature (`docs/design/creature-derived-acts.md`, "Signature guardrail, 2026-09-23"). Resolve failures without truncating justified possibilities, padding or adding generation retries; report a real model limitation if one prevents coherent coverage.
7. Read the naming line that `check:creature-model` prints, and read the ordinary names it generates over seeds. Defaults name a contact strike for the body part and harm for what it does; a species whose parenthetical or shared-base-name rate is not near zero needs an authored `naming` vocabulary that fits this body, not a permission change. Every authored word must fit every variant it can apply to.
8. Write or update `<key>.ability-audit.md` beside the staged template. Account for all derived and extension mechanism/delivery/outcome families, source evidence, concrete exclusion or equivalence reasons, retired powers and genuine remaining questions. Record channels, conduits, redundant mechanisms, and every `acts.exclude` entry with its reason. For edits, trace changed facts through the prior audit and reopen affected families. A schema pass or four-action sample does not demonstrate creative completeness.
9. Update the species walkthrough and encyclopedia when the authorized task includes those changes. Report the actual authoring and validation status. Do not add a new approval checkpoint where the user has already authorized the change.

## Invariants to preserve

- Four actions total, guaranteed first; passive signatures do not consume action slots. No passive quota.
- One species element; optional ability element. No implicit immunity or adjacent-element powers.
- Ordinary variants may share mechanisms; names or intensity alone do not distinguish slots.
- Preserve separate harm/status immunity and independent application lifetimes. No overwrite of resistance by temporary immunity.
- One target establishes directed geometry; area effects expose all reached recipients. No selective-area filter.
- Retire traits, archetypes, corporeality, primary/secondary effects and generic resource transfers. Preserve evidenced behavior through the approved replacement, not a renamed catch-all field.
- Do not reintroduce deferred dormancy, reflection, foresight or territorial bonuses. Species-specific ratified decisions are listed in the current contract.
- Games own outcome amounts, probabilities, turns, reaction scheduling and encounter state. They may include a creature with unsupported capabilities explicitly unavailable. Game adaptation is a separate task from species authoring.
