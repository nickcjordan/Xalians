# Reclamation: the ownership brief

Status: written 2026-09-18 for the agent that takes ownership of the Reclamation game and works it, pass after pass, until it is a proper game. Nick wrote the goal; the rest is the standing instruction set, the state of the game as it is handed over, and the working rules that every earlier pass ran under. Read this whole file before touching anything, then read the three documents it points at.

## The goal, in Nick's words

Take ownership of this game and work it iteratively until it is a proper game: enough game mechanics that a human would have found them, enough polish that it feels like a real game, enough affordances that a human does not have to read the entire screen to understand what is going on, everything intuitive, and enough connection to the lore to make it make sense. Then anything else this game, and any game generally, needs to become great.

Out of scope: creature art and the animations of the creatures. Nick has a separate pipeline for those. The creature figures on the table stay as they are (glyph silhouettes on plinths) and nothing here waits on them. Everything else visual is in scope: worlds, sites, the Court's frame, the chrome, iconography, sound, motion of everything that is not a creature.

## What "done" means

The game is done when all of these hold at once, and it is not done while any of them does not:

1. **Decisions are real.** The validation tool's gauges are met on three seeds, not one: no naive policy within eight points of the proctor's mirror; three to five near-best options per decision on average; comeback rate 30 to 40 with no gift to the trailing side; resolution changes the leader at 25 to 40 percent of contested worlds; downs per match 3 to 5; no dead species, no dead element, no dominant species in the draft; every role inside 40 to 60 keeper win rate; every rule carries measurable weight under ablation or has a written reason to exist that is not "it might matter."
2. **A human can find the mechanics.** A first-time player, without reading the rulebook, discovers hiding, the stake, the swift move, roles, instinct and speed by playing three Provings, because the table shows each one at the moment it matters. Test this by the comprehension-by-prediction method in the validation principles doc: at a decision, the player predicts what will happen, then sees it. If the prediction protocol cannot be run by a fresh subagent that has never seen the code and has only the screen, the affordance is not there yet.
3. **The screen reads at a glance.** At every moment a player can answer four questions in under two seconds without reading a sentence: who is winning this world, who is winning the Proving, what can I do right now, and what happens if I do it. Verify by paint (screenshots at 1440 and 390), never by CSS.
4. **It feels like a real game.** A session has a beginning (the Court convenes, the rival is met, the draft), a middle with rising stakes, and an end that says what happened and why. It has sound, motion, pace control, and moments a player would tell someone about. It never shows a developer's face: no raw keys, no placeholder copy, no dead controls, no state a player can reach that has no words.
5. **It is of this world.** Every name on the table comes from the lore, every rival is a faction with a reason to be at the Court, every world is a planet with its history within reach, and the reward loop is the lore's own (the Proving is how Xalians win Scrambler Tokens). Every line of in-world prose passes the lore fact-check gate before it ships.
6. **A human has played it.** The Proving notes and telemetry from at least one full human session are in the repo, read, and answered by a pass.

## Where the game is (2026-09-18)

Read, in this order: `docs/design/reclamation-design.md` (the rulebook, with 61 numbered assumptions and the open items), `docs/design/reclamation-base-redesign.md` (the base redesign and passes 1 through 4b with every measurement), `docs/design/game-validation-principles.md` (how the game is validated short of humans), then `docs/design/reclamation-validation-report.md` (the checked-in run) and `docs/design/reclamation-play-enhancements.md` (the research digest and the roadmap that produced the rivals, resume, report and skip).

Code: rules in `packages/rules/src/expedition/` (TypeScript: `expeditionRules.ts`, `expeditionBot.ts`, `creatureOnTable.ts`, `draft.ts`, `roster.ts`, `sites.ts`, `expeditionInterpretation.ts` for every tunable, `devtools/expeditionValidation.ts` and `devtools/expeditionSimulator.ts`); UI in `apps/web/src/components/games/reclamation/` with the page at `apps/web/src/pages/games/reclamationPage.js`; CSS in `apps/web/public/assets/css/legacy/reclamation.css`. Run the validation tool with `node apps/web/scripts/runNode.cjs packages/rules/src/expedition/devtools/expeditionValidation.ts --matches=200 --seed=7 --md=docs/design/reclamation-validation-report.md` (`--only`, `--sweep`, `--json` exist; three seeds, 7, 13 and 21, are the standard). Tests: `npm test` at the root runs every workspace; `npm run typecheck -w packages/rules`; `npm run build -w apps/web` enforces bundle budgets.

What works: a full Proving against five rivals (envoy, heir, proctor, broker, windsailor, one engine with five weight sets, in ladder order), a draft of twelve from fifteen, three rounds of three worlds, Deploy with hidden arrivals, swift moves and the stake, a Clash resolved per world with sequenced playback, the Ruling, a report with Proving notes and telemetry export, resume of an unfinished match, a simple and an advanced view of the same table, a review of every decision the bot would have made.

What is unmet, in the order to attack it:

- Resolution changes the leader at 13 to 15 percent of contested worlds (band 25 to 40). Attacks do not decide enough worlds; hold decides them. The lever is the attack-to-hold ratio (`magnitudeScale`, the hold compression), and the question under it is whether the Clash is doing enough work to deserve its playback.
- Downs per match fell to 1.4 to 2.1 (band 3 to 5) once the bot began anticipating the rival's answers. Creatures rarely meet. Same root as the point above.
- Intelligence and charisma read negative within presences (charisma minus 15, intelligence minus 10 points in the per-role lane reading) because the draft rating and the bot's role value prize hold, so the presences that reach the table are the ones whose points went elsewhere. The lever is what `rateForDraft` and `roleValueOf` count.
- Fire is a dead element and dromeus a dead species in the draft (kept under 20 percent).
- The bolster role, bolster recovery, the instinct lanes and the resilient trait move nothing measurable under ablation. Each either earns its place or goes.
- Comeback rate 26 to 32 by seed, on the edge of the band; the stake is variance-neutral. Any comeback avenue must be a chosen risk or a random draw open to both sides, never a gift to the side behind (Nick's ruling, participation trophies are out).
- Decided after round 1 sits at 45 to 49 percent. Nick does not want this safeguarded ("that means one of the players just totally sucked"); it is reported, not targeted.
- Whether menacing should merge into shield; what resilient means under subtraction.
- No human has played a full Proving under the current rules. The notes and telemetry hooks exist and are empty.

## The working rules

These are Nick's, gathered across the passes. They are not optional.

- **Levers, not stone.** Every ratified setting is a tuned lever. New evidence reopens a ruling; taste does not. Report friction in the moment with the concrete case and the smallest fix.
- **Apply the recommendation, record it as overridable, do not block.** On any lever decision, choose, ship, and write the choice with its confidence and evidence into the assumptions table of the relevant doc. Stop and ask only when the fork changes what the game is: a new resource, a new win condition, a new phase, networked play, anything that costs money. Ask one question at a time, in prose, with the full context and a recommendation; never a multiple-choice list.
- **Discussion is not ratification.** Only an explicit yes from Nick ratifies a design item. Re-present pending items after a tangent.
- **Reduce to basics.** No synonyms, no two rules for one job, no control a player must learn and then always leave in one position (that is how the hidden toggle died). The presentation stays simple no matter how complicated the math is.
- **No gifts.** Nothing is handed to the side that is losing. Comeback comes from chosen risks or fair random draws.
- **Vocabulary must be intuitive.** Speed, downed, hurt, attack, power, sweep, instinct, hold, Clash, Ruling, Proving, Charter. If a word needs a sentence to explain it, it is the wrong word.
- **Measure before you design around a constraint.** Existing code is evidence, not spec. Everything in the game is up for debate, with numbers.
- **Verify visual work by paint.** Never present a visual change without a check that could have failed: rendered screenshots at 1440 and 390, no horizontal overflow, no console errors. Nick runs Dark Reader; check colors in a clean profile before treating a color report as a bug.
- **Design system.** Read `docs/DESIGN_SYSTEM.md` before any visual change. Tokens only, no raw hex; the game's own look is yours to develop within the system; the immersive tier's site-wide brief is parked and nothing here waits on it. Depth means thickness: solid mass is pressable, flat is read-only.
- **Prose.** American English, no em-dashes, no dramatic sign-offs. In-world copy in the lore voice (`lore-voice` skill), fact-checked (`lore-factcheck` skill) before it ships. Lore additions go into `docs/encyclopedia/encyclopedia.json`, never into game code.
- **Repository.** Branch from `main` in a worktree (`npm run wt`). Every PR opens ready, with a full description, and is auto-merged at once (`gh pr merge N --auto --merge`); Nick judges on the deployed site and never merges by hand. Design docs live flat in `docs/design/`. No `Co-Authored-By` trailer; Nick is the sole author. Never commit the untracked draft docs already sitting in `docs/design/` (the Tribute supplements, the card-game brainstorm).
- **Money.** Stop and warn loudly before anything that would increase Nick's costs: paid APIs, new infrastructure, larger CI. Local models before any paid service; procedural assets before any downloaded ones.

## How to work it

Run the game in passes. A pass is one PR. Each pass:

1. **Read the state.** `docs/design/reclamation-ownership-log.md` (create it on the first pass) holds the standing state: gauges by seed, open items ranked, what the last pass did, what the weakest thing is now. Resume at the weakest thing. Never restart from scratch.
2. **Decide the smallest change** that attacks the weakest thing, behind a rules key or a weight so it can be swept and ablated.
3. **Build it** in the engine first, measured, then adapt the table so the change is legible at the moment it matters.
4. **Verify** in this order: unit tests, typecheck, the validation tool on three seeds, the build with its budgets, headless Provings in simple and advanced view at 1440 and 390 with screenshots and zero console errors, and for any prose the fact-check gate.
5. **Record** the numbers and the decision in the redesign doc (a new "Pass N" section with its assumptions table) and the rulebook (numbered assumptions, superseded rows marked, open items updated), and regenerate the checked-in validation report.
6. **Ship** the PR with auto-merge and update the log.
7. **Critique.** Every third pass, spawn a separate agent that has never seen the code, hand it the deployed table and the rubric in the validation principles doc, and have it score the game on the numeric bar. The builder never grades itself. Log the score and attack the lowest line next.

Delegate implementation to subagents with tight specs (one folder each, public API named, verification steps inlined) and keep the integration, the measurement and the judgment yourself. The cost of a fan-out is ambiguity, not typing.

## The workstreams

Run them together, weighted toward whatever the log says is weakest.

### Mechanics

- **Make the Clash matter.** The single largest unmet gauge. Explore the attack-to-hold ratio, hold compression, and whether roles need a second dimension (reach, timing) before adding any new rule. The Clash must produce moments: a reveal that flips a world, a shield that saves one, a sweep that clears one.
- **Every attribute a job that shows.** Strength, intelligence, vitality, endurance, resilience, agility, reflex, willpower, instinct, charisma each move the outcome within the role that uses them, and the table shows which one is at work. Fix the draft rating and the role value first; they decide which creatures are ever seen.
- **Every trait a meaning.** Stealthy (arrives hidden), armored, resilient, menacing, pack-bonded, solitary, swift, willful: each either does one legible thing at the table or is not shown. Merge, cut or give a job; no decorative traits.
- **Worlds that differ.** Three sites per planet exist with environment bands and media. Make the site a decision: temperature strain already grades creatures; add what makes a player pick one world over another for a given creature beyond hold, in a way that reads on the world's plate.
- **The match arc.** Three rounds should escalate. The stake is the one chosen risk; consider a second of a different kind (a Court decree drawn per round that both sides play under, the same for both) before considering anything that scales with the score.
- **The draft.** Twelve of fifteen, one of each role. Make the draft a real decision with visible tradeoffs against the coming worlds (they are known at the draft), and make every species keepable by someone.
- **Rivals as people.** Five weight sets are five styles; make each one visible in play (the broker bluffs, the heir stacks, the windsailor floods) and tell the player, in the rival's plate and in the report, what the rival did that beat them. Add an expert at the top of the ladder that a good human cannot beat easily, and a difficulty that does not gift.
- **Hot-seat.** Two humans at one screen, alternating, with the hidden information handled by a pass-the-device screen. This is the single most valuable validation instrument the game can have and it is cheap. Build it early.

### UX and affordances

- **Glanceability.** One bar per world, one glyph per creature, one sentence per rule (the base redesign's own principle). Every state has a mark: winning, losing, tied, staked, hidden, hurt, downed, swift, willful, returned. Color and shape, not text, carry the first read; text carries the second.
- **Teach by doing.** A first-Proving guide that surfaces each mechanic the first time it is relevant and never again (stored per browser), replacing any wall of rules. The intro says the game in one sentence and then shows it.
- **Consequence before commitment.** The ghost plan under a lifted creature shows what it would hold and do at each world; extend that to the stake and the swift move, and to the rival's likely answer where the bot's read can say it.
- **Every change told twice** (the standing principle): the table changes and a sentence says what changed, in one language, with the player's creatures named as theirs.
- **Pace control.** Skip, speed, and replay of the last Clash; nothing forces a player to watch what they already understand, nothing hides what they do not.
- **Mobile and keyboard.** 390 wide with no horizontal scroll; every control reachable by keyboard with a visible focus; screen-reader labels on every mark.
- **No dead ends.** Every reachable state has words and a way out: an empty roster, a lost connection to storage, a resumed match whose rules have changed, a rival that cannot move.

### Polish and game art (not creatures)

- **The Court's frame.** The table is a Court of Arbitration proceeding on Poseidas: the frame, the Charter tally, the Ruling, the proctor's voice. Give the chrome that identity within the design system: the frame as an instrument the Court operates, not a web page with panels.
- **Worlds and sites.** Each of the three worlds on the table shows its planet and site: a procedural surface or vignette (canvas or SVG, synthesized in code, themed by element and medium), the site's environment band as a readable instrument, the medium glyphs. No downloaded art; Nick's local generation pipeline may supply backgrounds and textures later and nothing waits on it.
- **Motion for everything that is not a creature.** World load, the Clash sequencing, the Ruling stamp, the Charter tally, the stake mark, the hidden reveal. Motion carries information (what changed, in what order) and respects reduced-motion.
- **Sound.** Procedural, synthesized in code: a send, a hidden arrival, an attack landing, a shield, a down, the Ruling, the clinch. A toggle, remembered per browser, default on.
- **Typography and iconography.** One set of role, trait, state and medium glyphs, consistent everywhere the creature appears (bench, table, inspect, report, draft). The report reads like a Court record.
- **Performance.** Playback smooth at 60 frames on a mid phone; bundle inside its budget; no layout shift when the frame loads.

### Lore

- **The loop is the lore's.** The Proving exists because Xalians win Scrambler Tokens by it; the winner's report should say so and the reward should connect to the generator (a token, a mint) when the platform is ready, and say it is coming when it is not.
- **Rivals are factions.** Each has a home, a reason to be at the Court and a voice; their plates, their sends and their reports speak in that voice, in the lore's register, fact-checked.
- **Worlds have histories.** A world's plate links to its encyclopedia record; the site names and facts come from `sites.json` and `planetRecords.json`, never invented in the UI.
- **The Court speaks.** The proctor narrates the Ruling; the Charter, the clinch and the stake have their in-world names; the glossary terms used at the table exist in `encyclopedia.json`, and the Proving's own terms (Charter, clinch, stake, frame) get entries there once ratified.

### Validation and quality

- **Keep the gauges honest.** Three seeds, 200 matches each, every pass; 1000 matches for any head-to-head that decides a setting. Retire a gauge only with a written reason (the draft keep band was retired because it was arithmetically unreachable).
- **The prediction protocol.** Build the harness for comprehension by prediction: a fresh agent given only screenshots predicts the outcome of a decision; its accuracy is a gauge of affordance, logged per pass.
- **The rubric critic.** The heuristic rubric in the validation principles doc, scored by a separate agent every third pass.
- **Telemetry answers questions.** The Proving notes and telemetry exist; every human session's export goes into the log and gets a written reply in the next pass.
- **Headless suite.** Keep the playwright checks (full Proving in both views, notes, resume, mobile, stake, hidden arrival) green and screenshotted; add one per new mechanic.

### What else a game needs, and this one is missing

- **A first minute.** The intro is a rival select and a rules paragraph. It should be an arrival at the Court: who you are, why you are here, whom you face, what is at stake, and the first send within sixty seconds.
- **A reason to play again.** Seeds are shareable; add a daily Proving (same seed, same rival for everyone that day), a personal ladder against the five rivals with the expert at the top, and a record of Provings with their reports.
- **A post-mortem that teaches.** The report says who won each world; it should say the turning point (the validation tool already computes decided-after and lock points) and one thing the player could have done, in the proctor's voice, without condescension.
- **Session length.** A Proving should take ten to fifteen minutes against the bot. Measure it from telemetry and tune playback and pacing to it.
- **Difficulty without gifts.** Rivals get better up the ladder by playing better (anticipation depth, read sharpness, draft skill), never by cheating or by handicapping the player.
- **Consistency of the whole.** One language, one glyph set, one voice, one rhythm. A player who has learned one screen has learned them all.

## Reporting

Every PR description carries: what the weakest thing was, what changed, the numbers before and after on three seeds, what was verified and how, what is now weakest, and any lever consequence found while building. The log carries the running state. Every message that pauses for Nick ends with the State, Next and Links block, and asks at most one question, in prose.
