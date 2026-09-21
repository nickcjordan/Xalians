# Mechanism-scoped generation permissions — concrete review example

> Historical design discussion / audit evidence. The [current contract](creature-model-current.md) is authoritative for the redesigned model and its implementation status. Conflicting proposals below are superseded; these notes are not production schemas.

2026-09-19. Proposed syntax, not a ratified schema or runtime implementation. This implements the user's requested design example; it does not restore a complete-move whitelist.

## What the JSON represents

[Example JSON](mechanism-permissions-example.json) is an abbreviated species-template fragment. Its hypothetical species has a secretion that supports tissue repair and washing away compatible applied substances. This is an explicit assumption for the example, not biology inferred from the existence of a gland or permission granted to a canonical species.

`mechanisms` groups generation permissions by a physically supported source. `key` identifies that source locally; it is not a new global effect or delivery enum. `instrument` references the existing instrument catalog. All controlled values continue to come from shared registries. The local key does not prescribe a finished move or require a shared ability-template catalog.

## Reading the permissions

- `targeting` retains its agreed meaning: allowable target relations for an ability; it is not a request to affect every listed relation simultaneously.
- `activation.continuity` is a domain of allowed generated values. This focused example supports discrete delivery only.
- `delivery` is keyed by allowed delivery modes. Its entries specify the allowed range categories for that mode. This is a bounded dependency, not an arbitrary predicate or expression.
- `effects` lists the contributions inherent to the selected mechanism. All are included. There is no effect-count quota, required/optional partition, or independent roll to omit a contribution. Here the authored secretion repairs tissue and cleanses, so every generated use retains both effects. Valid configuration-dependent differences in effects must follow an explicit mechanism relationship, not a random omission toggle.
- Each effect's fields describe its own meaning. `intensity: [30,70]` is a numeric generation band. `methods: ["cleansing"]` is the actual removal-method list, not an implicit random-choice domain. Array meaning must be explicit in the eventual schema; this fragment is not a generic recursive choose-from-any-array format.
- `key` on each effect supplies its local generated identifier, preserving the existing dependency-reference contract.

The two effect contributions belong to the illustrative mechanism. An author must not place arbitrary effects together just because each is valid somewhere in the species. Shared anatomy does not make every secretion or process interchangeable; any genuine configuration-dependent difference still needs a supported relationship. This does not reintroduce a whitelist of finished moves: delivery, spatial properties, magnitudes, and other permitted parameters still combine.

Latest ratified correction: status inclusion is inherent to the mechanism where authored as such; status likelihood controls application during gameplay. A template may permit variation in the likelihood category, but every generated move retains the status effect. Existing categories remain consistent, likely, occasional; games map those categories to their rules. No new probability scale or generated zero-chance omission is introduced. `requires` retains its distinct encounter meaning of actual prerequisite success; its reference must exist in every generated configuration. Including two effects does not itself make either depend on the other's success. Fire breath can apply burning after successful delivery even when immediate harm is prevented, unless an explicit success dependency says otherwise.

## Several outputs from one mechanism

Illustrative generated action descriptions (not a stored list):

| Delivery | Range | Selected effects |
|---|---|---|
| Contact | Contact | Restore, intensity 42; remove through cleansing |
| Projectile | Short | Restore, intensity 50; remove through cleansing |
| Projectile | Medium | Restore, intensity 61; remove through cleansing |
| Projectile | Short | Restore, intensity 35; remove through cleansing |

Generated actions contain resolved fields: for example, `delivery.mode: projectile`, `spatial.range: medium`, and the selected resolved `effects[]`. They do not contain mechanism permission tables, numeric bands, or selection counts. Descriptive naming is separate and must accurately describe the generated combination.

There are three delivery/range choices here before intensity variation. Both mechanism-defined effects are retained in each. These are consequences of the permissions, not a stored list of complete moves. The earlier nine-path example included random effect omission and is superseded.

## Why this remains valid

The delivery/range table prevents a contact-delivered move from rolling medium range. The instrument scope prevents this mechanism's restoration permission from being applied to unrelated claws. Global schema rules still enforce universal relationships. Removal only ends status applications with matching authored removal methods; cleansing never means remove every negative condition.

An authoring compiler checks permitted domains and their relationships before the species can be generated. Generation selects from the appropriate domain at each step; it does not build an arbitrary move and evaluate or retry it. The example's three delivery/range paths can be enumerated as a small authoring verification, but production is not required to materialize every possible complete move as a runtime pool. Numeric bands are checked as bands, not by individually enumerating all numeric combinations.

## Boundaries still to design

This demonstrates one mechanism and one field relationship. It does not settle all allowed relationship shapes, compound-effect prerequisite selection, cross-mechanism composition, guaranteed signature constraints, cross-ability consistency, selection weights, or full naming/timing/spatial generation. Those must be concrete and bounded before claiming the complete generator valid by construction. Do not introduce a general-purpose expression language to fill these gaps by default.
