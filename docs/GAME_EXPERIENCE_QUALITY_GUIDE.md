# Xalians Game Experience Quality Guide

Status: Living standard  
Last updated: 2026-09-10  
First reference implementation: The Long Return

## Why this guide exists

This is the shared vocabulary and quality bar for Xalians games. It records what terms mean, which design decisions we have made, how to judge whether an experience is working, and which questions remain open.

It is not a list of visual effects to apply everywhere. A feature belongs only when it helps a player understand, decide, feel, or recover. When this guide conflicts with observed player behavior, update the guide rather than defending the guide.

## The experience we are building

An Xalians game should make a creature's data feel like character identity expressed through play. The player should see why a creature was suited to an action, understand the trade-off before committing, and recognize the consequences afterward. Raw data remains available for players who enjoy analysis, but it does not obscure the immediate decision in the simplest mode.

The core interaction rhythm is:

**Orient → Decide → Preview → Commit → Experience → Understand → Continue**

Every major action should answer seven questions:

1. Where am I?
2. What am I trying to accomplish?
3. What decision am I making now?
4. How do the options differ?
5. Which click selects, and which click commits?
6. What happened because of my choice?
7. What should I do next?

If a player cannot answer one of these without opening the rules, that part of the flow needs work.

## Plain-language glossary

| Term | Plain-language meaning | Good example | Common failure |
| --- | --- | --- | --- |
| Affordance | A visible clue about what can be done and how to do it | A route card looks clickable and says “Select route” | A selected outline is the only clue that another click is required |
| Feedback | The game's immediate response to an input | A button depresses, the route becomes selected, and the next action appears | The click appears to do nothing |
| System status | What the game is doing or waiting for right now | “Step 2 of 3 · Choose a route” | The player cannot tell whether an action is pending or complete |
| Preview | A reversible look at likely consequences before commitment | Threatened energy pips dim on a selected route | Selecting a route silently performs it |
| Commitment | The explicit action that makes consequences real | “Cross now” after route and crew selection | Re-clicking a selected card unexpectedly resolves the action |
| Progressive disclosure | Showing essential information first and details on request | Simple costs stay visible; score math is under “See analysis” | Every formula and explanation is open by default |
| Information hierarchy | Visual emphasis that says what matters most | Current decision and primary action dominate supporting facts | Labels, lore, numbers, and actions all have equal weight |
| Microinteraction | A small response that explains a local change | One energy pip drains when a scout leaves | Decorative motion unrelated to the player's action |
| Transition | A visual bridge between two meaningful states | The crew moves through the selected environment before results appear | The next page appears instantly with no sense of action |
| Telegraphing | Showing a risk or opportunity before it occurs | Unknown danger fogs the affected resource lanes | A hidden cost looks like zero cost |
| Signifier | The visible part of an affordance | Arrow, outline, hover change, button label, or handle | Clickability exists only in code |
| Mapping | A consistent relationship between a symbol and meaning | Lightning always represents creature energy | The same icon means energy on one screen and damage on another |
| Game feel | The combined sense of responsiveness, weight, motion, sound, and consequence | A committed crossing has anticipation, impact, resource loss, and arrival | Correct rules presented as a static form |
| Diegetic UI | Interface styled as part of the fictional world | Mission briefing presented through a battered field console | Theme makes labels hard to read or controls hard to find |
| Reduced motion | An alternate presentation for people who limit animation | Final state appears quickly without travel, shake, or flashing | Removing animation also removes information |
| Empty state | A useful explanation when there is nothing to show | “No resources at risk” replaces empty meters | Blank space that looks broken |
| Error prevention | Design that prevents accidental or invalid actions | Disabled commit explains which crew role is missing | Error appears only after the player commits |
| Reversibility | The ability to change preparation before consequences occur | “Change route” and “Back to routes” remain visible | The player feels trapped before the real action begins |

## Decision status vocabulary

Every principle or feature in this guide should use one status:

- **Established** — validated enough to use as the default.
- **Trial** — implemented and being tested; do not generalize without evidence.
- **Candidate** — promising idea not yet implemented or validated.
- **Retired** — tested and intentionally rejected; preserve the reason so it is not rediscovered accidentally.

## Established standards

### 1. One dominant decision at a time

Simple mode presents one current decision, its viable options, and one obvious next action. Information unrelated to that decision is hidden, collapsed, or moved to a secondary surface.

Pass conditions:

- The current decision can be identified in five seconds.
- The primary action is visually dominant and uses a specific verb.
- Supporting explanation does not compete with the options.
- Metrics that do not change are omitted unless their absence could mislead.

### 2. Selection and commitment are different actions

Selection is reversible preparation. Commitment begins the fictional action and applies consequences. The interface must never make the player guess which kind of click they are making.

Pass conditions:

- Selecting an option changes its state to “Selected.”
- A separate primary button describes the committed action: “Cross now,” “Send scout,” or “Spend salvage.”
- “Change,” “Back,” or “Reselect” remains visible until commitment.
- Confirmation modals are reserved for unusually destructive or irreversible choices, not routine turns.

### 3. Known, zero, and unknown are visually distinct

These states are mechanically different and may not share the same presentation.

- **Known cost:** show exactly which resource units are threatened.
- **Confirmed zero:** omit the lane or show a compact positive “No resources at risk” state.
- **Unknown cost:** show uncertainty, never a zero, fabricated estimate, or leaked hidden value.

### 4. Preview and result use the same visual language

The symbol, color, unit shape, and direction used before an action must match the animation and result afterward.

Current Long Return mapping:

| Concept | Symbol | Color / shape | Direction |
| --- | --- | --- | --- |
| Creature energy | Lightning | Cyan rectangular cells | Full to empty |
| Annex stability | Structure | Green hexagonal segments | Full to empty |
| Salvage | Crate | Gold crate tokens | Empty to accumulated |
| Unknown danger | Question diamond / interference | Amber fog or striped edge | Unresolved until discovered |
| Selected choice | Check / locked outline | Gold | Preparation only |
| Recommended choice | Command marker | Mint | Advice, never selection |
| Immediate danger | Warning mark | Red only when urgent | Escalates toward failure |

Recommendation and selection must never use the same badge, color, or wording.

### 5. Results tell cause and effect

A result is not merely a new total. It should present the event in this order:

1. What physically happened.
2. Which creature or environmental property caused it.
3. Which resources or mission conditions changed.
4. What that change means for the next decision.

Untaken branches remain secret. A result explains the chosen path without revealing what was waiting elsewhere.

### 6. Animation communicates state

Motion is used to direct attention and explain sequence, not as a substitute for clarity.

Every animation should serve at least one purpose:

- establish location;
- show who is acting;
- connect cause to consequence;
- show a resource leaving or arriving;
- reveal danger;
- indicate progress or completion;
- direct attention to the next action.

Rules:

- Input feedback begins immediately.
- Consequence beats occur in causal order.
- Changed values animate at the moment their cause occurs.
- The final state persists until understood or explicitly continued.
- “Skip” accelerates to the complete outcome; it does not bypass information.
- Repeated routine interactions become faster than first-time or dramatic actions.
- Decorative ambient movement stays subtle enough not to compete with decisions.
- Scene-sized layers animate only compositor-friendly opacity and transforms; layout properties such as `left`, `top`, width, and height do not animate.
- Scroll alignment finishes before an entrance begins. The camera and the entering panel never move at the same time.
- One primary motion owns each causal beat. Supporting effects reinforce it without shaking or pulling attention in another direction.
- Continuous easing is the default. Stepped timing is reserved for tiny, nonessential console indicators—not panels, creatures, captions, or resource meters.
- Reduced-motion mode communicates the identical final state without camera travel, shake, pulsing, or required waiting.

### 7. Artwork is evidence of game state

Artwork should answer “where am I?” and “what is happening?” before it decorates a surface.

Established composition model:

- **Environment plate:** establishes the location and available space.
- **Canonical creature layer:** preserves registry-backed creature identity.
- **State overlays:** scanning, signals, hazards, damage, repairs, or recovered objects.
- **Interface layer:** current objective, action, and consequences.

Generated art must not contain interface text. HTML remains responsible for readable content, localization, accessibility, and live state.

### 8. Theme supports usability

The visual direction is lived-in cassette futurism and nuclear-age industrial salvage technology: chipped enamel, analog gauges, CRT glow, stamped metal, physical switches, amber lamps, cold exterior light, and field repairs.

Theme may frame the interface, but it may not reduce contrast, obscure click targets, force tiny type, imitate broken controls, or make fictional terminology more important than clear action language.

### 9. Creature data becomes verbs

Creature properties should change what a creature can perceive, communicate, endure, manipulate, or accomplish. A player should not need to read a stat dump to understand the immediate implication.

Preferred transformation:

`registry property → in-world behavior → decision consequence → optional raw detail`

Example:

`vibration communication → scout can report remotely → no return trip → communication channels available in analysis`

### 10. Failure is visible before it is terminal

Energy and stability count down because they are reserves. Positive loot counts up because it accumulates. The interface should intensify as a reserve approaches failure, not reveal the danger only at zero.

The player should understand:

- what fails at zero;
- how close they are;
- which proposed action threatens the reserve;
- what recovery options remain;
- whether extraction is still a valid outcome.

### 11. Advanced depth is preserved, not imposed

Guidance changes presentation, not mission math.

| Mode | Default presentation |
| --- | --- |
| Simple | Current decision, visual trade-off, recommendation only when clearly justified, and likely consequences |
| Guided | Simple view plus explanations of why factors matter and ranked assistance |
| Standard | Full scores and expected outcomes without choosing for the player |
| Expert | Raw operational data with minimal interpretation |

The player can request more detail without leaving the decision. Advanced information should not be duplicated in the Simple surface.

### 12. Recovery and edge cases are designed states

Back, resume, reload, unavailable saving, disabled actions, no-cost outcomes, failed missions, and reduced motion are part of the experience—not cleanup work.

## Quality dimensions and scoring

Score each dimension from 0–4. Record evidence, not just a number.

| Score | Meaning |
| --- | --- |
| 0 | Broken or absent; prevents understanding or completion |
| 1 | Exists but regularly confuses, misleads, or interrupts |
| 2 | Functional; understandable with attention or prior knowledge |
| 3 | Clear, responsive, and comfortable for the target audience |
| 4 | Memorable, cohesive, and validated through repeated play |

| Dimension | What to evaluate | Critical evidence |
| --- | --- | --- |
| Orientation | Location, objective, progress, and immediate context | Player can describe where they are and what they need to do |
| Choice clarity | Options, factors, and meaningful differences | Player can explain why they chose without opening rules |
| Commitment clarity | Selection versus execution | No accidental actions or uncertainty about the commit button |
| Cause and effect | Relationship between action, event, and changed state | Player can explain what changed and why |
| Creature expression | Creature data materially affecting play | Player can name how a specific creature helped or struggled |
| Feedback and responsiveness | Immediate acknowledgement and visible state change | Every input produces timely, proportionate feedback |
| Pacing | Balance of thought, action, reveal, and continuation | No unexplained dead time or abrupt result jumps |
| Emotional texture | Tension, relief, curiosity, ownership of choices | Player reports a felt trade-off rather than random clicking |
| Visual hierarchy | Readability and emphasis | Eyes land on decision, consequence, and next action in that order |
| Thematic cohesion | Fiction, art, motion, and UI speaking one language | No screen feels imported from a different game |
| Accessibility | Keyboard, focus, contrast, text size, motion alternatives | Complete flow works without relying on color or animation alone |
| Resilience | Save, reload, backtracking, empty and failure states | Interrupted play resumes predictably without duplicate costs |
| Performance | Load, input response, layout stability, asset weight | Interaction remains responsive while artwork loads and animates |

Do not average away a critical failure. Orientation, commitment clarity, cause and effect, accessibility, and resilience must each meet the release threshold independently.

Suggested maturity thresholds:

- **Concept playtest:** no critical dimension at 0; core loop is complete.
- **Internal playable:** critical dimensions are at least 2; no known progress blocker.
- **Public demo:** critical dimensions are at least 3; complete keyboard and reduced-motion paths; production build and end-to-end run pass.
- **Release candidate:** all dimensions are at least 3 and the intended signature dimensions reach 4 through player evidence.

## Review checklists

### Before the action

- Is the objective visible in player language?
- Is there one dominant decision?
- Are all viable options visually actionable?
- Are meaningful differences visible at a glance?
- Are recommendation and selection unmistakably different?
- Are known costs, no costs, rewards, and uncertainty distinct?
- Can the player change preparation?
- Does the commitment button name the action it will perform?

### During the action

- Does input receive immediate feedback?
- Is the acting creature visible?
- Does motion follow the physical logic of the action?
- Are event beats shown in causal order?
- Do energy, stability, loot, and encounters animate when caused?
- Can the player accelerate a familiar sequence?
- Does reduced-motion mode preserve the same information?

### After the action

- Does the result begin with the event rather than a calculation?
- Are only changed values emphasized?
- Is each change linked to a visible cause?
- Is the remaining mission state clear?
- Is the next decision visually obvious?
- Does the journal record only what the player actually experienced?

### Whole-run validation

- Complete every route family, encounter posture, scouting choice, field action, extraction point, and failure mode.
- Test mapped and unmapped danger.
- Test recommended and nonrecommended choices.
- Test no-cost, costly, and terminal results.
- Test back/reselect before commitment.
- Reload before, during, and after a committed action.
- Test keyboard-only input, narrow layout, zoomed text, and reduced motion.
- Confirm hidden information is not leaked through labels, DOM text, accessibility names, animation, or timing.
- Confirm artwork failures degrade to a playable interface.

## Playtest questions

Ask for observed understanding before asking for taste.

1. What are you deciding right now?
2. What do you think will happen if you choose each option?
3. Which information influenced your choice?
4. Which click do you expect to perform the action?
5. What just happened?
6. Why did it happen?
7. What changed for your crew or mission?
8. What do you want to do next, and why?
9. When did a creature feel uniquely valuable?
10. Where did you feel tension, surprise, relief, or curiosity?
11. What did you ignore because it looked irrelevant?
12. What did you need but could not find?

Avoid “Did you understand?” People often answer yes even when their model is incomplete. Ask them to explain the flow in their own words.

## Current decisions for The Long Return

| Decision | Status | Evidence / reason |
| --- | --- | --- |
| Energy and stability count down; salvage counts up | Established | Reserve loss reads more naturally than accumulating strain or pressure |
| Route selection is separate from crossing commitment | Established | Removes uncertainty about whether a card click performs the action |
| Simple mode hides unchanged metrics | Established | Reduces repeated zero-state cards and information overload |
| Simple mode omits empty-state advice and duplicate navigation | Trial | No recommendation is communicated by the absence of a recommendation; the global wizard owns progression instead of repeating a smaller stepper inside each phase |
| Recommendations appear only for a clear known advantage | Established | Preserves meaningful trade-offs and player ownership |
| Unknown route danger fogs both possible loss lanes | Established | Avoids presenting uncertainty as free or leaking the hidden outcome |
| Scouting is a sequence of perception, communication, and follow-up | Established | Connects registry senses and communication to costs and risk |
| Encounters are brief field interactions, not full battles | Established | Adds scouting stakes without changing the game's exploration focus |
| Native creatures may become limited mission companions | Trial | Promising motivation for aid-based encounter choices; balance still needs playtesting |
| Salvage can be banked or spent on field recovery | Trial | Creates a reason for salvage and a push-your-luck trade-off |
| Committed actions resolve as ordered visual beats | Trial | Makes cause and effect visible; duration and repetition need continued testing |
| Scene plates plus canonical SVG creatures form the visual system | Trial | Live browser pass confirmed clear location and performer layers; more scene props remain useful |
| Route paths are live overlays on environment plates | Trial | Hover/focus and selection trace upper, lower, center, or edge paths without leaking hidden costs |
| World consequences persist into affected scenes | Trial | Coolant bypass, dormant machinery, awakened security, and recovered protocol now alter scene presentation as well as rules |
| A restrained procedural sound language accompanies state changes | Trial | Selection, commitment, travel, signal, hazard, resource loss, reward, contact, and completion have distinct cues and a persistent mute control |
| Creature capability is expressed through motion and effects | Trial | Crossing tools and scout postures now use different behavioral animation vocabularies while preserving canonical registry art |
| Simple mode is a staged mission workspace, not a scrolling dossier | Trial | A persistent scene header and six-step rail keep the current decision, resources, and next action in one viewport; full-detail modes remain unchanged |
| Choosing a scout and deploying that scout are separate actions | Trial | Compact candidates support comparison, while a fixed action bar makes the irreversible action explicit and keeps “stay together” visible |
| Continuous motion is the default; stepped motion is reserved for tiny ambient signals | Established | Large stepped transitions and simultaneous smooth scrolling read as jitter instead of retro technology; causal beats remain staged without dropping visual frames |
| Encounter responses show action → immediate cost → aftermath before prose | Trial | A live Scene 2 pass made assist, report, and confront readable as different strategic exchanges; the pattern still needs validation across other archetypes |
| Encounter response selection is reversible until a separate confirmation | Established | Matches scout and route grammar and prevents a comparison click from performing an irreversible field action |
| Prior choices live in an optional visual mission log | Trial | Preserves causal continuity without returning persistent history to the Simple decision canvas |
| The post-objective extract/depth fork previews security versus opportunity | Trial | Names the guaranteed banked outcome, optional salvage ceiling, remaining sectors, and current reserves at the point of commitment |
| Wizard stage changes move keyboard focus to the new action heading | Trial | Keeps focus order aligned with the visual stage replacement and makes the next Tab reach a current control |

## Known gaps

- Route paths are distinct by lane and action, but later rooms still need human validation for spatial legibility.
- Canonical silhouettes now perform distinct motions, but authored pose variants remain a future art direction rather than a requirement.
- Procedural sound cues are implemented as a trial; loudness, repetition, and emotional fit need human listening feedback.
- Transition pacing has automated coverage and one browser-agent path; repeated human validation across later rooms remains necessary.
- The current recommendation model needs evidence from players who deliberately choose alternatives.
- Mission difficulty modes currently change explanation depth, not the underlying rules; terminology should continue to distinguish guidance from difficulty.
- Loading, missing-art, and low-performance fallback behavior needs an intentional visual design.
- The new Simple-mode density rule needs fresh-player validation across all seven scenes, especially encounters with several meaningful consequences.
- The staged Simple workspace needs unfamiliar-player validation at laptop and phone sizes, including keyboard focus order and whether the six-step vocabulary matches the player's mental model.

## How to update this guide

For each meaningful change, add or update a decision record:

```text
Decision:
Status: Candidate | Trial | Established | Retired
Problem observed:
Change made:
Expected player behavior:
Evidence collected:
Accessibility impact:
Performance impact:
Follow-up question:
```

Move a Trial to Established only when evidence shows that players understand and use it as intended. Mark rejected ideas Retired with the reason instead of deleting them.

## Related project references

- `docs/DESIGN_SYSTEM.md` and `/styleguide` — shared visual tokens, interface components, and physical-console rules.
- `docs/LONG_RETURN_EXPERIENCE.md` — implementation history, balance hypotheses, and validation notes.
- `docs/LONG_RETURN_ART_DIRECTION.md` — artwork system and runtime composition.
- `docs/LONG_RETURN_GENERATION_MANIFEST.md` — exact prompts and generated environment assets.
- `my-app/src/components/games/longReturn/sceneArt.js` — scene-to-art mapping.
- `my-app/src/components/games/longReturn/actionSequence.js` — ordered committed-action beats.
