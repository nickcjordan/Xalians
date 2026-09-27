# Reclamation: who goes first (pass 67)

Status: shipped in pass 67.

## The problem

Nick, on two creatures lifted against Kosanos at Stonera, one forecast to fall and one to win: "It says that it falls in the clash, but that's just a guess, right? ... How does one of them decide that my creature would win the fight and the other one decides that my creature would lose the fight?"

The forecast is not a guess. It is the engine's own Clash run on the board as this seat can see it (`forecastSendBlows`, with the rival's hidden sends removed), and the Clash has no dice. The words had two faults:
- **They explained the winner and not the loser.** Tizzie's words said "It acts first; Kosanos, hurt by then and so weaker, strikes it for 4". Sonalloy's said only that Kosanos strikes it for 16. Sonalloy is a bolster: it never strikes at all, so nothing it does weakens Kosanos before the blow lands.
- **They sounded certain.** "It falls in the Clash" held only if the rival sent nothing more to that world, and it said so nowhere.

## What changed

- **The forecast records the order.**
  - `before` on each blow that lands before the creature's own first attack.
  - `strikes` when the creature attacks at all.
  - `fallsBeforeActing` when it is downed before its turn.
- **The words say who goes first, in every case:**
  - "Kosanos is quicker and catches it first in a sweep for 8."
  - "It falls before it can act."
  - For a creature that never attacks: "Kosanos strikes it for 16; a bolster lifts and never strikes, so nothing weakens Kosanos first."
  - A quicker rival's blow is told before what the creature lands back: "... for 7 in all; then it hits Hippochamp for 9".
- **The forecast says what it rests on.** While the rival can still send, or has creatures hidden this round, the fight's first line ends "if nothing else arrives". Once the rival is done with nothing hidden, the words are plain.

## Verified

- **Rules:** a new test over five bot games holds the new facts:
  - a creature that never attacks has every blow land before it;
  - acting first means no rival blow landed earlier;
  - falling before acting means it landed nothing.
- **Web:** new tests hold the words. All Reclamation tests pass (261).
- **Table checks:**
  - proving at 1440, 1366 and 390 in both views. Its check that the words and the chain agree now accepts the condition. The words still fit where they fit before.
  - shift, actflip and hotseat.
- **Paint:** at 1366 by 768 and 1440 by 900, a lifted Graviclaw and Shuntara read in full under their numbers.
