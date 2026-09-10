# Validating a game before other people play it

Status: written 2026-09-07 from the Reclamation work, for every game built on the Xalians platform. This is a reference, not a plan. It says what can be learned about a game without another human at the table, what cannot, and the order to do it in. When a game reaches the point where a human session is next, this is the checklist for making that session count.

## The honest frame

Nothing short of a person can say whether a game is fun. What can be measured without one is whether the conditions for fun are present, and whether anything is broken in a way that would make a human's verdict meaningless. So the job before a human session is not "prove it is fun". It is: make sure the decisions are real, the rules can be understood from the table, the designer's own play produces data instead of impressions, and the session will leave evidence behind.

Four kinds of validation, in the order to do them:

1. Decision quality, from a simulator.
2. Comprehension, by prediction.
3. A structured self-protocol for the designer's own play.
4. A heuristic review against a rubric.

Each kind answers a different question and none replaces the others. The simulator cannot see confusion; the self-protocol cannot see balance; the rubric cannot see numbers. A human session on top of all four tests fun. A human session without them tests bugs.

## 1. Decision quality, from the simulator

Sid Meier's definition is the working one: a game is a series of interesting decisions, and a decision is interesting when no option is clearly best, the options are not equally attractive, and the player can make it informed. Every one of those clauses is measurable once a bot plays the game thousands of times.

**Naive-policy regret.** Play trivial policies against the reference bot: greedy (always the single top-scored move, no rationing), uniformly random among legal moves, pass-early (spend an even share, then stop), and any policy that abuses one rule (always hidden, always stack, never contest). If greedy wins nearly as often as the reference bot, the deeper decisions are decorative and the game is a puzzle with a known answer. If any trivial policy beats the reference bot, there is a hole in the rules, not in the bot. Random should lose overwhelmingly; if it does not, the outcome is mostly luck or structure.

**Option spread.** At each decision, how many options score within a narrow band of the best? Count them and keep the distribution. One dominant option every turn is a puzzle. Many near-equal options with no way to tell them apart is noise. A game lives in between: a few close options, distinguishable by a reading of the board. Track this by phase of the match; the opening and the last round usually differ, and that difference is itself a finding.

**Point of no return.** For each simulated match, record the earliest moment after which the eventual winner leads and never loses the lead, and separately the moment the result becomes mathematically locked. Plot the distribution against the match's length. If most matches are decided before the last third begins, the last third is dead time and the catch-up lever needs to move. If most are decided only in the last third, the early game may not matter, which is a different failure. Comeback rate (wins after trailing at the first checkpoint) is the companion number and should sit well above a floor of about a fifth.

**Ablation.** Remove one rule at a time and rerun the same batch under the same seed. Compare win rates by opponent, the match-shape numbers (decided-by-round, comeback rate, routs per match), and the usage rate of every other rule. A rule whose removal changes nothing measurable is carrying no weight; it is only cost in the rulebook and in the learner's head. A rule whose removal changes everything is load-bearing and should be taught first. Any rule used less than about one time in fifty is the first suspect, unless it works as a threat that shapes play without firing, and ablation is how to tell those apart.

**Dominance in the setup.** Whatever the player chooses before the match (a draft, a roster, a loadout, a faction), record pick rate and win rate per choice across seeds. Anything both always chosen and usually winning is a balance problem the first human will find in one session. Anything never chosen is dead content.

**Seat and starter bias.** Whoever moves first, or sits on a given side, should win about half the time under mirrored rosters. Measure it with mirrored setups so roster luck is removed and what remains is pure rules bias.

Every rate should print with a confidence interval so that signal is told from noise at the batch size actually run. Two hundred matches give about plus or minus seven points at the fifty percent mark; a lever that moves a rate by three points is not proven at that size.

## 2. Comprehension, by prediction

"Does this make sense" is testable without asking anyone whether they enjoyed anything. Take a set of positions from real matches (twenty is enough to start), show each with the rulebook and the table as the player would see it, and ask a reader who has never seen the engine to predict the ruling: who holds the world, what happens to each creature, what the score becomes. Every miss is a place where either the rules or the instruments on the table fail to explain what actually happens. Sort the misses by cause: a rule not written down, a rule written but not shown on the table, a rule shown but in a form that is misread. Each cause has a different fix.

An agent with only the rulebook and a screenshot as context is a cheap first reader. Its errors are not a human's errors, but a rule an agent cannot apply from the written text is almost always one a person cannot either. Run it in a bounded batch; it costs money per position.

The same test, inverted, checks the rulebook itself: for each rule in the design document, find the line of engine code that enforces it and the element on the table that shows it. A rule with no code is fiction. A rule with no element is a hidden rule, and hidden rules are what people mean when they say a game "does not make sense".

## 3. The designer's own play, as data

The designer is the only human in the loop and the designer's judgment is biased toward the design. The fix is not to trust the judgment less but to make the play produce records instead of impressions.

**Three questions after every match**, each answered in one line and saved with the seed and the opponent:

- Where was the moment of most tension?
- Was there a turn where you knew what to do before looking?
- Did the result feel earned, or handed to you?

One match of this is an anecdote. Ten are a pattern. The same world coming up as the tension every time says the arc has one peak. "Knew before looking" on the same phase every time says that phase's decision is not interesting. "Handed" after wins is worse than "handed" after losses.

**Quiet instrumentation** in the interface, stored locally and exportable, never sent anywhere:

- Time spent on each decision, by phase and by round. A decision that takes under two seconds every time is either obvious or being ignored.
- How often previews and inspection are consulted before committing. If the information is there and never read, either it is not needed or it is not findable.
- When skip is pressed, measured from the start of the thing being skipped. Skip in the first second of every playback means the playback is not worth watching and should be shorter or richer.
- Whether the first-time guidance is dismissed before or after its lesson is used.
- Setup choices (draft by hand or auto, sound on or off, mode).

The match itself should be replayable from a seed and a short URL so that any match worth discussing can be reopened exactly.

## 4. Heuristic review against a rubric

A separate critic, with no hand in the build, scores the game against a fixed list, each item on a numeric bar, and the scores persist so the next review resumes at the weakest item rather than starting over. The list, drawn from the usual lenses (Meier, Koster's theory of fun, MDA, game feel, usability heuristics for games):

- The first five minutes: can a new player make a legal, meaningful move without reading?
- Is the player still learning after ten matches, or has the game been solved?
- Does every action get feedback the player can read, told in the game's own language?
- Does a losing player have a reason to keep playing this match, and to play the next one?
- Do the fiction and the mechanics tell the same story? A rule that exists in the engine and has no trace in the fiction, or the reverse, is a seam.
- Is every number on the table one the player needs for a decision, and is every decision-relevant number on the table?
- Can the player express a style, and does the game acknowledge it?
- Is watching at the player's pace, with no dead time?

The critic never fixes anything and never grades its own suggestions. The builder never grades the build.

## What none of this can tell you

Whether anyone wants to play it twice. Whether the theme lands. Whether the tension the numbers promise is felt. Whether a rule that ablation calls load-bearing is also the rule people hate. Those are the questions for the human session, and the four kinds above exist to clear everything else out of the way first so the session is spent on them.

## Preparing the human session

Do these before the first outside player, so their time leaves evidence:

- The instrumentation above is on, local, and exportable in one action from the end of a match.
- Every match has a seed and a URL that reopens it.
- The three questions are asked at the end of every match, in the interface, not by the designer leaning over.
- The designer does not explain the rules aloud. If a rule has to be explained, that is the finding.
- One session tests one thing. Fun is not one thing.

## How this applies to Reclamation

The tools for kinds 1 and 3 exist in the repo; kinds 2 and 4 are run by hand or by agent when a pass calls for them.

- Kind 1: `apps/web/src/gameplay/expedition/devtools/expeditionValidation.js` (naive-policy regret, option spread, point of no return, ablation, draft dominance) and `expeditionSimulator.js` (balance report, seat fairness, rival ladder). Results are recorded in `reclamation-play-enhancements.md` with the date and seed.
- Kind 2: the rulebook is `reclamation-design.md`; positions come from seeded matches at `/reclamation?seed=N&rival=id`.
- Kind 3: the Proving notes panel on the match report and the local telemetry in `reclamationTelemetry.js`; export from the report.
- Kind 4: the adversarial critic loop already used for the table's visual passes, with the rubric above.
