# Reclamation: say why (pass 61)

Status: shipped in pass 61. It adds words to the preview a creature shows on each world. It builds on `reclamation-read-the-card.md` (pass 59, the marks and their factors) and `reclamation-sides-by-position.md` (pass 60).

## What Nick asked

Nick, 2026-09-26, on the pass 60 table with Hippochamp lifted. The card showed 12 at Floria and 6 at Zolton and Stonera, each 6 carrying a snowflake and ×½:

> ok this looks much better, it is a big step in the right direction. we still need to work on explaining why numbers are differennt in one spot versus another. in this screenshot I see the snowflake and X 1/2 so I assume that means the creature would be cold and thus be less successful on those places? is that right? I think in the space on each planet, for ones where the creature is affected by something, we need to do better job explaining what that effect is and why

He read it right: Zolton and Stonera are too cold for Hippochamp, so it holds half there. But the marks said what happened and never why. Nothing on the screen said how cold each world is against what the creature can take. Nothing said what the struck-out circle meant, or who in the Clash took the red "−5".

## What changed

**Words under each world's number.** When you point at a creature or lift it, each world shows its number (+6), the chain that makes it (`12 ❄×½`), and now one line for each thing that moves the number. Each line has three parts: the same mark the card uses, what the thing does (in bold), and why.

| Cause | What it does | Why |
|---|---|---|
| Home world | "Its home world: it holds half again." | "Frackworm comes from Endessa." |
| Too cold or too hot | "Too cold for it: it holds half." Far off: "Far too cold for it: it holds a quarter." | "Zolton runs −40 to 20°C, mostly colder than the 5 to 40°C Fathomaw is comfortable at." |
| Air or water it cannot take | "It cannot breathe here: it holds a quarter." or "The wrong air or water for it: it holds half." | "Luminax here has no air at all; Frackworm breathes air." |
| Willful | "Far too cold for it, but it is willful: it holds half, not a quarter." | (the temperatures, as above) |
| Company | "Steadied: +3." / "Pack-bonded: +2." / "Solitary: −1." | "A bolster of yours here lifts it." and so on |
| A bolster's own lift | "It steadies itself: +1." | "A bolster lifts every creature of yours at its world, itself included." |
| The Clash | "The Clash takes 5." or "It falls in the Clash (it goes in with 9)." | "It acts first and hits Hippochamp for 5; Hippochamp, hurt by then and so weaker, catches it in three sweeps for 11 in all." |
| What it downs | "It downs Hippochamp, and Kosanos before it can act." | |

The temperature words follow the engine's own test. A creature is comfortable where its band covers at least half of the world's. So "mostly colder" is the strained case where the bands overlap, and "all of it colder" or "far colder" is where they miss.

**The fight behind the Clash's toll.** `forecastSendBlows` is new in the rules. It runs the same forecast as the card, and it is just as blind to the rival's hidden sends. From the forecast's resolution log it reads:
- the blows that land on the creature, by attacker, and how many times across the exchanges;
- whether each attacker had already been hurt;
- what the creature lands on each rival, and which rivals it downs before they act;
- what a bolster or mending gives back;
- the lift it loses when an ally of yours falls beside it and takes a bolster's or kin's lift with it.

A rules test holds these to the forecast's toll. On five seeds, for every creature at every world, the blows landed, less what is given back, plus the lost lift, equal what it goes in with less what it keeps. It falls exactly when the forecast downs it, and it downs exactly what its own hits down.

**Fitting the words in.** Your half of a world is 142 pixels tall on a 1280 by 720 screen and 232 on 1896 by 1100. So the words take priority over the creature's silhouette:
- the silhouette only shows in a half at least 300 pixels tall;
- the number shrinks in a half under 210;
- under 150 only what each thing does shows, not why;
- under 90 the chain stands alone.
- Beside creatures of yours already on the world, the words keep to the right third and say only what each thing does; on a short world they give way to the chain.
- On a phone the words are small and say only what each thing does.

**The Clash line has its own mark:** two blows crossing, the Clash phase's glyph. A reader took the strike role's arrow for part of the line.

**Also:** the key and How to play say that the words are there. The proving check holds the words' toll to the chain's, and checks that the ghost's number stays below the world's bars and its words never lie over a creature of yours.

## Assumptions and decisions

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 1 | Words, not only marks, under the preview on each world | 85%: Nick asked for "a better job explaining what that effect is and why" in that space; he had already read the marks right, so the gap was the why | Nick 2026-09-26 |
| 2 | Why is said in the engine's own numbers (both temperature bands), not a judgment ("bad world") | 90%: the numbers let a player predict the next creature; a verdict does not | `creatureOnTable.strainLevel` |
| 3 | The fight's cause comes from the forecast's own resolution log, not a separate estimate | 90%: pass 38 found estimates that ignored order and shields lying; the log is the Clash | `forecastSendBlows`, forecastClash.test.ts |
| 4 | Only the creature pointed at or lifted gets words; creatures standing on a world do not | 70%: that is the decision in hand. A reader asked why Scalatto, already standing on Luminax, holds 7 under a struck-out circle | readers of this pass |
| 5 | The silhouette gives way before the words on short screens | 80%: pass 57's reader called it "big and telling nothing"; the card already says which creature is lifted | ownership log, pass 57 |

## Measured

**Blind readers.** Each read three screens of one game on the same seed, before and after:
- round 1 with Fathomaw lifted;
- round 2 with Frackworm lifted, where it takes a hit and downs two rivals;
- round 2 with Luceras lifted, where it falls at two worlds.

They were asked why each number differs, what raises or lowers it, and who does what in the Clash.

| | Pass 60, live | Pass 61, first build | Pass 61, final build |
|---|---|---|---|
| Why a number differs between worlds (1 to 10) | 6 | 7 | 7 |
| What each number means | 4 | 5 | 5 |
| How easily you could make a good move | 7 | 7 | 7 |

What changed in the answers:
- **Fathomaw's tolerance.**
  - Before: "cannot tell. The screen never shows it as numbers."
  - After: "Fathomaw is comfortable at 5 to 40°C. Most of Zolton's and Stonera's range sits below 5°C."
- **The struck-out circle at Luminax.**
  - Before: read as "far outside what Frackworm tolerates", possibly "hostile".
  - After: "it can't breathe there, so it holds a quarter".
- **The Clash.**
  - Before: "the red losses come with no source and no reason."
  - First build: the attackers were named, but the amounts had no cause ("why Hippochamp's sweep does 11 to Luceras but only 5 to Frackworm").
  - Final build: the reader read three sweeps against one and why Kosanos did nothing ("downed before it can act"), but still guessed that a hurt attacker lands less ("Hippochamp being hurt might weaken it"). The words now say what that does: "hurt by then and so weaker".
- **The last reader's one request, added after the read:** "have the caption state your creature's own hit." The words now say "It acts first and hits Hippochamp for 5".

## Open

- **Creatures already standing on a world** get no words. Pointing at one could show its own lines. A reader could not see why Scalatto, already on Luminax, holds half and not a quarter under a struck-out circle.
- **The header thermometer** still has no scale a reader can decode. The words now carry its information.
- Carried: a verdict per column; the send counter's one held back; whether element should matter; strike keepers near 67 to 68 percent.
