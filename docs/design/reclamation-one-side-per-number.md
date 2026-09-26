# Reclamation: one side per number (pass 58)

Status: shipped in pass 58. It builds on `reclamation-attention-and-why.md` (pass 57); where they disagree, this document wins.

Pass 59 (`reclamation-read-the-card.md`) reversed this document's assumption 2: Nick read the cyan columns as pointing at the blue world, and a card is only ever yours, so its columns wear their worlds' colors again and the card carries no side color. The rest (never adding the two sides; the rival's side at the column's top) stands. Pass 60 (`reclamation-sides-by-position.md`) then took cyan and brass off the whole table: "cyan is yours and brass is the rival's" below is history, and a side is now told by position.

## What Nick asked

Nick, 2026-09-24, on the pass 57 table. The rival had sent Bioflim (14) to Endessa, and he was pointing at Scalatto, whose card read 13, 34 and 13:

> On the world where there's no other creature, I understand how the number 13 aligns to plus 13. That makes sense. They have 13 power or hold or whatever, and when they land on that planet, that 13 goes to my side. What doesn't make sense is what's happening in the middle. [...] I see 20 on my bar, which is, I guess, supposed to represent being higher than 14, but I don't really know what that means because when you look down at the three-bar section for my creature, it shows 14 as my attack for that location. But it also shows 14 as the attack for the other creature. So I don't really know what's happening here. Why does it show 20 plus 14? Why is it adding my health and the opponent's health?

His reading of the empty world is the right model: a number is what goes to one side. The middle world broke it in four places at once:

- the card printed 34, Scalatto's 20 plus the rival's 14;
- the card's column stacked the rival's 14 in brass on top of Scalatto's 20 in Endessa's sand color, and the two colors are nearly the same, so it read as one orange bar with a 14 halfway up;
- the ghost printed +34 and "20+14" under it;
- the rival's bar at Endessa lost its number, because the preview took it to 0 and a 0 was not printed, so his eye took Bioflim's own 14 as the rival's total and read the world as 20 against 14.

## Every number on the table

The pass began by listing every number the table shows, what it counts in the engine, whose it is, and whether it adds the two sides.

| Where | What it counted (pass 57) | Whose | The problem |
|---|---|---|---|
| Card, per world | swing: your gain plus the rival's loss | both | added the two sides |
| Card column | your hold in the world's color, the rival's loss stacked on it in brass | both | added the two sides; sand and light worlds look brass |
| Ghost on a world | the swing, and "own+taken" under it | both | added the two sides |
| Rival's bar in a preview | the rival's total after the send | rival | the number was left off at 0 |
| A rival creature your send would down | its hold, struck, in your cyan | rival | a rival's number in your color |
| Numbers beside the pennants | sends left | each side | read as the score (round 3 of seed 7: 4 pennants and a 4, 2 pennants and a 7) |
| Swift creature's move column | the move's swing summed over all three worlds | both | added the sides and the worlds |
| Card title | "+33.9 your way, 14 of it off the rival" | both | the sum in words |
| Sweep caption | "−2 to each of 1" | | reads oddly for one target |
| A creature's hold in the Clash | small ink number | its side | the number the fight is about was the smallest on the scene |
| How to play, the legend | pass 52's line across a world, "how far it moves the world your way", a brass foot for home, the numbers and band as advanced-only | | described a table that no longer exists |

Everything else on the table already counts one side: the world's two bars and their totals, a creature's hold bar, the Ruling's pennants, the round track.

## The rule

**A number, a bar and a color belong to one side. Cyan is yours and brass is the rival's, and nothing adds the two.** A change sits where it happens: what your side gains is on your side (your card's column, your ghost, your bar), what the rival loses is on the rival's side (the top of the card's column, the rival's creature, the rival's bar). The world says the result: each side's total after the Clash, both printed.

The card mirrors the world. On a world the rival stands above and you below; on a card the rival's part hangs from the top of each column and yours rises from its foot, with the number at the foot.

## What changed

1. **The card's column is your side only** (`reclamationInstruments.FitStrip`). Its number is what your side there would gain (`gain`, what the creature would still hold after the Clash plus what it adds to your creatures there), printed under the column in cyan. The column is that gain in cyan, a lighter part for what it adds to allies, and hatched red on top what the Clash would take off it. The world's color is gone from the column: position already says which world, and two worlds (Endessa, Luminax) are brass-colored.
2. **What a send does to the rival is a brass tag** hanging from the top of the column: hatched brass, with the rival's total at that world now and after the send (`12→0`). The first build printed the change (`−12`), and a blind reader took a minus sign on their own card for their own loss; the rival's two totals cannot be read that way. The text sizes to its column, so it fits at 1440 wide. Once any card on the bench has a tag, every column keeps its top quarter for tags (`FIT_RIVAL_ROOM`), so the columns stay on one scale. On a phone the column is narrower than the text, so the tag is a brass cap and the lifted preview gives the numbers.
3. **The pointer on the column is what the rival would still lead by after the send** (`clear`, the rival's total after it less what you already have there). A column that passes it would put you ahead, and is lit; a send that downs the rival's whole side leaves no pointer. It had been the rival's lead before the send, which a column of your gain alone could not be read against.
4. **The ghost prints the card's number**, your gain there with its marks, and nothing else. The "20+14" line is gone.
5. **The rival's bar prints its total in a preview even when the send takes it to 0**, beside the hatched run of what it loses, so each world reads as "you 20, rival 0".
6. **A rival creature your send would down keeps its number in brass, struck through.** The cross over it stays cyan: that is your blow.
7. **The sends left are set apart from the score**: a divider, a piece glyph, the ticks in groups of five, then the count at a smaller size. The pennants grew. A bare numeral beside the pennants read as the score.
8. **A swift creature's move column reads like a send** at the world it would join: your gain there, the rival's side on a tag, the pointer. The world it would leave is its own column.
9. **One world from winning, a side's deciding pennant burns** in its color. Both first readers found the rival one world from the game only by counting flags, and the round track's squares, misread by both at 16px, grew to 20px.
10. **On a phone, the ghost beside a creature already there** drops its silhouette and sits in the rank's top corner, where it no longer covers that creature's name.
11. **In the fighting world, each creature's hold grows with its piece** (up to 26px, scaled to how crowded the rank is), in its side's color, and the blow's number rises over its target at the same size.
12. **A world at rest wears no side's color.** Its frame was brass, the rival's color, and the last reader counted it among the things pulling the eye the wrong way. It is neutral now until a moment gives it one (your lift, the rival's move, the Ruling). Each card column keeps a foot in its world's color, so a column still names its world without being mistaken for a side.
13. **Words.** The card title says each side apart and who would lead ("Endessa: it would hold 20; the rival would lose 14 there (one creature downed); you would lead 20 to 0"). A sweep that catches one creature is told as the one blow. How to play and the legend describe the table as it is.

## Assumptions and decisions

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 1 | The card number is your side's gain, not the swing | 85%: Nick's own reading of the empty world is exactly this, and the swing is not a quantity shown anywhere else on the table | Nick's message; `reclamationFit.fitTable` (`gain`) |
| 2 | The card's columns are cyan, not the world's color | 70%: color means side everywhere else, and two worlds are brass-colored; position and the lit column on pointing still tie a column to its world. Nick may miss the colored columns | `r2-mine` captures, before and after |
| 3 | The rival's side is a tag reading its total now and after (`12→0`), not a bar or a change | 75%: a strike usually takes the whole rival side, so a bar would repeat the rival's own bar; the change (`−12`) read as the player's own loss | the seed 7 captures; the first after-reader's J answer |
| 4 | The number moves under the column | 65%: it puts the rival's tag and your number at opposite ends, as the world puts the two sides; in the first build the tag hung directly under the number, and the two read as one pair | the pass's own captures, number on top against number underneath |
| 5 | The pointer is the rival's lead after the send | 80%: it is the one line a column of your gain alone can be read against | `reclamationGlance.test.js`: the column passes it exactly when you would lead |
| 6 | The sends left keep a count, qualified by a piece and set apart | 70%: the count matters for planning; the problem was where it sat | round 3 capture, seed 7; the after-reader read them as sends left where the before-reader could not tell |
| 7 | The match point is drawn, not written | 70%: a state of the score, not a suggestion; both first readers named it the loudest fact the table kept quiet | both readers' A answers for P5 |

## Measured

**Blind readers.** Seed 7 at 1896 by 1100 (Nick's screen), five moments (round 1 at rest; round 1 with Hippochamp lifted; round 2 just after the rival's send; round 2 with Graviclaw lifted; round 3 at rest), the pass 54 rules paragraph, no key, one reader per build. The questions were new for this pass and ask what each number counts and whose it is, what each side would hold after a given send, who would lead, and the score; the answer key is the engine's (`_cap58` dumps each card's gain, the rival's before and after, and each world's totals). "Before" is the live site (pass 57). The first after-reader read the build with `−12` tags; what it named drove the `12→0` tag, the match point, the larger round track and the neutral frames, and a fresh reader read the build that ships.

| | Before (pass 57, live) | After, first build (`−12` tags) | After, as shipped (`12→0` tags) |
|---|---|---|---|
| **What each number means and whose it is (1 to 10)** | **4** | **5** | **6** |
| **Why a creature is worth more at one world (1 to 10)** | 5 | 5 | 5 |
| **How easily you could make a good move (1 to 10)** | 6 | 7 | 7 |
| C. Hippochamp to Endessa: each side's hold and who leads (7 to 0) | right by subtracting 12 from the card's 19; "the 7 appears nowhere", so the 7 itself a guess | right, fairly sure, "only after comparing with P4" | right, fairly sure, read straight off the card's 7 and its `12→0` |
| D. Graviclaw at Endessa (3 to 0, Venemist downed) | right | right, sure | right |
| E. Scalatto or Hippochamp at Endessa (Scalatto, 14 on its home world, against 7) | right, by subtraction | right | right |
| F. Terragoyle 15, 22, 7 (home Stonera; Telypso too hot) | right | right | right |
| G. The score, and what the two top numbers count (4 to 2; sends left) | score right; the numbers "cannot tell" | score right; the numbers sends left, fairly sure | score right from the flags and the round track, sure; the numbers fall one per send |
| J. The most confusing thing | "each card number is a sum of what I would keep plus the rival strength I would remove" (Nick's point, found unprompted) | the brass `−12` on your own card "reads as you lose 12" | the send counter beside the flags |

The before-reader, with no prompting about sums, named the summed card number as the most confusing thing on the screen and proposed the change this pass makes: "make the headline the hold-after number in cyan, and show the removed rival strength as a small brass mark". All three readers got the whole-game score right from the flags; only the last also read it from the round track (both earlier readers misread a round's three 16px squares).

Still open from the readers:

- **The send counter.** Every reader works out that it falls one per send, but it is one fewer than the creatures in hand (one always stays back), and it sits in the score's row. One reader asked for it beside Pass as well.
- **Lifting marks a cross over the rival at every world at once**, which reads as "it downs both" to a hurried reader (named by readers in pass 57 and pass 58).
- **Rounding.** A creature's 3.4 and a ghost's 3.3 print as 3 and +3 beside a total of 7.
- **The fight side of "why".** Home and climate are drawn; why one creature loses more in a fight than another, or takes a rival only to 11, is in the dossier and the history but not on the table.
- **Round 1's worlds are empty and still the largest thing on the screen** (all three readers), and the Stake key explains nothing until pressed.

## Checks

- Web tests pass (1668), including new ones for the gain, the rival tag, the pointer, the card title, the rival's 0, the match point and the one-target sweep.
- The four table checks are green. `reclamation-proving.mjs` now also holds the lifted creature's ghost number to its card's number at every world. A build whose ghost printed the old sum fails it ("the card prints 9 and the ghost +22").
