# Home story figures: scoreboard

The running record of every grading round for the home story's figures (`home-story-figures.md`), kept by the `story-figure-polish` skill. Rewrite the standing state at the top each round; append the round below it. Resume at the top open item.

## Standing state (2026-09-29)

- **Generators (beats 2 and 3):** live since PR #751, **below the bar**. Last critic scores 6 to 6.5 (round 0b); a third set of fixes shipped in #751 after that review and has not been graded. The round harness is built (`home-story-figures.md` section 10). Round 1 is under way on branch `figure/generators-polish`, starting with the weakest lines: Subject, Setting, Finish, and the seeds reading as living (see the baseline blind reader below).
- **Outbreak (beats 5 and 6):** not started. Plan in `home-story-figures.md` section 7. Next: a first build on branch `figure/outbreak`, then rounds.
- **Order of work (Nick, 2026-09-29):** set up the system, then run it on the Generators and on the outbreak to round out the small beats. Delegate drawing to Sonnet where it makes sense.

## Open findings, Generators (from round 0b, not yet regraded)

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

Blind reader: not run in round 0.

### Round 1 baseline blind reader (2026-09-29, the build live from PR #751)

Opus, six stills from the study page, no captions.
- 02: "One tall machine with a lit, pill-shaped window stays in the same place while its surroundings change... The inside always matches the place." Medium to high confidence. Half a pass: it saw the contents change to suit each world, but not that they are life ("fish- or bird-shaped things", "rocks or embers", "star or crystal shapes").
- 03: "The view pulls back to five of these machines in a row, each in its own colored dome... Dotted lines then run from the sphere down to every machine... and the machines lose their own colors and go dim gray and purple." High confidence. Near a pass: the link and the loss of each machine's own color read; "takes control" is implied, not said. It could not tell whether the vats had been emptied, and did not know what the end domes were (the snow-globe finding).
