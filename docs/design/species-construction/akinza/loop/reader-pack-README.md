# Reader pack

Built by `art/species-construction/loop/reader_pack.py <baseline packet> <candidate packet> --regions R04[,R06] --out <dir> --seed <text>`. Readers get `pack-NN.png` and `pack.json`; they never get `key.json`.

## Layout

For each region asked about, two images in this order, then one whole-figure image. A pack for two regions is five images.

- Region panel: A on the left, B on the right, each under a large letter. The same fixed cameras and the same scale on both sides (the packet's detail renders, label strips removed; the small grey words are only the view names). Up to six views per side.
- Reference panel: the first sheet cropped to the region's rows (front, left or back as fits the region), plus the accepted studies for it (face, paws, back study, head clay study). The sheet is a painting with fur strands; judge clump-scale form and softness, not strand detail. The head clay study's inward gaze is not part of the target.
- Whole-figure panel: A left, B right, each front, left and back of the figure in one fixed frame and one crop.

File names are `pack-01.png` and so on. No assembly or round number appears in an image, a file name or `pack.json`. The A/B assignment is one coin per pack from `sha256(seed | baseline | candidate | regions)`, recorded in `key.json` (`aIsCandidate`), so a pack can be rebuilt and unblinded later.

## Questions

`pack.json` lists each panel with its question. Per region: which of A or B is closer to the Reference in that region, answer A, B or tie, naming the one visible difference that decides it. Whole figure: which reads more like the Reference creature as a whole. Readers ignore the arms-down stance and nothing else about the pose. Use three readers on Opus per pack; the majority answer is the pairwise verdict; unblind with `key.json`.

## Not in the pack

Numbers, checklist lines, seam or surface statistics. `surface_stats.py` (hardness per region) is a separate guard for the sweep scorer, not reader input.
