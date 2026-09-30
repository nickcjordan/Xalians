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

**Built (2026-09-29, branch feat/powerworks-ux-2-r2):**

1. Briefing: `briefingView` (goal, the four sectors with the last marked Guardian, the squad with health, three run rules with the engine's revive count and recovery amount) and `BriefingPanel`, shown on a new run and after Restart, skipped for a saved run. A run is not saved until Begin, so a reload at the briefing shows it again. Begin is the one mint action; Back to Xalians sits beside it.
2. Guide: `guide.tsx` draws 15 legend rows with the real components (`CellButton`, `MarkChips`, `HitChip`, `ComingChip`, `SupportRiders`, the ALL band, `TurnRail`, `DeltaChip`), inert, each beside one sentence. It says the rail is along the top. `HitChip` and `ComingChip` were extracted from `EnemyPlate` so the legend and the plate share one drawing. Two columns, no scroll.
3. Sector title card: `titleCard` and `TitleCardView` ("Sector n of 4", name, enemies by letter and name, the Guardian tag on the last sector), held 2.4 s by opacity only, then gone; it shows on Begin and on entering each sector, never on a resumed page.
4. Knockouts hold: the cause of the missing fall was that a beat's target stayed drawn as standing for the whole rest of the beat. `Playback` now reports a settle phase, so a fallen unit collapses and fades (transform and opacity, 650 ms) and a beat that knocks a unit out runs 800 ms longer. After the last beat `knockoutHold` holds the stage: "Sector cleared" 1.5 s before camp, 2.6 s for the boss's fall ("Sector cleared" over the empty floor, then the report) and 2.6 s for the last companion's fall ("The squad has fallen", squad row dimmed). Skip and reduced motion bypass the hold.
5. Victory and defeat: `EndPanel` has three families. Victory shows the surviving squad at 112 px and a mint border; defeat shows the whole squad grayed and "Down", raspberry border; withdrew and forced out use the defeat family with a neutral mark. `runSummary` gives sectors cleared, rounds played, enemies knocked out, XP earned (the engine's total) and, for a defeat, the enemy and move that dealt the last companion's final blow; sectors and XP are the engine's, rounds (each sector's highest round, added up), knockouts and the final blow come from the Record. The X glyph is replaced by an aria-hidden mark (trophy, broken heart, exit, timer). Play again and Back to Xalians on all of them.
6. Camp: `campView` gives one revive button per fallen companion with the engine's half health and the revives left ("Revive Hippochamp to 63 health · 1 revive left"); the first is the primary, Continue turns secondary with "Continuing leaves the revive unused." After a revive the portrait glows, "+63" rises over it and a line says "Hippochamp revived to 63 health. No revives left." (`revivedWords`), and Continue is primary again. The recovery station has its own icon (a cross, no longer the shield) and its amount ("restores 20 health to each standing companion"). On arrival `stationHeal` puts green deltas on the plates and a banner line ("Recovery station: Avilily +20, ..."); the title card repeats it. Both clear when the player acts.
7. Restart: Cancel is first and focused, Restart is a raspberry outline (`pwt-danger`), the eyebrow is raspberry. Cancelling (button or the backdrop) leaves "Restart cancelled. Your run continues." in the banner line and a notice under the tools for 3.5 s.

Verified: `view.test.ts` and the page test cover each new view function and phase transition; frames S01, S06, S07, S08, S09 and S10 at 1366x768 and 1920x1080 and the geometry check (see the Round 2 report in the session scratchpad).

Different from the ask or not done: the searched scenarios of the harness now save a Record so the end screens show real numbers (a saved run from before this round has no Record, so its summary shows 0 rounds and knockouts). The revive line counts revives left before the click, as the spec's example does. Enemy turns that play silently before a room's first companion turn are still not in the Record, so they cannot appear in a summary.

### Round 3: one meaning per mark, and impact

Gold only for finishes. Hinder cells read as "their hit 14 → 0", distinct from damage. Chevrons one color rule everywhere. The recovery station gets its own icon. Self-only keys become pressable cells like the others and ring their recipient on hover. Hovering an enemy lights its column in every key. Every unit shows its element. Hits land with a target flash, a short knockback, a larger number and a STRONG or WEAK tag in the matchup color. The turn rail reads in one pass: graded readers read its enemy row before its squad row and got the order wrong in 12 of 20 folders, so order must not depend on reading two rows by horizontal position alone. While beats play the key bar shows one "playing" state instead of the ghosted keys; speed is a labeled 1x/2x control.

**Built (2026-09-29, branch feat/powerworks-ux-2-r3):**

1. Gold only for finishes: the finishing cell is the one gold mark left. The NEXT pill is now an ink-outlined pill, the round labels (banner, rail, key-bar card) are ink, the signature key's name is ink with a small star at the right of its head ("once per fight" stays in the foot), the boost rider and chip are neutral ink, and the hover ring and acting glow that were gold are ink.
2. Hinder cells: a dashed frame with a faint green wash, the swords glyph large and leading, then the enemy's hit struck, an arrow and what it falls to ("14 -> 0"); the result number is small and it is no longer the loudest mark on the key. The rule for hinder everywhere: the glyph is the swords in neutral ink (plate chips, rider chips, self-only keys, cell), the minus says which way; only an outcome number takes a color.
3. One chevron rule: the arrow direction is the damage (up more, down less) and the color is who that favors (green good for you, raspberry bad). Key cells are unchanged; the enemy hit chip is now a neutral chip carrying the same round chevron badge, so a strong matchup for the enemy is a raspberry up and a weak one a green down. The old all-raspberry chip is gone.
4. Self-only keys are cells (`pwt-cell now`) with the key's chips and "on itself" or "whole squad"; hovering or focusing one rings the unit or the whole standing squad on the stage (`hoverUnits` in the page, `targeted` on `SquadPlate`). Ally cells ring their squadmate the same way.
5. Hovering an enemy figure or plate rings it (ink ring, heavier plaque outline) and lights its cell in every attack key (`col-lit`); hovering a key cell lights the same column in the other keys.
6. Element badge on every plate, on the plaque's top edge, and under the name in the key bar's portrait column: a dot and the word in the element's own hue through the `el-<element>` scope (`ElementBadge`).
7. Impact: a hit flashes its target and knocks it back about 12 px away from the attacker (the direction of the lunge), then settles in under half a second (`struck` class, only for hits; heals and marks keep the old soft flash; reduced motion turns it off). The landing number is 50 px, and a STRONG or WEAK tag follows it in the matchup color (green when the matchup favors you, raspberry when it does not: a strong hit on an enemy is green, a strong hit on your companion is raspberry).
8. Playback key bar: while beats play the bar shows one card in the enemy-turn card style: "Enemy turn" (raspberry, as before) or "Playing out" (neutral) with your next companion; the keys are hidden behind it rather than ghosted. Speed is a labeled "Speed 1x | 2x" segmented control with the current one pressed, and Skip is its own button.
9. Turn rail: still one time axis, but the two lanes now overlap vertically (enemies raised 13 px above the track, squad lowered 13 px below it, the track threaded behind every slot), so the row reads as one line in time order instead of an upper lane and a lower lane. Slots still to act carry their order (NOW is 1, NEXT is 2, then 3, 4 ...) in a small number, which stays true across the round divider. NOW, NEXT and the divider are unchanged. Chosen over a connecting line (adds ink to a bar with no room) and a single flat row (loses "sides told by position"): the notch keeps the position cue, the numbers remove the dependence on it.

Guide: rows added or reworded for gold, chevrons (both hit chip directions), the hinder cell, the self-only key, the plate chips (merged into one row), the element tag, STRONG and WEAK, the star, and the new rail; it still fits with no scroll.

Verified: `powerworksTurnsPage.test.tsx` covers element badges, rail order numbers, the enemy hover ring and lit column, and the playing card with the speed control; frames S02, S03, S04, S05a, S11b and the Guide at 1366x768 and 1920x1080, and the geometry check (including 844x390) in the Round 3 report in the session scratchpad.

### Round 4: phone

A landscape phone layout that uses the full width, drops plate chrome to name and bar, and keeps text at 12 px or more.

**Approach (decided): a second console composed at the phone's own size, not responsive rules on the 1280x720 console.** The desktop console is a fixed 1280x720 box scaled with CSS zoom; every size, gap and font in `powerworksTurns.css` is an absolute pixel value tuned to that box. Media-query rules on it would have to undo most of the file and would still be scaled by zoom (a zoom of about 0.3 is why text reads at 6 px). So `phone.ts` decides phone mode (`isPhoneLandscape`: wider than tall and 500 px tall or less, which covers 667x375, 844x390, 915x412 and 932x430), and in that mode the page renders the same React tree at `window.innerWidth x window.innerHeight` at zoom 1 with a `phone` class on `.pwt-console`. All phone layout lives in one new file, `powerworksPhone.css`, every rule scoped to `.pwt-console.phone` (plus `.pwt-menu { display: none }`, so the menu button is absent on a desktop). Desktop keeps zoom and the untouched CSS. The two layouts differ in structure (a key column beside the stage, a menu button), which is a layout, not a scale.

**Layout.** A 60 px top bar across the width: a back arrow, the sector and its name, the banner (round and turn, whose turn, one line of the last result), the turn rail, and one Menu button. Below it, the stage on the left and the key column on the right (`clamp(292px, 40%, 380px)`), where thumbs rest. The key column is the active companion (portrait, name, element, status) with Pass beside it, then the four keys stacked, each a head line (name, with the timing words and rider chips at its right) over a row of cells. When the enemies act, the whole column is one card (the enemy-turn card) with Speed and Skip at its foot. Panels (camp, end, briefing, restart, Record) take the full width; the Guide is one sheet that scrolls inside its panel, in two columns from 760 px wide, with Close pinned at its foot.

**Ruling: touch has no hover, so a key cell answers the first tap with its preview and the second tap on the same cell uses it.** The preview is what hover does on a desktop (the cell's enemy is ringed on the stage, its column lights in every key, a self-only or ally cell rings its units) plus a "tap again to use" line in the key's head and a ring on the cell. Tapping a different cell moves the preview; tapping anywhere else, acting, or a new active companion clears it; tapping an enemy plate previews that enemy the same way. It applies when phone mode is on and the device has no hover (`(hover: none)`); a mouse in a small window still commits on one click, and keyboard play is unchanged. The Guide says tap instead of hover on such a device. Nothing commits on a hover that touch cannot do.

**Built (2026-09-29, branch feat/powerworks-ux-2-r4):**

1. Phone mode (`phone.ts`, tested): the console is `innerWidth x innerHeight` at zoom 1 with the `phone` class; desktop is unchanged (same 1280x720 console, same zoom).
2. Top bar at 60 px: the back link is an arrow (44 px square), the sector line, the banner at 15 to 17 px with an enemy's name and letter wrapping to two lines instead of losing the letter, and the banner sentence cut to one line (plain text on a phone; the full text stays in the Record). Guide, Record and Restart fold into one Menu button that opens a list of three 44 px items.
3. Turn rail: smaller slots (30 px, NOW 34), NOW and NEXT tags, order numbers and the round divider kept, only the last unit to have acted shown before NOW, the far end fades out rather than showing half a word.
4. Stage: two rows of plates sharing the width; each plate keeps its figure, letter, element tag, name, health bar and number, and every chip and delta, at 12 px; the figure takes whatever height is left, so a plaque never grows past its row.
5. Key column: cells are at least 40 x 40 and stretch across the key; an area attack's ALL label leads its cells at the left instead of riding the top edge; hinder and marked cells show "14 -> 0" with the mark at the corner; the key number (a keyboard hint) is hidden so long move names stay whole; the timing words sit in the head line in the body face.
6. While beats play the column is one card ("Enemy turn" or "Playing out", the round when a round opens, your next companion) with Speed and Skip in a row at the foot, both 40 px or more.
7. Panels: full width, tighter, 40 px buttons. The end of a run is two columns (squad left, summary right); camp, briefing and restart fit at 667x375 with no scroll; the Guide scrolls inside its panel with a pinned Close; the Record's list takes the room that is left.
8. Every text size on the phone console is 12 px or more (the `--text-tiny`, `--text-legend`, `--text-small` and `--text-body` tokens step up inside `.pwt-console.phone`, and the hard-coded 9 to 11 px sizes are overridden).
9. Harness: `flow.cjs` opens sizes 500 px tall or less as a touch phone (isMobile, hasTouch, 2x), taps instead of clicking, taps a cell twice to use it, and opens the tools through the Menu (`--only-size=` limits a plan run to one size); `plan-ux2.json` gains 844x390 for S01, S04a, S05a, S09b and S11a; `geometry.cjs` gains the phone checks (below) and the 932x430 and 667x375 sizes.

**Verified:** `geometry.cjs` on all 14 scenarios at 1920x1080, 1366x768, 844x390, 932x430 and 667x375 (isMobile and hasTouch on the phones): 1572 checks, 0 failures. Every figure, letter and plaque inside the stage; squad plaques clear of the key column; rail and banner inside the screen; no page scroll; every panel fits with no inner scroll except the Guide; no visible text under 12 CSS px; no button or link under 40 px in its short side; nothing outside the screen or clipped (the banner sentence and the rail's faded far end are the named exceptions); no move name cut short; the tap flow (first tap previews and rings its target, second tap uses the move); and the same text and size checks on the frames while the move and the enemy turns play out. Desktop: S02, S07, S08b and S09b at 1366x768 and 1920x1080 against the Round 3 capture differ only inside the spotlight pointer and floor ring (both are animated), and the camp, defeat and victory screens are pixel-identical. `powerworksTurnsPage.test.tsx` covers phone mode, the menu, the two-tap flow and the one-click flow with a mouse.

**Not done or open:** the Guide is a scrolling sheet on a phone, not a fit-to-screen page (16 rows cannot stay at 12 px in 390 px). A touch screen taller than 500 px (a tablet) still gets the desktop console and so has no tap preview. No safe-area padding for notches or rounded corners. No cold-reader or critic pass has been run on the phone layout yet (that is the round's judging step).

Not adopted: a commit guard or undo (the answer keys already preview the outcome before the click); reopen if play shows misclicks.
