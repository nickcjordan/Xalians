# Unbirth plate review log

## Concept (Nick, 2026-09-22)

Nick disliked the Unbirth painting (empty beds before an energy core: two ideas side by side, and dull). He approved a new scene built on Floria's history: the first storm after the Genesis Prototype was switched on. The machine throws seed pods into the wind, and the flood that was meant to wash its mistakes away carries them across the world. The panel reads left to right, from cause to consequence: machine, seeds, first growth, the young World Tree.

Lore checks, done by the builder (Nick does not fact-check lore):
- Floria before the Generator was shallow ocean and smooth rock. Once a year its oceans vaporized into clouds dense enough to blot out the sun, then fell back as a torrent that washed the world smooth (Floria, paragraph 2).
- The Generator went on Floria so mistakes "would simply be washed away in due time" (paragraph 4).
- It ran "at full capacity through the entire storm," making "not just Xalians ... but the vegetation, fungi and jungles to support them," and the World Trees (paragraph 8). Floria is the written exception: Generators elsewhere make Xalians, and the other worlds have native life (Poseidas paragraph 1, Luminax paragraphs 1 and 2).
- "Creatures born from the first seeds of the Genesis Prototype" (paragraph 11) is hedged in the source with "some say". The plate shows seeds, not a claim.
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
- **The birth.** Once a cycle, after the surge, the hatch in the plinth slides open on a lit interior. A newborn of the adult's kind, at half its size, walks across the lit interior as it grows toward the threshold. It hops down, pauses on the shelf, walks down the shelf's lit face and wades off downstream, fading into the rain. t=0 falls inside the pause, so the still poster shows the newborn beside the open hatch. Lore: Floria paragraph 8 (the Prototype made Xalians along with the vegetation).
- **The overdrive surge.** The core charges, then flares white. Every seam blazes, all three vents fire together and throw a volley, and the cloud base and the rain around the machine light up. Then it settles. It runs about 4 s of the 24 s cycle. Lore: paragraphs 5 and 8 (never calibrated; "at full capacity").
- **Growth you can watch.** Five pods a cycle come to rest on rock tops. A sprout rises from each: a folded pair of leaves opens as the stem climbs, stands, then fades before its seed returns.
- **The World Tree, replaced.** The distant colossus that four cold checks read as four different ordinary trees is gone. In its place, a young World Tree stands in the middle distance: a trunk climbing into the storm on buttress roots, broad boughs thick enough to be roads, each turning up into a stalk that holds out one enormous flat leaf, seen from below, with rain sheeting off the rims (paragraph 8: "leaves so wide they doubled as landing pads").
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

## The gate: one cold check (7)

The fresh reviewer read the scene right without help ("a machine seeding life into a drowned world"), birth included. What was taken:
- **The World Tree read as a smokestack** (identity): a parallel-sided trunk rising past its top bough into the cloud. The trunk now tapers hard from its roots and ends in a larger crown leaf pressed against the cloud base.
- **The surge washed out the machine** (broken): the flare's halo lay over the body, which looked translucent. The halo and the cloud-base light are now masked off the vessel, the plinth and the stacks, so the body stays solid and only the seams and core blaze.
- **The newborn faded in open water** (it read as drowning). It now wades on toward the grown one, with rings spreading, and fades beside it.
- **Paragraph numbers** in the concept were off by one (counted from zero). All citations in this log and in `build.py` now count from one.

Logged, not taken:
- **"The pods read as leaves"** reverses the round 8 decision (almond husks with a lit seam), which the resumed reviewer accepted.
- **"The newborn is invisible on a phone":** on a phone the lit hatch carries the birth, as the resumed reviewer judged. It is a desktop beat.
- Its three taste notes.

## Rework: seeds only (Nick, 2026-09-23)

Nick's feedback on the live enhancement pass:
- The machine opening a gate and a creature walking out, while it also throws seeds, is two ideas. Gates are what later Generators do; this one only pumps out seeds.
- The tree "doesn't look good".
- The seeds "look like flying tadpoles", and they fall wrong.

His decisions on a studies page:
1. The birth comes from a heavy seed, and the hatch goes.
2. Parachute-style seeds are fine as long as they do not read as dandelion seeds.
3. The distant colossus tree is the one that reads; the nearer tree studies do not.

**What changed**
- **The World Tree** is back to the distant colossus from before the enhancement pass. The young tree in the middle distance is gone.
- **The hatch is gone.** In the surge, the middle vent throws one heavy husked seed short, tumbling on a true arc. It lands upright on the shelf, glows and splits along its seam, and the newborn climbs out. The husk halves fall flat.
- **Seed physics** is now in `seedsim.py`, not drawn curves. Gravity, drag, and one gusting wind that is stronger aloft. Four kinds were studied: parachute, samara, nut and glider. The plate uses the glider, Javan-cucumber style: a steady sink with a slow swoop (the phugoid), speed building through each dive, and pitch following heading. Each seed's sink rate is solved so that it comes down on its spot, and throws that would dive (sink above 75) are rejected.
- **The seed art.** A dark almond seed with a lit seam, set at the leading edge of one broad translucent wing with a lit rim and fanned veins. The wing's visible breadth swells and thins with the pitch, and each seed flies with its own slight roll. It is folded in the jet, spreads at the top of the climb, and folds again when it touches down.
- **Placement is constructive.** The search over random draws took 21 minutes and still left clashes. Now every throw is redrawn, up to 60 times, until its whole flight keeps clear of every seed already in the sky, every standing sprout and the grown creature, using the final check's rule with a margin. A seed bound for the rock also checks that its future sprout stands clear. The build's final pairwise check reports 0 clashes on the first draw.
- **Riders:** 6 seeds ride the flood. The build refuses a draw with fewer. Water is reserved around the newborn's walk and around each sprout.

**Rounds (visual rising to 9, "Nothing worth a round"; motion 8.5, "Nothing worth a round")**
- **Visual.**
  - Seeds read as paratroopers, then as gulls. That led to the glider wing and the pitch-driven breadth.
  - The birth seed fell down the machine's face. It is now a lower, flatter throw.
  - The husk halves read as the newborn's feet.
  - The birth seed did not read as upright once landed.
  - An open canopy sat on the water. Seeds now fold at touchdown.
  - The wing rims were tinted toward the glow, and the back edge curved in, which ended a flying-saucer echo.
- **Motion.**
  - Burst mates overlapped, and the check window ended early.
  - keyTime rounding.
  - The pivot offset, and a snap at the apex.
  - Dead stops at touchdown. The speed now decays toward the ride over 0.12 s.
  - A dip in the glow at the hand-off.
  - The rise ran inverted.
  - No riders.
  - The swoop's energy ran backwards.
  - The separation check underestimated the wing's size.
  - The walk overstrode, and the legs hitched at the walk-to-wade change. It is now one gait at one pace.
  - A rounder bounce.
  - The rainFar clock (0.55 s) did not divide 24; it is now 0.6 s.
  - The surge volley flew in single file. The launch spread is wider.

**The gate: one cold check (7)**

Taken:
- **The newborn was hard to see at full frame.** The resumed reviewer had also noted it. It is now 20% larger with a brighter glow, and its leg swing is scaled so the feet still keep pace.
- **The seeds read as eyes.** The seed sat in the middle of the almond wing like an iris. It now sits at the leading edge, as a gliding seed's does, with a smaller glow.
- **The newborn faded in open water, short of the grown one.** It now walks on to stand beside the grown one's forelegs and fades only after it arrives.
- **A seed brushed the grown one's tail.** The clearance test now treats the grown one as solid. The surge's middle-vent sprout moved onto the rise, because no throw to its old spot could clear the tail.

Logged, not taken:
- **Hang the seed under the wing on two lines.** That is the rigged sail the rounds moved away from ("paratroopers"), and Nick asked for nothing dandelion-like.
- **The underglow on the cloud base, the foreground fronds, and the pale current dashes.** These are accepted decisions from earlier rounds; they are Nick's to judge on the live page.

## Industrial rework (Nick, 2026-09-23, after PR #601)

Nick's notes on the live plate:
1. The Generator's base looked like a beer distillery and the nozzles looked bad. It should be bigger and more industrial.
2. The seed that lands and lets a creature out "looks decent", but the gliding seeds looked like Yoda heads.
3. The seeds all drift right, so the machine should take up more of the left; the left quarter was pointless.
4. He does not want the grown creature in the water. Baby tadpole-like things coming out of seeds are fine.
5. The tree "doesn't look bad" but was not integrated into the scene.

**What changed**
- **The machine is a heavy seed battery, drawn 1.18× and filling the left quarter.** It has:
  - a stepped foundation with struts;
  - a riveted plate housing with girder bands;
  - a tall incubation vat with clamp bands, a fluid surface, pale half-formed pods at several depths, and rising bubbles;
  - a feed pipe up into a breech turret;
  - three banded barrels aimed low (20, 16 and 12 degrees), with slotted brakes and round glowing mouths, which recoil and flash on each shot;
  - a boiler annex with a gauge, lamps, louvres and a steam relief valve;
  - a lattice gantry with a catwalk, a beacon and a service crane.

  All of its glows are drawn in the machine's frame.
- **Seeds are pods, all of them.** Each is the birth seed's husk (the part Nick liked), long and pointed, under a notched acorn cup, with faint off-center ribs and no seam until it splits. The physics is ballistic (seedsim `nut`, gravity 128 because the machine is now about 30 m tall, drag .15). Each barrel's elevation is fixed, and `aim_speed()` solves the charge that lands each pod. Each pod tumbles a whole number of turns, so it lands upright.
  - Near pods splash, roll onto their side, ride the current and split; a tadpole-like leafy larva drifts with the husk, swims off with a wake, and dives on the move.
  - Far pods splash and sink.
  - Pods on rock rock to rest and sprout.
- **The birth** lets out a newborn larva. It rises from the split acorn, looks about, wriggles down the shelf, slips into the flood, swims off and dives. The grown creature is gone.
- **The tree** keeps the distant trunk Nick approved. Its canopy now spreads under the cloud base across the right half of the sky, and its own glowing pods twinkle there. Root flares run along the far plain, and the trunk is reflected in the flood.
- **Placement** is constructive as before. Swimming larvae are now obstacles too, and a rider is rejected if its own future hatchling would cross a pod. The build reports 0 clashes and 9 riders.

**Rounds (visual 7, 7.5, 8.5 "Nothing worth a round"; motion 7.5, 9, 9.5 "Nothing worth a round")**
- **Visual.**
  - The round core window read as a washing machine door, so it became the tall vat.
  - The vat bars read as a lit door, so they became clamp bands.
  - The barrels read first as telescopes, then as flashlight heads, so they were lowered and given dark brakes and round mouths.
  - The pods read first as coffee beans or cat's eyes, then (with a pointed calyx) as beetles, and finally became acorns with an overhanging notched cup and no center seam.
  - The prop roots read as poles and were cut.
  - Root humps in the near water read as fins or driftwood and became flares on the far plain.
  - The trunk's purple cast and banding were fixed.
  - The lightning-glyph crack became a straight crack.
  - The empty center foreground got slabs and moss.
- **Motion.**
  - Barrel 1's flash was dropped for backwards keyTimes; flashes are now capped by the gap to the next shot.
  - The surge stuttered with an interleaved regular burst; bursts near the volley are now dropped.
  - Pods snapped and spun backwards at touchdown; spins are now whole turns.
  - Sprouts rose 15 units from their pods.
  - Split husks stopped dead, and larvae stopped dead as they dived.
  - Far pods braked instantly.
  - The newborn slowly lifted during the swim.
  - A pod fell through a hatchling; larvae are now obstacles.
  - The roll on the water sped up the spin.
  - The lodge rock ran backwards.

**The gate: one cold check (6.5)**

Taken, as identity findings against the brief:
- **Pods read as beetles in flight and on the water.** They now fly point first (the heavy nut leads and the cup trails) instead of tumbling. The ribs are gone, and the cup is larger (about 40% of the length), lighter and toothed.
- **The vat read as a door.** It is now a glass capsule with rounded ends, thin hoops, a highlight down the glass and pipes feeding it. The seeds inside are pale little acorns.
- **Pods crossed the crane jib.** The jib is gone, and a hoist hangs its canister below the line of fire.
- **The barrels were stepped like a telescope.** The bands and brake are now flush.
- **The canopy read as a garland.** It is now a denser mass that domes over the trunk.
- **The near fronds competed with the machine.** They are 30% darker.

Logged, not taken: "far pods don't shrink" (they shrink to 0.4 over their flight; the pods it cited were near ones).

## Into the flood (Nick, 2026-09-23, after PR #610)

Nick's notes on the live plate:
- Remove the cannon: a Generator would not have one.
- From a studies page of three delivery methods (published as an artifact), he picked "into the flood" over seeding the storm and breathing spores.
- The study's seeds all travelled in one line straight to the tree, which looked weird.
- The vegetation at the tree's foot looked like lily pads and made the tree read as close. It should be smaller trees around the giant, stepping down into shrubs, weeds and grass.

**What changed**
- **No barrels.** A sluice gate with a wheel sits at the machine's foot. A riveted chute on legs runs from it down to the water behind the shelf, with glowing fluid sliding down it. The roof carries a banded header tank and a hopper. The gantry stands over the sluice. The hoist is cut.
- **Seeds on the flood (`drift()`).**
  - Seeds slide down the chute from rest under constant acceleration, at uneven intervals.
  - Each drops in at a jittered point and fans out on its own heading. It is braked from the lip's speed, then eases into a current that runs left to right and is slower with distance. It wanders, and parts around slabs.
  - Each meets one of four ends: splitting (a larva swims out, faster than the water, and dives on the move), sinking while still drifting, catching on a slab's upstream end and washing up onto the rock to sprout, or being carried off toward the island.
  - Every voyage is placed clear of the other seeds, the larvae, the sprouts, and its own future larva and sprout.
- **Surge.** The gate bursts and a rush of seeds goes down together. The heavy birth seed rides the chute small, slows against its wall, jumps it and lands on the shelf. Its husk is now brown, and the newborn is a round-headed tadpole with one tapering tail.
- **The World Tree** keeps its distant trunk. It is now darker than the cloud and the forest, and it stands on an island of young forest at the horizon: broadleaf crowns and conifer spires, tallest by the trunk (about a sixth of its visible height), stepping down to shrubs, weeds and a grass fringe, hazier toward the back.

**Rounds (visual 6.5 then 8.5; motion 7 then 8.5; both confirmed)**
- **Visual.**
  - Between flashes the trunk was invisible, and the island read as a near hill. The trunk is now dark and the island sits at the horizon.
  - The seeds were hard to follow at site size. They now have halos, the outfall glow is brighter, and the gate flashes with each release.
  - With the barrels gone the machine read as a cabinet. It now has the header tank and hopper.
  - The birth seed looked jammed in the chute. It now rides at a smaller scale.
  - A rim light on the trunk read as hanging vines, and was cut (the same finding as round 4 of the first loop).
- **Motion.**
  - Seeds passed through a sprout, caught seeds jumped back upstream, and sprouts stood in water.
  - Sinks stopped dead, hatchlings swam slower than the water, and seeds flipped off the lip.
  - The chute's speed stepped. It is now sampled every 0.12 s with uniform acceleration, braked on the water with tau 0.1.
  - Far seeds faded in open water.

**The gate: one cold check (6.5)**

Taken:
- **The machine's glows were missing entirely.** The line appending them was cut along with the barrels loop, so the vat never flared and none of the lamps, seams, gauge, steam or vat seeds showed. The line is restored.
- **The surge read as a gun firing.** The chute now stays dim in the surge, the light spills at the gate, and the heavy seed rides the chute at half size.
- **The larva read as a seedling, with leaf lobes.** It now has a round head and one tapering tail, and the heavy seed's husk is brown.
- **Seeds left the chute as a dotted string.** Emission is now jittered, the drop point is jittered, and seeds brake faster.

Logged, not taken, as accepted decisions or taste: the island as "a hedge band" (the resumed reviewer judged the scale met), the cloud across the trunk, the reeds, the slabs, and sprouts fading at their reset.

## Realism pass (2026-09-23, Nick: "not quite there … more realistic")

Nick agreed with five realism gaps named after the flood version went live (PR #613). He also ruled that hand-coded SVG has no illustrated ceiling here, and that painted or generated textures are a normal next stage rather than a risky change.

1. **Water behaves like water.**
   - Ripple textures (noise thresholded into streaks of reflected sky) are finer toward the horizon, with trough streaks near the viewer.
   - The ripples beyond the shelf catch the Generator in short horizontal flecks.
   - The outfall is a glitter of broken light drifting with the current.
   - Slabs and whalebacks have dark reflections and lapping lines. The island is mirrored below its shore.
   - Floating seeds glint in the water under them and ring as they bob.
   - There are 100 rain rings of uneven size (a third are half-rings) and splash crowns on rock and water.
   - Strikes are mirrored in the far water.
2. **Light touches things.**
   - The shelf's light follows the dome and stops at its edge, with wet glints.
   - The lit window is smeared down the wet rock, with a tail, and there is a contact shadow under the foundation.
   - The vat light spills onto the plates, and the window frame is lit.
   - Rain blazes just outside the window, with the glass kept clear.
   - Strikes catch the machine's top edges.
3. **The World Tree is colossal and far.**
   - The trunk pales only above its lower third, with mist across it, rain curtains in front and a feathered shadow behind its hard edge.
   - The lower boughs are knotted and bowed, and lesser limbs run into the crown.
   - The canopy is displaced foliage masses and clumps with a leaf-mass texture, with no single leaves.
   - The island is a ragged treeline with mist between its rows.
   - The backlit strike blooms through vapor high in the crown.
4. **Foreground plants.** Five fronds (were eight), with a base-to-tip gradient, a dark far half, a broken wet edge, drips from two tips, and a slight defocus. The lodged pods are dim tipped acorns. The moss is dark wet olive, in clumps.
5. **A weathered machine.**
   - Grime runoff, rust toward the foot and in runs from rivets, wet streaks, and plate-tone variation.
   - The lit seams fade toward their ends with a soft bloom.
   - Quieter rivets that vary and are sometimes missing, and wet highlights on the upper edges.
   - Drips fall off the ledges under the seeds' gravity.

**Rounds (visual 7.5, 8.5, 9; motion: another round, another round, nothing)**
- **Visual 1.**
  - The glitter and current lines looked ruled on. They became short flecks and tapered, broken spindles.
  - The weathering was invisible at site size. Plate tone, a foot band, fading seams and quieter rivets fixed it.
  - The tree lost presence. The lower trunk is dark again and the mist is cut.
  - The backlit gaps looked like cut paper.
  - The middle air was flat. Curtains and far mist were added.
  - The near rock was ruler-edged. Its edges are now stepped, with wet edges and glints.
  - The fronds were flat, the pods read as UI dots, the rings formed a pattern, and the moss was bands.
  - The rain blaze hid the vat seeds, and the window smear read as a cone.
- **Visual 2.** The dashed ledge sheen read as a guideline and became a noise-masked sheen. The sky gaps beside the boughs still looked like cut paper; the fixes were knotted boughs, a feathered shadow and the strike moved into the crown.
- **Motion 1.**
  - 195 animations broke the 24 s clock (glitter, splashes, drips, seed rings).
  - The glitter left an empty strip at the outfall, and thinned at its crossfade (fixed with equal-power weights and a k4 correction).
  - Drips fell at inconsistent gravity, seed rings popped in, and one filter was unused.
- **Motion 2.** The streaks moved at half the water's speed. The frond drips swung with their frond and fell four times too fast (now released at rest and falling outside the frond). The half-ring strokes depended on display size (they now animate `d`).
- **A rendering note.** A user-space mask on the island reflection blanked it in Chrome. An objectBoundingBox mask on an outer group works. Filters on a group with a negative scale also misbehaved, so the flip goes inside the filtered group.

**The gate: one cold check (5)**

Taken (identity):
- **The World Tree read as a tornado funnel and vanished on a phone.**
  - Pale air is now held behind the crown at all times, so the boughs branch against it.
  - Buttress roots at the foot, and a canopy a shade greener than the cloud.
  - Foliage clumps hang into the gaps between the upper boughs, so the back-flash shows through leaves rather than windows.
  - Lifting the whole trunk toward the air, as the check suggested, lost the tree entirely in a render. The trunk stays dark at its base.
- **The shelf read as a lawn.** The fix is relief-lit wet rock (lighting filters): the tint is cut, the dome darkens toward its edges and the rim is feathered. The splash crowns, which read as grass tufts, became ring bursts.
- **The surge read as neon tubes and a searchlight.** The seams now blaze in broken, uneven pieces, the cloud glow is lit lobe undersides, and the vat seeds stay visible against the flare.
- **The chute read as a striped barrier pole.** It is now a trough with a dark interior, a riveted near wall, one fluid sheet and moving soft highlights.
- **The wakes read as sticks.** They are now curved, broken foam arcs.
- **Far growth was lit by nothing.** It greys with distance. The near fronds are near-black, with a cool wet edge and more defocus.
- **Smaller misreads:**
  - The split-plate leak read as an orb lamp. It now spills down the plate.
  - The relief valve read as a floating glyph. It is now a wheel on a stem.
  - The strike rim read as a cartoon outline. It now lights only the upward edges, as tapered slivers.
  - The floating seeds read as fireflies or lollipops. The halo is smaller and the under-glint round.
  - The canopy pods now hang in clusters, and the opened husk shows a pale inside.
- **The horizon** was a hard line. It now dissolves into the rain.

Textures: in the same round, the water ripples, the shelf and near rock, the storm ceiling's underside and the machine's plates became lit height fields (feSpecularLighting and feDiffuseLighting on fractal noise). These are the first step of the photographic stage Nick asked for. They sit in static layers, so they paint once.

## Textures, stage one (2026-09-23, after PR #617)

Nick: "then we can work on making it more photographic with textures". This PR is that stage's first round, built on the lit height fields that #617 introduced.
- **The machine in relief.** The machine group's own luminance, blurred, serves as a height field lit by a specular sky light, so every plate, band, pipe, flange, rivet and the tank takes wet light on its upper edges. The reviewer: "the most photographic the machine has looked".
- **The canopy in relief.** Leaf-mass noise is combined with the canopy's luminance and diffuse-lit from above.
  - The first tuning (fine grain, a pale light, lit all over) turned the World Tree into a dead oak in front of a lichen cliff.
  - The fix: noise about 3× larger, green light at a low angle, only the tops lit, the canopy kept darker than the air, and foliage clumps closing over the outer 45% of each great bough.
- **The paper and brush-stroke overlays are cut** (.18 to .07 and .45 to .22): painted texture works against photographic.
- **Tried and cut.** Out-of-focus drops in front of the lens read as soap bubbles, and they strobed at 30 units per frame.

**The gate: one cold identity check (6)**

Taken:
- The strike behind the crown tore pale holes in it. Its peak is now .7.
- The chute still read as a rod. It is wider, the far wall's inner face shows, and the fluid runs low in the trough.
- The surge seams read as LED strips, the split-plate glow as a pill lamp and the gate as a ball lamp. The seams are now thin broken leaks, the glow a faint wash, and the gate a smaller burst.
- The sprouts read as lime clip-art icons. They are now a dark living green.

Performance: the near fronds' layer-wide blur re-ran every frame as they swayed (a variant without it measured about 57 fps against 35). It is replaced by a baked soft edge on each blade.

Logged, not taken, as accepted decisions or taste:
- The canopy's value and hue against the cloud. The resumed reviewer accepted it after two tunings, and this is the fifth cold check to re-judge the tree's look.
- The birth seed's shape and its split husk. Nick has seen and liked the birth since the industrial rework.
- The near fronds as reeds.
- The drifting seeds as fireflies. Nick accepted the acorn seeds, which now carry under-glints.

## Nick's notes on the live page (2026-09-23, after PR #619)

- **The birth on the shelf is cut.** Nick: the heavy seed that lands on the rock "doesn't look good". The surge still flushes seeds down the chute, and the seeds no longer steer around a newborn.
- **A storm on open water.** Nick: "a relatively calm storm for being on the open ocean". Out in the distance there are now:
  - dark swell faces with crests breaking white;
  - whitecaps that break, throw spray and ride the current;
  - spindrift along the horizon.

  The water near the machine and the tree stays calm, as he asked. The field feathers out toward the island rather than stopping at a line.
- **No mountains.** The cloud base read as a mountain skyline because the lobes' lit bottoms made pale peaks. The lobes now hang darker than the air under them.
- **The generator's roof.** The cone hopper and the tube looked out of place. They became a pressure tank with dished ends, a manway and saddles, plus a breather stack with a gooseneck.
- **Young trees on the island** stand clear of the scrub, with their own trunks and leaning crowns.
- **The near frond plant** now also grows, smaller, on four slabs where the first growth is.
- **The text card** covers the bottom fifth of the left three fifths of the plate on desktop, and most of the bottom quarter on a phone. It is the home page's layout. The newborn's swim from the shelf ran under it on desktop; with the birth cut, nothing in the story plays under the card.

**Rounds.** The visual reviewer scored 8.5: the storm came too close to the outfall and ended at a hard edge. The motion reviewer found the whitecaps drifting slower than the current, and a catch that washed upstream.
