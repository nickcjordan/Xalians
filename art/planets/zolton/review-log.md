# Zolton living planet: review log

Proof of concept for animated SVG planets on the home page's galaxy map (Nick, 2026-10-06: "I would like to see what you are capable of doing for building an animated svg planet ... we can fall back to the 2022 sprites"). Source: `textures.py` (maps), `build.py` (planet SVG), `demo.py` (review page). Facts drawn from Zolton's history in `packages/content/json/planets.json` (listed at the top of build.py).

## Round 1 (2026-10-06): published as the first artifact

Nick: "this direction is worth building, but I don't want you to do it for all the worlds just yet. I want to continue iterating on the quality ... The one thing I found that needs work is that the bloodstorm looks very primitive right now. It does not look like a storm, it's just a red blur with little jellyfish appearing."

## Round 2

1. Bloodstorm: now a storm in the cloud deck, a cyclone of storm-dark maroon cloud with spiral bands, an eyewall and a ragged edge, laid into the storm map so it turns with the clouds; its own red lightning lights its bands from inside (masked by the storm's thickness); small crimson sprites flicker and rise above it. The red blur is gone.
2. Clouds: maps at 2048 wide; crisp storm bodies with wisps around them, shaded as towers; more coverage.
3. Hatching and straight lines: the noise aliased into hatching (finest octave below about 4 map pixels) and its lattice left horizontal creases along the map's rows. Octaves capped and the lattice turned at random per octave.
4. Canyons: kink and fork, vary from gorges to hairline cracks, tributaries only near a main canyon.
5. Seams: each map carries two wrapped columns on each side, so its two copies meet without a line.
6. Lightning: flashes ride the storm through the lens and light the cloud around them (masked by thickness, never fully off in clear air), many more of them, on out-of-step clocks.
7. Current: thinner, and the whole network surges on its own clock.
8. Black lightning: a strike of forked dark-violet spider lightning with a white fleck at its heart and the neutron ring, instead of a round target.
9. Night: a deeper night side and a softer terminator.
10. Cost: played at film rate (stepped twenty times a second, as the story plates are). Three planets on the review page measured in headed Chrome: gpu-main 130 ms/s, about 20 draws a second (was 818 ms/s at the browser's own pace).

## Round 2 review (fresh Opus reviewer): 5

Bloodstorm no longer a blur but a flat red rose; black lightning a fixed screen sticker with a reticle ring; flashes soft ovals; the current wide flat puddles; the surface not reading as metal and frost; the storm sliding as a rigid sheet too fast; stair-steps at the limb; sprites like map pins; a white cyclone twinned with the bloodstorm.

## Round 3

1. Every relief was lit backwards (slopes facing the upper-left sun were shaded): canyons read raised and storm towers lit on the wrong side. Fixed in the one shading rule; canyons now read as cuts and the clouds as lit towers.
2. Canyons: measured from their center line in map pixels, so gorges are straight-sided and never swell into lakes; fewer, narrower side canyons; floors a duller frost; bare metal glints on the highest spires facing the sun.
3. Current: a thin hot core down each canyon's center line, the same width whatever the canyon's, with a narrow blue halo; surges now travel across the network (soft bright bands running east) as well as the whole network breathing.
4. Bloodstorm: built from the same cloud field and tower shading as the rest of the storm, wound tighter, thick and opaque, with a clear eye and raised eyewall; storm-grey tops, maroon only in the shadowed undersides and a dull red glow deep in its gaps. It turns slowly about its own eye. Its red lightning lights soft irregular patches, never its bands.
5. Lightning: placed only inside cloud; each strike a burst (on 50 ms, off 50 ms, on 80 ms), the brighter ones showing a jagged channel; halos about 40 percent smaller; no flash in clear air.
6. Black lightning: inside the storm, three sites in turn, each where the storm faces the viewer when it comes, each with its own fork: a near-black forked bolt in a violet sheath, a hard white flash on the cloud for a frame or two, then a soft violet glow spreading and fading. No ring.
7. Sprites: clusters of two or three columns of crimson tendrils hanging from a bright head, inside the storm only.
8. Speeds: the ground turns in 90.7 s, the storm in 70.3 s.
9. The limb: clipped 1.5 units inside and finished with a dark hairline on the night side and the air's rim on the day side, so the lens's stair-steps no longer show.
10. The white cyclone beside the bloodstorm moved well away.
11. Small sizes: the map-size planets get a more contrasted ground and a brighter current.

## Round 3 review (fresh Opus reviewer): 5

The bloodstorm a translucent maroon stain with a target-like eye, outshone by a white cyclone that read as the real storm; red pills on the night side; weak flashes; black lightning like marker doodles; the ground soft noise, not crags; canyons like pale ribbons and moats; fine horizontal streaks; the map sizes without any red most of the time.

## Round 4

1. The bloodstorms are now two of the storm's own cyclones, built in the same cloud field the same way (same resolution, same tower shading), made thick and wound tight, then stained: darker and heavier than the white storms, maroon only in the shadowed undersides and gaps of the bands, a soft dark eye with no rim. A second, smaller bloodstorm sits on the far side, so one is usually in view. The white cyclone beside it is smaller and weaker.
2. Red lightning lights cloud-shaped patches of each bloodstorm; sprites are clusters of two or three tapered crimson streaks, no heads.
3. Lightning: brighter and a little larger, half the bursts show a 1 px white channel; placed only in cloud.
4. Black lightning: a tapered bolt (2.5 px at the root to 0.5 at the tips), its forks leaving from points on it, shown on 100 ms, off 50, on 50; only the violet glow lingers.
5. Ground: a ridged octave gives sharp crests between the crags; metal glints on the top 3 percent of heights facing the sun; canyon floors lower and darker than the plateau with a faint frost; canyons run out in places so they end instead of closing into rings.
6. Cloud shading from a softened field, so the lens no longer stretches fine streaks.
7. The lens: its 8-bit steps showed as sheared rows and a cross through the disc's center. Dithered before rounding, the steps become a fine grain the browser's smoothing averages away. (A second fine pass was tried and dropped: smoothing across its steps drew lines of its own.)
8. Current: core a quarter dimmer, halo wider.

## Round 4 review (fresh Opus reviewer): 5

The bloodstorm a peppermint candy (three even white and maroon turns, brightest cloud on the planet); red pills on the night side; ground not metal or frost; two invalid animation timings; grain on crisp edges; the white cyclone outshining it; flash bursts swallowed by the film rate; black lightning a dead twig; too little storm; the deck sliding fast; beaded current; stale page text.

## Round 5

1. Bloodstorm: about one turn inside its radius, a dense overcast core that keeps its towers, ragged feeder bands outside; storm-grey with a faint wine cast, brightest tops well under the white storms', red only glowing low in the gaps and undersides. Reads as a hurricane with blood under it.
2. White cyclones: smaller and weaker. Cloud cover up, in belts near 20 and 45 degrees.
3. Red lightning: small soft patches, two or three together, no bright core, dimmer. Sprites: 18 to 24 tall, 1.6 wide, softened.
4. Lightning: bursts on 70, off 60, on 100 ms (survive the 20 fps playback); a stretched halo with a bright core; channels 1.4 px with two or three forks.
5. Black lightning: 40 to 52 long, a 1.8 px core in a 5 px violet sheath, the white flash at its root, a violet afterglow fading over 1.3 s.
6. Ground: sharper crests, wider glints, canyon floors a cold blue-white frost, closed rings under 60 map pixels removed.
7. Current: core softened, halo 30 percent weaker; map sizes boost it less.
8. Timings: no keyTime past the end (checked for every animation).
9. Lens: softened inside the filter so its dithered steps no longer fray crisp edges.
10. Speeds: ground 120.7 s a turn, storm 105.3 s.
11. Page text matches what is drawn.

## Round 5 review (fresh Opus reviewer): 4.5

Bloodstorm a pinkish smeared swirl on a red crescent; sprites as red pills on the night side; white cyclone outshining it; canyons as pale lakes with ink outlines; ground putty, not crags; black lightning a vector twig; flash channels like check marks; a hard vertical edge in the current (an unwrapped blur at the map's seam); a dark blotch; map sizes a grey moon.

## Round 6 (bug fixes, then to Nick)

Five reviews in a row scored 4.5 to 5 while each fixed its predecessor's list, which is the plateau the critic-loop notes predict; the rest is taste for Nick. Fixed: every map blur now wraps east to west (the vertical edge in the current is gone); the bloodstorms are storm grey with red capped at 0.35 and only in the gaps; sprites ride with the lit storm, so the night hides them, and keep out of the eye; black lightning has two arms with one level of forks and a darker core.

Nick, 2026-10-06: "much better, although when nothing but bloodstorm is checked, i dont see bloodstorm". The bloodstorms had become part of the cloud map in round 4, so the Storm clouds switch hid them. The storm is now split into the white storms and the bloodstorms (two pictures from the same cloud), each with its own switch; black lightning has its own group too. Checked by paint with only Bloodstorm on.
