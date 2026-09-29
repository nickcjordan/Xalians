# Reclamation: the blow on each target (pass 73)

Status: shipped in pass 73, 2026-09-28. Owner: the Reclamation ownership brief (`reclamation-ownership-brief.md`); the running log is `reclamation-ownership-log.md`. It builds on pass 72 (`reclamation-placement-stacks.md`).

## The ask

Nick, on the stacked table: "are there any indications in place showing the effectiveness of the attacks you would be making on the enemy if you sent them to that particular world". There were almost none:

- the element lines under the creature pointed at said the chart's factor in words, with no amount;
- attack power was only in the role mark's title and the dossier;
- the card's number beside the role mark was speed.

On the proposal he said: "yes but be intentional in design".

## The design, and why each choice

**One blow at full strength, on the creature it lands on.** While a creature of yours is pointed at or lifted, every creature it could hit on each world carries the blow it would land there. That is its attack, times the element chart, times a sweep's share, less an armored target's quarter: the engine's own `attackPowerAgainst`, via `blowsAt` in `reclamationPreview.js`.

- **A fact of two creatures, like a hold.** It stays true whatever else is sent, so it needs no hedge. It says nothing about who goes first, how many blows land, who is hurt by then, or who falls. That keeps pass 72's rule: nothing shown during placement implies how the fight plays out.
- **On the target, beside its hold.** The number sits on what it measures (the affordances rule). It sits beside the target's hold so the two read against each other: a 22 against a 12 needs no word.
- **Dashed, in your color.** Every "would be" of your send is dashed in your color: the ghost's "+10", the ghost run on your bar. This is the same kind of thing, so it wears the same mark.
- **No minus sign.** Pass 58: a blind reader took a minus on their own card for their own loss. The number is a size, not a subtraction.
- **In the stage's top corner.** It stays off the silhouette and off the element badge (bottom left). The Clash's own blow number lands at the stage's heart, and the dashed chip gives way to it, so the table never shows both.
- **The chart's factor beside the number, only when uneven.** "22 ×1½" says both the amount and why. The words under the creature pointed at still say the why in full ("Psychic on water ×1½. Its blows land half again as hard on Hippochamp.").
- **Armor as plates, not a number.** An armored target takes a quarter less. A third token on a chip this small would crowd it, so the chip carries a small plates mark, and the words add "Graviclaw is armored. Every blow lands on it at three quarters." The chip's title spells out the arithmetic: "Each Tizzie strike lands 9 on Graviclaw at full strength (6, psychic on dark ×2, armored ×0.75)."
- **Which creatures carry one** follows the rules, not a guess:
  - a strike: every rival there, since its instinct picks the target in the Clash;
  - a sweep: every other creature there, yours included, in the loss red the Clash uses for what it takes from you;
  - a bolster or a shield: none, since they never strike.
- **The act it would play.** Under the act flip, the chosen act; otherwise the natural one.
- **Quiet by weight, not size.** The loud thing while pointing is still the ghost's number. The chip is ink on the hull with a thin dashed rule, the factor smaller and dimmer.

**The card's attack, on the mark of the act.** Each card now shows its number beside its role mark: "↗13" strikes for 13, "✳5" mends for 5, a shield's mark carries none. It is the number the dashed blow starts from, so a card's 14 and a chip's "22 ×1½" are one piece of arithmetic. Speed keeps its own mark (⇧) below it. Nick: the element chart is "the biggest factor here, besides the health and attack power"; health was on every column and attack power was in a title.

## Also fixed

- **A sweep's number was a strike's.** The sweep's sentence said "sweeps every other creature here for 10" while each creature took 6 (the sweep's share, `rules.sweepDiscount`, 0.6). `rolePower` now gives a sweep's share on each creature, everywhere the role sentence is printed: the card, the plate, the dossier.

## Where it does not show

- **The phone and short screens** hide the card's role mark (passes 52 and 38), and its attack with it. The chip on the worlds shows at every size.
- **The rival's blows on your creature** are said in words under the creature pointed at, not drawn. Nick asked about your attacks. Drawing both ways on every piece would double the marks.

## Checked

Tests in `reclamationBlowOnTarget.test.js`:
- `blowsAt` lands where the rules say, for strikes, sweeps and support, on three real seeds;
- each blow is the card's number times the chart, less armor;
- the act flip is honored;
- a hidden rival is left out;
- the chip draws dashed with its factor and plates, marks a blow on your own creature, gives way to the Clash's number, and has no minus;
- the armor line reads.
