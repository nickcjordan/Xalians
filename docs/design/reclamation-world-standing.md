# Reclamation: the world's standing (pass 54)

Status: shipped in pass 54. It replaces pass 52's front line (`reclamation-glance-redesign.md`, "The front line"); the rest of that brief stands.

## What Nick said

Nick, 2026-09-23, looking at round 1 with a creature lifted and then with one pointed at:

> Is the solid versus the striped section supposed to indicate [something] at this point in time? I don't see a reason for there to be a distinction between anything, so it just looks weird that all the squares are split that way. I like the addition of showing the bars to visually represent how a creature is expected to perform at each location. [...] If you're going to show a number, a number in the top left corner of something is next to useless. [...] That should not be the only indicator, and it should not be the primary indicator. [...] Go through each of these affordances and ask if it's actually providing value and if it is supposed to be providing value, is it displaying in the right way.

## Why every world was split the same way

Pass 52's front line drew a **share**: the rival's part of a world's total against yours, as the height of the brass ground above a line and the cyan ground below it. The hatched band was the ground the lifted creature would take. A share says nothing when one side is absent. At the start of a round nobody stands anywhere, so any send takes the whole of every world: a creature that would hold 5 and one that would hold 16 moved the line to the same place, and all three worlds showed the same half-hatched field. Mid-round it had the same flaw in a quieter form: a 3 against nothing filled a world as completely as a 30 against nothing. The only amounts on the world were the two small totals in the corner, which is what Nick called next to useless.

## The audit

Every mark on the deploy table, what it is there to tell, whether it tells it, and what this pass did.

| Where | Mark | Meant to tell | Does it? | Pass 54 |
|---|---|---|---|---|
| Top bar | Leave | the way out | yes | kept |
| Top bar | Round track (three groups of three squares) | which round of three; who won each world played; how many worlds are left | yes; the only record of how many worlds remain | kept |
| Top bar | Score pips (five brass above five cyan) | worlds won toward five, each side | the first blind readers took them for more of the round track | **pennants**, the flag the Ruling plants: filled for a world won |
| Top bar | Sends (chevron and a number) | the sends each side has left | the chevron does not say "sends", and a bare 11 beside five pips reads as a score | **a tick per send the game allows, lit while unspent, the count after**; a phone keeps the count alone for room |
| Top bar | "YOUR MOVE" with a lamp | whose move it is | yes, but it is a label, and a phone never showed it | **a pointer at the head of that side's scoreboard row**, pulsing in its color, the other row's head empty; the words are gone |
| Top bar | Message line | news: what the rival did, the Ruling, a rule the moment needs | yes; a first game also gets one instruction until its first Clash | kept |
| Top bar | History, ?, settings | reference on request | yes | kept |
| World | Name with an element dot | which world; its color ties it to its column on every card | the dot is too small to carry the color | **the element's symbol** (the mark its natives wear) in place of the dot, and **a wash of the world's color along the head** |
| World | Split field, solid and hatched | who holds the world, and what the lifted creature would change | no: a share, so identical on every empty world | **removed**; the field is no longer tinted by who leads |
| World | Totals in the top-left corner | each side's amount | only as fine print, and it was the only amount | **removed**; the numbers ride the ends of the standing's bars |
| World | Preview token in the middle (role glyph, tiny bar, number, home or strain mark) | what the pointed creature would hold here | duplicated the card's column at a size that could not be compared across worlds | **removed**; the standing's bar grows by what the creature would add, with its home, strain or fall marks beside its number |
| World | Faint element emblem behind everything | decoration | barely visible (9 percent) and it sat where the standing now is | **removed** (the symbol moved to the head) |
| World | Cyan edge on every world while a creature is lifted | these are the targets | yes | kept |
| World | Brass top edge on the rival's rank, cyan bottom edge on yours | whose side is whose | yes, once the field is not painted over it | kept |
| World | Figures: piece, element badge, name plate, hold bar with its number | who is there and how much each holds; what the Clash would take | yes | kept |
| World | Pennant with the margin at the Ruling | who took the world and by how much | yes, in the middle of the seam | **the pennant rides the end of the winner's bar**; the bars show the margin |
| Dock | Stake x2, Pass | actions | yes | kept |
| Card | Piece and name | which creature | yes | kept |
| Card | Role glyph, top left | what it does in the Clash | small, but the fit number already counts it and the key explains it | kept |
| Card | (i) | the whole reading | yes | kept |
| Card | Fit columns with numbers | what sending it there now would do at each world | yes (Nick: "a step in the right direction") | kept; the world heads now carry the color each column is drawn in |

## The standing

Each world's seam, between the rival's rank and yours, carries two bars from the same left edge: the rival's above, yours below. The longer bar takes the world.

- **One scale for the round's three worlds**, so a bar can be read against the bars of the next world. The scale is the largest amount any bar could show in this state: every total going into the Clash, and every total any creature in hand would make if sent (`standingScale()` in `reclamationFit.js`), rounded up to a step of six and never below 24. Pointing from one creature to the next never rescales the table. During the Clash the scale covers every creature's hold on arrival, so the bars shrink as blows land and never jump.
- **Fill**: what the Clash is forecast to leave that side, which is what decides the world.
- **Hatched run past the fill**: what the Clash takes of what goes in. The engine's forecast now reports each creature's hold going into the Clash (`ClashForecast.before`), so this is the engine's number, not the interface's.
- **Ghost**: with a creature pointed at or lifted, the striped cyan run it would add to your bar, with the creature's own silhouette riding its end; the rival's bar shrinks by what it would take.
- **Mark**: the rival's end, drawn in brass down through your lane. Pass it and the world is yours.
- **Number**: each side's total rides the end of its bar and slides inside the bar at the far end of the scale. Beside your number when a creature is pointed at: a house on its home world, the strain glyph where the world strains it (its reason as the title), a cross where the Clash would drive it to nothing.
- **Who leads** reads from the bars; the side behind is drawn at half strength. An empty world draws two faint rails and no numbers.
- **The Ruling**: the pennant rides the end of the winner's bar and the loser's lane dims.
- **The Clash's caption** stands just above the seam, over the rival's rank, so the bars stay in sight while blows move them.

Every moving part is a clip-path or a transform, so pointing at a creature repaints the table and never moves it (`reclamation-shift.mjs`).

## Assumptions and decisions

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 1 | Amounts, not shares: a bar per side on a common scale is the most accurately compared encoding (position along a common scale) | 90%: the share version failed exactly where one side is absent, which is every round's start | Nick's screenshots; this doc, "Why every world was split" |
| 2 | Bars from the same edge, the rival's lane directly above yours, not a tug-of-war from the center | 80%: aligned lengths compare better than mirrored ones, and the rival-above convention holds | `reclamationInstruments.js` `Standing` |
| 3 | The scale covers every preview in hand, so it cannot move under the pointer | 85%: a scale that follows the pointer would make the bars jump between creatures | `standingScale()` |
| 4 | The turn words go; a pointer on the side's row says whose move it is | 70%: a label by Nick's rule, and a phone never showed it; the bench also lights on your turn | blind readers, question H |
| 5 | A phone keeps the sends as a count, without ticks | 75%: eleven ticks a side do not fit beside the pips and the tools at 390 wide | 390 captures |

## Measured

Blind readers on the same four moments of seed 7 at 1884 by 950 (the size of Nick's screen): round 1 with a creature lifted, round 2 with one lifted, the same moment set down, and round 3 at rest. "Before" is the live site (pass 53), "after" is this pass. Each reader got only the four pictures and a paragraph of rules, with no key.

**First round, a weaker reader model, two readers per build.** Both builds read 2 to 3 of 10 for ease, every reader took any preview for the board as it stands, and none worked out that a card's three columns are its three worlds (pass 52's readers had). On round 1 with a creature lifted, all three after-build readings named the right best world (Telypso, 45 to 55 confidence) against one hesitant before-build reading (30). What the after readers could not read became three changes: the lifted creature's own silhouette now rides the run it would add (they had read the striped run as the board); the score pips became pennants (they had read the pips as more of the round track); and the turn lamp became a pointer (a dot at rest said nothing).

**Second round, the reader model pass 52 used, one reader per build, after those changes.** Both answered nearly every checkable question right (score, round, sends, whose move, the world standings, the lifted creature's result at each world, the best creature per world, every creature that would take a rival's world) and both put ease at 5 of 10. The difference is what they could read:

| | Before (pass 53) | After (pass 54) |
|---|---|---|
| The world's standing | "every world is hatched in its top half and solid teal in its bottom half. I cannot tell why it splits at the midline"; the stacked corner numbers "fairly sure" | "two middle bars: the top one is the rival's total there and the bottom one is yours": **sure** |
| The lifted creature's preview | the middle chip's number "matches neither Foromeer's card nor the projected totals": unexplained | "a striped blue fill is a preview of your total if you send": **sure**; "the silhouette before the blue preview number is the lifted creature": **sure** |
| The score | "worlds won toward five": fairly sure | pennants, "filled means won": **sure** |
| Sends left | "»N": unsure | ticks and a count, "sends remaining, out of 11": **sure** |
| Whose move | "YOUR MOVE": sure | the pointer: "you or your turn": **unsure** (it moves to the rival's row while the rival moves, which a still picture cannot show) |

Still unexplained after this pass, by the after reader: the home, strain and fall marks after a preview number; what Stake does; and, the biggest obstacle for both readers, that a card's numbers are raw composites the Clash then changes, so the only way to know what a send really does is to lift the card. That is Nick's own second point (below).

## Open

- No human has used this table yet.
- The end-of-game result still scrolls inside its box on a short desk (pass 53's open item).
- Nick's next list (2026-09-23, while this pass was being built), taken up in the passes that follow: remove the act choice (sweep or strike); say why a creature is worth what its column says (hold against what its attacks take); say why a figure's bar changes when an enemy arrives (who will hit whom); explain a negative column (a send that makes a world worse); a moving creature's columns; a sent card's space; the eleventh send leaving a creature on the bench with no signal; the Clash played until one side stands, with a scene per world; Mandala's mechanics.
