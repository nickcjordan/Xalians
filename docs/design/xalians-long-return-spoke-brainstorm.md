# Xalians: The Long Return — expedition-game spoke brainstorm

Status: design sketch, 2026-09-01. Not ratified and not an implementation plan.

Companion documents: `xalian-creature-data-structure.md` (consumer contract), `xalian-creature-system-redesign.md` (authoritative creature system), `xalian-ability-grammar-draft.md` (ability vocabulary), and `xalians-platform-vision-and-economy.md` (hub-and-spoke platform direction).

## Recommendation in one sentence

Build a solo-first, cooperative-ready **push-your-luck expedition roguelite** in which a crew of owned Xalians crosses hazardous worlds and derelict Vallerii infrastructure, using incomplete sensory information and creature-specific ways of traversing, surviving, communicating, and manipulating the environment.

Working title: **Xalians: The Long Return**. The name points at the present-day goal of making the creatures' homeworlds livable again, not simply winning another arena.

This is intentionally not:

- a creature-versus-creature battler;
- a grid tactics or capture-the-flag game like Duel;
- a deck, hand-economy, or row-control game like Tribute;
- a straight-line racing game in which Sprint becomes the one stat that matters.

Its fantasy is: **“These are not cards or chess pieces. This is the crew I trust to get us home.”**

## Why this is the best third spoke

The creature record is unusually rich in facts that describe exploration but are secondary in combat: environmental tolerance, breathing media, senses, communication channels, diet, anatomy, manipulation, size, locomotion, composition, covering, and temperament. An expedition game can make those facts central without pretending they all mean damage.

It also creates collection demand orthogonal to both known spokes. A slow, low-aggression, liquid-breathing creature with tremorsense and high manipulation may be mediocre in a flag race and unremarkable in a point-total card game, but uniquely valuable when a flooded ruin is collapsing in darkness. The game rewards **coverage and complementarity**, not a universal best roll.

Most importantly, an expedition gives those facts decisions to shape. The bad version of this idea is a sequence of “your Swim is 63, requirement is 60” checks. The proposed game instead makes the player choose how much to learn, which risk to accept, which creature to expose, which solution to spend, and when to turn back.

## The player experience

A mission is a 20–35 minute run across a branching route of 8–12 scenes. The player brings three owned Xalians. A longer mode could use four, but three is the right first target: legible, compatible with the proposed starter collection, and small enough that every individual matters.

The run has one objective: recover a plague lab archive, restart an environmental stabilizer, extract a stranded survey team, map a Generator fault, or salvage a piece of End Wars infrastructure. The crew collects discoveries on the way. Reaching the objective completes the contract; extracting safely banks everything found. Pushing past an extraction point offers rarer discoveries and a better score while the mission-specific danger clock, crew strain, and expended abilities accumulate.

The emotional arc is:

1. **Prepare:** read the destination's known conditions and choose a complementary crew.
2. **Scout:** reveal only the risks your crew can actually perceive.
3. **Commit:** choose a route and a method with imperfect knowledge.
4. **Adapt:** absorb the consequence, reroute, or spend a scarce answer.
5. **Push or extract:** wager the run's banked discoveries against the next unknown scene.
6. **Bring back a story:** the final report names the creatures and the specific acts that saved or cost the expedition.

The fun should come from route-reading, improvisation, and growing familiarity with one's creatures—not from rolling a hidden percentage and hoping.

## The scene: the smallest unit of play

Each scene has three facets:

| Facet | Question | Examples |
|---|---|---|
| **Approach** | Can the crew get into position? | flooded shaft, broken span, vertical duct, buried passage, open vacuum |
| **Work** | What must be done there? | lift wreckage, decode a lock, stabilize a bridge, retrieve a core, calm local fauna |
| **Fallout** | What does acting here disturb? | structural collapse, elemental exposure, noise, pursuit, heat loss, separated crew |

Some facet tags begin concealed. The player first assigns a **scout**. Senses reveal tags rather than adding a generic percentage: sight reads geometry and moving silhouettes; hearing reads machinery and motion; smell reads biological and chemical traces; special senses reveal their registry-defined domains. A creature may discover a danger but be unable to relay it immediately if its communication channel does not work through the scene's medium or separation. The result is delayed until the team regroups, not arbitrarily discarded.

The player then picks one of the visible routes and assigns:

- a **lead**, whose capability or ability provides the method;
- a **support**, who contributes one compatible fact such as manipulation, a sense, protection, or communication;
- a **reserve**, protected from ordinary strain and available for an emergency reaction.

Resolution is deterministic once all relevant tags are known. Concealed tags create uncertainty, not invisible dice. A method can succeed while producing different costs: time, noise, strain, elemental exposure, lost salvage, or a rising mission danger clock. This is essential. “Break the door,” “phase through the door,” “decode the door,” and “pull its mechanism from the other side” should all work, but leave a different mission state.

### Why this is a game rather than a stat checker

- Scouting costs time and exposes the scout; skipping it preserves tempo but leaves facet tags hidden.
- Every route favors different coverage, so the strongest numerical creature is not automatically the safest assignment.
- Abilities are limited-use expedition tools. Spending the perfect Ward now may leave no answer for the extraction.
- The same successful method can change noise, pressure, or the topology of later scenes.
- The reserve slot creates a real hedge: commit all useful creatures now, or protect an answer for the unknown fallout.
- Extraction points force a clean push-your-luck decision with banked value on the line.

There is no permanent injury and no creature progression. **Strain** is local to the run, derived by this game's rules, and disappears afterward. Account progression unlocks harder contract regions, alternate starting gear, report cosmetics, and tournament/leaderboard access—not stronger creatures.

## How the creature record is read

The game should consume the whole record honestly over the life of the game, but no individual scene should quiz ten fields at once. A good scene exposes roughly three relevant facts and one optional clever answer.

### Fields used directly

| Record data | Expedition interpretation |
|---|---|
| `capabilities.flight/swim/burrow/climb/sprint/leap` | Route methods. The value affects reliability, strain, and how much cargo can be carried through that route; thresholds may grant qualitatively different access. |
| `capabilities.manipulation` | Operating devices, handling fragile salvage, carrying tools, and supporting another creature's physical action. The anatomy/telekinetic means remains visible in presentation. |
| `senses` | Which concealed scene tags a scout can reveal, how far ahead it can reveal them, and which ambushes can trigger an emergency reaction. Special senses get explicit per-key interpretations. |
| `ambientMedia`, `breathes`, `temperatureC` | Whether a route is safe, time-limited, or requires support. Drowning is applied only under the ratified rule: the creature breathes something and is submerged in a medium it cannot breathe. Unmodeled pressure or chemistry is never inferred. |
| `heightCm`, `weightKg`, `bodyPlan` | Passage fit, load-bearing, stability, transport capacity, and whether a scene can separate the creature. Size is sometimes an advantage and sometimes a constraint. |
| `corporeality`, `composition`, `covering` | Conservative, published interactions with physical barriers and environmental exposures. These never become an improvised universal immunity system. |
| `anatomy` | What can physically reach, hold, cut, brace, illuminate, or operate. Ability instruments must remain consistent with the pinned anatomy registry. |
| `diet` | What kind of field cache or camp environment can restore strain: forage, biological ration, light, stored energy, or none. This makes route supplies different without turning the game into hunger micromanagement. |
| `communication` | How a separated scout relays discoveries and which coordination methods remain available through gas, liquid, darkness, solid contact, or line of sight. `[]` means explicitly mute, not missing data. |
| ten `attributes` | Quality within a chosen method: Strength moves mass; Vitality absorbs bodily strain; Endurance sustains long work; Agility maneuvers; Reflex handles sudden fallout; Intelligence decodes; Willpower resists mental pressure; Instinct reads incomplete situations; Charisma influences living encounters; Resilience tolerates harsh exposure. |
| `element.affinities` | Typed environmental exposure and ability-medium performance. A secondary affinity is blended continuously rather than becoming a binary second type. |
| `traits` | Sparse exceptions and specializations through a versioned interpretation table. Unknown traits are ignored. |
| `temperament` | Predictable autonomous reactions to surprises. It never adds power or modifies a check. |
| `abilities` | The crew's limited-use verbs: method, reach/shape, medium, and magnitude. Signature and rolled abilities use the same baseline grammar. |

### Fields intentionally not made into power

| Record data | Treatment |
|---|---|
| build/archetype identity | Displayed as a useful summary of the rolled individual. Its favored attributes already exist in the record, so adding another bonus would double-count them. |
| `appearance.finish` | Rendered proudly but ignored by expedition rules. This is not an appearance-shaped game. |
| provenance, serial, generator version | Display and verification only. Old or low-serial creatures are not stronger. |
| chirality | No gameplay. The record contract explicitly gives it no rank or present-game meaning. |
| lifespan | No effect in a 30-minute expedition. It remains valuable natural-history data for future spokes. |
| history | The game may append a mission-result event but never reads history for access, bonuses, or legality. |

Leaving those fields alone is a feature. “Use the creature” does not mean forcing every stored fact into every game.

## Abilities as expedition verbs

Every launch action receives a baseline interpretation so all existing signatures degrade gracefully. The exact result also reads the instrument/action edge's descriptive delivery class when the registry supplies it; the game must not infer that every `burst` is ranged or every `cloud` travels downrange.

| Action | Baseline expedition use |
|---|---|
| `strike` | Precise break, impact, or activation at contact/reach. |
| `lash` | Sweep a path, catch several light targets, or form a temporary line. |
| `crush` | Break or compact a heavy obstruction; may be loud or irreversible. |
| `rake` | Strip, scrape, excavate, or make several quick cuts. |
| `shove` | Reposition an obstacle, creature, or hazard front. |
| `drain` | Pull energy, fluid, heat, or an element-colored contaminant from a target. |
| `ambush` | Rapidly close or cross an exposed interval before fallout triggers. |
| `beam` | Apply a focused effect at line range: cut, reveal, energize, or disable. |
| `hurl` | Deliver mass or a carried object to a remote point. |
| `spray` | Coat or clear a cone-shaped area. |
| `burst` | Affect the immediate area around the user in one violent release. |
| `cloud` | Create a lingering local condition that changes later scene resolution. |
| `snare` | Catch, stabilize, tow, hold, or retrieve something. |
| `ward` | Protect a creature or area from the next matching fallout. |
| `mend` | Restore a strained creature or stabilize damaged living/mechanical material as the medium permits. |
| `terrorize` | Repel, scatter, or hold living opposition at bay without creature combat. |

`intensity` controls magnitude, duration, or coverage—not always “damage.” `medium` supplies the physical fantasy and typed interaction. A Water Mend and Metal Mend can both stabilize an expedition but solve different fiction. `instrument` plus the pinned allowed-action/delivery edge controls reach and plausibility. The unique name is used in the report: players should remember that Event Horizon held the bridge, not that “tool 3 added 41.”

Abilities should recharge between missions, not at camps. That makes their use a run-level decision and prevents a single versatile creature from solving every scene repeatedly.

## Temperament: behavior, never power

Temperament matters only when an uncommanded or separated creature must react to newly revealed fallout. The UI always previews its likely response before commitment.

| Axis | What it selects between |
|---|---|
| Boldness | hold position versus press through immediate danger |
| Curiosity | stay on task versus investigate an unexpected signal or cache |
| Energy | conserve effort versus keep acting when strained |
| Aggression | evade/contain a living threat versus confront or drive it off |
| Sociability | finish an isolated assignment versus regroup to aid the crew |

These are deterministic priorities with context-sensitive outcomes, not +10% bonuses. No pole is universally good. A curious scout may find a hidden archive or wake a defense system. A bold creature may save time or take avoidable strain. The player receives a small number of **command overrides** per mission, turning knowledge of a creature's nature into planning rather than punishment.

This is one of the game's most important attachment systems: two statistically similar individuals can feel different to take into the field without one receiving a higher power rating.

## Trait interpretation, first pass

Traits should be introduced in small tested batches, but the vocabulary already has a natural expedition reading:

| Trait family | Expedition use |
|---|---|
| `healing`, `regenerative`, `protective` | restore others, self-repair after a scene, or intercept fallout |
| `armored`, `resistant`, `mind-sealed` | reduce a narrow published class of physical, contaminant, or mental consequences; never blanket immunity |
| `anchored`, `slippery`, `phasing` | resist forced movement, escape restraint, or bypass some physical interactions |
| `ramming`, `telekinetic` | specialize a movement-backed obstruction method or remote manipulation |
| `toxic`, `volatile`, `reflective` | create a hazardous method or reactive consequence that must be planned around |
| `perceptive`, `foresighted`, `nocturnal`, `luminous`, `stealthy` | reveal, preview, illuminate, or avoid particular information and detection tags |
| `hypnotic`, `menacing`, `inspiring` | alter living-encounter behavior and crew regroup choices, not raw work output |
| `pack-bonded`, `solitary` | change the autonomous preference to work together or apart; no flat stat bonus |

Each rules version publishes exact mappings per key and ignores anything it does not know. A trait's mere presence never creates a fee or score premium unless that rules version has an active interpretation for it.

## Worked read: the sample Graviclaw

The current Graviclaw pilot immediately produces a coherent expedition role without inventing a class for it.

- It tolerates gas and liquid, breathes both, and operates from −15°C to 20°C. It is a natural choice for a cold flooded route, though typed environmental exposure is still resolved through the matrix.
- Swim 52 gives it a credible aquatic approach. Sprint 12, Leap 4, Climb 18, Agility 14, and Reflex 38 make a broken elevated route a dangerous commitment.
- Tremorsense plus Instinct 71 can reveal unstable flooring or moving mass before sight does. Vibration communication works especially well while the scout remains in solid contact with the crew's structure, and poorly across open gaps.
- Weight 372 kg, Strength 74, Resilience 93, `armored`, and `anchored` make it excellent at bracing, towing, and holding a failing scene in place. Its size and mass can also close off fragile or narrow routes.
- Manipulation 44 and pincers make it a competent physical operator, not a master technician. Intelligence 42 reinforces that distinction.
- Point of No Return and Null Grasp are `snare` solutions: retrieve a remote object, pin shifting wreckage, or keep a bridge section from separating. Wraith Vise is a `crush` method. Event Horizon is a run-saving `ward`. Their Dark/Ghost media determine what hazards they safely answer.
- High boldness and aggression with low energy and sociability predict a creature that will confront immediate danger, then prefer to hold a position alone rather than chase a curiosity. The player can plan around that; it grants no bonus.

The result is a **cold-water anchor and recovery specialist** who can make one route safe for everybody but cannot cover speed, height, precision machinery, or broad communication. That is exactly the kind of role a complementary three-creature collection should create.

## Registry and versioning contract

This spoke should model the platform's intended consumer pattern explicitly:

1. Fetch the schema and every controlled vocabulary from the record's pinned `generatorVersion`. Never resolve an old key against a current registry by accident.
2. Validate/normalize descriptive inputs without changing the stored record.
3. Apply a separate pinned `longReturnRulesVersion` containing:
   - scene-tag definitions;
   - thresholds and derived-score formulas;
   - special-sense interpretations;
   - communication-channel interpretations;
   - trait interpretations;
   - action and instrument/action-delivery interpretations;
   - affinity/exposure blending;
   - unknown-key fallbacks.
4. Freeze both versions when a mission starts. A rules patch never changes an active or historical run.
5. Ignore unknown optional fields and registry keys. Unknown traits are inert; an unknown future action cannot be selected as a specialized method until the rules version maps it, but the record and UI still load.
6. Fix balance by changing the next `longReturnRulesVersion`, never by editing creatures or silently overriding their descriptive facts.
7. Optionally append `expedition_started`, `objective_reached`, `crew_extracted`, and `expedition_lost` history events. Gameplay never reads them.

One likely shared registry improvement is an **instrument-action edge delivery class**, already recommended by the Tribute work. This game also needs to know whether an actual edge is contact, reach, line, cone, deployed field, self-wave, or aura. It should consume that descriptive tag rather than maintain a second hand-guessed range taxonomy.

## Mission generation and fairness

A mission is generated from authored scene modules, not from free-form prose. Each module declares:

- media, temperature, and typed exposure;
- route tags and size/load limits;
- concealed tags and which senses reveal them;
- valid baseline methods and their state costs;
- action/trait-specific alternatives;
- possible fallout and topology changes;
- report-language fragments.

Daily challenges can publish one deterministic mission seed so players compare approaches on the same route. For a competitive leaderboard, use either a crew-specific **Expedition Fee** cap or normalize score by the crew's derived access/value vector. Story missions do not need an artificial fee; their branching route is already the balancing surface.

Any fee must price only interpretations active in that rules version. It cannot be a universal creature-power score. A creature's value is mission-dependent by design.

The generator should enforce route solvability at the mission level, not guarantee that every crew can take every branch. Every offered mission must have at least one viable route for a documented baseline starter profile. A player bringing a mismatched team should discover safer alternate paths, not hit an unavoidable hard lock at scene seven.

## Collection, trading, and platform fit

- **Generate:** a new creature creates immediate “what missions could this one open?” curiosity beyond combat strength.
- **Own:** the binder can show a Long Return readout—strong routes, environmental envelope, senses, and interpreted tools—without altering the creature record.
- **Trade:** demand emerges for coverage gaps: vacuum tolerance, liquid communication, manipulation, a particular special sense, a protective ability, or a small-bodied climber.
- **History:** reports provide provenance flavor (“held the collapsing Deepwater span with Point of No Return”) without veterancy power.
- **Progression:** accounts unlock contract regions, optional challenge modifiers, report frames, and cosmetic camp objects. Creatures gain no levels or learned moves.
- **Economy:** missions can award a small Scrambler Token trickle, with difficult objectives or daily score bands offering larger payouts. Generation remains the sink.

Because success needs complementary coverage, the proposed starter squad of three becomes meaningful immediately. The curation system can ensure the first trio includes distinct locomotion, sensing, and survival profiles without guaranteeing a perfect expedition team.

## First playable: cut it hard

The full design is too large for an MVP. The smallest honest proof is:

- one deterministic 8-scene mission assembled from 12–15 authored modules;
- three-creature crew selection from sample records;
- three facets per scene, with one or two concealed;
- a mandatory post-scout field report that narrates the action, distinguishes detected from relayed information, names affected routes, and explains the decision impact;
- the lead/support/reserve assignment;
- four route tags: vertical, submerged, unstable, sealed;
- three environmental systems: medium, temperature, one typed exposure;
- baseline graded senses plus two special senses;
- all locomotion capabilities and manipulation;
- six attributes initially: Strength, Endurance, Agility, Reflex, Intelligence, Resilience;
- eight actions initially interpreted: crush, shove, beam, hurl, snare, ward, mend, ambush;
- six traits initially interpreted: armored, anchored, resistant, perceptive, stealthy, phasing;
- persistent crew strain, a mission-specific external danger clock, one extraction point, and one optional deep objective;
- deterministic temperament reaction previews, with two command overrides;
- an end-of-run story report naming the actual creatures and abilities used.

This is enough to test the central question: **is scouting incomplete information and committing a complementary crew to costly methods intrinsically fun?** If not, adding more registry keys will not save it.

No server is required for the first playable. A mission seed and three immutable records are sufficient for a local run. A ghost-style daily leaderboard can come later.

## Operational failure, scouting, and field encounters

The Black Archive prototype now names its external danger clock **Annex Instability**. This is not literal air or water pressure and it is not creature health. It represents failing structure, waking archive systems, and routes becoming harder to control. At 10, the annex forces extraction. A future mission should give the same rules slot a fiction-specific name—an approaching patrol, a spreading fire, a storm front—rather than exposing a universal abstract “pressure” label.

Strain is persistent operational degradation:

- 0–2: **Ready**, with all roles available;
- 3–4: **Worn**, with reduced lead and support contribution;
- 5: **Critical**, unable to scout and one consequence from being spent;
- 6: **Spent**, unable to scout, lead, or support.

The run also forces extraction when fewer than two crew members remain able to act. Creatures never die, take permanent wounds, or mutate their registry records. Failure means the crew can no longer complete the operation before the external clock closes it down.

Scouting now exposes three competing roles derived from registry data rather than one “best scout” score: a quiet scout tries to notice and escape, a defensive scout can hold if detected, and a contact scout can communicate with or aid a native. Communication is a separate constraint. A useful observation relayed by display, vibration, voice, or telepathy can reach command immediately; without a compatible channel the scout must physically return, adding both strain and instability. If a scout is cornered, a remote channel can also make the difference between calling the crew and resolving the encounter alone.

Field encounters are short expedition decisions, not a second battle game. The authored Turbine Hall encounter can begin with the scout or with the full crew. Choices include withdrawing, calling a medic, treating an injury, driving the native away, or taking another route. Each option previews crew readiness and Annex Instability consequences. A helped native may become a restricted **field companion** for the current mission only. It is never acquired or added to the user’s registry; it can intervene once to prevent a crossing consequence.

Every resolution beat must state the fiction, the cause, and the persistent effect. “Nothing bad happened” is an explicit result: no strain, no instability, and any salvage or companion benefit gained. Untaken branches stay hidden.

## Decision support is its own difficulty axis

The interface should separate **mission difficulty** from **information difficulty**. Guidance changes how clearly command interprets known data; it never changes a creature's scores, the route target, hidden information, strain, danger-clock state, rewards, or consequences.

- **Simple** is an alternate command surface, not a larger pile of explanations. It presents one decision at a time: who scouts or whether the crew stays together, how to respond to contact, which route to take, and whether to approve the recommended crew plan. It shows readiness changes, the fiction-specific danger clock, salvage, and whether hidden risk remains. The full assignment board stays behind “Choose a different plan.” “Recommended” means the best overall known tradeoff, not a promise that an unresolved route is safe.
- **Guided** explains how every visible score was derived, calculates the team margin, translates that margin into likely consequences, and marks the best-known method for the currently assigned crew. It must say “best known,” because unrevealed hazards remain unrevealed.
- **Standard** exposes the same derivation and consequence forecast but does not rank or recommend choices. The player gets a legible instrument panel, not an answer key.
- **Expert** preserves the compact raw readout for players who want to infer the relationships themselves.

These modes should remain switchable during a mission so learning the system is not a permanent commitment made at setup. Switching modes changes presentation and decision support only; it never rerolls or recalculates the mission.

### Progressive disclosure

The default decision surface should answer four questions without prose: **will the crew get through, what will it cost, what remains unknown, and what should I do next?** In Simple mode, hide global panels that do not help with the active choice: the full mission track, crew rail, ability ledger, field printer, score equation, and unused counters. Use outcome labels, cost tiles, warning chips, and short imperative actions instead. Derivation formulas, field definitions, weighting, registry provenance, and caveats belong behind a clearly labeled information control, manual-plan view, or calculation modal. Story prose belongs in the scan result and resolution beats, where the player is learning what happened rather than comparing options.

This hierarchy is not permission to hide consequential information. Known strain, danger-clock changes, environmental incompatibility, ability consumption, and unresolved hazards must remain visible before commitment. Progressive disclosure removes explanatory repetition; it does not conceal stakes.

The score-building equation is consequential information for players who are constructing a plan. Guided, Standard, Expert, and Simple's manual-plan escape hatch must visibly teach **lead method + support = team score versus route target**. Route difficulty should be labeled as a target, an incomplete assignment should show the empty equation, and selections should fill it in live. Simple may omit the equation while it proposes a complete plan, because the active decision there is approval rather than construction; the named lead, support, method, likely outcome, costs, and uncertainty remain visible. Weighting formulas belong in details.

Teach that equation with one large, named example before presenting thresholds: “Chromocat uses Leap for 86; Ectoghoul adds 7; the crew's 93 beats the route's 63.” The primary takeaway should be readable as a sentence—**make the crew score at least as high as the route target; farther above means less strain**. The four margin bands and secondary modifiers are reference material and should not compete with that first lesson.

## Design traps to avoid

1. **Spreadsheet checks.** If every scene is “pick the largest number,” the concept is dead. Methods must change cost, information, and future topology.
2. **One survival god-stat.** Do not average the record into an Expedition Power. Preserve access, information, action, and endurance as separate axes.
3. **Punishing temperament.** Reactions must be previewed and contextually mixed, with command overrides. A temperament pole is never a defect.
4. **Trait fan fiction.** Interpret only the registry's normative nature. Do not use one-line wording as permission to invent unrelated powers.
5. **False environmental precision.** Pressure, humidity, atmosphere chemistry, and internal organs are not modeled. Do not infer them.
6. **Ability-as-damage relapse.** Intensity should usually mean force, area, reach, duration, restoration, or control in this game.
7. **Hard-lock runs.** Individual branches may be inaccessible; the generated mission must retain a viable route for its advertised profile.
8. **Permanent wounds or training.** Run-local strain is fine. Mutating or leveling a creature is not.
9. **Rare finish advantage.** Finish changes the expedition portrait and report treatment, never survival odds.
10. **Trying to use every field.** Chirality and lifespan have no honest role here. Restraint protects the platform philosophy.
11. **Silent state transitions.** Never move directly from “scan” to a wall of route data. Every creature action needs a result beat: what happened in the fiction, what the record allowed the creature to perceive or relay, what changed mechanically, and what the player should decide next.

## Two nearby variants, and why they are weaker as the main pitch

### Habitat Zero — sanctuary/ecosystem builder

Build habitats whose media, temperature, diet supply, social mix, and labor needs fit a rotating population of owned creatures. This reads even more physiology and could become a warm, nonviolent collection spoke. Its risk is that creatures become passive production modifiers and the minute-to-minute game turns into menus. It is an excellent later cozy spoke or Long Return camp layer, but a weaker first standalone game pitch.

### Directive — autonomous obstacle-course programming

Program behavior priorities for a three-creature team, then watch temperament and senses drive a simulated rescue course. This uses temperament more deeply and could support shareable challenges. Its risk is opacity: players may blame the simulation rather than their plan, and authoring readable behavior rules is a larger design problem than authoring expedition scenes. It is a compelling future mode after The Long Return proves the traversal vocabulary.

## Questions worth answering in the next brainstorm

1. Is the desired tone hopeful restoration, dangerous salvage, cosmic-horror investigation, or a rotation among all three?
2. Should the player control one three-creature crew for a full run, or rotate six owned creatures through three-person expedition legs?
3. Should abilities be once per mission, charge-based by action, or usable repeatedly at sharply rising strain? Recommendation: once per mission for the first playable.
4. Is delayed scouting information through communication channels delightful or too fussy? This is the first mechanic to paper-prototype.
5. Should extraction failure lose all discoveries, or bank the objective while losing optional salvage? Recommendation: never erase the objective; risk only the optional haul and score.
6. Which two special senses best demonstrate non-stat information gameplay in the first mission? Tremorsense and psychic/heat-sense are strong contrasts.
7. Does the facility-pressure track create enough urgency, or does the game also need a finite light/supply clock?

## Current verdict

The Long Return is promising because it uses the record's richest underused layer—**what kind of body can exist, perceive, and act in a place**—as the central play surface. Duel asks, “How does this creature contest space against another squad?” Tribute asks, “What is this creature worth when abstracted into a court dossier?” The Long Return asks a third, independent question:

**“Where can this individual go, what will it notice there, and how will it get everyone back?”**
