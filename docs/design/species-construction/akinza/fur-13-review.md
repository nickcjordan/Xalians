# Fur run 13 review

This run follows `untracked/species-construction/akinza/surface/fur-steps/briefs/13.md`. Art remains subject to Nick's review. No push from this run.

## 13a: material-only eyeliner choices

Default: `eyeliner.style` remains `current` in `art/species-construction/surface/akinza-surface.json`. Other values: `none`, `hairline`, `upper`, `cat-eye`, `ice-blue`. The regular renderer reads this option after loading the saved surface. `--eyeliner` can override it for a single render. The saved baseline is unchanged.

Reproduce the sheets with `python art/species-construction/surface/mockup_eyeliner_13a.py --rerender --surface <baseline folder>`. Pass the archived baseline folder after 13b supersedes s12f. Omitting `--rerender` reuses existing panels, so use it after shader edits.

| Choice | Requested treatment | Native inspection |
|---|---|---|
| A | Current liner | Held thick dark border, unchanged default. |
| B | None | No dark line. Existing smooth globe edge reads gray-white in close view, especially at the bottom/right. Fur meets its outside edge. |
| C | Hairline | Fresh signed-distance render is visibly thin all around at close and normal framing. First fractional-width attempt was rejected. |
| D | Upper only | Thin upper arc, no lower dark line. Outer-corner thickening is subtle. Fresh confirmation includes source provenance. |
| E | Cat-eye | Short connected upturned flick, very faint lower line; deeper charcoal blue helps both corners read. The key-light side remains a little fainter. First detached dash was rejected. |
| F | Ice-blue | Thin coat-stripe blue line around the eye; deliberately faint at normal size. |

All native close/head panels and both sheets inspected. Pixel-for-pixel sheet placement and dimensions checked. Exact requested names are `13a-eyeliner-options.png` and `13a-eyeliner-options-face.png`, under `untracked/species-construction/akinza/surface/fur-steps/`.

## 13b: rogue hairs

Second candidate visibly removes the upright rods and isolated diagonal in Nick's ear-tip area, preserving the coherent fringe and the approved front/back appearance. Independent native review found no further concrete visual defect. First candidate was rejected despite passing its originally loaded tests.

The final additive diagnostic includes straightness relative to neighbors, tip-envelope excess and off-flow direction, alongside the unchanged five 12d rules. It tests the entire saved coat, including ear rims/tips, tails, elbows and heels. Radius-only culling removes 431 curves; every coordinate and non-radius attribute is verified unchanged, including all meshes, material graphs, roots and transforms.

| Region | Rogue before | Rogue after |
|---|---:|---:|
| Chest/ribs |6|0|
| Neck |0|0|
| Head |111|0|
| Ears |183|0|
| Arms |5|0|
| Hands |0|0|
| Hips |3|0|
| Legs |0|0|
| Feet |0|0|
| Tails |0|0|
| Total |308|0|

Full saved legacy totals: collision 0 -> 0, neighbor length 76 -> 50, regional length 2067 -> 1965, part transfer 1707 -> 1618, lift 104 -> 89. No new flagged IDs or regional increases. Separate solid-object collision flags 0. Final labeled back and ear-tip pairs inspected and pixel-for-pixel sources checked. Promoted surface: `fur-steps/s12-13b/surface.blend`. Not user-approved.

## 13c: prominent ear furnishings

Pending model work. Hold skin blue down to the crease, white head sides, fixed geometry, T7, approved face/head/body and held 12e tails. Do not treat passing numerical checks as art approval.

Independent final 13a audit: no remaining concrete brief failure. Native E detail confirms two connected flicks; F is deliberately subtle at normal size. Source, labels, framing and panel sizes reviewed. This is a mockup delivery, not selection of a default or art approval.
