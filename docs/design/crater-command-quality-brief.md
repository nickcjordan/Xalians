# Crater Command quality brief

Status: active product-quality goal, 2026-09-13

## Intended feeling

Crater Command should feel like a small, finished artillery game rather than a rules
demonstration. The player should understand the immediate decision in seconds, feel a
clear physical response from every adjustment and shot, learn from the result, and want
one more match because the next terrain and tactical exchange will play differently.

The fantasy is two Xalian field crews improvising with living-material ordnance on an
unstable alien range. Lore must explain behavior the player can see: Codazzo barbs split,
Drilltail charges burrow, Terragoyle crews float over broken ground, and crawler movement
changes the firing problem.

## Reference lessons, not replication targets

- Classic Scorched Earth makes the essential state legible beside the field: angle,
  power, selected weapon, ammunition, and directional wind. It also treats weapon and
  movement selection as parts of one tactical turn.
- Worms demonstrates that destructible terrain matters most when movement, shelter,
  expressive weapon behavior, and strong audiovisual reactions make the landscape part
  of the story of a match.
- ShellShock Live emphasizes distinct weapons, varied maps, practice across wind
  conditions, and enough audiovisual identity that aiming is not the entire experience.

Crater Command will retain its original rules, names, creatures, art direction, code,
and deliberately small scope. These references establish experience principles only.

## Candid baseline audit

The 2026-09-13 tactical build is mechanically coherent but still crude.

| Area | Baseline problem | Finished-game standard |
| --- | --- | --- |
| Battlefield | Most of the frame is empty black space; terrain is one flat band; crawlers are primitive rectangles and circles. | The range has depth, atmosphere, landmarks, material layers, readable cover, and authored-looking crawler silhouettes without obscuring trajectories. |
| Shot feel | A small dot follows a dashed line and a thin ring appears briefly. | Recoil, exhaust, projectile identity, impact flash, debris, terrain response, damage reaction, and a short settle make firing the emotional center of the turn. |
| Controls | Correct but form-like; sliders make fine corrections feel indirect. | Angle and power remain touch-friendly while supporting deliberate one-step corrections and clear before/after values. Payload and movement choices communicate purpose visually. |
| Comprehension | Explanatory prose carries too much of the design. | The field preview, control labels, iconography, and result feedback teach the current choice without a paragraph. |
| Tactics | Weapons and two moves now differ, but matches still revolve around finding one solution three times. | Terrain, evasive movement, bot counterplay, limited ordnance, and changing volley conditions create a short tactical story. |
| Bot | It ranges and can evade, but exposes no readable intent or difficulty identity. | The bot communicates when it is ranging, correcting, or evading and behaves consistently enough to learn against. |
| Xalians identity | Creature portraits and weapon names are present, but most play could still belong to a generic tank demo. | Species behavior changes visible mechanics, animation, silhouettes, language, and battlefield artifacts. |
| Match arc | Start and result are utilitarian; victory is a static box. | Briefing, turn transitions, escalating damage, decisive finish, grade, and replay invitation create a beginning, middle, and end. |
| Audio | Silent. | Optional, restrained synthesized cues distinguish adjustment, launch, flight, impact, damage, and victory without requiring downloaded assets. |
| Mobile | Functional and overflow-free, but tall and visually secondary to desktop. | The field remains large enough to read, primary controls stay close to it, and secondary information collapses without losing state. |

## Quality gates

The goal is not complete until all of these are true:

1. A first-time player can identify whose turn it is, the objective, the fire control,
   wind direction, and the three weapon jobs without opening separate instructions.
2. Adjusting angle, power, payload, or position produces immediate, unambiguous field
   feedback; one-degree and one-power corrections are practical with mouse, keyboard,
   and touch.
3. Core, Fan, and Bore have different visual language, audio, flight/impact behavior,
   tactical use, and measurable solution spaces. No special payload is a strict upgrade.
4. At least three complete bot matches and one local match have been played across the
   major revision cycles, including wins, a loss, misses, movement, and every payload.
5. Desktop and phone captures have no overflow, unreadable state, accidental dead space,
   or controls below a misleading visual endpoint.
6. The bot remains beatable, visibly reacts to danger, and cannot obtain information a
   human player would not have.
7. Reduced motion, mute, focus visibility, keyboard operation, live status, and text
   alternatives remain intact.
8. Deterministic replay validation, package tests, typechecks, production build, bundle
   budgets, and deployed smoke play all pass.

## Iteration plan

### Cycle 1 — Battlefield and shot feel

- [x] Replace the empty range with layered Xalian atmosphere, distant terrain, range
      markers, material strata, and substantially more authored crawler art.
- [x] Add payload-specific projectile bodies, recoil, exhaust, impact flash, debris,
      crater emphasis, camera response, and damage reaction.
- [x] Put essential turn and targeting information inside the battlefield composition.
- [x] Play and capture complete desktop and phone matches; record the next critique.

Critique after play: the richer field made firing readable, but the bot reply replaced
the player's last-shot evidence and movement preview snapped back during the firing
animation. Per-side immutable ranging records and committed launch origins fixed both
causal-feedback failures before the next cycle.

### Cycle 2 — Control, comprehension, and opponent

- [x] Redesign angle/power control for both coarse touch input and precise correction.
- [x] Replace prose-dependent payload selection with compact visual behavior previews.
- [x] Add readable bot intent and tune its ranging, correction, payload, and evasion
      behavior across terrain families.
- [x] Rework onboarding and match start around a playable first-turn briefing.
- [x] Play complete wins and losses in bot mode plus alternating-turn local play and
      record the critique.

Critique after play: exact step buttons and compact payload jobs made correction
deliberate, but the result screen still assumed the left crew was the player in local
mode. Winner-relative integrity, ordnance use, and grading now support either local
winner. The full-match audit also exposed a five-pixel mobile grid overflow, fixed by
allowing both battlefield and control rail to shrink to the viewport.

### Cycle 3 — Match arc, identity, and replay

- [x] Add restrained optional sound and payload-specific audio identities.
- [x] Integrate creature behavior and range fiction into mechanics and moment-to-moment
      feedback rather than additional lore paragraphs.
- [x] Add a meaningful result grade and immediate rematch motivation without changing
      immutable creature progression or the capped Arcade reward model.
- [x] Complete final balance, accessibility, responsive, replay, and production audits.

Critique after play: the first debrief repeated active-match crew and objective panels,
creating a tall, crude-feeling side rail and dead space beside the battlefield. The final
debrief keeps only the sealed ranging record, winner, grade, integrity, ordnance use,
lore outcome, and rematch action. Persistent damage smoke closes the gap between the
impact animation and the final battlefield state.

## Evidence log

### Tactical baseline

- 173,880 simulated trajectories across 30 fields removed the former strict payload
  ranking and established distinct solution spaces.
- A five-shot production match used Core, Fan, and Bore with bot replies; Fan previewed
  three paths and crawler movement shifted the launch origin by four field units.
- Desktop and 390-pixel phone captures had no horizontal overflow or browser errors.
- Baseline verdict: mechanically credible, visually and emotionally unfinished.

### Finished-game candidate

- Three deterministic bot victories on different shelf profiles used advance, withdraw,
  and hold openings. Every match fired Core, Fan, and Bore, preserved the player's own
  ranging record through the bot reply, earned an S grade, and successfully generated a
  fresh rematch.
- A fourteen-shot browser loss produced the Terragoyle victory path and a C grade. A
  five-shot alternating-turn local match produced a winner-relative result rather than
  treating Codazzo as a hard-coded player.
- Browser assertions confirmed that a one-degree angle change moves the rendered barrel
  immediately and a one-power change alters the field preview. Sound was enabled during
  play without a browser error; unit coverage verifies mute-by-default persistence and
  graceful operation when browser audio is unavailable.
- The final 390-pixel local result has `scrollWidth === clientWidth` and no element beyond
  the viewport. Desktop result composition, phone result composition, the impact beat,
  and the active control state were captured and visually inspected.
- The repository passes 1,550 tests and all four workspace typechecks. The production
  build compiles successfully. Measured production weight is 65.2 kB raw / 23.2 kB gzip
  for the lazy artillery route and 219.0 kB raw shared CSS; their budgets retain about
  five percent reviewed headroom.
