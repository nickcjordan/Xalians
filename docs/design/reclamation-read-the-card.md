# Reclamation: read the card (pass 59)

Status: shipped in pass 59. It corrects `reclamation-one-side-per-number.md` (pass 58) where the two disagree: a card's columns are in their worlds' colors again, and the card carries no side's color at all.

## What Nick asked

Nick, 2026-09-24, on the pass 58 table in round 1:

> It's still not intuitive to me what these new icons are supposed to insinuate. It looks like you fixed some of the display where it's incorrectly showing a number or the number was confusing, but it looks like we regressed in some other areas [...] Why are all of the bars the same blue color before they were insinuating which planet they aligned to, right? So the color made sense there, but now they're all blue. So is that insinuating they can only go to the blue planet? I'm not sold on this whole amber versus cyan thing to denote the platoons. I feel like you're really stuck on that and it's causing issues. I also don't understand what the icons are beneath each bar or how each bar is calculated. Why do some creatures have the same number across all three bars and some creatures vary?

Pass 58 made "cyan is yours, brass is the rival's" the rule for every number on the table and turned every card column cyan. That rule was right about one thing, never adding the two sides into one number, and wrong to take a color channel the worlds were already using. On a round with Poseidas on the table, three cyan columns read as three votes for the blue world. Its assumption 2 ("the card's columns are cyan, not the world's color", 70%) was the wrong call, and Nick named it.

## How a creature's number at a world is made

The card has to show this, so first the rule, from the engine (`creatureOnTable.holdAtSite`):

1. **Its normal hold**, from its vitality, resilience and endurance. It is the same at every world.
2. **Times 1½ on its home world.**
3. **Times ½ where the world is too hot or too cold for it, or its air or water is wrong; times ¼ where it is far off.** A willful creature shrugs off one step.
4. **Plus or minus company:**
   - a bolster beside it lifts one step of strain, or adds a point when there is none to lift;
   - a pack creature gains a point per kin there;
   - a solitary creature loses a point per ally there.
   - A bolster lifts itself too; the rules say "allies at its world, itself included".
5. **Once rivals stand there, less what the Clash would take off it.**

So a creature with no mark shows the same number at all three worlds. Foromeer's 11, 11 and 11 is its normal hold three times. A creature whose home is on the table, or which a world strains, varies: On seed 7, Terragoyle's 15, 23 and 8 is 15 normally, 15 × 1½ = 22.5 at home on Stonera, and 15 × ½ = 7.5 where Telypso is too hot, each rounded (whole holds, below).

## What changed

1. **Each card column is its world's color again**, with a foot line in the same color. The column's order still matches the worlds above, and the house mark wears the world's color too.
2. **The card carries no side's color.** Its numbers are plain ink: bright where the send would take the lead, quieter where the rival would still lead. The rival's tag at the top (`12→0`) and the lead pointer are neutral ink; their place at the top of the column says they are the rival's.
3. **Each column shows its calculation.**
   - A dashed box rises to the creature's normal hold, and the fill shows what it holds at that world. A home column overflows its box, and a strained column falls short of it.
   - Under the column, the mark that did it carries its factor: the house `×1½`, a flame or a snowflake `×½` (`×¼` when far off), and the world's air or water struck out `×½` or `×¼`.
   - Company is `+1` beside two figures, and a bolster's own lift is `+1` beside its role mark.
   - A creature that would fall shows only its cross, because it holds nothing whatever the factors.
   - When two marks share a column, only the first carries its factor, so they never collide.
4. **A bolster lifting itself is no longer drawn as company.** On an empty world, pass 57 and 58 put two figures under a lone bolster (Nick's Bioflim, 15, 15 and 15), because the forecast counts the bolster's lift on itself. It now carries the bolster's own mark.
5. **Holds are whole numbers** (`rules.wholeHolds`, on).
   - The normal hold is rounded, and so is the hold at a world, once, after every factor.
   - Printing the factors exposed the rounding. A normal hold of 12.4 printed as 12, and its home hold of 18.6 as 19, and the first reader of this pass scored "how a number is worked out" 4 of 10 for it: "12 × 1½ shows 19".
   - Now 12 × 1½ is 18, and 13 × ½ is 6.5, shown as 7. Blows are unchanged.
   - The simulator barely moves (below).
6. **The ghost in each world shows how its number is made, in order, under it.**
   - It starts from the normal hold and applies each mark with its factor. When the Clash would take something, it adds what the creature arrives with and what the Clash takes: "+4" over `13 🔥×½ → 7 −3`, and "+7" over `13 ❄×½`.
   - A reader took pass 59's first "+4 🔥×½" for 4 being the halved number; the factor belongs to the arrival, so it stands before it.
   - When it also adds to your creatures already there (a shield covering one, a bolster lifting one), the chain ends with that too, beside two figures: `12 −5 +8` under +15.
   - The loss printed is the difference of the two numbers printed, so the chain always lands on the number above it. A blow of 3.5 would otherwise round up on both sides. `reclamation-proving.mjs` checks it, and caught the first chain, which left out the ally step.
7. **The match-point pennant glows in outline and stays empty.** Both of this pass's first readers took the filled glow for a fifth world already won.
8. **Words.**
   - The key and How to play explain the box, the marks and their factors, and the worlds' colors on the card.
   - The game's last line says "1 world", not "1 worlds".

The side colors stay where two sides meet on the table: a world's two bars, the creatures standing on it, the score rows. Nick's question about them is put to him directly rather than decided here (see Open).

## Assumptions and decisions

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 1 | Hue on a card means the world, never a side | 90%: Nick read the old world-colored columns and was misled by the cyan ones | Nick's message; pass 58 assumption 2 reversed |
| 2 | The calculation is shown as a box at the normal hold plus a factor beside each mark | 75%: the factor is the arithmetic, and the box shows its size without reading numbers | Nick: "how each bar is calculated"; the readers below |
| 3 | A lone bolster's self-lift is its own reason, not company | 90%: the rules include the bolster in its own lift; a two-figure mark on an empty world said something false | `reclamation-design.md` roles, bolster; seeds 11, 13 and 21 |
| 4 | Side colors stay on the world, the creatures and the score until Nick says otherwise | 60%: Nick is "not sold" on them, and both of this pass's readers found gold doing too many jobs (the rival, Zolton, Endessa, Luminax, the flame); but every reader since pass 52 has read whose-is-whose from them, and changing them table-wide is his call | Open question below |
| 5 | Holds are whole numbers (`wholeHolds`, on) | 80%: the factors printed on the card only explain a number if the arithmetic closes; the simulator moves within noise | `expeditionInterpretation.WHOLE_HOLDS`; the simulator below |

## Measured

**The engine.** Seeds 7 and 13, 500 matches each, whole holds off against on:

| | Off (seed 7 / 13) | On (seed 7 / 13) |
|---|---|---|
| Round-one starter win rate | 49.2 / 45.2 | 46.6 / 43.2 |
| Falls per match | 8.72 / 8.41 | 8.72 / 8.56 |
| The Clash changes the leader | 32.3 / 27.5 | 30.1 / 28.5 |
| Strike keeper win rate | 69.6 / 67.5 | 68.2 / 66.6 |
| Sweep / bolster / shield keepers | 46.9, 43.4, 45.4 / 52.8, 41.4, 51.3 | 47.1, 44.6, 48.5 / 52.1, 44.1, 48.2 |
| Comeback after trailing round 1 | 31.6 / 30.3 | 26.8 / 29.3 |

Every difference is inside the intervals. The largest, comeback, is 31.0 against 28.1 pooled over 1000 matches each, 1.4 standard errors. Ties to the Court rise from 0.1 and 0.0 percent to 0.2 and 0.3 percent, as whole numbers make exact ties possible.

**Blind readers.** A new protocol built on Nick's questions: what the columns' colors mean, what each mark means, how Terragoyle's three numbers are made, why Foromeer is the same at every world, Figzy's normal hold, and each side's hold after a send. Five moments of seed 7 at 1896 by 1100. The rules paragraph no longer names the side colors.

| | Pass 58, live | Pass 59, first build | Pass 59, as shipped |
|---|---|---|---|
| What the column colors mean | "the fill means yours"; the world only from "a thin strip under each bar" | each column is its world, sure | each column is its world, sure |
| How Terragoyle's numbers are made | right, but "the rounding never reconciles" | right, but "the arithmetic doesn't close" (12 × 1½ showing 19) | right; "I could back out every base value exactly"; halves round up everywhere |
| Figzy's normal hold (8) | right | right | right, sure |
| Each side's hold after a send, who leads | right | right | right |
| What each number means (1 to 10) | 5 | 6 | 5 |
| How a number is worked out (1 to 10) | 5 | 4 | 4 |
| How easily you could make a good move (1 to 10) | 6 | 5 | 6 |

The scores for how a number is worked out did not rise. The last reader split its answer. On home and climate, "temperature and home are well exposed; I could back out every base value exactly". On the fight, it said the fight "is shown only as results with no cause": why Graviclaw takes a rival's 12 at one world and nothing at the next. The fight's cause is the open item this pass leaves.

All three readers found the side colors doing too many jobs. Gold stood for the rival, for Zolton's column, for Luminax and Endessa, and for the flame; in the rival's move, "the gold frames around all three panels read as rival owns these worlds".

## Open

- **For Nick:** whether the two side colors should leave the table altogether, with sides told only by position (the rival above, you below; the rival's row above yours).
- **The fight's cause.** A card and the ghost show what the Clash takes off a creature and what it takes off the rival, but not why: which rival does it, and why a creature takes a whole rival at one world and nothing at the next (a shield there, speed, a sweep).
- **A column's verdict.** Three readers across passes 57 to 59 asked for each column to say who would lead ("7 v 0") instead of leaving it to the bright or dim column and the two numbers at its two ends.
- **The send counter** is still read as one fewer than the creatures in hand; nothing on the table says one always stays back.
