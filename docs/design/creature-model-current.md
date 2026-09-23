# Creature model: current agreed contract

Updated 2026-09-23. This document supersedes conflicting proposals and chronological notes in this directory. The implementation is available through `@xalians/content/creature` and `@xalians/rules/generator/creature`. These are the redesigned model's entry points; the legacy public generator and bundled species remain v4.

Current implementation update, 2026-09-23: schema 5.1.0 and generator 0.8.0 are frozen as `generation-0.8.0-1`. Powerworks and Reclamation use this v5 canonical roster; the legacy public generator and its species bundle remain v4. Historical checkpoint paragraphs below describe the state when written, not the current game routing. The 32-species scale migration changed only measurement fields and resolution; archived earlier records keep their original representation.

## Canonical roster audit decisions

The [32-species representation audit](creature-roster-audit.md) found three source-backed questions after the fixture-based implementation checks: Neph's unignited fuel exposure, Yetimoth's route-blocking ice walls, and Avilily's paralysis. Paralysis is ratified and implemented as `paralyzed`. Unignited fuel exposure is explicitly deferred: preserve Neph's hydrogen emission in lore, with no mechanical fuel status, ignition interaction or inferred explosion. This deferral resolves the Neph migration blocker. Yetimoth's physical route-blocking walls are also explicitly deferred as lore-only for this version. Its ice armor and opponent freezing remain supported. The source-to-model questions identified by the roster audit are resolved at this version's scope; canonical species authoring can proceed. Earlier release-integration completion refers only to packaging/replay infrastructure, not final catalog coverage.

## Ownership and data structure

The species template describes physiology, attribute and temperament bands, guaranteed capabilities, and mechanism permissions. The generated creature contains resolved facts, four actions, automatic passives, and one signature reference. Encounter state belongs to games, including current injuries, status applications, targets, interruption, expiry, and action availability.

```text
Species                         Generated creature
schemaVersion: 5.1.0             id / provenance / appearance (release envelope)
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
channels / conduits / acts      (derivation inputs are not copied)
mechanisms: authored extensions (generation permissions are not copied)
```

- One species element. An ability has an optional element classification; omission means unclassified. No secondary-element roll, affinity strength, automatic adjacency permission, or effect-level element override.
- Retire `traits`, `archetype`, `archetypeWeights`, `physiology.corporeality`, template `instruments`, and `actionPool`. They are rejected by the new schema. `conduits` returned on 2026-09-22 together with `channels` and `acts`, as the declarations the derived act space reads; see [derived acts](creature-derived-acts.md).
- Keep anatomy, composition, body plan, covering, measurements, lifespan, chirality, diet, communication, respiration, environmental tolerance, capabilities and senses. Schema 5.1 requires mass plus at least one applicable overall height, length or width. Other overall dimensions are optional; appendage measurements remain descriptive prose, not structured fields.
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

The catalog contains burning, overheated, chilled, corroding, poisoned, slowed, restrained, pinned, frozen, buried, blinded, deafened, disoriented, frightened, entranced, sedated, stunned, paralyzed, mending, shielded, reinforced, protected, stimulated, focused, concealed, revealed, marked, phased and dispersed.

Every status has default intensity 50. An omitted override means that default, not an unknown value or a lore-parsing task. Explicit overrides require a source reason and should normally use a range. Intensity is a positive integer without a semantic ceiling. Games may treat a condition as binary; intensity does not implicitly change likelihood, duration, removal eligibility or protection degree. Direct-effect intensity includes the performer's baseline contribution; games should not automatically multiply that baseline again.

`paralyzed` impairs voluntary movement without necessarily reducing awareness. It differs from `stunned` (acute shock disrupting responses), `sedated` (reduced alertness/responsiveness), `slowed` (slower movement), and `restrained` (binding/holding). Its default intensity is 50; overrides describe degree of motor impairment, not duration, chance, awareness or prescribed skipped turns. It does not imply harm, a chemical cause or sedation. Removal methods belong to each authored application: a toxin mechanism may specify detoxifying, while another mechanism must justify its own methods. Neither freeing nor immunity to poisoned automatically addresses paralysis. Games map the impairment to supported actions and movement.

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

**Superseded 2026-09-22 by [derived acts](creature-derived-acts.md):** the body decides what a species can do. The compiler derives ordinary mechanisms from anatomy, declared channels and declared conduits through registry tables (instrument rows, medium rows, patterns), the species record narrows them with reasoned exclusions or re-bands them, and authored `mechanisms[]` extend the set with what the tables cannot say. The paragraphs below describe the authored-mechanism form, which is unchanged in shape.

For new or edited species, review every derived act against the creature's evidence and explore justified extensions. The species act space should be logically exhaustive within its sources and the shared vocabulary. Do not exclude an independently capable body part because another part can produce a similar outcome, or because the four-action individual selection needs only a few options. Automated compilation proves structural validity and selection capacity, not creative completeness.

Mechanisms describe source-supported processes, not a whitelist of named finished moves. Each mechanism owns its instrument, optional element, targeting, continuity/timing domains, delivery-specific range/area permissions, and inherent effects. An effect's recipient is a scalar or a delivery-keyed set of permitted recipients. Likelihood is an authored domain; intensity is a value/band. Every semantic value comes from the shared catalog.

The compiler partitions by delivery and whether/which first effect uses area. It groups each independent effect with its dependents so recipient choices obey `requires` constructively; other categorical domains remain factored. It validates supported field relationships at authoring time, checks physical source anatomy and gaze support across the full sight band, and proves enough distinct actions can be selected. Voice does not imply vocal communication or respiration. At runtime it selects unused structure indices directly, removes equivalent representations across mechanisms, and then rolls output. It does not enumerate a species' entire move universe, evaluate lore per individual, or generate/reject/retry creatures.

The current validator's domain proof relies on the bounded schema: recipient groups enforce dependency relationships; remaining variable constraints span at most two dimensions within a recipient partition. Future higher-order relationships require extending that proof and its tests. This is not a general predicate engine. Overlapping mechanisms preserve authored sampling weight; selection is not advertised as uniform over unique semantic structures. Effect alias matching can be combinatorially expensive for many overlapping effect entries; consolidate redundant authoring and benchmark representative canonical species before release. The [relationship audit](creature-relationship-audit.md) records checked cases, fixes and remaining boundaries.

The full authoring audit remains necessary once per species. A schema cannot infer from prose that a secretion really repairs tissue or that a mind channel has been established. Authors translate that evidence into explicit permissions; generated individuals need no such review. Absence of a written restriction is not authority to invent any substance or power.

Run the compiler:

```sh
npm run check:creature-model -- path/to/species.json
npm run check:creature-model -- packages/content/src/creature/fixtures/support-species.json --example
```

The fixture is deliberately noncanonical. Its 14 possible ordinary structures come from factored permissions, not 14 authored moves. Its small size is not a target for canonical species.

## Species decisions retained for the migration

- Bioflim: actual shell regrowth is ongoing restoration plus separately justified innate protection.
- Hypnopet: therapeutic hypnosis supports stabilizing removal; do not infer bodily restoration.
- Ectoghoul: evidenced persistent spectral traversal must survive removal of corporeality.
- Smokat: material smoke/dispersal does not imply passing through sealed solid walls.
- Vespersyn: projections use the swarm channel; no universal summon effect, independent life, creature records or separate resource bars.
- Crystorn: optional reflection is retired. Do not substitute another power to preserve the label.
- Retire speculative volatile retaliation, foresight, and territorial/pack/solitary bonuses. Preserve source-supported behaviors in prose.
- Physical route-blocking ice walls and general freestanding obstacles are deferred. Yetimoth retains wall-making in lore, while ice armor may apply shielded/protection and encasing an opponent may apply frozen. Neither recipient status is a representation of an independent wall. Do not add a barrier effect, terrain editing or empty-point targeting for this version.
- Unignited fuel exposure and its ignition/explosion interactions are deferred. Neph retains hydrogen-emission lore without a mechanically represented fuel application; do not rename it burning, add combustible/flammable keys, invent an ignition organ or restore volatile retaliation. Pressure jets, suction and freezing Benthane remain eligible for source-supported authoring. Imprit's already-ignited oil remains representable with existing effects; this does not grant a separate unignited-fuel mechanic.
- Dormancy, generic illumination/emission, true reflection, precognition, generic resource transfer and unrestricted conditional biology are deferred. Do not restore them under renamed fields.
- Unsupported game capabilities may be explicitly unavailable; game adaptation is outside this redesign implementation pass.

## Implementation status and remaining work

Implemented and tested: strict redesigned species/ability/record schemas; updated semantic catalog; mechanism compiler; constructive four-action selection; fixed signature output rolling; resolved physiology/attributes/temperament generation; protection/removal helpers; authoring validation CLI.

The v5 framework has no known unresolved design or implementation decision within its agreed scope. Its complete 32-species roster is frozen as `generation-0.6.0-1`. This is a readiness statement about the creature contract, not a claim that every conceivable future power is representable. The expressly deferred mechanics listed above require a new shared design decision and release if later adopted. Games may now adapt to this frozen contract without waiting for further creature-framework work; they still own encounter scheduling, numeric balance, geometric resolution, status lifetimes and their handling of unsupported capabilities.

Canonical v5 ability-design and roster gates:

1. **Complete:** All 32 species are staged under `docs/species-templates/v5/`, each with a source/coverage audit. The v4 complete-move pools were not renamed into mechanism permissions; source-supported breadth was reviewed species by species.
2. **Complete:** The reference ladder, 20 performance field descriptions, four direct output descriptions and default status intensity 50 are recorded. [Cross-roster calibration](creature-v5-calibration.md) checked the authoring bands and corrected limited-flight and explicitly strong status cases.
3. **Complete:** The species pass found no need for a general conditional-physiology subsystem. Ongoing passives target self, directed automatic responses use event triggers, and deliberate maintained connections are actions.
4. **Complete:** [Compositional naming](creature-ability-naming.md) preserves guaranteed names and distinguishes ordinary collisions without changing capabilities.
5. **Complete for the standalone release:** `generation-0.6.0-1` freezes all 32 species with their schema, catalog, compiler, naming and generator inputs. All 32 replay in both profiles; the draft generator passes 24 deterministic seeds per species with guaranteed identity and four distinct actions. Games still use v4.
6. **Separate game work:** adapt games to v5 after this ability-design work. Existing game imports have not changed.

These gates are backed by canonical roster tests and the archived release rather than the earlier hypothetical fixture alone. Neph's unignited fuel and Yetimoth's freestanding route walls remain explicit lore-only scope deferrals.

The earlier work order is complete: shared benchmarks, naming, relationship checks and release integration preceded the canonical re-authoring. The frozen v5 release followed full-roster validation.

### Historical implementation checkpoint

Content: 85 tests passed. Rules: 349 tests passed. Both TypeScript checks passed. The redesigned authoring CLI and updated skill validation passed. Existing bundle freshness and generation-release integrity checks passed.

The full workspace run also passed the API suite; the web suite had one asynchronous portrait-loading timeout (`xalianSvg.test.js`). That six-test file passed in isolation without changes. No game files were changed. Canonical coverage and replay have since been completed separately.


### Release integration checkpoint - 2026-09-21

The preliminary release-integration gate is implemented and tested; see [generation releases](generation-releases.md#schema-5-integration-checkpoint). The adapter supplies explicit provenance, seeded IDs and existing appearance policy around constructive v5 generation. Species compilation occurs once when the roster loads; per-call validation concerns caller metadata only. No generated-creature evaluation was introduced.

That checkpoint validated the adapter before canonical authoring. The active game release was and remains v4.

### Canonical roster completion - 2026-09-21

All 32 v5 definitions have source audits and preserve their canonical teasers. Content 107 tests, rules 359 tests, release tooling 12 tests, both package TypeScript checks, and release integrity pass. The full-roster seeded test exercises 24 deterministic seeds per species; all produced four distinct actions and retained guaranteed identity. `generation-0.6.0-1` is frozen and all 32 species replay in both profiles. Game adapters and game-specific balance remain separate work.
