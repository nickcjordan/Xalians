# Accords plate: review log

The loop in `docs/design/living-plate-playbook.md` section 8. Newest round first. The plate is generated: edit `build.py`, run it, and it writes `source.html`.

## Concept (Nick gave ownership of the scene, 2026-09-22)

The painting shows a pylon on a summit drawing three beams of power from a storm. Nick asked for the concept, not the picture, true to the lore. The Accords era is the moment every Generator was handed to APEX. APEX could only reach them through QEDs, which were forged in Zolton's bloodstorms by exposing chips to opposite ends of a crimson sprite. So the plate is the forge itself:
- a QED works on the summit of a metal spire, high above a storm cloud sea lit red from inside
- crimson sprites (the lore's "electrical jellyfish") blooming above the clouds
- a sprite blooming over the works' cradle mast, with the discharge running down it
- a lamp on a far spire flashing at the same instant, the entangled partner
- one cold lamp that never flickers

Sources: Zolton history paragraphs 1, 3, 6, 7 and 8; the `qed`, `bloodstorm` and `apex-accords` entries; the `qed-enables-apex` chronicle event.

## Trial: a panel of three reviewers in parallel (Nick, 2026-09-22)

Nick approved the trial on one condition: record whether it is working, or whether it only spends tokens faster.

**Baseline.** One fresh gate reviewer per round, rounds 6 to 11:

| Round | Tokens | Minutes | Findings | Score |
|---|---|---|---|---|
| 6 | 182k | 11.0 | 10 | 6.5 |
| 7 | 171k | 6.9 | 10 | 6.5 |
| 8 | 177k | 11.7 | 11 | 6.5 |
| 9 | 165k | 10.4 | 8 | 7.5 |
| 10 | 176k | 10.7 | 8 | 7.5 |
| 11 | 150k | 6.1 | 6 | 7.5 |

That averages about 170k tokens and 9.5 minutes of review per round. The score rose about 1 point every three rounds, and each fresh reviewer found a largely new batch.

**The panel.** Each round, three fresh reviewers run at once, one per lane:
- **A:** concept, the full frame at site size, the home page, and checklist items 1, 2 and 16 to 21. A also gives the overall score.
- **B:** every piece against the piece list, and checklist items 3 to 10.
- **C:** motion over time, and checklist items 11 to 15.

The builder runs the pieces audit once, before the panel, and all three reviewers read the saved sheets. The gate passes only when all three lanes return "Nothing worth a round" and A's score is at least 9.

**Measured every panel round:** total tokens, wall-clock minutes (from launch to the last report), findings per lane, findings two or more lanes duplicate (waste), and the score.

**Verdict rule, written before the first panel round:**
- The panel is working if it reaches the gate in fewer total tokens than the baseline would. Projecting the baseline's trend, that means roughly 3 or more single rounds (about 500k tokens) still to go.
- It is also working if, per round, it finds clearly more distinct visible problems than one reviewer did (6 to 11).
- It is wasting tokens if two panel rounds pass without the score or the findings improving over the single-reviewer rate, or if more than a third of the findings are duplicates.

### Panel results

**Verdict after two panel rounds (the rule was fixed in advance):**
- **On findings, the panel is working.** It found 13 and 17 distinct problems per round against the baseline's 6 to 11, with 12 to 13% duplicates.
- **It also catches a class of problem single reviewers never did.** Both were systemic, not cosmetic: the keyTime rounding bug, and clocks with periods that don't divide the forging's, which drift into bursts of up to nine events on the forging after the first minute.
- **On score, it has not moved yet** (7.5, then 7). Fresh reviewers' scores are noisy, so the fixes carry more weight than the score. The score will say whether they landed.
- **Cost** is about 2.4 times a single round, and wall time is equal or better, because the lanes run at once.
- **Decision:** keep the panel for the rounds left under the fifteen-round cap. If round 15 does not pass the gate, stop and report to Nick rather than loop on.

| Panel round | Tokens (A / B / C) | Total | Wall minutes | Findings (A / B / C) | Duplicates | Distinct | Score (A) |
|---|---|---|---|---|---|---|---|
| 12 | 114k / 153k / 137k | 404k | 9.2 | 7 / 5 / 3 | 2 (the weak forging sprite; spires not reading as metal) | 13 | 7.5 |
| 13 | 116k / 152k / 139k | 407k | 4.6 | 6 / 7 / 6 | 2 (the envelope; the standing charge) | 17 | 7 |
| 14 | 110k / 137k / 162k | 409k | 7.6 | 6 / 7 / 6 | 2 (the pod's pulse lost in the halo; the forging sprite's shape) | 16 (one rejected against the lore) | 6.5 |
| 15 | 108k / 134k / 147k | 389k | 5.5 | 7 / 5 / 5 | 0 | 17 | 7 |

**Round 12 notes.** The motion lane found a real bug that eleven single-reviewer rounds missed. `f()` rounded every number to one decimal, which collapsed the sprites' keyTimes (`.012;.03;.06` to `0;0;0.1`): every sprite popped in at half brightness, the forging's two rings merged into one, and bolt phases drifted. Specialisation paid off here; a generalist reviewer checks motion by eye, but the motion lane read the clocks. The duplicate rate was 13%, under the one-third waste line. Cost was 2.4 times a single round, for about 1.6 times the distinct findings plus a class of bug no single round had caught.

**Conclusion at the cap (round 15), judged by the rule written before round 12:**
- **Findings: the panel worked.** It found 13 to 17 distinct problems per round, against 6 to 11 for a single reviewer, and 0 to 13% of them were duplicates.
- **Score and convergence: it did not work.** Four panel rounds spent 1.61M tokens and scored 7.5, 7, 6.5 and 7. Projecting the baseline, one reviewer at a time would have needed about 500k more to reach the gate. The panel did not reach it at three times that.
- **Why it did not converge.** Every fresh reviewer re-judges taste, so fixes oscillate. Three changes were asked for and then reversed within two rounds: the spire-tip caps, the balloon at the top edge, and the relay-lamp glow. Lane A's top finding has been the same since round 6, so it is a composition problem that small fixes cannot close: the forging is too small and too dim to be the plate's event.
- **What earned its cost: the motion lane.** Every round it found real defects that no eye-based reviewer caught:
  - the keyTime rounding
  - clock drift
  - bolt durations that depended on the period
  - the defs sheet running on its own clock, which was also a live bug in End Wars' reduced motion (fixed in #573)
- **What did not:** Nick caught an off-center tower that all three lanes passed.
- **Decision:** stop at the cap and report. For later plates, keep one specialist motion lane on every round. Replace the "a fresh reviewer finds nothing" gate with Nick's judgment on the live page, after a round that follows a written composition decision.

**Round 15 notes.** Lane A scored 7, and its top finding is again the forging's size and brightness. Lane B found that the mast discharge reads as a rod, the anchor pylon is sunk below its crag's ridge, the red slit at the needle's foot is still there, and the forge spire reads as stone. Lane C found that the forging clip lives in the defs sheet, whose clock the page never paused (a live End Wars bug, #573), that the tendrils stop dead at 0.72 s, and that five onsets pile up right after the forging. Lane B also asked to move the relay-lamp glow back, and lane A asked for the balloon back; both reverse earlier rounds. Round 15's findings are not merged: the cap was reached.

**Round 14 notes.** Two things count against the panel this round. First, Nick caught a problem all three lanes passed: the forge spire leaned, so its summit sat left of the works and narrower than the blockhouse, and lane B marked checklist item 4 as passing. Second, lane B reversed a round 13 change (the cool `#9aa2bc` cap on the spire tips, which it now reads as moonlight from the wrong side), so two rounds of fixes cancelled out. Lane B also asked to make the sprites less like jellyfish, against the literal lore ("danced like electrical jellyfish above the clouds"); that finding was rejected, and checklist item 19 now says so. The motion lane again found real clock bugs no other lane could: bolt durations that depended on their period, and two sprites landing on the second forging.

## Final pass (after the cap, on Nick's go, 2026-09-22; no reviewer round)

One composition decision and the confirmed round 15 defects, verified by the builder on renders and on the page:
- **The forging is the event.** The mast is shorter: the cradle ring is at y 560 and its chip at 519. The pod rose to y 150. The sprite now spans the roughly 370 units between them, about a fifth of the frame, with dark sky inside it: head at the pod, halo centered on the span at .9, central tendrils reaching the cradle. A white-hot core blazes at the head for the first 0.4 s. The pod has a solid metal body, and the cradle prongs are heavier.
- **The discharge** is a thin crackling bolt with forks, wandering between the lattice legs, instead of a glowing rod.
- **The relay lamp** moved down the shorter mast to y 652. Its glow now sits on the lamp, and its arm reads as metal.
- **The forge spire** reads as metal: a cool rim on the summit edge and lit flank, and seams on its faces. The piece list now calls it a metal spire.
- **The anchor pylon** stands on a level ledge of its crag, with its base centered under its legs. The cable meets its head, and no dark plane hangs off the ledge.
- **The red slit** under the near needle is gone: the needle's base rises into its foot billows.
- **Motion:**
  - Tendrils ease into their full length.
  - The red wall flash moved to 2.9 and 14.9, so only two onsets follow the forging.
  - The far-right sprite and its bolt run on 12 s.
  - Phases up to 24 keep three decimals.
- **Not taken:** the balloon edge back at the top of the frame, and the relay-glow and tip-cap swings. These reverse earlier rounds; a written decision holds them where they are.

## Round 14 (panel round 3; score 6.5, another round from all three lanes)

Sixteen findings were merged, and one was rejected:
- **Nick's catch.** The forge spire now stands upright under the works (x 1012, no lean). Its flat summit is 168 wide, wider than the blockhouse, with no jitter or shoulder steps in the top rows. Checklist item 4 now asks whether a built thing sits square and centered on its support.
- **The pair's two ends (A, B, C).** The cradle is 1.7 times larger, around its ring. The pod is 2.3 times larger. Each end now holds the same chip glyph: a 10×14 carrier with a dim white core. The column haze is at .45, rx 150. The pod's flare uses the hot head fill at r 36, and its ping ring reaches 60.
- **The forging sprite (A, B).** The tendrils are scattered, with lengths from 40 to 120. It has a crown, and its scale is (1.6, 1.6), so it reads as a column around the tether, not a saucer. The central tendrils end at the cradle chip.
- **The clocks (C).** Bolt and flash keyTimes are now written in seconds, against a 12 s reference, so a bolt lasts the same time on any clock. S3's phase is 7.85 and S6's is 3.85, which clears the second forging. The deep right flash's phase is 22.05, so it no longer fires with the left one. The wall's red flash moved to a 12 s clock at phase 10.6, which breaks the repeating 6 s chain. The breathing clocks are now 6, 8 and 12 s.
- **Spire light (B).** The forge spire's cap is dark gunmetal, and its underlight starts higher (.25 to .6). The needle caps are cut to half strength. The panel seams are 3 per large spire, `#8a86a4` at .45.
- **Pieces (A, B).** The near-needle bolt now starts in open cloud at (790, 1175). A billow closes the red slit at the needle's foot. The cold lamp's outer glow is .2. The pylon has a crimson rim on one leg and a small crimson lamp at its head. Two short forked bolts sit inside the near cloud, with onsets at 7.5/19.5 and 14.0, both clear of the forging.
- **Rejected (B6).** Flattening the sprites so they look less like jellyfish contradicts Zolton's history, paragraph 6.

## Round 13 (panel round 2; score 7, another round from all three lanes)

All seventeen distinct findings were merged:
- **The storm clock (C).** Every event is now on a 24 s master cycle, with periods of 6, 8, 12 or 24 s. The phases were found by a search script (scratchpad `schedule.py`): no onset falls from 0.8 s before to 1.5 s after a forging, no two nearby sprites bloom together, and the longest lull is 0.5 s. Sprite timing is now in absolute seconds, so a 24 s clock doesn't linger four times longer than a 6 s one.
- **The forging sprite (A).** It now spans pod to cradle: head at y 212, scale (2.0, 1.5), and a trimmed halo.
- **The discharge (A).** It has weight at site size: stroke 7 and 2.6 on the mast, 8 at the tip.
- **The column at rest (A).** It reads as charged: the haze is at .25, with a faint crimson line along the tether.
- **The envelope (A, B).** It sits wholly above the frame, and the harness is gone.
- **The mid spires (A, B).** The left mid spire moved below the desktop card (tip at y 1050). The center-left mid spire is now a large needle (width 110, tip at 950), and the sprite-2 bolt retargets to it.
- **The metal tips (B).** They have a cool cap (`#9aa2bc`) and a glowing glint (r 3 or more).
- **The storm-wall bolt (B).** It starts at (700, 745) and grows out of a flash inside the wall, on its own clock.
- **A new bolt (A).** It runs from the near cloud into the near needle's tip.
- **The relay glow (B).** It is centred on the lamp.
- **The piece list (B).** It covers the standing charge and calls the crags crags.

## Round 12 (the first panel round; score 7.5, another round from all three lanes)

All thirteen distinct findings were merged and implemented:
- **The rounding bug (C).** `f()` now keeps three decimals for any number under 20: keyTimes, phases and periods. All eight sprite blooms and both forging rings are restored.
- **The forging sprite (A, B).** It is now the brightest, largest mass: horizontal scale 1.3, a halo of rx 280 at .75, a stronger inner glow, and tendrils at full color. The end flares are cut to r 24 at .5 and the pings to 8/44, so the two ends read as contact points.
- **The idle column (A).** The standing charges are at .45, and a faint haze sits between the pod and the cradle.
- **The cold lamp (A).** It is quieter, at r 20 and .35.
- **The lift envelope (A).** Its lower lip now shows at the top edge.
- **The spires (A, B).** Crimson climbs the lower body, peaking at .42. The caps are faint, and a crimson rim runs on both lower flanks. The first try, at .7, read red-hot again (round 2's problem), so it was tempered.
- **The left mid spire (B).** It is now a needle: width 110, tip at 880.
- **Struck tips (B).** Each tip washes crimson on its bolt's clock.
- **The crawler (B).** It is width 4.2 with 2 branches.
- **Hot spots (A).** Two glows now sit in the lower cloud field, at (560, 1420) and (1180, 1330).
- **The wall flashes (C).** They are locked to the forging's clock, the red one at 6 s and the white one at 8 s, so neither crowds a forging.

## Round 11 (fresh gate reviewer, score 7.5, another round)

The reviewer found:
- The forging sprite read as a lampshade.
- The sky had a lull from 2.9 to 4.5 s.
- The storm wall's glow sat under the desktop card.
- The crag faces read as slats.
- The bolts were a pixel wide at site size.

All six findings were implemented:
1. The forging sprite is narrower (horizontal scale .85) with ragged, swaying tendrils. Only its central tendrils reach the cradle, and its hot core is smaller.
2. Sprite 5 now blooms at 3.2 s and the crawler fires at 3.6 s.
3. The wall's breathing glow moved to (720, 790), clear of the card.
4. The crag faces slope and use only every other segment, at .4 to .6.
5. The bolts are wider: 3.2 to 3.6, and 2.8 for the crawler.
6. The pylon footing starts inside the rock.

## Round 10 (fresh gate reviewer, score 7.5, another round)

The fresh reviewer found:
- The forging sprite read as a saucer with bars.
- The idle pod could not be named.
- The upper-left bolt lined up exactly with the far needle.
- Two stacked sprite pairs repeated as a pattern.
- The foreground was empty.

All eight findings were implemented:
1. The forging sprite is now a bright jellyfish. It has fourteen evenly spaced tendrils rising out of its head, a hot white core, a quieter haze (.45 and .35), and a horizontal scale of 1.1.
2. A visible tether (width 1.8) joins the pod to the cradle, and the pod holds the same dim standing charge as the cradle.
3. The far needle moved to x 780, and the storm-wall bolt now lands on it.
4. The high-left sprite moved to (470, 230). The high-right sprite moved to (1440, 210), and its bolt now falls nearly straight onto the far right tip.
5. A near needle now pierces the near cloud at x 720 (tip at y 1250, width 110), with billows at its foot. The crags' lit faces are at .75 to 1.
6. The mast discharge has no branch.
7. The window dip covers every window.
8. The piece list now covers the near needle, the tip glints, the storm breathing and the deep flickers.

## Round 9 (fresh gate reviewer, score 7.5, another round)

The fresh reviewer's two main findings:
- The forging read as three beacons stacked on the mast, not one sprite with a chip at each end.
- The pair was lopsided: the pod was weaker than the cradle and dark in the still.

All eight findings were implemented:
1. The forging sprite is now the widest mass: horizontal scale 1.35, a 230-unit halo, a bright inner glow and a second head core. Its tendrils hang straight as curtains. The cradle flare is cut to r 40 at .75, and the ping's white core is smaller.
2. The pod carries the same flare as the cradle, and both pings are 12/70, so the pair is balanced, in the still as well.
3. The sprite-to-tip bolts fire at their sprites' full size: phases 2.74, 1.46 and 4.82.
4. The crawler has many short segments (step 7), rough .18 and no branch.
5. The crag rims are at .6 and width 3, and the lit faces at .6 to 1. The near flicker sits beside the left crag at (330, 1500).
6. Every spire tip holds a steady cold glint, the lore's "metallic peaks" as lightning rods.
7. The cable sags: its control point is now (1300, 1190).
8. The pylon moved 20 more units onto the crag, and the cable end moved with it.

## Round 8 (fresh gate reviewer, score 6.5, another round)

The gate did not pass. The fresh reviewer found:
- The storm wall read as a dark wedge.
- The spires still read as lit from above.
- The lightning rendered pale pink, against the lore's "dark red lightning".
- The sky still had lulls of up to 4 s.
- The pod sat under the page header.
- The intent comments were stale.

All eleven findings were implemented:
1. Two more rows of crowns fill the storm wall's body, and a mask feathers its right end over x 640 to 920.
2. The spire caps are faint, the forge spire's red rises from 40% to .5 at its foot, and every spire carries a crimson rim on the lower lit edge.
3. All lightning now has a `#c4283c` glow around a `#ff7a7a` core, at width 2.4 to 3.0.
4. The lull is filled: sprite 8 blooms at 4.6 s, the storm-wall bolt fires at 4.8 s, and a fifth bolt runs from sprite 2 into the center-left mid spire tip.
5. The storm-wall bolt starts inside a crown at (690, 715).
6. The pod moved to y 185, the forging sprite head to 262 (tails 88 to 110), and the upper ping to 185.
7. `CONCEPT`, `PIECES` and the ping comment now match the plate.
8. The crawler is rough .3 with one branch.
9. Four tendrils sweep onto the prongs, and the tip discharge is jagged, not a rod.
10. The streamers are at .25 and width .7s.
11. The crags have longer lit faces and a quieter outline.

## Round 7 (fresh gate reviewer, score 6.5, another round)

The gate did not pass. The fresh reviewer found:
- The storm was still quiet most of the time.
- The upper pod sat apart from the sprite and could not be named.
- The discharge read as two neon bars.
- A strike stole the forging's beat.
- The forge spire read as moonlit stone.

All ten findings were implemented:
1. Sprites now hang about 2.5 s: `d_` is .2 and `e` is .38. Sprites 2 and 3 are at scale 1.4, and a slow crimson glow breathes inside the storm wall.
2. The upper collector sits in the top of the halo at y 135 and is 1.4 times larger, with side vanes.
3. The high-left sprite's strike under the desktop card was removed. The sprite stays, above the card.
4. The discharge is now lightning hugging the lattice (`bolt_path` with rough .08 and one branch), fading as it runs down.
5. Sprite 7 and its bolt moved off the forging's beat (phase 5.2).
6. The forge spire's lit face is dark (`#2b2a33`) under a small cap, with `#8a2438` catching its foot.
7. The center-left mid spire moved to x 660, clear of the card.
8. Sprite 8's phase is now 6.0.
9. **Twin removed.** The lore makes the entangled pair the two chips at the sprite's opposite ends. With the pod and cradle pulsing together, a far twin answering implied a third chip. The reviewer asked Nick to rule on it. The builder applied the lore-faithful option instead of blocking, and it is reported to Nick as overridable.
10. The storm wall now ends at x 900, and its right end slopes down into the horizon, which the builder added after the first render showed a vertical cut.

## Round 6 (fresh gate reviewer, score 6.5, another round)

The gate did not pass. The fresh reviewer found:
- The home page's still was not the plate's t=0 frame, because livePlate paused the fragment before SMIL ever sampled it. This bug also affects End Wars.
- The storm was calm for most of the cycle.
- The hero sprite read as a red lens.
- The lore says chips go at *opposite ends* of a sprite, but only one end held one.

All ten findings were implemented:
1. `livePlate.tsx` now seeks every injected layer to t=0 while paused (`holdAtStart`), with a test.
2. Three more sprites fill the upper sky: high left at (240, 250), high right at (1300, 290) and highest at (700, 140), on 6 to 8 s clocks. Two more sprite-to-tip strikes land on the far left and far right spire tips, and the deep near-cloud flickers are raised to .6.
3. The forging sprite's head is lower (y 212), its halo is rx 180 at .5, and its tendrils end in the prongs at 50% color. It now blooms at full length, with no grow-in, so it is touching the cradle the instant it appears.
4. An upper collector was added: a pod at (1014, 90) on a tether from a lift envelope above the frame. The tether runs down through the sprite to the cradle, and the pod pings with the cradle, so the chips sit at opposite ends as the lore says. The far twin stays, as the link working across distance.
5. The forge foot has three more billows, and its base red is nearly gone.
6. The page text was rewritten, removing "Lightning is rare" and the double comma.
7. The pings are now soft, blurred pulses with thicker rings and radius capped at 70.
8. The white wall flash moved to (620, 780) with peak .8.
9. The metallic caps are brighter, and every tip strike leaves a glint on its tip.
10. No pale facets appear in a spire's lower 40%.

The reviewer said the upper collector (finding 4) was a concept change that Nick should rule on. The builder applied it rather than block the loop, because it follows the lore's literal description. It is reported to Nick as overridable.

## Round 5 (reviewer score 8.5, every checklist item passes)

Three small findings were left, and all three were implemented:
1. The mast's crimson rim was cut. It read as a separate wire.
2. Sprite 5 moved to (430, 560), clear of sprite 2.
3. A bolt falling onto a tip now arrives from above, with no sideways hook.

## Round 4 (reviewer score 7)

The storm wall and the mood held. What remained was placement and layering.

All eight findings were implemented:
1. The sprite-4 bolt starts inside the sprite's tendrils at (1334, 650), and its afterglow sits below the spire foot at (1420, 1185).
2. The anvil bolt and the wall flash moved out from under the desktop text card. The bolt now runs from inside the storm wall at (760, 740) to the far center needle at (641, 866), and the flash sits at (780, 800).
3. Four domes now climb the forge spire's flanks (tops about y 1100 to 1140). The base red peaks just above the waterline at .22.
4. Sprite 5 is lifted to y 540, above the anvil smear.
5. The anchor pylon moved 60 units right onto the crag, and the cable end moved with it.
6. The plate was re-exported and the home-page capture rerun.
7. Sprite 3 is now at scale .9.
8. The forge spire has no seams, and the mast's crimson rim now lies on the leg.

The builder went further than the reviewer's suggestion on finding 3. The streak texture was first confined to the upper 60% of the spires, but that left a hard horizontal edge, so it was removed entirely.

## Round 3 (fresh reviewer, score 5)

The fresh reviewer, which had seen no earlier round, found three things:
- The thunderhead still read as a mushroom cloud, so the round 2 rebuild did not hold.
- The idle frames read as a lavender dreamscape, not a bloodstorm, because every event bunched into 2.4 to 4.4 s.
- The forge spire looked set down on the cloud, not rising out of it.

All twelve findings were implemented:
1. The thunderhead was replaced with a long low storm wall on the horizon, x 0 to 1000 and crowns about y 670 to 760, with a thin anvil smear above it. Its red flash is a wide glow inside the wall.
2. The cloud sea's shadows lean crimson. The events now spread across the cycle, firing at about 1.5, 3.0, 5.0, 6.0, 6.5, 7.4, 8.5, 9.8 and 10.6 s, and two dim flickers were added deep in the near cloud.
3. The spires' upper faces are darker, crimson rises up the lower 40%, and short straight seams on one face replace the zigzag veins.
4. The forge spire's polygon ends inside taller foot billows (y 1232, ry 78), and no static red glow sits under its foot.
5. The mast's outer legs are 4.5 units, with a crimson rim low on the right leg. The cradle holds a dim standing charge (.25).
6. The relay lamp has a 6-unit arm, a lit housing, and cold light spilling onto the mast.
7. The static valley glows are fewer, larger (rx at least 300) and fainter.
8. The sprite-4 bolt's afterglow sits below the spire foot, and every afterglow is shorter (it ends at .08 of the cycle).
9. The anvil bolt starts under the anvil at (230, 690) and fires at 6.5 s.
10. The forging phase is 1.4, so the still frame shows the forging without frozen rings.
11. Sprites 2 and 4 are at scale 1.2 and sprite 2 is lifted to y 380. Tendril lengths vary by sprite.
12. The gantry was deleted, and the anchor pylon is now a tapered lattice on a wide footing.

The builder also added a haze band where the cloud sea meets the sky, which fixes checklist item 6.

## Round 2 (reviewer score 6.5)

The forge now reads. The worst remaining problems:
- The anvil's tail touched the mast.
- The spire bases read as glowing iron with flat bottoms, and the round 1 foot mask left red slivers.
- The twin sat in the corner and blended with every other red.

All nine findings were implemented:
1. The anvil's tail now ends about 100 units clear of the mast.
2. The spire mask was removed (the round 1 deviation did not hold). The polygons now end 12 units into their cloud row, a cluster of that row's billows sits in front of each foot, and the base red is capped at .45 and confined to the lowest 20%.
3. The twin moved to the far spire at x 1236. The cradle and the twin now share a signature no other light uses: a white-hot core and two thin crimson rings pinging outward a quarter second apart.
4. The forging sprite's tendrils reach y 342 to 366 and keep their color to 88% of their length. The sprite-4 bolt starts at y 640.
5. The piece list was rewritten for the twin, the lightning, the thunderhead and the forging.
6. The streamers were removed from the halo sprite.
7. The thunderhead tower is now built from round billows, which also broke up the bands. The red flash is a low wide glow at the cell's base.
8. All facets are quieter (opacity .04 to .1).
9. Sprite 3 moved to y 400 and its phase to 4.0.

One change went beyond the reviewer's suggestions: the first round-billow pass stacked into "pancakes", so the tower was rebuilt a second time before this review.

## Round 1 (reviewer score 4.5)

Only the forging read as intended:
- The twin was invisible, and it sat under the desktop text card.
- The relay lamp read as a star.
- The thunderhead read as a mushroom cloud.
- The spires were lit from above, but the key light comes from below.
- A breathing glow painted over the forge spire.

All twelve findings were implemented:
1. The twin moved to the far right spire (1486, 858). It is now a 3-unit-stroke lattice mast with the forge's forked cradle, and its lamp radius is 40.
2. The thunderhead was rebuilt as a broad cell with no stem. Its anvil shears to the right, and the static red core is at .25.
3. The breathing glows moved clear of the spires.
4. The forging sprite is now scale 2.6 with a 300-unit crimson halo, and its tendrils reach the cradle prongs. The discharge now runs down the mast through a clip that opens in 0.12 s.
5. The spires are lit from below: a small metallic cap, a dark body and a crimson base. The cool rim is only on the upper-left edge.
6. The white rising bolt is now a crimson bolt from sprite 4 into the right mid spire's tip, on the sprite's clock.
7. The relay lamp sits on a 4-unit arm with a housing.
8. The crawler moved clear of the left mid spire.
9. The far-left bolt now starts under the anvil.
10. The forge spire tapers from a 136-unit summit. It has no pale facets, and a billow row wraps its foot.
11. The wisps were cut.
12. The near crags were faceted and lit crimson along the edge. The sky strokes fade to 30% above y 600.

Two changes went beyond the reviewer's suggestions:
- Spire feet now fade through a mask, so no hard base shows between the billows.
- The gantry leg moved onto the summit.

The page text was updated, which fixes checklist item 17.

## Round 0 (builder, before any review)

What was built, cut and changed:
- **Cut:** a rift in the near clouds showing rivers of electricity on the canyon floor. It read as a pool, not a chasm.
- **Cut:** aurora curtains. They read as muddy blocks.
- **Changed:** the cloud rows were rebuilt as domes over a solid cloud body, because gaps between the rows showed spire feet.
- **Changed:** the twin mast was a cross (checklist item 4). It is now a miniature of the cradle mast.
