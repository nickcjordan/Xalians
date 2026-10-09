# Magmuth living planet: review log

Second world, built on the shared parts extracted from Zolton (`art/planets/planetlib.py` for the maps, `art/planets/svgkit.py` for the SVG). A Haiku 5.5 trial build of this world (2026-10-08) fell short of the bar; Nick: "dont worry about Haiku then ... you can just build them yourself." This is a fresh build.

## Round 1 (2026-10-08)

Drawn from the history (quotes in build.py's docstring): seas of lava (about 42 percent) under Voronoi crust plates crazed with finer cracks, seams running hot where the crust moves and skinning over elsewhere, the crust breaking into open lava at the shores; basalt and ash islands with glass spires glinting; a fissure network on the land with surges of fire running along it; dark streaky smoke and ash blowing faster than the ground; a red dwarf's dim warm light and a crimson air rim; four vents erupting in turn on a 37.7 s clock, each where the ground faces the viewer, with a flash, lit ground, embers and a spreading dark plume.

Found and fixed while building:
- A bright vertical stripe near the south pole: the two copies of a map overlapped by their wrapped columns, so a translucent glow was drawn twice there. Each copy is now clipped to its own width (in svgkit, so every world gets it). Zolton was built before this and may carry a faint version of it.
- Distance-measured cracks smear into bands near the poles where the map's rows crowd: faded out above about 66 degrees.

Checked: keyTimes on every animation (none bad), review page at 1366 and 390 with no console errors or overflow, the 150 and 76 px planets on the page.

## Round 1 review (fresh Opus reviewer): 5.5

Reads at once as a lava world at 600 and 150 px, short of the Zolton bar: glowing loops with hard edges near the south pole; eruptions like a lamp switching on, the plume invisible under the lava light; seas like stained glass; beaded seams; surges invisible; fissures as worms with rings; smoke pale; ground like plasticine; weak day and night; muddy at 76 px; eruptions in lockstep; a ruled smoke streak.

## Round 2

1. Every glow fades out above about 62 to 70 degrees, where the lens squeezes the polar rows.
2. Eruptions: the burst grows to 22, embers bigger and thrown farther, the plume drawn after the lava light, lit ash grey with a dark edge, broken by a turbulence filter so it billows; four vents differ in size (0.75 to 1.35) and length (0.8 to 1.25), one near the limb.
3. Seas: plates about three times larger, split by secondary cracks; plate brightness within a narrow range, darker at a plate's heart and warmer toward its seams.
4. Seams at least about 1.2 px and softened, so they no longer bead.
5. Surges: brighter where they pass, narrower bands, toned from white to orange-yellow.
6. Fissures: closed rings and stubs under 80 map px removed, width varies 0.6 to 2 px along each crack.
7. Smoke: dark (#2a2220 to #4a3a34), a looser whorl, curling rather than ruled, a faint red underlight over the lava.
8. Ground: half the emboss, lighter ash fields, less glint.
9. Lava light at 0.7 by day and full at night; a darker night.
10. Page: 2.8 MB (from 6.7): small maps are now really 512 wide (a bug in the shared kit had embedded the full 2048 maps for them), lava and smoke at quality 78, map-size planets from 512-wide maps.

## Round 3 (Nick, 2026-10-08: "I feel like it still needs work")

My own read of round 2: the seas looked like a dark leather with a red grid, not molten; the land was one muddy brown with nothing on it; no volcanoes for the eruptions to come from; no crimson in the air. What was done:
1. Volcanoes: 18 cones on the land, smooth dark flanks of fresh lava, a glowing crater and two or three tongues of lava running down each; eruptions now come from the volcano nearest the point facing the viewer.
2. Seas: near-black crust, seams brighter and running hot over more of the sea, the lava light at 0.85 by day.
3. Land: basalt and obsidian near black, the ash fields paler, so the islands show light and dark.
4. A crimson stain in the air over the day side, thicker toward the limb ("staining the sky crimson").

## Round 3 review (fresh Opus reviewer): 5

"A brown ball with orange lines": evenly self-lit with no direction of light; seas a uniform Voronoi hide; volcanoes reading as lollipops; eruptions a glow with a bead necklace; smoke invisible; every glow line the same weight; a stair-stepped shore; flat brown islands; a uniform orange rim; mush at 76 px.

## Round 4

1. Seas in three tiers: open molten pools (about an eighth of the sea, churning convection cells, orange with yellow cores), thin crust glowing dull red through (about a quarter), black crust elsewhere; plates large far from the open lava and small and broken near it; a few big seams torn open as rifts; seams at half the brightness of open lava.
2. Light: the lava's light at half strength by day and full at night, a narrower terminator, a near-black night; the night hemisphere is now black threaded with fire.
3. Volcanoes: five great cones and smaller ones, a crater ring with a dark heart and hot rim, two or three tongues that branch, taper and cool from yellow to dark red.
4. Eruptions: 32 streaked embers on random delays and reaches, a pillar of fire at the vent, an opaque plume with its shadow on the ground and an orange-lit underside.
5. Smoke: three long ash storms sheared by the wind and wisps over about a third of the world, dimming the lava under them to about a third; by night their undersides are lit red over open lava.
6. Glow hierarchy: open lava and rifts brightest, shores next, seams at half, fissures at 0.4 except under a surge.
7. Shore taken from a softened field: no staircase.
8. Islands: near-black obsidian against pale wind-streaked ash drifts; sharp glints on a few facets only.
9. Air rim bright orange on the sun side, deep crimson toward the night.
10. Map sizes: the small planets drop the seams and keep the open lava, rifts, shores and craters.
