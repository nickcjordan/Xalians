# Saiphus living planet: review log

Built from `art/planets/zolton/` (the approved quality bar) per `art/planets/BRIEF.md`. Files: `textures.py` (maps), `build.py` (planet SVG), `demo.py` (review page). Facts drawn from Saiphus's history in `packages/content/json/planets.json`, quoted in the build.py docstring.

## Round 1 (first build)

- Bands (zones pale, belts ochre-brown, seven bands across the disc, edges curled by three eddies): "A hydrogen-helium gas giant". No solid surface, so no ground map. Zones and belts are separate layers on their own clocks (belts 74.3 s a turn, zones 96.1 s).
- Floating islands in one life band (centre -0.30 rad, half-width 0.085 rad), drifting on a 139.9 s clock. From "islands of floating landmass appear to hover across the sky. Separated by a sea of clouds and dense fog".
- Sulfuric cloud, thickest over the life band, on a 61.7 s clock. From "Sulfuric acid clouds sweep haphazardly across the sky".
- Storm: one cyclone in a shear zone (longitude 2.1, latitude 0.40, radius 0.30 rad). From "violent and relentless storms".
- Lightning inside the storm and in the cloud deck, only where cloud is thick. From "surges of freak lightning".
- Storm flare: a glow swelling every 37.3 s, peaking about 52 s into the turn. Masked to cloud.

## Round 2 (orchestrator review of round 1)

1. Terminator: the sun now sits upper left at (-0.62, -0.52, 0.60), so the terminator bends across the disc. The night overlay uses the round orthographic term from Zolton's lens math, widened to a soft band (`day = clip((lam + .12) / .62) ** 1.3`), with the night at 90 percent so bands stay faintly visible. Checked at 52 s and 36 s: the falloff is soft across a wide band. The curve is still gentle, so it reads closer to straight than a strongly bent arc.
2. Limb: limb darkening (a dark gradient over the disc's edge) and a thick glowing air rim (1.07 R, on the sunlit side only). Checked in every 600 px frame of the final set: the rim glows orange and the disc darkens toward its edge.
3. Bands: wavy, sheared boundaries from a stronger warp, eight festoon eddies along the edges, and band widths varied by a slow noise field. Palette moved to pale ochre, sand, dusty rose and sulfur-pale edges. Checked in the final frames: festoons and width variation are visible.
4. Islands: 24 clusters of 6 to 14 flecks, flecks radius 2.2 to 4.2 plate units (round 1 had 70 clusters of 3 to 12, with flecks 2.4 to 5.5). Dark green plains on brown, a pale rim on the sun-side edges, and a faint shadow thrown lower right. Checked at 600 px: clusters read as small flecks, not blobs.
   Caveat: in the scene the clouds lie above the islands, so a real shadow would fall on the clouds or the surface below. The shadow here is drawn beneath the flecks as the orchestrator asked, which is a judgment call.
5. Clouds: streaked along the band flow (fast across latitude, slow along longitude), partly translucent (alpha times 0.8, storm alpha 235 of 255), with a yellower sulfur tint. Checked at 24, 36 and 48 s: the cloud reads as sheared yellow sweeps. The yellow is strong at some phases.
6. Verified: all frames listed below opened; keyTimes check passed; page check passed; small-size check run.

## What was checked

- Keyframe check on every animation (`keyTimes` starts at 0, ends at 1, never decreases, value counts match): 334 animations in `planet.svg`, 0 bad. The same check on `demo.html` covers 1002 animations, 0 bad.
- Page size: `demo.html` is about 2.96 MB, under 5 MB. `planet.svg` is about 1.25 MB.
- Review page at 1366 and 390 wide, via `snap-page.cjs`: 0 console errors, no horizontal overflow.
- Final frames opened: `untracked/snaps/saiphus-r7-sheet.png` (600 px, t = 0, 12, 24, 36, 48, 52, 58). Earlier rounds: `saiphus-r5-sheet.png`, `saiphus-r6-sheet.png`.
- Small sizes: `untracked/snaps/saiphus-small-check-r7.png` (PIL downscale of the 52 s frame to 150 and 76 px), and the review page at its real 150 and 76 px sizes.

## What is still weak

- At 76 px the islands are gone. At 150 px the storm and the bands read, but the islands are faint.
- The terminator bends only gently; the orchestrator asked for a clearer curve.
- The flare has been checked in still frames at 52 and 58 s only, not in motion.
- The lightning uses Zolton's discrete bursts (steps, not fades). This follows the brief, but a reader may see it as popping.
- The sulfur cloud is strong yellow at some phases, possibly more saturated than the history asks for.
- The shadow under the islands sits beneath the flecks. Physically the cloud lies over the islands, so the effect is a stylised choice.
- No fresh critic reviewer has seen these frames yet, so the review loop in the brief is not done.
