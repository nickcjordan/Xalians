# Xalians creature adventure: design workshop

## Revised facility paper dungeon, 2026-09-16

Nick approves proceeding with the facility roster, four-encounter sequence, and recurring guardian charge hypothesis. The next charge may start only after at least one ordinary-action opportunity following release or interruption. Exact values remain prototype settings.

Current playable guide: [The Dormant Powerworks](paper-dungeon-02/README.md), with dedicated noncollectible enemy cards, a revised calculator and two transcripts. Paper dungeon 01 remains historical. The revised sample demonstrates an interrupted boss release followed by a later successful release. In 200 seeded runs each, a visible-state planner and the same healer-free squad with restraint disabled both complete all runs; knockout runs are 2 and 53 respectively. A deliberately weak secondary-only policy completes 175/200 with 2 diagnostic round-limit failures. These are one-squad scripted checks, not proof of fun, broad roster viability, or final balance. Enemy affinities, stats, charge timing details, recovery values and planetary context remain provisional as documented in the guide.

## Teaching belongs to the dungeon, not every enemy, 2026-09-16

Nick accepts the abandoned power facility with active automated defenses as the working direction for the revised paper dungeon. This is a game-design setting proposal, not a ratified planetary location or canonical history.

There is no required one-to-one mapping between enemy types and combat lessons. Preserve intentional teaching across the dungeon, especially preparation for boss mechanics, while allowing ordinary attackers with no unique mechanic or explicit lesson. Enemy types may share mechanics with enemies from other dungeons and differ only in appearance or lore. The cohesive theme requirement still applies. Such enemies can supply pacing, pressure, and encounter variety through composition without needing another special rule.

Authoring and review should assess the encounter sequence and dungeon as a whole, not demand mechanical novelty from every enemy. No fixed ratio of teaching enemies to ordinary attackers is selected. Revise the facility roster with this freedom; the previously proposed role table is illustrative rather than an exhaustive or mandatory roster.

## Cohesive dungeon themes accepted, 2026-09-16

Each dungeon's enemies must form a cohesive theme related to the dungeon itself. The location explains its inhabitants and can be the main source of that theme. Location means the particular site or environment, potentially informed by its planet; it does not require choosing a planet first or giving every dungeon on that planet the same roster. No universal natural/artificial origin is imposed. Setting, enemy identities, and behaviors should make sense together while allowing distinct combat roles. All enemies remain game-specific and noncollectible.

Next proposal, not accepted content or canon: develop one themed site with a small enemy family and a boss, preserving the teaching progression from simple behaviors to combinations. Choose its planetary placement only when supported by lore. Do not treat a suggested facility, cavern, or energy site as an approved location.

## Dedicated dungeon enemies accepted, 2026-09-16

All enemies in this game are game-specific, noncollectible enemies. Existing collectible Xalians are the player's squad, not the opposing roster. Do not include occasional collectible enemies, story exceptions, or implementation hooks for that possibility in the current scope. Reopening that direction would require a later design decision.

Nick accepts dungeon-specific enemy identities and rosters built from reusable, understandable combat mechanics. Early encounters teach behaviors that later encounters and bosses combine. Entirely novel mechanics for every enemy are not required. Enemy authoring must address readable appearances/descriptions, legal combinations, attrition and hidden-order fairness, lore grounding, and the connection between victory rewards and the collectible ecosystem.

Dedicated enemies need not inherit player creatures' uniform move counts or per-battle signature limits. Their action budgets and boss behaviors must instead be explicit and learnable. A visibly recharging, interruptible boss attack is a candidate, not a finalized timing rule. Enemy origins, roster reuse between dungeons, and exact enemy action budgets remain open.

The Discharge Trial's collectible enemy roster and tournament framing are superseded placeholders. Its arithmetic and transcripts remain historical combat experiments, not validation of the accepted enemy design. Next: establish a lore-compatible identity for the first dungeon's inhabitants, replace its enemy cards and framing, then rerun the paper encounter and balance checks. Keep the player squad; do not rename collectible opponents and imply that constitutes completed enemy design.

## GitHub backlog index, 2026-09-15

First complete paper fixture: [The Discharge Trial](paper-dungeon-01/README.md), with a reproducible arithmetic helper, sample run and adverse run. Uses real species/signature identities and the current type chart with explicitly temporary cards. No production combat implementation or final tuning implied. The fixture captures charge interruption and all-moves-exhaustion gaps for #300 and boss/teaching-sequence findings for #301.

Nick requested GitHub tracking for deferred topics. Outcome randomness is explicitly deferred; dependable execution is a provisional prototype assumption, not a permanent ban on misses, critical hits, or effect rolls. Enemy decision randomness remains accepted.

Tracking index: [#303](https://github.com/nickcjordan/Xalians/issues/303).

| Issue | Deferred decision or remaining work |
|---|---|
| [#295](https://github.com/nickcjordan/Xalians/issues/295) | Attack accuracy, critical hits, damage variance, and effect resistance |
| [#296](https://github.com/nickcjordan/Xalians/issues/296) | Game-specific progression, trade transfer, and deferred cross-game sharing |
| [#297](https://github.com/nickcjordan/Xalians/issues/297) | Perk budgets, paid reallocation, reusable paths, extra-tree eligibility |
| [#298](https://github.com/nickcjordan/Xalians/issues/298) | XP/credit rewards, first-win token scope, token cadence, specialist acquisition |
| [#299](https://github.com/nickcjordan/Xalians/issues/299) | Integration of forthcoming range, uniform movesets, rare healing and buffs |
| [#300](https://github.com/nickcjordan/Xalians/issues/300) | Core combat rules, charge/exhaustion edge cases, status limits, recovery and replay |
| [#301](https://github.com/nickcjordan/Xalians/issues/301) | Renewable dungeon authoring, enemy behavior, learning sequences and validation |
| [#302](https://github.com/nickcjordan/Xalians/issues/302) | Product setting/scope, player identity, recruitment, and later variants |

Issues distinguish accepted directions from proposals, dependencies and revisit-only options. Record subsequent decisions in the relevant issue as well as this workshop. Do not treat historical suggestions below as still current when later decisions supersede them. The workshop is currently a local uncommitted document; issues contain the needed context independently of publication.

Status: research and proposals, updated 2026-09-13. Nick confirmed Dungeon Boss as the remembered reference and selected a battle-based game as the current design focus. Other mechanics and new canon remain proposals. This document organizes an iterative conversation with Nick; it is not authorization to implement every concept below.

## Current direction: Dungeon Boss as the main reference

This section supersedes the initial exploration-first recommendation below, which is retained as an alternative for the broader platform discussion.

Nick wants a battle-based game and identified the original iPhone Dungeon Boss as a game he enjoyed: choose a crew, fight successive enemy groups, face a final boss, earn incremental rewards and a larger completion reward, sometimes adding a creature. Dungeon Boss is now the primary reference for this loop and many mechanics, blended with Pokémon and Xalian lore. Whether this becomes a standalone dungeon game, an adventure mode, an arena, or multiple variations remains open. No overworld is required to begin designing combat.

Research distinction: the original Dungeon Boss and Dungeon Boss: Respawned have separate documentation. Do not silently use remake-specific rules as evidence of what Nick played. Original-game community documentation describes parties of up to four heroes, fast/normal/slow action categories, and a Tower of Pwnage with persistent health and roster management. These are secondary historical references, not an authoritative frozen specification of the launch version:

- [Original heroes and party size](https://dungeonboss.fandom.com/wiki/Heroes)
- [Original gameplay](https://dungeonboss.fandom.com/wiki/Gameplay)
- [Original attack speed](https://dungeonboss.fandom.com/wiki/Attack_Speed)
- [Original Tower of Pwnage](https://dungeonboss.fandom.com/wiki/The_Tower_of_Pwnage)

Working synthesis, still proposed:

| Layer | Starting point | Xalian adaptation |
|---|---|---|
| Run structure | Dungeon Boss: prepare a crew, successive fights, boss, rewards | A short sortie through a local site or a staged arena gauntlet; choose the fiction separately |
| Active squad | Test four active creatures, following Dungeon Boss | Give protection, control, support, and damage room to interact; compare readability with three |
| Battle decisions | Dungeon Boss team turns and ability resource management; Pokémon as a reference for matchup and move choices | Derive readable commands from action/instrument/medium/intensity, retain individual signatures, use Xalia's element system |
| Difficulty | Escalation toward a boss | Enemy combinations, behaviors, hazards, objectives, and scenario rules instead of permanent creature level inflation |
| Progression | More opportunities and collection rewards | Account/game-save progress, access, collection breadth, and player mastery; no XP or power changes on immutable records |
| Acquisition | Occasional major creature reward | First test a token-funded generation reward with a named in-world source; exact-individual recruitment remains a separate canon/provenance decision |

First proposed test: four creatures, three short encounters, one boss, a 10–15 minute target. Carry some damage and ability expenditure forward so preparation for the boss begins before its room. Recovery rules, loss rules, and reward banking are open. Test for stalling on a weak enemy to recharge or heal; don't make tedious recovery optimal.

Illustrative Grimedes sequence, not new canon: an approach fight introduces a control interaction; a second enemy group challenges the obvious counter; the last encounter pressures the crew before a boss combines the lessons. A Graviclaw with suitable rolled abilities could restrain a threat while companions handle another objective. An arena organizer could supply token prizes under the established tournament economy; an off-arena sponsor needs its reward source established rather than implying tokens can be manufactured in a ruin.

Revised discussion order: (1) what persists between fights and what makes a run tense; (2) active squad and reserves; (3) action order and player control; (4) abilities, resources, matchups, and counterplay; (5) boss design; (6) rewards and progression; (7) setting and standalone/integrated variants. Research exact precedent as each decision is reached.

Confirmed by Nick: modest damage and ability-expenditure carryover with limited, predictable recovery between encounters. Exact amounts and recovery rules remain open. Both individual encounter discovery and applying those lessons across a dungeon are central: learn what works, then manage the crew well enough to defeat the boss.

## Progression reconsideration, 2026-09-13

Nick explicitly reopened game-specific creature progression, including possible opt-in sharing among related battle games and case-by-case transfer to new owners. This is authorization to explore the design, not ratification of levels, a growth curve, transfer behavior, or a shared progression family. A universal experience level remains unwanted.

Correction to earlier workshop reasoning: immutable creature records do not technically prevent mutable per-game progression stored separately. The old platform document's cosmetic-only veterancy restriction is a prior product decision, not an unavoidable consequence of immutability. Reopening that decision does not require games to read the shared history log or alter generated records. This discussion supersedes blanket exclusions of external game-specific progression in the historical sections below; the source platform policies have not yet been rewritten as a settled new contract.

Proposed model:

- Immutable creature identity: generated nature, anatomy, attributes, affinities, traits, abilities, provenance.
- Versioned game or explicitly shared-family profile: creature-specific experience, mastery, chosen specializations, and any bounded stat growth, stored outside the identity record. Rules say exactly which modes read and award this progress. Game state is authoritative; shared history is an optional record of accomplishments, not a dependency.
- Owner-specific progress: campaign access, tutorials, account rewards, and optionally a handler/creature bond. Keep this separate from creature experience so each can have a clear trade policy.
- Run state: current health, resource expenditure, temporary bonuses, and current dungeon progress. This is not permanent mastery and does not transfer through an ownership change.

Recommendation for the first game: consider a hybrid of modest capped numerical growth and meaningful specialization choices, with the baseline signature usable immediately and catch-up support for newly acquired crew members. Practice improves execution of existing natural abilities; it does not add arbitrary anatomy, elements, or permanent species transformation. Example proposals for a gravitational snare: specialize in duration or recovery, with an equip limit or tradeoff rather than accumulating every benefit. Do not pick final numbers until encounter tests establish the effect on roster variety and boss solutions.

Primary risk: grinding must not replace learning the encounter. Test whether an experienced but poorly composed team routinely bypasses the boss mechanic, whether new acquisitions spend too long unusable, and whether players have a reason to rotate companions. Separate tactical failure from being below an explicit progression band. Competitive modes can normalize progression independently of whether PvE awards mastery.

Cross-mode sharing: define a named, versioned progression family with explicit membership, valid reward sources, comparable earning rates, and interpretation rules. Start with one game's profile. A later tower variation using the same combat model is a plausible family member; existing Duel and Reclamation do not inherit it automatically. Shared recognition of milestones is another option if shared power would distort either game. Avoid bidirectional XP conversion loops or allowing the easiest mode to trivialize progression in the others. A shared family becomes a shared balancing and ownership-policy commitment.

Trade options remain open: (a) mastery follows the creature, reinforcing its lived identity but allowing progression to be traded; (b) mastery stays with the owner/creature pairing, preserving personal investment but requiring new-owner catch-up; (c) creature mastery follows while relationship/campaign progress stays with the owner. Initial preference is (c) only if those two kinds of progress have distinct useful roles; don't create a bond grind solely to implement hybrid transfer. For a shared profile, every participating mode must honor the same transfer policy for those shared fields. Specify return trades, in-progress runs, and ownership validation before implementation; these are not needed to choose the growth fantasy now.

Next design choice: numerical growth, specialization growth, or a modest combination. Recommendation: the combination, with enough immediate usefulness and bounded growth that discovery and team composition remain central.

## Renewable dungeon content, current discussion

Nick deferred progression sharing: each game may opt into its own progression system; do not implement a shared progression family now. The shape and magnitude of progression remain undecided.

Nick identified continual generation of new playable levels as an important requirement. He envisages authoring guidelines and constraints that allow the assistant to create further content. This does not yet select a runtime procedural generator, real-time AI generation, an endless ascending difficulty ladder, or a particular content format. Use "dungeon" as a working term only; sites and levels remain possible names.

Proposed distinction: unlimited supply of new authored/generated challenges is separate from unlimited difficulty and unlimited creature growth. A finite set of ingredients permits many combinations, but novelty and quality are not guaranteed by count. Design for a repeatable authoring and validation pipeline, and measure whether players encounter meaningfully different decisions.

Recommended initial workflow: humans and the assistant establish a small set of strong example dungeons; the assistant authors structured dungeon definitions within a versioned encounter grammar; deterministic checks validate legality, roster accessibility, difficulty estimates, resource attrition, and reward budgets; simulations screen obvious exploits and impossible combinations; humans play representative candidates before publication. A seeded procedural composer can follow once the grammar proves useful. Real-time unconstrained AI is unnecessary for the initial product.

Proposed dungeon specification: environment and permitted hazards; progression band and reward budget; intended lesson/challenge; required counters and at least one accessible alternative; enemy rosters, legal derived abilities, objectives and boss phases; encounter sequence and recovery opportunities; run-length target; permitted variations and incompatible combinations; reproducible seed where random composition is used. Enemy difficulty modifiers live in scenario/game state, never in mutated canonical creature records. Separate mechanical content from proposed lore; the generator must not resolve open cosmic mysteries or invent canonical powers.

Whole-run validation matters because Nick selected carryover: each individually beatable room does not imply a beatable dungeon. Screen recovery loops, unavoidable damage chains, permanent control loops, narrow rare-creature gates, and easy high-reward farming. Start with common/loaner roster coverage; simulation estimates are filters, not proof of fairness or fun. Assess novelty by changes in tactics and resource decisions, not names or scenery alone.

Three progression/content relationships to compare:

1. Endless numeric ascent: each new band increases power and asks for more training. Clear forward motion, but risks a treadmill, obsolete content, and expensive newcomer catch-up.
2. Bounded mastery with expanding challenges: growth reaches a stable range, while new enemy combinations, objectives, environments, and optional difficulty create new reasons to play. Preserves collections and authoring control, but needs rewarding goals beyond stat growth.
3. Chapters with bounded growth per chapter or tier: a visible campaign climb plus replayable generated assignments inside established bands. Can combine forward momentum and broad reusable content, but must explicitly decide whether future chapters raise the cap; no seasonal resets or automatic cap increases implied.

Current recommendation: prove a finite initial progression arc plus generated content within a few difficulty bands before deciding on future cap increases. Prototype three dungeons at comparable power using the same small creature pool but different solutions: focused boss interruption/control, protecting a vulnerable objective while handling adds, and managing attrition with limited recovery. Exact mechanics and fiction are proposals to test against the eventual combat rules.

Next discussion: compare the appeal of the next dungeon being tougher numerically versus demanding a different use of the crew; allow both. Show a concrete sample sequence before asking Nick to commit to a growth curve. Keep content-generation constraints as a first-class design workstream alongside combat and progression.

## Brief and initial recommendation

Explore a creature battler, a player-controlled exploration adventure, and ways to combine or separate them. Use Xalian nature and lore as the starting point. When a mechanic needs a conventional default, examine a named Pokémon game or format first; consider Digimon, Yu-Gi-Oh!, and Magic where they solve the actual problem better.

Initial recommendation: a compact, solo-first adventure through explorable districts, with a battle system that can also be launched independently. Prove one district and its battle loop before deciding whether these become two public games. A shared engine does not require a shared product, and shared creatures do not require a shared engine.

The proposed promise: “Explore damaged worlds with a crew whose bodies and abilities change what you can discover, then face trials that put your understanding of that crew to work.”

This is one candidate. A focused arena game or a noncombat expedition game may better match the experience Nick wants.

## Grounding and constraints

Read alongside:

- [Creature consumer contract](xalian-creature-data-structure.md), with the [master design](xalian-creature-system-redesign.md) governing conflicts.
- [Platform vision](xalians-platform-vision-and-economy.md), which distinguishes ratified decisions from recommendations.
- [Long Return brainstorm](xalians-long-return-spoke-brainstorm.md), an unratified exploration proposal.
- [Reclamation](reclamation-design.md), the successor to Tribute, and [Arcade](xalians-arcade.md). Avoid treating the older platform document's proposed Gwent spoke as a currently unbuilt game.
- [Validation principles](game-validation-principles.md).
- [Encyclopedia](../encyclopedia/encyclopedia.json), [internal continuity constraints](../encyclopedia/ENCYCLOPEDIA-INTERNAL.md), and `packages/content/json/planets.json` for authoritative histories.
- [Current Graviclaw template](../species-templates/graviclaw.json). Older consumer-document example values are illustrative and differ from the current template.

Established boundaries to carry forward:

1. Immutable, versioned individual records describe nature. Games derive their own rules; no creature XP, levels, permanent stat training, or permanent species transformation.
2. Names are not a shared Pokémon-style move list. Read instrument, action, medium, intensity, and the signature; give players a common mechanical vocabulary underneath individual names.
3. Use Xalia's elements and affinities rather than importing Pokémon's type chart. Decide the new game's interpretation explicitly.
4. Temperament describes behavior, never a damage or power bonus. Cosmetic finishes do not grant combat advantage.
5. Campaign saves may hold position, quests, supplies, and temporary condition. The shared append-only creature history is not a required gameplay database. Access progression must have an explicit account/game-save home.
6. New life comes from Generators; Scrambler Tokens contain encrypted genomes and come from Kozrak's Mercurius Machine. Finding a wild creature is not automatically a new generated registry creature.
7. Xalians do not speak dialogue, reproduce biologically, or permanently transform under current continuity. Player identity remains unresolved; do not silently introduce a normal human trainer population.
8. Keep Phantiri's moon weapon, Deepwater Black, and Veridium's origin unresolved and separate. A local campaign can have a satisfying ending without answering these mysteries.

These are current settings, not grounds to shut down brainstorming. If a concrete experience strains one, document the smallest proposed change for Nick instead of silently changing canon.

Implementation grounding: this checkout has Duel rule modules under `packages/rules/src/duel`, Reclamation gameplay under `apps/web/src/gameplay/expedition`, and Arcade modules under `packages/rules/src/arcade`. Duel is spatial capture-the-flag tactics, not automatically the desired menu battler. The `expedition` folder name does not prove the Long Return exploration concept is implemented. This workshop is not a full code audit.

## Research: what each reference contributes

The source column reports reference mechanics. The adaptation and caution columns are design judgments, not claims made by those sources. Research accessed 2026-09-13; no numerical formula below is presented as a settled reproduction of another game's rules.

| Reference | Observed mechanism and source | Useful Xalian experiment | Cost or mismatch |
|---|---|---|---|
| Pokémon Legends: Arceus | Visible encounters, differing dispositions, research progression, camps, traversal companions, and battles with action-order variation. [Official gameplay](https://legends.arceus.pokemon.com/en-us/gameplay/) | Observe before approaching; creatures help reveal and reach locations; expeditions return to a hub | Capturing and leveling cannot simply replace generation and immutable identity |
| Pokémon traditional battle baseline | The same official Arceus page contrasts its action order with prior games' usual one action per participant per turn and documents its four-move limit | Test a small command menu and discrete rounds before adding elaborate resources | Four commands is a prototype choice, not permission to cut or mutate the underlying ability list; verify a named mainline title before adopting exact switching, priority, accuracy, or damage rules |
| Digimon Story: Time Stranger | Single-player monster-taming RPG combining world exploration, collection, raising, relationships, and turn-based combat. [Official game page](https://www.bandainamcoent.com/games/digimon-story-time-stranger) | Make the crew relationship and journey central; give creatures meaningful roles beyond an isolated match | Raising/evolution mechanics require separate investigation and cannot become permanent Xalian transformation by default |
| Digimon Card Game | Costs move a shared memory gauge toward the opponent. [Official comprehensive rules, section 4](https://en.digimoncard.com/rule/pdf/general_rule.pdf?v251003=) | Test whether a powerful action should concede tempo, making expenditure a readable tradeoff | A shared gauge is a rival to simple rounds or energy, not an extra system to stack on top automatically |
| Yu-Gi-Oh! | Konami distinguishes summons that start chains from summons that do not; activated effects have explicit timing. [Official explanation](https://www.yugioh-card.com/en/play/psct/psct-5/), [rulebook hub](https://www.yugioh-card.com/eu/play/tcg-rulebook/) | Explicit timing and compact creature combinations; perhaps a single bounded reaction window | Long response sequences and highly bespoke exceptions burden readability and automated resolution |
| Magic: The Gathering | Mana gates expenditure; attackers and blockers create commitment decisions. [Official how-to](https://magic.wizards.com/en/how-to-play). The stack resolves responses. [Official stack explanation](https://magic.wizards.com/en/news/feature/stack-and-its-tricks-2017-11-30) | Opportunity costs, readable role combinations, and counters that reward anticipation | A full deck, land economy, and stack may turn companions into interchangeable combo components and overlap Reclamation |

Borrow solutions one at a time. Pokémon supplies the first baseline for familiar RPG questions, not an indivisible package. At each mechanic decision record the source game/format, the exact problem it solves, the Xalian adaptation, and what would make us reject it.

## Candidate experiences

Session lengths below are hypotheses to test, not delivery estimates.

| Direction | Typical play | Distinctive Xalian value | Main risk | Smallest proof |
|---|---|---|---|---|
| A. Arena circuit | Prepare a roster, fight a short battle, improve your plan, challenge the next opponent; 5–10 minutes per fight | Signature abilities, affinities, team budgets, Kozrak's tournament economy | Duplicating Duel without a compelling new combat experience | Same rosters in one-active and two-active battle sketches |
| B. Survey adventure | Walk a compact district, read creature signs, find routes, meet encounters, complete a local trial; 20–40 minute outings | Bodies, senses, environments, and collection all matter | World production can overwhelm the actual game; combat can interrupt exploration | One traversable district with two routes and one encounter |
| C. Expedition crew | Select a mission, scout branching scenes, spend supplies, solve problems, decide when to extract; 15–25 minutes | Broad creature coverage, incomplete information, trust in the crew | Menu checks may fail the desired feeling of walking through a world | Three connected scenes with competing solutions |
| D. Command/deck battler | Build combinations from creature actions and tactical support; 10–20 minute matches | Ability grammar can generate coherent tactical identities | Reclamation overlap; draw luck can hide the creature the player came to use | A small paper card set tested against ordinary command selection |

A fifth possibility is directly controlling a Xalian in real time. It strongly showcases movement and embodiment, but every body plan creates animation, camera, collision, and accessibility demands. Keep it available if physical control is the central fantasy; do not choose it merely to make battles look modern.

## One game or several

Three viable arrangements:

- **Integrated adventure:** exploration, acquisition, story, trials, and combat form one campaign. Strong continuity and attachment; greatest dependency and content burden.
- **Independent games:** an arena and an expedition each stand alone with shared registry creatures. Clear session promises and separate balance; risk of fragmented progress and repeated onboarding.
- **Adventure plus standalone battle access, recommended hypothesis:** one battle ruleset supports encounters and a practice/arena entrance. Campaign context changes objectives and scenario state; competitive presets remove campaign advantages. The arena remains independently playable without mandatory campaign progress.

Test the third arrangement first only if the adventure direction wins. Keep Duel and Reclamation's rules independent. Reuse verified infrastructure, creature reading, and presentation where useful; don't force exploration encounters into flag capture.

Split into separate games if battle fans resent travel, explorers repeatedly avoid otherwise well-designed combat, or the modes require incompatible action economies. Keep them integrated if travel makes roster choices meaningful and battles consistently pay off discoveries. Gather player evidence rather than deciding from code reuse alone.

## Acquisition: a first-order design problem

There are three different rewards hiding inside “find a creature”:

| Model | Emotional reward | Unresolved design work |
|---|---|---|
| Discover, then generate | “I found the species I now want on my crew” | Exploration can earn existing tokens or access to targeted generation. It cannot casually manufacture new tokens or copy genomes. Specify the source and scarcity of rewards |
| Recruit or rescue an existing individual | “That particular creature came home with me” | Define which creatures are unowned, how registry provenance works, what joining means, and how older populations relate to the plague |
| Both, clearly distinguished | Discovery expands generation choices; selected encounters recruit individuals | More onboarding and economic rules, but preserves both forms of attachment |

Recommendation: keep generation central, and compare one recruitment scene against one discovery-to-generation scene before deciding. Do not invent a capture device or universal genome scanner as established lore. Trading another player's creature requires a real authorized transfer, never an overworld encounter shortcut.

## A concrete experience to critique

Illustrative scene, not new canon: a crew enters a damaged wetland facility on Grimedes. A Graviclaw anchors a mechanism while another companion crosses an unstable passage. An alternate path avoids the work but leads through an exposed encounter. The player can investigate, withdraw, or commit supplies before choosing.

In the battle variant, that Graviclaw's gravitational snare restricts an enemy's repositioning while a companion advances the objective. In the exploration variant, related physical capabilities make a different route possible. Those outcomes are proposed game interpretations; check the actual individual's rolled abilities and capabilities before granting them. No creature with a nominally relevant species name automatically qualifies.

Return rewards could include a completed survey, access to a further district, and a token from a specified contract sponsor. None of this raises the Graviclaw's permanent stats. The attachment comes from remembering what this individual made possible.

The first milestone trial should test a learned interaction: stabilizing a site while surviving pressure, escorting someone, or beating an arena specialist. A sequence of local challenges can provide the anticipation of gyms without assuming eight elemental leaders and badges. Exact institutions and story justification remain proposals.

## Workshop sequence

Each pass starts with a concrete player situation, offers two or three credible options, gives a recommendation, and asks one main question. After Nick answers, record the decision and its consequences before advancing. Do additional targeted research when a choice depends on exact precedent. Avoid asking Nick to approve a large batch of disconnected mechanics.

| Pass | Decision | Artifact we produce | Exit criterion |
|---|---|---|---|
| 1. Fantasy and product shape | What should players most want to do: battle, explore, or lead expeditions? Together or independent? | One-paragraph promise; chosen lead direction and an explicit alternative | Nick recognizes the experience as the game he wants to play |
| 2. Player and crew | Who/what is controlled, camera, tone, audience, session length, primary input devices | First five minutes and a screen-flow sketch | Movement, relationship to creatures, and lore assumptions are explicit |
| 3. Discovery and acquisition | What does finding a creature grant? How does it join the collection? | One encounter-to-acquisition storyboard, including registry and reward implications | The payoff is desirable and preserves the generation premise |
| 4. Moment-to-moment structure | Walkable districts, route map, or scenes; battle frequency; rest and retreat | One full outing on paper | Each mode has a purpose and transitions preserve pace |
| 5. Combat skeleton, if needed | One or two active creatures; reserves; rounds versus timeline; direct orders versus autonomy | Two short battle transcripts using the same real creatures | Meaningful choices appear early and players can predict resolution |
| 6. Commands and counterplay | Ability derivation, signature treatment, resources, switching, status, typing, randomness, victory | Compact rules sheet and a mapping for the prototype creatures | Every command has a readable cost, purpose, and counter; unknown keys have fallbacks |
| 7. Field abilities and ecology | Sensing, traversal, hazards, behavior, alternate routes | A district interaction map | Several crew compositions can finish; different crews discover or spend differently |
| 8. Progression and trials | What replaces leveling; quests, destinations, rival encounters, setbacks, ending | A short campaign arc and failure/recovery flow | Clear reasons to return without permanent creature power or grinding gates |
| 9. Roster, economy, and fairness | Starters/loaners, budget or normalization, rewards, existing collections, trades | Economy flow and fair-play rules | Newcomers can play; rewards do not make an existing platform activity obsolete |
| 10. Presentation and production | Visual style, camera, animation burden, UI, audio, touch/keyboard, save/resume | Small art/interaction brief and scoped asset list | A small team can author a second encounter without rebuilding the framework |
| 11. Prototype and learning | What to build first and what evidence would change the design | Versioned prototype brief and playtest checklist | The chosen loop earns further investment, revision, or a deliberate split |

The order can change with the lead direction: an arena-first choice moves combat before world structure; a noncombat expedition choice replaces combat passes with hazard and teamwork resolution. Nothing requires completing eleven theoretical passes before trying a paper scene.

## Provisional combat baseline to challenge in passes 5–6

Use three roster members for the first experiment; compare one active with two active. Two active is my leading hypothesis because it gives protective, control, and support roles somewhere to matter. One active may be substantially easier to read.

Try a small visible command set derived from the actual record, plus universal game actions such as guard, switch, or withdraw. Do not invent missing creature abilities to fill four slots. Try simple discrete rounds first. Only test a memory-like tempo gauge or action timeline if simple rounds cannot create the desired tradeoffs. Keep accuracy, critical hits, damage variance, and hidden commands separately switchable in paper experiments; do not import them as a bundle.

Start with one control effect, one protection effect, and one damage interaction. Use the game's derived costs or normalization to address roster fairness. Larger ability catalogs and signature exceptions come after the common grammar proves legible. No fixed damage formula is recommended yet.

## Prototype ladder and validation

1. **Paper proof:** actual records from a small representative roster, one encounter, two competing rules variants. Include a slow controller, a mobile creature, a support option, and an environmental specialist. Select exact individuals from current versioned data before balancing.
2. **Greybox loop:** one hub or setup screen, one short location, one discovery, one confrontation or hazard, retreat, return, and save/resume. Target about 10–15 minutes. Placeholder art; no economy payouts required.
3. **Playable slice:** one polished district, two viable routes, roughly 6–8 representative species, three encounter purposes, a local climax, and a clear acquisition payoff. Numbers are scope caps to discuss, not commitments.
4. **Independent mode test:** if combat belongs, expose the same battle directly with fixed loaner rosters. Compare whether players want to replay combat, return to exploration, or both.
5. **Expansion gate:** add a second contrasting biome only when the first loop is comprehensible and worth repeating. Expand mechanics for observed gaps. Network PvP, co-op, a full 14-world campaign, elaborate housing, and extensive cinematics remain later candidates.

Before human play, verify legal actions, completion without rare rolls, save behavior, deterministic replay where applicable, roster dominance, and the absence of progression dependencies on creature history. For competitive trials, compare mirrored setups and trivial policies; report uncertainty rather than claiming a simulator proves fun.

During play, ask: What did you want to do next? When did your choice matter? Which creature do you remember and why? Did a battle interrupt discovery or give it a payoff? Could you explain the setback before seeing the result? Can a different roster finish by a different method? Use those answers to revise the experience, not merely tune damage.

## Decision ledger

| ID | Topic | Status | Current position | Reopen when |
|---|---|---|---|---|
| W01 | Lead fantasy | Confirmed current focus | Battle-based game; Dungeon Boss is the main reference, blended with Pokémon and Xalia | Nick changes scope or play evidence suggests a variation |
| W02 | Integrated or split | Open | Standalone dungeon, adventure integration, arena, or multiple variations remain available | Mode preference and pacing evidence |
| W03 | Acquisition | Open | Compare generation-linked discovery with recruitment | Encounter storyboard and canon/provenance review |
| W04 | Player identity | Open, inherited canon question | Describe control function without inventing ancestry | Player/crew pass |
| W05 | Progression | Reopened by Nick | Explore game-specific external creature progression; no universal level; sharing and trade behavior undecided | Compare growth models and test impact on boss learning |
| W06 | Combat format | Unratified test, revised | Start by testing four active creatures inspired by Dungeon Boss; compare three for readability | Paper encounters |
| W07 | Between-battle state | Direction accepted by Nick | Modest carryover of damage and ability expenditure; limited predictable recovery; tactics and whole-run management both matter | Tune recovery through sample runs |
| W08 | Progression sharing | Deferred by Nick | Per-game opt-in progression only for now | Explicit future request to revisit |
| W09 | Renewable content | Priority identified by Nick | Establish guidelines and constraints for continually creating new levels; generation method and progression curve open | Test quality and variety with a small dungeon grammar |

Next conversation: review the miniature campaign below, beginning with the reward after the first dungeon. Sharing is deferred; growth magnitude and trade behavior remain open. Carryover direction is accepted; numerical recovery rules remain open. Do not treat silence as selection.

## Miniature campaign v0.1: the first three dungeons

Nick agreed to explore a concrete miniature campaign. This is a discussion draft, not approval of its mechanics, progression, rewards, or new lore. Working titles describe challenges, not canonical locations. Assume a menu-launched tournament series for this exercise because token prizes have an established source in the tournament economy. The same encounters could later appear in a mission setting with appropriate fiction. No overworld required or ruled out.

Prototype assumptions: four active creatures, three encounters then a boss per dungeon, approximately 10–15 minutes per run, persistent health and ability expenditure within the run. Fixed basic attacks, guard, healing, enemy intent, and ability recovery are provisional game rules. Begin each new run recovered; failure does not destroy or alter owned creatures. These last two points are recommendations, not previous user decisions. Use loaners if needed to avoid requiring a fourth owned creature or a lucky generated roster.

| Dungeon | Sequence | Boss and viable answers | Completion reward proposal |
|---|---|---|---|
| 1. Break the Guard | One straightforward enemy group; introduce a protector shielding an attacker; then a protector plus a fragile support | A guardian visibly prepares a heavy attack while a support sustains it. Remove support and defend against the attack, or use a legal control ability to delay the threat. Neither a particular species nor a rare trait is required | A guaranteed first-clear Scrambler Token, access to dungeons 2 and 3, and a first game-specific development milestone whose form is the current discussion |
| 2. Stop the Reinforcements | Introduce a caller with a visible reinforcement timer; test target choice against a dangerous attacker; combine that choice with protection | A commander periodically calls additional enemies, with a strict living-add cap. Focus the commander, delay its call if the eventual rules permit it, or manage the adds with efficient multi-target abilities | Another development milestone plus a finite first-clear reward; no additional token amount committed |
| 3. Save Enough for the End | Fragile attackers invite spending area attacks; a durable group tests focus versus resource use; a mixed group tests whether the player has learned when expenditure is worthwhile | A boss with a visible periodic vulnerable state rewards arriving with usable abilities. Basic attacks still advance the fight; depletion is a disadvantage rather than a permanent lock | Chapter completion, a larger finite first-clear prize, and access to further authored/generated assignments; exact prize values open |

Room rewards: show a small earned reward after each win; prototype a game-local reward counter with no claim of a newly canonical currency. Distinguish earned/banked rewards from the unearned boss prize in the UI. Starting recommendation is to retain completed-room rewards after a failed run, with most value reserved for completion and no partial-award replay duplication. Validate farming incentives before choosing payouts. Repeated generated variants must not recreate first-clear token rewards without an explicit release/reward budget.

Recovery: for the paper example, offer one guaranteed camp before each boss with a choice between restoring some health or restoring some ability availability. Exact amounts and the underlying cooldown/resource model remain unspecified. Tune the encounters so either choice can be viable given different preceding decisions. Compare this with small automatic recovery if the choice becomes obvious. Avoid stall-to-heal/recharge exploits, including farming summoned adds for resources.

Progression comparison after dungeon 1, holding dungeons 2 and 3 fixed:

- A: modest numerical improvement to derived combat stats; the same action set.
- B: choose one game-specific refinement of an existing ability, such as longer control versus quicker recovery. The unmodified signature is already available, and this is not a new canonical power.
- C: a small numerical improvement plus one refinement choice. Leading recommendation, but not approved.

For this example, the starter crew before that reward can already complete the next two dungeons through good play. This isolates what growth adds without making a numerical gate decide the result in advance. Later campaign tiers may have explicit progression bands; that remains open. New generation rewards must remain usable without hours of catch-up, and none is required as the sole counter to the next boss. Cross-dungeon permanent injuries, equipment, mastery caps, transferable training, and XP curves remain unselected.

Lesson for the content-authoring system: specify encounter roles and decision pressure first, then assign creatures whose current records support those roles. Do not manufacture a caller, healer, or protector ability on an unsuitable Xalian to fit a template. Reinforcements are arriving existing opponents in scenario state, not creatures creating new life. New variants must change at least one tactical or resource decision while retaining a readable answer; reject incompatible control/recovery loops and enforce whole-run accessibility using representative common or loaner crews.

Nick's response: support all three reward experiences. Experience should be the default reward, game-specific skill development the next layer, and Scrambler Tokens an occasional reward. Token frequency must balance earned scarcity with enough availability to sustain interest in the universe. A token for the first win is a positively received proposal, not yet a defined entitlement. Numerical growth magnitude, XP allocation, and skill mechanics remain open.

## Reward hierarchy, updated 2026-09-13

Confirmed direction: routine game-specific XP; less frequent skill development; occasional Scrambler Tokens whose cadence is not yet set. Supporting new-creature rewards does not mean every dungeon must award a creature or token.

Recommended interpretation to discuss: XP advances a game-specific creature development track. Some milestones improve derived combat stats, and selected milestones offer refinements of existing abilities. This connects skill development to ordinary play without immediately inventing a second skill currency. Exact level curve, allocation among active/reserve creatures, growth ceiling, and whether skills also require challenges remain undecided.

Provisional first-win offer: one guaranteed token for an account's first completion of the introductory dungeon in this game. Nick said "first win"; interpreting it as this introductory completion rather than every dungeon's first clear is a recommendation requiring clarification. A generated dungeon's new identifier must not automatically create an unlimited token entitlement. Any later token milestones should belong to an explicitly budgeted reward schedule rather than the content generator. Existing platform reward sources must be included when tuning total issuance.

Illustrative reward sequence, no numeric rates committed: room victory awards XP; dungeon completion awards an XP bonus; crossing selected development milestones grants a skill choice; the proposed introductory clear additionally grants a token. Later token awards remain unselected. Skill refinements retain creature identity and ability grammar. XP awarded within a failed run, participation eligibility, and prevention of trivial opening-room farming need explicit rules before implementation.

Next design question: what should a skill-development milestone change? Leading proposal is a choice between refinements of an existing natural ability, with limited equipped choices and reversible selection so players can adapt to new dungeon mechanics. These refinements and respecialization rules are proposals, not approved features.

## Perk-tree direction, 2026-09-14

Nick prefers specialization and proposes an XP-driven perk tree: unlock perks to reach further perks, including improvements to signature duration, intensity/effectiveness, and frequency. He particularly enjoys perk trees but wants a fit assessment rather than inclusion regardless of quality. Tree topology, point economy, exact effects, caps, exclusivity, and respecialization are not yet approved.

Assessment: a compact perk tree fits the repeated-dungeon loop, lets experience create choices, and reinforces attachment to an individual's signature. It fails if every build eventually buys all benefits, obvious damage upgrades dominate, or repeated dungeon-specific resets become busywork. Recommendation: begin with a signature-centered tree and a limited point budget, with prerequisites and optional mixing of early branches. Do not yet create a large tree per ability.

Illustrative control-signature tree, contingent on eventual combat rules: the baseline signature is available at the start. An effect branch grants longer restraint followed by improved restraint effectiveness (or another grammar-compatible magnitude if effectiveness has no modeled role). A recovery branch improves reuse timing followed by a conditional partial refund when the affected target is defeated; refunds cannot recursively trigger and are capped. Deep choices are alternatives under the proposed budget, not simultaneously acquired free bonuses. Exact turn counts, costs, and probabilities require a turn/resource model before tuning. Do not assume every snare removes all enemy actions.

"Intensity" improvements affect the game's derived interpretation of an ability, never the immutable record's intensity field. Duration, potency, area, and cooldown are not interchangeable forms of intensity; define what magnitude means for each action. Full-action denial duration and reuse must be assessed together to prevent permanent boss locks. Preserve a useful boss interaction through clearly signaled partial effects or recovery windows rather than making control signatures universally ineffective on bosses. Those resistance mechanics remain proposals.

Authoring recommendation: a shared small foundation of progression rules plus signature-focused branches built from action grammar, with curated species-specific exceptions where useful. All individuals of a species can use the same authored tree structure while their own records inform baseline effects; optional nodes must have valid equivalents or be omitted under a documented rule. Never grant an unsupported body part, affinity, or natural act just to fill a branch. Avoid procedural perk generation in the initial prototype; generated dungeons benefit from a stable, testable set of player mechanics.

XP should unlock perk points at selected milestones, with points allocated to prerequisites in a game-specific profile. Spending points rather than permanently unlocking every node is the leading proposal. Respecialization between runs is recommended for experimentation but not yet accepted. New owners, catch-up, game-level ceilings, and ownership transfer remain open.

Next useful comparison: limited points that permit combining shallow branches but force a choice of deep specialization, versus unlocking the whole tree over time and equipping a limited subset. Recommend the former initially because it makes prerequisites and investment meaningful with one simple budget.

## Paid reallocation and reusable perk paths, 2026-09-14

Nick rejects free at-will perk reallocation. Reallocating spent points should cost credits, with price and balance deferred. This supersedes previous recommendations for freely changing builds between runs. Credit provenance is unresolved: do not assume these are Arcade Credits, Scrambler Tokens, premium currency, or an existing spendable balance. Recommend a game-local earned credit balance unless later platform economy decisions specify otherwise. Exact charging unit (point, branch, or full reset), dependency refunds, and protections after developer balance changes remain open.

Nick proposes authoring trees for reusable categories rather than each species: specifically a shared path for creatures whose signature action is snare, and potentially an element path competing for the same perk points. He also mentioned archetype categories as an alternative. Categories and their exact selection rules are not all ratified. This supersedes the previous species-specific authoring recommendation.

Recommended first model: a creature gets its signature-action path and its primary-element path, with one shared point budget across both. Graviclaw thus has Snare and Dark paths. Primary element is a proposed eligibility rule; secondary-affinity paths are deferred rather than automatically granted. Treat the creature record's named archetype as a separate dimension, not a synonym for signature action. Avoid simultaneously adding action, element, archetype, trait, and species trees before proving that two paths create sufficient choices.

Action path defines development of the game's reading of the signature's natural act: snare restraint magnitude, duration, or reuse. Element path expresses the established element fantasy, e.g. Dark concerns gravity/void/bounded time effects, not generic ghost or shadow effects. Element nodes may modify existing eligible abilities or typed defenses as explicit game rules; they cannot conjure unsupported abilities or alter immutable affinities. Signature medium and primary element are distinct fields: an action path modifies the signature regardless of medium; an element node must state whether it affects matching-medium abilities or a separately defined defensive effect. Do not silently assume a primary-element path affects every signature.

Example builds, no approved effects or numbers: deeper Snare investment prioritizes restraint; deeper Dark investment prioritizes eligible gravitational/typed effects; shallow investment in both provides broader benefits while forgoing expensive deep nodes. One shared finite budget is recommended but the total and cap remain unselected.

Reusable trees need a semantic contract: every Snare-derived signature must expose the baseline effect that a universal Snare node modifies, or that node needs explicit eligibility and a documented alternative. Avoid species-by-species exceptions as the default. Instrument, medium, and other record facts can constrain eligibility, but should not create confusing empty branches. State stacking order and caps when both action and element nodes affect the same ability; test duration/reuse combinations for permanent control. No exact perk is valid until the underlying battle effect is defined.

Paid respecialization and generated dungeons must be designed together. Dungeon previews should reveal enough information to make preparation meaningful, but ordinary generated challenges should admit multiple approaches without requiring frequent perk resets. Alternative responses include target choice, ability timing, supplies, or roster selection; don't make duplicate rare creatures necessary. Propose a single previewable reallocation transaction: refund dependent descendants if an upstream prerequisite is removed, preserve unspent points, show final cost and build before confirmation, and only allow changes outside active runs. These transaction details remain recommendations.

Next recommended prototype: Snare plus Dark as two small paths, then apply the unchanged Snare tree to another currently valid snare-signature creature to check reuse. Select that creature from actual data before claiming coverage. First settle what the Snare and element paths promise; numerical costs and broader coverage follow combat modeling.

## Perk sketch v0.1: Snare + Dark

Discussion example requested by Nick, not approved rules. Illustrative budget: eight points total across both trees. Each tree has a one-point root, two alternative two-point branch nodes, and a four-point capstone beyond each branch. A complete deep branch costs seven points. Both shallow branches may be purchased; capstones require their own branch and root. Eight points is an example of eventual allocation, not starting points or a selected level cap.

Snare signature-action tree:

- Practiced Restraint (1): improves the signature's restraint effectiveness within the eventual control model; not damage or canonical intensity.
  - Lasting Hold (2): extends restraint duration within a global duration/reuse safety bound.
    - Lingering Hindrance (4): when restraint ends normally, a weaker brief hindrance follows. Does not reapply full restraint; precise hindrance awaits the combat rules.
  - Quick Recovery (2): reduces the signature's recovery requirement within a minimum reuse bound.
    - Release and Reset (4): if an affected target is defeated, refund part of remaining signature recovery, at most once per activation. No recursive triggers or extra refunds from additional targets.

Dark primary-element tree:

- Dark Acclimation (1): modestly reduces incoming Dark-type damage.
  - Focused Output (2): increases damage of existing Dark-medium damaging abilities. It does not affect control duration, cooldown, other media, or grant a new attack.
    - Decisive Output (4): grants additional Dark damage against a target below a visible health threshold. No inherent control bonus and no guarantee a snare signature deals damage.
  - Measured Defense (2): using the proposed universal Guard action strengthens Dark damage mitigation for that guard window.
    - Steady Recovery (4): at an authored between-battle recovery point, gain a small additional health restoration. No extra gain from waiting in combat or repeatedly triggering an unchanged checkpoint; no restoration of ability resources.

Dark tree limitation made explicit: these first nodes test elemental combat affinity rather than fully capturing the gravity fantasy. They may be too generic or niche; inspect player reactions before authoring more element trees. Focused Output and its capstone require a real Dark damaging ability in the individual's game-derived kit. Do not assume Graviclaw or a Snare signature necessarily satisfies that condition. This example's Dark-offense branch is conditional; if significant numbers of Dark creatures lack eligible damage, replace that branch with broadly applicable elemental mechanics rather than shipping dead nodes. Guard and recovery behavior are also proposed, not existing approved rules.

Build arithmetic:

- Long-control specialist: Practiced Restraint 1 + Lasting Hold 2 + Lingering Hindrance 4 + Dark Acclimation 1 = 8. Stronger sustained control, no frequency improvement.
- Dark endurance specialist: Dark Acclimation 1 + Measured Defense 2 + Steady Recovery 4 + Practiced Restraint 1 = 8. Emphasizes mitigation and run endurance, no deep control perks.
- Flexible controller: Practiced Restraint 1 + Lasting Hold 2 + Quick Recovery 2 + Dark Acclimation 1 + Measured Defense 2 = 8. Both shallow control improvements plus Dark defense, no capstone. Duration plus frequency must pass combined uptime limits; this combination cannot be assumed balanced because it lacks a capstone.

Paid reallocation applies; exact fee and currency identity remain open. No XP curve, point cap, node cost, effect magnitude, or named perk in this sketch is approved. The source of the tree is the action/element category, not species identity. The next iteration should assess whether the element path should emphasize broadly usable elemental mastery or more distinctive element-themed interactions without granting unsupported natural abilities.

## Elemental tree authoring direction accepted, 2026-09-14

Nick accepts the starting structure and favors generalized rules for most branches across all elements, with a small creative element-specific portion. Revisit creativity if the shared structure proves boring. This accepts the authoring direction, not every example node, cost, eight-point cap, or unresolved effect in v0.1.

Recommended implementation design: one elemental tree template parameterized by element, shared prerequisites and cost structure, and one explicitly designated element-specific node or capstone per tree initially. Exact location and count remain proposals. Shared node families may cover typed resistance, enhancement of existing matching-medium effects, and defensive efficiency. Do not multiply potency on all effects indiscriminately: damage, healing, restraint, and protection need separately defined game interpretations and caps. No node grants a missing action or affinity. Exclude or replace ineligible nodes under a documented consistent policy, and do not silently create different point prices or blocked prerequisite paths for particular species.

The signature-action tree stays responsible for development of that signature's act, while the elemental template states the matching-medium effects it modifies. Joint action/element benefits must be composed and tested together. Preserve the same point budget between generic and element-specific versions; creativity must not make one element receive an extra free perk or greater total power allocation. Specific identities remain grounded in element canon.

Next workstream: establish the battle action and recovery model before assigning exact perk effects or creating all action/element trees. Recommend discussing whole-squad direct commands and turn order next; four active creatures, speed categories, and automatic enemy behavior remain hypotheses, not confirmed mechanics. Review a concrete round rather than more progression trees until the combat model makes duration and frequency meaningful.

## Whole-squad planning selected, 2026-09-14

Nick prefers planning the entire squad in advance for this game. Individual turn-by-turn command selection is better suited to other concepts he has in mind. This supersedes the preceding recommendation for commanding each creature as its turn arrives. Squad size, enemy information, resolution order, and reaction rules remain open.

Proposed round: inspect state and enemy intent; assign one order per active creature; revise freely before committing; commit the entire squad; resolve both sides' actions in an interleaved sequence; show the resulting state and plan the next round. Planning together does not automatically imply simultaneous effects or the entire friendly squad acting first. Orders and targets are locked at commit; subsequent resolution does not allow manual replanning. Enemy decisions should be committed before seeing player orders in ordinary PvE, so telegraphs are reliable and the enemy cannot secretly counterpick the submitted plan.

Recommended enemy-information starting point: reveal upcoming action/role and significant threats, including boss windups, without necessarily revealing every target. Exact target visibility and any intentionally hidden actions remain decisions. Player-facing uncertainty must be marked; do not imply a precise preview when targets, conditional effects, or random outcomes can change. A fixed visible action sequence is recommended for initial tests, with speed/priority derivation and tie rules still unspecified.

Illustrative four-creature planning situation: an enemy is preparing a heavy strike and another is supporting it. The player orders a legal control signature against the attacker, focused damage against the support, a protective action, and a recovery action. Whether control prevents, weakens, or leaves the prepared strike unchanged depends on the eventually defined Snare effect; do not imply restraint cancels attacks by default. Preview the resulting order so players can see whether setup precedes payoff. Deeper control combinations and frequency perks now require round-aware timing rules.

Invalidated orders need a predictable policy. Proposed baseline: an ordinary attack whose target falls retargets to a legal living opponent by an explicit deterministic rule. A targeted signature with no valid intended target does not automatically spend its valuable resource on another foe; show a no-valid-target result and retain the resource, with the action opportunity consumed. Healing a full-health ally, departed targets, disabled actors, and loss of requirements need separate clear handling. These defaults are unapproved; test them for wasted-turn frustration and reserve-heal exploits. Optional player-selected fallback orders can be explored later, not added to the initial planning interface automatically.

Next decision: enemy intent visibility (full orders versus broad intentions). Recommendation: informative telegraphs and explicit boss tells, tested against exact orders in a paper encounter. Preserve the user's chosen commitment model regardless of which information policy wins.

## Hidden orders and varied enemy behavior, 2026-09-14

Nick selected mostly hidden enemy orders. There should generally be no indication of an enemy's next action before it takes its turn. A charge-up is an executed action creating a visible state for a later powerful attack, not a pre-action intent preview. This supersedes the earlier recommendation to display broad intentions or a full future action sequence. Current health, conditions, and completed actions can remain visible. What speed information is shown remains open; it must not reveal hidden move selections inadvertently.

Dungeon learning is central: early encounters expose moves and behaviors; later encounters combine related ideas; the boss develops those same concepts with limited unfamiliar variations. Proposed generation method: define the boss's core challenges, then construct a teaching sequence of earlier encounters. Track introduction, reinforcement, combination, and boss extension of each essential concept. A novel boss mechanic should have a reasonable response grounded in learned rules rather than depend on prior failure or a rare roster choice.

Nick agrees that behaviors should be recognizable and conditional, and explicitly wants randomness in enemy move selection and targeting. Roster choice is another source of encounter variation. Do not reduce an enemy to a fixed repeating script or imply learned patterns reveal an exact next move.

Recommended behavior model, not final AI rules: determine legal actions from the actual creature/game state; apply authored behavioral priorities and conditions; sample from weighted eligible choices; choose targets using move-specific weighted preferences. Examples of conditional priorities include sustaining an endangered ally or using a charged ability when ready. A boss that charges should have a reliable, meaningful relationship between that state and its subsequent threat; random variation can govern target or compatible follow-up without casually invalidating the learned cue. Exact weights, deterministic exceptions, target visibility, and ability availability remain open.

Enemy decisions use the public pre-commit battle state and scenario behavior, not the player's unexecuted submitted commands. Commit hidden orders before player-plan revelation. Randomness should be seedable/replayable for validation; whether retries reuse or change seeds is a separate player-experience decision. Resolve invalidated orders with defined shared rules, not adaptive counterpicking during playback.

Distinguish action/target randomness from hit chance, damage variance, and critical hits. Only the former is selected here. Further randomness remains open and should be assessed separately.

Whole-run tests should assess outcome distributions across enemy rolls and several representative legal crews, including repeated focus on one target and unfortunate combinations of control or heavy attacks. Account for the selected carryover rules. If bad draws repeatedly remove meaningful player responses, narrow the relevant choices or introduce legible limits rather than silently rerolling outcomes. The aim is predictable possibilities with uncertain selection, not uniform random actions or a guaranteed win for every crew. "Any creatures" means players can choose their crew; no forced specialist roster or universal viability guarantee has been ratified.

Next discussion: action-order and round-resolution rules under simultaneous planning and hidden orders. Resolve whether both sides interleave by game-derived speed, how priority works, and how defeated targets or disabled actors affect already-committed commands before pricing cooldown/duration perks.

## Interleaved resolution accepted, 2026-09-14

Nick confirmed the proposed resolution direction: both squads plan and commit their orders; actions from both sides interleave by a game-derived speed/initiative rule; faster creatures act earlier but do not receive extra actions solely from speed; enemy move choices remain hidden until execution. Exact speed formula, move priority, tie-breaking, and visibility of ordering information remain open. Four active creatures is still a prototype assumption rather than a separately settled squad-size requirement.

Proposed baseline for the next discussion, not yet approved: ordinary living/eligible creatures receive one action opportunity per round; order derives from speed at round start, with speed changes during resolution taking effect next round to keep commitments understandable. No move-priority exceptions in the first paper test unless a specific necessary interaction justifies one. Ties need an explicit side-neutral rule; no formula or randomness policy selected yet.

Order invalidation recommendations: an actor defeated before its opportunity loses that action; an ordinary attack against a defeated target retargets by a defined legal-target rule; a targeted signature whose selected target is no longer valid holds its resource and consumes the action opportunity rather than spending automatically on a different target. Whether signatures also retarget, whether fallback targets can be set, healing-target handling, and resource payment timing remain decisions. A creature under a status only loses or changes an action if that status explicitly says so; Snare is not implicitly a stun or interrupt. Use consistent, disclosed rules for both teams and avoid enemy replanning against hidden player commands.

Illustrative sequence: a fast friendly creature defeats the support enemy; that enemy loses its pending action; a surviving enemy executes its previously selected order; a slower friendly attack originally aimed at the support follows the chosen fallback policy. This is the first concrete case to review because it affects the value of focusing damage, speed, and expensive signatures.

Next question: when a selected enemy target falls before an order executes, should the creature automatically redirect its attack/signature or preserve the expensive signature for a later round? Evaluate ordinary attacks separately from costly signatures.

## Preserve the selected move when retargeting, 2026-09-14

Nick dislikes a creature doing nothing when its selected signature target is defeated. He considered conserving the signature and falling back to an ordinary move, but identified the unresolved selection problem: creatures have multiple non-signature moves, not necessarily a single default attack. He leans toward executing the committed signature on another target, with responsibility on the player to plan its use carefully. This is a preferred direction; exact fallback behavior is still being discussed.

Assistant recommendation: preserve the committed move and automatically redirect it when its selected target becomes invalid, using a disclosed deterministic legal-target policy. Apply the same principle to non-signature moves and both sides. Replace the earlier signature-specific recommendation to hold the resource and consume the action opportunity merely because the original target fell. Do not silently substitute a different move or invent a universal default from the record's ability list.

Proposed target policy for a single-target offensive move: retain the selected target while valid; otherwise choose the next legal living enemy in a stable visible formation order, wrapping as necessary. Formation and legality rules await the battle model. Avoid hidden optimal targeting that chooses based on weakness, kill potential, or unpublished enemy information. Area, ally-targeted, self-targeted, positional, and conditional moves require their own explicit valid-target definitions; a move never changes target category. A target being resistant or tactically undesirable is not itself invalid unless the move's rules say otherwise.

On execution, the redirected signature pays its normal resource/recovery cost even if its effect is less useful than intended. This supports commitment and makes speed/focus-fire planning matter. If no legal target exists, or the actor is defeated or unable to execute the move, retargeting does not override that condition. Proposed no-target handling: do not charge an unexecuted move; if the encounter is already won, terminate resolution without expending pending abilities, particularly important for dungeon carryover. Disabled actor resource treatment requires an explicit payment-timing rule before implementation. No valid target is a true exception, not an excuse to preserve a usable signature against a less favorable target.

Worked case: two friendly creatures target an enemy healer; the first defeats it; the second's committed snare signature redirects to the next legal enemy and incurs normal recovery. If that enemy is the boss with reduced susceptibility, the signature still executes according to those rules; no automatic conversion into a cheaper attack. If the healer was the final enemy, the encounter ends and pending moves are not spent. Exact target policy and resource details remain recommendations awaiting acceptance.

## Retargeting accepted and move availability proposed, 2026-09-14

Nick accepted the preceding recommendation: preserve and redirect the selected move if its preferred target is invalid; use a predictable next-eligible-enemy rule in fixed visible formation order for single-target offensive moves; retain the move's targeting restrictions; spend normal cost when executed even on a less favorable valid target; do not spend pending moves after the encounter is won or when genuinely no legal target exists. Exact formation representation and non-offensive target policies remain implementation/design details. This supersedes the earlier signature-preservation recommendation for situations with another legal target.

Next discussion proposal, not approved: derive battle commands from each individual's existing abilities, with the signature always represented. Start by exposing the actual small ability list rather than introducing a four-slot equipment system immediately. If actual records produce unwieldy menus, revisit a selection limit using data. Distinguish one selected move per round from one move total in a moveset. Never invent missing abilities to fill a presumed slot count.

Recommended initial resource experiment: move-specific recovery measured in rounds; repeatable modest moves and longer-recovery strong moves/signatures; no additional shared mana pool initially. Derive cost from the move's actual game effect, not signature status alone. Require at least one usable legal combat option per creature/round through explicit derivation rules or a game-defined Guard/Recover action. A repeatable nature-compatible command must be selected/derived from actual record abilities, not silently assumed to exist for every generated creature. Recovery, guard, and a baseline repeatable option are still proposals.

Define cooldown text in remaining unavailable planning rounds. Example: use a move in round 1; a two-round recovery means unavailable in planning rounds 2 and 3, available in round 4. Carry remaining recovery into the next encounter without a free refresh; authored recovery points can explicitly reduce it. Only executed moves enter recovery under accepted no-valid-target/end-of-encounter rules. Exact decrement timing and interruption costs need implementation specifications.

Automatic recovery by elapsed rounds risks deliberate stalling against weak enemies to recharge before the next encounter. Flag this as a core design test rather than assuming cooldowns solve dungeon resource management. Compare cooldowns against finite per-run charges or a shared resource before ratification; use representative full runs and include baseline survival actions. No recovery model has yet been chosen.

## Per-battle move uses proposed by Nick, 2026-09-14

Nick imagines multiple battles per dungeon, a signature usable perhaps once per battle, and separate use allowances for the other moves. Across four example secondary moves there should be ample total uses, but an individual move should have sufficiently few uses to discourage relying on it exclusively. He requests a critique; exact counts and this model are not yet ratified. This supersedes the assistant's recovery-timer preference as the current candidate to evaluate.

Interpretation to make explicit: allowances refresh at actual encounter boundaries, not at waves, reinforcements, or boss phase changes. Health can still carry between battles, but ability expenditure would ordinarily not carry across encounters. This revises the earlier accepted combined health/ability carryover model if chosen; it is not merely a new cooldown formula. Pre-boss ability-restoration camps would need redesign. Perks affecting frequency could improve a secondary's allowance, but a second signature use is a substantial exception and should not be an ordinary cheap increment.

Advantages: simple per-move counters; no shared mana pool required; no cooldown refresh from passing; encourages allocating moves within encounters. Remaining attrition exploit: players may postpone killing the last enemy to spend unused healing uses before a battle refresh. Check healing conservation, full-run damage/recovery budgets, and survival tools rather than claim charge limits eliminate stalling entirely.

Risks and tests: (1) sufficient total charges is not sufficient useful charges when some moves have no legal/effective targets or require conditions; (2) a control/support-heavy loadout must not be forced into repeated useless actions merely to rotate; (3) long bosses, disables, damage mitigation, or low-output parties can exhaust usable offense; (4) one signature per battle can encourage automatic round-one use unless later states create genuine timing opportunities; (5) count limits only bind if encounters last long enough; (6) target-invalidated signature expenditure follows the accepted retargeting rule and may feel severe with a single use, so rules must be clear; (7) encounter splitting changes both signature and healing supply, so content budgets must account for encounter count and boundaries, not just total enemies.

Recommendation: test one signature charge with unequal secondary allowances based on effect strength/role, enough aggregate useful actions for expected battle duration and a generous long-fight margin. Don't assign "three each" without measuring battle lengths: four attacks with three uses give twelve nominal actions, not necessarily twelve useful rounds. Every participating creature needs a nature-compatible low-output, no-charge baseline command or another explicit softlock protection. A baseline command would be a deliberate game-derived option, not automatic substitution of a committed move or an unsupported new natural ability. Whether it exists remains open. A state-changing or timed resolution rule may be needed if no possible remaining actions can advance the encounter.

Nick's reference to four secondary moves expresses a desired loadout example, not proof every immutable record has that many non-signature abilities. Inspect real distributions before fixing slots or promising identical action coverage. Signature perks should initially focus on effect magnitude and other refinements compatible with a charge model; replace cooldown/refund nodes rather than retain stale effects. Cost timing, refresh rules, caps, and exhausted-move behavior need specification after choosing the model.

## Knockout consequences: comparison and recommendation, 2026-09-15

Nick questions automatic between-battle revival as too forgiving and asks how other games balance consequences and enjoyment. No knockout/revival policy is accepted yet. Earlier automatic partial-health revival was only the assistant's proposal.

Historical comparison: original Dungeon Boss community documentation distinguishes Campaign consumable healing/revival from Tower of Pwnage, where health/cooldowns carry across floors and Revive/Health/Energy/Continue potions are prohibited. The Tower supports management of a broader roster and specific resurrection abilities, so its difficulty cannot be copied directly into a fixed starting squad. Sources: https://dungeonboss.fandom.com/wiki/Terminology and https://dungeonboss.fandom.com/wiki/The_Tower_of_Pwnage (community-maintained, later original-game rules; not a launch-version specification). Pokémon Y's official manual describes full-party fainting as a loss with some money forfeited and a return to the last Pokémon Center/home: https://www.nintendo.com/eu/media/downloads/games_8/emanuals/nintendo_3ds_2/pok_mon_y/ElectronicManual_Nintendo3DS_PokemonY_en.pdf . Darkest Dungeon offers a substantially harsher permadeath reference, not a proposed Xalian ownership policy: https://store.epicgames.com/p/darkest-dungeon/?lang=de .

Revised assistant recommendation: knockouts persist for the run unless an explicit limited revival resource is used; no automatic revival merely for winning an encounter. Test one shared between-battle emergency revival per run, restoring partial health, as an illustrative allowance rather than settled quantity or currency expenditure. Generic healing must not automatically revive; healer eligibility and revival eligibility are distinct, with rare support design still separate. A full-party knockout ends the run in this proposal; a between-battle rescue is not a paid continue. At run end, creature ownership and permanent game development survive; a fresh attempt starts with a recovered crew. Retain earned ordinary progress, reserve boss prizes for completion, and allow retreat between encounters. These reward, retry, retreat, and recovery details remain proposals.

Reasoning: preserve consequences inside a run while keeping the cost of another learning attempt reasonable. Random enemy move/target selection plus squad-wide action loss can create a defeat spiral; test whether one knockout leaves a credible route forward and whether hidden boss mechanics cause unavoidable first-attempt losses. Since move uses refresh each encounter, health and knockouts are especially important sources of dungeon attrition. Don't make revival mandatory for appropriately scoped healer-free runs, and don't resolve difficulty by making players buy unlimited continues. Encounter balance and run length must establish tolerable setbacks through playtests rather than assert one revival guarantees fun.

## Knockout baseline adopted; battlefield layout next, 2026-09-15

Nick said "proceed" after the limited-revival recommendation. Adopt the proposed baseline for initial design/testing: knockouts persist within the run; one squad-wide emergency revival per run, usable between battles and returning a creature at partial health; a full-squad knockout ends the run; a fresh attempt starts recovered; permanent creature identity and game development survive failure; earned ordinary progress remains while boss prizes require completion; retreat is available between encounters. One revival and the unspecified health restoration are tuning settings, not immutable promises. Healing does not inherently revive. No paid unlimited continue is introduced.

Surviving creatures retain health between battles under the existing carryover direction. Move-use counters reset at actual encounter boundaries, including for creatures revived before the next encounter; ordinary healing does not reset them within combat. Exact ordinary recovery opportunities and XP distribution to knocked-out participants remain open. Keep revival eligibility/access independent of possessing a rare healer in the initial prototype. Supplies here are a per-run allowance, not a new canonical device or selected currency sink.

Next structural question: battlefield layout. Recommendation to evaluate: fixed visible squad formations without a freely navigable grid for the first combat prototype. Positions provide identity, stable retarget order, and visual clarity; do not automatically impose front/back targeting restrictions, range penalties, or cover solely from display position. One plan per creature remains a move plus valid target. This is a proposal, not approval of a spatial model.

Compare with positional combat explicitly: rows/lanes or grid movement make spatial control and traversal more literal but add movement orders, simultaneous movement conflicts, range/line-of-sight rules, and procedural encounter geometry. Existing Duel already explores spatial tactics, so this game's distinct contribution can be squad planning and dungeon management if fixed formations prove sufficient. That is a product recommendation, not a reason to ignore signature semantics.

Known friction to resolve before adoption: Snare canon describes holding/pinning/pulling in place. A fixed-formation model with unrestricted targeting and no movement may provide nothing meaningful to restrain. Do not silently turn Snare into stun, disable every ability, or reduce damage without explanation. If choosing fixed formations, define meaningful actions involving physical approach, engagement, or displacement that restraint can affect, or introduce a minimal positional rule. Compare a Graviclaw signature encounter across the models before selecting one. No perk duration or control cap can be finalized until this is addressed.

Next question: stationary squad battles versus positioning as a player decision. Present the simplicity/signature-expression tradeoff and keep both available.

## Non-tactical rows accepted; Snare interpretation proposed, 2026-09-15

Nick specifies random row alignment, with position affecting only fallback targeting after a selected target is knocked out. No formation tactics, adjacency bonuses, front/back protection, movement orders, distances, or position-dependent range gates. Recommended detail: randomize the presentation order at encounter setup and preserve it during that encounter for predictable next-eligible-target fallback; reshuffle cadence itself is not explicitly settled. Physical attack animations may approach and return without introducing persistent positions.

Nick proposes that Snare could restrict a creature to ranged attacks; a creature with exclusively melee attacks would consequently be unable to attack while restrained. This is an option he wants assessed, not an already ratified status rule. Assistant recommendation: Snare blocks moves whose execution requires approaching/physical engagement, while leaving at-range and valid self-directed actions available. Do not label Snare an unconditional stun. A melee-only creature may be fully denied offense, which makes counter-selection important and requires duration/stacking limits.

Source inspection: shipped registry defines ambush as closing speed, beam/hurl/spray as projected acts, crush as pressure, burst as hitting nearby targets, and Snare as holding/binding/pinning. Current creature ability records have instrument, action, medium, intensity and optional signature prose, not a uniform per-move melee/ranged classification. Duel's existing range is a legacy creature-level value and not a reliable mapping for this game. Derive eligibility per move using action plus instrument and authored exceptions; a mental crush is not automatically contact, a pincer attack is not automatically projected because its medium is elemental, and a burst is not automatically long-range. Use readable game tags and data checks rather than infer range solely from element or signature status.

Temporal recommendations to discuss: evaluate the move's current execution legality when its action opportunity arrives. If a faster Snare blocks a committed approach-dependent move, that move fails to execute; do not automatically replace it with another action or charge an unexecuted move. Previously accepted target fallback remains for invalid targets, not an escape from actor restrictions. This cannot be resolved by universally allowing retargeting because Snare affects the actor. The lost action here is the control effect's purpose, unlike unnecessary inactivity after a defeated target. Show the reason explicitly in playback. Next planning phase disables blocked moves while the status remains. No automatic player-command replacement is approved.

Balance recommendations: test short restraint windows, prohibit additive duration stacking as a baseline hypothesis, and check whole-squad chains even with one signature per creature per battle. A brief post-release protection against immediate reapplication is a possible rule, not selected yet. Bosses should retain meaningful counterplay, e.g. a real legal ranged response where supported by their records; don't invent a ranged move on a melee-only boss or grant blanket immunity without showing it. Consider knowledge access to opponents' possible move categories without revealing their next selected order; exact inspection/discovery policy remains open.

Next question: confirm Snare's action restriction and the consequence for a melee order interrupted during resolution before selecting duration, chance, or boss resistance.

## Snare accepted; explicit move range forthcoming, 2026-09-15

Nick agrees with the proposed Snare restriction and interruption behavior. Snare prevents approach-dependent melee moves, allows ranged and otherwise valid in-place actions, and can prevent a committed melee move from executing if applied before that actor's opportunity. Such an unexecuted move does not consume a use. A creature without any allowed action may lose its opportunity; Snare is not an unconditional stun. Duration, stacking protections, resistance, and application chance remain to be selected. Do not treat acceptance of the effect as approval of all suggested balance remedies.

Nick is redesigning the moveset data model separately, including an explicit range field. Proceed on the assumption that the needed move details will arrive. This supersedes the recommendation to build range inference from action/instrument in this game. Do not implement a temporary classification system, change canonical records, or invent the exact future field names/units/categories. Once the schema lands, map its explicit semantics into battle legality, including self/ally effects and any difference between reach and needing to approach. Until then, paper examples use conceptual melee/ranged categories only.

Next proposal: resolve status duration precisely under interleaved turns. For the first Snare test, a one-opportunity duration means it remains through the target's next action opportunity and then expires, regardless of whether that opportunity is lost or spent on an allowed ranged/in-place action. It does not tick merely at a global round boundary. If applied after the target already acted, it persists to the next round's opportunity. Thus it affects one opportunity rather than accidentally zero or two. The charge is spent by the executing source even if the target chooses an allowed ranged action. Application reliability remains open; avoid conflating duration with hit chance.

Illustration: faster snare -> pending melee blocked this round -> status expires after that opportunity; slower snare after target acted -> next round's melee choices blocked -> status expires after next opportunity. A proposed duration perk can extend the number of affected opportunities, subject to a later cap and anti-chain policy. One-opportunity baseline is a test recommendation, not an accepted number.

Next conversation: status timing and duration, then whether attacks/effects are guaranteed or have an accuracy/resistance roll. Do not reopen the forthcoming range schema in the meantime.

## Snare timing accepted; outcome randomness next, 2026-09-15

Nick accepts counting Snare duration by affected target action opportunities rather than global round boundaries. One affected opportunity is the initial test value. Applied before the target acts, it affects that opportunity and then expires; applied after the target acts, it persists through the next opportunity. An allowed ranged/in-place action still consumes an affected opportunity. Treat extension perks as increasing affected opportunities subject to future balance limits; no universal rule for every other status is implied. Stacking, reapplication limits, boss resistance, and application reliability remain open.

Next proposal, not yet approved: start with deterministic outcomes for legal executed moves against ordinarily susceptible targets, no generic miss chance, no random critical hits, and fixed damage given the current game state. Preserve the accepted randomness in enemy move/target choice and encounter generation. Explicit guard, resistance, immunity, protection, and conditional effects may change outcomes under visible rules; not every legal move must bypass those defenses. This is a proposed prototype baseline, not an interpretation of the forthcoming accuracy/range schema.

Rationale: whole-squad commitment, hidden enemy decisions, persistent knockouts, and approximately one signature use per battle already create uncertainty and consequence. A failed once-per-battle signature caused solely by an invisible/random accuracy roll can erase an entire planned combination. Compare misses separately from damage variation if more outcome uncertainty is desired; do not import accuracy, crits, and damage rolls as a bundle.

Next question: does the player want additional chance in move success, or should execution be dependable once its legality and explicit defenses are accounted for? No formula or data-model change is authorized by this discussion.

## Uniform movesets and equal secondary allowances, 2026-09-15

Nick directs this game's design to assume the same number of available moves for every creature and the same number of uses for all secondary moves. Exact move count and allowance remain unset. This is a forward design assumption, not a claim that current generated records already satisfy it. Do not modify the generator or records to enforce it in this task. Reconcile legacy records and future support additions when the moveset contract is available.

Purpose clarified: prevent repeated use of one move within an individual creature's moveset and encourage broad use of its capabilities. This is not a roster endurance allocation problem. All participating creatures are used in every battle until knocked out. No extra active/reserve rotation mechanic is required by this direction; party size remains separate.

Chosen simple direction: independent per-move use counters, uniform secondary limits, replenished per battle under the current charge model. Discard the proposed shared per-creature distribution budget and unequal secondary allowances as starting rules. Signature approximately once per battle remains the current working setting, with frequency perks and exact limits unresolved. A creature gets one action opportunity per round subject to its ability to act; exhausting one move removes that choice for the current battle but leaves its other moves available.

Implementation discretion is granted for simplicity, not permission to invent more balancing layers. No cooldowns, shared energy pool, forced alternation, or escalating repeat costs are needed initially. In short fights, repetition may remain legal and sensible; longer fights expose the finite allowance. Tune one shared secondary-use value against expected battle duration and remaining useful options. The rare healer/buffer working assumption remains in force; equal allowances do not mean all creatures receive the same functional roles.

Exhaustion of every usable move remains an edge case to resolve in prototype testing. Use generous finite allowances as the initial tuning approach, verify long fights and conditional/non-damaging moves, and flag exhausted states rather than claiming they are handled. No automatic refill, default attack, or skip behavior is approved by this decision.

Next meaningful design topic: creature knockouts, recovery between battles, and loss conditions, given all squad members participate until knocked out. Do not reopen the equal-allowance decision merely to tune numbers.

## Future support capabilities: working assumption confirmed, 2026-09-14

Nick has started a separate agent conversation about healing and buffing. For this game's design, assume both will exist as relatively rare, lore-gated creature capabilities. He anticipates category-specific move pools and extensions allowing eligible creatures to receive those moves, but exact schemas, generation rules, pools, and eligibility remain in that conversation. Do not implement those anticipated details here or represent them as already shipped. Healing-capable creatures must have canonical grounding for healing; buff capability follows the same rarity/eligibility principle. Deliberate pursuit and a lucky encounter/generation are both desired acquisition experiences, with rates unselected.

Support these concepts in the battle model, then revisit their detailed rules after the parallel design is available. Reserve explicit move target categories, costs, effect timing, and status handling without defining a speculative support registry. Do not add support through universal perks, infer it from element alone, or require it in starter crews. Distinguish current audit facts below from this future working assumption. No cross-agent dispatch is requested.

Next local design work: compare per-battle use budgets for current two-to-three-secondary records, with signature approximately once per battle. Proposed prototype: a per-creature secondary-use budget distributed among existing non-signature moves with individual caps; compare against per-move fixed allowances. A shared allocation budget need not be a player-visible shared energy pool: the resulting allowances are independent counters. Adding a future support move should not silently create extra total endurance by adding a whole new allowance, nor automatically remove all necessary offensive capacity; reconcile roster and loadout policy when the support schema lands. No budget scheme has been chosen.

Use illustrative battle lengths and allocation counts only to explain tradeoffs, not claim current combat supports those durations. Early battles may legitimately finish before forcing rotation; longer encounters can reward variety. Avoid rigid exhaustion every fight or requiring weak fallback actions merely to manufacture variety. Baseline no-charge actions, move-equipping limits, charge resets, and the distinction between defeat-only versus hit-based charge costs remain open. Next useful player discussion is whether running out of a particular move is a routine constraint or mostly a concern in long encounters; Nick's stated intent favors ample aggregate uses and limits on repeated use of one move.

## Current creature audit and rare support direction, 2026-09-14

Nick requested inspection of existing creatures before further hypothetical moveset design. He wants healing to be a relatively rare capability, potentially absent from a starting squad, that motivates learning the lore, identifying relevant planets, undertaking their missions, and pursuing access to an appropriate generated creature. Do not give all creatures healing, buffs, and ally protection through generic loadouts or perks. Nick is discussing expansion of support concepts and lore with another agent; this task does not edit species, generator rules, or canon for that expansion.

Read-only findings in this checkout:

- `docs/species-templates/RATIFIED.json` lists 31 species. Inspecting all those templates gives one Mend signature (Sonalloy, Veridium: Ruin Made Whole) and three Ward signatures (Bioflim, Drainov; Scalatto, Endessa; Yetimoth, Krystos). These are signature-category counts, not population frequencies or counts of all creatures capable of supporting allies.
- Sonalloy's current lore explicitly describes repairing damaged creatures and structures with living metal. Its signature repairs a wound/fracture. Recipient compatibility is not a license to assume universal biological healing.
- Hypnopet of Telypso has a Snare signature but explicit empathic-healer lore and a healing trait at 100 in its template. Tizzie has healing at 35; Sonalloy at 100. These are template values, not measured generated healer odds. Thus healing is not currently synonymous with a Mend signature.
- Bioflim, Scalatto, and Yetimoth's Ward signatures describe protection of their own bodies. A Ward action key does not automatically mean an ally-targeted shield. Likewise, regenerative describes self-repair, whereas healing describes restoring others, per the shipped registries.
- `packages/rules/src/generator/constants.ts` sets `ROLLED_ABILITY_COUNT` to [2, 3]. `rollAbilities` in `generate.ts` starts with one authored signature, then attempts to add that many generated abilities, with a forty-attempt bound. Four secondary moves are not the current guaranteed record shape.
- `allowedActions` reads instrument permissions plus applicable conduit actions; it does not exclude Mend or Ward for non-signature moves. The shipped instrument table permits Mend for mind, secretion, aura, and light-organs, and Ward for many instruments. The catalog has populated Mend entries (e.g. Metal Mend). Current code therefore does not enforce "only the signature can be a support ability." This is a static source/data audit, not a sampled frequency estimate.

Correction: earlier hypothetical loadouts with a heal/protect/control option on a typical creature were not established by inspection. Withdraw that assumed standard squad composition. Also remove the generic Dark-tree Steady Recovery proposal from the active candidate set pending recovery design; rarity of actual healing should not be undermined by universal perk-based healing. A generic defensive action, self-protection, ally shielding, self-regeneration, mental restoration, and restoring physical health to another creature need separate definitions rather than one broad support label.

Game-design implications: validate early/core dungeons with representative healer-free crews; survival can depend on enemy management, effective damage, and deliberately authored external recovery opportunities. Such recovery must be bounded and must leave specialist healing valuable. A healer can improve resilience, enable different compositions or optional challenges, and alter resource decisions without becoming a hidden universal admission requirement. Do not promise every possible crew can win every mission.

Proposed acquisition loop: encounter an unfamiliar recovery ability; discover its source/species through the encyclopedia or mission context; pursue that world's opportunities; earn access/control that helps acquire an eligible creature through generation. Exact targeting, guarantee versus probability, mission access, and reward costs are open and must coordinate with platform generation/economy work. Veridium and Telypso are evidence-backed current leads, not final exclusive healer worlds; additional specialization belongs to the parallel lore work.

Mapping policy to settle after that work: define which records support self versus ally effects using signatures, narrative, physiology, rolled abilities and relevant traits. Neither grant healing to every elemental attack nor classify every non-signature Mend as damage just to fit an assumption. A proposed game-specific support eligibility table must be explicit, traceable, and reviewed against current records. The per-battle charge model remains viable, but charge budgets must be tested against the actual two-to-three generated secondary moves and distinguish damage-heavy creatures from rarer support cases.
