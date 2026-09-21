# Recipient mapping for single-target and area variants

> Historical design discussion / audit evidence. The [current contract](creature-model-current.md) is authoritative for the redesigned model and its implementation status. Conflicting proposals below are superseded; these notes are not production schemas.

SUPERSEDED: mechanism-splash-example.md is now the accepted design. It uses existing target/area recipient domains and constructs area geometry when required, avoiding the single/area selector shown below. Do not implement the older competing encoding retained here as discussion history.

2026-09-20. Proposal for discussion, not a ratified replacement for delivery-keyed mapping.

Subsequent agreed boundary: area actions retain one selected self/other target; area is not an alternative to aiming at a target. Directed cone/line/sweep geometry derives its direction from the selected target, radial splash derives its center from the targeted impact, and self-centered areas use self. No free-aim empty-point placement. The single/area map below is provisional and its terminology was found misleading: it describes effect coverage, not whether the action has a selected target. Do not implement it as a new targeting enum or claim the exact mapping syntax ratified. Existing delivery-keyed mappings remain accepted while this same-delivery encoding is consolidated.

The accepted delivery-keyed map cannot distinguish a projectile with no area from a projectile with authored splash geometry. The dependency in this case is on spatial configuration, not delivery mode. Do not introduce projectile-single/projectile-splash delivery keys or duplicate complete moves to work around it.

Proposed effect-local species-template encoding:

```json
{
  "key": "repair",
  "type": "restore",
  "recipient": {
    "single": "target",
    "area": "area"
  },
  "intensity": [30, 70]
}
```

Here single means the chosen configuration has no area, and area means it has authored area geometry. These are proposed schema branch names, not new runtime recipients or a separate rolled creature field. Generation resolves the branch after spatial selection; the emitted recipient remains target or area. This is an explicit relationship, not automatic broadcasting of every effect on an ability.

An effect fixed to target remains target even when other effects reach an area; self remains self. A mechanism requiring area for an effect fixed to area cannot permit an area-free configuration. No effects are randomly omitted, and existing status likelihood and requires semantics remain unchanged.

Recommend preferring the spatial relationship where spatial coverage is the actual cause. Before implementation, reconcile with the recently accepted delivery map into a clear bounded schema; do not silently accept arbitrary mixed maps, precedence rules, or nesting. The same-mode example does not prove a need for a general condition engine. Concrete permission syntax for choosing absence/presence of area also remains to be finalized.
