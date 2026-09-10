# The Long Return quality audit — 2026-09-10

Scope: Simple guidance, default crew, desktop browser, a no-relay scout, an unresolved route, one committed crossing, and the first persistent world consequence. This is a browser-agent usability audit plus automated verification, not a substitute for an unfamiliar human player.

## Current scorecard

| Dimension | Score | Evidence | Next evidence needed |
| --- | ---: | --- | --- |
| Orientation | 3 | Scene plate, objective, current step, destination, and mission track remain visible | Unprompted player retelling across later scenes |
| Choice clarity | 3 | Route map spatializes the options; cards distinguish known loss, unknown loss, and reward | Human comparison of all seven route pairs |
| Commitment clarity | 4 | Select → “Next: review crew” → “Cross now”; back-to-routes remains visible | Watch for accidental commits in five fresh-player sessions |
| Cause and effect | 4 | Scout return, encounter response, support/companion intervention, resource changes, field work, and next-room consequences use the same causal sequence | Verify retelling with unfamiliar players |
| Creature expression | 3 | Senses, communication, scout posture, method motion, and support visibly change play | Ask which creature felt uniquely valuable without naming its stats |
| Feedback and responsiveness | 3 | Inputs highlight immediately; transitions persist at the outcome; sound cues reinforce state | Tune cue loudness and repetition by ear |
| Pacing | 3 | Routine sequences can skip to a persistent final frame | Repeated-run timing preference after novelty fades |
| Emotional texture | 3 | Unknown route, contact, attrition, optional-depth stakes, distinct endings, and a temporary ally create varied consequences | Human evidence of tension, relief, curiosity, and attachment |
| Visual hierarchy | 3 | Current decision and action dominate; route map adds one strong comparison surface | Narrow-screen and 200% text pass for the new map |
| Thematic cohesion | 3 | Environment plates, console UI, silhouette layers, state overlays, and sound share one language | Later-scene visual review and sound feedback |
| Accessibility | 2 | Semantic buttons, labels, non-color copy, mute, reduced-motion rules, and skip path exist | Complete keyboard-only, screen-reader, 200% zoom, and live reduced-motion audits |
| Resilience | 3 | Boundary checkpoint, resume, backtracking, storage fallback, and terminal states have coverage | Manual reload during each transition family |
| Performance | 3 | Vite build succeeds; interactions remained responsive with layered art and motion | Profile lower-powered hardware and asset decode |

Release interpretation: internal playable. The public-demo threshold is not yet met because accessibility remains at 2 and emotional texture lacks human evidence. No critical dimension scored below 2.

## Validated causal path

1. Chose Chromocat, whose awareness is excellent but whose communication cannot cross the first chamber.
2. Observed the scouting transition spend one energy and end with a required return.
3. Returned Chromocat; one more energy and one annex stability drained in causal order.
4. Compared the fully mapped gantry with the unresolved intake; the map traced each physical route and marked uncertainty without showing a hidden amount.
5. Selected the intake. The interface exposed a separate “Next: review crew” action and still did not cross.
6. Reviewed the suggested Hippochamp plan, with “Back to routes” and the distinct “Cross now” commitment.
7. Committed. The transition revealed conductive brine, applied one energy and one stability loss, collected two salvage, and held on the final outcome.
8. Reviewed the costly-success result, which attributed the extra cost to the unseen brine.
9. Entered the Blind Turbine Hall. The art layer showed “Underdeck drained,” and the transition explained that the maintenance route is easier by four.

## Verification record

- Automated: 991 tests passed across 44 web test files after rebasing into the current `apps/web` Vite/Lucide frontend workspace.
- Build: Vite production build passed.
- Browser: no Long Return runtime errors; only the pre-existing anonymous-user authentication log appeared.
- Live URL: `http://127.0.0.1:4173/long-return`.
- Build warnings outside this feature remain: duplicate style keys in legacy creature badge components and large bundle chunks.

## Next quality gate

Run five fresh-player sessions without coaching. Ask the guide’s explanation questions after scouting, route selection, the first encounter, the first field-work offer, and extraction. Do not teach the rules until after recording their model. Promote the new route, motion, world-state, and sound trials only where players independently explain what they saw and why it mattered.

## Continued build evidence

- Scene 2 now completes as a full vertical slice: scout, native contact, reversible response selection, enacted response, persistent companion/native state, route, plan, crossing, and Scene 3 arrival.
- The Simple console has an optional visual mission log. It was opened and dismissed by keyboard in the live browser, returning focus to its trigger.
- Every route pair is guarded by a design test requiring each side to own at least one strategic advantage; all authored routes and more than 2,000 crew/method/hazard/command combinations resolve safely.
- Field work now presents salvage cost and resource gain as a visual transaction and can restore energy, stability, or a used command override.
- All authored crossing method keys use an intentional motion vocabulary; support and companion beats are separate performers.
- The production build passed after the continued pass. Existing duplicate-style-key and large-chunk warnings remain outside this feature.
