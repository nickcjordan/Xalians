# The Long Return — art integration direction

Artwork decisions should be evaluated against the shared experience standards in [`GAME_EXPERIENCE_QUALITY_GUIDE.md`](./GAME_EXPERIENCE_QUALITY_GUIDE.md). This file remains the production-specific art reference.

## Current action-transition prototype

The crossing transition combines a generated environment plate with registry-backed Xalian SVG art. This separation is intentional: generative art establishes place, light, weather, and material; canonical species art preserves the creature the player selected.

The first plate is `my-app/public/assets/img/games/long-return/flooded-service-throat.webp`. It was produced with the built-in image-generation tool and then cropped, darkened, resized to 1600×900, and encoded as WebP for the game. The local pipeline was found at `C:/dev/src/xalians-art`; its current production scripts are specialized around Xalian silhouette generation and tracing rather than environment plates.

Final environment prompt:

> Use case: stylized-concept. Asset type: 16:9 game action-transition environment plate. The flooded service throat inside an abandoned alien industrial research annex, seen at creature eye level as a dangerous route is crossed. Black water rushes through a collapsed maintenance chamber; a broken hanging gantry rises above an intake tunnel under twisted wreckage; distant archive lights show through mist. Environment only, no creatures or people. Cinematic science-fiction concept art with graphic inked shapes and restrained painterly texture, grounded industrial realism, compatible with bold black creature silhouettes overlaid later. Wide establishing shot with a strong foreground-to-background path and dark open foreground/center for creature silhouettes. Tense low-key lighting, cold cyan reflections, sickly amber emergency lights, deep charcoal shadows, drifting vapor and subtle sparks. Corroded metal, wet concrete, cable bundles, rippling contaminated water, old warning paint without readable lettering. No UI, readable text, logos, watermark, border, or clean spaceship corridor.

The transition is an event, not a spinner. A committed crossing is compiled into ordered visual beats: movement, hidden hazard, companion intervention, per-creature energy loss, structural damage, salvage collection, and arrival. Creature silhouettes move in the room; the matching HUD pips drain during their causal beat; stability shakes the environment; salvage moves into the carried counter. The last frame persists until the player continues, while a skip-to-outcome control accelerates rather than dismisses the sequence. Background scrolling and focus are contained, and reduced-motion players receive the same final state immediately.

Scout actions have their own composition rather than reusing a result banner: a crew-origin marker, dotted travel line, canonical moving silhouette, sense/communication pulse, native reveal when applicable, and an energy HUD whose pip drains only on the energy beat. A failed remote signal ends with the scout still away; the later physical return reverses the movement and adds the stability meter to the action HUD.

## Artwork system, not a pile of illustrations

The next art work should be layered so one asset can support multiple outcomes:

1. **Scene plates** — one neutral establishing plate per chamber. Route-specific lighting, masks, fog, current, sparks, and camera motion create variants without generating every branch as a separate painting.
2. **Route overlays** — gantry, underdeck, shaft, membrane, machinery, and salvage props as transparent foreground/midground layers. These make route choice visually concrete before commitment.
3. **Canonical creature performers** — keep registry-backed SVG silhouettes for identity. Add a small pose vocabulary per locomotion/capability (climb, swim, fly, brace, investigate, communicate), generated or hand-authored under the existing silhouette pipeline.
4. **Encounter reveals** — native silhouette first, then element glow and posture. The art should communicate territorial, trapped, injured, or curious before the player reads a paragraph.
5. **Consequences on the world** — persistent visual damage, restored braces, opened bypasses, drained water, and recovered salvage disappearing from later plates. Mission memory should be visible in the room.
6. **Resource motion language** — energy peels away from the acting creature, stability fractures through the environment, salvage lifts from the scene into the carried-loot counter. The same colors and shapes must be used in previews, transitions, and results.
7. **Scout point of view** — short close crops, sensor cones, vibration rings, scent trails, or telepathic pulses derived from the creature's actual senses and communication mode. This turns creature data into visual verbs.
8. **Mission arc art** — arrival/extraction bookends and a changing exterior silhouette of the annex. These provide emotional pacing without interrupting every small decision.
9. **Journal artifacts** — compact postcards assembled from the scene plate, chosen route, lead silhouette, and consequence stamp. These reward replay without inventing permanent creature ownership.

## Recommended production order

Finish the seven neutral scene plates first, then create the reusable effect/prop overlays, then add capability-specific creature poses. Avoid generating bespoke full compositions for every route and crew combination: that would be expensive, inconsistent, and hard to keep synchronized with game state. The strongest system is procedural composition of authored layers, with generation feeding the layer library.

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

`sceneArt.js` is the single mapping between mission data and visual identity. `SceneStage` reuses each plate across arrival, scouting, signal report, planning, encounter, and resolved states through scan sweeps, signal pings, canonical SVG performers, encounter silhouettes, CRT scanlines, and phase-specific captions. `ActionTransition` uses the same mapping for the committed action and adds room-specific motion cues. This keeps visuals synchronized with state while avoiding a bespoke illustration for every branch.
