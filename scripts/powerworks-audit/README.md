# Powerworks intuitiveness audit harness

The method is in `docs/design/powerworks-intuitiveness-audit.md`; run records live in `docs/design/powerworks-audit-runs/<date>/`. Rerun the same moments after every fix pass: a pass counts only if the scores rise.

## Steps

1. Save histories for the scripted moments (seed 7, the starter squad, a greedy value policy):
   `node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/devtools/auditStates.ts > untracked/powerworks-audit/states.json`
2. The engine's facts behind the answer key, for each moment:
   `node apps/web/scripts/runNode.cjs packages/rules/src/dungeon/devtools/auditFacts.ts --dir=untracked/powerworks-audit --moments=scripts/powerworks-audit/moments.json > untracked/powerworks-audit/facts.json`
   Check `keys.md` against these facts when a rule or the preset squad changes.
3. Capture every moment, and the three playback streams, from the live site (set `BASE` to test a local build):
   `node scripts/powerworks-audit/capture.cjs`
4. Build the neutral reader packets (images named by number only, no meaning in any file name):
   `python scripts/powerworks-audit/build_packets.py`
   Check the playback frame numbers in `build_packets.py` (the `beats` list) against `untracked/powerworks-audit/shots/*-frames.json` after any change to playback timing.
5. Run the readers: three per packet (`planning`, `planning-guide`, `playback`, `phone`, `signals`), each a fresh subagent on Opus (Sonnet readers read every design lower, even correct ones) with the reader prompt below. Have each save its answers to `untracked/powerworks-audit/answers/<packet>-r<n>.md`.
6. Run one grader subagent with `keys.md` and the answers. It writes `grades.json` and `confusions.md`. The builder does not grade.
7. Copy the answers, grades and confusions to `docs/design/powerworks-audit-runs/<date>/` and add the scores to the audit document.

## Reader prompt

> You are a participant in a usability study of a video game. You have never seen or played this game and know nothing about it beyond what these files show. Your materials are in this folder: `<packet folder>`. Start by reading questions.md in that folder, then read each image it names with the Read tool, in order. Strict rules: read only files inside that folder; do not open any other file or folder, do not run commands, do not search the web or any code. Answer only from what you can see. When you cannot tell, say "can't tell"; guessing is allowed only if you mark it "(guess)". Answer every question, in order, using its number. Keep answers short. End each with (confidence 1 to 5). Your final message must contain all your answers, one per line, numbered as in the questions, and nothing else.

For `signals`, add: answer Part 1 for every number before opening any part-2 screen.

## Known flaws in run 1 (2026-09-27)

- The playback sheet asks M03 (iii) about a label that appears in moment 04; graders accepted answers about the corroding label.
- Playback frames were sampled about every 0.8 s, so most beats have two frames (before and after the blow), not the whole animation.
