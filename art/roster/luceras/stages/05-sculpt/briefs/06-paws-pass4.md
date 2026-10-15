# Pass 4 (build B-vsb3): the generated paw shape, evenly less tall

This addendum replaces PASS3.md (that run was stopped). Scope, holds, conventions and deliverables stay as BRIEF.md says, with build id B-vsb3 and output folder C:\dev\art-data\pipeline\codex-stream\luceras-paws\pass4\. Your pass 3 folder (pass3\) has useful pieces: the hind paw graft from the torso build and the clay measurements in iter_notes.json; reuse them.

## What Nick said, watching pass 3 (2026-10-15)

"It looks like Codex is going with an approach of something that results in the foot tapering off more. And that's not really what I want. The shape that was there was the right shape. It was just thick and swollen. Whereas the adjustments it's been making seem to just be tapering the shape to try and balance the heaviness rather than making the whole foot less tall."

So: keep the generated paw's shape exactly (its outline from the side and from above, its length, its toes as the reconstruction made them). Make the whole foot less tall, evenly from heel to toe tips. No taper, no narrowing toward the toes, no reshaping.

## Method

1. Base: the merged file with the generated paws on all four feet (the fore paws in C:\dev\art-data\pipeline\codex-stream\luceras-merge\merged.blend are generated; the hind ones you grafted back from the torso build in pass 3; reuse that graft if it left no seam, redo it if it did).
2. Height: compress the paw region vertically about the ground plane (z = 0) by one factor s that is the same everywhere along the foot: every paw vertex at height z goes to s times z, up to the top of the paw. Above the top of the paw, blend the factor smoothly back to 1 by 65 mm so the leg is untouched and there is no step. The sole stays on the ground. Do not scale X or Y.
3. Thickness: Nick also said "thick and swollen". After the height, if the paw still reads swollen from the front, you may narrow it in X by one factor that is the same along the whole length (not stronger at the toes), at most 10 percent. Say whether you did.
4. Make three variants, s = 0.85, 0.75 and 0.65, each a full creature file (paws_s085.blend, paws_s075.blend, paws_s065.blend). Seat the dark claws from your pass 2 on the toe tips of each variant (scaled to fit, growing from the tips), and the dewclaws on the back of the fore wrists. No clefts or other surface edits in this pass.
5. One closed manifold body per file, weights unchanged except by the move, at most 4 influences, mirror exact where the generated mesh allows.

## Deliverables

For each variant, render the three-way comparison with C:\dev\src\xalians-creature-pipeline\art\pipeline\sculpt\compare_render.py (tags s085, s075, s065) and compose triples with C:\dev\src\xalians-creature-pipeline\art\pipeline\sculpt\compare_triple.py adapted so column 1 is the generated paws (C:\dev\art-data\pipeline\codex-stream\luceras-compare\generated_*.png), column 2 the variant, column 3 the clay. Also one strip per view with the generated paw and the three variants side by side (variants_<view>.png), which is what Nick will pick from. measurements.json: per variant and paw type, the paw height at the knuckles and at the heel, its ratio to paw length, and the clay's ratio beside it. report.json with build id B-vsb3, and `checks` naming the views.

Slot lock owner "codex B-vsb3 paws". Cap 35 minutes. When done, print the path of report.json and stop.
