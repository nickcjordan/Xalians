---
name: story-figure-polish
description: Grade and polish a home story figure (the small beats drawn on the page, pages/home/pieces/figures.ts) until it clears a fixed bar, with independent graders, a hard ship gate, a stop rule and a scoreboard. Use before building, revising or shipping any story figure, and whenever Nick asks for the mini animations to be pushed further.
---

# Story figure polish

Nick, 2026-09-29: "work harder... put a system in place to where you can grade your work and get it to a point where you're proud of it." The Generators figure (PR #751) shipped with every review line at 6 to 6.5 against an 8.5 bar because nothing stopped it. This skill is what stops it. Read `docs/design/home-story-figures.md` (the contract, the rulings, the plan for each figure) and `docs/design/home-story-figures-scoreboard.md` (where every round is recorded; resume at its top open item) before anything else.

## The rules

1. **The builder never grades.** Scores come only from the graders below, run as subagents that change no files. I orchestrate, decide and integrate; I do not score my own frames.
2. **The gate.** Nothing reaches `main` until, in the same round: every rubric line is **8.5 or higher** from the art critic, the blind reader describes each beat correctly, the fact-check has no UNSUPPORTED or CONTRADICTED claim left, and the checks in "Mechanical checks" pass. Nick may waive the gate in words; the waiver and the lines still under are written on the scoreboard and in the PR.
3. **Rounds live on an artifact, not on main** (memory: art rounds go on an Artifact page, commits stay on one branch). One branch per figure; one artifact per figure, republished each round with the round's frames, scores and changes.
4. **The stop rule.** If a line fails to rise by at least 0.5 over two rounds in a row, stop polishing that line and take it to Nick that day with the frames, what was tried, and two or three concrete options. A stuck line is usually a design decision, not polish.
5. **Nick's rulings are constraints, not findings.** Every ruling in `home-story-figures.md` section 2 goes into the critic's brief as a fixed constraint. A finding that contradicts a ruling is dropped and noted, never built.
6. **Record every round** on the scoreboard before starting the next: scores per line, the blind reader's sentences, the findings acted on, the findings dropped and why, and the next weakest line.

## The rubric (eight lines, scored 1 to 10)

| Line | Question | 5 looks like | 7 looks like | 9 looks like |
|---|---|---|---|---|
| Glance | Does a stranger get the beat in the first moment? | the idea only lands after reading the caption | lands after a second look | lands in the first frame they see |
| Lore | Is everything it shows true to the canon? | shows a claim the sources contradict | true but implies more than the sources say | nothing a fact-checker would flag |
| Subject | The main object's design (the machine, the token) | flat vector shapes, even grey, outlined panels (the Generator at PR #751) | shaded forms, clear materials, some wear | a designed object with weight, wear and light, as believable as the machine in the Floria painting |
| Setting | The world or field it sits in | a few lines standing for a place | recognizable place with depth layers | a place with atmosphere and light that could sit in a painting |
| Motion | Timing, easing, rhythm, what moves and what holds | things move evenly and at once | clear lead and follow, some hold | every move has a reason and a beat; nothing twitches, nothing drags |
| Changes | Into, out of and between beats | a cut or a crossfade | the travelling light connects the pictures | the change itself tells the story (collapse into a point that becomes the figure) |
| Finish | Next to the painted recordings (grain, light, edges, color) | reads as a placeholder beside the End Wars plate | same family, visibly cleaner | could be mistaken for a moving detail of a plate |
| Phone | At 390 px wide | the subject is too small to read | readable, crowded | composed for the phone, not shrunk |

The finish reference is the End Wars recording on the live page (`https://www.xalians.com/`, beat 04). The 5 anchor for Subject and Finish is the Generators figure as shipped in PR #751 (frames in the scoreboard's round 0).

## The graders

- **Art critic** (Opus, `model: "opus"`, no file changes; resume the same agent each round so it remembers what it asked for). Input: close frames of the figure alone at 2x (`node scripts/design/snap-figure-close.cjs`), contact sheets of every change around the figure at wide and phone (`node scripts/design/snap-figures.cjs wide phone`), the End Wars frame, the rubric, the rulings as constraints. Output: a score per line and ranked findings, each with the frame, the region, what is wrong and the smallest canvas-level fix. Under 600 words.
- **Blind reader** (Opus; never Sonnet, whose readers scored every design low, memory "blind readers need Opus"). Input: three frames per beat with neutral file names and no brief, no captions, no page text. Output: one sentence per beat saying what is happening. It passes when the sentence names the beat's idea (the beat's "glance" line in `home-story-figures.md`). A fresh agent each round, so it never learns the answer.
- **Fact-check** (Sonnet, the `lore-factcheck` skill's brief): every label, every screen-reader description, and anything the picture states as fact (a count, a link, a cause).

## The builders

Delegate the drawing to Sonnet (`model: "sonnet"`) for efficiency: one agent per round, given the ranked findings it is to act on, the files it may touch (the figure's module under `apps/web/src/pages/home/pieces/` and nothing else unless the round says so), the rulings, and the rule that it runs `npx tsc --noEmit -p tsconfig.json` and the home tests before it returns. It returns what it changed and what it could not do. I review its diff before any frames go to the graders. Viewer or stage changes (`storyViewer.tsx`, `figureStage.tsx`) stay with me.

## Mechanical checks (every round that could ship)

- `npx tsc --noEmit -p tsconfig.json` and `npx vitest run src/pages/home src/pages/__tests__/home` from `apps/web`.
- `node scripts/plates/snap-story.cjs wide laptop phone small reduced landscape`: one live thing at a time, nothing live mid-change, no overflow, a clean console.
- Performance: the figure's draw time stays under its budget (see `home-story-figures.md`, section "Budgets"); measure before shipping, never guess.
- Dev server on port 3012 from the figure's worktree; kill it before removing the worktree (memory: stale dev servers lock worktrees).

## Shipping

When the gate passes: PR from the figure's branch with the final scores and the blind reader's sentences in the body, `gh pr merge N --auto --merge`, confirm the deploy, give Nick the live link and where on the page. Then update the scoreboard's standing state.
