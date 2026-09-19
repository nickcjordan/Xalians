# Reclamation decision-quality validation

Run of expeditionValidation.js, 200 matches per configuration, seed 7, 2026-09-19. Sections: regret, spread, decided, ablation, draft, lanes, stake, read. Every rate carries its 95 percent binomial interval half width, so a difference smaller than the stated margin is not resolved at this batch size. Measured against docs/design/game-validation-principles.md section 1.

## 1. Naive-policy regret

| policy | wins vs proctor | wins vs random | sends/match | flag |
| --- | --- | --- | --- | --- |
| proctor (reference) | 53.0% +/- 6.9 | 95.0% +/- 3.0 | 9.2 |  |
| greedy | 0.0% +/- 0.0 | 18.0% +/- 5.3 | 10.0 |  |
| random | 7.0% +/- 3.5 | 47.5% +/- 6.9 | 9.4 |  |
| passEarly | 28.0% +/- 6.2 | 89.5% +/- 4.2 | 7.2 |  |
| alwaysStack | 0.0% +/- 0.0 | 2.0% +/- 1.9 | 10.0 |  |
| neverContest | 0.0% +/- 0.0 | 20.0% +/- 5.5 | 0.0 |  |
| alwaysPresenceFirst | 26.0% +/- 6.1 | 79.0% +/- 5.6 | 8.6 |  |

**Reading.** No naive policy comes within five points of the proctor and none beats it. The deploy decisions are carrying their weight at this batch size.

## 2. Option spread

| round | decisions | 1 | 2 | 3 | 4 | 5+ | mean near-best | one dominant | chose pass | mean gap 1st-2nd |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| round 1 | 775 | 222 | 163 | 126 | 72 | 192 | 3.33 | 28.6% | 25.8% | 1.56 |
| round 2 | 809 | 295 | 191 | 139 | 71 | 113 | 2.60 | 36.5% | 24.6% | 1.66 |
| round 3 | 380 | 151 | 94 | 68 | 34 | 33 | 2.27 | 39.7% | 4.2% | 8106479329268.83 |
| overall | 1964 | 668 | 448 | 333 | 177 | 338 | 2.83 | 34.0% | 21.1% | 1568463414014.61 |

**Reading.** Deploy decisions offer 2.8 near-best options on average, dominant on 34.0% of turns. That is the "a few close options" band the principles doc asks for.

## 3. Point of no return

proctor mirror, 200 matches
- decided after round 1: 52.5% (95% CI 45.6-59.4%, n=200)
- decided after round 2: 8.5% (95% CI 4.6-12.4%, n=200)
- decided only at the end: 39.0% (95% CI 32.2-45.8%, n=200)
- locked (five worlds) after round 1 / 2 / 3 / never: 0 / 42 / 152 / 6
- comeback rate (trailed after round 1, won): 31.0% (95% CI 24.4-37.6%, n=187)
- tied after round 2: 24.0% (95% CI 18.1-29.9%, n=200)
- third round changed the leader: 38.0% (95% CI 31.3-44.7%, n=200)
- downs per match: 4.53
- resolution changed the leader at 27.5% (95% CI 25.3-29.6%, n=1617) of contested worlds

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | downs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| proctor mirror | 200 | 52.5% | 8.5% | 39.0% | 31.0% | 24.0% | 38.0% | 4.53 |
| envoy vs proctor | 200 | 45.5% | 9.0% | 45.5% | 33.0% | 31.5% | 43.0% | 4.42 |
| heir vs proctor | 200 | 46.0% | 9.5% | 44.5% | 33.2% | 26.5% | 42.5% | 4.59 |
| proctor vs proctor | 200 | 52.5% | 8.5% | 39.0% | 31.0% | 24.0% | 38.0% | 4.53 |
| broker vs proctor | 200 | 54.0% | 11.0% | 35.0% | 29.9% | 17.5% | 33.0% | 4.50 |
| windsailor vs proctor | 200 | 47.5% | 10.0% | 42.5% | 32.2% | 18.5% | 38.0% | 4.43 |

**Reading.** DECIDED EARLY: 52.5% of proctor mirrors are decided after round 1, above the fifty percent bar. Rounds two and three are largely dead time and the catch-up lever needs to move.

**Reading.** Comeback split (pass 6): from a CONTESTED round 1 (trailing by one or two worlds) 37.8% +/- 7.9, which is the population the 30 to 40 band is about; from a SWEPT round 1 (trailing by 3) 9.1% +/- 8.5, which is not safeguarded by ruling. The overall rate below averages the two.

**Reading.** Comeback rate 31.0%, above the one-in-five floor; the third round changes the leader in 38.0% of matches.

## 4. Ablation

| ablation | envoy | heir | proctor | broker | windsailor | decided r1 | comeback | downs/match | hidden rate | returned rate | moved? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline (all rules on) | 53.0% +/- 6.9 | 42.5% +/- 6.9 | 53.0% +/- 6.9 | 55.0% +/- 6.9 | 53.5% +/- 6.9 | 52.5% | 31.0% | 4.53 | 18.7% | 0.6% | (baseline) |
| no hidden sends | 46.0% +/- 6.9 | 46.0% +/- 6.9 | 53.0% +/- 6.9 | 52.5% +/- 6.9 | 46.5% +/- 6.9 | 52.0% | 26.8% | 4.70 | 0.0% | 0.3% | envoy, windsailor, hidden-rate, returned-rate, downs |
| no Loki line | 53.0% +/- 6.9 | 45.5% +/- 6.9 | 54.5% +/- 6.9 | 55.0% +/- 6.9 | 54.5% +/- 6.9 | 54.5% | 27.3% | 4.46 | 18.7% | 0.0% | returned-rate |
| no speed order (sent order) | 62.0% +/- 6.7 | 53.5% +/- 6.9 | 58.5% +/- 6.8 | 59.5% +/- 6.8 | 58.5% +/- 6.8 | 53.0% | 26.9% | 4.66 | 18.7% | 0.4% | envoy, heir, downs |
| hidden-first restored (pass 2 bonus) | 52.5% +/- 6.9 | 41.5% +/- 6.8 | 54.0% +/- 6.9 | 54.0% +/- 6.9 | 52.5% +/- 6.9 | 53.0% | 31.0% | 4.50 | 18.8% | 0.5% | nothing |
| no sweep role (sweeps strike instead) | 51.5% +/- 6.9 | 48.5% +/- 6.9 | 49.5% +/- 6.9 | 54.0% +/- 6.9 | 48.5% +/- 6.9 | 53.0% | 24.6% | 4.62 | 19.1% | 0.2% | returned-rate |
| no bolster role (bolsterers just hold) | 45.5% +/- 6.9 | 48.0% +/- 6.9 | 50.5% +/- 6.9 | 49.0% +/- 6.9 | 48.5% +/- 6.9 | 60.0% | 22.6% | 4.43 | 18.8% | 0.6% | envoy, decided-r1, comeback, downs |
| no shield role (shielders just hold) | 56.0% +/- 6.9 | 47.5% +/- 6.9 | 51.0% +/- 6.9 | 55.0% +/- 6.9 | 52.0% +/- 6.9 | 44.0% | 31.6% | 5.13 | 18.9% | 0.5% | decided-r1, downs |
| no hurt-attacks-less (assumption 18) | 53.5% +/- 6.9 | 46.5% +/- 6.9 | 54.5% +/- 6.9 | 58.0% +/- 6.8 | 56.0% +/- 6.9 | 49.5% | 32.3% | 5.08 | 18.7% | 0.5% | downs |
| no bolster recovery (assumption 19) | 55.0% +/- 6.9 | 41.5% +/- 6.8 | 53.0% +/- 6.9 | 54.0% +/- 6.9 | 52.5% +/- 6.9 | 55.0% | 30.2% | 4.55 | 18.6% | 0.4% | nothing |
| no willful strain relief (assumption 17) | 54.5% +/- 6.9 | 49.0% +/- 6.9 | 57.5% +/- 6.9 | 58.5% +/- 6.8 | 55.5% +/- 6.9 | 51.5% | 28.1% | 4.39 | 19.1% | 0.5% | downs |
| no presence scale (every presence at charisma 50) | 53.0% +/- 6.9 | 37.5% +/- 6.7 | 51.5% +/- 6.9 | 49.5% +/- 6.9 | 48.5% +/- 6.9 | 48.5% | 33.9% | 4.24 | 18.5% | 0.6% | downs |
| no instinct lanes (conduct only) | 53.0% +/- 6.9 | 44.0% +/- 6.9 | 54.0% +/- 6.9 | 54.0% +/- 6.9 | 52.0% +/- 6.9 | 57.0% | 26.2% | 4.57 | 18.6% | 0.6% | nothing |
| no swift move (assumption 20) | 46.5% +/- 6.9 | 44.0% +/- 6.9 | 49.5% +/- 6.9 | 49.0% +/- 6.9 | 51.0% +/- 6.9 | 47.0% | 32.1% | 4.39 | 18.6% | 0.8% | downs |
| no stake (assumption 22) | 56.0% +/- 6.9 | 45.0% +/- 6.9 | 55.5% +/- 6.9 | 55.5% +/- 6.9 | 56.5% +/- 6.9 | 52.5% | 31.2% | 4.44 | 18.7% | 0.6% | nothing |
| pass 3 hiding restored (first strike, costs two sends, three quarters power) | 47.7% +/- 7.9 | 45.3% +/- 7.7 | 54.2% +/- 7.8 | 55.0% +/- 7.9 | 51.9% +/- 7.8 | 49.0% | 29.8% | 3.29 | 18.3% | 0.3% | returned-rate, downs |
| catch-up send restored (trailingBonus 1) | 52.5% +/- 6.9 | 43.5% +/- 6.9 | 52.0% +/- 6.9 | 55.5% +/- 6.9 | 53.5% +/- 6.9 | 43.5% | 31.0% | 4.75 | 18.7% | 0.7% | decided-r1, downs |

**Reading.** no hidden sends: CARRYING WEIGHT - envoy, windsailor, hidden-rate, returned-rate, downs moved beyond the interval.

**Reading.** no Loki line: CARRYING WEIGHT - returned-rate moved beyond the interval.

**Reading.** no speed order (sent order): CARRYING WEIGHT - envoy, heir, downs moved beyond the interval.

**Reading.** hidden-first restored (pass 2 bonus): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no sweep role (sweeps strike instead): CARRYING WEIGHT - returned-rate moved beyond the interval.

**Reading.** no bolster role (bolsterers just hold): CARRYING WEIGHT - envoy, decided-r1, comeback, downs moved beyond the interval.

**Reading.** no shield role (shielders just hold): CARRYING WEIGHT - decided-r1, downs moved beyond the interval.

**Reading.** no hurt-attacks-less (assumption 18): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no bolster recovery (assumption 19): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no willful strain relief (assumption 17): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no presence scale (every presence at charisma 50): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no instinct lanes (conduct only): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no swift move (assumption 20): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no stake (assumption 22): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** pass 3 hiding restored (first strike, costs two sends, three quarters power): CARRYING WEIGHT - returned-rate, downs moved beyond the interval.

**Reading.** catch-up send restored (trailingBonus 1): CARRYING WEIGHT - decided-r1, downs moved beyond the interval.

## 5. Draft dominance

top 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| luceras | 200 | 99.0% | 57.6% | 8.66 |  |
| voltish | 200 | 98.5% | 51.3% | 11.74 |  |
| bioflim | 200 | 98.0% | 48.5% | 12.67 |  |
| venemist | 200 | 95.5% | 53.4% | 10.25 |  |
| foromeer | 200 | 95.0% | 46.3% | 10.19 |  |
| frackworm | 200 | 94.0% | 42.6% | 10.47 |  |
| scalatto | 200 | 94.0% | 46.8% | 11.47 |  |
| chromocat | 200 | 93.5% | 49.2% | 4.92 |  |
| terragoyle | 200 | 93.0% | 50.5% | 12.20 |  |
| shuntara | 200 | 93.0% | 57.0% | 11.85 |  |

bottom 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| dromeus | 200 | 12.5% | 40.0% | 3.84 | dead |
| akinza | 200 | 46.5% | 50.5% | 5.49 |  |
| avilily | 200 | 54.5% | 50.5% | 4.97 |  |
| figzy | 200 | 56.0% | 54.5% | 6.91 |  |
| imprit | 200 | 59.0% | 43.2% | 3.65 |  |
| vespersyn | 200 | 65.5% | 46.6% | 7.11 |  |
| neph | 200 | 66.5% | 42.1% | 10.06 |  |
| tizzie | 200 | 68.5% | 40.9% | 5.72 |  |
| hypnopet | 200 | 70.5% | 48.9% | 6.94 |  |
| codazzo | 200 | 73.0% | 53.4% | 7.46 |  |

by primary element

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| chemical | 400 | 96.8% | 50.9% | 11.46 |  |
| electric | 400 | 95.8% | 54.0% | 11.80 |  |
| metal | 400 | 93.3% | 46.4% | 11.77 |  |
| light | 400 | 90.5% | 48.9% | 8.50 |  |
| sand | 800 | 90.0% | 50.0% | 9.42 |  |
| ghost | 400 | 88.3% | 55.5% | 6.21 |  |
| rock | 400 | 83.0% | 51.8% | 9.83 |  |
| water | 400 | 82.8% | 49.2% | 9.16 |  |
| air | 400 | 82.8% | 51.4% | 9.36 |  |
| dark | 400 | 76.8% | 49.5% | 8.50 |  |
| plant | 400 | 73.8% | 47.1% | 7.40 |  |
| psychic | 600 | 65.0% | 47.7% | 6.53 |  |
| ice | 200 | 46.5% | 50.5% | 5.49 |  |
| fire | 400 | 35.8% | 42.7% | 3.74 |  |

by role

| role | dealt | keep rate | keeper win rate | mean hold |
| --- | --- | --- | --- | --- |
| shield | 1082 | 84.0% +/- 2.2 | 46.3% +/- 3.2 | 11.24 |
| bolster | 953 | 63.7% +/- 3.1 | 45.0% +/- 4.0 | 10.24 |
| sweep | 2199 | 86.4% +/- 1.4 | 51.6% +/- 2.2 | 7.33 |
| strike | 1766 | 78.4% +/- 1.9 | 52.5% +/- 2.6 | 7.71 |

**Reading.** DEAD CONTENT: dromeus are kept under twenty percent of the times they are dealt. Never chosen is content nobody plays with.

**Reading.** 16 of 30 species sit outside the 30 to 90 percent keep band.

## 6. Per-attribute lanes

| attribute | q1 / q3 | top n | top quartile site win | bottom n | bottom quartile site win | gap (points) |
| --- | --- | --- | --- | --- | --- | --- |
| vitality | 39 / 66 | 992 | 49.9% +/- 3.1 | 999 | 53.2% +/- 3.1 | -3.3 |
| resilience | 32 / 71 | 918 | 52.3% +/- 3.2 | 1011 | 51.0% +/- 3.1 | 1.2 |
| endurance | 50 / 71 | 958 | 54.5% +/- 3.2 | 919 | 50.5% +/- 3.2 | 4.0 |
| strength | 34 / 62 | 1043 | 55.5% +/- 3.0 | 946 | 49.8% +/- 3.2 | 5.7 |
| intelligence | 30 / 56 | 961 | 55.2% +/- 3.1 | 1191 | 52.5% +/- 2.8 | 2.7 |
| agility | 28 / 73 | 989 | 49.6% +/- 3.1 | 921 | 51.1% +/- 3.2 | -1.5 |
| reflex | 34 / 70 | 921 | 55.3% +/- 3.2 | 1014 | 49.7% +/- 3.1 | 5.6 |
| willpower | 44 / 60 | 950 | 56.2% +/- 3.2 | 1091 | 52.4% +/- 3.0 | 3.8 |
| charisma | 25 / 44 | 945 | 51.1% +/- 3.2 | 935 | 53.4% +/- 3.2 | -2.3 |
| instinct | 50 / 68 | 987 | 57.4% +/- 3.1 | 912 | 51.4% +/- 3.2 | 6.0 |

gap in points, split per role (top quartile minus bottom quartile, within the role)

| attribute | overall | strikes | sweeps | presences (bolster + shield) |
| --- | --- | --- | --- | --- |
| vitality | -3.3 | 5.4 (n=286/293) | 2.9 (n=341/314) | 8.0 (n=364/362) |
| resilience | 1.2 | 8.3 (n=291/316) | 0.1 (n=344/374) | -0.3 (n=333/391) |
| endurance | 4.0 | 4.3 (n=289/319) | 4.6 (n=365/378) | 4.9 (n=335/336) |
| strength | 5.7 | 16.1 (n=298/298) | 1.7 (n=344/344) | 3.2 (n=364/356) |
| intelligence | 2.7 | 3.5 (n=293/295) | -1.2 (n=334/364) | 2.6 (n=331/360) |
| agility | -1.5 | -14.9 (n=291/286) | -1.7 (n=378/344) | -2.2 (n=353/412) |
| reflex | 5.6 | -1.2 (n=347/303) | -6.8 (n=331/334) | 0.1 (n=388/326) |
| willpower | 3.8 | 4.0 (n=297/283) | 4.1 (n=353/331) | 8.9 (n=409/410) |
| charisma | -2.3 | -12.2 (n=278/288) | -0.2 (n=321/351) | 6.3 (n=373/383) |
| instinct | 6.0 | 3.7 (n=288/274) | -4.8 (n=322/342) | -6.6 (n=357/333) |

**Reading.** Carrying weight: vitality -3.3 points, endurance 4.0 points, strength 5.7 points, reflex 5.6 points, willpower 3.8 points, instinct 6.0 points.

**Reading.** NO MEASURABLE LANE at 200 matches: resilience, intelligence, agility, charisma. The job Pass 2 gave each of these does not yet show in whether its world is won.

**Reading.** READS THE ROLE, NOT THE ATTRIBUTE: vitality. The overall lane and every per-role lane disagree in sign, so the overall number is the role composition and not the attribute's own job.

## 7. The stake

| setting | n | stakes/match | Provings staked | by the trailing side | staker wins staked world | staker wins unstaked worlds | only-trailing-staked match win |
| --- | --- | --- | --- | --- | --- | --- | --- |
| stake on | 200 | 0.34 | 32.0% +/- 6.5 | 95.5% +/- 5.0 | 58.5% +/- 12.0 | 44.3% +/- 8.8 | 29.3% +/- 11.7 |
| stake off | 200 | 0.00 | 0.0% +/- 0.0 | - | - | - | - |

match shape, stake on against stake off

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | downs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| stake on | 200 | 52.5% | 8.5% | 39.0% | 31.0% | 24.0% | 38.0% | 4.53 |
| stake off | 200 | 52.5% | 8.5% | 39.0% | 31.2% | 28.5% | 39.0% | 4.44 |

rival ladder, stake on against stake off

| rival | wins vs proctor (stake on) | wins vs proctor (stake off) |
| --- | --- | --- |
| envoy | 53.0% +/- 6.9 | 56.0% +/- 6.9 |
| heir | 42.5% +/- 6.9 | 45.0% +/- 6.9 |
| proctor | 53.0% +/- 6.9 | 55.5% +/- 6.9 |
| broker | 55.0% +/- 6.9 | 55.5% +/- 6.9 |
| windsailor | 53.5% +/- 6.9 | 56.5% +/- 6.9 |

**Reading.** The stake is taken in 32.0% of Provings, inside the 20 to 60 percent gauge, 95.5% of them by the side behind on worlds.

**Reading.** The staker wins its staked world 58.5% of the time against 44.3% on the same round's unstaked worlds, a gap of 14.2 points inside the +/- 14.9 interval: the stake is variance-neutral, which is what a chosen risk should be.

**Reading.** Comeback rate 31.0% with the stake against 31.2% without; decided after round 1 52.5% against 52.5% (reported, not a gauge since pass 2 dropped it).

**Reading.** In Provings where only the trailing side staked, that side won 29.3% (95% CI 17.6-41.0%, n=58).

## 8. The read

proctor mirror 53.0% +/- 6.9

| matchup | side A wins |
| --- | --- |
| proctor vs no anticipation (pass 3 bot: hidden sends read, coming sends not) | 75.0% +/- 6.0 |
| proctor vs blind (ignores hidden and coming sends alike) | 88.0% +/- 4.5 |
| sharp read (sharpness 1, a guess at WHERE) vs proctor (even spread) | 50.5% +/- 6.9 |

**Reading.** The read carries weight: the proctor beats the bot without anticipation 75.0% against a mirror of 53.0%.

