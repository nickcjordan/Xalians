# Reclamation decision-quality validation

Run of expeditionValidation.js, 200 matches per configuration, seed 7, 2026-09-19. Sections: regret, spread, decided, ablation, draft, lanes, stake, read. Every rate carries its 95 percent binomial interval half width, so a difference smaller than the stated margin is not resolved at this batch size. Measured against docs/design/game-validation-principles.md section 1.

## 1. Naive-policy regret

| policy | wins vs proctor | wins vs random | sends/match | flag |
| --- | --- | --- | --- | --- |
| proctor (reference) | 51.0% +/- 6.9 | 95.5% +/- 2.9 | 9.3 |  |
| greedy | 0.0% +/- 0.0 | 16.0% +/- 5.1 | 10.0 |  |
| random | 8.0% +/- 3.8 | 47.5% +/- 6.9 | 9.4 |  |
| passEarly | 30.5% +/- 6.4 | 89.5% +/- 4.2 | 7.2 |  |
| alwaysStack | 0.0% +/- 0.0 | 2.0% +/- 1.9 | 10.0 |  |
| neverContest | 0.0% +/- 0.0 | 20.0% +/- 5.5 | 0.0 |  |
| alwaysPresenceFirst | 24.5% +/- 6.0 | 78.0% +/- 5.7 | 8.6 |  |

**Reading.** No naive policy comes within five points of the proctor and none beats it. The deploy decisions are carrying their weight at this batch size.

## 2. Option spread

| round | decisions | 1 | 2 | 3 | 4 | 5+ | mean near-best | one dominant | chose pass | mean gap 1st-2nd |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| round 1 | 779 | 225 | 163 | 126 | 71 | 194 | 3.32 | 28.9% | 25.7% | 1.55 |
| round 2 | 814 | 306 | 186 | 133 | 81 | 108 | 2.58 | 37.6% | 24.3% | 1.37 |
| round 3 | 375 | 144 | 94 | 73 | 28 | 36 | 2.33 | 38.4% | 4.3% | 8214565720325.72 |
| overall | 1968 | 675 | 443 | 332 | 180 | 338 | 2.83 | 34.3% | 21.0% | 1565275480246.16 |

**Reading.** Deploy decisions offer 2.8 near-best options on average, dominant on 34.3% of turns. That is the "a few close options" band the principles doc asks for.

## 3. Point of no return

proctor mirror, 200 matches
- decided after round 1: 53.0% (95% CI 46.1-59.9%, n=200)
- decided after round 2: 8.5% (95% CI 4.6-12.4%, n=200)
- decided only at the end: 38.5% (95% CI 31.8-45.2%, n=200)
- locked (five worlds) after round 1 / 2 / 3 / never: 0 / 41 / 154 / 5
- comeback rate (trailed after round 1, won): 26.8% (95% CI 20.5-33.1%, n=190)
- tied after round 2: 23.0% (95% CI 17.2-28.8%, n=200)
- third round changed the leader: 38.0% (95% CI 31.3-44.7%, n=200)
- downs per match: 4.58
- resolution changed the leader at 27.6% (95% CI 25.4-29.8%, n=1618) of contested worlds

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | downs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| proctor mirror | 200 | 53.0% | 8.5% | 38.5% | 26.8% | 23.0% | 38.0% | 4.58 |
| envoy vs proctor | 200 | 47.5% | 10.5% | 42.0% | 33.9% | 27.0% | 40.5% | 4.60 |
| heir vs proctor | 200 | 46.0% | 11.0% | 43.0% | 30.7% | 32.0% | 41.0% | 4.66 |
| proctor vs proctor | 200 | 53.0% | 8.5% | 38.5% | 26.8% | 23.0% | 38.0% | 4.58 |
| broker vs proctor | 200 | 53.5% | 11.5% | 35.0% | 30.3% | 17.5% | 33.0% | 4.60 |
| windsailor vs proctor | 200 | 48.0% | 10.5% | 41.5% | 31.0% | 18.0% | 38.0% | 4.54 |

**Reading.** DECIDED EARLY: 53.0% of proctor mirrors are decided after round 1, above the fifty percent bar. Rounds two and three are largely dead time and the catch-up lever needs to move.

**Reading.** Comeback split (pass 6): from a CONTESTED round 1 (trailing by one or two worlds) 33.6% +/- 7.7, which is the population the 30 to 40 band is about; from a SWEPT round 1 (trailing by 3) 4.5% +/- 6.2, which is not safeguarded by ruling. The overall rate below averages the two.

**Reading.** Comeback rate 26.8%, above the one-in-five floor; the third round changes the leader in 38.0% of matches.

## 4. Ablation

| ablation | envoy | heir | proctor | broker | windsailor | decided r1 | comeback | downs/match | hidden rate | returned rate | moved? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline (all rules on) | 49.0% +/- 6.9 | 45.0% +/- 6.9 | 51.0% +/- 6.9 | 53.0% +/- 6.9 | 50.5% +/- 6.9 | 53.0% | 26.8% | 4.58 | 18.7% | 0.4% | (baseline) |
| no hidden sends | 46.0% +/- 6.9 | 49.5% +/- 6.9 | 53.0% +/- 6.9 | 53.5% +/- 6.9 | 44.5% +/- 6.9 | 49.0% | 27.4% | 4.94 | 0.0% | 0.2% | hidden-rate, returned-rate, downs |
| no Loki line | 53.0% +/- 6.9 | 46.5% +/- 6.9 | 52.5% +/- 6.9 | 52.0% +/- 6.9 | 52.0% +/- 6.9 | 53.5% | 26.3% | 4.55 | 18.6% | 0.0% | returned-rate |
| no speed order (sent order) | 64.0% +/- 6.7 | 53.5% +/- 6.9 | 59.0% +/- 6.8 | 60.5% +/- 6.8 | 56.5% +/- 6.9 | 48.5% | 26.6% | 4.64 | 18.5% | 0.3% | envoy, heir, proctor, broker |
| hidden-first restored (pass 2 bonus) | 49.0% +/- 6.9 | 46.5% +/- 6.9 | 52.0% +/- 6.9 | 52.5% +/- 6.9 | 51.5% +/- 6.9 | 53.0% | 28.4% | 4.56 | 18.8% | 0.4% | nothing |
| no sweep role (sweeps strike instead) | 51.5% +/- 6.9 | 48.5% +/- 6.9 | 49.5% +/- 6.9 | 54.0% +/- 6.9 | 48.5% +/- 6.9 | 53.0% | 24.6% | 4.62 | 19.1% | 0.2% | returned-rate |
| no bolster role (bolsterers just hold) | 45.5% +/- 6.9 | 49.0% +/- 6.9 | 48.5% +/- 6.9 | 46.5% +/- 6.9 | 46.5% +/- 6.9 | 53.5% | 23.0% | 4.63 | 18.7% | 0.6% | nothing |
| no shield role (shielders just hold) | 53.0% +/- 6.9 | 48.0% +/- 6.9 | 51.5% +/- 6.9 | 53.5% +/- 6.9 | 50.5% +/- 6.9 | 48.5% | 30.4% | 5.25 | 18.8% | 0.4% | downs |
| no hurt-attacks-less (assumption 18) | 53.0% +/- 6.9 | 43.5% +/- 6.9 | 51.0% +/- 6.9 | 51.5% +/- 6.9 | 55.0% +/- 6.9 | 50.0% | 29.6% | 5.07 | 18.6% | 0.4% | downs |
| no bolster recovery (assumption 19) | 51.0% +/- 6.9 | 45.0% +/- 6.9 | 51.0% +/- 6.9 | 52.0% +/- 6.9 | 50.5% +/- 6.9 | 53.5% | 28.6% | 4.52 | 18.6% | 0.2% | nothing |
| no willful strain relief (assumption 17) | 52.5% +/- 6.9 | 43.0% +/- 6.9 | 56.0% +/- 6.9 | 57.5% +/- 6.9 | 54.5% +/- 6.9 | 52.0% | 30.6% | 4.54 | 19.0% | 0.5% | nothing |
| no presence scale (every presence at charisma 50) | 51.0% +/- 6.9 | 42.5% +/- 6.9 | 53.5% +/- 6.9 | 51.5% +/- 6.9 | 46.5% +/- 6.9 | 49.0% | 33.2% | 4.38 | 18.7% | 0.6% | comeback, downs |
| no instinct lanes (conduct only) | 49.5% +/- 6.9 | 45.5% +/- 6.9 | 53.5% +/- 6.9 | 53.5% +/- 6.9 | 49.5% +/- 6.9 | 55.5% | 24.9% | 4.63 | 18.6% | 0.5% | nothing |
| no swift move (assumption 20) | 51.5% +/- 6.9 | 45.5% +/- 6.9 | 54.5% +/- 6.9 | 54.5% +/- 6.9 | 49.5% +/- 6.9 | 51.5% | 29.1% | 4.61 | 18.3% | 0.7% | returned-rate |
| no stake (assumption 22) | 52.5% +/- 6.9 | 47.0% +/- 6.9 | 54.5% +/- 6.9 | 52.0% +/- 6.9 | 55.0% +/- 6.9 | 53.5% | 26.6% | 4.54 | 18.7% | 0.4% | nothing |
| pass 3 hiding restored (first strike, costs two sends, three quarters power) | 50.0% +/- 7.9 | 44.4% +/- 7.7 | 50.0% +/- 7.7 | 48.7% +/- 7.8 | 51.0% +/- 7.9 | 48.8% | 28.3% | 3.41 | 18.3% | 0.2% | downs |
| catch-up send restored (trailingBonus 1) | 50.5% +/- 6.9 | 44.5% +/- 6.9 | 52.5% +/- 6.9 | 55.5% +/- 6.9 | 50.5% +/- 6.9 | 44.0% | 25.3% | 4.82 | 18.7% | 0.6% | decided-r1, downs |

**Reading.** no hidden sends: CARRYING WEIGHT - hidden-rate, returned-rate, downs moved beyond the interval.

**Reading.** no Loki line: CARRYING WEIGHT - returned-rate moved beyond the interval.

**Reading.** no speed order (sent order): CARRYING WEIGHT - envoy, heir, proctor, broker moved beyond the interval.

**Reading.** hidden-first restored (pass 2 bonus): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no sweep role (sweeps strike instead): CARRYING WEIGHT - returned-rate moved beyond the interval.

**Reading.** no bolster role (bolsterers just hold): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no shield role (shielders just hold): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no hurt-attacks-less (assumption 18): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no bolster recovery (assumption 19): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no willful strain relief (assumption 17): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no presence scale (every presence at charisma 50): CARRYING WEIGHT - comeback, downs moved beyond the interval.

**Reading.** no instinct lanes (conduct only): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no swift move (assumption 20): CARRYING WEIGHT - returned-rate moved beyond the interval.

**Reading.** no stake (assumption 22): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** pass 3 hiding restored (first strike, costs two sends, three quarters power): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** catch-up send restored (trailingBonus 1): CARRYING WEIGHT - decided-r1, downs moved beyond the interval.

## 5. Draft dominance

top 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| luceras | 200 | 99.5% | 57.8% | 8.66 |  |
| bioflim | 200 | 98.0% | 53.1% | 12.67 |  |
| voltish | 200 | 98.0% | 53.6% | 11.74 |  |
| venemist | 200 | 95.5% | 51.8% | 10.25 |  |
| foromeer | 200 | 94.5% | 44.4% | 10.19 |  |
| scalatto | 200 | 94.0% | 47.9% | 11.47 |  |
| frackworm | 200 | 93.5% | 43.9% | 10.47 |  |
| chromocat | 200 | 93.5% | 49.2% | 4.92 |  |
| terragoyle | 200 | 93.0% | 45.2% | 12.20 |  |
| shuntara | 200 | 92.5% | 56.2% | 11.85 |  |

bottom 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| dromeus | 200 | 13.0% | 53.8% | 3.84 | dead |
| akinza | 200 | 44.5% | 47.2% | 5.49 |  |
| avilily | 200 | 55.5% | 52.3% | 4.97 |  |
| figzy | 200 | 56.0% | 50.9% | 6.91 |  |
| imprit | 200 | 60.0% | 49.2% | 3.65 |  |
| vespersyn | 200 | 65.5% | 50.4% | 7.11 |  |
| neph | 200 | 66.0% | 40.9% | 10.06 |  |
| tizzie | 200 | 68.0% | 42.6% | 5.72 |  |
| hypnopet | 200 | 70.5% | 50.4% | 6.94 |  |
| codazzo | 200 | 73.5% | 52.4% | 7.46 |  |

by primary element

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| chemical | 400 | 96.8% | 52.5% | 11.46 |  |
| electric | 400 | 95.3% | 54.9% | 11.80 |  |
| metal | 400 | 92.5% | 45.1% | 11.77 |  |
| light | 400 | 90.5% | 50.3% | 8.50 |  |
| sand | 800 | 90.3% | 50.4% | 9.42 |  |
| ghost | 400 | 89.3% | 55.5% | 6.21 |  |
| rock | 400 | 83.3% | 48.3% | 9.83 |  |
| water | 400 | 82.8% | 46.8% | 9.16 |  |
| air | 400 | 82.8% | 51.1% | 9.36 |  |
| dark | 400 | 77.0% | 51.0% | 8.50 |  |
| plant | 400 | 73.5% | 45.6% | 7.40 |  |
| psychic | 600 | 64.8% | 47.8% | 6.53 |  |
| ice | 200 | 44.5% | 47.2% | 5.49 |  |
| fire | 400 | 36.5% | 50.0% | 3.74 |  |

by role

| role | dealt | keep rate | keeper win rate | mean hold |
| --- | --- | --- | --- | --- |
| shield | 1082 | 83.5% +/- 2.2 | 46.0% +/- 3.3 | 11.24 |
| bolster | 953 | 63.3% +/- 3.1 | 46.4% +/- 4.0 | 10.24 |
| sweep | 2199 | 87.1% +/- 1.4 | 51.4% +/- 2.2 | 7.33 |
| strike | 1766 | 78.0% +/- 1.9 | 52.3% +/- 2.6 | 7.71 |

**Reading.** DEAD CONTENT: dromeus are kept under twenty percent of the times they are dealt. Never chosen is content nobody plays with.

**Reading.** 15 of 30 species sit outside the 30 to 90 percent keep band.

## 6. Per-attribute lanes

| attribute | q1 / q3 | top n | top quartile site win | bottom n | bottom quartile site win | gap (points) |
| --- | --- | --- | --- | --- | --- | --- |
| vitality | 39 / 66 | 982 | 50.0% +/- 3.1 | 997 | 53.4% +/- 3.1 | -3.4 |
| resilience | 32 / 71 | 926 | 52.6% +/- 3.2 | 1001 | 51.5% +/- 3.1 | 1.0 |
| endurance | 50 / 71 | 967 | 55.3% +/- 3.1 | 913 | 50.7% +/- 3.2 | 4.6 |
| strength | 34 / 62 | 1041 | 55.7% +/- 3.0 | 941 | 50.1% +/- 3.2 | 5.7 |
| intelligence | 30 / 56 | 960 | 54.6% +/- 3.1 | 1176 | 53.4% +/- 2.9 | 1.2 |
| agility | 28 / 73 | 971 | 52.5% +/- 3.1 | 910 | 51.2% +/- 3.2 | 1.3 |
| reflex | 34 / 69 | 949 | 58.0% +/- 3.1 | 1015 | 50.6% +/- 3.1 | 7.3 |
| willpower | 44 / 60 | 947 | 54.5% +/- 3.2 | 1093 | 53.2% +/- 3.0 | 1.2 |
| charisma | 25 / 44 | 952 | 51.9% +/- 3.2 | 929 | 52.9% +/- 3.2 | -1.0 |
| instinct | 50 / 68 | 990 | 58.1% +/- 3.1 | 911 | 51.2% +/- 3.2 | 6.9 |

gap in points, split per role (top quartile minus bottom quartile, within the role)

| attribute | overall | strikes | sweeps | presences (bolster + shield) |
| --- | --- | --- | --- | --- |
| vitality | -3.4 | 5.6 (n=284/292) | 0.4 (n=335/311) | 5.1 (n=362/332) |
| resilience | 1.0 | 9.0 (n=287/315) | 2.2 (n=338/365) | 0.3 (n=344/389) |
| endurance | 4.6 | 5.4 (n=292/316) | 4.7 (n=357/374) | 8.2 (n=338/342) |
| strength | 5.7 | 13.9 (n=296/298) | 3.7 (n=338/333) | 3.7 (n=369/353) |
| intelligence | 1.2 | 1.7 (n=293/293) | -3.7 (n=329/354) | 3.0 (n=340/353) |
| agility | 1.3 | -9.9 (n=286/284) | -1.0 (n=374/338) | -4.4 (n=362/410) |
| reflex | 7.3 | 0.6 (n=336/299) | -4.9 (n=323/329) | -0.1 (n=390/357) |
| willpower | 1.2 | 1.9 (n=289/285) | 0.1 (n=345/330) | 7.2 (n=421/415) |
| charisma | -1.0 | -8.8 (n=280/285) | 0.3 (n=320/343) | 1.5 (n=331/389) |
| instinct | 6.9 | 4.0 (n=282/274) | -5.0 (n=320/338) | -3.5 (n=368/342) |

**Reading.** Carrying weight: vitality -3.4 points, endurance 4.6 points, strength 5.7 points, reflex 7.3 points, instinct 6.9 points.

**Reading.** NO MEASURABLE LANE at 200 matches: resilience, intelligence, agility, willpower, charisma. The job Pass 2 gave each of these does not yet show in whether its world is won.

**Reading.** READS THE ROLE, NOT THE ATTRIBUTE: vitality, agility. The overall lane and every per-role lane disagree in sign, so the overall number is the role composition and not the attribute's own job.

## 7. The stake

| setting | n | stakes/match | Provings staked | by the trailing side | staker wins staked world | staker wins unstaked worlds | only-trailing-staked match win |
| --- | --- | --- | --- | --- | --- | --- | --- |
| stake on | 200 | 0.32 | 30.0% +/- 6.4 | 95.3% +/- 5.2 | 56.5% +/- 12.3 | 51.7% +/- 9.0 | 30.2% +/- 12.4 |
| stake off | 200 | 0.00 | 0.0% +/- 0.0 | - | - | - | - |

match shape, stake on against stake off

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | downs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| stake on | 200 | 53.0% | 8.5% | 38.5% | 26.8% | 23.0% | 38.0% | 4.58 |
| stake off | 200 | 53.5% | 7.5% | 39.0% | 26.6% | 28.5% | 39.0% | 4.54 |

rival ladder, stake on against stake off

| rival | wins vs proctor (stake on) | wins vs proctor (stake off) |
| --- | --- | --- |
| envoy | 49.0% +/- 6.9 | 52.5% +/- 6.9 |
| heir | 45.0% +/- 6.9 | 47.0% +/- 6.9 |
| proctor | 51.0% +/- 6.9 | 54.5% +/- 6.9 |
| broker | 53.0% +/- 6.9 | 52.0% +/- 6.9 |
| windsailor | 50.5% +/- 6.9 | 55.0% +/- 6.9 |

**Reading.** The stake is taken in 30.0% of Provings, inside the 20 to 60 percent gauge, 95.3% of them by the side behind on worlds.

**Reading.** The staker wins its staked world 56.5% of the time against 51.7% on the same round's unstaked worlds, a gap of 4.8 points inside the +/- 15.3 interval: the stake is variance-neutral, which is what a chosen risk should be.

**Reading.** Comeback rate 26.8% with the stake against 26.6% without; decided after round 1 53.0% against 53.5% (reported, not a gauge since pass 2 dropped it).

**Reading.** In Provings where only the trailing side staked, that side won 30.2% (95% CI 17.8-42.5%, n=53).

## 8. The read

proctor mirror 51.0% +/- 6.9

| matchup | side A wins |
| --- | --- |
| proctor vs no anticipation (pass 3 bot: hidden sends read, coming sends not) | 75.0% +/- 6.0 |
| proctor vs blind (ignores hidden and coming sends alike) | 88.5% +/- 4.4 |
| sharp read (sharpness 1, a guess at WHERE) vs proctor (even spread) | 48.5% +/- 6.9 |

**Reading.** The read carries weight: the proctor beats the bot without anticipation 75.0% against a mirror of 51.0%.

