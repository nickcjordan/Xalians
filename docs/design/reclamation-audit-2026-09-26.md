# Reclamation: the self-audit (pass 62, 2026-09-26)

Status: the audit is done, and pass 62 fixed its defects. The design weaknesses it found are ranked below, and passes 63 and on take them in that order. The running state is in `reclamation-ownership-log.md`.

## What Nick asked

> You do an audit yourself and identify where you need to improve and follow up with improving those areas

Passes 57 to 61 each answered one of Nick's play-tests. This pass looks for problems before he does. It audits two things: the game, and how I have been building it.

## How the game was audited

- **A first visit** with nothing stored, at 1440 by 900 and 390 by 844: the start screen, the first table, and a card pointed at.
- **A whole game at six screen sizes:** 1280 by 720, 1366 by 768, 1440 by 900, 1536 by 864, 1920 by 1080, and a 390 by 844 phone. Each size captured every moment: your move, a lift, the rival's move, the Clash, the Ruling, the result, the key and the history. At each size a probe measured what the words under a lifted creature actually show.
- **A blind critic** (screenshots only, no code) read a whole game on seed 21 at 1440 and 390. It used the rubric in `game-validation-principles.md` section 4. The last critic read was pass 50, twelve passes ago; the protocol calls for one every third pass.
- **The simulator,** 500 matches on each of seeds 7 and 13.
- **Every panel's text read in full:** the dossier, the result, the key and the history.

## The critic's scores

| | Pass 50 | Pass 62 |
|---|---|---|
| Clarity: a legal, meaningful move without a manual | 6 | 7 |
| Decisions: real choices, and you can tell which is better | 4 | 5 |
| The Clash: readable and worth watching | 5 | 3 |
| Arc: tension across rounds, a way back | 3 | 4 |
| Want another game | 5 | 6 |
| Phone | 7 | 6 |
| Numbers: every number needed, every needed number shown | (new) | 5 |
| Feedback: every action answered in the game's own language | (new) | 6 |

The best thing, in the critic's words: the three world-colored bars on each card, and the words under the number when a creature is lifted ("A new player can see at a glance where each creature is strong and why"). Nothing below may break that.

## What was wrong with the game

### Defects, fixed in pass 62

1. **Pass 61's words were hidden on the screens most people use.** Pass 61 measured the height of your half of a world from its outer box. The container query that hid the words reads the inner box, which is 18 pixels less. So:
   - beside a creature of yours, the words never showed on any screen under 1920 by 1080;
   - the "why" never showed at 1366 by 768, the commonest laptop screen.

   Nick's case, a creature pointed at beside one already sent, was the case hidden at every laptop size. The words are now fitted by measurement: the ghost tries each step in turn and keeps the first that fits (details in `reclamation-say-why.md`). Beside your creatures, the right of your half is kept for the ghost through the whole Deploy. A first version stepped your creatures aside only while a card was pointed at; the shift check failed it, because pointing must move nothing (pass 36). Measured after the fix:

   Measured on seed 7 with Figzy lifted in round 2 (willful, too cold at Saiphus, unable to breathe beside Scalatto at Luminax):

   | Screen | Alone on a world | Beside your creatures |
   |---|---|---|
   | 1280 by 720 | what it does and why | what it does and why (the chain gives way) |
   | 1366 by 768 | everything | everything |
   | 1440 by 900 | everything | everything |
   | 1920 by 1080 | everything | everything |
   | 390 phone | what it does and why, small | nothing on the world: a world there is 110 pixels wide, so your bar and the lifted card carry the number |

   Before the fix, the "why" showed at 1366 by 768 only when the ghost stood alone at a tall enough world, and beside your creatures nothing showed at all below 1920 by 1080.

2. **The dossier's arithmetic did not add up for a willful creature.** Scalatto on airless Luminax read "Strain x0.25 (severe)" above "Base hold 14" and "Hold here 7". The strain line printed the world's grade, while the hold used the grade after willpower. It now prints the factor the hold uses ("x0.5 (far off; willful: one grade less)"). Its body line printed "height 102.36373238265514 cm"; measures are rounded now.

3. **A creature standing on a world had no words** (open since pass 61). Its dossier now opens with the table's own lines: "It cannot breathe here, but it is willful: it holds half, not a quarter. Luminax here has no air at all; Scalatto breathes air."

4. **The Clash downed creatures before they fell.** A downed creature left the world on the very step that downed it. So "Hypnopet downs your Scalatto" played over an empty half, and the critic scored the Clash 3: "the target has already vanished". It now stays where it fell, greyed, as it already did at the Ruling.

5. **The top bar cut its own messages:**
   - During the Clash on a 1440 screen, the Skip key squeezed the message to 148 pixels, and it was cut at its first line and its last ("passed. Each world clashes in turn, fastest").
   - On a phone, the third line of the Ruling was cut in half.

   Both fit now.

6. **The result screen:**
   - It said "You: no one" at a world where your creature fell; the fallen are named and struck where they fell.
   - A bolster's give-back read "Bioflim 8 +32", which looks like a sum. It now reads "mended 32".

7. **A bolster's lift had no reason.** "It steadies itself: +6" at one world and "+1" at the next, with nothing to tell them apart. The words now say which case it is:
   - "A bolster eases the heat one grade for it" (the six);
   - "A bolster adds 1 where the world does not strain it" (the one).

8. **The loser's match-point pennant kept burning** under "You win the game". It goes out when the game ends.

9. **Advanced mode at 1440 was broken in two places:**
   - Each world's head printed its place on top of its temperature readout, and its name was squeezed to nothing. Pass 57 had set the head to one line.
   - With the log beside the table, a card column is 20 pixels wide, and "13 10 9" ran together as "131069".

   The head now has its name and climate on the first line and its place under them. A card's numbers shrink to their column.

### Design weaknesses, ranked, for the passes after this one

1. **The send budget is invisible when you decide, and wasted sends go unmarked** (critic's first problem, sure). The critic's player sent 8 of 11 creatures in round 1, three of them to worlds already won by 20 or more. It had nothing left for round 3. No screen said the extra sends were wasted until the result.
2. **A decided game plays out a round with no moves** (critic's second problem). With no sends left, round 3 went to the rival unopposed, and nothing said the game was over before it began.
3. **The Clash is a caption, not a fight** (Clash 3 of 10). Pass 62 keeps the victim on the world. Still to do: the blow itself (a number off the target, the hit landing), and the other two worlds are 7-pixel labels while one fights.
4. **The top bar is unlabeled marks.** The critic, like pass 60's readers, could not read two rows of flags, the tallies and the nine squares without the key. Carried since pass 58: the score rows, and the send counter's one held back.
5. **Round 1's empty worlds are the largest thing on screen** while the decision is on the cards (carried since pass 57).
6. **Balance:**
   - A strike keeper wins 63.5 to 64.9 percent of its worlds and a bolster 41 to 44 percent (band 40 to 60).
   - The stake is used in 2 to 3 percent of games by the reference bot, yet it is offered in every round.
   - The round-one starter won 44.6 percent on seed 13 (50.2 on seed 7).
7. **Fathomaw has no art** ("?") in every picture.
8. **On a phone, a creature pointed at beside yours shows only its number,** because a world there is 110 pixels wide.

## What was wrong with how I work

1. **I verified at one size.** Pass 61's readers read 1896 by 1100 screenshots, and its checks ran at 1440 and 390. The fitting rules were derived from outer-box heights I never checked against the inner box. The proving check now plays at 1366 by 768 as well. It fails when a world whose number moves hides its words on a desktop screen, and when the ghost's number sits on a creature of yours.
2. **The resume point was stale.** The ownership log's standing state still said "after pass 31". Its gauges were from passes 6 to 30, and its open list was from passes 37 to 49. Every pass since has appended an entry and left the top alone. This pass rewrites it, and each pass now ends by rewriting it.
3. **Carried items piled up instead of closing.** A verdict per column has been asked for by readers in passes 57, 58 and 59. The send counter's held-back one has been open since pass 58, and strike keepers above 60 percent since before pass 50. From now on, each pass closes the oldest carried item or drops it with a reason.
4. **The periodic critic lapsed.** The protocol calls for a rubric critic every third pass; the last one before this was pass 50. It is on the checklist in the log now, with the date of the last read.
5. **Fixes were checked by their own numbers, not their meaning.** The dossier's strain line had contradicted its hold since willpower was added, and no check multiplied the lines. A test now holds the dossier's factors to its hold on every creature at every world of two games.

## Verification in pass 62

- All 1769 web tests pass. In one full run, ten tests in other games (sign-in, Long Return, species art) timed out while the screen probes ran alongside; each of those files passes alone.
- A new dossier test fails on the old strain line.
- A new result test fails on the old "no one" row.
- A new playback test fails on the old vanishing.
- The proving check plays both views at 1440, 1366 and 390. It failed on the first versions of this pass, and it is green now.
- The shift, actflip and hotseat checks are green. The shift check is the one that failed the first "step aside on hover" design.
