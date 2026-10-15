# Pass 3 (build B-gsn9): hind digit volume and instep, defect D-3sh5

The orchestrator read pass 2 (B-kgav). D-g4sb is fixed: the slipper read, the heel blob and the claw visibility are gone, and the claws read well. Keep the claws, the heel and everything at or above 65 mm exactly. One defect remains.

Defect D-3sh5, both hind paws, at paw_side and paw_front_three_quarter: the digits are too low and thin.

1. Digit volume: on the clay each hind toe is a thick digit. Its knuckle top stands about a third of the paw length above the ground, and its width nearly fills its share of the paw, so the four digits sit pressed side by side with tight clefts between them (the clefts read as dark lines, not open gaps). Pass 2 has low, narrow pads on a flat sole, with knuckle tops about a sixth of paw length high. Measure the clay's knuckle height and digit width as fractions of paw length from the paw crops first (side and front three-quarter), write those numbers in iter_notes.json, then match them within 15 percent.
2. Instep: on the clay the top of the paw is one long slope running from the lower metatarsus down over the digits to the claws. Pass 2 has a vertical step where the metatarsus meets the toes. Make the top line one continuous slope in the side view.

Base: pass 2's hindlegs.blend (blob 2bed33840d829d8a2c7cb57c0ccae5c2ee7a88dcdef7793ea3ee3fe22ff1acd1, also C:\dev\art-data\pipeline\codex-stream\luceras-hindlegs\pass2\hindlegs.blend). Holds as pass 2: everything at or above 65 mm unmoved (measure it), the claws kept as they are apart from re-seating them on the new toe tips, joint positions unchanged, paw length and stance width within 5 percent, one closed manifold body, at most 4 influences, exact left-right mirror, under 400K triangles.

Another builder is working on the forelegs at the same time, on a copy of the same pass 2 file. Do not touch the forelegs or their files (build_forelegs.py, forecam.py, run_forelegs.sh). Your own files are build_hindpaw.py, legcam.py and run_hindlegs.sh. Use the slot lock with owner "codex B-gsn9 hind paw". Same self-review, conventions and deliverables as BRIEF.md and PASS2.md, in C:\dev\art-data\pipeline\codex-stream\luceras-hindlegs\pass3\, with build id B-gsn9; add knuckle height and digit width (as fractions of paw length, beside the clay's) to measurements.json.

Cap 40 minutes. When done, print the path of report.json and stop.
