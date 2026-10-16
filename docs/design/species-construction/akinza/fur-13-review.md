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

Pending model repair and saved sweeps. The additive local-envelope/flow diagnostic measures all active strands, including ear rims/tips, tail tips, elbows and heels. It does not replace the unchanged 12d collision, neighbor length, regional length, transfer or lift rules. The initial diagnostic was extended after direct projected inspection found short contrary-flow strays at Nick's ear apex.

## 13c: prominent ear furnishings

Pending model work. Hold skin blue down to the crease, white head sides, fixed geometry, T7, approved face/head/body and held 12e tails. Do not treat passing numerical checks as art approval.

Independent final 13a audit: no remaining concrete brief failure. Native E detail confirms two connected flicks; F is deliberately subtle at normal size. Source, labels, framing and panel sizes reviewed. This is a mockup delivery, not selection of a default or art approval.
