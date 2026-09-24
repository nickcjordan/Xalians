# Reclamation decision-quality validation

Run of expeditionValidation.js, 200 matches per configuration, seed 7, 2026-09-24. Sections: regret, spread, decided, ablation, draft, lanes, stake, read. Every rate carries its 95 percent binomial interval half width, so a difference smaller than the stated margin is not resolved at this batch size. Measured against docs/design/game-validation-principles.md section 1.

## 1. Naive-policy regret

| policy | wins vs proctor | wins vs random | sends/match | flag |
| --- | --- | --- | --- | --- |
| proctor (reference) | 46.5% +/- 6.9 | 94.5% +/- 3.2 | 10.3 |  |
| greedy | 0.0% +/- 0.0 | 30.5% +/- 6.4 | 11.0 |  |
| random | 4.0% +/- 2.7 | 51.5% +/- 6.9 | 10.1 |  |
| passEarly | 36.0% +/- 6.7 | 92.0% +/- 3.8 | 8.5 |  |
| alwaysStack | 0.0% +/- 0.0 | 1.0% +/- 1.4 | 11.0 |  |
| neverContest | 0.0% +/- 0.0 | 15.5% +/- 5.0 | 0.0 |  |
| alwaysPresenceFirst | 44.5% +/- 6.9 | 94.0% +/- 3.3 | 10.2 | decorative decisions? |

**Reading.** DECORATIVE DECISIONS? alwaysPresenceFirst wins 44.5%, within five points of the proctor mirror (46.5%). The decisions this policy skips may not be doing work.

## 2. Option spread

| round | decisions | 1 | 2 | 3 | 4 | 5+ | mean near-best | one dominant | chose pass | mean gap 1st-2nd |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| round 1 | 955 | 186 | 179 | 135 | 82 | 373 | 5.36 | 19.5% | 20.9% | 0.24 |
| round 2 | 963 | 291 | 215 | 152 | 76 | 229 | 3.59 | 30.2% | 20.8% | 0.34 |
| round 3 | 537 | 247 | 121 | 57 | 42 | 70 | 2.39 | 46.0% | 6.9% | 0.68 |
| overall | 2455 | 724 | 515 | 344 | 200 | 672 | 4.01 | 29.5% | 17.8% | 0.38 |

**Reading.** Deploy decisions offer 4.0 near-best options on average, dominant on 29.5% of turns. That is the "a few close options" band the principles doc asks for.

**Reading.** The opening and the last world differ: 5.4 near-best options in round 1 against 2.4 in round 3. That difference is itself a finding about where the game's decisions live.

## 3. Point of no return

proctor mirror, 200 matches
- decided after round 1: 41.5% (95% CI 34.7-48.3%, n=200)
- decided after round 2: 11.0% (95% CI 6.7-15.3%, n=200)
- decided only at the end: 47.5% (95% CI 40.6-54.4%, n=200)
- locked (five worlds) after round 1 / 2 / 3 / never: 0 / 29 / 171 / 0
- comeback rate (trailed after round 1, won): 33.0% (95% CI 26.5-39.5%, n=200)
- tied after round 2: 41.5% (95% CI 34.7-48.3%, n=200)
- third round changed the leader: 47.5% (95% CI 40.6-54.4%, n=200)
- downs per match: 8.76
- resolution changed the leader at 32.4% (95% CI 30.2-34.6%, n=1708) of contested worlds

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | downs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| proctor mirror | 200 | 41.5% | 11.0% | 47.5% | 33.0% | 41.5% | 47.5% | 8.76 |
| envoy vs proctor | 200 | 48.5% | 8.0% | 43.5% | 28.5% | 37.0% | 43.5% | 8.49 |
| heir vs proctor | 200 | 49.0% | 10.0% | 41.0% | 31.5% | 36.5% | 41.0% | 8.43 |
| proctor vs proctor | 200 | 41.5% | 11.0% | 47.5% | 33.0% | 41.5% | 47.5% | 8.76 |
| broker vs proctor | 200 | 42.0% | 11.0% | 47.0% | 35.0% | 39.0% | 47.0% | 8.67 |
| windsailor vs proctor | 200 | 45.5% | 5.5% | 49.0% | 30.0% | 31.0% | 46.5% | 8.91 |

**Reading.** 41.5% of proctor mirrors are decided after round 1, under the fifty percent bar; 47.5% are settled only at the final judge.

**Reading.** Comeback split (pass 6): from a CONTESTED round 1 (trailing by one or two worlds) 36.7% +/- 7.1, which is the population the 30 to 40 band is about; from a SWEPT round 1 (trailing by 3) 4.3% +/- 8.3, which is not safeguarded by ruling. The overall rate below averages the two.

**Reading.** Comeback rate 33.0%, above the one-in-five floor; the third round changes the leader in 47.5% of matches.

## 4. Ablation

| ablation | envoy | heir | proctor | broker | windsailor | decided r1 | comeback | downs/match | hidden rate | returned rate | moved? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline (all rules on) | 43.5% +/- 6.9 | 49.0% +/- 6.9 | 46.5% +/- 6.9 | 44.0% +/- 6.9 | 41.5% +/- 6.8 | 41.5% | 33.0% | 8.76 | 0.0% | n/a | (baseline) |
| no hidden sends | 43.5% +/- 6.9 | 49.0% +/- 6.9 | 46.5% +/- 6.9 | 44.0% +/- 6.9 | 41.5% +/- 6.8 | 41.5% | 33.0% | 8.76 | 0.0% | n/a | nothing |
| no speed order (sent order) | 55.0% +/- 6.9 | 55.5% +/- 6.9 | 54.5% +/- 6.9 | 57.0% +/- 6.9 | 40.0% +/- 6.8 | 52.5% | 23.5% | 8.97 | 0.0% | n/a | envoy, proctor, broker, decided-r1, comeback, downs |
| hidden-first restored (pass 2 bonus) | 43.5% +/- 6.9 | 49.0% +/- 6.9 | 46.5% +/- 6.9 | 44.0% +/- 6.9 | 41.5% +/- 6.8 | 41.5% | 33.0% | 8.76 | 0.0% | n/a | nothing |
| no sweep role (sweeps strike instead) | 49.0% +/- 6.9 | 52.5% +/- 6.9 | 51.0% +/- 6.9 | 52.0% +/- 6.9 | 44.0% +/- 6.9 | 51.0% | 30.5% | 9.39 | 0.0% | n/a | broker, decided-r1, downs |
| no bolster role (bolsterers just hold) | 45.5% +/- 6.9 | 42.0% +/- 6.8 | 47.5% +/- 6.9 | 46.5% +/- 6.9 | 42.5% +/- 6.9 | 46.0% | 33.5% | 8.99 | 0.0% | n/a | heir, downs |
| no shield role (shielders just hold) | 43.0% +/- 6.9 | 49.0% +/- 6.9 | 44.0% +/- 6.9 | 42.5% +/- 6.9 | 43.5% +/- 6.9 | 43.0% | 34.5% | 9.12 | 0.0% | n/a | downs |
| no hurt-attacks-less (assumption 18) | 43.5% +/- 6.9 | 48.5% +/- 6.9 | 47.0% +/- 6.9 | 44.5% +/- 6.9 | 42.5% +/- 6.9 | 48.0% | 29.0% | 9.06 | 0.0% | n/a | downs |
| no bolster recovery (assumption 19) | 43.0% +/- 6.9 | 46.5% +/- 6.9 | 47.0% +/- 6.9 | 44.5% +/- 6.9 | 41.0% +/- 6.8 | 42.0% | 32.0% | 8.95 | 0.0% | n/a | downs |
| no willful strain relief (assumption 17) | 46.5% +/- 6.9 | 46.5% +/- 6.9 | 48.0% +/- 6.9 | 47.5% +/- 6.9 | 41.5% +/- 6.8 | 45.0% | 27.0% | 8.68 | 0.0% | n/a | nothing |
| no presence scale (every presence at charisma 50) | 44.0% +/- 6.9 | 48.5% +/- 6.9 | 54.0% +/- 6.9 | 52.5% +/- 6.9 | 49.5% +/- 6.9 | 43.5% | 33.0% | 8.22 | 0.0% | n/a | proctor, broker, windsailor, downs |
| no instinct lanes (conduct only) | 43.0% +/- 6.9 | 47.5% +/- 6.9 | 49.5% +/- 6.9 | 47.0% +/- 6.9 | 44.5% +/- 6.9 | 48.5% | 30.5% | 8.71 | 0.0% | n/a | decided-r1 |
| no swift move (assumption 20) | 44.5% +/- 6.9 | 46.5% +/- 6.9 | 48.5% +/- 6.9 | 45.5% +/- 6.9 | 42.5% +/- 6.9 | 40.0% | 33.5% | 8.73 | 0.0% | n/a | nothing |
| no stake (assumption 22) | 43.0% +/- 6.9 | 48.5% +/- 6.9 | 47.0% +/- 6.9 | 45.5% +/- 6.9 | 41.0% +/- 6.8 | 41.0% | 33.5% | 8.76 | 0.0% | n/a | nothing |
| pass 3 hiding restored (first strike, costs two sends, three quarters power) | 43.5% +/- 6.9 | 49.0% +/- 6.9 | 46.5% +/- 6.9 | 44.0% +/- 6.9 | 41.5% +/- 6.8 | 41.5% | 33.0% | 8.76 | 0.0% | n/a | nothing |
| catch-up send restored (trailingBonus 1) | 44.0% +/- 6.9 | 48.5% +/- 6.9 | 47.0% +/- 6.9 | 45.5% +/- 6.9 | 41.5% +/- 6.8 | 38.0% | 32.5% | 8.93 | 0.0% | n/a | downs |

**Reading.** no hidden sends: NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no speed order (sent order): CARRYING WEIGHT - envoy, proctor, broker, decided-r1, comeback, downs moved beyond the interval.

**Reading.** hidden-first restored (pass 2 bonus): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no sweep role (sweeps strike instead): CARRYING WEIGHT - broker, decided-r1, downs moved beyond the interval.

**Reading.** no bolster role (bolsterers just hold): CARRYING WEIGHT - heir, downs moved beyond the interval.

**Reading.** no shield role (shielders just hold): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no hurt-attacks-less (assumption 18): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no bolster recovery (assumption 19): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no willful strain relief (assumption 17): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no presence scale (every presence at charisma 50): CARRYING WEIGHT - proctor, broker, windsailor, downs moved beyond the interval.

**Reading.** no instinct lanes (conduct only): CARRYING WEIGHT - decided-r1 moved beyond the interval.

**Reading.** no swift move (assumption 20): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no stake (assumption 22): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** pass 3 hiding restored (first strike, costs two sends, three quarters power): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** catch-up send restored (trailingBonus 1): CARRYING WEIGHT - downs moved beyond the interval.

## 5. Draft dominance

top 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| terragoyle | 200 | 100.0% | 49.5% | 12.14 |  |
| shuntara | 200 | 100.0% | 50.0% | 11.41 |  |
| luceras | 200 | 100.0% | 53.0% | 8.17 |  |
| codazzo | 200 | 100.0% | 48.0% | 7.67 |  |
| voltish | 200 | 100.0% | 49.5% | 11.42 |  |
| foromeer | 200 | 99.0% | 47.5% | 9.85 |  |
| drilltail | 200 | 98.5% | 51.3% | 8.45 |  |
| scalatto | 200 | 98.5% | 49.7% | 11.12 |  |
| hippochamp | 200 | 98.5% | 45.7% | 9.94 |  |
| thirstaserp | 200 | 98.0% | 46.9% | 7.20 |  |

bottom 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| imprit | 200 | 15.0% | 46.7% | 3.85 | dead |
| neph | 200 | 18.5% | 35.1% | 9.35 | dead |
| avilily | 200 | 27.0% | 53.7% | 5.00 |  |
| akinza | 200 | 29.0% | 51.7% | 5.00 |  |
| dromeus | 200 | 31.5% | 61.9% | 4.06 |  |
| newtapede | 200 | 64.5% | 55.8% | 7.21 |  |
| tizzie | 200 | 67.0% | 53.0% | 5.82 |  |
| ectoghoul | 200 | 70.5% | 53.9% | 6.45 |  |
| vespersyn | 200 | 79.5% | 53.5% | 7.17 |  |
| chromocat | 200 | 85.0% | 48.8% | 5.26 |  |

by primary element

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| unknown | 6000 | 80.0% | 50.0% | 8.35 |  |

by role

| role | dealt | keep rate | keeper win rate | mean hold |
| --- | --- | --- | --- | --- |
| sweep | 2176 | 76.3% +/- 1.8 | 46.9% +/- 2.4 | 8.32 |
| strike | 3024 | 78.9% +/- 1.5 | 52.6% +/- 2.0 | 7.79 |
| shield | 400 | 96.8% +/- 1.7 | 52.7% +/- 5.0 | 9.16 |
| bolster | 400 | 91.8% +/- 2.7 | 44.4% +/- 5.1 | 11.90 |

**Reading.** DEAD CONTENT: imprit, neph are kept under twenty percent of the times they are dealt. Never chosen is content nobody plays with.

**Reading.** 21 of 30 species sit outside the 30 to 90 percent keep band.

## 6. Per-attribute lanes

| attribute | q1 / q3 | top n | top quartile site win | bottom n | bottom quartile site win | gap (points) |
| --- | --- | --- | --- | --- | --- | --- |
| vitality | 42 / 68 | 1037 | 42.4% +/- 3.0 | 1116 | 70.3% +/- 2.7 | -27.9 |
| resilience | 33 / 70 | 1118 | 50.2% +/- 2.9 | 1054 | 63.8% +/- 2.9 | -13.6 |
| endurance | 50 / 73 | 1099 | 47.0% +/- 3.0 | 1046 | 67.8% +/- 2.8 | -20.8 |
| strength | 38 / 65 | 1102 | 50.5% +/- 3.0 | 1056 | 63.4% +/- 2.9 | -12.9 |
| intelligence | 27 / 50 | 1071 | 59.7% +/- 2.9 | 1045 | 51.0% +/- 3.0 | 8.7 |
| agility | 25 / 68 | 1105 | 69.5% +/- 2.7 | 1040 | 42.8% +/- 3.0 | 26.7 |
| reflex | 31 / 70 | 1077 | 64.9% +/- 2.9 | 1081 | 44.7% +/- 3.0 | 20.2 |
| willpower | 39 / 64 | 1048 | 52.4% +/- 3.0 | 1047 | 64.4% +/- 2.9 | -12.0 |
| charisma | 24 / 41 | 1116 | 65.0% +/- 2.8 | 1248 | 55.2% +/- 2.8 | 9.8 |
| instinct | 51 / 69 | 1158 | 63.6% +/- 2.8 | 1032 | 43.4% +/- 3.0 | 20.1 |

gap in points, split per role (top quartile minus bottom quartile, within the role)

| attribute | overall | strikes | sweeps | presences (bolster + shield) |
| --- | --- | --- | --- | --- |
| vitality | -27.9 | -15.8 (n=589/525) | -13.9 (n=436/457) | -30.7 (n=242/180) |
| resilience | -13.6 | -1.4 (n=513/588) | -10.3 (n=423/424) | -16.9 (n=208/173) |
| endurance | -20.8 | -18.7 (n=540/585) | -10.7 (n=416/384) | -29.5 (n=204/173) |
| strength | -12.9 | 0.2 (n=505/536) | -15.3 (n=439/475) | -31.7 (n=251/174) |
| intelligence | 8.7 | 12.9 (n=495/517) | 1.8 (n=382/382) | 21.9 (n=190/197) |
| agility | 26.7 | 17.8 (n=536/512) | 15.9 (n=407/436) | 24.4 (n=168/197) |
| reflex | 20.2 | 15.3 (n=615/519) | 19.5 (n=382/422) | -1.0 (n=194/197) |
| willpower | -12.0 | -4.6 (n=501/581) | -3.9 (n=462/420) | 34.0 (n=191/191) |
| charisma | 9.8 | 0.0 (n=616/495) | -0.3 (n=395/498) | 32.6 (n=184/197) |
| instinct | 20.1 | 13.5 (n=525/495) | 18.0 (n=476/442) | 5.5 (n=194/190) |

**Reading.** Carrying weight: vitality -27.9 points, resilience -13.6 points, endurance -20.8 points, strength -12.9 points, intelligence 8.7 points, agility 26.7 points, reflex 20.2 points, willpower -12.0 points, charisma 9.8 points, instinct 20.1 points.

**Reading.** Every one of the ten attributes moves the site win rate beyond the interval. Every lane carries weight at this batch size.

## 7. The stake

| setting | n | stakes/match | Provings staked | by the trailing side | staker wins staked world | staker wins unstaked worlds | only-trailing-staked match win |
| --- | --- | --- | --- | --- | --- | --- | --- |
| stake on | 200 | 0.04 | 4.0% +/- 2.7 | 100.0% +/- 0.0 | 25.0% +/- 30.0 | 40.0% +/- 24.8 | 0.0% +/- 0.0 |
| stake off | 200 | 0.00 | 0.0% +/- 0.0 | - | - | - | - |

match shape, stake on against stake off

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | downs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| stake on | 200 | 41.5% | 11.0% | 47.5% | 33.0% | 41.5% | 47.5% | 8.76 |
| stake off | 200 | 41.0% | 11.0% | 48.0% | 33.5% | 42.5% | 48.0% | 8.76 |

rival ladder, stake on against stake off

| rival | wins vs proctor (stake on) | wins vs proctor (stake off) |
| --- | --- | --- |
| envoy | 43.5% +/- 6.9 | 43.0% +/- 6.9 |
| heir | 49.0% +/- 6.9 | 48.5% +/- 6.9 |
| proctor | 46.5% +/- 6.9 | 47.0% +/- 6.9 |
| broker | 44.0% +/- 6.9 | 45.5% +/- 6.9 |
| windsailor | 41.5% +/- 6.8 | 41.0% +/- 6.8 |

**Reading.** STAKE USAGE OUT OF BAND: staked in 4.0% of Provings against the 20 to 60 percent gauge. The threshold is too high for the bot to ever take the risk.

**Reading.** The staker wins its staked world 25.0% of the time against 40.0% on the same round's unstaked worlds, a gap of -15.0 points inside the +/- 38.9 interval: the stake is variance-neutral, which is what a chosen risk should be.

**Reading.** Comeback rate 33.0% with the stake against 33.5% without; decided after round 1 41.5% against 41.0% (reported, not a gauge since pass 2 dropped it).

**Reading.** In Provings where only the trailing side staked, that side won 0.0% (95% CI 0.0-0.0%, n=8).

## 8. The read

proctor mirror 46.5% +/- 6.9

| matchup | side A wins |
| --- | --- |
| proctor vs no anticipation (pass 3 bot: hidden sends read, coming sends not) | 81.0% +/- 5.4 |
| proctor vs blind (ignores hidden and coming sends alike) | 81.0% +/- 5.4 |
| sharp read (sharpness 1, a guess at WHERE) vs proctor (even spread) | 46.5% +/- 6.9 |

**Reading.** The read carries weight: the proctor beats the bot without anticipation 81.0% against a mirror of 46.5%.

