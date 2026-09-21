# Same-delivery recipient variation — agreed design

> Historical design discussion / audit evidence. The [current contract](creature-model-current.md) is authoritative for the redesigned model and its implementation status. Conflicting proposals below are superseded; these notes are not production schemas.

2026-09-20. Accepted extension to delivery-keyed recipient mappings. Supersedes the proposed single/area branch terminology. [JSON example](mechanism-splash-example.json) is an abbreviated hypothetical species template, not production data. Runtime migration remains pending.

## Reuse existing values

Let a delivery-keyed recipient mapping provide either one fixed recipient or a domain of existing recipient values. For example, recipient: {projectile: [target, area]} permits either coverage for that effect, whereas a separate effect with recipient: target always remains target-directed. No new runtime recipient or single/spread targeting category is added.

The example's pressure harm always reaches the selected target. Its cooling contribution reaches either that target or an authored radial splash. Both contributions remain present, and the action always selects one other target. Such coverage variation must be physically supported by the mechanism; this example is not permission to independently vary every effect's coverage without reviewing their relationships.

## Construction order

1. Select an allowed delivery and resolve each effect's recipient from its permitted domain, respecting any established relationships.
2. If any effect resolves to area, construct area geometry from that delivery's authored area permissions.
3. Otherwise omit area geometry in this initial model. The template's area object is a permission domain, not a mandatory generated field.
4. Resolve remaining allowed values and emit the ordinary generated shape: one delivery.mode, scalar effect recipients, and spatial.area only when used.

Thus area presence is derived from the selected recipients; it is not an independent coin flip that can conflict with them. A fixed area recipient guarantees an area. An area-capable delivery does not force every effect to spread. All inherent effects remain included; status likelihood still controls gameplay application rather than generation-time presence.

## Authoring guarantees

Every delivery branch permitting recipient area must supply valid area domains. An absent domain is an authoring error, not a runtime fallback. Keep impact location derived from the selected target and delivery outcome; no free placement. Check whole-domain coherence and success dependencies at authoring time. Do not sample arbitrary combinations and then evaluate/retry generated creatures.

For this example, two ranges combine with one target-only cooling configuration or two splash extents: six categorical configurations. The finite check is evidence for this fragment, not a requirement to materialize a complete-move whitelist.

No generic nested predicate language, new count field, new delivery key, or arbitrary effect-omission flag is introduced. More complex same-mechanism dependencies remain a separate authoring-schema task, not implicitly solved by this example.
