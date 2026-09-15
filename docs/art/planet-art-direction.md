# Planet artwork

## Direction

Two original present-day views per world: an establishing landscape and a closer environmental or historical detail. Cinematic science-fiction environment painting with believable materials, atmospheric depth, restrained painterly texture and readable silhouettes. The fourteen old landscape images were inspected only as mood checks; their compositions, accidental forms and cartoon globe companions are not style references.

The source of truth is the complete history and Generator survey for each world in `packages/content/json/planetRecords.json`, with the corresponding entries in `sites.json`. Illustrations interpret the text; they do not establish new canon. In particular, the origin of Veridium, the weapon at Phantiri and the secret beneath Endessa remain unresolved. Phantiri's mass grave is portrayed as distant fossil-like terrain, without graphic closeups.

## Creature boundary

Planet artwork must not depict bioengineered Xalian creatures, including Neph or the spectral life produced by Phantiri's Generator. Their designs and rendering belong exclusively to dedicated creature artwork. Plants and genuinely indigenous wildlife can appear where supported by the lore. Any incidental animals must be unnamed and distinctly alien in anatomy and silhouette; no recognizable Earth animals or close lookalikes. Poseidas's underwater city view contains no swimming fauna, preserving the architecture and algae infrastructure without dolphins, sharks or fish. Phantiri's compressed remains are treated as abstract environmental strata, not identifiable creature anatomy. Saiphus's detail view shows Benthane refinery infrastructure rather than Neph.

## Display

Planet entries present the two illustrations together, stacked on phones and side by side from the medium breakpoint. Each image is capped at 480 by 320 CSS pixels, with its caption beneath it. There are no enlargement controls or image dialogs. Entries serve only the 384- and 768-pixel derivatives; the full-size files remain source assets. This keeps the illustrations supporting the story on wide desktops while retaining normal browser zoom and accessibility.

## Files

Generated with the built-in image generation tool. Exact prompts and source output paths are recorded in `planet-art-prompts.json`. Website images live in `apps/web/public/assets/img/planets/art/`, with responsive sizes for tiles and captioned illustrations. Original landscape JPGs and animated globe GIFs remain available.

`packages/content/json/planetArtwork.json` owns the two captioned views per world. It is imported by the encyclopedia views; Home receives only the thumbnail and alt text through its existing compact data module. Gallery metadata stays out of the planet facts consumed by the game engine. `planetRecords.json` and the legacy `planets.json` both point their landscape fields at the new establishing view.

`python scripts/preparePlanetArt.py` encodes the source PNGs as 1536, 768 and 384 pixel WebP files without retouching the artwork. It requires Pillow and access to the source paths recorded in the manifest. The committed WebP files are self-contained; serving or building the site requires no image-generation access.
