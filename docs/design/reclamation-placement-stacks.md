# Reclamation: placement stacks (pass 72)

Status: shipped in pass 72, 2026-09-28. Owner: the Reclamation ownership brief (`reclamation-ownership-brief.md`); the running log is `reclamation-ownership-log.md`.

## The ruling

Nick, 2026-09-28, reading the words under Tizzie at Telypso ("It falls in the Clash if nothing else arrives (it goes in with 9). It acts first and hits Foromeer for 3 (psychic on metal ×½); Foromeer, hurt by then and so weaker, strikes it for 13"):

> I think it still doesn't make sense to try and anticipate the ordering of things and to play it out that way, though. I think during this placement phase, everything should just stack and the details that are shown should not imply that something will play out one way or another because we won't really know how something will play out until all creatures are placed and both players are passed.

He also asked whether the words revealed the rival's chosen move. They did not: Reclamation has no individual moves, and each creature's act (strike, sweep, bolster, shield) is on its tag. The trouble was the forecast itself. It ran the whole Clash on a board that was not final, told it as a sequence of blows, and printed the same guess five times: the rival's tag (12→9), both bars' hatched ends, the ghost's "+0", the chain's "−9 ×" and the card's cross.

The pass 69 blind critic had named the same thing as its second problem: "the Clash's result is shown before the Clash".

## What changed

While sends are made, the table shows the board **stacked**. No Clash is run ahead of time.

| Where | Before (pass 38 to 71) | Now |
|---|---|---|
| A world's two bars | what each side would hold after the Clash, with the Clash's take hatched | what each side has sent there, each creature at the hold it goes into the Clash with |
| A creature on a world | its hold, and "13→10" or a cross where the Clash would cut or down it | its hold; "7→8" only where the creature pointed at would lift it by standing beside it (a bolster's lift, a pack's bond, a solitary creature's cost) |
| A card's column | what it would keep after the Clash, the Clash's take hatched red, the rival's total now and after on a tag, a cross where it falls | what it would hold there, and a lighter part for what it adds to (hatched where it costs) your creatures already there |
| The creature pointed at, on a world | "+0", the chain "7 ⌂×1.25 → 9 −9 ×", and the fight in words: who acts first, who is hurt by then, who falls | "+9", the chain "7 ⌂×1.25", and the element chart between it and each rival creature already there, both ways |
| A world the rival can no longer answer | a dashed pennant, "Already yours this round", and "The rival has passed: Magmuth is yours as it stands" | nothing: that was a Clash forecast too. The top bar says "The rival has passed." |

The element chart lines read, for example:

- **Psychic on dark ×½.** Its blows land half as hard on Graviclaw.
- **Dark on psychic ×2.** Graviclaw's blows land twice as hard on it.

Each is a fact of the two creatures and their acts. A way is said only when that side attacks (a bolster or a shield never strikes), and only when the chart is not even. Nothing says who lands first, who is hurt, or who falls. That is the Clash's to say, and it says it blow by blow when it plays.

## How

- **Engine.** `forecastStanding(state, handler)` and `forecastSendStanding(state, handler, recordId, siteId, chosenRole)` in `expeditionRules.ts` return every creature the handler can see at the hold it would go into the Clash with (`before`, the same number `forecastClash` has always carried), nobody downed, the rival's hidden sends still hidden. `forecastRun` now builds on the same copy (`forecastCopy`), so the two cannot drift. Tests in `forecastClash.test.ts` hold the standing to `forecastClash`'s `before`, to a real send, and to hidden sends.
- **Web.** `fitTable` reads the standing functions instead of `forecastClash` and `forecastSend`, so `toll`, `falls`, `taken` and `downs` are nothing while sends are made. The rival's tag, the cross on a card, the settled pennant, the settled lines and the fight's words are removed. `matchupsAt` (`reclamationMatch.js`) gives each world the chart against each rival creature there, from the engine's own `targetMatchupMultiplier`, and `reasonLines` says it.
- **Left in the engine, unused by the table:** `forecastClash`, `forecastSend`, `forecastSendBlows`. They are tested, and they are what a hint mode or a bot's reading would use.
- **The bot is unchanged.** It prices worlds its own way, from the same public board, so no gauge moves and the simulator was not rerun.

## Also fixed

- A card's hover text still said a home world gives "half again as much"; since pass 71 it is a quarter more.
- "A electric world is hard on water" now reads "An electric world".

## What to watch

- **Overkill.** A send into a world you already hold by 20 reads as +11 like any other. The settled pennant that flagged it once the rival passed is gone with the forecast. Open item 2 in the log.
- **Reading a fight from the chart.** A player now judges a fight from the numbers and the chart lines rather than being told the result. Whether that is enough to choose well is the next blind reader's question.
