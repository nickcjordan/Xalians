# Effect-local recipient relationship — proposal

> Historical design discussion / audit evidence. The [current contract](creature-model-current.md) is authoritative for the redesigned model and its implementation status. Conflicting proposals below are superseded; these notes are not production schemas.

2026-09-20. Effect-local recipient mapping by delivery accepted for the forthcoming design; runtime implementation remains pending. [JSON fragment](mechanism-recipient-example.json) extends the mechanism-scoped approach without a list of finished moves.

## Problem

A single mechanism may support both a directed delivery with no area and a spreading delivery with area geometry. Always assigning recipient area would make the directed form invalid. Always assigning target would leave the spread without its intended area outcomes. An area must not implicitly broadcast every effect: compound effects have their own recipients.

## Proposed bounded encoding

Within a species mechanism, an effect's recipient is either a fixed existing recipient key or a mapping from the mechanism's delivery modes to existing recipient keys. Example: recipient: {projectile: target, pulse: area}. The mapping is local to the effect and keys reuse the delivery catalog. It is not a general predicate language or shared recipient override for all effects.

Generated effects still contain a single ordinary recipient string. The generator resolves the mapping after choosing delivery; games receive no conditional recipe.

## Authoring checks

- A mapping covers every allowed delivery exactly; reject missing or unknown modes at authoring time.
- Every branch returning area has area geometry for all permitted configurations of that delivery.
- Each effect resolves separately; a self-directed contribution can remain self for both deliveries.
- Inherent effects remain included. Mapping changes where a contribution is delivered, not whether it is present.
- The existing requires rule is checked after branch resolution for all permitted configurations, with no new runtime success semantics.

Same-delivery variation resolved in mechanism-splash-example.md: a delivery branch may supply an allowed recipient list, such as projectile: [target, area]. Select recipient coverage first, then generate area geometry if any effect needs it. Do not introduce private pseudo-delivery keys or generalize this map to arbitrary fields without a concrete need.
