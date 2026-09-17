# Xalians Arcade

> Platform policy update: this document describes the current Arcade product and implemented reward loop. Its daily credit cap, automatic credit-to-token conversion, win-only reward rule, and blanket replay requirement for new modules are not the approved future economy or a mandate for local game prototypes. For future integration, read `generation-economy-open-threads.md` then `xalian-generation-system.md`. Change the Arcade reward loop only at an explicit implementation cutover.

Status: initial release implemented, authorized 2026-09-13

## Product thesis

The Arcade redirects habits players already have. Someone who would otherwise open a
standalone game can play the familiar rules inside Xalians and turn that play into
progress toward another generated creature. The rules are familiar; the presentation,
code, names, records, and reward loop are Xalians originals.

The Arcade is one platform spoke. Its individual games are modules, not new top-level
products competing with Duel, Reclamation, or the Generator.

## Boundaries

- Reimplement mechanics, never another game's source, art, audio, rule text, level data,
  branded title, or distinctive combined presentation.
- Use descriptive rule-family labels where useful (`Klondike solitaire`, `artillery
  duel`) and original product names.
- Do not build a close Tetris, Puzzle Bobble/Bust-A-Move, Connect Four, Othello, Simon,
  Battleship, Yahtzee, or other branded replica.
- Creatures may appear as operators, companions, card art, and collection rewards. They
  do not gain levels and their immutable records do not change.
- Arcade performance does not create creature power.

## Experience structure

- `/arcade` is the chrome catalog and progression summary.
- `/arcade/:game` is a shareable game route. Setup and results are chrome; active play
  is immersive and always has a visible route back to the Arcade.
- `/train` redirects to `/arcade`; the old direct training URLs remain redirects.
- Games load lazily so adding a module does not grow every Arcade visit.
- Every module supplies metadata, rules copy, a deterministic seed, a result, and an
  action log that can be replayed for validation.

## Reward model (initial tuning)

Arcade Credits are a shared, capped progress meter rather than an uncapped per-win token
faucet.

- A qualifying completion awards credits according to the game's expected active time.
- The shared cap is 100 Arcade Credits per UTC day, across every game.
- Each 100 credits converts immediately into one Scrambler Token.
- A session id is redeemable once. The server replays the submitted seed and actions and
  awards only a valid terminal win.
- Guests can play and keep local records but cannot earn account rewards.
- After the daily cap, games continue to update local records and streaks.
- Reward constants are versioned levers. Their first values are deliberately modest and
  remain tuning values until play data exists.

## Initial catalog

1. **Crater Command** — turn-based artillery against a ranging bot or a second local
   player; seeded destructible terrain, angle, power, wind, projectile arc, craters, and
   100-point rig integrity.
2. **Archive Patience** — Klondike solitaire with draw-one/draw-three, click and drag
   movement, undo, hints, autocomplete, resumable seeded deals, and local records.
3. **Hazard Sweep** — Minesweeper rules with safe first reveal, three board sizes,
   keyboard play, flags, timer, and deterministic fields.
4. **Relay Merge** — slide-and-merge number puzzle with keyboard/touch controls, undo,
   deterministic spawns, and a defined winning threshold.
5. **Xalian Match** — the existing memory game, migrated into the shared shell and
   progression contract.

The next wave is Supply Run (snake), Containment Break (brick breaker), signal
nonograms, and an original affinity-orb launcher. They are not required for the initial
Arcade to prove the product loop.

## Crater Command cabinet redesign

Status: implemented and in an ongoing quality loop, 2026-09-17

Crater Command is an in-world Arcade cabinet, not a literal squad deployment. That
distinction keeps the creature roster coherent: players operate two standardized,
autonomous range rigs inside a playful combat simulation, while creature ownership and
species powers remain meaningful in games designed around the actual squad.

The cabinet preserves the familiar artillery center—angle, power, a readable arc, wind,
and destructible terrain—while moving the encounter to a much larger range and giving
each weapon a distinct mechanical job:

- The unlimited **Comet shell** is the dependable ranging baseline.
- Two **Razor fans** launch three genuinely diverging rounds to cover uncertain
  ranges, with lower damage per projectile.
- Two **Grav drills** penetrate before detonating, opening the deepest craters and
  attacking protected positions from below.
- One **Starfall canister** splits into five submunitions to saturate a broad shelf.
- One **Rampart forge** adds terrain instead of removing it, creating cover and guard
  that absorbs the next hit until the rig moves.
- One **Sunspike** trades blast tolerance for speed and precise direct-hit damage.
- Each rig has separate drive and jump-jet fuel budgets. Holding thrust commits
  movement in small increments; driving follows terrain while the jet clears crater
  walls and sharp shelves. An impossible move does not drain fuel.
- Wind remains fixed for both shots in a volley so the opponent receives the same
  condition and players can make an informed correction from their own previous shot.

The pre-match console offers 300-, 360-, and 440-unit fields. Rigs begin far apart and
their limited mobility budget cannot reach the outside simulation boundary, so an edge
never becomes a trap during ordinary play. The camera keeps the full long range visible
on desktop and follows projectile travel without collapsing back to the old close-quarters
scale on narrow screens.

Four canon planets act as complete battlefield presets: Stonera's low-gravity cratered
ridges, Magmuth's heavy-gravity obsidian crags, Krystos's sharp frozen shelves, and
Endessa's wind-amplifying dunes. The selected world changes terrain generation, ballistic
conditions, environmental art, and briefing language while keeping the reusable weapon
system independent of a specific creature species.

The weapon framework follows reusable artillery dimensions—delivery, projectile pattern,
impact behavior, terrain interaction, precision, and scarcity—rather than binding every
round to a named encyclopedia organism. Future weapons can therefore be mechanically
legible and lore-compatible without requiring a bespoke roster creature or attack pose.

### Cabinet iteration checklist

- [x] Separate the cabinet fiction from the player's owned creature squad.
- [x] Replace creature crews and one-off species powers with neutral autonomous rigs.
- [x] Add an explicit pre-match setup for match type, bot difficulty, 300/360/440-unit
  map size, and planetary battlefield.
- [x] Add four planet-specific deterministic terrain profiles, ballistic conditions,
  environmental backdrops, and plain-language setup previews.
- [x] Expand the field to selectable long-range scales and rebalance launch velocity,
  terrain scale, blast radii, penetration, and construction against those ranges.
- [x] Keep normal movement away from reachable outer boundaries and preserve opposing
  halves so a rig cannot trap or overlap its rival.
- [x] Make drive actions immediate, visibly animated, terrain-following, and long enough
  to read as traversal rather than a position jump.
- [x] Add a separately budgeted, animated jump jet that clears terrain-blocked routes;
  blocked movement no longer spends fuel when the rig cannot advance.
- [x] Preserve direct drag aiming, sliders, and one-step barrel/power corrections.
- [x] Replace abstract or unexplained control cards with an aim deck, drive deck, weapon
  rack, plain-language weapon roles, and one dominant fire action.
- [x] Keep Fire, LOAD, and MOVE together above a contextual mobile control panel and use
  a rig-focused camera with a range overview rather than shrinking the whole field.
- [x] Expand the battlefield viewport through the full legal projectile ceiling so
  maximum-height shots remain visible, and remove the filled midground silhouette that
  could be mistaken for a liquid surface.
- [x] Consolidate the command deck into a two-bank rig cockpit: firing and mobility
  instruments above a compact ordnance bus, with audio relocated into the screen bezel.
- [x] Give firing a charge, recoil, visible projectile/trail, impact shake, damage number,
  terrain interpolation, and a delayed result callout that does not hide the explosion.
- [x] Keep the HUD integrity bars tied to the same animated damage value as the rig.
- [x] Make scatter and fragment rounds diverge in both angle and velocity so their
  impacts do not reconverge at complementary ballistic angles.
- [x] Preserve distinct terrain roles: baseline blast, deep excavation, saturation,
  terrain construction, and precision direct-hit pressure.
- [x] Keep wind stable through a volley, remove prior-shot result overlays on the next
  turn, and retain bot movement/fortification behavior at the new scale.
- [x] Keep a moved rig at its committed firing position through charge, flight, impact,
  and state settlement so movement and projectile origins never visually desynchronize.
- [x] Validate reachable opening shots across seeded fields, all six deterministic weapon
  roles, responsive presentation, touch-style drag aiming, movement, and impact pacing.

## Implementation checklist

### Foundation

- [x] Add the Arcade catalog, routes, navigation, and legacy redirects.
- [x] Add the shared game shell, session/seed helpers, result contract, local records,
      resume storage, and reward summary.
- [x] Add pure deterministic Arcade rules to `@xalians/rules` with unit tests.
- [x] Add authenticated completion/reward API with replay validation, idempotency, UTC
      daily cap, atomic credit/token accounting, tests, and Terraform route.
- [x] Add the frontend API client and signed-out/reward-unavailable recovery states.

### Games

- [x] Replace the Physics experiment with Crater Command.
- [x] Build Archive Patience.
- [x] Build Hazard Sweep.
- [x] Build Relay Merge.
- [x] Migrate Xalian Match into the shared completion and record contract.

### Quality

- [x] Every active game answers orient → decide → commit → experience → understand →
      continue without opening instructions.
- [x] Keyboard, touch, visible focus, 44 px targets, text alternatives, reduced motion,
      naturally pausable turns, and Solitaire reload recovery work.
- [x] Pure rules, replay validation, route contracts, and local/reward persistence have
      automated coverage; interaction and paint flows have browser smoke coverage.
- [x] Frontend/package/API typechecks and tests pass.
- [x] Production builds and bundle budgets pass.
- [x] `/arcade` and every game pass desktop and phone paint checks with no overflow or
      console errors.

## Definition of done

The concept is built when a visitor can open the Arcade, choose among the five initial
games, complete each on desktop or phone, retain local records, and—when signed in—see a
valid completion advance the shared daily meter and convert earned credits into the
existing Scrambler Token balance without allowing a duplicate claim. Old Training and
Physics links resolve cleanly into the new experience.

This definition covers the initial Arcade release, not the ongoing quality of any game.
Crater Command's iterative quality process lives in
[`../quality/crater-command-loop.md`](../quality/crater-command-loop.md); a checked feature
here is not evidence that its play experience is finished.
