# Home story figures: scoreboard

The running record of every grading round for the home story's figures (`home-story-figures.md`), kept by the `story-figure-polish` skill. Rewrite the standing state at the top each round; append the round below it. Resume at the top open item.

## Standing state (2026-09-29, after Generators round 4 and outbreak round 5)

Both figures are waiting on Nick for a design decision (the stop rule). Round artifacts: Generators https://claude.ai/artifact/W2wa7nxc58qfZSZJSxjzuf, outbreak https://claude.ai/artifact/Dh4QVoJUmCLT2MEXPr6myw.

- **Generators (beats 2 and 3):** round 4: Glance 7, Lore 8, Subject 7, Setting 7.5, Motion 7, Changes 7, Finish 7, Phone 7. The blind reader passes 03 every round; 02 is a half pass for the fourth round (it sees the seeds change with the world, never that the machine makes them). **Decision for Nick:** paint the machine too, moving parts in code (recommended; the only route the critic sees to 8.5), or keep the drawn machine composited into the paintings and waive Subject and Finish near 7.5 to 8, or return to drawn worlds and waive Setting near 6.5. Either way the paintings bend my "drawn in code, nothing fetched" budget line. Round 5 (compositing polish, useful on the second path) is building meanwhile. **Also for Nick:** whether 02's glance line should be "the contents change to suit each world" (the caption carries "seeds of life"), since four readers have landed there.
- **Outbreak (beats 5 and 6):** round 5: Glance 7, Lore 8.5, Subject 5.5 as light (4 against the anchor), Setting 7.5, Motion 7, Changes 8, Finish 6.5, Phone 7.5. 05 passes the blind reader every round; 06 has failed five times. **Decision for Nick:** change 06's scale to a token carried to one dark world's Generator, which relights (recommended), or finish the hexagon of light and waive the Subject anchor, or keep the metal chip and waive Subject near 6.5. Polishing is paused until he rules.
- **Order of work (Nick, 2026-09-29):** set up the system, then run it on the Generators and on the outbreak to round out the small beats. Drawing goes to Sonnet 5.5; critics and readers are Opus.

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
