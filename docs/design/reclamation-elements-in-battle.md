# Reclamation: elements decide fights (pass 71)

Status: shipped in pass 71. A rule change, on Nick's ruling.

## What went wrong

Every Reclamation design since 2026-09-02 used the element chart in two places:
- **In battle:** an attacker's element against its target's scaled the blow.
- **The "world matchup":** a creature's element against its world's element scaled its hold.

On 2026-09-21 the schema 5 conversion changed how a record stores its element. The engine kept reading the old shape, so both uses answered 1 for every creature, and nothing flagged it.

Pass 57 (2026-09-24) found this and fixed the read. It then shipped the chart switched off, so the game would not change under Nick, and parked "whether element should matter" in the ownership log's open items. It stayed there, carried every pass, and was never put to Nick as a question. He found it on 2026-09-28. That was a process failure: a switched-off rule the design depends on is a decision for Nick, and it should have been a question to him the day it was found.

## Nick's ruling (2026-09-28)

> "The element of the world should have a slight effect on the creature if it's a negative combination. Otherwise, it's irrelevant. If a creature is on his home world, then maybe that gives a slight boost. That makes sense. Otherwise, where the creature is doesn't really have any effect, right? And it shouldn't. The status effects come from when two creatures are battling. That's where the effect should be at play. So it's really concerning that apparently you just turned all of this off when the status, the elemental aspect is supposed to be the biggest factor here, besides the health and attack power."

On the world matchup: "Why is the world being used as a defender? That makes no sense ... If fire resists fire, then a fire creature on a fire world would be resisting fire, but they're not being attacked by fire, so nothing happens."

## What changed

| Rule | Before | Now | Lever |
|---|---|---|---|
| **A blow in battle** | chart off: every blow neutral | the attacker's element against its target's: ×2, ×1½, ×1, ×½, or ×¼ (the chart's 0, softened) | `ELEMENT_MATCHUPS` on |
| **A world's element** | the "world matchup": the creature attacking the world, off since the conversion | the world's element acting on the creature, only where the chart has it strong against the creature's (1.5 or 2): ×0.9. Otherwise nothing, including a creature on a world of its own element | `WORLD_ELEMENT_PENALTY` 0.9 |
| **Home ground** | ×1½ | ×1.25 | `HOME_GROUND_MULTIPLIER` (`rules.homeGround`) |

The world matchup's code is deleted. `worldElementFactor` in `creatureOnTable.ts` replaces it.

## On the table

- **A card's column** carries the world's element disc (the same disc as a piece's element badge) with ×0.9 where the world is hard on the creature. The house reads ×1.25.
- **A blow says the chart where it lands** when it is not neutral:
  - on the world: "Neph strikes Imprit: −12, water on fire ×2, 3 left";
  - in the log: "for 12 (water on fire ×2)".
- **The words under a lifted creature** name the chart on each blow it would take or land, for example "Neph strikes it for 12 (water on fire ×2)". A world that is hard on it gets its own line: "A water world is hard on fire: it holds nine tenths."
- **How to play** has an Elements section. The key and the Hold section give the new factors.

## Assumptions and decisions

| # | Decision | Confidence | Evidence |
|---|---|---|---|
| 1 | The chart applies at full strength in battle (×¼ to ×2) | 80%: Nick called element "the biggest factor ... besides the health and attack power" | the ruling above |
| 2 | The battle chart reads the creatures' elements, not each move's own element | 65%: the creature's element is the one the table shows, on every piece's badge; a move's medium is not shown anywhere, and many moves have none | `recordReading.ts` (medium on actions) |
| 3 | A world's element costs a tenth where it is strong against the creature (1.5 or 2), with one step for both | 75%: Nick said "slight", and a tenth matches the temperature factor he set | the ruling; `reclamation-temperature-weight.md` |
| 4 | Home ground ×1.25, not ×1.1 | 60%: both are "slight" next to ×1½; ×1.1 put the round-one starter at 44 to 45 percent on both seeds, and ×1.25 keeps it at 46 to 48 | sweep below |
| 5 | Air and water keep their half and quarter | 50%: Nick's "where the creature is doesn't really have any effect" leans against them, but he has not ruled on them; they are the one big location factor left | `reclamation-support-carries-weight.md`, open question |

## Measured

The sweep, 500 matches each on seeds 7 and 13, all with the chart on in battle and the world's element at ×0.9:

| Home ground | Starter | Comeback | Clash changes the leader | Strike keepers |
|---|---|---|---|---|
| ×1½ | 48.8 / 41.8 | 27.2 / 25.7 | 31.4 / 30.5 | 63.3 / 62.0 |
| **×1.25 (shipped)** | **48.4 / 46.0** | **26.9 / 28.3** | **31.0 / 31.9** | **63.8 / 62.1** |
| ×1.1 | 44.8 / 44.4 | 27.9 / 29.1 | 31.4 / 31.4 | 63.8 / 62.9 |

**Shipped, against pass 70 (500 matches, seeds 7 / 13):**

| Gauge | Band | Pass 70 | Pass 71 |
|---|---|---|---|
| Round-one starter wins | about 50 | 51.4 / 48.6 | 48.4 / 46.0 |
| Comeback | 30 to 40 | 28.5 / 26.1 | 26.9 / 28.3 |
| The Clash changes the leader | 25 to 40 | 28.0 / 27.9 | 31.0 / 31.9 |
| Downs per match | reported | 8.53 / 8.41 | 8.68 / 8.65 |
| Strike keepers | 40 to 60 | 64.8 / 61.4 | 63.8 / 62.1 |
| Sweep / shield keepers | 40 to 60 | 48.6 / 45.9, 48.6 / 47.6 | 50.2 / 50.9, 48.1 / 51.6 |
| Bolster keepers | selection | 67.1 / 64.7 | 63.9 / 63.4 |
| Round share with a support creature | reported | 51.4 / 51.4 | 50.4 / 51.0 |

**How much element weighs now:**
- **55 percent of the blows that land are not neutral:** ×2 on 7.5 percent, ×1½ on 20 to 21, ×½ on 22 to 23, and ×¼ on 4 to 4.5.
- **The side whose blows carried the better element won 67 to 69 percent of those worlds.** That is partly because a side that lands more blows also lands more of either kind, so read it as a strong factor, not an exact size.
- **Targeting is no longer blind.** Every targeting style that weighs a blow (the sharp creatures, "most vulnerable to its element") now reads the chart, since the chart is in the blow.

## Verified

- **Rules:** 652 rules tests pass on the Mac mini, and the typecheck is clean. New tests cover the world element factor (penalized only where the world is strong against the creature, untouched on its own element, the lever) and the chart as shipped.
- **Tests adjusted:**
  - Home ground is now read from the constant.
  - The forecast toll test's "a lift lost with a fallen ally" case now rides on two seeds found by scanning 60, b17 and b24.
  - The swift-move fixture got twelve more seeds. Real rosters still move 0.16 to 0.36 times a match.
- **Web:** all 269 Reclamation tests pass, with new ones for the chart's words, captions, sentences and forecast lines, and the world's element line.
- **Paint:** at 1366 by 768 and 1440 by 900 the element disc and its ×0.9 sit in their column. A five-character factor (×0.75, ×1.25) sets tighter so it stays inside its own column.
