# Fur step 12b2 work record

Outcome: fill the lower inner ear blue to the ear-head crease and make a sparse, fine white tuft sweep up and outward over that blue. Compare against Nick's circled screenshot.

Scope: build on s12c-fix, at most four tries, unchanged assembled-3300 geometry and all other fur regions. Keep T7, white temples and side of head, eye/nose coverage, skull flow and 12c directions. Use the exact three 12b cameras near 1000 pixels. Commit explicit paths only; Claude pushes.

Completion criteria: visible blue extension and intentional translucent furnishings; zero head-fur cup tint within .02/.04/.06 of the ear and within .02 of the eyes; protected geometry and fur unchanged; three before/now pairs inspected full size and independently audited; logs, metrics, separate commit and superseded-surface archive.

Method: move the thickness cutoff toward the crease while retaining a hard exclusion of thick skull skin. Bake the existing evaluated strands and patch only the ear-root curves, so changes to global procedural density cannot move unrelated fur. Preserve the baseline until after committing.

Evidence completed: read AGENTS.md, CLAUDE.md, platform handoff and design of record, completion audit, brief, last ten progress lines and twelve commits. Inspected Nick's circle. Recovered original 12b cameras and thickness diagnostic from the earlier step's scratch files.

Build history: try 1 failed before saving because evaluated cup attributes are on curves rather than points. Try 2 saved the patch, but numeric review found unintended mask increases at upper ear rims. Try 3 restricts only the new extension with a smooth ear-root zone and retains the original mask elsewhere. The failed invocation counts toward the four-try cap, leaving one further build if visual inspection requires it.

Try 2 measurements: no removed skin blue, head-skin mean/max cupm exactly zero within .02/.04/.06 of the thin ear (1088/4084/9005 vertices), eye-adjacent mean/max zero within .02 (34749 vertices). All unselected curve point positions unchanged. These are intermediate checks, not final-result evidence.

Try 3 saved: 4264 affected curves, 195 fine white furnishings, 4391 skin vertices with blue increased by more than .01, no removed blue. Changed root bounds: abs(x) <= .255, y >= -.0381, z .606-.818. Unselected curve maximum coordinate delta is exactly zero. This surface is a baked local pass, reproduced by `refine_ear_root_12b2.py` from the parent surface and `akinza-ear-root-12b2.json`; the main build settings retain the accepted parent grooming.

Before evidence: all three original 12b cameras rendered anew on s12c-fix into `fur-steps/12b2-before/`. Source strand/skin NPZ copied there for reproducible comparisons after the source surface is archived.

Try 3 close-up audit: builder and independent reviewer inspected the original-size before and now close-ups against Nick's circle. Blue visibly fills substantially farther into the lower gap, including the lower lobe. Separate fine white hairs rise through it, with clear blue gaps. The adjacent white temple field appears held. The reviewer sees a sparse root-edge fringe, no solid band or feather forms, and no substantive close-up blocker. Visible residual: upward sweep is stronger than outward sweep, and several fine filaments are nearly straight and parallel, giving a slightly mechanical combed appearance. This is not a claim of Nick's approval.

Final inspection: all three original-size before/now images and all three pairs inspected by the builder; all three views inspected independently. Both ear-root blue fields extend to the crease. Fine white furnishings remain separate, with blue between them. Side-head white, muzzle, eyes/nose, ear tips and upper rim show no visible regression. The same straight/parallel fine-hair residual remains; no subjective approval is claimed. See `fur-12b2-review.md`.

Saved-file checks: all mesh coordinates/topology and material slots match the parent; all exported scalar/vector/integer/boolean attributes on untouched fur curves and points match by SHA-256. Roots and strand topology match. All skin attributes except cupm are identical. Below-head fur and upper/outer ear curves have zero maximum position change. `fur-12b2-protection.json` and `fur-12b2-metrics.json` retain the evidence.

Tint measurements: broad 12b-style fur-bearing thick-skin samples within .02/.04/.06 of the thin ear retain mean/max cupm 0 (1088/4084/9005 vertices). Skin within .02 of eyes retains mean/max 0 (34749 vertices). Actual skull-fur roots, using the prior 12c lateral-skull bound abs(x) < .17, also have mean/max 0 in those ear bands (60/1480/5894 roots) and eye band (4692 roots). The added actual-fur check initially failed because thickness ray misses classify 74 unchanged peripheral ear-rim curves as head; these have inherited cupm up to .05627288, minimum abs(x) .1926415, and none changed. The original broad skin metrics are retained; the anatomical fur domain and inherited samples are disclosed rather than silently changing the result.

Build budget: three invocations including the initial failed invocation, two saved candidates, only the final candidate rendered. The fourth invocation was not needed after full-size and independent review. Blender jobs ran serially; foreign jobs caused repeated pauses and were not modified.

Delivery: committed the explicit step paths, then moved the superseded source to `C:/Users/njord/.claude/scratch-archive/Xalians/2026-10-15/s12c-fix/` using verified absolute source/destination paths. The current surface remains `untracked/species-construction/akinza/surface/fur-steps/s12b2/surface.blend`. Before images and source NPZ remain in `12b2-before/`. No push was performed. The delivery record is finalized in the same step commit.

Audit evidence: this worktree's construction paths resolve into `C:/dev/art-data/`, so the repository-contained audit gate cannot bind them directly. Byte-identical copies of this step's brief, reference, surface, patch evidence and three final pairs are bound under `.codex/audit-state/fur-12b2-evidence/`; their hashes are checked against the current source artifacts. This is a gate path constraint, not a model-quality finding.

Completion boundary: exactly step 12b2 has been carried out and independently checked. No authorized modeling correction remains identified within this step. The visible straight/parallel fine-hair residual is disclosed for Claude's and Nick's review. Other fur-stage work and user approval remain separate.
