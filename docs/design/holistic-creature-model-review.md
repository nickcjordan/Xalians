# Holistic creature model review — 2026-09-17

> Historical design discussion / audit evidence. The [current contract](creature-model-current.md) is authoritative for the redesigned model and its implementation status. Conflicting proposals below are superseded; these notes are not production schemas.

Status: review findings and recommendations for discussion. Not ratified changes. No schema, generation, species, catalog powers, or game behavior is changed by this review.

This supersedes the broad completeness claim in ability-redesign-completion.md: the implemented action/passive contract passes its tests, but whole-model consistency and catalog ratification still need the decisions below.

## Review scope

Inspected the current record and template schemas, registry definitions, ability/status/removal schemas, all 32 bundled species' capability/pool summaries, all 16 production ability patterns, pool compilation and generation, trait rolls and affinity rules, authoring validator, naming catalog schema, and old/new design contracts. Diagnostic schema probes were executed in memory. They are examples of accepted or rejected definitions, not claims that production currently contains those invalid examples.

## Keep the foundation

Keep species templates separate from individual records; immutable release provenance; physiology and senses; attributes, temperament and affinity; deliberate actions versus automatic passives; one signature reference; delivery separate from effects; categorical range/timing; encounter statuses outside permanent records; and compatible pools compiled before generation. A full replacement is unnecessary. The remaining work concerns authoritative ownership and meanings across those boundaries.

## 1. Traits overlap the new capability system — ratification required

Registry traits include healing, regenerative, volatile, reflective, hypnotic, luminous and telekinetic, with definitions that describe active or automatic powers. Those powers can also live in actions/passives. Examples: Bioflim has regenerative and armored at 100 plus its passive signature; Neph has volatile at 100 but no structured retaliation passive; Hypnopet has healing at 100 while its signature describes hypnosis and ordinary mend options remain random.

These facts are not necessarily contradictory lore. The structural issue is that a consumer cannot tell whether a trait supplies independent behavior, summarizes a capability, or amplifies it. Reading both can double count; reading only explicit capabilities can omit a defining power.

Recommendation: give each behavior one authoritative definition. Traits can own dispositions and intrinsic properties, while callable/automatic processes use actions/passives. Any summary labels should be derived or explicitly non-additive.

Critical consequence: some power traits are optional rolls, while the agreed passive model is guaranteed-only. Moving optional volatile/reflective behavior into passives would change that decision. Ratify whether to retain such variation via bounded authored variants, or guarantee those powers at species level and restrict trait variance to descriptive properties. Do not silently introduce random passive pools.

## 2. Direct effects versus status applications — ratification required

Ongoing restore overlaps mending; protection overlaps shielded/reinforced/resistant; restraint overlaps restrained; enhancement overlaps stimulated/focused; suppression overlaps several negative conditions. Current direct effects lack accepted removal methods, whereas statuses have them.

Recommendation: document one rule distinguishing a process acting now from a condition attached to a recipient. Use status definitions for applied recipient conditions and avoid duplicating their function as another effect. A direct maintained process may remain appropriate, but its interaction with freeing/disrupting must be explicit. Similar descriptions should not acquire different removal behavior solely because an author selected a different representation.

## 3. Reusable capability catalog is still the legacy starter set — authoring and ratification required

The production pattern catalog has exactly 16 definitions, corresponding to the old action families. None currently apply status or removal effects, and none are compound. Every species still uses one default compatible set. This is supported by the new schema, but it is not yet a redesigned support-capability catalog.

Pattern naming still requires an ActionKey from those 16 old families. Name entries carry instrument tags and heft, not semantic constraints for new status/support meanings. New effects can be represented technically but their reusable recipes and name families need deliberate authoring.

Recommendation: separate stable capability-definition IDs, lexical name families, and species permissions. Author a bounded representative set of healing, protection, enhancement, impairment, status, removal, and compound recipes. Reuse old names only where meaning fits. Then ratify species access from its source mechanism, never from an automatic element cross product.

## 4. Whole-creature validity needs one authoring compiler — implementation gap

Validation is split between Zod schemas, the migration validator, pool preparation, and human source review. Diagnostics show:

- SpeciesTemplateSchema accepts breathes liquid with gas-only ambient tolerance. The separate authoring validator catches this; the public generator's template parser does not enforce the same invariant.
- A gaze capability and sight band [0,50] pass the template schema; the separate gaze predicate checks the upper bound rather than guaranteeing sight for every roll.
- The documented affinityOdds override is rejected by the strict template schema, and rollAffinities uses the global chance.

Recommendation: one reusable species/pattern compilation boundary should own all machine-checkable prerequisites, valid bands, exclusions, references, medium permissions, and profile constraints. Authoring tools, CI and canonical initialization should call it. Lore evidence remains reviewed per reusable design, not per generated creature. No generated-record rejection/retry loop is needed.

## 5. Recipient bindings need a coherent final contract — ratification plus implementation

A schema probe accepts transfer with recipient area but from target / to self: the generic recipient and transfer endpoints can disagree about who participates. Targeting compatibility is also shared across effects aimed at different participants, so a metal-only target effect plus a flesh-only self benefit cannot be represented cleanly under universal narrowing. Transfer endpoints currently only support target/self even though other effects support instigator/area.

Recommendation: define target acquisition separately from each effect's recipient compatibility. For multi-recipient effects, have one authoritative participant representation rather than generic recipient plus contradictory endpoints. Keep a finite participant vocabulary, no target-expression language. Spell out the subject and instigator supplied by each permitted trigger before adding more triggers.

## 6. Migration defaults require a semantic authoring pass — ratification required

The migration explicitly assigned defaults: brief preparation/recovery, instant onset, broad categorical ranges, and common area/selectivity choices. These are design decisions rather than discovered lore facts. Existing names/prose were preserved, but the mapped effect may not fully express the process. Bioflim's text describes rebuilding broken shell while the signature payload contains only protect/barrier, with repair left to its separate regenerative trait.

Lingering field persistence also needs clarification: a cloud remaining in a place is different from a condition lingering on a recipient, and creature anchoring must say whether the area follows the creature or merely starts there.

Recommendation: review each reusable pattern and the 32 signatures against its actual source and agreed semantics; record authored decisions separately from source evidence. New standard rolls then inherit approved definitions. Do not review individual generated creatures.

## 7. Numeric and elemental semantics need explicit reference meanings — ratification required

The documents specify uniform 0–100 ranges, but that alone does not distinguish a global comparable score from within-species quality. Standard action intensity currently uses a global [15,95] band; signatures have species-specific bands. Ratify how intensity relates to a creature's strength/endurance and what a consumer may infer without double counting. Keep temperament, affinity and aptitude meanings distinct despite sharing a numeric range.

Elemental identity and ability medium are already distinct in practice: Neph has an ice signature even when it has only air affinity. This can be correct canon, but it needs an explicit species-mechanism permission rule. Secondary-affinity score currently affects neither standard-action intensity nor selection probability after the affinity exists. Decide whether that score is intentionally descriptive or should influence canonical expression; neither choice should be accidental.

Recommendation: keep identity, expression medium, and permission separate; use explicit species permissions for innate off-primary expression. Define broad score anchors without introducing physical units or per-game formulas.

## 8. Registry publication and documentation are not fully unified — implementation cleanup

Older registries are JSON definitions compiled into enum arrays; new status/removal vocabularies live in TypeScript; some fields such as template special senses are independently hard-coded. Old handoff documentation says omitted means not applicable and unknown keys are ignorable, while newer compatibility omission means unspecified and strict schemas reject unknown vocabulary. A release archive solves historical replay, not forward compatibility for an older consumer.

Recommendation: one authoritative vocabulary source per concept, one generated machine-readable export, and one current whole-creature specification. Distinguish absent/inapplicable/unspecified field-by-field. Preserve strict authoring checks while defining a separate consumer policy for unsupported future definitions. Archive superseded design prose rather than relying only on banners above conflicting instructions.

## Recommended order

1. Ratify ownership of traits versus actions/passives, including optional power variation.
2. Ratify direct-process/status boundaries and recipient binding.
3. Ratify scale/affinity semantics and migration categories.
4. Author and approve the reusable capability/name catalog and species permissions.
5. Consolidate compilation and documentation; migrate once against the approved contract, test and release together.

Game updates remain outside this review. The earlier user decision to allow creatures with unsupported game capabilities marked unavailable remains recorded for later work.
