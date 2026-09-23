# Reclamation decision-quality validation

Run of expeditionValidation.js, 200 matches per configuration, seed 7, 2026-09-23. Sections: regret, spread, decided, ablation, draft, lanes, stake, read. Every rate carries its 95 percent binomial interval half width, so a difference smaller than the stated margin is not resolved at this batch size. Measured against docs/design/game-validation-principles.md section 1.

## 1. Naive-policy regret

| policy | wins vs proctor | wins vs random | sends/match | flag |
| --- | --- | --- | --- | --- |
| proctor (reference) | 52.0% +/- 6.9 | 98.5% +/- 1.7 | 10.5 |  |
| greedy | 0.0% +/- 0.0 | 29.5% +/- 6.3 | 11.0 |  |
| random | 1.5% +/- 1.7 | 50.5% +/- 6.9 | 10.2 |  |
| passEarly | 35.0% +/- 6.6 | 96.5% +/- 2.5 | 8.5 |  |
| alwaysStack | 0.0% +/- 0.0 | 0.5% +/- 1.0 | 11.0 |  |
| neverContest | 0.0% +/- 0.0 | 15.5% +/- 5.0 | 0.0 |  |
| alwaysPresenceFirst | 46.5% +/- 6.9 | 98.5% +/- 1.7 | 10.5 |  |

**Reading.** No naive policy comes within five points of the proctor and none beats it. The deploy decisions are carrying their weight at this batch size.

## 2. Option spread

| round | decisions | 1 | 2 | 3 | 4 | 5+ | mean near-best | one dominant | chose pass | mean gap 1st-2nd |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| round 1 | 967 | 109 | 96 | 128 | 114 | 520 | 8.18 | 11.3% | 20.7% | 0.15 |
| round 2 | 970 | 210 | 211 | 135 | 96 | 318 | 4.81 | 21.6% | 20.6% | 0.24 |
| round 3 | 552 | 187 | 118 | 72 | 59 | 116 | 3.22 | 33.9% | 2.7% | 0.52 |
| overall | 2489 | 506 | 425 | 335 | 269 | 954 | 5.76 | 20.3% | 16.7% | 0.27 |

**Reading.** Deploy decisions offer 5.8 near-best options on average, dominant on 20.3% of turns. That is the "a few close options" band the principles doc asks for.

**Reading.** The opening and the last world differ: 8.2 near-best options in round 1 against 3.2 in round 3. That difference is itself a finding about where the game's decisions live.

## 3. Point of no return

proctor mirror, 200 matches
- decided after round 1: 47.5% (95% CI 40.6-54.4%, n=200)
- decided after round 2: 9.0% (95% CI 5.0-13.0%, n=200)
- decided only at the end: 43.5% (95% CI 36.6-50.4%, n=200)
- locked (five worlds) after round 1 / 2 / 3 / never: 0 / 24 / 175 / 1
- comeback rate (trailed after round 1, won): 29.1% (95% CI 22.8-35.5%, n=199)
- tied after round 2: 36.0% (95% CI 29.3-42.7%, n=200)
- third round changed the leader: 43.5% (95% CI 36.6-50.4%, n=200)
- downs per match: 5.63
- resolution changed the leader at 28.4% (95% CI 26.2-30.5%, n=1716) of contested worlds

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | downs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| proctor mirror | 200 | 47.5% | 9.0% | 43.5% | 29.1% | 36.0% | 43.5% | 5.63 |
| envoy vs proctor | 200 | 45.5% | 6.5% | 48.0% | 29.0% | 39.0% | 47.0% | 5.32 |
| heir vs proctor | 200 | 50.5% | 3.5% | 46.0% | 27.0% | 43.5% | 46.0% | 5.66 |
| proctor vs proctor | 200 | 47.5% | 9.0% | 43.5% | 29.1% | 36.0% | 43.5% | 5.63 |
| broker vs proctor | 200 | 49.5% | 9.0% | 41.5% | 26.6% | 33.0% | 41.5% | 5.62 |
| windsailor vs proctor | 200 | 47.5% | 7.5% | 45.0% | 28.4% | 28.0% | 42.5% | 5.61 |

**Reading.** 47.5% of proctor mirrors are decided after round 1, under the fifty percent bar; 43.5% are settled only at the final judge.

**Reading.** Comeback split (pass 6): from a CONTESTED round 1 (trailing by one or two worlds) 33.9% +/- 7.2, which is the population the 30 to 40 band is about; from a SWEPT round 1 (trailing by 3) 5.9% +/- 7.9, which is not safeguarded by ruling. The overall rate below averages the two.

**Reading.** Comeback rate 29.1%, above the one-in-five floor; the third round changes the leader in 43.5% of matches.

## 4. Ablation

| ablation | envoy | heir | proctor | broker | windsailor | decided r1 | comeback | downs/match | hidden rate | returned rate | moved? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline (all rules on) | 49.0% +/- 6.9 | 55.5% +/- 6.9 | 52.0% +/- 6.9 | 51.0% +/- 6.9 | 52.5% +/- 6.9 | 47.5% | 29.1% | 5.63 | 0.0% | n/a | (baseline) |
| no hidden sends | 49.0% +/- 6.9 | 55.5% +/- 6.9 | 52.0% +/- 6.9 | 51.0% +/- 6.9 | 52.5% +/- 6.9 | 47.5% | 29.1% | 5.63 | 0.0% | n/a | nothing |
| no speed order (sent order) | 72.5% +/- 6.2 | 68.0% +/- 6.5 | 62.0% +/- 6.7 | 60.0% +/- 6.8 | 53.0% +/- 6.9 | 53.0% | 25.5% | 5.50 | 0.0% | n/a | envoy, heir, proctor, broker, downs |
| hidden-first restored (pass 2 bonus) | 49.0% +/- 6.9 | 55.5% +/- 6.9 | 52.0% +/- 6.9 | 51.0% +/- 6.9 | 52.5% +/- 6.9 | 47.5% | 29.1% | 5.63 | 0.0% | n/a | nothing |
| no sweep role (sweeps strike instead) | 49.0% +/- 6.9 | 54.5% +/- 6.9 | 50.5% +/- 6.9 | 50.0% +/- 6.9 | 50.0% +/- 6.9 | 49.0% | 26.1% | 5.50 | 0.0% | n/a | downs |
| no bolster role (bolsterers just hold) | 51.0% +/- 6.9 | 60.0% +/- 6.8 | 51.0% +/- 6.9 | 49.0% +/- 6.9 | 55.5% +/- 6.9 | 47.5% | 30.8% | 5.62 | 0.0% | n/a | nothing |
| no shield role (shielders just hold) | 48.5% +/- 6.9 | 56.0% +/- 6.9 | 51.5% +/- 6.9 | 51.0% +/- 6.9 | 53.0% +/- 6.9 | 47.5% | 28.6% | 5.63 | 0.0% | n/a | nothing |
| no hurt-attacks-less (assumption 18) | 53.5% +/- 6.9 | 60.5% +/- 6.8 | 50.5% +/- 6.9 | 51.0% +/- 6.9 | 52.0% +/- 6.9 | 44.0% | 34.2% | 6.79 | 0.0% | n/a | downs |
| no bolster recovery (assumption 19) | 48.5% +/- 6.9 | 54.5% +/- 6.9 | 52.0% +/- 6.9 | 51.0% +/- 6.9 | 52.5% +/- 6.9 | 48.5% | 28.1% | 5.63 | 0.0% | n/a | nothing |
| no willful strain relief (assumption 17) | 52.0% +/- 6.9 | 54.0% +/- 6.9 | 48.5% +/- 6.9 | 49.5% +/- 6.9 | 54.5% +/- 6.9 | 50.5% | 25.0% | 5.62 | 0.0% | n/a | nothing |
| no presence scale (every presence at charisma 50) | 48.5% +/- 6.9 | 56.0% +/- 6.9 | 54.5% +/- 6.9 | 54.0% +/- 6.9 | 55.5% +/- 6.9 | 52.5% | 26.0% | 5.41 | 0.0% | n/a | downs |
| no instinct lanes (conduct only) | 47.5% +/- 6.9 | 58.5% +/- 6.8 | 52.0% +/- 6.9 | 51.0% +/- 6.9 | 59.0% +/- 6.8 | 52.0% | 29.6% | 5.47 | 0.0% | n/a | downs |
| no swift move (assumption 20) | 50.0% +/- 6.9 | 56.5% +/- 6.9 | 53.0% +/- 6.9 | 51.5% +/- 6.9 | 54.5% +/- 6.9 | 47.5% | 26.1% | 5.61 | 0.0% | n/a | nothing |
| no stake (assumption 22) | 49.5% +/- 6.9 | 55.5% +/- 6.9 | 52.0% +/- 6.9 | 53.0% +/- 6.9 | 53.5% +/- 6.9 | 47.0% | 29.1% | 5.63 | 0.0% | n/a | nothing |
| pass 3 hiding restored (first strike, costs two sends, three quarters power) | 49.0% +/- 6.9 | 55.5% +/- 6.9 | 52.0% +/- 6.9 | 51.0% +/- 6.9 | 52.5% +/- 6.9 | 47.5% | 29.1% | 5.63 | 0.0% | n/a | nothing |
| catch-up send restored (trailingBonus 1) | 49.5% +/- 6.9 | 54.5% +/- 6.9 | 53.0% +/- 6.9 | 51.5% +/- 6.9 | 48.0% +/- 6.9 | 40.5% | 27.1% | 5.88 | 0.0% | n/a | decided-r1, downs |

**Reading.** no hidden sends: NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no speed order (sent order): CARRYING WEIGHT - envoy, heir, proctor, broker, downs moved beyond the interval.

**Reading.** hidden-first restored (pass 2 bonus): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no sweep role (sweeps strike instead): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no bolster role (bolsterers just hold): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no shield role (shielders just hold): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no hurt-attacks-less (assumption 18): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no bolster recovery (assumption 19): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no willful strain relief (assumption 17): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no presence scale (every presence at charisma 50): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no instinct lanes (conduct only): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no swift move (assumption 20): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no stake (assumption 22): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** pass 3 hiding restored (first strike, costs two sends, three quarters power): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** catch-up send restored (trailingBonus 1): CARRYING WEIGHT - decided-r1, downs moved beyond the interval.

## 5. Draft dominance

top 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| terragoyle | 200 | 100.0% | 51.0% | 12.14 |  |
| shuntara | 200 | 100.0% | 53.5% | 11.41 |  |
| foromeer | 200 | 100.0% | 47.5% | 9.85 |  |
| frackworm | 200 | 100.0% | 44.5% | 10.22 |  |
| codazzo | 200 | 100.0% | 54.5% | 7.67 |  |
| scalatto | 200 | 100.0% | 51.0% | 11.12 |  |
| voltish | 200 | 100.0% | 48.0% | 11.42 |  |
| kosanos | 200 | 100.0% | 48.0% | 9.59 |  |
| sonalloy | 200 | 99.5% | 51.3% | 12.70 |  |
| bioflim | 200 | 99.5% | 41.7% | 11.10 |  |

bottom 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| imprit | 200 | 9.0% | 44.4% | 3.85 | dead |
| dromeus | 200 | 9.5% | 52.6% | 4.06 | dead |
| akinza | 200 | 14.5% | 44.8% | 5.00 | dead |
| avilily | 200 | 15.5% | 58.1% | 5.00 | dead |
| chromocat | 200 | 43.0% | 58.1% | 5.26 |  |
| ectoghoul | 200 | 58.0% | 47.4% | 6.45 |  |
| figzy | 200 | 68.0% | 44.9% | 6.91 |  |
| newtapede | 200 | 69.5% | 57.6% | 7.21 |  |
| tizzie | 200 | 73.5% | 53.1% | 5.82 |  |
| vespersyn | 200 | 80.0% | 56.3% | 7.17 |  |

by primary element

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| unknown | 6000 | 80.0% | 50.0% | 8.35 |  |

by role

| role | dealt | keep rate | keeper win rate | mean hold |
| --- | --- | --- | --- | --- |
| sweep | 2176 | 77.4% +/- 1.8 | 49.2% +/- 2.4 | 8.32 |
| strike | 3024 | 78.8% +/- 1.5 | 51.2% +/- 2.0 | 7.79 |
| shield | 400 | 84.0% +/- 3.6 | 50.0% +/- 5.3 | 9.16 |
| bolster | 400 | 99.5% +/- 0.7 | 46.5% +/- 4.9 | 11.90 |

**Reading.** DEAD CONTENT: avilily, imprit, dromeus, akinza are kept under twenty percent of the times they are dealt. Never chosen is content nobody plays with.

**Reading.** 23 of 30 species sit outside the 30 to 90 percent keep band.

## 6. Per-attribute lanes

| attribute | q1 / q3 | top n | top quartile site win | bottom n | bottom quartile site win | gap (points) |
| --- | --- | --- | --- | --- | --- | --- |
| vitality | 42 / 68 | 1056 | 47.4% +/- 3.0 | 1120 | 64.4% +/- 2.8 | -16.9 |
| resilience | 33 / 70 | 1139 | 51.9% +/- 2.9 | 1078 | 60.8% +/- 2.9 | -8.9 |
| endurance | 50 / 73 | 1109 | 50.0% +/- 2.9 | 1052 | 62.2% +/- 2.9 | -12.2 |
| strength | 38 / 65 | 1106 | 50.7% +/- 2.9 | 1079 | 60.2% +/- 2.9 | -9.5 |
| intelligence | 27 / 50 | 1106 | 58.7% +/- 2.9 | 1067 | 51.4% +/- 3.0 | 7.3 |
| agility | 25 / 68 | 1139 | 63.4% +/- 2.8 | 1055 | 46.3% +/- 3.0 | 17.1 |
| reflex | 31 / 70 | 1129 | 61.4% +/- 2.8 | 1096 | 48.6% +/- 3.0 | 12.8 |
| willpower | 40 / 64 | 1057 | 53.4% +/- 3.0 | 1139 | 60.0% +/- 2.8 | -6.6 |
| charisma | 24 / 41 | 1158 | 60.3% +/- 2.8 | 1258 | 52.1% +/- 2.8 | 8.2 |
| instinct | 51 / 69 | 1170 | 54.3% +/- 2.9 | 1051 | 51.2% +/- 3.0 | 3.1 |

gap in points, split per role (top quartile minus bottom quartile, within the role)

| attribute | overall | strikes | sweeps | presences (bolster + shield) |
| --- | --- | --- | --- | --- |
| vitality | -16.9 | -14.9 (n=485/491) | -12.2 (n=445/529) | -14.8 (n=251/191) |
| resilience | -8.9 | -1.8 (n=512/477) | -9.7 (n=434/481) | -6.6 (n=214/183) |
| endurance | -12.2 | -12.9 (n=529/546) | -6.6 (n=433/435) | -18.0 (n=209/185) |
| strength | -9.5 | -5.9 (n=494/520) | -9.4 (n=448/531) | -13.9 (n=257/184) |
| intelligence | 7.3 | 9.1 (n=493/498) | 1.4 (n=459/420) | 14.9 (n=202/202) |
| agility | 17.1 | 13.8 (n=522/514) | 12.9 (n=439/444) | 14.1 (n=178/202) |
| reflex | 12.8 | 14.4 (n=608/516) | 8.5 (n=447/429) | -0.4 (n=197/202) |
| willpower | -6.6 | -7.1 (n=491/563) | -1.7 (n=467/456) | 17.4 (n=192/198) |
| charisma | 8.2 | 8.2 (n=599/511) | 3.6 (n=445/525) | 18.1 (n=195/202) |
| instinct | 3.1 | -3.5 (n=497/476) | 5.6 (n=418/467) | 1.7 (n=197/198) |

**Reading.** Carrying weight: vitality -16.9 points, resilience -8.9 points, endurance -12.2 points, strength -9.5 points, intelligence 7.3 points, agility 17.1 points, reflex 12.8 points, willpower -6.6 points, charisma 8.2 points, instinct 3.1 points.

**Reading.** Every one of the ten attributes moves the site win rate beyond the interval. Every lane carries weight at this batch size.

## 7. The stake

| setting | n | stakes/match | Provings staked | by the trailing side | staker wins staked world | staker wins unstaked worlds | only-trailing-staked match win |
| --- | --- | --- | --- | --- | --- | --- | --- |
| stake on | 200 | 0.04 | 4.0% +/- 2.7 | 100.0% +/- 0.0 | 50.0% +/- 34.6 | 40.0% +/- 24.8 | 12.5% +/- 22.9 |
| stake off | 200 | 0.00 | 0.0% +/- 0.0 | - | - | - | - |

match shape, stake on against stake off

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | downs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| stake on | 200 | 47.5% | 9.0% | 43.5% | 29.1% | 36.0% | 43.5% | 5.63 |
| stake off | 200 | 47.0% | 9.0% | 44.0% | 29.1% | 38.0% | 44.0% | 5.63 |

rival ladder, stake on against stake off

| rival | wins vs proctor (stake on) | wins vs proctor (stake off) |
| --- | --- | --- |
| envoy | 49.0% +/- 6.9 | 49.5% +/- 6.9 |
| heir | 55.5% +/- 6.9 | 55.5% +/- 6.9 |
| proctor | 52.0% +/- 6.9 | 52.0% +/- 6.9 |
| broker | 51.0% +/- 6.9 | 53.0% +/- 6.9 |
| windsailor | 52.5% +/- 6.9 | 53.5% +/- 6.9 |

**Reading.** STAKE USAGE OUT OF BAND: staked in 4.0% of Provings against the 20 to 60 percent gauge. The threshold is too high for the bot to ever take the risk.

**Reading.** The staker wins its staked world 50.0% of the time against 40.0% on the same round's unstaked worlds, a gap of 10.0 points inside the +/- 42.6 interval: the stake is variance-neutral, which is what a chosen risk should be.

**Reading.** Comeback rate 29.1% with the stake against 29.1% without; decided after round 1 47.5% against 47.0% (reported, not a gauge since pass 2 dropped it).

**Reading.** In Provings where only the trailing side staked, that side won 12.5% (95% CI 0.0-35.4%, n=8).

## 8. The read

proctor mirror 52.0% +/- 6.9

| matchup | side A wins |
| --- | --- |
| proctor vs no anticipation (pass 3 bot: hidden sends read, coming sends not) | 89.5% +/- 4.2 |
| proctor vs blind (ignores hidden and coming sends alike) | 89.5% +/- 4.2 |
| sharp read (sharpness 1, a guess at WHERE) vs proctor (even spread) | 47.5% +/- 6.9 |

**Reading.** The read carries weight: the proctor beats the bot without anticipation 89.5% against a mirror of 52.0%.

