# Powerworks: showing what a move is worth

Status: shipped 2026-09-26. Tier: immersive (the play screen). Companion to [powerworks-radial-orders.md](powerworks-radial-orders.md), whose rounds 1 to 3 built the wheel, the move card and the on-creature previews this pass reads from.

## Context

Nick, 2026-09-26, with a screenshot of Crystorn's wheel open over two crawlers: "i think you need to do a better job showing how/why one move would be more beneficial than another. right now theres not really any way to know how it would affect a creature, and i dont know how one move would be better than another in the move set. brainstorm how to tell the user this info without just slapping more words on the screen, make the design intentional."

What the screen offered before this pass: each disc showed an icon and a name. Hovering a disc drew a faint chunk on each target's health bar and a ghost of any status with its chance; choosing it and aiming drew the chunk with its number. So a player could learn one move's effect on one target at a time and had to remember it to compare. Worse, a move whose worth is not damage (a bind, a blind, a stun, a guard) showed only a status name ("Blinded 1"), with nothing saying what that status would change. In the screenshot Blinding Shot looks as good as anything else against two crawlers that only strike up close, where blinding does nothing.

## What was considered

- **Numbers on the discs** (damage 6, heal 4). Rejected: round 2 took numbers off the discs because unexplained numbers were the first complaint, and a number cannot express "stops a blow".
- **A recommended move** (a glow on the best disc). Rejected: the affordances ruling (2026-09-23) is no suggestions; the player should see the factors and decide.
- **Ticks on each machine's health bar, one per move.** Rejected: four overlapping ticks per bar is noise, and it still says nothing about control moves.
- **A radar or spider chart per move** (damage, control, support, cost). Rejected: pretty, slow to read, and it compares axes that are not in the same unit.
- **One currency, health, drawn on one scale everywhere.** Chosen. Every move in this game ends up either taking health from a machine or keeping health on the squad: a blow landed, a blow prevented (bind, stun, trance, fright, blind, a pull that breaks a charge, a knockout), a squadmate guarded or healed. If both are drawn as lengths on the same scale, the longer bar is simply the move that moves more health, whatever kind of move it is, and a control move's worth becomes visible as the part of a machine's blow it stops.

## Decisions

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 1 | **Two colors, the ones the health bars already use.** Red hatch is health lost (the chunk a hit takes off a health bar); gold hatch is health kept (the heal chunk). No new color is taught. | 85% | the round 2 chunk and heal hatches in `powerworksScene.css` |
| 2 | **A value bar under every legal disc's name**: red for the health the move takes at its best this round (its best target, its area, the ticks it leaves), then gold for the health it keeps (blows stopped, a knockout's next blow, a guard or heal). A skull ends the bar when that best use knocks its target out. The track is 12 HP long in 2 HP segments like a health bar; anything past the end shows a "+". The track is 72px on a wide screen and 50px on a phone, so the discs never collide. An empty track means the move does nothing useful this round. | 80% | paint checks at 1280x720 and 390x844 |
| 3 | **Each machine's next blow, on the same scale, under its plate**: a swords or crosshair icon for up close or at range, and a red bar for the health its most dangerous legal move is expected to take from one companion. Hidden information stays hidden: this is its most dangerous move and the expectation over whom it may pick (weighted by size, as it picks), never the order it has actually chosen. | 80% | `machineThreat` |
| 4 | **Gold on the threat shows what the orders stop.** The squad's standing orders, and the move in hand (hovered, armed or chosen), lay gold over the part of each machine's blow they would stop. Hovering Avilily's bind visibly eats into the crawlers' blows; hovering Blinding Shot does not, because a crawler's blow is not ranged. | 85% | the move value test "gives a blinding move nothing to stop against machines that only strike up close" |
| 5 | **Words only on demand.** The bars carry tooltips ("Best use this round: takes 8 health"), the disc's accessible description gains the same sentence, and the field guide gains "Reading a move". Nothing new is printed on the stage. | 90% | Nick: "without just slapping more words on the screen" |
| 6 | **One source for the numbers.** `packages/rules/src/dungeon/value.ts` computes them from the resolver's own previews (`damagePreview`, `restorePreview`, `guardedThreat`, `tickAmount`, the likelihood levers), so the bars cannot disagree with the round. A status's worth counts its chance and how many opportunities it holds; a knockout keeps the machine's next blow. | 85% | `value.test.ts` |

## How a status is valued

Against a machine whose next blow (`machineThreat`) is T HP, at chance p, holding n opportunities: binding stops p·T·n when the blow closes in (or the machine is charging); stunned and entranced stop p·T·n; frightened stops half of that; blinded stops half when the blow is ranged; slowed, sedated and disoriented are counted as stopping nothing (they change order or aim, not harm); a pull on a charging machine stops its release; a degrading status adds its ticks to the red. A knockout adds T to the gold.

## Friction reported

- **The value is this round's, not the fight's.** A bind that stops one blow is worth one blow here; a strong harm that ends a fight a round sooner is worth more than its red shows. That is the honest reading of one round and keeps the bars simple; if players over-value control, the bar could add a machine's remaining blows to a knockout.
- **Slowed and disoriented read as worth nothing.** They matter (order, aim), but not in health. If they should show, they need a second visual (the turn order strip could show a slowed machine sliding back).
