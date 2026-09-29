# Reclamation: the dashed box on a card's column goes (pass 74)

Status: shipped in pass 74, 2026-09-29. Log: `reclamation-ownership-log.md`.

## The report

Nick, 2026-09-29, on the dotted lines around the bars on each card: what are they supposed to represent? "I feel like that's not accurate anymore. It needs to be fixed."

## What the box was

Pass 59 drew a dashed box on each column at the creature's normal hold: what it holds at a world that neither helps nor hurts it (vitality, resilience and endurance). A column above the box had been lifted by the world, one below it cut, and the marks under the column said by what. Nick had asked then how each bar was calculated.

## What was wrong with it

- **Its height was right.** A check over four whole bot matches (2,148 columns, every round) found every column with no mark exactly at its box.
- **Its meaning had drifted.** Pass 59's comment still said a column below the box had been cut "by the world or the Clash", but since pass 72 nothing on a card is cut by the Clash.
- **It was the one mark on a card with no number.** It showed a "before" nobody could read off it. The affordances rule is that a change reads before and after in numbers.
- **Dashes now mean something else.** Since passes 72 and 73, a dashed outline on the table means "what your send would do": the ghost's "+10" and the blow on each target. A dashed box around every column said the same thing about something else.

## The fix

The box is gone. The column is its number and its fill. The marks under it (house ×1.25, the world's element ×0.9, flame or snowflake ×0.9 or ×0.75, struck air or water ×½ or ×¼, company, a bolster's own lift) say what the world did, by how much.

The whole calculation, "before" included, is on each world when you point at the creature: "12 ⌂×1.25" under its "+15". How to play and the key no longer mention the box.
