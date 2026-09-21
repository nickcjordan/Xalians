# Area selectivity — scope and placement review

> Historical design discussion / audit evidence. The [current contract](creature-model-current.md) is authoritative for the redesigned model and its implementation status. Conflicting proposals below are superseded; these notes are not production schemas.

SUPERSEDED BY USER DECISION: retire selectivity entirely. Area means exposure throughout the reached geometry, subject to obstacles and each recipient's protections/effect resolution. No chosen recipient exemptions or automatic allegiance filtering. Explicit multi-target selection is deferred. The recommendation below is retained as rejected discussion context, not implementation guidance.

2026-09-20. Recommendation, not yet ratified. The existing production schema places selectivity under spatial for every ability, and the prior design retains selective/indiscriminate without a detailed control contract.

## Recommended first-version meaning

- Indiscriminate: the area delivery does not let the performer choose individual recipients to spare. Reaching an occupant still does not guarantee every effect succeeds; protections, likelihood, and delivery obstacles remain separate.
- Selective: the authored mechanism supports choosing recipients within the area. It is not automatically allies-only or enemies-only, does not identify allegiance universally, and does not guarantee successful effects.
- Being able to aim an action at one target does not establish selectivity over additional area recipients.

Keep this choice at area-delivery level for the first version. All area-directed effects use the recipients reached by that delivery; effect-local immunity and success remain independent. Do not add separate per-effect selection menus merely to support hypothetical mechanisms. If a future species needs physically distinct targeting for contributions within the same area, review the concrete mechanism then.

Proposed placement: spatial.area.selectivity in generated abilities, and in area permission domains in species templates. Omit for abilities without area. Use explicit authored values, with indiscriminate as the authoring recommendation for ordinary physical spreading unless source mechanisms justify selectivity. This is not a silent schema fallback or random bonus available to every species.

Examples: ordinary fire splash exposes occupants regardless of allegiance; a deliberately targeted mental broadcast may support choosing recipients if the species author establishes that control. Game rules own exact geometry, visibility, scheduling, and any game-specific friendly-fire policy; shared creature data should not assume friendly immunity from the move being harmful or beneficial.
