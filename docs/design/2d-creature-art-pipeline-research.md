# Reusable 2D creature art pipeline: research and pilot

Status: active exploratory implementation, 2026-09-17. Nick wants established, open source or genuinely free tools, no Spine license, and character motion with articulated anatomy rather than whole-image SVG transforms. The original iPhone *Dungeon Boss* is a reference for small-screen battle readability and action timing. Nick accepted the illustrated cutout style as a working direction and asked that development continue without repeated checkpoints. This does not settle a permanent Xalians art policy or authorize a game's platform cutover. The broader [art direction review](creature-art-direction-review.md) compares pixel, drawn, illustrated hybrid, pre-rendered 3D, and live 3D options after the game-like demo validated the motion concept.

## What we are trying to build

The reusable product is an **asset library and build flow**. It keeps an editable species depiction and authored motion clips in one place, then produces portable game assets. A game asks for a creature and clip, draws the assets, and decides what happened in play. A single universal animation set would fit the 32 species poorly: their ratified templates span bipeds, quadrupeds, multipeds, floating creatures, a serpentine body, an avian body, an amorphous body, and a swarm.

| Term | Practical meaning |
| --- | --- |
| Sprite | Any 2D image drawn by a game. It can be static. |
| Frame animation | A sequence of images shown at a specified rate. |
| Sprite sheet | Frames arranged in regular cells in one image. |
| Texture atlas | Arbitrarily placed images plus coordinates in a manifest. |
| Cutout rig | Separate anatomical parts attached to a hierarchy of pivots or bones. |
| Clip | A named authored performance such as `idle`, `action`, or `hit`. |
| Pivot and cell | The placement anchor and fixed drawing space that prevent motion from jumping or clipping. |
| Source asset | The editable vector, layered raster, or rig project. Exported images are build products. |

Phaser supports frame animations, sprite sheets, and atlases. Godot supports both `AnimatedSprite2D` and cutout animation with Node2D hierarchies or skeletons. These are ways to deliver artwork to a game, not reasons to make every game use one engine. [Phaser textures](https://docs.phaser.io/phaser/concepts/textures), [Phaser animations](https://docs.phaser.io/phaser/concepts/animations), [Godot cutout animation](https://docs.godotengine.org/en/stable/tutorials/animation/cutout_animation.html).

## Existing Xalians art and boundaries

- The repository has 32 portrait SVGs and 32 compact token SVGs. Their silhouettes make species recognizable at small sizes. Most are flattened drawings and cannot supply independently moving limbs or body segments without redrawing parts.
- The portrait remains a visual reference, and Nick approved animated stage art as an additional presentation form on 2026-09-18. The current design study focuses on motion and stage presentation.
- Ratified `standard`, `gleam`, `prismatic`, and `eclipse` finishes are renderer treatments. Reserved `variant`, `pattern`, and `palette` fields are not an art pipeline shortcut. A future renderer should apply the existing identity and finish data rather than changing immutable genesis.
- A game owns results, timing of gameplay events, and state. An animation manifest can name visual clips and frame timing, but it cannot prescribe attacks, rewards, or economy effects.
- Do not extract a local game's engine, add deterministic replay, platform receipts, or permanent rewards for this art experiment. The platform design of record still governs any future cutover.

## Tool choices within the free-only constraint

| Job | Recommended tool | Why and limits |
| --- | --- | --- |
| Vector cutout drawing | Inkscape and SVG | Free, open source, and editable at any size. The artist must deliberately draw overlapping parts. [Inkscape](https://inkscape.org/about/) |
| Raster paint or drawn corrections | Krita | Free, open source, with animation and PNG sequence export. Useful for shapes a rig cannot make convincingly. [Krita download](https://krita.org/en/download/), [Krita animation export](https://docs.krita.org/en/reference_manual/render_animation.html) |
| Cutout rig and keyframing | Godot 4.7.2 | Free under MIT. Node2D part hierarchies and `AnimationPlayer` support authored poses. Its editor is available for manual refinement. [Godot license](https://godotengine.org/license/), [Godot cutout guide](https://docs.godotengine.org/en/stable/tutorials/animation/cutout_animation.html) |
| Repeatable raster and packing | CairoSVG, Pillow, repository scripts | The pilot renders aligned SVG groups, captures actual Godot frames, and packs engine-neutral sheets with JSON. There is no packaging service or subscription. |
| Pixel art if chosen later | LibreSprite or Pixelorama | Separate style decision. Pixel art would require distinct drawing and animation practices rather than a conversion of this illustrated pilot. [LibreSprite](https://libresprite.github.io/), [Pixelorama](https://pixelorama.org/) |
| Stylized 3D rendered to 2D frames | Blender 5.2 (WSL on this machine), scripted through `bpy` | Free and open source. The motion comparison keeps each study as a reproducible Python recipe plus its saved `.blend`; Cycles renders 42 transparent 384 px frames in about 18 s. Metaballs cover amorphous bodies; rigid parts use pivots and shape keys. [Blender license](https://www.blender.org/about/license/) |
| Maps and tiles if needed later | Tiled | Open source level editor, useful for tilemaps but unrelated to creature rigging. [Tiled](https://www.mapeditor.org/) |

This free stack avoids a production license fee and proprietary runtime dependency. Godot is an **offline authoring and frame rendering tool** here; the Xalians games do not need Godot. Inkscape and Krita are optional art editors. The pilot's SVGs were made directly, and no AI raster generation is required to rebuild them.

## Approaches and tradeoffs

| Approach | Best use | Main cost |
| --- | --- | --- |
| Existing silhouette with a short whole-object cue | Tokens, UI, low-motion board pieces | Cannot convey an anatomical action. |
| Layered cutout with authored clips | Small stage characters with clear idle, anticipation, action, and response | Every species needs anatomy-aware part drawing and joint placement. Extreme poses can expose seams. |
| Drawn frame animation | Transformations, effects, squash, expressive poses outside a cutout's range | More drawings per action and facing direction. |
| Rendered frames from a cutout rig | Portable use across web canvas and engines with a simple runtime | Image size rises with cell size, frame rate, and clip count. |
| Live rig playback | Interactive blending or directional control where needed | Each game needs a compatible runtime and more integration work. |

For the phone-sized battle reference, rendered frames from an authored cutout rig are a sensible first delivery format. They preserve expressive part motion while allowing each game to load a small manifest and images. A battle scene can separately stage the camera, ground, element effects, and UI. GSAP or CSS can handle those supporting surfaces, but they do not author the creature's anatomy.

## Completed three-species pilot

[The isolated pilot](../../art/creature-motion-pilot/README.md) contains editable SVG source, separate effect layers, generated part images, Godot scenes, three keyframed clips per species, transparent frame exports, two packed sizes, JSON manifests, GIF previews, a phone-scale action storyboard, a profile comparison, a canvas workbench, and a battle-style demo. The scripts read one catalog for species, clips, visual timing markers, and profile scales. A new anatomy still needs a bespoke rig.

| Species | Anatomy exercised | Action performance |
| --- | --- | --- |
| Akinza | Slender biped, large ears, two-piece plumed tail, separate arms and legs | Anticipation, forward leap, arm and leg change, snow kick, recovery. |
| Avilily | Avian body, two wings, crest, trailing feathers, flower beak with moving petals | Wing fold, bloom opening, rise, recovery. |
| Frackworm | Long segmented body, overlapping chitin plates, separate drill head and jaw | Coil, sand slurry from a body vent, head drive, segmented follow-through, recovery. |

The pilot retains Akinza's feline biped, ears, claws, and tail; Avilily's floral plumage, wings, talons, and blooming beak; and Frackworm's segmented burrowing body and drill-like head, based on their ratified appearance and lore. Their colored rendering is a working exploration. The existing silhouettes are still the shipped art direction.

The build flow is:

```text
approved identity and lore references
    -> named SVG body parts
    -> transparent aligned PNG layers
    -> editable Godot rig and keyed clips
    -> transparent PNG frames
    -> full and compact sprite sheets + clip manifests + previews
    -> standalone canvas reader and workbench
    -> opt-in game adapter when a game requests integration
```

The exported interface has a fixed cell, one sheet per clip, ordered rectangles, frame durations, a loop flag, visual timing markers, and a placement origin. The renderer does not need to know Godot. The intermediate transparent PNG frames are available for alternate packing or export targets. `idle` is 12 fps; `action` and `hit` are 24 fps. The full profile uses 384 by 384 cells and totals roughly 2.6 to 3.2 MiB of sheets per species. The compact 192 by 192 profile totals roughly 1.2 to 1.4 MiB and remains readable at the sample phone scale. These are test settings, not production budgets.

## Assessment and limits

The rigged poses visibly change limbs, tails, jaw, head, and body segment relationships. They are materially different from moving a completed SVG as one object. Godot's actual frame output was reviewed as a storyboard at reduced size. The first 300 by 300 capture clipped Akinza's tail and ears and Frackworm's head during extreme poses; the export was expanded to 384 by 384 and a frame bounds check now reports no edge collisions. This is useful evidence that export bounds must be measured from the full clips, not the rest pose.

Nick accepted this illustrated style for continued development. Cutout joints can still show seams at extreme angles, and the actions need testing against a real battle scene. The standalone workbench draws the exports at a phone-sized view and supports scrubbing, mirroring, playback speed, and profile comparison. The current captures have one authored facing direction; mirror playback is a convenience, not a true turnaround. There is no walk cycle, finish treatment, or game adapter yet. The Frackworm sand spray and Akinza snow wake are local visual effects, not declarations of new creature powers.

## Next production work

Use the [art direction review](creature-art-direction-review.md) to compare stage styles before committing to polish across the species library. The current rig joins and timing remain available for iteration. Test any game adapter only when Nick requests that game's integration. A future live rig runtime or drawn replacement frames remain available if a specific motion cannot be expressed well with the current cutouts.
