# Reclamation: each side at its edge (pass 65)

Status: shipped in pass 65. It takes the top bar, open item 2 in the ownership log and weakness 4 in the self-audit (`reclamation-audit-2026-09-26.md`). It also closes the two items carried since passes 58 and 60: the score rows beside the squad, and the send counter's one held back.

## The problem

The pass 62 blind critic could not read the top bar without the key: "two rows of flags, the tallies and the nine squares". Pass 58 and pass 60 readers had said the same in smaller ways:
- Pass 58: the send counter "is one fewer than the creatures in hand (one stays back) and sits in the score's row".
- Pass 60: readers "counted sends across screens to find their row".

Pass 60 drew the lesson and left it undone: a readout away from the board needs its own tie to a side, so seat it by that side.

Found while measuring: at 1366 by 768 the top bar cut the Ruling's line short. "Round 1: Zolton the rival's by 6; Stonera yours by 9; Telypso the rival's," stopped before "unopposed."

## What changed

- **Each side's row sits at its own edge of the table.**
  - The rival's row stays in the top bar, above the worlds, as its creatures stand above every world's seam.
  - Yours moves to the foot, onto the head of your squad, beside the cards it counts.
  - Your row stays at the foot in every moment:
    - through the Clash, on a 36-pixel foot bar;
    - at the Ruling, on the left of the bar that says what comes next.
  - The Clash's foot bar is the same height as the Ruling's, so the table no longer changes height between the two.
- **Each row reads the same way:** whose move it is (the pointer), whose row it is (the rival's emblem, or your piece), the pennants, then the sends.
- **A pennant won wears the color of the world it was won at.** On seed 7, the rival's row after round 1 is a yellow pennant (Zolton) and a pink one (Telypso); yours is tan (Stonera). A staked world plants two.
  - An empty place is a small socket, not an outline flag. The first (weaker) readers took the outline for a "P" or a pawn.
  - The pennant a side needs to win is a dashed outline that pulses. Every reader who met its old glowing outline first counted it as a fifth world won.
- **Both counts stand against the rules' own numbers:** "2/5" after the pennants (worlds won of the five that win), "8/11" after the sends. Nick's rule allows numbers on what they measure; these are numbers, not labels.
- **The sends are one unbroken meter against the eleven.** Ticks in fives left the eleventh standing alone, the "one held back".
  - A deck of cards with the count on its face was tried first. The first (weaker) readers read it as one more boxed number, and it was dropped on their word before the reader problem below was found. The meter with its count read cleanly to every Opus reader.
- **The round track's tiles are the worlds' own symbols,** the same ones on the world heads, in their colors. The framed three are visibly the three worlds on the table below them. Rounds past and to come are dimmed.
  - The track no longer fills a won world's half by winner; the pennants say who won what.
- **Skip moved to the foot,** under the Pass that started the Clash.
  - With Skip gone and the score column one row, the Ruling's line fits the top bar at 1366 by 768.
- The key (`reclamationLegend.js`) now pins the rival's row and yours separately, and How to play describes both.

## Assumptions and decisions

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 1 | Tell the two rows apart by position and a mark at their head, not by "You" and "Rival" words | 80%: Nick's affordances rule (no YOU/RIVAL labels, sides by position); every world already puts the rival above and you below; all six capable readers found the sides this way | `affordances-not-labels` memory; the readers below |
| 2 | Color a won pennant by its world, not by its side | 80%: pass 60's rule is that a hue means a world. One reader first took a yellow Zolton and a yellow Luminax for one world | `reclamationInstruments.SideRow` |
| 3 | Print the counts against the rules' numbers ("2/5", "8/11") | 75%: numbers on what they measure are within Nick's rule; readers rated them the clearest thing in the bar | `SideRow`, `SendMeter` |
| 4 | Keep a 36-pixel foot bar through the Clash rather than lose your row while the worlds fight | 70%: the Ruling already had a 36-pixel bar, so the step from Clash to Ruling keeps the table's height; it costs the fighting world 36 pixels | `.rec-clash-foot` |
| 5 | Drop the track's winner halves | 65%: the pennants now say who won what in the same colors; History has the record | the readers below |

## Measured

Blind readers were given the rules as How to play states them, but not what any mark means or whose side sits where. Each read four moments of one game on seed 7: rounds 1, 2 and 3 at 1366 by 768, and round 2 on a phone. They also got a 2x crop of the top strip and the foot strip, since a screenshot shrinks marks a person at the screen would see. For each moment they said:
- each side's worlds won;
- each side's sends left;
- the round;
- whose move it is;
- how they knew which marks were whose.

| Opus readers (1 to 10: how easily the state reads) | Live | This pass, before the dashed pennant | Final |
|---|---|---|---|
| Scores | 6, 6, 6 | 7, 7, 7 | 7, 7 |
| Answers right | all | all | all |

- **Live:** every reader got every answer right. They worked out which row was whose from where the creatures stand on the worlds, and counted their own marked cards to be sure.
  - "Nothing says which row in the top strip belongs to whom."
  - "The scale icon does not read as rival."
- **This pass:** the same answers, more quickly and with more confidence. Worlds won went from 8 to 9, and a reader called the counts "clear as numbers".
  - "My row sits above my twelve cards and has a person icon."
- **The dashed pennant:** on the final build, both readers read it as "one more wins the game", not as a fifth world won, though one gave that reading a confidence of 4.
- **Still open:**
  - The turn pointer is dim, and readers could not tell it marks the turn. All four moments were the player's move, so it never moved. Every reader took whose move it is from the rival's last line and the Pass key instead.
  - Fathomaw's missing art (a "?" in a dashed box) looks like a hidden or unplaced creature (open item 5).
  - On a phone the two counts stand side by side with no ticks ("2/5 6/11"), and only the denominators tell them apart.
  - "x/11" counts down while "x/5" counts up. One reader first read "10/11" as ten sent.

**A method finding.** The first fifteen readers ran on Sonnet, across three designs and three protocols (no rules; rules; rules plus crops). They scored every design 2 or 3, the live one included. They also:
- misread the world bars;
- took pennants for letters;
- misread fractions.

The first Opus reader on the same images got every answer right. So the flat Sonnet scores measured the reader, not the design. Blind readers now run on Opus with strip crops, and a result where every design scores the same low number is checked against a stronger reader before it is believed.

## Verified

- **Tests:**
  - All 1799 web tests pass.
  - The instrument tests cover each side's row, pennants in their worlds' colors, sockets, the meter and both counts, and the track's symbols.
- **Rules:** 639 of 640 rules tests pass on the Mac mini. The one failure is a generator test that timed out at 5 seconds under load; it passes when run alone (36 of 36). The rules typecheck is clean. No rule changed.
- **Table checks:** proving (1440, 1366 and 390, both views), shift (1366 send 0.0022), actflip and hotseat all pass.
- **The Clash gauge:** 46 to 55 percent of frames in motion over five runs, against 51 to 53 on the live site. The fighting world is 36 pixels shorter now.
  - The first build snapped the squad away at the Clash's start and read 48 to 49. With an explicit foot height, the squad folds away over 420 ms again.
- **Paint, at 1366 by 768, 1440 by 900 and 390 by 844:**
  - the Clash's foot bar and the Ruling's bar are each 36 pixels (35 on a phone);
  - no page scroll;
  - the Ruling's full line fits the top bar at 1366.
