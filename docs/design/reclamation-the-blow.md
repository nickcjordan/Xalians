# Reclamation: the blow (pass 64)

Status: shipped in pass 64. It takes the Clash, the lowest score in the self-audit (`reclamation-audit-2026-09-26.md`, weakness 3).

## The problem

The pass 62 blind critic scored the Clash 3 of 10, down from 5 at pass 50:

> It is one static caption with a white box around the attacker. The target has already vanished, and nothing shows the hit or the damage.

Pass 62 fixed the vanishing: a downed creature now stays where it fell. Filmed at the game's own speed, the Clash still showed three more faults:
- **The blow was invisible.** The attacker wore a white box and the target a red dashed one, but nothing joined them. A reader had to match two names in a caption to two creatures.
- **The blow's word was cut off.** "DOWNED" or "−5" stood above the creature it landed on. For the rival's creatures, which stand at the top of their half, that is outside the half, and the half clips it. On film, "DOWNED" showed half its letters, faint, at the top edge of the world.
- **A creature downed greyed out at once,** on the same step as the caption, so the one beat that decides a world was already the dimmest thing in it.

## What changed

- **Each blow is drawn.** While a world fights, a stroke runs from the creature that throws the blow to the one it lands on, and ends in a burst on the target:
  - red when the target is yours, because red is what the Clash takes from you (pass 60);
  - ink when the target is the rival's.

  The world is still opening to take the table when its first blow lands, so the stroke's ends follow the creatures for its first second.
- **The blow's word stands on the creature it lands on:** "DOWNED" or "−5", over the piece, sized to it, red on yours and ink on the rival's.
- **A creature downed shows whole on the step that downs it,** then settles greyed and struck through.
- **Each blow is told in two beats** (added after the first reader). It flies for a third of a second with the target still at what it held, then lands: the hold drops, and the blow's word appears. The first reader's most confusing thing was "the result appears before the action".
- **Only a blow that lands has a target** (added after the second reader). A creature downed before it acts throws nothing. The second reader saw a stroke run from the fallen Hippochamp to Fathomaw, framed as hit, under "Hippochamp falls before it acts".
- With reduced motion, the stroke is drawn at once and nothing scales or fades.

## Assumptions and decisions

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 1 | Draw the blow as a stroke between the two pieces, not as the attacker moving to the target | 75%: figures size to their half and move under the pointer nowhere else (pass 36); a stroke adds nothing to the layout | `BlowTracer` in `reclamationWorld.js` |
| 2 | Color by whose creature is hit, not by whose creature strikes | 80%: the table's one side color is red for your loss (pass 60) | `reclamation-sides-by-position.md` |
| 3 | Keep the Clash's pace as it is | 60%: each downing already holds for 1.9 steps (pass 28); the critic's complaint was what a frame shows, not how long | `stepWeight` |

## Measured

Blind readers each read eight frames of one Clash, a fifth of a second apart, filmed at the game's own speed on seed 21:

| | Live | First build (the stroke) | Two beats |
|---|---|---|---|
| Following who hits whom (1 to 10) | 5 | 7 | 7 |
| How worth watching the fight is | 2 | 3 | 3 |

- **Before:** "the strike itself is never shown, only its result", and "DOWNED" was cut off at the top of the world.
- **After:** every reader named every blow, who threw it and whose creature took it, sure, from the stroke and the word on the target.
- **Worth watching stays at 3.** On this seed each world is one blow: a knockout or a miss. The readers' remaining complaints are about the fight itself: "no exchange", and the winning creature is a "?" because Fathomaw has no art (audit weakness 5). A longer fight is a rules question, and Nick has said the mechanics are in a decent place (2026-09-23).

The Clash gauge (`reclamation-clash.mjs`) reads 55 percent of frames in motion, the same as live. The stroke is drawn in its own layer, and the gauge counts figures that move.
