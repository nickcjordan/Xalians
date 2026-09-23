# Battle environment and animation direction

September 22, 2026. Discussion proposal, not a ratified house style or implementation request.

## User direction

Preserve the painted Powerworks creatures as a separate reference. Explore accompanying game environments and effects for the evolving Blender creature pipeline. Nick currently leans toward toon or lined, with no final choice. The style-board background is explicitly excluded as an art reference. Start with one identity-focused action animation per creature and add move-specific clips when the pipeline matures. Consider the entire journey, including introduction, battles, moves, status, transitions, and results.

The painted art is independently archived at [art-references/powerworks-painted-2026-09-17](art-references/powerworks-painted-2026-09-17/README.md), including four original PNGs and deployed assets.

## Observed references and limits

- Inspected `http://127.0.0.1:8767/creature-motion-comparison/styles.html?species=dromeus-skin&light=1` in the browser. Lined has rounded, smooth-shaded forms with a dark contour. Toon has the contour and stepped shading. Both retain clear silhouettes and broad color regions. Ignored the background as instructed.
- The page describes the same species, camera, timing, performance, and atlas contract across four rendering styles. It exposes Action, Quiet presence, and Response (hit). This is evidence about the demonstration, not an audit of the underlying Blender pipeline or all species.
- Both supplied Claude artifacts currently show a sign-in gate: https://claude.ai/artifact/8JD9xkAuiKoLHKWxx1qvqi and https://claude.ai/artifact/BLYgVpEEUVou66t2WnpT9z. Their SVG scenes and animation have NOT been inspected. Actual source files or accessible links are pending; do not invent observations about them.

## Proposed composition

Use reusable Blender creature renders over a layered illustrated stage. Most scenery stays static. A small number of authored SVG/CSS elements provide ambient movement and meaningful world changes. Short effects and reactions carry action emphasis. The browser need not render the Blender model in real time for this approach.

Match camera elevation, ground plane, creature scale, light direction, shadow treatment, and contour weight. Use broad shapes and limited texture. Keep the battlefield's middle area comparatively quiet. Reduce background contrast and line weight with distance. Toon favors discrete shadow areas; lined can accept gentle gradients. Do not choose either yet.

## Coverage across the experience

| Moment | Proposed treatment |
| --- | --- |
| Introduction | Reuse environment layers in a short, skippable establishing move. One recognizable landmark and one environmental motion establish place. |
| Entry and transition | Reframe or slide layers, reveal the route or doorway, and settle into the battle composition. Do not imply walking if no locomotion clip exists. |
| Planning | Stable camera, restrained ambient motion, clear selected companion and target. No constant dramatic effects competing with choices. |
| Action | Creature's generic action supplies its identity and anticipation. Independently timed contact effects or projectiles explain the selected move. |
| Hit and consequence | Target response, localized impact, and health/status change share one impact moment. No false damage flash for a blocked move. |
| Persistent status | Small, distinct indicators attached to the affected unit. Burn appears only when burn actually applies; elemental attack styling alone is not a status. |
| Signature and boss | Briefly suppress ambient activity, emphasize the actor, and use a stronger authored effect or environmental response. Keep hidden enemy orders hidden. |
| Knockout | Use an available response or restrained fallback, then a persistent readable down state. Do not invent a bespoke death animation for every species. |
| Recovery and result | Quieter scene state, visible condition changes, and existing local rewards. The environment can settle after the guardian falls. |

## Asset and timing contract to agree with the animation pipeline

Proposed minimum: transparent frames/atlas, canvas dimensions, frame rate, duration, ground pivot, facing, visual bounds, action release/contact frame, and end frame. A projectile origin or contact anchor can be per-frame when the mouth or limb moves; use explicit per-creature offsets as an initial fallback. Check root movement to avoid applying browser movement on top of movement already in the rendered clip. Inspect final small-size transparency and contour edges.

For the first phase, map all applicable actions to the generic creature clip, with move-specific effect and timing data. A bite animation should not be called a perfect animation for every move: compatible effects can help, but motion semantics remain a real limitation. Later replace a move's clip without rebuilding the scene or consequence timing. Creature origin effects and target statuses remain separate, so a flame-themed action does not falsely imply burn.

One rigged model supports multiple authored Actions and repeated renders. It does not automatically generate all moves or guarantee animation reuse between different anatomies. References: https://docs.blender.org/manual/en/4.2/animation/actions.html and https://docs.blender.org/manual/id/dev/render/output/animation.html.

## Resource strategy

Use cached raster backplates for complex static scenery, SVG for clean shapes and selected moving props, and a bounded effect layer for transient action. SVG is not inherently cheap: large animated filters, path counts, and overlapping transparent effects require measurement. Prefer small animated groups and transform/opacity changes where visually suitable. Pause offscreen work, preload the next encounter's necessary assets, limit concurrent particles, and reduce ambient motion first on slower devices. Reduced motion must preserve action, target, and consequence information.

Validate download size, decoded atlas memory, frame time, and visual clarity on a narrow phone. Do not set untested numeric budgets or claim performance from file extension alone.

## Next practical experiment

Once the SVG references can be inspected, compose one small comparison scene around an existing creature render: shared layout and palette, a toon-compatible treatment and a lined-compatible treatment. Include idle, generic action, target impact, an actually applied status, and a short transition. Judge all layers together at game size before making more backgrounds or choosing a permanent style. Keep this separate from the live game until the direction is agreed.
