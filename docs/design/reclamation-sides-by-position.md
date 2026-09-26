# Reclamation: sides by position (pass 60)

Status: shipped in pass 60. It takes the side colors off the table. Where `reclamation-one-side-per-number.md` (pass 58) and `reclamation-read-the-card.md` (pass 59) name cyan and brass as the two sides, this document wins.

## What Nick asked

Pass 59 left Nick one question: should amber and cyan leave the table, with sides told by position? He had said, on pass 58: "I'm not sold on this whole amber versus cyan thing to denote the platoons. I feel like you're really stuck on that and it's causing issues."

His answer, 2026-09-24:

> yeah i am fine with removing the use of amber and cyan to denote sides, i think you can do that in better ways

## The rule

Every hue on the table now has one meaning:

- **A world's hue is the world.** It is on the world's name, the round track, a card column, and now the world's two bars and the bars of the creatures standing on it.
- **An element's hue is on the badge at a creature's foot**, and nowhere else.
- **Red is what the Clash would take from you**: the hatched end of your bar, a card column's hatched top, a cross over a creature of yours that would fall.
- **Everything else is ink**: every number, the flags, the send ticks, the turn pointer, the frame round a world you can send to, the creature lifted, the creature acting in the Clash.

Before this pass the table used gold for five things at once: the rival's side, Zolton, Endessa, Luminax, and the flame. The three pass 59 readers each named that as a problem.

## How a side is told now

1. **Position, everywhere.** The rival is above and you are below, in every place the table shows two sides:
   - each world, its ranks and its two bars;
   - the score, the rival's row of pennants over yours;
   - the round track: a won world fills its top half for the rival and its bottom half for you, in the world's own hue, and a tie fills a band across the middle.
   - Your squad sits at the foot of the table, and the creature you lift appears in the lower half of every world.
2. **The rival's emblem on its score row.** The rival's row of pennants ends with the emblem of the rival chosen in the lobby (the Envoy's hourglass, the Proctor's scales), where yours ends with the piece. The first reader of this pass had to count sends against the squad to be sure which row was theirs. Hot-seat has no rival persona, so both rows keep the piece.
3. **Words, where there are words.** The Clash's line on the world names your creatures "your" and leaves the rival's bare: "Your Frackworm downs Venemist", "Venemist strikes your Hippochamp: −3, 7 left". There are only two sides, so a bare name is the rival's. A blow on a creature's own side keeps "its own". The history and the Ruling's line already said "your" and "the rival's".
4. **Whose move** is the pointer at the head of that side's row. On your move your squad's frame is lit. When you lift a creature, the frame moves to the worlds you can send it to. On the rival's move the squad dims, and the rival's half of every world brightens faintly where its creature will land.
5. **The Ruling** plants its pennant at the end of the winner's bar, and dims the loser's bar, as it did before. The world's frame no longer changes color for the winner.

## What changed

- **Side tokens.** The two side tokens (`--rec-you`, `--rec-rival`) are retuned to ink inside the match, not deleted. So every older rule that names a side still paints, only neutrally, and the pass 60 block in `reclamation.css` gives each job its own look.
- **Creature rims.** The rim of light round every silhouette was the side's color. It is now one neutral rim (`PIECE_RIM`, ink mid) for both sides, on the table, on the cards and in the draft.
- **Bars.** A world's two bars, and a creature's own bar, are in the world's hue. They match the card columns that feed them: the column's number is what the send adds to the bar of the same color.
  - What your send would take off the rival is hatched in the world's fading hue, not red. Red stays yours; pass 57's reader read the rival's red hatching as danger.
- **Less gold.** The creature acting in the Clash is framed in ink, not brass, and so is the Ruling's bar edge.
- **Words.** The key and How to play say where each side is and what each color means; the "brass tag" and "brass pointer" are just a tag and a pointer.
- **The key fits the screen.** Its list scrolls and its buttons stay in view. Nine entries ran past the bottom of a 1100-pixel screen, and "Got it" could not be reached.
- **The phone's top bar shows the whole score.** A later desktop rule had given the bar five columns at every width, so on a phone the three tool buttons sat over the end of the score and hid both sides' sends. The tools now sit at the end of the bar's second row, beside the news, which may run to three lines; the bar is 8 pixels taller (100) to hold them.
- **The proving check waits for the table.** It read the mode switch the moment the network went quiet, 500 ms after the last request, but the table takes 550 to 650 ms to build its creatures from the seed. It failed on main as often as on this branch; it now waits for the switch to be drawn.
- **Out of scope.** The Duel keeps cyan and brass; its tokens are shared and untouched.

## Assumptions and decisions

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 1 | Sides are told by position first, not by a replacement color or shape | 85%: Nick asked for "better ways" than a color; position is how a table already works (your side is the near side) and costs no new channel | Nick 2026-09-24; pass 59 readers on gold |
| 2 | A world's bars wear the world's hue, not ink | 70%: it ties the card column to the bar it feeds; the cost is that both bars at a world share a hue, so position alone says whose | `reclamation-read-the-card.md` (card columns in world hue) |
| 3 | The rival's loss is hatched in the world's fading hue, not red | 80%: red means your loss; a reader read the rival's red as danger in pass 57 | ownership log, pass 57 |
| 4 | The round track fills the winner's half rather than showing a mark | 65%: it repeats the table's one rule (rival top, you bottom) at 20 pixels; at 9 pixels on a phone a half is 4 pixels | captures at 1896 and 390 |
| 5 | Only your creatures carry "your" in the Clash's line | 80%: two sides, so marking one is enough, and the line stays one line in a phone column | captures at 390 |
| 6 | The rival's emblem marks its score row; yours keeps the piece | 70%: an identity mark the game already has (the lobby's rival card), not a label; a blind reader does not know the emblem, but two different marks at least say the rows are two different parties | first reader of this pass, question B |
| 7 | Ink for every interface state (can send here, lifted, acting, your move), mint kept for the primary buttons | 75%: one loud subject per moment (pass 57); mint on the table would read as a third side | `affordances-not-labels` rule, pass 57 |

## Measured

**Paint audit.** Each side color was repainted a hue used nowhere else (magenta for yours, pure green for the rival's), and every element of the table was checked for either, at 18 moments of one game: both turns, a creature lifted, the rival's move, three Clash frames, two Rulings, the report, the history and the key.
- On the live pass 59 table, 77 kinds of element carried a side color, across 17 of the moments.
- On this build, none do.
- The creatures' rims are drawn by an SVG filter, which the audit cannot see; they were changed in code and checked by eye.

**Blind readers.** Every reader read six screens of one game with the same seed, before and after:
- round 1;
- round 2 after the rival's send;
- a creature lifted;
- the rival's move;
- a Clash frame;
- the Ruling.

The rules they were given no longer said which half of a world is whose.

| | Pass 59, live (side colors) | Pass 60, first build | Pass 60, as shipped (with the emblem) |
|---|---|---|---|
| Every question answered right | yes | yes | yes |
| Telling yours from the rival's (1 to 10) | 7 | 5 | 6 |
| What each number means | 4 | 4 | 4 |
| How easily you could make a good move | 6 | 6 | 6 |

- All three readers answered every question right: whose each creature is, the score, whose move it is, each world's standing, the Clash, the Ruling, and all six results on the round track.
- All three chose the same move, for the same reasons.
- The before-reader named gold as the worst collision: "Gold is the rival, but also the Zolton, Luminax and Endessa hues and the frame on my acting Frackworm." No reader after the change found a color that meant a side.

**What the scores say.** Losing the color cost confidence, not accuracy, and the cost sits in one place: the score rows.
- Both readers after the change worked out which row was theirs by counting sends across screens.
- The last reader's most confusing thing: "Two rows of flags and ticks carry a scale icon and a person icon, with no words."
- The emblem earned back one point but is not enough on its own: "a balance scale does not say 'rival' to me."
- The worlds, the Clash and the Ruling read by position with no trouble ("Top-versus-bottom placement is consistent and the captions confirm it").

**Also found:**
- Dullness means four things: trailing, not your turn, out of focus, and fallen.
- The element badges are now the loudest colors on a creature. One reader, whose two creatures on the table were both of the sand element, read orange as "mine".

## Open

- **The score rows.** Readers want to know which row is theirs without counting. The next step is to seat your row with your squad at the foot of the table, where your hand is, and keep the rival's at the top: position, not a label. The Clash folds the squad away, so the row needs a home that survives it. If position still is not enough, the fallback is the two words Nick ruled off the board.
- Dullness carries four meanings (trailing, waiting, out of focus, fallen).
- A verdict per column ("7 v 0"), asked for by readers in passes 57 to 59.
- The fight's cause on the card and the ghost (which rival takes what, and why).
- The send counter's one held back.
- Carried: whether element should matter; strike keepers near 67 to 68 percent.
