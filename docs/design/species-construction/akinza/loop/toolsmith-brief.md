# Akinza toolsmith brief

You build one generator that the method plan needs, before any round order uses it. You are not judged on looks: the first order for the region tunes your tool, and the critic judges that order. You are judged on whether the tool exists, runs as a recipe step, stays inside its region, and exposes the parameters a builder will need. Round 18 showed why this is its own task: a builder that had to write a new generator inside its order spent 77 minutes and never handed over.

Read first: `docs/design/species-construction/LOOP-v3.md`, `art/species-construction/loop/RECIPE.md`, the builder brief beside this file (environment rules, coordinates, field-space methods), the region's method entry in `methods.json` and `methods.md`, the region's spec in `specs/`, and the generated targets (`python art/species-construction/loop/spec_targets.py akinza <region> --baseline <baseline assembly>`).

## What to build

1. The script the method entry names, in `art/species-construction/`, with the interface it states (inputs, parameters, outputs). Follow the existing field-space generators (`rebuild_arms_field.py`, `rebuild_hind_paws_field.py`, `author_fan_clumps_field.py`) for provenance, records and the closed-solid checks. Every geometric choice a builder might tune is a parameter with a default, read from a spec JSON when the tool takes one. Reuse work already in the repository for the region (earlier candidates, WIP scripts) instead of starting over, and say what you reused.
2. A starter recipe: `recipe.py add <baseline recipe> loop/recipes/tool-<region>.json --after <step> --step <step.json>`, with the new step tagged with the region, then `recipe.py build` it.
3. Smoke checks, all required: the step builds and the assembly passes `loop_tools.py check`; `recipe.py contain` keeps foreign regions under .002 figure heights; `loop_tools.py quick` against the baseline shows the region changed in the direction the spec asks; `seam_check.py` shows no new defect at the region's joints. Run one `recipe.py sweep` over the two or three parameters a builder will most need, to show they move the result.
4. Write `loop/tools/<region>.json`: `{"region", "script", "recipe", "parameters": [{name, default, what}], "checks": {...}, "notes"}`. Commit the script, the starter recipe, any spec JSON and the tools record by name.

Budget: at most eight component builds plus sweeps. If the method cannot be built as stated, write `ready: false` with the reason and what would work instead; that goes to the method review.

Never edit references, evidence, acceptance files, the rubric, invariants, specs or other regions' steps. Never edit a shared helper module. Plain commit messages, no Co-Authored-By trailer, American English, no em dashes.

## Modeling scope (2026-10-02, Nick: textures and painting have not started)

The model is construction geometry, judged as untextured clay. It owns everything visible in the outline or at the scale of the coat masses: overall shapes and proportions, lock and tuft counts, lengths, directions and pointed tips that break the outline, how masses overlap, and soft rounded cross sections with no facets, serrated edges, seams or spikes. It does not own anything finer than a lock: fur strands, fluffiness, color, markings and fine creases belong to the surface phase (painted textures, normal maps or a fur shader), recorded in `../surface-backlog.md`. Words like shaggy, fluffy, furred or soft in the rubric mean clump-scale form, never strand detail. Do not model strands, and do not fail or reject a coat for lacking them.

## Long commands

Start any command that can take more than a minute (`recipe.py build`, `candidate`, `sweep`, `run-plan`, a packet) with the Bash tool's `run_in_background` and wait for its completion notice. Never `sleep`, poll, tail logs or open a Monitor while it runs: every turn re-reads the whole conversation (the 2026-10-02 audit counted 254 sleeps and 168 monitors, about 11 wasted turns per builder). `recipe.py candidate <recipe> --baseline <baseline packet>` runs build, check, packet, measured, diff, seams and containment in one call and prints one summary line; use it instead of chaining them.
