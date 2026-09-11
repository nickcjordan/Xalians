# The Long Return — Experience Roadmap

This is the living execution checklist for the playable prototype. It complements the experience guide: the guide records the quality bar; this file records what remains, what is active, and how completion will be demonstrated.

Status key: `[ ]` queued · `[-]` active · `[x]` validated

## Active milestone — full-mission release candidate

Carry the clarity established in the opening through every ending. This pass is complete only when the live game—not merely the engine—can be played from briefing through voluntary extraction, forced extraction, and deep retrieval without an unexplained choice or silent state change.

- [x] Replay all seven scenes in Simple mode and record the first point where route stakes, crew roles, or consequences stop being immediately legible.
- [x] Exercise voluntary extraction, forced extraction, and deep retrieval as distinct end-to-end UI paths.
- [x] Verify that salvage presents a real repair-now versus bank-for-score decision at every field-work opportunity.
- [x] Verify that a recruited companion visibly changes a later crossing, then becomes visibly spent.
- [x] Audit every transition family for meaningful beats, persistent receipts, skip behavior, and reduced-motion equivalence.
- [x] Complete keyboard, narrow responsive, 200% text, reload/checkpoint, and sound-off passes on the final flow.
- [x] Convert every defect found above into regression coverage, then rerun the complete web suite and production build.
- [ ] Open a fresh PR from this worktree only after rebasing onto the latest `main` and obtaining a clean merge state.

Validation record (2026-09-10): live Simple-mode runs reached voluntary extraction (5/7), forced extraction with the Index retained (5/7), and deep retrieval (7/7). The deep run recruited Xylum, consumed its one intervention, spent salvage on both energy recovery and annex bracing, and banked the remainder. Sound-off, 200% zoom, and a narrower-than-mobile-breakpoint zoom pass retained reachable route, back, and commit controls. Automated coverage validates keyboard focus, checkpoint recovery, duplicate-cost prevention, and the same ending families; the complete web suite passed 996 tests across 44 files and the Vite production build completed.

## Current milestone — one excellent decision loop

Prove Scene 2 as a complete vertical slice: scout → contact → response → route → plan → crossing → persistent consequence. A fresh player should understand every trade-off without opening Game Rules.

- [x] Rebuild encounter choices as visual strategic responses.
  - Show response identity first: assist, avoid, confront, signal, or detour.
  - Show immediate cost and possible consequence as one causal path.
  - Keep supporting prose subordinate and progressively disclosed.
  - Done when a player can compare all responses in five seconds and explain what each risks.
- [x] Give encounter commitment the same selection → confirm grammar as routes and scouts.
  - Done when selecting a response previews it and a separately labeled action performs it.
- [x] Animate encounter resolution as cause → resource change → world outcome.
  - Done when the player knows who acted, what it cost, and whether the obstacle remains.
- [x] Carry the Scene 2 encounter result into the route map, crossing, and Scene 3 arrival art.
  - Done when help, withdrawal, confrontation, and detour each leave recognizable evidence.
- [ ] Run a complete Scene 2 comprehension and keyboard/mobile validation pass.
  - Latest player pass found the route trade-off, crew-role meaning, and consequence pacing insufficiently intuitive; the route contract and persistent action recap have been rebuilt and now need another uncoached pass.

## Decision quality and creature expression

- [x] Audit every route pair for a legible strategic exchange: energy, stability, salvage, contact, or future-world effect.
- [x] Remove false choices where one known option dominates without a contextual reason.
- [x] Make the relevant creature property visible at the moment it changes an outcome.
- [x] Expand scouting trade-offs across stealth, defense, contact, perception, and communication.
- [x] Make support creatures visibly responsible for prevented costs or enabled methods.
- [x] Validate manual crew plans and non-recommended routes, not only happy paths.

## Consequence continuity

- [x] Inventory every run flag and show where it changes later mechanics, art, narration, or audio.
- [x] Add durable visual evidence for repaired, drained, awakened, damaged, and befriended states.
- [x] Ensure results explain only the chosen branch and never spoil untaken branches.
- [x] Make “nothing bad happened” an intentional resolved state without filling the screen with zeroes.
- [x] Add a compact mission-memory view for players who want to review prior choices.

## Mission tension and metagame

- [x] Strengthen distance-to-Index and distance-to-extraction feedback.
- [x] Introduce explicit press-on versus extract decisions at authored pressure points.
- [x] Tune energy and annex stability so degradation changes available plans before failure.
- [x] Complete salvage utility: recovery, stabilization, situational tools, and extraction value.
- [x] Make forced extraction, voluntary extraction, objective recovery, and deep retrieval emotionally distinct.
- [x] Tune temporary companions as restricted one-mission advantages with visible limits.

## Presentation coverage

- [x] Give all seven scenes distinct environment plates, route overlays, props, and persistent state variants.
- [x] Extend action choreography to every method family and encounter posture.
- [x] Replace remaining dossier-like Simple screens with the staged wizard language.
- [x] Continue removing redundant microcopy and move reference detail into disclosures/tooltips.
- [x] Complete the retro-tech console treatment for briefing, field work, extraction, failure, and completion.
- [ ] Tune sound cues, repetition, loudness, and mute/reduced-motion fallbacks.
- [x] Remove large stepped/layout animations and competing smooth scroll from the wizard and action sequences.

## Accessibility, resilience, and release evidence

- [x] Complete keyboard-only and focus-order coverage for every phase.
- [x] Validate 390 px mobile, common desktop sizes, zoom, and text scaling.
- [x] Validate reduced motion, sound off, missing artwork, storage failure, and low-performance fallbacks.
- [x] Add automated coverage for each encounter archetype and response identity.
- [x] Complete all route families, scouting profiles, encounters, field actions, extraction points, and failure modes.
- [ ] Run five uncoached fresh-player sessions using the experience guide questions.
- [ ] Promote Trial decisions to Established only when observed behavior supports them.

## Working agreement

When a checklist item begins, mark it active. When implementation is complete, keep it active until automated validation and a live browser pass succeed. Record material design decisions in `GAME_EXPERIENCE_QUALITY_GUIDE.md` and detailed implementation evidence in `LONG_RETURN_EXPERIENCE.md`; keep this file concise enough to scan at the start of every iteration.
