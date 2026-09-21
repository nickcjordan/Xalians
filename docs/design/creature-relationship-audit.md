# Creature relationship audit

2026-09-21. Scope: the implemented v5 model, compiler and representative source cases. No canonical species templates were migrated and no games were changed.

Read the description, behavior, anatomy, communication and guaranteed capability fields for all 32 entries in `RATIFIED.json`. This is a prose/data screening pass, not the later complete source/art and creative-coverage audit for each species. Tests use noncanonical fixtures shaped after the relevant relationships, not ratified creature output values.

## Fixed in this pass

| Finding | Correction |
|---|---|
| Dependent effects could independently choose incompatible target/area recipients. The compiler rejected otherwise useful correlated domains. | Treat recipient domains and `requires` together. Construct matching recipients or the permitted dependent-self alternative directly. No extra condition field or finished-move whitelist. |
| Duplicate detection compared the descriptions of prerequisite effects but lost whether dependents shared one success or relied on independent successes. | Canonicalize each independent effect together with its dependent effects. Local IDs/order remain irrelevant; the dependency topology remains meaningful. |
| A directed cone/line/sweep could offer both self and other selection, although selecting self supplies no direction. | Require other-only targeting for those directed geometries. Self-centered radial areas remain supported. |
| Declared area permissions could be silently unused when no effect could address area. | Diagnose unreachable area permissions during authoring, including dependency constraints that make every area branch unreachable. |
| Voice was treated as proof of vocal communication. | Remove that inference. A supported sound-producing ability does not imply outward communication behavior or biological respiration. Source evidence is still required at authoring. |
| Self-only target/self equivalence was applied to duplicate detection but not consistently to dependent-recipient validation. | Apply the same equivalence in validation and normalize ordinary self-only recipient domains during construction. |

The recipient compiler factors each independent effect and its dependents into a small group. It sums compatible alternatives within a group and multiplies independent groups. Child alternatives remain factored; it does not materialize the whole creature's move space. Existing direct index selection and cross-mechanism duplicate exclusion still apply.

Authoring checks exercise each valid recipient alternative against the remaining variable dimensions. The bounded schema has no cross-group recipient predicate beyond area presence, which the existing first-area partition establishes. New higher-order relationships would require extending that proof, not merely adding an unchecked field.

## Representative relationships checked

| Source case | Shared representation and result |
|---|---|
| Bioflim's continual shell regrowth | Guaranteed ongoing self restoration, independent of the ordinary actions selected. A passive signature still leaves four action slots. |
| Newtapede's maintained hold | Source-bound restrained status requires ongoing operation. A discrete action cannot claim to sustain the hold indefinitely without a continuing source. |
| A lingering corrosive patch, relevant to secretion mechanisms | Area lifetime and recipient condition lifetime are separate. Area-bound conditions require area recipients and a persistent area. |
| Hippochamp's directed water stream | A directed cone has one other target establishing its direction. Harm and cooling removal can coexist without implying universal status removal. |
| Hypnopet's visible hypnotic mechanism | Visual reception belongs to the signal's recipient requirement; visual appearance alone is not enough. Stabilizing removal does not imply bodily restoration. |
| Smokat dispersing versus Ectoghoul traversing solids | Dispersed and persistent phase traversal remain separate declarations. Neither grants implicit immunity or concealment. |
| Vespersyn's controlled projections | The swarm channel needs no independent familiar records or generic conditional-physiology subsystem. No new creature entity model was introduced. |
| A passive using a physical part | The compiler checks anatomy for passive-only sources as well as signatures and ordinary mechanisms. |
| Two independent hits with contingent self outcomes | Sharing one prerequisite and depending on separate prerequisites remain structurally distinct. Both can be represented without chains or formulas. |

Tests explicitly cover all 14 configurations in a correlated target/area example and all 28 configurations when dependent-self alternatives are included. They verify emitted validity and uniqueness, not just one lucky generated seed. These are small exhaustive test oracles, not production whitelists.

## Passive physiology

The screened templates use fixed anatomy lists and physiological bands, not an authored roll that sometimes supplies a body part and sometimes removes it. Their old trait chances are not evidence for a new biological variant subsystem. Bioflim's inherent automatic process fits the guaranteed-passive model already implemented.

No concrete source case from this screening requires a general conditional-physiology engine. This is not proof that none will ever exist. During species authoring, required capabilities must be supported over the full permitted physiology band; do not turn essential processes into random passive draws.

## Ongoing-passive target selection

Ratified and enforced: ongoing passives use `targeting: [self]`. Any area must use `anchor: self` and `shape: radial`; range is omitted. They affect self or everyone in that area according to their effects. The existing self-only `recipient: target` alias still refers to the owner.

Directed automatic responses use an existing event trigger; a deliberately maintained connection belongs in actions. This rule is checked when authoring species, with no per-generated-creature evaluation or new target-selection subsystem.

## Remaining boundaries

- Games still own event dispatch, missing attacker handling, per-recipient success, timing, area membership, interruption and application lifetime. Schema tests do not claim to implement an encounter engine.
- Range/extent domains inside one delivery branch currently combine independently. A source that genuinely couples them needs a concrete relationship design; do not disguise such a case as a completed universal constraint engine. No new source case in this screening ratified that additional relationship.
- Structured dormancy, reflection, resource transfer and illumination remain deferred. Screening does not reinstate retired powers.
- Naming has no authority over permissions or effects.
- Finish release integration before canonical species migration, then perform the full roster's source/art, calibration, vocabulary and coverage audits.

## Verification

Content: 106 tests passed. Rules: 354 tests passed. Both package TypeScript checks passed. Twenty-one dedicated relationship regressions cover this audit, including naming a difference in dependency structure. No per-individual schema evaluation was added to production generation.
