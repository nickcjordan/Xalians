# Reclamation: the play enhancement passes

Status: opened 2026-09-05 on Nick's brief ("full reins to continue enhancing this game for better UX, more polish, deeper gameplay; research what makes up a game and work through enhancements"). This document holds the research digest, the audit of the game as it stood after the one-language pass (PR #95), the roadmap of passes, and the decisions taken in each. It sits beside `reclamation-design.md`, which stays the rulebook; anything here that changes a rule is also written into that document when it ships.

## Context

Reclamation is a two-handler deployment game over the Court's frame: three worlds a round, three rounds, a roster of twelve of which ten may be sent, simultaneous secret orders, deterministic resolution, and the Court awarding each world to the side that still holds more of it. After the one-language pass the table reads as one console, the bench and the bulb meter answer "which creature, where, how firmly", and the engine, bot and simulator are stable at 426 green tests. What has not had a pass is the play itself: the decisions the game asks for, the rival, the arc of a match, what the player takes away from one, and the small frictions that make a second Proving less likely than the first.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | The rival becomes five named handlers with distinct deployment styles and a measured difficulty, chosen on the intro screen; the Court proctor stays the default and is the current bot unchanged | 80% (Meier: decisions should be situational and let the player express a style; a single opponent whose habits are learned in three matches is the first thing that goes flat in a bot-first game; the fiction already names these handlers) | `reclamation-design.md` "Fiction: the Proving"; `expeditionBot.js` tunables |
| 2 | Difficulty labels are measured by the simulator (each rival against the proctor and against the random policy), never asserted | 90% (the simulator exists for exactly this and every earlier number in the rulebook came from it) | `devtools/expeditionSimulator.js` |
| 3 | A match is saved to the browser after every engine step and can be resumed from the intro; a history of results per rival is kept locally; no server, no account | 85% (Nick's principle five, hobby-scale bot-first no server; a reload today loses the Proving with no warning, which is the harshest friction on the table) | `reclamationPage.js` holds the match in component state only |
| 4 | The verdict becomes a match report: every world of the Proving with who held it and by how much, the creatures that held or were routed, sends spent, and one line for the world that decided it | 85% (Meier: the game must acknowledge the player's choices or the silence reads as nothing having mattered; the Proving fiction says the platform history records what the frame said of each creature) | `reclamationMatch.renderVerdictPanel` is one sentence and a button |
| 5 | Resolution playback and the rival's thinking beat can be skipped with a visible control and the space bar; durations stay as they are | 90% (autobattler lesson: the player controls the pace of watching; the engine already has `skipPlayback` with no button on it) | `reclamationMatch.skipPlayback` |
| 6 | A rival creature sent hidden appears on the table once orders reveal it, during playback and at the Court's ruling | 95% (bug: the frozen pre-resolution view filtered the hidden entry, so a world "went to the rival, 1.6 against 0" while its tray said no one stood there) | Headless run seed 7, 2026-09-05, judge screenshot |
| 7 | The words expedition and "new expedition" leave the table; the match is a Proving throughout | 95% (the fiction changed on 2026-09-04 and the copy did not follow everywhere) | `reclamationMatch.js` turnText, verdict button |
| 8 | Decrees stay parked; chance stays out; the roster stays twelve of which ten are sent; the engine's formulas are not retuned in these passes | 90% (Nick's rulings; new evidence reopens a ruling, taste does not) | `reclamation-design.md` assumptions 4, 9, 12 |
| 9 | Later passes, in order: the threat read during Orders (what the visible enemy could do to each of your creatures), initiative on the bench, then a pre-match draft (keep twelve of eighteen, the rival drafting too) | 70% (orders change the leader at only 16 percent of sites, so the Orders decision is the weakest on the table and information is the cheapest way to make it matter; the draft is the expression Pokémon Duel's team building gave and this game lacks) | `reclamation-design.md` "First numbers" item 5 |

## Research digest

What was read and what it says for this table. Sources are listed at the foot.

- **Games are a series of interesting decisions** (Sid Meier). A decision is interesting when no option is clearly best, the options are not equally attractive, and the player can make it informed. Decisions should be situational (interact with the board as it stands), let the player express a style, and persist (an early choice should matter later). The game must acknowledge every decision; silence after a choice reads as the choice not mattering. Err toward giving the player too much information. Cut roughly a third of the decisions that turn out not to be interesting.
- **Area majority games** live or die on fluidity: too fluid and everyone attacks the leader; too static and the leader runs away. El Grande's answer is scarce, committed pieces; Blood Rage's is that losing a fight can pay (the Loki line), so a lost region is bait rather than dead weight. Reclamation's committed roster is the El Grande answer already; it has no Loki line and the trailing seat moving first is its only catch-up.
- **Gwent**: the pass is the heart. Rationing a fixed hand across rounds, passing to bait overspend, and the disloyal bluff all come from resources that never refresh; the first player gets a compensation; luck is kept out so skill reads. Reclamation has the pass, the fixed roster, the fall-back as the starter's compensation, and no dice. What it lacks is the faction identity Gwent uses for replayability: every match is the same rival.
- **Simultaneous secret orders** produce double-think only when each side can read what the other could do. Yomi in fighting games works because move lists are public. The acts and magnitudes here are printed on the dossier, but the table does not show, at a glance, which of your creatures the visible enemy could stagger or rout.
- **Autobattlers** (Teamfight Tactics, Super Auto Pets): the only input is the planning stage, so the planning stage must be dense with information (mouse-over everything, simplified stats), and watching must be at the player's pace, skippable, with no dead time.
- **Catch-up mechanics** keep the trailing player in the match and the leader nervous; the runaway leader is the failure. Reclamation's trailing-seat rule and the third-frame closer are its mechanisms; the simulator's comeback rate (23 percent after a lost first round) is the number to watch.
- **Game feel**: oil (responsiveness, readability) before juice (exaggeration). Every action gets feedback the player can read. The table's told-twice principle is the oil; juice is deliberately limited by the design system (panels do not glow).
- **Single-player against a machine**: several opponents with distinct styles and a measured ladder, a post-match summary, and a record over time are what keep a bot-first game replayed; content updates come after.
- **Pokémon Duel** (Nick's touchstone): the long-term hook was team building and the six-figure lineup; the risk-reward of the spin was loved when the player chose the engagement and hated when it undercut the board. Reclamation keeps chance out and has no team building yet.

## Audit of the table against the digest

| Job | As it stood | Reading |
|---|---|---|
| Deploy decision (which creature, which world) | Lamps per plinth, suggested move marked, ghost preview on hover, pass with sends-left pips | Interesting: situational and informed. The stack-or-spread bet is real and the simulator says roster strength barely predicts the winner |
| Orders decision | By nature with a Go button in simple mode; full panel in advanced | Weak: changes the leader at 16 percent of sites; the player cannot see the threat, only their own plan |
| Pass and roster economy | Permanent pass, ten of twelve, next frame shown | Sound; the informed pass is the Gwent lesson done right |
| The rival | One bot, one style, a small randomizer | Flat after a few matches; no expression, no ladder |
| Match arc | Three frames, trailing seat first, the closer | Sound; comeback rate 23 percent |
| Acknowledgment | Callouts, ticker, log; verdict is one sentence | The verdict is where the silence is |
| Pace of watching | Resolution steps at 700 ms, rival beat 1900 ms, no skip control | Dead time for a returning player |
| Persistence | None; a reload loses the match | Harshest friction present |
| Expression | Roster dealt by seed | None yet; the draft is the answer |
| Fiction on the table | Proving named in the intro; "expedition" survives in the verdict, turn text and log | Inconsistent |

## Pass 1: the rivals (this pass)

1. **Five rival handlers.** Each is a weight set over the bot's tunables plus a bluffing habit and a randomizer window, exported from `expeditionBot.js` as `RIVALS`, with fiction (name, faction, home world, one sentence of style). The Court proctor is the default and the bot as it was. The simulator takes `--rivalA` and `--rivalB` and the difficulty label of each rival is what the simulator measures against the proctor. The intro screen offers the rivals as a row of plates; the choice is remembered per browser.
2. **Save and resume.** The match, the seed, the rival, the log and the squad order are saved after every engine step; the intro offers "Resume the Proving" when one is saved; finishing or starting a new one clears it. A history of results (rival, worlds, date, seed) is kept and the intro shows the record against each rival.
3. **The match report.** At the Charter, a report replaces the sentence: each world of the Proving with its round, who holds it and the holds, the creatures that held it or were routed there, sends spent by each side, and the world that decided it. The engine's judge event gains the list of creatures standing at each site when the Court read it, so the report is derived from the match alone.
4. **Skip.** A control in the status strip during Resolve and during the rival's beat, and the space bar, jump to the ruling or the move.
5. **The hidden reveal bug** (assumption 6) and **the Proving wording** (assumption 7).

### Pass 1 results (2026-09-05)

The rivals, measured by the simulator as side A against the proctor as side B, 200 matches, seed 11 (the 95 percent interval on each win rate is about plus or minus 7 points), and against the uniformly random policy:

| Rival | Wins against the proctor | Against random | Sends per match | Hidden send rate | Mean pass turn, round 1 |
|---|---|---|---|---|---|
| Zolto envoy | 37.5% | 91.5% | 9.15 | 29.0% | 7.4 |
| Heir of the Thousand Families | 39.0% | 93.5% | 9.5 | 29.2% | 9.4 |
| Syndicate broker | 44.5% | 93.5% | 9.49 | 28.7% | 8.8 |
| Court proctor | 48.0% | 95.0% | 9.77 | 28.7% | 9.4 |
| Windsailor crew | 54.5% | 93.0% | 9.85 | 27.3% | 10.3 |

So the ladder on the intro runs envoy, heir, broker, proctor, windsailor, weakest first, and each plate prints its mark. The styles are present in the numbers (the envoy passes earliest and sends least; the windsailor passes latest and sends most) and the order is the opposite of the fiction's guess: the handler who rations loses Provings, the one who contests everything wins them. That is itself a reading of the rules worth keeping in view: at these weights, spending is rewarded and saving is not, so the roster economy's tension may be weaker than the design intends (a lever, not a change made here).

**Friction found (reported, not worked around).** The bot's hide rule (`stealthy and |margin| < hold`) is the flip condition restated, and at the real tunables a "secure" send with a margin already above the sender's hold never clears the send threshold; so in practice every stealthy creature that is sent at all is sent hidden, and the broker's hide bias has almost nothing to act on (hidden send rates sit at 27 to 29 percent for all five). Smallest fix: decouple the hide rule from the flip condition (for example, hide when the send would flip the world or when the rival still has sends to answer with, and send openly when securing), or let the secure value stand against the hold cost. Nick decides; the current rule is ratified in the rulebook's bot section.

## Passes to follow

- **Pass 2, the threat read.** During Orders each of your figures carries the worst the visible enemy could do to it this round (stagger or rout, by which creature and act), and the plan lines say it; initiative shows on the bench during Deploy (ledger F10). Ledger rows F7 (crowded worlds shrink figures before scrolling) and F8 (the status strip carries six jobs) are taken in the same pass.
- **Pass 3, the draft.** Before the Proving the frame shows its first three worlds and eighteen generated creatures; the handler keeps twelve; the rival drafts by its own style. The roster economy (twelve brought, ten sent) is unchanged.
- **Open, not planned:** a Loki line (something a lost world pays), sound synthesized in code and off by default, a guided first Proving.

## Sources

- Sid Meier, GDC 2012, "Interesting decisions": https://www.gamedeveloper.com/design/gdc-2012-sid-meier-on-how-to-see-games-as-sets-of-interesting-decisions
- Nerdlab Games, "Gwent: five exceptional design choices": https://nerdlab-games.com/054-gwent-5-exceptional-design-choices-and-what-we-can-learn-from-them/
- Mannan Soni, "Game design lessons from Gwent": https://medium.com/@wolfzzyy/game-design-lessons-from-gwent-1950b6ab3417
- Exeunt Press, "Losing on purpose with the Loki strategy" (Blood Rage): https://www.skeletoncodemachine.com/p/losing-on-purpose-with-the-loki-strategy
- Chris Farrell on El Grande and area control: https://chrisfarrell317.substack.com/p/silos-ego-orbit
- The Thoughtful Gamer, "Catch-up mechanisms": https://thethoughtfulgamer.com/2017/03/28/catch-up-mechanisms/
- BoardGameGeek, "The importance of comeback mechanics": https://boardgamegeek.com/thread/2634969/thinking-critically-the-importance-of-comeback-mec
- Sirlin, "Designing Yomi": https://www.sirlin.net/articles/designing-yomi
- Wikipedia, "Simultaneous action selection": https://en.wikipedia.org/wiki/Simultaneous_action_selection
- CBR on Super Auto Pets and Teamfight Tactics: https://www.cbr.com/super-auto-pets-autobattler-tft-hearthstone-battlegrounds/
- Hunicke, LeBlanc, Zubek, the MDA framework: https://yukaichou.com/gamification-analysis/mda-framework-hunicke-leblanc-zubek-mechanics-dynamics-aesthetics/
- Egmatic, "Game feel and juice": https://egmatic.com/blog/how-to-make-your-game-feel-good
- Nintendo Life, Pokémon Duel review: https://www.nintendolife.com/reviews/mobile/pokemon_duel
- Game Developer, "Replayability, part 2: game mechanics": https://www.gamedeveloper.com/design/replayability-part-2-game-mechanics
