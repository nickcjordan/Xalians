# Reclamation decision-quality validation

Run of expeditionValidation.js, 200 matches per configuration, seed 7, 2026-09-13. Sections: regret, spread, decided, ablation, draft, lanes, stake, read. Every rate carries its 95 percent binomial interval half width, so a difference smaller than the stated margin is not resolved at this batch size. Measured against docs/design/game-validation-principles.md section 1.

## 1. Naive-policy regret

| policy | wins vs proctor | wins vs random | sends/match | flag |
| --- | --- | --- | --- | --- |
| proctor (reference) | 46.5% +/- 6.9 | 94.5% +/- 3.2 | 9.4 |  |
| greedy | 0.0% +/- 0.0 | 23.5% +/- 5.9 | 10.0 |  |
| random | 2.0% +/- 1.9 | 45.5% +/- 6.9 | 9.2 |  |
| passEarly | 22.0% +/- 5.7 | 89.0% +/- 4.3 | 6.9 |  |
| alwaysStack | 0.0% +/- 0.0 | 0.5% +/- 1.0 | 10.0 |  |
| neverContest | 0.0% +/- 0.0 | 19.5% +/- 5.5 | 0.0 |  |
| alwaysPresenceFirst | 28.0% +/- 6.2 | 83.5% +/- 5.1 | 8.8 |  |

**Reading.** No naive policy comes within five points of the proctor and none beats it. The deploy decisions are carrying their weight at this batch size.

## 2. Option spread

| round | decisions | 1 | 2 | 3 | 4 | 5+ | mean near-best | one dominant | chose pass | mean gap 1st-2nd |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| round 1 | 746 | 201 | 166 | 119 | 68 | 192 | 3.35 | 26.9% | 26.8% | 0.38 |
| round 2 | 772 | 283 | 177 | 121 | 65 | 126 | 2.70 | 36.7% | 25.3% | 0.52 |
| round 3 | 435 | 174 | 112 | 79 | 44 | 26 | 2.20 | 40.0% | 3.4% | 0.71 |
| overall | 1953 | 658 | 455 | 319 | 177 | 344 | 2.84 | 33.7% | 21.0% | 0.51 |

**Reading.** Deploy decisions offer 2.8 near-best options on average, dominant on 33.7% of turns. That is the "a few close options" band the principles doc asks for.

## 3. Point of no return

proctor mirror, 200 matches
- decided after round 1: 45.0% (95% CI 38.1-51.9%, n=200)
- decided after round 2: 10.5% (95% CI 6.3-14.7%, n=200)
- decided only at the end: 44.5% (95% CI 37.6-51.4%, n=200)
- locked (five worlds) after round 1 / 2 / 3 / never: 0 / 33 / 159 / 8
- comeback rate (trailed after round 1, won): 31.1% (95% CI 24.6-37.6%, n=193)
- tied after round 2: 25.5% (95% CI 19.5-31.5%, n=200)
- third round changed the leader: 41.0% (95% CI 34.2-47.8%, n=200)
- downs per match: 1.44
- resolution changed the leader at 13.4% (95% CI 11.7-15.0%, n=1653) of contested worlds

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | downs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| proctor mirror | 200 | 45.0% | 10.5% | 44.5% | 31.1% | 25.5% | 41.0% | 1.44 |
| envoy vs proctor | 200 | 50.0% | 9.5% | 40.5% | 25.3% | 26.0% | 39.0% | 1.34 |
| heir vs proctor | 200 | 40.0% | 5.5% | 54.5% | 34.7% | 38.0% | 52.5% | 1.45 |
| proctor vs proctor | 200 | 45.0% | 10.5% | 44.5% | 31.1% | 25.5% | 41.0% | 1.44 |
| broker vs proctor | 200 | 43.0% | 10.5% | 46.5% | 32.8% | 22.5% | 42.5% | 1.40 |
| windsailor vs proctor | 200 | 45.5% | 10.5% | 44.0% | 29.2% | 20.5% | 39.5% | 1.36 |

**Reading.** 45.0% of proctor mirrors are decided after round 1, under the fifty percent bar; 44.5% are settled only at the final judge.

**Reading.** Comeback rate 31.1%, above the one-in-five floor; the third round changes the leader in 41.0% of matches.

## 4. Ablation

| ablation | envoy | heir | proctor | broker | windsailor | decided r1 | comeback | downs/match | hidden rate | returned rate | moved? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline (all rules on) | 42.5% +/- 6.9 | 47.0% +/- 6.9 | 46.5% +/- 6.9 | 47.5% +/- 6.9 | 48.0% +/- 6.9 | 45.0% | 31.1% | 1.44 | 21.6% | 0.9% | (baseline) |
| no hidden sends | 41.0% +/- 6.8 | 53.0% +/- 6.9 | 50.0% +/- 6.9 | 49.5% +/- 6.9 | 49.0% +/- 6.9 | 48.0% | 30.3% | 1.36 | 0.0% | 0.8% | hidden-rate |
| no Loki line | 41.5% +/- 6.8 | 52.5% +/- 6.9 | 47.0% +/- 6.9 | 47.0% +/- 6.9 | 52.0% +/- 6.9 | 43.5% | 35.2% | 1.44 | 21.8% | 0.0% | returned-rate |
| no speed order (sent order) | 49.5% +/- 6.9 | 47.5% +/- 6.9 | 48.5% +/- 6.9 | 52.0% +/- 6.9 | 52.0% +/- 6.9 | 48.5% | 35.1% | 1.39 | 21.7% | 0.7% | envoy |
| hidden-first restored (pass 2 bonus) | 43.5% +/- 6.9 | 47.5% +/- 6.9 | 47.5% +/- 6.9 | 47.5% +/- 6.9 | 48.5% +/- 6.9 | 46.0% | 31.6% | 1.42 | 21.7% | 0.9% | nothing |
| no sweep role (sweeps strike instead) | 42.5% +/- 6.9 | 50.5% +/- 6.9 | 44.5% +/- 6.9 | 46.5% +/- 6.9 | 48.5% +/- 6.9 | 52.0% | 29.7% | 1.49 | 21.7% | 0.7% | decided-r1 |
| no bolster role (bolsterers just hold) | 40.0% +/- 6.8 | 46.0% +/- 6.9 | 45.5% +/- 6.9 | 43.0% +/- 6.9 | 44.5% +/- 6.9 | 51.0% | 28.1% | 1.51 | 21.3% | 0.7% | nothing |
| no shield role (shielders just hold) | 45.0% +/- 6.9 | 43.5% +/- 6.9 | 47.5% +/- 6.9 | 45.0% +/- 6.9 | 47.0% +/- 6.9 | 49.5% | 27.8% | 1.64 | 21.9% | 0.8% | downs |
| no hurt-attacks-less (assumption 18) | 45.0% +/- 6.9 | 47.5% +/- 6.9 | 47.0% +/- 6.9 | 49.0% +/- 6.9 | 47.0% +/- 6.9 | 43.5% | 33.3% | 1.72 | 21.6% | 0.8% | downs |
| no bolster recovery (assumption 19) | 42.5% +/- 6.9 | 47.0% +/- 6.9 | 48.5% +/- 6.9 | 50.0% +/- 6.9 | 48.0% +/- 6.9 | 46.0% | 31.6% | 1.43 | 21.7% | 0.8% | nothing |
| no willful strain relief (assumption 17) | 44.0% +/- 6.9 | 43.0% +/- 6.9 | 43.5% +/- 6.9 | 47.5% +/- 6.9 | 48.5% +/- 6.9 | 52.0% | 26.3% | 1.49 | 21.3% | 0.8% | decided-r1 |
| no presence scale (every presence at charisma 50) | 42.0% +/- 6.8 | 54.5% +/- 6.9 | 53.0% +/- 6.9 | 52.5% +/- 6.9 | 55.0% +/- 6.9 | 44.0% | 30.1% | 1.25 | 22.0% | 1.1% | heir, windsailor, downs |
| no instinct lanes (conduct only) | 42.5% +/- 6.9 | 47.0% +/- 6.9 | 48.0% +/- 6.9 | 49.0% +/- 6.9 | 51.5% +/- 6.9 | 43.5% | 33.7% | 1.29 | 21.6% | 0.9% | downs |
| no swift move (assumption 20) | 43.0% +/- 6.9 | 49.5% +/- 6.9 | 50.5% +/- 6.9 | 47.5% +/- 6.9 | 51.5% +/- 6.9 | 52.0% | 24.4% | 1.15 | 22.1% | 0.7% | decided-r1, comeback, downs |
| no stake (assumption 22) | 42.5% +/- 6.9 | 51.5% +/- 6.9 | 49.5% +/- 6.9 | 48.5% +/- 6.9 | 51.5% +/- 6.9 | 47.0% | 32.8% | 1.48 | 21.7% | 0.7% | nothing |
| pass 3 hiding restored (first strike, costs two sends, three quarters power) | 46.3% +/- 8.1 | 45.2% +/- 7.8 | 43.8% +/- 8.0 | 47.6% +/- 8.1 | 48.7% +/- 7.8 | 43.8% | 33.3% | 0.86 | 22.1% | 0.5% | returned-rate, downs |
| catch-up send restored (trailingBonus 1) | 43.5% +/- 6.9 | 44.5% +/- 6.9 | 45.5% +/- 6.9 | 42.5% +/- 6.9 | 49.0% +/- 6.9 | 35.0% | 35.8% | 1.50 | 21.8% | 0.9% | decided-r1 |

**Reading.** no hidden sends: CARRYING WEIGHT - hidden-rate moved beyond the interval.

**Reading.** no Loki line: CARRYING WEIGHT - returned-rate moved beyond the interval.

**Reading.** no speed order (sent order): CARRYING WEIGHT - envoy moved beyond the interval.

**Reading.** hidden-first restored (pass 2 bonus): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no sweep role (sweeps strike instead): CARRYING WEIGHT - decided-r1 moved beyond the interval.

**Reading.** no bolster role (bolsterers just hold): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no shield role (shielders just hold): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no hurt-attacks-less (assumption 18): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no bolster recovery (assumption 19): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no willful strain relief (assumption 17): CARRYING WEIGHT - decided-r1 moved beyond the interval.

**Reading.** no presence scale (every presence at charisma 50): CARRYING WEIGHT - heir, windsailor, downs moved beyond the interval.

**Reading.** no instinct lanes (conduct only): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no swift move (assumption 20): CARRYING WEIGHT - decided-r1, comeback, downs moved beyond the interval.

**Reading.** no stake (assumption 22): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** pass 3 hiding restored (first strike, costs two sends, three quarters power): CARRYING WEIGHT - returned-rate, downs moved beyond the interval.

**Reading.** catch-up send restored (trailingBonus 1): CARRYING WEIGHT - decided-r1 moved beyond the interval.

## 5. Draft dominance

top 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| terragoyle | 200 | 100.0% | 46.5% | 12.22 |  |
| sonalloy | 200 | 100.0% | 54.5% | 13.14 |  |
| bioflim | 200 | 100.0% | 49.5% | 12.62 |  |
| foromeer | 200 | 99.5% | 53.8% | 10.19 |  |
| frackworm | 200 | 99.5% | 45.2% | 10.50 |  |
| venemist | 200 | 99.5% | 47.2% | 10.22 |  |
| scalatto | 200 | 99.5% | 49.2% | 11.46 |  |
| voltish | 200 | 99.5% | 51.8% | 11.73 |  |
| hippochamp | 200 | 99.0% | 56.1% | 10.71 |  |
| luceras | 200 | 98.5% | 55.8% | 8.66 |  |

bottom 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| dromeus | 200 | 0.0% | n/a | 3.79 | dead |
| chromocat | 200 | 24.0% | 39.6% | 4.94 |  |
| avilily | 200 | 25.0% | 56.0% | 4.92 |  |
| akinza | 200 | 27.0% | 51.9% | 5.51 |  |
| imprit | 200 | 27.5% | 45.5% | 3.68 |  |
| tizzie | 200 | 69.5% | 43.9% | 5.85 |  |
| smokat | 200 | 74.0% | 50.7% | 6.26 |  |
| hypnopet | 200 | 77.5% | 46.5% | 6.87 |  |
| newtapede | 200 | 78.5% | 47.1% | 7.68 |  |
| thirstaserp | 200 | 79.0% | 48.7% | 7.28 |  |

by primary element

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| metal | 400 | 99.8% | 54.1% | 11.66 |  |
| chemical | 400 | 99.8% | 48.4% | 11.42 |  |
| electric | 200 | 99.5% | 51.8% | 11.73 |  |
| air | 400 | 98.3% | 54.7% | 9.39 |  |
| sand | 800 | 93.4% | 50.9% | 9.43 |  |
| rock | 400 | 93.3% | 49.6% | 9.87 |  |
| dark | 400 | 93.0% | 49.2% | 8.47 |  |
| water | 400 | 88.8% | 52.1% | 9.20 |  |
| ghost | 400 | 77.5% | 44.5% | 6.24 |  |
| psychic | 600 | 76.3% | 47.8% | 6.55 |  |
| plant | 600 | 73.8% | 45.4% | 8.50 |  |
| light | 400 | 60.8% | 53.1% | 8.46 |  |
| ice | 200 | 27.0% | 51.9% | 5.51 |  |
| fire | 400 | 13.8% | 45.5% | 3.73 | dead |

by role

| role | dealt | keep rate | keeper win rate | mean hold |
| --- | --- | --- | --- | --- |
| sweep | 1457 | 79.2% +/- 2.1 | 47.0% +/- 2.9 | 7.37 |
| strike | 2490 | 68.2% +/- 1.8 | 53.0% +/- 2.4 | 7.48 |
| shield | 1159 | 94.0% +/- 1.4 | 48.5% +/- 3.0 | 11.11 |
| bolster | 894 | 96.0% +/- 1.3 | 50.0% +/- 3.3 | 10.24 |

**Reading.** DOMINANT: drilltail are kept above eighty percent AND their keeper wins above sixty percent. That is a balance problem the first human will find in one session.

**Reading.** DEAD CONTENT: dromeus are kept under twenty percent of the times they are dealt. Never chosen is content nobody plays with.

**Reading.** By element: dominant none; dead fire.

**Reading.** 22 of 30 species sit outside the 30 to 90 percent keep band.

## 6. Per-attribute lanes

| attribute | q1 / q3 | top n | top quartile site win | bottom n | bottom quartile site win | gap (points) |
| --- | --- | --- | --- | --- | --- | --- |
| vitality | 39 / 68 | 1030 | 59.4% +/- 3.0 | 931 | 45.0% +/- 3.2 | 14.4 |
| resilience | 30 / 72 | 943 | 60.7% +/- 3.1 | 1048 | 51.5% +/- 3.0 | 9.1 |
| endurance | 49 / 72 | 966 | 60.0% +/- 3.1 | 984 | 50.9% +/- 3.1 | 9.1 |
| strength | 31 / 64 | 945 | 60.3% +/- 3.1 | 920 | 46.3% +/- 3.2 | 14.0 |
| intelligence | 29 / 53 | 934 | 52.5% +/- 3.2 | 986 | 56.7% +/- 3.1 | -4.2 |
| agility | 29 / 73 | 936 | 48.8% +/- 3.2 | 942 | 60.3% +/- 3.1 | -11.5 |
| reflex | 35 / 70 | 976 | 51.5% +/- 3.1 | 997 | 59.8% +/- 3.0 | -8.2 |
| willpower | 39 / 63 | 934 | 54.1% +/- 3.2 | 1004 | 49.5% +/- 3.1 | 4.6 |
| charisma | 26 / 44 | 957 | 49.9% +/- 3.2 | 1001 | 58.9% +/- 3.0 | -9.0 |
| instinct | 54 / 66 | 1054 | 57.2% +/- 3.0 | 1035 | 56.1% +/- 3.0 | 1.1 |

gap in points, split per role (top quartile minus bottom quartile, within the role)

| attribute | overall | strikes | sweeps | presences (bolster + shield) |
| --- | --- | --- | --- | --- |
| vitality | 14.4 | 19.6 (n=455/412) | 12.6 (n=160/186) | 5.1 (n=452/409) |
| resilience | 9.1 | 10.5 (n=420/385) | 7.7 (n=161/179) | 8.3 (n=483/435) |
| endurance | 9.1 | -2.6 (n=416/411) | 8.0 (n=166/176) | 10.5 (n=445/426) |
| strength | 14.0 | 17.4 (n=400/424) | 8.0 (n=187/159) | 8.4 (n=397/431) |
| intelligence | -4.2 | -3.0 (n=425/442) | 0.7 (n=157/177) | -6.2 (n=405/410) |
| agility | -11.5 | -15.1 (n=420/410) | -5.9 (n=201/175) | -8.3 (n=430/400) |
| reflex | -8.2 | -9.3 (n=453/435) | -4.2 (n=152/173) | -1.3 (n=491/392) |
| willpower | 4.6 | 13.0 (n=392/456) | 2.3 (n=164/195) | -10.5 (n=401/406) |
| charisma | -9.0 | -9.0 (n=423/423) | -1.5 (n=161/175) | -6.7 (n=420/425) |
| instinct | 1.1 | -0.8 (n=385/490) | -3.6 (n=150/185) | 5.4 (n=454/446) |

**Reading.** Carrying weight: vitality 14.4 points, resilience 9.1 points, endurance 9.1 points, strength 14.0 points, intelligence -4.2 points, agility -11.5 points, reflex -8.2 points, willpower 4.6 points, charisma -9.0 points.

**Reading.** NO MEASURABLE LANE at 200 matches: instinct. The job Pass 2 gave each of these does not yet show in whether its world is won.

## 7. The stake

| setting | n | stakes/match | Provings staked | by the trailing side | staker wins staked world | staker wins unstaked worlds | only-trailing-staked match win |
| --- | --- | --- | --- | --- | --- | --- | --- |
| stake on | 200 | 0.39 | 35.5% +/- 6.6 | 82.1% +/- 8.5 | 48.1% +/- 11.2 | 44.9% +/- 8.0 | 20.4% +/- 10.7 |
| stake off | 200 | 0.00 | 0.0% +/- 0.0 | - | - | - | - |

match shape, stake on against stake off

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | downs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| stake on | 200 | 45.0% | 10.5% | 44.5% | 31.1% | 25.5% | 41.0% | 1.44 |
| stake off | 200 | 47.0% | 9.0% | 44.0% | 32.8% | 32.0% | 42.5% | 1.48 |

rival ladder, stake on against stake off

| rival | wins vs proctor (stake on) | wins vs proctor (stake off) |
| --- | --- | --- |
| envoy | 42.5% +/- 6.9 | 42.5% +/- 6.9 |
| heir | 47.0% +/- 6.9 | 51.5% +/- 6.9 |
| proctor | 46.5% +/- 6.9 | 49.5% +/- 6.9 |
| broker | 47.5% +/- 6.9 | 48.5% +/- 6.9 |
| windsailor | 48.0% +/- 6.9 | 51.5% +/- 6.9 |

**Reading.** The stake is taken in 35.5% of Provings, inside the 20 to 60 percent gauge, 82.1% of them by the side behind on worlds.

**Reading.** The staker wins its staked world 48.1% of the time against 44.9% on the same round's unstaked worlds, so the stake is picking worlds it can hold.

**Reading.** Comeback rate 31.1% with the stake against 32.8% without; decided after round 1 45.0% against 47.0% (reported, not a gauge since pass 2 dropped it).

**Reading.** In Provings where only the trailing side staked, that side won 20.4% (95% CI 9.6-31.1%, n=54).

## 8. The read

proctor mirror 46.5% +/- 6.9

| matchup | side A wins |
| --- | --- |
| proctor vs no anticipation (pass 3 bot: hidden sends read, coming sends not) | 74.0% +/- 6.1 |
| proctor vs blind (ignores hidden and coming sends alike) | 87.0% +/- 4.7 |
| sharp read (sharpness 1, a guess at WHERE) vs proctor (even spread) | 41.5% +/- 6.8 |

**Reading.** The read carries weight: the proctor beats the bot without anticipation 74.0% against a mirror of 46.5%.

