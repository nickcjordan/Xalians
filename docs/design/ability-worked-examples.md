# Five worked capability examples

Design exercise, 2026-09-16. These are hypothetical fixtures, not new species lore, production JSON, or changes to frozen releases. They test the decisions in [the specification](ability-specification-decisions.md). Categorical values below are illustrative authored choices, not inferred facts about existing creatures.

## Test conventions

- Signature identity is a separate reference to a capability key; collection membership determines action versus passive. No duplicated signature definition is required.
- Use an illustrative intensity of 60 for each resolved individual capability. It applies to the entire capability, not independently to every effect. Species intensity bands remain authored separately.
- Effect onset, persistence, recipient, emphasis, and likelihood are shown explicitly. Putting onset on each effect is a proposed refinement exposed by compound examples.
- Consistent means normal application after successful delivery to a compatible subject; it does not bypass game susceptibility rules.
- All required organs and source capabilities are assumed guaranteed by the hypothetical species. No optional action, trait roll, environment, or teammate is a prerequisite.
- Removal mappings below are test-specific authored mappings, not universal status defaults.

## 1. Fireball with splash and occasional burning

| Field | Definition |
| --- | --- |
| Key/name | ember-orb / Ember Orb |
| Collection | Actions |
| Instrument / medium | breath / fire |
| Operation / trigger | Discrete / none |
| Preparation / recovery | Brief / brief recovery |
| Delivery / approach | Projectile / stationary |
| Range | Medium |
| Targeting | A selected corporeal creature or object; impact establishes the area anchor |
| Area | Radial, small, impact point |
| Selectivity | Indiscriminate |
| Intensity | 60, whole capability |
| Description | It launches a heated globule that bursts at impact and can ignite susceptible material nearby. |

| Effect | Recipient | Onset | Persistence | Likelihood |
| --- | --- | --- | --- | --- |
| Primary: harm through fire | Area | Instant | Resolved | Consistent |
| Secondary: apply burning | Area; susceptible flesh/plant recipients in this fixture | Instant | Lingering, brief | Occasional |

Burning accepts cooling and smothering in this fixture. The burning process continues after application, but no burned aftermath status is created. The attack does not also apply overheated implicitly.

Checks:

- The impact recipient belongs to the area and is affected once by each area effect. There is no separate duplicate direct-damage entry.
- Different direct and splash behavior could be expressed by separate effects; if both include the direct recipient, the author must intend the additional effect rather than accidentally duplicating it.
- Range reaches the impact location; area extent describes the surrounding footprint.
- Successful delivery does not guarantee occasional burning. Compatibility is evaluated separately for harm and status application.
- Extinguishing burning ends the ongoing status, not the resolved harm already incurred.

## 2. Repair with secondary protective coating

| Field | Definition |
| --- | --- |
| Key/name | repair-film / Repair Film |
| Collection | Actions |
| Instrument / medium | secretion / chemical |
| Operation / trigger | Discrete / none |
| Preparation / recovery | Brief / prolonged recovery |
| Delivery / approach | Contact application / stationary |
| Range | Contact |
| Targeting | One other corporeal flesh creature |
| Area / selectivity | Single recipient; no area footprint / directed application |
| Intensity | 60, whole capability |
| Description | It applies a tissue-repair secretion that sets into a protective surface coating. |

| Effect | Recipient | Onset | Persistence | Likelihood |
| --- | --- | --- | --- | --- |
| Primary: apply mending | Direct target | Instant | Lingering, prolonged | Consistent |
| Secondary: apply shielded | Direct target | Gradual | Lingering, brief | Consistent |

Mending describes continuing repair after application; a game resolves the repair quantities. Shielded represents this fixture's added coating, not strengthened underlying tissue. Both applications accept cleansing in this fixture because removing the secretion/coating stops their ongoing processes. Already completed repair is not reversed.

Checks:

- Discrete application can start an ongoing repair process without making the creature maintain contact.
- The mending status can begin instantly even though the repair process operates over time. Effect onset is when the condition starts, not when every consequence has completed.
- The coating takes effect gradually without delaying the separate mending application: action-wide onset would incorrectly force both to share a value.
- No direct restoration effect is added to duplicate the healing already represented by mending. An intentionally separate initial repair would need its own effect.
- A game decides how removal handles a developing effect; the canonical definition supplies gradual onset and the removal method, not a custom timing program.

## 3. Cooling attack that extinguishes burning

| Field | Definition |
| --- | --- |
| Key/name | cooling-jet / Cooling Jet |
| Collection | Actions |
| Instrument / medium | breath / water |
| Operation / trigger | Discrete / none |
| Preparation / recovery | Brief / brief recovery |
| Delivery / approach | Stream / stationary |
| Range | Medium |
| Targeting | One other corporeal creature or object |
| Area / selectivity | Single recipient; no area footprint / directed application |
| Intensity | 60, whole capability |
| Description | It strikes a recipient with a concentrated jet of cool water. |

| Effect | Recipient | Onset | Persistence | Likelihood |
| --- | --- | --- | --- | --- |
| Primary: impact harm | Direct target | Instant | Resolved | Consistent |
| Secondary: remove by cooling | Direct target | Instant | Resolved | Consistent |

Checks:

- Against fixture 1's burning, cooling matches and is eligible to remove it.
- A test overheated application accepting cooling is also eligible. Under the agreed default both matching applications end.
- Poisoned accepting only detoxifying remains. Shielded accepting only disrupting remains.
- Enemy and ally allegiance do not change method matching. Games determine whether targeting an ally is allowed and what damage occurs.
- Removing burning neither restores prior health nor prevents a later reapplication.
- A water action without an explicit removal effect has no canonical cooling-removal capability.
- Games handle damage/removal resolution order; list order is not a canonical executable sequence.

## 4. Passive protective aura

| Field | Definition |
| --- | --- |
| Key/name | guardian-field / Guardian Field |
| Collection | Passive effects |
| Instrument / medium | aura / light |
| Operation / trigger | Ongoing / none; automatically operating |
| Preparation / recovery | Not applicable to ordinary ongoing operation |
| Delivery / approach | Field / stationary |
| Range | No remote delivery; body-centered footprint governs spatial extent (proposed clarification) |
| Targeting | Corporeal creatures within the footprint, including the source if applicable |
| Area | Radial, small, creature anchor |
| Selectivity | Indiscriminate; this fixture has no optional passive target-selection controls |
| Intensity | 60, whole capability |
| Description | Its body continuously projects a local protective field over compatible creatures within it. |

| Effect | Recipient | Onset | Persistence | Likelihood |
| --- | --- | --- | --- | --- |
| Primary: apply shielded | Area | Instant | Sustained | Consistent |

This shield application accepts disrupting in the fixture.

Checks:

- It never appears as an action the player chooses to perform.
- It can be the species signature through a reference to guardian-field; the definition stays solely in passive effects.
- The field ceases to support a recipient when it no longer reaches that recipient or the source stops operating. These are the meaning of a sourced field, not an authored chain of additional activation conditions.
- Indiscriminate application is not secretly ally-only. Games must account for any opposing compatible creature in the footprint.
- Removing one shield application does not automatically disable its source or grant immunity to the field. Reapplication cadence is a game rule, so a continuously operating field might restore protection later. This limitation should be visible in a game's interpretation of disruption.
- A short range plus a small body-centered radius would describe the same boundary twice. This case supports using footprint extent alone when there is no remote delivery.

## 5. Automatic contact-triggered defense

| Field | Definition |
| --- | --- |
| Key/name | shock-reflex / Shock Reflex |
| Collection | Passive effects |
| Instrument / medium | hide / electric |
| Operation / trigger | Discrete / contact; automatic |
| Preparation / recovery | Immediate / brief recovery |
| Delivery / approach | Contact / stationary |
| Range | Contact |
| Targeting | The corporeal creature or object responsible for the contact event |
| Area / selectivity | Single event participant; no area footprint / no player recipient selection |
| Intensity | 60, whole capability |
| Description | Contact with its conductive hide releases a defensive electrical discharge into the contacting subject. |

| Effect | Recipient | Onset | Persistence | Likelihood |
| --- | --- | --- | --- | --- |
| Primary: electrical harm | Triggering subject | Instant | Resolved | Consistent |
| Secondary: apply stunned | Triggering creature, with a susceptible response system | Instant | Lingering, brief | Occasional |

The stunned application accepts stabilizing in this fixture. The exact controlled vocabulary for applicability to a susceptible response system is still to be finalized; this is not production-valid JSON.

Checks:

- It is not a selectable counterattack and needs no optional suppression rule.
- The contact event supplies the recipient. A plain other-creature targeting field would leave it unclear who receives the discharge.
- The passive uses recovery despite being automatic. Games must apply its recovery rule rather than firing without limit on every low-level collision event.
- An inanimate object can receive electrical harm without also becoming stunned. Effect-level applicability cannot be replaced by one undifferentiated capability-wide compatibility check.
- The trigger is contact, not hostile contact. Friendly contact is not excluded by an unwritten allegiance rule.
- Whether a retaliatory discharge counts as a new triggering contact, and how simultaneous reactions are scheduled, must be defined once by a game's event rules. Do not author recursive trigger logic per creature.

## Findings and recommended refinements

| Finding | Recommendation | Status |
| --- | --- | --- |
| Actions/passives plus signature references represent all five cases | Retain the agreed split; avoid a redundant control field that could contradict collection membership | Confirmed by examples |
| Compound effects can have different onsets | Store onset per effect, preparation/recovery per capability | Implemented |
| Direct and area recipients can overlap | Area includes the impact recipient when eligible; each effect applies once per recipient. Separate overlapping effects must be intentional | Accepted |
| Body-centered fields have no remote placement distance | Use area extent without a second range boundary; external range is inapplicable for body-centered fields as well as self-only effects | Accepted |
| Some timing/area fields do not apply to every capability | Permit explicit applicability through schema structure; do not assign fake preparation/recovery to an automatic ongoing field | Implemented |
| Triggered effects require a deterministic recipient | Use instigator for the participant causing the trigger; no custom target expressions | Implemented |
| Effects within one capability can have different compatibility | Capability targeting narrows subjects; per-effect/status applicability narrows them further. It cannot broaden targeting | Implemented |
| A status can embody the continuing function already named by an effect | Avoid duplicate status-plus-function entries for the same work; mending represents ongoing repair, shielded represents its applied protection | Accepted |
| Removal can interact with an active source | Status removal alone does not imply source shutdown or reapplication immunity; games specify cadence | Existing boundary, now illustrated |
| Simultaneous or recursive event processing is not creature identity | Define event scheduling, repeat-trigger handling, timing, and stacking once per game | Consumer implementation requirement |

## Outcome

All five concepts can be expressed without new external prerequisites, nested conditions, optional passive suppression, or evaluation of each generated creature. The structural refinements are implemented in schema 4. Executable fixtures live in `packages/content/src/__tests__/fixtures/capabilities.json`, exercised by `capabilityModel.test.ts`.

These hypothetical examples are not new canonical species powers or a combat balance simulation.
