# Reclamation: the squad reader loop (pass 76 onward)

Status: planned 2026-09-29, approved by Nick ("I think that sounds like a good system"). This is the resume point for the work after a context reset. Log: `reclamation-ownership-log.md`. The design being tested is `reclamation-squad-roster.md` (pass 75, PR #752, live).

## Why

Pass 75 rebuilt the squad as a roster and shipped it after one blind reader scored it 6 of 10. Nick, 2026-09-29: "Do you think six out of ten is an acceptable score to come back to me with?" It was not.

A UI pass reaches Nick only once it clears a set bar, measured by readers who have never seen the game. Nick does not playtest or list faults: the reader panel is how faults are found.

## The bar

A round passes only when all three of these hold:
1. **Three fresh Opus readers each score the squad 8 of 10 or higher** for how quickly it lets them decide which creature to send where.
2. **At least 9 in 10 of their factual answers are right,** checked against the engine's own numbers (see Ground truth).
3. **No reader names the same confusion** a previous round already tried to fix. A repeated top finding is a design decision, and it goes to Nick as a question (see `svg-plate-review-loop` in memory: a repeated top finding means a composition decision).

## Budget

- **Cap: about 1.5 million Opus tokens** for the whole loop, as quoted to Nick.
- **Cost:** one reader is about 80,000 tokens, so a round of three is about 250,000.
- **Stopping:** four to six rounds are expected. Stop and report to Nick if the cap is reached before the bar is.

## Who does what

- **Fable (the orchestrator, this session):**
  - writes each round's brief;
  - judges the readers' answers against the ground truth;
  - decides the fixes;
  - reviews every diff;
  - keeps this file's round log.
- **Sonnet (implementation, per Nick 2026-09-29: "delegate to Sonnet when you see fit"):**
  - builds the capture harness;
  - implements each round's fixes to a written spec;
  - runs the web tests and the five table checks;
  - takes the captures.

  Each Sonnet brief names the files, the exact change, and the checks that must pass. The contract is in `architecture-doc-before-fanout` (memory).
- **Opus (the readers only):** Sonnet readers scored every Reclamation design 2 or 3, the live one included, while Opus read every answer right (`blind-readers-need-opus` in memory). Readers are never delegated down.

## The reader protocol

**Captures.** The harness saves every image with a neutral name (`table-a.png`, `table-a-foot.png` and so on). The "-foot" images are 2x crops of the squad panel.
- **Four game states:**
  1. round 1, nothing sent;
  2. round 1 mid-round, rival creatures on two worlds;
  3. the same state with a creature of yours lifted and a world pointed at;
  4. round 3 start, with several creatures used.
- **Three sizes:** 1440×900 and 1366×768 for every state, and 390×844 for states 1 and 3.

**What a reader gets.**
- **Premise only:** "Two sides take turns sending creatures from their squad to three worlds; each world goes to whoever holds more of it once both sides have passed and the creatures there have fought. You are the side at the bottom."
- **No help text, no key, no design doc.**
- **One file-read rule:** read only the listed images.

**The questions are task questions with factual answers.** Examples:
- "Which of your creatures would add the most on the middle world?"
- "Which would hit the rival's creature on the left world hardest?"
- "Which of your creatures can still be sent?"
- "What happened to the rest?"
- "What does a ▲ mean?"

Each answer states how sure the reader is and quotes what on screen led to it. The last two items are a 1 to 10 score and the single thing that most slows the reader down.

## Ground truth

The capture harness also saves `window.__reclamationDebug.glance()` for each state as JSON: each world's totals, and for every creature in hand, its gain, hold, home and strain at each world. Blows and chart factors come from the preview's `blowsAt` and `matchupsAt` for the same board.

The orchestrator scores each factual answer right or wrong against that JSON. It never scores by judgment.

## The loop

1. **Harness (Sonnet, round 0).** Commit `apps/web/scripts/reclamation-squad-readers.mjs`. For one seed it plays to the four states and saves the captures, the 2x crops and the ground-truth JSON into an output folder. It starts from the scratch probes `_stack72.mjs` and `_bench75.mjs`, which are untracked in `C:\dev\src\xalians-pass39\apps\web\scripts\`. It uses a seed the last reader did not see.
2. **Readers (Opus, three in parallel).** Every round uses a new seed, and the images are renamed so no reader sees a file twice.
3. **Judge (Fable).**
   - Score each reader's answers against the ground truth.
   - Record the three scores, the accuracy and each reader's top confusion in the round log below.
   - Rank the confusions by how many readers named them.
4. **Fix (Sonnet, to Fable's spec).** Fix the top one or two confusions. Keep to the rules in `affordances-not-labels` (memory):
   - no board labels and no suggestions;
   - numbers sit on what they measure;
   - one loud subject at a time;
   - a change reads before and after in numbers;
   - nothing shown during placement implies how the fight will go (pass 72).
5. **Checks.** The web tests and the five table checks must pass: proving, shift, actflip, hotseat and clash. Rebuild the preview (`$S/rebuild.sh`, then `git checkout -- packages/content`) before any capture.
6. **Repeat from step 2** until the bar is met or the budget is spent.
7. **Ship once, at the bar.** Open one PR with every round's changes, auto-merge it, confirm it is live, then report to Nick:
   - the scores round by round;
   - what changed;
   - where to look.

## Known open confusions (from the pass 75 reader, 6 of 10)

- **The cell's number.** The reader could not tell whether it was what the creature adds or its own strength. Pass 75 added the "+" sign, which has not been retested.
- **Speed.** The reader had no idea what "⇧30" means. It is shown in advanced mode only.
- **Sorting.** The reader did not see that the world symbols sort. Pass 75 added a faint caret, which has not been retested.
- **Dimmed columns.** While a world is pointed at, the other worlds' cells dim, and the reader asked why.

## Round log

| Round | Seed | Reader scores | Answers right | Top confusion | Fix |
|---|---|---|---|---|---|
| 0 (pass 75) | 7 and 13 | 6 (one reader) | not measured | whether a cell's number is an addition or a strength | signed "+N", sort caret |
