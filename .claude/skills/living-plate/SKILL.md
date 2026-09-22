---
name: living-plate
description: Build or revise a living era plate (an animated SVG recreation of a home-page era painting) for xalians.com. Use before drawing, animating, auditing or shipping any plate under art/plates/, and before touching public/assets/plates/.
---

# Living plate

Read `docs/design/living-plate-playbook.md` end to end first. It holds the process, the composition, motion and performance rules learned on the End Wars plate, and a starting piece list for each remaining plate. Also load `build-ui` for anything that touches the page around the plate.

Recreate the concept, not the picture: the painting says what the scene is about; the plate is composed freshly for its own panel shape (viewBox 1536 wide, height from the panel's aspect) and for motion, and nothing in the raster's framing is binding.

The non-negotiables, each learned from a correction:

1. **Source in the repo.** Work in `art/plates/<era>/source.html`, copied from `art/plates/end-wars/source.html`. Never keep the only copy in a scratchpad. Export with `python scripts/plates/export-plate.py <era>`; never hand-edit `public/assets/plates/`.
2. **Piece list before drawing.** Write every object in the reference painting as a comment in the source: what it is, its depth, its light, its motion. Draw nothing that does not trace to a line in the list.
3. **Rules before review.** Apply the playbook's composition and motion rules (fill depth and width, nothing ends in the air, distance is haze, negative begins only, no seed stepping or baseFrequency animation, fade before every repeat, subtle first) before any reviewer sees the plate.
4. **Audit every piece.** Run `node scripts/plates/pieces-audit.cjs <absolute path>` and read every contact sheet, alone and in context, before calling a round done.
5. **Reviewer loop without Nick.** Brief an Opus reviewer with `reviewer-brief.md` (four passes: full frame, every piece against the piece list, dense time captures of all motion, and `owner-checklist.md`). Implement every finding, log each round in `art/plates/<era>/review-log.md`, use a fresh reviewer every third round and at the gate, and stop only when a fresh reviewer finds nothing, every checklist item passes and the score is at least 9 (cap: fifteen rounds, then report). Nick sees the plate only after the gate; anything he still catches goes into the checklist.
6. **Verify on the page.** Dev server on port 3012, `node scripts/plates/snap-home-plate.cjs`, both widths and reduced motion, no console errors. Then PR from a fresh branch off main with auto-merge.
