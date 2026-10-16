# Pass 10 (build B-7txf): fill the pits, four toes per paw, one claw per toe

Base: your pass 9 result C:\dev\art-data\pipeline\codex-stream\luceras-paws\pass9\paws.blend. Output folder C:\dev\art-data\pipeline\codex-stream\luceras-paws\pass10\, build id B-7txf. Conventions as BRIEF.md.

Nick, looking at the fore paws front view of pass 9: "I see two holes in the foot on the right, and there looks to be 5 toes but 4 claws." Both come from the generated (reconstructed) fore paws: your pass 6 report already listed "the original fore dorsal pit and distal notch". The clay has four toes on every paw.

## Do

1. Audit all four paws first and write the result into iter_notes.json: every pit, hole, notch or dent on each paw (position, size), and the number of toe lumps on each paw as seen from the front, side and top.
2. Fill every pit, hole and notch: push those vertices out to the surrounding surface and smooth locally, so the skin is continuous. No other change to the paw's shape.
3. Four toes per paw: where a paw shows five toe lumps (the right fore paw does, possibly others), blend the extra lump into its neighbor or into the paw side so four toes read, each separated by the shallow cleft from pass 6. Keep the paw's outline and size within 1 mm of pass 9 apart from removing that lump.
4. One claw per toe: re-seat the four short blunt claws from pass 9 so each sits centered on one of the four toes and grows out of its tip. Dewclaws unchanged.
5. Mirror the result left to right where the two paws now match; at minimum both fore paws and both hind paws must have four toes, four claws and no holes.

## Proof

- iter_notes.json audit before and after (pits found and filled, toe count per paw).
- Outline and size against pass 9 per paw.
- compare_render.py (tag "pass10") and triples as before; also a close front render of each fore paw and a close top render of each hind paw at 1024 px. Look at each yourself and count toes and claws, and check for any dark spot or hole, before you stop.

Slot lock owner "codex B-7txf paws". Cap 20 minutes. When done, print the path of report.json and stop.
