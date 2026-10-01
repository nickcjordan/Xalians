# Reclamation: the squad as health-first tiles (pass 77)

Status: approved by Nick as mockup F2 on 2026-09-30; built in pass 77. It replaces the roster rows of passes 75 and 76 (`reclamation-squad-roster.md`, `reclamation-squad-reader-loop.md`). Log: `reclamation-ownership-log.md`.

## The ask

Nick, 2026-09-30, after reading pass 76 live: "I hate the way you have the creatures laid out in stacked rows, redesign that."

## How the design was reached

Concepts were mocked up over the real game screen with seed 233's real numbers before anything was built, since the plinth cards and the roster rows had both been rejected on sight.

| Concept | What it was | Nick's call |
|---|---|---|
| A, Lineup | standing pieces, a world's numbers shown only while pointing at it | out: "didnt we agree that we need to be able to see all the info without clicking through things?" |
| C, Muster | round tokens in act groups, numbers on pointing | out, same reason |
| D, Lineup with every world | A with the three numbers under each piece | out: the art too large, the important facts not loud enough |
| B, Tiles | a tile per creature, the attack as the big number, three world numbers at the foot | the base: "lets stick to iterating on the tiles only" |
| E, Health tiles | B with health leading | folded into F |
| F | B reworked so health leads, natural health as a tick, the hit box on hover only | "that is MUCH better" |
| F2 | F with the hover hit moved onto the attack line | approved: "build it" |

Rulings on the way:
- The dashed hit box is too much to show always. It shows only while the mouse is over a world, and then beside the attack value, because the hovered world already says which world it is for.
- A blow's effect on a rival's count stays hidden during placement (pass 72). Nick: it is theoretical, since with more than one creature at a world "things will change".

## The tile

Nick's order of factors is element, health at each world, then attack. The tile's weight follows it.

- **Top left:** the silhouette with its element badge.
- **Top right:** the attack line, quiet: act glyph, act word (strike, sweep, mend, guard) and power. The name sits small under it.
- **Bottom, the loudest part:** three health blocks in the worlds' left-to-right order and colors. Each holds the "+N" the creature would bring to that world, with ▲ or ▼ when the world lifts or cuts it, over a health bar.
- **The bars** share one scale across the squad (the largest health or natural health anywhere in it), so any two bars compare.
- **Natural health** is a thin light tick on each bar. A bar past its tick is lifted; one short of it is cut. It has no number.
- **On hover over a world:** each attack line adds "→ N", the creature's hit at that world, in the world's color. A mender, or a world with no rival, adds nothing.
- **The phone** has no hover, so it shows the at-rest tile only, without names.

## States

- **Lifted:** the tile rises with an outline.
- **Sent this round:** the tile stays where it is (a send moves nothing on the table), goes quiet, and keeps only the number of the world it went to.
- **Kept in reserve:** dimmed.
- **Used creatures** stay in the squad's head as before.

## Gone with the rows

- the column head: world symbols, sort, and signed margin. The world panels above carry each world's standing.
- the rival's mark on each bar.
- the always-on dashed hit chip.
