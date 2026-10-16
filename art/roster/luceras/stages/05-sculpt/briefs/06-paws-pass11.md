# Pass 11 (build B-q7ax): clean up pass 10

Base: your pass 10 result C:\dev\art-data\pipeline\codex-stream\luceras-paws\pass10\paws.blend. Output folder C:\dev\art-data\pipeline\codex-stream\luceras-paws\pass11\, build id B-q7ax. Conventions as BRIEF.md.

Pass 10 fixed what Nick found (no holes, four toes, four claws per paw). Fix exactly the leftovers your pass 10 report named, nothing else:

1. The small jagged nubs and angular dents at the hind toe ends and along the cleft edges (visible in composite_close_hind_paw_front_three_quarter_vs_clay.png as irregular bumps between and under the claws): smooth them so each toe ends in one rounded tip under its claw.
2. The flattened hind flank where the side lump was removed: round it back into the paw's curve (restore up to half of the 7.5 mm width lost, so the paw side reads rounded, not cut).
3. The right outer hind claw that is nearly flush: seat it like its neighbors.

Hold: four toes, four claws, no holes on every paw (count them again); everything above 65 mm unchanged (max distance 0); the paw outline otherwise within 1 mm of pass 10.

Before you stop, run the critic checklist yourself on the close renders of all four paws and write it in report.json: toes per paw, claws per paw, any hole, pit, dent, nub, dark spot or floating piece (with position). Only stop with an empty defect list or the cap.

Render compare_render.py (tag "pass11"), triples as before, and the close paw composites as in pass 10.

Slot lock owner "codex B-q7ax paws". Cap 15 minutes. When done, print the path of report.json and stop.
