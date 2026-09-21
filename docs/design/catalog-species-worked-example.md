# Catalog-first worked example: Hippochamp

> Historical design discussion / audit evidence. The [current contract](creature-model-current.md) is authoritative for the redesigned model and its implementation status. Conflicting proposals below are superseded; these notes are not production schemas.

CLARIFICATION: the user's catalog requirement applies to shared controlled vocabulary, not necessarily complete authored abilities. This document's mandatory catalog-first ownership model was an assistant misinterpretation and is not approved. Retain this only as an illustration of a possible reuse layer under discussion; species-local compositions of registered primitives are not private enum implementations.

2026-09-18. Review draft, not production data. Field spellings for definition references and parameter bindings are proposals. Every capability, including signatures, comes from the shared catalog. No species-local effect implementation is permitted.

## Agreed ownership

- Catalog definition: reusable activation, delivery, spatial behavior, targeting, and complete effect combination.
- Species template: references a definition and binds permitted instruments, naming, and numeric variation supported by its anatomy/physiology/lore.
- Generated creature: resolved capability in actions[] or passives[], with its catalog definition reference for traceability.
- Game: encounter outcomes and numerical interpretation.

An initially unique capability still enters the common catalog. During the species pass, compare candidates against existing definitions and consolidate actual duplicates. A unique catalog entry is allowed; a private implementation or unrestricted species override is not.

## Source evidence

[Hippochamp template](../species-templates/hippochamp.json) describes a trunk-like snout delivering a sustained high-pressure water stream against fires and threats. Its signature is Hydrostatic Lance; trunk is an authored instrument and water its conduit.

The current signature only declares harm. The proposed cooling removal below is a meaningful authored addition supported by its firefighting description, not something automatically inferred from water identity.

The current ordinary pool also grants adjacency-based media and mend possibilities. Those are not automatically approved by this example: species permissions must be reviewed under the new single-element/explicit-mechanism policy.

## 1. Shared catalog entry

Abbreviated candidate definition. This belongs to the common ability catalog, not inside Hippochamp's template. Candidate ID water-pressure-stream is descriptive and pending consolidation review.

```json
{
  "key": "water-pressure-stream",
  "element": "water",
  "activation": { "operation": "ongoing" },
  "timing": { "preparation": "brief", "recovery": "brief" },
  "delivery": { "mode": "stream", "approach": "stationary" },
  "targeting": ["other"],
  "spatial": {
    "range": "short",
    "selectivity": "selective"
  },
  "effects": [
    {
      "key": "pressure",
      "type": "harm",
      "recipient": "target",
      "mechanism": "elemental",
      "onset": "instant",
      "persistence": "sustained",
      "likelihood": "consistent"
    },
    {
      "key": "cool",
      "type": "remove",
      "recipient": "target",
      "methods": ["cooling"],
      "onset": "instant",
      "persistence": "sustained",
      "likelihood": "consistent"
    }
  ]
}
```

Direct harm intensity is deliberately a required species binding in this draft, not a missing value in a final creature. The cooling effect does not depend on harm succeeding. This candidate uses a targeted stream for clarity; it does not silently ratify replacement of the current cone area. Final spatial/timing settings need source-based authoring.

For this example, permitted species bindings are instrument, display name, and the pressure effect's intensity. A template cannot change the effect type, add/remove effects, change removal methods, or introduce conditions through those bindings. The actual binding schema must enforce that boundary; no arbitrary JSON override/patch escape hatch.

## 2. Species template references it

Abbreviated ability slice of Hippochamp's proposed template. Existing physiology, ordinary action options, passives, and other fields are omitted, not removed.

```json
{
  "key": "hippochamp",
  "signature": {
    "type": "action",
    "key": "hippochamp-defining"
  },
  "actions": [
    {
      "key": "hippochamp-defining",
      "definition": "water-pressure-stream",
      "name": "Hydrostatic Lance",
      "instrument": "trunk",
      "effects": {
        "pressure": {
          "intensity": [35, 80]
        }
      }
    }
  ]
}
```

Here effects is a proposed keyed parameter-binding map, not a second implementation of the catalog's effects array. The spelling is for review; the important boundary is that it only binds declared parameters. If that spelling is confusing, choose a clearer binding name before implementation.

The band is borrowed from the old whole-ability band solely to illustrate migration syntax. It is not approved calibration for the new direct harm output.

A species needing a meaningfully different effect combination proposes another shared catalog definition. Another species needing the same behavior with different permitted output uses this definition with its own binding.

## 3. Resolved action in a generated creature

Abbreviated creature action slice. Value 57 is an illustrative possible roll, not output from an implemented new generator or verified seed.

```json
{
  "species": "hippochamp",
  "signature": {
    "type": "action",
    "key": "hippochamp-defining"
  },
  "actions": [
    {
      "key": "hippochamp-defining",
      "definition": "water-pressure-stream",
      "name": "Hydrostatic Lance",
      "instrument": "trunk",
      "element": "water",
      "activation": { "operation": "ongoing" },
      "timing": { "preparation": "brief", "recovery": "brief" },
      "delivery": { "mode": "stream", "approach": "stationary" },
      "targeting": ["other"],
      "spatial": { "range": "short", "selectivity": "selective" },
      "effects": [
        {
          "key": "pressure",
          "type": "harm",
          "recipient": "target",
          "mechanism": "elemental",
          "intensity": 57,
          "onset": "instant",
          "persistence": "sustained",
          "likelihood": "consistent"
        },
        {
          "key": "cool",
          "type": "remove",
          "recipient": "target",
          "methods": ["cooling"],
          "onset": "instant",
          "persistence": "sustained",
          "likelihood": "consistent"
        }
      ]
    }
  ]
}
```

There is no assembly decision left for the game. The resolved snapshot is produced from the catalog plus authorized bindings, not separately authored. The definition reference is for identity/traceability; it does not authorize consumers to reinterpret the snapshot using a different release's catalog.

## 4. Ordinary capabilities follow the same rule

An ordinary pool option also references a catalog definition. Its selection count/weight chooses whether an individual receives it; its permitted bindings determine the resolved capability. A signature is guaranteed while an ordinary option can be rolled, but neither gets a private effect implementation.

No new generation block, exclusion-pair system, or mutually exclusive gland model is introduced by this example. Selection of multiple capabilities remains a separate topic after the definition/binding boundary is clear.

## 5. Catalog consolidation criteria

Consolidate two entries when their fixed behavior and permitted variation match. Do not create new definitions solely for a new species name, instrument binding, display name, or intensity band.

Keep a distinct shared definition when merging would require arbitrary conditions, unsupported effect combinations, or contradictory activation/delivery. Catalogued does not require artificially forcing every mechanism into one generic recipe.

During authoring:
1. Search/review existing definitions.
2. Reference a fitting definition.
3. Otherwise add a shared candidate with source rationale and bounded parameters.
4. Review candidates together, consolidate semantic duplicates, and update references before release.
5. Compile species bindings against the catalog; generation only draws approved configurations.

This is per-species/catalog authoring work, never a review of each generated individual.
