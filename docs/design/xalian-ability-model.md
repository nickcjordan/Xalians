# Creature actions, passives, and statuses

Current contract: template/record schema **4.0.0**, generator **0.5.0**. Executable definitions: `packages/content/src/schema/ability.ts` and `status.ts`. This replaces schema 3's combined abilities and inline signature. The [design decisions](ability-specification-decisions.md) explain the boundaries; [worked examples](ability-worked-examples.md) demonstrate them.

## Creature structure

```json
{
  "schemaVersion": "4.0.0",
  "signature": { "kind": "action", "key": "species-signature" },
  "actions": [],
  "passives": [],
  "actionPool": {
    "count": [2, 3],
    "sets": [{ "key": "default", "weight": 1, "options": [] }]
  }
}
```

This is a shape illustration, not a valid template: the signature must resolve and each set must have enough eligible options. Templates contain only their guaranteed signature action in actions (or no guaranteed action for a passive signature). Other guaranteed automatic processes belong in passives. Generated records contain resolved actions and passives and the same signature reference; they do not contain actionPool. A signature definition appears only once. Standard action roles are inferred from the reference, not duplicated on every entry.

Physiology and traits describe baseline properties. Actions describe deliberate behavior, including chosen reactions. Passives describe automatic ongoing or triggered effects. Required species identity cannot depend on optional action or trait rolls. Pure-support species are valid; no universal damage, solo viability, or all-games suitability rule exists.

## Capability fields

| Field | Contract |
| --- | --- |
| key, name, description | Stable identity and source-supported display/prose |
| instrument, medium | Body part/channel and elemental expression; neither determines the effect automatically |
| activation | operation: discrete/ongoing; optional single trigger: contact/incoming-harm/ally-distress |
| timing | preparation: immediate/brief/prolonged; recovery: repeatable/brief/prolonged. Required for actions and discrete passives; omitted for ongoing passives |
| delivery | mode: contact/projectile/stream/pulse/field/signal/self; approach: stationary/closing |
| spatial | optional range: contact/short/medium/long; optional area; selectivity: selective/indiscriminate |
| area | shape: line/cone/radial/sweep; extent: small/medium/large; anchor: creature/point/impact |
| targeting | relation: self/other/self-or-other; subjects: creature/object/environment; optional composition, corporeality, reception compatibility |
| effects | One primary effect and optional secondary effects, with typed payloads below |
| intensity | One whole-capability band in templates, one value in records; not an independent budget per effect |

Self-only effects and creature-centered radial fields omit remote range. Cones and sweeps can retain range for outward distance. Absent area means no area footprint. Area may include the direct recipient; each effect applies once per eligible recipient. Do not duplicate the same ongoing function as both a direct effect and a status.

Every effect declares recipient (target/self/area/instigator), emphasis (primary/secondary), onset (instant/gradual), persistence (resolved/sustained/lingering), and likelihood (consistent/likely/occasional). Lingering requires duration brief/prolonged; other persistence omits duration. Sustained requires ongoing operation. Instigator means the participant causing the declared trigger. Per-effect compatibility may narrow capability targeting, never broaden it.

Effect kinds: harm, restore, protect, enhance, suppress, restrain, displace, transfer, reveal, status, remove. Each has a typed payload rather than arbitrary rules text. Resolved repair remains repaired; ending a process does not undo completed changes. No condition scripts, custom event expressions, optional passive suppression, or separate resource counters are introduced.

## Statuses and removal

The shared status catalog contains 26 conditions: burning, overheated, chilled, corroding, poisoned, slowed, restrained, pinned, frozen, buried, blinded, deafened, disoriented, frightened, entranced, sedated, stunned, mending, shielded, reinforced, resistant, stimulated, focused, concealed, revealed, marked. Descriptive families organize meaning without imposing game rules. Applicability remains explicit in targeting/effect compatibility and the condition definition.

A status effect declares `status` and `removable` methods. Resistant also requires `exposure`; stimulated requires `function`. Functions are reactions/mobility/force/perception/composure/recovery. Exposure is impact/cutting/piercing/compression or an existing element. Statuses require sustained or lingering persistence. Current recipient statuses live in encounter state, never the permanent creature record.

Removal declares `methods`: cooling (reduce heat), smothering (suppress combustion), warming (counter cold), cleansing (remove an applied substance), detoxifying (neutralize toxins), freeing (release physical restriction), stabilizing (restore disrupted functioning), disrupting (break an applied influence). Match explicit application methods, not a universal status-to-cure lookup. A successful application removes all matching statuses by default; games may narrow quantity. An empty removable list means no listed method is supported, not permanent immunity to every game mechanic.

A cooling attack can explicitly harm and remove compatible burning. Water alone does not imply cooling. Removal does not repair damage, stop the source, prevent reapplication, or grant immunity. No burned/corroded aftermath statuses are added.

## Valid generation by construction

Generation picks one weighted compatible set and samples options without replacement. Each option references a reusable pattern, a declared instrument, and permitted media. Each set must supply its maximum draw from primary-medium options alone. Every permitted subset and medium must work with guaranteed physiology, traits, and signature; standard-to-standard or optional-trait prerequisites are forbidden. Separate incompatible alternatives into different sets.

Templates/catalogs are checked and compiled once at canonical generator initialization and cached. Names and keys reserve all guaranteed capabilities. Production generation only selects prepared options and rolls values; it never evaluates completed creatures or retries invalid combinations. Custom mutable development templates are prepared afresh. Schema serialization checks remain data-integrity checks.

Biological and lore coherence is reviewed when authoring a reusable definition or species pool, once per design. No individual generated-creature review is required. The computer cannot prove fictional biology from prose; authors must establish those permissions before release.

## Canon and game boundaries

Restoration is neither resurrection nor a Nemesis Plague cure. Concealment is not true invisibility; entrancement is not possession. Compatibility is biological/perceptual rather than allegiance. No automatic status chains or elemental cures exist.

Games define distances, probabilities, costs, event scheduling, stacking, durations, recovery, and mode eligibility. Existing Reclamation compatibility explicitly supports its prior mechanics and rejects unsupported effect compositions; adding a shared status does not silently add combat behavior. Passives are excluded from selectable actions.

## Migration and replay

All 31 species retain signature names, prose, instruments, media, and intensity bands. Bioflim's automatic carapace renewal is now a passive signature; Hippochamp's unbroken stream is ongoing. Existing standard option permissions remain intact. Newly required categorical values are documented [migration authoring decisions](schema-4-migration.md), not newly discovered source facts.

Schemas 1–3 remain readable through preserved historical definitions. The archives generation-0.3.0-1 and generation-0.4.0-1 are immutable. Current generation uses generation-0.5.0-1; see [release manifests and replay](generation-releases.md).
