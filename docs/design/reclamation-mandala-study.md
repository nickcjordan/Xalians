# Reclamation and Mandala: what to borrow

Status: research, 2026-09-23. Nick: "this game started out as a Gwent-like game, but now it has morphed into a game similar to a board (card) game that I like called Mandala ... help me identify any mechanics of that game that I could implement in mine ... or to identify any areas where my game feels kind of weird and, if necessary, adjust to the rules of this other game where you feels it benefits." Nothing here is ruled; the build order at the end is my recommendation.

It compares Mandala (Trevor Benjamin and Brett J. Gilbert, Lookout Games, 2019) with Reclamation as of pass 54. The rules come from the official English rulebook (V7), with designer rulings from the BoardGameGeek forums and five reviews; sources are at the end.

## My read, against Nick's own list

- **Nick's fight to the last side standing and Mandala's per-Mandala resolution fit together.** In Mandala a mandala resolves the moment it completes, on anyone's turn, while the other keeps building. If a Reclamation world resolved on its own when it closes (C1 below), each world's battle is its own scene, played to the end, which is the "big cinematic scene for each of the worlds" Nick asked for.
- **"Always keep one back" (recommendation 4 below) is the eleventh-send complaint, said Mandala's way.** Mandala's "you must keep at least one card in hand" is exactly Reclamation's 11 sends from 12 creatures; shown as a separate budget it reads as a second currency and hides the last creature's fate. Pass 55 ships it.
- **Mandala's lesson for the forecast** (weird spot 5): put new depth into things a player can count (elements present, who closes, the pool), not into more Clash rules, and keep the Clash as the show. That argues for the fight to the end being simple to read (who is still standing), and for trimming Clash rules that measure inert.
- **The act choice is gone** (pass 55, Nick's lean). Mandala's turn is one decision; C1 and C3 below are depth that does not run out with the roster, which is what the act choice was bought for.

## Assumptions and decisions

| # | Assumption / Decision | Confidence | Evidence |
|---|---|---|---|
| 1 | The official English rulebook (V7) is the authority; designer posts on BGG override it only where they say so | 95%: primary, and the designers ruled on two gaps | Lookout rulebook PDF; BGG threads 2567774 and 2496811 |
| 2 | The no-chance ruling stands: any Mandala mechanic that needs a shuffled deck is adapted deterministically or rejected | 85% | `reclamation-base-redesign.md` pass 3; design assumption 4 |
| 3 | The no-gifts ruling covers aid for the side behind in the match, not a symmetric reward for contesting one world | 60%: an interpretation, Nick's call | `reclamation-base-redesign.md` pass 2; design assumption 55 |
| 4 | Element figures are a census of primary elements over the 32 records in `speciesRecords.json`, two disjoint squads of 12 distinct species | 80% | `speciesRecords.json`; `roster.ts` |

## 1. Mandala, precisely

**Components.** One play mat and 108 sand cards, 18 in each of six colors. The mat shows **two Mandalas**, each with a central **Mountain** and two **Fields**, one per player. Each player also has a **Cup** (a face-down pile) and a **River** (six face-up spaces numbered 1 to 6).

**Setup.** Two cards face up in each Mountain. Each player draws 6 cards and puts 2 face down in their Cup.

**Turn.** One action:

- **A. Build Mountain and draw.** Play exactly 1 card into one Mountain, respecting the Rule of Color, then draw up to 3 cards to a hand limit of 8.
- **B. Grow Field, no draw.** Play 1 or more cards of one color into one of your own Fields, respecting the Rule of Color. You must keep at least 1 card in hand.
- **C. Discard and redraw.** Discard 1 or more cards of one color and draw as many.

**The Rule of Color.** In each Mandala a color may appear in only one of its three areas (the Mountain or either Field). You may always add more of a color already in an area. The two Mandalas do not affect each other.

**Completion.** A Mandala completes as soon as all six colors are present in it; either player can complete it. It is destroyed at the end of that turn:

- Players alternate choosing one color present in its **Mountain** and claiming all cards of that color. **First pick** goes to the player with more cards in their Field of that Mandala; on a tie, to the player who did **not** complete it.
- A color new to your River puts one card in your leftmost empty River space and the rest in your Cup; a color already in your River goes wholly to the Cup.
- A player with an empty Field still picks, but discards what they claim: a pure denial pick.
- Both Fields are then discarded and the Mountain is reseeded with 2 cards.

**End.** When the deck runs out (reshuffle, and end after the next completion; a second run-out ends it) or a player adds a sixth color to their River.

**Scoring.** Each Cup card scores the number under its color's River space. Highest total wins; on a tie, fewer Cup cards wins.

**What players say makes it work:** the pull between Mountain (draw) and Field (control); denial (playing a color the opponent values into your own Field keeps it out of the Mountain); River order making the same Mountain worth different amounts to each player; completion timing and the "fifth color stand-off", resolved by building a Field lead the opponent cannot overtake before playing the fifth color. **What they criticize:** the swing of 1 to 6 values, the random seed cards in each Mountain, and a thin theme.

**Where sources disagree:** Cult Cardboard says first pick goes to the player with more cards *of that color* (the rulebook says more cards in the Field, any colors); Board Game Arena's help simplifies the deck ending; Meeple Mountain omits the hand limit.

## 2. Side by side

| Mandala | Reclamation today | Relation |
|---|---|---|
| Two Mandalas that persist and reseed one at a time | Three worlds a round, replaced as a set | same role, different life cycle |
| Your Field in each Mandala | Your rank at a world | same role (your commitment); Mandala's Field only buys pick order, Reclamation's rank fights and decides the world |
| The Mountain, a pot both sides feed | nothing (the stake is the nearest thing) | missing |
| Hand of 6 to 8, refilled by Mountain plays | the unsent squad of 12, never refilled, fully visible | similar resource, no refill |
| Must keep 1 card after a Field play | 11 sends from 12 creatures | **the same constraint, shown differently** |
| C: discard and redraw, a free wait | none; the pass is permanent for the round | Mandala can wait without giving up the table |
| Rule of Color | none; element is only a multiplier | missing |
| Completion at six colors, on any turn, by either player | both pass, then all three worlds clash at once | different timing model |
| First pick to the bigger Field; a tie against the completer | the world to the bigger standing hold; a tie to the Court | same "bigger commitment wins" idea; Mandala's is a count |
| Alternate picks; both sides paid | winner takes all | split against all-or-nothing |
| Empty Field: you still pick, but discard | unopposed: the lone side takes the world free | opposite treatment of absence |
| River and Cup | worlds held, 1 each (2 or 3 staked) | missing; per-world fit already gives each player different values |
| End on a race or a clock | first to five worlds, or three rounds | same shape |

## 3. Candidates

**C1. Resolve a world as soon as it closes.** A world closes when K distinct primary elements stand at it (both ranks, and the pool if C3 lands; hidden creatures do not count until revealed). It clashes and is ruled at the end of the turn that closed it; nobody may send or move to it after. Worlds that never close resolve as today when both pass. A tie at a closed world goes to the side that did not close it. First K to try: 3 (today there are at most 22 sends over nine worlds). **Adds:** a timing decision on every world every turn (lock a lead before the rival answers, or refuse to add the element that lets the rival lock theirs); pays for crowding, since a one-against-one world at K 3 cannot close; each closed world is its own scene. **Costs:** the bot must learn to value closing; stand-offs (the double pass still ends them); a swift move could close a world for free (check closure on a send only); every gauge re-read; the Clash interleaves with Deploy. Confidence 60% that it adds fun, 70% that it cuts the one-against-one share.

**C2. The Rule of Element.** At each world a primary element may stand on one side only (and, with C3, in the pool only); more of an element already on your side is allowed. A refused send says why. **Adds:** element becomes a position as well as a multiplier; denial becomes a reason to send a creature somewhere it is weak; it splits the elements so C1's count is contestable. **Census:** a squad of 12 covers 9.2 distinct elements on average and two squads share 5.0, so alone the rule bites only on shared elements. Confidence 55% alone, 75% as the partition under C1 and C3.

**C3. The pool (Mountain) and the offer.** A second kind of send: the creature goes into a world's pool between the ranks, belongs to neither side, never fights, adds no hold, and each offering adds 1 to the world's counted value for whoever takes it (the stake's own `countedValue`). Its element counts toward closing and is locked out of both ranks. It replaces the once-a-game stake. **Adds:** a repeatable, visible, contested raise; denial for both sides; the natural closing move; a job for weak or strained creatures. **Costs:** wider swings; a pool zone per world on a phone; a new bot action. Confidence 50%.

**C4. Claiming in order.** With a pool, the side with more standing hold claims first and the sides alternate, so a narrow winner splits a rich world instead of taking it all. **Costs:** the item most likely to run into the no-gifts ruling (assumption 3), and a phase at the Ruling (Nick cut Orders for being a phase). Confidence 40%.

**C5. River and Cup.** No clean home: world elements never repeat within a Proving, and per-world fit already gives each player different values for the same world. Not recommended (15%).

**C6. Hand, hand limit, discard and redraw.** A random draw is out by ruling and a fixed draw queue hides the comparison the glance redesign is built on. The piece that transfers is already here ("keep one back"). Action C's lesson is **a wait that is not permanent**: a pass you can come back from, with the round resolving when both pass in succession, which ends the rival's solo phase. Hand and draw: 15%; the reversible pass: 40%, worth sweeping with C1.

**C7. Several of one element in one action.** Send two creatures of the same element to one world in one turn: a tempo strike the rival cannot answer between arrivals. Needs a new price, since there is no draw to lose. 30%.

**C8. Rolling worlds and the end condition.** The full version of C1: one stream of worlds in three slots, a closed world replaced by the next; the Proving ends at the win threshold or when neither side can send. K and the win threshold must be set together (closures per Proving are at most total sends over K). The largest rewrite (frames, the round track, the reach line, the stake, the bot, every per-round gauge). 45%.

## 4. Where Reclamation feels weird, and what Mandala suggests

1. **The permanent pass and the solo phase after it.** Once you pass the rival sends alone and has the last word. Mandala has no pass; its timing weapon is completion, which has a price. **Fix:** C1, then a pass you can come back from.
2. **Three fixed rounds.** The arc is scripted and the deciding round was the shallowest (pass 24: 3.9 / 2.8 / 2.05 near-best options by round; pass 55 measures 5.4 / 3.6 / 2.3 with the act choice off). **Fix:** C1 now, rolling worlds later.
3. **"11 sends from 12 creatures."** It is exactly Mandala's "keep one card in hand", but shown as a budget it reads as a second currency and "kills you silently" (pass 50's critic; Nick's eleventh-send report). **Fix:** say it Mandala's way. Shipped in pass 55.
4. **Winner-take-all Rulings and free unopposed worlds.** Mandala pays both sides at every resolution. **Fix:** C3, and optionally C4.
5. **The forecast complexity.** Mandala's resolution is a count anyone can do; Reclamation's Clash is a sequential simulation with many interacting rules, so the table has to run the engine to tell the player what a send does. **Lesson:** put new depth into countable layers and keep the Clash as the show; trim Clash rules that measure inert.
6. **Element is only a multiplier.** **Fix:** C2.
7. **The stake is rare and neutral.** **Fix:** C3 replaces it.
8. **Each send was two decisions** (the act choice). **Fix:** removed in pass 55; C1 and C3 are the depth that does not deplete.
9. **Ties go to the Court.** Mandala breaks ties against the completer. **Fix:** part of C1.
10. **Two worlds a round was rejected in pass 15** because the allocation question disappeared; Mandala works with two because each has a richer decision inside it. Pass 15 named its own condition for re-running the sweep ("a deeper per-world decision than how many do I send"); C1 to C3 are that.

## 5. Ranked, and the build order I recommend

1. **Keep one back, said Mandala's way.** No engine change. Shipped in pass 55.
2. **The fight to the last side standing** (Nick's own idea, not Mandala's), measured in the simulator and the validation tool before it ships, with each world's battle as its own scene.
3. **Close a world when K distinct elements stand at it (C1, small version)**, with **the Rule of Element (C2)** as its partition, behind rules levers and measured: share of worlds closing early (target a third to a half), the one-against-one share (about 56% today), stand-off turns, the closer's win rate at closed worlds (near 50 is healthy), downs and flips in band, new naive policies (always close, never close), option spread by round.
4. **The pool and the offer (C3)**, replacing the stake.
5. **Rolling worlds and a pass you can come back from (C8 with C6's wait)**, after 3 and 4 measure well; then re-run the two-world frame.

**Do not borrow:** the random deck and Mountain seeds (they break the no-chance ruling and are Mandala's most criticized feature), River and Cup scoring, a hand limit or a draw queue, hidden starting Cup cards.

## Sources

- Mandala rulebook, English V7 (Lookout Games): https://www.lookout-spiele.de/wp-content/uploads/Mandala_Regeln_EN_V7.pdf
- Cult Cardboard review: https://www.cultcardboard.com/blog/mandala-review
- UltraBoardGames rules transcription: https://www.ultraboardgames.com/mandala/game-rules.php
- Board Game Arena game help: https://en.doc.boardgamearena.com/Gamehelpmandala
- The Opinionated Gamers review: https://opinionatedgamers.com/2020/01/29/mandala-game-review-by-brandon-kempf/
- Meeple Mountain review: https://www.meeplemountain.com/reviews/mandala/
- One Board Family review: https://oneboardfamily.com/mandala-review/
- BoardGameGeek threads (read through the geekdo articles API): 2567774 and 2496811 (designer rulings on completion and deck run-out), 2293232, 2404038, 2596598, 2836784, 2527932 (high-level play), 2604701 (the fifth color stand-off), 3252616, 2269448 (swingy point values), 2273988 (empty-Mountain variant).
