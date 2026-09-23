# Reclamation decision-quality validation

Run of expeditionValidation.js, 200 matches per configuration, seed 7, 2026-09-23. Sections: regret, spread, decided, ablation, draft, lanes, stake, read. Every rate carries its 95 percent binomial interval half width, so a difference smaller than the stated margin is not resolved at this batch size. Measured against docs/design/game-validation-principles.md section 1.

## 1. Naive-policy regret

| policy | wins vs proctor | wins vs random | sends/match | flag |
| --- | --- | --- | --- | --- |
| proctor (reference) | 48.0% +/- 6.9 | 97.5% +/- 2.2 | 10.5 |  |
| greedy | 0.0% +/- 0.0 | 32.5% +/- 6.5 | 11.0 |  |
| random | 1.5% +/- 1.7 | 50.0% +/- 6.9 | 10.1 |  |
| passEarly | 33.5% +/- 6.5 | 94.5% +/- 3.2 | 8.5 |  |
| alwaysStack | 0.0% +/- 0.0 | 0.5% +/- 1.0 | 11.0 |  |
| neverContest | 0.0% +/- 0.0 | 15.5% +/- 5.0 | 0.0 |  |
| alwaysPresenceFirst | 39.0% +/- 6.8 | 99.0% +/- 1.4 | 10.7 |  |

**Reading.** No naive policy comes within five points of the proctor and none beats it. The deploy decisions are carrying their weight at this batch size.

## 2. Option spread

| round | decisions | 1 | 2 | 3 | 4 | 5+ | mean near-best | one dominant | chose pass | mean gap 1st-2nd |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| round 1 | 968 | 124 | 106 | 106 | 122 | 510 | 8.11 | 12.8% | 20.7% | 0.16 |
| round 2 | 963 | 209 | 195 | 165 | 96 | 298 | 4.86 | 21.7% | 20.8% | 0.25 |
| round 3 | 560 | 182 | 148 | 71 | 52 | 107 | 3.11 | 32.5% | 3.4% | 0.50 |
| overall | 2491 | 515 | 449 | 342 | 270 | 915 | 5.73 | 20.7% | 16.8% | 0.27 |

**Reading.** Deploy decisions offer 5.7 near-best options on average, dominant on 20.7% of turns. That is the "a few close options" band the principles doc asks for.

**Reading.** The opening and the last world differ: 8.1 near-best options in round 1 against 3.1 in round 3. That difference is itself a finding about where the game's decisions live.

## 3. Point of no return

proctor mirror, 200 matches
- decided after round 1: 45.0% (95% CI 38.1-51.9%, n=200)
- decided after round 2: 4.0% (95% CI 1.3-6.7%, n=200)
- decided only at the end: 51.0% (95% CI 44.1-57.9%, n=200)
- locked (five worlds) after round 1 / 2 / 3 / never: 0 / 21 / 178 / 1
- comeback rate (trailed after round 1, won): 28.6% (95% CI 22.4-34.9%, n=199)
- tied after round 2: 42.5% (95% CI 35.6-49.4%, n=200)
- third round changed the leader: 50.5% (95% CI 43.6-57.4%, n=200)
- downs per match: 5.32
- resolution changed the leader at 25.8% (95% CI 23.7-27.8%, n=1720) of contested worlds

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | downs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| proctor mirror | 200 | 45.0% | 4.0% | 51.0% | 28.6% | 42.5% | 50.5% | 5.32 |
| envoy vs proctor | 200 | 49.5% | 8.5% | 42.0% | 27.4% | 30.5% | 42.0% | 5.20 |
| heir vs proctor | 200 | 50.0% | 5.0% | 45.0% | 27.6% | 37.5% | 44.5% | 5.17 |
| proctor vs proctor | 200 | 45.0% | 4.0% | 51.0% | 28.6% | 42.5% | 50.5% | 5.32 |
| broker vs proctor | 200 | 46.5% | 4.0% | 49.5% | 28.8% | 41.0% | 49.0% | 5.34 |
| windsailor vs proctor | 200 | 52.5% | 5.0% | 42.5% | 27.9% | 28.0% | 41.0% | 5.40 |

**Reading.** 45.0% of proctor mirrors are decided after round 1, under the fifty percent bar; 51.0% are settled only at the final judge.

**Reading.** Comeback split (pass 6): from a CONTESTED round 1 (trailing by one or two worlds) 33.1% +/- 7.2, which is the population the 30 to 40 band is about; from a SWEPT round 1 (trailing by 3) 6.1% +/- 8.1, which is not safeguarded by ruling. The overall rate below averages the two.

**Reading.** Comeback rate 28.6%, above the one-in-five floor; the third round changes the leader in 50.5% of matches.

## 4. Ablation

| ablation | envoy | heir | proctor | broker | windsailor | decided r1 | comeback | downs/match | hidden rate | returned rate | moved? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline (all rules on) | 44.0% +/- 6.9 | 59.0% +/- 6.8 | 48.0% +/- 6.9 | 47.0% +/- 6.9 | 54.0% +/- 6.9 | 45.0% | 28.6% | 5.32 | 0.0% | n/a | (baseline) |
| no hidden sends | 44.0% +/- 6.9 | 59.0% +/- 6.8 | 48.0% +/- 6.9 | 47.0% +/- 6.9 | 54.0% +/- 6.9 | 45.0% | 28.6% | 5.32 | 0.0% | n/a | nothing |
| no speed order (sent order) | 68.0% +/- 6.5 | 62.5% +/- 6.7 | 57.5% +/- 6.9 | 60.0% +/- 6.8 | 57.0% +/- 6.9 | 50.0% | 23.1% | 5.56 | 0.0% | n/a | envoy, proctor, broker, downs |
| hidden-first restored (pass 2 bonus) | 44.0% +/- 6.9 | 59.0% +/- 6.8 | 48.0% +/- 6.9 | 47.0% +/- 6.9 | 54.0% +/- 6.9 | 45.0% | 28.6% | 5.32 | 0.0% | n/a | nothing |
| no sweep role (sweeps strike instead) | 45.0% +/- 6.9 | 57.5% +/- 6.9 | 45.5% +/- 6.9 | 46.5% +/- 6.9 | 53.0% +/- 6.9 | 46.0% | 30.7% | 5.29 | 0.0% | n/a | nothing |
| no bolster role (bolsterers just hold) | 48.5% +/- 6.9 | 55.0% +/- 6.9 | 50.5% +/- 6.9 | 50.5% +/- 6.9 | 51.5% +/- 6.9 | 46.0% | 27.8% | 5.34 | 0.0% | n/a | nothing |
| no shield role (shielders just hold) | 44.5% +/- 6.9 | 59.0% +/- 6.8 | 48.5% +/- 6.9 | 47.0% +/- 6.9 | 54.0% +/- 6.9 | 44.5% | 29.1% | 5.33 | 0.0% | n/a | nothing |
| no hurt-attacks-less (assumption 18) | 52.0% +/- 6.9 | 63.0% +/- 6.7 | 49.5% +/- 6.9 | 47.0% +/- 6.9 | 53.5% +/- 6.9 | 46.5% | 24.7% | 6.21 | 0.0% | n/a | envoy, downs |
| no bolster recovery (assumption 19) | 44.0% +/- 6.9 | 59.5% +/- 6.8 | 48.5% +/- 6.9 | 47.5% +/- 6.9 | 53.5% +/- 6.9 | 44.5% | 28.6% | 5.33 | 0.0% | n/a | nothing |
| no willful strain relief (assumption 17) | 48.0% +/- 6.9 | 52.5% +/- 6.9 | 50.5% +/- 6.9 | 50.0% +/- 6.9 | 51.0% +/- 6.9 | 50.5% | 26.3% | 5.21 | 0.0% | n/a | downs |
| no presence scale (every presence at charisma 50) | 42.5% +/- 6.9 | 50.5% +/- 6.9 | 49.0% +/- 6.9 | 50.5% +/- 6.9 | 54.0% +/- 6.9 | 44.5% | 30.2% | 5.10 | 0.0% | n/a | heir, downs |
| no instinct lanes (conduct only) | 45.0% +/- 6.9 | 56.5% +/- 6.9 | 54.5% +/- 6.9 | 52.5% +/- 6.9 | 58.0% +/- 6.8 | 48.5% | 32.2% | 4.83 | 0.0% | n/a | downs |
| no swift move (assumption 20) | 42.5% +/- 6.9 | 59.5% +/- 6.8 | 46.5% +/- 6.9 | 47.0% +/- 6.9 | 56.5% +/- 6.9 | 46.5% | 28.6% | 5.25 | 0.0% | n/a | nothing |
| no stake (assumption 22) | 44.5% +/- 6.9 | 60.0% +/- 6.8 | 50.5% +/- 6.9 | 49.0% +/- 6.9 | 51.0% +/- 6.9 | 45.5% | 27.1% | 5.34 | 0.0% | n/a | nothing |
| pass 3 hiding restored (first strike, costs two sends, three quarters power) | 44.0% +/- 6.9 | 59.0% +/- 6.8 | 48.0% +/- 6.9 | 47.0% +/- 6.9 | 54.0% +/- 6.9 | 45.0% | 28.6% | 5.32 | 0.0% | n/a | nothing |
| catch-up send restored (trailingBonus 1) | 48.0% +/- 6.9 | 56.0% +/- 6.9 | 51.5% +/- 6.9 | 49.5% +/- 6.9 | 49.5% +/- 6.9 | 34.5% | 30.2% | 5.55 | 0.0% | n/a | decided-r1, downs |

**Reading.** no hidden sends: NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no speed order (sent order): CARRYING WEIGHT - envoy, proctor, broker, downs moved beyond the interval.

**Reading.** hidden-first restored (pass 2 bonus): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no sweep role (sweeps strike instead): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no bolster role (bolsterers just hold): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no shield role (shielders just hold): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no hurt-attacks-less (assumption 18): CARRYING WEIGHT - envoy, downs moved beyond the interval.

**Reading.** no bolster recovery (assumption 19): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no willful strain relief (assumption 17): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no presence scale (every presence at charisma 50): CARRYING WEIGHT - heir, downs moved beyond the interval.

**Reading.** no instinct lanes (conduct only): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no swift move (assumption 20): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no stake (assumption 22): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** pass 3 hiding restored (first strike, costs two sends, three quarters power): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** catch-up send restored (trailingBonus 1): CARRYING WEIGHT - decided-r1, downs moved beyond the interval.

## 5. Draft dominance

top 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| terragoyle | 200 | 100.0% | 45.0% | 12.14 |  |
| luceras | 200 | 100.0% | 51.5% | 8.17 |  |
| codazzo | 200 | 100.0% | 48.5% | 7.67 |  |
| voltish | 200 | 100.0% | 53.0% | 11.42 |  |
| shuntara | 200 | 99.5% | 51.3% | 11.41 |  |
| foromeer | 200 | 99.0% | 49.0% | 9.85 |  |
| drilltail | 200 | 99.0% | 49.0% | 8.45 |  |
| scalatto | 200 | 98.5% | 46.2% | 11.12 |  |
| hippochamp | 200 | 98.5% | 46.7% | 9.94 |  |
| thirstaserp | 200 | 98.0% | 54.1% | 7.20 |  |

bottom 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| imprit | 200 | 15.5% | 58.1% | 3.85 | dead |
| neph | 200 | 20.0% | 32.5% | 9.35 |  |
| avilily | 200 | 29.0% | 53.4% | 5.00 |  |
| akinza | 200 | 32.0% | 48.4% | 5.00 |  |
| dromeus | 200 | 33.5% | 61.2% | 4.06 |  |
| newtapede | 200 | 66.5% | 52.6% | 7.21 |  |
| tizzie | 200 | 68.5% | 44.5% | 5.82 |  |
| ectoghoul | 200 | 72.5% | 56.6% | 6.45 |  |
| figzy | 200 | 74.0% | 50.7% | 6.91 |  |
| vespersyn | 200 | 80.5% | 57.8% | 7.17 |  |

by primary element

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| unknown | 6000 | 80.0% | 50.0% | 8.35 |  |

by role

| role | dealt | keep rate | keeper win rate | mean hold |
| --- | --- | --- | --- | --- |
| sweep | 2176 | 76.9% +/- 1.8 | 47.6% +/- 2.4 | 8.32 |
| strike | 3024 | 79.7% +/- 1.4 | 51.9% +/- 2.0 | 7.79 |
| shield | 400 | 86.8% +/- 3.3 | 51.0% +/- 5.3 | 9.16 |
| bolster | 400 | 92.0% +/- 2.7 | 47.8% +/- 5.1 | 11.90 |

**Reading.** DEAD CONTENT: imprit are kept under twenty percent of the times they are dealt. Never chosen is content nobody plays with.

**Reading.** 19 of 30 species sit outside the 30 to 90 percent keep band.

## 6. Per-attribute lanes

| attribute | q1 / q3 | top n | top quartile site win | bottom n | bottom quartile site win | gap (points) |
| --- | --- | --- | --- | --- | --- | --- |
| vitality | 42 / 68 | 1054 | 49.0% +/- 3.0 | 1145 | 62.3% +/- 2.8 | -13.3 |
| resilience | 33 / 70 | 1128 | 51.2% +/- 2.9 | 1088 | 60.3% +/- 2.9 | -9.1 |
| endurance | 50 / 73 | 1115 | 51.7% +/- 2.9 | 1064 | 61.3% +/- 2.9 | -9.6 |
| strength | 38 / 65 | 1111 | 51.0% +/- 2.9 | 1084 | 60.6% +/- 2.9 | -9.6 |
| intelligence | 27 / 50 | 1099 | 59.1% +/- 2.9 | 1069 | 53.8% +/- 3.0 | 5.3 |
| agility | 25 / 68 | 1145 | 60.8% +/- 2.8 | 1054 | 47.8% +/- 3.0 | 13.0 |
| reflex | 31 / 70 | 1147 | 62.0% +/- 2.8 | 1092 | 49.4% +/- 3.0 | 12.6 |
| willpower | 40 / 64 | 1061 | 54.9% +/- 3.0 | 1125 | 57.9% +/- 2.9 | -3.0 |
| charisma | 24 / 41 | 1165 | 59.3% +/- 2.8 | 1265 | 57.6% +/- 2.7 | 1.7 |
| instinct | 51 / 69 | 1179 | 58.8% +/- 2.8 | 1058 | 49.2% +/- 3.0 | 9.5 |

gap in points, split per role (top quartile minus bottom quartile, within the role)

| attribute | overall | strikes | sweeps | presences (bolster + shield) |
| --- | --- | --- | --- | --- |
| vitality | -13.3 | -11.0 (n=480/496) | -9.5 (n=449/546) | -15.9 (n=251/192) |
| resilience | -9.1 | -2.0 (n=506/563) | -15.1 (n=434/492) | -5.8 (n=212/186) |
| endurance | -9.6 | -10.2 (n=479/552) | -5.4 (n=432/445) | -13.7 (n=210/185) |
| strength | -9.6 | -1.3 (n=495/504) | -12.4 (n=452/544) | -7.3 (n=253/186) |
| intelligence | 5.3 | 7.3 (n=486/496) | -1.6 (n=461/418) | 9.7 (n=202/201) |
| agility | 13.0 | 9.8 (n=513/504) | 12.1 (n=456/444) | 12.5 (n=178/201) |
| reflex | 12.6 | 10.7 (n=607/510) | 11.3 (n=463/431) | 5.1 (n=197/201) |
| willpower | -3.0 | -3.8 (n=491/548) | -3.5 (n=473/457) | 13.4 (n=195/200) |
| charisma | 1.7 | 0.9 (n=598/516) | 0.1 (n=456/533) | 13.7 (n=197/201) |
| instinct | 9.5 | 1.8 (n=515/483) | 12.9 (n=418/466) | 8.6 (n=197/197) |

**Reading.** Carrying weight: vitality -13.3 points, resilience -9.1 points, endurance -9.6 points, strength -9.6 points, intelligence 5.3 points, agility 13.0 points, reflex 12.6 points, willpower -3.0 points, instinct 9.5 points.

**Reading.** NO MEASURABLE LANE at 200 matches: charisma. The job Pass 2 gave each of these does not yet show in whether its world is won.

## 7. The stake

| setting | n | stakes/match | Provings staked | by the trailing side | staker wins staked world | staker wins unstaked worlds | only-trailing-staked match win |
| --- | --- | --- | --- | --- | --- | --- | --- |
| stake on | 200 | 0.07 | 7.0% +/- 3.5 | 100.0% +/- 0.0 | 64.3% +/- 25.1 | 40.7% +/- 18.5 | 35.7% +/- 25.1 |
| stake off | 200 | 0.00 | 0.0% +/- 0.0 | - | - | - | - |

match shape, stake on against stake off

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | downs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| stake on | 200 | 45.0% | 4.0% | 51.0% | 28.6% | 42.5% | 50.5% | 5.32 |
| stake off | 200 | 45.5% | 3.5% | 51.0% | 27.1% | 45.0% | 51.0% | 5.34 |

rival ladder, stake on against stake off

| rival | wins vs proctor (stake on) | wins vs proctor (stake off) |
| --- | --- | --- |
| envoy | 44.0% +/- 6.9 | 44.5% +/- 6.9 |
| heir | 59.0% +/- 6.8 | 60.0% +/- 6.8 |
| proctor | 48.0% +/- 6.9 | 50.5% +/- 6.9 |
| broker | 47.0% +/- 6.9 | 49.0% +/- 6.9 |
| windsailor | 54.0% +/- 6.9 | 51.0% +/- 6.9 |

**Reading.** STAKE USAGE OUT OF BAND: staked in 7.0% of Provings against the 20 to 60 percent gauge. The threshold is too high for the bot to ever take the risk.

**Reading.** The staker wins its staked world 64.3% of the time against 40.7% on the same round's unstaked worlds, a gap of 23.5 points inside the +/- 31.2 interval: the stake is variance-neutral, which is what a chosen risk should be.

**Reading.** Comeback rate 28.6% with the stake against 27.1% without; decided after round 1 45.0% against 45.5% (reported, not a gauge since pass 2 dropped it).

**Reading.** In Provings where only the trailing side staked, that side won 35.7% (95% CI 10.6-60.8%, n=14).

## 8. The read

proctor mirror 48.0% +/- 6.9

| matchup | side A wins |
| --- | --- |
| proctor vs no anticipation (pass 3 bot: hidden sends read, coming sends not) | 87.5% +/- 4.6 |
| proctor vs blind (ignores hidden and coming sends alike) | 87.5% +/- 4.6 |
| sharp read (sharpness 1, a guess at WHERE) vs proctor (even spread) | 48.0% +/- 6.9 |

**Reading.** The read carries weight: the proctor beats the bot without anticipation 87.5% against a mirror of 48.0%.

