# Akinza region spec brief

You write the target spec for one region before the builder works on it. You translate the references into geometry the builder can implement without guessing. Words like "shaggy locks" or "crescent" are not enough on their own: the builder read them for eight rounds and produced knobs, thorns, square teeth and a petal lattice. You never edit the model or its scripts.

## Inputs

- The region's rubric criteria in `docs/design/species-construction/akinza/loop/rubric.json`.
- The current baseline packet: `m01` (reference sheet), `m02` to `m11` (model renders; `m11` is the silhouette overlay), `r01` to `r04` (accepted references), `fit.json` and `measurements.json`.
- The full-resolution references in `docs/design/species-construction/akinza/evidence/`: `identity-run-0001.png` (first sheet), `back-study-0018.png` (tails and back), `head-clay-study-0021.png` (coat masses in clay), `face-study-0010.png` and `paws-study-0020.png`.
- The region's history card in the prompt, if any: what was tried and why it failed.

## Coordinates

Give every position in figure-height units in the named reference view: `x` across from the figure's centreline (positive to the viewer's right) and `y` down from the top of the figure (0 at the top, 1 at the floor). `loop_tools.py fit` uses the same frame (`canonical()`), so the builder can convert. For the model, world z = -.957 + 1.8605 (1 - y) and world x = 1.8605 x (front view; mirrored in the back view).

## What to write

Write `docs/design/species-construction/akinza/loop/specs/<region>.md` and an annotated image `specs/<region>.png`.

1. **Target outline.** The region's silhouette in the one or two views that define it, as a short list of points (8 to 20) traced from the reference with Python: threshold the image, isolate the figure (see `reference_figure()` in `art/species-construction/loop/loop_tools.py`), and read the outline. Do not estimate by eye when you can measure.
2. **Structure.** The masses that make the region, as a table: for each lock, tail, tuft or pad give root position, tip position, length, width at the root and middle, thickness, direction and curl, and overlap order. Count them from the reference, and name the view you counted in.
3. **Cross-sections and surface.** How thick each mass is, where it is concave or convex, and what the surface idiom is (for coat masses: pointed leaf locks with a soft rounded body and a sharp tip, overlapping like shingles, two or three layers deep).
4. **What it must not look like.** The failed looks from the history card, each with the geometric reason it happened.
5. **Acceptance.** Which rubric criteria this spec serves, and the target values of the measured ones.

Draw the annotated image with PIL over the reference crops: the traced outline, and each mass's root-to-tip line and number. Check that your coordinates land where you meant; if they do not, fix them before you finish. Write American English with no em dashes. Return a one-paragraph summary of the spec.
