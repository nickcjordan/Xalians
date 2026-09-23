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

## Live End Wars reference, September 22

Nick supplied the third homepage story scene as an accessible SVG reference: https://www.xalians.com/#story, labeled `03 The End Wars`. Inspected the live scene and its rendered DOM. The earlier Claude artifacts remain uninspected.

Observed: a layered city recedes toward a central vanishing point; dark foreground towers frame a diagonally descending burning ship. Warm windows, beacons, fire, debris, and moving tracer streaks punctuate the subdued city and sky. Successive live observations show changing tracer/debris positions. The rendered scene contains seven SVG layer elements plus shared definitions, with transform and opacity animations on independently timed cycles. This is direct evidence of an SVG recreation rather than a conclusion drawn from the screenshot. No runtime performance benchmark was performed.

Application proposal: borrow the depth, selective motion, warm focal accents, and independent layer structure. For battle, reserve an uncluttered ground plane for combatants and reduce texture and background contrast to fit the toon/lined creatures. Broad scenery and ambient loops establish place; attacks and status consequences should use event-driven effects. Continuous bright streaks would compete with actual ranged attacks and should be reduced or absent during combat. A dramatic moving ship fits an introduction or scripted event better than an always-active focal point behind a normal battle. Keep the strongest contrast and motion on the current actor and recipient. The same environment layers can support an establishing view, a quiet planning state, active combat, and a settled result state.

## First Powerworks implementation

Built as a reversible local game presentation pass. Four sector-specific illustrated SVG spaces now share the same room architecture, deck perspective, contour language, and lighting. The service gate, security barrier, turbines, and control reactor give each encounter a distinct landmark. Briefing, combat, recovery, defeat, and victory reuse the corresponding space. Beacons, turbine blades, reactor elements, and haze move on separate slow cycles. Combat pauses ambient motion so the action is easier to follow; the guardian's reactor dims on defeat. A small event-driven SVG contact mark appears with an actual hit or snare result. The existing play, pause, step, speed, status, and hidden-order behavior remain.

This is a provisional environment treatment between the lined and toon references, not a universal Xalians style decision. Existing painted companion sprites remain in the local prototype until compatible Blender output is available for its actual squad. The Dromeus style-board creature is not one of this dungeon's playable companions. A model and rig can be reused for more actions, but only the reference board's generic action is available to inspect now; move-specific clip behavior and the final atlas contract remain to be coordinated with the other pipeline. The scene does not pretend that a generic bite exactly depicts every possible move.

Verified by playing through all four sectors to defeat, including the recovery and result surfaces, then replaying the phone-sized first encounter. Reviewed desktop and 390px phone scenes for clipping and legibility. The first result layout made the landscape too tall because an inline SVG used its intrinsic aspect ratio; giving the shared result scene an explicit compact height corrected it. Scene tests, page-flow tests, typecheck, and production build pass. Human evaluation of style fit and the final creature-animation atlas remain open.

## Grounded environment and combat HUD pass

The first SVG architecture treated the floor as a decorative shape. Enemy art and its dark ellipse sat partly against the rear wall, so the defenders appeared airborne. The enclosing controls also retained the appearance of a web form despite being a battle game. Nick asked for a physical environment and a broader game-art treatment while keeping the current creatures.

Four new room backplates share an elevated diagonal camera, floor seams, lighting direction, and staging space. The gate, security shutter, turbine machinery, and reactor change by sector, while the floor remains continuous under both combat rows. This direction gives the dungeon a visible physical route and more depth than the earlier straight-on duel view. The backplates provide material wear and architectural depth; sparse SVG overlays still animate security light, power activity, and atmosphere. The battle HUD now draws on the same steel, warm inset light, beveled panel edges, and angular sector markers. Move and squad controls remain readable and keyboard accessible.

The old opaque ovals no longer serve as stage markers. A soft contact shadow stays under grounded units, and the drone's lighter shadow sits on the floor below its hover. Selection and target state live on the creature, reticle, and health plaque rather than recoloring the floor shadow. Positioning is presentation only and does not change formation or combat rules. The current painted sprites remain provisional until the creature animation pipeline supplies production art.

Enemy names and health now sit in a slim readout above each defender, leaving the feet and floor clear. Ally readouts remain near the bottom edge of the battlefield but use the same compact treatment. The sector title above the stage carries location context, so the duplicate label inside the stage was removed to give the enemy readouts room on phones. Action effects still aim at the body rather than the floor shadow.

The combatants step subtly down the diagonal lanes for presentation, with no new formation rule. Move cards now use a deliberate hierarchy: a framed action emblem, the move name, its effect or power, and a separate use state. The four squad tiles use the same material language and a faint creature portrait for recognition. Range and power remain available as icons, labels, descriptions, and accessible move text rather than a loose cluster of equal-weight badges. The status and recovery panels follow the same visual system. At narrow widths, keep status badges inside the stage and retain enough tap area in the four move and squad choices.

The elevated camera is a local Powerworks presentation choice, not a permanent species-art decision. The current painted creature art is still a flat billboard inside that view. When Blender renders arrive, match each clip's camera elevation and facing, floor pivot, apparent scale, shadow position, and action origin to the stage before replacing it. Do not fake a floor interaction that the clip cannot support.

For future environments, design the rear wall, far standing lane, near standing lane, and floor horizon together at desktop and phone aspect ratios. Keep an unobstructed floor under both rows. Do not use a generic ellipse to imply an unsupported platform or levitation. Match a creature's visible foot or intended hover height to its shadow before judging any new backdrop complete. Backplates should be optimized and animated SVG elements should stay limited to meaningful local movement.
