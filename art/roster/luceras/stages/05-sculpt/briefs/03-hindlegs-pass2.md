# Pass 2 (build B-kgav): fix the hind paw, defect D-g4sb

The orchestrator read pass 1 (B-xcbx). The thigh, rump mass, stifle, gaskin, hock and belly tuck read as the clay: keep them exactly. One defect remains, and this pass fixes only it.

Defect D-g4sb, both hind paws, seen at leg_side, leg_front_three_quarter and leg_three_quarter_rear: the paw reads as a flat slipper, not the clay's long four-toed paw.

1. Toes: on the clay each hind toe is a long separate digit. The clefts between toes run back over about the front 40 percent of the paw length, deep enough that light passes between the toes in the side and three-quarter views. Each toe shows two knuckle bumps along its top and a rounded pad underneath, and the toe tips lift slightly where the claw starts. Pass 1 separates the toes only at their tips.
2. Claws: on the clay the claws are large dark hooks, roughly a quarter of the toe's length (about 25 to 30 mm on this creature), thick at the root and curving down past the toe tip to touch or nearly touch the ground. They are the most visible detail of the paw at the side camera. Pass 1 claws are about 10 mm and nearly invisible. Make them large enough to read at the side leg camera at 1024 px and as dark points at 192 px (render them in a darker gray than the clay, value about 0.12 linear, so they read as they will in the look stage).
3. Heel: on the clay the metatarsus runs straight down into a clean narrow heel, with the foot's sole lying flat forward from it. Pass 1 has a bulbous blob at the back of the paw where the metatarsus meets it (visible in the rear and three-quarter rear views). Slim it so the metatarsus silhouette continues into the heel without a bulge.

Base: pass 1's hindlegs.blend (blob 0fffa66c7806c08ec385251af235505d224c2e8305b09ce7804850d9f0fab507, also C:\dev\art-data\pipeline\codex-stream\luceras-hindlegs\pass1\hindlegs.blend). Holds: everything outside the two paws below the lower third of the metatarsus is unmoved (measure it, including the thigh, gaskin, hock and the belly band from pass 1); joint positions unchanged; paw length and stance width within 5 percent; one closed manifold body, claws as separate rigid objects bone-parented to leg_hl_03 / leg_hr_03; weights at most 4 influences; mirror left to right exactly; whole creature under 400K triangles.

Same conventions, tooling location (extend art/pipeline/sculpt/build_hindlegs.py with a pass-2 stage or add build_hindpaw.py beside it), self-review notes (iter_notes.json, per iteration, what reads wrong with a number) and slot lock as BRIEF.md. Add one camera to legcam.py: a close paw camera (side and front three-quarter, framed on the paw from the lower metatarsus to the claw tips), and composite it beside a crop of the clay's hind paw.

Deliverables in C:\dev\art-data\pipeline\codex-stream\luceras-hindlegs\pass2\: as BRIEF.md (hindlegs.blend, hindlegs.glb, hindlegs_part.glb, the leg and full-body renders, the 192 px sprite, composites, progress.png showing pass 1 paw beside the iterations, measurements.json adding toe cleft depth as a fraction of paw length, claw length, heel width at 30 mm above ground; report.json with build id B-kgav and the same five checks, the paw check first).

Cap 45 minutes. When done, print the path of report.json and stop.
