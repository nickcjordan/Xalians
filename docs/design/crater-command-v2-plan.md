# Crater Command V2 improvement program

Status: complete

This document supersedes the “finished-game candidate” conclusion in
`crater-command-quality-brief.md`. A live audit on 2026-09-14 showed that the game is a
competent projectile prototype, but not yet a complete artillery game. In particular,
the 390 px layout clips controls and produces horizontal scrolling, movement has little
perceived or tactical weight, and a match contains too few interacting systems.

## Product target

Crater Command is a fast, legible one-versus-one artillery game that belongs to the
Xalians universe. A first match should take roughly five minutes. Each turn should ask
the player to make a meaningful combination of position, aim, payload, and crew-system
choices. The field—not a dashboard beside it—is the primary interaction surface.

The game should preserve the familiar artillery contract (angle, power, wind,
destructible ground) while earning its own identity through living Xalian batteries,
species-specific field systems, volatile crater terrain, and compact match objectives.

## What the genre research says

| Reference | Durable lesson | Crater Command decision |
| --- | --- | --- |
| Scorched Earth | Arsenal breadth, fuel, shields, batteries, guidance, fall safety, shops, and configurable matches turn a shot calculator into tactical combat. | Add a small, strongly differentiated arsenal and defensive/utility systems. Keep the economy outside the moment-to-moment turn so matches stay short. |
| Worms | Terrain matters because units move through it, can lose footing, take falls, seek cover, and use traversal/utility tools—not merely because explosions redraw a line. | Make crawler position, slope, craters, exposure, and terrain settlement affect play. Add one repositioning utility rather than a large traversal inventory. |
| Pocket Tanks | Quick rounds and highly legible novelty weapons create “one more match” appeal without requiring a campaign-sized ruleset. | Favor six readable payload roles and a short integrity race over hundreds of minor variants. Every payload needs a visible job and counterplay. |
| GunBound | Mobile identity, legal firing arcs, weather, shot families, items, and action-delay tradeoffs give each turn several coupled decisions. | Give Codazzo and Terragoyle signature systems, add one changing environmental condition, and attach a real cost/opportunity to movement and utility use. |
| ShellShock Live | Destructible terrain, large weapon variety, practice tools, challenges, upgrades, and multiple modes sustain mastery. | Add a range mode, difficulty settings, performance challenges, and a small mastery record after the core duel is solid. Avoid breadth that obscures weapon identity. |
| Tank Stars | Direct touch aiming, dramatic shots, tank collection, short turns, and fuel-limited movement translate the artillery loop well to phones. | Use direct manipulation on the battlefield and a thumb-reachable action tray. Keep the field visible while aiming and firing. |

Research sources:

- [Scorched Earth manual](https://www.abandonwaredos.com/docawd.php?idg=1912&sf=scorchedearthmanual.txt&sg=Scorched+Earth&st=manual)
- [Worms W.M.D. — Team17](https://www.team17.com/games/worms-w-m-d/)
- [Pocket Tanks — BlitWise](https://classic.blitwise.com/)
- [GunBound — how to play](https://gunbound.world/en/how-to-play/)
- [ShellShock Live — Steam](https://store.steampowered.com/app/326460/ShellShock_?l=english)
- [Tank Stars — Google Play](https://play.google.com/store/apps/details?id=com.playgendary.tanks)

## Candid gap audit

### Interaction and mobile

- [x] Replace the form-like command deck with a game HUD visually attached to the field.
- [x] Support drag-to-aim on the battlefield: direction controls angle, distance controls
      power, and the barrel/guide update continuously.
- [x] Retain compact fine-adjust controls without making them the primary interaction.
- [x] Put payload selection, movement, crew system, and Fire in a thumb-reachable action
      tray with no clipped state at 320, 360, 390, or 430 px.
- [x] Keep Fire and the current shot summary visible without scrolling past a false visual
      endpoint.
- [x] Remove horizontal overflow at every supported breakpoint and test landscape phone,
      tablet, narrow desktop, and wide desktop.
- [x] Make movement a visible traversed distance with fuel cost, animation, slope limits,
      and a material change to the next firing solution.
- [x] Add camera framing/shot tracking appropriate to small screens.

### Core combat

- [x] Replace three binary hit pips with a readable damage model: direct-hit bonus,
      distance falloff, per-payload damage, and 100-point hull meters.
- [x] Settle crawlers onto changed terrain after explosions; detect dangerous drops and
      apply fall damage or species mitigation.
- [x] Make terrain tactically consequential through cover, cratering, line-of-fire, and
      movement slope limits.
- [x] Expand from three payloads to six distinct jobs: reliable shell, spread, burrow,
      cluster, terrain-builder, and precision/utility shot.
- [x] Give limited payloads clear ammo counts and replenish/draft rules that prevent one
      dominant opening.
- [x] Add a defensive choice (living shield/brace) and a recovery or repositioning utility.
- [x] Add one readable environmental modifier beyond wind, announced before the player
      commits (for example gravity surge, spore drift, or unstable shelf).
- [x] Add near-miss and terrain-displacement outcomes so an accurate non-hit can still
      create tactical value.

### Xalian identity

- [x] Give Codazzo an anchor/regeneration system with a real positional tradeoff.
- [x] Give Terragoyle lift control that changes fall/terrain interaction rather than only
      appearing in prose.
- [x] Give each crew a signature payload or modifier while preserving fair local play.
- [x] Rename and illustrate mechanics as range organisms, field symbiotes, and crater
      phenomena; lore text must describe something the player can observe.
- [x] Make crawler silhouettes, recoil, damage states, and abilities visually distinct.

### Opponent, pacing, and modes

- [x] Add selectable bot difficulties with different error, adaptation, weapon use, and
      risk profiles—not hidden stat bonuses.
- [x] Teach the bot the complete rules (damage falloff, defense, utilities, terrain,
      payload roles) and expose concise intent the player can learn from.
- [x] Balance the standard duel to a median of 6–10 total shots and roughly 4–8 minutes.
- [x] Add anti-stall pressure if a duel runs long.
- [x] Add a Range mode for experimentation without rewards.
- [x] Add at least two compact contract variants after the duel is stable: score attack
      and limited-ordnance challenge.
- [x] Improve local mode handoff so both players can verify their choices without the
      interface assuming the left side is the only human.

### Feedback, learning, and replay

- [x] Add clear launch, flight, impact, damage-number, shield, movement, and victory beats.
- [x] Show the consequence of a shot immediately: damage, near-miss distance, crater or
      displacement value, and what changed for the next turn.
- [x] Preserve useful ranging history per crew and let the player compare the last shot
      with the current planned shot without revealing an exact solution.
- [x] Add a compact first-match tutorial embedded in the live controls and a skip/replay
      affordance.
- [x] Add a post-match performance breakdown based on accuracy, damage efficiency,
      terrain tactics, hull remaining, and payload variety.
- [x] Record local bests/mastery and surface a reason to replay without changing the
      server-validated daily credit cap.
- [x] Make daily terrain/conditions genuinely repeatable and ensure server replay uses
      exactly the same deterministic rules as the client.

### Engineering and release gates

- [x] Add deterministic unit coverage for every new payload, damage rule, ability,
      movement constraint, environmental condition, bot difficulty, and replay path.
- [x] Add component tests for direct aiming, compact controls, action availability, and
      mobile-safe structure.
- [x] Add a simulation report across at least 100 seeds covering reachability, win rate,
      payload usefulness, match length, and bot difficulty separation.
- [x] Play complete matches using every payload and ability, including wins, losses,
      movement, near misses, and long-match pressure.
- [x] Capture and inspect 320/390/430 px phone, landscape phone, tablet, 768 px desktop,
      and wide desktop states during aim, animation, bot turn, and result.
- [x] Pass all workspace tests, typechecks, production build, and bundle budgets.
- [x] Deploy only through pull request/CI, then repeat a live production smoke match on
      desktop and phone.

## Implementation order

The checklist is intentionally ordered by dependency rather than visual novelty:

1. **Playable surface:** direct aim, action tray, responsive field/HUD, meaningful drive.
2. **Combat model:** hull damage, falloff, settlement, six payload jobs, terrain value.
3. **Creature systems:** Codazzo anchor, Terragoyle lift, defense/utility, environment.
4. **Opponent and pacing:** difficulty, rule-aware bot, anti-stall, simulation balance.
5. **Modes and mastery:** range, contracts, tutorial, post-match record.
6. **Feel and release:** full audiovisual pass, cross-viewport playtest, regression suite,
   PR/CI deployment, and production verification.

Items are checked only after implementation *and* playtest evidence. A passing unit test
does not by itself establish that a game interaction feels good.

## Verification log

- 100-seed balance run: shell, fan, bore, cluster, bloom, and lance each retain unique
  damaging solutions; standard lands at an eight-shot median, with rookie/standard/expert
  modeled player win rates of 99%/72%/26%.
- Browser play: completed a 19-shot pressure-phase win and a four-shot expert loss; played
  the full six-shot Range and five-round Trial; used every payload, crawler movement, Root
  Lock, Lift Veil, near misses, direct hits, terrain collapse, and bot-grown Bloom cover.
- Responsive play: verified aim, flight camera, handoff, commands, Fire, and results at
  320×720, 390×844, 430×932, 768×1024, 844×390, 1280×720, and 1750×850. Every viewport
  has `scrollWidth === clientWidth`; short landscape and 320 px keep Fire in view.
- Automated gates: 100 test files / 1,566 tests pass across the workspace, all workspace
  typechecks pass, API and web production builds pass, and bundle budgets pass.
- Release: [PR #263](https://github.com/nickcjordan/Xalians/pull/263) passed CI and merged
  as `b390d52`; the frontend and backend production workflows passed. A live 390×844 smoke
  test exercised direct aim, a 14-unit Push, firing, and the bot reply with no overflow;
  a live 1280×720 check also fit the complete field and action tray without scrolling.
