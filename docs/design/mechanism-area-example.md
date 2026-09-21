# Delivery-dependent area permissions

> Historical design discussion / audit evidence. The [current contract](creature-model-current.md) is authoritative for the redesigned model and its implementation status. Conflicting proposals below are superseded; these notes are not production schemas.

Proposed concrete encoding extending [mechanism permissions](mechanism-permissions-example.md). The user approved scoping spatial permissions to delivery; exact syntax is still a design draft. [JSON example](mechanism-area-example.json) is a hypothetical species-template fragment, not a production record or canonical permission grant.

## Relationship

The mechanism supports stream delivery with line area and pulse delivery with cone area. Range and extent can vary within the chosen delivery's authored domains. Both effects are inherent: pressure causes impact harm and water provides cooling removal. Neither effect is randomly omitted. Water classification alone does not infer either effect.

These are species-mechanism permissions, not universal statements that every stream is a line or every pulse a cone. Catalog values retain their shared meanings; anatomy/process-specific combinations are authored here. No complete moves are enumerated.

## Generated outputs

Examples include a short small line stream, a long medium line stream, and a medium small cone pulse. All retain harm and cooling removal. A long cone pulse is excluded by the authored pulse range domain; no generated move needs to be rejected to enforce that relationship.

The generator resolves delivery.mode and moves the selected spatial values into the generated ability's existing spatial.range and spatial.area fields. Permission tables remain in species templates, not generated creatures.

## Area must have a recipient

Both effects explicitly use recipient: area, so they apply to the recipients reached by the generated area. Area geometry alone does not spread a target-directed effect. Recipient self, target, and area retain their agreed distinct meanings. This example does not mix point delivery with area delivery; any future mode that omits area must be paired with a valid authored recipient relationship, not an area recipient with no area or an implicit broadcast of target effects.

Anchor self fixes the area's origin at the performer; it does not mean recipient self. Shape and game geometry determine who is reached. Games own encounter geometry and resolution; the full authored ability still needs its applicable lifetime fields. Selectivity is retired: every reached recipient is exposed, without automatic ally/enemy filtering. Protections and likelihood still resolve individually.

Targeting boundary accepted 2026-09-20: both the line stream and cone pulse in this example are aimed toward one selected other target. They are not free-aim area placements. Their origin remains the performer. Area-directed effects reach qualifying recipients in the resulting geometry, which can include the selected target. A location-anchored area elsewhere would retain an action-established point rather than allow independent empty-point selection.

Range describes delivery reach; extent describes the area's categorical size. They do not multiply into an invented universal distance formula. This example's author must approve every permitted range/extent pair. If a mechanism genuinely couples them, that relationship must be encoded explicitly before generation; this example does not claim all spatial fields are always independent.

## Small authoring check

There are six stream range/extent paths and four pulse paths. All ten have area geometry and both area-directed effects. Checking these paths is a finite review of the example's permissions, not a requirement to store ten complete moves or evaluate every generated creature.
