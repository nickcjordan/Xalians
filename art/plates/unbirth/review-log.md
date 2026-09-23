# Unbirth plate review log

## Concept (Nick, 2026-09-22)

Nick disliked the Unbirth painting (empty beds before an energy core: two ideas side by side, and dull). He approved a new scene built on Floria's history: the first storm after the Genesis Prototype was switched on. The machine throws seed pods into the wind, and the flood that was meant to wash its mistakes away carries them across the world. The panel reads left to right, from cause to consequence: machine, seeds, first growth, the young World Tree.

Lore checks, done by the builder (Nick does not fact-check lore):
- Floria before the Generator was shallow ocean and smooth rock. Once a year its oceans vaporized into clouds dense enough to blot out the sun, then fell back as a torrent that washed the world smooth (Floria, paragraphs 1 and 2).
- The Generator went on Floria so mistakes "would simply be washed away in due time" (paragraph 3).
- It ran "at full capacity through the entire storm," making "not just Xalians ... but the vegetation, fungi and jungles to support them," and the World Trees (paragraph 7). Floria is the written exception: Generators elsewhere make Xalians, and the other worlds have native life (Poseidas paragraph 1, Luminax paragraphs 1 and 2).
- "Creatures born from the first seeds of the Genesis Prototype" (paragraph 10) is hedged in the source with "some say". The plate shows seeds, not a claim.
- Inference, not stated canon: the pods carry both plants and plant-like Xalians. No text on the page states it.
- The fleeing Vallerii ship was left out, so the scene carries one idea.

## The loop for this plate

This loop follows the Accords panel trial's conclusion (see `art/plates/accords/review-log.md`): fresh reviewers every round re-judged taste, and their fixes swung back and forth.
- **One visual reviewer, resumed across rounds.** It covers concept, the full frame and every piece. Because it is the same reviewer each round, it can confirm its own fixes and does not reverse decisions it already accepted.
- **One motion reviewer each round.** It reads the clocks in the script and the written source.
- **The gate:** both reviewers return "Nothing worth a round", the visual score is at least 9, and every owner checklist item passes. Then a single cold visual check looks for anything the resumed reviewer has gone blind to. A taste finding from that check that reverses an accepted decision is logged, not implemented.
- **Cap:** eight rounds. Nick judges taste on the live page.

## Round 0 (builder, before review)

- **Built from scratch.** `build.py` writes `source.html`: ten SVG layers (defs, sky, flash, far, land, glow, pods, fronds, rain, top).
- **Fixes from the builder's own renders:**
  - The World Tree read as dead and bare: it now has a leaf canopy under the cloud.
  - The Xalian read as a table with plants on it: it was redrawn with an arched neck, a head and an eye, a crest and a tail, facing the Generator.
  - The intake pipes read as ramps: they are cut.
  - The rain was too heavy: it was cut to about half.
  - The air and water were shifted to blue-slate, so the living green is the only green.
  - The reflection glints read as a ladder: they became one shimmering pool.
- **Page:** the panel's well sits inside a 6px mat, so it is wider than 21:9 (2.37 on desktop, 2.45 on a phone). "Meet" letterboxed the plate with the poster showing at both sides, so the layers use "slice", which trims at most 5% top and bottom.
- **Motion:** every clock divides a 24 s master cycle.
  - The vents throw bursts 2 s apart, each vent every 6 s.
  - The pods fly for 5.5 to 9 s, launched from each vent's burst.
  - The core breathes on a 3 s clock.
  - The lightning runs on 12 s and 24 s clocks, and the rain patterns loop along their own slant.

## Round 1 (visual score 5; motion: another round)

All sixteen findings were merged:
- **Pods (visual 1, motion 1 to 3).** Each pod now has a short trailing tail (rotate auto), and pods leave in bursts of three, fastest first, so none overtakes another. They touch down before fading. The near pods ride the flood current about 40 to 80 units downstream, and the far ones settle and shrink to .35. Landings stay clear of the Xalian and of the current upstream of it.
- **The flood (visual 2).** Foam catches on the upstream end of every slab, and a wake trails off its downstream end. Pale current lines drift left to right across the mid plain.
- **The World Tree (visual 3).** The trunk is hazed toward the horizon value, and the base has buttress roots about 300 wide. The loose leaf clusters are gone; a green-dark crown of lobes now sits at the cloud base.
- **The Xalian (visual 4, 5).** Its body is moss green, with one glowing eye. The two lodged pods in front of its face moved away. A rim-light path was tried and removed: it drew a stick across open air.
- **Lightning (visual 6, motion 6).** Each strike lights a knot of cloud lobes, with peaks at .85 to .9. It flickers over 0.45 s instead of 0.9.
- **Wind (visual 6, motion 4).** The rain leans 25°. The near fronds lean fast downwind (−2° to 9°) and return slowly on 2, 3 and 4 s clocks.
- **Moss (visual 7).** In the mid plain it grows as strips along the slab edges instead of floating pads.
- **Vents (motion 5).** The flare is 34×24 and holds its peak for about 0.3 s.
- **Rings (motion 7).** There are 44 rain rings with strokes of 1.4 to 2, now including the lit water in front of the shelf.
- **Reflection (motion 8).** It shimmers on its own 2 s clock with a width wobble, no longer in lockstep with the core.
- **Piece list (visual 8).** It follows the plate.

## Round 2 (visual score 7; motion: another round)

Every finding was merged:
- **The World Tree (visual 1, motion 8).** It had faded to a ghost. The trunk is now one clear step darker than the air, and it ends inside the crown. The boughs are tapering, curving limbs. The crown is defined, domed lobes swelling below the cloud base, with a little gold-green on their undersides. Blurring the crown was tried and removed: it smeared into a green band.
- **The foam (visual 2).** The bracket hooks are now soft, wide, low-contrast arcs hugging each slab's upstream end.
- **Current lines (visual 2, motion 2).** They drift only over open water, clear of the Xalian and the shelf, and are staggered so no two stack.
- **Pod speed (motion 1).** The pods settle on a spline, from flight speed to riding speed, instead of two hard steps.
- **Pod landings (motion 3, 4, 7).** No landing puts a pod on a slab or behind the near fronds, and pods from the same burst land at least 60 apart.
- **Riding speed (motion 5).** Pods ride at the current's 22 units a second.
- **Wind slant (motion 6).** Pods landing near the machine fall with the wind at the rain's slant.
- **Burst size (motion's owner check under item 16).** Bursts dropped from three pods to two, so the air holds a stream of thrown seeds rather than a swarm of 13 to 17.

## Round 3 (visual score 9, "Nothing worth a round"; motion: another round)

The visual reviewer confirmed that the World Tree and foam fixes read at site size, and every checklist item passes. The motion fixes:
- **Current lines (motion 1, 5).** My round 2 shelf test was inverted, so every left current line sat on the rock. The lines now start right of the shelf, on open water only, and never drift over a slab.
- **Landing spacing (motion 2, 4).** One landing record now spans every burst and the cycle's wrap. No pod lands within 50 units of another pod's landing point or ride path while both are on the water. The landing area opened up to x 740–900 at y 474–540, and x 1135–1230 at y 474–505.
- **Fronds (motion 3).** A ride that would carry a pod past x 1230, into the fronds, is rejected.
- **Touchdown (motion 6).** The settle spline's exit handle is set per pod, so it leaves at the current's 22 units a second, with no kick at touchdown.

## Round 4 (motion "Nothing worth a round"; cold visual check 7.5, another round)

The motion reviewer confirmed all six round 3 fixes. I then took its three remaining notes:
- Current lines up to 14, so the flood visibly runs.
- Every landing spot used once in the cycle.
- More margin below the slabs.

The first cold check (a fresh reviewer) found five things the resumed reviewers had stopped seeing. All five were fixed:
- **The World Tree (cold 1; checklist 19, since the lore says World Trees are city-sized).** It read as an ordinary acacia. Its crown now spans about 600 units, its roots are wider, and a band of cloud closes over the crown's top, so it rises out of sight into the storm.
- **The Xalian (cold 2).** Its body is a step lighter, its crest takes the lit green, and a pale sheet of water sits behind it so its silhouette separates.
- **Lightning (cold 3).** Each strike has a hot white core. The lit lobes dropped from five to three. I kept them, because the resumed visual reviewer had accepted the lit knots; removing them would reverse that.
- **The backlight (cold 4).** A trunk rim light was tried and removed: it read as two white lines inside the silhouette. Instead the flash behind the tree is bigger and brighter, so the dark trunk and boughs stand out against it.
- **The Generator (cold 5).** Its halo moved behind the vessel, so the machine stays dark and solid down to its plinth.

## Round 5 (second cold check 6.5, another round)

The second cold check repeated the first one's top finding: the World Tree read as an ordinary nearby tree. A top finding that repeats is a composition decision, not a patch, so I redrew the tree.

**The World Tree as a colossus.**
- It is a trunk about 230 units wide at the horizon, with buttress roots sprawling about 500 units along it.
- It is hazed to a dark value and rises straight through the cloud base out of sight. There is no crown outline to read as an ordinary tree.
- Great tapering limbs spread out and vanish into the storm, with green-dark foliage undersides at the cloud base.
- The cloud's own mass and lobes are drawn over everything above the base.
- The backlight strike moved up into the cloud: it lights the cloud base over the tree, and the air beneath it, so the trunk shows as a silhouette.

**The rest of the round:**
- **Flood current.** Current lines and wakes are about 1.5x stronger.
- **The machine on its legs.** A taller, lit plinth now carries the vessel. A glow line on the plinth was tried and removed: it made the machine read as a hovercraft.
- **The shelf.** A soft gold-green rim catches its upper curve.
- **Lightning.** The in-cloud strikes sit lower and larger, where the page's slice crop cannot trim them.

## Round 6 (third cold check 7, another round)

The World Tree was the top finding for the third time: its canopy stopped at a ruler-straight band with a green stripe, and the gaps between its limbs read as cut-outs.
- **The World Tree.** Its trunk now fades upward into the cloud's value, and the cloud meets it at uneven heights. Lobes hang lower in front of its upper trunk, so it climbs into the storm instead of stopping at a line. The green stripe is gone. A slight distance softening on the silhouette makes the gaps read as air.
- **The Generator.** It stands on thicker legs rising to its plinth. The legs and the plinth outline catch the core's light, so the vessel no longer seems to hover.
- **Pods.** The bodies are 1.5 times longer, and the tails are twice as long and brighter, so the pods read as thrown seeds with comet tails at site size.
- **The left third.** A great pale whaleback of rock now sits in the left middle distance, its crown faint in the Generator's light.
- **Lightning.** The upper-left strike is smaller and fainter, so it reads as distant lightning.
- **Not taken (cold 2: a rim light on the trunk during the strike).** It was tried in round 4 and read as white lines inside the silhouette.

## Rounds 7 and 8 (fourth cold check 6.5; the cap)

The fourth cold check again ranked the World Tree first. This time it read as a flat-topped mushroom, with the boughs stopping under opaque lobes.

Round 8 was the last under the cap:
- **The World Tree.** The trunk now narrows as it climbs. Its boughs sweep up at 30 to 45 degrees, and the roots are tight, at about 1.5 times the trunk base, fading into the horizon haze. The whole top fades into the cloud through a gradient mask, with no opaque lobes left.
- **The backlight.** The strike moved down behind the trunk and bough junction, and the band it lights in the cloud is quieter.
- **The flood.** The current lines are two to three times longer and brighter, so the water reads as a torrent.
- **The pods.** Each is now an almond husk with a dark case, a glowing seam and a shorter tail. They read as seeds, not comets or fireflies.
- **The left.** A second, far whaleback and a stronger rain curtain fill it.

**Not chased: the lighter air between the trunk and its limbs**, which the cold check read as slabs. Rendering the layers alone showed that no drawn shape paints it: it is the sky showing through a silhouette tree, as it does behind any tree.

## Conclusion (for the loop, not only this plate)

- **The resumed reviewers converged fast.** The visual reviewer went from 5 to 7 to 9 in three rounds and confirmed its own fixes. The motion reviewer cleared in four rounds, and its findings were all real mechanics: pods vanishing in mid-air, pods overtaking each other, speed steps, landings on the creature, an inverted shelf test, and speed cues that disagreed.
- **The cold checks found real misses early.** The first found the Xalian hidden in the dark, the Generator's glow washing its own body, and the World Tree failing its lore scale.
- **After that, the cold checks mostly churned on taste.** Over four checks the tree was, in turn, an oak, a dead tree, an acacia, a baobab and a mushroom. The pods went from fireflies to comets.
- **Lesson.** One cold check is worth running at the gate, and its findings about identity and lore should be taken. Repeated cold checks on a still-life object whose look is a matter of taste do not converge, and the call should go to Nick on the live page. That matches the Accords trial.

## Enhancement pass (Nick, 2026-09-23)

After seeing the plate live, Nick asked for all five enhancements I had proposed. The loop was the same as before: one resumed visual reviewer and one resumed motion reviewer.

**What was added**
- **The birth.** Once a cycle, after the surge, the hatch in the plinth slides open on a lit interior. A newborn of the adult's kind, at half its size, walks across the lit interior as it grows toward the threshold. It hops down, pauses on the shelf, walks down the shelf's lit face and wades off downstream, fading into the rain. t=0 falls inside the pause, so the still poster shows the newborn beside the open hatch. Lore: Floria paragraph 7 (the Prototype made Xalians along with the vegetation).
- **The overdrive surge.** The core charges, then flares white. Every seam blazes, all three vents fire together and throw a volley, and the cloud base and the rain around the machine light up. Then it settles. It runs about 4 s of the 24 s cycle. Lore: paragraph 7 ("uncalibrated", "at full capacity").
- **Growth you can watch.** Five pods a cycle come to rest on rock tops. A sprout rises from each: a folded pair of leaves opens as the stem climbs, stands, then fades before its seed returns.
- **The World Tree, replaced.** The distant colossus that four cold checks read as four different ordinary trees is gone. In its place, a young World Tree stands in the middle distance: a trunk climbing into the storm on buttress roots, broad boughs thick enough to be roads, each turning up into a stalk that holds out one enormous flat leaf, seen from below, with rain sheeting off the rims (paragraph 7: "leaves so wide they doubled as landing pads").
- **A first prototype.**
  - One structural rib runs the full height; the other stops at an unskinned opening with pipework inside.
  - A replaced panel in a different metal, and one seam half dark.
  - Cables sag off the flank and are clamped to the rock.
  - A vent run is bolted up the right side into the third stack.
  - A split panel leaks flickering light, with its corner bent out.
  - Three instrument lamps blink in turn.

## Rounds 9 to 12 (visual 7.5, 8.5, 9 "Nothing worth a round"; motion: see below)

- **The tree (round 9).** It read as floating plates. The boughs are now solid, as dark as the trunk and out of the blur. The stalks are drawn in front of each leaf and turn up into its underside. The rims are softened, and the trunk climbs into a band of cloud lobes that swallows the crown leaf.
- **The birth (rounds 9 to 11).**
  - The newborn was bigger than its door and faded in on top of the frame. It is now clipped to the doorway while inside. It walks sideways across the lit interior while growing to .85, and reaches full size through the hop, so nothing pops when the clip opens.
  - The hop eases out on the rise and in on the fall.
  - The strides are matched to the ground speed: a 30° swing centered on the vertical while walking, and 20° while emerging.
- **Wading (rounds 9 to 11).** It walked on the water. Past the first step down, its legs are clipped at a waterline, and rings spread from them.
- **The prototype (rounds 9 and 10).**
  - Two symmetric ribs and even seams read as a cage. That was broken with the stopped rib, the opening and the dead half-seam.
  - The crack read first as a lightning icon, then as a stuck pod. It is now a thin split with a lit core line and a spill below.
- **Sprouts (round 10).** Mid-growth, a sprout read as a bulb on a stick. Now the leaves start as a folded pair and open while the stem rises, with no bud knob. It is also smaller.
- **Pods (motion, rounds 9 to 12).** Lodge pods overtook their bursts, pods rode through sprouts, and the surge volley crossed itself. The fixes:
  - Each lodge pod joins its burst's fastest-first sort.
  - Vent 2's regular burst at the release gave way to the volley.
  - Each vent's volley pods settle in their own band.
  - The build now carries a sampler that plays every pod's animateMotion (spline easing over keyPoints by arc length) every 0.02 s. It rejects any draw where two pods come within 16 units in flight or 10 once down, or where a pod passes through a standing sprout. The motion reviewer confirmed it models SMIL.
  - The pod draws were searched and pinned (`PODS_SEARCH=1` searches again).

**Left to Nick, per the reviewer:** the trunk's nearly parallel sides above the lowest boughs (a taste note; the fix, if wanted, is a taper from about 44 to 30), and the crack's faint zigzag.
