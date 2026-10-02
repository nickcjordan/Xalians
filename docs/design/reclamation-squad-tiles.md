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

## Pass 78: base stats and a world strip (Nick, 2026-10-02)

After reading the pass 77 tiles live, Nick:

> what I'm now realizing is that the standard health is the important value, not the resulting value of the health ... the strike of 11 and the health of 10 [should be] the two big things shown in the tile, and then there's a three-part adjustment value ... so that way it's not showing you a bunch of different numbers like 7, 8, 9, and 14 all across the tile

He asked for the spirit rather than a literal build. Mockups G, H and H2 followed.

**G: two big numbers and adjustments.** The creature's natural health and its attack became the two big numbers, and each world showed only its adjustment.

**H: a strip with no icons.** The adjustments became a strip of three segments, ordered like the worlds above. Nick: "I also don't know if it would be necessarily helpful to have the icon aligning to the planet ... people can visually align it to the worlds above it."

**H2: the attack moved off the tile.** H2 tried one chip per rival on the tile, because one attack change cannot hold when two rivals stand at a world. Nick took it off the tile:

> I think you should just not show the affordance on the character tile for attack and instead for each creature, you can just put a little something showing how the attack would affect them

**The tile now:**
- **Health:** the natural health in big type, with a short bar under it, like the creatures' health bars on the worlds.
- **Attack:** the act glyph, the power and the act word, at the same size as health.
- **The world strip:** three segments in the worlds' order, each showing how much that world changes the creature's health. No change is a quiet segment with a faint 0. A gain is green and a loss is red, and the tint deepens with the size of the change.
- **Pointing at a world** outlines its segment on every tile.
- **Removed:** the per-world "+N", its bars and tick, ▲/▼, and the hit beside the attack.

**The attack's change sits on each rival.** When you point at one of your creatures or pick it up, every rival on the board shows how much harder or softer that creature's attack lands on it, in the strip's green and red. With two rivals at a world, each shows its own change.

**Why attack and health are shown differently:**
- **Health:** the change is a fact of the creature and the world (home ground, temperature, air, water). It is the same whoever stands there, so it belongs on the tile.
- **Attack:** the world's strain cuts the attack too, but the larger part of its change is the element chart against each rival there. That changes as rivals arrive and differs per rival, so it belongs on the rivals.

**Round 13 changed the rival chip.** The chip first printed the blow's change ("−7", "0"). All three readers took a number on a rival as harm done to it, so "0" read as "no damage". This was pass 58's lesson again. The chip now prints the blow it would land ("7", "14"), and its color carries the adjustment: green when it beats the attack on your tile, red when it falls short, quiet when even, deeper with the gap.

