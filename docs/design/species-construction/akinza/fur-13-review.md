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

## 13c: addendum candidate, partial

Partial candidate: `fur-steps/s12-13c/surface.blend`, built from 13b. The October16 addendum replaces the earlier airy-root target with an opaque intentional white triangle at each canal, soft locks and wispy tips, plus shortening the coherent brush at the ear apex.

Fourth save retains 3,324 local furnishing edits and 1,461 apex trims. Normal front shows obvious opaque white bases extending about one third up/out into each ear, with the rest blue and head sides white. Direct and independent review finds a substantive remaining gap: front fan is broad/blunt and root/side views retain parallel hanging fibers and a near-horizontal hem. This is not a soft-lock quality pass or art approval.

The exact apex close comparison is also incomplete as a repair: the conspicuous long left/down brush is almost unchanged. Its mapped 456 curve candidates overlap only 46 surviving trims. Numerically shortened hairs are not evidence that Nick's requested group was fixed. The changed far outline is visible in normal front, but the required close-crop outcome is unmet.

All eight required unique views rendered and directly inspected. Fresh saved skin and solid sweeps have zero gate collisions; rogue count 0 in every region. Legacy totals collision 0 to 0, neighbor 50 to 42, regional 1965 to 1965, transfer 1618 to 1618, lift 89 to 74, with zero new flagged IDs. Exact saved held-data and per-region gates pass. Three labeled comparisons and all six current copies are directly inspected and pixel-for-pixel verified against the final renders.

The shared brief limits the step to four tries. Four model saves are used, including two inherited saves and the third saved before the addendum. Additional builds were requested through the active user question; no answer is assumed. Further model saves are held pending that scope decision. G3 is separately committed as 0fcf7eb4 with no push; its full measured width still looks narrower than original A and its broad ends are blunt.

Independent final 13a audit: no remaining concrete brief failure. Native E detail confirms two connected flicks; F is deliberately subtle at normal size. Source, labels, framing and panel sizes reviewed. This is a mockup delivery, not selection of a default or art approval.

## Review artifacts

All paths below are under `untracked/species-construction/akinza/surface/fur-steps/`.

| Part | Image |
|---|---|
| 13a close sheet | [13a-eyeliner-options.png](../../../../untracked/species-construction/akinza/surface/fur-steps/13a-eyeliner-options.png) |
| 13a normal sheet | [13a-eyeliner-options-face.png](../../../../untracked/species-construction/akinza/surface/fur-steps/13a-eyeliner-options-face.png) |
| 13b back comparison | [13b-head-backq.png](../../../../untracked/species-construction/akinza/surface/fur-steps/13b-head-backq.png) |
| 13b tip comparison | [13b-ear-tip-close.png](../../../../untracked/species-construction/akinza/surface/fur-steps/13b-ear-tip-close.png) |
| 13c front comparison | [13c-ears-front.png](../../../../untracked/species-construction/akinza/surface/fur-steps/13c-ears-front.png) |
| 13c tip comparison | [13c-ear-tip-close.png](../../../../untracked/species-construction/akinza/surface/fur-steps/13c-ear-tip-close.png) |
| 13c root comparison | [13c-ear-root-close.png](../../../../untracked/species-construction/akinza/surface/fur-steps/13c-ear-root-close.png) |

Current-state files, all overwritten from the final surface:

- [current-ears-front.png](../../../../untracked/species-construction/akinza/surface/fur-steps/current-ears-front.png)
- [current-head-side.png](../../../../untracked/species-construction/akinza/surface/fur-steps/current-head-side.png)
- [current-head-backq.png](../../../../untracked/species-construction/akinza/surface/fur-steps/current-head-backq.png)
- [current-body-backq.png](../../../../untracked/species-construction/akinza/surface/fur-steps/current-body-backq.png)
- [current-body-front.png](../../../../untracked/species-construction/akinza/surface/fur-steps/current-body-front.png)
- [current-tails-side.png](../../../../untracked/species-construction/akinza/surface/fur-steps/current-tails-side.png)

Final preservation and delivery checks pass. Final surface is `fur-steps/s12-13c/surface.blend`; superseded13b archived after the partial commit, with original hash verified. Exact final current copies and all three labeled pairs pass pixel checks. No push. Art remains partial and unapproved; the triangle/soft-lock and cropped-brush failures remain blocked by the explicit four-build limit pending the active authorization question.
