# Pass 7 (build B-vhr6): claws sized to the clay, claw objects only

Base: your pass 6 result C:\dev\art-data\pipeline\codex-stream\luceras-paws\pass6\paws.blend. Output folder C:\dev\art-data\pipeline\codex-stream\luceras-paws\pass7\, build id B-vhr6. Conventions as BRIEF.md.

The orchestrator read pass 6: the paw shape is exactly kept (good, keep it). The claws are thin small spikes; on the clay (C:\dev\art-data\pipeline\codex-stream\luceras-paws\pass2\references\ hind_side_clay_crop.png, hind_front_three_quarter_clay_crop.png, fore_front_clay_crop.png) they are the most visible detail of the paw: broad dark hooks, as wide at the root as the toe tip they grow from, each about a third of the toe's visible length, arching forward and down so the point reaches the ground just in front of the toe. Measure claw length and root width as fractions of paw length from the clay crops first and write them in iter_notes.json, then match within 15 percent.

Change only the claw and dewclaw objects (replace or rescale them; a cone-like hook with a broad, slightly flattened root and a curved, tapering point). Seat each root over its toe tip so the toe flows into the claw with no gap. The body mesh does not change at all: prove its vertices are identical to pass 6 (max distance 0).

Render compare_render.py (tag "pass7") and compose triples as pass 6 did, column 2 being yours. Look at the hind paw side, hind paw three-quarter and fore paws front triples yourself; the claws must read at those cameras the way the clay's do, and as dark points at full-body size.

Slot lock owner "codex B-vhr6 claws". Cap 15 minutes. When done, print the path of report.json and stop.
