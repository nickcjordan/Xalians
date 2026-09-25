# Species ability authoring and audit checklist

Derive ordinary acts from the shared anatomy, channel and conduit tables, then use evidence-backed exclusions, output overrides and authored extensions where needed. Do not author a whitelist of complete moves. The implemented model and derivation rules are in [the current specification](../design/creature-model-current.md) and [derived-act contract](../design/creature-derived-acts.md). Configuration examples are coverage evidence, not the universe of allowed outputs. Compile before generation; never evaluate/retry each generated creature.

Use for every newly authored species and every edit to an existing species' defining lore, anatomy, physiology, or abilities. Recheck affected families against the full derived-act inventory rather than treating the changed field in isolation. Pure spelling or formatting fixes need not repeat an unchanged creative review. Policy and scope: [coverage guidance](../design/species-ability-authoring-coverage.md).

Create or update `docs/species-templates/v5/<key>.ability-audit.md` using the sections below. This is species-level review evidence, not part of generated creature data. Mark items complete only with evidence; mark genuine non-applicability with a reason. Do not treat a passing schema validator as proof of creative coverage.

Keep redesigned species in `docs/species-templates/v5/`. A ratified prototype species change updates the current content bundle with `node scripts/bundleLore.js`; it does not create a species revision or generator release. Record genuine representation gaps here; do not add private fields or silently feed v5 data to the v4 species bundle.

## Review identity

- Species key:
- Review date and mode: initial authoring / re-authoring / audit
- Source files and revisions:
- Schema and registry revision/snapshot:
- Source-supported mechanisms:
- Scope changes since the previous audit:

## 1. Establish the species

- [ ] Read the authoritative species description, anatomy/art, physiology, and relevant world context.
- [ ] Inventory each usable body part, channel, material, secretion, sensory process, and elemental mechanism.
- [ ] Separate explicit source facts from justified inference and proposed additions to the species concept.
- [ ] Identify essential capabilities that must remain guaranteed; distinguish optional variation.
- [ ] For an audit, derive the mechanism inventory before comparing existing capabilities so previous options do not define the search boundary.

## 2. Explore registered possibilities systematically

- [ ] For each mechanism, consider every relevant registered delivery mode.
- [ ] Review direct harm, restoration, protection, status application, removal, and displacement, wherever compatible with that mechanism.
- [ ] Review status families, including beneficial, impairing, and information conditions; do not stop at damage.
- [ ] Consider self/other targeting, meaningful area forms, range, and source/area dependence.
- [ ] Consider deliberate actions, automatic continuous processes, and the supported event-triggered responses.
- [ ] Review meaningful compound effects and actual outcome dependencies without inferring incidental effects.
- [ ] Explore reasonable creative applications beyond moves literally named in the source.
- [ ] Recheck locomotor, support, sensory and other seemingly noncombat anatomy for independently justified acts or automatic capabilities.
- [ ] Do not treat source silence as an ability to synthesize any substance or perform any elemental process.
- [ ] Flag meaningful ideas requiring new registered keys rather than omitting them silently or using private keys.

Use the ledger to show the reviewed mechanism/delivery/outcome coverage. Group clearly inapplicable families with a concrete explanation; do not create thousands of repetitive rows for impossible Cartesian combinations.

## 3. Candidate ledger

| Candidate or reviewed family | Source mechanism and evidence | Delivery / effects considered | Disposition | Rationale or equivalent candidate | Open decision |
|---|---|---|---|---|---|
| | | | | | |

Dispositions:
- Included: a supported derived act or authored extension.
- Excluded: a concrete incompatibility or lack of a necessary mechanism.
- Equivalent: the same source and behavior are already covered by an identified act or numeric/naming variation. A different capable body part is not equivalent merely because its effect category matches.
- Decision needed: proposed species addition, unresolved meaning, or required registry/schema extension.

No fixed quota of options. Account for every plausible candidate family in the declared registry and species scope, including every table-derived act. A merely short list of examples is not a completed pass. Four generated actions do not cap the species act space. Do not exclude an evidenced source or outcome to make the set compact.

## 4. Review derivation and author extensions

- [ ] Declare anatomy, channels and conduits from evidence, then inspect the full per-instrument derived-act breakdown.
- [ ] Record every `acts.exclude` entry with a concrete source contradiction; do not exclude for taste, overlap with another body part, or presentation neatness.
- [ ] Use `acts.output` for justified band changes and `mechanisms[]` only for supported behavior the tables cannot express.
- [ ] Each authored extension uses shared schema fields and registered semantic values.
- [ ] Nested delivery/recipient/spatial domains encode the actual relationships; all allowed combinations are coherent without fixing a list of finished moves.
- [ ] No extra whole-ability catalog/template layer or general exclusion engine is introduced.
- [ ] Numeric variation uses justified ranges; fixed values require a reason.
- [ ] Apply [the stable benchmarks](../design/creature-rating-benchmarks.md) for the actual capacity/output being rated. Do not normalize to the roster, confuse 100 with a cap, or use 50 as an unknown-value fallback. Only omitted status intensity defaults to 50.
- [ ] Status intensity uses the catalog default when no override is warranted; justified overrides prefer ranges.
- [ ] Optional [naming vocabulary](../design/creature-ability-naming.md) is supported by the source and valid across its entire mechanism/delivery domain. Omit overly specific wording rather than narrowing valid abilities just to fit a name.
- [ ] Source, recipient, intensity, timing, area, removal, and dependence describe distinct facts without duplicate contributions.
- [ ] Actual incompatibilities among permitted domains or guaranteed physiology are resolved at authoring, not hidden by arbitrary truncation.
- [ ] Permission breadth is separate from the four-action allocation; approved combinations remain reachable.

## 5. Verify completeness and validity

- [ ] Revisit each source mechanism and effect family to catch overlooked support or alternative uses.
- [ ] Consolidate only genuinely redundant extensions without losing independently supported anatomical sources, deliveries, outcomes or meaningful behavior differences.
- [ ] Review source/registry changes for newly possible or newly invalid configurations.
- [ ] During an audit, account for previous options: retained, revised, consolidated, removed with rationale, or decision needed.
- [ ] Check mechanical prerequisites over full numeric bands and permitted selection paths before generation.
- [ ] Run `npm run check:creature-model -- <species-path>`; distinguish automated validity from the source/creative coverage audit.
- [ ] No per-generated-creature review, rejection/retry loop, or runtime lore interpretation is used.

## Completion summary

- Included configurations:
- Excluded/equivalent families and reasons:
- New vocabulary or species decisions required:
- Removed/revised existing configurations and reasons:
- Validation performed and its limits:
- Remaining blockers:
- Coverage verdict: complete within stated scope / incomplete

A review with unresolved decisions affecting the permitted pool is incomplete. Deferred future ideas outside the agreed scope may remain recorded without becoming generation permissions. Bounded coverage does not claim every imaginable ability or require filling every possible matrix cell.
