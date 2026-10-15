# Pass 5 (build B-rh4f): restore the generated paws exactly

This addendum replaces PASS3.md and PASS4.md. Scope, conventions and deliverables stay as BRIEF.md says, with build id B-rh4f and output folder C:\dev\art-data\pipeline\codex-stream\luceras-paws\pass5\.

## What Nick wants (2026-10-15)

"I just want the generated paw. The different percentages were supposed to be for what they had produced last to get it back to what was the generated paw. I don't need a smaller version of the generated paw."

The orchestrator misread his earlier note as "make the generated paw smaller"; it was "the built paw is bigger than the generated one, go back to the generated one". So: all four paws are the generated paws, exactly as the reconstruction made them. No scaling, no slimming, no claws, no clefts, no dewclaws, no surface edits on the paws.

## Method

1. Base: the merged file C:\dev\art-data\pipeline\codex-stream\luceras-merge\merged.blend. Its fore paws are the generated ones already; confirm by comparing their vertices below 65 mm with C:\dev\art-data\pipeline\claude-stream\luceras-torso\pass1\torso.blend (should be identical; if not, restore them too).
2. Hind paws: replace the current hind paws with the generated hind paws from torso.blend. Your pass 3 and pass 4 grafts left a visible cuff (a flat band and a shading line on the lower leg just above the foot). Avoid it this time: take the generated surface from torso.blend for everything below the hock tendon area where the two files first differ (find that height by measuring the distance between the two files' lower-leg surfaces, and graft where they are within about 0.5 mm of each other), and blend over a tall band (at least 30 mm) by moving the current file's vertices onto a weighted mix of the two surfaces, so there is no ring, step, flat band or change in shading. Weights by nearest surface from torso.blend for the restored vertices, at most 4 influences. One closed manifold body.
3. Remove any claw or dewclaw objects your earlier passes added. Nothing else in the file changes.

## Proof

- Below the graft line, every restored paw vertex equals the torso.blend paw (max distance 0, or report the number).
- Above the blend band, every vertex equals merged.blend (max distance 0).
- Render with C:\dev\src\xalians-creature-pipeline\art\pipeline\sculpt\compare_render.py (tag "pass5") and compose triples with column 1 the generated renders (C:\dev\art-data\pipeline\codex-stream\luceras-compare\generated_*.png), column 2 yours, column 3 the clay. The paws in columns 1 and 2 must look the same; the only allowed difference is the legs above the paws (the approved hind leg and foreleg passes). Look at the hind paw side and three-quarter triples yourself for any band or line at the join, and fix it if you see one.

Slot lock owner "codex B-rh4f paws". Cap 25 minutes. When done, print the path of report.json and stop.
