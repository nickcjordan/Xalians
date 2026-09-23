# Species ability authoring — coverage guidance

> Historical design discussion / audit evidence. The [current contract](creature-model-current.md) is authoritative for the redesigned model and its implementation status. Conflicting proposals below are superseded; these notes are not production schemas.

Current derived-act correction: [the shared tables](creature-derived-acts.md) grant ordinary acts from declared anatomy, channels and conduits. For new species or edits to defining facts, review every derived act against source evidence, exclude only contradictions with recorded reasons, and author supported extensions the tables cannot express. The bounded exhaustive-coverage objective below still applies; the four-action per-individual output is not a limit on the species act space.

2026-09-18. Applies to the forthcoming redesign; not a claim that current species have completed this pass.

Operational checklist: [ABILITY-AUDIT.md](../species-templates/ABILITY-AUDIT.md). Use it for every initial species authoring and substantive re-authoring/ability audit, saving per-species evidence as `docs/species-templates/<key>.ability-audit.md`. The migration skill and new-species workflow link to that single checklist.

## Architecture

Signature exception ratified 2026-09-20: one deliberately authored signature has fixed structure and identity across the species, with permitted variation in explicit output ratings. This includes passive signatures. Ordinary abilities use the combinatorial permissions below; the signature exception must not be expanded into a whitelist of ordinary moves. The generated signature references its resolved definition once.

Architecture correction, 2026-09-19: species author permissions over shared catalog values and codified relationships among those values. The generator assembles abilities from valid combinations, including categorical variation. Do not require a species-specific whitelist of complete moves or reduce generation to selecting prewritten ability objects with numerical/name variation. This supersedes the earlier fixed-configuration interpretation.

No additional reusable whole-ability template catalog or whitelist of complete moves/movesets is required. New semantic values must be defined in shared registries before use; do not invent species-private enums. Concrete bounded relationship syntax and constructive selection remain open design work. Do not substitute a prose-only rule or unconstrained independent cross-product.

## Coverage objective

Seek exhaustive coverage of meaningfully distinct, justified configurations within an explicitly stated finite vocabulary and species-mechanism scope. Do not stop after the first one or two ideas, impose an arbitrary small option count, or restrict options to literal attacks named in prose.

Do not promise enumeration of everything logically imaginable. Lore is incomplete and possible narratives are unbounded. Record the registries/version and mechanism assumptions used by the review so coverage can be revisited when either changes.

## Authoring pass

1. Inventory anatomy, physiological properties, sensory/communication channels, elemental mechanisms, and explicit lore processes. Distinguish guaranteed capabilities from optional variants.
2. For each source mechanism, review all applicable registered delivery modes and outcomes. Include support, protection, impairment, removal, movement, information statuses, and automatic processes; do not review damage alone.
3. Explore justified extensions: different uses of the same material/process, short versus broad delivery where physically supported, self versus other recipients, and meaningful compound outcomes. Numerical variation alone belongs in ranges, not duplicated entries.
4. Author permitted value domains and the relationships needed to preserve source-mechanism coherence. Concrete generated combinations are coverage examples, not an exhaustive author-maintained move whitelist. Compound effects must describe coherent contributions, not incidental physics or arbitrary mixtures of individually legal keys.
5. Record reviewed mechanism/delivery/outcome families as supported by rules, excluded with a concrete reason, equivalent, or requiring a decision/new vocabulary. This is authoring review data, not fields every generated creature carries.
6. Cross-check coverage across mechanism x delivery x outcome families so no plausible family was skipped merely because the first few examples seemed sufficient.
7. Review possible conflicts among approved options and guaranteed physiology. Flag actual incompatibilities before expanding generation machinery. Do not approve individually plausible options whose allowed co-occurrence is known to be incoherent.
8. Compile machine-checkable constraints across full ranges and all selection paths. Biological review happens here, not per generated individual.

## Creative inference and its limits

An author may infer plausible uses from the anatomy and source mechanism even if the lore never names that exact move. Record the physical explanation and its basis. No explicit literary mention is required for every option.

Silence is not unlimited permission. A liquid-ejection tube supports a delivery route; by itself it does not establish the ability to synthesize every toxin, healing compound, adhesive, fuel, or elemental substance. Propose plausible biological additions explicitly when needed, instead of treating them as preexisting facts.

A novel source-supported concept outside current vocabulary is a registry-extension candidate. Do not silently omit it solely because no key exists, and do not ship it under a private or misleading key.

## Coverage evidence per species

The review should contain:
- Mechanism inventory and source references.
- Permitted catalog domains, codified relationships, representative combinations, and rationale for inferred capabilities.
- Reviewed alternatives and concrete exclusion/equivalence reasons.
- Open concepts requiring a species/canonical or vocabulary decision.
- Registry scope used for the pass.
- Unresolved conflicts that would prevent valid-by-construction selection.

Completion means all candidate families in the declared scope have been reviewed and no unresolved issue affecting the permitted pool is hidden. It does not require filling every matrix cell. Unsupported mechanics should be rejected, not added to satisfy a quota.

Pool breadth and per-individual ability count are separate: a species can have a broad option pool while each creature receives a small selection. Weights must not silently make supposedly available approved options unreachable.

## Required authoring outcome

A shared schema, registered semantics, broad deliberate exploration, explicit supported configurations, and a coverage record. Preserve creative diversity without arbitrary key mixing or evaluations of completed creatures.
