# Reclamation decision-quality validation

Run of expeditionValidation.js, 200 matches per configuration, seed 7, 2026-09-10. Sections: regret, spread, decided, ablation, draft, lanes, stake, read. Every rate carries its 95 percent binomial interval half width, so a difference smaller than the stated margin is not resolved at this batch size. Measured against docs/design/game-validation-principles.md section 1.

## 1. Naive-policy regret

| policy | wins vs proctor | wins vs random | sends/match | flag |
| --- | --- | --- | --- | --- |
| proctor (reference) | 45.0% +/- 6.9 | 96.0% +/- 2.7 | 9.3 |  |
| greedy | 0.0% +/- 0.0 | 20.5% +/- 5.6 | 10.0 |  |
| random | 3.5% +/- 2.5 | 46.5% +/- 6.9 | 9.1 |  |
| passEarly | 22.5% +/- 5.8 | 89.5% +/- 4.2 | 6.8 |  |
| alwaysHidden | 45.5% +/- 6.9 | 96.0% +/- 2.7 | 9.3 | reported only (pass 4) |
| alwaysStack | 0.0% +/- 0.0 | 0.5% +/- 1.0 | 10.0 |  |
| neverContest | 0.0% +/- 0.0 | 21.5% +/- 5.7 | 0.0 |  |
| alwaysPresenceFirst | 24.0% +/- 5.9 | 92.0% +/- 3.8 | 8.3 |  |

**Reading.** No naive policy comes within five points of the proctor and none beats it. The deploy decisions are carrying their weight at this batch size.

## 2. Option spread

| round | decisions | 1 | 2 | 3 | 4 | 5+ | mean near-best | one dominant | chose pass | mean gap 1st-2nd |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| round 1 | 761 | 194 | 178 | 102 | 82 | 205 | 3.49 | 25.5% | 26.3% | 0.36 |
| round 2 | 783 | 259 | 190 | 128 | 84 | 122 | 2.76 | 33.1% | 25.2% | 0.49 |
| round 3 | 391 | 130 | 124 | 55 | 48 | 34 | 2.42 | 33.2% | 4.6% | 0.60 |
| overall | 1935 | 583 | 492 | 285 | 214 | 361 | 2.98 | 30.1% | 21.4% | 0.46 |

**Reading.** Deploy decisions offer 3.0 near-best options on average, dominant on 30.1% of turns. That is the "a few close options" band the principles doc asks for.

## 3. Point of no return

proctor mirror, 200 matches
- decided after round 1: 46.0% (95% CI 39.1-52.9%, n=200)
- decided after round 2: 12.0% (95% CI 7.5-16.5%, n=200)
- decided only at the end: 42.0% (95% CI 35.2-48.8%, n=200)
- locked (five worlds) after round 1 / 2 / 3 / never: 0 / 40 / 155 / 5
- comeback rate (trailed after round 1, won): 32.1% (95% CI 25.5-38.7%, n=190)
- tied after round 2: 25.5% (95% CI 19.5-31.5%, n=200)
- third round changed the leader: 39.5% (95% CI 32.7-46.3%, n=200)
- downs per match: 2.06
- resolution changed the leader at 15.2% (95% CI 13.5-17.0%, n=1640) of contested worlds

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | downs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| proctor mirror | 200 | 46.0% | 12.0% | 42.0% | 32.1% | 25.5% | 39.5% | 2.06 |
| envoy vs proctor | 200 | 52.5% | 7.0% | 40.5% | 28.0% | 26.5% | 38.5% | 1.97 |
| heir vs proctor | 200 | 43.0% | 8.5% | 48.5% | 28.7% | 35.0% | 48.0% | 2.04 |
| proctor vs proctor | 200 | 46.0% | 12.0% | 42.0% | 32.1% | 25.5% | 39.5% | 2.06 |
| broker vs proctor | 200 | 46.0% | 10.5% | 43.5% | 25.3% | 25.5% | 43.0% | 2.01 |
| windsailor vs proctor | 200 | 46.5% | 11.5% | 42.0% | 36.6% | 22.5% | 38.5% | 2.01 |

**Reading.** 46.0% of proctor mirrors are decided after round 1, under the fifty percent bar; 42.0% are settled only at the final judge.

**Reading.** Comeback rate 32.1%, above the one-in-five floor; the third round changes the leader in 39.5% of matches.

## 4. Ablation

| ablation | envoy | heir | proctor | broker | windsailor | decided r1 | comeback | downs/match | hidden rate | returned rate | moved? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline (all rules on) | 45.0% +/- 6.9 | 41.0% +/- 6.8 | 45.0% +/- 6.9 | 46.0% +/- 6.9 | 44.5% +/- 6.9 | 46.0% | 32.1% | 2.06 | 20.9% | 0.7% | (baseline) |
| no hidden sends | 45.5% +/- 6.9 | 51.5% +/- 6.9 | 45.0% +/- 6.9 | 46.5% +/- 6.9 | 45.5% +/- 6.9 | 49.0% | 25.8% | 2.02 | 0.0% | 0.7% | heir, hidden-rate |
| no Loki line | 43.0% +/- 6.9 | 40.5% +/- 6.8 | 47.5% +/- 6.9 | 44.5% +/- 6.9 | 45.5% +/- 6.9 | 46.0% | 32.6% | 2.11 | 21.2% | 0.0% | returned-rate |
| no speed order (sent order) | 49.0% +/- 6.9 | 47.5% +/- 6.9 | 45.0% +/- 6.9 | 47.5% +/- 6.9 | 46.0% +/- 6.9 | 45.0% | 32.5% | 1.90 | 20.9% | 0.6% | downs |
| hidden-first restored (pass 2 bonus) | 46.0% +/- 6.9 | 41.5% +/- 6.8 | 41.0% +/- 6.8 | 43.0% +/- 6.9 | 47.0% +/- 6.9 | 43.0% | 34.9% | 2.16 | 19.2% | 0.8% | hidden-rate, downs |
| no sweep role (sweeps strike instead) | 42.5% +/- 6.9 | 47.5% +/- 6.9 | 45.5% +/- 6.9 | 45.5% +/- 6.9 | 48.5% +/- 6.9 | 43.0% | 35.4% | 2.19 | 21.6% | 0.6% | downs |
| no bolster role (bolsterers just hold) | 45.5% +/- 6.9 | 45.0% +/- 6.9 | 51.5% +/- 6.9 | 43.0% +/- 6.9 | 44.0% +/- 6.9 | 50.5% | 33.5% | 2.10 | 21.5% | 0.7% | nothing |
| no shield role (shielders just hold) | 46.0% +/- 6.9 | 42.5% +/- 6.9 | 45.0% +/- 6.9 | 48.5% +/- 6.9 | 46.5% +/- 6.9 | 43.0% | 31.6% | 2.19 | 21.1% | 0.8% | downs |
| no hurt-attacks-less (assumption 18) | 45.0% +/- 6.9 | 42.5% +/- 6.9 | 43.0% +/- 6.9 | 49.5% +/- 6.9 | 45.0% +/- 6.9 | 45.0% | 32.6% | 2.37 | 20.9% | 0.5% | downs |
| no bolster recovery (assumption 19) | 42.5% +/- 6.9 | 40.5% +/- 6.8 | 44.0% +/- 6.9 | 45.5% +/- 6.9 | 46.5% +/- 6.9 | 47.0% | 30.0% | 2.05 | 20.9% | 0.7% | nothing |
| no willful strain relief (assumption 17) | 44.5% +/- 6.9 | 50.5% +/- 6.9 | 40.5% +/- 6.8 | 43.5% +/- 6.9 | 49.0% +/- 6.9 | 51.5% | 27.5% | 2.08 | 21.5% | 0.8% | heir |
| no presence scale (every presence at charisma 50) | 44.0% +/- 6.9 | 48.0% +/- 6.9 | 45.5% +/- 6.9 | 48.0% +/- 6.9 | 49.0% +/- 6.9 | 42.0% | 37.4% | 2.03 | 21.2% | 0.9% | heir |
| no instinct lanes (conduct only) | 44.0% +/- 6.9 | 41.0% +/- 6.8 | 46.5% +/- 6.9 | 45.5% +/- 6.9 | 45.0% +/- 6.9 | 46.0% | 30.5% | 1.96 | 21.0% | 0.7% | nothing |
| no swift move (assumption 20) | 42.0% +/- 6.8 | 49.5% +/- 6.9 | 45.0% +/- 6.9 | 41.0% +/- 6.8 | 48.5% +/- 6.9 | 50.5% | 27.2% | 1.80 | 21.4% | 0.6% | heir, downs |
| no stake (assumption 22) | 45.0% +/- 6.9 | 42.0% +/- 6.8 | 47.0% +/- 6.9 | 46.0% +/- 6.9 | 51.5% +/- 6.9 | 44.0% | 33.0% | 2.08 | 20.9% | 0.8% | windsailor |
| pass 3 hiding restored (first strike, costs two sends, three quarters power) | 51.0% +/- 6.9 | 47.5% +/- 6.9 | 41.0% +/- 6.8 | 37.5% +/- 6.7 | 48.0% +/- 6.9 | 47.5% | 32.6% | 1.68 | 5.6% | 0.6% | broker, hidden-rate, downs |
| catch-up send restored (trailingBonus 1) | 41.5% +/- 6.8 | 41.5% +/- 6.8 | 47.5% +/- 6.9 | 42.5% +/- 6.9 | 46.5% +/- 6.9 | 37.0% | 35.8% | 2.13 | 20.7% | 0.8% | decided-r1 |

**Reading.** no hidden sends: CARRYING WEIGHT - heir, hidden-rate moved beyond the interval.

**Reading.** no Loki line: CARRYING WEIGHT - returned-rate moved beyond the interval.

**Reading.** no speed order (sent order): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** hidden-first restored (pass 2 bonus): CARRYING WEIGHT - hidden-rate, downs moved beyond the interval.

**Reading.** no sweep role (sweeps strike instead): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no bolster role (bolsterers just hold): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no shield role (shielders just hold): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no hurt-attacks-less (assumption 18): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no bolster recovery (assumption 19): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no willful strain relief (assumption 17): CARRYING WEIGHT - heir moved beyond the interval.

**Reading.** no presence scale (every presence at charisma 50): CARRYING WEIGHT - heir moved beyond the interval.

**Reading.** no instinct lanes (conduct only): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no swift move (assumption 20): CARRYING WEIGHT - heir, downs moved beyond the interval.

**Reading.** no stake (assumption 22): CARRYING WEIGHT - windsailor moved beyond the interval.

**Reading.** pass 3 hiding restored (first strike, costs two sends, three quarters power): CARRYING WEIGHT - broker, hidden-rate, downs moved beyond the interval.

**Reading.** catch-up send restored (trailingBonus 1): CARRYING WEIGHT - decided-r1 moved beyond the interval.

## 5. Draft dominance

top 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| frackworm | 200 | 100.0% | 50.5% | 10.50 |  |
| voltish | 200 | 100.0% | 53.5% | 11.67 |  |
| bioflim | 200 | 100.0% | 53.5% | 12.62 |  |
| foromeer | 200 | 99.5% | 53.8% | 10.19 |  |
| scalatto | 200 | 99.5% | 48.7% | 11.42 |  |
| venemist | 200 | 99.5% | 46.2% | 10.27 |  |
| terragoyle | 200 | 99.0% | 49.5% | 12.36 |  |
| luceras | 200 | 99.0% | 51.5% | 8.66 |  |
| hippochamp | 200 | 99.0% | 51.5% | 10.71 |  |
| crystorn | 200 | 98.5% | 59.4% | 11.98 |  |

bottom 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| dromeus | 200 | 0.0% | n/a | 3.79 | dead |
| chromocat | 200 | 23.5% | 42.6% | 4.94 |  |
| akinza | 200 | 25.5% | 49.0% | 5.51 |  |
| imprit | 200 | 26.5% | 56.6% | 3.74 |  |
| avilily | 200 | 29.5% | 42.4% | 4.92 |  |
| tizzie | 200 | 60.0% | 48.3% | 5.69 |  |
| smokat | 200 | 75.0% | 50.0% | 6.26 |  |
| newtapede | 200 | 79.5% | 45.9% | 7.68 |  |
| hypnopet | 200 | 80.0% | 50.6% | 6.87 |  |
| ectoghoul | 200 | 81.0% | 43.2% | 6.22 |  |

by primary element

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| electric | 200 | 100.0% | 53.5% | 11.67 |  |
| chemical | 400 | 99.8% | 49.9% | 11.44 |  |
| metal | 200 | 99.5% | 53.8% | 10.19 |  |
| air | 400 | 98.5% | 51.8% | 9.39 |  |
| sand | 800 | 95.4% | 50.9% | 9.44 |  |
| dark | 400 | 93.8% | 48.0% | 8.59 |  |
| rock | 400 | 92.8% | 49.3% | 9.94 |  |
| water | 400 | 89.3% | 49.0% | 9.20 |  |
| ghost | 400 | 78.0% | 46.5% | 6.24 |  |
| plant | 600 | 75.5% | 46.6% | 8.50 |  |
| psychic | 600 | 74.2% | 48.5% | 6.50 |  |
| light | 400 | 61.0% | 56.1% | 8.46 |  |
| ice | 400 | 58.8% | 50.2% | 8.27 |  |
| fire | 400 | 13.3% | 56.6% | 3.76 | dead |

by role

| role | dealt | keep rate | keeper win rate | mean hold |
| --- | --- | --- | --- | --- |
| bolster | 740 | 94.5% +/- 1.6 | 51.2% +/- 3.7 | 9.57 |
| strike | 2569 | 69.4% +/- 1.8 | 50.8% +/- 2.3 | 7.58 |
| shield | 1234 | 94.1% +/- 1.3 | 49.2% +/- 2.9 | 11.10 |
| sweep | 1457 | 79.4% +/- 2.1 | 48.8% +/- 2.9 | 7.41 |

**Reading.** DEAD CONTENT: dromeus are kept under twenty percent of the times they are dealt. Never chosen is content nobody plays with.

**Reading.** By element: dominant none; dead fire.

**Reading.** 22 of 30 species sit outside the 30 to 90 percent keep band.

## 6. Per-attribute lanes

| attribute | q1 / q3 | top n | top quartile site win | bottom n | bottom quartile site win | gap (points) |
| --- | --- | --- | --- | --- | --- | --- |
| vitality | 42 / 65 | 997 | 55.5% +/- 3.1 | 937 | 48.5% +/- 3.2 | 7.0 |
| resilience | 30 / 65 | 925 | 58.4% +/- 3.2 | 1042 | 45.7% +/- 3.0 | 12.7 |
| endurance | 50 / 74 | 934 | 55.5% +/- 3.2 | 926 | 46.4% +/- 3.2 | 9.0 |
| strength | 36 / 64 | 1040 | 58.3% +/- 3.0 | 928 | 46.4% +/- 3.2 | 11.8 |
| intelligence | 28 / 49 | 955 | 50.2% +/- 3.2 | 958 | 51.8% +/- 3.2 | -1.6 |
| agility | 30 / 70 | 954 | 49.9% +/- 3.2 | 922 | 56.1% +/- 3.2 | -6.2 |
| reflex | 37 / 74 | 946 | 53.0% +/- 3.2 | 935 | 55.2% +/- 3.2 | -2.2 |
| willpower | 39 / 63 | 949 | 52.7% +/- 3.2 | 954 | 50.2% +/- 3.2 | 2.5 |
| charisma | 26 / 48 | 1009 | 52.1% +/- 3.1 | 969 | 58.2% +/- 3.1 | -6.1 |
| instinct | 55 / 70 | 931 | 61.0% +/- 3.1 | 1017 | 56.5% +/- 3.0 | 4.5 |

gap in points, split per role (top quartile minus bottom quartile, within the role)

| attribute | overall | strikes | sweeps | presences (bolster + shield) |
| --- | --- | --- | --- | --- |
| vitality | 7.0 | 9.8 (n=440/390) | 3.1 (n=290/290) | 11.2 (n=289/314) |
| resilience | 12.7 | 7.1 (n=457/460) | 13.7 (n=271/271) | 18.4 (n=284/313) |
| endurance | 9.0 | 3.9 (n=428/393) | 3.3 (n=276/265) | 19.0 (n=300/351) |
| strength | 11.8 | 9.4 (n=414/404) | -2.6 (n=253/278) | 17.1 (n=278/346) |
| intelligence | -1.6 | -4.1 (n=403/519) | 4.0 (n=289/288) | -9.7 (n=300/298) |
| agility | -6.2 | -9.0 (n=387/461) | -7.2 (n=257/285) | -16.3 (n=314/346) |
| reflex | -2.2 | 2.0 (n=408/424) | -4.9 (n=284/280) | -2.2 (n=330/282) |
| willpower | 2.5 | -0.9 (n=422/477) | 8.5 (n=288/260) | 3.5 (n=354/342) |
| charisma | -6.1 | -5.8 (n=410/390) | -4.2 (n=281/338) | -15.2 (n=292/306) |
| instinct | 4.5 | 6.3 (n=451/412) | -0.6 (n=275/293) | -4.0 (n=463/286) |

**Reading.** Carrying weight: vitality 7.0 points, resilience 12.7 points, endurance 9.0 points, strength 11.8 points, agility -6.2 points, charisma -6.1 points, instinct 4.5 points.

**Reading.** NO MEASURABLE LANE at 200 matches: intelligence, reflex, willpower. The job Pass 2 gave each of these does not yet show in whether its world is won.

## 7. The stake

| setting | n | stakes/match | Provings staked | by the trailing side | staker wins staked world | staker wins unstaked worlds | only-trailing-staked match win |
| --- | --- | --- | --- | --- | --- | --- | --- |
| stake on | 200 | 0.33 | 30.5% +/- 6.4 | 81.5% +/- 9.4 | 51.6% +/- 12.2 | 49.6% +/- 8.8 | 28.3% +/- 13.0 |
| stake off | 200 | 0.00 | 0.0% +/- 0.0 | - | - | - | - |

match shape, stake on against stake off

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | downs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| stake on | 200 | 46.0% | 12.0% | 42.0% | 32.1% | 25.5% | 39.5% | 2.06 |
| stake off | 200 | 44.0% | 12.0% | 44.0% | 33.0% | 32.5% | 42.5% | 2.08 |

rival ladder, stake on against stake off

| rival | wins vs proctor (stake on) | wins vs proctor (stake off) |
| --- | --- | --- |
| envoy | 45.0% +/- 6.9 | 45.0% +/- 6.9 |
| heir | 41.0% +/- 6.8 | 42.0% +/- 6.8 |
| proctor | 45.0% +/- 6.9 | 47.0% +/- 6.9 |
| broker | 46.0% +/- 6.9 | 46.0% +/- 6.9 |
| windsailor | 44.5% +/- 6.9 | 51.5% +/- 6.9 |

**Reading.** The stake is taken in 30.5% of Provings, inside the 20 to 60 percent gauge, 81.5% of them by the side behind on worlds.

**Reading.** The staker wins its staked world 51.6% of the time against 49.6% on the same round's unstaked worlds, so the stake is picking worlds it can hold.

**Reading.** Comeback rate 32.1% with the stake against 33.0% without; decided after round 1 46.0% against 44.0% (reported, not a gauge since pass 2 dropped it).

**Reading.** In Provings where only the trailing side staked, that side won 28.3% (95% CI 15.2-41.3%, n=46).

## 8. The read

proctor mirror 45.0% +/- 6.9

| matchup | side A wins |
| --- | --- |
| proctor vs no anticipation (pass 3 bot: hidden sends read, coming sends not) | 75.0% +/- 6.0 |
| proctor vs blind (ignores hidden and coming sends alike) | 86.0% +/- 4.8 |
| sharp read (sharpness 1, a guess at WHERE) vs proctor (even spread) | 38.5% +/- 6.7 |
| always hidden vs proctor | 45.5% +/- 6.9 |
| never hides vs proctor | 35.0% +/- 6.6 |
| always hidden vs blind | 86.0% +/- 4.8 |

**Reading.** The read carries weight: the proctor beats the bot without anticipation 75.0% against a mirror of 45.0%.

**Reading.** Concealment against the bot: hiding everything reads 45.5% and never hiding 35.0% against the proctor (+10.5 points for hiding). Reported, not a gauge: against a bot concealment is worth only what the bot's guess is wrong by, and whether a human values it is the human session's question.

