# Pass 6 (build B-23xc): toes and claws on the generated paws, nothing else

This addendum follows pass 5. Conventions and deliverables as BRIEF.md, build id B-23xc, output folder C:\dev\art-data\pipeline\codex-stream\luceras-paws\pass6\.

## What Nick wants (2026-10-15)

The generated paws are the right shape and size. What they lack is the detail: separate toes and claws. "We still want that in place." Every earlier paw build changed the paw's shape while adding detail; that is what made them swollen or boxy. This pass adds detail on top of the generated paw and changes nothing else.

## Base

Your pass 5 result: C:\dev\art-data\pipeline\codex-stream\luceras-paws\pass5\paws.blend (the generated paws restored on all four feet, with a seamless join). If pass 5 left no paws.blend, stop and report.

## Hold (hard)

The paw's outline and size stay the generated paw's: from the side, front and top, the silhouette of every paw (claws excluded) stays within 1 mm of pass 5, and the paw's length, width and height are unchanged to within 1 mm. Measure and report it.

## What to add

1. Toes: four toes per paw, defined only by carving: shallow clefts between the toes, cut into the existing surface along the lines where the generated paw already suggests its toes (the creases the reconstruction made), about 2 to 3 mm deep and narrow, running back from the toe tips over about the front 40 percent of the paw, so they read as dark lines between rounded toes as on the clay paw crops (C:\dev\art-data\pipeline\codex-stream\luceras-paws\pass2\references\). Optionally a slight rounding of each toe's top between the clefts (at most 1 mm outward). No other surface change.
2. Claws: one dark claw per toe (value 0.12 linear), a separate rigid object growing straight out of the toe tip, curving down toward the ground, sized like the clay's: about a quarter of the toe's visible length, thick at the root. Bone-parented to leg_hl_03 / leg_hr_03 / leg_fl_03 / leg_fr_03. Reuse the claw shapes from your pass 2 (pass2\paws.blend) scaled to fit, or make new ones.
3. Dewclaws: one small dark claw on the back of each fore wrist, as the clay front view shows, bone-parented to leg_fl_03 / leg_fr_03.

Mirror left to right. One closed manifold body; weights unchanged (carving only moves vertices inward).

## Proof

- Silhouette and size numbers against pass 5 (claws excluded), per paw.
- compare_render.py on your result (tag "pass6") and triples composed with column 1 the generated renders (C:\dev\art-data\pipeline\codex-stream\luceras-compare\generated_*.png), column 2 yours, column 3 the clay. The paw must be the same size and shape as column 1, with visible toes and claws. Look at them yourself before you stop.

Slot lock owner "codex B-23xc paws". Cap 30 minutes. When done, print the path of report.json and stop.
