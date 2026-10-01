# Home story figures: scoreboard

The running record of every grading round for the home story's figures (`home-story-figures.md`), kept by the `story-figure-polish` skill. Rewrite the standing state at the top each round; append the round below it. Resume at the top open item.

## Standing state (2026-09-30, shipped)

Nick, 2026-09-30, after seeing the grounded build: "i think this looks good ... lets see how all your changes look on the live site now." Both figures shipped from `figure/outbreak` on his word, with the gate's remaining lines waived by it:
- **Generators (beats 2 and 3):** Glance, Lore, Setting, Motion, Changes, Phone at 8.5; Subject 8 and Finish 8 (a machine drawn in code in front of painted worlds, seen from a different angle). Blind readers pass 02 and 03.
- **Outbreak (beats 5 and 6):** seven of eight lines at 8.5; Glance 8, held only by 06's glance-line wording (every recent reader says "a chip powers a dead machine and something grows in it"; none names the red held back).
- **Open for later:** the machine's viewpoint against the paintings (painted machine, or a top-down redraw); the sea world's ground; the ice drifts; 02's seeds at page size; 06's glance line wording.
- Artifacts: Generators https://claude.ai/artifact/W2wa7nxc58qfZSZJSxjzuf, outbreak https://claude.ai/artifact/Dh4QVoJUmCLT2MEXPr6myw.

## Open findings, Generators (from round 0b, superseded by round 1)

1. The machine still reads as clean vector art: add edge wear (broken 1 px lighter dashes along panel edges, about 0.2 alpha), streaks below rivets (a multiply stain, about 0.1), a tone difference of plus or minus 5 percent between panels.
2. The worlds are sketches beside the plates: storm too dim, lightning never caught in a frame, lava seams now thicker but still graphic, sea bands flat.
3. The lattice still reads partly as a globe at page size (Nick picked the sphere image; the fix is in how it is drawn, not its shape).
4. In 03, the world patches read as snow globes; the edges were feathered in #751, not regraded.
5. 03 had dead time before its neighbors appeared; moved earlier in #751, not regraded.
6. Dropped as against a ruling: links between Generators (ruling 12), a non-spherical lattice (Nick's pick).

## Rounds

### Round 0a (2026-09-29, before PR #751)

Critic (Opus): machine 5, worlds 4, seeds and vat 4, 02 glance 4, APEX arrival 5, APEX as a signal 4, changes 6, phone 3. Top findings: the vat was one world late and the seed shapes did not read; APEX read as a physical globe; no drama in the arrival; hard rectangle edges; flat machine. All acted on.

### Round 0b (2026-09-29, before PR #751)

Critic (Opus): machine 6.5, worlds 6, seeds and vat 6, 02 glance 6, APEX arrival 6.5, APEX as a signal 5.5, changes 6.5, phone 6. Acted on: an oval mask over the whole figure (Nick approved it afterward), shorter world crossings, the vat changing as the new world comes in, seeds morphing through a round, new winged and bell shapes (the bell's trailing threads read as a jellyfish, too close to creature art, and were dropped), lava seams, storm rain and lightning, finer snow, a clean lattice over its torn copy, poles breaking up, a roll every 2 s, earlier neighbors, feathered patches. Not acted on: the list above.

Fact-check (Sonnet), on the labels and descriptions: 3 supported, 5 paraphrase, 7 unsupported, 2 contradicted, 7 depiction. Fixed before shipping: "each world had its own Generator", "every Generator", links between Generators, "stops reading its world" stated as fact, "five Generators" as a count.

Blind reader: not yet run. Round 1 runs it first.

### Round 1 (2026-09-29)

**Generators.** Builder (Sonnet): the machine's static art cached once (rounded shoulders, bands, straps, tower, pipes, rust streaks, edge wear), world rim light and vat spill; seeds redrawn as cells; three cached depth layers per world, lightning on the world's clock; a static painted texture; low patches in 03; the lattice as a signal (node brightness, sweeping bands, dropouts, stronger tears). Draw time in headed Chrome: 03 at 3.8 ms script, 77 fps drawing every frame.
Critic (Opus): Glance 6.5, Lore 8, Subject 6.5, Setting 6, Motion 6.5, Changes 6.5 (the page sheets were stale: a leftover dev server from the old worktree held port 3012; carried from 0b), Finish 6.5, Phone 6.5. Top findings: the seeds' shape change reads only through color; machine wear still too slight; the sphere still reads as a ball; the world keeps cycling through the power dip; lava seams, sea and ice; the ice patch a white disc.
Blind reader (Opus, fresh): 02 "holds a few small curled shapes that seem to change to match the setting" (medium; the shapes too small to identify); 03 "dashed lines run from it down to every machine, and all five windows turn the same purple, as if it has taken them over" (high). 03 passes; 02 does not yet.

**Outbreak.** Builder (Sonnet): a tilted spiral galaxy of about 150 warm worlds; crimson haze from several places at once; Valleron (unnamed, mid-disk) gathering motes; in 06 a 2.5x close-in, a chip forming, a cleared ring, glints to three worlds that relight green. Draw time in headed Chrome: 0.7 ms script, 230 fps.
Critic (Opus): Glance 6.5, Lore 7.5, Subject 5, Setting 6.5, Motion 6.5, Changes 7.5, Finish 6, Phone 7. Top findings: the token reads as a flat microchip icon; Valleron vanishes under it; the zoomed field turns to mush; the held-back ring reads as a smudge; relit worlds read as green orbs; burned worlds stay bright red; a ghost of the galaxy shows in the arena screen on the way out. Dropped: seeding the haze from the arriving point (against the fact-checked plan: no single origin).
Blind reader (Opus, fresh): 05 "a spiral galaxy ... gradually covered by red patches ... most of the stars fade, and one bright point is left" (high; "a sickness or blight"); 06 "a dark hexagonal chip ... three green glowing dots appear ... unsure whether the chip is making the green dots"; "nothing obviously links the chip to the galaxy". 05 passes; 06 fails.

### Round 2 (2026-09-29)

**Generators.** Builder: five larger seeds with distinct outlines per world; panel tone, streaks, grime and a bevel; the sphere feathered and torn; the world frozen through the power dip; lava cracks and plumes, a sea glint, lit and shadowed ice faces; horizon strips for the patches.
Critic: Glance 6.5, Lore 8.5, Subject 7, Setting 6, Motion 7, Changes 7, Finish 7, Phone 6.5. Landed: distinct outlines, panel tone, the freeze, the sphere no longer a solid orb. Regressed: the seeds read as objects again (hex nuts, throwing stars, rocks); the sphere is now too faint. Not visible at display size: streaks, edge wear, grime. The sea glint reads as a light leak; lava reads as dusk; the ice patch became paper tents.
Blind reader (fresh): 02 "the small shapes inside the window change to match ... it could be growing something or just holding it" (medium); 03 "a glitchy purple sphere ... dotted lines run from the sphere down to every machine, and all five turn the same violet" (high). 03 passes; 02 half.
Stop rule: Setting 6, 6, 6 over rounds 0b, 1 and 2. Changed approach for round 3 (painted worlds), to be shown to Nick.

**Outbreak.** Builder: the token as smoked glass in a stepped, lit bevel, tilted to the galaxy, forming out of Valleron's light; Valleron kept beside it; a sharper zoomed field; a clearing ring; relit worlds warm first with a green core; embers that go dark, four outer worlds kept lit; the field fading before the point leaves.
Critic: Glance 7, Lore 8, Subject 6, Setting 7, Motion 7, Changes 8, Finish 6.5, Phone 7. The clearing now reads as a black pit (the critic's own round 1 spec); the token still small and an icon; relit worlds too slight; the late spiral goes flat under the haze.
Blind reader (fresh): 05 "a gold spiral galaxy fills with a spreading red haze, and its bright star points go dark one after another until only one bright point is left" (high); 06 "a dark round disc with a thin red rim; a small white hexagonal object floats above it ... I couldn't tell whether the dark disc is a hole, a planet seen edge-on or a platform". 05 passes; 06 fails.

### Round 3 (2026-09-29)

**Generators.** Builder: the passing worlds paint from the site's landscapes of Zolton, Magmuth, Krystos and Poseidas (unnamed), graded down and drifting, with the drawn worlds as the fallback; seeds as cells with a breath and a halo, forming from a bright point at each change; the sphere's presence restored; visible wear. Headed Chrome: 03 at 2.8 ms script, 118 fps drawing every frame.
Critic: Glance 7, Lore 8, Subject 7, Setting 8, Motion 7, Changes 7, Finish 6.5, Phone 7. The machine looks pasted onto the paintings: no ground, mismatched light, razor edges, weather stopping at its outline. The sphere overshot into a solid ball on the phone. Ruins in the storm and ice paintings imply an earlier civilization. Stuck on a design decision (Subject, Finish): paint the machine, or accept about 7.5.
Blind reader (fresh): 02 "one large tank-like machine ... stays in place while the world around it changes ... I don't know what the machine does, it could be making those things or just holding them" (medium); 03 passes (high).

**Outbreak.** Builder: a warm clearing that reveals living galaxy; a larger worn token with a glowing core hanging over Valleron; relit worlds with a warm core and green center; lanes kept between the arms; Valleron's look carried from 05 into 06.
Critic: Glance 7.5, Lore 8.5, Subject 6, Setting 7.5, Motion 7.5, Changes 8, Finish 6.5, Phone 7.5. Subject stuck on a design decision: a chip at galactic scale has nothing to give it weight. Options: (a) a still life in front of the galaxy, (b) a hexagon of light with the anchor waived. Taken: (a).
Blind reader (fresh): 05 passes (high); 06 "a dark hexagonal tile ... floats above a glowing spot ... small points of light start moving outward from it ... I can't tell what they are". Fails.

### Round 4 (2026-09-29)

**Generators.** Builder: the machine composited into each painting (tint and key light from the world, light wrap, darker darks, orange underlight on lava), the pad on painted ground, weather crossing in front, paintings blurred and hazed back, ruins painted out, the lattice as lines only, seeds without eye-like centers, a feed of motes rising in the vat. Headed Chrome: 03 at 3.5 ms script, 76 fps.
Critic: Glance 7, Lore 8, Subject 7, Setting 7.5, Motion 7, Changes 7, Finish 7, Phone 7. Sea and lava sit in their paintings; storm washed out, ice lost to fog, lava's light lingering into ice. Ceiling on this path about 7.5 to 8 for Subject and Finish; recommends painting the machine.
Blind reader (fresh): 02 "one tall machine stays still while the world behind it changes ... the glass and blobs change color with each world ... they could be eggs, embryos or seeds" (medium); 03 passes (high).

**Outbreak.** Builder: option (a), the token as a large foreground still life in front of a blurred galaxy.
Critic: Glance 7, Lore 8, Subject 6.5, Setting 7.5, Motion 7, Changes 8, Finish 6.5, Phone 7.5. Option (a) failed (Subject up half a point, Glance and Lore down); recommends option (b).
Blind reader (fresh): 06 "a tilted hexagonal frame, like a lens or a porthole ... I can't tell what the hexagon is". Fails.

### Round 5, outbreak (2026-09-29)

Builder: option (b), the token as a hexagon of light lying on Valleron; the clearing and five glints leave from it. Headed Chrome: 0.7 ms script, 213 fps.
Critic: Glance 7, Lore 8.5, Subject 5.5 as light (4 against the unchanged anchor), Setting 7.5, Motion 7, Changes 8, Finish 6.5, Phone 7.5. Built as a hard stroke it reads as a selection box; as layered light it could reach about 8.5 as light, never against the anchor.
Blind reader (fresh): 06 "a white hexagon outline sits around the galaxy's glowing gold center ... It could be a shield, a building, a marker or a selection box". Fails for the fifth round. Stop rule: taken to Nick with three options.

### Round 5, Generators (2026-09-29)

Builder: the composited machine shaded as a cylinder and tinted by multiply on every part, lighting cross-fading with the world, storm seeds as lenses, four larger seeds, a brighter feed and a flash where each seed forms. Headed Chrome: 03 at 4.1 ms script, 61 fps.
Critic: Glance 7.5, Lore 8, Subject 7.5, Setting 7.5, Motion 7.5, Changes 7, Finish 7.5, Phone 7. This path's ceiling now about 8 on Subject and Finish; one more round of small fixes, then only painting the machine reaches 8.5. Changes untouched since round 1.
Blind reader (fresh): 02 "the things floating in the tank change with the setting ... I can't tell what the things in the tanks are: embryos, seeds, creatures or specimens" (medium); 03 "as if it is taking all of them over" (high). 03 passes; 02 half, the fifth round.

### Round 6, outbreak (2026-09-29)

Builder: 06 redesigned at a Generator's scale (my recommendation, applied while Nick rules): the view dives from the galaxy to one dark world where a dormant Generator stands in red haze; a token streaks in from Valleron's direction and seats below the vat; the vat fills with Genesis green and seeds form; the haze thins around it.
Critic: Glance 8, Lore 7.5, Subject 5.5, Setting 6, Motion 7.5, Changes 7, Finish 5.5, Phone 6.5. The first 06 design that can reach the bar on Glance, on one condition: the machine must be the 02/03 Generator drawn dormant, not a second machine (as built it is the rubric's 5 anchor). Risks: the green departure point reads as something leaving the Generator (ruling 4); the token arrives as beamed light (the fact-check says carried). "Holds back" still weak; the place needs building.
Blind reader (fresh): 05 passes (medium: "things dying out"); 06 "a streak of light shoots in from the left into a faint, tall machine standing in red fog. The machine lights up, and its oval glass chamber fills with green from the bottom until it glows fully green, with small shapes floating inside" (medium-high). Close to a pass; the red drawing back is not mentioned.
Next: merge the Generators branch into the outbreak branch and draw both beats' machines from one shared module, so the outbreak's machine follows whatever Nick rules for the Generators.

### Round 6, Generators (2026-09-29)

Builder: the bloom into 02 from the vat outward; links flowing inward on the pull-back out of 03; the compact sphere thinned; ice re-cropped; the seed flash capped; the outer machines lit; the lattice redrawn at 12 a second (03 at 3.6 ms script, 73 fps).
Critic: Glance 7.5, Lore 8.5, Subject 7.5, Setting 8, Motion 7.5, Changes 7.5, Finish 7.5, Phone 7.5. The storm housing measures about 2.3 times the painting beside it on the composited frame; the machine now serves two beats and reads, dormant, as a box with a hole; the 04 screen tunes in on gray static, so no violet carries into the war.
Blind reader (fresh): 02 "each time, the window's color and the shapes inside change to match that place ... the machine read as some kind of incubator" (medium); 03 "it clearly reads as something taking control of all the machines" (high).
After this round the two branches were merged (figure/outbreak carries both figures), the machine moves to a shared module for 06, and the viewer carries a figure's light into the next screen's first static (the violet into 04).

### Round 7 (2026-09-29), both figures on one branch

Builder: the Generator moved to a shared module (`pieces/generatorMachine.ts`, verified byte-identical before any change); 06 draws it dormant with a socket; a warm-white departure; the token carried as a falling chip; a dome; ridges, sky, a red sun, a light pool; the dive through a planet limb. Generators: raised vat straps, dark unlit glass, a larger sensor ring on a thicker mast, ice re-cropped, the far machines folding into the point. Viewer (mine): a figure's light tints the next screen's first static, now run through search and lock (verified by pausing at 930 ms: the static reads RGB 139, 130, 160 against a neutral 139, 141, 141). Headed Chrome: 03 at 2.7 ms script, 119 fps; 06 at 0.6 ms, 222 fps.
Outbreak critic: Glance 8, Lore 8.5, Subject 7, Setting 7.5, Motion 7.5, Changes 8, Finish 7, Phone 7. The design can reach the bar; "holds back" is not visible and the chip too small to read as the cause.
Generators critic: Glance 7.5, Lore 8.5, Subject 7.5, Setting 8, Motion 7.5, Changes 7.5, Finish 7.5, Phone 7.5. The compositing path is at its ceiling; the storm housing still about 2 times the painting.
Blind readers (fresh): 06 "an old industrial machine stands alone on a dark red plain and switches on ... the window fills with glowing green" (medium-high; no chip, no red drawn back); 05 passes; 02 "seeds or embryos, but I can't tell whether they're growing or just floating"; 03 passes.
Section 5 edited: the later model drops the lattice tower (its sensor ring on a mast is the mark), as the section already said; the builds had kept both.

### Round 8 (2026-09-29)

Builder: 06 wisps then a dome with a crimson curl, relit ground and a violet-blue sky (ground beside the machine R minus mean(G,B) from +40 to +15); a 64-unit chip turning face-on into an intake console, a flash, light up two channels; the shared machine lit rather than outlined, rust and a dent, the lattice tower dropped (section 5); a lower sun, foreground rocks; 02 seeds larger, forming over 1.6 s with converging motes; storm housing 1.45 times the painting on an ordinary frame. Headed Chrome: 03 at 3.8 ms, 06 at 0.6 ms.
Outbreak critic: Glance 8, Lore 8.5, Subject 7.5, Setting 8, Motion 7.5, Changes 8, Finish 7.5, Phone 7. Remaining work is finish, not design: the chip is still the darkest thing on screen; the dome's edge lands on the oval's fade and reads as a vignette.
Generators critic: Glance 8 (03 at 8.5), Lore 8.5, Subject 7.5, Setting 8, Motion 7.5, Changes 8 (the violet carry verified), Finish 7.5, Phone 7.5. Storm fins read as flat cards; lightning lifts the machine and not the world. Subject and Finish still at the compositing ceiling pending Nick.
Blind readers (fresh): 02 "a pod or incubator that makes something to suit each world. That it's making something is a guess" (medium): the idea, hedged; 03 passes (high); 05 passes; 06 "something dark and six-sided appears on the ground in front of it, then the machine switches on and fills with glowing green liquid" (medium): the chip as the cause, the red not mentioned.

### Round 9 (2026-09-29)

Builder: the chip lit (about 2.6 times its surroundings at 1@5), a ground conduit, the flash at 3.2 s; the dome kept inside the oval; the compact machine larger; storm fins as crescents; lightning lifting the world and only the machine's lit edge; old seeds dissolving into motes, new ones growing in place; contact shadows and a softened edge.
Generators critic: Glance 8, Lore 8.5 (clears), Subject 8, Setting 8.5 (clears), Motion 8 (the strips show a real lead and follow), Changes 8, Finish 8, Phone 7.5. Subject and Finish at this path's ceiling (8); 8.5 needs a painted machine or Nick's waiver.
Outbreak critic: Glance 8.5 (pending the reader), Lore 8.5 (clears), Subject 7.5, Setting 8, Motion 8, Changes 8, Finish 7.5, Phone 7.5.
Blind readers (fresh): 02 "the tanks glow a matching color and hold something small growing inside" (medium): the best 02 read yet; 03 passes (one tank still orange at 6 s: a bug); 05 passes; 06 "its tall glass window lights up green, a small lamp in front of it comes on ... things growing in a tank" (medium): the red pulled back not seen, so Glance stays at 8 until a reader sees it.

### Round 10 (2026-09-29)

Builder: a pulse down the mast into the gel where each seed grows, a readout tick; FIRST moved to 2.7 s; the painting cross-fade over the full 0.5 s; glitch states held 0.4 s; the 03 machine that stayed orange fixed; in 06 a stronger red before and after, the chip falling face-on from Valleron's star, the dormant machine lit on its sun side.
Generators critic: Glance 7.5, Lore 8.5 (clears), Subject 8, Setting 8.5 (clears), Motion 7.5, Changes 8, Finish 7.5, Phone 7.5. Regressed: forming now fills about 2 s of each 2.7 s world, as a white bloom, so no formed seed shows.
Outbreak critic: Glance 8, Lore 8, Subject 7.5, Setting 8, Motion 8, Changes 8, Finish 7, Phone 7. Regressed: the red as a flat tint makes the dormant machine a see-through ghost and puts pink inside the vat (the plague inside the Generator, against the lore).
Blind readers (fresh): 02 "the glow inside changes each time ... with sparks or bubbles rising" (no seeds seen); 06 "the machine switches on and starts growing something ... the small glowing hexagon at the machine's base: a key, a battery or an input?" (medium-high; the red held back never mentioned); 03 and 05 pass.
Round 11 subtracts: formed seeds own each world, dark against the glow; an opaque machine; a clean green vat; one line from chip to vat.

### Round 11 (2026-09-29)

Builder: 02's world budgeted so formed seeds own it (ring, dissolve, a pulse down the mast, seeds growing dark, a 1.2 s hold); no white clipping; in 06 an opaque machine with light wisps only, a clean green vat, a lit line from the chip into the vat, a faint guide from Valleron's star, rocks dropped.
Generators critic: Glance 8, Lore 8.5 (clears), Subject 8, Setting 8.5 (clears), Motion 8, Changes 8, Finish 8, Phone 8. Remaining: the gel cross-fades through gray; seeds frozen in the hold; straps crossing seeds; the lattice still busy. Subject and Finish at the compositing ceiling (8) pending Nick.
Outbreak critic: Glance 8, Lore 8 (the guide from the star stays drawn after landing, a beam, against the fact-check), Subject 8, Setting 8, Motion 8.5 (clears), Changes 8, Finish 7.5, Phone 8.
Blind readers (fresh): 02 "the liquid in the capsule changes color, and so do the shapes floating in it ... they look like creatures or embryos" (medium); 06 "a glowing crystal at its base powers on, the capsule fills with green light, and dark rounded shapes like embryos or pods appear in it ... the red haze behind it grows brighter" (the red read as growing); 03 and 05 pass.

### Round 12 (2026-09-29)

Builder: 02's gel dims in the old color and relights in the new from the pulse (no gray); seeds breathe, drift and pulse; three seeds, one per bay; the lattice at 2 Hz; the vat rim lit from inside with a dark lip; in 06 no beam, and the red's retreat as its own beat behind a front from the chip.
Generators critic: Glance 8.5 (clears), Lore 8.5, Setting 8.5, Motion 8.5, Phone 8.5 (all clear), Changes 8, Subject 8, Finish 8. Subject and Finish: the fourth time raised as a design decision for Nick (paint the machine, or waive in words).
Outbreak critic: Lore 8.5, Motion 8.5 (clear), Glance 8, Subject 8, Changes 8, Setting 7.5, Finish 7.5, Phone 7.5. The cleared ground is darker than the red outside it, a black platter, so the red looks brighter.
Blind readers (fresh): 02 "as if the machine is producing something different for each place" (medium): passes; 03 passes (high); 05 passes; 06 "a glowing hexagonal chip or token is set into the base of a tall machine ... the tank fills with glowing green liquid ... something is clearly being made or grown in the tank ... warm light spreads over the ground" (medium to high): passes on the chip and the life; the red's retreat still not named.
Viewer (mine): the arrival tint held longer (0.76 s, 0.34 falling to 0.26 before it fades) so the violet carry into 04 shows in page frames.

### Fact-check of the four figure beats' texts (2026-09-29, Sonnet, twice)

First pass flagged: "A Generator, world after world" and "the machine reads each one" (one machine moving between worlds); "keeps APEX's time" (unsupported); the plague "from several places at once" and Valleron's haze thinning (unsupported); a dormant Generator, a chip from a star, and the haze drawing back (read as a cure). All rewritten. Two judgments held and confirmed on the second pass: the storm world stays (Zolton 9: "the Zolton Generator"); the red keeping back only from the new life, with the red remaining beyond, is a depiction of TOKENS ("avert the killing gaze"), not a cure. Second pass fixes applied: "built for the world it stood on" became "made Xalians suited to the world it stood on" (Telypso's and Endessa's Generators were brought in); the 06 description limits the haze's retreat to the new life. Everything now SUPPORTED, PARAPHRASE or DEPICTION.

### Round 13 (2026-09-29)

Builder: warm lit ground in 06, clipped at the horizon, the red outside dimmed; the lattice's tears held at 2 Hz; scalloped sea seeds; a brighter pulse with a ring flash. Viewer (mine): the violet carry into 04 now visible in page frames (RGB 120, 114, 119 at 950 ms).
Generators critic: Glance 8.5, Lore 8.5, Setting 8.5, Motion 8.5, Changes 8.5, Phone 8.5 (six clear); Subject 8, Finish 8 (the ceiling; Nick's decision).
Outbreak critic: Lore 8.5, Motion 8.5 (clear); Glance 8, Subject 8, Changes 8, Phone 8; Setting 7.5, Finish 7.5 (the lit ground reads as a mesa; the ripple is a stroked line). Recommends Nick accept "a chip powers the machine, life grows, warm light spreads" as meeting 06's glance line.
Blind readers (fresh): 02 "the window color and the shapes inside change to match each place" (medium); 03 passes (high); 05 passes (high); 06 "a glowing hexagonal object sits at its base ... it seems to power the machine, since a beam runs up from it ... the tank fills with glowing green liquid, then dark blob shapes appear" (high on the machine starting up).

### Round 14 (2026-09-29)

Builder: 06's lit ground built from feathered lobes fading into the distant red, no horizon clip; the ripple as a soft warm band pushing the red wisps ahead; sea seeds with clipped scallops; the lattice's tear counter tied to the arrival. Generators not regraded (the changes were small and its open lines wait on Nick).
Outbreak critic: Lore, Motion, Setting clear (8.5); Glance 8 (Nick's ruling), Subject 8, Changes 8, Finish 8, Phone 8. Remaining: a wear pass, the ripple's thin core line, the dive's world as a black disc, the chip small on the phone.
Blind reader (fresh): 05 passes (medium-high); 06 "a small hexagonal object at its base glows and sends a beam up into it. The dark window fills with glowing green liquid, and three dark shapes appear inside, like something being grown" (medium).

### Round 15 (2026-09-29)

Builder: a wear pass on the shared machine; the ripple as a wide soft band; the dive into a dark world with a crimson limb and embers, the limb becoming the ground line; the chip 1.3x on phones.
Outbreak critic: Lore, Subject, Setting, Motion, Changes, Phone clear (8.5); Glance 8 (waiting on Nick's ruling on the glance line); Finish 8 (three local marks left: the ring's thin strokes, the flat intake box, stamped seeds).
Generators critic: unchanged, six clear; Subject 8 and Finish 8. The wear pass does not show at display size (mean pixel difference against round 13 under 0.1 levels); no further round on this path moves either line. Only Nick's decision (paint the machine, or waive in words) remains. (The outbreak critic scores the same machine's Subject 8.5 in 06, where it stands dormant in a drawn scene rather than in front of a painting.)
Blind readers (fresh): 02 "the shapes inside the windows change each time, from smooth ovals to lumpy blobs to spiky stars" (medium); 03 passes (high); 05 passes; 06 "a small hexagonal object glows at its base, then the window fills with glowing green liquid and a few rounded shapes appear inside, like something being grown or hatched" (medium-high).

### Round 16 (2026-09-29)

Builder: in 06 a soft ring halo in place of the ring's strokes (a `ringHalo` parameter, so 02 and 03 are unchanged), the intake lit from the chip, three seeds varied in size, tilt and darkness (`seedVary`); in 03 the lattice's bright band slowed to a 6 s sweep. Headed Chrome: 03 at 3.9 ms, 06 at 0.9 ms, 158 fps.
Outbreak critic: seven of eight clear (Lore, Subject, Setting, Motion, Changes, Finish, Phone at 8.5); Glance 8, held only by the pending ruling on its wording. Section 7 rewritten to the built 06; section 8's 06 line proposed ("a small bright object brings a dead machine back to life and something grows in it"), pending Nick.
Blind reader (fresh): 05 passes (medium-high); 06 "a boxy machine on a red, hazy plain powers up. Light at its base rises into the arched window, which fills with bubbling green liquid, and then several dark oval shapes form inside, as if something is being grown" (high): meets the proposed line.
Mechanical checks: `snap-story.cjs` wide, laptop, phone, small, reduced and landscape: every beat ok, no overflow, no console errors, figures still under reduced motion. `vitest` on src/pages and src/__tests__: 922 passed. `tsc` clean.

### Grounding (2026-09-30, Nick: "design the generator in a way that it's not just seemingly floating midair")

Passes 1 to 4 (Sonnet): the thin pad became a heavy foundation (a slab on a solid lower course buried in the ground, buttresses, cables into the ground) in each world's stone; each painting scaled 1.3x so its own foreground runs under the machine; the machine raised and scaled to 0.86x; snow drifts on ice, a dark wet foot on the sea's rock; the same foundation in 03 and 06.
Round 17 critics: Generators Glance 8, Lore 8.5, Subject 8, Setting 8, Motion 8.5, Changes 8.5, Finish 8, Phone 8 (the ring pushed into the top fade; sea standing on foam that reads as cloud; the foundation reads as a riveted metal box, the cables as stilts). Outbreak Glance 8, Subject 8 (cables as stilts, the intake lost in the haze before the chip lands), the rest held at 8.5.
Blind reader (fresh): "It stands on a wide, flat metal slab, like a plinth with rails along it. In the snow frame, snow piled against the slab makes it look planted. In the storm and volcano frames the ground under the slab fades to black, so it looks set on a stage in front of the landscape."
Stage change (mine): the oval fade is now one cached mask with no seam, and a figure that stands on ground holds the oval's lower half solid longer (`groundHold`: 0.76 Generators, 0.72 outbreak), so the ground recedes into the dark instead of ending under the machine. Pass 5 building: headroom, stone not metal, cables lying on the face, sea and storm ground, lava underlight, drifts, 06's intake.

### Round 18 (2026-09-30, grounding pass 5)

Builder: the machine lowered so its ring clears the top; the foundation 30 percent shorter, as buried stone with course joints; two dark sagging cables; sea re-cropped (horizon back), storm on its ledge with a wet sheen, lava underlight and crust, shaded drifts; in 06 the intake lit while dormant, haze capped in front of it and the slab, a contact shadow and lit lip at the foot.
Generators critic: Glance 8.5, Lore 8.5, Setting 8.5, Motion 8.5, Changes 8.5, Phone 8.5 (six clear again); Subject 8, Finish 8. Stands on ground in ice, lava and storm; sea partly (foam as dashes, no clear rock under the slab).
Outbreak critic: seven of eight clear again (Subject back to 8.5); Glance 8 waits on Nick. "The machine no longer floats, which answers Nick."
Blind reader (fresh): "on a flat, stepped metal plinth resting on the ground. In the ice frame it looks fairly solid, because snow is piled against the base. In the storm and lava frames it looks slightly pasted on: there is no shadow or contact darkening under the plinth, and a thin bright edge along the base makes it look like a cutout." Pass 6 building: contact darkening, sea rock and foam, heavier cables, varied rubble, a stone top face.

### Grounding pass 6 (2026-09-30)

Builder: contact darkening at the foundation's foot in every world and 06, no light edge; a wet dark rock under the foundation at sea with soft foam; heavy dark cables sagging into the ground outside the slab; rubble varied and broken up; drifts feathered into the snowfield, one riding up the face; a chiselled stone top.
Blind reader (fresh), asked where the machine stands per frame: storm "looks pasted on, because nothing touches the base"; lava "looks the most pasted on: the ground is seen from above but the machine is seen from the front, and the base has only a faint glow and no shadow"; ice "the most grounded of the three, though the snow looks like a flat strip laid in front". 02 and 03 read as before (03 passes).
Diagnosis: the paintings look down on their landscapes from high up, while the drawn machine is a flat front elevation. No amount of detail at the foot reconciles the two viewpoints; it is the same gap that holds Subject and Finish at 8. Taken to Nick: give the drawn machine the paintings' high viewpoint (its tops seen from above, a shadow cast across the ground), or paint the machine at that viewpoint (the pending decision).

### The fade (2026-09-30)

Nick: the vignette had turned from fade-to-transparent to fade-to-black. A wash toward the page's color was tried and read as a gray patch (the page is textured, not flat), so it was removed. The oval now fades to transparent with an eased fall-off (the upper half holds to 0.5, the lower half to `groundHold`), so dark edges thin out into the page instead of leaving a band.

### Round 19 (2026-09-30, Nick: "do 2, 3, and 4": the paintings' viewpoint, the sea ground and ice drifts, 02's seeds at page size, and 06's glance line approved)

06's glance line is ratified (section 8): "a small bright object brings a dead machine back to life and something grows in it".
Builder: a roof plane and a left side face on the housing, tops on the neck and boxes, the vat window's depth, the sensor ring as an ellipse, the foundation rebuilt with a broad top face seen from above, a soft cast shadow, a wet rock shelf with foam at sea, banked drifts on ice, seeds about 20 percent larger and darker, set between the straps. Headless: 03 at 3.8 ms, 06 at 0.6 ms.
Generators critic: Glance, Lore, Motion, Changes, Phone 8.5; Subject 8, Setting 8, Finish 8. The lower half now shares the paintings' high view; the roof and side face are see-through, the cast shadow does not show, the sea shelf reads as a raft on cloud, the ice still has loose white bars, and 03 opens with the last world's gel. Seeds read at page size.
Outbreak critic: all eight lines 8.5 (Subject up from 8 on the new volume). Findings kept for round 20: 06's seeds crowd their panes (a traffic light), the lit chip pedestal is a pale box, the vat throws no light on the housing, the cables read as legs.
Blind readers (fresh): 02 "the glow color and the shapes in its windows change to match each world" (85%), 03 passes (90%); the machine still "pasted in front" in storm (75%), better in lava, most grounded in ice. 05 passes (85%); 06 "the small hexagonal chip ... glows and sends a vertical beam of light up into the base of the machine, and that is the frame where the window turns green. The chip triggers the activation" (75%): passes the approved line. The outbreak clears the gate this round.

### Rounds 20 to 22 (2026-09-30)

Round 20 builder: opaque roof and side faces, a left face on each cabinet, one cast shadow falling right and toward the viewer in every world, the sea shelf as irregular rock, the loose ice bars removed, cable ends as mounds, 03 snapping the gel to the current world inside the dip, seed fin strokes and facet lines; in 06 seeds at 0.7 of 02's size, the chip pedestal in foundation stone, a green glow and pool from the lit vat, cables sagging over the foundation top. Generators critic: Subject 8.5 (cleared: "one consistent view from above and to the left"), Setting 8, Finish 8, the rest 8.5. Outbreak: all eight 8.5; the housing glow too broad (a partial regression).
Round 21 builder: lava rubble and humps, the ice shadow softened and faded with distance, drifts white to blue-gray, storm holes removed, the sea as one noise-outlined mass; in 06 the glow narrowed to the window's surround. Generators: Setting 8 and Finish 8, the sea alone holding them. Outbreak: all eight 8.5, the housing back at its round 19 color within a few levels.
Round 22 builder: the painting's own sea redrawn in front of the rock below a jagged waterline, a lit rock face band with crags, crest strokes at the waterline; in 03 a soft water band. Viewer (mine): the beat leaving a morph fades in 240 ms, so two headings never overlap on a phone.
Generators critic: Glance, Lore, Subject, Setting, Motion, Changes, Phone 8.5 (seven clear); Finish 8. "No, not on this approach": the gap is a clean code-drawn machine in front of painted worlds, and polish has measured under 0.1 levels at display size. Stop rule reached on Finish; options to Nick: waive at 8, paint the machine (one painted still at the paintings' viewpoint, live layers on top), or a painterly texture pass in code (uncertain).
Blind readers (fresh): 02 "the world behind it changes ... and the window glow changes to match" (85%), 03 "APEX takes control of them" (85%): both pass. Grounding: lava and ice read as on the ground or close; storm still "pasted" for its sharpness against a soft painting. 05 and 06 pass (06: "the object being inserted or switched on starts the process").
Mechanical: tsc clean; vitest on src/pages and src/__tests__ 802 passed; snap-story wide, laptop, phone, small, reduced, landscape all ok, no overflow, no console errors.

### The outbreak reworked on Nick's direction (2026-10-01, rounds 24 to 30)

Nick's notes, in order: the token looked wrong ("I dont like the way the scrambler token looks"), the 05 to 06 change "needs work", then was "jumpy", then had "too many phases", the plague's spread was "too subtle", the "complete!" green ring "needs work", and finally "keep going until you dont have things that you say are still rough". Built in that order on `figure/token-talk`: the printed genome card slid into a slot; the two-motion dive (zoom into a darkened world, land through its surface); the burning galaxy; the dawn light in place of the ring, the whole machine waking.
Fact-check (Sonnet, round 24): the screen-reader texts were rewritten ("plague", not "blight"; a few distant lights hold; "chip"; the haze drifts over the new life without touching it). Two depictions were changed: the card's helix no longer snaps into order (the scramble is what averts the plague's gaze), and the red no longer rolls back into a protected zone (the new life's immunity is genome-level).
I found the branch had been cut before PR #775 reached main, so 06 had the old flat machine; main was merged in (round 28) and 06 now stands on the viewpoint machine. Beats 02 and 03 checked pixel-identical after every round.
Critic: round 24 Glance 8, Setting 8, Motion 8, Changes 8, Finish 8; round 25 five lines clear; round 26 seven clear (the 06 fade-back left a green point that read as the removed dot: fixed); round 28 six clear on the merged machine; round 29 all eight at 8.5.
Blind readers (fresh each round, frames retimed to the new timeline in round 25): 05 "a bright golden spiral galaxy ... turns red ... most of its lights go out", "as if something is snuffing out the light across the galaxy"; 06 "a small, flat rectangular card, like a memory card or game cartridge ... the chip going into the slot ... the machine starting to grow new creatures", "a machine being activated by the card" (80 to 85 percent). Both pass.
