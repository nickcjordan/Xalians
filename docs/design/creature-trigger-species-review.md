# Trigger review against existing species

2026-09-18. Design review only; no species templates, game behavior, or frozen releases changed.

Subsequent decision: user approved omitting Crystorn's optional reflection power and waived historical-record/backward-compatibility requirements for this sole-user development platform. Historical-preservation recommendations below are superseded; Crystorn reflection removal is no longer an open question.

Subsequent volatile decision: retire the generic trait rather than automatically converting its six pools into reactive passives. Retain reactions only when deliberately authored with a supported mechanism. Neph's former 100% value does not require inventing an automatic explosion or gas discharge; preserve its hydrogen body and deliberate emissions. The old-pool inventory below is evidence of prior representation, not a mandate to retain all powers/percentages.

## Scope and evidence

Read the lore.description and lore.behavior fields for all 32 species listed in RATIFIED.json, reviewed current action/passive activation, and inspected the old trait definitions and affected trait pools. Unratified draft files were excluded from the inventory.

Current shipped templates contain 31 signature actions and one signature passive (Bioflim); none declares activation.trigger. Optional reaction-like behavior is still expressed through old trait rolls. Therefore this pass is a source/structure review, not proof that migrated reactive definitions already work.

User-approved first-version trigger names: contact, harmed, ally-harmed. Harmed means actual harm, not an attempted or merely landed attack. Ratified participant mapping: contact supplies the other contact participant, harmed supplies an attacker if present, ally-harmed supplies the harmed ally. This replaces instigator with target. Recipient self always identifies the passive owner; absent event targets do not prevent self-directed effects.

## Main finding

No additional trigger is required to preserve the currently structured deliberate defenses or continuous regeneration. Lore describing a creature responding to a threat is not automatically a compulsory event-triggered passive. Missing trait migrations remain real unresolved work and must not be silently discarded.

## Worked species cases

| Species | Source/current structure | Proposed placement and consequence |
|---|---|---|
| Bioflim | Description says slime continually regenerates rocky shell; only current passive, ongoing. Payload incorrectly uses protect/barrier. | Physiology owns shell protection; ongoing passive restore owns shell repair. No harmed trigger needed. Fix this existing semantic mismatch during migration. |
| Scalatto | Can roll into a ball; current signature is an ongoing action. | Deliberate protective stance, with baseline shell protection separately in physiology. No new pre-harm trigger needed. |
| Shuntara | Builds filament lattice around self/another; current signature is an ongoing action. | Applied shielded condition is the candidate for the maintained lattice. Its behavioral response to threats does not by itself make automatic ally-harmed the correct trigger. |
| Yetimoth | Forms ice armor/walls and encases opponents; ongoing signature layers armor over itself. | Deliberate status application, with separate authored outcomes for armor and confinement. No automatic reaction established. Walls may need separate terrain representation later; do not claim this audit solves that. |
| Sonalloy | Actively repairs creatures/structures with extruded alloy; ongoing signature. | Direct restore action. Regenerative trait indicates own repair also needs a home; do not assume the two are the same process. No alloy meter required. |
| Codazzo | Explosive barbs are deliberately fired and regrown; regenerative 100, volatile 20. | Automatic regrowth and deliberate projectile action are distinct. Volatile trait needs authored reaction timing/scope; explosive ammunition does not alone establish contact retaliation. |
| Xylum | Torn tentacles regrow; rises when ground disturbed. | Automatic repair fits ongoing restore. Detection followed by deliberate behavior need not become a new disturbance trigger. Preserve body/sense facts and review signature mapping separately. |
| Voltish | Stores ambient electricity and releases it through claws; volatile 30. | Deliberate electrical action is supported. Optional automatic discharge requires authoring; storage prose alone does not establish reflection, harmed timing, or a shared charge meter. |
| Neph | Hydrogen body, coolant and flammable gas emissions; volatile 100. | Existing trait promises dangerous reaction when struck, but source prose does not specify automatic emitted effect, timing, scope, or whether actual injury is required. Guaranteed migration unresolved. Do not turn all touch into explosion or invent attacker-only targeting. |
| Crystorn | Gems transmit powerful light; reflective 25. Registry defines reflective as energy returning to its source. | Genuine conflict with deferred reflection support. Main lore does not require reflection, but old trait explicitly grants it. Author a future-model decision; do not relabel it as resistance or retaliation. Historical records retain original meaning. |
| Terragoyle | Hibernates in statue form and wakes on detecting threats; dormant 40 despite source treating behavior as characteristic. | Preserve dormancy as physiological/behavioral information. Existing active attack does not need arbitrary wake conditions. Exact field and guaranteed/optional policy remain unresolved. |
| Hypnopet | Empathic therapeutic behavior and deliberate hypnotic horn; healing 100. | Mental relief is not necessarily bodily restore. Use appropriate authored status/removal/behavior mapping; no evidence establishes automatic healing on ally injury. Guaranteed healing trait cannot simply disappear. |
| Figzy | Protective temperament; behavior intervenes for distressed minds. | Behavior and deliberate support, unless source authoring explicitly establishes automatic trigger. Do not widen ally-harmed back to ambiguous distress. |
| Imprit | Constant flame fed by oils, fire-retardant fur; volatile 15. | Explicit physiological protection and authored flame capabilities. Optional reaction remains unbuilt; contact flame and injury-triggered release are not automatically equivalent. |
| Venemist | Expels corrosive mist; volatile 20. | Deliberate emission is supported. Optional reaction timing/recipient needs explicit definition; do not infer automatic toxic aura. |

Other ratified species (Akinza, Avilily, Chromocat, Drilltail, Dromeus, Ectoghoul, Foromeer, Frackworm, Graviclaw, Hippochamp, Kosanos, Luceras, Newtapede, Smokat, Vespersyn, Thirstaserp, Tizzie) were screened for explicit automatic defense/response needs. Their descriptions/behavior did not establish a necessary additional trigger. This is not whole-species approval: hypnosis reception, controlled phasing, projection/summoning, remote gravity, environmental effects, and other capabilities still need their own semantic migration review.

Avilily's saliva acting on contact illustrates a distinction: a delivered substance affecting its recipient is not necessarily a creature-level contact passive. Do not duplicate the saliva's application as both a delivered effect and an independent automatic retaliation.

## Exact old trait inventory relevant to reaction scope

| Trait | Species and current chance |
|---|---|
| volatile | Bioflim 20%, Codazzo 20%, Imprit 15%, Neph 100%, Venemist 20%, Voltish 30% |
| reflective | Crystorn 25% |
| dormant | Terragoyle 40% |

These are authored template percentages, not sample-generation measurements.

Registry wording:
- volatile: Releases a dangerous reaction when struck.
- reflective: Energy directed at it returns to its source.
- dormant: Suspends vital functions until conditions are safe or a trigger wakes it.

Do not preserve the percentages by blindly changing labels. Each optional power needs a complete coherent capability choice; a guaranteed power such as Neph's needs a deliberate retained/revised design.

## Concrete event checks

1. A contacting hit is fully blocked: contact can occur; harmed does not. This fits the agreed distinction.
2. A ranged elemental contribution causes harm without physical contact: harmed can occur without contact. Games define concrete contact from delivery.
3. An environmental hazard causes harm: self effects can resolve; attacker-directed effects have no recipient when the event supplies none. Do not fabricate an attacker or cancel unrelated self effects.
4. An ally suffers harm: ally-harmed supplies that ally, not its attacker, under the ratified mapping. This intentionally does not encode retaliation against an ally's attacker.
5. An ally becomes frightened without suffering harm: ally-harmed does not occur. Existing therapeutic behavior must not be silently forced into this narrower event.
6. Reflection: none of these trigger names defines how to copy/redirect an incoming capability. Do not use trigger changes to sneak reflection back in.
7. Ongoing status harm and retaliation loops: games own event attribution, application frequency and reaction scheduling. The contract must explicitly prevent implementers from assuming an unrestricted recursive reaction loop; no new creature trigger/condition language is proposed here.

The cases above are logical walkthroughs, not executed combat tests. No runtime resolver for the new schema has been implemented.

## Recommendations

Resolved after review: Hypnopet's therapeutic contribution uses remove with methods: [stabilizing]; bodily restore is not inferred from empathic-healing language. Status eligibility remains explicit per application. Exact ability grouping is still to be authored; no automatic ally-harmed response is implied.

Resolved after review: structured dormancy is deferred. Terragoyle retains its hibernation behavior in prose; the old dormant trait gets no boolean/status/action replacement now. Earlier requests below to resolve a structured home are superseded until a concrete behavior warrants it.

- Keep the three agreed triggers; no new pre-harm, distress, wake, or prediction event at this stage.
- Preserve deliberate defenses and continuous processes in their respective collections.
- Resolve Crystorn's optional reflective power explicitly before migration. Recommendation: omit reflection in newly designed Crystorns unless a supported reflection capability is deliberately approved; preserve historical records. This is a proposal, not authorization to silently remove it.
- Author the six volatile cases individually; do not equate when struck with harmed or unrestricted contact without deciding the mechanism.
- Resolve dormant behavior's data home without turning creature lifecycle into a combat condition language.
- Preserve Hypnopet's defining therapeutic ability through an explicit mapping; the new restore definition intentionally does not mean all forms of healing.
- Retain reaction timing/loop handling as an explicit game integration responsibility. Do not update games during this redesign.

Sources: [ratified list](../species-templates/RATIFIED.json), [trait registry](../species-templates/registries.json), and individual species templates in the same directory. This review is based on those source fields, not inferred generated creatures.
