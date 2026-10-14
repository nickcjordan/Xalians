# Akinza surface backlog

Things the reference shows that belong to the surface phase (textures, painting, normal maps or a fur shader), not to construction geometry. The construction loop does not model these and must not be judged on them (see the Modeling scope section of the loop briefs). When the surface phase starts, it begins here.

| Item | Where | What the reference shows | Notes |
|---|---|---|---|
| Fur strands and softness | ear fan front and back, cheek tufts, chest, forearms, calves, tails | fine strands and fluffy edges on every coat mass | the geometry carries the clump shapes and tips; strands, hair cards or a fur shader go on top |
| Pale inner coat | ear cups, inner fan, chest | pale cream fur inside the cups and on the chest | the geometry already carries a pale material split for the cups |
| Coat color and markings | whole figure | base coat color, darker tips and the markings on the sheet | none modeled |
| Eye color and highlights | eyes | iris color, the large dark iris, catch lights | geometry owns the eye shape, size and the lids |
| Nose and pad color | nose, paw pads | dark nose leather and pads | a separate nose material exists |
| Fine creases | paws, face | toe creases, lip line detail | only creases that change the outline are geometry |

## Fur stage log

**Step 1, white coat between stripes (2026-10-14).** New palette T5 in `art/species-construction/surface/akinza-palettes.json`: T4 with the blue tipping removed (`tip` #7DB8E8, `tipFrom` .025, `tipTo` .045, `tipEnds` [.75, 1]); every other value, the stripes and the ear-cup blue included, is T4's. T5 is the default for the current look (`stripe_swatch.py` default too); T4 stays as the color-pass record. Measured on the renders (mean sRGB, blue minus red): ear backs 16.9 to 4.7, crown 8.9 to 4.2, tail between rings 9.8 to 6.7, against 4.9 on the white of the back, so the blue cast is gone. Still open: the long fur reads light neutral gray, not white (ear backs about 156, crown about 135, against about 204 on the back). That is shading in the dense long fur, not color. Forcing the hair diffuse share to .95 moved the ears only 3 levels, so the palette cannot fix it; it needs a lighting, fur-density or hair-shader step. Checks: `untracked/species-construction/akinza/surface/fur-steps/01-white-coat-{turnaround,ears,crown,tails}.png`.
