# Powerworks player UX review — 2026-09-17

Scope: review and proposed redesign before more game depth. Inspected the published checkpoint planning screen, selected a move, inspected the resulting target state, and checked a 390×844 phone viewport. Restored the original creature selection without assigning an order or advancing the user's run. Playback findings also draw on the existing implementation and the prior full browser runs. This is an expert review, not a substitute for first-time human usability testing.

The initial validation proved that the game could be completed. It did not establish that a person could comfortably understand, plan, and follow the battle. The interface currently asks the player to read and mentally connect scattered information. Fix the interaction structure before adding mechanics or decorative polish.

## Findings and proposed changes

| Priority | Finding | Player cost | Proposed change |
|---|---|---|---|
| P0 | Enemies, squad, then moves creates a down-and-up selection path. | Repeated pointer travel and scrolling for every creature. | Put the move tray between squad and enemies: bottom-to-top creature → move → target. Keep the active interaction inside the desktop battle viewport. |
| P0 | Choosing a move inserts another target list and expands enemy cards. | Controls shift, attention splits between two representations of each enemy, and the footer can move offscreen. | Reserve stable space for previews and use the battlefield as the primary targeting surface. A phone target tray should replace an offscreen interaction, not add a second competing roster. |
| P0 | Planned actions are small text strings ending in enemy IDs. | Players must remember the whole squad's plan and decode targets such as M3. | Show a move icon and target portrait on each queued creature, a clear ready marker, and a connection/highlight when inspecting its order. Provide obvious edit and clear controls before commit. |
| P0 | Playback relies on changing HP and a sentence away from the action. | Cause and effect require reading; the player can miss who acted, who was hit, or why an action failed. | Highlight actor and target, animate a short move cue, show damage/effect at the target, then advance. Offer playback speed/pause/skip and reduced-motion equivalents. Retain the log as optional detail. |
| P1 | Type, range, speed, uses and statuses are mostly tiny words/numbers. | Repeated reading of information that should be recognized at a glance. | Build a consistent visual vocabulary: elemental emblems, melee/ranged symbols, remaining-use pips, a distinctive signature frame, and status badges/effects. Keep concise labels and focus/tap explanations; never rely only on color. |
| P1 | Most boxes share the same visual weight and palette. | Active selection, assigned orders, threats and background metadata compete. | Establish distinct states for selected creature, selected move, valid/hovered/assigned target, queued order, exhausted move and knockout. Give actionable states stronger emphasis than decorative frames. |
| P1 | Damage previews say “4 damage now” after an 8-base move without explaining why. | The player must infer elemental resistance, protection and timing caveats. | Pair an estimated HP-bar segment with an effectiveness cue and a short breakdown on inspection. Label forecasts as conditional on current defenses; do not promise the final committed outcome. |
| P1 | “Fastest action first” is explained only by scattered speed values. | Players mentally sort seven units to judge whether restraint can interrupt. | Show a compact initiative strip of public portraits, highlight the selected actor/target, and highlight each actor during playback. It must not reveal hidden enemy moves or targets. |
| P1 | Creature silhouettes are monochrome; several machine roles share similar bodies. | The scene feels like a status dashboard and enemies require labels to distinguish. | Give enemy roles distinct silhouettes, readable scale and pose. Use elemental accents consistently. Place units in a modest facility scene, with clearer guardian presence, while keeping targets easy to click. |
| P1 | Title, dungeon navigation, practice XP, seed and log take substantial combat space. | The core choice is pushed below the fold. | Compact the battle header; move seed/debug data and history to secondary disclosure. Promote only current encounter, round, immediate threats and readiness during planning. |
| P1 | Phone layout stacks the desktop panels into a long page. | The player cannot keep enemy, selected creature and move context in view together. | Use compact enemy presentation and a persistent bottom command area with squad access. Preserve a visible selected-creature identity while choosing a move and target. Test touch use, not merely overflow. |
| P2 | Automatic selection of the next creature is subtle. | Players can miss that the same move tray now belongs to someone else. | Animate or clearly mark the transition and anchor the tray to the current creature's portrait. Make returning to an existing order obvious. |
| P2 | Help is a separate block of prose; exhausted controls are heavily dimmed. | First-time players either read a manual or discover restrictions through friction; disabled explanations can become hard to read. | Introduce the three-step interaction inline, use contextual explanations, and retain readable reasons for unavailable actions. |
| P2 | Camp/victory mainly changes text beneath the same battlefield. | The change of pace, carried wounds and next action receive little visual emphasis. | Create a compact recovery summary with health changes, clear revival availability, and a prominent next-room action. Give victory and defeat their own visual conclusion. |

## Proposed desktop structure

Top: compact encounter/round header and dungeon progress.

Battle area, top to bottom: enemies and threat/status cues → selected creature's move tray → squad with visible queued orders.

Bottom edge: squad readiness and the single commit control. Secondary drawer: combat history, enemy details, extended rules and seed.

Pointer flow is bottom-to-top: select creature, select move immediately above it, select target above the moves. Reserve the tray and preview space so steps do not move surrounding controls. Confirm an order visually, then advance to the next creature with a clear change of identity. Exact composition should be prototyped at actual browser sizes before polishing.

## Implementation sequence

1. Recompose the planning layout, stable sizing, selection states, visible queued orders and editing. Do not add combat depth.
2. Add the visual language for elements, resources, statuses, matchup previews and initiative.
3. Make resolution understandable on the battlefield; subordinate the log. Test the same scenario with the log closed.
4. Refine silhouettes/environment, camp and end states; verify touch, keyboard, contrast and reduced motion throughout.

## Human-centered acceptance criteria

- At the target desktop sizes, assigning and reviewing a squad's orders needs no page scrolling or duplicate target list.
- A player can identify the selected creature/move/target and every queued order without decoding IDs or remembering previous clicks.
- A player can recognize remaining signature/secondary uses, restraint, protection and a charged threat without reading a paragraph.
- A player can follow actor → target → outcome with the combat log closed, including blocked moves and redirected attacks.
- Previewed information remains honest about hidden orders and changing defenses.
- On a phone, the selected creature's identity and next required action remain present through move/target selection.
- Keyboard/focus and tap interactions expose the same explanations as hover; state is not conveyed through color alone.
- First-time human feedback, not completion by automation, determines whether these goals are met.

No combat rules or production UI were changed as part of this review.

## Implemented and verified — 2026-09-17

The redesign implements the review's planning flow, stable target surface, order review/edit/clear, visual resource and status vocabulary, conditional damage preview, public initiative, distinct machine silhouettes, compact battle header, secondary help/log panels, responsive battlefield, keyboard flow, and dedicated recovery/result screens.

Live browser verification: complete seed-1 expedition through all four sectors and victory with one knocked-out companion; mouse planning and automatic next-companion selection; paused/stepped combat with actor/target feedback; keyboard creature-to-move-to-target focus; 1280×720 desktop, 390×844 phone, and 375×667 small phone. The small-phone check found and fixed a clipped commit footer. Repeated crawlers now have numbered target labels; queued orders retain accessible exact move/target descriptions.

Validation: 1,229 web tests and 357 rules tests passed. One existing asynchronous portrait test timed out during concurrent initial checks; it passed alone and in the subsequent full suite. Added coverage for order review/clearing, restore/corrupt saves, visual event metadata and charge-target privacy. Combat rules and version-1 save format remain compatible. The production build now includes a dedicated Powerworks route budget; shared icon chunk extraction required measured adjustments of two existing gzip budgets (artillery 30,733 bytes and hazard sweep 8,411 bytes), with approximately 5% headroom.

Limits: authored art remains prototype art; testing is an expert browser pass, not first-time human usability research. Outcome panels scroll on short phones while the battle planning loop remains visible. Future canonical moves, balance, and content depth remain separate backlog work.
