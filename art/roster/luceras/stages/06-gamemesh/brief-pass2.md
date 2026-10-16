# Pass 2 (build B-97qx): remove the visible losses

Base: your pass 1 in C:\dev\art-data\pipeline\codex-stream\luceras-gamemesh\pass1\ (gamemesh.blend and its tooling). Output folder pass2\, build id B-97qx. Everything in BRIEF.md still holds.

The orchestrator read pass 1. The budgets pass (11,932 triangles, 40 joints, 4 influences, 0 unweighted, 2 materials, texel ratio 1.06), the pose grid deforms cleanly, and the sprite size reads the same as the sculpt. At the close cameras four things read as loss (check_head_three_quarter.png, check_hind_paw_side.png):

1. Ears: the outline is torn and jagged, with a dark gap where the ear meets the head behind the horn base. The ear must have a smooth rounded rim and a closed, smooth root. Rebuild the ear region with its own clean loops (a small ear patch with rings following the rim) joined to the head, rather than QuadriFlow's result.
2. Horns: the top edge is lumpy because the ring ridges became facets in the silhouette. Use more segments along the horn's length and fewer around its girth, so the silhouette curve is smooth and the ridges live in the normal map. Same budget per horn or less.
3. Toes: the toe tips and claws on the hind paws read softer and merged. Give each toe tip a little more density so the four toe ends and the claw seats read as in the sculpt.
4. Muzzle: slightly soft at the nose and lip; a little more density there.

Also:
- Total triangles at or under 11,500. Take the triangles from the flat regions (flank, back, thigh sides, tail mid) where the bake carries the detail.
- Verify the joint edge rings: for each of shoulder, elbow, wrist, hip, stifle, hock, neck and the tail joints, count the edge rings across the bend within the bend zone and report them; add rings where fewer than three.
- Re-bake normal and AO for the changed mesh; re-run the weights transfer and the pose grid.

Same deliverables as BRIEF.md in pass2\, plus check renders of the ear close (three-quarter and side) and of the horn silhouette against the sky (side).

Slot lock owner "codex B-97qx gamemesh". Cap 45 minutes. When done, print the path of report.json and stop.
