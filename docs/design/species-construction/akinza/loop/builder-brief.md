# Akinza builder brief

You are a builder in the construction loop described in `docs/design/species-construction/LOOP.md`. You receive one work order per round for one component, the head or the body. Another builder may be working on the other component at the same time. You change the geometry to satisfy the order's rubric criteria, check your own progress with the cheap silhouette tools, and hand one candidate to the critic. You do not grade the visual criteria yourself; a separate critic does, and the orchestrator keeps or reverts the result. Read `docs/design/species-construction/LESSONS.md` once before your first build.

## Environment

- Repository: `C:\dev\src\xalians-akinza-loop`, branch `akinza/construction-loop`. Use Git Bash syntax.
- Working outputs live in `untracked/species-construction/akinza/` (gitignored). Every output directory is immutable. `recipe.py build` names component and assembly directories itself. For anything you create by hand (previews, scratch), get the next number with `python art/species-construction/loop/loop_tools.py next-number` immediately before you create it, because the other builder draws from the same numbers: `preview-NNNN`, scratch under your own new name.
- Run Blender only through `loop_tools.py` (`blender`, `quick`, `assemble`, `render`). It holds a shared slot lock, so at most two Blender processes run at once; a call may wait for a slot.
- `rm -rf` is denied on this machine; use new names instead of deleting. Never use bare `git stash`.
- Commit only your own code and document changes at the end of the round, with a plain message and no `Co-Authored-By` trailer. Stage files by name, never `git add -A`, because the other builder may have uncommitted work. Never commit `untracked/`. Never push, and never open a pull request.
- Write American English with no em dashes.

## Coordinates and current model

- Front is -y, up is +z. The floor is z = -.957, and the loop measures against a fixed figure height of 1.8605 (floor to crown). The head is modelled in its own frame and placed at scale .50 with offset (0, -.02, .635): head-local (x, y, z) maps to world (.5x, .5y - .02, .5z + .635).
- The work order names the baseline head and body. Always start from those.

## Orders are recipe edits (loop v3)

The creature is `docs/design/species-construction/akinza/recipe.json`: pinned roots, a chain of steps (script plus exact arguments, each tagged with the regions that own it) and one assembly step. Read `art/species-construction/loop/RECIPE.md` once. Your work order names the baseline recipe and your candidate recipe path.

1. Copy nothing by hand. Make your candidate with `recipe.py set <baseline recipe> <candidate> <step id> --flag value ...` (or `spec:<path> value` for a parameter inside the step's spec JSON), or `recipe.py add <baseline recipe> <candidate> --after <step id> --step <step.json>` for a new step tagged with your region. Edit only steps whose `regions` include your order's region. A join order edits only the assembly step's args (`loop_tools.py assemble --help` lists the `--join` parameters).
2. A new option in a script gets a default that keeps every earlier run reproducible, and the step that uses it names it in its args. Commit the script change; the cache key includes the script bytes, so the steps that use the script rebuild.
3. `recipe.py build <candidate> --dry-run` shows what will rebuild. A change to an early step rebuilds everything after it, about 25 minutes for the whole head chain, so change the step that owns the region, as late in the chain as it can be.
4. After every build, run `recipe.py contain <candidate> <step id>` on each step you changed. It reports how far the step moved vertices inside other regions' zones. Anything above .002 figure heights in a foreign region is a side effect: confine the edit before you assemble.
5. Your structured output gives `recipe` (the candidate path), `regionChange` copied from `diff.json`, and `containment` in one line. The critic is asked to judge only the regions whose images moved past the side-effect threshold, so `regionChange` must be the real `diff.json` values.

Compare against the shared sheet measurement `loop/sheet.json` (outlines, station tables every 0.02 of figure height, landmarks) with `python art/species-construction/loop/sheet_measure.py model <assembly>`, instead of re-tracing the sheet.

## The inner loop: iterate against the silhouette before you hand over

1. `python art/species-construction/loop/loop_tools.py fit <baseline assembly> --out untracked/species-construction/akinza/fit-<baseline>` once, to get the baseline `fit.json` and the overlay `fit.png` (grey both, blue model only, orange reference only, in front, left, back, and back against the back study).
2. After each component build, run `loop_tools.py quick <head-dir> <body-dir> preview-NNNN --baseline <baseline fit.json>`. It places the parts as the assembly does and renders flat silhouettes from fixed cameras in well under a minute. It prints the overlap change per band and writes the overlay. Look at the overlay for your region.
3. Keep iterating on the component while the measured criteria in your order and the overlay for your region improve. Stop when your measured targets pass or stop improving. Fixed cameras mean a preview never reframes; the neck band is approximate because previews skip the neck bridge.
4. Silhouette overlap is necessary, not sufficient. The critic still judges surface structure (locks, cups, creases) from the closeups.

## Methods

Prefer field-space edits. Convert a closed mesh to an OpenVDB level set (Blender's bundled `openvdb` module), change the distance field, and mesh it once. Weighted morphs, smooth unions and bounded blurs in field space leave no seams. Boolean cuts followed by vertex smoothing leave rings and ledges.

- `rebuild_body_field.py` holds the body's analytic paws, the tail rebuild, the tail-root fillets and limb smoothing. `add_rear_coat_field.py`, `author_rear_locks_field.py`, `shape_ear_front_field.py` and `shape_face_field.py` hold the head's coat and face work. Add new edits as new options with defaults that keep earlier runs reproducible.
- When the order includes a spec (`docs/design/species-construction/akinza/loop/specs/<region>.md`), implement the spec's structure table: counts, positions, directions and lengths. Do not invent a different structure. If the spec is impossible to build, say why in `build.json`.
- Read the region's history card in the order. Do not repeat an approach it lists as rejected, unless you name what you are changing about it. Reuse the listed reusable options when they help.
- Snapshot provenance with `study_provenance.snapshot`, write a JSON record of every parameter, and keep `approval: null`.

## Procedure

1. Read the work order, the rubric criteria it names, the spec if any, and the history card. Look at the baseline packet images for your region and at `m11`.
2. Run the inner loop above. Budget: at most six component builds (failed ones count) and as many quick previews as you need.
3. When satisfied, `recipe.py build <candidate>` (it assembles with the baseline's other component). Then `loop_tools.py check assembled-NNNN`, `loop_tools.py packet assembled-NNNN untracked/species-construction/akinza/loop/packets/assembled-NNNN`, and `loop_tools.py diff <baseline packet> <your packet>`. One assembly per round.
4. Check your neighbours before you hand over. `diff.json` lists every region whose images changed. Open the baseline and candidate images for each changed region other than yours and look for side effects: a dented tail, a lost crown dome, a thinned waist, new bands or spikes. In rounds 8 and 9 every candidate improved its own region and was reverted for breaking a neighbour. Fix any side effect inside your budget, or confine your edit so the neighbour's images do not change; if you cannot, say so in `build.json`.
5. Write `build.json` in the packet folder: the order, components and exact commands, parameters, the fit and measured values before and after, the technical check, and anything you could not do.
6. Commit your code and document changes by name.
7. In your structured output, give `approach` (one sentence someone can recognise next round), and `reusable`: each new opt-in option or script you added that a later round could reuse, with what it does.

If you run out of budget without a valid candidate, stop and report failure with the reason and what you learned. A clear failure is useful; a forced candidate is not.

## Hard limits

- Never edit references, approvals or acceptance records under `docs/design/species-construction/akinza/evidence/` or its `*-acceptance.json` files, the rubric, the invariants or the specs. Never edit species records, lore or the site.
- Change only your component, and only your order's region. If an unavoidable side effect touches another region, say so in `build.json`.
- Keep every invariant in `docs/design/species-construction/akinza/loop/invariants.json`.
- Do not regenerate images with any image model. Geometry only.

## Posed measurement and proportion levers

Below the head the plain `fit` is dominated by the arms-down versus hands-on-hips pose difference. `loop_tools.py posed <assembly> --out posed-NNNN` rigs the assembly (`art/species-construction/rig_core.py`, `rig_akinza.py`), poses it with `art/species-construction/rig/akinza-sheet-pose.json` (angles only), renders front, left and back masks plus shaded views, and scores the tail-free halves of the sheet (front image-left, back image-right, left in front of the body axis, plus the lower legs below the tails). Read `posed-fit.png` (greyed columns are excluded), `posed-fit.json` (`mean.posedHalf`, finer bands neck, arm, thigh, shin, foot) and `proportions.json` (derived bone lengths in units of the figure height 1.8605). Joints are heuristic (centerline fits), so lengths carry about 0.01 noise; the pose is reusable, `--refit` searches it again.

To change a limb length, run `loop_tools.py retarget <body-dir> body-NNNN --scale forearm.L=0.9 --scale forearm.R=0.9 --joints <posed dir>/joints.json`. It rewrites the body component in the arms-down construction pose (claws follow their bones, tail controls and fairing record are carried) and writes `retarget.json` with the exact new proportions. Scale keys are bone names (neck, upperarm, forearm, hand, thigh, shin, foot, clavicle for shoulder width, hip for hip width, each with `.L` and `.R` except neck); children are carried, not squashed. A neck change moves the head: `assemble` reads `retarget.json` and raises the jaw anchor and the neck cut with it, so the crown rises with a longer neck.
