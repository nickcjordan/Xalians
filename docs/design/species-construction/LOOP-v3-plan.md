# Construction loop v3: process plan

Status 2026-10-01. Nick: improving the system matters more than the next phase of one creature; adopt every improvement. Akinza work (hair-clump ear fan, neck at the head-body join, spine S-curve) resumes only after the system is proven.

## Evidence from the v2 run (Akinza rounds 2 to 16)

- Weighted 2.72 to 5.45 on the 80-criterion checklist. Rounds 2 to 7 gave +2.4, rounds 8 to 16 +0.35 at the same cost per round.
- Agent share of all tokens: builders 61 percent (36 agents, 34 minutes, about 77 tool calls and 4 to 5 component builds each, mostly cache reads of a long history), critics 22 percent (38, 7 minutes), spec writers 17 percent (11, 22 minutes).
- 29 orders, 19 kept. About a fifth of builds were discarded. Three harness bugs (posed refit drift, stale frozen results, cross-component bleed) caused wrong verdicts and four mid-run restarts.
- The ear fan took 11 orders with mesh locks and is still the weakest identity part. The neck could not be fixed because R05 orders go to the body builder only.

## The seven changes

1. Parametric build per creature: one recipe (ordered steps, script plus parameters, from the reconstruction root) kept in git and replayable, with the existing part generators (arms, legs, hind paws, face, fan locks, torso) chained behind it. Orders change parameters and rebuild; parts cannot damage each other; geometry is regenerable from git. Lineage of the current best parts: lineage-0458.md (being traced).
2. Harness shakedown before rounds: measure deliberate variants (unchanged, head-only, body-only, one part broken) and confirm each criterion moves only when it should. Judge simulator: re-decide every recorded round under a proposed rule offline.
3. Plateau auto-stop: when three rounds gain under .15 together, stop and escalate to a method change instead of running to the hard stop.
4. Method plan per part before round 1 (hair curves for fur, the rig for posture, generators for limbs, neck owned by the join).
5. One shared measurement of the sheet (outlines, landmarks, station tables) and all region specs written in one parallel pass before round 1.
6. Small fixes: slim workflow status (history and issues read from files, not passed as args), pixel-based side-effect checks with the Opus critic only on the target region, and a measured builder effort experiment.
7. Kickoff check: after the first gap audit, send Nick the ranked list as a progress note and start anyway; change course if he replies.

## Order of work

Design doc (contract) first, then 1, 2 and 5, then 3, 4, 6 and 7 wired into the loop. Prove it by replaying Akinza from the recorded rounds and comparing cost to reach the same scores.

## Standing practice

- Push the loop branch at every round note (the repo is public).
- Copy the current best parts to C:\Users\njord\OneDrive\xalians-art-backup\<species> after every kept round; geometry is not in git.
