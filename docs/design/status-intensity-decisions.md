# Status intensity — catalog default and optional override

> Historical design discussion / audit evidence. The [current contract](creature-model-current.md) is authoritative for the redesigned model and its implementation status. Conflicting proposals below are superseded; these notes are not production schemas.

2026-09-18. Current agreed policy. Supersedes all earlier selective inclusion/exclusion tables and the proposed blanket removal of status intensity. Design specification only; the runtime migration remains pending.

## Agreed contract

- Every status catalog entry supplies an intensity default of 50.
- A status-applying effect may omit intensity or provide a positive integer override. No upper ceiling.
- Missing means the catalog default, not zero, unknown, or a weaker application. Explicit 50 and omitted intensity resolve identically under this catalog.
- The override is an authored output distinction. It is not proof that the lore specified a number, a rarity marker, or an automatic extra roll.
- Lore and species mechanisms guide authoring; generation does not interpret prose or evaluate generated creatures.
- 50 is a standard reference, not 50%. 100 is not a ceiling and does not promise twice the effect.
- Catalog semantics define the dimension being varied. Games map it to their own quantities and can ignore magnitude for conditions their rules treat as binary.
- Intensity does not automatically alter likelihood, duration, area, range, removal eligibility/difficulty, or protection degree. It does not introduce extra effects.
- Positive integer bounds apply to an explicit override and to catalog defaults. Missing catalog definitions are unsupported content, not permission to silently invent a default.
- A shared resolver uses the explicit override if present, otherwise the status definition in the record's generation release. No duplicated independent status-strength roll.
- This policy concerns status applications. Direct harm/restore/protect/displace retain their separate output semantics; remove has no removal-strength number.
- Historical test-record compatibility remains unnecessary. New generation and default resolution must still be deterministic.

## Proposed catalog meanings for review

### Temporary traversal — ratified 2026-09-19

Add catalog statuses phased and dispersed. Phased grants the phase traversal permission; dispersed grants seep. A status effect applies the named condition using the existing type: status contract. These definitions do not grant concealment, harm protection, restraint immunity, or automatic status removal. Any such distinct outcomes must be explicitly authored. Permanent traversal belongs in physiology.traversal[], not in an always-applied encounter status.

Abbreviated proposed catalog encoding:

```json
[
  { "key": "phased", "traversal": ["phase"] },
  { "key": "dispersed", "traversal": ["seep"] }
]
```

Temporary applications reuse existing persistence, source/area binding, duration, and per-application removal methods. The accepted maintained-dispersal example uses activation.continuity: ongoing and a self-directed dispersed status with persistence: sustained and bound: source. This is a worked representation, not a requirement that every future traversal-granting ability be maintained.

Implementation guidance derived from the existing application model: active traversal is the union of innate permissions and permissions from valid status applications. Expiring or removing one application removes only that contribution, never innate permissions or another valid application. Do not mutate the permanent generated record to represent encounter traversal. Duplicate grants do not add strength.

Both statuses follow the common default intensity of 50 and optional override policy. Traversal permission itself is categorical; no universal gap-width, wall-thickness, movement-speed, or immunity scale is inferred from intensity. Games own geometry, movement costs, and safe resolution of expiry during traversal; the creature schema adds no geometry or collision-rule language. The exact numerical use of intensity, if any, must not be invented merely to fill these entries.

### Status harm classification — ratified 2026-09-19

When a status defines ongoing harm, its catalog entry explicitly classifies that harm using the existing mechanism and element keys. Burning's ongoing harm is elemental fire harm. This classification belongs to the status catalog, not to a duplicate direct harm effect on every ability that applies burning, and does not inherit the applying ability's element.

Proposed concrete catalog encoding (abbreviated status entry):

```json
{
  "key": "burning",
  "harm": {
    "mechanism": "elemental",
    "element": "fire"
  }
}
```

Games implementing burning as ongoing harm use this classification for harm protection matching; games own quantities and scheduling. Fire-harm resistance reduces that harm, while fire-harm immunity prevents that harm. Neither automatically prevents or removes the burning application. Burning-status resistance instead makes application harder; burning-status immunity prevents the condition. A status without declared harm does not gain damage merely because it has an elemental theme. Review remaining damaging statuses individually rather than infer their classification. This is classification metadata, not a nested general-purpose ability/effect system.

The uniform policy and default 50 are agreed. The detailed meanings below are authoring proposals, not individually ratified new powers or game rules. All entries use the same optional-override contract.

| Status | Default | Proposed intensity meaning |
|---|---|---|
| burning | 50 | Rate of damaging burning activity. |
| overheated | 50 | Degree of functional impairment caused by excess heat. |
| chilled | 50 | Degree of functional impairment caused by cold. |
| corroding | 50 | Rate of damaging corrosion. |
| poisoned | 50 | Degree of toxic disruption; does not prescribe an additional damage effect. |
| slowed | 50 | Degree of movement impairment; not a movement percentage. |
| restrained | 50 | Strength of the binding/holding contribution; does not automatically define an escape or removal contest. |
| pinned | 50 | Strength of the confining pressure; no automatic additional damage. |
| frozen | 50 | Strength of the freezing-related restriction; does not create a separate frost status or automatically deal harm. |
| buried | 50 | Degree of confinement by surrounding material; no automatic suffocation or harm. |
| blinded | 50 | Degree of visual impairment within the condition's definition. |
| deafened | 50 | Degree of auditory impairment within the condition's definition. |
| disoriented | 50 | Degree of disrupted orientation or coordination. |
| frightened | 50 | Strength of the induced fear interference; no compulsory behavior formula. |
| entranced | 50 | Degree of captured attention; no possession or obedience. |
| sedated | 50 | Degree of reduced alertness/responsiveness; not automatic sleep. |
| stunned | 50 | Degree of disruption of responses; no prescribed skipped turns. |
| mending | 50 | Rate of restoration. |
| shielded | 50 | Protective capacity of the added barrier. |
| reinforced | 50 | Degree of strengthening of existing structure. |
| protected | 50 | Protection degree and scope remain authoritative. No universal additional numeric meaning is assigned; consumers may ignore intensity for this categorical status. |
| stimulated | 50 | Degree of enhancement of the explicitly named function. |
| focused | 50 | Degree of improved attention or mental steadiness. |
| concealed | 50 | Degree of reduced detectability; not universal invisibility. |
| revealed | 50 | Strength/clarity of the continuing exposure; not extra range, duration, or automatic discovery of other properties. |
| marked | 50 | Strength/distinctness of the identifying signal; does not guarantee location or hits. |

Protected is the proposed replacement name for resistant, not an additional status. Its categorical resistant/immune degree must not quietly become a numeric resistance ladder. Accepting the common intensity field does not require inventing a useful continuous interpretation for every game's binary condition. Any future universal numeric interpretation for protected requires its own decision.

Earlier decisions excluding intensity from mental/confinement/etc. statuses are superseded. Earlier constraints against intensity automatically affecting removal or changing a status into a different condition remain intact.

## Example placement

### Corrosion and poison review (2026-09-19)

Ratified distinction: corroding means an active chemical process eating away at body material, including flesh as well as metal. Poisoned means a toxin disrupting bodily functioning. Neither status is selected automatically from metal/nonmetal composition. A creature may receive either or both when explicitly applied, subject to its declared protections. Metallic composition does not itself grant poison immunity. Existing registry key chemical covers chemical elemental classification; acid is not a separate element key.

Agreed chemical-harm mapping, shown in proposed catalog syntax:

```json
{
  "key": "corroding",
  "harm": {
    "mechanism": "elemental",
    "element": "chemical"
  }
}
```

Corroding describes active material degradation. Its status resistance governs application; chemical-harm resistance governs the resulting classified harm. Poisoned describes toxic disruption and does not by itself require ongoing damage. If a game represents poison as damage, classify that damage as elemental chemical harm. Classification does not make damage mandatory; the final catalog encoding must preserve this distinction. Do not infer additional outcomes from the chemical status family or bypass harm protection for optional poison damage. Ending either condition does not undo completed damage. Removal eligibility remains explicitly authored per application; these definitions do not grant universal removal methods.

Catalog entry (abbreviated):

```json
{
  "key": "burning",
  "intensity": {
    "default": 50,
    "description": "Relative strength of the ongoing burning."
  }
}
```

Effect inside an action (abbreviated, standard magnitude):

```json
{
  "type": "status",
  "status": "burning",
  "recipient": "target"
}
```

The same effect with an authored override adds "intensity": 80. Other effect fields such as duration, likelihood, and removable are independent and omitted here only for readability.

## Species-template authoring rule (ratified)

For intensity on a status effect within a species template:

| Template value | Generated effect |
|---|---|
| Omitted | Omit intensity; resolve the catalog default |
| Positive integer | Emit that fixed override |
| Inclusive [min, max] positive-integer range | Emit a deterministically seeded integer in the authored range |

Authoring preference: when a species/capability warrants an override, prefer a range to permit individual variation. Use a fixed value only when lore or the established capability concept explicitly justifies invariant output. Do not use equal range endpoints merely to bypass that guidance. Exact values/bounds are authored interpretations, not numbers an AI reads from lore at generation time.

This does not introduce random variation for omitted intensity. When no strength distinction is justified, omission still means the standard catalog value. Generated records contain a number or omit the field; they never contain template ranges. Any correlations/prerequisites must hold across the entire authored range and be verified before generation.

## Remaining authoring work

1. Ratify/refine the proposed per-status descriptions without prescribing universal combat formulas.
2. Author concrete reference examples where a species warrants an override. Do not treat unsupported prose as numeric evidence.
3. Define species-template bands/overrides and ensure omission remains deterministic; no per-creature AI review.
4. Implement resolver/schema/catalog updates in the coordinated migration.
