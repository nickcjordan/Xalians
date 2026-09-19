# Reclamation decision-quality validation

Run of expeditionValidation.js, 200 matches per configuration, seed 7, 2026-09-19. Sections: regret, spread, decided, ablation, draft, lanes, stake, read. Every rate carries its 95 percent binomial interval half width, so a difference smaller than the stated margin is not resolved at this batch size. Measured against docs/design/game-validation-principles.md section 1.

## 1. Naive-policy regret

| policy | wins vs proctor | wins vs random | sends/match | flag |
| --- | --- | --- | --- | --- |
| proctor (reference) | 55.0% +/- 6.9 | 95.5% +/- 2.9 | 10.0 |  |
| greedy | 0.0% +/- 0.0 | 14.5% +/- 4.9 | 11.0 |  |
| random | 8.5% +/- 3.9 | 42.0% +/- 6.8 | 10.2 |  |
| passEarly | 37.0% +/- 6.7 | 89.5% +/- 4.2 | 8.2 |  |
| alwaysStack | 0.0% +/- 0.0 | 1.5% +/- 1.7 | 11.0 |  |
| neverContest | 0.0% +/- 0.0 | 19.0% +/- 5.4 | 0.0 |  |
| alwaysPresenceFirst | 27.0% +/- 6.2 | 84.0% +/- 5.1 | 9.2 |  |

**Reading.** No naive policy comes within five points of the proctor and none beats it. The deploy decisions are carrying their weight at this batch size.

## 2. Option spread

| round | decisions | 1 | 2 | 3 | 4 | 5+ | mean near-best | one dominant | chose pass | mean gap 1st-2nd |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| round 1 | 760 | 217 | 152 | 122 | 78 | 191 | 3.36 | 28.6% | 26.3% | 1.21 |
| round 2 | 865 | 317 | 235 | 116 | 77 | 120 | 2.54 | 36.6% | 23.1% | 0.78 |
| round 3 | 487 | 231 | 128 | 64 | 30 | 34 | 2.04 | 47.4% | 6.2% | 2.02 |
| overall | 2112 | 765 | 515 | 302 | 185 | 345 | 2.72 | 36.2% | 20.4% | 1.22 |

**Reading.** Deploy decisions offer 2.7 near-best options on average, dominant on 36.2% of turns. That is the "a few close options" band the principles doc asks for.

## 3. Point of no return

proctor mirror, 200 matches
- decided after round 1: 49.0% (95% CI 42.1-55.9%, n=200)
- decided after round 2: 12.0% (95% CI 7.5-16.5%, n=200)
- decided only at the end: 39.0% (95% CI 32.2-45.8%, n=200)
- locked (five worlds) after round 1 / 2 / 3 / never: 0 / 43 / 153 / 4
- comeback rate (trailed after round 1, won): 29.8% (95% CI 23.2-36.3%, n=188)
- tied after round 2: 23.0% (95% CI 17.2-28.8%, n=200)
- third round changed the leader: 37.5% (95% CI 30.8-44.2%, n=200)
- downs per match: 4.84
- resolution changed the leader at 24.7% (95% CI 22.6-26.8%, n=1634) of contested worlds

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | downs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| proctor mirror | 200 | 49.0% | 12.0% | 39.0% | 29.8% | 23.0% | 37.5% | 4.84 |
| envoy vs proctor | 200 | 47.0% | 12.5% | 40.5% | 29.6% | 26.0% | 40.0% | 4.71 |
| heir vs proctor | 200 | 45.0% | 13.0% | 42.0% | 36.6% | 26.5% | 40.5% | 5.07 |
| proctor vs proctor | 200 | 49.0% | 12.0% | 39.0% | 29.8% | 23.0% | 37.5% | 4.84 |
| broker vs proctor | 200 | 52.0% | 12.5% | 35.5% | 26.7% | 19.0% | 33.5% | 4.80 |
| windsailor vs proctor | 200 | 45.0% | 9.5% | 45.5% | 33.9% | 21.0% | 38.0% | 4.79 |

**Reading.** 49.0% of proctor mirrors are decided after round 1, under the fifty percent bar; 39.0% are settled only at the final judge.

**Reading.** Comeback split (pass 6): from a CONTESTED round 1 (trailing by one or two worlds) 36.1% +/- 7.8, which is the population the 30 to 40 band is about; from a SWEPT round 1 (trailing by 3) 7.3% +/- 8.0, which is not safeguarded by ruling. The overall rate below averages the two.

**Reading.** Comeback rate 29.8%, above the one-in-five floor; the third round changes the leader in 37.5% of matches.

## 4. Ablation

| ablation | envoy | heir | proctor | broker | windsailor | decided r1 | comeback | downs/match | hidden rate | returned rate | moved? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline (all rules on) | 51.0% +/- 6.9 | 46.5% +/- 6.9 | 55.0% +/- 6.9 | 52.5% +/- 6.9 | 52.5% +/- 6.9 | 49.0% | 29.8% | 4.84 | 18.1% | 0.9% | (baseline) |
| no hidden sends | 49.5% +/- 6.9 | 44.0% +/- 6.9 | 50.0% +/- 6.9 | 49.5% +/- 6.9 | 48.0% +/- 6.9 | 48.5% | 30.6% | 5.05 | 0.0% | 1.0% | hidden-rate, downs |
| no Loki line | 52.5% +/- 6.9 | 45.5% +/- 6.9 | 52.5% +/- 6.9 | 52.5% +/- 6.9 | 49.0% +/- 6.9 | 52.5% | 26.6% | 4.92 | 18.3% | 0.0% | returned-rate |
| no speed order (sent order) | 56.5% +/- 6.9 | 52.5% +/- 6.9 | 59.0% +/- 6.8 | 61.0% +/- 6.8 | 57.5% +/- 6.9 | 47.0% | 31.6% | 4.87 | 18.1% | 0.7% | broker |
| hidden-first restored (pass 2 bonus) | 50.0% +/- 6.9 | 48.5% +/- 6.9 | 58.0% +/- 6.8 | 56.5% +/- 6.9 | 53.0% +/- 6.9 | 47.5% | 29.6% | 4.83 | 18.0% | 0.8% | nothing |
| no sweep role (sweeps strike instead) | 49.5% +/- 6.9 | 54.5% +/- 6.9 | 50.5% +/- 6.9 | 50.5% +/- 6.9 | 49.5% +/- 6.9 | 52.5% | 30.8% | 4.80 | 18.6% | 0.4% | heir, returned-rate |
| no bolster role (bolsterers just hold) | 44.5% +/- 6.9 | 50.5% +/- 6.9 | 51.5% +/- 6.9 | 49.5% +/- 6.9 | 48.5% +/- 6.9 | 54.0% | 27.5% | 4.94 | 18.6% | 0.6% | nothing |
| no shield role (shielders just hold) | 51.5% +/- 6.9 | 46.0% +/- 6.9 | 53.0% +/- 6.9 | 53.5% +/- 6.9 | 51.0% +/- 6.9 | 54.0% | 26.2% | 5.57 | 18.5% | 0.6% | downs |
| no hurt-attacks-less (assumption 18) | 48.5% +/- 6.9 | 47.5% +/- 6.9 | 51.5% +/- 6.9 | 50.5% +/- 6.9 | 51.0% +/- 6.9 | 52.0% | 31.7% | 5.54 | 18.0% | 0.7% | downs |
| no bolster recovery (assumption 19) | 50.0% +/- 6.9 | 45.0% +/- 6.9 | 54.0% +/- 6.9 | 53.0% +/- 6.9 | 52.5% +/- 6.9 | 54.0% | 24.3% | 4.83 | 18.2% | 0.9% | nothing |
| no willful strain relief (assumption 17) | 54.0% +/- 6.9 | 46.0% +/- 6.9 | 54.0% +/- 6.9 | 53.5% +/- 6.9 | 55.5% +/- 6.9 | 53.0% | 28.1% | 4.70 | 18.9% | 0.8% | downs |
| no presence scale (every presence at charisma 50) | 47.0% +/- 6.9 | 45.0% +/- 6.9 | 51.0% +/- 6.9 | 49.0% +/- 6.9 | 45.5% +/- 6.9 | 43.0% | 33.0% | 4.74 | 18.3% | 0.8% | windsailor, downs |
| no instinct lanes (conduct only) | 51.0% +/- 6.9 | 47.5% +/- 6.9 | 54.5% +/- 6.9 | 53.0% +/- 6.9 | 51.0% +/- 6.9 | 49.0% | 31.9% | 4.75 | 18.0% | 0.9% | nothing |
| no swift move (assumption 20) | 46.0% +/- 6.9 | 44.5% +/- 6.9 | 46.5% +/- 6.9 | 46.0% +/- 6.9 | 51.5% +/- 6.9 | 48.5% | 28.7% | 4.61 | 18.3% | 0.9% | proctor, downs |
| no stake (assumption 22) | 52.5% +/- 6.9 | 51.0% +/- 6.9 | 54.5% +/- 6.9 | 53.5% +/- 6.9 | 57.5% +/- 6.9 | 51.5% | 27.5% | 4.89 | 17.9% | 1.0% | nothing |
| pass 3 hiding restored (first strike, costs two sends, three quarters power) | 50.3% +/- 7.7 | 43.5% +/- 7.5 | 52.7% +/- 8.0 | 52.0% +/- 7.9 | 57.2% +/- 7.7 | 54.1% | 26.3% | 3.45 | 17.7% | 0.4% | returned-rate, downs |
| catch-up send restored (trailingBonus 1) | 50.0% +/- 6.9 | 48.0% +/- 6.9 | 52.0% +/- 6.9 | 49.0% +/- 6.9 | 53.5% +/- 6.9 | 45.0% | 29.8% | 5.05 | 18.1% | 1.1% | downs |

**Reading.** no hidden sends: CARRYING WEIGHT - hidden-rate, downs moved beyond the interval.

**Reading.** no Loki line: CARRYING WEIGHT - returned-rate moved beyond the interval.

**Reading.** no speed order (sent order): CARRYING WEIGHT - broker moved beyond the interval.

**Reading.** hidden-first restored (pass 2 bonus): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no sweep role (sweeps strike instead): CARRYING WEIGHT - heir, returned-rate moved beyond the interval.

**Reading.** no bolster role (bolsterers just hold): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no shield role (shielders just hold): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no hurt-attacks-less (assumption 18): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no bolster recovery (assumption 19): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no willful strain relief (assumption 17): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no presence scale (every presence at charisma 50): CARRYING WEIGHT - windsailor, downs moved beyond the interval.

**Reading.** no instinct lanes (conduct only): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no swift move (assumption 20): CARRYING WEIGHT - proctor, downs moved beyond the interval.

**Reading.** no stake (assumption 22): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** pass 3 hiding restored (first strike, costs two sends, three quarters power): CARRYING WEIGHT - returned-rate, downs moved beyond the interval.

**Reading.** catch-up send restored (trailingBonus 1): CARRYING WEIGHT - downs moved beyond the interval.

## 5. Draft dominance

top 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| bioflim | 200 | 98.5% | 51.8% | 12.67 |  |
| voltish | 200 | 98.5% | 48.2% | 11.74 |  |
| luceras | 200 | 98.0% | 54.6% | 8.66 |  |
| foromeer | 200 | 97.0% | 49.0% | 10.19 |  |
| kosanos | 200 | 96.5% | 46.6% | 9.83 |  |
| venemist | 200 | 96.0% | 51.0% | 10.25 |  |
| frackworm | 200 | 95.0% | 44.7% | 10.47 |  |
| terragoyle | 200 | 94.0% | 48.4% | 12.20 |  |
| scalatto | 200 | 94.0% | 49.5% | 11.47 |  |
| sonalloy | 200 | 93.5% | 54.5% | 13.35 |  |

bottom 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| dromeus | 200 | 9.5% | 42.1% | 3.84 | dead |
| akinza | 200 | 44.0% | 47.7% | 5.49 |  |
| avilily | 200 | 52.0% | 42.3% | 4.97 |  |
| imprit | 200 | 54.5% | 48.6% | 3.65 |  |
| figzy | 200 | 57.5% | 50.4% | 6.91 |  |
| tizzie | 200 | 65.0% | 37.7% | 5.72 |  |
| vespersyn | 200 | 67.0% | 45.5% | 7.11 |  |
| neph | 200 | 70.0% | 43.6% | 10.06 |  |
| hypnopet | 200 | 71.0% | 52.8% | 6.94 |  |
| codazzo | 200 | 73.5% | 51.7% | 7.46 |  |

by primary element

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| chemical | 400 | 97.3% | 51.4% | 11.46 |  |
| electric | 400 | 95.8% | 48.0% | 11.80 |  |
| metal | 400 | 95.3% | 51.7% | 11.77 |  |
| light | 400 | 90.8% | 49.9% | 8.50 |  |
| sand | 800 | 90.1% | 51.2% | 9.42 |  |
| ghost | 400 | 87.3% | 50.7% | 6.21 |  |
| air | 400 | 84.0% | 50.0% | 9.36 |  |
| rock | 400 | 83.8% | 49.9% | 9.83 |  |
| water | 400 | 82.8% | 57.1% | 9.16 |  |
| dark | 400 | 78.0% | 47.8% | 8.50 |  |
| plant | 400 | 74.3% | 45.1% | 7.40 |  |
| psychic | 600 | 64.5% | 47.0% | 6.53 |  |
| ice | 200 | 44.0% | 47.7% | 5.49 |  |
| fire | 400 | 32.0% | 47.7% | 3.74 |  |

by role

| role | dealt | keep rate | keeper win rate | mean hold |
| --- | --- | --- | --- | --- |
| shield | 1082 | 84.9% +/- 2.1 | 47.0% +/- 3.2 | 11.24 |
| bolster | 953 | 67.7% +/- 3.0 | 49.8% +/- 3.9 | 10.24 |
| sweep | 2199 | 84.9% +/- 1.5 | 48.9% +/- 2.3 | 7.33 |
| strike | 1766 | 77.5% +/- 1.9 | 53.6% +/- 2.6 | 7.71 |

**Reading.** DOMINANT: drilltail are kept above eighty percent AND their keeper wins above sixty percent. That is a balance problem the first human will find in one session.

**Reading.** DEAD CONTENT: dromeus are kept under twenty percent of the times they are dealt. Never chosen is content nobody plays with.

**Reading.** 15 of 30 species sit outside the 30 to 90 percent keep band.

## 6. Per-attribute lanes

| attribute | q1 / q3 | top n | top quartile site win | bottom n | bottom quartile site win | gap (points) |
| --- | --- | --- | --- | --- | --- | --- |
| vitality | 39 / 66 | 1093 | 50.9% +/- 3.0 | 1076 | 53.0% +/- 3.0 | -2.1 |
| resilience | 32 / 71 | 1014 | 53.5% +/- 3.1 | 1077 | 51.3% +/- 3.0 | 2.1 |
| endurance | 51 / 71 | 1043 | 52.5% +/- 3.0 | 1071 | 53.0% +/- 3.0 | -0.5 |
| strength | 34 / 62 | 1132 | 53.3% +/- 2.9 | 1000 | 50.1% +/- 3.1 | 3.2 |
| intelligence | 30 / 56 | 1035 | 54.9% +/- 3.0 | 1296 | 52.4% +/- 2.7 | 2.5 |
| agility | 28 / 73 | 1054 | 49.9% +/- 3.0 | 1004 | 52.3% +/- 3.1 | -2.4 |
| reflex | 33 / 70 | 988 | 54.3% +/- 3.1 | 991 | 51.9% +/- 3.1 | 2.4 |
| willpower | 44 / 60 | 1028 | 55.4% +/- 3.0 | 1167 | 52.8% +/- 2.9 | 2.6 |
| charisma | 25 / 44 | 1020 | 51.1% +/- 3.1 | 1027 | 52.6% +/- 3.1 | -1.5 |
| instinct | 50 / 68 | 1056 | 55.2% +/- 3.0 | 996 | 51.4% +/- 3.1 | 3.8 |

gap in points, split per role (top quartile minus bottom quartile, within the role)

| attribute | overall | strikes | sweeps | presences (bolster + shield) |
| --- | --- | --- | --- | --- |
| vitality | -2.1 | 1.8 (n=306/323) | 1.7 (n=343/351) | 5.9 (n=394/388) |
| resilience | 2.1 | 3.3 (n=312/342) | 0.9 (n=343/392) | 3.4 (n=359/410) |
| endurance | -0.5 | 1.2 (n=306/347) | -1.8 (n=385/387) | 1.3 (n=385/352) |
| strength | 3.2 | 8.9 (n=307/326) | 2.2 (n=343/380) | 7.3 (n=400/377) |
| intelligence | 2.5 | 9.7 (n=326/314) | 0.4 (n=357/409) | -4.5 (n=353/385) |
| agility | -2.4 | -12.1 (n=320/306) | -2.9 (n=392/343) | -5.7 (n=369/439) |
| reflex | 2.4 | 1.1 (n=381/316) | -4.1 (n=345/343) | -3.7 (n=405/387) |
| willpower | 2.6 | 7.4 (n=323/297) | -2.9 (n=377/349) | 7.7 (n=442/444) |
| charisma | -1.5 | -12.6 (n=311/300) | 1.3 (n=341/348) | 6.9 (n=406/419) |
| instinct | 3.8 | 1.3 (n=324/326) | -3.7 (n=367/343) | -11.0 (n=385/363) |

**Reading.** Carrying weight: strength 3.2 points, instinct 3.8 points.

**Reading.** NO MEASURABLE LANE at 200 matches: vitality, resilience, endurance, intelligence, agility, reflex, willpower, charisma. The job Pass 2 gave each of these does not yet show in whether its world is won.

**Reading.** READS THE ROLE, NOT THE ATTRIBUTE: vitality. The overall lane and every per-role lane disagree in sign, so the overall number is the role composition and not the attribute's own job.

## 7. The stake

| setting | n | stakes/match | Provings staked | by the trailing side | staker wins staked world | staker wins unstaked worlds | only-trailing-staked match win |
| --- | --- | --- | --- | --- | --- | --- | --- |
| stake on | 200 | 0.32 | 29.5% +/- 6.3 | 93.7% +/- 6.0 | 58.1% +/- 12.3 | 51.6% +/- 8.9 | 39.6% +/- 13.2 |
| stake off | 200 | 0.00 | 0.0% +/- 0.0 | - | - | - | - |

match shape, stake on against stake off

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | downs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| stake on | 200 | 49.0% | 12.0% | 39.0% | 29.8% | 23.0% | 37.5% | 4.84 |
| stake off | 200 | 51.5% | 10.5% | 38.0% | 27.5% | 30.0% | 37.5% | 4.89 |

rival ladder, stake on against stake off

| rival | wins vs proctor (stake on) | wins vs proctor (stake off) |
| --- | --- | --- |
| envoy | 51.0% +/- 6.9 | 52.5% +/- 6.9 |
| heir | 46.5% +/- 6.9 | 51.0% +/- 6.9 |
| proctor | 55.0% +/- 6.9 | 54.5% +/- 6.9 |
| broker | 52.5% +/- 6.9 | 53.5% +/- 6.9 |
| windsailor | 52.5% +/- 6.9 | 57.5% +/- 6.9 |

**Reading.** The stake is taken in 29.5% of Provings, inside the 20 to 60 percent gauge, 93.7% of them by the side behind on worlds.

**Reading.** The staker wins its staked world 58.1% of the time against 51.6% on the same round's unstaked worlds, a gap of 6.4 points inside the +/- 15.1 interval: the stake is variance-neutral, which is what a chosen risk should be.

**Reading.** Comeback rate 29.8% with the stake against 27.5% without; decided after round 1 49.0% against 51.5% (reported, not a gauge since pass 2 dropped it).

**Reading.** In Provings where only the trailing side staked, that side won 39.6% (95% CI 26.5-52.8%, n=53).

## 8. The read

proctor mirror 55.0% +/- 6.9

| matchup | side A wins |
| --- | --- |
| proctor vs no anticipation (pass 3 bot: hidden sends read, coming sends not) | 74.5% +/- 6.0 |
| proctor vs blind (ignores hidden and coming sends alike) | 87.0% +/- 4.7 |
| sharp read (sharpness 1, a guess at WHERE) vs proctor (even spread) | 43.5% +/- 6.9 |

**Reading.** The read carries weight: the proctor beats the bot without anticipation 74.5% against a mirror of 55.0%.

