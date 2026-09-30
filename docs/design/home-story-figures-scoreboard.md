# Home story figures: scoreboard

The running record of every grading round for the home story's figures (`home-story-figures.md`), kept by the `story-figure-polish` skill. Rewrite the standing state at the top each round; append the round below it. Resume at the top open item.

## Standing state (2026-09-29, after round 3)

- **Generators (beats 2 and 3):** below the bar. Round 3: Glance 7, Lore 8, Subject 7, Setting 8, Motion 7, Changes 7, Finish 6.5, Phone 7. The painted worlds fixed Setting (6 to 8); the critic now judges Subject and Finish stuck on a design decision (a drawn machine against paintings), reachable to about 7.5 by compositing (round 4, building). **Taken to Nick:** paint the machine too (moving parts stay in code; recommended), keep the composited drawn machine and waive, or go back to drawn worlds and waive.
- **Outbreak (beats 5 and 6):** below the bar. Round 3: Glance 7.5, Lore 8.5 (clears), Subject 6, Setting 7.5, Motion 7.5, Changes 8, Finish 6.5, Phone 7.5. The blind reader passes 05 and fails 06. The critic judged the token stuck on a design decision; I took its recommended route (round 4, building): the token as a large object in front of a softly blurred galaxy, lit by Valleron, with the warmth spreading back behind it. Overridable by Nick (the alternative: a hexagon of pure light, which needs the weight-and-wear anchor waived).
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
