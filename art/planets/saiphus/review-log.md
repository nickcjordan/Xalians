# Saiphus living planet: review log

Third world, built by me on the shared planetlib and svgkit (Nick, 2026-10-09: "you can just build them yourself"; the Haiku trial build is kept in saiphus-haiku/). Facts and quotes in build.py's docstring.

## Round 1 (2026-10-09)

Drawn: a banded gas giant in pale peach zones and dusty rose belts (palette moved off Jupiter's browns), plum deep belts, lavender poles; six storm ovals, one great dark superstorm with lightning; sulfur haze blowing faster than the bands; a life band of small green-plained islands with pale cliff edges under drifting fog, casting faint shadows, turning at its own speed; dawn as a warm tint on the day side of the terminator; teal and violet algae glowing in deep night only; Benthane squalls bursting out of three storms in turn, each when its storm faces the viewer, spreading as a flat anvil north and east with a smaller puff after.

Found and fixed while building: a seam line where clipped map tiles abut (clip widened by a hair, in svgkit and Zolton); a dawn band drawn bright over the night read as a second terminator (now a multiplied tint on the day side, applied to the image, not its group, so the blend is not isolated); the haze never rendered because its symbol id collided with the kit's limb gradient (renamed, and svgkit now refuses reserved ids).

Fresh reviewer: 6. Fixed: dawn too faint, terminator ending in a hard corner (smoothstep ramp, now an option in planetlib.sun), islands like soot (lighter plains, pale edges, fog wisps, fainter shadows), squall like a glowing eye (now rises past the storm's rim as an anvil), frayed band edges (finest octave removed), haze too faint, flashes like dots (now large soft blue glows), the air rim outlining the night limb (fades to almost nothing there, for every world).
