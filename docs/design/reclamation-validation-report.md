# Reclamation decision-quality validation

Run of expeditionValidation.js, 200 matches per configuration, seed 7, 2026-09-07. Sections: regret, spread, decided, ablation, draft. Every rate carries its 95 percent binomial interval half width, so a difference smaller than the stated margin is not resolved at this batch size. Measured against docs/design/game-validation-principles.md section 1.

## 1. Naive-policy regret

| policy | wins vs proctor | wins vs random | sends/match | flag |
| --- | --- | --- | --- | --- |
| proctor (reference) | 47.5% +/- 6.9 | 94.0% +/- 3.3 | 9.9 |  |
| greedy | 0.0% +/- 0.0 | 21.0% +/- 5.6 | 10.3 |  |
| random | 8.0% +/- 3.8 | 44.5% +/- 6.9 | 9.8 |  |
| passEarly | 20.0% +/- 5.5 | 83.0% +/- 5.2 | 7.1 |  |
| alwaysHidden | 42.5% +/- 6.9 | 95.0% +/- 3.0 | 9.9 | decorative decisions? |
| alwaysStack | 0.0% +/- 0.0 | 2.0% +/- 1.9 | 11.0 |  |
| neverContest | 0.5% +/- 1.0 | 10.5% +/- 4.2 | 6.7 |  |

**Reading.** DECORATIVE DECISIONS? alwaysHidden wins 42.5%, within five points of the proctor mirror (47.5%). The decisions this policy skips may not be doing work.

## 2. Option spread

| round | decisions | 1 | 2 | 3 | 4 | 5+ | mean near-best | one dominant | chose pass | mean gap 1st-2nd |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| round 1 | 911 | 82 | 103 | 106 | 107 | 513 | 7.09 | 9.0% | 22.0% | 0.24 |
| round 2 | 914 | 191 | 146 | 137 | 84 | 356 | 4.98 | 20.9% | 21.9% | 0.38 |
| round 3 | 320 | 42 | 35 | 36 | 44 | 163 | 4.77 | 13.1% | 0.6% | 0.52 |
| overall | 2145 | 315 | 284 | 279 | 235 | 1032 | 5.84 | 14.7% | 18.7% | 0.34 |

**Reading.** Deploy decisions offer 5.8 near-best options on average, dominant on 14.7% of turns. That is the "a few close options" band the principles doc asks for.

**Reading.** The opening and the last world differ: 7.1 near-best options in round 1 against 4.8 in round 3. That difference is itself a finding about where the game's decisions live.

## 3. Point of no return

proctor mirror, 200 matches
- decided after round 1: 40.0% (95% CI 33.2-46.8%, n=200)
- decided after round 2: 5.0% (95% CI 2.0-8.0%, n=200)
- decided only at the end: 55.0% (95% CI 48.1-61.9%, n=200)
- locked (five worlds) after round 1 / 2 / 3 / never: 0 / 19 / 159 / 22
- comeback rate (trailed after round 1, won): 33.2% (95% CI 26.6-39.8%, n=196)
- tied after round 2: 36.5% (95% CI 29.8-43.2%, n=200)
- third round changed the leader: 51.5% (95% CI 44.6-58.4%, n=200)
- routs per match: 4.86

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | routs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| proctor mirror | 200 | 40.0% | 5.0% | 55.0% | 33.2% | 36.5% | 51.5% | 4.86 |
| envoy vs proctor | 200 | 41.5% | 2.0% | 56.5% | 29.2% | 40.5% | 53.5% | 4.93 |
| heir vs proctor | 200 | 43.5% | 8.0% | 48.5% | 29.4% | 33.5% | 39.5% | 5.41 |
| broker vs proctor | 200 | 46.0% | 12.0% | 42.0% | 29.9% | 28.5% | 38.0% | 4.71 |
| proctor vs proctor | 200 | 40.0% | 5.0% | 55.0% | 33.2% | 36.5% | 51.5% | 4.86 |
| windsailor vs proctor | 200 | 28.5% | 4.0% | 67.5% | 43.0% | 31.0% | 63.5% | 4.92 |

**Reading.** 40.0% of proctor mirrors are decided after round 1, under the fifty percent bar; 55.0% are settled only at the final judge.

**Reading.** Comeback rate 33.2%, above the one-in-five floor; the third round changes the leader in 51.5% of matches.

## 4. Ablation

| ablation | envoy | heir | broker | proctor | windsailor | decided r1 | comeback | routs/match | hidden rate | returned rate | moved? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline (all rules on) | 45.5% +/- 6.9 | 45.0% +/- 6.9 | 42.0% +/- 6.8 | 47.5% +/- 6.9 | 27.0% +/- 6.2 | 40.0% | 33.2% | 4.86 | 15.0% | 1.8% | (baseline) |
| no hidden sends | 50.0% +/- 6.9 | 48.0% +/- 6.9 | 51.5% +/- 6.9 | 46.0% +/- 6.9 | 34.5% +/- 6.6 | 38.0% | 30.9% | 5.28 | 0.0% | 1.9% | broker, windsailor, hidden-rate, routs |
| no Loki line | 46.5% +/- 6.9 | 42.5% +/- 6.9 | 40.0% +/- 6.8 | 46.0% +/- 6.9 | 29.5% +/- 6.3 | 38.5% | 33.7% | 4.98 | 15.2% | 0.0% | returned-rate, routs |
| no trailing bonus | 43.5% +/- 6.9 | 44.5% +/- 6.9 | 37.0% +/- 6.7 | 44.5% +/- 6.9 | 38.5% +/- 6.7 | 52.5% | 20.9% | 4.75 | 15.1% | 1.6% | windsailor, decided-r1, comeback, routs |
| no initiative (sent order) | 48.5% +/- 6.9 | 46.5% +/- 6.9 | 44.5% +/- 6.9 | 49.5% +/- 6.9 | 28.0% +/- 6.2 | 42.5% | 30.2% | 5.12 | 14.9% | 1.9% | routs |
| no ward | 47.0% +/- 6.9 | 45.5% +/- 6.9 | 42.5% +/- 6.9 | 43.5% +/- 6.9 | 30.0% +/- 6.4 | 40.5% | 32.1% | 4.94 | 15.2% | 1.7% | nothing |
| no mend | 45.5% +/- 6.9 | 44.5% +/- 6.9 | 42.0% +/- 6.8 | 47.5% +/- 6.9 | 27.0% +/- 6.2 | 40.0% | 33.2% | 4.87 | 15.0% | 1.8% | nothing |

**Reading.** no hidden sends: CARRYING WEIGHT - broker, windsailor, hidden-rate, routs moved beyond the interval.

**Reading.** no Loki line: CARRYING WEIGHT - returned-rate, routs moved beyond the interval.

**Reading.** no trailing bonus: CARRYING WEIGHT - windsailor, decided-r1, comeback, routs moved beyond the interval.

**Reading.** no initiative (sent order): CARRYING WEIGHT - routs moved beyond the interval.

**Reading.** no ward: NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no mend: NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

## 5. Draft dominance

top 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| scalatto | 200 | 100.0% | 48.0% | 12.13 |  |
| venemist | 200 | 100.0% | 50.5% | 10.53 |  |
| voltish | 200 | 100.0% | 55.5% | 12.49 |  |
| bioflim | 400 | 100.0% | 54.8% | 13.67 |  |
| hippochamp | 200 | 100.0% | 49.0% | 10.36 |  |
| xylum | 200 | 100.0% | 54.0% | 10.70 |  |
| terragoyle | 200 | 100.0% | 57.5% | 11.74 |  |
| kosanos | 200 | 100.0% | 51.5% | 10.47 |  |
| neph | 200 | 99.5% | 51.8% | 10.07 |  |
| foromeer | 200 | 99.5% | 46.7% | 10.59 |  |

bottom 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| tizzie | 200 | 0.5% | 100.0% | 3.71 | dead |
| hypnopet | 200 | 6.0% | 50.0% | 4.12 | dead |
| dromeus | 200 | 6.0% | 41.7% | 3.74 | dead |
| figzy | 200 | 8.5% | 41.2% | 4.50 | dead |
| avilily | 400 | 8.5% | 38.2% | 4.10 | dead |
| chromocat | 400 | 11.0% | 43.2% | 4.62 | dead |
| imprit | 200 | 16.5% | 39.4% | 4.20 | dead |
| tetrahive | 200 | 28.0% | 48.2% | 4.64 |  |
| akinza | 400 | 28.0% | 48.2% | 5.11 |  |
| ectoghoul | 200 | 46.0% | 47.8% | 5.45 |  |

by primary element

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| chemical | 600 | 100.0% | 53.3% | 12.62 |  |
| electric | 200 | 100.0% | 55.5% | 12.49 |  |
| metal | 200 | 99.5% | 46.7% | 10.59 |  |
| air | 400 | 98.5% | 48.5% | 9.14 |  |
| sand | 800 | 96.4% | 47.1% | 9.05 |  |
| rock | 600 | 93.7% | 53.7% | 8.84 |  |
| water | 400 | 92.8% | 46.9% | 8.90 |  |
| dark | 400 | 63.0% | 52.0% | 7.10 |  |
| ghost | 400 | 59.3% | 47.7% | 5.83 |  |
| plant | 800 | 54.3% | 51.6% | 7.34 |  |
| ice | 600 | 51.3% | 50.0% | 6.28 |  |
| light | 800 | 49.6% | 48.4% | 5.93 |  |
| fire | 400 | 11.3% | 40.0% | 3.97 | dead |
| psychic | 600 | 5.0% | 46.7% | 4.11 | dead |

**Reading.** DEAD CONTENT: avilily, tizzie, figzy, dromeus, hypnopet, imprit, chromocat are kept under twenty percent of the times they are dealt. Never chosen is content nobody plays with.

**Reading.** By element: dominant none; dead psychic, fire.

