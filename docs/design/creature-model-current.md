# Creature model: current agreed contract

Updated 2026-09-21. This document supersedes conflicting proposals and chronological notes in this directory. The implementation is available through `@xalians/content/creature` and `@xalians/rules/generator/creature`. These are the redesigned model's entry points; the deployed games and canonical species bundle still use v4.

## Ownership and data structure

The species template describes physiology, attribute and temperament bands, guaranteed capabilities, and mechanism permissions. The generated creature contains resolved facts, four actions, automatic passives, and one signature reference. Encounter state belongs to games, including current injuries, status applications, targets, interruption, expiry, and action availability.

```text
Species                         Generated creature
schemaVersion: 5.0.0             id / provenance / appearance (release envelope)
key / name / nameOrigin          species
element                         element
homePlanet / generatorPlanets
lore
physiology                      physiology (resolved measurements and ratings)
attributes: numeric bands       attributes: ratings
temperament: numeric bands      temperament: values
signature: {type, key}           signature: {type, key}
actions: guaranteed definitions actions: exactly four resolved actions
passives: guaranteed definitions passives: automatic capabilities
mechanisms: permitted domains   (generation permissions are not copied)
```

- One species element. An ability has an optional element classification; omission means unclassified. No secondary-element roll, affinity strength, automatic adjacency permission, or effect-level element override.
- Retire `traits`, `archetype`, `archetypeWeights`, `physiology.corporeality`, template `instruments`, `conduits`, and `actionPool`. They are rejected by the new schema.
- Keep anatomy, composition, body plan, covering, measurements, lifespan, chirality, diet, communication, respiration, environmental tolerance, capabilities and senses.
- Innate protection is `physiology.protections[]`. Persistent wall/opening traversal is `physiology.traversal[]` (`phase` / `seep`). Neither is inferred from composition or element.
- Attributes, graded senses and capabilities use nonnegative open-ended ratings. Zero means absence where appropriate. Reference benchmarks stay stable as new species appear; 100 is not a ceiling, percentile or physical ratio.
- The agreed references are 0 absent, 25 limited, 50 standard reference, 75 strong, 100 exceptional, with values above 100 allowed. [Rating guidance](creature-rating-benchmarks.md) and the shared `benchmarks.ts` catalog define field-specific authoring anchors. These are not automatically applied game formulas.
- Temperament's five axes remain bounded 0–100 and independently authored. Physical measurements retain units. No trait/archetype nudges.
- `lowlight` joins the special senses. It does not grant zero-light vision, heat sensing, or a combat bonus.

## Actions, passives and signature

`actions[]` are deliberate choices. `passives[]` are automatic processes. They share effect vocabulary, not menu placement.

Every individual has four actions. Guaranteed actions occupy their slots first; generation fills the remaining slots with distinct ordinary actions. Pure support is allowed. A passive signature consumes no action slot. There is no passive quota or random bonus passive draw.

`signature: {type: "action" | "passive", key}` references exactly one guaranteed definition. Its structure is fixed for the species: name, instrument, element, activation, delivery, recipients, spatial properties, timing, effects, likelihood and dependencies. Only explicitly authored numeric output bands vary.

Ordinary actions can share a mechanism. Different names, descriptions, local IDs or intensity alone do not justify another slot. Delivery, range, geometry, timing, likelihood and actual effect structure can distinguish actions. Effect ordering carries no execution priority. Dependencies are compared by meaning, not local IDs.

## Ability fields

| Field | Meaning / catalog |
|---|---|
| `key`, `name`, `description` | Local identity and presentation, not permission keys |
| `instrument` | Registered anatomy part or channel; physical parts must exist in anatomy |
| `element?` | Optional registered classification of the ability |
| `activation.continuity` | `discrete` or `ongoing` |
| `activation.trigger?` | Automatic `contact`, `harmed`, or `ally-harmed` |
| `timing.preparation` | `immediate`, `brief`, `prolonged` |
| `timing.recovery` | `repeatable`, `brief`, `prolonged` |
| `delivery.mode` | `contact`, `projectile`, `stream`, `pulse`, `field`, `signal`, `self` |
| `delivery.approach` | `stationary` or `closing`; permitted relationships belong to the source mechanism |
| `delivery.reception?` | `visual` / `auditory` requirement on a signal; absence adds no sensory requirement |
| `targeting[]` | Permitted selection of `self` / `other`; not simultaneous targets |
| `spatial.range?` | `contact`, `short`, `medium`, `long`; self delivery omits it |
| `spatial.area?` | Shape, extent, anchor and lifetime, only when an effect addresses area |
| `effects[]` | All inherent outcomes, always present |

Actions have timing and no automatic trigger. Discrete passives have timing and a trigger. Ongoing passives omit both. Do not add maintained/continuous/suppressible modes or a general condition language.

Triggers supply `target`: the other contact participant, the attacker responsible for actual harm, or the harmed ally, respectively. `self` is always the performer/passive owner. If environmental harm has no attacker, there is no fabricated target; independent self effects can still operate. Games schedule events and prevent reaction loops.

## Effect fields

Every effect has a local `key`, `type`, `recipient`, `onset`, `persistence`, `likelihood`, and optional `duration` / `requires` where appropriate.

| `type` | Specific fields and meaning |
|---|---|
| `harm` | `mechanism`: impact/cutting/piercing/compression/elemental; required `intensity` |
| `restore` | Bodily repair; required `intensity`; no generic resource/aspect |
| `protect` | Direct prevention of harm; required `intensity`; no block/deflect method split |
| `displace` | `direction`: toward/away relative to performer; required force `intensity`, not distance |
| `status` | Named `status`, `removable[]`, optional `intensity`; protection/function/bound payload where applicable |
| `remove` | `methods[]`; no strength or universal negative-status removal |

Retire `kind`, `emphasis`, primary/secondary ordering, direct `restrain`, enhance/suppress, transfer, reveal, resource meters, and effect-count/optional-effect rolls. Restraining applies `status: restrained`. Draining is harm plus dependent restoration. A scan is not granted a universal standalone effect; ordinary senses, `revealed`, and `marked` cover the agreed cases.

`recipient` is `target`, `self`, or `area`. `onset` is instant/gradual. `likelihood` is consistent/likely/occasional, mapped to actual probabilities by games. A move that can burn always retains its burning effect; an unsuccessful status application is an encounter outcome, not a missing generated capability.

`requires` names one other independent effect's success. No chains, cycles, formulas, proportional transfer, or ordering assumptions. Same-recipient dependencies resolve per recipient. A dependent self outcome occurs once per application when at least one qualifying prerequisite succeeds. Delivery landing is distinct from causing harm: elemental immunity may prevent harm without preventing an independent burning application. Do not make burning depend on damage merely to express contact.

## Areas and persistence

- Select one target for a directed action. No free empty-point selection or multi-target election.
- Area shapes: line/cone/radial/sweep; extents: small/medium/large.
- Anchors: self/target/location. Location is the point established by the targeted delivery. Line, cone and sweep originate at self and use the target for direction.
- Area exposure includes everyone geometrically reached. No ally filter, exclusion list or selective-area field. Actual immunity and application outcomes remain separate.
- Target effects address the selected target; area effects address the geometry; self effects address the performer.
- Area lifetime is separate from status lifetime. `persistence` is resolved/sustained/lingering; lingering requires brief/prolonged `duration`.
- A status is sustained or lingering. Sustained statuses require `bound: source | area`. Source means ongoing performer operation. Area means a continuing area and continued presence inside it; it may outlast the original performer operation. Lingering statuses carry their own duration and omit bound.
- Direct ongoing work stops when the process stops. A removable applied condition is represented by a status. Do not count the same repair/protection twice.
- Removal ends an application, not its generating source or already incurred damage. Reapplication timing belongs to the game.

## Statuses, intensity and protections

The catalog contains burning, overheated, chilled, corroding, poisoned, slowed, restrained, pinned, frozen, buried, blinded, deafened, disoriented, frightened, entranced, sedated, stunned, mending, shielded, reinforced, protected, stimulated, focused, concealed, revealed, marked, phased and dispersed.

Every status has default intensity 50. An omitted override means that default, not an unknown value or a lore-parsing task. Explicit overrides require a source reason and should normally use a range. Intensity is a positive integer without a semantic ceiling. Games may treat a condition as binary; intensity does not implicitly change likelihood, duration, removal eligibility or protection degree. Direct-effect intensity includes the performer's baseline contribution; games should not automatically multiply that baseline again.

Burning has elemental fire harm. Corroding has elemental chemical harm and is not restricted to metal. Poisoned describes toxic dysfunction; if a game models its harm, that harm is chemical, but damage is not mandatory. Frozen is one status, not separate frost/ice encasement variants. Extinguishing burning ends the condition without creating a residual burned status.

Both innate protection and the `protected` status use:

```json
{"type":"status","status":"burning","degree":"immune"}
{"type":"harm","mechanism":"elemental","element":"fire","degree":"resistant"}
{"type":"harm","mechanism":"impact","degree":"resistant"}
{"type":"displace","degree":"immune"}
```

These are protection descriptors, not whole effects or abilities. The only degrees are resistant and immune. Elemental harm immunity is not burning immunity or impact immunity. Status resistance affects application, not the intensity/duration of a successful application.

Keep independently sourced applications and lifetimes. The strongest active degree for an identical protection scope applies without adding degrees. Temporary immunity does not overwrite, pause or refresh underlying resistance. When immunity ends, surviving resistance becomes effective again. This rule does not prescribe universal stacking for all other statuses.

Removal matches explicit method intersections: cooling, smothering, warming, cleansing, detoxifying, freeing, stabilizing, disrupting. Games decide how many matching applications to remove. A water attack does not cleanse burning unless its definition actually includes the corresponding removal effect.

`stimulated` requires a named function. `protected` requires a protection descriptor. `phased` grants phase traversal; `dispersed` grants seep traversal. These do not implicitly grant immunity or concealment. Existing innate and temporary traversal grants coexist.

## Species permissions and constructive generation

Mechanisms describe source-supported processes, not a whitelist of named finished moves. Each mechanism owns its instrument, optional element, targeting, continuity/timing domains, delivery-specific range/area permissions, and inherent effects. An effect's recipient is a scalar or a delivery-keyed set of permitted recipients. Likelihood is an authored domain; intensity is a value/band. Every semantic value comes from the shared catalog.

The compiler partitions by delivery and whether/which first effect uses area. It groups each independent effect with its dependents so recipient choices obey `requires` constructively; other categorical domains remain factored. It validates supported field relationships at authoring time, checks physical source anatomy and gaze support across the full sight band, and proves enough distinct actions can be selected. Voice does not imply vocal communication or respiration. At runtime it selects unused structure indices directly, removes equivalent representations across mechanisms, and then rolls output. It does not enumerate a species' entire move universe, evaluate lore per individual, or generate/reject/retry creatures.

The current validator's domain proof relies on the bounded schema: recipient groups enforce dependency relationships; remaining variable constraints span at most two dimensions within a recipient partition. Future higher-order relationships require extending that proof and its tests. This is not a general predicate engine. Overlapping mechanisms preserve authored sampling weight; selection is not advertised as uniform over unique semantic structures. Effect alias matching can be combinatorially expensive for many overlapping effect entries; consolidate redundant authoring and benchmark representative canonical species before release. The [relationship audit](creature-relationship-audit.md) records checked cases, fixes and remaining boundaries.

The full authoring audit remains necessary once per species. A schema cannot infer from prose that a secretion really repairs tissue or that a mind channel has been established. Authors translate that evidence into explicit permissions; generated individuals need no such review. Absence of a written restriction is not authority to invent any substance or power.

Run the compiler:

```sh
npm run check:creature-model -- path/to/species.json
npm run check:creature-model -- packages/content/src/creature/fixtures/support-species.json --example
```

The fixture is deliberately noncanonical. Its 14 possible ordinary structures come from compact permissions, not 14 authored moves.

## Species decisions retained for the migration

- Bioflim: actual shell regrowth is ongoing restoration plus separately justified innate protection.
- Hypnopet: therapeutic hypnosis supports stabilizing removal; do not infer bodily restoration.
- Ectoghoul: evidenced persistent spectral traversal must survive removal of corporeality.
- Smokat: material smoke/dispersal does not imply passing through sealed solid walls.
- Vespersyn: projections use the swarm channel; no universal summon effect, independent life, creature records or separate resource bars.
- Crystorn: optional reflection is retired. Do not substitute another power to preserve the label.
- Retire speculative volatile retaliation, foresight, and territorial/pack/solitary bonuses. Preserve source-supported behaviors in prose.
- Dormancy, generic illumination/emission, true reflection, precognition, generic resource transfer and unrestricted conditional biology are deferred. Do not restore them under renamed fields.
- Unsupported game capabilities may be explicitly unavailable; game adaptation is outside this redesign implementation pass.

## Implementation status and remaining work

Implemented and tested: strict redesigned species/ability/record schemas; updated semantic catalog; mechanism compiler; constructive four-action selection; fixed signature output rolling; resolved physiology/attributes/temperament generation; protection/removal helpers; authoring validation CLI.

Still required before a canonical v5 release:

1. Re-author and audit all 32 canonical species against this contract. The v4 complete-move pools cannot be mechanically renamed into mechanism permissions. Preserve the species decisions above and review source-supported breadth, not just old examples.
2. Apply the shared rating/output references to each species' justified bands during the eventual calibration audit. The reference ladder and descriptions for the 20 performance fields and four direct outputs are now recorded; canonical species calibration remains pending. Default status intensity is 50.
3. Review any evidenced conditional physiology during species authoring; the 32-species prose/data screening did not establish a need for a general subsystem. Ongoing-passive target acquisition is settled: `targeting: [self]`, no range, and any area uses `anchor: self` and `shape: radial`. Directed automatic responses use event triggers; deliberately maintained connections are actions.
4. Review source-supported species vocabulary during migration. [Compositional naming](creature-ability-naming.md) now runs after generation, uses a shared structural fallback, preserves guaranteed names, and distinguishes collisions without changing abilities. Naming coverage no longer depends on a fixed move list.
5. Wire canonical content bundling and the redesigned entry point into a frozen generation release, including the new catalog and compiler. Then run replay and full-species coverage/scale checks. Draft generation intentionally does not claim a canonical release ID.
6. Update games separately after the ability redesign is complete. Existing game imports have not changed.

Do not call these migration/release gates completed because unit tests on a hypothetical species pass. Conversely, do not re-open settled concepts merely because canonical content migration remains.

Work order agreed after this checkpoint: finish shared benchmarks, compositional naming, representative relationship checks and release integration before migrating species. Use hypothetical or representative design fixtures for those checks; do not re-author the canonical roster early. Freeze the actual canonical release after migration and full-roster validation.

### Verification of this implementation checkpoint

Content: 85 tests passed. Rules: 349 tests passed. Both TypeScript checks passed. The redesigned authoring CLI and updated skill validation passed. Existing bundle freshness and generation-release integrity checks passed.

The full workspace run also passed the API suite; the web suite had one asynchronous portrait-loading timeout (`xalianSvg.test.js`). That six-test file passed in isolation without changes. No game files were changed. These results do not replace canonical v5 species coverage or release replay, which are still pending.
