# Action, passive-effect, and status design decisions

> Historical schema-4 decisions. The [schema-5 creature contract](creature-model-current.md) supersedes conflicting rules and is authoritative for the redesigned framework.

Recorded 2026-09-16 from the creature-design discussion. This document captures the agreed direction after schema 3 was implemented. The shared data contract is implemented in schema 4; individual game behaviors remain consumer responsibilities.

## Implementation boundary

The executable schema is schema 4 / generator 0.5. Actions, passives, and a signature reference replace the former combined structure. Frozen releases generation-0.3.0-1 and generation-0.4.0-1 remain immutable. See [the implemented contract](xalian-ability-model.md).

## Creature organization

- Physiology and traits describe baseline bodily characteristics and capacities.
- Actions describe what a creature deliberately performs, including controlled responses to events and ongoing actions.
- Passive effects are guaranteed automatic capabilities, either always operating or responding to one defined event. They are not selectable moves and do not have a separate random pool initially.
- Exactly one signature reference identifies a guaranteed action or passive effect. Define it once in its proper collection.
- Standard actions are randomly selected from explicitly authored compatible sets. Essential species identity and prerequisites cannot depend on optional rolls.
- Pure-support creatures are valid. Solo viability and suitability for every game are not universal requirements.

## Bounded activation

- Controlled responses to events are actions; automatic responses are passive effects.
- Operation is discrete or ongoing. Do not retain separate maintained/continuous categories when control and operation express the distinction.
- At most one trigger from a shared vocabulary. No arbitrary scripts, nested AND/OR conditions, or optional passive suppression system.
- No external activation prerequisites initially, such as rain, a nearby corpse, or another creature performing a prerequisite action.
- An ongoing action stops applying when its performer stops or cannot continue. Movement or taking damage is not automatically an interruption; games handle common interruption rules.
- Anatomy and other essential prerequisites must be guaranteed by the authored species. No evaluation or review of each generated individual is required.

## Spatial behavior

- Use the name range, not reach: contact, short, medium, long. External range is inapplicable to self-only effects.
- Categories describe effective application distance. Games map them to their spatial rules; do not add canonical meter overrides or individual range rolls initially.
- Contact depends on contact through the applying instrument. Movement before contact remains separate from effect range.
- Area of effect has shape (single target, line, cone, radial, sweep), extent (small, medium, large where relevant), and anchor (creature, selected point, impact point).
- For lines and cones, range describes outward distance while extent describes breadth.
- Splash is an impact-anchored area. Initially support one direct target plus one shared area footprint per use, with each effect identifying its application to the direct target or area.
- Area application can be selective or indiscriminate, constrained by recipient compatibility. Team membership does not automatically prevent exposure.
- Range does not automatically increase with intensity or attributes. Games may use attributes for accuracy or other performance without changing the canonical range class.

## Timing and effects

- Preparation: immediate, brief, prolonged.
- Onset: instant, gradual.
- Recovery: readily repeatable, brief recovery, prolonged recovery. These are agreed meanings; final machine-key spelling remains an implementation choice.
- No universal projectile travel-speed field initially.
- Preparation and recovery represent basic physical limitations. Descriptions explain their mechanisms; do not add separate ammunition, heat, secretion, and energy counters to canonical data now.
- Persistence: resolved, sustained, lingering. Resolved changes need no ongoing effect to preserve their result; sustained effects last while the source operates; lingering effects continue after application ends.
- Lingering persistence can be brief or prolonged. Exact durations, stacking, refresh, and quantities belong to game rules.
- One intensity expresses the whole capability, not a separate full budget for every effect. It does not automatically increase area, range, speed, or duration.
- Exactly one effect is primary; accompanying effects are secondary. Secondary does not imply uncertain.
- Application likelihood: consistent, likely, occasional. Games resolve the categories; consistent does not bypass compatibility or immunity.

## Status architecture

- Actions/passive effects declare status applications. Shared catalog entries define the conditions. A recipient's current statuses live in the game's encounter state, not its permanent generated record.
- Statuses can be primary or secondary effects. Positive, negative, and context-dependent conditions use the same structure.
- Keep specific conditions and group them into shared descriptive families. Merge only when no meaningful distinction is lost; do not create separate statuses solely for different visual presentations or elemental causes of the same condition.
- Elements suggest possibilities but do not exclusively own statuses or automatically grant them to every elemental action.
- Each catalog definition needs a stable key/name, condition meaning, descriptive families, applicability, and boundaries from nearby statuses. Families do not prescribe game mechanics.
- No automatic status chains or implied companion statuses. An action lists the statuses it can apply.
- Burning/corroding represent ongoing processes. Removing them ends the status, while damage already incurred remains. Do not add burned/corroded aftermath statuses initially.

### Accepted status vocabulary

| Group | Statuses |
| --- | --- |
| Heat, cold, degradation, toxins | burning, overheated, chilled, corroding, poisoned |
| Movement restriction | slowed, restrained, pinned, frozen, buried |
| Sensory and mental | blinded, deafened, disoriented, frightened, entranced, sedated, stunned |
| Beneficial conditions | mending, shielded, reinforced, resistant, stimulated, focused, concealed |
| Information | revealed, marked |

Frozen covers freezing that substantially restricts movement, with frost/ice present; do not split icebound versus frozen. Chilled does not itself imply immobilization. Vines and webs can use restrained. Forced displacement alone is resolved, not a pushed status. Entranced never implies possession. Dazzling uses blinded or disoriented according to the actual condition. Concealed never grants true invisibility.

Mending is ongoing repair; completed repair is resolved. Shielded is an applied barrier; reinforced strengthens existing structure. Resistant must specify the exposure resisted and stimulated the function enhanced using shared vocabulary. Revealed is continuing exposure of presence/location; marked is an applied identifying signal. A momentary discovery alone is resolved.

Broader candidate lists in the conversation are exploratory, not automatically approved additions to this catalog. The implemented contract lists bounded resistance exposure and enhanced-function vocabularies; families remain descriptive metadata.

## Removal

- Many-to-many coverage: one removal action can address multiple statuses and one status application can accept multiple removal methods.
- A status application declares accepted removal methods; a removal effect declares methods it provides. A shared method establishes eligibility without runtime prose interpretation.
- The working method vocabulary is cooling, smothering, warming, cleansing, detoxifying, freeing, stabilizing, disrupting. Definitions are in the implemented contract; mappings are explicit per status application.
- Default: a successful removal application removes all matching statuses on an affected recipient. A game can narrow quantity and implement any necessary selection. No per-action one/all-matching field.
- Removal does not repair incurred damage or grant immunity to reapplication. Those require separate effects.
- Team allegiance does not alter removal compatibility. An attack can remove an enemy's harmful condition.

### Compound attack/removal example

A cooling water attack can have primary harm and secondary removal through cooling. If an enemy's burning application accepts cooling, the action can extinguish it while inflicting damage. This permits a tradeoff between immediate damage and preserving ongoing burning.

Water medium alone does not grant cooling or removal. A scalding jet or other water action might lack that effect. Removal must be explicit in the action definition. Games handle resolution order and communicate consequences to players; no separate universal water-cancels-fire rule is required.

## Implementation verification

The five worked examples now have executable schema fixtures and tests. Schemas, all 32 templates, generation preparation, authoring guidance, and record displays use the coordinated model. Historical records retain their original schemas and archived replay. See [migration decisions](schema-4-migration.md) for newly authored categorical defaults. Game-specific event scheduling, balance, and status behavior remain game implementation work.
