# The Long Return — art integration direction

Artwork decisions should be evaluated against the shared experience standards in [`GAME_EXPERIENCE_QUALITY_GUIDE.md`](./GAME_EXPERIENCE_QUALITY_GUIDE.md). This file remains the production-specific art reference.

## Current visual language

The game combines generated environment plates, registry-backed Xalian portraits, and a deliberately schematic site map. The plate establishes place, light, weather, and material. The portrait establishes creature identity. The diagram establishes where the crew, scout, contact, routes, and destination are. None of these assets pretends to perform the creature's physical action.

The first plate is `my-app/public/assets/img/games/long-return/flooded-service-throat.webp`. It was produced with the built-in image-generation tool and then cropped, darkened, resized to 1600×900, and encoded as WebP for the game. The local pipeline was found at `C:/dev/src/xalians-art`; its current production scripts are specialized around Xalian silhouette generation and tracing rather than environment plates.

Final environment prompt:

> Use case: stylized-concept. Asset type: 16:9 game action-transition environment plate. The flooded service throat inside an abandoned alien industrial research annex, seen at creature eye level as a dangerous route is crossed. Black water rushes through a collapsed maintenance chamber; a broken hanging gantry rises above an intake tunnel under twisted wreckage; distant archive lights show through mist. Environment only, no creatures or people. Cinematic science-fiction concept art with graphic inked shapes and restrained painterly texture, grounded industrial realism, compatible with bold black creature silhouettes overlaid later. Wide establishing shot with a strong foreground-to-background path and dark open foreground/center for creature silhouettes. Tense low-key lighting, cold cyan reflections, sickly amber emergency lights, deep charcoal shadows, drifting vapor and subtle sparks. Corroded metal, wet concrete, cable bundles, rippling contaminated water, old warning paint without readable lettering. No UI, readable text, logos, watermark, border, or clean spaceship corridor.

The transition is a readable account, not a spinner or a low-budget animated film. A committed action reveals ordered, causal story beats beside the site schematic. A creature token occupies a discrete known position; it does not swim, climb, or fight on screen. Resource changes appear with the beat that caused them. The complete account persists until the player continues, and the player can pause, advance, or skip to that outcome. Reduced-motion players receive the complete account immediately.

Scout actions use the same grammar: the crew stays at its threshold, a scout token occupies a survey position, a signal line appears only if the report can travel remotely, and a native marker appears only after contact. A failed remote signal leaves the scout away. A later return moves its token back to the crew and shows the resulting resource change. These are state changes on a map, not staged creature performances.

## Artwork system, not a pile of illustrations

Future art should add atmosphere and legibility without replacing the player's imagination with crude motion:

1. **Scene plates**: one neutral establishing plate per chamber, reused behind decisions and records. Keep important map and text contrast independent of the painting.
2. **Schematic landmarks**: authored shapes for water, machinery, doors, exposed hull, reservoir, and rings. They should explain route relationships, not claim to be a scaled floor plan.
3. **Canonical creature identity**: registry-backed SVG portraits in decisions and numbered tokens on the map. Do not animate portraits as performers without a production-quality animation system and explicit art budget.
4. **Encounter state**: a distinct native marker for discovered contact, bypassed native, or recruited ally. Never show undiscovered creatures in a preview.
5. **Consequences on the site**: stationary marks on the exact affected route once the engine has applied an earned change. The story explains the physical cause; the map preserves the memory.
6. **Resource change**: energy, stability, and salvage use their own colors and shapes. During a record, change the appropriate meter at its causal beat; do not add screen shake or material flying between panels.
7. **Mission arc art**: arrival and extraction bookends can set tone without interrupting every decision.
8. **Journal artifacts**: compact scene, route, crew, and consequence compositions can reward replay without inventing permanent ownership.

## Recommended production order

The seven neutral plates exist. Next, improve the diagram's authored landmarks and the continuity between a chosen route, its record, and the next room. Add a new image only when it communicates a place or event better than the current plate and schematic. Do not start a pose or performed-animation pipeline as a shortcut to game feel. Bespoke full compositions for every route and crew combination would be expensive, inconsistent, and difficult to synchronize with state.

## Generated environment library

All plates below were generated in `stylized-concept` mode with the built-in image-generation pipeline, visually reviewed, cropped to 16:9, color-normalized, and exported at 1600×900 WebP. Prompts consistently requested environment-only cinematic science-fiction concept art, lived-in cassette futurism and nuclear-age industrial technology, silhouette-safe foreground space, no readable text, and no recognizable franchise imagery.

| Gameplay space | Runtime asset | Prompt-specific subject |
| --- | --- | --- |
| Briefing / crew menu | `briefing-console.webp` | Battered field-ship operations bay with CRT, gauges, physical switches, and an icy annex viewport |
| Flooded Service Throat | `flooded-service-throat.webp` | Black-water intake and collapsed maintenance gantry |
| Blind Turbine Hall | `blind-turbine-hall.webp` | Frozen turbine forest with one mechanism waking |
| Archive Vestibule | `archive-vestibule.webp` | Iris door, credential arms, and obsolete authentication machinery |
| Null Gallery | `null-gallery.webp` | Broken hull open to an icy planet, floating debris, and a shielded conduit |
| Nemesis Index | `nemesis-index.webp` | Failed stasis chamber with the black archival objective suspended at its center |
| Core Reservoir | `core-reservoir.webp` | Conductive liquid reservoir, submerged storage cells, and analog collector machinery |
| Generator Spine | `generator-spine.webp` | Interlocking mechanical rings around an exposed icy planet and extraction path |

The precise generation prompts are represented by the scene-specific subjects above plus the shared constraints. The production source images are retained under the Codex generated-image session; the browser-ready files live together at `my-app/public/assets/img/games/long-return/`.

## Current runtime composition

`sceneArt.js` maps mission spaces to environment plates. `ExpeditionSchematic` and `mapPlaces.js` own site position and route geography. `FieldRecord` frames the action, while `SequenceStory` and the action-specific transition components reveal the causal written account and resource changes. The same map state carries into planning and the arrival result. This division preserves spatial continuity without claiming to depict a literal, fully animated crossing.
