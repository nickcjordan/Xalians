# Reclamation decision-quality validation

Run of expeditionValidation.js, 200 matches per configuration, seed 7, 2026-09-23. Sections: regret, spread, decided, ablation, draft, lanes, stake, read. Every rate carries its 95 percent binomial interval half width, so a difference smaller than the stated margin is not resolved at this batch size. Measured against docs/design/game-validation-principles.md section 1.

## 1. Naive-policy regret

| policy | wins vs proctor | wins vs random | sends/match | flag |
| --- | --- | --- | --- | --- |
| proctor (reference) | 47.5% +/- 6.9 | 97.0% +/- 2.4 | 10.5 |  |
| greedy | 0.0% +/- 0.0 | 31.5% +/- 6.4 | 11.0 |  |
| random | 1.5% +/- 1.7 | 49.5% +/- 6.9 | 10.1 |  |
| passEarly | 34.5% +/- 6.6 | 94.0% +/- 3.3 | 8.4 |  |
| alwaysStack | 0.0% +/- 0.0 | 0.5% +/- 1.0 | 11.0 |  |
| neverContest | 0.0% +/- 0.0 | 15.5% +/- 5.0 | 0.0 |  |
| alwaysPresenceFirst | 41.5% +/- 6.8 | 99.0% +/- 1.4 | 10.6 |  |

**Reading.** No naive policy comes within five points of the proctor and none beats it. The deploy decisions are carrying their weight at this batch size.

## 2. Option spread

| round | decisions | 1 | 2 | 3 | 4 | 5+ | mean near-best | one dominant | chose pass | mean gap 1st-2nd |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| round 1 | 968 | 124 | 106 | 106 | 122 | 510 | 8.11 | 12.8% | 20.7% | 0.16 |
| round 2 | 961 | 208 | 195 | 164 | 96 | 298 | 4.87 | 21.6% | 20.8% | 0.25 |
| round 3 | 562 | 184 | 146 | 73 | 53 | 106 | 3.10 | 32.7% | 3.4% | 0.50 |
| overall | 2491 | 516 | 447 | 343 | 271 | 914 | 5.73 | 20.7% | 16.8% | 0.27 |

**Reading.** Deploy decisions offer 5.7 near-best options on average, dominant on 20.7% of turns. That is the "a few close options" band the principles doc asks for.

**Reading.** The opening and the last world differ: 8.1 near-best options in round 1 against 3.1 in round 3. That difference is itself a finding about where the game's decisions live.

## 3. Point of no return

proctor mirror, 200 matches
- decided after round 1: 46.0% (95% CI 39.1-52.9%, n=200)
- decided after round 2: 4.0% (95% CI 1.3-6.7%, n=200)
- decided only at the end: 50.0% (95% CI 43.1-56.9%, n=200)
- locked (five worlds) after round 1 / 2 / 3 / never: 0 / 21 / 177 / 2
- comeback rate (trailed after round 1, won): 30.2% (95% CI 23.8-36.5%, n=199)
- tied after round 2: 40.0% (95% CI 33.2-46.8%, n=200)
- third round changed the leader: 49.5% (95% CI 42.6-56.4%, n=200)
- downs per match: 4.92
- resolution changed the leader at 27.2% (95% CI 25.1-29.3%, n=1720) of contested worlds

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | downs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| proctor mirror | 200 | 46.0% | 4.0% | 50.0% | 30.2% | 40.0% | 49.5% | 4.92 |
| envoy vs proctor | 200 | 53.0% | 6.5% | 40.5% | 23.7% | 30.5% | 40.5% | 4.75 |
| heir vs proctor | 200 | 50.0% | 5.0% | 45.0% | 26.6% | 37.0% | 44.5% | 4.87 |
| proctor vs proctor | 200 | 46.0% | 4.0% | 50.0% | 30.2% | 40.0% | 49.5% | 4.92 |
| broker vs proctor | 200 | 48.0% | 4.0% | 48.0% | 29.3% | 39.0% | 47.5% | 4.96 |
| windsailor vs proctor | 200 | 54.0% | 5.0% | 41.0% | 27.8% | 26.5% | 39.0% | 5.08 |

**Reading.** 46.0% of proctor mirrors are decided after round 1, under the fifty percent bar; 50.0% are settled only at the final judge.

**Reading.** Comeback split (pass 6): from a CONTESTED round 1 (trailing by one or two worlds) 33.9% +/- 7.2, which is the population the 30 to 40 band is about; from a SWEPT round 1 (trailing by 3) 9.7% +/- 10.4, which is not safeguarded by ruling. The overall rate below averages the two.

**Reading.** Comeback rate 30.2%, above the one-in-five floor; the third round changes the leader in 49.5% of matches.

## 4. Ablation

| ablation | envoy | heir | proctor | broker | windsailor | decided r1 | comeback | downs/match | hidden rate | returned rate | moved? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline (all rules on) | 45.0% +/- 6.9 | 58.0% +/- 6.8 | 47.5% +/- 6.9 | 47.5% +/- 6.9 | 52.5% +/- 6.9 | 46.0% | 30.2% | 4.92 | 0.0% | n/a | (baseline) |
| no hidden sends | 45.0% +/- 6.9 | 58.0% +/- 6.8 | 47.5% +/- 6.9 | 47.5% +/- 6.9 | 52.5% +/- 6.9 | 46.0% | 30.2% | 4.92 | 0.0% | n/a | nothing |
| no speed order (sent order) | 74.0% +/- 6.1 | 65.0% +/- 6.6 | 62.0% +/- 6.7 | 63.0% +/- 6.7 | 56.5% +/- 6.9 | 49.5% | 23.5% | 4.82 | 0.0% | n/a | envoy, heir, proctor, broker, comeback, downs |
| hidden-first restored (pass 2 bonus) | 45.0% +/- 6.9 | 58.0% +/- 6.8 | 47.5% +/- 6.9 | 47.5% +/- 6.9 | 52.5% +/- 6.9 | 46.0% | 30.2% | 4.92 | 0.0% | n/a | nothing |
| no sweep role (sweeps strike instead) | 46.5% +/- 6.9 | 56.5% +/- 6.9 | 43.5% +/- 6.9 | 44.5% +/- 6.9 | 51.0% +/- 6.9 | 48.0% | 29.6% | 4.86 | 0.0% | n/a | nothing |
| no bolster role (bolsterers just hold) | 51.0% +/- 6.9 | 54.5% +/- 6.9 | 50.5% +/- 6.9 | 51.0% +/- 6.9 | 51.0% +/- 6.9 | 46.0% | 29.3% | 4.93 | 0.0% | n/a | nothing |
| no shield role (shielders just hold) | 45.5% +/- 6.9 | 58.0% +/- 6.8 | 47.5% +/- 6.9 | 47.0% +/- 6.9 | 52.5% +/- 6.9 | 45.5% | 30.2% | 4.93 | 0.0% | n/a | nothing |
| no hurt-attacks-less (assumption 18) | 52.0% +/- 6.9 | 63.0% +/- 6.7 | 49.5% +/- 6.9 | 47.0% +/- 6.9 | 53.5% +/- 6.9 | 46.5% | 24.7% | 6.21 | 0.0% | n/a | envoy, downs |
| no bolster recovery (assumption 19) | 45.5% +/- 6.9 | 58.5% +/- 6.8 | 47.5% +/- 6.9 | 47.5% +/- 6.9 | 52.0% +/- 6.9 | 44.5% | 30.3% | 4.93 | 0.0% | n/a | nothing |
| no willful strain relief (assumption 17) | 48.5% +/- 6.9 | 53.0% +/- 6.9 | 51.0% +/- 6.9 | 48.5% +/- 6.9 | 50.0% +/- 6.9 | 48.5% | 26.8% | 4.82 | 0.0% | n/a | downs |
| no presence scale (every presence at charisma 50) | 44.5% +/- 6.9 | 50.5% +/- 6.9 | 47.0% +/- 6.9 | 47.5% +/- 6.9 | 55.0% +/- 6.9 | 45.5% | 28.6% | 4.75 | 0.0% | n/a | heir, downs |
| no instinct lanes (conduct only) | 45.0% +/- 6.9 | 56.5% +/- 6.9 | 54.5% +/- 6.9 | 52.5% +/- 6.9 | 58.0% +/- 6.8 | 48.5% | 32.2% | 4.83 | 0.0% | n/a | proctor |
| no swift move (assumption 20) | 43.5% +/- 6.9 | 58.0% +/- 6.8 | 47.0% +/- 6.9 | 47.5% +/- 6.9 | 56.5% +/- 6.9 | 49.0% | 28.1% | 4.84 | 0.0% | n/a | nothing |
| no stake (assumption 22) | 45.5% +/- 6.9 | 59.0% +/- 6.8 | 49.5% +/- 6.9 | 49.5% +/- 6.9 | 49.5% +/- 6.9 | 46.5% | 28.1% | 4.95 | 0.0% | n/a | nothing |
| pass 3 hiding restored (first strike, costs two sends, three quarters power) | 45.0% +/- 6.9 | 58.0% +/- 6.8 | 47.5% +/- 6.9 | 47.5% +/- 6.9 | 52.5% +/- 6.9 | 46.0% | 30.2% | 4.92 | 0.0% | n/a | nothing |
| catch-up send restored (trailingBonus 1) | 48.5% +/- 6.9 | 55.5% +/- 6.9 | 50.0% +/- 6.9 | 48.5% +/- 6.9 | 50.5% +/- 6.9 | 38.0% | 30.7% | 5.15 | 0.0% | n/a | decided-r1, downs |

**Reading.** no hidden sends: NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no speed order (sent order): CARRYING WEIGHT - envoy, heir, proctor, broker, comeback, downs moved beyond the interval.

**Reading.** hidden-first restored (pass 2 bonus): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no sweep role (sweeps strike instead): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no bolster role (bolsterers just hold): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no shield role (shielders just hold): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no hurt-attacks-less (assumption 18): CARRYING WEIGHT - envoy, downs moved beyond the interval.

**Reading.** no bolster recovery (assumption 19): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no willful strain relief (assumption 17): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no presence scale (every presence at charisma 50): CARRYING WEIGHT - heir, downs moved beyond the interval.

**Reading.** no instinct lanes (conduct only): CARRYING WEIGHT - proctor moved beyond the interval.

**Reading.** no swift move (assumption 20): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no stake (assumption 22): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** pass 3 hiding restored (first strike, costs two sends, three quarters power): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** catch-up send restored (trailingBonus 1): CARRYING WEIGHT - decided-r1, downs moved beyond the interval.

## 5. Draft dominance

top 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| terragoyle | 200 | 100.0% | 47.0% | 12.14 |  |
| luceras | 200 | 100.0% | 49.5% | 8.17 |  |
| codazzo | 200 | 100.0% | 49.5% | 7.67 |  |
| voltish | 200 | 100.0% | 50.0% | 11.42 |  |
| shuntara | 200 | 99.5% | 51.3% | 11.41 |  |
| foromeer | 200 | 99.0% | 46.0% | 9.85 |  |
| drilltail | 200 | 99.0% | 51.0% | 8.45 |  |
| scalatto | 200 | 98.5% | 50.8% | 11.12 |  |
| hippochamp | 200 | 98.5% | 46.7% | 9.94 |  |
| thirstaserp | 200 | 98.0% | 54.1% | 7.20 |  |

bottom 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| imprit | 200 | 15.5% | 51.6% | 3.85 | dead |
| neph | 200 | 20.0% | 35.0% | 9.35 |  |
| avilily | 200 | 29.0% | 53.4% | 5.00 |  |
| akinza | 200 | 32.0% | 46.9% | 5.00 |  |
| dromeus | 200 | 33.5% | 62.7% | 4.06 |  |
| newtapede | 200 | 66.5% | 51.9% | 7.21 |  |
| tizzie | 200 | 68.5% | 48.2% | 5.82 |  |
| ectoghoul | 200 | 72.5% | 51.0% | 6.45 |  |
| figzy | 200 | 74.0% | 50.7% | 6.91 |  |
| vespersyn | 200 | 80.5% | 60.2% | 7.17 | dominant |

by primary element

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| unknown | 6000 | 80.0% | 50.0% | 8.35 |  |

by role

| role | dealt | keep rate | keeper win rate | mean hold |
| --- | --- | --- | --- | --- |
| sweep | 2176 | 76.9% +/- 1.8 | 48.2% +/- 2.4 | 8.32 |
| strike | 3024 | 79.7% +/- 1.4 | 51.4% +/- 2.0 | 7.79 |
| shield | 400 | 86.8% +/- 3.3 | 51.0% +/- 5.3 | 9.16 |
| bolster | 400 | 92.0% +/- 2.7 | 48.1% +/- 5.1 | 11.90 |

**Reading.** DOMINANT: vespersyn are kept above eighty percent AND their keeper wins above sixty percent. That is a balance problem the first human will find in one session.

**Reading.** DEAD CONTENT: imprit are kept under twenty percent of the times they are dealt. Never chosen is content nobody plays with.

**Reading.** 19 of 30 species sit outside the 30 to 90 percent keep band.

## 6. Per-attribute lanes

| attribute | q1 / q3 | top n | top quartile site win | bottom n | bottom quartile site win | gap (points) |
| --- | --- | --- | --- | --- | --- | --- |
| vitality | 42 / 68 | 1054 | 47.8% +/- 3.0 | 1147 | 63.4% +/- 2.8 | -15.6 |
| resilience | 33 / 70 | 1129 | 49.7% +/- 2.9 | 1085 | 60.6% +/- 2.9 | -10.9 |
| endurance | 50 / 73 | 1115 | 51.2% +/- 2.9 | 1064 | 62.3% +/- 2.9 | -11.1 |
| strength | 38 / 65 | 1109 | 49.0% +/- 2.9 | 1081 | 60.3% +/- 2.9 | -11.4 |
| intelligence | 27 / 50 | 1097 | 59.9% +/- 2.9 | 1069 | 52.6% +/- 3.0 | 7.3 |
| agility | 25 / 68 | 1147 | 62.6% +/- 2.8 | 1052 | 46.4% +/- 3.0 | 16.2 |
| reflex | 31 / 70 | 1146 | 63.1% +/- 2.8 | 1090 | 48.1% +/- 3.0 | 15.0 |
| willpower | 40 / 64 | 1061 | 54.3% +/- 3.0 | 1123 | 58.8% +/- 2.9 | -4.5 |
| charisma | 24 / 41 | 1164 | 59.5% +/- 2.8 | 1263 | 55.6% +/- 2.7 | 4.0 |
| instinct | 51 / 69 | 1182 | 56.5% +/- 2.8 | 1055 | 49.6% +/- 3.0 | 6.9 |

gap in points, split per role (top quartile minus bottom quartile, within the role)

| attribute | overall | strikes | sweeps | presences (bolster + shield) |
| --- | --- | --- | --- | --- |
| vitality | -15.6 | -14.1 (n=477/497) | -12.7 (n=450/546) | -16.9 (n=251/192) |
| resilience | -10.9 | -4.0 (n=505/562) | -16.5 (n=435/490) | -6.9 (n=212/186) |
| endurance | -11.1 | -11.7 (n=478/553) | -7.0 (n=433/444) | -14.7 (n=210/185) |
| strength | -11.4 | -5.1 (n=492/502) | -12.9 (n=453/542) | -8.1 (n=254/186) |
| intelligence | 7.3 | 8.5 (n=484/495) | 1.6 (n=460/419) | 10.2 (n=202/201) |
| agility | 16.2 | 13.5 (n=513/502) | 14.0 (n=455/444) | 13.9 (n=179/201) |
| reflex | 15.0 | 15.6 (n=608/505) | 11.5 (n=461/431) | 5.3 (n=198/201) |
| willpower | -4.5 | -5.7 (n=490/547) | -4.6 (n=471/457) | 13.9 (n=195/200) |
| charisma | 4.0 | 4.3 (n=598/514) | 1.1 (n=454/533) | 14.7 (n=197/201) |
| instinct | 6.9 | -3.0 (n=515/482) | 11.9 (n=418/465) | 8.9 (n=198/197) |

**Reading.** Carrying weight: vitality -15.6 points, resilience -10.9 points, endurance -11.1 points, strength -11.4 points, intelligence 7.3 points, agility 16.2 points, reflex 15.0 points, willpower -4.5 points, charisma 4.0 points, instinct 6.9 points.

**Reading.** Every one of the ten attributes moves the site win rate beyond the interval. Every lane carries weight at this batch size.

## 7. The stake

| setting | n | stakes/match | Provings staked | by the trailing side | staker wins staked world | staker wins unstaked worlds | only-trailing-staked match win |
| --- | --- | --- | --- | --- | --- | --- | --- |
| stake on | 200 | 0.07 | 7.0% +/- 3.5 | 100.0% +/- 0.0 | 64.3% +/- 25.1 | 40.7% +/- 18.5 | 35.7% +/- 25.1 |
| stake off | 200 | 0.00 | 0.0% +/- 0.0 | - | - | - | - |

match shape, stake on against stake off

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | downs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| stake on | 200 | 46.0% | 4.0% | 50.0% | 30.2% | 40.0% | 49.5% | 4.92 |
| stake off | 200 | 46.5% | 4.0% | 49.5% | 28.1% | 42.5% | 49.5% | 4.95 |

rival ladder, stake on against stake off

| rival | wins vs proctor (stake on) | wins vs proctor (stake off) |
| --- | --- | --- |
| envoy | 45.0% +/- 6.9 | 45.5% +/- 6.9 |
| heir | 58.0% +/- 6.8 | 59.0% +/- 6.8 |
| proctor | 47.5% +/- 6.9 | 49.5% +/- 6.9 |
| broker | 47.5% +/- 6.9 | 49.5% +/- 6.9 |
| windsailor | 52.5% +/- 6.9 | 49.5% +/- 6.9 |

**Reading.** STAKE USAGE OUT OF BAND: staked in 7.0% of Provings against the 20 to 60 percent gauge. The threshold is too high for the bot to ever take the risk.

**Reading.** The staker wins its staked world 64.3% of the time against 40.7% on the same round's unstaked worlds, a gap of 23.5 points inside the +/- 31.2 interval: the stake is variance-neutral, which is what a chosen risk should be.

**Reading.** Comeback rate 30.2% with the stake against 28.1% without; decided after round 1 46.0% against 46.5% (reported, not a gauge since pass 2 dropped it).

**Reading.** In Provings where only the trailing side staked, that side won 35.7% (95% CI 10.6-60.8%, n=14).

## 8. The read

proctor mirror 47.5% +/- 6.9

| matchup | side A wins |
| --- | --- |
| proctor vs no anticipation (pass 3 bot: hidden sends read, coming sends not) | 86.0% +/- 4.8 |
| proctor vs blind (ignores hidden and coming sends alike) | 86.0% +/- 4.8 |
| sharp read (sharpness 1, a guess at WHERE) vs proctor (even spread) | 50.0% +/- 6.9 |

**Reading.** The read carries weight: the proctor beats the bot without anticipation 86.0% against a mirror of 47.5%.

