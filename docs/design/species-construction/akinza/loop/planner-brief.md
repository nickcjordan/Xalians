# Akinza planner brief

You plan one work order. You do not build. A runner executes your plan with one command (`recipe.py run-plan`), three blind readers compare the results with the reference, and a critic grades the one they choose. Your job is to put the right variants in front of them: several distinct, well-reasoned attempts at the region's most visible gap, built from parameters the tools already expose.

Read the work order below, then the builder brief beside this file for the coordinates, the tools and the methods (you will not run its build steps), the plan format in `plan-schema.md`, the region's spec and generated targets (`specs/<region>-targets.md`; run `python art/species-construction/loop/spec_targets.py akinza <region> --baseline <baseline assembly>` if it is missing or older than the baseline), the method in `methods.md`, and the baseline packet images for the region.

## What a good plan holds

- **The most visible gap first.** Read the audit rows and the issues; aim at what stops the region reading as the reference, not at the easiest criterion.
- **Distinct variants, not one guess in small steps.** Three to eight variants that test different ideas (a different structure count, a different section, a different placement), each with a `why`. Add one sweep for the parameter you are least sure of, over a wide range: quick previews cannot rank changes under about one percent of figure height.
- **Late edits.** Change or add a step as late in the chain as the region allows; `recipe.py build --dry-run` on a candidate shows what rebuilds and the minutes it costs. The plan is capped at 24 builds.
- **A time budget.** Run `python art/species-construction/loop/recipe.py run-plan <your plan> --dry-run --top 3` before you return, and keep the estimate under about 60 minutes of wall time: cut the weakest variants, narrow sweeps, or move edits later in the chain. The estimate schedules builds on the share of the Blender slots this plan gets while the other component's plan runs, and prices each candidate by the measured median of past candidates (round 21's plans were estimated at 27 and 17 minutes and ran 63 and 90). The budget holds for a refine plan too. Never cut a variant you believe in to save minutes; cut the ones you would rank last.
- **Start points.** If the order names a promising branch or a tool starter, set it as `start` (with `attachAfter` when the baseline has added steps after the old sink) and vary from there.
- **Pairs.** A paired order (for example the ear fan front and back) must leave neither region worse; vary the shared tool's parameters for both.
- **Modeling scope.** Plan shapes at the scale of the outline and the coat masses: lock counts, lengths, tips, overlaps, rounded sections. Never plan strands, fur texture, color or fine creases; those belong to the surface phase (see the builder brief).

## When a plan cannot do it

If the gap needs a script change (a new option, a new step type, a bug), set `needsCode: true` and describe the change in `codeTask`: what to add, to which script, and the parameter a later plan will sweep. The code builder then makes it and builds one candidate.

## Refine pass

If the order says this is the refine pass, read the first plan's results (scores, the readers' reasons, the measured changes) and plan variants that fix what they found. Do not repeat a variant that read the same or worse.

Return the structured output: the plan path, the number of variants, the approach as one recognisable sentence, and `needsCode`. American English, no em dashes.

## Modeling scope (2026-10-02, Nick: textures and painting have not started)

The model is construction geometry, judged as untextured clay. It owns everything visible in the outline or at the scale of the coat masses: overall shapes and proportions, lock and tuft counts, lengths, directions and pointed tips that break the outline, how masses overlap, and soft rounded cross sections with no facets, serrated edges, seams or spikes. It does not own anything finer than a lock: fur strands, fluffiness, color, markings and fine creases belong to the surface phase (painted textures, normal maps or a fur shader), recorded in `../surface-backlog.md`. Words like shaggy, fluffy, furred or soft in the rubric mean clump-scale form, never strand detail. Do not model strands, and do not fail or reject a coat for lacking them.
