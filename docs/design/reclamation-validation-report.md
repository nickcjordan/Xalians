# Reclamation decision-quality validation

Run of expeditionValidation.js, 200 matches per configuration, seed 7, 2026-09-24. Sections: regret, spread, decided, ablation, draft, lanes, stake, read. Every rate carries its 95 percent binomial interval half width, so a difference smaller than the stated margin is not resolved at this batch size. Measured against docs/design/game-validation-principles.md section 1.

## 1. Naive-policy regret

| policy | wins vs proctor | wins vs random | sends/match | flag |
| --- | --- | --- | --- | --- |
| proctor (reference) | 49.0% +/- 6.9 | 97.0% +/- 2.4 | 10.4 |  |
| greedy | 0.0% +/- 0.0 | 32.5% +/- 6.5 | 11.0 |  |
| random | 2.5% +/- 2.2 | 49.5% +/- 6.9 | 10.1 |  |
| passEarly | 34.0% +/- 6.6 | 95.0% +/- 3.0 | 8.4 |  |
| alwaysStack | 0.0% +/- 0.0 | 1.0% +/- 1.4 | 11.0 |  |
| neverContest | 0.0% +/- 0.0 | 15.5% +/- 5.0 | 0.0 |  |
| alwaysPresenceFirst | 40.5% +/- 6.8 | 97.0% +/- 2.4 | 10.4 |  |

**Reading.** No naive policy comes within five points of the proctor and none beats it. The deploy decisions are carrying their weight at this batch size.

## 2. Option spread

| round | decisions | 1 | 2 | 3 | 4 | 5+ | mean near-best | one dominant | chose pass | mean gap 1st-2nd |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| round 1 | 953 | 182 | 176 | 139 | 85 | 371 | 5.37 | 19.1% | 21.0% | 0.25 |
| round 2 | 971 | 291 | 216 | 153 | 87 | 224 | 3.59 | 30.0% | 20.6% | 0.35 |
| round 3 | 567 | 266 | 134 | 54 | 48 | 65 | 2.34 | 46.9% | 7.1% | 0.64 |
| overall | 2491 | 739 | 526 | 346 | 220 | 660 | 3.98 | 29.7% | 17.7% | 0.38 |

**Reading.** Deploy decisions offer 4.0 near-best options on average, dominant on 29.7% of turns. That is the "a few close options" band the principles doc asks for.

**Reading.** The opening and the last world differ: 5.4 near-best options in round 1 against 2.3 in round 3. That difference is itself a finding about where the game's decisions live.

## 3. Point of no return

proctor mirror, 200 matches
- decided after round 1: 45.5% (95% CI 38.6-52.4%, n=200)
- decided after round 2: 6.0% (95% CI 2.7-9.3%, n=200)
- decided only at the end: 48.5% (95% CI 41.6-55.4%, n=200)
- locked (five worlds) after round 1 / 2 / 3 / never: 0 / 21 / 179 / 0
- comeback rate (trailed after round 1, won): 27.5% (95% CI 21.3-33.7%, n=200)
- tied after round 2: 42.0% (95% CI 35.2-48.8%, n=200)
- third round changed the leader: 48.5% (95% CI 41.6-55.4%, n=200)
- downs per match: 4.08
- resolution changed the leader at 25.3% (95% CI 23.3-27.4%, n=1733) of contested worlds

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | downs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| proctor mirror | 200 | 45.5% | 6.0% | 48.5% | 27.5% | 42.0% | 48.5% | 4.08 |
| envoy vs proctor | 200 | 44.5% | 7.5% | 48.0% | 35.0% | 40.0% | 48.0% | 3.88 |
| heir vs proctor | 200 | 57.5% | 3.0% | 39.5% | 23.6% | 34.0% | 39.0% | 4.25 |
| proctor vs proctor | 200 | 45.5% | 6.0% | 48.5% | 27.5% | 42.0% | 48.5% | 4.08 |
| broker vs proctor | 200 | 44.5% | 6.5% | 49.0% | 28.5% | 41.0% | 49.0% | 4.09 |
| windsailor vs proctor | 200 | 51.0% | 4.0% | 45.0% | 26.6% | 29.0% | 43.5% | 4.25 |

**Reading.** 45.5% of proctor mirrors are decided after round 1, under the fifty percent bar; 48.5% are settled only at the final judge.

**Reading.** Comeback split (pass 6): from a CONTESTED round 1 (trailing by one or two worlds) 30.1% +/- 6.6, which is the population the 30 to 40 band is about; from a SWEPT round 1 (trailing by 3) 0.0% +/- 0.0, which is not safeguarded by ruling. The overall rate below averages the two.

**Reading.** Comeback rate 27.5%, above the one-in-five floor; the third round changes the leader in 48.5% of matches.

## 4. Ablation

| ablation | envoy | heir | proctor | broker | windsailor | decided r1 | comeback | downs/match | hidden rate | returned rate | moved? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline (all rules on) | 43.0% +/- 6.9 | 55.5% +/- 6.9 | 49.0% +/- 6.9 | 46.5% +/- 6.9 | 45.0% +/- 6.9 | 45.5% | 27.5% | 4.08 | 0.0% | n/a | (baseline) |
| no hidden sends | 43.0% +/- 6.9 | 55.5% +/- 6.9 | 49.0% +/- 6.9 | 46.5% +/- 6.9 | 45.0% +/- 6.9 | 45.5% | 27.5% | 4.08 | 0.0% | n/a | nothing |
| no speed order (sent order) | 53.5% +/- 6.9 | 59.0% +/- 6.8 | 57.5% +/- 6.9 | 55.5% +/- 6.9 | 44.5% +/- 6.9 | 50.0% | 25.5% | 4.23 | 0.0% | n/a | envoy, proctor, broker, downs |
| hidden-first restored (pass 2 bonus) | 43.0% +/- 6.9 | 55.5% +/- 6.9 | 49.0% +/- 6.9 | 46.5% +/- 6.9 | 45.0% +/- 6.9 | 45.5% | 27.5% | 4.08 | 0.0% | n/a | nothing |
| no sweep role (sweeps strike instead) | 50.0% +/- 6.9 | 51.0% +/- 6.9 | 46.0% +/- 6.9 | 46.5% +/- 6.9 | 44.5% +/- 6.9 | 52.5% | 26.1% | 5.12 | 0.0% | n/a | envoy, decided-r1, downs |
| no bolster role (bolsterers just hold) | 46.5% +/- 6.9 | 50.0% +/- 6.9 | 48.0% +/- 6.9 | 49.0% +/- 6.9 | 45.5% +/- 6.9 | 50.0% | 28.5% | 4.09 | 0.0% | n/a | nothing |
| no shield role (shielders just hold) | 44.5% +/- 6.9 | 58.5% +/- 6.8 | 45.5% +/- 6.9 | 45.0% +/- 6.9 | 43.5% +/- 6.9 | 45.5% | 30.2% | 4.51 | 0.0% | n/a | downs |
| no hurt-attacks-less (assumption 18) | 47.0% +/- 6.9 | 56.5% +/- 6.9 | 50.0% +/- 6.9 | 48.0% +/- 6.9 | 43.5% +/- 6.9 | 47.0% | 27.0% | 4.67 | 0.0% | n/a | downs |
| no bolster recovery (assumption 19) | 43.5% +/- 6.9 | 55.0% +/- 6.9 | 47.5% +/- 6.9 | 45.5% +/- 6.9 | 45.5% +/- 6.9 | 44.0% | 28.5% | 4.08 | 0.0% | n/a | nothing |
| no willful strain relief (assumption 17) | 49.5% +/- 6.9 | 59.0% +/- 6.8 | 56.0% +/- 6.9 | 54.0% +/- 6.9 | 45.0% +/- 6.9 | 47.0% | 23.2% | 4.21 | 0.0% | n/a | proctor, broker, downs |
| no presence scale (every presence at charisma 50) | 45.5% +/- 6.9 | 54.0% +/- 6.9 | 49.0% +/- 6.9 | 51.0% +/- 6.9 | 46.0% +/- 6.9 | 44.0% | 32.7% | 4.26 | 0.0% | n/a | downs |
| no instinct lanes (conduct only) | 44.5% +/- 6.9 | 58.0% +/- 6.8 | 47.5% +/- 6.9 | 46.5% +/- 6.9 | 42.5% +/- 6.9 | 49.0% | 23.0% | 3.79 | 0.0% | n/a | downs |
| no swift move (assumption 20) | 43.5% +/- 6.9 | 54.0% +/- 6.9 | 50.5% +/- 6.9 | 49.0% +/- 6.9 | 43.0% +/- 6.9 | 48.0% | 26.0% | 4.09 | 0.0% | n/a | nothing |
| no stake (assumption 22) | 42.5% +/- 6.9 | 55.0% +/- 6.9 | 48.5% +/- 6.9 | 47.0% +/- 6.9 | 45.5% +/- 6.9 | 45.5% | 27.0% | 4.09 | 0.0% | n/a | nothing |
| pass 3 hiding restored (first strike, costs two sends, three quarters power) | 43.0% +/- 6.9 | 55.5% +/- 6.9 | 49.0% +/- 6.9 | 46.5% +/- 6.9 | 45.0% +/- 6.9 | 45.5% | 27.5% | 4.08 | 0.0% | n/a | nothing |
| catch-up send restored (trailingBonus 1) | 43.0% +/- 6.9 | 59.5% +/- 6.8 | 47.5% +/- 6.9 | 45.0% +/- 6.9 | 43.5% +/- 6.9 | 40.5% | 25.0% | 4.22 | 0.0% | n/a | downs |

**Reading.** no hidden sends: NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no speed order (sent order): CARRYING WEIGHT - envoy, proctor, broker, downs moved beyond the interval.

**Reading.** hidden-first restored (pass 2 bonus): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no sweep role (sweeps strike instead): CARRYING WEIGHT - envoy, decided-r1, downs moved beyond the interval.

**Reading.** no bolster role (bolsterers just hold): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no shield role (shielders just hold): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no hurt-attacks-less (assumption 18): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no bolster recovery (assumption 19): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no willful strain relief (assumption 17): CARRYING WEIGHT - proctor, broker, downs moved beyond the interval.

**Reading.** no presence scale (every presence at charisma 50): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no instinct lanes (conduct only): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no swift move (assumption 20): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no stake (assumption 22): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** pass 3 hiding restored (first strike, costs two sends, three quarters power): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** catch-up send restored (trailingBonus 1): CARRYING WEIGHT - downs moved beyond the interval.

## 5. Draft dominance

top 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| terragoyle | 200 | 100.0% | 54.5% | 12.14 |  |
| luceras | 200 | 100.0% | 54.0% | 8.17 |  |
| codazzo | 200 | 100.0% | 46.0% | 7.67 |  |
| voltish | 200 | 100.0% | 53.5% | 11.42 |  |
| shuntara | 200 | 99.5% | 44.7% | 11.41 |  |
| foromeer | 200 | 99.0% | 50.0% | 9.85 |  |
| drilltail | 200 | 99.0% | 52.0% | 8.45 |  |
| scalatto | 200 | 98.5% | 54.3% | 11.12 |  |
| hippochamp | 200 | 98.5% | 45.7% | 9.94 |  |
| thirstaserp | 200 | 98.0% | 51.5% | 7.20 |  |

bottom 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| imprit | 200 | 15.5% | 54.8% | 3.85 | dead |
| neph | 200 | 20.0% | 52.5% | 9.35 |  |
| avilily | 200 | 29.0% | 50.0% | 5.00 |  |
| akinza | 200 | 32.0% | 39.1% | 5.00 |  |
| dromeus | 200 | 33.5% | 46.3% | 4.06 |  |
| newtapede | 200 | 66.5% | 54.1% | 7.21 |  |
| tizzie | 200 | 68.5% | 48.2% | 5.82 |  |
| ectoghoul | 200 | 72.5% | 52.4% | 6.45 |  |
| figzy | 200 | 74.0% | 50.7% | 6.91 |  |
| vespersyn | 200 | 80.5% | 50.9% | 7.17 |  |

by primary element

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| unknown | 6000 | 80.0% | 50.0% | 8.35 |  |

by role

| role | dealt | keep rate | keeper win rate | mean hold |
| --- | --- | --- | --- | --- |
| sweep | 2176 | 76.9% +/- 1.8 | 47.7% +/- 2.4 | 8.32 |
| strike | 3024 | 79.7% +/- 1.4 | 53.0% +/- 2.0 | 7.79 |
| shield | 400 | 86.8% +/- 3.3 | 47.3% +/- 5.3 | 9.16 |
| bolster | 400 | 92.0% +/- 2.7 | 43.5% +/- 5.1 | 11.90 |

**Reading.** DEAD CONTENT: imprit are kept under twenty percent of the times they are dealt. Never chosen is content nobody plays with.

**Reading.** 19 of 30 species sit outside the 30 to 90 percent keep band.

## 6. Per-attribute lanes

| attribute | q1 / q3 | top n | top quartile site win | bottom n | bottom quartile site win | gap (points) |
| --- | --- | --- | --- | --- | --- | --- |
| vitality | 42 / 68 | 1041 | 49.0% +/- 3.0 | 1127 | 66.9% +/- 2.7 | -17.9 |
| resilience | 33 / 70 | 1122 | 56.9% +/- 2.9 | 1069 | 63.2% +/- 2.9 | -6.4 |
| endurance | 50 / 73 | 1113 | 50.8% +/- 2.9 | 1050 | 63.7% +/- 2.9 | -13.0 |
| strength | 38 / 65 | 1098 | 55.6% +/- 2.9 | 1054 | 62.8% +/- 2.9 | -7.3 |
| intelligence | 27 / 50 | 1079 | 61.0% +/- 2.9 | 1049 | 55.0% +/- 3.0 | 6.0 |
| agility | 25 / 68 | 1122 | 65.1% +/- 2.8 | 1043 | 50.8% +/- 3.0 | 14.2 |
| reflex | 31 / 70 | 1096 | 63.6% +/- 2.8 | 1086 | 51.9% +/- 3.0 | 11.7 |
| willpower | 39 / 64 | 1043 | 55.1% +/- 3.0 | 1047 | 64.1% +/- 2.9 | -9.0 |
| charisma | 24 / 41 | 1137 | 61.6% +/- 2.8 | 1253 | 58.3% +/- 2.7 | 3.2 |
| instinct | 52 / 69 | 1182 | 60.3% +/- 2.8 | 1246 | 52.9% +/- 2.8 | 7.4 |

gap in points, split per role (top quartile minus bottom quartile, within the role)

| attribute | overall | strikes | sweeps | presences (bolster + shield) |
| --- | --- | --- | --- | --- |
| vitality | -17.9 | -13.8 (n=597/535) | -6.7 (n=429/468) | -10.2 (n=245/171) |
| resilience | -6.4 | -5.4 (n=519/600) | -4.3 (n=420/433) | 5.4 (n=157/163) |
| endurance | -13.0 | -16.8 (n=548/591) | -4.4 (n=419/394) | -12.6 (n=204/166) |
| strength | -7.3 | -2.7 (n=511/539) | -8.3 (n=432/482) | -16.6 (n=250/165) |
| intelligence | 6.0 | 10.8 (n=503/527) | 3.1 (n=393/417) | 12.8 (n=188/196) |
| agility | 14.2 | 11.1 (n=555/520) | 3.0 (n=413/432) | 5.0 (n=160/196) |
| reflex | 11.7 | 11.0 (n=640/527) | 9.6 (n=424/419) | -9.2 (n=191/196) |
| willpower | -9.0 | -6.0 (n=505/587) | 0.6 (n=471/411) | 17.7 (n=180/193) |
| charisma | 3.2 | -2.8 (n=636/542) | -0.5 (n=400/503) | 18.6 (n=175/196) |
| instinct | 7.4 | 8.1 (n=543/503) | 6.4 (n=482/439) | -6.8 (n=191/191) |

**Reading.** Carrying weight: vitality -17.9 points, resilience -6.4 points, endurance -13.0 points, strength -7.3 points, intelligence 6.0 points, agility 14.2 points, reflex 11.7 points, willpower -9.0 points, charisma 3.2 points, instinct 7.4 points.

**Reading.** Every one of the ten attributes moves the site win rate beyond the interval. Every lane carries weight at this batch size.

## 7. The stake

| setting | n | stakes/match | Provings staked | by the trailing side | staker wins staked world | staker wins unstaked worlds | only-trailing-staked match win |
| --- | --- | --- | --- | --- | --- | --- | --- |
| stake on | 200 | 0.04 | 4.0% +/- 2.7 | 100.0% +/- 0.0 | 50.0% +/- 34.6 | 37.5% +/- 23.7 | 25.0% +/- 30.0 |
| stake off | 200 | 0.00 | 0.0% +/- 0.0 | - | - | - | - |

match shape, stake on against stake off

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | downs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| stake on | 200 | 45.5% | 6.0% | 48.5% | 27.5% | 42.0% | 48.5% | 4.08 |
| stake off | 200 | 45.5% | 5.0% | 49.5% | 27.0% | 43.0% | 49.5% | 4.09 |

rival ladder, stake on against stake off

| rival | wins vs proctor (stake on) | wins vs proctor (stake off) |
| --- | --- | --- |
| envoy | 43.0% +/- 6.9 | 42.5% +/- 6.9 |
| heir | 55.5% +/- 6.9 | 55.0% +/- 6.9 |
| proctor | 49.0% +/- 6.9 | 48.5% +/- 6.9 |
| broker | 46.5% +/- 6.9 | 47.0% +/- 6.9 |
| windsailor | 45.0% +/- 6.9 | 45.5% +/- 6.9 |

**Reading.** STAKE USAGE OUT OF BAND: staked in 4.0% of Provings against the 20 to 60 percent gauge. The threshold is too high for the bot to ever take the risk.

**Reading.** The staker wins its staked world 50.0% of the time against 37.5% on the same round's unstaked worlds, a gap of 12.5 points inside the +/- 42.0 interval: the stake is variance-neutral, which is what a chosen risk should be.

**Reading.** Comeback rate 27.5% with the stake against 27.0% without; decided after round 1 45.5% against 45.5% (reported, not a gauge since pass 2 dropped it).

**Reading.** In Provings where only the trailing side staked, that side won 25.0% (95% CI 0.0-55.0%, n=8).

## 8. The read

proctor mirror 49.0% +/- 6.9

| matchup | side A wins |
| --- | --- |
| proctor vs no anticipation (pass 3 bot: hidden sends read, coming sends not) | 84.0% +/- 5.1 |
| proctor vs blind (ignores hidden and coming sends alike) | 84.0% +/- 5.1 |
| sharp read (sharpness 1, a guess at WHERE) vs proctor (even spread) | 45.0% +/- 6.9 |

**Reading.** The read carries weight: the proctor beats the bot without anticipation 84.0% against a mirror of 49.0%.

