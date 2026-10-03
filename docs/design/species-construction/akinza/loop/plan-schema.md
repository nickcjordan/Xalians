# Plan file schema (for planner agents)

A planner writes one JSON file; a runner executes it with `python art/species-construction/loop/recipe.py run-plan <plan.json>`; reviewers then pick among the scored results. Usage and execution details are in `art/species-construction/loop/RECIPE.md`, section Plans. Write the plan under `docs/design/species-construction/akinza/loop/plans/` with a name that carries the round and region (`r21-R07.json`).

```json
{
  "order": {"round": 21, "region": "R07", "with": []},
  "base": "docs/design/species-construction/akinza/recipe.json",
  "baselinePacket": "untracked/species-construction/akinza/loop/packets/assembled-2278",
  "start": null,
  "variants": [
    {"name": "wider lobes", "why": "front view: paw reads narrow against the sheet (R07.3)",
     "edits": [
       {"op": "set", "step": "B-23", "arg": "spec:lobeWidthRadius", "value": 0.0175},
       {"op": "set", "step": "B-23", "arg": "spec:lobeBlend", "value": 0.02}]}
  ],
  "sweeps": [
    {"step": "B-23", "grid": {"spec:lobeToRod": [0.006, 0.02]}, "why": "how far the lobes sit from the rod end"}
  ],
  "region": "R07",
  "top": 3
}
```

| Field | Meaning |
|---|---|
| `order` | `round`, `region` and `with` (other regions the order may touch) from the orchestrator's order. A step an edit touches that is tagged neither `region` nor one of `with` is a warning. |
| `base` | The baseline recipe every variant is cut from and judged against (normally the live `recipe.json`). |
| `baselinePacket` | The packet directory of the baseline assembly (its `index.json` must exist); the top candidates are diffed and seam-checked against it. |
| `start` | Optional. A recipe path (a branch or tool starter) to begin every variant from, rebased onto `base` automatically; or `{"recipe": path, "attachAfter": "<new sink step>", "live": false}`. Use `attachAfter` when the starter added steps after a sink that the base has since extended (the R03 tool starter: it added H36 after H33, the base now has H34 and H35 after H33; `"attachAfter": "H35"` re-parents H36 onto H35 and makes it the head sink). |
| `variants` | Up to 16. Each is `{"name", "why", "edits": [...]}`; `why` says which defect or criterion it targets. An empty `edits` list is the starting recipe itself (a control). Mark the variant that stands for the start (the tool as built, perhaps with one edit every variant shares) with `"control": true`: when the plan has a `start`, that variant always reaches the readers. |
| `sweeps` | Optional. `{"step", "grid": {"<arg>": [values...]}, "why"}`; the product of the lists is one variant per point, so keep the grid small. |
| `region` | The region whose zone the variants are scored over (silhouette overlap, stations, containment). Defaults to `order.region`. |
| `top` | How many of the best-scoring variants go through the full candidate path (assembly, check, packet, measured, diff, seams, containment). Default 3. |

Variants plus sweep points may not exceed 24 builds in all.

## Edits

| `op` | Fields | Effect |
|---|---|---|
| `set` | `step`, `arg`, `value` | `arg` is a `--flag` of the step (value tokens replaced; `true` or `false` toggles a switch), `spec:<dotted.path>` (a parameter inside the step's `--spec` JSON; list indices are path parts, e.g. `spec:clawEach.length.0`; a value may be a JSON list or object) or `script`. |
| `script` | `step`, `script` | Point the step at a new versioned script under `art/species-construction/`. Never edit a script a step is pinned to; copy it to a new name first. |
| `add` | `after`, `step`, optional `rewire` | Insert a complete step (`id`, `component`, `kind`, `regions`, `script`, `runner`, `inputs`, `args`) after `after`. Consumers of `after` that read it through the same input name, and the assembly sink, are rewired to it; `rewire` lists extra `"STEP:INPUT"` pairs. |

Edits apply in order. Only steps tagged with the plan's region (or `with`) should be touched. A change to a head step rebuilds the head chain after it (the head chain is about 26 minutes of Blender from H24; later steps cost one to four minutes), so prefer edits to the last steps of a chain and say so in `why` when a variant must start earlier.

## What comes back

`plan-result.json` and `plan-result.png` beside the plan (`<stem>-plan-result.*` unless the plan file is named `plan.json`). Per variant: whether it built, its score parts (`fit`, `station`, `contain`, `tool`, `seam`, optional `surface`) and total; per top candidate: the assembly, packet, technical check, the measured criteria that changed, new seam flags and containment, copied from `candidate.json`. The score ranks; it is not a verdict. The reviewers read the packet images.
