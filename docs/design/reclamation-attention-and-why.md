# Reclamation: where the eye goes, and why a column is as tall as it is (pass 57)

Status: shipped in pass 57. It builds on `reclamation-world-standing.md` (pass 54) and `reclamation-glance-redesign.md` (pass 52); where they disagree, this document wins.

## What Nick asked

Nick, 2026-09-24, on the pass 56 table:

> You should focus on making the important pieces big and loud so the user's attention is brought to the right spot. The way it is right now, you removed a lot of the unnecessary clutter and the visual noise, and that's good. But part of your work seemed to just make a bunch of things smaller too. [...] Focus on what the user should be putting their eyes on at any given point in the game and identify how to better bring their attention to that spot.

> It's still not obvious to me why one creature would fare better at one of the worlds over another. I think it's obvious when the creature has an element that aligns to the element on the screen, but it's not obvious when it's any other combination. [...] What does it mean that a ghost-type creature going to a sand-based world shows a flame icon next to their score? [...] I want you to work through a proper path, taking the concepts that I've brought to you and figure out how to apply it better across the game.

## What actually makes a column tall

Before drawing reasons, the pass had to establish what they are, from the engine, not from the rulebook.

**The type chart does nothing.** The rulebook says a creature's hold is scaled by its element against the world's (the "world matchup") and a blow by the attacker's element against its target's. Both read `record.element.primary`. Schema 5 writes the element as a bare string (`'ghost'`), so since the schema 5 conversion on 2026-09-21 both have answered 1 for every live creature. Every measurement from then on, pass 56's fight included, was taken without them. The simulator on seed 7 is identical to pass 56's to the last figure with the chart gated off, which is the proof that nothing live changes.

Pass 57 fixes the reader, makes the chart a lever (`elementMatchups`), and ships it **off**, so the game Nick has been playing is unchanged. The world matchup as written would be the wrong thing to switch back on anyway: it reads the combat chart against a place, which puts a fire creature at half strength on the fire world, the opposite of what Nick reads the element symbols to mean. Every species' element is its home world's element (28 of 28 species checked), so a creature's element symbol already says where it comes from, and home ground is what that buys.

So a creature's column at a world is made of exactly these things (`reclamationFit.breakdown`):

| Part | What it is | Where it comes from |
|---|---|---|
| Body | what it holds at a world that neither helps nor hurts it | vitality, resilience and endurance, compressed (`baseHold`) |
| Home | half again as much on its home world | `provenance.origin` against the world's planet |
| Climate | half where it is strained, a quarter where severely (a willful creature shrugs off one grade) | its temperature band against the site's; the air or water it cannot take |
| Company | what the creatures already there add or take | a bolster's lift, a pack's bond, a solitary creature's unease |
| Taken | what the Clash would take off the rival there because it came | the engine's forecast with and without it |
| Lost | what the Clash would take off it | its hold going in, less what the forecast leaves it |

The swing a card prints is exactly own (what it keeps) plus allies plus taken, and a test holds the parts to the engine's number for every creature at every world (`reclamationGlance.test.js`).

The last two are the answer to Nick's earlier question about bars that change when an enemy arrives: a column grows when a rival lands, by what the creature would take off it.

## The why, drawn

One set of marks, the same everywhere a creature's worth at a world is shown (`WhyMarks`):

- **a house** in the world's own color: its home world, half again as much;
- **a flame** (amber) or **a snowflake** (ice): too hot or too cold for it here, half, or a quarter when it glows;
- **the world's air or water symbol, struck out**: it cannot breathe here, a quarter;
- **two figures**: the company there changes its hold;
- **a red cross**: the Clash would drive it to nothing.

Where they appear:

1. **The card's column.** A column is stacked from what makes it, bottom up: its own hold in the world's color, hatched red above it what the Clash would take off it, then what it would add to your creatures already there, then in brass what it would take off the rival, with the amount printed in the brass when there is room. The solid parts add up to the number. A dashed line across the three columns marks its body, so a column above the line was lifted by the world and one below it was cut, and the marks under each column say by what. The rival's lead there is a small brass pointer on the column's edge (it had been a full-width tick, which a second horizontal line would have made ambiguous).
2. **The world's head.** Every world shows its temperature band on one scale shared by the table (it was advanced mode only). Point at a creature and its own band lies over the world's in cyan: where the two miss, the world strains it, and the same mark as on the card sits beside the readout. This is what the flame had no referent for.
3. **The ghost piece.** The creature pointed at or lifted stands in your half of each world with the number its card prints and its marks beside it, big, and under them what the number is made of when part of it comes off the rival (`3+12`: what it keeps in cyan, what it takes in brass). It uses the room an empty world was not using, and it is the loudest thing on the table in that moment, which is the moment the worlds are the decision. The small silhouette pass 54 rode on the standing's bar is gone; the ghost piece does its job.
4. **Creatures on the board.** A creature standing on a world carries its home or climate mark beside its name, the rival's included, so why a rival holds what it holds reads the same way.
5. **The dossier and the key.** The dossier no longer prints "World matchup x1", and the conduct line for a curious creature no longer promises a target by element while the chart is off. The key teaches the stacked column, the body line and the marks, and the climate band.

## Where the eye goes

Each moment of the game has one subject, and the table says which by making it the biggest, brightest thing and quieting the rest. `data-moment` on the table carries the moment.

| Moment | The subject | What grows or lights | What quiets |
|---|---|---|---|
| Your move (`mine`) | your squad: the decision is there | the bench is edged and lit in cyan, the names of creatures in hand in cyan; on a tall enough screen the dock is a quarter taller, the columns about twice as tall with 18px numbers | nothing |
| A creature lifted (`lifted`) | the three worlds, as that creature would stand in each | the ghost piece in each world: its number at about 43px, its marks, and what the number is made of when part of it comes off the rival; the lifted card rises; the worlds' edges light | the other cards step back to 45 percent |
| The rival's move (`theirs`) | where the rival will land | the rival's half of every world glows brass while it chooses; the world it lands on pulses (as before) and your columns for that world flash as they change | your squad dims and desaturates |
| The Clash (`clash`) | the fighting world | it takes the table (pass 56), and now the full height too | the squad folds away |
| The Ruling (`ruling`) | who took each world | each world is edged and washed in its winner's color, the pennant on the winner's bar | the squad stays folded; the next-round bar takes the dock |

Sizes that grew:

- the standing's bars (16 to 24px at 1440 by 900, scaled up on larger screens) and numbers (16 to 26px);
- the world's name (about 14 to 19px, in the world's color) and its symbol;
- the card's columns and numbers (10 to 18px), and the dock that holds them (230 to 292px, scaled);
- the score's pennants, the turn pointer and the sends left.

## Assumptions and decisions

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 1 | Ship the type chart OFF behind a lever rather than restore it | 80%: it has been off for every pass since 2026-09-21, Nick said the mechanics are "in a decent place", and the world matchup contradicts the reading he gave | `expeditionInterpretation.ts` `ELEMENT_MATCHUPS`; seed 7 simulator identical to pass 56 |
| 2 | A column stacks its parts rather than drawing reasons beside a single bar | 75%: the reasons are quantities, and a stack shows how much each one is | blind readers, below |
| 3 | The ghost piece carries the reasons; the standing's bar keeps only the silhouette and the total | 70%: one place for the reasons, and the biggest thing in the lifted moment | captures at 1896 and 390 |
| 4 | The squad folds away during the Clash and the Ruling | 75%: nothing on it acts then, and the fight gains a third of the table's height | captures; `reclamation-shift.mjs` still holds the next-round key on screen |
| 5 | The house in the world's color, not a fixed color | 65%: it ties home to the world's symbol and never reads as the rival's brass | captures |

## Measured

**Blind readers.** The pass 54 protocol: seed 7 at 1896 by 1100 (Nick's screen), five moments (round 1 at rest; round 1 with Hippochamp lifted; round 2 at rest just after the rival's send; round 2 with Graviclaw lifted; the rival's move), one paragraph of rules, no key, the reader model pass 52 used, one reader per build. "Before" is the live site (pass 56). The first after reading drove a second round of changes (listed below), and a fresh reader read the build that ships.

| Question (answer key from the engine) | Before | After, first round | After, as shipped |
|---|---|---|---|
| Terragoyle 15 / 22 / 7: why (home Stonera; Telypso too hot) | guessed home from the names; "cannot tell" the cut | both right, fairly sure, from the house and the flame | both right, fairly sure, and read the body line as its normal strength |
| Figzy 4 / 4 / 12: why (too cold twice; home Telypso) | "cannot tell" | right | right |
| Hippochamp lifted: best world and why (Telypso; too cold at the other two) | right world; the cold guessed from an unlabeled glyph | right, sure, and read its band against the worlds' bands | right, fairly sure, same |
| Hippochamp 19 / 27 / 3: what the first two are made of (what it keeps plus what it takes off the rival) | worked out by arithmetic from Graviclaw's preview | right, from the stacked column | right, from the stacked column and the brass box's number |
| Who would fall at Endessa (Shuntara, Foromeer, Smokat) | "cannot tell"; guessed four, one wrong | all three, fairly sure | all three, fairly sure |
| Graviclaw at Endessa: what is bad and why its number is still large (too hot; it takes Venemist's 12) | right, by arithmetic | right | right, read straight off "3+12" |
| Whose move, in all five | right | right | right; the rival's move now read from "the brass glow at the top of the three empty worlds" |
| **Why a creature is worth more at one world (1 to 10)** | **3** | **6** | **6** (round 1 "about an 8") |
| **How easily you could make a good move (1 to 10)** | **5** | **5** | **6** |

What the first after-reader named, and what changed for the build that ships:

- the squad was "a thin strip with small numbers" while the empty worlds took two thirds of the screen: the dock grew by a quarter on tall screens and the column numbers to 18px;
- the ghost's big silhouette "tells nothing" and its twin on the bar repeated the number: the silhouette shrank and the number grew; the bar's silhouette is gone;
- "what is each number made of": the ghost prints the split (`3+12`, what it keeps in cyan, what it takes in brass), and a brass part of a card's column prints its amount when there is room;
- the rival's red hatching read as danger to the reader: the rival's losses are hatched in its own fading brass, and a rival creature a send would down is crossed in cyan, your color;
- the rival's move had "no clear place for the eye": the rival's half of every world glows brass while it chooses;
- the snowflake looked like the sweep role's burst and the flame like a drop: both glyphs were redrawn (branches on every arm; two tongues).

Still open from the readers: round 1's empty worlds are the largest thing on the screen while the decision is on the cards (a real first game also gets the one-line instruction and the key, which the captures turn off); in round 2 the card's number sums what a creature keeps and what it takes, which the as-shipped reader wants shown as the fight's result ("7 v 0") on the card itself; lifting a creature marks the rival it would down at every world at once, which one reader first read as "it downs both"; the Stake key still explains nothing until pressed.

**The engine.** With `elementMatchups` off, the simulator on seed 7 (500 matches) matches pass 56 to the last figure (starter 49.2 percent, falls 8.72 a match), so the game is unchanged. With it on (seeds 7 and 13, 500 matches), for the record: starter 46.8 and 45.4, the Clash changes the leader 32.3 and 30.2, bolster keepers 50.5 and 52.0 (41 to 43 off), strike keepers 66.4 and 67.0 (67.5 to 69.6 off).

**Checks.** Rules tests (623) and web tests pass; the four table checks are green (`reclamation-shift.mjs` caught two things on the way: the ghost piece re-centering counted as a shift until it was keyed per creature, and the folded dock left the next-round key 2px off a 375 by 667 screen while it rose, so it now fades in where it stands).
