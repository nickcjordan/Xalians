# Species view pilot tools

Python with Pillow and numpy. Install `requirements.txt` into the chosen environment. No generation APIs or keys are used by these tools. Image generation is through the subscription tool, separately.

The contract is `docs/design/species-view-packs.md`. This first implementation is pilot tooling, not a declaration that any pack passes or is approved. Source SVG rasterization currently uses the already available CairoSVG as a preparation step; it is not needed for these five commands.

From the repository root:

```text
python art/species-views/split_sheet.py sheet.png boxes.json crops
python art/species-views/mask.py crops/front.png crops/front
python art/species-views/register.py crops/front.png crops/front.occupancy.png crops/front.mask.png views/front
python art/species-views/check.py views reference.occupancy.png --annotations annotations.json
python art/species-views/contact.py views reference.occupancy.png contact.png
python -m unittest discover -s art/species-views/tests -v
```

Run mask and register for each named view. Crop rectangles are `[left, top, right, bottom]` with exclusive right/bottom edges and keys `front`, `front-left`, `left`, `back`, `right`, `front-right`. Angles are fixed by those names. Registration accepts optional landmark rows via `--landmarks`, and records the actual uniform transform and resulting dimensions. A clipped crop is rejected, not repaired.

Masks are black foreground on white. White-background occupancy thresholds pixels and only fills enclosed light areas within explicitly supplied surface regions in the Python `derive` function. It leaves unannotated gaps intact, including spaces between arms and torso. The feature mask additionally thresholds luminance. This is an explicit, provisional pixel method. Pale fur and dark eyes can make it semantically wrong, so mask review and image-linked annotations are mandatory. It cannot invent correct anatomical segmentation. No reference outline is pasted onto an output to inflate its score.

Checks reject missing views and geometry, stale image bindings, inconsistent heights and ground rows, and missing semantic evidence. Source overlap and literal feature positions are diagnostic only under Nick's updated interpretation ruling. The back check currently uses bounding-box centering as a preliminary screen; body-axis correspondence still requires review. Source feature anchors and per-view landmark rows must be supplied. Occluded landmarks require a named occluder. Final-pack contact generation refuses failed or blocked reports. Clearly labeled construction studies use `art/species-construction/` and are not certified final-pack contact sheets.

Remaining before an approved pack: implement the full strict manifest schema, validate source annotation inventories independently of candidate annotations, bind the eye-region exception to the approved reading, strengthen part-inventory and body-axis checks, and store complete accepted-generation provenance. Until then, the checker explicitly blocks production validation even if its available diagnostics pass. Semantic annotations and this checker cannot promote a pack. The work record tracks those gaps. Do not treat hand-entered pass flags as proof of anatomy.
