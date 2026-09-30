# Powerworks UX pass 2: the whole screen, the whole run

## Context

Nick, 2026-09-29: a UX pass comes before any enemy-intent layer. The flow pass (PR #753, [powerworks-turn-screen.md](powerworks-turn-screen.md) "UX pass") answered four questions about turn flow: whose turn, is it mine, what just happened, what happens next. It judged turn cycles only. This pass judges everything a first-time player meets, from the first screen to the end of a run, and the visual quality of each part. It runs on the build that carries the numbers pass ([powerworks-pillars.md](powerworks-pillars.md) "Numbers pass"), since that pass changes every number on the screen.

Nick does not list faults, so the pass finds them itself: cold readers and an independent critic on captured sequences, not the builder's own eye.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | Scope is the whole journey, not only the turn cycle: arrival, first look at the stage, reading a companion's options, choosing, watching enemy turns, encounter end and the next chamber, camp and revive, defeat, victory, retreat, playback tools, the record panel, phone landscape. | 80%, Nick's earlier rejection named intuitiveness broadly ("Not much on here is intuitive") | #753 review; memory "Game UX: judge the flow" |
| 2 | Visual quality is judged alongside comprehension: hierarchy, density, one vocabulary for one meaning, the art's presence, motion. | 75% | Nick on #750: "without actually doing any visual pass" |
| 3 | Judges are cold Opus readers (no guide) and a separate Opus critic; the builder never grades. Readers answer against the engine's truth; the critic scores each journey stage 1 to 10. | 90% | memories "Blind readers need Opus", "Adversarial critic loop" |
| 4 | Bar to ship: every journey stage 8 or above from a fresh critic, and cold readers at 90% or better on the fixed question set. | 70%, the flow pass bar, extended | #753 record |
| 5 | No new mechanics in this pass: enemy intents and other parked layers wait until it ships. | 95% | Nick, 2026-09-29 |

## Method

1. **Capture** the journey on the numbers-pass build: frame sequences (the `scripts/powerworks-turns` harness) at 1366 x 768 and 1920 x 1080, and still frames at 844 x 390, for each stage. The scenario devtool gains the states it lacks today (start, camp with a fallen companion, defeat, victory).
2. **Cold readers**: three Opus readers, no guide, numbered frames with neutral names. Each narrates each sequence, says what they would do next and why, and answers a fixed set: what the goal is, which side is theirs, which move does the most to which enemy, what each mark means, what happens after this turn, what the run's state is (chamber, health that carries over, revives left).
3. **Critic**: a separate Opus critic scores each stage on clarity, hierarchy, feedback, affordance, consistency and polish, names the three weakest things per stage, and compares with the reference battlers from the research pass.
4. **Plan**: findings become a storyboard of changes in this doc, stage by stage, before any code.
5. **Build and loop**: Sonnet builders implement; each round is recaptured and judged by fresh readers and a fresh critic until the bar holds.
6. **Nick plays** the deployed build.

## Findings, 2026-09-29

Capture: 47 sequences over 11 of 12 stages (no player retreat control exists to capture). Critic report and reader answers are kept outside the repo (scratchpad `ux2/answers/`); the summary is here.

**Critic scores** (overall per stage; clarity, hierarchy, feedback, affordance, consistency, polish): S01 arrival 4, S02 first look 5, S03 reading options 5, S04 acting 5, S05 enemy turns 5, S06 encounter end 4, S07 camp 4, S08 defeat 4, S09 victory 4, S10 retreat and restart 3, S11 record and tools 4, S12 phone 2. No stage reaches 8. The turn cycle is the strongest part; everything around it is weak.

**Cold readers**: three Opus readers each rated their own understanding 6 of 10. Shared top confusions: the enemy hit chip (it shows the hit on the companion now acting, with that companion's portrait, and readers took it as the enemy's target); a key row reading 0 everywhere with no reason (the player's own companion is hindered); "every enemy" on a single-target key against "ALL" on an area key; the stall rule that ends a run without warning; the "since your last turn" line and the Record leaving events out.

**Ranked issues** (critic, confirmed by the readers):
1. No arrival and no teaching: no goal, rules or start screen; the Guide is text only, never explains the marks, and says the turn strip is at the bottom.
2. The screen misreports hard moments: the round label when a round opens on an enemy's turn; "Its next hit is weakened" naming the wrong unit; camp shows the XP total as the gain; a stall text on the retreat screen.
3. The player's own status is invisible where it decides the turn: a hindered companion's keys read 0 with no reason; "since your last turn" nets health and hides heals, boosts, hinders and shields.
4. Self-only keys look inert and ignored clicks (click fixed in PR #760; the look remains).
5. Endings have no feedback: the last enemy, the boss and the last companion never visibly fall; victory looks like defeat; no summary, no exit.
6. Camp hides its decision: revive is a small grey tile with no amount or count; the recovery station heals silently.
7. The enemy hit chip implies an intent it does not have, and the boss's chip jumps (26 to 46) with no visible cause.
8. One mark, several meanings: gold for finish, next, signature and round; crossed swords for a hit and a hinder; chevron colors differ between cells and chips; the shield icon also marks the recovery station.
9. No way to leave or retreat; Restart wears the forward color.
10. Phone is not playable: the portrait prompt is backwards and has no exit; landscape text is about 6 px.

**Graded readers** (answers checked against the engine's record, 112 items each): 94.6%, 93.3% and 92.0%, combined 93.3%. The turn cycle reads; the losses are the forced-out screen (70%, its text describes a stall for a retreat), the restart dialog (Cancel looks like a restart), camp (XP total read as the gain, revives left unknown) and the rail's order (two rows read top first).

## Plan

Four build rounds, each recaptured and judged by a fresh critic; readers again after rounds 2 and 4. Rules held from earlier rulings: numbers and words in place, no suggestions; no side colors beyond the turn banner; calm motion (no camera shake, no blur, no moving light); one fixed screen.

### Round 1: say it truthfully

1. **Round label**: a round that opens on an enemy's turn changes the banner, the rail divider and the hand-off at the moment that enemy acts.
2. **Result sentences name both sides**: "and weakened Crystorn's next attack by 14", never a bare "its".
3. **Camp XP** shows the gain of this sector, not the run total.
4. **Since your last turn** lists every change that matters for the next choice, per unit: health (hits and heals separately when both happened), shields gained or lost, boosts, hinders. On the first turn of a room it is not shown. When nothing changed it says nothing rather than "no health changed".
5. **Own status in the keys**: a hindered or boosted active companion's cells show the number before and after (the struck-number form enemy chips use) and the key row says why ("Crystorn is hindered by 14"). A row of zeros never appears without its reason.
6. **One rule for identical cells**: a single-target key always shows one cell per enemy; only an area key uses the ALL band. "Every enemy" goes away.
7. **Enemy hit chip**: no portrait; it reads as that enemy's strongest hit it can make on its next turn against the companion now acting, and when a stronger move is resting, the chip shows it coming ("46 in 1") so the number never jumps without a cause.
8. **Record**: every beat's sentence, grouped by round and sector, newest first.
9. **Retreat**: a Retreat action at camp (the engine's command), its own result text ("The squad withdrew"); the forced-out text stays for the stall and says what the stall rule is.
10. **Phone portrait prompt**: "Turn your phone sideways to play" and a way back to Xalians.

**Built (2026-09-29, branch feat/powerworks-ux-2-r1):**

1. Round label: `playback()` replays the clocks act by act and gives every beat the engine's `round` and its own `rail`; the banner, rail (divider included) and the enemy-turn card read the beat being played, so a round that opens on an enemy's turn is the new round from that enemy's first beat (the enemy-turn card also shows "Round n" once it differs from the round the command began in). The cause was that the page held the pre-command view and only remapped the rail slots. The hand-off card is unchanged: it already fires on the settled state.
2. Result sentences: `momentWords` moved into `view.ts`; every heal, shield, boost, hinder and delay clause names its target ("hit Crystorn for 26 and weakened Crystorn's next attack by 14"), and `weakenedWords` names the enemy whose hit was weakened.
3. Camp XP: `xpGain` (this sector's +10, the final +30) is the headline; the running total is a quiet line under it.
4. Since your last turn: `sinceView` reads the Record's beats since the active companion's last act in this room; per unit (active companion, squad, enemies) it lists hits, heals, fell, shield gained or lost, and a boost or hinder only while still carried; nothing changed says nothing; first turn of a room shows nothing. The banner takes whole items up to about 92 characters then "+N more"; the Record panel shows the full list on top.
5. Own status: an attack cell of a hindered or boosted companion shows the struck plain number, an arrow and the marked one; the key bar's portrait column says why once ("hindered by 14", full sentence as its title).
6. Identical cells: the collapsed "every enemy" layout is gone; single-target keys always show one cell per enemy; only an area key draws ALL.
7. Enemy hit chip: no portrait; it is the enemy's strongest hit at its next turn on the acting companion; a stronger resting attack appears as a second quieter chip "46 in 1". Definition: cooldowns decrement at the start of a unit's own turn, so a move with cooldown c acts on its c-th turn from now, and "in N" is c minus 1 (the turns after its next one).
8. Record: every beat's sentence, grouped by sector and round, newest first, kept in the save (last 800 lines).
9. Retreat: a Retreat button at camp (the only phase the engine accepts `retreat` in), a "Squad withdrew" result, and the forced-out result now states the stall rule. The engine gains a `WITHDREW_LOG` line on a chosen retreat so the two endings can be told apart.
10. Phone portrait: "Turn your phone sideways to play", the icon turned on its side, and a Back to Xalians link.

Not done or different: Retreat has no confirmation step (the doc did not ask for one). The stall ending is still unreachable in seeded play, so its paint is covered by a unit test only. Enemy turns that play silently before a room's first companion turn (the advance command) are still not recorded.

### Round 2: arrive, end and rest

Briefing screen before the first turn (goal, the four sectors as a strip, the squad, health carries over, one revive; Begin). The Guide becomes a visual legend of every mark. A room title card on entering each sector. Knockouts hold: the last enemy, the boss and the last companion visibly fall before any panel; "Sector cleared". Victory and defeat get distinct layouts, a run summary (sectors, rounds, knockouts, XP, the enemy that decided it) and an exit. Camp: revive is the primary action when someone is down, with its amount and the revives left; the recovery station states its amount and plays it on arrival with deltas. Restart's confirmation uses the danger style with Cancel as default. Cancelling it leaves a visible trace (graded readers could not tell Cancel from a restart).

### Round 3: one meaning per mark, and impact

Gold only for finishes. Hinder cells read as "their hit 14 → 0", distinct from damage. Chevrons one color rule everywhere. The recovery station gets its own icon. Self-only keys become pressable cells like the others and ring their recipient on hover. Hovering an enemy lights its column in every key. Every unit shows its element. Hits land with a target flash, a short knockback, a larger number and a STRONG or WEAK tag in the matchup color. The turn rail reads in one pass: graded readers read its enemy row before its squad row and got the order wrong in 12 of 20 folders, so order must not depend on reading two rows by horizontal position alone. While beats play the key bar shows one "playing" state instead of the ghosted keys; speed is a labeled 1x/2x control.

### Round 4: phone

A landscape phone layout that uses the full width, drops plate chrome to name and bar, and keeps text at 12 px or more.

Not adopted: a commit guard or undo (the answer keys already preview the outcome before the click); reopen if play shows misclicks.
