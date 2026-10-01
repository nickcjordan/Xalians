# Reclamation: the squad reader loop (pass 76 onward)

Status: planned 2026-09-29, approved by Nick ("I think that sounds like a good system"). This is the resume point for the work after a context reset. Log: `reclamation-ownership-log.md`. The design being tested is `reclamation-squad-roster.md` (pass 75, PR #752, live).

## Why

Pass 75 rebuilt the squad as a roster and shipped it after one blind reader scored it 6 of 10. Nick, 2026-09-29: "Do you think six out of ten is an acceptable score to come back to me with?" It was not.

A UI pass reaches Nick only once it clears a set bar, measured by readers who have never seen the game. Nick does not playtest or list faults: the reader panel is how faults are found.

## The bar

A round passes only when all three of these hold:
1. **Finding and Intuitive, from three fresh Opus readers.**
   - **Finding:** each reader scores 8 of 10 or higher on how quickly they can find each fact they would weigh in choosing which creature to send where.
   - **Intuitive, measured mark by mark (Nick, 2026-09-30, from round 8):** each reader explains every mark on the squad panel with no help, from a fixed list given by where each mark sits. A mark counts as intuitive only if all three readers explain it right. The bar is every mark intuitive.
   - The readers' own 1 to 10 Intuitive score is still recorded, but it does not gate. It held at 5 for twelve readers across rounds 4 to 7, while those same readers explained nearly every mark correctly.

   Nick, 2026-09-30, after three rounds held at 6 on "how fast it lets you decide": "it should score how quickly it can find facts. Things should be intuitive". Deciding is the player's own judgment, which pass 72 and the no-suggestions rule leave to them on purpose.
2. **At least 9 in 10 of their factual answers are right,** checked against the engine's own numbers (see Ground truth).
3. **No reader names the same confusion** a previous round already tried to fix. A repeated top finding is a design decision, and it goes to Nick as a question (see `svg-plate-review-loop` in memory: a repeated top finding means a composition decision).

## Budget

- **No token cap (Nick, 2026-09-30): "yes we can do what we need for agents".** The first plan set a cap of about 1.5M Opus tokens; rounds 1 to 5 spent about 1.34M of it.
- **Cost per round:** about 270k Opus tokens for three readers.
- **No help for readers.** They never see the "?" legend, tooltips or hover text. Nick: "The reader should not have to see a tooltip to know how to play the game."

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

Each answer states how sure the reader is and quotes what on screen led to it. From round 4, the last items are:
- the two 1 to 10 scores, Finding and Intuitive;
- the single thing that most slows the reader's finding;
- every mark the reader could not interpret.

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
| 1 | 29 | 6, 5, 6 | 27 of 33 (82%) | the chart factor sat at the bar's end, beside the next world's cell, so no reader could tell which world it belonged to; it was hidden on the phone (3 of 3) | the factor moves beside its own number, prefixed by the creature's act glyph ("↗×2"), and shows on the phone |

### Round 1 notes (seed 29)

- **The signed "+N" worked.** All three readers read it as what the creature adds, and all found the largest one in a column.
- **The ▲/▼ read right (3 of 3),** as the world lifting or cutting the creature.
- **The rival tick read right (3 of 3),** as the rival's total to pass.
- **The sort caret was guessed right (3 of 3),** as a sort key, though each reader called it a guess.
- **Wrong 3 of 3: which used creature is which, and what happened to each.** The small silhouettes in the head carried no badge, and an underline was the only sign of a creature holding a world. Fix: each token gets its element badge, and a holding token gets the header's won-world flag.
- **Wrong 3 of 3: the phone's chart factor.** It was hidden. Fixed with the move above.
- **Not scored: which world the pointer was over (2 of 3 said the right world, the key said the middle).** A player knows where their own pointer is. The harness now records the world actually hovered.
- **Named but not yet fixed:**
  - the act glyphs before the attack number (↗, the sweep's star, the bolster's lift, the shield), named 3 of 3; the "↗×2" pairing is the first attempt to teach them;
  - the head's flags beside "2/5";
  - "STAKE ×2".

| 2 | 71 | 6, 6, 6 | 35 of 36 (97%) | the chart factor is tiny and faint, and whether "+8 ×1½" means 8 or 12 (3 of 3; one round 1 reader had named it) | the factor becomes the blow itself ("↗28" beside an act column's "↗14"), shown in every attacker's cell wherever a rival stands; ▲/▼ only for a cut or lift of 10% and 1 point |

### Round 2 notes (seed 71)

- **Accuracy passed the bar.** Round 1's fixes worked:
  - every reader placed each factor on its own world;
  - every reader read the phone's factors;
  - all three named each used creature, and two of three gave every fate right (the flag read as "won a world").
- **Scores did not move from 6.** Readers can find every fact, but deciding needs more than the biggest number.
- **The top finding is the factor's meaning, not its place.** Readers asked:
  - whether "+N" includes the factor;
  - whether an unmarked cell means neutral or no data.

  This is the second round in a row that the factor leads, so round 3 is the last attempt before it goes to Nick as a design question. The attempt:
  - print the blow as a number with the act's own glyph, so "↗14" in the act column and "↗28" in a cell read as the same kind of thing;
  - show a blow wherever a rival stands, even when even.
- **The act glyphs are still unread (3 of 3, and 3 of 3 in round 1).** The blow shares the act column's glyph and number kind, to teach it by pairing. If round 3 still misses it, it goes to Nick with the factor.
- **▼ on almost every cell (2 of 3 noted it).** The mark said little, so it now shows only for a cut or lift of at least 10% and 1 point.
| 3 | 89 | 6, 6, 6 | 39 of 39 (100%) | who ends up ahead after the fight: "the panel never totals it" (2 of 3); two numbers in a cell and nothing marking the best creature (1 of 3) | none: this goes to Nick as a design question (below) |

### Round 3 notes (seed 89)

- **Every fact was read right.** All three readers:
  - read the blow in a cell as the act column's hit at that world;
  - explained a smaller blow as the element matchup;
  - named "↗ a single strike, ✳ a burst" for the first time, though still as a guess;
  - found the only creature whose "+16" passes the rival's tick;
  - read the flags on used creatures as worlds won.
- **An act-column bug came out of the round 2 captures.** The act column ("↗8") printed the blow as the round's first world cut it, so it changed from round to round and sat beside a larger even blow in a cell. It now prints the creature's own blow, on no world.
- **The scores held at 6 for nine readers in a row, with accuracy rising from 82% to 100%.** What the readers now want is exactly what two standing rules withhold:
  - who wins the world once the fight is done (pass 72: nothing shown during placement may imply how the fight plays out);
  - a mark on the best creature for each world (affordances: no suggestions).

  The score question asks how fast the panel lets a reader decide. Under these rules, deciding is the player's own judgment, so the score likely cannot pass 8 by changing how the facts are drawn. Per the bar's third condition, a repeated top finding is a design decision, so it goes to Nick.

| 4 | 101 | Finding 6, 6, 7; Intuitive 5, 5, 5 | 36 of 36 (100%) | two look-alike numbers in a cell, with no sign of whom the hit lands on (3 of 3); the column sort caret, the rival tick and the grey cells while pointing, each unread by 3 of 3 | the hit is drawn as the board's dashed blow chip with its target's element badge; a sort icon; the tick gets a gauge cap; no grey cells, the pointed column is tinted |

### Round 4 notes (seed 101, the new rubric)

- **This round is the baseline for Nick's rubric** (Finding and Intuitive), on the round 3 build.
- **Accuracy stayed at 100%.**
- **Intuitive is the gap: 5 from all three readers.** Their lists of unread marks repeat each other:
  - the header caret, unread in every round since pass 75;
  - the rival tick;
  - the grey cells while a world is pointed at;
  - the head strip: the turn arrow, the pawn, "0/5" with its dots and flags, the "11/11" tally, and "STAKE ×2".
- **The head strip is the side row of pass 65,** shared with the rival's row at the top of the table. It is left for its own pass if round 5 shows it is what holds Intuitive down.
- **Budget:** about 1.07M of the 1.5M Opus cap is spent after this round, so round 5 is the last under the cap.

| 5 | 113 | Finding 7, 7, 6; Intuitive 5, 5, 5 | 39 of 39 (100%) | the role symbols, the sort icon and the head strip's counters still need guessing (3 of 3); every guess was right | stopped: the Opus budget is spent (about 1.34M of 1.5M), and the question goes to Nick (below) |

### Round 5 notes (seed 113)

- **Finding rose to 7, 7, 6.** Every hit now reads as the board's blow chip. All three readers named its target, by the badge matching the rival's piece, and all found the three creatures whose bars pass the rival's tick.
- **Intuitive held at 5 for all three,** as in round 4. Each reader guessed every symbol right, yet still listed them as marks they could not interpret, because nothing confirmed a guess:
  - the role symbols (↗ strike, ✳ burst, the bolster's lift);
  - the sort icon;
  - ▲/▼;
  - the tick;
  - the head strip's turn arrow, pawn, "0/5" and "11/11".
- **Intuitive likely needs confirmation, not a better symbol.** A symbol a reader decodes right but cannot confirm still scores as not self-evident. What could confirm them is the game's own legend, the "?" key a new player sees, or a word or two on the squad itself. Which of those is allowed is Nick's call, since the affordances rule says no labels on the board.

| 6 | 139 | Finding 6, 6, 6; Intuitive 5, 5, 5 | 42 of 42 (100%) | the same unconfirmed marks as rounds 4 and 5 (▲/▼, the tick, the sort icon, the act glyphs, the badge in the hit box) (3 of 3); the roster's two side-by-side blocks, which split each world's column in two (1 of 3) | none yet: repeated for three rounds, so it goes to Nick as the words question (below) |

### Round 6 notes (seed 139)

- **The new counters read right, 3 of 3:**
  - empty flag outlines filling toward "2/5";
  - small pieces for sends ("7/11: 7 filled").
- **The act glyphs are still read as guesses.**
  - The sword draws as a "slash" at 11 pixels. Sonnet's first sword had an arrowhead tip and read as an arrow, so it was redrawn before capture.
  - The bolster's heart reads as a "heart-shield".
  - The burst reads as "sun or gear".
- **Intuitive has held at 5 from nine readers across three rounds of symbol changes.** Readers now guess every symbol right, yet list each one as unconfirmed.
  - A symbol at 11 pixels cannot confirm its own meaning, and Nick ruled out the legend and tooltips.
  - What is left is words on the squad (its column heads or the act column), or fewer marks. Words on the table break the affordances rule, so that is Nick's call.

| 7 | 163 | Finding 6, 6, 6; Intuitive 5, 5, 5 | 40 of 42 (95%) | "what I add" against "what I hit" in one small cell; the reason behind ▲/▼ only on the world after a pick-up (3 of 3) | none yet: the Intuitive score has not moved in four rounds, so the question of how it is measured goes to Nick (below) |

### Round 7 notes (seed 163)

- **The act words read right, 3 of 3** ("strike 14", "sweep 5", "mend 6"). They were Nick's ruling: words only for the choices themselves. No reader listed the act glyphs as unread any more.
- **Intuitive held at 5 for the fourth round running,** across four different changes:
  - blow chips;
  - glyph redraws;
  - flag and piece counters;
  - act words.
- **The subjective score does not track what readers understand.** Twelve readers have scored 5 while explaining nearly every mark correctly. Readers list every mark they had to reason out, and score by that uncertainty, not by what they got right.
- **An objective count names the real gaps.** Round 7's lists, scored mark by mark against what each reader guessed:
  - **explained right by all three:** ▲/▼ as better or worse there than usual, the tick as the rival's total, the sort icon, the element badges, the act words, the flags as worlds won and the ✕ as fallen;
  - **explained wrong or not at all by at least one:** the badge inside a hit box (whose element it is), the tint on the pointed column, hollow and solid pieces in the send count, and the gap between "7/11" and eight listed creatures.

| 8 | 197 | Finding 7, 7, 6; own Intuitive 6, 6, 6; marks 20 of 20 explained right by all three | 33 of 33 (100%) | the hit box is small, and its target is only a tiny badge to match against the board (3 of 3) | the badge and arrow show only where two or more rivals could take the blow; the blow's number is larger |

### Round 8 notes (seed 197, the first round measured mark by mark)

- **Intuitive passes the bar.** All three readers explained all twenty marks right, with no help:
  - the act words and glyphs, "+N", ▲/▼, the bar and the rival's tick;
  - the hit box and its arrow onto the target's badge;
  - the element badges, the column symbols, the sort icon and ⓘ;
  - the greyed sent row;
  - in the top strip: the turn pointer, the flags toward 5, the pieces for sends left, the creatures holding won worlds;
  - STAKE ×2, MOVE and PASS.

  The loosest answer was one reader's "a marker for whose turn it is, or a play control" for the turn pointer. It named the right meaning first, so it counts.
- **Round 7's three misses read right this time:**
  - the hit box badge, now with an arrow onto it;
  - the send count, now only the pieces left, with no "/11";
  - the pointed column, whose tint is gone.
- **The readers' own Intuitive score rose from 5 to 6** for the first time in five rounds.
- **Finding is the remaining gap: 7, 7, 6.** All three name the hit box. It is small, and its target is a badge to be matched against the board.

| 9 | 199 | Finding 7, 7, 7; own Intuitive 6, 6, 6; every mark shown explained right by all three | 33 of 33 (100%) | the rival's standing at each world is only a tick, so readers look up at the world and subtract (2 of 3); the hit box does not say what it does to the count (1 of 3, by design, pass 72) | the head of each world's column prints how your side stands there, signed ("−4", "+3") |

### Round 9 notes (seed 199)

- **Finding rose to 7 from all three** once the target badge showed only where two or more rivals stand. Every world in this seed had a single rival, so no reader saw the arrow and badge; they read right in round 8.
- **What slows finding is now the tick.** Readers read it right, but to use it they looked up at the world for the rival's number.
- **The fix prints the standing where the column starts.** "−4" (behind, in the loss ink) or "+3" sits beside the world's symbol, so a cell's "+10" under a head's "−4" reads as the sum.
- **Still wanted, and left out by pass 72:** what a blow does to the count, which the fight decides.

| 10 | 233 | Finding 7, 7, 7; own Intuitive 6, 6, 6; every mark shown explained right by all three | 36 of 36 (100%) | what a blow does to the count: "whether a hit of 22 on a 14 creature wins the world" (3 of 3; the round 3 finding again) | none: the finding is pass 72's withheld outcome, repeated three rounds, so it goes to Nick |

### Round 10 notes (seed 233)

- **The signed standing at each column head read right, 3 of 3.** "−12" was read as "the rival leads by 12" and "+14" as "you lead". Every reader answered "can one creature put you ahead" from it.
- **Accuracy and Intuitive have now held at the bar for three rounds** (8, 9 and 10).
- **Finding holds at 7 for three rounds, all for one reason.** Readers cannot tell whether a blow takes a rival creature off the count, so they cannot weigh a big hit against a big "+N".
  - That is the fight's outcome, which pass 72 keeps off the table until both sides pass.
  - The blow chip already shows its size; showing it against the target's hold would say "this one falls", which pass 72 removed on purpose.

- **Harness note: the fixed policy loses quickly.** Seeds 41, 43, 53, 61 and 67 ended at 1 to 5 worlds in round 2, before the round 3 capture, so the round 2 seed was 71.

## Pass 77: the tiles (`reclamation-squad-tiles.md`)

Nick rejected the roster rows on 2026-09-30 and approved mockup F2, health-first tiles. The same bar and protocol apply. The question set was rewritten for tiles: twelve factual questions over the four states and the phone, and sixteen marks (M1 to M16) to explain with no help.

| Round | Seed | Finding | Answers right | Marks | Top finding | Fix |
|---|---|---|---|---|---|---|
| 11 | 233 | 7, 8, 7; own Intuitive 6, 7, 6 | 36 of 36 (100%) | all 16 right by all three; the natural-health tick right but unsure (3 of 3) | with a creature lifted, all three worlds wore near-equal frames, so which world the tiles' "→ N" was for had to be worked out from the board (2 of 3) | the pointed world takes a heavy ink frame; the other lifted targets dim to a faint one; with nothing lifted the pointed world is framed too |
| 12 | 233 | 7, 7, 8; own Intuitive 6, 6, 6 | 36 of 36 (100%) | all 16 right by all three; the tick again right but unsure | how the hit and the "+N" combine to decide the fight (2 of 3, and the third called them unrelated): pass 72's withheld outcome, ruled by Nick on 2026-09-30; the colors that tie numbers to worlds change every round (1 of 3, repeated from round 11) | none: both are repeats, so they go to Nick, and the tiles ship for his live read |

### Round 11 notes (seed 233)

- **Every answer and every mark read right** at the first sight of the tiles, including "→ N" as the hit at the pointed world and the tick as the creature's usual health.
- **What slows finding:**
  - which world is pointed at (2 of 3), fixed above;
  - the three numbers tie to their worlds by color alone, and the colors change every round (2 of 3). Left for now: the order also matches the worlds, and a world label on every block is the clutter Nick has asked to avoid. If it repeats after the frame fix, it goes to Nick.
- **Not the tiles:** "7 sends but 8 tiles" (one creature always stays back), STAKE ×2, the flags in Frackworm's chip.

### Round 12 notes (seed 233, after the frame fix)

- **The frame fix worked:** all three readers named the pointed world from its outline.
- **Finding holds at 7 with one 8,** for the same reason as the roster's rounds 9 and 10: readers want to know whether a hit decides the fight, which Nick ruled stays hidden while sends are made ("things will change").
- **The world colors** that tie each block to its world are the remaining finding the tiles own. A label on every block would add the words Nick asked to keep off the table, so it goes to him as a question.

