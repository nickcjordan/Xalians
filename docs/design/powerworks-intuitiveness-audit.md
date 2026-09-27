# Powerworks: an audit of how intuitive the play screen is

Status: proposed 2026-09-27, not yet run. Tier: immersive (the play screen). Follows [powerworks-move-value.md](powerworks-move-value.md), whose three passes (move value, readout, legible effects) each added indicators in answer to a question Nick asked.

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
