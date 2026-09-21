# Consolidated creature model proposal

> Historical design discussion / audit evidence. The [current contract](creature-model-current.md) is authoritative for the redesigned model and its implementation status. Conflicting proposals below are superseded; these notes are not production schemas.

Date: 2026-09-18. Status: design review, not an implemented or released schema.

Migration policy update: the user explicitly permits a breaking redesign without preserving historical test records or backward compatibility. This overrides preservation requirements elsewhere in this working document. New-model generation remains reproducible; do not retain old schema readers or semantics solely for historical data. Crystorn's optional reflective power is approved for removal in the redesign.

This document consolidates the decisions in [the checklist](creature-redesign-checklist.md). It supersedes older proposals only where the user has ratified a replacement. The checklist decision log remains the record of those decisions.

2026-09-18 update: resource ownership is resolved for the first version. Omit deplete/replenish and express draining as harm with dependent restore. Restore means bodily repair and has no aspect field. Games map repair to health or their other bodily injury systems. JSON examples reflect both decisions. Remaining references below to resource-effect proposals describe historical review context, not the current recommendation. Reveal is under review next.

[Worked JSON examples](creature-model-examples.json) contain one whole proposed creature shape, eight standalone actions, two passives, and a protection example. These are hypothetical design examples, not new canonical creatures or production fixtures. Numbers demonstrate field placement, not approved calibration. PROPOSED provenance values do not identify a real release.

## 1. Three different data layers

| Layer | Owns | Does not own |
|---|---|---|
| Species template and reusable catalogs | Species facts, permitted mechanisms, guaranteed capabilities, compatible optional choices, numeric bands and generation relationships | Individual encounter outcomes |
| Generated creature record | Resolved physiology, attributes, identity, actions, passives, signature reference, provenance | Generation pools, current injuries, applied statuses, current cooldowns |
| Game encounter state | Targets, delivery outcomes, damage, resource amounts, applied status instances and their sources, interruption and expiry | Rewriting the canonical creature |

Authoring review happens per reusable species/capability definition. Shared compilation verifies all permitted generation paths before use. No generate-evaluate-retry loop or human review of each individual.

## 2. Whole creature record

Actual field paths in the proposed record:

```text
creature
├── id
├── species
├── provenance
│   ├── seed
│   ├── generatorVersion
│   ├── schemaVersion
│   ├── releaseId
│   ├── generatedAt
│   ├── origin
│   ├── serial
│   └── profile
├── element
├── physiology
│   ├── composition { primary, secondary? }
│   ├── bodyPlan
│   ├── anatomy[]
│   ├── covering
│   ├── heightCm
│   ├── weightKg
│   ├── lifespan
│   ├── genome { chirality }
│   ├── diet
│   ├── communication[]
│   ├── breathes[]
│   ├── environmentalTolerance { ambientMedia[], temperatureC }
│   ├── capabilities { flight, swim, burrow, climb, sprint, leap, manipulation }
│   ├── traversal[] { phase, seep }
│   ├── senses { sight, hearing, smell, special[] }
│   └── protections[]
├── attributes
│   └── strength, vitality, endurance, agility, reflex,
│       intelligence, willpower, instinct, charisma, resilience
├── temperament { boldness, curiosity, energy, aggression, sociability }
├── appearance { finish }
├── signature { type, key }
├── actions[]
└── passives[]
```

Question marks mark optional fields, not literal key characters. Root element as a string and signature.type replacing signature.kind are proposed concrete spellings. The underlying single element and signature reference semantics are agreed. Unchanged physiology fields are retained provisionally, not claimed newly ratified by this display. Composition.secondary is a second body material, not a secondary element.

- No independently rolled traits collection. Derived summaries live outside authoritative records.
- Missing trait information must be migrated deliberately; removing traits before replacing unique information would lose species identity.
- Bodily facts belong in physiology, deliberate processes in actions, automatic processes in passives.
- Exactly one signature references a guaranteed action or passive; do not copy the same definition into a signature object.
- Action allocation ratified 2026-09-21: exactly four actions per individual, including all guaranteed actions. Generate four minus the guaranteed action count as distinct ordinary actions. Passives are separate; a passive signature does not consume an action slot. Validate sufficient distinct configurations and at most four guaranteed actions during authoring. Retire per-species actionPool.count; optional-passive allocation remains open.
- Pure support is valid. The example creature has restorative/protective actions and automatic self-repair, with no harm effect.
- General performance ratings are nonnegative and open-ended, with fixed shared benchmarks still to be authored. Temperament remains bounded. Measurements retain units.
- Canonical provenance continues to pin a complete immutable generation release plus original inputs. No new release/version number is assigned by these examples.

## 3. One action or passive

Physiology revision ratified 2026-09-19: retire corporeality from the forthcoming creature and species schemas and its associated registry. Composition owns body material and explicit protections own resistance/immunity. Do not infer wall traversal or immunity from spectral/gas composition or ghost identity. This supersedes earlier proposals to redefine corporeal or retain non-corporeal as a bundle of powers. Audit consumers and existing species before coordinated removal; do not erase unique traversal information.

Special-sense addition ratified 2026-09-19: physiology.senses.special may include the shared registry key lowlight for vision adapted to dim light. General acuity remains sight. No inferred night activity, zero-light vision, thermal sensing, or combat bonus; no separate low-light numeric rating.

Traversal keys ratified 2026-09-19: phase means passage through solid matter without creating an opening; seep means passage through an existing opening by flowing or dispersing. These are categorical permissions, not output ratings, and do not automatically grant harm/status protection or concealment. Physiology.traversal[] records persistently available permissions. A permission available only during an activated capability must not be recorded as permanent. Ectoghoul supports phase; Smokat's exact seep permission requires mechanism-based authoring. Temporary grants use the agreed statuses phased (phase) and dispersed (seep), applied through existing status effects and lifetime rules. See status-intensity-decisions.md for catalog encoding and derived implementation guidance. No generic transformation effect is added.

| Field | Meaning and status |
|---|---|
| key, name, description | Stable local identity, display name, authored physical explanation |
| instrument | Body part or channel implementing the capability; existing vocabulary |
| element? | Optional elemental classification from the element catalog; absent means no elemental classification |
| activation.continuity | discrete or ongoing |
| activation.trigger? | For automatic event responses: contact, harmed, ally-harmed; each supplies the defined target |
| timing.preparation / recovery | Existing categories retained; ongoing passives omit use timing |
| delivery.mode / approach | How the capability is delivered, separate from its effects |
| delivery.reception? | Optional visual or auditory sensory requirement for a signal. Omission means no sensory reception requirement, not mental or psychic classification |
| targeting[] | Nonempty list of self/other; both values permit either selection, not simultaneous recipients. Effect target resolves to the selection; effect self always resolves to performer |
| spatial.range? | contact, short, medium, long; no remote range for self-only delivery |
| spatial.area? | shape, extent, anchor; independent area persistence/duration |
| effects[] | Keyed outcomes, each with its own applicable details |

Actions and passives share descriptive components but remain separate collections. A triggered passive does not become a selectable action. No universal turn system, optional suppression framework, or arbitrary event conditions are introduced.

2026-09-18 trigger decisions: the initial catalog is contact, harmed, ally-harmed. Harmed replaces incoming-harm and means actual harm suffered, not merely attempted or landed delivery. Full prevention blocks this trigger; contact can still occur. Ally-harmed replaces the ambiguous ally-distress. Ratified event-supplied target replaces instigator: contact supplies the other contact participant, harmed supplies the attacker if present, and ally-harmed supplies the harmed ally. Recipient self always identifies the passive owner. Without an attacker, target-directed effects cannot apply but self-directed effects remain eligible. No target is fabricated for an environmental event lacking an attacker. The [species trigger review](creature-trigger-species-review.md) records 32 source walkthroughs and unresolved old reaction traits; no additional trigger is recommended by that pass.

### Area fields

Agreed anchors: self follows the performer; target follows the selected recipient; location stays fixed. Impact is not an anchor.

Area selectivity retired 2026-09-20: omit selectivity entirely, including the proposed relocation under area. An area exposes every recipient it reaches through game geometry and obstacles, without performer-selected exemptions or automatic allegiance filtering. Protections, likelihood, and effect dependencies still resolve separately for each exposed recipient. Explicit selection of multiple targets is deferred. The single selected target continues to establish aim; it does not select which surrounding occupants are spared. These semantics also apply to beneficial area effects and self-centered areas; no automatic exemption is inferred for the performer if the geometry exposes it.

Targeted-area boundary ratified 2026-09-20: directed actions, including area actions, use one selected target from the existing self/other relations. There is no independently selected empty location or free-aim direction in the first version. Radial splash is centered at the target-established impact point; cone and line originate at the performer and aim toward the selected target; sweep uses that target to establish its direction. A self-centered burst/aura uses self. All areas have a definite origin. Location means a fixed point established by the targeted action, not a new selectable target category; target and self anchors follow their respective participants. Geometry and recipient scope stay separate: effects explicitly address target, area, or self, and area can include the selected target when it lies inside. Games resolve exact geometry and delivery outcomes. This does not require a player to select targets for passives: existing trigger-supplied participants and self-centered passive behavior remain unchanged, and missing event participants are not fabricated.

Proposed field placement:
- spatial.area.persistence: resolved, sustained, or lingering.
- spatial.area.duration: brief or prolonged for lingering areas.
- Effects maintain their own persistence/duration.

A lingering puddle and a coating deposited on someone are distinct. Removing the coating does not remove the puddle.

**Ratified encoding (2026-09-18):** sustained status effects explicitly declare effects[].bound as source or area. Source means dependence on continued performer operation. Area means dependence on the area existing and the recipient remaining inside it, even if the original action has ended. Lingering statuses omit bound and have their own duration. This refines the earlier performer-only meaning of sustained. The new compiler must distinguish source-bound from area-bound statuses rather than requiring an ongoing performer for both. Direct ongoing effects do not acquire a status-only bound field.

## 4. Effect fields

| Field | Meaning |
|---|---|
| key | Unique within the containing ability |
| type | Outcome category; replaces kind |
| recipient | Whose outcome this is: target, self, area; a triggered passive uses the event-supplied target |
| onset | instant or gradual |
| persistence | resolved, sustained, lingering |
| duration? | brief or prolonged where the contribution can linger |
| likelihood | consistent, likely, occasional; games resolve actual probabilities |
| intensity? | Present only where the effect/status definition defines a magnitude |
| requires? | Key of one independent effect in the same ability |
| Type-specific fields | mechanism, aspect, status, removable, methods, direction, resource, protection, etc. |

The shared fields are a proposed consolidation of existing structures. Applicability must be enforced per type; do not treat every field as freely optional.

### Outcome categories

| type | Purpose | Remaining payload work |
|---|---|---|
| harm | Direct damaging contribution | Ratified mechanism catalog; numerical benchmarks open |
| restore | Bodily repair, including unusual materials | No aspect field; games map repair to health/injury systems |
| protect | Prevent incoming harm as it occurs | No method or against fields. Intensity is protective capacity, not a percentage. Reflection deferred; explicitly authored retaliation is separate |
| status | Apply a named condition | Status-specific magnitude and optional payload matrix |
| remove | Remove conditions matching declared methods | No removal-strength rating or universal negative-status wipe |
| displace | Move a recipient | Only toward/away, relative to the performer; intensity is pushing/pulling strength, not distance. No redirect or remote center in the first version. Numerical benchmarks remain open |
| reveal | Omitted from first version | Ordinary detection uses senses; abilities may explicitly apply revealed/marked; standalone scanning/diagnosis/intent-reading deferred |
| deplete / replenish | Omitted from first version | Draining uses harm with dependent restore; future resources require a defined shared model |

Remove restrain, enhance, suppress, transfer and reveal as effect types; omit proposed deplete/replenish from the first version. Restraint and modifications of functioning use status application. Draining uses harm with dependent restore. Ordinary detection uses senses, without automatically applying revealed. Detection paired with another useful contribution is an initial catalog guideline, not a permanent schema requirement.

No primary/secondary emphasis and no ability-wide intensity. An array position does not establish importance, timing, or dependence.

### Intensity

The value is the individual's resolved baseline output, not a base move number awaiting automatic multiplication by attributes. Authored generation may correlate strength and a shove, without repeating that calculation in each game.

Discrete direct output is per occurrence; ongoing direct output is a rate. Status definitions determine the meaning of their own intensity. Categorical protection degree remains separate from intensity.

**Scale ratified 2026-09-18:** effect intensity is a positive integer with no upper ceiling. Zero is excluded; 100 is not a maximum or percentage. Ratings do not imply linear ratios. Direct effects retain their defined magnitude requirements; remove does not acquire a strength value.

**Current status policy:** every status catalog entry supplies a default intensity of 50. Every status-applying effect may use that default by omitting intensity or provide an authored positive-integer override. Omitted and explicit default are equivalent. Presence of an override is not proof the prose specified a number. This supersedes all previous selective inclusion/exclusion decisions.

The generation release identifies the status catalog used for default resolution. Games map the catalog-defined magnitude to their own quantities and may ignore it for binary conditions. Intensity does not automatically change likelihood, duration, removal behavior, or resistant/immune degree. No runtime prose interpretation is required.

The [current contract and proposed per-status meanings](status-intensity-decisions.md) cover all 26 statuses. Detailed descriptions and concrete authoring benchmarks still require review; the default-and-override contract is ratified.

## 5. Elements, mechanisms, statuses, and protection

Each species has one element inherited by individuals. Remove affinity scores and secondary-element rolls. Abilities may use another element only through explicit authored species permissions.

Harm mechanisms are impact, cutting, piercing, compression, elemental. Elemental harm requires ability.element. Do not infer impact from projectile delivery, or infer burning from fire classification.

Protection descriptors reuse existing vocabularies:
- type: status with status and degree.
- type: harm with mechanism and degree.
- type: displace with degree, for displacement protection; no additional anchoring strength or separate status.
- For elemental harm protection, also element.
- degree: resistant or immune. Absence means ordinary susceptibility.

Physiology.protections[] owns intrinsic protection. A temporary status can carry the same descriptor in its protection payload. The examples use proposed status name protected instead of resistant; final naming/temporary-immunity policy should be explicitly closed before migration.

There is no separate exposure catalog. Harm immunity does not cancel all effects of an element-classified ability. Material and element do not automatically grant immunity.

Ratified interpretation: harm resistance reduces harm; status resistance makes application harder, without also reducing duration/intensity. Games choose numerical reductions. Immunity prevents the scoped outcome.

Status harm classification ratified 2026-09-19: the status catalog explicitly classifies ongoing harm with the existing mechanism/element vocabulary. Burning's harm is elemental fire harm, regardless of the applying ability's element. Games implementing that harm use the classification for harm protection matching. Fire-harm protection does not itself prevent or remove burning; burning-status protection governs application. Do not add a duplicate direct harm effect to an ability merely to classify its status's later harm. See status-intensity-decisions.md for the proposed catalog encoding; other damaging statuses still require individual review.

Protection matching can be shared code. Encounter resolution and numeric balancing remain game-owned. Overlap policy ratified 2026-09-18: retain each source/application independently and use the strongest valid degree for an identical scope. A new immunity does not erase, refresh, or pause underlying resistance. Resistance becomes effective again after immunity ends only if its own duration/source is still valid. No summing protection degrees. Individual applications belong in encounter state, not permanent creature records. This does not establish stacking rules for other statuses.

## 6. Delivery, dependencies, and removal

Delivery reaching a recipient and an effect producing an outcome are distinct.

A hit can be immune to impact but still apply another contribution. A missed fireball does not reach the recipient; its effects need no individual harm dependency to express that. Area delivery may independently reach recipients.

requires means the prerequisite produced its intended outcome. Depletion must remove some resource to unlock dependent replenishment. References stay in the same ability; at most one prerequisite per effect; no chains, cycles, or formulas.

For multiple recipients:
- A same-recipient dependency requires prerequisite success on that recipient.
- A dependent self effect becomes eligible once per application if at least one target satisfies its prerequisite.
- No inferred multiplier by recipient count or depleted quantity.
- Other cross-recipient arrangements are not covered by this first-version rule; reject unsupported authoring rather than guess.

Removing a status ends its application, not automatically the source. Interrupting a source ends its dependent statuses. Games schedule reapplication; ongoing operation does not make removal meaningless by automatically reinstating the condition.

Status application identity ratified 2026-09-18: keep individual applications distinguishable by source, lifetime, and removal methods. Games decide how multiple burning/mending/etc. contributions combine; protection's strongest-degree rule is not a universal status stacking rule. No per-effect stacking field. New applications do not silently erase earlier ones under the shared representation.

Routine recipient material/species allowlists are replaced by default susceptibility and explicit recipient protection. Reception decision ratified 2026-09-18: move the narrow sensory requirement to optional delivery.reception for signals, with registered values visual and auditory. Omission means no sensory reception requirement, not a mental/psychic classification. A visible or audible manifestation alone does not warrant this field: the recipient must need to perceive it for delivery to work. Games resolve reception as part of delivery success; it does not grant universal status immunity. No general predicate language is introduced.

## 7. Worked examples and expected reading

The JSON file uses complete capability objects in this proposed draft (subject to the explicitly marked open fields), not effect fragments disguised as creatures.

| JSON location / key | Demonstrates | Expected reading |
|---|---|---|
| creature | Whole hypothetical support individual | Signature restoration guaranteed; no damaging action is required; automatic repair belongs in passives |
| standaloneActions: example-fireball | Multiple independent contributions | Impact/fire/burning resolve separately; no fake impact dependency for ignition |
| example-repair | Immediate restore plus mending | Two distinct repair contributions, not duplicate representation of the same work |
| example-cooling | Harm plus removal | Cooling can end compatible burning even while the action harms its recipient |
| example-grip | Sustained restraint | Applies restrained, not standalone restrain; cessation ends the maintained condition |
| example-coating | Temporary protection | Applied protected grants burning immunity; cleansing removes the coating, not innate physiology |
| example-puddle | Two lifetimes | Puddle can persist; corroding coating can persist after exit; removal is scoped to the application |
| example-field | Area-dependent benefit | Ratified bound: area; leaving/area expiry ends protection; ending original application need not remove an independent area |
| example-drain | Area prerequisite, self result | Any successful depletion unlocks one self replenishment; all immune targets unlock none |
| standalonePassives: example-regeneration | Continuous automatic process | Direct repair rate without an applied mending condition or selectable move |
| example-retaliation | Event response | Contact supplies the other participant as target; self remains the passive owner |
| protectionExample | Separate protections | Blocks burning and fire harm; reduces impact harm |

The JSON includes illustrative effects that are not permission grants to production species. Exact source evidence and compatible template pools remain an authoring task.

## 8. Species-template and catalog boundary

Instrument permission ownership audited 2026-09-21: retire independently authored top-level instruments and conduits in the coordinated migration. Preserve physiology.anatomy, the shared anatomy/channel instrument vocabulary, explicit mechanism/capability instrument-element relationships, and generated ability instrument. Derive any species index from ordinary mechanisms plus guaranteed actions/passives, without flattening it into generation permissions. Shared authoring compilation must validate physical prerequisites across full allowed domains and source-supported channels; signatures are not exempt. See instrument-permissions-audit.md for all 32 species and current consumer findings. No production fields have been removed yet.

Passive allocation ratified 2026-09-21: no slot quota or independent bonus-power rolls. Species-inherent automatic processes are guaranteed; optional passive presence follows explicitly authored physiology/mechanism variation. Do not make automatic processes disappear because an associated ordinary action was not selected. Authoring compilation must ensure correspondence across all allowed source variants. Passive signatures remain guaranteed and outside the four-action total. Concrete variation dependencies require supported cases, not speculative condition machinery.

Within-creature distinctness ratified 2026-09-20: multiple ordinary abilities may use the same mechanism when their functional configurations differ. Names, local IDs, prose, and output intensity alone do not distinguish a new ability; this also excludes intensity/cosmetic copies of the signature. Delivery, spatial properties, timing, effect content and application likelihood can distinguish configurations. Select unused valid configurations constructively before resolving output ratings and names, without generated-creature evaluation/retries or a per-species whitelist. Authoring compilation must establish sufficient distinct possibilities for permitted ability counts. See ability-distinctness-review.md for implementation considerations; exact canonicalization/sampling remains engineering work.

Recipient mapping accepted 2026-09-20: each template effect may use a fixed recipient or a delivery-keyed mapping to an existing recipient value or allowed recipient list. Resolve to a scalar in the generated effect. Choose coverage first; generate area geometry from the selected delivery's permissions if any effect resolves to area, otherwise omit area in this initial model. Validate complete branch coverage, whole-domain coherence, and area permissions at authoring time. An area permission table does not independently force area creation. See mechanism-recipient-example.md and mechanism-splash-example.md. The proposed single/area branch labels are superseded. No effect is omitted, and action targeting remains one selected self/other target.

Signature model ratified 2026-09-20: author one guaranteed signature with a fixed structure per species. Name, instrument/element, activation, delivery, targeting, range/area, timing, effects, dependencies, and status-application behavior remain the same across individuals. Explicit output ratings may vary within species-authored bands; fixed ratings remain appropriate when justified, and omitted status intensity still resolves to its catalog default. Signature likelihood categories do not randomly vary under this decision. This supersedes the proposed signature.mechanism reference that freely sampled categorical mechanism permissions. Ordinary abilities retain combinatorial mechanism-based generation. A deliberately authored signature is not a whitelist of ordinary moves. Keep its definition once among guaranteed capabilities; generated signature remains type/key pointing to the resolved action or passive. Exact species-template placement remains to be consolidated, without duplicating the definition.

Effect inclusion correction: include all effects inherent to the selected mechanism. Do not randomly omit burning from an authored fire-breath mechanism capable of ignition. Vary its application likelihood within authored categories instead. Retire the proposed effects.count and required/optional partition. Genuine configuration-dependent outcome differences must follow authored relationships; categorical delivery/spatial/parameter combination remains supported. This is not a return to a whitelist of complete moves. Encounter requires continues to demand actual prerequisite success, not merely successful delivery.

Temperament generation ratified 2026-09-19: species author ranges for boldness, curiosity, energy, aggression, and sociability on bounded 0-100 scales; generated individuals contain one resolved value for each. Remove automatic attribute-to-personality calculations and retired trait/archetype nudges. Use species lore to author appropriate variation, with the general preference for ranges rather than unwarranted fixed values. No per-individual interpretation or review is required. This replaces current generator temperament coupling, not the five temperament axes.

Architecture correction (2026-09-19): the user rejects species-specific whitelists of complete ordinary abilities. Species templates define permitted catalog values and codified relationships; the generator constructs valid combinations, including categorical variation. This supersedes the earlier fixed-configuration selection decision and the proposed guaranteed/pool/count layout where pool contains complete prewritten moves. Guaranteed identity remains required, but its exact representation is not resolved by this correction. See [species ability authoring coverage](species-ability-authoring-coverage.md). Do not replace the whitelist with renamed complete-move recipes, arbitrary independent cross-products, or prose-only rules. Bounded constraint encoding and constructive sampling remain to be designed.

Current architecture decision (2026-09-18): no additional reusable ability-template/catalog layer. Species author supported combinations directly using the shared ability schema and registered vocabulary; generation selects and resolves those declarations. Earlier catalog-definition/reference/binding examples below or in linked documents are superseded proposals. Registry ownership governs vocabulary/semantics, not a requirement to catalogue every complete ability. Concrete species permission encoding is now under discussion.

Registry requirement clarified 2026-09-18: every controlled vocabulary value must have a shared definition; species cannot invent private delivery modes, effects, statuses, or other enum values. This does NOT mandate a shared catalog of complete ability compositions. The earlier mandatory catalog-first interpretation was incorrect and is withdrawn. Authored combinations are agreed, while their reuse/storage layer remains under discussion. The [Hippochamp example](catalog-species-worked-example.md) illustrates a proposed extra layer, not an approved requirement.

Do not duplicate a creature record into a template and add unconstrained random fields. The template must own:
- Fixed species identity and physiology, plus allowed variation bands.
- One guaranteed signature and any essential physiology/passives.
- Explicit coherent choices for optional actions, passives, and protections.
- Permitted instruments and elemental mechanisms.
- Shared generation decisions where two facts must covary.
- Approved intensity bands/relationships per effect.
- Status intensity may be omitted, a fixed positive integer, or an inclusive positive-integer range. Prefer a range when authoring an override unless lore specifically warrants a fixed value; omission uses the catalog default without random variation. Generated records contain a resolved number or omit the field, never a range.
- Constraints proven for every permitted roll and generation profile.

Exact pool keys and grouping remain open; the existing actionPool shape cannot simply be assumed to support optional passives and correlated protections. Do not publish a speculative template as production-ready.

Catalog ownership:
- Elements: one identity/classification vocabulary.
- Harm mechanisms: one list shared by effects and protection matching.
- Statuses: one list with meaning, intensity applicability, and status-specific payload rules.
- Removal methods: one list; per-application removable methods remain explicit.
- Capability definitions: reusable mechanisms/delivery/effect combinations.
- Naming families: lexical choices, separate from what capabilities do.
- Species permissions: which authored definitions/variants a species can produce.

Authoritative sources produce machine-readable exports and release snapshots. A new species should not require rewriting ordinary attacks' recipient allowlists.

## 9. Structural issues exposed by consolidation

Archetype retirement ratified 2026-09-19: remove the generated archetype object (key/favors) and proceed without the named archetype system. The user's original intent was individual variation, not a separate collectible identity. Species attribute bands and authored ability choices continue to provide variation. Retire archetypeWeights, the named archetype draw, favored-pair lookup, and archetype-specific temperament nudges in the coordinated migration; do not retain the same named system invisibly. No replacement build/profile engine is approved. Future output-derived labels can be non-authoritative summaries. Independent temperament generation remains under review because the current implementation also derives personality from attributes and retired traits.

These prevent calling the whole schema finished:

1. **Area dependence — resolved 2026-09-18:** sustained statuses explicitly use bound: source or area (section 3); compiler implementation remains pending.
2. **Resource ownership — resolved:** restore performs bodily restoration without aspect; draining uses harm with dependent restore. No generic resource system in this version.
3. **Triggers — resolved 2026-09-18:** fixed event-to-target mapping in section 3 replaces instigator. Runtime migration remains pending.
4. **Intensity:** finalize numerical bounds and each effect/status's meaning; protection degrees stay categorical.
5. **Trait retirement:** preserve every unique trait fact. Activity patterns, social behavior, and specialized sensing may need explicit homes; no catch-all traits replacement has been invented here.
6. **Protections:** close protected naming, temporary immunity policy, status-resistance interpretation, and overlap behavior.
7. **Targeting — resolved 2026-09-18:** use targeting as a nonempty list of self/other; no self-or-other token or additional creature/object/location classification. Location area anchors remain valid.
8. **Template selection:** define compatible optional passive/protection choices and correlations once, with compiler guarantees rather than retries.
9. **Catalog/source review:** review all production signatures, migration timing assumptions, support recipes, and lexical names. Old pattern delivery must not dictate effect type.
10. **Forward compatibility:** strict authoring and unsupported-capability game behavior need different contracts. Historical records retain historical interpretation.

Remaining review includes status-resistance interpretation, calibration, trait fact ownership, and concrete species-pool structure. Resource ownership, area binding, and trigger participants are settled.

## 10. Verification and migration boundary

This artifact is a readable proposal plus parseable examples, not a runtime schema. Example checks can establish internal references, absence of retired fields, the bounded dependency shape, and expected protection matching. They cannot establish canonical biological support or prove all future generation paths valid.

Implementation follows remaining decisions as a coordinated schema/generator/catalog/species migration. Preserve immutable archives and historical readers, freeze a new release, and run the appropriate compiler, generator, replay and build checks. No games are updated in this design task.
