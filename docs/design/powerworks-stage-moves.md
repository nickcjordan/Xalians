# Powerworks: moves on the stage, above the acting creature

## Context

Nick, 2026-09-30, after enemy intents and power keys shipped (#770, #771): with four keys in a bar along the bottom, the pointer travels from the bottom of the screen to an enemy at the top on every turn. He asked to bring back the idea from the radial brief ([powerworks-radial-orders.md](powerworks-radial-orders.md), PR #611): the moves laid out just above the creature that is acting, so choosing a move and then its target is a short move upward. The mechanics are simpler now (one power number per move, the matchup and intent on the enemy, the result previewed on the target), so a small on-stage menu can carry everything a key carries.

Lessons from the radial rounds that this design keeps: no icons that do not mean anything (the hexagon badges); no detail text on the menu (details go to hover); no camera zoom or scale transforms (blur and nausea); the row covered a machine's feet when the companion stood under it.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | On desktop the four moves and Pass sit in one compact row directly above the acting companion's head, centered on it and clamped inside the stage. Each move is a small card: name, the one power number (or the support's number), and one shape tag at most (ALL, a hinder size, on itself). Rests and once-per-fight show as a dim state with a short word ("rests 1", "used"). | 80%, Nick's request; a row, not an arc, because an arc spreads sideways over the neighbors | Nick 2026-09-30; radial brief decision 3 |
| 2 | The stage gets a clear lane for it: the bottom key bar goes away, the stage takes that height, and the enemy row sits higher so the menu never covers an enemy plate, its intent chip or a preview number. Checked by the geometry harness at every size. | 80% | radial record: "the row covers a machine's feet" |
| 3 | The flow is unchanged: choose a move (click, or 1 to 4), the exact results appear on the targets' plates, click the target (or A to F). Area, self, whole-squad and lone-target moves act on the move click. | 90% | intents contract, decision 4 |
| 4 | The lines that lived in the key bar move up: the first-use note, the hindered reason and "since your last turn" go to the banner area; the acting companion's portrait is not repeated (the creature itself is right there). | 75% | |
| 5 | During enemy turns and playback the menu is gone; the stage is clear for strike lines and landing numbers. Speed and Skip move to the top bar. | 85% | |
| 6 | On a phone the move column on the right stays as it is: a thumb reaches the column more easily than a menu over a small figure, and the fingers would cover the stage. | 70%, a judgment call; Nick can ask for the on-stage menu on phone too | UX pass 2 round 4 phone console |
| 7 | Hovering a move card shows its detail (rests, riders, the Guide sentence) in a small tip above the menu; nothing extra shows at rest. | 80% | radial round 2: details on hover, not as text |

## Verification

Page tests for the menu position, the flow and keyboard; the geometry check at the five sizes, extended so the menu never overlaps an enemy plate, intent chip, preview number or letter, and stays inside the stage for every companion slot; frames of each companion acting (all four slots, the edge ones especially) at 1366 and 1920; then Nick plays.
