# Powerworks: showing what a move is worth

Status: shipped 2026-09-26 (PR #670); readout pass the same day, below. Tier: immersive (the play screen). Companion to [powerworks-radial-orders.md](powerworks-radial-orders.md), whose rounds 1 to 3 built the wheel, the move card and the on-creature previews this pass reads from.

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
| 1 | **Two colors, the ones the health bars already use.** Red hatch is health lost; gold hatch is health kept. No new color is taught. *Corrected in the readout pass:* this row misread the stylesheet. A hit's preview chunk on a machine's health bar was gold (red only for a knockout) and the heal chunk green, so the value bar's red and the health bar's gold drew the same quantity in two colors. The readout pass made the health bars follow the rule (R6). | superseded | `powerworksScene.css` before the readout pass |
| 2 | **A value bar under every legal disc's name**: red for the health the move takes at its best this round (its best target, its area, the ticks it leaves), then gold for the health it keeps (blows stopped, a knockout's next blow, a guard or heal). A skull ends the bar when that best use knocks its target out. The track is 12 HP long in 2 HP segments like a health bar; anything past the end showed a "+" (replaced by the number in the readout pass, R1). The track is 72px on a wide screen and 50px on a phone, so the discs never collide. An empty track means the move does nothing useful this round. | 80% | paint checks at 1280x720 and 390x844 |
| 3 | **Each machine's next blow, on the same scale, under its plate**: a swords or crosshair icon for up close or at range, and a red bar for the health its most dangerous legal move is expected to take from one companion. Hidden information stays hidden: this is its most dangerous move and the expectation over whom it may pick (weighted by size, as it picks), never the order it has actually chosen. | 80% | `machineThreat` |
| 4 | **Gold on the threat shows what the orders stop.** The squad's standing orders, and the move in hand (hovered, armed or chosen), lay gold over the part of each machine's blow they would stop. Hovering Avilily's bind visibly eats into the crawlers' blows; hovering Blinding Shot does not, because a crawler's blow is not ranged. | 85% | the move value test "gives a blinding move nothing to stop against machines that only strike up close" |
| 5 | **Words only on demand.** The bars carry tooltips ("Best use this round: takes 8 health"), the disc's accessible description gains the same sentence, and the field guide gains "Reading a move". Nothing new is printed on the stage. | 90% | Nick: "without just slapping more words on the screen" |
| 6 | **One source for the numbers.** `packages/rules/src/dungeon/value.ts` computes them from the resolver's own previews (`damagePreview`, `restorePreview`, `guardedThreat`, `tickAmount`, the likelihood levers), so the bars cannot disagree with the round. A status's worth counts its chance and how many opportunities it holds; a knockout keeps the machine's next blow. | 85% | `value.test.ts` |

## How a status is valued

Against a machine whose next blow (`machineThreat`) is T HP, at chance p, holding n opportunities: binding stops p·T·n when the blow closes in (or the machine is charging); stunned and entranced stop p·T·n; frightened stops half of that; blinded stops half when the blow is ranged; slowed, sedated and disoriented are counted as stopping nothing (they change order or aim, not harm); a pull on a charging machine stops its release; a degrading status adds its ticks to the red. A knockout adds T to the gold.

Since the readout pass: slowed adds the part of T a quicker companion then keeps off under pass 9's nimble rule, p·(T − T slowed)·n, and its turn-order effect is drawn on the turn order strip; sedated and disoriented still stop nothing in health and say so; a machine that already carries stunned or entranced has no blow this round (T = 0, "held"), so nothing more is stopped on it; a move that acts only on its user (a guard on itself) is read on its user, not on its order's nominal target; clearing a degrading status from a squadmate keeps the ticks it had left, in gold; a heal is drawn green, apart from the gold.

## Friction reported

- **The value is this round's, not the fight's.** A bind that stops one blow is worth one blow here; a strong harm that ends a fight a round sooner is worth more than its red shows. That is the honest reading of one round and keeps the bars simple; if players over-value control, the bar could add a machine's remaining blows to a knockout.
- **Slowed and disoriented read as worth nothing.** They matter (order, aim), but not in health. If they should show, they need a second visual (the turn order strip could show a slowed machine sliding back).

## Readout pass (2026-09-26)

### What Nick asked

With a screenshot of Crystorn's wheel over two crawlers at 6 and 3 health: "whats the scale for the bars? what would a full bar represent? what number or reference? and what does it mean when the bar is empty? and is that effectiveness for all enemies or one of them in particular?" The answers existed (12 health, a use that does nothing, the single best target), but nothing on the screen said them. Then: "do all fixes you recommend, and keep going past that. Identify the UX issues validated here and identify where else they apply."

### The four issues his questions validate

| # | Issue | The question that exposed it |
|---|---|---|
| A | **A quantity with no visible reference.** A bar with no number and no visible ruler cannot be read in the currency it claims (health). | "whats the scale? what would a full bar represent? what number or reference?" |
| B | **A zero with no reason.** An empty bar reads the same whether the move is immune, pointless here, or simply not measured. | "what does it mean when the bar is empty?" |
| C | **A readout that does not name what it is about.** A value is about one target; drawn with no referent it reads as "every machine", and the gold drawn on every machine at once said exactly that. | "is that effectiveness for all enemies or one of them in particular?" |
| D | **A readout that does not follow the decision.** The value vanished once a move was chosen, did not change with the aim, and ignored the rest of the squad's orders, so an attack on a machine the others already finish still read as full value. | implied by C, and by his earlier "no way to know how it would affect a creature" |

### Where each one applied, and what changed

| Place | Issue | Before | Now |
|---|---|---|---|
| Value bar under each disc | A | bar only, "+" past 12 | the bar ends in its number, in health; the "+" is gone |
| Value bar | A | empty track nearly invisible on the stage | the empty track is a visible ruler |
| Value bar | B | empty track | the no-effect mark (a crossed-out circle); its tooltip says why: already falls to your other orders, immune, strikes up close so blinding does not weaken it, not closing in so a bind does not stop it, already loses its turn, needs nothing it gives, changes when it acts but not how hard it hits |
| Value bar | C | best target unnamed | the target it is read on wears a crosshair on its plate while a disc is hovered, or a move is chosen and nothing is aimed |
| Threat bar under each machine | A | bar only | ends in the number that still gets through after your orders (gold when all of it is stopped) |
| Threat bar | C | the move in hand laid gold on every machine it could name | gold only on the one target the value is read on |
| Threat bar | B | a machine that already loses its turn showed its full blow | reads 0; the tooltip names the status |
| Move card (a chosen move) | D | no value at all | a value row: the bar, its number, and the name of the unit it is read on; aiming at another unit moves both |
| Machine health bars | D | nothing about the squad's standing orders | a darker red chunk at the end for what the standing orders (and the machine's own ticks) take this round; the move in hand's chunk stacks in front of it; a plan that finishes a machine shows a skull, and a move aimed at it reads "already falls" |
| Move values | D | read against the machines' current health | read against their health after the squad's other orders, in turn order, so the bar is what this move adds |
| Order chips on the plaques | B | an order that does nothing looked like any other | the chip fades and carries the no-effect mark; its tooltip and accessible description say why (a cleanse with nothing to clear, a guard with nothing to guard against, a blow on a machine the orders before it already finish) |
| Companion health bars | A | a degrading status showed its name and a count | its next tick shows as the darker chunk on the health bar |
| Status previews on a target | B | "Blinded 40%" on a machine it would not weaken | the ghost chip reads "no effect", like an immune one |
| Turn order strip | D | ignored the move in hand | shows the order the move in hand would make; a machine it slows and a companion an immediate move hurries carry a small arrow |
| Inspector move cards | A | "power 5", a second currency nothing converts | the move's worth this round, the same bar and number as the wheel (faded while it rests or is spent); a machine's move reads as its blow |
| Health preview chunk | A | gold for a hit, red only for a knockout, against the value bar's red for the same thing | one color language: red taken, gold kept, green restored |
| Field guide, "Reading a move" | A to D | colors only | the scale (12 health, 2 per segment), the number, the crosshair, the no-effect mark, the plan chunk, the turn order arrows |

Considered and left: the status chips' remaining count ("Blinded 1", "Corroding 1") and a disc's "COOLING 1" are numbers whose unit (opportunities, rounds) lives only in their tooltips. They pass issue A on a hover, and the degrading ones now also show their health effect; converting all three to the move card's rest pips is the next consistency step if they confuse.

### Decisions

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| R1 | **Every bar ends in its number, in health**, set like a health bar's number. Numbers on bars are the affordances rule's own tool (2026-09-23); what round 2 removed were unexplained numbers in another currency (power). | 85% | Nick asked for "number or reference" |
| R2 | **The referent is marked, not recommended.** The crosshair appears only while a value bar is showing, and only to say which unit that bar is about; it follows the aim and disappears once a target is aimed. It does mark the move's best target, which leans toward a suggestion; the alternative (no mark) is the ambiguity Nick hit. Overridable: the mark can move to the bar itself (the target's name under the disc) if it reads as advice. | 70% | affordances ruling, "no suggestions" |
| R3 | **Values are marginal to the squad's plan.** A move's value is what it adds after the other companions' standing orders land in turn order. Order does not change how much health the plan takes, so the marginal value ignores it; the chips use it (the later of two overkilling orders is the idle one). The squad's own losses before an order lands are not modelled: a plan is read as if every order lands. | 75% | `projectOrders` |
| R4 | **An idle order keeps its place.** It is faded and marked, not refused or rewritten: the player may have reasons. | 85% | no suggestions |
| R5 | **The turn order strip previews the move in hand.** Only units whose own pace the move changes carry the arrow, not every unit that shuffles a place to make room. | 80% | paint check with Water Sweep |
| R6 | **One color language across bars.** Red is health taken (the health bar's hit chunk, now red; the value bar's red; the threat), gold is health kept, green is health restored. The knockout keeps its skull and a stronger glow. | 85% | Nick's scale question; decision 1's correction |
| R7 | **The inspector shows worth, not power.** Base power stays in the move's description tooltip and the damage breakdown line; the one big figure on the card is now health. | 75% | issue A |

### Friction reported

- **Several starter moves are worth nothing against the first facility.** Graviclaw's Ground Anchor guards against being pulled, and crawlers never pull; Hippochamp's signature Emergency Water Cannon's cleanse has nothing to clear unless someone burns (its hit still counts); Crystorn's Blinding Shot's blind never matters against machines that only strike up close. The bars now say so plainly, so part of some wheels reads empty in sector 1. Smallest fix, if it reads badly in play: give the first facility one ranged or pulling machine so each of those moves has a use there; the creature records stay as they are.
- **Blinding a machine can hurt the squad.** A blinded target cannot receive a visual signal, so the squad's own visual moves fail on a machine it blinded. The value does not subtract that; it is rare in the preset squad. Report only.
- **Disoriented is close to worthless against machines.** A machine already picks its target by size; disoriented makes that pick uniform, which changes little. It reads as worth nothing and says why.
- **A bind and a knockout on the same machine are both credited one blow.** That is right (they stop two different blows, this round's and the next), but a player adding up gold may read it as counting twice.
