# Reclamation: the glance redesign (pass 52)

Nick, 2026-09-23, looking at round 1 of a live game:

> We need to work on the UX regarding how to help the user make a decision. And I don't mean giving me a suggestion. What I mean is having the right affordances in place to where it's easy for me to quickly glance at the screen and understand what I'm looking at. Right now, I have to click each of my creatures to see the things that would be factors in my decision making. [...] I think there's too many words on the screen. Saying you versus rival to indicate which side of the battlefield holds your stuff should not be required. [...] I don't want labels. [...] I see numbers on the screen. And I guess generally I have an idea, but none of that's intuitive. [...] I want you to go through a full redesign with this concept in mind for a better UX with more visual affordances and less labels and less text and less need to click everywhere on the screen to get an idea of how to proceed.

This is the brief for the table during Deploy, the Clash and the Ruling. The intro, the draft and the report are unchanged by this pass.

## What a decision needs, and where the old table kept it

A send is one creature to one world. What decides it, in the order a player weighs it:

| Question | Old table, at rest | Where the answer was |
|---|---|---|
| Who is winning each world? | A thin bar under the world name between "RIVAL 12" and "0 YOU", plus "Unopposed: the rival takes it" | Readable, but as labels and two bare numbers |
| Which of my creatures is good at which world? | One world name per card (its best world), and three names under each world | Every other pairing needed a hover or the dossier |
| Would this creature take that world? | Nowhere | Lift it, then read a sentence on each world |
| What does it do in the Clash? | A glyph | The dossier |
| How much of the game is left, and can I afford it? | "Round 2 of 3", "8 sends left for 6 worlds", "You need 5 more of the 6 worlds left to win" | Three sentences |
| What is the score? | "YOU ▢▢▢▢▢ 0 / RIVAL ■■■▢▢ 3" | Labels, pips and a digit saying the same thing |

The middle three rows are the decision, and none of them could be read at a glance.

## Principles

1. **Whose is shown by where and in what color, never by a word.** The rival is always above and brass; you are always below and cyan: the score, every world, the bench at the foot of the screen. No "you", "rival", "yours so far" or "unopposed" tags.
2. **Every number sits on the thing it measures.** A hold is the length of a bar with its number at the end. A world's totals sit on the line that divides it. A number never floats alone.
3. **The consequence is on the screen before the click.** What each creature would do at each world is drawn on its card all the time, computed by the engine's own forecast of that exact send.
4. **Information, not advice.** The table shows what would happen; it does not pick. The "best here" names, the "suggested" card and the suggested pass are gone.
5. **Words only for news.** The top bar speaks when something happened that the board cannot show (the rival passed, a warning that the game is slipping out of reach, the Ruling). There is no standing instruction.

## The three instruments

### 1. The front line (each world: who is winning)

The world's field is split by a horizontal line into the rival's ground above it (brass) and yours below it (cyan). The line sits where the two totals put it: at the middle when level, pushed toward you when the rival holds more, toward the rival when you do. A world only the rival stands on is brass all the way down, so "the rival takes it" is a color, not a sentence. An empty world has no line and no tint.

The two totals sit on the line, the rival's just above it and yours just below it, so each number is read as that side's strength.

During Deploy the line is drawn from the Clash forecast (the engine's `forecastClash`, what the Ruling would decide if the round ended now, blind to the rival's hidden sends). During the Clash it follows the live holds as blows land, and it ends where the forecast said it would unless something hidden changed it. So the line a player reads while choosing is the one they then watch play out.

Lifting or pointing at a creature moves every world's line to where that send would put it, with the ground it would gain hatched, and marks on every figure what that send would cost it.

### 2. The hold bar (each creature on a world)

Under every figure: a bar in its side's color, its length the creature's hold on a fixed scale, its number at the end. The part the Clash is forecast to take is striped red at the bar's end; a creature forecast to fall has its whole bar struck through and an ✕. The text chips "you lose it", "you down it", "own sweep" and "no target" become those marks (a strike with nothing to hit shows its role glyph crossed out).

### 3. The fit strip (each card on the bench)

Every card carries three short columns, one per world, in the same left-to-right order as the worlds above and in each world's element color. A column's height, and the number printed on it, is **what sending this creature there now would do to that world**: the change in your forecast margin there, from the engine's own forecast of that exact send (`forecastSend`). That one number folds in hold, strain, home ground, and what the creature's blow or shield would do to what already stands there, so a striker's column grows at a world where it has something to hit.

Where the rival leads a world, each card's column for it carries a brass tick at the height of that lead. A column that clears its tick is lit full: this creature alone would take the lead there; one that falls short is dimmed. The number sits on its column in the same unit as the totals on the world's line, so "18" on a card against "12" on the world is the whole comparison.

Pointing at a world lights its column on every card and dims the other two, so the bench reads as a list for that world. Pointing at a card previews it on every world (instrument 1).

## The screen, part by part

### Top bar

- **Leave** stays (the way out is always visible).
- **Round track** replaces "Round 2 of 3": three groups of three squares, one square per world of the game. Played worlds fill in the winner's color (a tie stays grey), a staked world is drawn double, and the current round's group is lit.
- **Score**: two rows of five pips, the rival's brass row above yours in cyan, each followed by that side's sends left as a chevron and a count (read the way a game prints a resource). No words. A small pause mark after the rival's row says the rival has passed.
- **Turn lamp**: "Your move" or the rival's lamp. Kept: it is a state, not a label.
- **Message slot**: only news. The rival's last move in one short line, the reach warning when the game can no longer be won without a stake or at all, the stake question, "No sends left", and the Ruling. "Pick a creature from your squad" and "Pick a world for X" are gone after a player's first Clash: the bench and the worlds light up instead.

### Worlds

- Head: element dot, planet name, the stake mark or stake button, over a rule in the world's element color. The element's symbol stands large and faint in the field, so the color on the bench's fit columns has somewhere to come from.
- Gone: the tally row, the "RIVAL" and "YOU" edge tags, "Unopposed: ...", the empty-world count ("1 of your 12 hold well here"), the "Best here" chips, and the lifted creature's sentences (strain note, "you already lead here by", the role summary). Each is replaced by an instrument above.
- A hidden rival send is a silhouette with a count, no sentence.
- The Ruling: a pennant in the winner's color with the printed margin ("+10") sits in the middle of the world, and the world's border takes the winner's color; a tie shows an even mark. The line stays where the totals put it, so how close it was is still visible.

### Bench

- Cards: portrait, name, role glyph, fit strip, the stealth mark, the dossier button. The best-world name and "suggested" are gone.
- A card already sent shows only the column of the world it went to. Won, fallen and spent cards dim with a mark.
- Head: Stake ×2 and Pass (the sends left moved up beside the score). The act picker and swift moves are unchanged.

### Advanced mode

Keeps everything above and adds its arithmetic: numbers on the fit columns, speed, attribute lanes, the environment scale and the log.

## Teaching the marks

The table has no labels, so a first game gets its key once: a number pinned on each instrument where it actually is on the screen (the round track, the score, a world's totals or the world itself when nobody stands there yet, a creature's hold bar, a card's fit strip, a card's role, the stake), with a short key beside them. It opens by itself the first time a browser plays, and from the ? key after that; its own button opens the full rules. It never blocks the table: the first press anywhere, or Escape, puts it away, and that press still does what it would have. It does not open under automation, so every check and capture reads the table at rest (`reclamationLegend.js`).

## How this is measured

**The glance test** (`apps/web/scripts/reclamation-glance.mjs`): a fixed policy plays a seeded game to three positions (round 1 opening, round 2 mid-round, round 3 opening) and screenshots each at rest, nothing hovered, beside a dump of the engine's state. A reader that has seen neither the code nor this document gets the pictures and a paragraph of rules and answers questions a player must answer to choose a send (score, round, who leads each world and by how much, which creatures would take a given world, where a given creature is strongest, sends left, whose move). Answers are scored against the dump. The same questions run on the old table and on this one.

The one-screen checks (`reclamation-shift.mjs`, `reclamation-proving.mjs`, `reclamation-actflip.mjs`, `reclamation-hotseat.mjs`) must stay green. `reclamation-proving.mjs` now also asserts that every card in hand shows three numbered fit columns inside its own box, and that a lifted creature's preview stays inside its world and clear of the totals.

## What the glance test measured

Seed 7, the fixed policy's three positions at 1440 by 900, one fresh reader per column, each seeing only its screenshots and the paragraph of rules. 41 answers are checkable against the engine's dump.

| | Old table | New, bars without numbers | New, numbers on the bars | The same, after the key's first look |
|---|---|---|---|---|
| Score, round, who leads each world (15) | 15 | 15, at lower confidence | 15 | 15 |
| Best creature for each world (9) | 6 | 4.5 | 9 | 9 |
| Which creatures would take a rival-held world (8) | 2 | 3 | 8, no false positive | 8, no false positive |
| Where a named creature is strongest (3) | 3 | 3 | 3 | 3 |
| Sends left (3) | 3 | 0 | 3 | 3 |
| Whose move (3) | 3 | 3 | 3 | 3 |
| **Total (41)** | **32** | **28.5** | **41** | **41** |
| Reader's own ease score, 0 to 10 | 5 | 4 | 4 | 6 |

The first redesign lost ground: bars with no numbers and no key were read as shapes, and the chevron pips could not be counted. Numbers on the bars made every checkable answer right. The ease score only rose once the reader had seen the key once; without it, every reader's first complaint was that nothing is labelled, which is the trade Nick asked for and the reason the key exists. One reader per column is a small sample; the checkable answers are the reliable part.

What every reader still asked for: the rival's remaining squad (hidden by design; the rival's sends left are now shown), which role glyph is which (the key says it in words; the dossier and each glyph's title say it per creature), and whether the numbers count the Clash (they do; the key now says so).

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting evidence |
|---|---|---|---|
| 1 | "I don't mean giving me a suggestion" means the existing suggestions go too (best-here names, suggested card, suggested pass), not only that none are added | 70%: the sentence contrasts suggestions with affordances; the fit strip carries the same information as the best-here names without choosing | Nick's message; `reclamationWorld.js` BestHere, `reclamationBench.js` suggested |
| 2 | The fit column measures the forecast margin change of the send, not the creature's raw hold | 75%: margin change is what the send decides; raw hold hides what a striker or shield does. Raw hold stays on the figure after the send and in the dossier | `forecastSend` in `expeditionRules.ts` |
| 3 | The line and the totals show the Clash forecast during Deploy, not the current holds | 80%: the Ruling compares what is left after the Clash, and pass 38 already moved every table number to the forecast | `forecastClash`, pass 38 in `reclamation-declutter.md` |
| 4 | Rival above in brass and you below in cyan is learned from the board without a legend | 70%: the bench (yours) is at the foot of the screen and cyan; the glance test checks it | glance test |
| 5 | The turn lamp keeps its two words | 65%: it is a state rather than a label and nothing else says whose turn it is while the rival is thinking | top bar |
| 6 | The Clash caption on the clashing world stays | 60%: Nick's message is about deciding; the caption is the only place a blow is named, and the bars now carry the amounts | pass 45 |
| 7 | Numbers stay on the fit columns in simple mode | 85%: the first blind reader, with bars alone, got fewer answers right than on the old table; with the numbers, all 41 | "What the glance test measured" above |
| 8 | A one-time key, pinned on the live table, is not a label | 70%: it is shown once and put away by the first press; the board itself carries no words | `reclamationLegend.js` |
| 9 | The strain hatching and the home mark leave the fit strip | 75%: both readers who saw them could not say what they meant, and both are already inside the number; the preview still shows strain and home with their reasons | blind runs B and C |
