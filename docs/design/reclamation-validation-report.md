# Reclamation decision-quality validation

Run of expeditionValidation.js, 200 matches per configuration, seed 7, 2026-09-19. Sections: regret, spread, decided, ablation, draft, lanes, stake, read. Every rate carries its 95 percent binomial interval half width, so a difference smaller than the stated margin is not resolved at this batch size. Measured against docs/design/game-validation-principles.md section 1.

## 1. Naive-policy regret

| policy | wins vs proctor | wins vs random | sends/match | flag |
| --- | --- | --- | --- | --- |
| proctor (reference) | 50.0% +/- 6.9 | 94.5% +/- 3.2 | 9.2 |  |
| greedy | 0.0% +/- 0.0 | 21.0% +/- 5.6 | 10.0 |  |
| random | 6.5% +/- 3.4 | 48.5% +/- 6.9 | 9.2 |  |
| passEarly | 25.5% +/- 6.0 | 86.5% +/- 4.7 | 7.3 |  |
| alwaysStack | 0.0% +/- 0.0 | 0.5% +/- 1.0 | 10.0 |  |
| neverContest | 0.0% +/- 0.0 | 19.5% +/- 5.5 | 0.0 |  |
| alwaysPresenceFirst | 24.0% +/- 5.9 | 82.0% +/- 5.3 | 8.5 |  |

**Reading.** No naive policy comes within five points of the proctor and none beats it. The deploy decisions are carrying their weight at this batch size.

## 2. Option spread

| round | decisions | 1 | 2 | 3 | 4 | 5+ | mean near-best | one dominant | chose pass | mean gap 1st-2nd |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| round 1 | 782 | 214 | 164 | 132 | 78 | 194 | 3.36 | 27.4% | 25.6% | 2.02 |
| round 2 | 814 | 278 | 223 | 123 | 71 | 119 | 2.62 | 34.2% | 24.6% | 1.52 |
| round 3 | 372 | 148 | 100 | 58 | 33 | 33 | 2.29 | 39.8% | 4.0% | 2.14 |
| overall | 1968 | 640 | 487 | 313 | 182 | 346 | 2.85 | 32.5% | 21.1% | 1.83 |

**Reading.** Deploy decisions offer 2.9 near-best options on average, dominant on 32.5% of turns. That is the "a few close options" band the principles doc asks for.

## 3. Point of no return

proctor mirror, 200 matches
- decided after round 1: 52.0% (95% CI 45.1-58.9%, n=200)
- decided after round 2: 7.0% (95% CI 3.5-10.5%, n=200)
- decided only at the end: 41.0% (95% CI 34.2-47.8%, n=200)
- locked (five worlds) after round 1 / 2 / 3 / never: 0 / 49 / 144 / 7
- comeback rate (trailed after round 1, won): 24.6% (95% CI 18.6-30.7%, n=195)
- tied after round 2: 23.5% (95% CI 17.6-29.4%, n=200)
- third round changed the leader: 37.5% (95% CI 30.8-44.2%, n=200)
- downs per match: 4.20
- resolution changed the leader at 26.6% (95% CI 24.4-28.7%, n=1618) of contested worlds

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | downs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| proctor mirror | 200 | 52.0% | 7.0% | 41.0% | 24.6% | 23.5% | 37.5% | 4.20 |
| envoy vs proctor | 200 | 40.0% | 11.0% | 49.0% | 34.7% | 30.0% | 46.5% | 4.17 |
| heir vs proctor | 200 | 50.0% | 7.5% | 42.5% | 26.4% | 28.5% | 40.5% | 4.33 |
| proctor vs proctor | 200 | 52.0% | 7.0% | 41.0% | 24.6% | 23.5% | 37.5% | 4.20 |
| broker vs proctor | 200 | 53.0% | 7.5% | 39.5% | 24.5% | 21.5% | 35.0% | 4.11 |
| windsailor vs proctor | 200 | 45.5% | 12.5% | 42.0% | 30.3% | 21.0% | 36.5% | 4.19 |

**Reading.** DECIDED EARLY: 52.0% of proctor mirrors are decided after round 1, above the fifty percent bar. Rounds two and three are largely dead time and the catch-up lever needs to move.

**Reading.** Comeback rate 24.6%, above the one-in-five floor; the third round changes the leader in 37.5% of matches.

## 4. Ablation

| ablation | envoy | heir | proctor | broker | windsailor | decided r1 | comeback | downs/match | hidden rate | returned rate | moved? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline (all rules on) | 52.0% +/- 6.9 | 57.0% +/- 6.9 | 50.0% +/- 6.9 | 51.5% +/- 6.9 | 45.5% +/- 6.9 | 52.0% | 24.6% | 4.20 | 19.1% | 0.5% | (baseline) |
| no hidden sends | 50.0% +/- 6.9 | 50.5% +/- 6.9 | 53.5% +/- 6.9 | 51.0% +/- 6.9 | 49.5% +/- 6.9 | 47.0% | 25.5% | 4.38 | 0.0% | 0.2% | hidden-rate, returned-rate, downs |
| no Loki line | 52.5% +/- 6.9 | 56.0% +/- 6.9 | 50.0% +/- 6.9 | 51.0% +/- 6.9 | 50.0% +/- 6.9 | 54.0% | 25.1% | 4.21 | 19.2% | 0.0% | returned-rate |
| no speed order (sent order) | 58.0% +/- 6.8 | 59.0% +/- 6.8 | 57.0% +/- 6.9 | 59.0% +/- 6.8 | 50.5% +/- 6.9 | 52.0% | 26.9% | 4.22 | 18.8% | 0.4% | proctor, broker |
| hidden-first restored (pass 2 bonus) | 54.5% +/- 6.9 | 57.0% +/- 6.9 | 51.0% +/- 6.9 | 51.0% +/- 6.9 | 47.5% +/- 6.9 | 54.0% | 26.7% | 4.20 | 19.1% | 0.5% | nothing |
| no sweep role (sweeps strike instead) | 52.0% +/- 6.9 | 46.5% +/- 6.9 | 51.5% +/- 6.9 | 54.0% +/- 6.9 | 46.0% +/- 6.9 | 52.0% | 26.7% | 4.21 | 19.0% | 0.3% | heir |
| no bolster role (bolsterers just hold) | 49.5% +/- 6.9 | 46.0% +/- 6.9 | 47.0% +/- 6.9 | 47.0% +/- 6.9 | 47.0% +/- 6.9 | 49.5% | 29.3% | 4.50 | 18.7% | 0.4% | heir, downs |
| no shield role (shielders just hold) | 55.0% +/- 6.9 | 48.5% +/- 6.9 | 53.0% +/- 6.9 | 49.5% +/- 6.9 | 51.0% +/- 6.9 | 57.5% | 28.7% | 4.80 | 19.1% | 0.4% | heir, downs |
| no hurt-attacks-less (assumption 18) | 53.0% +/- 6.9 | 55.0% +/- 6.9 | 56.0% +/- 6.9 | 55.5% +/- 6.9 | 48.0% +/- 6.9 | 52.5% | 24.6% | 4.65 | 19.0% | 0.4% | downs |
| no bolster recovery (assumption 19) | 50.0% +/- 6.9 | 56.5% +/- 6.9 | 53.0% +/- 6.9 | 54.0% +/- 6.9 | 46.5% +/- 6.9 | 53.5% | 24.0% | 4.18 | 19.0% | 0.4% | nothing |
| no willful strain relief (assumption 17) | 48.5% +/- 6.9 | 53.5% +/- 6.9 | 56.0% +/- 6.9 | 54.0% +/- 6.9 | 53.5% +/- 6.9 | 51.0% | 27.4% | 4.24 | 19.3% | 0.5% | windsailor |
| no presence scale (every presence at charisma 50) | 54.5% +/- 6.9 | 48.5% +/- 6.9 | 54.5% +/- 6.9 | 50.5% +/- 6.9 | 49.0% +/- 6.9 | 46.0% | 32.1% | 4.24 | 18.9% | 0.4% | heir, comeback |
| no instinct lanes (conduct only) | 53.0% +/- 6.9 | 53.0% +/- 6.9 | 49.0% +/- 6.9 | 52.5% +/- 6.9 | 44.5% +/- 6.9 | 53.5% | 24.7% | 4.21 | 19.1% | 0.5% | nothing |
| no swift move (assumption 20) | 53.0% +/- 6.9 | 44.5% +/- 6.9 | 49.5% +/- 6.9 | 50.5% +/- 6.9 | 57.0% +/- 6.9 | 45.5% | 32.6% | 4.34 | 18.5% | 0.3% | heir, windsailor, comeback, downs |
| no stake (assumption 22) | 55.5% +/- 6.9 | 56.5% +/- 6.9 | 51.0% +/- 6.9 | 54.0% +/- 6.9 | 49.0% +/- 6.9 | 54.0% | 23.5% | 4.31 | 18.7% | 0.4% | downs |
| pass 3 hiding restored (first strike, costs two sends, three quarters power) | 54.4% +/- 7.8 | 42.6% +/- 8.0 | 47.3% +/- 8.0 | 46.7% +/- 7.9 | 44.2% +/- 7.6 | 52.7% | 25.0% | 3.02 | 18.9% | 0.1% | heir, returned-rate, downs |
| catch-up send restored (trailingBonus 1) | 52.5% +/- 6.9 | 52.5% +/- 6.9 | 48.5% +/- 6.9 | 51.0% +/- 6.9 | 44.5% +/- 6.9 | 44.0% | 26.7% | 4.34 | 18.8% | 0.5% | decided-r1, downs |

**Reading.** no hidden sends: CARRYING WEIGHT - hidden-rate, returned-rate, downs moved beyond the interval.

**Reading.** no Loki line: CARRYING WEIGHT - returned-rate moved beyond the interval.

**Reading.** no speed order (sent order): CARRYING WEIGHT - proctor, broker moved beyond the interval.

**Reading.** hidden-first restored (pass 2 bonus): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no sweep role (sweeps strike instead): CARRYING WEIGHT - heir moved beyond the interval.

**Reading.** no bolster role (bolsterers just hold): CARRYING WEIGHT - heir, downs moved beyond the interval.

**Reading.** no shield role (shielders just hold): CARRYING WEIGHT - heir, downs moved beyond the interval.

**Reading.** no hurt-attacks-less (assumption 18): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** no bolster recovery (assumption 19): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no willful strain relief (assumption 17): CARRYING WEIGHT - windsailor moved beyond the interval.

**Reading.** no presence scale (every presence at charisma 50): CARRYING WEIGHT - heir, comeback moved beyond the interval.

**Reading.** no instinct lanes (conduct only): NO MEASURABLE WEIGHT at 200 matches. Nothing moved beyond the interval; the rule is cost in the rulebook without a measured effect.

**Reading.** no swift move (assumption 20): CARRYING WEIGHT - heir, windsailor, comeback, downs moved beyond the interval.

**Reading.** no stake (assumption 22): CARRYING WEIGHT - downs moved beyond the interval.

**Reading.** pass 3 hiding restored (first strike, costs two sends, three quarters power): CARRYING WEIGHT - heir, returned-rate, downs moved beyond the interval.

**Reading.** catch-up send restored (trailingBonus 1): CARRYING WEIGHT - decided-r1, downs moved beyond the interval.

## 5. Draft dominance

top 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| voltish | 200 | 99.5% | 47.2% | 11.74 |  |
| luceras | 200 | 99.0% | 55.6% | 8.66 |  |
| bioflim | 200 | 99.0% | 46.5% | 12.67 |  |
| venemist | 200 | 97.5% | 43.6% | 10.25 |  |
| terragoyle | 200 | 97.0% | 42.8% | 12.20 |  |
| foromeer | 200 | 97.0% | 53.1% | 10.19 |  |
| frackworm | 200 | 96.5% | 44.0% | 10.47 |  |
| scalatto | 200 | 96.0% | 44.8% | 11.47 |  |
| kosanos | 200 | 96.0% | 45.8% | 9.83 |  |
| shuntara | 200 | 95.0% | 54.7% | 11.85 |  |

bottom 10 species by keep rate

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| dromeus | 200 | 3.0% | 50.0% | 3.84 | dead |
| akinza | 200 | 40.5% | 55.6% | 5.49 |  |
| chromocat | 200 | 54.0% | 52.8% | 4.92 |  |
| avilily | 200 | 56.0% | 51.8% | 4.97 |  |
| figzy | 200 | 59.0% | 60.2% | 6.91 |  |
| vespersyn | 200 | 66.5% | 48.1% | 7.11 |  |
| imprit | 200 | 68.0% | 53.7% | 3.65 |  |
| hypnopet | 200 | 72.0% | 47.2% | 6.94 |  |
| codazzo | 200 | 76.5% | 49.7% | 7.46 |  |
| neph | 200 | 78.0% | 47.4% | 10.06 |  |

by primary element

| key | dealt | keep rate | keeper win rate | mean hold | flag |
| --- | --- | --- | --- | --- | --- |
| chemical | 400 | 98.3% | 45.0% | 11.46 |  |
| electric | 400 | 97.3% | 50.9% | 11.80 |  |
| metal | 400 | 96.0% | 50.8% | 11.77 |  |
| sand | 800 | 90.4% | 50.1% | 9.42 |  |
| air | 400 | 88.5% | 52.0% | 9.36 |  |
| rock | 400 | 86.8% | 45.8% | 9.83 |  |
| water | 400 | 84.8% | 51.9% | 9.16 |  |
| ghost | 400 | 80.5% | 50.3% | 6.21 |  |
| dark | 400 | 77.0% | 51.6% | 8.50 |  |
| plant | 400 | 76.0% | 48.0% | 7.40 |  |
| light | 400 | 74.0% | 51.4% | 8.50 |  |
| psychic | 600 | 69.7% | 50.0% | 6.53 |  |
| ice | 200 | 40.5% | 55.6% | 5.49 |  |
| fire | 400 | 35.5% | 53.5% | 3.74 |  |

by role

| role | dealt | keep rate | keeper win rate | mean hold |
| --- | --- | --- | --- | --- |
| shield | 1082 | 88.6% +/- 1.9 | 45.6% +/- 3.2 | 11.24 |
| bolster | 953 | 70.5% +/- 2.9 | 47.5% +/- 3.8 | 10.24 |
| strike | 2558 | 74.9% +/- 1.7 | 52.7% +/- 2.2 | 7.54 |
| sweep | 1407 | 89.1% +/- 1.6 | 50.6% +/- 2.8 | 7.42 |

**Reading.** DEAD CONTENT: dromeus are kept under twenty percent of the times they are dealt. Never chosen is content nobody plays with.

**Reading.** 14 of 30 species sit outside the 30 to 90 percent keep band.

## 6. Per-attribute lanes

| attribute | q1 / q3 | top n | top quartile site win | bottom n | bottom quartile site win | gap (points) |
| --- | --- | --- | --- | --- | --- | --- |
| vitality | 38 / 66 | 986 | 51.4% +/- 3.1 | 908 | 55.3% +/- 3.2 | -3.9 |
| resilience | 32 / 70 | 1014 | 54.1% +/- 3.1 | 1003 | 54.2% +/- 3.1 | -0.1 |
| endurance | 50 / 71 | 944 | 52.5% +/- 3.2 | 941 | 54.6% +/- 3.2 | -2.1 |
| strength | 34 / 62 | 1031 | 54.8% +/- 3.0 | 950 | 51.7% +/- 3.2 | 3.1 |
| intelligence | 30 / 57 | 909 | 54.2% +/- 3.2 | 1193 | 53.1% +/- 2.8 | 1.2 |
| agility | 30 / 73 | 993 | 53.4% +/- 3.1 | 940 | 51.9% +/- 3.2 | 1.5 |
| reflex | 34 / 70 | 933 | 54.7% +/- 3.2 | 1006 | 51.8% +/- 3.1 | 2.9 |
| willpower | 43 / 60 | 941 | 53.5% +/- 3.2 | 938 | 52.1% +/- 3.2 | 1.3 |
| charisma | 25 / 44 | 964 | 51.0% +/- 3.2 | 925 | 52.2% +/- 3.2 | -1.2 |
| instinct | 51 / 68 | 983 | 56.5% +/- 3.1 | 977 | 52.2% +/- 3.1 | 4.3 |

gap in points, split per role (top quartile minus bottom quartile, within the role)

| attribute | overall | strikes | sweeps | presences (bolster + shield) |
| --- | --- | --- | --- | --- |
| vitality | -3.9 | 3.7 (n=407/404) | -3.9 (n=209/254) | 10.5 (n=356/357) |
| resilience | -0.1 | 2.9 (n=413/441) | -12.6 (n=209/194) | 2.4 (n=331/377) |
| endurance | -2.1 | 3.9 (n=436/459) | -1.1 (n=209/246) | 1.1 (n=344/340) |
| strength | 3.1 | 11.3 (n=420/449) | -11.4 (n=209/211) | 7.0 (n=371/349) |
| intelligence | 1.2 | 1.7 (n=480/467) | 8.5 (n=207/196) | -1.8 (n=338/364) |
| agility | 1.5 | -12.2 (n=438/406) | 7.4 (n=203/209) | -10.6 (n=349/402) |
| reflex | 2.9 | -4.1 (n=419/424) | -0.4 (n=255/194) | -3.0 (n=379/360) |
| willpower | 1.3 | 1.3 (n=429/400) | -3.3 (n=198/214) | 5.9 (n=413/412) |
| charisma | -1.2 | -8.2 (n=414/419) | 5.3 (n=215/210) | 0.9 (n=326/381) |
| instinct | 4.3 | -1.5 (n=476/440) | 3.4 (n=211/215) | -7.3 (n=357/400) |

**Reading.** Carrying weight: vitality -3.9 points, strength 3.1 points, instinct 4.3 points.

**Reading.** NO MEASURABLE LANE at 200 matches: resilience, endurance, intelligence, agility, reflex, willpower, charisma. The job Pass 2 gave each of these does not yet show in whether its world is won.

**Reading.** READS THE ROLE, NOT THE ATTRIBUTE: reflex. The overall lane and every per-role lane disagree in sign, so the overall number is the role composition and not the attribute's own job.

## 7. The stake

| setting | n | stakes/match | Provings staked | by the trailing side | staker wins staked world | staker wins unstaked worlds | only-trailing-staked match win |
| --- | --- | --- | --- | --- | --- | --- | --- |
| stake on | 200 | 0.33 | 31.5% +/- 6.4 | 90.8% +/- 7.0 | 55.4% +/- 12.1 | 50.0% +/- 8.7 | 32.1% +/- 12.2 |
| stake off | 200 | 0.00 | 0.0% +/- 0.0 | - | - | - | - |

match shape, stake on against stake off

| matchup | n | decided r1 | decided r2 | only at end | comeback | tied after r2 | r3 changed leader | downs/match |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| stake on | 200 | 52.0% | 7.0% | 41.0% | 24.6% | 23.5% | 37.5% | 4.20 |
| stake off | 200 | 54.0% | 6.0% | 40.0% | 23.5% | 31.0% | 39.0% | 4.31 |

rival ladder, stake on against stake off

| rival | wins vs proctor (stake on) | wins vs proctor (stake off) |
| --- | --- | --- |
| envoy | 52.0% +/- 6.9 | 55.5% +/- 6.9 |
| heir | 57.0% +/- 6.9 | 56.5% +/- 6.9 |
| proctor | 50.0% +/- 6.9 | 51.0% +/- 6.9 |
| broker | 51.5% +/- 6.9 | 54.0% +/- 6.9 |
| windsailor | 45.5% +/- 6.9 | 49.0% +/- 6.9 |

**Reading.** The stake is taken in 31.5% of Provings, inside the 20 to 60 percent gauge, 90.8% of them by the side behind on worlds.

**Reading.** The staker wins its staked world 55.4% of the time against 50.0% on the same round's unstaked worlds, so the stake is picking worlds it can hold.

**Reading.** Comeback rate 24.6% with the stake against 23.5% without; decided after round 1 52.0% against 54.0% (reported, not a gauge since pass 2 dropped it).

**Reading.** In Provings where only the trailing side staked, that side won 32.1% (95% CI 19.9-44.4%, n=56).

## 8. The read

proctor mirror 50.0% +/- 6.9

| matchup | side A wins |
| --- | --- |
| proctor vs no anticipation (pass 3 bot: hidden sends read, coming sends not) | 72.0% +/- 6.2 |
| proctor vs blind (ignores hidden and coming sends alike) | 81.5% +/- 5.4 |
| sharp read (sharpness 1, a guess at WHERE) vs proctor (even spread) | 48.5% +/- 6.9 |

**Reading.** The read carries weight: the proctor beats the bot without anticipation 72.0% against a mirror of 50.0%.

