# Reclamation: the squad, rebuilt as a roster (pass 75)

Status: shipped in pass 75, 2026-09-29. Log: `reclamation-ownership-log.md`. It replaces the bench of plinth cards (passes 2, 52, 57 to 59, 73), and nothing of the plinth was kept for its own sake.

## The ask

Nick, 2026-09-29:

> I think you need to take the concept of this card and redesign it ... I don't want you to reuse any of the pieces just for the sake of reusing them ... It has a bunch of tiny little icons crammed into the bottom of the card that I guess is supposed to indicate one thing or another, but it's not helpful. I also think the presentation of this card in general needs to be reworked because after you're a round deep, all the cards still show, and there's no organization as to ordering the cards or anything like that.

## What the squad is for

Every turn asks one question: which creature, to which world. The factors, in Nick's order:
1. the element chart;
2. health, the hold it brings;
3. attack power.

Everything else (speed, instinct, will, charisma, traits) is secondary and lives in the dossier.

## What was wrong

Measured on the live game at 1440×900, round 3:
- **Dead space.** Eight of twelve cards were creatures already spent, fallen or holding a world. Each took a full card with one tiny mark on it, and the four you could still send were squeezed to the right.
- **No order.** The squad kept the draft's order all game.
- **Too many tiny symbols.** Under each column sat up to four symbols with factors (house, element disc, flame or snowflake, company, bolster), each 10 to 12 pixels.
- **Scattered numbers.** Speed, lanes and the attack sat in the card's corners.
- **Nothing to compare.** One creature's worth at a world could only be read against another's by running the eye across twelve separate cards.

## The design

**A roster, not a hand of cards.** One row per creature you can still send, in columns that line up.

- **Aligned numbers.** Each world is a column. Its symbol heads the column, in the world's color and in the same left-to-right order as the worlds above. Reading down a column answers "who holds most on Zolton" without hovering anything.
- **Each row, left to right:**
  1. the creature's silhouette with its element badge, the mark its piece wears on the board;
  2. its name;
  3. its act and attack ("↗14"), in advanced mode followed by its speed;
  4. three world cells;
  5. the dossier key.
- **A world cell is a miniature of that world's bar.**
  - **Bar:** a thin bar in the world's color, on one scale for the whole squad, the same kind of bar as the world's own standing.
  - **Number:** what the creature would add to your side there, signed like the ghost's "+N" ("+12"). Unsigned, the pass 75 reader could not tell whether it was an addition or the creature's own strength.
  - **Rival mark:** where the rival's total there stands against yours, the same "pass it to lead" mark the standing carries.
  - **Arrow:** at most one, when the world moved its hold from its normal hold. ▲ means lifted (home ground, a bolster's own lift); ▼ means cut (the world's element, temperature, air or water). Why, and by how much, is said in the cell's title and in full on each world when you point.
  - **Element edge:** at most one more token, "×2", "×1½", "×½" or "×¼": the chart's best factor for its blows against the rival creatures already there. There is nothing to show until a rival stands there. It is the biggest factor, so it is ink, not a symbol.
- **Ordered, and yours to reorder.**
  - **Default order** groups by act (strikers, sweepers, shields, bolsters), strongest attack first.
  - **Sorting by a world:** press a world's symbol in the header to sort by what each creature would add there; press it again to go back.
  - The order is never a suggestion: it only sorts facts.
- **Only what you can play, and nothing moves under a send.**
  - A creature sent this round keeps its row until the round is ruled. The row goes quiet, and only the cell of the world it went to keeps a number: what it holds there.
  - Pass 36's rule is that a send moves nothing on the table. Closing the roster up at every send made it jump, and the shift check caught it.
  - Between rounds the roster closes up, so creatures holding a world, fallen or spent leave it.
- **Remembering who is gone.** Your used creatures sit as small faded silhouettes in the squad's head:
  - with the world's color under them while they stand on a world;
  - crossed once they fall;
  - plain once spent.
- **The reserve.** Once your sends are used, the creatures left are drawn as kept, dimmed with the reserve's bookmark, since one always stays back.
- **Pointing and lifting are unchanged.** Pointing at a row shows the creature on every world (its number, its chain and its words). Pressing a row lifts it; pressing a world sends it.

## Sizes

The roster lays out in as many columns as its width allows:
- 3 at 1440 and 1366;
- 2 on a phone. A phone column is 180 pixels, so the name gives way to the silhouette, and the head of symbols gives way so that six rows of 32 pixels fit (every key a thumb presses is 32 pixels tall). The cells still wear their worlds' colors in the worlds' order, but sorting by a world is not offered on a phone.

The rows share the squad's height, so twelve creatures fit in four rows at 1366×768, and fewer creatures get more room. The page never scrolls.

## Gone with the plinth

- the fit strip's vertical columns and their rows of symbols;
- the corner speed and lane symbols (swift, willful, keen or dull), which are in the dossier;
- the plinth's state tags;
- the swift creature's move columns on its card. A move is previewed on the worlds when you point at one, as before.

## The blind reader (Opus, first sight, no explanation)

It scored the squad 6 of 10 for how fast it lets you choose a creature and a world.

**Read right:**
- a sent creature's quiet row;
- the columns as the three worlds;
- the most and least a creature adds at a world;
- the ×2 and ×½ as element factors against the rival there;
- the white mark as the rival's strength to pass;
- the used creatures in the head, and the crosses as fallen.

**Guessed:** ▲ and ▼ as better or worse than usual at that world, which is right.

**Missed:**
- the speed number (advanced mode's ⇧);
- that the world symbols sort.

**Its worst problem:** it could not tell whether a cell's number was what the creature adds or its own strength. The number is now signed ("+12"), as the ghost prints it on the world, and each head symbol carries a faint caret.

