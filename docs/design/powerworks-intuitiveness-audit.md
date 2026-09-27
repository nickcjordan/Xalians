# Powerworks: an audit of how intuitive the play screen is

Status: run 1 done 2026-09-27 (results at the end); fix passes proposed. Tier: immersive (the play screen). Follows [powerworks-move-value.md](powerworks-move-value.md), whose three passes (move value, readout, legible effects) each added indicators in answer to a question Nick asked.

## Context

Nick, 2026-09-27, after the legible effects pass (PR #686): "its still not intuitive, i think indicators have been added but we need to work on making them intuitive. The user should not have to think about what icons mean or what different animations or affordances mean. Help me step back and design an audit to understand where things can be more intuitive."

The last three passes answered one confusion at a time, each with a new mark: a value bar, a crosshair, a no-effect mark, a before and after readout, a threat badge, a planned chunk, turn order arrows. Each answer was locally right and tested on its own. What nobody tested is the whole screen as a first-time player meets it: how many things there are to learn, whether one mark means one thing, and whether a player can decide a round from what is in front of them without hovering, opening the guide, or remembering a legend. This audit measures that, before any more marks are added.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | Start from the player's questions, not from the indicators: an indicator is only worth keeping if it answers a question a player actually asks while deciding or watching. | 90%: every earlier pass started from an indicator and added one more | the move value brief's "what was considered" list |
| 2 | "Intuitive" is measured, not judged: context-free readers answer the player's questions from screenshots, scored against the engine's own answer key. | 85%: this method moved Reclamation's table from 28.5 to 41 of 41 in pass 52 | affordances memory, pass 52; `docs/design/game-validation-principles.md` |
| 3 | A signal that needs a legend, a tooltip or the guide to be understood is failing, even if it is correct. Tooltips stay as a second layer, never the only one. | 85%: Nick, "should not have to think about what icons mean" | this brief's context |
| 4 | Swapping an icon for one short word in place is not "slapping more words on the screen"; adding a sentence is. Words are allowed where a symbol would have to be learned. | 65%: Nick has ruled against labels and sentences (2026-09-23, 09-26) but not against a word replacing a symbol; overridable | affordances memory; move value brief decision 5 |
| 5 | One channel, one meaning, everywhere: an icon, a color or a shape means one thing across the whole game, the guide and the inspector included. | 90%: the inventory below already finds icons carrying four and five meanings | the inventory below |
| 6 | Nick's own cold play, spoken aloud, is part of the evidence: agents are not players, and he is the only real player so far. | 80% | his screenshots have found every confusion so far |
| 7 | The audit ends in a small signal dictionary enforced by a test, not only in a list of fixes, so the next pass cannot quietly add an eleventh meaning to the gold. | 75% | the gold and crosshair counts below |

## 1. The player's questions

Every round, a player needs to answer these. Each gets an answer key computed by the engine for every screenshot the audit uses.

**While planning**

1. Who acts, and in what order?
2. What is each machine about to do, and to whom? (The honest answer is partly "you cannot know": a screen that implies certainty fails too.)
3. How healthy is everyone, and what is already wrong with them (bound, burning, charging, guarded)?
4. What does this move do, and to which unit?
5. Which of this companion's moves is better right now, and why?
6. What will my whole plan do: who falls, who is hurt, which orders are wasted?
7. What is this companion good at, and why would I bring it?

**While a round plays**

8. What just happened, to whom, and did it work (hit, miss, blocked, resisted, knocked out)?
9. Why did it happen that way (a bind stopped a closing attack, a charge was broken, a reaction shocked back)?
10. What changed on the board because of it?

**After the round**

11. Did my plan do what I expected, and if not, what was different?

## 2. The signal inventory

Every signal on the play screen, with its intended meaning, every place it appears, every other meaning it also carries, and how a player reaches it (on sight, on hover, on click, only in the guide). The inventory covers the planning stage, a hovered move, a chosen and aimed move, a complete plan, every playback beat kind, the round result, the inspector, the field guide, and the phone layout of each.

Channels to inventory:

- **Icons.** Every Lucide icon and custom mark (octagon disc, target ring, ground ring, rest pips, skull, no-effect circle, matchup triangle, turn order arrow).
- **Colors with a meaning.** Gold, red, green, purple, the element hues, the dimming of units, the lime and danger borders.
- **Shapes and positions.** Rings under units (solid, dashed, faint), plates, chips, the wheel, the card, the badge, the banner.
- **Numbers.** Every number on screen: what it counts, in what unit, and whether it says which unit it belongs to.
- **Animations.** Every keyframe and transition: what it is meant to say, when it plays, and whether two animations can be confused.
- **Interaction states.** Hover, focus, armed, chosen, aimed, dimmed, muted, faint, resting, idle.

### What a first count already shows

Counted from the code on 2026-09-27, before any testing:

- **56 distinct icons and 26 animations** on one game screen and its panels.
- **The crosshair carries five meanings.** It marks a ranged attack, the machine a move's value is read on, the aimed target's line on the move card, how often machines pick a companion (inspector), and "ranged" in the symbol key.
- **The lightning bolt carries four.** It marks a charge ("lands next round", "Charged"), a contact reaction's shock back, the healing station between sectors, and the guide's "Size, speed and element" heading.
- **Gold carries at least six.** It marks the signature rim, health kept for the squad, the selected companion, the move in hand's chunk outline, the part of an attack the orders stop, and a companion whose order is set in the turn strip.
- **The shield** marks a guard on a unit, a guarded hit on a health bar, a guard a move would give, and the "Guarded" status. It also marks the briefing's "4 encounters", the camp screen's heading between sectors, and the guide's "Practice expedition" section, none of which has anything to do with guarding.
- **Several core answers are reachable only by hovering or opening a panel.** They include why a value is empty, what a status does, what a machine's attack number counts, how often machines pick a companion, and what a crosshair on a plate means.

## 3. The tests

### 3.1 Blind first look (the core measure)

Readers are context-free vision agents who have never seen the game and get no guide.

- **Screenshots.** Each reader gets screenshots of scripted moments, loaded from saves at the start of each sector, so every moment is reproducible.
- **Questions.** Each reader answers questions 1 to 11 about what is on screen.
- **Scoring.** Each answer is scored against the engine's answer key: correct, partly right, wrong, or "I can't tell".
- **Moments.**
  - The round's opening.
  - A companion selected, and a disc hovered.
  - A move chosen and aimed.
  - A plan with a wasted order.
  - A machine charging, and a bound machine.
  - Each playback beat kind: hit, knockout, bind stop, miss, resisted, charge, release, shock back.
  - The round result.
  - The inspector.
  - The phone layout of the planning moments.
- **Runs.** Three readers per moment, so one reader's quirk does not decide a finding.
- **Second run.** The same readers repeat the test with the field guide in context, to measure what the guide is carrying that the screen does not.

### 3.2 Signal naming

For every signal, a reader first sees it in isolation and says what it means, which tests whether the mapping is conventional. Then the reader sees it on the screen and says what it means there, which tests whether the context teaches it.

A signal passes when two of three readers name its meaning in context without the guide. It is marked conventional when they also name it in isolation.

### 3.3 Animation reading

Readers get a short strip of frames for each beat kind and describe what happened. Their answers are compared with the engine's event log. Two animations are marked confusable when readers describe them the same way.

### 3.4 Nick plays cold, aloud

A round in a sector he has not seen in a while. He says out loud every moment he thinks "what is that?" or "why did that happen?", and I log each one against the inventory. He has found every confusion so far; this makes that a planned part of the method instead of an accident.

### 3.5 Consistency lint

A small registry in code maps each meaning to its one icon and one color. A test fails when an icon or a color class appears under a second meaning. This runs in CI from then on.

## 4. Scoring and what counts as passing

Each signal gets:

- its blind comprehension in context;
- whether it is conventional;
- how many meanings it carries;
- which player question it serves (none means decoration or noise);
- how a player reaches it: on sight, on hover, on click, or guide only.

The screen passes when:

- the core planning questions (1, 3, 4, 5, 6) score at least 90% correct from screenshots alone, with no guide;
- the playback questions (8, 10) score at least 90%, and the "why" question (9) at least 75%;
- no core decision needs a tooltip;
- every channel carries one meaning;
- the number of distinct icons falls, not rises.

## 5. Triage

Each failing signal gets one treatment:

- **Make it conventional.** Swap it for the mapping players already know (a heart for health, a skull for death, a clock for waiting).
- **Split an overload.** Keep the icon for its most conventional meaning and give the others a different, conventional mark.
- **Merge.** Two signals saying the same thing become one.
- **Say it in one word, in place.** Only where a symbol would have to be learned (decision 4).
- **Move it.** Put it where the eye already is at the moment of the decision.
- **Remove it.** It answers no question, or answers one no player asks.

Fixes land in small passes. Each pass reruns the same blind test on the same moments, and a pass counts only if its scores rise.

## 6. What the audit produces

1. **The inventory**, with each signal's scores, as a table in this document.
2. **The per-question results**, before any fix.
3. **A ranked list of findings**, worst comprehension first, each with its treatment.
4. **The signal dictionary.** The small set of icons, colors and shapes the game uses, each with one meaning, enforced by the lint in 3.5. Later passes, and later games, start from it.

## Cost and effort

The blind tests run as subagents reading screenshots.

- **Test 3.1:** about 18 moments times 3 readers, about 54 short runs, and the same again with the guide.
- **Test 3.2:** about 60 signals, batched about 10 per run, times 3 readers.
- **Test 3.3:** about 8 beat kinds times 3 readers.

In total, about 150 short agent runs, each a few screenshots and a page of questions. The screenshots come from the saves-per-sector harness already built for the overlap check. Nick's session (3.4) is about 15 minutes.

## Run 1 results (2026-09-27)

Run on the live site at commit 96e4bec5 (PR #686), seed 7, the preset squad. Record: [powerworks-audit-runs/2026-09-27/](powerworks-audit-runs/2026-09-27/) (every reader's answers, the grades, the merged confusions, the engine facts). Signal inventory: [powerworks-signal-inventory.md](powerworks-signal-inventory.md). Harness: `scripts/powerworks-audit/`.

### What was run

- Planning, no guide: 8 moments, 34 questions, 3 readers.
- Planning with the field guide: the same, 3 readers.
- Phone: 2 moments, 3 readers.
- Playback: 11 beats as frame strips, 3 readers.
- Signal naming: 31 marks, first in isolation and then in place, 3 readers.
- One independent grader scored every answer against the engine's key.
- One agent compiled the signal inventory from the code.

That is 17 agent runs, not the 150 this plan estimated. Readers took moments in sequence, as a player does, instead of one run per moment. Nick's cold play (3.4) and the lint (3.5) are still to come.

### Scores

Share of answers graded fully correct, by the player's question:

| Player question | No guide | With the guide |
|---|---|---|
| 1. Who acts, in what order | 67% | 67% |
| 2. What each machine will do | 47% | 80% |
| 3. The state of every unit | 78% | 83% |
| 4. What this move does | 53% | 53% |
| 5. Which move is better, and why | **0%** | 22% |
| 6. What the whole plan does | 40% | 47% |
| 7. What a companion is good for | **0%** | 89% |
| Marks and previews | 13% | 60% |
| **All planning questions** | **38%** (39 of 102) | **62%** (63 of 102) |
| Phone (7 questions) | 52% | |
| Playback (27 questions) | **98%** (79 of 81) | |
| Signals named in place | 45% (42 of 93) | |

The pass bar was 90% on the core planning questions with no guide. The screen scores 38%. Playback passes.

**The guide adds 24 correct answers, so its knowledge is learnable but not on the screen.** Everything the guide explains (the value bar, the attack badge, the inspector lines) was misread without it.

### Findings, worst first

**F1. Four things on screen are wrong, not just unclear.** These led readers to confident wrong answers (flagged M by the grader), and they are bugs to fix whatever the design direction.

- **"7 → 0" under a machine says your orders stop its attack, but it attacks first.** In screen 4, Crawler 1 acts second, before the companions who knock it out; the badge counts the knockout as stopping its blow. Five of six readers concluded it would not attack; in play it hit Hippochamp for 7 before it fell.
- **The "wasted" mark is wrong.** Crystorn's order on a machine the others finish is marked as doing nothing, but the engine redirects it to the next machine (it hit Crawler 2 for 6).
- **A fallen machine's "Down" label sits in the squad's area.** On screen 5 it landed beside Avilily's move wheel, and five of six readers said Avilily was knocked out.
- **Playback says "Stopped by binding" when a pull broke a charge.** Readers read past it only because the second line said "its charge was broken".

**F2. The move value bar reads as a resource meter.**
- **What readers said.** No blind reader, and no phone reader, read the striped bar under each move as what the move is worth. All nine said cost, cooldown, charges or stamina. In the naming test, 0 of 6 answers were right. It is the most-raised confusion (10 of 15 readers).
- **The consequence.** "Which move is better" scored 0 of 9 without the guide, and that is the question the bar was built to answer.
- **What does work.** The move card's sentence, "Crawler 1: 8 damage, 14 to 6", was read correctly by every reader.

**F3. A machine's intent does not read as intent.**
- **What readers said.** Asked what Crawler 1 will do this round, all three blind readers said they couldn't tell. They read the "⚔ 7" badge as an attack stat, not as the attack about to land.
- **With the guide,** all three got it.

**F4. Symbols that mean something else to a newcomer.** In the naming test (six readings each, isolated and in place):
- **The crown** read as "leader", "recommended" or "default" (0 correct). That is the reverse of the no-suggestions ruling.
- **The » on a turn-order portrait** read as "fast-forward" or "faster" (0 correct, flagged misleading); it means the unit would act later.
- **The matchup triangle** read as a warning (0 correct, flagged misleading).
- **The dot on a turn-order portrait** was not read as "order set" (0 correct).
- **The diamond on the move card** was unexplained to 8 of 15 readers.
- **The lightning bolt** marks a charge, a shock-back reaction and the "Charged" status. "Charged" was the second most-raised confusion (9 of 15), and two readers credited the Guardian's shock-back to its charge.

**F5. Hovering a move does not show what it does.**
- **Blind readers.** No blind reader could say what Water Sweep would do from the hover. The change appears on a machine's plate across the stage, with nothing tying it to the hovered disc.
- **Once chosen,** the card says it in words, and every reader got it.

**F6. Marks that look alike.**
- **Rings.** The gold rings under a selected companion, an aimed target and a possible target read as one thing.
- **The crossed-out circle.** It means both "this order does nothing" and "this move is worth nothing".
- **Greyed creatures.** They read as "not ordered yet", "already used" and "not a target" by different readers.

**F7. The inspector.**
- **Readers do read it.** With context, readers understood the new lines about how often machines pick a companion and how much it slips.
- **The move cards** read as costs and cooldowns (see F2).

### What works, and should be kept as the pattern

Every signal read correctly by all six readings is a word or a number said in place:
- the before and after health readout ("14 → 6", "14 → 💀 0");
- the move card's sentence;
- status words with a count ("Corroding 1", "Restrained 40%", "shocks back −4", "× Down");
- order chips ("Heavy Ram → Crawler 1");
- the playback banners, at 98%.

The signals that failed are almost all glyphs that must be learned: bars, crowns, chevrons, triangles, dots, diamonds and rings.

### What this means for the "affordances, not labels" ruling

The evidence says a short word or number in place is what a newcomer understands, and an abstract glyph is what they misread. The 2026-09-23 ruling is against board labels, sentences and suggestions. This audit does not argue for sentences or suggestions: the crown fails precisely because it reads as a suggestion. It argues for replacing glyphs with the word or number they stand for ("Signature", "acts later", "strong", "8 dmg"), in the place the glyph now sits. That is decision 4 of this plan, now with data. Nick decides.

**Ruled 2026-09-27 (Nick):** "if there isn't a reasonable icon that is intuitive enough, then I am willing to consider using a word as a badge." So pass C tries a familiar icon first, and uses a one-word badge where no icon reads on its own; the rerun decides which.

### Readers' model

Run 1's readers ran on Sonnet. The Reclamation audits later found Sonnet readers scoring every design lower than Opus readers, including designs Opus read correctly, so run 1's absolute scores may understate comprehension. The findings are still sound: every finding above rests on specific misreadings, and the four wrong readouts are wrong whoever reads them. Reruns use Opus readers, and the first rerun also repeats run 1's screens on Opus to give a like-for-like baseline.

### Proposed fix passes, each followed by a rerun of this audit

- **A. Make the screen true (no design question).**
  - Stop the plan readout from counting a knockout against a blow that lands first.
  - Show a redirected order as redirected, not wasted.
  - Pin a fallen unit's label to its own plate.
  - Word a broken charge as a broken charge.
  - Order "wears off" after the blow it stopped.
- **B. Say each move's effect in words and numbers.**
  - Replace the value bar with the effect itself on each disc, for example "8 dmg" or "stops 7".
  - Make hovering open the same card that choosing does.
  - Say a machine's intent as its next attack on one of yours, for example "next: ~7 to one of yours".
- **C. Shrink and fix the vocabulary.**
  - Replace the crown, », triangle, dot and diamond with the word they stand for.
  - Give the lightning bolt one meaning.
  - Separate selection rings from target rings.
  - Build the one-meaning lint (3.5) on the resulting dictionary.

## Pass A, shipped 2026-09-27: make the screen true

- **A knockout no longer stops a blow that lands first.** The plan projection (`projectOrders`) tracks, for each machine the plan knocks out, whether it falls before its own turn. The attack badge reads "7 → 0" only then. A status or bind from a companion who acts after the machine no longer counts against this round's blow either.
- **Orders follow the engine's redirect.** An order whose target falls to the orders before it goes to the next standing machine in the row, as the resolver does. The projection deals its damage there, and the chip names where it lands ("↱ Crawler 2") in place of the "wasted" mark. The idle mark stays for orders that really do nothing, like a heal on a squadmate at full health.
- **"Down" rides the fallen unit's own plate.** It no longer floats under a fallen machine into the squad's row.
- **Playback names a broken charge.** A blocked event now carries its cause. The banner reads "Charge broken" when a pull, stun or earlier bind broke the charge, and "Stopped by binding" only when a bind stops the order.
- **A bind that ends with the opportunity it spent is reported after the blow it stopped.** The sequence is "stopped by binding", then "no longer restrained".
