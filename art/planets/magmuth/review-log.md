# Magmuth living planet: review log

Second world, built on the shared parts extracted from Zolton (`art/planets/planetlib.py` for the maps, `art/planets/svgkit.py` for the SVG). A Haiku 5.5 trial build of this world (2026-10-08) fell short of the bar; Nick: "dont worry about Haiku then ... you can just build them yourself." This is a fresh build.

## Round 1 (2026-10-08)

Drawn from the history (quotes in build.py's docstring): seas of lava (about 42 percent) under Voronoi crust plates crazed with finer cracks, seams running hot where the crust moves and skinning over elsewhere, the crust breaking into open lava at the shores; basalt and ash islands with glass spires glinting; a fissure network on the land with surges of fire running along it; dark streaky smoke and ash blowing faster than the ground; a red dwarf's dim warm light and a crimson air rim; four vents erupting in turn on a 37.7 s clock, each where the ground faces the viewer, with a flash, lit ground, embers and a spreading dark plume.

Found and fixed while building:
- A bright vertical stripe near the south pole: the two copies of a map overlapped by their wrapped columns, so a translucent glow was drawn twice there. Each copy is now clipped to its own width (in svgkit, so every world gets it). Zolton was built before this and may carry a faint version of it.
- Distance-measured cracks smear into bands near the poles where the map's rows crowd: faded out above about 66 degrees.

Checked: keyTimes on every animation (none bad), review page at 1366 and 390 with no console errors or overflow, the 150 and 76 px planets on the page.
