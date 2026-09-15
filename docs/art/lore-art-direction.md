# Lore illustrations

Four additional illustrations give otherwise unillustrated technology and discoveries a visual presence. Generated with the built-in image tool; exact prompts, sources and output paths are in `lore-art-prompts.json`.

| Subject | Why it helps | Placement |
| --- | --- | --- |
| Tachyon Drive Core | Makes the engine behind imperial expansion and the Age of Unbirth tangible. | Its entry; the Vallerii and Tachyon Drive story beat. |
| Wraithix derelict fleet | Gives the evidence of a pre-Vallerii civilization a physical setting without solving its mysteries. | Wraithix entry; Before the Vallerii story beat. |
| Stellaris Superstructure | Makes the scale and solar-harvesting role of the Dyson sphere readable. | Its entry; Luminax history paragraph 9 in The Story. |
| Mercurius Machine | Connects the present-day tournament economy to the chips that let worlds replenish themselves. | Machine and Scrambler Token entries; Kozrak and the Tournament story beat. |

The written lore is authoritative. Machinery geometry, materials and framing are visual interpretations, not new technical canon. Captions state only established facts. There are no Xalian creatures, human figures, recognizable Earth animals, or depictions of unresolved weapons or ancient builders. The Wraithix fleet is physical wreckage, not spectral life. The Mercurius Machine prints chips, not organisms. Existing creature art is untouched.

`packages/content/json/loreArtwork.json` maps selected entry, beat and paragraph keys to four images. It is loaded only by the presentation component. `LoreArt.tsx` reuses the same compact figure as the planet entries: at most 480 by 320 CSS pixels, full 3:2 composition, a caption, lazy loading, and no enlargement action. The existing story frontispieces retain their artwork but now also have a 480-pixel maximum width and use their smaller files. Browser accessibility zoom remains available.

Only 768- and 384-pixel WebP derivatives are added to the public site, in `apps/web/public/assets/img/lore/details/`. Original generation PNGs remain at the paths in the prompt manifest. `python scripts/prepareLoreArt.py` recreates web derivatives using Pillow when those source files are available; normal site builds require neither those originals nor image-generation access.

Selection is deliberately sparse: the seven eras already have opening artwork, and an image is added to a passage only when it helps explain a distinct object or discovery. No new planet or creature portraits were made.
