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
